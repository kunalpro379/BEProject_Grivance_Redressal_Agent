import os
import re
import json
import time
import base64
import tempfile
import warnings
from pathlib import Path
from dotenv import load_dotenv
from typing import Dict, Any, Optional
from datetime import datetime

# Suppress Pydantic "model_name/model_id vs model_" namespace warnings from deps (CrewAI, etc.)
warnings.filterwarnings("ignore", category=UserWarning, module="pydantic._internal._fields")

# Load local .env for API keys and DB URLs
load_dotenv(Path(__file__).resolve().parent / ".env", override=True)

# Disable LangSmith tracing prompt so runs are non-interactive/fast
os.environ.setdefault("LANGSMITH_SKIP_TRACING_PROMPT", "true")
os.environ.setdefault("LANGSMITH_TRACING", "false")
os.environ.setdefault("LANGCHAIN_TRACING_V2", "false")

from azure.storage.queue import QueueServiceClient, QueueClient
from azure.storage.blob import BlobServiceClient
from main import analysis


class QueryAnalystWorker:
    def __init__(self):
        """Initialize the worker with Azure Queue connection."""
        connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
        queue_name = os.getenv("AZURE_QUEUE_NAME", "queryanalyst")
        webcrawler_queue_name = os.getenv("AZURE_WEBCRAWLER_QUEUE_NAME", "webcrawler")
        
        if not connection_string:
            raise ValueError("AZURE_STORAGE_CONNECTION_STRING environment variable is required")
        
        self.queue_service_client = QueueServiceClient.from_connection_string(connection_string)
        self.queue_client: QueueClient = self.queue_service_client.get_queue_client(queue_name)
        self.webcrawler_queue_client: QueueClient = self.queue_service_client.get_queue_client(webcrawler_queue_name)
        self.blob_service_client = BlobServiceClient.from_connection_string(connection_string)
        self.container_name = os.getenv("AZURE_STORAGE_CONTAINER_NAME", "test")
        
        # Ensure queues exist
        for qc in [self.queue_client, self.webcrawler_queue_client]:
            try:
                qc.create_queue()
            except Exception:
                pass
        
        print(f"QueryAnalyst Worker initialized")
        print(f"   Polling queue: {queue_name}")
        print(f"   Pushing to: {webcrawler_queue_name}")
        print(f"   Server handles Telegram notifications")
    
    def decode_message(self, message_text: str) -> Dict[str, Any]:
        """Decode base64-encoded queue message."""
        try:
            decoded_bytes = base64.b64decode(message_text)
            return json.loads(decoded_bytes.decode('utf-8'))
        except Exception as e:
            # Try parsing as plain JSON if not base64
            try:
                return json.loads(message_text)
            except:
                raise ValueError(f"Failed to decode message: {e}")
    
    def encode_message(self, message: Dict[str, Any]) -> str:
        """Encode message to base64 for Azure Queue."""
        json_str = json.dumps(message)
        return base64.b64encode(json_str.encode('utf-8')).decode('utf-8')
    
    def extract_search_queries(self, state: Dict[str, Any]) -> list:
        """Extract policy_search_queries from workflow state."""
        # From policy_search node
        policy = state.get("policy_search") or state.get("agents_outputs", {}).get("policy_search") or {}
        queries = policy.get("queries", [])
        if queries:
            return queries
        # From json_result / case_study
        json_res = state.get("json_result", {})
        pq = json_res.get("policy_search_queries") or {}
        return pq.get("queries", [])

    def upload_files_to_blob(self, grievance_id: str, pdf_path: str, md_path: str, json_path: str, agents_json_path: str) -> Dict[str, str]:
        """Upload analysis files to blob at griviences/<grievanceId>/ and return URLs."""
        try:
            self.blob_service_client.create_container(self.container_name)
        except Exception:
            pass  # container already exists
        container = self.blob_service_client.get_container_client(self.container_name)
        prefix = f"griviences/{grievance_id}"
        urls = {}

        for local_path, blob_name, url_key in [
            (pdf_path, "grievance_report.pdf", "pdf_url"),
            (md_path, "grievance_report.md", "md_url"),
            (json_path, "grievance_analysis_final.json", "json_url"),
            (agents_json_path, "all_agent_outputs.json", "agents_json_url"),
        ]:
            if not local_path or not os.path.isfile(local_path):
                continue
            blob_path = f"{prefix}/{blob_name}"
            blob_client = container.get_blob_client(blob_path)
            with open(local_path, "rb") as f:
                blob_client.upload_blob(f, overwrite=True)
            urls[url_key] = blob_client.url

        return urls

    def _download_blob_to_temp(self, blob_url: str) -> Optional[str]:
        """Download Azure blob to temp file using connection string auth. Returns local path or None."""
        try:
            # Parse blob URL: https://account.blob.core.windows.net/container/path/to/blob
            m = re.match(r"https?://([^.]+)\.blob\.core\.windows\.net/([^/]+)/(.+)", blob_url)
            if not m:
                return None
            container_name, blob_path = m.group(2), m.group(3)
            container_client = self.blob_service_client.get_container_client(container_name)
            blob_client = container_client.get_blob_client(blob_path)
            suffix = Path(blob_path).suffix or ".jpg"
            fd, local_path = tempfile.mkstemp(suffix=suffix)
            os.close(fd)
            with open(local_path, "wb") as f:
                f.write(blob_client.download_blob().readall())
            return local_path
        except Exception as e:
            print(f"    Could not download blob via SDK: {e}")
            return None

    def process_message(self, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process a single grievance message."""
        # Handle different field names from Telegram vs API
        grievance_id = (
            message_data.get("grievance_id") or 
            message_data.get("grievanceId") or 
            message_data.get("submissionId")
        )
        citizen_id = message_data.get("citizen_id")  # Extract citizen_id from message
        
        query = (
            message_data.get("grievance_text") or 
            message_data.get("query") or 
            ""
        )
        image_url = (
            message_data.get("image_path") or 
            message_data.get("proofFileUrl") or 
            message_data.get("imageUrl")
        )
        
        print(f"\n📋 Processing grievance: {grievance_id}")
        print(f"   Citizen ID: {citizen_id}")
        print(f"   Query: {(query or '')[:100]}...")
        print(f"   Image URL: {image_url}")

        # For Azure blob URLs (private), download via SDK so image analysis can access it
        # Keep original URL for database storage
        original_image_url = image_url
        image_path_for_analysis = image_url
        temp_image_path = None
        
        if image_url and "blob.core.windows.net" in (image_url or ""):
            temp_image_path = self._download_blob_to_temp(image_url)
            if temp_image_path:
                image_path_for_analysis = temp_image_path
                print(f"    Downloaded image from blob to temp file for analysis")

        # Run analysis using existing workflow
        try:
            if not image_path_for_analysis:
                print("   📷 No image provided - skipping image validation and location extraction.")
            print("    Running analysis with validation and location extraction...")
            state = analysis(
                query=query,
                image_path=image_path_for_analysis,
                original_image_url=original_image_url,
                citizen_id=citizen_id,
                grievance_id=grievance_id,
            )
            if original_image_url:
                state["image_path"] = original_image_url
                if state.get("image_analysis"):
                    state["image_analysis"]["path"] = original_image_url
            
            # Check if validation failed
            validation_result = state.get("validation_result", {})
            is_validated = state.get("is_validated", True)
            
            if not is_validated:
                print(f"   ❌ Validation failed: {validation_result.get('reasoning', 'Unknown reason')}")
                return {
                    **message_data,
                    "current_status": "ValidationFailed",
                    "validation_result": validation_result,
                    "error": "Image does not match the complaint description",
                    "error_at": datetime.utcnow().isoformat() + "Z",
                }
            
            # Extract search queries and location data
            search_queries = self.extract_search_queries(state)
            location_data = state.get("location_data", {})
            
            print(f"   Analysis complete!")
            print(f"      - Validation score: {validation_result.get('validation_score', 'N/A')}")
            print(f"      - Location: {location_data.get('address', 'Not extracted')}")
            print(f"      - Search queries: {len(search_queries)} found")
            
            # Upload analysis files to blob at griviences/<grievanceId>/
            from configs.config import Config
            pdf_path = state.get("pdf_path") or Config.pdf_path()
            md_path = state.get("markdown_path") or Config.markdown_path()
            json_path = Config.json_analysis_path()
            agents_json_path = Config.json_agents_path()
            file_urls = self.upload_files_to_blob(grievance_id, pdf_path, md_path, json_path, agents_json_path)
            print(f"   📁 Files uploaded to blob: {list(file_urls.keys())}")
            
            # Push search_queries + validation + location + file URLs to queue
            updated_message = {
                **message_data,
                "current_status": "WebCrawling",
                "policy_search_queries": search_queries,
                "validation_result": validation_result,
                "location_data": {
                    "address": location_data.get("address"),
                    "latitude": location_data.get("latitude"),
                    "longitude": location_data.get("longitude"),
                    "landmarks": location_data.get("landmarks", []),
                    "area_type": location_data.get("area_type"),
                    "confidence": location_data.get("confidence"),
                },
                "file_urls": file_urls,
                "analysis_completed_at": datetime.utcnow().isoformat() + "Z",
            }
            
            return updated_message

        except Exception as e:
            print(f"   ❌ Error processing grievance: {e}")
            import traceback
            traceback.print_exc()
            return {
                **message_data,
                "current_status": "Error",
                "error": str(e),
                "error_at": datetime.utcnow().isoformat() + "Z",
            }
        finally:
            if temp_image_path and os.path.isfile(temp_image_path):
                try:
                    os.unlink(temp_image_path)
                except Exception:
                    pass
    
    def run(self):
        """Main worker loop - continuously poll and process messages."""
        print("\n🚀 QueryAnalyst Worker started. Waiting for messages...")
        print("   Press Ctrl+C to stop\n")
        
        poll_interval = 5  # seconds between polls
        
        try:
            while True:
                try:
                    # Receive messages (max 1 at a time for processing)
                    messages = self.queue_client.receive_messages(messages_per_page=1, visibility_timeout=300)
                    
                    message_processed = False
                    
                    for message in messages:
                        message_id = message.id
                        pop_receipt = message.pop_receipt
                        
                        try:
                            # Decode message
                            message_data = self.decode_message(message.content)
                            
                            print(f"\n📨 Received message:")
                            print(f"   Message ID: {message_id}")
                            print(f"   Fields: {list(message_data.keys())}")
                            
                            # Check current_status - if not present or is "QueryAnalyst", process it
                            current_status = message_data.get("current_status")
                            
                            # Skip if status is explicitly set to something else (like "WebCrawling", "Error", etc.)
                            if current_status and current_status not in ["QueryAnalyst", "pending", None]:
                                print(f"   ⏭️  Skipping message with status: {current_status}")
                                # Delete the message so it doesn't keep getting picked up
                                self.queue_client.delete_message(message_id, pop_receipt)
                                print(f"   ✅ Message dequeued (already processed)\n")
                                continue
                            
                            # If no status or status is QueryAnalyst/pending, process it
                            if not current_status:
                                print(f"   📝 Message has no status field - processing as new grievance")
                                message_data["current_status"] = "QueryAnalyst"
                            
                            message_processed = True
                            
                            # Process the message (AI analysis + Supabase update)
                            updated_message = self.process_message(message_data)
                            
                            # Check if processing was successful
                            processing_status = updated_message.get("current_status")
                            print(f"   📊 Processing status: {processing_status}")
                            
                            # Always delete the message from queryanalyst queue to prevent reprocessing
                            # Even if there's an error, we don't want to keep retrying the same message indefinitely
                            try:
                                self.queue_client.delete_message(message_id, pop_receipt)
                                print(f"   ✅ Message dequeued from QueryAnalyst queue")
                            except Exception as del_err:
                                print(f"   ⚠️  Warning: Could not delete message: {del_err}")
                            
                            # Only push to webcrawler if processing was successful
                            if processing_status == "Error":
                                print(f"   ⚠️  Processing failed - NOT pushing to webcrawler queue")
                                print(f"   Error: {updated_message.get('error', 'Unknown error')}\n")
                                continue
                            
                            if processing_status == "ValidationFailed":
                                print(f"   ⚠️  Validation failed - NOT pushing to webcrawler queue")
                                print(f"   Reason: {updated_message.get('validation_result', {}).get('reasoning', 'Unknown')}\n")
                                continue
                            
                            # Push to webcrawler queue only after successful analysis + DB update
                            try:
                                encoded_message = self.encode_message(updated_message)
                                self.webcrawler_queue_client.send_message(encoded_message)
                                print(f"   ✅ Pushed to webcrawler queue with status: {processing_status}")
                                print(f"   📱 Server will notify Telegram directly\n")
                            except Exception as push_err:
                                print(f"   ❌ Error pushing to webcrawler queue: {push_err}\n")
                            
                        except Exception as e:
                            print(f"   ❌ Error processing message: {e}")
                            import traceback
                            traceback.print_exc()
                            # Always try to delete the message to avoid infinite reprocessing
                            try:
                                self.queue_client.delete_message(message_id, pop_receipt)
                                print(f"   ✅ Message dequeued (after error) to prevent reprocessing\n")
                            except Exception as del_err:
                                print(f"   ⚠️  Could not delete message after error: {del_err}\n")
                    
                    if not message_processed:
                        # No messages found, wait before next poll
                        time.sleep(poll_interval)
                    
                except KeyboardInterrupt:
                    print("\n\n  Worker stopped by user")
                    break
                except Exception as e:
                    print(f"\n❌ Error in worker loop: {e}")
                    time.sleep(poll_interval)
                    
        except KeyboardInterrupt:
            print("\n\n  Worker stopped by user")
        except Exception as e:
            print(f"\n❌ Fatal error: {e}")
            raise


if __name__ == "__main__":
    worker = QueryAnalystWorker()
    worker.run()
