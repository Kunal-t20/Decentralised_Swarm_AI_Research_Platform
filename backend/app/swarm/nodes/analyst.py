from qdrant_client.http import models as qdrant_models
from app.services.qdrant_service import qdrant_client
from app.services.openrouter_client import llm_client
from app.services.events_service import emit
from app.swarm.prompts import ANALYST_SYSTEM_PROMPT, ANALYST_USER_PROMPT_TEMPLATE
from app.swarm.state import SwarmState
from app.swarm.nodes.researcher import get_embedding


def _build_sources_list(sources: list) -> str:
    """
    Convert the sources list from SwarmState into a numbered string for the LLM prompt.
    Each source becomes: [N] Title — URL
    """
    if not sources:
        return "No external sources retrieved."
    
    lines = []
    for idx, src in enumerate(sources, start=1):
        title = src.get("title") or src.get("source_title") or "Untitled Source"
        url   = src.get("url")   or src.get("source_url")   or ""
        if url:
            lines.append(f"[{idx}] {title} — {url}")
        else:
            lines.append(f"[{idx}] {title}")
    return "\n".join(lines)


def analyst_node(state: SwarmState) -> dict:
    job_id         = state.get("job_id")
    topic          = state.get("topic")
    critic_feedback = state.get("critic_feedback") or "None. This is the first iteration."
    sources        = state.get("sources") or []

    emit(
        job_id=job_id,
        event_type="NODE_START",
        agent="analyst",
        message="Analyst agent started. Querying Qdrant vector database for relevant research contexts..."
    )

    # -------------------------------------------------------------------------
    # 1. Retrieve relevant chunks from Qdrant vector store (up to 15 chunks)
    # -------------------------------------------------------------------------
    retrieved_text = ""
    try:
        query_vector = get_embedding(topic)
        search_filter = qdrant_models.Filter(
            must=[
                qdrant_models.FieldCondition(
                    key="job_id",
                    match=qdrant_models.MatchValue(value=job_id)
                )
            ]
        )

        search_results = []
        if hasattr(qdrant_client, "query_points"):
            response = qdrant_client.query_points(
                collection_name="research_chunks",
                query=query_vector,
                query_filter=search_filter,
                limit=15,          # increased from 10 → 15 for richer context
            )
            search_results = response.points
        elif hasattr(qdrant_client, "search"):
            search_results = qdrant_client.search(
                collection_name="research_chunks",
                query_vector=query_vector,
                query_filter=search_filter,
                limit=15,
            )

        if search_results:
            emit(
                job_id=job_id,
                event_type="LOG",
                agent="analyst",
                message=f"Retrieved {len(search_results)} relevant content chunks from Qdrant vector store."
            )
            for idx, hit in enumerate(search_results):
                payload = hit.payload or {}
                text    = payload.get("text", "")
                title   = payload.get("source_title", "Unknown Source")
                url     = payload.get("source_url", "")
                retrieved_text += f"[{idx+1}] Source: {title} ({url})\nContent: {text}\n\n"
        else:
            emit(
                job_id=job_id,
                event_type="LOG",
                agent="analyst",
                message="Qdrant search returned no results. Falling back to raw researcher notes."
            )
    except Exception as e:
        emit(
            job_id=job_id,
            event_type="LOG",
            agent="analyst",
            message=f"Error searching Qdrant: {e}. Falling back to raw researcher notes."
        )

    # Fall back to state's research_notes if Qdrant retrieval was empty
    context = retrieved_text.strip() if retrieved_text else state.get("research_notes", "")

    # -------------------------------------------------------------------------
    # 2. Build numbered sources list for the LLM prompt
    # -------------------------------------------------------------------------
    sources_list = _build_sources_list(sources)
    
    emit(
        job_id=job_id,
        event_type="LOG",
        agent="analyst",
        message=f"Generating deep research report with {len(sources)} cited sources..."
    )

    # -------------------------------------------------------------------------
    # 3. Call LLM to draft/update the deep research report
    # -------------------------------------------------------------------------
    user_content = ANALYST_USER_PROMPT_TEMPLATE.format(
        topic=topic,
        sources_list=sources_list,
        research_notes=context,
        critic_feedback=critic_feedback
    )

    messages = [
        {"role": "system", "content": ANALYST_SYSTEM_PROMPT},
        {"role": "user",   "content": user_content}
    ]

    try:
        loop_count  = state.get("loop_count", 0)
        response    = llm_client.call_llm("analyst", messages, temperature=0.7, cache_bust=str(loop_count))
        draft_content = response["content"]
        tier_used   = response["tier_used"]
        model_name  = response["model"]

        emit(
            job_id=job_id,
            event_type="LOG",
            agent="analyst",
            tier_used=tier_used,
            message=f"Draft successfully compiled using Tier {tier_used} model ({model_name})."
        )
    except Exception as e:
        emit(
            job_id=job_id,
            event_type="LOG",
            agent="analyst",
            message=f"Failed to generate draft: {e}"
        )
        raise e

    emit(
        job_id=job_id,
        event_type="NODE_END",
        agent="analyst",
        message="Analyst completed deep research report compilation."
    )

    return {
        "analyst_draft": draft_content,
    }
