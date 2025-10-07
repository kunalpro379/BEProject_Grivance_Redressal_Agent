"""
Groq LLM initialization and configuration
"""

from crewai import LLM
from groq import Groq
from utils.config import Config


class GroqLLM:
    """Handles Groq LLM initialization and configuration"""
    
    @staticmethod
    def initialize_llm():
        """Initialize Groq LLM with LLaMA 3.1 8B Instant"""
        groq_api_key = Config.GROQ_API_KEY
        
        if not groq_api_key:
            raise ValueError("Groq API key not provided. Set GROQ_API_KEY environment variable.")

        try:
            groq_client = Groq(api_key=groq_api_key)
            groq_client.models.list()

            llm = LLM(
                model="deepseek-r1-distill-llama-70b",
                api_key=groq_api_key,
                base_url="https://api.groq.com/openai/v1",
                temperature=0.1,
                max_tokens=4000,
                top_p=0.9,
                frequency_penalty=0.1,
                presence_penalty=0.1
            )

            print("✅ Groq LLM initialized successfully (LLaMA 3.1 8B Instant)")
            return llm

        except Exception as e:
            raise RuntimeError(f"Failed to initialize LLM: {e}")
