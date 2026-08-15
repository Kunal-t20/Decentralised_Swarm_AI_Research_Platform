import math
import pytest
from unittest.mock import patch, MagicMock
from app.swarm.nodes.researcher import get_embedding
from app.services.qdrant_service import init_qdrant, qdrant_client
from app.services.events_service import emit, get_events_since
from app.models.research import AuditEvent

def test_phase2_embedding_fallback_unit_norm():
    """Verify that get_embedding fallback returns 768-dim L2 unit-normalized vector."""
    with patch("app.swarm.nodes.researcher.settings.OLLAMA_BASE_URL", None):
        vec = get_embedding("Quantum Computing Overview")
        assert len(vec) == 768
        norm = math.sqrt(sum(x * x for x in vec))
        # Vector magnitude should be approximately 1.0 (unit vector)
        assert abs(norm - 1.0) < 1e-5

def test_phase2_qdrant_payload_index():
    """Verify init_qdrant invokes create_payload_index for job_id."""
    with patch.object(qdrant_client, "get_collection", side_effect=Exception("Collection missing")), \
         patch.object(qdrant_client, "create_collection") as mock_create_col, \
         patch.object(qdrant_client, "create_payload_index") as mock_create_idx:

        init_qdrant()
        mock_create_col.assert_called_once()
        from qdrant_client.http import models
        mock_create_idx.assert_called_once_with(
            collection_name="research_chunks",
            field_name="job_id",
            field_schema=models.PayloadSchemaType.KEYWORD
        )

def test_phase2_events_dual_write_and_postgres_fallback():
    """Verify events_service dual-writes to Redis/Postgres and falls back to Postgres when Redis is empty."""
    mock_db = MagicMock()
    mock_record = MagicMock()
    mock_record.event_id = 1
    mock_record.event_type = "NODE_START"
    mock_record.agent = "researcher"
    mock_record.tier_used = 1
    mock_record.message = "Started"
    mock_record.data = {"key": "val"}

    mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = [mock_record]

    with patch("app.services.events_service.redis_client.incr", return_value=1), \
         patch("app.services.events_service.redis_client.rpush") as mock_rpush, \
         patch("app.services.events_service.SessionLocal", return_value=mock_db):

        # Test emit dual write
        emit(
            job_id="job-999",
            event_type="NODE_START",
            agent="researcher",
            tier_used=1,
            message="Started",
            data={"key": "val"}
        )
        mock_rpush.assert_called_once()
        assert mock_db.add.called
        assert mock_db.commit.called

    # Test get_events_since fallback to Postgres when Redis returns empty list
    with patch("app.services.events_service.redis_client.lrange", return_value=[]), \
         patch("app.services.events_service.SessionLocal", return_value=mock_db):

        events = get_events_since("job-999", since=0)
        assert len(events) == 1
        assert events[0]["event_type"] == "NODE_START"
        assert events[0]["agent"] == "researcher"
