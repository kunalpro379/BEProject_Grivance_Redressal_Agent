import os
import re
import requests
import json
import time
import base64
import tempfile
from pathlib import Path
from dotenv import load_dotenv
from typing import Dict, Any, Optional
from datetime import datetime

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
        self.api_callback_url = os.getenv("API_CALLBACK_URL", "http://localhost:3000")
        
        # Ensure queues exist
        for qc in [self.queue_client, self.webcrawler_queue_client]:
            try:
                qc.create_queue()
            except Exception:
                pass
        
        print(f"✅ QueryAnalyst Worker initialized. Polling: {queue_name} → pushes to: {webcrawler_queue_name}")
    
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
            print(f"   ⚠️ Could not download blob via SDK: {e}")
            return None

    def process_message(self, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process a single grievance message."""
        grievance_id = message_data.get("grievanceId") or message_data.get("submissionId")
        query = message_data.get("query", "")
        image_url = message_data.get("proofFileUrl") or message_data.get("imageUrl")
        
        print(f"\n📋 Processing grievance: {grievance_id}")
        print(f"   Query: {(query or '')[:100]}...")
        print(f"   Image URL: {image_url}")

        # For Azure blob URLs (private), download via SDK so image analysis can access it
        image_path = image_url
        temp_image_path = None
        if image_url and "blob.core.windows.net" in (image_url or ""):
            temp_image_path = self._download_blob_to_temp(image_url)
            if temp_image_path:
                image_path = temp_image_path
                print(f"   📥 Downloaded image from blob to temp file for analysis")

        # Run analysis using existing workflow
        try:
            print("   🔍 Running analysis...")
            state = analysis(query=query, image_path=image_path)
            
            # Extract only policy_search_queries (search queries)
            search_queries = self.extract_search_queries(state)
            print(f"   ✅ Analysis complete! Search queries: {len(search_queries)} found")
            
            # Upload analysis files to blob at griviences/<grievanceId>/
            from configs.config import Config
            pdf_path = state.get("pdf_path") or Config.pdf_path()
            md_path = state.get("markdown_path") or Config.markdown_path()
            json_path = Config.json_analysis_path()
            agents_json_path = Config.json_agents_path()
            file_urls = self.upload_files_to_blob(grievance_id, pdf_path, md_path, json_path, agents_json_path)
            print(f"   📁 Files uploaded to blob: {list(file_urls.keys())}")
            
            # Push only search_queries + file URLs to queue (no full analysis)
            updated_message = {
                **message_data,
                "current_status": "WebCrawling",
                "policy_search_queries": search_queries,
                "file_urls": file_urls,
                "analysis_completed_at": datetime.utcnow().isoformat() + "Z",
            }
            
            return updated_message

        except Exception as e:
            print(f"   ❌ Error processing grievance: {e}")
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
                        try:
                            # Decode message
                            message_data = self.decode_message(message.content)
                            
                            # Only process messages with current_status: "QueryAnalyst"
                            if message_data.get("current_status") != "QueryAnalyst":
                                # Don't delete - leave for WebCrawling/other workers; message becomes visible again after visibility_timeout
                                continue
                            
                            message_processed = True
                            
                            # Process the message
                            updated_message = self.process_message(message_data)
                            
                            # Delete original message from queryanalyst
                            self.queue_client.delete_message(message.id, message.pop_receipt)
                            
                            # Call API callback so API can notify Telegram
                            try:
                                callback_url = f"{self.api_callback_url.rstrip('/')}/api/worker/queryanalyst-callback"
                                resp = requests.post(callback_url, json=updated_message, timeout=10)
                                if resp.ok:
                                    print(f"   📤 API callback OK – Telegram notified")
                                else:
                                    print(f"   ⚠️ API callback returned {resp.status_code}")
                            except Exception as e:
                                print(f"   ⚠️ API callback failed: {e}")
                            
                            # Push to webcrawler queue for WebCrawler worker
                            encoded_message = self.encode_message(updated_message)
                            self.webcrawler_queue_client.send_message(encoded_message)
                            
                            print(f"   ✅ Pushed to webcrawler queue with status: {updated_message['current_status']}\n")
                            
                        except Exception as e:
                            print(f"   ❌ Error processing message: {e}")
                            # Try to delete the message to avoid reprocessing
                            try:
                                self.queue_client.delete_message(message.id, message.pop_receipt)
                            except:
                                pass
                    
                    if not message_processed:
                        # No messages found, wait before next poll
                        time.sleep(poll_interval)
                    
                except KeyboardInterrupt:
                    print("\n\n⚠️  Worker stopped by user")
                    break
                except Exception as e:
                    print(f"\n❌ Error in worker loop: {e}")
                    time.sleep(poll_interval)
                    
        except KeyboardInterrupt:
            print("\n\n⚠️  Worker stopped by user")
        except Exception as e:
            print(f"\n❌ Fatal error: {e}")
            raise


if __name__ == "__main__":
    worker = QueryAnalystWorker()
    worker.run()
