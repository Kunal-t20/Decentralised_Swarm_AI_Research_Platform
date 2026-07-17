import uuid
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app
from app.core.database import redis_client

client = TestClient(app)

# ----------------- Mock Redis Fixture -----------------
@pytest.fixture(autouse=True)
def mock_redis_calls():
    """Mock Redis calls to prevent tests from depending on actual Redis state."""
    with patch.object(redis_client, "incr", return_value=1), \
         patch.object(redis_client, "rpush", return_value=1), \
         patch.object(redis_client, "expire", return_value=True), \
         patch.object(redis_client, "lrange", return_value=[]):
        yield

# ----------------- E2E API Tests -----------------

def test_auth_and_job_lifecycle():
    """Test user registration, login, auth enforcement, and job lifecycle."""
    unique_email = f"user-{uuid.uuid4()}@example.com"
    password = "securepassword123"
    
    # 1. Register User
    reg_response = client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": password}
    )
    assert reg_response.status_code == 201
    assert reg_response.json()["email"] == unique_email
    assert "id" in reg_response.json()
    
    # 2. Login User
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": password}
    )
    assert login_response.status_code == 200
    token_data = login_response.json()
    assert token_data["token_type"] == "bearer"
    assert "access_token" in token_data
    
    token = token_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 3. Verify Auth Enforcement (request without token)
    unauth_response = client.get("/api/v1/research")
    assert unauth_response.status_code == 401
    
    # 4. Create Research Job (Mocking the Celery background task)
    topic = "Quantum Superposition"
    with patch("app.api.v1.research.run_research_swarm.delay") as mock_celery:
        job_response = client.post(
            "/api/v1/research",
            json={"topic": topic},
            headers=headers
        )
        assert job_response.status_code == 201
        job_data = job_response.json()
        assert job_data["topic"] == topic
        assert job_data["status"] == "pending"
        job_id = job_data["id"]
        
        # Verify background Celery task was dispatched with correct args
        mock_celery.assert_called_once_with(job_id, topic)

    # 5. List Research Jobs
    list_response = client.get("/api/v1/research", headers=headers)
    assert list_response.status_code == 200
    jobs = list_response.json()
    assert len(jobs) > 0
    assert any(j["id"] == job_id for j in jobs)
    
    # 6. Poll Job Status
    status_response = client.get(f"/api/v1/research/{job_id}", headers=headers)
    assert status_response.status_code == 200
    status_data = status_response.json()
    assert status_data["id"] == job_id
    assert status_data["status"] == "pending"
    assert "events" in status_data

    # 7. Delete Research Job
    del_response = client.delete(f"/api/v1/research/{job_id}", headers=headers)
    assert del_response.status_code == 204
    
    # 8. Verify Job Deletion
    get_del_response = client.get(f"/api/v1/research/{job_id}", headers=headers)
    assert get_del_response.status_code == 404


def test_rate_limiting_trigger():
    """Verify that sliding window rate limiter returns 429 on exceeding threshold."""
    unique_email = f"user-{uuid.uuid4()}@example.com"
    password = "password"
    
    # Register and login to get auth token
    client.post("/api/v1/auth/register", json={"email": unique_email, "password": password})
    login_res = client.post("/api/v1/auth/login", json={"email": unique_email, "password": password})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Mock Redis pipeline return values:
    # zremrangebyscore: 0, zcard: 11 (exceeds limit 10), zadd: 1, expire: True
    mock_pipeline = MagicMock()
    mock_pipeline.zremrangebyscore.return_value = mock_pipeline
    mock_pipeline.zcard.return_value = mock_pipeline
    mock_pipeline.expire.return_value = mock_pipeline
    # Pipeline now returns [zremrangebyscore_result, zcard_count, expire_result]
    # count=10 hits exactly >= limit (10), should trigger 429
    mock_pipeline.execute.return_value = [0, 10, True]
    
    with patch.object(redis_client, "pipeline", return_value=mock_pipeline):
        res = client.post(
            "/api/v1/research",
            json={"topic": "Quantum Computing"},
            headers=headers
        )
        assert res.status_code == 429
        assert "Rate limit exceeded" in res.json()["detail"]
