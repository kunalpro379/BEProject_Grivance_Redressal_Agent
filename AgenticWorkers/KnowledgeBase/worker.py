import os
import json
import time
import base64
import requests
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional

from azure.storage.queue import QueueServiceClient, QueueClient
from azure.storage.blob import BlobServiceClient, ContentSettings

from config import Config
from pdf_processor import PDFProcessor
from web_crawler import WebCrawler
from knowledge_extractor import KnowledgeExtractor


class KnowledgeBaseWorker:
    """Worker to process PDFs and URLs for knowledge base"""
    
    def __init__(self):
        """Initialize the worker with Azure Queue and Blob clients"""
        Config.validate()
        Config.ensure_dirs()
        
        # Initialize Azure clients
        self.queue_service = QueueServiceClient.from_connection_string(
            Config.AZURE_QUEUE_CONNECTION_STRING
        )
        self.queue_client: QueueClient = self.queue_service.get_queue_client(
            Config.AZURE_QUEUE_NAME
        )
        self.processed_queue_client: QueueClient = self.queue_service.get_queue_client(
            Config.AZURE_PROCESSED_QUEUE_NAME
        )
        
        self.blob_service = BlobServiceClient.from_connection_string(
            Config.AZURE_STORAGE_CONNECTION_STRING
        )
        self.container_name = Config.AZURE_STORAGE_CONTAINER_NAME
        
        # Initialize processors
        self.pdf_processor = PDFProcessor()
        self.web_crawler = WebCrawler()
        self.knowledge_extractor = KnowledgeExtractor()
        
        # Ensure queues exist
        for qc in [self.queue_client, self.processed_queue_client]:
            try:
                qc.create_queue()
            except Exception:
                pass
        
        print(f"KnowledgeBase Worker initialized")
        print(f"   Input Queue: {Config.AZURE_QUEUE_NAME}")
        print(f"   Output Queue: {Config.AZURE_PROCESSED_QUEUE_NAME}")
    
    def decode_message(self, message_text: str) -> Dict[str, Any]:
        """Decode base64-encoded queue message"""
        try:
            decoded_bytes = base64.b64decode(message_text)
            return json.loads(decoded_bytes.decode('utf-8'))
        except Exception:
            # Try parsing as plain JSON if not base64
            try:
                return json.loads(message_text)
            except Exception as e:
                raise ValueError(f"Failed to decode message: {e}")
    
    def encode_message(self, message: Dict[str, Any]) -> str:
        """Encode message to base64 for Azure Queue"""
        # Create a lightweight version for the queue (Azure Queue has 64KB limit)
        lightweight_message = {
            'id': message.get('id'),
            'type': message.get('type'),
            'status': message.get('status'),
            'title': message.get('title'),
            'department': message.get('department'),
            'processed_files': message.get('processed_files'),
            'stats': message.get('stats'),
            'error': message.get('error'),
            'processed_at': message.get('processed_at'),
            'created_at': message.get('created_at')
        }
        
        # Add only summary from knowledge (not full knowledge object)
        if message.get('knowledge'):
            lightweight_message['knowledge_summary'] = {
                'department': message['knowledge'].get('department'),
                'summary': message['knowledge'].get('summary'),
                'key_topics': message['knowledge'].get('key_topics', [])[:5]  # Only first 5 topics
            }
        
        json_str = json.dumps(lightweight_message)
        encoded = base64.b64encode(json_str.encode('utf-8')).decode('utf-8')
        
        # Check size (Azure Queue limit is 64KB)
        size_kb = len(encoded) / 1024
        if size_kb > 60:  # Leave some buffer
            print(f"    Warning: Message size is {size_kb:.1f}KB (close to 64KB limit)")
        
        return encoded
    
    def upload_to_blob(self, content: str, blob_path: str, content_type: str = "text/plain") -> str:
        """Upload content to Azure Blob Storage"""
        try:
            from azure.storage.blob import ContentSettings
            
            container_client = self.blob_service.get_container_client(self.container_name)
            
            # Ensure container exists
            try:
                container_client.create_container()
            except Exception:
                pass
            
            blob_client = container_client.get_blob_client(blob_path)
            
            # Prepare content
            if isinstance(content, str):
                content_bytes = content.encode('utf-8')
            else:
                content_bytes = content
            
            # Upload with proper content settings
            blob_client.upload_blob(
                content_bytes,
                overwrite=True,
                content_settings=ContentSettings(content_type=content_type)
            )
            
            return blob_client.url
            
        except Exception as e:
            print(f"   ❌ Failed to upload to blob: {e}")
            return ""

    def process_pdf(self, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process PDF file"""
        try:
            pdf_url = message_data.get('url')
            file_name = message_data.get('fileName', 'unknown.pdf')
            kb_id = message_data.get('id')
            department_id = message_data.get('departmentId')
            uploaded_by = message_data.get('uploadedBy')
            
            print(f"\n📄 Processing PDF: {file_name}")
            print(f"   URL: {pdf_url}")
            
            # Extract text from PDF
            pdf_result = self.pdf_processor.process_pdf_url(pdf_url)
            
            if not pdf_result.get('success'):
                return {
                    **message_data,
                    'status': 'failed',
                    'error': pdf_result.get('error', 'Failed to process PDF'),
                    'processed_at': datetime.utcnow().isoformat() + 'Z'
                }
            
            text_content = pdf_result.get('text', '')
            num_pages = pdf_result.get('num_pages', 0)
            
            print(f"   ✓ Extracted text from {num_pages} pages")
            
            # Extract URLs from PDF text
            extracted_urls = self.extract_urls_from_text(text_content)
            print(f"   🔗 Found {len(extracted_urls)} URLs in PDF")
            
            # Extract knowledge using LLM
            knowledge_result = self.knowledge_extractor.extract_knowledge(
                text=text_content,
                source_type='pdf',
                source_url=pdf_url
            )
            
            if not knowledge_result.get('success'):
                error_msg = knowledge_result.get('error', 'Failed to extract knowledge')
                print(f"   ❌ Knowledge extraction failed: {error_msg}")
                return {
                    **message_data,
                    'status': 'failed',
                    'error': error_msg,
                    'processed_at': datetime.utcnow().isoformat() + 'Z'
                }
            
            knowledge = knowledge_result.get('knowledge', {})
            knowledge['extracted_at'] = datetime.utcnow().isoformat() + 'Z'
            knowledge['extracted_urls'] = extracted_urls[:20]  # Store first 20 URLs
            
            # Create embeddings data
            embeddings_chunks = self.knowledge_extractor.create_embeddings_data(
                knowledge, text_content
            )
            
            print(f"   ✓ Created {len(embeddings_chunks)} embedding chunks")
            
            # Upload processed data to blob
            blob_prefix = f"knowledgebase/processed/{kb_id or int(time.time())}"
            
            # Upload extracted text
            text_url = self.upload_to_blob(
                text_content,
                f"{blob_prefix}/extracted_text.txt",
                "text/plain"
            )
            
            # Upload knowledge JSON
            knowledge_url = self.upload_to_blob(
                json.dumps(knowledge, indent=2),
                f"{blob_prefix}/knowledge.json",
                "application/json"
            )
            
            # Upload embeddings data
            embeddings_url = self.upload_to_blob(
                json.dumps(embeddings_chunks, indent=2),
                f"{blob_prefix}/embeddings.json",
                "application/json"
            )
            
            # Upload full result for reference
            result_data = {
                **message_data,
                'status': 'completed',
                'knowledge': knowledge,
                'processed_files': {
                    'text_url': text_url,
                    'knowledge_url': knowledge_url,
                    'embeddings_url': embeddings_url
                },
                'stats': {
                    'num_pages': num_pages,
                    'text_length': len(text_content),
                    'num_chunks': len(embeddings_chunks),
                    'num_urls_found': len(extracted_urls)
                },
                'processed_at': datetime.utcnow().isoformat() + 'Z'
            }
            
            # Upload full result
            result_url = self.upload_to_blob(
                json.dumps(result_data, indent=2),
                f"{blob_prefix}/result.json",
                "application/json"
            )
            result_data['processed_files']['result_url'] = result_url
            
            print(f"   ✓ Uploaded processed files to blob")
            
            # Queue extracted URLs for crawling
            if extracted_urls and department_id and uploaded_by:
                self.queue_extracted_urls(
                    extracted_urls[:10],  # Queue first 10 URLs
                    department_id,
                    uploaded_by,
                    f"Extracted from PDF: {file_name}"
                )
            
            return result_data
            
        except Exception as e:
            print(f"   ❌ Error processing PDF: {e}")
            return {
                **message_data,
                'status': 'failed',
                'error': str(e),
                'processed_at': datetime.utcnow().isoformat() + 'Z'
            }
    
    def process_url(self, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process URL by crawling"""
        try:
            url = message_data.get('url')
            kb_id = message_data.get('id')
            department_id = message_data.get('departmentId')
            uploaded_by = message_data.get('uploadedBy')
            
            print(f"\n🌐 Processing URL: {url}")
            
            # Crawl the URL
            crawl_result = self.web_crawler.crawl_url(url)
            
            if not crawl_result.get('success'):
                return {
                    **message_data,
                    'status': 'failed',
                    'error': crawl_result.get('error', 'Failed to crawl URL'),
                    'processed_at': datetime.utcnow().isoformat() + 'Z'
                }
            
            # Remove image links from markdown
            markdown_content = crawl_result.get('markdown', '')
            markdown_clean = self.web_crawler.remove_image_links(markdown_content)
            
            # Get extracted links from crawler
            extracted_links = crawl_result.get('links', [])
            
            print(f"   ✓ Crawled: {crawl_result.get('title', 'Untitled')}")
            print(f"   🔗 Found {len(extracted_links)} links on page")
            
            # Extract knowledge using LLM
            knowledge_result = self.knowledge_extractor.extract_knowledge(
                text=markdown_clean,
                source_type='url',
                source_url=url
            )
            
            if not knowledge_result.get('success'):
                error_msg = knowledge_result.get('error', 'Failed to extract knowledge')
                print(f"   ❌ Knowledge extraction failed: {error_msg}")
                return {
                    **message_data,
                    'status': 'failed',
                    'error': error_msg,
                    'processed_at': datetime.utcnow().isoformat() + 'Z'
                }
            
            knowledge = knowledge_result.get('knowledge', {})
            knowledge['extracted_at'] = datetime.utcnow().isoformat() + 'Z'
            knowledge['title'] = crawl_result.get('title', '')
            knowledge['extracted_links'] = extracted_links[:20]  # Store first 20 links
            
            # Create embeddings data
            embeddings_chunks = self.knowledge_extractor.create_embeddings_data(
                knowledge, markdown_clean
            )
            
            print(f"   ✓ Created {len(embeddings_chunks)} embedding chunks")
            
            # Upload processed data to blob
            blob_prefix = f"knowledgebase/processed/{kb_id or int(time.time())}"
            
            # Upload markdown
            markdown_url = self.upload_to_blob(
                markdown_clean,
                f"{blob_prefix}/content.md",
                "text/markdown"
            )
            
            # Upload knowledge JSON
            knowledge_url = self.upload_to_blob(
                json.dumps(knowledge, indent=2),
                f"{blob_prefix}/knowledge.json",
                "application/json"
            )
            
            # Upload embeddings data
            embeddings_url = self.upload_to_blob(
                json.dumps(embeddings_chunks, indent=2),
                f"{blob_prefix}/embeddings.json",
                "application/json"
            )
            
            # Upload full result for reference
            result_data = {
                **message_data,
                'status': 'completed',
                'knowledge': knowledge,
                'processed_files': {
                    'markdown_url': markdown_url,
                    'knowledge_url': knowledge_url,
                    'embeddings_url': embeddings_url
                },
                'stats': {
                    'text_length': len(markdown_clean),
                    'num_chunks': len(embeddings_chunks),
                    'num_links': len(extracted_links)
                },
                'processed_at': datetime.utcnow().isoformat() + 'Z'
            }
            
            # Upload full result
            result_url = self.upload_to_blob(
                json.dumps(result_data, indent=2),
                f"{blob_prefix}/result.json",
                "application/json"
            )
            result_data['processed_files']['result_url'] = result_url
            
            print(f"   ✓ Uploaded processed files to blob")
            
            # Queue extracted links for crawling
            if extracted_links and department_id and uploaded_by:
                self.queue_extracted_urls(
                    extracted_links[:10],  # Queue first 10 links
                    department_id,
                    uploaded_by,
                    f"Extracted from: {url}"
                )
            
            return result_data
            
        except Exception as e:
            print(f"   ❌ Error processing URL: {e}")
            return {
                **message_data,
                'status': 'failed',
                'error': str(e),
                'processed_at': datetime.utcnow().isoformat() + 'Z'
            }
    
    def process_message(self, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process a single message based on type"""
        msg_type = message_data.get('type')
        
        if msg_type == 'pdf_upload':
            return self.process_pdf(message_data)
        elif msg_type == 'url_crawl':
            return self.process_url(message_data)
        else:
            print(f"    Unknown message type: {msg_type}")
            return {
                **message_data,
                'status': 'failed',
                'error': f'Unknown message type: {msg_type}',
                'processed_at': datetime.utcnow().isoformat() + 'Z'
            }
    
    def save_result_locally(self, result: Dict[str, Any]):
        """Save processing result to local JSON file"""
        try:
            output_dir = Config.OUTPUT_DIR / "processed_results"
            output_dir.mkdir(exist_ok=True)
            
            kb_id = result.get('id', 'unknown')
            timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
            filename = f"kb_{kb_id}_{timestamp}.json"
            
            filepath = output_dir / filename
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            
            print(f"    Saved result locally: {filepath}")
            
        except Exception as e:
            print(f"   ⚠️  Failed to save result locally: {e}")
    
    def extract_urls_from_text(self, text: str) -> list:
        """Extract URLs from text content"""
        import re
        # Match http:// and https:// URLs
        url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
        urls = re.findall(url_pattern, text)
        # Remove duplicates and clean
        unique_urls = list(set(urls))
        # Filter out common non-content URLs
        filtered_urls = [
            url for url in unique_urls
            if not any(skip in url.lower() for skip in [
                'facebook.com', 'twitter.com', 'linkedin.com',
                'instagram.com', 'youtube.com', 'google.com',
                '.jpg', '.png', '.gif', '.pdf', '.zip'
            ])
        ]
        return filtered_urls
    
    def queue_extracted_urls(self, urls: list, department_id: str, uploaded_by: str, source_description: str):
        """Queue extracted URLs for crawling"""
        try:
            queued_count = 0
            for url in urls:
                try:
                    # Validate URL
                    from urllib.parse import urlparse
                    parsed = urlparse(url)
                    if not parsed.scheme or not parsed.netloc:
                        continue
                    
                    # Send to queue
                    message = {
                        'type': 'url_crawl',
                        'id': None,  # Will be assigned by server
                        'url': url,
                        'description': source_description,
                        'uploadedBy': uploaded_by,
                        'departmentId': department_id,
                        'uploadedAt': datetime.utcnow().isoformat() + 'Z',
                        'auto_extracted': True
                    }
                    
                    encoded_message = self.encode_message(message)
                    self.queue_client.send_message(encoded_message)
                    queued_count += 1
                    
                except Exception as e:
                    print(f"   ⚠️  Failed to queue URL {url}: {e}")
                    continue
            
            if queued_count > 0:
                print(f"   📤 Queued {queued_count} extracted URLs for crawling")
                
        except Exception as e:
            print(f"   ⚠️  Error queuing URLs: {e}")
    
    def update_database(self, result: Dict[str, Any]):
        """Call API to update database"""
        try:
            callback_url = f"{Config.API_CALLBACK_URL.rstrip('/')}/api/knowledgebase/update-status"
            
            payload = {
                'id': result.get('id'),
                'status': result.get('status'),
                'knowledge': result.get('knowledge'),
                'processed_files': result.get('processed_files'),
                'stats': result.get('stats'),
                'error': result.get('error'),
                'processed_at': result.get('processed_at')
            }
            
            response = requests.post(callback_url, json=payload, timeout=10)
            
            if response.ok:
                print(f"   Database updated successfully")
                return True
            else:
                print(f"    Database update failed: {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                return False
                
        except requests.exceptions.ConnectionError as e:
            print(f"    Server not running on {Config.API_CALLBACK_URL}")
            print(f"   💡 Start the server: cd Platform/Server && npm start")
            # Save locally if server is not running
            self.save_result_locally(result)
            return False
        except Exception as e:
            print(f"    Failed to update database: {e}")
            return False
    
    def run(self):
        """Main worker loop"""
        print("\n🚀 KnowledgeBase Worker started. Waiting for messages...")
        print("   Press Ctrl+C to stop\n")
        
        poll_interval = 5  # seconds
        
        try:
            while True:
                try:
                    # Receive messages
                    messages = self.queue_client.receive_messages(
                        messages_per_page=1,
                        visibility_timeout=600  # 10 minutes
                    )
                    
                    message_processed = False
                    
                    for message in messages:
                        try:
                            message_processed = True
                            
                            # Decode message
                            print("    Decoding message...")
                            message_data = self.decode_message(message.content)
                            
                            # Process the message
                            print("   ⚙️  Processing message...")
                            result = self.process_message(message_data)
                            print(f"   Processing complete. Status: {result.get('status')}")
                            
                            # Update database via API
                            print("    Updating database...")
                            self.update_database(result)
                            print("   Database updated")
                            
                            # Push to processed queue
                            print(f"   📤 Pushing to '{Config.AZURE_PROCESSED_QUEUE_NAME}' queue...")
                            encoded_result = self.encode_message(result)
                            self.processed_queue_client.send_message(encoded_result)
                            print(f"   Pushed to '{Config.AZURE_PROCESSED_QUEUE_NAME}' queue")
                            
                            # Delete from input queue
                            print("   🗑️  Deleting from input queue...")
                            self.queue_client.delete_message(message.id, message.pop_receipt)
                            
                            print(f"   Message processed and pushed to '{Config.AZURE_PROCESSED_QUEUE_NAME}' queue\n")
                            
                        except Exception as e:
                            import traceback
                            print(f"   ❌ Error processing message: {e}")
                            print(f"   📋 Traceback:\n{traceback.format_exc()}")
                            # Delete message to avoid reprocessing
                            try:
                                self.queue_client.delete_message(message.id, message.pop_receipt)
                            except:
                                pass
                    
                    if not message_processed:
                        time.sleep(poll_interval)
                        
                except KeyboardInterrupt:
                    print("\n\n  Worker stopped by user")
                    break
                except Exception as e:
                    print(f"\n❌ Error in worker loop: {e}")
                    time.sleep(poll_interval)
                    
        except KeyboardInterrupt:
            print("\n\n  Worker stopped by user")
        finally:
            # Cleanup
            self.pdf_processor.cleanup()
            print("\n👋 Worker shutdown complete")


if __name__ == "__main__":
    worker = KnowledgeBaseWorker()
    worker.run()
