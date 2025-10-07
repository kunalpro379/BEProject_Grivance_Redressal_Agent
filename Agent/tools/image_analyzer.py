"""
Image Analysis Engine using Gemini for image/text reasoning
"""

import json
import re
import requests
from PIL import Image
import io
import google.generativeai as genai
from typing import Dict, Any
from utils.config import Config


class ImageAnalysisEngine:
    """Uses Gemini for image/text reasoning"""

    def __init__(self, api_key: str = None):
        api_key = api_key or Config.GEMINI_API_KEY
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel("gemini-2.5-flash")

    def analyze_image(self, image_path_or_url: str, query: str) -> Dict[str, Any]:
        try:
            # Load image (support URL or local)
            if image_path_or_url.startswith("http"):
                resp = requests.get(image_path_or_url)
                resp.raise_for_status()
                image = Image.open(io.BytesIO(resp.content))
            else:
                image = Image.open(image_path_or_url)

            # Detect format for MIME type
            fmt = (image.format or "").upper()
            mime_type = {
                "JPEG": "image/jpeg",
                "JPG": "image/jpeg",
                "PNG": "image/png",
                "WEBP": "image/webp",
            }.get(fmt, "image/jpeg")

            # Convert image to bytes
            with io.BytesIO() as buf:
                image.save(buf, format=image.format or "PNG")
                image_bytes = buf.getvalue()

            prompt = f"""
            You are an AI image analysis expert.
            Task: Analyze the image according to this query: "{query}"

            Return JSON with these keys:
            - description: detailed visual summary
            - context_match: true/false (does the image support the query?)
            - reasoning: short justification
            - contains_text: true/false
            - evidence_present: true/false
            - confidence: high/medium/low
            """

            # Correct image+text call
            response = self.model.generate_content([
                prompt,
                {"mime_type": mime_type, "data": image_bytes},
            ])

            raw_text = (response.text or "").strip()

            try:
                return json.loads(raw_text)
            except json.JSONDecodeError:
                # Try to extract JSON if it's wrapped in other text
                json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
                if json_match:
                    return json.loads(json_match.group())

                return {
                    "description": raw_text,
                    "context_match": None,
                    "reasoning": "Raw text fallback (JSON parse failed).",
                    "contains_text": None,
                    "evidence_present": None,
                    "confidence": "Medium",
                }

        except Exception as e:
            return {
                "description": f"Error analyzing image: {str(e)}",
                "context_match": None,
                "reasoning": "",
                "contains_text": None,
                "evidence_present": None,
                "confidence": "Low",
            }
