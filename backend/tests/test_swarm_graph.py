import json
import pytest
from unittest.mock import MagicMock, patch
from app.swarm.graph import swarm_graph
from app.core.database import redis_client

# We mock redis_client to avoid dependencies on actual Redis for state events
@pytest.fixture(autouse=True)
def mock_redis():
    with patch.object(redis_client, "incr", return_value=1), \
         patch.object(redis_client, "rpush", return_value=1), \
         patch.object(redis_client, "expire", return_value=True):
        yield

# ----------------- Integration Tests -----------------

def test_swarm_graph_single_pass_success():
    """Verify that graph exits directly when Critic yields passing scores (>=7.0)."""
    initial_state = {
        "job_id": "test-job-single",
        "topic": "Quantum Computing",
        "loop_count": 0,
        "research_notes": "",
        "analyst_draft": "",
        "critic_feedback": "",
        "critic_scores": {},
        "sources": [],
        "verdict": ""
    }

    mock_search = [{"title": "Quantum Info", "url": "http://quantum.org", "content": "Quantum qubits info"}]
    
    mock_analyst_response = {
        "content": "# Executive Summary\nQuantum computing is fast.\n# Detailed Technical Analysis\nQubits use superposition.\n# Comparative Evaluation\nClassical vs Quantum.\n# Conclusion & Future Work\nQuantum is the future.",
        "model": "openai/gpt-oss-120b:free",
        "tier_used": 1
    }
    
    mock_critic_response = {
        "content": json.dumps({
            "scores": {"clarity": 8, "depth": 8, "structure": 9, "rigor": 8},
            "feedback": "Excellent report. No revisions needed.",
            "verdict": "approve"
        }),
        "model": "deepseek/deepseek-r1:free",
        "tier_used": 1
    }

    # Patch search_service.search, llm_client.call_llm and llm_client.call_llm_for_tier
    with patch("app.swarm.nodes.researcher.search_service.search", return_value=mock_search) as mock_search_func, \
         patch("app.swarm.nodes.analyst.llm_client.call_llm", return_value=mock_analyst_response) as mock_analyst_func, \
         patch("app.swarm.nodes.critic.llm_client.call_llm_for_tier", return_value=mock_critic_response) as mock_critic_func:
         
        config = {"configurable": {"thread_id": "thread-1"}}
        result = swarm_graph.invoke(initial_state, config=config)
        
        # Verify the end state
        assert result["loop_count"] == 0
        assert result["verdict"] == "approve"
        assert result["critic_scores"]["clarity"] == 8.0
        assert mock_search_func.call_count == 1
        assert mock_analyst_func.call_count == 1
        # Called twice because Critic node invokes Tier 1 and Tier 2 concurrently
        assert mock_critic_func.call_count == 2

def test_swarm_graph_loop_back_and_approve():
    """Verify that graph loops back to Analyst once if Critic fails, then approves on second run."""
    initial_state = {
        "job_id": "test-job-loop",
        "topic": "Machine Learning",
        "loop_count": 0,
        "research_notes": "",
        "analyst_draft": "",
        "critic_feedback": "",
        "critic_scores": {},
        "sources": [],
        "verdict": ""
    }

    mock_search = [{"title": "ML Intro", "url": "http://ml.org", "content": "Machine learning details"}]
    
    mock_analyst_response = {
        "content": "ML draft report structured appropriately.",
        "model": "openai/gpt-oss-120b:free",
        "tier_used": 1
    }

    critic_call_count = 0
    def mock_critic_eval(*args, **kwargs):
        nonlocal critic_call_count
        critic_call_count += 1
        # Since call_critic_model runs concurrently for Tier 1 and 2,
        # critic_call_count 1 and 2 represent the first loop's evaluations,
        # and 3 and 4 represent the second loop's evaluations.
        if critic_call_count <= 2:
            return {
                "content": json.dumps({
                    "scores": {"clarity": 5, "depth": 6, "structure": 8, "rigor": 5},
                    "feedback": "First pass feedback: clarify neural net concepts.",
                    "verdict": "reject"
                }),
                "model": "deepseek/deepseek-r1:free",
                "tier_used": 1
            }
        else:
            return {
                "content": json.dumps({
                    "scores": {"clarity": 8, "depth": 8, "structure": 8, "rigor": 8},
                    "feedback": "Second pass: Approved!",
                    "verdict": "approve"
                }),
                "model": "deepseek/deepseek-r1:free",
                "tier_used": 1
            }

    with patch("app.swarm.nodes.researcher.search_service.search", return_value=mock_search), \
         patch("app.swarm.nodes.analyst.llm_client.call_llm", return_value=mock_analyst_response) as mock_analyst_func, \
         patch("app.swarm.nodes.critic.llm_client.call_llm_for_tier", side_effect=mock_critic_eval) as mock_critic_func:
         
        config = {"configurable": {"thread_id": "thread-2"}}
        result = swarm_graph.invoke(initial_state, config=config)
        
        # Verify the end state
        assert result["loop_count"] == 1  # looped once
        assert result["verdict"] == "approve"
        assert result["critic_scores"]["clarity"] == 8.0
        assert mock_analyst_func.call_count == 2  # ran twice
        assert mock_critic_func.call_count == 4  # ran twice per loop (x2 loops) = 4 times

def test_swarm_graph_max_loops_limit():
    """Verify that graph stops and exits to END when loop_count reaches 3, despite failing scores."""
    initial_state = {
        "job_id": "test-job-max-loops",
        "topic": "Blockchain",
        "loop_count": 0,
        "research_notes": "",
        "analyst_draft": "",
        "critic_feedback": "",
        "critic_scores": {},
        "sources": [],
        "verdict": ""
    }

    mock_search = [{"title": "Web3", "url": "http://web3.org", "content": "Blockchain content"}]
    mock_analyst_response = {
        "content": "ML draft report.",
        "model": "openai/gpt-oss-120b:free",
        "tier_used": 1
    }
    
    # Critic consistently rejects
    mock_critic_response = {
        "content": json.dumps({
            "scores": {"clarity": 4, "depth": 4, "structure": 4, "rigor": 4},
            "feedback": "Rejecting this report again.",
            "verdict": "reject"
        }),
        "model": "deepseek/deepseek-r1:free",
        "tier_used": 1
    }

    with patch("app.swarm.nodes.researcher.search_service.search", return_value=mock_search), \
         patch("app.swarm.nodes.analyst.llm_client.call_llm", return_value=mock_analyst_response) as mock_analyst_func, \
         patch("app.swarm.nodes.critic.llm_client.call_llm_for_tier", return_value=mock_critic_response) as mock_critic_func:
         
        config = {"configurable": {"thread_id": "thread-3"}}
        result = swarm_graph.invoke(initial_state, config=config)
        
        # Verify the end state: loop_count reached limit of 3
        assert result["loop_count"] == 3
        assert result["verdict"] == "reject"
        assert mock_analyst_func.call_count == 4  # Iterations: 0, 1, 2, 3 = 4 analyst runs
        assert mock_critic_func.call_count == 8  # 4 loops x 2 concurrent calls = 8 critic calls
