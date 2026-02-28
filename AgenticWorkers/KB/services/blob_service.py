import json
from typing import Dict
from azure.storage.blob import BlobServiceClient, ContentSettings
from config import Config


class BlobService:
    """Handle Azure Blob Storage operations"""
    
    def __init__(self):
        self.blob_service = BlobServiceClient.from_connection_string(
            Config.AZURE_STORAGE_CONNECTION_STRING
        )
        self.container_name = Config.AZURE_STORAGE_CONTAINER_NAME
        self._ensure_container()
    
    def _ensure_container(self):
        """Ensure container exists"""
        try:
            container_client = self.blob_service.get_container_client(self.container_name)
            container_client.create_container()
        except Exception:
            pass  # Container already exists
    
    def upload_to_blob(self, content: str, blob_path: str, content_type: str = "text/plain") -> str:
        """Upload content to Azure Blob Storage"""
        try:
            container_client = self.blob_service.get_container_client(self.container_name)
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
    
    def upload_knowledge_base(self, knowledge: Dict, kb_id: str) -> str:
        """Upload knowledge_base.json to blob"""
        try:
            blob_path = f"knowledgebase/processed/{kb_id}/knowledge_base.json"
            
            json_content = json.dumps(knowledge, indent=2, ensure_ascii=False)
            
            url = self.upload_to_blob(
                json_content,
                blob_path,
                "application/json"
            )
            
            print(f"   ✓ Uploaded knowledge_base.json to blob")
            return url
            
        except Exception as e:
            print(f"   ❌ Failed to upload knowledge_base.json: {e}")
            return ""
