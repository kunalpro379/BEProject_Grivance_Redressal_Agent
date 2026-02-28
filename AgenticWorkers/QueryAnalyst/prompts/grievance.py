from __future__ import annotations

import json
from typing import Any, Dict, Tuple

from configs.db import POLICY_DB_DESCRIPTION


def analyze_query_type_prompt(enhanced_query: str) -> Tuple[str, str]:
    system = "You classify grievance queries into types."
    user = f"""
QUERY: {enhanced_query}

Return JSON:
- query_type: Complaint | Suggestion | Query | Feedback | Follow-up | Appeal
- confidence: High | Medium | Low
- reasoning: string
"""
    return system, user


def analyze_location_prompt(enhanced_query: str) -> Tuple[str, str]:
    system = "You extract Indian location info from text."
    user = f"""
QUERY: {enhanced_query}

Return JSON:
- pincode: string or ""
- district: string
- state: string
- location_confidence: High | Medium | Low
- raw_location_mentions: array of strings
"""
    return system, user


def analyze_emotion_prompt(enhanced_query: str) -> Tuple[str, str]:
    system = "You detect emotional tone of grievances."
    user = f"""
QUERY: {enhanced_query}

Return JSON:
- primary_emotion: Angry | Frustrated | Sad | Confused | Urgent | Neutral
- secondary_emotions: array of strings
- emotion_intensity: number 1-10
- emotional_indicators: array of phrases
"""
    return system, user


def analyze_severity_prompt(enhanced_query: str) -> Tuple[str, str]:
    system = "You assess severity and impact of grievances."
    user = f"""
QUERY: {enhanced_query}

Return JSON:
- severity_level: Critical | High | Medium | Low
- criticality_score: number 1-10
- impact_scope: Individual | Community | Regional
- potential_consequences: array of strings
"""
    return system, user


def analyze_patterns_prompt(
    enhanced_query: str, retrieved_data: Dict[str, Any]
) -> Tuple[str, str]:
    system = "You detect recurring issue patterns and spam risk."
    user = f"""
GRIEVANCE: {enhanced_query}

SIMILAR_CASES (JSON):
{json.dumps(retrieved_data)[:8000]}

Return JSON:
- is_recurring_issue: boolean
- similar_patterns_found: array of strings
- spam_likelihood: Low | Medium | High
- pattern_notes: string
"""
    return system, user


def analyze_fraud_prompt(
    enhanced_query: str, retrieved_data: Dict[str, Any]
) -> Tuple[str, str]:
    system = "You detect fraud/spam/malicious risk in grievances."
    user = f"""
GRIEVANCE: {enhanced_query}

RELATED_CASES:
{json.dumps(retrieved_data)[:8000]}

Return JSON:
- fraud_risk: Low | Medium | High
- spam_indicators: array of strings
- authenticity_confidence: High | Medium | Low
- verification_recommendations: array of strings
"""
    return system, user


def analyze_category_prompt(
    enhanced_query: str, retrieved_data: Dict[str, Any]
) -> Tuple[str, str]:
    system = "You map grievances to categories and subcategories."
    user = f"""
GRIEVANCE: {enhanced_query}

SIMILAR_DATA:
{json.dumps(retrieved_data)[:8000]}

Return JSON:
- main_category: string (e.g. Sanitation, Roads, Water, Financial Fraud, Environment, Cybercrime, Other)
- sub_category: string
- confidence: High | Medium | Low
- reasoning: string
"""
    return system, user


def analyze_similar_cases_prompt(
    enhanced_query: str, retrieved_data: Dict[str, Any]
) -> Tuple[str, str]:
    system = "You summarize similar past grievances and resolutions."
    user = f"""
GRIEVANCE: {enhanced_query}

SIMILAR_CASES:
{json.dumps(retrieved_data)[:8000]}

Return JSON:
- top_3_similar_cases: array of short summaries
- common_resolutions: array of strings
- patterns_identified: array of strings
"""
    return system, user


def suggest_department_prompt(
    enhanced_query: str, retrieved_data: Dict[str, Any]
) -> Tuple[str, str]:
    system = "You route grievances to Indian government departments/authorities."
    user = f"""
GRIEVANCE: {enhanced_query}

SIMILAR_DATA:
{json.dumps(retrieved_data)[:8000]}

Return JSON:
- recommended_department: string
- contact_information: string (generic, non-personal)
- jurisdiction: string
"""
    return system, user


def analyze_sentiment_priority_prompt(enhanced_query: str) -> Tuple[str, str]:
    system = "You analyze sentiment and urgency/priority."
    user = f"""
GRIEVANCE: {enhanced_query}

Return JSON:
- sentiment_score: number 1-10
- urgency_level: High | Medium | Low
- emotional_tone: string
- key_emotional_indicators: array of strings
- priority_level: High | Medium | Low
- justification: string
"""
    return system, user


