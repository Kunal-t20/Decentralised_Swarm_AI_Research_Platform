import re
import json
import concurrent.futures
from app.services.openrouter_client import llm_client
from app.services.events_service import emit
from app.swarm.prompts import CRITIC_SYSTEM_PROMPT, CRITIC_USER_PROMPT_TEMPLATE
from app.swarm.state import SwarmState

def clean_and_parse_json(text: str) -> dict:
    """Clean and parse JSON response from LLMs, stripping reasoning and code blocks."""
    cleaned = text.strip()
    
    # Remove DeepSeek thinking/reasoning blocks (<think>...</think>)
    cleaned = re.sub(r"<think>.*?</think>", "", cleaned, flags=re.DOTALL).strip()
    
    # Strip markdown code blocks if present
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
        
    cleaned = cleaned.strip()
    return json.loads(cleaned)

def call_critic_model(tier: int, messages: list, cache_bust: str = "") -> dict:
    """Calls a critic model at the specified tier. Returns parsed JSON or raises exception."""
    try:
        response = llm_client.call_llm_for_tier("critic", tier, messages, cache_bust=cache_bust)
        parsed = clean_and_parse_json(response["content"])
        return {
            "success": True,
            "tier": tier,
            "model": response["model"],
            "scores": parsed.get("scores", {}),
            "feedback": parsed.get("feedback", ""),
            "verdict": parsed.get("verdict", "reject")
        }
    except Exception as e:
        print(f"Critic Tier {tier} failed: {e}")
        return {
            "success": False,
            "tier": tier,
            "error": str(e)
        }

def critic_node(state: SwarmState) -> dict:
    job_id = state.get("job_id")
    topic = state.get("topic")
    analyst_draft = state.get("analyst_draft") or ""
    loop_count = state.get("loop_count", 0)
    # Bust the cache per loop iteration — prevents stale critic hits stalling the loop
    cache_bust = str(loop_count)
    
    emit(
        job_id=job_id,
        event_type="NODE_START",
        agent="critic",
        message="Critic agent started. Running concurrent peer evaluations..."
    )

    user_content = CRITIC_USER_PROMPT_TEMPLATE.format(
        topic=topic,
        report_draft=analyst_draft
    )
    messages = [
        {"role": "system", "content": CRITIC_SYSTEM_PROMPT},
        {"role": "user", "content": user_content}
    ]

    # 1. Run Tier 1 and Tier 2 concurrently, busting cache per loop iteration
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        futures = [
            executor.submit(call_critic_model, 1, messages, cache_bust),
            executor.submit(call_critic_model, 2, messages, cache_bust)
        ]
        for future in concurrent.futures.as_completed(futures):
            results.append(future.result())

    # Filter successful evaluations
    successful_evals = [r for r in results if r["success"]]

    # 2. Fallback to Tier 3 (Ollama) if both Tier 1 & Tier 2 failed
    if not successful_evals:
        emit(
            job_id=job_id,
            event_type="LOG",
            agent="critic",
            message="Both Cloud Critic models failed. Attempting local Tier 3 fallback..."
        )
        t3_result = call_critic_model(3, messages)
        if t3_result["success"]:
            successful_evals.append(t3_result)
        else:
            emit(
                job_id=job_id,
                event_type="LOG",
                agent="critic",
                message=f"Local Tier 3 Critic fallback also failed: {t3_result.get('error')}"
            )

    # If all evaluations failed, raise exception
    if not successful_evals:
        emit(
            job_id=job_id,
            event_type="NODE_END",
            agent="critic",
            message="Error: All critic evaluations failed."
        )
        raise RuntimeError("Critic evaluation failed: All tiers returned errors.")

    # 3. Aggregate scores, feedback, and verdict
    final_scores = {}
    combined_feedback = ""
    verdict = "reject"
    
    # Dimensions to average
    dimensions = ["clarity", "depth", "structure", "rigor"]
    
    # Calculate average scores across successful reviews
    for dim in dimensions:
        dim_scores = [r["scores"].get(dim, 0) for r in successful_evals]
        final_scores[dim] = sum(dim_scores) / len(dim_scores) if dim_scores else 0

    # Combine feedback comments
    feedback_parts = []
    for r in successful_evals:
        model_name = r["model"]
        feedback_parts.append(f"[{model_name} Feedback]:\n{r['feedback']}")
    combined_feedback = "\n\n".join(feedback_parts)

    # Approve only if all aggregated scores are >= 7.0
    all_passed = all(score >= 7.0 for score in final_scores.values())
    verdict = "approve" if all_passed else "reject"

    emit(
        job_id=job_id,
        event_type="SCORE",
        agent="critic",
        message=f"Critic evaluation completed. Scores: {final_scores}. Verdict: {verdict}",
        data={"scores": final_scores, "verdict": verdict}
    )

    emit(
        job_id=job_id,
        event_type="NODE_END",
        agent="critic",
        message="Critic completed review."
    )

    # Return feedback as a single-item list — LangGraph's operator.add reducer
    # appends it to the accumulated list across all loop iterations, so every
    # critic run's scores are preserved in DB (not just the final one).
    return {
        "critic_scores": final_scores,
        "critic_feedback": combined_feedback,
        "verdict": verdict,
        "_feedbacks_to_persist": [
            {
                "agent": "critic",
                "score": final_scores,
                "feedback": combined_feedback,
                "loop_iteration": state.get("loop_count", 0),
            }
        ],
    }

