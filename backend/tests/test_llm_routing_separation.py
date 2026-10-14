"""
Unit tests verifying LLM routing separation:
1. "researcher" is completely absent from MODEL_MAPPING.
2. call_llm("researcher", ...) and call_llm_for_tier("researcher", ...) raise clear errors.
3. Analyst routing works across tiers.
4. Critic routing works across tiers.
5. Researcher agent completes its pipeline without calling any generative LLM.
6. Embedding generation is unaffected and operates independently from generative LLM routing.
"""

import json
import pytest
from unittest.mock import patch, MagicMock
import httpx
from app.services.openrouter_client import MODEL_MAPPING, llm_client
from app.services.embedding_service import get_embedding as service_get_embedding
from app.swarm.nodes.researcher import researcher_node, get_embedding as researcher_get_embedding


def test_researcher_not_present_in_model_mapping():
    """Verify that 'researcher' is NOT present in MODEL_MAPPING and only generative agents are present."""
    assert "researcher" not in MODEL_MAPPING
    assert set(MODEL_MAPPING.keys()) == {"analyst", "critic"}
    # Analyst models
    assert 1 in MODEL_MAPPING["analyst"]
    assert 2 in MODEL_MAPPING["analyst"]
    assert 3 in MODEL_MAPPING["analyst"]
    # Critic models
    assert 1 in MODEL_MAPPING["critic"]
    assert 2 in MODEL_MAPPING["critic"]
    assert 3 in MODEL_MAPPING["critic"]


def test_call_llm_researcher_raises_clear_error():
    """Verify that calling call_llm('researcher', ...) raises a descriptive ValueError."""
    messages = [{"role": "user", "content": "Generate research"}]
    with pytest.raises(ValueError) as exc_info:
        llm_client.call_llm("researcher", messages)
    assert "The 'researcher' agent does not use generative LLMs" in str(exc_info.value)

    with pytest.raises(ValueError) as exc_info_tier:
        llm_client.call_llm_for_tier("researcher", 1, messages)
    assert "The 'researcher' agent does not use generative LLMs" in str(exc_info_tier.value)


def test_call_llm_unknown_agent_raises_clear_error():
    """Verify that calling call_llm for any other unknown agent raises a ValueError."""
    messages = [{"role": "user", "content": "Hello"}]
    with pytest.raises(ValueError) as exc_info:
        llm_client.call_llm("unknown_bot", messages)
    assert "Unknown generative agent type: 'unknown_bot'" in str(exc_info.value)


def test_analyst_routing_works():
    """Verify Analyst routing still functions for Tier 1 and Tier 2."""
    messages = [{"role": "user", "content": "Analyze findings"}]
    mock_res = MagicMock()
    mock_res.status_code = 200
    mock_res.json.return_value = {
        "choices": [{"message": {"content": "Analyst draft output"}}]
    }

    with patch("app.services.openrouter_client.settings.GROQ_API_KEY", "test-groq-key"), \
         patch.object(llm_client, "_get_circuit_breaker_state", return_value="CLOSED"), \
         patch.object(llm_client, "_get_prompt_cache", return_value=None), \
         patch("httpx.Client.post", return_value=mock_res) as mock_post:

        res = llm_client.call_llm("analyst", messages)
        assert res["content"] == "Analyst draft output"
        assert res["tier_used"] == 1
        assert res["model"] == MODEL_MAPPING["analyst"][1]

        # Verify Groq request structure
        call_args, call_kwargs = mock_post.call_args
        assert "api.groq.com" in call_args[0]
        assert call_kwargs["json"]["model"] == "openai/gpt-oss-120b"


def test_critic_routing_works():
    """Verify Critic routing still functions for specific tiers (e.g., Tier 2 OpenRouter)."""
    messages = [{"role": "user", "content": "Evaluate draft"}]
    mock_res = MagicMock()
    mock_res.status_code = 200
    mock_res.json.return_value = {
        "choices": [{"message": {"content": json.dumps({"verdict": "approve", "scores": {"clarity": 8.5}})}}]
    }

    with patch("app.services.openrouter_client.settings.OPENROUTER_API_KEY", "test-or-key"), \
         patch.object(llm_client, "_get_circuit_breaker_state", return_value="CLOSED"), \
         patch.object(llm_client, "_get_prompt_cache", return_value=None), \
         patch("httpx.Client.post", return_value=mock_res) as mock_post:

        res = llm_client.call_llm_for_tier("critic", 2, messages)
        assert "verdict" in res["content"]
        assert res["tier_used"] == 2
        assert res["model"] == MODEL_MAPPING["critic"][2]

        call_args, call_kwargs = mock_post.call_args
        assert "openrouter.ai" in call_args[0]
        assert call_kwargs["json"]["model"] == "nvidia/nemotron-3-nano-30b-a3b"


