from typing import Dict, Any, Tuple
from tools.image_analysis import ImageAnalysisEngine
from tools.image_validator import ImageQueryValidator
from tools.location_extractor import LocationExtractor
from tools.embeddings import EmbeddingEngine
from tools.db_query import DatabaseQueryEngine
from tools.pdf_report import generate_pdf_from_markdown
from tools.tavily_search import TavilySearchEngine
from tools.department_allocator import DepartmentAllocator
from persistent.supabase import insert_user_grievience
from agents import grievance_agents as GA
from configs.config import Config
from LLMs.groq_llm import GroqLLM

image_engine = ImageAnalysisEngine()
validator_engine = ImageQueryValidator()
location_engine = LocationExtractor()
tavily_engine = TavilySearchEngine()
department_allocator = DepartmentAllocator()
groq_llm = GroqLLM()
_embedding_engine = None

def _get_embedding_engine():
    """Lazy singleton so SentenceTransformer is only loaded when embedding node runs."""
    global _embedding_engine
    if _embedding_engine is None:
        _embedding_engine = EmbeddingEngine()
    return _embedding_engine

db_engine = DatabaseQueryEngine()

def NODE_validate_image(state: Dict[str, Any]) -> Dict[str, Any]:
    """Validate if image matches the query before processing."""
    query = state["query"]
    IMAGE_URL = state.get("IMAGE_URL")
    
    validation_result = {
        "is_valid": True,
        "validation_score": 1.0,
        "reasoning": "No image provided",
        "mismatches": [],
        "confidence": "none",
        "image_shows": "No image"
    }
    
    if IMAGE_URL:
        print("    Validating image-query match...")
        validation_result = validator_engine.validate_image_query_match(IMAGE_URL, query)
        print(f"   ✓ Validation: {validation_result['is_valid']} (score: {validation_result['validation_score']:.2f})")
    
    state["validation_result"] = validation_result
    state["is_validated"] = validation_result["is_valid"]
    return state


def NODE_extract_location(state: Dict[str, Any]) -> Dict[str, Any]:
    """Extract location details from image."""
    IMAGE_URL = state.get("IMAGE_URL")
    query = state["query"]
    
    location_data = {
        "address": "Not available",
        "latitude": None,
        "longitude": None,
        "landmarks": [],
        "area_type": "unknown",
        "location_details": {},
        "confidence": "none",
        "extraction_method": "none"
    }
    
    if IMAGE_URL:
        print("   📍 Extracting location from image...")
        location_data = location_engine.extract_location_from_image(IMAGE_URL, query)
        print(f"   ✓ Location: {location_data['address']} (confidence: {location_data['confidence']})")
    
    state["location_data"] = location_data
    return state


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
    location = state.get("location_data", {})
    
    desc = img.get("description", "")
    extracted_text = img.get("extracted_text") or ""
    desc, extracted_text = _sanitize_image_summary(desc, extracted_text)
    
    # Include location data in enhanced query
    location_info = ""
    if location.get("confidence") not in ["none", None]:
        location_info = f"\nLocation: {location.get('address', 'Not specified')}"
        if location.get("landmarks"):
            location_info += f"\nNearby landmarks: {', '.join(location['landmarks'][:3])}"
        if location.get("area_type"):
            location_info += f"\nArea type: {location['area_type']}"
    
    enhanced_query = (
        f"{query.strip()}\n\n"
        f"Image description: {desc}\n"
        f"Visible text in image: {extracted_text}"
        f"{location_info}"
    ).strip()
    
    state["enhanced_query"] = enhanced_query
    return state


