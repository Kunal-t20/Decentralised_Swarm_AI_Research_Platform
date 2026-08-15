import operator
from typing import Annotated, TypedDict, List, Dict, Any, Optional


class SwarmState(TypedDict):
    job_id: str
    topic: str
    loop_count: int
    research_notes: str
    analyst_draft: str
    critic_feedback: str
    critic_scores: Dict[str, Any]
    sources: List[Dict[str, Any]]
    verdict: str  # "approve" or "reject"
    _feedbacks_to_persist: Annotated[List[Dict[str, Any]], operator.add]
    draft_history: Annotated[List[Dict[str, Any]], operator.add]

