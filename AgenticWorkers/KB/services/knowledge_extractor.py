import json
import time
from typing import Dict, List
from groq import Groq
from config import Config
from prompts.extraction_prompts import EXTRACTION_PROMPT, SYSTEM_PROMPT


class KnowledgeExtractor:
    """Extract structured knowledge from text using LLM"""
    
    def __init__(self):
        if not Config.GROQ_API_KEY:
            raise RuntimeError("GROQ_API_KEY not set in .env")
        self.client = Groq(api_key=Config.GROQ_API_KEY, timeout=60.0)
    
    def extract_chunk_universal(self, text: str, max_retries: int = 3) -> Dict:
        """Extract structured knowledge from text chunk"""
        
        for attempt in range(max_retries):
            try:
                completion = self.client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    temperature=0,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": EXTRACTION_PROMPT.format(text=text[:12000])}
                    ]
                )
                
                result = completion.choices[0].message.content.strip()
                
                if not result:
                    return None
                
                # Clean markdown formatting
                if "```" in result:
                    parts = result.split("```")
                    for part in parts:
                        if "{" in part:
                            result = part
                            break
                
                # Extract JSON
                start = result.find("{")
                end = result.rfind("}") + 1
                
                if start == -1 or end == -1:
                    print(f"   ⚠️  No JSON found in response (attempt {attempt + 1})")
                    time.sleep(1)
                    continue
                
                result = result[start:end]
                return json.loads(result)
                
            except json.JSONDecodeError as e:
                print(f"   ⚠️  JSON decode error (attempt {attempt + 1}): {e}")
                if attempt < max_retries - 1:
                    time.sleep(1)
                continue
                
            except Exception as e:
                print(f"   ⚠️  Extraction error (attempt {attempt + 1}): {e}")
                if attempt < max_retries - 1:
                    time.sleep(1)
                continue
        
        return None
    
    def merge_json(self, master: Dict, new: Dict) -> Dict:
        """Merge new knowledge into master knowledge base"""
        if not new:
            return master
        
        for key, value in new.items():
            if key not in master:
                master[key] = value
            else:
                # Both dict → merge dict
                if isinstance(master[key], dict) and isinstance(value, dict):
                    master[key].update(value)
                # Both list → extend list
                elif isinstance(master[key], list) and isinstance(value, list):
                    master[key].extend(value)
                # Master list, new single → append
                elif isinstance(master[key], list):
                    master[key].append(value)
                # Master single, new list → convert to list
                elif isinstance(value, list):
                    master[key] = [master[key]] + value
                # Both single values → convert to list
                else:
                    master[key] = [master[key], value]
        
        return master
    
    def build_knowledge_base(self, chunks: List[Dict]) -> Dict:
        """Build complete knowledge base from chunks"""
        master = {}
        
        print(f"   Extracting knowledge from {len(chunks)} chunks...")
        
        for i, chunk in enumerate(chunks):
            print(f"   Processing chunk {i + 1}/{len(chunks)}...", end="\r")
            
            extracted = self.extract_chunk_universal(chunk["text"])
            if extracted:
                master = self.merge_json(master, extracted)
            
            time.sleep(0.5)  # Rate limiting
        
        print(f"\n   ✓ Knowledge extraction complete")
        return master
