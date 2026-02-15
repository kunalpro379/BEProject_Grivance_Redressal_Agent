from typing import Dict, Any
import io
import re
import json
import requests
from PIL import Image

from LLMs.gemini_llm import GeminiClient
from prompts.image import image_analysis_prompt


class ImageAnalysisEngine:
    def __init__(self) -> None:
        self.client = GeminiClient()

    def describe_image(self, image_path_or_url: str, query: str) -> Dict[str, Any]:
        """Return JSON with description + relevance info."""
        try:
            if image_path_or_url.startswith("http"):
                resp = requests.get(image_path_or_url)
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

            prompt = image_analysis_prompt(query)
            response = self.client.vision_model.generate_content(
                [prompt, {"mime_type": mime_type, "data": image_bytes}]
            )
            raw = (response.text or "").strip()

            try:
                return json.loads(raw)
            except json.JSONDecodeError:
                match = re.search(r"\{.*\}", raw, re.DOTALL)
                if match:
                    return json.loads(match.group())

                return {
                    "description": raw,
                    "key_objects": [],
                    "scene_type": "",
                    "context_match": None,
                    "reasoning": "Raw text fallback",
                    "contains_text": None,
                    "extracted_text": "",
                    "confidence": "medium",
                }
        except Exception as e:
            return {
                "description": f"Error analyzing image: {e}",
                "key_objects": [],
                "scene_type": "",
                "context_match": None,
                "reasoning": "",
                "contains_text": None,
                "extracted_text": "",
                "confidence": "low",
            }

    # Backwards-compatible alias used in workflow.nodes
    def analyze_image(self, image_url: str, query: str) -> Dict[str, Any]:
        """Alias for describe_image for older call sites."""
        return self.describe_image(image_url, query)