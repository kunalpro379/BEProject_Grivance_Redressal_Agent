from azure.storage.queue import QueueClient
import json
from typing import Dict, Any, List
from config.settings import Config

class AzureQueueManager:
    """Manages Azure Queue operations for sending URLs to WebCrawler"""
    
    def __init__(self, connection_string: str = None, queue_name: str = None):
        self.connection_string = connection_string or Config.AZURE_STORAGE_CONNECTION_STRING
        self.queue_name = queue_name or Config.WEBCRAWLER_QUEUE_NAME
        self.queue_client = None
        
        if self.connection_string:
            self.initialize()
    
    def initialize(self):
        """Initialize Azure Queue client"""
        try:
            self.queue_client = QueueClient.from_connection_string(
                conn_str=self.connection_string,
                queue_name=self.queue_name
            )
            # Create queue if it doesn't exist
            self.queue_client.create_queue()
            print(f"Connected to Azure Queue: {self.queue_name}")
        except Exception as e:
            if "already exists" in str(e).lower():
                print(f"Queue already exists: {self.queue_name}")
            else:
                print(f"  Queue initialization warning: {e}")
    
    def push_url_to_queue(self, url: str, description: str, metadata: Dict[str, Any] = None) -> bool:
        """
        Push a single URL to the webcrawler queue
        
        Args:
            url: The URL to crawl
            description: Description/title of the URL
            metadata: Additional metadata (optional)
        
        Returns:
            bool: Success status
        """
        if not self.queue_client:
            print("  Queue client not initialized")
            return False
        
        try:
            message = {
                "url": url,
                "description": description,
                "status": "pending",
                "metadata": metadata or {}
            }
            
            # Convert to JSON string
            message_json = json.dumps(message)
            
            # Send to queue
            self.queue_client.send_message(message_json)
            print(f"Pushed to queue: {url[:60]}...")
            return True
            
        except Exception as e:
            print(f"❌ Error pushing to queue: {e}")
            return False
    
    def push_multiple_urls(self, urls: List[Dict[str, Any]]) -> Dict[str, int]:
        """
        Push multiple URLs to the queue
        
        Args:
            urls: List of dicts with 'url', 'description', and optional 'metadata'
        
        Returns:
            Dict with success and failure counts
        """
        results = {"success": 0, "failed": 0}
        
        for item in urls:
            url = item.get('url')
            description = item.get('description', item.get('title', 'No description'))
            metadata = item.get('metadata', {})
            
            if url:
                if self.push_url_to_queue(url, description, metadata):
                    results["success"] += 1
                else:
                    results["failed"] += 1
            else:
                results["failed"] += 1
        
        return results
    
    def push_search_results(self, search_results: Dict[str, List[Dict[str, Any]]], 
                           grievance_id: str = None) -> Dict[str, int]:
        """
        Push all search results from research to the queue
        
        Args:
            search_results: Dict with categories (schemes, budget, development, resources)
            grievance_id: Optional grievance ID for tracking
        
        Returns:
            Dict with success and failure counts
        """
        total_results = {"success": 0, "failed": 0}
        
        for category, results in search_results.items():
            print(f"\n📤 Pushing {category} results to queue...")
            
            for result in results:
                url = result.get('url')
                title = result.get('title', 'No title')
                content = result.get('content', '')
                
                if url:
                    metadata = {
                        'category': category,
                        'grievance_id': grievance_id,
                        'score': result.get('score', 0),
                        'content_preview': content[:200] if content else '',
                        'source': 'research_analyst'
                    }
                    
                    if self.push_url_to_queue(url, title, metadata):
                        total_results["success"] += 1
                    else:
                        total_results["failed"] += 1
        
        print(f"\n Queue Push Summary: {total_results['success']} success, {total_results['failed']} failed")
        return total_results
    
    def get_queue_length(self) -> int:
        """Get approximate number of messages in queue"""
        if not self.queue_client:
            return 0
        
        try:
            properties = self.queue_client.get_queue_properties()
            return properties.approximate_message_count
        except Exception as e:
            print(f"Error getting queue length: {e}")
            return 0
