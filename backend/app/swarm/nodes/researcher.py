import hashlib
import random
import uuid
import httpx
from qdrant_client.http import models as qdrant_models
from app.core.config import settings
from app.services.qdrant_service import qdrant_client
from app.services.search_service import search_service
from app.services.events_service import emit
from app.swarm.state import SwarmState

def chunk_text(text: str, max_words: int = 400) -> list[str]:
    """Split text into chunks of roughly max_words."""
    words = text.split()
    chunks = []
    for i in range(0, len(words), max_words):
        chunks.append(" ".join(words[i : i + max_words]))
    return chunks

def get_embedding(text: str) -> list[float]:
    """
    Get 768-dimensional embedding from Ollama nomic-embed-text.
    Falls back to a deterministic mock vector if Ollama is unreachable/disabled.
    """
    if settings.OLLAMA_BASE_URL:
        try:
            url = f"{settings.OLLAMA_BASE_URL}/api/embeddings"
            response = httpx.post(
                url,
                json={"model": "nomic-embed-text", "prompt": text},
                timeout=5.0
            )
            if response.status_code == 200:
                data = response.json()
                if "embedding" in data:
                    return data["embedding"]
        except Exception as e:
            print(f"Ollama embedding request failed: {e}. Using deterministic mock.")

    # Fallback deterministic L2-normalized vector embedding of size 768
    import math
    hasher = hashlib.sha256(text.lower().strip().encode("utf-8"))
    seed_int = int(hasher.hexdigest()[:8], 16)
    rng = random.Random(seed_int)
    raw_vec = [rng.gauss(0, 1) for _ in range(768)]
    norm = math.sqrt(sum(x * x for x in raw_vec)) or 1.0
    return [x / norm for x in raw_vec]


def researcher_node(state: SwarmState) -> dict:
    job_id = state.get("job_id")
    topic = state.get("topic")
    
    emit(
        job_id=job_id,
        event_type="NODE_START",
        agent="researcher",
        message=f"Researcher agent started. Querying web sources for topic: '{topic}'"
    )

    # 1. Search web
    try:
        search_results = search_service.search(topic, max_results=5)
    except Exception as e:
        emit(
            job_id=job_id,
            event_type="LOG",
            agent="researcher",
            message=f"Search service execution failed: {e}"
        )
        search_results = []

    if not search_results:
        emit(
            job_id=job_id,
            event_type="NODE_END",
            agent="researcher",
            message="No search results were found or search service failed."
        )
        return {
            "research_notes": "No relevant search notes retrieved.",
            "sources": [],
        }

    emit(
        job_id=job_id,
        event_type="LOG",
        agent="researcher",
        message=f"Search completed. Found {len(search_results)} sources. Chunking and indexing to Qdrant..."
    )

    # 2. Chunk, embed and upload to Qdrant
    points = []
    sources_summary = []
    
    for item in search_results:
        title = item.get("title", "Untitled Source")
        url = item.get("url", "")
        content = item.get("content", "")
        
        sources_summary.append({"title": title, "url": url})
        
        # Prepare context representation of this source item
        full_text = f"Source Title: {title}\nSource URL: {url}\nContent: {content}"
        chunks = chunk_text(full_text, max_words=400)
        
        for idx, chunk in enumerate(chunks):
            vector = get_embedding(chunk)
            point_id = str(uuid.uuid4())
            payload = {
                "job_id": job_id,
                "chunk_index": idx,
                "text": chunk,
                "source_url": url,
                "source_title": title,
            }
            points.append(
                qdrant_models.PointStruct(
                    id=point_id,
                    vector=vector,
                    payload=payload,
                )
            )

    if points:
        try:
            qdrant_client.upsert(
                collection_name="research_chunks",
                points=points,
            )
            emit(
                job_id=job_id,
                event_type="LOG",
                agent="researcher",
                message=f"Successfully indexed {len(points)} chunks into Qdrant collection 'research_chunks'."
            )
        except Exception as e:
            emit(
                job_id=job_id,
                event_type="LOG",
                agent="researcher",
                message=f"Failed to upsert points into Qdrant: {e}"
            )

    # 3. Create researcher summary notes to pass in state as fallback / metadata
    compiled_notes = ""
    for idx, s in enumerate(search_results):
        compiled_notes += f"Source [{idx+1}]: {s.get('title')} ({s.get('url')})\nSnippet: {s.get('content')[:300]}...\n\n"

    emit(
        job_id=job_id,
        event_type="NODE_END",
        agent="researcher",
        message="Researcher completed indexing."
    )

    return {
        "research_notes": compiled_notes.strip(),
        "sources": sources_summary,
    }
