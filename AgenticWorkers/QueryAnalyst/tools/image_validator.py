"""
Image-Query Validation Tool
Validates if the provided image matches the grievance query before processing.
"""
from typing import Dict, Any
import io
import re
import json
import requests
from PIL import Image

from LLMs.gemini_llm import GeminiClient


class ImageQueryValidator:
    def __init__(self) -> None:
        self.client = GeminiClient()

    def validate_image_query_match(
        self, image_path_or_url: str, query: str
    ) -> Dict[str, Any]:
        """
        Validate if image content matches the grievance query.
        
        Returns:
            {
                "is_valid": bool,
                "validation_score": float (0-1),
                "reasoning": str,
                "mismatches": list,
                "confidence": str ("high", "medium", "low")
            }
        """
        try:
            # Load image
            if image_path_or_url.startswith("http"):
                resp = requests.get(image_path_or_url, timeout=30)
                resp.raise_for_status()
                image = Image.open(io.BytesIO(resp.content))
            else:
                image = Image.open(image_path_or_url)

            fmt = (image.format or "").upper()
            mime_type = {
                "JPEG": "image/jpeg",
                "JPG": "image/jpeg",
                "PNG": "image/png",
                "WEBP": "image/webp",
            }.get(fmt, "image/jpeg")

            with io.BytesIO() as buf:
                image.save(buf, format=image.format or "PNG")
                image_bytes = buf.getvalue()

            # Validation prompt
            prompt = f"""
You are a government grievance validation system. Your task is to validate if the provided image matches the citizen's complaint.

CITIZEN'S COMPLAINT:
{query}

VALIDATION TASK:
1. Analyze the image content carefully
2. Check if the image provides visual evidence for the complaint
3. Identify any mismatches or inconsistencies
4. Provide a validation score (0.0 to 1.0)

SCORING GUIDELINES:
- 0.9-1.0: Perfect match, image clearly shows the issue described
- 0.7-0.89: Good match, image supports the complaint with minor differences
- 0.5-0.69: Partial match, some elements match but concerns exist
- 0.3-0.49: Poor match, significant mismatches
- 0.0-0.29: No match, image unrelated to complaint

Return ONLY a valid JSON object with this structure:
{{
    "is_valid": true/false,
    "validation_score": 0.85,
    "reasoning": "Detailed explanation of why image matches or doesn't match",
    "mismatches": ["list of any inconsistencies found"],
    "confidence": "high/medium/low",
    "image_shows": "Brief description of what the image actually shows"
}}

IMPORTANT: 
- is_valid should be true if validation_score >= 0.5
- Be strict but fair in validation
- Consider that citizens may not be professional photographers
"""

            response = self.client.vision_model.generate_content(
                [prompt, {"mime_type": mime_type, "data": image_bytes}]
            )
            raw = (response.text or "").strip()

            # Parse JSON response
            try:
                result = json.loads(raw)
            except json.JSONDecodeError:
                match = re.search(r"\{.*\}", raw, re.DOTALL)
                if match:
                    result = json.loads(match.group())
                else:
                    # Fallback if JSON parsing fails
                    return {
                        "is_valid": True,  # Default to valid to not block legitimate complaints
                        "validation_score": 0.6,
                        "reasoning": "Could not parse validation response, defaulting to valid",
                        "mismatches": [],
                        "confidence": "low",
                        "image_shows": "Unable to analyze",
                    }

            # Ensure required fields
            result.setdefault("is_valid", result.get("validation_score", 0) >= 0.5)
            result.setdefault("mismatches", [])
            result.setdefault("confidence", "medium")
            
            return result

        except Exception as e:
            # On error, default to valid to not block legitimate complaints
            return {
                "is_valid": True,
                "validation_score": 0.5,
                "reasoning": f"Validation error: {str(e)}. Defaulting to valid.",
                "mismatches": [f"Technical error: {str(e)}"],
                "confidence": "low",
                "image_shows": "Error during analysis",
            }