def test_researcher_pipeline_completes_without_generative_llm():
    """Verify Researcher completes search, chunking, embedding, Qdrant indexing WITHOUT any generative LLM calls."""
    state = {
        "job_id": "test-job-researcher-no-llm",
        "topic": "Autonomous Swarm Architectures",
    }

    mock_search_results = [
        {"title": "Paper 1", "url": "https://arxiv.org/1", "content": "Decentralized swarms coordinate efficiently."},
        {"title": "Paper 2", "url": "https://arxiv.org/2", "content": "Vector stores enable fast semantic retrieval."},
    ]

    # Spy on LLMClient methods and httpx to ensure no generative calls occur
    with patch("app.swarm.nodes.researcher.settings.OLLAMA_BASE_URL", None), \
         patch("app.swarm.nodes.researcher.search_service.search", return_value=mock_search_results) as mock_search, \
         patch("app.swarm.nodes.researcher.qdrant_client.upsert") as mock_upsert, \
         patch("app.swarm.nodes.researcher.emit") as mock_emit, \
         patch.object(llm_client, "call_llm") as mock_call_llm, \
         patch.object(llm_client, "call_llm_for_tier") as mock_call_llm_tier:

        output = researcher_node(state)

        # 1. Web search was performed
        mock_search.assert_called_once_with("Autonomous Swarm Architectures", max_results=5)

        # 2. Qdrant upsert was called with embedded chunks
        mock_upsert.assert_called_once()
        upsert_kwargs = mock_upsert.call_args[1]
        assert upsert_kwargs["collection_name"] == "research_chunks"
        points = upsert_kwargs["points"]
        assert len(points) == 2
        assert len(points[0].vector) == 768

        # 3. Output state contains research notes and source summaries
        assert "Paper 1" in output["research_notes"]
        assert len(output["sources"]) == 2

        # 4. CRITICAL: Zero generative LLM calls were made
        assert mock_call_llm.call_count == 0
        assert mock_call_llm_tier.call_count == 0


def test_embedding_generation_remains_unaffected():
    """Verify that vector embedding generation remains operational and produces 768-dim vectors."""
    # 1. Test fallback mock vector (deterministic unit vector)
    with patch("app.core.config.settings.OLLAMA_BASE_URL", None):
        vec1 = researcher_get_embedding("Test embedding text")
        vec2 = service_get_embedding("Test embedding text")
        assert len(vec1) == 768
        assert len(vec2) == 768
        assert vec1 == vec2  # Researcher delegates to embedding service

    # 2. Test live/mocked Ollama embedding response
    mock_ollama_resp = MagicMock()
    mock_ollama_resp.status_code = 200
    mock_ollama_resp.json.return_value = {"embedding": [0.1] * 768}

    with patch("app.services.embedding_service.settings.OLLAMA_BASE_URL", "http://localhost:11434"), \
         patch("app.swarm.nodes.researcher.settings.OLLAMA_BASE_URL", "http://localhost:11434"), \
         patch("httpx.post", return_value=mock_ollama_resp) as mock_httpx:

        vec = researcher_get_embedding("Another topic")
        assert len(vec) == 768
        assert vec[0] == 0.1
        mock_httpx.assert_called_once()
        assert "api/embeddings" in mock_httpx.call_args[0][0]


def test_fallback_to_ollama_when_cloud_fails():
    messages = [{"role": "user", "content": "Test fallback"}]
    with patch("app.services.openrouter_client.settings.GROQ_API_KEY", "dummy"), \
         patch("app.services.openrouter_client.settings.OPENROUTER_API_KEY", "dummy"), \
         patch.object(llm_client, "_get_circuit_breaker_state", return_value="CLOSED"), \
         patch.object(llm_client, "_get_prompt_cache", return_value=None), \
         patch("httpx.Client.post", side_effect=[
             httpx.ConnectError("groq fail"),
             httpx.ConnectError("or fail"),
             MagicMock(status_code=200, json=lambda: {"message": {"content": "Ollama successful"}})
         ]) as mock_post:
        res = llm_client.call_llm("analyst", messages)
        assert res["tier_used"] == 3
        assert res["model"] == MODEL_MAPPING["analyst"][3]
        assert res["content"] == "Ollama successful"
        assert mock_post.call_count == 3


