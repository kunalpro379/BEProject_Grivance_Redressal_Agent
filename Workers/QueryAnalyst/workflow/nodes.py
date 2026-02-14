from typing import Dict, Any, Tuple
from tools.image_analysis import ImageAnalysisEngine
from tools.embeddings import EmbeddingEngine
from tools.db_query import DatabaseQueryEngine
from tools.pdf_report import generate_pdf_from_markdown
from persistent.supabase import insert_user_grievience
from agents import grievance_agents as GA
from configs.config import Config

image_engine=ImageAnalysisEngine()
embedding_engine=EmbeddingEngine()
db_engine=DatabaseQueryEngine()

def NODE_describe_image(state:Dict[str,Any])-> Dict[str, Any]:
    query=state["query"]
    IMAGE_URL=state["IMAGE_URL"]
    image_analysis={
        "description": "",
        "key_objects": [],
        "scene_type": "",
        "context_match": None,
        "reasoning": "",
        "contains_text": None,
        "extracted_text": "",
        "confidence": "low"
    }
    if IMAGE_URL:
        image_analysis=image_engine.analyze_image(image_url=IMAGE_URL, query=query)

    state["image_analysis"]=image_analysis
    return state

def _sanitize_image_summary(desc: str, extracted_text: str) -> Tuple[str, str]:
    """Remove API/technical error text from image analysis before passing to agents."""
    error_indicators = ("error", "permission denied", "suspended", "403", "api_key")
    desc_lower = (desc or "").lower()
    text_lower = (extracted_text or "").lower()
    if any(ind in desc_lower for ind in error_indicators):
        desc = "No image description available."
    if any(ind in text_lower for ind in error_indicators):
        extracted_text = ""
    return desc, extracted_text or ""


def NODE_enhance_query(state: Dict[str, Any]) -> Dict[str, Any]:
    query = state["query"]
    img = state.get("image_analysis", {})
    desc = img.get("description", "")
    extracted_text = img.get("extracted_text") or ""
    desc, extracted_text = _sanitize_image_summary(desc, extracted_text)
    enhanced_query = (
        f"{query.strip()}\n\n"
        f"Image description: {desc}\n"
        f"Visible text in image: {extracted_text}"
    ).strip()
    state["enhanced_query"] = enhanced_query
    return state
def NODE_embed_query(state:Dict[str, Any])->Dict[str, Any]:
    enhanced_query=state["enhanced_query"]
    emb=embedding_engine.embed_query(enhanced_query)
    state["embedding"]=emb
    retrieved=db_engine.retrive_releveant_data(emb)
    state["retrieved_data"]=retrieved
    return state
def NODE_run_agents(state: Dict[str, Any]) -> Dict[str, Any]:
    enhanced_query = state["enhanced_query"]
    retrieved=state.get("retrieved_data", {})
    agents_outputs:Dict[str, Any]={}
    agents_outputs["query_type"] = GA.analyze_query_type(enhanced_query)
    agents_outputs["location"] = GA.analyze_location(enhanced_query)
    agents_outputs["emotion"] = GA.analyze_emotion(enhanced_query)
    agents_outputs["severity"] = GA.analyze_severity(enhanced_query)
    agents_outputs["patterns"] = GA.analyze_patterns(enhanced_query, retrieved)
    agents_outputs["fraud"] = GA.analyze_fraud(enhanced_query, retrieved)
    agents_outputs["category"] = GA.analyze_category(enhanced_query, retrieved)
    agents_outputs["similar_cases"] = GA.analyze_similar_cases(enhanced_query, retrieved)
    agents_outputs["department"] = GA.suggest_department(enhanced_query, retrieved)
    agents_outputs["sentiment_priority"] = GA.analyze_sentiment_priority(enhanced_query)
    state["agents_outputs"]=agents_outputs
    return state

def NODE_Policy_Queries(state: Dict[str, Any]) -> Dict[str, Any]:
    enhanced_query = state["enhanced_query"]
    category_info = state["agents_outputs"].get("category", {})
    policy_search = GA.policy_search_queries(enhanced_query, category_info)
    state["policy_search"] = policy_search
    state["agents_outputs"]["policy_search"] = policy_search
    return state   
