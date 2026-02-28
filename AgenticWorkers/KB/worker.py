import os
import json
import time
import base64
from pathlib import Path
from datetime import datetime
from typing import Dict, Any

from azure.storage.queue import QueueServiceClient, QueueClient

from config import Config
from services.pdf_processor import PDFProcessor
from services.knowledge_extractor import KnowledgeExtractor
from services.embedding_service import EmbeddingService
from services.pinecone_service import PineconeService
from services.blob_service import BlobService


class KBWorker:
    """Knowledge Base Worker - Process PDFs, extract knowledge, create embeddings, store in Pinecone"""
    
    def __init__(self):
        """Initialize the KB worker"""
        print("\n🚀 Initializing KB Worker...")
        
        Config.validate()
        Config.ensure_dirs()
        
        # Initialize Azure Queue clients
        self.queue_service = QueueServiceClient.from_connection_string(
            Config.AZURE_QUEUE_CONNECTION_STRING
        )
        self.queue_client: QueueClient = self.queue_service.get_queue_client(
            Config.AZURE_QUEUE_NAME
        )
        self.processed_queue_client: QueueClient = self.queue_service.get_queue_client(
            Config.AZURE_PROCESSED_QUEUE_NAME
        )
        
        # Ensure queues exist
        for qc in [self.queue_client, self.processed_queue_client]:
            try:
                qc.create_queue()
            except Exception:
                pass
        
        # Initialize services
        self.pdf_processor = PDFProcessor()
        self.knowledge_extractor = KnowledgeExtractor()
        self.embedding_service = EmbeddingService()
        self.pinecone_service = PineconeService()
        self.blob_service = BlobService()
        
        print(f"✓ KB Worker initialized")
        print(f"   Input Queue: {Config.AZURE_QUEUE_NAME}")
        print(f"   Output Queue: {Config.AZURE_PROCESSED_QUEUE_NAME}")
        print(f"   Pinecone Index: {Config.PINECONE_INDEX_NAME}")
    
    def decode_message(self, message_text: str) -> Dict[str, Any]:
        """Decode base64-encoded queue message"""
        try:
            decoded_bytes = base64.b64decode(message_text)
            return json.loads(decoded_bytes.decode('utf-8'))
        except Exception:
            try:
                return json.loads(message_text)
            except Exception as e:
                raise ValueError(f"Failed to decode message: {e}")
    
    def encode_message(self, message: Dict[str, Any]) -> str:
        """Encode message to base64 for Azure Queue"""
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
        
        json_str = json.dumps(lightweight_message)
        encoded = base64.b64encode(json_str.encode('utf-8')).decode('utf-8')
        
        return encoded

    def process_pdf(self, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process PDF: Extract text → Chunk → Embed → Store in Pinecone → Extract Knowledge → Upload to Blob"""
        try:
            pdf_url = message_data.get('url')
            file_name = message_data.get('fileName', 'unknown.pdf')
            kb_id = message_data.get('id', str(int(time.time())))
            department_id = message_data.get('departmentId')
            
            print(f"\n📄 Processing PDF: {file_name}")
            print(f"   URL: {pdf_url}")
            print(f"   KB ID: {kb_id}")
            
            # Step 1: Extract text from PDF
            print("\n   Step 1: Extracting text from PDF...")
            pdf_result = self.pdf_processor.process_pdf_url(pdf_url)
            
            if not pdf_result.get('success'):
                return {
                    **message_data,
                    'status': 'failed',
                    'error': pdf_result.get('error', 'Failed to process PDF'),
                    'processed_at': datetime.utcnow().isoformat() + 'Z'
                }
            
            pages = pdf_result.get('pages', [])
            full_text = pdf_result.get('text', '')
            num_pages = pdf_result.get('num_pages', 0)
            
            print(f"   ✓ Extracted text from {num_pages} pages")
            
            # Step 2: Chunk text
            print("\n   Step 2: Chunking text...")
            chunks = self.embedding_service.chunk_text(pages)
            print(f"   ✓ Created {len(chunks)} chunks")
            
            # Step 3: Create embeddings
            print("\n   Step 3: Creating embeddings...")
            chunks_with_embeddings = self.embedding_service.create_embeddings(chunks)
            print(f"   ✓ Created embeddings for {len(chunks_with_embeddings)} chunks")
            
            # Step 4: Store in Pinecone
            print("\n   Step 4: Storing in Pinecone...")
            vectors = self.embedding_service.prepare_chunks_for_pinecone(
                chunks_with_embeddings,
                metadata={
                    'kb_id': kb_id,
                    'department_id': department_id,
                    'source_type': 'pdf',
                    'source_url': pdf_url,
                    'file_name': file_name
                }
            )
            self.pinecone_service.upsert_vectors(vectors)
            print(f"   ✓ Stored in Pinecone")
            
            # Step 5: Extract structured knowledge
            print("\n   Step 5: Extracting structured knowledge...")
            knowledge_base = self.knowledge_extractor.build_knowledge_base(chunks)
            
            # Add metadata
            knowledge_base['_metadata'] = {
                'kb_id': kb_id,
                'source_type': 'pdf',
                'source_url': pdf_url,
                'file_name': file_name,
                'department_id': department_id,
                'num_pages': num_pages,
                'num_chunks': len(chunks),
                'extracted_at': datetime.utcnow().isoformat() + 'Z'
            }
            
            print(f"   ✓ Knowledge base built")
            
            # Step 6: Save knowledge_base.json locally
            print("\n   Step 6: Saving knowledge_base.json locally...")
            output_file = Config.OUTPUT_DIR / f"knowledge_base_{kb_id}.json"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(knowledge_base, f, indent=2, ensure_ascii=False)
            print(f"   ✓ Saved to: {output_file}")
            
            # Step 7: Upload knowledge_base.json to blob
            print("\n   Step 7: Uploading knowledge_base.json to blob...")
            kb_url = self.blob_service.upload_knowledge_base(knowledge_base, kb_id)
            
            # Prepare result
            result_data = {
                **message_data,
                'status': 'completed',
                'processed_files': {
                    'knowledge_base_url': kb_url,
                    'local_path': str(output_file)
                },
                'stats': {
                    'num_pages': num_pages,
                    'text_length': len(full_text),
                    'num_chunks': len(chunks),
                    'num_vectors': len(vectors)
                },
                'processed_at': datetime.utcnow().isoformat() + 'Z'
            }
            
            print(f"\n   ✅ PDF processing complete!")
            return result_data
            
        except Exception as e:
            import traceback
            print(f"\n   ❌ Error processing PDF: {e}")
            print(f"   Traceback:\n{traceback.format_exc()}")
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
        else:
            print(f"    ⚠️  Unknown message type: {msg_type}")
            return {
                **message_data,
                'status': 'failed',
                'error': f'Unknown message type: {msg_type}',
                'processed_at': datetime.utcnow().isoformat() + 'Z'
            }
    
    def run(self):
        """Main worker loop"""
        print("\n🚀 KB Worker started. Waiting for messages...")
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
                            
                            print("=" * 80)
                            print(f"📨 Received message at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                            
                            # Decode message
                            message_data = self.decode_message(message.content)
                            
                            # Process the message
                            result = self.process_message(message_data)
                            
                            # Push to processed queue
                            print(f"\n   📤 Pushing to '{Config.AZURE_PROCESSED_QUEUE_NAME}' queue...")
                            encoded_result = self.encode_message(result)
                            self.processed_queue_client.send_message(encoded_result)
                            print(f"   ✓ Pushed to processed queue")
                            
                            # Delete from input queue
                            self.queue_client.delete_message(message.id, message.pop_receipt)
                            print(f"   ✓ Deleted from input queue")
                            
                            print(f"\n   ✅ Message processing complete!")
                            print("=" * 80 + "\n")
                            
                        except Exception as e:
                            import traceback
                            print(f"\n   ❌ Error processing message: {e}")
                            print(f"   Traceback:\n{traceback.format_exc()}")
                            # Delete message to avoid reprocessing
                            try:
                                self.queue_client.delete_message(message.id, message.pop_receipt)
                            except:
                                pass
                    
                    if not message_processed:
                        time.sleep(poll_interval)
                        
                except KeyboardInterrupt:
                    print("\n\n⏹️  Worker stopped by user")
                    break
                except Exception as e:
                    import traceback
                    print(f"\n❌ Error in worker loop: {e}")
                    print(f"Traceback:\n{traceback.format_exc()}")
                    time.sleep(poll_interval)
                    
        except KeyboardInterrupt:
            print("\n\n⏹️  Worker stopped by user")
        finally:
            # Cleanup
            self.pdf_processor.cleanup()
            print("\n👋 Worker shutdown complete")


if __name__ == "__main__":
    worker = KBWorker()
    worker.run()