def test_groq_failure_falls_back_to_openrouter():
    messages = [{"role": "user", "content": "Groq fail test"}]
    with patch("app.services.openrouter_client.settings.GROQ_API_KEY", "dummy"), \
         patch("app.services.openrouter_client.settings.OPENROUTER_API_KEY", "dummy"), \
         patch.object(llm_client, "_get_circuit_breaker_state", return_value="CLOSED"), \
         patch.object(llm_client, "_get_prompt_cache", return_value=None), \
         patch("httpx.Client.post", side_effect=[
             httpx.ConnectError("groq fail"),
             MagicMock(status_code=200, json=lambda: {"choices": [{"message": {"content": "OpenRouter success"}}]})
         ]) as mock_post:
        res = llm_client.call_llm("critic", messages)
        assert res["tier_used"] == 2
        assert res["model"] == MODEL_MAPPING["critic"][2]
        assert res["content"] == "OpenRouter success"
        assert mock_post.call_count == 2


def test_all_tiers_fail_raises_runtime_error():
    messages = [{"role": "user", "content": "Fail all"}]
    with patch("app.services.openrouter_client.settings.GROQ_API_KEY", "dummy"), \
         patch("app.services.openrouter_client.settings.OPENROUTER_API_KEY", "dummy"), \
         patch.object(llm_client, "_get_circuit_breaker_state", return_value="CLOSED"), \
         patch.object(llm_client, "_record_failure"), \
         patch.object(llm_client, "_get_prompt_cache", return_value=None), \
         patch("httpx.Client.post", side_effect=[
             httpx.ConnectError("groq"),
             httpx.ConnectError("or"),
             httpx.ConnectError("ollama")
         ]):
        with pytest.raises(RuntimeError):
            llm_client.call_llm("analyst", messages)


def test_ollama_invalid_response_raises_runtime_error():
    messages = [{"role": "user", "content": "Bad Ollama"}]
    with patch("app.services.openrouter_client.settings.GROQ_API_KEY", "dummy"), \
         patch("app.services.openrouter_client.settings.OPENROUTER_API_KEY", "dummy"), \
         patch.object(llm_client, "_get_circuit_breaker_state", return_value="CLOSED"), \
         patch.object(llm_client, "_record_failure"), \
         patch.object(llm_client, "_get_prompt_cache", return_value=None), \
         patch("httpx.Client.post", side_effect=[
             httpx.ConnectError("groq"),
             httpx.ConnectError("or"),
             MagicMock(status_code=200, json=lambda: {"unexpected": "data"})
         ]):
        with pytest.raises(RuntimeError):
            llm_client.call_llm("critic", messages)


def test_analyst_and_critic_select_ollama_on_failure():
    messages = [{"role": "user", "content": "both fail"}]
    with patch("app.services.openrouter_client.settings.GROQ_API_KEY", "dummy"), \
         patch("app.services.openrouter_client.settings.OPENROUTER_API_KEY", "dummy"), \
         patch.object(llm_client, "_get_circuit_breaker_state", return_value="CLOSED"), \
         patch.object(llm_client, "_get_prompt_cache", return_value=None), \
         patch("httpx.Client.post", side_effect=[
             httpx.ConnectError("groq"),
             httpx.ConnectError("or"),
             MagicMock(status_code=200, json=lambda: {"message": {"content": "Ollama for analyst"}})
         ]) as mock_post_analyst:
        res_a = llm_client.call_llm("analyst", messages)
        assert res_a["tier_used"] == 3
        assert res_a["model"] == MODEL_MAPPING["analyst"][3]
        assert res_a["content"] == "Ollama for analyst"

    with patch("app.services.openrouter_client.settings.GROQ_API_KEY", "dummy"), \
         patch("app.services.openrouter_client.settings.OPENROUTER_API_KEY", "dummy"), \
         patch.object(llm_client, "_get_circuit_breaker_state", return_value="CLOSED"), \
         patch.object(llm_client, "_get_prompt_cache", return_value=None), \
         patch("httpx.Client.post", side_effect=[
             httpx.ConnectError("groq"),
             httpx.ConnectError("or"),
             MagicMock(status_code=200, json=lambda: {"message": {"content": "Ollama for critic"}})
         ]) as mock_post_critic:
        res_c = llm_client.call_llm("critic", messages)
        assert res_c["tier_used"] == 3
        assert res_c["model"] == MODEL_MAPPING["critic"][3]
        assert res_c["content"] == "Ollama for critic"