def NODE_create_described_query(state: Dict[str, Any]) -> Dict[str, Any]:
    """Create LLM-described version of query with image, location, and category."""
    query = state["query"]
    img = state.get("image_analysis", {})
    location = state.get("location_data", {})
    
    # Build a comprehensive prompt for LLM to describe the query
    prompt = f"""You are analyzing a citizen grievance. Create a comprehensive, well-structured description that includes:

1. The original complaint/query
2. Visual evidence from the image (if available)
3. Location details (if available)
4. Initial category assessment

Original Query:
{query}

Image Analysis:
- Description: {img.get('description', 'No image provided')}
- Key Objects: {', '.join(img.get('key_objects', [])) or 'None'}
- Scene Type: {img.get('scene_type', 'Unknown')}
- Extracted Text: {img.get('extracted_text', 'None')}

Location Information:
- Address: {location.get('address', 'Not specified')}
- Landmarks: {', '.join(location.get('landmarks', [])) or 'None'}
- Area Type: {location.get('area_type', 'Unknown')}

Create a detailed, professional description (2-3 paragraphs) that synthesizes all this information into a coherent grievance description. Focus on facts and observable details."""

    try:
        print("   📝 Creating LLM-described query...")
        described_query = groq_llm.generate(prompt)
        state["enhanced_query_described"] = described_query
        print(f"      ✓ Created described query ({len(described_query)} chars)")
    except Exception as e:
        print(f"      ⚠️ Error creating described query: {e}")
        # Fallback to enhanced_query
        state["enhanced_query_described"] = state["enhanced_query"]
    
    return state
def NODE_embed_query(state:Dict[str, Any])->Dict[str, Any]:
    enhanced_query=state["enhanced_query"]
    emb = _get_embedding_engine().embed_query(enhanced_query)
    state["embedding"]=emb
    retrieved=db_engine.retrive_releveant_data(emb)
    state["retrieved_data"]=retrieved
    return state
def NODE_run_agents(state: Dict[str, Any]) -> Dict[str, Any]:
    enhanced_query = state["enhanced_query"]
    retrieved=state.get("retrieved_data", {})
    validation_result = state.get("validation_result", {})
    
    agents_outputs:Dict[str, Any]={}
    agents_outputs["query_type"] = GA.analyze_query_type(enhanced_query)
    agents_outputs["location"] = GA.analyze_location(enhanced_query)
    agents_outputs["emotion"] = GA.analyze_emotion(enhanced_query)
    agents_outputs["severity"] = GA.analyze_severity(enhanced_query)
    agents_outputs["patterns"] = GA.analyze_patterns(enhanced_query, retrieved)
    # Pass validation_result instead of retrieved_data to fraud analysis
    agents_outputs["fraud"] = GA.analyze_fraud(enhanced_query, validation_result)
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


def NODE_tavily_search(state: Dict[str, Any]) -> Dict[str, Any]:
    """Search for real-time data using Tavily (news, policies, government decisions, etc.)."""
    print("   🌐 Searching real-time data with Tavily...")
    
    # Get search queries from policy_search
    policy_search = state.get("policy_search", {})
    queries = policy_search.get("queries", [])
    
    # Also add category-specific searches
    category_info = state["agents_outputs"].get("category", {})
    location_info = state["agents_outputs"].get("location", {})
    
    main_category = category_info.get("main_category", "")
    state_name = location_info.get("state", "India")
    
    # Add additional real-time search queries
    additional_queries = []
    if main_category:
        additional_queries.append(f"{main_category} latest news {state_name}")
        additional_queries.append(f"{main_category} government policy {state_name} 2024 2025")
        additional_queries.append(f"{main_category} budget allocation {state_name}")
    
    all_queries = queries[:3] + additional_queries[:2]  # Limit to 5 total queries
    
    if not all_queries:
        print("      ⚠️ No search queries available, skipping Tavily search")
        state["tavily_search_results"] = {}
        return state
    
    try:
        search_results = tavily_engine.search_realtime_data(all_queries, max_results_per_query=3)
        state["tavily_search_results"] = search_results
        
        total_results = sum(len(r.get("results", [])) for r in search_results.values())
        print(f"      ✓ Found {total_results} real-time results across {len(search_results)} queries")
    except Exception as e:
        print(f"      ❌ Error in Tavily search: {e}")
        state["tavily_search_results"] = {}
    
    return state


