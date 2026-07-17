import os

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.postgres import PostgresSaver
from psycopg_pool import ConnectionPool
from app.swarm.state import SwarmState
from app.swarm.nodes.researcher import researcher_node
from app.swarm.nodes.analyst import analyst_node
from app.swarm.nodes.critic import critic_node
from app.services.events_service import emit

def loop_back_node(state: SwarmState) -> dict:
    """Transition node to increment loop count and emit loopback event."""
    job_id = state.get("job_id")
    current_loops = state.get("loop_count", 0)
    new_loop_count = current_loops + 1
    
    emit(
        job_id=job_id,
        event_type="LOOP_BACK",
        agent="critic",
        message=f"Report draft did not meet passing criteria (scores < 7). Looping back to Analyst. (Iteration {new_loop_count}/3)"
    )
    
    return {
        "loop_count": new_loop_count
    }

def route_critic(state: SwarmState) -> str:
    """Conditional router function determining whether to finish or loop back."""
    scores = state.get("critic_scores", {})
    loop_count = state.get("loop_count", 0)
    
    # Check if all 4 dimensions got a score >= 7.0
    all_passed = False
    if scores:
        all_passed = all(score >= 7.0 for score in scores.values())
        
    if all_passed or loop_count >= 3:
        return "end"
    else:
        return "loop"

# 1. Initialize the State Graph
workflow = StateGraph(SwarmState)

# 2. Add Nodes
workflow.add_node("researcher", researcher_node)
workflow.add_node("analyst", analyst_node)
workflow.add_node("critic", critic_node)
workflow.add_node("loop_back", loop_back_node)

# 3. Configure Entry Point and Static Edges
workflow.set_entry_point("researcher")
workflow.add_edge("researcher", "analyst")
workflow.add_edge("analyst", "critic")
workflow.add_edge("loop_back", "analyst")

# 4. Configure Conditional Edges
workflow.add_conditional_edges(
    "critic",
    route_critic,
    {
        "end": END,
        "loop": "loop_back"
    }
)

# 5. Compile with Postgres checkpointer — reuses the project's existing Postgres DB,
#    no extra database needed. A connection pool handles Celery's concurrent tasks safely.
#    On first run, setup() creates the required checkpoint tables.
_CHECKPOINT_CONN_STRING = (
    os.getenv("DATABASE_URL", "postgresql://swarm:swarm@localhost:5432/research_db")
    .replace("postgresql+psycopg://", "postgresql://")  # strip SQLAlchemy dialect prefix
)

_checkpoint_pool = ConnectionPool(
    conninfo=_CHECKPOINT_CONN_STRING,
    max_size=5,
    kwargs={"autocommit": True, "prepare_threshold": 0},
    open=False,  # open lazily on first use so import doesn't block
)
_checkpoint_pool.open(wait=True)

checkpointer = PostgresSaver(_checkpoint_pool)
checkpointer.setup()  # creates langgraph checkpoint tables if they don't exist yet

swarm_graph = workflow.compile(checkpointer=checkpointer)

