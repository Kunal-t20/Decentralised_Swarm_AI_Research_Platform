import hashlib
import json
import time
import httpx
from app.core.config import settings
from app.core.database import redis_client

MODEL_MAPPING = {
    "researcher": {
        1: "openai/gpt-oss-120b",
        2: "openrouter/free",
        3: "llama3.2:3b",
    },
    "analyst": {
        1: "openai/gpt-oss-120b",
        2: "openrouter/free",
        3: "qwen2.5:7b",
    },
    "critic": {
        1: "openai/gpt-oss-120b",
        2: "nvidia/nemotron-3-nano-30b-a3b:free",
        3: "phi4:14b",
    },
}

class LLMClient:
    def __init__(self):
        self.timeout = 30.0

    def _get_prompt_cache(self, messages: list, model: str, cache_bust: str = "") -> str | None:
        """Retrieve cached prompt response if available.

        cache_bust: an extra string mixed into the cache key to invalidate stale
        entries (e.g. pass loop_count for analyst/critic calls to avoid loop-stall bugs).
        """
        serialized = json.dumps({"model": model, "messages": messages, "bust": cache_bust}, sort_keys=True)
        prompt_hash = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
        cache_key = f"llm:{prompt_hash}"
        try:
            cached = redis_client.get(cache_key)
            if cached:
                return cached
        except Exception as e:
            print(f"Warning: Redis prompt cache read failed: {e}")
        return None

    def _set_prompt_cache(self, messages: list, model: str, response: str, cache_bust: str = "") -> None:
        """Cache prompt response for 2 hours."""
        serialized = json.dumps({"model": model, "messages": messages, "bust": cache_bust}, sort_keys=True)
        prompt_hash = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
        cache_key = f"llm:{prompt_hash}"
        try:
            redis_client.setex(cache_key, 7200, response)
        except Exception as e:
            print(f"Warning: Redis prompt cache write failed: {e}")

    def _get_circuit_breaker_state(self, agent: str, tier: int) -> str:
        """Get circuit breaker state (CLOSED, OPEN, HALF-OPEN)."""
        state_key = f"cb:state:{agent}:{tier}"
        open_until_key = f"cb:open_until:{agent}:{tier}"
        
        try:
            state = redis_client.get(state_key) or "CLOSED"
            if state == "OPEN":
                open_until = redis_client.get(open_until_key)
                if open_until and time.time() > float(open_until):
                    # Transition to HALF-OPEN after cooling off
                    redis_client.set(state_key, "HALF-OPEN")
                    return "HALF-OPEN"
            return state
        except Exception as e:
            print(f"Warning: Redis circuit breaker read failed: {e}")
            return "CLOSED"

    def _record_success(self, agent: str, tier: int) -> None:
        """Record a successful call to close the circuit."""
        state_key = f"cb:state:{agent}:{tier}"
        failures_key = f"cb:failures:{agent}:{tier}"
        open_until_key = f"cb:open_until:{agent}:{tier}"
        
        try:
            redis_client.set(state_key, "CLOSED")
            redis_client.set(failures_key, 0)
            redis_client.delete(open_until_key)
        except Exception as e:
            print(f"Warning: Redis circuit breaker success record failed: {e}")

    def _record_failure(self, agent: str, tier: int) -> None:
        """Record a failure and trip circuit if consecutive failures >= 3."""
        state_key = f"cb:state:{agent}:{tier}"
        failures_key = f"cb:failures:{agent}:{tier}"
        open_until_key = f"cb:open_until:{agent}:{tier}"
        
        try:
            failures = redis_client.incr(failures_key)
            if failures >= 3:
                redis_client.set(state_key, "OPEN")
                redis_client.set(open_until_key, time.time() + 60.0) # 60 seconds cooling off
                print(f"CRITICAL: Circuit breaker for {agent} Tier {tier} tripped to OPEN.")
        except Exception as e:
            print(f"Warning: Redis circuit breaker failure record failed: {e}")

    def call_llm(self, agent: str, messages: list, temperature: float = 0.7, cache_bust: str = "") -> dict:
        """
        Executes chat completion routing across Tiers 1-3 with prompt caching and circuit breakers.
        Returns a dict: {"content": str, "model": str, "tier_used": int}
        """
        if agent not in MODEL_MAPPING:
            raise ValueError(f"Unknown agent type: {agent}")

        # Try Tiers 1 to 3 sequentially
        for tier in [1, 2, 3]:
            model = MODEL_MAPPING[agent][tier]
            
            # Check Circuit Breaker
            cb_state = self._get_circuit_breaker_state(agent, tier)
            if cb_state == "OPEN":
                print(f"Circuit breaker OPEN for {agent} Tier {tier}. Skipping to next tier.")
                continue

            # Check prompt cache first
            cached_response = self._get_prompt_cache(messages, model, cache_bust=cache_bust)
            if cached_response:
                print(f"Cache hit for model {model}")
                return {"content": cached_response, "model": model, "tier_used": tier}

            # Attempt API call
            try:
                content = self._execute_call(agent, tier, model, messages, temperature)
                self._record_success(agent, tier)
                self._set_prompt_cache(messages, model, content, cache_bust=cache_bust)
                return {"content": content, "model": model, "tier_used": tier}
            except Exception as e:
                print(f"Error calling {agent} Tier {tier} ({model}): {e}")
                self._record_failure(agent, tier)
                # Continue loop to next tier

        raise RuntimeError(f"All LLM tiers failed for agent {agent}")

    def call_llm_for_tier(self, agent: str, tier: int, messages: list, temperature: float = 0.7, cache_bust: str = "") -> dict:
        """Calls a specific tier for an agent, with circuit breaker and caching.

        cache_bust: mixed into the cache key; pass str(loop_count) for critic
        calls to prevent stale cache hits from stalling iterative loops.
        """
        if agent not in MODEL_MAPPING:
            raise ValueError(f"Unknown agent type: {agent}")
        if tier not in MODEL_MAPPING[agent]:
            raise ValueError(f"Unknown tier {tier} for agent {agent}")

        model = MODEL_MAPPING[agent][tier]

        cb_state = self._get_circuit_breaker_state(agent, tier)
        if cb_state == "OPEN":
            raise RuntimeError(f"Circuit breaker OPEN for {agent} Tier {tier}")

        cached_response = self._get_prompt_cache(messages, model, cache_bust=cache_bust)
        if cached_response:
            print(f"Cache hit for model {model}")
            return {"content": cached_response, "model": model, "tier_used": tier}

        try:
            content = self._execute_call(agent, tier, model, messages, temperature)
            self._record_success(agent, tier)
            self._set_prompt_cache(messages, model, content, cache_bust=cache_bust)
            return {"content": content, "model": model, "tier_used": tier}
        except Exception as e:
            print(f"Error calling {agent} Tier {tier} ({model}): {e}")
            self._record_failure(agent, tier)
            raise e

    def _execute_call(self, agent: str, tier: int, model: str, messages: list, temperature: float) -> str:
        """Perform the actual HTTP call to the tier's provider."""
        if tier == 1:
            # Direct call to Groq API
            if not settings.GROQ_API_KEY:
                raise ValueError("GROQ_API_KEY is not configured")

            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
            }

            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(url, headers=headers, json=payload)
                if response.status_code != 200:
                    raise httpx.HTTPStatusError(
                        f"Groq returned status {response.status_code}: {response.text}",
                        request=response.request,
                        response=response,
                    )
                data = response.json()
                return data["choices"][0]["message"]["content"]

        elif tier == 2:
            # OpenRouter API Call
            if not settings.OPENROUTER_API_KEY:
                raise ValueError("OPENROUTER_API_KEY is not configured")

            url = "https://openrouter.ai/api/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "Decentralized Swarm Research Platform",
            }
            payload = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
            }

            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(url, headers=headers, json=payload)
                if response.status_code != 200:
                    raise httpx.HTTPStatusError(
                        f"OpenRouter returned status {response.status_code}: {response.text}",
                        request=response.request,
                        response=response,
                    )
                data = response.json()
                return data["choices"][0]["message"]["content"]

        elif tier == 3:
            # Local Ollama Fallback
            if not settings.OLLAMA_BASE_URL:
                raise ValueError("Ollama fallback is disabled (OLLAMA_BASE_URL is not set)")

            url = f"{settings.OLLAMA_BASE_URL}/api/chat"
            payload = {
                "model": model,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": temperature,
                },
            }

            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(url, json=payload)
                if response.status_code != 200:
                    raise httpx.HTTPStatusError(
                        f"Ollama returned status {response.status_code}: {response.text}",
                        request=response.request,
                        response=response,
                    )
                data = response.json()
                return data["message"]["content"]

        raise ValueError(f"Unsupported tier: {tier}")

llm_client = LLMClient()