def NODE_allocate_department(state: Dict[str, Any]) -> Dict[str, Any]:
    """Allocate department using Supabase embedding search."""
    print("   🏢 Allocating department from Supabase...")
    
    # Get required information
    location_info = state["agents_outputs"].get("location", {})
    department_info = state["agents_outputs"].get("department", {})
    location_data = state.get("location_data", {})
    category_info = state["agents_outputs"].get("category", {})
    
    location = location_info.get("district", "") or location_info.get("state", "")
    recommended_dept = department_info.get("recommended_department", "")
    address = location_data.get("address", "")
    category = category_info.get("main_category", "")
    embedding = state.get("embedding", [])
    
    if not embedding:
        print("      ⚠️ No embedding available, skipping department allocation")
        state["allocated_department"] = None
        return state
    
    try:
        allocated_dept = department_allocator.allocate_department(
            location=location,
            recommended_department=recommended_dept,
            address=address,
            query_embedding=embedding,
            category=category
        )
        
        state["allocated_department"] = allocated_dept
        
        if allocated_dept:
            print(f"      ✓ Allocated to: {allocated_dept['name']}")
        else:
            print(f"      ⚠️ No department allocated")
            
    except Exception as e:
        print(f"      ❌ Error allocating department: {e}")
        state["allocated_department"] = None
    
    return state   
