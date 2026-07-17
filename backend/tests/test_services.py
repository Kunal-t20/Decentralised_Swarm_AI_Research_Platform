import pytest
import httpx
from unittest.mock import MagicMock, patch
from app.services.search_service import search_service
from app.services.openrouter_client import llm_client
from app.core.database import redis_client

# ----------------- Search Service Tests -----------------

def test_search_cache_hit():
    """Test that search service returns cached results from Redis directly if present."""
    query = "test query cache"
    cached_data = [
        {"title": "Cached Title", "url": "http://cached.com", "content": "Cached Content"}
    ]
    
    with patch.object(redis_client, "get", return_value=json_dumps_fallback(cached_data)) as mock_get:
        results = search_service.search(query)
        assert len(results) == 1
        assert results[0]["title"] == "Cached Title"
        mock_get.assert_called_once()

def test_search_tavily_success():
    """Test that Tavily search is executed and cached on success."""
    query = "tavily success"
    mock_response = {
        "results": [{"title": "Tavily Title", "url": "http://tavily.com", "content": "Tavily Content"}]
    }
    
    with patch.object(redis_client, "get", return_value=None), \
         patch.object(search_service.tavily_client, "search", return_value=mock_response) as mock_tavily, \
         patch.object(redis_client, "setex") as mock_setex:
         
        results = search_service.search(query)
        assert len(results) == 1
        assert results[0]["title"] == "Tavily Title"
        mock_tavily.assert_called_once()
        mock_setex.assert_called_once()

def test_search_tavily_fallback_to_ddg():
    """Test that Tavily failure falls back to DuckDuckGo search."""
    query = "ddg fallback"
    ddg_mock_results = [
        {"title": "DDG Title", "href": "http://ddg.com", "body": "DDG Content"}
    ]
    
    with patch.object(redis_client, "get", return_value=None), \
         patch.object(search_service.tavily_client, "search", side_effect=Exception("Tavily Error")), \
         patch("app.services.search_service.DDGS") as mock_ddgs, \
         patch.object(redis_client, "setex") as mock_setex:
         
        # Mocking the DDGS context manager and text search method
        mock_ddg_instance = MagicMock()
        mock_ddg_instance.text.return_value = ddg_mock_results
        mock_ddgs.return_value.__enter__.return_value = mock_g = mock_ddg_instance
        
        results = search_service.search(query)
        assert len(results) == 1
        assert results[0]["title"] == "DDG Title"
        assert results[0]["url"] == "http://ddg.com"
        assert results[0]["content"] == "DDG Content"
        mock_setex.assert_called_once()


# ----------------- LLM Client Tests -----------------

def test_llm_cache_hit():
    """Test that call_llm returns cached result if found in Redis."""
    messages = [{"role": "user", "content": "Hello"}]
    with patch.object(redis_client, "get", return_value="Cached response") as mock_get:
        response = llm_client.call_llm("researcher", messages)
        assert response["content"] == "Cached response"
        assert response["tier_used"] == 1
        # Called twice: once for cb state check, once for prompt cache check
        assert mock_get.call_count == 2

def test_llm_circuit_breaker_trips():
    """Test that LLM client trips circuit breaker to OPEN after 3 consecutive failures."""
    messages = [{"role": "user", "content": "Fail me"}]
    
    with patch.object(redis_client, "get", return_value=None), \
         patch("httpx.Client.post", side_effect=httpx.ConnectError("Connection failed")), \
         patch.object(redis_client, "incr", return_value=3) as mock_incr, \
         patch.object(redis_client, "set") as mock_set:
         
        # Expecting error since all tiers will fail
        with pytest.raises(RuntimeError):
            llm_client.call_llm("researcher", messages)
            
        # Verify that incr was called to increment failure count
        assert mock_incr.call_count > 0
        # Verify that circuit state was set (tripped to OPEN)
        mock_set.assert_any_call("cb:state:researcher:1", "OPEN")
        mock_set.assert_any_call("cb:state:researcher:2", "OPEN")

def test_llm_circuit_breaker_skips_open_circuits():
    """Test that call_llm skips tiers that have an OPEN circuit breaker."""
    messages = [{"role": "user", "content": "Try"}]
    
    # Mock states: Tier 1 OPEN, Tier 2 CLOSED, Tier 3 disabled
    def mock_redis_get(key):
        if key == "cb:state:researcher:1":
            return "OPEN"
        elif key == "cb:state:researcher:2":
            return "CLOSED"
        return None
        
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "choices": [{"message": {"content": "Tier 2 success"}}]
    }
    
    with patch.object(redis_client, "get", side_effect=mock_redis_get), \
         patch("httpx.Client.post", return_value=mock_response) as mock_post, \
         patch.object(redis_client, "setex") as mock_setex:
         
        response = llm_client.call_llm("researcher", messages)
        assert response["content"] == "Tier 2 success"
        assert response["tier_used"] == 2
        # Verify post payload called with Tier 2 model: google/gemma-4-26b-a4b-it:free
        called_args, called_kwargs = mock_post.call_args
        assert called_kwargs["json"]["model"] == "google/gemma-4-26b-a4b-it:free"

# Helper helper to dump JSON
import json
def json_dumps_fallback(data):
    return json.dumps(data)
