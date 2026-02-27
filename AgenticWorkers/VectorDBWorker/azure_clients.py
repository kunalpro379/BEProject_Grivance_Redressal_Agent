import logging
from typing import Optional, Dict, Any, List
from azure.storage.queue import QueueClient, QueueMessage
from azure.storage.blob import BlobServiceClient
from config import Config

logger = logging.getLogger(__name__)

class AzureQueueClient:
    def __init__(self):
        self.queue_client = QueueClient.from_connection_string(
            conn_str=Config.AZURE_STORAGE_CONNECTION_STRING,
            queue_name=Config.EMBEDDINGS_QUEUE_NAME
        )
    
    def receive_message(self) -> Optional[QueueMessage]:
        """Receive one message from embeddings queue"""
        try:
            messages = self.queue_client.receive_messages(
                messages_per_page=1,
                visibility_timeout=Config.VISIBILITY_TIMEOUT
            )
            for message in messages:
                return message
            return None
        except Exception as e:
            logger.error(f"Error receiving message: {e}")
            return None
    
    def delete_message(self, message: QueueMessage) -> bool:
        """Delete message from queue after processing"""
        try:
            self.queue_client.delete_message(message.id, message.pop_receipt)
            logger.info(f"✓ Deleted message {message.id} from queue")
            return True
        except Exception as e:
            logger.error(f"Error deleting message {message.id}: {e}")
            return False


class AzureBlobClient:
    def __init__(self):
        self.blob_service_client = BlobServiceClient.from_connection_string(
            Config.AZURE_STORAGE_CONNECTION_STRING
        )
        self.container_client = self.blob_service_client.get_container_client(
            Config.AZURE_STORAGE_CONTAINER_NAME
        )
    
    def list_files_in_folder(self, blob_folder: str) -> List[str]:
        """List all .txt and .md files in crawled-content/{blob_folder}/ or {blob_folder}/ (backward compatibility)"""
        files = []
        
        # Try new path first (with crawled-content prefix)
        prefix_new = f"crawled-content/{blob_folder}/"
        try:
            blob_list = self.container_client.list_blobs(name_starts_with=prefix_new)
            for blob in blob_list:
                if blob.name.endswith(('.txt', '.md')):
                    files.append(blob.name)
            
            if files:
                logger.info(f"Found {len(files)} files in {prefix_new}")
                return files
        except Exception as e:
            logger.error(f"Error listing files in {prefix_new}: {e}")
        
        # Try old path (without crawled-content prefix) for backward compatibility
        prefix_old = f"{blob_folder}/"
        try:
            blob_list = self.container_client.list_blobs(name_starts_with=prefix_old)
            for blob in blob_list:
                if blob.name.endswith(('.txt', '.md')):
                    files.append(blob.name)
            
            if files:
                logger.info(f"Found {len(files)} files in {prefix_old} (old path)")
                return files
        except Exception as e:
            logger.error(f"Error listing files in {prefix_old}: {e}")
        
        logger.warning(f"No files found in either {prefix_new} or {prefix_old}")
        return []
    
    def download_blob_content(self, blob_name: str) -> Optional[str]:
        """Download text content from blob"""
        try:
            blob_client = self.container_client.get_blob_client(blob_name)
            content = blob_client.download_blob().readall().decode('utf-8')
            logger.info(f"Downloaded {blob_name} ({len(content)} chars)")
            return content
        except Exception as e:
            logger.error(f"Error downloading {blob_name}: {e}")
            return None
