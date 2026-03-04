"""
Script to upload existing knowledge base documents to the department Pinecone index
This script will:
1. Fetch existing documents from the database
2. Download them from Azure Blob Storage
3. Process them and upload to the 'department' Pinecone index
"""

import os
import sys
import json
import asyncio
from pathlib import Path
from datetime import datetime
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv(Path(__file__).resolve().parent / ".env", override=True)

from services.pdf_processor import PDFProcessor
from services.knowledge_extractor import KnowledgeExtractor
from services.embedding_service import EmbeddingService
from services.pinecone_service import PineconeService
from services.blob_service import BlobService
from config import Config


class DocumentUploader:
    """Upload existing documents to department Pinecone index"""
    
    def __init__(self):
        print("\n🚀 Initializing Document Uploader...")
        
        Config.validate()
        Config.ensure_dirs()
        
        # Initialize services
        self.pdf_processor = PDFProcessor()
        self.knowledge_extractor = KnowledgeExtractor()
        self.embedding_service = EmbeddingService()
        self.pinecone_service = PineconeService()
        self.blob_service = BlobService()
        
        # Database connection
        self.db_conn = psycopg2.connect(Config.DATABASE_URL)
        
        print(f"✓ Document Uploader initialized")
        print(f"   Pinecone Index: {Config.PINECONE_INDEX_NAME}")
    
    def get_documents_from_db(self):
        """Fetch all documents from departmentknowledgebase table"""
        try:
            cursor = self.db_conn.cursor()
            cursor.execute("""
                SELECT id, title, file_name, file_url, department_id, file_type, file_size
                FROM departmentknowledgebase
                WHERE file_type = 'pdf'
                ORDER BY created_at DESC
            """)
            
            columns = [desc[0] for desc in cursor.description]
            documents = []
            
            for row in cursor.fetchall():
                doc = dict(zip(columns, row))
                documents.append(doc)
            
            cursor.close()
            return documents
            
        except Exception as e:
            print(f"❌ Error fetching documents: {e}")
            return []
    
    def process_document(self, doc):
        """Process a single document and upload to Pinecone"""
        try:
            kb_id = doc['id']
            file_url = doc['file_url']
            file_name = doc['file_name']
            department_id = doc['department_id']
            
            print(f"\n📄 Processing: {file_name}")
            print(f"   ID: {kb_id}")
            print(f"   Department: {department_id}")
            print(f"   URL: {file_url}")
            
            # Step 1: Extract text from PDF
            print("\n   Step 1: Extracting text from PDF...")
            pdf_result = self.pdf_processor.process_pdf_url(file_url)
            
            if not pdf_result.get('success'):
                print(f"   ❌ Failed to process PDF: {pdf_result.get('error')}")
                return False
            
            pages = pdf_result.get('pages', [])
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
                    'kb_id': str(kb_id),
                    'department_id': str(department_id),
                    'source_type': 'pdf',
                    'source_url': file_url,
                    'file_name': file_name
                }
            )
            self.pinecone_service.upsert_vectors(vectors)
            print(f"   ✓ Stored {len(vectors)} vectors in Pinecone")
            
            # Step 5: Extract structured knowledge
            print("\n   Step 5: Extracting structured knowledge...")
            knowledge_base = self.knowledge_extractor.build_knowledge_base(chunks)
            
            # Add metadata
            knowledge_base['_metadata'] = {
                'kb_id': str(kb_id),
                'source_type': 'pdf',
                'source_url': file_url,
                'file_name': file_name,
                'department_id': str(department_id),
                'num_pages': num_pages,
                'num_chunks': len(chunks),
                'extracted_at': datetime.utcnow().isoformat() + 'Z'
            }
            
            # Step 6: Save knowledge_base.json locally
            print("\n   Step 6: Saving knowledge_base.json locally...")
            output_file = Config.OUTPUT_DIR / f"knowledge_base_{kb_id}.json"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(knowledge_base, f, indent=2, ensure_ascii=False)
            print(f"   ✓ Saved to: {output_file}")
            
            # Step 7: Upload knowledge_base.json to blob
            print("\n   Step 7: Uploading knowledge_base.json to blob...")
            kb_url = self.blob_service.upload_knowledge_base(knowledge_base, kb_id)
            print(f"   ✓ Uploaded to: {kb_url}")
            
            # Step 8: Update database with knowledge base URL
            print("\n   Step 8: Updating database...")
            cursor = self.db_conn.cursor()
            cursor.execute("""
                UPDATE departmentknowledgebase
                SET description = %s
                WHERE id = %s
            """, (f"Processed and uploaded to department index. KB URL: {kb_url}", kb_id))
            self.db_conn.commit()
            cursor.close()
            print(f"   ✓ Database updated")
            
            print(f"\n    Document processing complete!")
            return True
            
        except Exception as e:
            import traceback
            print(f"\n   ❌ Error processing document: {e}")
            print(f"   Traceback:\n{traceback.format_exc()}")
            return False
    
    def run(self):
        """Main upload process"""
        try:
            print("\n" + "=" * 80)
            print("📚 UPLOADING EXISTING DOCUMENTS TO DEPARTMENT INDEX")
            print("=" * 80)
            
            # Fetch documents
            print("\n📋 Fetching documents from database...")
            documents = self.get_documents_from_db()
            
            if not documents:
                print("   ⚠️  No documents found in database")
                return
            
            print(f"   ✓ Found {len(documents)} documents")
            
            # Process each document
            success_count = 0
            failed_count = 0
            
            for i, doc in enumerate(documents, 1):
                print(f"\n{'=' * 80}")
                print(f"Processing document {i}/{len(documents)}")
                print(f"{'=' * 80}")
                
                if self.process_document(doc):
                    success_count += 1
                else:
                    failed_count += 1
            
            # Summary
            print("\n" + "=" * 80)
            print("📊 UPLOAD SUMMARY")
            print("=" * 80)
            print(f"   Total documents: {len(documents)}")
            print(f"    Successfully processed: {success_count}")
            print(f"   ❌ Failed: {failed_count}")
            print("=" * 80 + "\n")
            
        except Exception as e:
            import traceback
            print(f"\n❌ Error in upload process: {e}")
            print(f"Traceback:\n{traceback.format_exc()}")
        
        finally:
            # Cleanup
            self.pdf_processor.cleanup()
            self.db_conn.close()
            print("\n👋 Upload process complete")


if __name__ == "__main__":
    uploader = DocumentUploader()
    uploader.run()
