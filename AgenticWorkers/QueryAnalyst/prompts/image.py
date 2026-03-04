from __future__ import annotations

from typing import Tuple


def image_analysis_prompt(query: str) -> str:
    """
    Prompt for IN-DEPTH image description in the context of a grievance query.
    """
    return f"""
You are an AI image analysis expert for government grievance processing.

CITIZEN'S GRIEVANCE: {query}

Provide an IN-DEPTH analysis of the image with these details:

1. DETAILED DESCRIPTION: Comprehensive visual summary of what you see (2-3 sentences minimum)
2. KEY OBJECTS: Array of all important objects, structures, or elements visible
3. SCENE TYPE: Type of location/setting (street, building, park, residential area, etc.)
4. CONDITION ASSESSMENT: Current state/condition of what's shown (damaged, dirty, broken, functional, etc.)
5. CONTEXT MATCH: Does the image support the citizen's complaint? (true/false)
6. REASONING: Detailed explanation of why the image matches or doesn't match the complaint
7. TEXT EXTRACTION: Any visible text, signs, labels, or writing in the image
8. SEVERITY INDICATORS: Visual evidence of problem severity (if applicable)

Return ONLY a JSON object with this exact structure:
{{
    "description": "Detailed 2-3 sentence description of the entire scene",
    "key_objects": ["object1", "object2", "object3"],
    "scene_type": "location type",
    "condition": "current state/condition",
    "context_match": true,
    "reasoning": "Why this image supports or doesn't support the complaint",
    "contains_text": true,
    "extracted_text": "any visible text",
    "severity_indicators": ["indicator1", "indicator2"],
    "confidence": "high"
}}

Be thorough and descriptive - this analysis helps government officials understand the citizen's complaint."""

