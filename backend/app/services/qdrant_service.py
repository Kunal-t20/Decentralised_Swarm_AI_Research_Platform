from qdrant_client import QdrantClient
from qdrant_client.http import models

from app.core.config import settings

qdrant_client = QdrantClient(url=settings.QDRANT_URL)


def init_qdrant():
    collection_name = "research_chunks"
    try:
        # Check if collection exists
        exists = False
        try:
            qdrant_client.get_collection(collection_name)
            exists = True
        except Exception:
            pass

        if not exists:
            qdrant_client.create_collection(
                collection_name=collection_name,
                vectors_config=models.VectorParams(
                    size=768,  # Matches nomic-embed-text / embedding dimensions
                    distance=models.Distance.COSINE,
                ),
            )
            print(f"Qdrant collection '{collection_name}' created.")
        else:
            print(f"Qdrant collection '{collection_name}' already exists.")

        # Create payload index for job_id to enable fast filtered lookups
        try:
            qdrant_client.create_payload_index(
                collection_name=collection_name,
                field_name="job_id",
                field_schema=models.PayloadSchemaType.KEYWORD,
            )
            print("Qdrant payload index for 'job_id' ensured.")
        except Exception as idx_err:
            print(f"Note: Payload index check for 'job_id': {idx_err}")

    except Exception as e:
        # Log a warning but don't fail boot if Qdrant is unreachable during bootstrap
        print(f"Warning: Failed to check/initialize Qdrant collection: {e}")

