import json
from typing import Any, Dict

from groq import Groq

from configs.config import Config


class GroqLLM:
    def __init__(self) -> None:
        if not Config.GROQ_API_KEY:
            raise RuntimeError("GROQ_API_KEY not set")
        self.client = Groq(api_key=Config.GROQ_API_KEY)

    def json_completion(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        resp = self.client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
        )
        content = resp.choices[0].message.content
        return json.loads(content)

