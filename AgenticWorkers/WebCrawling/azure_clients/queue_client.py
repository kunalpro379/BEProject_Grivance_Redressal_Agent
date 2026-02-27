import json
import logging
from typing import Dict, Optional
from azure.storage.queue import QueueClient, QueueServiceClient
from config.settings import settings

logger = logging.getLogger(__name__)

class AzureQueueManager:
    def __init__(self):
        self.connection_string = settings.AZURE_CONNECTION_STRING
        self.webcrawler_queue = settings.WEBCRAWLER_QUEUE
        self.embeddings_queue = settings.EMBEDDINGS_QUEUE
        
    def _get_queue_client(self, queue_name: str) -> QueueClient:
        """Get queue client for specific queue"""
        return QueueClient.from_connection_string(
            self.connection_string,
            queue_name
        )
    
    def receive_message(self, queue_name: str = None) -> Optional[Dict]:
        """Receive message from webcrawler queue"""
        queue_name = queue_name or self.webcrawler_queue
        try:
            queue_client = self._get_queue_client(queue_name)
            messages = queue_client.receive_messages(messages_per_page=1)
            
            for message in messages:
                try:
                    logger.info(f"Raw message content: {message.content}")
                    
                    # Check if message is empty
                    if not message.content or message.content.strip() == "":
                        logger.warning("Empty message received, deleting...")
                        queue_client.delete_message(message)
                        continue
                    
                    data = json.loads(message.content)
                    logger.info(f"Received message: {data.get('job_id')}")
                    return {
                        'data': data,
                        'message': message,
                        'queue_client': queue_client
                    }
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse message: {e}")
                    logger.error(f"Message content was: '{message.content}'")
                    queue_client.delete_message(message)
            
            return None
        except Exception as e:
            logger.error(f"Error receiving message: {e}")
            return None
    
    def delete_message(self, queue_client: QueueClient, message):
        """Delete message from queue"""
        try:
            logger.info(f"Attempting to delete message ID: {message.id}")
            queue_client.delete_message(message)
            logger.info(f"✅ Successfully deleted message from queue")
            return True
        except Exception as e:
            logger.error(f"❌ Error deleting message: {e}")
            logger.error(f"   Message ID: {message.id}")
            logger.error(f"   Pop Receipt: {message.pop_receipt}")
            return False
    
    def send_to_embeddings_queue(self, job_id: str, url: str, blob_folder: str):
        """Send completed job to embeddings queue"""
        try:
            queue_client = self._get_queue_client(self.embeddings_queue)
            
            message_data = {
                "job_id": job_id,
                "url": url,
                "blob_folder": blob_folder,
                "status": "scraped"
            }
            
            queue_client.send_message(json.dumps(message_data))
            logger.info(f"Sent job {job_id} to embeddings queue")
            return True
        except Exception as e:
            logger.error(f"Error sending to embeddings queue: {e}")
            return False
