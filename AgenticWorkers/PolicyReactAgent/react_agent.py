"""
REACT Agent for Department Policy Retrieval
Reasoning and Acting agent that keeps fetching data until policies are found in vector DB
"""
import os
import time
import json
import psycopg2
from typing import Dict, Any, List, Optional
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()


class PolicyReactAgent:
    """
    REACT (Reasoning and Acting) Agent for policy retrieval.
    Continuously queries vector DB until department policies are found.
    """
    
    def __init__(self, max_attempts: int = 10, retry_delay: float = 2.0):
        """
        Initialize REACT agent
        
        Args:
            max_attempts: Maximum number of query attempts
            retry_delay: Delay between retries in seconds
        """
        self.db_url = os.getenv("DATABASE_URL")
        if not self.db_url:
            raise ValueError("DATABASE_URL environment variable required")
        
        self.max_attempts = max_attempts
        self.retry_delay = retry_delay
        self.thought_log = []
        
    def _get_connection(self):
        """Get database connection"""
        return psycopg2.connect(self.db_url)
    
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
    
    def _reason_query_strategy(self, department_id: Optional[int], 
                               query_embedding: Optional[List[float]],
                               attempt: int) -> Dict[str, Any]:
        """
        Reason about the best query strategy based on available information
        
        Returns:
            Strategy dict with query parameters
        """
        self._log_thought("reasoning", 
                         f"Attempt {attempt}/{self.max_attempts} - Analyzing query strategy")
        
        strategy = {
            "use_embedding": query_embedding is not None,
            "use_department_filter": department_id is not None,
            "similarity_threshold": 0.7,
            "limit": 10
        }
        
        # Adjust strategy based on attempt number
        if attempt > 3:
            # Broaden search after multiple failures
            strategy["similarity_threshold"] = 0.5
            strategy["limit"] = 20
            self._log_thought("reasoning", 
                            "Broadening search: lower threshold, higher limit")
        
        if attempt > 6:
            # Try without department filter
            strategy["use_department_filter"] = False
            self._log_thought("reasoning", 
                            "Removing department filter to expand search")
        
        return strategy
    
    def _act_query_policies(self, strategy: Dict[str, Any], 
                           department_id: Optional[int],
                           query_embedding: Optional[List[float]]) -> List[Dict[str, Any]]:
        """
        Execute policy query based on strategy
        
        Returns:
            List of policy documents
        """
        self._log_thought("acting", "Executing vector database query")
        
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            if strategy["use_embedding"] and query_embedding:
                # Query with embedding similarity
                embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"
                
                if strategy["use_department_filter"] and department_id:
                    query = """
                        SELECT 
                            id,
                            title,
                            content,
                            department_id,
                            file_url,
                            metadata,
                            created_at,
                            embedding <=> %s::vector AS similarity_score
                        FROM policydocuments
                        WHERE department_id = %s
                        AND embedding IS NOT NULL
                        ORDER BY embedding <=> %s::vector
                        LIMIT %s
                    """
                    cursor.execute(query, (embedding_str, department_id, embedding_str, strategy["limit"]))
                else:
                    query = """
                        SELECT 
                            id,
                            title,
                            content,
                            department_id,
                            file_url,
                            metadata,
                            created_at,
                            embedding <=> %s::vector AS similarity_score
                        FROM policydocuments
                        WHERE embedding IS NOT NULL
                        ORDER BY embedding <=> %s::vector
                        LIMIT %s
                    """
                    cursor.execute(query, (embedding_str, embedding_str, strategy["limit"]))
            else:
                # Fallback: query without embedding
                if strategy["use_department_filter"] and department_id:
                    query = """
                        SELECT 
                            id,
                            title,
                            content,
                            department_id,
                            file_url,
                            metadata,
                            created_at,
                            NULL AS similarity_score
                        FROM policydocuments
                        WHERE department_id = %s
                        ORDER BY created_at DESC
                        LIMIT %s
                    """
                    cursor.execute(query, (department_id, strategy["limit"]))
                else:
                    query = """
                        SELECT 
                            id,
                            title,
                            content,
                            department_id,
                            file_url,
                            metadata,
                            created_at,
                            NULL AS similarity_score
                        FROM policydocuments
                        ORDER BY created_at DESC
                        LIMIT %s
                    """
                    cursor.execute(query, (strategy["limit"],))
            
            rows = cursor.fetchall()
            cursor.close()
            conn.close()
            
            # Convert to dict
            policies = []
            for row in rows:
                policy = {
                    "id": row[0],
                    "title": row[1],
                    "content": row[2],
                    "department_id": row[3],
                    "file_url": row[4],
                    "metadata": row[5],
                    "created_at": row[6].isoformat() if row[6] else None,
                    "similarity_score": float(row[7]) if row[7] is not None else None
                }
                policies.append(policy)
            
            return policies
            
        except Exception as e:
            self._log_thought("error", f"Query failed: {str(e)}")
            return []
    
    def _observe_results(self, policies: List[Dict[str, Any]], 
                        strategy: Dict[str, Any]) -> Dict[str, Any]:
        """
        Observe and analyze query results
        
        Returns:
            Observation dict with analysis
        """
        observation = {
            "found_policies": len(policies) > 0,
            "policy_count": len(policies),
            "has_relevant_results": False,
            "should_continue": True
        }
        
        if len(policies) > 0:
            self._log_thought("observing", 
                            f"Found {len(policies)} policies")
            
            # Check relevance if similarity scores available
            relevant_count = sum(1 for p in policies 
                               if p.get("similarity_score") is not None 
                               and p["similarity_score"] < strategy["similarity_threshold"])
            
            if relevant_count > 0:
                observation["has_relevant_results"] = True
                observation["should_continue"] = False
                self._log_thought("observing", 
                                f"{relevant_count} policies meet relevance threshold")
            else:
                self._log_thought("observing", 
                                "Policies found but relevance unclear, continuing search")
        else:
            self._log_thought("observing", 
                            "No policies found, will retry with adjusted strategy")
        
        return observation
    
    def fetch_policies(self, 
                      department_id: Optional[int] = None,
                      query_text: Optional[str] = None,
                      query_embedding: Optional[List[float]] = None) -> Dict[str, Any]:
        """
        Main REACT loop: Keep fetching until policies are found
        
        Args:
            department_id: Optional department filter
            query_text: Optional query text for context
            query_embedding: Optional embedding vector for similarity search
            
        Returns:
            Dict with policies and execution metadata
        """
        self._log_thought("start", 
                         f"Starting policy search for department_id={department_id}")
        
        if query_text:
            self._log_thought("context", f"Query: {query_text[:100]}")
        
        start_time = time.time()
        all_policies = []
        
        for attempt in range(1, self.max_attempts + 1):
            # REASON: Determine query strategy
            strategy = self._reason_query_strategy(department_id, query_embedding, attempt)
            
            # ACT: Execute query
            policies = self._act_query_policies(strategy, department_id, query_embedding)
            
            # OBSERVE: Analyze results
            observation = self._observe_results(policies, strategy)
            
            # Collect unique policies
            existing_ids = {p["id"] for p in all_policies}
            new_policies = [p for p in policies if p["id"] not in existing_ids]
            all_policies.extend(new_policies)
            
            # Decide whether to continue
            if observation["has_relevant_results"]:
                self._log_thought("success", 
                                f"Found relevant policies after {attempt} attempts")
                break
            
            if observation["found_policies"] and attempt >= 5:
                # Found some policies after multiple attempts, accept them
                self._log_thought("success", 
                                f"Accepting {len(all_policies)} policies after {attempt} attempts")
                break
            
            if attempt < self.max_attempts:
                self._log_thought("waiting", 
                                f"Retrying in {self.retry_delay} seconds...")
                time.sleep(self.retry_delay)
        
        elapsed_time = time.time() - start_time
        
        result = {
            "success": len(all_policies) > 0,
            "policies": all_policies,
            "metadata": {
                "attempts": attempt,
                "total_policies_found": len(all_policies),
                "elapsed_time_seconds": round(elapsed_time, 2),
                "department_id": department_id,
                "thought_log": self.thought_log
            }
        }
        
        if len(all_policies) == 0:
            self._log_thought("failure", 
                            f"No policies found after {self.max_attempts} attempts")
        
        return result


def main():
    """Example usage"""
    agent = PolicyReactAgent(max_attempts=10, retry_delay=2.0)
    
    # Example 1: Search by department
    result = agent.fetch_policies(department_id=1)
    
    print("\n" + "="*80)
    print("FINAL RESULT")
    print("="*80)
    print(f"Success: {result['success']}")
    print(f"Policies found: {result['metadata']['total_policies_found']}")
    print(f"Attempts: {result['metadata']['attempts']}")
    print(f"Time: {result['metadata']['elapsed_time_seconds']}s")
    
    if result['policies']:
        print("\nPolicies:")
        for policy in result['policies'][:3]:
            print(f"  - {policy['title']} (ID: {policy['id']})")


if __name__ == "__main__":
    main()
