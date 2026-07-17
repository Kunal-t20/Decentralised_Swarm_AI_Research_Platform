import hashlib
import json
from tavily import TavilyClient
from duckduckgo_search import DDGS
from app.core.config import settings
from app.core.database import redis_client

class SearchService:
    def __init__(self):
        self.tavily_client = None
        if settings.TAVILY_API_KEY:
            try:
                self.tavily_client = TavilyClient(api_key=settings.TAVILY_API_KEY)
            except Exception as e:
                print(f"Warning: Failed to initialize Tavily client: {e}")

    def _get_search_cache(self, query: str) -> list[dict] | None:
        """Retrieve cached search results if available."""
        query_hash = hashlib.sha256(query.strip().lower().encode("utf-8")).hexdigest()
        cache_key = f"search:{query_hash}"
        try:
            cached = redis_client.get(cache_key)
            if cached:
                print(f"Cache hit for search query: {query}")
                return json.loads(cached)
        except Exception as e:
            print(f"Warning: Redis search cache read failed: {e}")
        return None

    def _set_search_cache(self, query: str, results: list[dict]) -> None:
        """Cache search results for 24 hours."""
        query_hash = hashlib.sha256(query.strip().lower().encode("utf-8")).hexdigest()
        cache_key = f"search:{query_hash}"
        try:
            redis_client.setex(cache_key, 86400, json.dumps(results))
        except Exception as e:
            print(f"Warning: Redis search cache write failed: {e}")

    def search(self, query: str, max_results: int = 5) -> list[dict]:
        """
        Search with Tavily primary, falling back to DuckDuckGo on failure or quota issues.
        Caches results in Redis for 24 hours.
        """
        # 1. Check cache first
        cached = self._get_search_cache(query)
        if cached is not None:
            return cached[:max_results]

        results = []
        # 2. Try Tavily search
        if self.tavily_client:
            try:
                print(f"Executing Tavily search for: {query}")
                response = self.tavily_client.search(query=query, max_results=max_results)
                # Tavily search response structure is typically {"results": [...]}
                raw_results = response.get("results", [])
                for r in raw_results:
                    results.append({
                        "title": r.get("title", ""),
                        "url": r.get("url", ""),
                        "content": r.get("content", ""),
                    })
                if results:
                    self._set_search_cache(query, results)
                    return results
            except Exception as e:
                print(f"Warning: Tavily search failed: {e}. Falling back to DuckDuckGo.")

        # 3. DuckDuckGo Fallback
        try:
            print(f"Executing DuckDuckGo search fallback for: {query}")
            with DDGS() as ddgs:
                raw_results = list(ddgs.text(query, max_results=max_results))
                for r in raw_results:
                    results.append({
                        "title": r.get("title", ""),
                        "url": r.get("href") or r.get("url") or "",
                        "content": r.get("body") or r.get("content") or "",
                    })
                if results:
                    self._set_search_cache(query, results)
                    return results
        except Exception as e:
            print(f"Error: DuckDuckGo search fallback failed: {e}")

        return results

search_service = SearchService()
