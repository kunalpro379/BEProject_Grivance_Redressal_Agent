from typing import Dict, Any
import json
import re

from crewai import Crew, LLM, Task
from configs.config import Config
from prompts import grievance as grievance_prompts
from .crew_agents import AgentsManager, TaskCreator


_crewai_llm = LLM(
    model="llama-3.1-8b-instant",
    api_key=Config.GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1",
    temperature=0.1,
    max_tokens=4000,
)

_agents_manager = AgentsManager(_crewai_llm)
_task_creator = TaskCreator(_agents_manager)
_reasoning_log: Dict[str, Any] = {}


def _run_task(task: Task, key: str) -> str:
    """Run a single CrewAI task and store raw conversation for later inspection."""
    crew = Crew(
        agents=[task.agent],
        tasks=[task],
        verbose=False,
        tracing=False,
    )
    result = crew.kickoff()
    _reasoning_log[key] = {
        "raw_output": result.raw,
        "task_description": task.description,
    }
    return result.raw


def _parse_json(raw: str) -> Dict[str, Any]:
    """Best-effort JSON extraction from model output."""
    try:
        return json.loads(raw)
    except Exception:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except Exception:
                pass
    return {"_raw": raw, "_error": "failed_to_parse_json"}


def get_reasoning_log() -> Dict[str, Any]:
    """Expose full CrewAI conversations for logging into JSON outputs."""
    return _reasoning_log


def analyze_query_type(enhanced_query: str) -> Dict[str, Any]:
    task = _task_creator.create_query_type_task(enhanced_query)
    raw = _run_task(task, "query_type")
    return _parse_json(raw)


def analyze_location(enhanced_query: str) -> Dict[str, Any]:
    task = _task_creator.create_location_task(enhanced_query)
    raw = _run_task(task, "location")
    return _parse_json(raw)


def analyze_emotion(enhanced_query: str) -> Dict[str, Any]:
    task = _task_creator.create_emotion_task(enhanced_query)
    raw = _run_task(task, "emotion")
    return _parse_json(raw)


def analyze_severity(enhanced_query: str) -> Dict[str, Any]:
    task = _task_creator.create_severity_task(enhanced_query)
    raw = _run_task(task, "severity")
    return _parse_json(raw)


def analyze_patterns(enhanced_query: str, retrieved_data: Dict[str, Any]) -> Dict[str, Any]:
    task = _task_creator.create_pattern_task(enhanced_query)
    raw = _run_task(task, "patterns")
    return _parse_json(raw)


def analyze_fraud(enhanced_query: str, validation_result: Dict[str, Any] = None) -> Dict[str, Any]:
    task = _task_creator.create_fraud_task(enhanced_query, validation_result)
    raw = _run_task(task, "fraud")
    return _parse_json(raw)


def analyze_category(enhanced_query: str, retrieved_data: Dict[str, Any]) -> Dict[str, Any]:
    task = _task_creator.create_category_task(enhanced_query, retrieved_data)
    raw = _run_task(task, "category")
    return _parse_json(raw)


def analyze_similar_cases(enhanced_query: str, retrieved_data: Dict[str, Any]) -> Dict[str, Any]:
    task = _task_creator.create_similar_cases_task(enhanced_query, retrieved_data)
    raw = _run_task(task, "similar_cases")
    return _parse_json(raw)


def suggest_department(enhanced_query: str, retrieved_data: Dict[str, Any]) -> Dict[str, Any]:
    task = _task_creator.create_department_task(enhanced_query, retrieved_data)
    raw = _run_task(task, "department")
    return _parse_json(raw)


def analyze_sentiment_priority(enhanced_query: str) -> Dict[str, Any]:
    """Run separate sentiment and priority agents, then merge into one dict."""
    sentiment_task = _task_creator.create_sentiment_task(enhanced_query)
    sentiment_raw = _run_task(sentiment_task, "sentiment")
    sentiment = _parse_json(sentiment_raw)

    priority_task = _task_creator.create_priority_task(enhanced_query)
    priority_raw = _run_task(priority_task, "priority")
    priority = _parse_json(priority_raw)

    merged: Dict[str, Any] = {
        "sentiment_score": sentiment.get("sentiment_score"),
        "urgency_level": sentiment.get("urgency_level"),
        "emotional_tone": sentiment.get("emotional_tone"),
        "key_emotional_indicators": sentiment.get("key_emotional_indicators"),
        "priority_level": priority.get("priority_level"),
        "justification": priority.get("justification"),
        "expected_resolution_time": priority.get("expected_resolution_time"),
        "risk_assessment": priority.get("risk_assessment"),
        "_raw_sentiment": sentiment,
        "_raw_priority": priority,
    }
    return merged


def policy_search_queries(enhanced_query: str, category_info: Dict[str, Any]) -> Dict[str, Any]:
    """Use CrewAI policy agent to generate ONLY web search queries for policies."""
    task = _task_creator.create_policy_task(enhanced_query, category_info)
    raw = _run_task(task, "policy_search")
    return _parse_json(raw)


def final_report(
    grievance_text: str,
    image_summary: Dict[str, Any],
    agents_outputs: Dict[str, Any],
    retrieved_data: Dict[str, Any],
    policy_queries: Dict[str, Any],
) -> str:
    """Return a Markdown report string using CrewAI manager agent."""
    system, user = grievance_prompts.final_report_prompt(
        grievance_text=grievance_text,
        image_summary=image_summary,
        agents_outputs=agents_outputs,
        retrieved_data=retrieved_data,
        policy_queries=policy_queries,
    )
    description = f"SYSTEM:\n{system}\n\nUSER:\n{user}"
    task = Task(
        description=description,
        agent=_agents_manager.get_agent("manager"),
        expected_output="Markdown report",
    )
    raw = _run_task(task, "final_report")
    # For the report we just return the full markdown text
    return raw