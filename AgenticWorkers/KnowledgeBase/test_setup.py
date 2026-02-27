#!/usr/bin/env python3
"""
Test script to verify KnowledgeBase setup
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_imports():
    """Test if all required packages are installed"""
    print("\n=== Testing Imports ===")
    required_packages = [
        ('fitz', 'PyMuPDF'),
        ('sentence_transformers', 'sentence-transformers'),
        ('pinecone', 'pinecone-client'),
        ('groq', 'groq'),
        ('azure.storage.blob', 'azure-storage-blob'),
        ('tqdm', 'tqdm'),
        ('bs4', 'beautifulsoup4'),
        ('psutil', 'psutil'),
    ]
    
    missing = []
    for module, package in required_packages:
        try:
            __import__(module)
            print(f"✅ {package}")
        except ImportError:
            print(f"❌ {package} - NOT INSTALLED")
            missing.append(package)
    
    if missing:
        print(f"\n⚠️  Missing packages: {', '.join(missing)}")
        print(f"Install with: pip install {' '.join(missing)}")
        return False
    
    print("\n✅ All packages installed!")
    return True


def test_env_vars():
    """Test if required environment variables are set"""
    print("\n=== Testing Environment Variables ===")
    required_vars = [
        'AZURE_STORAGE_CONNECTION_STRING',
        'GROQ_API_KEY',
        'PINECONE_API_KEY',
    ]
    
    missing = []
    for var in required_vars:
        value = os.getenv(var)
        if value:
            # Show first 20 chars for security
            preview = value[:20] + '...' if len(value) > 20 else value
            print(f"✅ {var}: {preview}")
        else:
            print(f"❌ {var}: NOT SET")
            missing.append(var)
    
    if missing:
        print(f"\n⚠️  Missing variables: {', '.join(missing)}")
        print("Set them in .env file")
        return False
    
    print("\n✅ All environment variables set!")
    return True


def test_pinecone_connection():
    """Test Pinecone connection"""
    print("\n=== Testing Pinecone Connection ===")
    try:
        from pinecone import Pinecone
        
        api_key = os.getenv('PINECONE_API_KEY')
        if not api_key:
            print("❌ PINECONE_API_KEY not set")
            return False
        
        pc = Pinecone(api_key=api_key)
        indexes = pc.list_indexes()
        
        print(f"✅ Connected to Pinecone")
        print(f"   Existing indexes: {len(indexes)}")
        for idx in indexes:
            print(f"   - {idx['name']}")
        
        return True
    except Exception as e:
        print(f"❌ Pinecone connection failed: {e}")
        return False


def test_groq_connection():
    """Test Groq API connection"""
    print("\n=== Testing Groq API Connection ===")
    try:
        from groq import Groq
        
        api_key = os.getenv('GROQ_API_KEY')
        if not api_key:
            print("❌ GROQ_API_KEY not set")
            return False
        
        client = Groq(api_key=api_key)
        
        # Test with a simple completion
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": "Say 'test successful'"}],
            max_tokens=10
        )
        
        response = completion.choices[0].message.content
        print(f"✅ Connected to Groq API")
        print(f"   Response: {response}")
        
        return True
    except Exception as e:
        print(f"❌ Groq API connection failed: {e}")
        return False


def test_azure_connection():
    """Test Azure Blob Storage connection"""
    print("\n=== Testing Azure Blob Storage Connection ===")
    try:
        from azure.storage.blob import BlobServiceClient
        
        conn_str = os.getenv('AZURE_STORAGE_CONNECTION_STRING')
        if not conn_str:
            print("❌ AZURE_STORAGE_CONNECTION_STRING not set")
            return False
        
        blob_service = BlobServiceClient.from_connection_string(conn_str)
        
        # List containers
        containers = list(blob_service.list_containers())
        print(f"✅ Connected to Azure Blob Storage")
        print(f"   Containers: {len(containers)}")
        for container in containers[:5]:  # Show first 5
            print(f"   - {container['name']}")
        
        return True
    except Exception as e:
        print(f"❌ Azure connection failed: {e}")
        return False


def test_embedding_model():
    """Test sentence transformer model"""
    print("\n=== Testing Embedding Model ===")
    try:
        from sentence_transformers import SentenceTransformer
        
        print("Loading model (first time may take a while)...")
        model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Test embedding
        text = "This is a test sentence"
        embedding = model.encode(text)
        
        print(f"✅ Model loaded successfully")
        print(f"   Embedding dimension: {len(embedding)}")
        print(f"   Sample values: {embedding[:5]}")
        
        return True
    except Exception as e:
        print(f"❌ Model loading failed: {e}")
        return False


def main():
    """Run all tests"""
    print("="*60)
    print("KnowledgeBase Setup Test")
    print("="*60)
    
    results = {
        'Imports': test_imports(),
        'Environment Variables': test_env_vars(),
        'Pinecone': test_pinecone_connection(),
        'Groq API': test_groq_connection(),
        'Azure Storage': test_azure_connection(),
        'Embedding Model': test_embedding_model(),
    }
    
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60)
    
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name:.<40} {status}")
    
    all_passed = all(results.values())
    
    print("\n" + "="*60)
    if all_passed:
        print("🎉 All tests passed! System is ready to use.")
        print("\nNext steps:")
        print("1. Process a PDF: python pdf_processor_pinecone.py document.pdf DEPT001")
        print("2. Crawl a website: python web_crawler_enhanced.py https://example.com --dept-id DEPT001")
    else:
        print("⚠️  Some tests failed. Please fix the issues above.")
        print("\nCommon fixes:")
        print("1. Install missing packages: pip install -r requirements.txt")
        print("2. Set environment variables in .env file")
        print("3. Check API keys are valid")
    print("="*60)
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
