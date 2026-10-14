"""
Embedding Service.

Responsible exclusively for generating text embeddings (numerical vector representations)
for vector search and semantic retrieval in Qdrant.

IMPORTANT ARCHITECTURAL SEPARATION:
- Generative LLMs (text generation): Handled by openrouter_client.py for Analyst and Critic.
- Vector Embeddings (semantic vectorization): Handled here for Researcher indexing and retrieval.
The Researcher agent does NOT use generative LLMs.
"""

import hashlib
import math
import random
import httpx
from app.core.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)

EMBEDDING_DIMENSION = 768
EMBEDDING_MODEL = "nomic-embed-text"


def generate_deterministic_fallback_embedding(text: str, dimension: int = EMBEDDING_DIMENSION) -> list[float]:
    """
    Generates a deterministic, L2 unit-normalized vector of the specified dimension
    based on a SHA256 hash seed of the input text.
    Used as an offline/fallback embedding when the local embedding provider is unavailable.
    """
    hasher = hashlib.sha256(text.lower().strip().encode("utf-8"))
    seed_int = int(hasher.hexdigest()[:8], 16)
    rng = random.Random(seed_int)
    raw_vec = [rng.gauss(0, 1) for _ in range(dimension)]
    norm = math.sqrt(sum(x * x for x in raw_vec)) or 1.0
    return [x / norm for x in raw_vec]


def get_embedding(text: str, base_url: str | None = None) -> list[float]:
    """
    Generate a 768-dimensional embedding from Ollama nomic-embed-text.
    Falls back to a deterministic unit-normalized mock vector if Ollama is unreachable/disabled.

    This function is strictly for vector representations and does NOT call any
    generative text-generation LLMs.
    """
    ollama_url = base_url if base_url is not None else settings.OLLAMA_BASE_URL
    if ollama_url:
        try:
            url = f"{ollama_url}/api/embeddings"
            # Allow the timeout to be overridden via ``settings.OLLAMA_TIMEOUT``
            # (default 30 s). This mirrors the LLM client configuration and lets
            # deployments with slower hardware increase the wait period without
            # code changes.
            timeout = getattr(settings, "OLLAMA_TIMEOUT", 5.0)
            response = httpx.post(
                url,
                json={"model": EMBEDDING_MODEL, "prompt": text},
                timeout=timeout,
            )
            if response.status_code == 200:
                data = response.json()
                if "embedding" in data:
                    return data["embedding"]
        except Exception as e:
            logger.warning("Ollama embedding request failed: %s. Using deterministic mock.", e)

    # If an Ollama base URL is configured we expected a real embedding request.
    # Reaching this point means the request failed (exception caught above) or
    # returned a non‑200 status.  Production jobs should not silently fall back to a
    # mock vector – raise an explicit error so the failure is visible.
    if settings.OLLAMA_BASE_URL:
        raise RuntimeError("Failed to obtain embedding from Ollama; no fallback is applied")
    # No Ollama endpoint configured (e.g., test environment).  Return the
    # deterministic mock vector as before.
    # If we reach this point, either no Ollama URL was configured (test/mock mode)
    # or a real Ollama request was attempted and failed.  In production environments
    # where ``settings.OLLAMA_BASE_URL`` is set we should **not** silently fall back to
    # a deterministic vector – that would hide a broken embedding pipeline.  Instead we
    # raise an explicit error so the failure surfaces to the caller (Researcher node).
    if settings.OLLAMA_BASE_URL:
        raise RuntimeError("Failed to obtain embedding from Ollama; no fallback is applied")
    # No Ollama endpoint configured – return deterministic mock vector for tests.
    return generate_deterministic_fallback_embedding(text, dimension=EMBEDDING_DIMENSION)
