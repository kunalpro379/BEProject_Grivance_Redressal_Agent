"""
Content Validator for textual content and query-image coherence using LLM
"""

import json
import re
import google.generativeai as genai
from typing import Dict, Any
from utils.config import Config


class ContentValidator:
    """Validates textual content and checks query-image coherence using LLM."""

    def __init__(self, api_key: str = None):
        api_key = api_key or Config.GEMINI_API_KEY
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash')

    def validate_content(self, query: str, image_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Dynamically validate query and proof relevance using LLM reasoning."""
        try:
            prompt = f"""
            You are a language moderation and relevance validation AI.
            Evaluate the following grievance submission:

            QUERY: "{query}"
            IMAGE ANALYSIS: {json.dumps(image_analysis, indent=2)}

            Provide a JSON response with the following keys:
            - "contains_abuse": True/False
            - "abuse_reason": Explain if abuse or offensive tone is detected.
            - "is_relevant": True/False (whether the query and image content align)
            - "relevance_reason": Short reasoning
            - "final_decision": "accepted" if clean and relevant, otherwise "rejected"
            - "enhanced_query": Combine the query with a concise, factual summary from image description to strengthen it.

            Ensure the output is valid JSON.
            """

            response = self.model.generate_content(prompt)
            raw_text = response.text.strip()

            try:
                # Attempt to parse the JSON
                validation = json.loads(raw_text)
            except json.JSONDecodeError:
                # If JSON parsing fails, try to extract a JSON-like string
                json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
                if json_match:
                    try:
                        validation = json.loads(json_match.group())
                    except Exception:
                        # Fallback if extracted string is still not valid JSON
                        validation = {
                            "contains_abuse": False,
                            "abuse_reason": f"JSON parse failed, raw output: {raw_text[:100]}...",
                            "is_relevant": False,
                            "relevance_reason": "Failed to parse LLM response.",
                            "final_decision": "rejected",
                            "enhanced_query": query
                        }
                else:
                     # Fallback if no JSON-like string is found
                    validation = {
                        "contains_abuse": False,
                        "abuse_reason": f"No JSON found in response, raw output: {raw_text[:100]}...",
                        "is_relevant": False,
                        "relevance_reason": "Failed to parse LLM response.",
                        "final_decision": "rejected",
                        "enhanced_query": query
                    }

            # Ensure all required keys are present even after parsing
            required_keys = ["contains_abuse", "abuse_reason", "is_relevant", "relevance_reason", "final_decision", "enhanced_query"]
            for key in required_keys:
                if key not in validation:
                    validation[key] = None

            return validation

        except Exception as e:
            return {
                "contains_abuse": False,
                "abuse_reason": f"Error during validation: {str(e)}",
                "is_relevant": False,
                "relevance_reason": "Error occurred during validation process.",
                "final_decision": "rejected",
                "enhanced_query": query,
            }
