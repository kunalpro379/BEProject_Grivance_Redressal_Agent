import logging
import sys
import time
import json
from pathlib import Path
from typing import Dict, Any, List

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass

from config import Config
from azure_clients import AzureQueueClient, AzureBlobClient
from embedding_engine import EmbeddingEngine
from pinecone_client import PineconeClient

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)

# Reduce Azure SDK logging noise
logging.getLogger("azure").setLevel(logging.WARNING)
logging.getLogger("azure.core.pipeline.policies.http_logging_policy").setLevel(logging.WARNING)

logger = logging.getLogger(__name__)


class VectorDBWorker:
    def __init__(self):
        self.queue_client = AzureQueueClient()
        self.blob_client = AzureBlobClient()
        self.embedding_engine = EmbeddingEngine()
        self.pinecone_client = PineconeClient()
        self.processed_count = 0
    
    def process_message(self, message) -> bool:
        """Process one message from embeddings queue"""
        try:
            # Parse message - handle empty/corrupt messages
            if not message.content or not message.content.strip():
                logger.error(f"Empty message content, skipping message {message.id}")
                return False
            
            # Debug: show raw message content
            logger.info(f"Raw message: {message.content[:200]}")
            
            message_data = json.loads(message.content)
            job_id = message_data.get("job_id", "unknown")
            url = message_data.get("url", "")
            blob_folder = message_data.get("blob_folder", "")
            status = message_data.get("status", "")
            
            logger.info(f"\n{'='*80}")
            logger.info(f"Processing: {job_id} | {blob_folder}")
            logger.info(f"{'='*80}")
            
            if not blob_folder:
                logger.error("No blob_folder in message, skipping")
                return False
            
            # List all files in blob folder
            files = self.blob_client.list_files_in_folder(blob_folder)
            if not files:
                logger.warning(f"No files found in {blob_folder}, skipping")
                return True  # Not an error, just empty folder
            
            # Process each file
            total_vectors = 0
            for file_path in files:
                vectors_count = self.process_file(file_path, job_id, url, blob_folder)
                total_vectors += vectors_count
            
            logger.info(f"✓ Completed: {len(files)} files, {total_vectors} vectors")
            self.processed_count += 1
            return True
            
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in message: {e}")
            return False
        except Exception as e:
            logger.exception(f"Error processing message: {e}")
            return False
    
    def process_file(self, file_path: str, job_id: str, url: str, blob_folder: str) -> int:
        """Process one file: download, chunk, embed, upsert to Pinecone"""
        try:
            # Download file content
            content = self.blob_client.download_blob_content(file_path)
            if not content:
                logger.warning(f"Empty content in {file_path}, skipping")
                return 0
            
            # Extract file name
            file_name = file_path.split('/')[-1]
            
            # Chunk text
            chunks = self.embedding_engine.chunk_text(content)
            if not chunks:
                logger.warning(f"No chunks generated from {file_path}")
                return 0
            
            # Generate embeddings and prepare vectors
            vectors = []
            for i, chunk in enumerate(chunks):
                embedding = self.embedding_engine.encode(chunk)
                if not embedding:
                    logger.warning(f"Empty embedding for chunk {i} in {file_path}")
                    continue
                
                # Create unique ID: job_id + file_name + chunk_index
                vector_id = f"{job_id}_{file_name}_{i}".replace('/', '_').replace('.', '_')
                
                vector = {
                    "id": vector_id,
                    "values": embedding,
                    "metadata": {
                        "job_id": job_id,
                        "url": url,
                        "blob_folder": blob_folder,
                        "file_name": file_name,
                        "file_path": file_path,
                        "chunk_index": i,
                        "total_chunks": len(chunks),
                        "text": chunk[:500]  # Store first 500 chars of chunk
                    }
                }
                vectors.append(vector)
            
            # Upsert to Pinecone
            if vectors:
                success = self.pinecone_client.upsert_embeddings(vectors)
                if success:
                    logger.info(f"✓ {file_name}: {len(vectors)} vectors upserted")
                    return len(vectors)
                else:
                    logger.error(f"Failed to upsert vectors for {file_name}")
                    return 0
            
            return 0
            
        except Exception as e:
            logger.exception(f"Error processing file {file_path}: {e}")
            return 0
    
    def run(self):
        """Main worker loop"""
        logger.info("VectorDB Worker started")
        logger.info(f"Queue: {Config.EMBEDDINGS_QUEUE_NAME}")
        logger.info(f"Blob Container: {Config.AZURE_STORAGE_CONTAINER_NAME}")
        logger.info(f"Pinecone: {Config.PINECONE_INDEX_NAME}")
        logger.info(f"{'='*80}\n")
        
        no_message_logged = False
        
        while True:
            try:
                # Receive message from queue
                message = self.queue_client.receive_message()
                
                if not message:
                    if not no_message_logged:
                        logger.info("Waiting for messages...")
                        no_message_logged = True
                    time.sleep(Config.POLL_INTERVAL_SEC)
                    continue
                
                no_message_logged = False
                
                # Process message
                success = self.process_message(message)
                
                # Delete message if successful
                if success:
                    self.queue_client.delete_message(message)
                else:
                    logger.error(f"Failed to process message {message.id}, will retry later")
                
                # Small delay between messages
                time.sleep(1)
                
            except KeyboardInterrupt:
                logger.info(f"\nWorker stopped. Processed: {self.processed_count}")
                break
            except Exception as e:
                logger.exception(f"Worker loop error: {e}")
                time.sleep(Config.POLL_INTERVAL_SEC)


if __name__ == "__main__":
    worker = VectorDBWorker()
    worker.run()