def NODE_generate_report(state: Dict[str, Any]) -> Dict[str, Any]:
    grievance_text=state["query"]
    image_analysis=state.get("image_analysis", {})
    agents_outputs=state.get("agents_outputs", {})
    policy_search=state.get("policy_search", {})
    retrieved=state.get("retrieved_data", {})
    enhanced_query = state.get("enhanced_query")
    enhanced_query_described = state.get("enhanced_query_described", enhanced_query)
    tavily_results = state.get("tavily_search_results", {})
    allocated_dept = state.get("allocated_department")

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
        "enhanced_query_described": enhanced_query_described,
        "image_analysis": image_analysis,
        "agents_outputs": agents_outputs,
        "policy_search_queries": policy_search,
        "tavily_search_results": tavily_results,
        "allocated_department": allocated_dept,
        "db_search_summary": db_summary,
        "raw_conversations": GA.get_reasoning_log(),
        "pipeline_steps": [
            {
                "step": "validate_image",
                "description": "Validated image-query match to detect fraud/spam.",
                "output_key": "validation_result",
            },
            {
                "step": "extract_location",
                "description": "Extracted location details from image metadata and visual analysis.",
                "output_key": "location_data",
            },
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
                "step": "create_described_query",
                "description": "Created LLM-described version with image, location, and category details.",
                "output_key": "enhanced_query_described",
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
                "step": "tavily_search",
                "description": "Searched real-time data using Tavily (news, government policies, budget allocations, etc.).",
                "output_key": "tavily_search_results",
            },
            {
                "step": "allocate_department",
                "description": "Allocated department using Supabase embedding search based on location, category, and description.",
                "output_key": "allocated_department",
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
    # Remove 'reasoning' fields from all agent outputs
    cleaned_agents_outputs = {}
    for key, value in agents_outputs.items():
        if isinstance(value, dict):
            cleaned_value = {k: v for k, v in value.items() if k not in ['reasoning', '_raw', '_error', '_raw_sentiment', '_raw_priority']}
            cleaned_agents_outputs[key] = cleaned_value
        else:
            cleaned_agents_outputs[key] = value
    
    # Build department field with allocated_department
    department_field = {
        "recommended_department": agents_outputs.get("department", {}).get("recommended_department", ""),
        "contact_information": None,
        "jurisdiction": None,
        "allocated_department": None
    }
    
    if allocated_dept:
        department_field["allocated_department"] = {
            "id": allocated_dept.get("id"),
            "name": allocated_dept.get("name"),
            "description": allocated_dept.get("description"),
            "address": allocated_dept.get("address"),
            "match_score": allocated_dept.get("match_score")
        }
        department_field["contact_information"] = allocated_dept.get("contact_information")
        department_field["jurisdiction"] = allocated_dept.get("jurisdiction")
    else:
        # Fallback to AI-recommended department info
        dept_info = agents_outputs.get("department", {})
        department_field["contact_information"] = dept_info.get("contact_information")
        department_field["jurisdiction"] = dept_info.get("jurisdiction")
    
    case_study = {
        "grievance": {
            "text": grievance_text,
            "enhanced_query_described": enhanced_query_described,
            "image": {
                "path": state.get("image_path"),
                "description": image_analysis.get("description", ""),
                "key_objects": image_analysis.get("key_objects", []),
                "scene_type": image_analysis.get("scene_type", ""),
                "extracted_text": image_analysis.get("extracted_text", ""),
            },
            "location": {
                "address": state.get("location_data", {}).get("address"),
                "latitude": state.get("location_data", {}).get("latitude"),
                "longitude": state.get("location_data", {}).get("longitude"),
                "landmarks": state.get("location_data", {}).get("landmarks", []),
                "area_type": state.get("location_data", {}).get("area_type"),
            },
            "category": cleaned_agents_outputs.get("category", {}).get("main_category"),
            "sub_category": cleaned_agents_outputs.get("category", {}).get("sub_category"),
        },
        "analysis": {
            "query_type": cleaned_agents_outputs.get("query_type"),
            "emotion": cleaned_agents_outputs.get("emotion"),
            "severity": cleaned_agents_outputs.get("severity"),
            "priority": cleaned_agents_outputs.get("sentiment_priority"),
            "patterns": cleaned_agents_outputs.get("patterns"),
            "historical_trends": cleaned_agents_outputs.get("similar_cases"),
            "fraud_risk": cleaned_agents_outputs.get("fraud"),
        },
        "department": department_field,
        "real_time_data": {
            "search_results": tavily_results,
            "policy_queries": policy_search.get("queries", []),
        },
    }

    state["json_result"] = case_study

    # Save JSON files
    import json as _json
    from configs.config import Config as _Cfg

    # Case-study JSON (final output - no reasoning/output fields)
    with open(_Cfg.json_analysis_path(), "w", encoding="utf-8") as f:
        _json.dump(case_study, f, indent=2, ensure_ascii=False)

    # Process / reasoning JSON (internal use only)
    with open(_Cfg.json_agents_path(), "w", encoding="utf-8") as f:
        _json.dump(process_trace, f, indent=2, ensure_ascii=False)

    # 5) Update Supabase UserGrievance with processed data (persist blob URL, not local/temp path)
    # grievance_text = original user query; enhanced_query_described = complete LLM-described version
    embedding = state.get("embedding", [])
    image_path = state.get("original_image_url") or state.get("image_path")
    image_description = image_analysis.get("description", "")
    validation_result = state.get("validation_result")
    location_data = state.get("location_data") or {}
    citizen_id = state.get("citizen_id")
    grievance_id = state.get("grievance_id")
    text_for_db = (grievance_text or "").strip() or (state.get("query") or "")

    # Use enhanced_query_described for DB storage
    enhanced_for_db = enhanced_query_described or enhanced_query or text_for_db

    insert_user_grievience(
        grievance_text=text_for_db,
        image_path=image_path,
        image_description=image_description,
        enhanced_query=enhanced_for_db,
        embedding=embedding,
        agent_outputs=cleaned_agents_outputs,
        full_result=case_study,
        validation_result=validation_result,
        location_data=location_data,
        citizen_id=citizen_id,
        grievance_id=grievance_id,
        image_analysis=state.get("image_analysis"),
    )

    return state


