"""
Test script to verify connections to Supabase, OpenAI, and Pinecone
"""
import sys
from database import DatabaseService
from analyzer import GrievanceAnalyzer
from vector_store import VectorStoreService
import config

def test_supabase():
    """Test Supabase connection"""
    print("Testing Supabase connection...")
    try:
        db = DatabaseService()
        departments = db.get_all_departments()
        print(f"✓ Supabase connected successfully")
        print(f"  Found {len(departments)} departments")
        if departments:
            print(f"  Sample department: {departments[0].get('name')}")
        return True
    except Exception as e:
        print(f"✗ Supabase connection failed: {e}")
        return False

def test_deepseek():
    """Test DeepSeek connection"""
    print("\nTesting DeepSeek connection...")
    try:
        analyzer = GrievanceAnalyzer()
        result = analyzer._analyze_sentiment("This is a test feedback. The service was excellent!")
        print(f"✓ DeepSeek connected successfully")
        print(f"  Sentiment analysis result: {result.get('sentiment')}")
        return True
    except Exception as e:
        print(f"✗ DeepSeek connection failed: {e}")
        return False

def test_pinecone():
    """Test Pinecone connection (optional)"""
    print("\nTesting Pinecone connection...")
    try:
        vs = VectorStoreService()
        if not vs.enabled:
            print(f"⚠ Pinecone disabled (optional)")
            return True
        
        # Test embedding generation
        embedding = vs.generate_embedding("Test text for embedding")
        print(f"✓ Pinecone connected successfully")
        print(f"  Generated embedding dimension: {len(embedding)}")
        
        # Test index
        stats = vs.index.describe_index_stats()
        print(f"  Index stats: {stats.total_vector_count} vectors")
        return True
    except Exception as e:
        print(f"⚠ Pinecone connection failed (optional): {e}")
        return True  # Don't fail if Pinecone is not configured

def test_configuration():
    """Test configuration"""
    print("\nTesting configuration...")
    issues = []
    
    if not config.DATABASE_URL:
        issues.append("DATABASE_URL not configured")
    
    if not config.DEEPSEEK_API_KEY or config.DEEPSEEK_API_KEY == "your_deepseek_api_key":
        issues.append("DEEPSEEK_API_KEY not configured")
    
    if issues:
        print("✗ Configuration issues found:")
        for issue in issues:
            print(f"  - {issue}")
        return False
    else:
        print("✓ Configuration looks good")
        print(f"  Report output directory: {config.REPORT_OUTPUT_DIR}")
        print(f"  Report interval: {config.REPORT_GENERATION_INTERVAL_HOURS} hour(s)")
        print(f"  Image analysis: {'enabled' if config.ENABLE_IMAGE_ANALYSIS else 'disabled'}")
        print(f"  Feedback sentiment: {'enabled' if config.ENABLE_FEEDBACK_SENTIMENT else 'disabled'}")
        print(f"  Pinecone: {'configured' if config.PINECONE_API_KEY and config.PINECONE_API_KEY != 'your_pinecone_api_key' else 'disabled (optional)'}")
        return True

def main():
    """Run all tests"""
    print("="*60)
    print("Progress Tracking Agent - Connection Test")
    print("="*60)
    
    results = {
        "Configuration": test_configuration(),
        "Supabase": test_supabase(),
        "DeepSeek": test_deepseek(),
        "Pinecone": test_pinecone()
    }
    
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60)
    
    for service, passed in results.items():
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{service:20s}: {status}")
    
    all_passed = all(results.values())
    
    if all_passed:
        print("\n✓ All tests passed! You're ready to run the worker.")
        print("\nRun: python worker.py")
        sys.exit(0)
    else:
        print("\n✗ Some tests failed. Please fix the issues above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
