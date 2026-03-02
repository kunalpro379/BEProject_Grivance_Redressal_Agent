from typing import Any

import google.generativeai as genai

from configs.config import Config


class GeminiClient:
    def __init__(self) -> None:
        if not Config.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY not set")
        genai.configure(api_key=Config.GEMINI_API_KEY)
        self.txt_model = genai.GenerativeModel("gemini-3.1-pro-preview")
        self.vision_model = genai.GenerativeModel("gemini-3.1-pro-preview")

