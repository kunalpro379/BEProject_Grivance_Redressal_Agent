from groq import Groq
from utils.config import GROQ_API_KEY, LLM_MODEL, LLM_TEMPERATURE, LLM_MAX_TOKENS

class LLMTool:
    def __init__(self):
        self.client = Groq(api_key=GROQ_API_KEY)
    
    def generate(self, prompt):
        """Generate response using Groq LLM"""
        try:
            chat_completion = self.client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=LLM_MODEL,
                temperature=LLM_TEMPERATURE,
                max_tokens=LLM_MAX_TOKENS,
            )
            return chat_completion.choices[0].message.content
        except Exception as e:
            print(f"LLM Error: {str(e)}")
            return f"Error: {str(e)}"