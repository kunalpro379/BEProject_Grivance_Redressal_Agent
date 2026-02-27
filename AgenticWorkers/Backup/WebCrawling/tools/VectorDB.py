import os
import json
import chromadb
from sentence_transformers import SentenceTransformer
from utils.config import EMBEDDING_MODEL, CRAWLED_RESULTS_FILE, EXTRACTED_PDF_TEXT_FILE

class VectorDBTool:
    def __init__(self):
        self.model = SentenceTransformer(EMBEDDING_MODEL)
        self.chroma_client = chromadb.Client()
        self.collection = None
    
    def setup_collection(self, collection_name="documents"):
        """Initialize ChromaDB collection"""
        try:
            self.collection = self.chroma_client.create_collection(name=collection_name)
        except:
            self.collection = self.chroma_client.get_collection(name=collection_name)
        return self.collection
    
    def add_documents(self, documents, metadatas):
        """Add documents to vector database"""
        if not documents:
            print("✗ No documents to add to vector DB")
            return
        
        embeddings = self.model.encode(documents).tolist()
        ids = [f"doc_{i}" for i in range(len(documents))]
        
        self.collection.add(
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
        
        print(f"✓ Added {len(documents)} documents to vector database")
    
    def process_all_data(self):
        """Process all crawled and PDF data for vector DB"""
        if not self.collection:
            self.setup_collection()
        
        all_documents = []
        all_metadatas = []
        
        # Process crawled data
        if os.path.exists(CRAWLED_RESULTS_FILE):
            with open(CRAWLED_RESULTS_FILE, 'r', encoding='utf-8') as f:
                crawled_data = json.load(f)
            
            for item in crawled_data:
                if item.get('success') and item.get('markdown_content'):
                    all_documents.append(item['markdown_content'])
                    all_metadatas.append({
                        "source": "web_crawl",
                        "title": item.get('title', ''),
                        "url": item.get('url', '')
                    })
        
        # Process PDF data
        if os.path.exists(EXTRACTED_PDF_TEXT_FILE):
            with open(EXTRACTED_PDF_TEXT_FILE, 'r', encoding='utf-8') as f:
                pdf_data = json.load(f)
            
            for item in pdf_data:
                all_documents.append(item['text'])
                all_metadatas.append({
                    "source": "pdf",
                    "filename": item['filename'],
                    "chunk_id": item['chunk_id']
                })
        
        if all_documents:
            self.add_documents(all_documents, all_metadatas)
            print(f"✓ Total documents in vector DB: {len(all_documents)}")
        
        return self.collection