"""
Government Policy Extractor using ReAct Agent with DeepSeek AI
Extracts policies, rules, plans, budgets from Pinecone RAG database
"""
import os
import json
import time
import requests
from typing import Dict, Any, List, Optional
from datetime import datetime
from dotenv import load_dotenv
from pinecone import Pinecone
import psycopg2

load_dotenv()


class PolicyExtractorReactAgent:
    """
    ReAct Agent that extracts government policies using DeepSeek AI
    Continuously queries until comprehensive policy data is found
    """
    
    def __init__(self, max_attempts: int = 15):
        # DeepSeek Configuration
        self.deepseek_api_key = os.getenv("DEEPSEEK_API_KEY")
        self.deepseek_base_url = "https://api.deepseek.com/v1"
        
        # Pinecone Configuration
        self.pinecone_api_key = os.getenv("PINECONE_API_KEY")
        self.pinecone_index_name = os.getenv("PINECONE_INDEX_NAME", "igrs1")
        
        # Database Configuration
        self.db_url = os.getenv("DATABASE_URL")
        
        # Agent Configuration
        self.max_attempts = max_attempts
        self.thought_log = []
        
        # Initialize Pinecone
        self.pc = Pinecone(api_key=self.pinecone_api_key)
        self.index = self.pc.Index(self.pinecone_index_name)
        
        self._log_thought("init", "Policy Extractor ReAct Agent initialized")
    
    def _log_thought(self, thought_type: str, content: str):
        """Log agent's reasoning process"""
        timestamp = datetime.now().isoformat()
        thought = {
            "timestamp": timestamp,
            "type": thought_type,
            "content": content
        }
        self.thought_log.append(thought)
        print(f"\n💭 [{thought_type.upper()}] {content}")
    
    def _call_deepseek(self, prompt: str, system_prompt: str = None) -> str:
        """Call DeepSeek API for AI reasoning"""
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            response = requests.post(
                f"{self.deepseek_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.deepseek_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "deepseek-chat",
                    "messages": messages,
                    "temperature": 0.3,
                    "max_tokens": 2000
                }
            )
            
            if response.status_code == 200:
                return response.json()["choices"][0]["message"]["content"]
            else:
                self._log_thought("error", f"DeepSeek API error: {response.status_code}")
                return None
                
        except Exception as e:
            self._log_thought("error", f"DeepSeek call failed: {str(e)}")
            return None
    
    def _generate_search_queries(self, category: str) -> List[str]:
        """Generate search queries for different policy categories"""
        queries = {
            "rules": [
                "government rules and regulations",
                "administrative rules procedures",
                "compliance requirements guidelines",
                "statutory rules enforcement"
            ],
            "policies": [
                "government policies framework",
                "public policy guidelines",
                "policy implementation procedures",
                "departmental policies standards"
            ],
            "plans": [
                "government development plans",
                "strategic planning initiatives",
                "action plans roadmap",
                "implementation plans timeline"
            ],
            "budgets": [
                "budget allocation financial",
                "expenditure budget planning",
                "fiscal budget estimates",
                "financial allocation resources"
            ],
            "all": [
                "government policies rules regulations",
                "budget plans development initiatives",
                "administrative guidelines procedures",
                "public policy framework implementation"
            ]
        }
        return queries.get(category, queries["all"])
    
    def _reason_extraction_strategy(self, attempt: int, category: str) -> Dict[str, Any]:
        """Reason about the best extraction strategy"""
        self._log_thought("reasoning", 
                         f"Attempt {attempt}/{self.max_attempts} - Planning extraction for {category}")
        
        strategy = {
            "category": category,
            "search_queries": self._generate_search_queries(category),
            "top_k": 10,
            "use_deepseek_analysis": True,
            "extract_from_db": True
        }
        
        # Adjust strategy based on attempt
        if attempt > 5:
            strategy["top_k"] = 20
            self._log_thought("reasoning", "Broadening search: increasing top_k to 20")
        
        if attempt > 10:
            strategy["category"] = "all"
            self._log_thought("reasoning", "Switching to comprehensive search across all categories")
        
        return strategy
    
    def _act_query_pinecone(self, query_text: str, top_k: int = 10) -> List[Dict]:
        """Query Pinecone vector database"""
        try:
            self._log_thought("acting", f"Querying Pinecone: '{query_text[:50]}...'")
            
            # Generate embedding using DeepSeek (or use a simple approach)
            # For now, we'll query by metadata filters
            results = self.index.query(
                vector=[0.0] * 384,  # Placeholder - ideally generate proper embedding
                top_k=top_k,
                include_metadata=True
            )
            
            documents = []
            for match in results.get("matches", []):
                doc = {
                    "id": match.get("id"),
                    "score": match.get("score"),
                    "metadata": match.get("metadata", {})
                }
                documents.append(doc)
            
            self._log_thought("acting", f"Found {len(documents)} documents from Pinecone")
            return documents
            
        except Exception as e:
            self._log_thought("error", f"Pinecone query failed: {str(e)}")
            return []
    
    def _act_query_database(self, category: str = None) -> List[Dict]:
        """Query PostgreSQL database for policy documents"""
        try:
            self._log_thought("acting", "Querying PostgreSQL database")
            
            conn = psycopg2.connect(self.db_url)
            cursor = conn.cursor()
            
            query = """
                SELECT 
                    id,
                    title,
                    content,
                    department_id,
                    file_url,
                    metadata,
                    created_at
                FROM policydocuments
                WHERE is_active = true
                ORDER BY created_at DESC
                LIMIT 100
            """
            
            cursor.execute(query)
            rows = cursor.fetchall()
            
            documents = []
            for row in rows:
                doc = {
                    "id": str(row[0]),
                    "title": row[1],
                    "content": row[2],
                    "department_id": row[3],
                    "file_url": row[4],
                    "metadata": row[5],
                    "created_at": row[6].isoformat() if row[6] else None
                }
                documents.append(doc)
            
            cursor.close()
            conn.close()
            
            self._log_thought("acting", f"Found {len(documents)} documents from database")
            return documents
            
        except Exception as e:
            self._log_thought("error", f"Database query failed: {str(e)}")
            return []
    
    def _analyze_with_deepseek(self, documents: List[Dict], category: str) -> Dict[str, Any]:
        """Use DeepSeek to analyze and categorize policy documents"""
        self._log_thought("analyzing", f"Using DeepSeek AI to analyze {len(documents)} documents")
        
        # Prepare document summaries for analysis
        doc_summaries = []
        for i, doc in enumerate(documents[:20]):  # Limit to first 20 for token efficiency
            summary = {
                "index": i,
                "title": doc.get("title", "Untitled"),
                "content_preview": doc.get("content", "")[:500],
                "metadata": doc.get("metadata", {})
            }
            doc_summaries.append(summary)
        
        prompt = f"""Analyze these government policy documents and extract comprehensive information about {category}.

Documents:
{json.dumps(doc_summaries, indent=2)}

Extract and categorize into:
1. RULES & REGULATIONS: Legal rules, compliance requirements, statutory regulations
2. POLICIES: Government policies, frameworks, guidelines, standards
3. PLANS: Development plans, strategic initiatives, action plans, roadmaps
4. BUDGETS: Financial allocations, budget estimates, expenditure plans

For each category, provide:
- title: Document title
- summary: Brief summary (max 200 chars)
- key_points: Array of key points (max 5)
- department: Relevant department
- date: Document date if available
- importance: High/Medium/Low
- document_id: Original document index

Return ONLY valid JSON with this structure:
{{
  "rules": [{{title, summary, key_points, department, date, importance, document_id}}],
  "policies": [...],
  "plans": [...],
  "budgets": [...],
  "total_analyzed": number,
  "extraction_quality": "high/medium/low"
}}

Be thorough and extract ALL relevant information."""

        system_prompt = """You are an expert government policy analyst specializing in extracting and categorizing official documents.
You have deep knowledge of:
- Government rules and regulations
- Public policies and frameworks
- Development plans and initiatives
- Budget allocations and financial planning

Always return valid JSON. Be comprehensive and accurate."""

        response = self._call_deepseek(prompt, system_prompt)
        
        if response:
            try:
                # Extract JSON from response
                json_match = response
                if "```json" in response:
                    json_match = response.split("```json")[1].split("```")[0]
                elif "```" in response:
                    json_match = response.split("```")[1].split("```")[0]
                
                analysis = json.loads(json_match)
                self._log_thought("analyzing", 
                                f"DeepSeek extracted: {len(analysis.get('rules', []))} rules, "
                                f"{len(analysis.get('policies', []))} policies, "
                                f"{len(analysis.get('plans', []))} plans, "
                                f"{len(analysis.get('budgets', []))} budgets")
                return analysis
                
            except json.JSONDecodeError as e:
                self._log_thought("error", f"Failed to parse DeepSeek response: {str(e)}")
                return self._create_fallback_analysis(documents)
        
        return self._create_fallback_analysis(documents)
    
    def _create_fallback_analysis(self, documents: List[Dict]) -> Dict[str, Any]:
        """Create fallback analysis when DeepSeek fails"""
        return {
            "rules": [],
            "policies": [],
            "plans": [],
            "budgets": [],
            "raw_documents": documents[:10],
            "total_analyzed": len(documents),
            "extraction_quality": "low",
            "note": "Fallback analysis - DeepSeek unavailable"
        }
    
    def _observe_results(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Observe and evaluate extraction results"""
        total_extracted = (
            len(analysis.get("rules", [])) +
            len(analysis.get("policies", [])) +
            len(analysis.get("plans", [])) +
            len(analysis.get("budgets", []))
        )
        
        observation = {
            "success": total_extracted > 0,
            "total_items": total_extracted,
            "quality": analysis.get("extraction_quality", "unknown"),
            "should_continue": total_extracted < 5
        }
        
        self._log_thought("observing", 
                         f"Extracted {total_extracted} items, quality: {observation['quality']}")
        
        return observation
    
    def extract_policies(self, category: str = "all", department_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Main ReAct loop: Extract government policies using DeepSeek AI
        
        Args:
            category: "rules", "policies", "plans", "budgets", or "all"
            department_id: Optional department filter
            
        Returns:
            Comprehensive policy extraction results
        """
        self._log_thought("start", f"Starting policy extraction for category: {category}")
        
        start_time = time.time()
        all_results = {
            "rules": [],
            "policies": [],
            "plans": [],
            "budgets": []
        }
        
        for attempt in range(1, self.max_attempts + 1):
            # REASON: Determine extraction strategy
            strategy = self._reason_extraction_strategy(attempt, category)
            
            # ACT: Query data sources
            db_documents = self._act_query_database(category)
            
            # ACT: Analyze with DeepSeek
            if db_documents:
                analysis = self._analyze_with_deepseek(db_documents, category)
                
                # Merge results
                for key in ["rules", "policies", "plans", "budgets"]:
                    all_results[key].extend(analysis.get(key, []))
                
                # OBSERVE: Evaluate results
                observation = self._observe_results(analysis)
                
                if observation["success"] and not observation["should_continue"]:
                    self._log_thought("success", 
                                    f"Sufficient data extracted after {attempt} attempts")
                    break
            
            if attempt < self.max_attempts:
                self._log_thought("waiting", f"Retrying in 2 seconds...")
                time.sleep(2)
        
        elapsed_time = time.time() - start_time
        
        # Remove duplicates
        for key in all_results:
            seen = set()
            unique = []
            for item in all_results[key]:
                item_id = item.get("title", "") + item.get("summary", "")
                if item_id not in seen:
                    seen.add(item_id)
                    unique.append(item)
            all_results[key] = unique
        
        total_items = sum(len(all_results[k]) for k in all_results)
        
        result = {
            "success": total_items > 0,
            "data": all_results,
            "metadata": {
                "category": category,
                "department_id": department_id,
                "total_items": total_items,
                "rules_count": len(all_results["rules"]),
                "policies_count": len(all_results["policies"]),
                "plans_count": len(all_results["plans"]),
                "budgets_count": len(all_results["budgets"]),
                "attempts": attempt,
                "elapsed_time_seconds": round(elapsed_time, 2),
                "thought_log": self.thought_log
            }
        }
        
        self._log_thought("complete", 
                         f"Extraction complete: {total_items} total items in {elapsed_time:.2f}s")
        
        return result


def main():
    """Example usage"""
    agent = PolicyExtractorReactAgent(max_attempts=15)
    
    # Extract all government policies
    result = agent.extract_policies(category="all")
    
    print("\n" + "="*80)
    print("POLICY EXTRACTION RESULTS")
    print("="*80)
    print(f"Success: {result['success']}")
    print(f"Total Items: {result['metadata']['total_items']}")
    print(f"  - Rules: {result['metadata']['rules_count']}")
    print(f"  - Policies: {result['metadata']['policies_count']}")
    print(f"  - Plans: {result['metadata']['plans_count']}")
    print(f"  - Budgets: {result['metadata']['budgets_count']}")
    print(f"Time: {result['metadata']['elapsed_time_seconds']}s")
    
    # Save to file
    output_file = f"policy_extraction_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w') as f:
        json.dump(result, f, indent=2)
    print(f"\n✓ Results saved to: {output_file}")


if __name__ == "__main__":
    main()
