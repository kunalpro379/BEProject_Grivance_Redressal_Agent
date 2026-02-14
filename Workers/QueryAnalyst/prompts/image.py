from __future__ import annotations

from typing import Tuple


def image_analysis_prompt(query: str) -> str:
    """
    Prompt for describing an image in the context of a grievance query.
    """
    return f"""
You are an AI image analysis expert.
User grievance: {query}

Return STRICT JSON with:
- description: detailed visual summary
- key_objects: array of important objects
- scene_type: short text
- context_match: true/false (does the image support the grievance?)
- reasoning: short explanation
- contains_text: true/false
- extracted_text: string (if any visible text)
- confidence: high/medium/low
"""