def NODE_generate_report(state: Dict[str, Any]) -> Dict[str, Any]:
    grievance_text=state["query"]
    image_analysis=state.get("image_analysis", {})
    agents_outputs=state.get("agents_outputs", {})
    policy_search=state.get("policy_search", {})
    retrieved=state.get("retrieved_data", {})
    enhanced_query = state.get("enhanced_query")

    # MD FILE (textual professional report)
    report_md = GA.final_report(
        grievance_text=grievance_text,
        image_summary=image_analysis,
        agents_outputs=agents_outputs,
        retrieved_data=retrieved,
        policy_queries=policy_search,
    )
    state["final_report_md"] = report_md

    # Write Markdown file
    md_path = Config.markdown_path()
    with open(md_path, "w", encoding="utf-8") as _f:
        _f.write(report_md)
    state["markdown_path"] = md_path

    # PDF document from Markdown
    pdf_path = generate_pdf_from_markdown(report_md, Config.pdf_path())
    state["pdf_path"] = pdf_path

    # 1) Process/Reasoning JSON (step-by-step reasoning, no raw DB rows)
    # Lightweight summary of DB retrieval without storing raw rows
    db_summary = {
        db_name: {table_name: len(rows) for table_name, rows in (tables or {}).items()}
        for db_name, tables in (retrieved or {}).items()
    }

    process_trace = {
        "grievance_text": grievance_text,
        "enhanced_query": enhanced_query,
        "image_analysis": image_analysis,
        "agents_outputs": agents_outputs,
        "policy_search_queries": policy_search,
        "db_search_summary": db_summary,
        "raw_conversations": GA.get_reasoning_log(),
        "pipeline_steps": [
            {
                "step": "describe_image",
                "description": "Analyzed any provided image to extract description, key objects, and visible text.",
                "output_key": "image_analysis",
            },
            {
                "step": "enhance_query",
                "description": "Combined user text with image description/OCR to create an enhanced query.",
                "output_key": "enhanced_query",
            },
            {
                "step": "embed_query_and_retrieve",
                "description": "Embedded the enhanced query and searched vector databases for similar past grievances and reference data. Only summary counts are stored here, not raw rows.",
                "output_key": "db_search_summary",
            },
            {
                "step": "run_agents",
                "description": "Multiple analysis agents (query_type, location, emotion, severity, patterns, fraud, category, similar_cases, department, sentiment_priority) generated structured reasoning.",
                "output_key": "agents_outputs",
            },
            {
                "step": "policy_search_queries",
                "description": "Generated external web search queries for relevant schemes/policies; no policy DB was queried directly.",
                "output_key": "policy_search_queries",
            },
            {
                "step": "final_report_generation",
                "description": "Composed a formal government-style Markdown report and exported it as a PDF document.",
                "output_key": "markdown_report_path",
            },
        ],
        "notes": "This file captures reasoning and intermediate agent outputs. "
                 "It does not include raw retrieved database rows.",
    }

    # 2) Case-study JSON (final structured view of the grievance)
    case_study = {
        "grievance": {
            "text": grievance_text,
            "enhanced_query": enhanced_query,
            "image": {
                "path": state.get("image_path"),
                "description": image_analysis.get("description", ""),
                "key_objects": image_analysis.get("key_objects", []),
                "scene_type": image_analysis.get("scene_type", ""),
                "extracted_text": image_analysis.get("extracted_text", ""),
            },
        },
        "location": agents_outputs.get("location"),
        "analysis": {
            "query_type": agents_outputs.get("query_type"),
            "emotion": agents_outputs.get("emotion"),
            "severity": agents_outputs.get("severity"),
            "priority": agents_outputs.get("sentiment_priority"),
            "patterns": agents_outputs.get("patterns"),
            "historical_trends": agents_outputs.get("similar_cases"),
            "fraud_risk": agents_outputs.get("fraud"),
        },
        "classification": {
            "category": agents_outputs.get("category"),
            "department": agents_outputs.get("department"),
        },
        "policy_search_queries": policy_search,
        "outputs": {
            "markdown_report_path": md_path,
            "pdf_path": pdf_path,
        },
    }

    state["json_result"] = case_study

    # Save JSON files
    import json as _json
    from configs.config import Config as _Cfg

    # Case-study JSON
    with open(_Cfg.json_analysis_path(), "w", encoding="utf-8") as f:
        _json.dump(case_study, f, indent=2, ensure_ascii=False)

    # Process / reasoning JSON
    with open(_Cfg.json_agents_path(), "w", encoding="utf-8") as f:
        _json.dump(process_trace, f, indent=2, ensure_ascii=False)

    # 5) Insert into Supabase UserGrivience
    embedding = state.get("embedding", [])
    image_path = state.get("image_path")
    image_description = image_analysis.get("description", "")

    insert_user_grievience(
        grievance_text=grievance_text,
        image_path=image_path,
        image_description=image_description,
        enhanced_query=state.get("enhanced_query", grievance_text),
        embedding=embedding,
        agent_outputs=agents_outputs,
        full_result=case_study,
    )

    return state


