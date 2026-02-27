import asyncio
import logging
import time
from typing import Dict
from azure_clients.queue_client import AzureQueueManager
from azure_clients.blob_client import AzureBlobManager
from crawler.web_crawler import WebCrawler
from crawler.content_processor import ContentProcessor
from config.settings import settings

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Reduce Azure SDK logging noise
logging.getLogger("azure").setLevel(logging.WARNING)
logging.getLogger("azure.core.pipeline.policies.http_logging_policy").setLevel(logging.WARNING)

logger = logging.getLogger(__name__)

class CrawlerWorker:
    def __init__(self):
        self.queue_manager = AzureQueueManager()
        self.blob_manager = AzureBlobManager()
        self.crawler = WebCrawler()
        self.processor = ContentProcessor()
    
    async def process_job(self, job_data: Dict):
        """Process a single crawl job"""
        # Generate job_id if not present
        job_id = job_data.get('job_id') or job_data.get('metadata', {}).get('grievance_id') or 'unknown'
        url = job_data.get('url')
        
        logger.info(f"Processing job {job_id}: {url}")
        
        # Get domain for folder structure
        domain = self.processor.get_domain_name(url)
        logger.info(f"📁 Domain folder: {domain}")
        
        # Check if URL is a PDF
        if self.processor.is_pdf_url(url):
            logger.info(f"📄 Detected PDF URL: {url}")
            return await self.process_pdf_job(job_id, url, domain)
        
        # Counter for uploaded pages
        uploaded_count = 0
        
        # Define callback for real-time upload
        async def upload_page(page_url: str, result):
            """Upload page to blob storage as soon as it's crawled"""
            nonlocal uploaded_count
            try:
                # Extract content
                extracted = self.processor.extract_content(result)
                
                # Format as text file
                text_content = self.processor.format_markdown_file(
                    extracted['title'],
                    extracted['content']
                )
                
                # Generate blob path
                blob_path = self.processor.generate_blob_path(page_url, domain)
                
                # Upload to blob
                if self.blob_manager.upload_file(text_content, blob_path):
                    uploaded_count += 1
                    logger.info(f"📤 Uploaded ({uploaded_count}): {blob_path}")
                
            except Exception as e:
                logger.error(f"Error uploading page {page_url}: {e}")
        
        try:
            # Crawl the website with real-time upload callback
            logger.info(f"Starting crawl for {url}")
            
            try:
                # Add timeout to prevent hanging
                results = await asyncio.wait_for(
                    self.crawler.crawl_website(url, on_page_crawled=upload_page),
                    timeout=300  # 5 minutes timeout
                )
                logger.info(f"✅ Crawler finished, got {len(results)} results")
            except asyncio.TimeoutError:
                logger.error(f"❌ Crawler timeout after 5 minutes for {url}")
                # Even if timeout, we may have uploaded some pages
                if uploaded_count > 0:
                    logger.info(f"  Partial success: {uploaded_count} pages uploaded before timeout")
                return False
            except Exception as crawl_error:
                logger.error(f"❌ Crawler exception: {crawl_error}")
                import traceback
                traceback.print_exc()
                return False
            
            # Log what we got back
            logger.info(f"DEBUG: Checking results...")
            
            if results is None:
                logger.warning(f"  Crawler returned None for job {job_id}")
                return False
                
            logger.info(f"DEBUG: Results type: {type(results)}, length: {len(results)}")
            
            if not results or len(results) == 0:
                logger.warning(f"  No results for job {job_id}")
                return False
            
            logger.info(f"✅ Upload complete: {uploaded_count}/{len(results)} pages uploaded to blob storage")
            
            # Send to embeddings queue (once after all uploads)
            blob_folder = domain
            logger.info(f"📤 Sending to embeddings queue: {blob_folder}")
            self.queue_manager.send_to_embeddings_queue(job_id, url, blob_folder)
            logger.info(f"✅ Sent to embeddings queue")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error processing job {job_id}: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    async def process_pdf_job(self, job_id: str, url: str, domain: str):
        """Process a PDF file job"""
        try:
            logger.info(f"📄 Processing PDF: {url}")
            
            # Extract PDF content
            pdf_content = self.processor.extract_pdf_content(url)
            
            if not pdf_content:
                logger.error(f"❌ Failed to extract PDF content from {url}")
                return False
            
            # Format as text file
            text_content = self.processor.format_markdown_file(
                pdf_content['title'],
                pdf_content['content']
            )
            
            # Generate blob path
            blob_path = self.processor.generate_blob_path(url, domain)
            
            # Upload to blob
            if self.blob_manager.upload_file(text_content, blob_path):
                logger.info(f"✅ Uploaded PDF: {blob_path}")
                logger.info(f"   Size: {len(text_content)} characters")
                
                # Send to embeddings queue
                logger.info(f"📤 Sending to embeddings queue: {domain}")
                self.queue_manager.send_to_embeddings_queue(job_id, url, domain)
                logger.info(f"✅ Sent to embeddings queue")
                
                return True
            else:
                logger.error(f"❌ Failed to upload PDF to blob storage")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error processing PDF job {job_id}: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    async def run(self):
        """Main worker loop"""
        logger.info("🚀 Crawler Worker started")
        logger.info(f"Listening to queue: {settings.WEBCRAWLER_QUEUE}")
        logger.info(f"Blob container: {settings.BLOB_CONTAINER}")
        
        processed_count = 0
        
        while True:
            try:
                # Receive message from queue
                message_data = self.queue_manager.receive_message()
                
                if message_data:
                    job_data = message_data['data']
                    message = message_data['message']
                    queue_client = message_data['queue_client']
                    
                    job_id = job_data.get('job_id') or job_data.get('metadata', {}).get('grievance_id') or 'unknown'
                    url = job_data.get('url', 'no-url')
                    
                    logger.info(f"\n{'='*70}")
                    logger.info(f"📨 Processing Message #{processed_count + 1}")
                    logger.info(f"   Job ID: {job_id}")
                    logger.info(f"   URL: {url}")
                    logger.info(f"   Message ID: {message.id}")
                    logger.info(f"{'='*70}")
                    
                    # Process the job
                    success = await self.process_job(job_data)
                    
                    # Always delete message after processing attempt
                    logger.info(f"\n🗑️  Deleting message from queue...")
                    logger.info(f"   Message ID: {message.id}")
                    logger.info(f"   Pop Receipt: {message.pop_receipt}")
                    
                    try:
                        self.queue_manager.delete_message(queue_client, message)
                        logger.info(f"✅ Message deleted successfully")
                        processed_count += 1
                    except Exception as delete_error:
                        logger.error(f"❌ Failed to delete message: {delete_error}")
                        logger.error(f"   This message may reappear in queue")
                    
                    if success:
                        logger.info(f"✅ Job {job_id} completed and dequeued")
                    else:
                        logger.warning(f"⚠️  Job {job_id} failed but dequeued to prevent retry")
                    
                    logger.info(f"\n📊 Total processed: {processed_count}")
                    logger.info(f"{'='*70}\n")
                    
                else:
                    # No messages, wait before polling again
                    if processed_count == 0:
                        logger.info("⏳ No messages in queue, waiting...")
                    await asyncio.sleep(5)
                    
            except KeyboardInterrupt:
                logger.info(f"\n👋 Worker stopped by user")
                logger.info(f"📊 Total messages processed: {processed_count}")
                break
            except Exception as e:
                logger.error(f"❌ Worker error: {e}")
                import traceback
                traceback.print_exc()
                await asyncio.sleep(10)

async def main():
    """Entry point"""
    try:
        settings.validate()
        worker = CrawlerWorker()
        await worker.run()
    except Exception as e:
        logger.error(f"Failed to start worker: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main())