def policy_search_queries_prompt(
    enhanced_query: str, category_info: Dict[str, Any]
) -> Tuple[str, str]:
    """
    Template for queries to generate ONLY search queries; does NOT touch any DB.
    Uses POLICY_DB_DESCRIPTION text only.
    """
    system = "You generate Google/Bing search queries for Indian government schemes/policies."
    user = f"""
GRIEVANCE: {enhanced_query}

CATEGORY_INFO:
{json.dumps(category_info)}

POLICY_DB_DESCRIPTION (TEXT ONLY, DO NOT QUERY ANY DB):
{POLICY_DB_DESCRIPTION}

Return JSON:
- queries: array of 3-6 search query strings suitable for web search
- reasoning: short explanation
"""
    return system, user


def final_report_prompt(
    grievance_text: str,
    image_summary: Dict[str, Any],
    agents_outputs: Dict[str, Any],
    retrieved_data: Dict[str, Any],
    policy_queries: Dict[str, Any],
) -> Tuple[str, str]:
    system = (
        "You are a senior Indian government grievance officer writing an official, "
        "bureaucratic-style assessment note. Use formal language, minimal headings "
        "(only those explicitly requested), and long, cohesive paragraphs with "
        "precise, evidence-based reasoning."
    )
    user = f"""
Draft a PUBLIC-FACING GOVERNMENT DOCUMENT in Markdown, as if submitting it to a senior authority.

GRIEVANCE (RAW USER TEXT):
{grievance_text}

IMAGE_ANALYSIS:
{json.dumps(image_summary, indent=2)}

AGENT_OUTPUTS:
{json.dumps(agents_outputs, indent=2)}

SIMILAR_CASES_DATA:
{json.dumps(retrieved_data, indent=2)[:12000]}

STRICTLY FOLLOW THIS STRUCTURE (ONLY THREE MARKDOWN HEADINGS, BUT MANY PARAGRAPHS INSIDE):

1. MAIN TITLE
   - First line must be exactly:
     # Government Grievance Assessment Report

2. SECTION HEADING: "Case Identification"
   - Use the heading:
     ## Case Identification
   - Immediately below it, write ONE compact, factual paragraph that officially identifies
     the case, similar to the opening of a government file note. This paragraph must
     naturally include:
       * Grievance ID (a unique reference like G-YYYYMMDD-XXXX),
       * Date of submission (if not explicitly available, reasonably infer or state it
         in a neutral way such as "on or around [month, year]"),
       * Nature of grievance (Complaint / Request / Appeal / Query etc.),
       * Category & Subcategory,
       * Reported or assessed priority (High / Medium / Low).
     - This paragraph should be purely factual, with NO emotional language or analysis.

3. SECTION HEADING: "Detailed Assessment and Case Study"
   - Use the heading:
     ## Detailed Assessment and Case Study
   - Under this heading, write ONE single long paragraph. Do NOT use sub-headings,
     bullet lists, or labelled sections (e.g. "Context & Background", "Evidence &
     Proof Analysis", "Historical Grievance Analysis"). Weave everything into one
     continuous flowing narrative that covers: where the problem is (city, ward,
     locality) and since when; how it affects public life (health, environment,
     daily routine); the core problem (solid waste, open dumping, odour, pests,
     health hazards, civic violations); available evidence and whether it points to
     systemic failure; how similar past grievances were handled and any recurring
     pattern; whether this fits a broader trend of delayed or incomplete resolution;
     citizen frustration, neglect, trust erosion; why the priority level is
     High/Medium/Low (health risk, scale, escalation potential); responsible
     department and supporting departments; and the need for immediate action plus
     short- and long-term corrective measures. The reader should feel "this case
     requires action" without seeing any sub-headings or section labels.


ADDITIONAL FORMAT RULES:
- Do NOT create any extra headings apart from:
  "# Government Grievance Assessment Report",
  "## Case Identification",
  "## Detailed Assessment and Case Study".
- Do NOT mention internal AI details such as "agents", "models", "tools",
  "pipelines", "prompts", "APIs", "API keys", or technical error messages
  (for example, image-analysis failures or permission errors). If some
  evidence is unavailable, simply note that the available material is
  limited or incomplete, without describing technical reasons.
- Do NOT provide specific phone numbers, email IDs, or named grievance
  cells; where necessary, refer only to generic channels such as "the
  municipal grievance portal", "the ward office", or "the competent
  authority".
- Do NOT output JSON, error messages, or meta comments like "Thought:" or
  "Final Answer".
- Output ONLY the final public document in plain Markdown.

Return plain Markdown, no JSON.
"""
    return system, user

