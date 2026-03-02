"""
Vector store module for storing and retrieving grievance data using Pinecone (Optional)
"""
from typing import List, Dict, Any, Optional
import config
from openai import OpenAI
import json

class VectorStoreService:
    def __init__(self):
        self.enabled = bool(config.PINECONE_API_KEY and config.PINECONE_API_KEY != "your_pinecone_api_key")
        
        if self.enabled:
            try:
                from pinecone import Pinecone, ServerlessSpec
                self.pc = Pinecone(api_key=config.PINECONE_API_KEY)
                self.index_name = config.PINECONE_INDEX_NAME
                self._ensure_index_exists()
                self.index = self.pc.Index(self.index_name)
                print("✓ Pinecone vector store enabled")
            except Exception as e:
                print(f"⚠ Pinecone initialization failed: {e}")
                self.enabled = False
        else:
            print("⚠ Pinecone disabled - vector store features unavailable")
        
        # Use DeepSeek for embeddings (text-only, no vision)
        self.client = OpenAI(
            api_key=config.DEEPSEEK_API_KEY,
            base_url=config.DEEPSEEK_BASE_URL
        )
    
    def _ensure_index_exists(self):
        """Create index if it doesn't exist"""
        if not self.enabled:
            return
        
        try:
            from pinecone import ServerlessSpec
            existing_indexes = [index.name for index in self.pc.list_indexes()]
            
            if self.index_name not in existing_indexes:
                print(f"Creating new index: {self.index_name}")
                self.pc.create_index(
                    name=self.index_name,
                    dimension=1536,  # Standard embedding dimension
                    metric="cosine",
                    spec=ServerlessSpec(
                        cloud="aws",
                        region="us-east-1"
                    )
                )
                print(f"Index {self.index_name} created successfully")
        except Exception as e:
            print(f"Error ensuring index exists: {e}")
            self.enabled = False
    
    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for text (using simple hash-based approach since DeepSeek doesn't have embeddings API)"""
        # Note: DeepSeek doesn't provide embeddings API, so we'll use a simple approach
        # For production, consider using a dedicated embedding model
        try:
            # Simple hash-based embedding (not ideal but works without external API)
            import hashlib
            hash_obj = hashlib.sha256(text.encode())
            hash_bytes = hash_obj.digest()
            
            # Convert to 1536-dimensional vector
            embedding = []
            for i in range(1536):
                byte_val = hash_bytes[i % len(hash_bytes)]
                embedding.append((byte_val / 255.0) * 2 - 1)  # Normalize to [-1, 1]
            
            return embedding
        except Exception as e:
            print(f"Error generating embedding: {e}")
            return [0.0] * 1536  # Return zero vector on error
    
    def store_grievance_data(self, grievance_id: str, department_id: str, analysis_data: Dict[str, Any]):
        """Store grievance analysis data in vector store (if enabled)"""
        if not self.enabled:
            return False
        
        try:
            # Create text representation for embedding
            text_content = self._create_text_representation(analysis_data)
            
            # Generate embedding
            embedding = self.generate_embedding(text_content)
            
            # Prepare metadata
            metadata = {
                "grievance_id": grievance_id,
                "department_id": department_id,
                "status": analysis_data.get("status", "unknown"),
                "health_status": analysis_data.get("progress_analysis", {}).get("health_status", "unknown"),
                "has_feedback": analysis_data.get("feedback_analysis", {}).get("has_feedback", False),
                "rating": analysis_data.get("feedback_analysis", {}).get("rating"),
                "sentiment": analysis_data.get("feedback_analysis", {}).get("sentiment", "unknown"),
                "days_open": analysis_data.get("progress_analysis", {}).get("days_open", 0),
                "progress_percentage": analysis_data.get("progress_analysis", {}).get("workflow_progress", {}).get("progress_percentage", 0),
                "timestamp": analysis_data.get("analyzed_at", ""),
                "data": json.dumps(analysis_data)[:40000]  # Limit metadata size
            }
            
            # Upsert to Pinecone
            self.index.upsert(
                vectors=[{
                    "id": f"grievance_{grievance_id}",
                    "values": embedding,
                    "metadata": metadata
                }]
            )
            
            print(f"  ✓ Stored in vector store")
            return True
        except Exception as e:
            print(f"  ⚠ Error storing in vector store: {e}")
            return False
    
    def _create_text_representation(self, analysis_data: Dict[str, Any]) -> str:
        """Create text representation of analysis data for embedding"""
        parts = []
        
        # Basic info
        parts.append(f"Grievance ID: {analysis_data.get('grievance_id')}")
        parts.append(f"Status: {analysis_data.get('status')}")
        parts.append(f"Priority: {analysis_data.get('priority')}")
        
        # Progress analysis
        progress = analysis_data.get("progress_analysis", {})
        parts.append(f"Health Status: {progress.get('health_status')}")
        parts.append(f"Days Open: {progress.get('days_open')}")
        parts.append(f"Progress: {progress.get('workflow_progress', {}).get('progress_percentage')}%")
        
        # Feedback analysis
        feedback = analysis_data.get("feedback_analysis", {})
        if feedback.get("has_feedback"):
            parts.append(f"Rating: {feedback.get('rating')}/5")
            parts.append(f"Sentiment: {feedback.get('sentiment')}")
            parts.append(f"Feedback: {feedback.get('feedback_text', '')}")
        
        # Proof analysis
        proof = analysis_data.get("proof_analysis", {})
        if proof.get("has_proof"):
            parts.append(f"Has proof documents: {proof.get('document_count')} documents")
            if proof.get("image_analysis"):
                parts.append(f"Image analysis: {proof['image_analysis'].get('description', '')}")
        
        # Summary
        if analysis_data.get("summary"):
            parts.append(f"Summary: {analysis_data['summary']}")
        
        return " | ".join(parts)
    
    def query_similar_grievances(self, query_text: str, department_id: Optional[str] = None, top_k: int = 10) -> List[Dict[str, Any]]:
        """Query similar grievances from vector store (if enabled)"""
        if not self.enabled:
            return []
        
        try:
            # Generate embedding for query
            query_embedding = self.generate_embedding(query_text)
            
            # Build filter
            filter_dict = {}
            if department_id:
                filter_dict["department_id"] = department_id
            
            # Query Pinecone
            results = self.index.query(
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True,
                filter=filter_dict if filter_dict else None
            )
            
            # Parse results
            similar_grievances = []
            for match in results.matches:
                data = json.loads(match.metadata.get("data", "{}"))
                similar_grievances.append({
                    "grievance_id": match.metadata.get("grievance_id"),
                    "score": match.score,
                    "data": data
                })
            
            return similar_grievances
        except Exception as e:
            print(f"Error querying similar grievances: {e}")
            return []
    
    def get_department_statistics(self, department_id: str) -> Dict[str, Any]:
        """Get statistics for a department from vector store (if enabled)"""
        if not self.enabled:
            return {"total_grievances": 0, "note": "Vector store disabled"}
        
        try:
            # Query all grievances for department
            results = self.index.query(
                vector=[0.0] * 1536,  # Dummy vector
                top_k=10000,  # Get all
                include_metadata=True,
                filter={"department_id": department_id}
            )
            
            if not results.matches:
                return {"total_grievances": 0}
            
            # Aggregate statistics
            total = len(results.matches)
            status_counts = {}
            health_counts = {}
            sentiment_counts = {}
            ratings = []
            
            for match in results.matches:
                status = match.metadata.get("status", "unknown")
                health = match.metadata.get("health_status", "unknown")
                sentiment = match.metadata.get("sentiment", "unknown")
                rating = match.metadata.get("rating")
                
                status_counts[status] = status_counts.get(status, 0) + 1
                health_counts[health] = health_counts.get(health, 0) + 1
                sentiment_counts[sentiment] = sentiment_counts.get(sentiment, 0) + 1
                
                if rating:
                    ratings.append(rating)
            
            return {
                "total_grievances": total,
                "status_distribution": status_counts,
                "health_distribution": health_counts,
                "sentiment_distribution": sentiment_counts,
                "average_rating": sum(ratings) / len(ratings) if ratings else 0,
                "total_with_feedback": sum(1 for m in results.matches if m.metadata.get("has_feedback"))
            }
        except Exception as e:
            print(f"Error getting department statistics: {e}")
            return {"error": str(e)}
