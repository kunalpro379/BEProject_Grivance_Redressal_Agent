import os
import json
from typing import Dict, List
from groq import Groq
from config import Config


class KnowledgeExtractor:
    """Extract structured knowledge from text using LLM"""
    
    def __init__(self):
        if not Config.GROQ_API_KEY:
            raise RuntimeError("GROQ_API_KEY not set in .env")
        self.client = Groq(api_key=Config.GROQ_API_KEY, timeout=60.0)
    
    def extract_knowledge(self, text: str, source_type: str, source_url: str) -> Dict[str, any]:
        """Extract structured knowledge from text content"""
        try:
            print(f"   🧠 Extracting knowledge using Groq (Llama 3.1)...")
            
            system_prompt = """You are a knowledge extraction expert for a government grievance redressal system.
Extract structured information from the provided content and return ONLY valid JSON with these fields:
- department: The government department (e.g., "Water Supply", "Sewage", "Roads", "Electricity")
- summary: A concise 2-3 sentence summary
- key_topics: Array of 5-10 main topics/themes
- resources: Array of resources mentioned (schemes, programs, contact info)
- policies: Array of policies, guidelines, or regulations mentioned
- contact_info: Array of contact information (phone, email, address)
- useful_for_grievances: Array of grievance types this content would be useful for

Return ONLY the JSON object, no markdown formatting."""

            user_prompt = f"""Analyze this {source_type} content and extract structured information:

Content (first 12000 chars):
{text[:12000]}

Extract the information as specified and return valid JSON only."""
            
            response = self.client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
                max_tokens=2000
            )
            
            result_text = response.choices[0].message.content.strip()
            
            # Parse JSON
            knowledge = json.loads(result_text)
            
            # Add metadata
            knowledge['source_type'] = source_type
            knowledge['source_url'] = source_url
            knowledge['extracted_at'] = None  # Will be set by worker
            
            print(f"   ✅ Knowledge extracted: {knowledge.get('department', 'Unknown')} department")
            
            return {
                'success': True,
                'knowledge': knowledge
            }
            
        except json.JSONDecodeError as e:
            print(f"   ❌ Failed to parse JSON from LLM: {e}")
            print(f"   Response: {result_text[:500] if 'result_text' in locals() else 'No response'}")
            return {
                'success': False,
                'error': f'JSON parse error: {str(e)}'
            }
        except Exception as e:
            print(f"   ❌ Error extracting knowledge: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_embeddings_data(self, knowledge: Dict, text: str) -> List[Dict]:
        """Create chunks for vector database embeddings"""
        try:
            # Split text into chunks (simple chunking by paragraphs)
            paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
            
            # Create chunks with metadata
            chunks = []
            for i, para in enumerate(paragraphs[:50]):  # Limit to 50 chunks
                if len(para) > 100:  # Only meaningful paragraphs
                    chunks.append({
                        'text': para,
                        'metadata': {
                            'department': knowledge.get('department', 'Unknown'),
                            'source_url': knowledge.get('source_url', ''),
                            'source_type': knowledge.get('source_type', ''),
                            'chunk_index': i,
                            'topics': knowledge.get('key_topics', [])
                        }
                    })
            
            return chunks
            
        except Exception as e:
            print(f"   ⚠️ Error creating embeddings data: {e}")
            return []
