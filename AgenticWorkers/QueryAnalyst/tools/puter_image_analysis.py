"""
Puter AI-based image analysis - FAST alternative to direct Gemini API.
Uses Puter's OpenAI-compatible endpoint for vision analysis.
"""

from typing import Dict, Any
import io
import re
import json
import base64
import os
from openai import OpenAI
import requests
from PIL import Image

from prompts.image import image_analysis_prompt


class PuterImageAnalyzer:
    """Fast image analysis using Puter's OpenAI-compatible API."""
    
    def __init__(self):
        auth_token = os.getenv('PUTER_AUTH_TOKEN')
        if not auth_token:
            print("⚠️  WARNING: PUTER_AUTH_TOKEN not configured for image analysis")
            self.client = None
        else:
            # Use Puter's OpenAI-compatible endpoint
            self.client = OpenAI(
                base_url='https://api.puter.com/puterai/openai/v1/',
                api_key=auth_token
            )
            print(" Puter image analyzer initialized")
        self.model = "gpt-4o"  # Vision model for OpenAI-compatible endpoint
    
    def describe_image(self, image_path_or_url: str, query: str) -> Dict[str, Any]:
        """
        Analyze image using Puter AI via OpenAI-compatible endpoint.
        Returns JSON with in-depth description + relevance info.
        """
        if not self.client:
            return {
                "description": "Image analysis unavailable - PUTER_AUTH_TOKEN not configured",
                "key_objects": [],
                "scene_type": "error",
                "condition": "unknown",
                "context_match": None,
                "reasoning": "Configuration error",
                "contains_text": None,
                "extracted_text": "",
                "severity_indicators": [],
                "confidence": "low",
            }
        
        try:
            # Load image
            if image_path_or_url.startswith("http"):
                resp = requests.get(image_path_or_url, timeout=10)
                resp.raise_for_status()
                image = Image.open(io.BytesIO(resp.content))
            else:
                image = Image.open(image_path_or_url)
            
            # Convert to base64 data URL
            with io.BytesIO() as buf:
                # Resize large images for faster processing
                max_size = 1024
                if image.width > max_size or image.height > max_size:
                    ratio = min(max_size / image.width, max_size / image.height)
                    new_size = (int(image.width * ratio), int(image.height * ratio))
                    image = image.resize(new_size, Image.Resampling.LANCZOS)
                
                image.save(buf, format="JPEG", quality=85)
                image_bytes = buf.getvalue()
                image_b64 = base64.b64encode(image_bytes).decode('utf-8')
            
            image_data_url = f"data:image/jpeg;base64,{image_b64}"
            
            # Prepare prompt
            prompt = image_analysis_prompt(query)
            
            # Call Puter AI using OpenAI SDK
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {"url": image_data_url}
                            }
                        ]
                    }
                ],
                max_tokens=1000
            )
            
            raw_text = response.choices[0].message.content
            
            # Parse JSON response
            try:
                return json.loads(raw_text)
            except json.JSONDecodeError:
                # Try to extract JSON from markdown code blocks
                match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw_text, re.DOTALL)
                if match:
                    return json.loads(match.group(1))
                
                # Try to find any JSON object
                match = re.search(r"\{.*\}", raw_text, re.DOTALL)
                if match:
                    return json.loads(match.group())
                
                # Fallback to raw text
                return {
                    "description": raw_text,
                    "key_objects": [],
                    "scene_type": "",
                    "condition": "",
                    "context_match": None,
                    "reasoning": "Raw text fallback",
                    "contains_text": None,
                    "extracted_text": "",
                    "severity_indicators": [],
                    "confidence": "medium",
                }
                
        except Exception as e:
            print(f"   ⚠️ Image analysis error: {e}")
            return {
                "description": f"Error analyzing image: {str(e)}",
                "key_objects": [],
                "scene_type": "error",
                "condition": "unknown",
                "context_match": None,
                "reasoning": f"Error: {str(e)}",
                "contains_text": None,
                "extracted_text": "",
                "severity_indicators": [],
                "confidence": "low",
            }
    
    def analyze_image(self, image_url: str, query: str) -> Dict[str, Any]:
        """Alias for describe_image for compatibility."""
        return self.describe_image(image_url, query)


# Global instance
puter_analyzer = PuterImageAnalyzer()
