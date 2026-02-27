import os
import logging
from typing import Optional
from azure.storage.blob import BlobServiceClient, ContentSettings
from config.settings import settings

logger = logging.getLogger(__name__)

class AzureBlobManager:
    def __init__(self):
        self.connection_string = settings.AZURE_CONNECTION_STRING
        self.container_name = settings.BLOB_CONTAINER
        self.blob_service_client = BlobServiceClient.from_connection_string(
            self.connection_string
        )
        self._ensure_container_exists()
    
    def _ensure_container_exists(self):
        """Create container if it doesn't exist"""
        try:
            container_client = self.blob_service_client.get_container_client(
                self.container_name
            )
            if not container_client.exists():
                container_client.create_container()
                logger.info(f"Created container: {self.container_name}")
        except Exception as e:
            logger.error(f"Error ensuring container exists: {e}")
    
    def upload_file(self, file_content: str, blob_path: str) -> bool:
        """Upload file content to blob storage"""
        try:
            blob_client = self.blob_service_client.get_blob_client(
                container=self.container_name,
                blob=blob_path
            )
            
            # Upload with markdown content type
            blob_client.upload_blob(
                file_content,
                overwrite=True,
                content_settings=ContentSettings(content_type='text/markdown')
            )
            
            logger.info(f"Uploaded: {blob_path}")
            return True
        except Exception as e:
            logger.error(f"Error uploading {blob_path}: {e}")
            return False
    
    def get_blob_url(self, blob_path: str) -> str:
        """Get blob URL"""
        return f"https://{settings.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/{self.container_name}/{blob_path}"
    
    def list_blobs(self, prefix: str = None):
        """List blobs with optional prefix"""
        try:
            container_client = self.blob_service_client.get_container_client(
                self.container_name
            )
            return container_client.list_blobs(name_starts_with=prefix)
        except Exception as e:
            logger.error(f"Error listing blobs: {e}")
            return []
