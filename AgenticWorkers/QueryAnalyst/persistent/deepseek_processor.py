# persistent/deepseek_processor.py
"""
DeepSeek-based post-processor that:
1. Takes raw agent JSON from full_result
2. Parses and structures data for grievance_processed table
3. Matches department_id from Supabase departments table
4. Checks user's past grievances for fraud patterns
5. Conditionally checks Neon DB for online fraud cases only
"""

import os
import json
import psycopg2
from typing import Dict, Any, Optional, List
from datetime import datetime
from openai import OpenAI
from azure.storage.queue import QueueClient

class DeepSeekProcessor:
    def __init__(self):
        self.supabase_dsn = os.getenv("SUPABASE_DSN")
        self.neon_dsn = os.getenv("NEON_DSN") 
        self.deepseek_api_key = os.getenv("DEEPSEEK_API_KEY")
        self.deepseek_client = OpenAI(
            api_key=self.deepseek_api_key,
            base_url="https://api.deepseek.com"
        )
        
        # Initialize Azure Queue for ResearchAnalyst
        self.research_queue_name = os.getenv("AZURE_RESEARCHANALYST_QUEUE_NAME", "researchanalyst")
        self.azure_connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
        self.research_queue_client = None
        
        if self.azure_connection_string:
            try:
                self.research_queue_client = QueueClient.from_connection_string(
                    conn_str=self.azure_connection_string,
                    queue_name=self.research_queue_name
                )
                self.research_queue_client.create_queue()
                print(f"✓ Connected to ResearchAnalyst queue: {self.research_queue_name}")
            except Exception as e:
                if "already exists" not in str(e).lower():
                    print(f"⚠️ Queue initialization warning: {e}")
    
    def check_user_fraud_history(self, citizen_id: str) -> Dict[str, Any]:
        """Check if user has history of fake/spam grievances in Supabase."""
        if not citizen_id:
            return {"has_fraud_history": False, "fraud_count": 0, "similar_spam": []}
        
        try:
            conn = psycopg2.connect(self.supabase_dsn)
            cur = conn.cursor()
            
            # Check user's past grievances with rejected or invalid status
            # Note: fraud column was removed from grievance_processed table
            cur.execute("""
                SELECT 
                    ug.grievance_id,
                    COALESCE(gp.grievance_text, ug.full_result->>'grievance_text', '') as grievance_text,
                    ug.full_result->>'category' as category,
                    ug.created_at,
                    ug.status,
                    ug.validation_status
                FROM usergrievance ug
                LEFT JOIN grievance_processed gp ON ug.grievance_id = gp.grievance_id
                WHERE ug.citizen_id = %s
                AND (
                    ug.status = 'rejected'
                    OR ug.validation_status = 'invalid'
                )
                ORDER BY ug.created_at DESC
                LIMIT 10
            """, (citizen_id,))
            
            fraud_cases = cur.fetchall()
            cur.close()
            conn.close()
            
            return {
                "has_fraud_history": len(fraud_cases) > 0,
                "fraud_count": len(fraud_cases),
                "similar_spam": [
                    {
                        "grievance_id": row[0],
                        "text": row[1][:100],
                        "category": row[2],
                        "date": str(row[3]),
                        "status": row[4],
                        "validation_status": row[5]
                    }
                    for row in fraud_cases
                ]
            }
        except Exception as e:
            print(f"Error checking fraud history: {e}")
            return {"has_fraud_history": False, "fraud_count": 0, "error": str(e)}
    
    def check_neon_fraud_cases(self, category: str, enhanced_query: str, embedding: List[float]) -> Dict[str, Any]:
        """Check Neon DB vector database for similar fraud cases (ONLY for online fraud)."""
        if not category or "fraud" not in category.lower():
            return {"checked": False, "reason": "Not a fraud case"}
        
        if not self.neon_dsn:
            return {"checked": False, "reason": "Neon DB not configured"}
        
        try:
            conn = psycopg2.connect(self.neon_dsn)
            cur = conn.cursor()
            
            # Vector similarity search in Neon fraud DB
            embedding_str = "[" + ",".join(map(str, embedding)) + "]"
            
            cur.execute("""
                SELECT 
                    fraud_case_id,
                    description,
                    fraud_type,
                    reported_count,
                    embedding <=> %s::vector as distance
                FROM fraud_cases
                WHERE fraud_type LIKE %s
                ORDER BY embedding <=> %s::vector
                LIMIT 5
            """, (embedding_str, f"%{category}%", embedding_str))
            
            similar_fraud = cur.fetchall()
            cur.close()
            conn.close()
            
            return {
                "checked": True,
                "similar_fraud_count": len(similar_fraud),
                "similar_cases": [
                    {
                        "fraud_case_id": row[0],
                        "description": row[1][:150],
                        "fraud_type": row[2],
                        "reported_count": row[3],
                        "similarity_score": 1 - row[4]  # Convert distance to similarity
                    }
                    for row in similar_fraud
                ]
            }
        except Exception as e:
            print(f"Error checking Neon fraud DB: {e}")
            return {"checked": False, "error": str(e)}
    
    def match_department(self, category: str, location_data: Dict[str, Any], enhanced_query: str, embedding: List[float]) -> Optional[str]:
        """Match department_id from Supabase departments table using embedding similarity."""
        try:
            conn = psycopg2.connect(self.supabase_dsn)
            cur = conn.cursor()
            
            # Get location details
            address = location_data.get("address", "") if location_data else ""
            area_type = location_data.get("area_type", "") if location_data else ""
            
            # Create search text combining category, location, and query
            search_text = f"{category} {address} {area_type} {enhanced_query[:200]}"
            
            # Vector similarity search against departments
            embedding_str = "[" + ",".join(map(str, embedding)) + "]"
            
            cur.execute("""
                SELECT 
                    id,
                    name,
                    description,
                    address,
                    contact_email,
                    contact_phone,
                    embedding <=> %s::vector as distance
                FROM departments
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> %s::vector
                LIMIT 1
            """, (embedding_str, embedding_str))
            
            result = cur.fetchone()
            cur.close()
            conn.close()
            
            if result:
                department_id = result[0]
                match_score = 1 - result[6]  # Convert distance to similarity
                print(f"✓ Matched department: {result[1]} (ID: {department_id}, score: {match_score:.3f})")
                return department_id
            
            return None
        except Exception as e:
            print(f"Error matching department: {e}")
            return None
    
    def parse_with_deepseek(self, full_result: Dict[str, Any], fraud_history: Dict[str, Any], neon_fraud_data: Dict[str, Any]) -> Dict[str, Any]:
        """Use DeepSeek to parse raw JSON and structure it for grievance_processed table."""
        
        # Check input size to avoid timeout
        input_json = json.dumps(full_result, ensure_ascii=False)
        input_size = len(input_json)
        print(f"   📏 Input size: {input_size:,} characters")
        
        if input_size > 50000:
            print(f"   ⚠️  Input too large ({input_size:,} chars), using fallback parser")
            return self._fallback_parse(full_result)
        
        prompt = f"""You are a grievance data processor. Parse this grievance analysis JSON and extract ALL DETAILED structured data for database storage.

**Input Data:**
{json.dumps(full_result, indent=2, ensure_ascii=False)}

**User Fraud History:**
{json.dumps(fraud_history, indent=2, ensure_ascii=False)}

**Similar Fraud Cases (if applicable):**
{json.dumps(neon_fraud_data, indent=2, ensure_ascii=False)}

**CRITICAL INSTRUCTIONS:**
1. Extract COMPLETE grievance text, FULL image description (in-depth), location details
2. Parse ENTIRE analysis section: emotion, patterns (all patterns with frequencies), priority with FULL justification, severity with complete assessment, fraud_risk, query_type
3. Store the COMPLETE "Government Grievance Assessment Report" case study text - DO NOT SUMMARIZE
4. Keep ALL similar cases with FULL details - do not truncate or summarize
5. Store ALL patterns identified with their frequencies
6. Keep COMPLETE department information with full contact details and jurisdiction
7. Store ALL policy search queries (not just top 3-5) - keep the complete list
8. Preserve FULL sentiment analysis with all emotional indicators
9. Keep COMPLETE risk assessment and resolution expectations
10. Consider user's fraud history when assessing risk
11. If similar fraud cases found in Neon DB, include ALL details

**DO NOT:**
- Summarize or shorten any text
- Remove "redundant" information
- Truncate descriptions to 200 chars
- Simplify or reduce data
- Remove any analysis details

**PRESERVE FULL DEPTH:**
- Complete case study report (could be 1000+ words)
- Full image description with all visual details
- All patterns with context
- Complete similar cases analysis
- Full justifications and reasoning

**Output Format (JSON only):**
{{
  "grievance_text": "COMPLETE original grievance text",
  "image_description": "COMPLETE IN-DEPTH image analysis with all visual details, condition, severity indicators, etc.",
  "enhanced_query": "Full enhanced query",
  "validation_score": 0-100,
  "validation_reasoning": "COMPLETE validation reasoning",
  "extracted_location": {{}},
  "extracted_address": "Full address",
  "extracted_latitude": null or number,
  "extracted_longitude": null or number,
  "location_confidence": "high/medium/low",
  "latitude": null or number,
  "longitude": null or number,
  "location_address": "Full location address",
  "query_type": {{}},
  "category": {{
    "main_category": "...",
    "sub_category": "...",
    "detailed_classification": "Full category analysis"
  }},
  "similar_cases_summary": "COMPLETE analysis of ALL similar cases with full details - NOT a brief summary",
  "sentiment_priority": {{
    "sentiment_score": number,
    "urgency_level": "...",
    "emotional_tone": "...",
    "key_emotional_indicators": ["ALL indicators listed"],
    "priority_level": "...",
    "justification": "COMPLETE justification with full reasoning",
    "expected_resolution_time": "...",
    "risk_assessment": "COMPLETE risk assessment with all details"
  }},
  "emotion": {{
    "analysis": "COMPLETE emotional analysis"
  }},
  "severity": {{
    "level": "...",
    "assessment": "FULL severity assessment with all factors"
  }},
  "patterns": {{
    "patterns_identified": [
      {{
        "pattern": "Full pattern description",
        "frequency": number,
        "context": "Complete context"
      }}
    ],
    "analysis": "COMPLETE pattern analysis"
  }},
  "fraud": {{
    "fraud_risk": "Low/Medium/High",
    "spam_indicators": ["ALL indicators"],
    "user_fraud_history": true/false,
    "similar_fraud_cases_count": number,
    "authenticity_confidence": "Low/Medium/High",
    "detailed_analysis": "COMPLETE fraud analysis"
  }},
  "department_info": {{
    "recommended_department": "Full department name",
    "contact_information": "COMPLETE contact information",
    "jurisdiction": "Full jurisdiction details",
    "supporting_departments": ["All supporting departments"]
  }},
  "policy_search": {{
    "queries": ["ALL policy search queries - do not limit to 3-5"],
    "reasoning": "Complete reasoning for queries"
  }},
  "case_study_report": "COMPLETE Government Grievance Assessment Report - the FULL case study text with all sections, paragraphs, analysis, recommendations",
  "past_queries_summary": "COMPLETE summary of past similar queries with full details",
  "sla_deadline": "ISO datetime or null",
  "resolution_time": null or number,
  "is_escalated": false,
  "escalation_level": null,
  "escalated_at": null,
  "comments": [],
  "workflow": {{}},
  "estimated_cost": null,
  "actual_cost": null,
  "resolved_at": null,
  "resolved_by": null,
  "citizen_feedback": null,
  "embedding_status": "pending",
  "processing_metadata": {{
    "agent_analysis_complete": true,
    "deepseek_processing_complete": true
  }}
}}

**REMEMBER:** 
- Store EVERYTHING with FULL details
- NO summaries, NO truncation, NO simplification
- Preserve ALL analyzed information
- Keep COMPLETE case study report
- Include ALL patterns, similar cases, queries
"""

        try:
            print(f"   🤖 Calling DeepSeek API...")
            response = self.deepseek_client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": "You are a precise data extraction AI. Extract ALL detailed information and return valid JSON only, no markdown. Preserve complete analysis, do not summarize."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=8192,  # DeepSeek max limit
                timeout=120  # 2 minute timeout
            )
            
            print(f"   ✓ DeepSeek response received")
            content = response.choices[0].message.content.strip()
            
            # Remove markdown code blocks if present
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
                content = content.strip()
            
            parsed_data = json.loads(content)
            print(f"   ✓ JSON parsed successfully")
            return parsed_data
            
        except Exception as e:
            print(f"   ❌ Error parsing with DeepSeek: {e}")
            # Fallback to basic extraction
            return self._fallback_parse(full_result)
    
    def _fallback_parse(self, full_result: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback parser if DeepSeek fails."""
        grievance = full_result.get("grievance", {})
        analysis = full_result.get("analysis", {})
        
        return {
            "grievance_text": grievance.get("text", ""),
            "image_description": grievance.get("image", {}).get("description", ""),
            "enhanced_query": grievance.get("enhanced_query_described", ""),
            "validation_score": 50,
            "validation_reasoning": "Fallback parse - no validation",
            "extracted_location": grievance.get("location", {}),
            "extracted_address": grievance.get("location", {}).get("address"),
            "query_type": analysis.get("query_type", {}),
            "category": {"main_category": grievance.get("category"), "sub_category": grievance.get("sub_category")},
            "sentiment_priority": analysis.get("priority", {}),
            "emotion": analysis.get("emotion", {}),
            "severity": analysis.get("severity", {}),
            "patterns": analysis.get("patterns", {}),
            "fraud": analysis.get("fraud_risk", {}),
            "embedding_status": "pending"
        }
    
    def process_and_save_to_grievance_processed(
        self,
        grievance_id: str,
        citizen_id: str,
        full_result: Dict[str, Any],
        embedding: List[float],
        validation_result: Optional[Dict[str, Any]] = None,
        location_data: Optional[Dict[str, Any]] = None,
        telegram_location_data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Main processing function: parses JSON and inserts into grievance_processed."""
        
        print(f"\n🔄 Processing grievance {grievance_id} with DeepSeek...")
        
        # 1. Check user's fraud history
        fraud_history = self.check_user_fraud_history(citizen_id)
        print(f"   📊 Fraud history: {fraud_history['fraud_count']} past issues")
        
        # 2. Get category to decide if we need Neon DB check
        grievance = full_result.get("grievance", {})
        category = grievance.get("category", "")
        enhanced_query = grievance.get("enhanced_query_described", "")
        
        # 3. Extract location data from Telegram
        telegram_lat = None
        telegram_lng = None
        telegram_address = None
        location_source = None
        extracted_location_context = None
        
        if telegram_location_data:
            telegram_lat = telegram_location_data.get("latitude")
            telegram_lng = telegram_location_data.get("longitude")
            telegram_address = telegram_location_data.get("location_address")
            location_source = telegram_location_data.get("location_source")  # 'telegram_share' or 'image_analysis'
            extracted_location_context = telegram_location_data.get("extracted_location_context")
            
            print(f"   📍 Location from Telegram: lat={telegram_lat}, lng={telegram_lng}, source={location_source}")
        
        # 4. Check Neon DB ONLY for online fraud cases
        neon_fraud_data = {"checked": False}
        if "fraud" in category.lower() and ("internet" in category.lower() or "banking" in category.lower() or "online" in category.lower()):
            print(f"   🔍 Online fraud detected - checking Neon DB...")
            neon_fraud_data = self.check_neon_fraud_cases(category, enhanced_query, embedding)
        else:
            print(f"   ⏭️  Non-fraud or offline case - skipping Neon DB check")
        
        # 5. Parse with DeepSeek
        parsed_data = self.parse_with_deepseek(full_result, fraud_history, neon_fraud_data)
        print(f"   ✓ DeepSeek parsing complete")
        
        # 6. Override parsed location with Telegram location if available
        if telegram_lat and telegram_lng:
            parsed_data["latitude"] = telegram_lat
            parsed_data["longitude"] = telegram_lng
            parsed_data["location_address"] = telegram_address or parsed_data.get("location_address")
            parsed_data["extracted_location"] = {
                "source": location_source,
                "context": extracted_location_context,
                "coordinates": {"latitude": telegram_lat, "longitude": telegram_lng}
            }
            print(f"   ✓ Using Telegram location data (source: {location_source})")
        
        # 7. Match department_id
        department_id = self.match_department(
            category,
            location_data,
            enhanced_query,
            embedding
        )
        
        # 8. Insert into grievance_processed table
        try:
            conn = psycopg2.connect(self.supabase_dsn)
            cur = conn.cursor()
            
            # Convert embedding to proper format
            embedding_str = "[" + ",".join(map(str, embedding)) + "]" if embedding else "[]"
            
            sql = """
                INSERT INTO grievance_processed (
                    grievance_id,
                    grievance_text,
                    image_path,
                    image_description,
                    enhanced_query,
                    validation_score,
                    validation_reasoning,
                    extracted_location,
                    latitude,
                    longitude,
                    location_address,
                    query_type,
                    category,
                    similar_cases_summary,
                    sentiment_priority,
                    emotion,
                    severity,
                    patterns,
                    fraud,
                    policy_search,
                    sla_deadline,
                    resolution_time,
                    is_escalated,
                    escalation_level,
                    escalated_at,
                    workflow,
                    estimated_cost,
                    actual_cost,
                    resolved_at,
                    resolved_by,
                    embedding_status,
                    processing_metadata,
                    embedding,
                    created_at,
                    updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s::vector, NOW(), NOW()
                )
                ON CONFLICT (grievance_id) 
                DO UPDATE SET
                    grievance_text = EXCLUDED.grievance_text,
                    image_path = EXCLUDED.image_path,
                    image_description = EXCLUDED.image_description,
                    enhanced_query = EXCLUDED.enhanced_query,
                    validation_score = EXCLUDED.validation_score,
                    validation_reasoning = EXCLUDED.validation_reasoning,
                    extracted_location = EXCLUDED.extracted_location,
                    latitude = EXCLUDED.latitude,
                    longitude = EXCLUDED.longitude,
                    location_address = EXCLUDED.location_address,
                    query_type = EXCLUDED.query_type,
                    category = EXCLUDED.category,
                    similar_cases_summary = EXCLUDED.similar_cases_summary,
                    sentiment_priority = EXCLUDED.sentiment_priority,
                    emotion = EXCLUDED.emotion,
                    severity = EXCLUDED.severity,
                    patterns = EXCLUDED.patterns,
                    fraud = EXCLUDED.fraud,
                    policy_search = EXCLUDED.policy_search,
                    processing_metadata = EXCLUDED.processing_metadata,
                    embedding = EXCLUDED.embedding,
                    updated_at = NOW()
            """
            
            # Get image_path from telegram_location_data if available
            image_path = telegram_location_data.get("image_path") if telegram_location_data else None
            
            cur.execute(sql, (
                grievance_id,
                parsed_data.get("grievance_text"),
                image_path,  # Store blob URL
                parsed_data.get("image_description"),
                parsed_data.get("enhanced_query"),
                parsed_data.get("validation_score"),
                parsed_data.get("validation_reasoning"),
                json.dumps(parsed_data.get("extracted_location", {})),
                parsed_data.get("latitude"),
                parsed_data.get("longitude"),
                parsed_data.get("location_address"),
                json.dumps(parsed_data.get("query_type", {})),
                json.dumps(parsed_data.get("category", {})),
                parsed_data.get("similar_cases_summary"),
                json.dumps(parsed_data.get("sentiment_priority", {})),
                json.dumps(parsed_data.get("emotion", {})),
                json.dumps(parsed_data.get("severity", {})),
                json.dumps(parsed_data.get("patterns", {})),
                json.dumps(parsed_data.get("fraud", {})),
                json.dumps(parsed_data.get("policy_search", {})),
                parsed_data.get("sla_deadline"),
                parsed_data.get("resolution_time"),
                parsed_data.get("is_escalated", False),
                parsed_data.get("escalation_level"),
                parsed_data.get("escalated_at"),
                json.dumps(parsed_data.get("workflow", {})),
                parsed_data.get("estimated_cost"),
                parsed_data.get("actual_cost"),
                parsed_data.get("resolved_at"),
                parsed_data.get("resolved_by"),
                parsed_data.get("embedding_status", "pending"),
                json.dumps({
                    **(parsed_data.get("processing_metadata", {})),
                    "case_study_report": parsed_data.get("case_study_report", ""),
                    "deepseek_processed": True,
                    "full_analysis_preserved": True,
                    "location_source": location_source,
                    "extracted_location_context": extracted_location_context
                }),
                embedding_str
            ))
            
            conn.commit()
            cur.close()
            
            # Update department_id in usergrievance if matched (using grievance_id not id)
            if department_id:
                cur = conn.cursor()
                cur.execute("UPDATE usergrievance SET department_id = %s WHERE grievance_id = %s", (department_id, grievance_id))
                conn.commit()
                cur.close()
                print(f"    Updated department_id in usergrievance: {department_id}")
            
            conn.close()
            
            print(f"    Saved to grievance_processed table")
            if telegram_lat and telegram_lng:
                print(f"    ✓ Location data saved: {telegram_lat}, {telegram_lng} (source: {location_source})")
            if image_path:
                print(f"    ✓ Image blob URL saved: {image_path}")
            
            # Push grievance_id to ResearchAnalyst queue
            self._push_to_research_queue(grievance_id)
            
            return True
            
        except Exception as e:
            print(f"   ❌ Error saving to grievance_processed: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def _push_to_research_queue(self, grievance_id: str) -> bool:
        """Push grievance_id to ResearchAnalyst queue for further processing"""
        if not self.research_queue_client:
            print("    ⚠️ ResearchAnalyst queue not initialized, skipping push")
            return False
        
        try:
            message = {
                "grievance_id": grievance_id,
                "timestamp": datetime.now().isoformat(),
                "source": "QueryAnalyst"
            }
            
            message_json = json.dumps(message)
            self.research_queue_client.send_message(message_json)
            print(f"    📤 Pushed to ResearchAnalyst queue: {grievance_id}")
            return True
            
        except Exception as e:
            print(f"    ❌ Error pushing to ResearchAnalyst queue: {e}")
            return False
