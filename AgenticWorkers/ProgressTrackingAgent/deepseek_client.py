"""
DeepSeek AI Client for Progress Tracking Agent
"""
import requests
import json
from typing import Dict, Any
import config

class DeepSeekClient:
    def __init__(self):
        self.api_key = config.DEEPSEEK_API_KEY
        self.base_url = config.DEEPSEEK_BASE_URL
        self.api_url = f"{self.base_url}/chat/completions"
        print(" DeepSeek AI client initialized")
    
    def generate_content(self, prompt: str, temperature: float = 0.3, max_tokens: int = 4000) -> Dict[str, Any]:
        """
        Generate content using DeepSeek API
        Returns response in Gemini-compatible format for easy migration
        """
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": "deepseek-chat",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are an expert government analyst. Provide detailed, accurate, and actionable insights."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": temperature,
                "max_tokens": max_tokens
            }
            
            response = requests.post(
                self.api_url,
                headers=headers,
                json=payload,
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                # Convert to Gemini-compatible format
                text_content = result['choices'][0]['message']['content']
                return {
                    'candidates': [{
                        'content': {
                            'parts': [{'text': text_content}]
                        }
                    }]
                }
            else:
                print(f"   ❌ DeepSeek API error: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"   ❌ DeepSeek API exception: {str(e)}")
            return None
