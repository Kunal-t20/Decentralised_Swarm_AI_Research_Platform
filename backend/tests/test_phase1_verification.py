import json
import pytest
from unittest.mock import patch, MagicMock
from app.services.openrouter_client import MODEL_MAPPING, llm_client
from app.swarm.graph import swarm_graph, LazySwarmGraph
from app.tasks.swarm_tasks import run_research_swarm
from app.models.research import ResearchReport

def test_phase1_lazy_swarm_graph():
    """Verify swarm_graph is an instance of LazySwarmGraph and does not block import."""
    assert isinstance(swarm_graph, LazySwarmGraph)

def test_phase1_llm_model_mapping():
    """Verify Groq, OpenRouter, and Ollama tier model mappings."""
    # Tier 1 Groq
    assert MODEL_MAPPING["analyst"][1] == "openai/gpt-oss-120b"
    assert MODEL_MAPPING["critic"][1] == "openai/gpt-oss-120b"

    # Tier 2 OpenRouter
    assert MODEL_MAPPING["analyst"][2] == "openrouter/free"
    assert MODEL_MAPPING["critic"][2] == "nvidia/nemotron-3-nano-30b-a3b:free"


    # Tier 3 Ollama
    assert MODEL_MAPPING["researcher"][3] == "llama3.2:3b"
    assert MODEL_MAPPING["analyst"][3] == "qwen2.5:7b"
    assert MODEL_MAPPING["critic"][3] == "phi4:14b"

def test_phase1_llm_call_accepts_cache_bust():
    """Verify call_llm accepts cache_bust argument and queries cache with bust string."""
    messages = [{"role": "user", "content": "test"}]
    with patch.object(llm_client, "_get_prompt_cache", return_value="cached response") as mock_cache:
        res = llm_client.call_llm("analyst", messages, cache_bust="iter_2")
        assert res["content"] == "cached response"
        mock_cache.assert_called_with(messages, "openai/gpt-oss-120b", cache_bust="iter_2")

def test_phase1_groq_execution():
    """Verify Tier 1 uses Groq API endpoint and authorization header."""
    messages = [{"role": "user", "content": "hi"}]
    mock_res = MagicMock()
    mock_res.status_code = 200
    mock_res.json.return_value = {
        "choices": [{"message": {"content": "Groq response"}}]
    }

    with patch("app.services.openrouter_client.settings.GROQ_API_KEY", "mock-groq-key"), \
         patch.object(llm_client, "_get_circuit_breaker_state", return_value="CLOSED"), \
         patch.object(llm_client, "_get_prompt_cache", return_value=None), \
         patch("httpx.Client.post", return_value=mock_res) as mock_post:

        res = llm_client.call_llm("researcher", messages)
        assert res["content"] == "Groq response"
        assert res["tier_used"] == 1
        assert res["model"] == "openai/gpt-oss-120b"
        
        args, kwargs = mock_post.call_args
        assert kwargs["headers"]["Authorization"] == "Bearer mock-groq-key"
        assert "api.groq.com" in args[0]

def test_phase1_completed_with_warning_and_best_draft_selection():
    """Verify task sets COMPLETED_WITH_WARNING and selects highest avg_score draft when max revisions fail."""
    mock_db = MagicMock()
    mock_job = MagicMock()
    mock_job.id = "job-123"
    mock_job.status = "QUEUED"
    mock_db.query.return_value.filter.return_value.first.return_value = mock_job

    # Simulated graph output after 3 failed quality iterations
    mock_final_state = {
        "loop_count": 3,
        "verdict": "reject",
        "critic_scores": {"clarity": 5, "depth": 5, "structure": 5, "rigor": 5, "completeness": 5},
        "analyst_draft": "Draft iteration 3 (Low quality)",
        "sources": [],
        "_feedbacks_to_persist": [],
        "draft_history": [
            {
                "loop_iteration": 1,
                "draft": "Draft iteration 1 (Medium quality)",
                "scores": {"clarity": 6.5, "depth": 6.5, "structure": 6.5, "rigor": 6.5},
                "avg_score": 6.5,
            },
            {
                "loop_iteration": 2,
                "draft": "Draft iteration 2 (Best quality draft)",
                "scores": {"clarity": 6.9, "depth": 6.8, "structure": 6.9, "rigor": 6.8},
                "avg_score": 6.85,
            },
            {
                "loop_iteration": 3,
                "draft": "Draft iteration 3 (Low quality)",
                "scores": {"clarity": 5.0, "depth": 5.0, "structure": 5.0, "rigor": 5.0},
                "avg_score": 5.0,
            },
        ],
    }

    with patch("app.tasks.swarm_tasks.SessionLocal", return_value=mock_db), \
         patch("app.tasks.swarm_tasks.swarm_graph.invoke", return_value=mock_final_state), \
         patch("app.tasks.swarm_tasks.emit"):

        run_research_swarm("job-123", "Generative AI")

        # Verify job status updated to completed_with_warning
        assert mock_job.status == "COMPLETED_WITH_WARNING"
        
        # Verify saved ResearchReport picked the highest avg_score draft (Draft iteration 2)
        added_report = None
        for call in mock_db.add.call_args_list:
            obj = call[0][0]
            if isinstance(obj, ResearchReport):
                added_report = obj
                break
        
        assert added_report is not None
        assert added_report.content == "Draft iteration 2 (Best quality draft)"
