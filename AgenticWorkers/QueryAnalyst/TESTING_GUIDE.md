# QueryAnalyst Testing Guide

## Prerequisites

1. **Environment Setup**
   ```bash
   cd AgenticWorkers/QueryAnalyst
   pip install -r requirements.txt
   ```

2. **Environment Variables**
   - Copy `.env.example` to `.env`
   - Fill in all required API keys:
     - `GROQ_API_KEY` - For LLM processing
     - `GEMINI_API_KEY` - For image analysis
     - `TAVILY_API_KEY` - For real-time search
     - `SUPABASE_DB_PASSWORD` - For database access

3. **Database Setup**
   - Ensure Supabase database has `departments` table with embeddings
   - Run embedding generation if needed:
     ```bash
     python generate_department_embeddings.py
     ```

## Test 1: Generate Department Embeddings

This step is required before testing department allocation.

```bash
# Generate embeddings for all departments
python generate_department_embeddings.py

# Generate and test search
python generate_department_embeddings.py --test
```

**Expected Output:**
```
🚀 Starting department embedding generation...
   Loading embedding model (all-MiniLM-L6-v2)...
   ✓ Model loaded
   Connecting to Supabase...
   ✓ Connected
   Found X departments
   ✓ Updated: Department Name...
   
✅ Successfully updated X departments

🧪 Testing department search...
   Query: Garbage pile near my house in Bangalore causing health issues
   
   ✓ Found department:
      Name: Sanitation Department
      Description: Handles waste management...
      Address: Bangalore Municipal Corporation
      Match Score: 0.8542
```

## Test 2: Complete Workflow Test

Test the entire grievance analysis pipeline:

```python
# test_complete_workflow.py
from main import analysis

# Test with image
result = analysis(
    query="There is a huge garbage pile near my apartment. It has been there for 2 weeks and is causing health issues.",
    image_path="garbage.jpeg",
    citizen_id="test-citizen-uuid",
    grievance_id="test-grievance-uuid"
)

print("\n=== VALIDATION ===")
print(f"Is Valid: {result['validation_result']['is_valid']}")
print(f"Score: {result['validation_result']['validation_score']}")

print("\n=== LOCATION ===")
print(f"Address: {result['location_data']['address']}")
print(f"Confidence: {result['location_data']['confidence']}")

print("\n=== ENHANCED QUERY ===")
print(result['enhanced_query_described'][:200] + "...")

print("\n=== CATEGORY ===")
category = result['agents_outputs']['category']
print(f"Main: {category['main_category']}")
print(f"Sub: {category['sub_category']}")

print("\n=== DEPARTMENT ALLOCATION ===")
if result['allocated_department']:
    dept = result['allocated_department']
    print(f"Name: {dept['name']}")
    print(f"ID: {dept['id']}")
    print(f"Match Score: {dept['match_score']:.4f}")
    print(f"Contact: {dept['contact_information']}")
else:
    print("No department allocated")

print("\n=== REAL-TIME DATA ===")
tavily = result['tavily_search_results']
print(f"Queries searched: {len(tavily)}")
for query, data in list(tavily.items())[:2]:
    print(f"\nQuery: {query}")
    print(f"Results: {len(data.get('results', []))}")
    if data.get('results'):
        print(f"Top result: {data['results'][0]['title']}")

print("\n=== OUTPUT FILES ===")
print(f"PDF: {result['pdf_path']}")
print(f"Markdown: {result['markdown_path']}")
print(f"JSON: outputs/grievance_analysis_final.json")
```

**Run:**
```bash
python test_complete_workflow.py
```

## Test 3: Worker Queue Processing

Test the Azure Queue worker:

```bash
# Start the worker
python worker.py
```

**Test by sending a message to the queue:**

```python
# test_queue_message.py
import os
import json
import base64
from azure.storage.queue import QueueClient
from dotenv import load_dotenv

load_dotenv()

connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
queue_name = os.getenv("AZURE_QUEUE_NAME", "queryanalyst")

queue_client = QueueClient.from_connection_string(connection_string, queue_name)

# Test message
message = {
    "grievance_id": "test-123",
    "citizen_id": "citizen-456",
    "grievance_text": "Garbage issue in my area",
    "image_path": "https://your-blob-url/image.jpg",
    "current_status": "QueryAnalyst"
}

# Encode message
encoded = base64.b64encode(json.dumps(message).encode()).decode()

# Send to queue
queue_client.send_message(encoded)
print("✅ Message sent to queue")
```

**Expected Worker Output:**
```
🚀 QueryAnalyst Worker started. Waiting for messages...

📨 Received message:
   Fields: ['grievance_id', 'citizen_id', 'grievance_text', 'image_path', 'current_status']
   
📋 Processing grievance: test-123
   Citizen ID: citizen-456
   Query: Garbage issue in my area
   Image URL: https://your-blob-url/image.jpg
   
    Validating image-query match...
   ✓ Validation: True (score: 0.85)
   
   📍 Extracting location from image...
   ✓ Location: Bangalore, Karnataka (confidence: high)
   
   📝 Creating LLM-described query...
      ✓ Created described query (450 chars)
   
   🌐 Searching real-time data with Tavily...
      ✓ Found 12 real-time results across 4 queries
   
   🏢 Allocating department from Supabase...
      ✓ Allocated to: Sanitation Department
   
   Analysis complete!
      - Validation score: 0.85
      - Location: Bangalore, Karnataka
      - Search queries: 4 found
   
   📁 Files uploaded to blob: ['pdf_url', 'md_url', 'json_url', 'agents_json_url']
   
   AI data saved to Supabase. Pushed to webcrawler queue with status: WebCrawling
   📱 Server will notify Telegram directly
```

## Test 4: Department Allocation Only

Test just the department allocation:

```python
# test_department_allocation.py
from tools.embeddings import EmbeddingEngine
from tools.department_allocator import DepartmentAllocator

embedding_engine = EmbeddingEngine()
allocator = DepartmentAllocator()

# Test query
query = "Road pothole near my house in Mumbai causing accidents"

# Generate embedding
embedding = embedding_engine.embed_query(query)

# Allocate department
result = allocator.allocate_department(
    location="Mumbai",
    recommended_department="Public Works Department",
    address="Andheri West, Mumbai",
    query_embedding=embedding,
    category="Roads"
)

if result:
    print("✅ Department Allocated:")
    print(f"   ID: {result['id']}")
    print(f"   Name: {result['name']}")
    print(f"   Description: {result['description']}")
    print(f"   Address: {result['address']}")
    print(f"   Contact: {result['contact_information']}")
    print(f"   Jurisdiction: {result['jurisdiction']}")
    print(f"   Match Score: {result['match_score']:.4f}")
else:
    print("❌ No department found")
```

## Test 5: Tavily Search Only

Test real-time search:

```python
# test_tavily_search.py
from tools.tavily_search import TavilySearchEngine

engine = TavilySearchEngine()

queries = [
    "Sanitation government schemes India 2024",
    "Garbage management policies Mumbai",
    "Waste disposal budget allocation Maharashtra"
]

results = engine.search_realtime_data(queries, max_results_per_query=3)

for query, data in results.items():
    print(f"\n{'='*60}")
    print(f"Query: {query}")
    print(f"Results: {len(data.get('results', []))}")
    
    for i, result in enumerate(data.get('results', [])[:2], 1):
        print(f"\n{i}. {result['title']}")
        print(f"   URL: {result['url']}")
        print(f"   Score: {result['score']:.4f}")
        print(f"   Content: {result['content'][:150]}...")
```

## Test 6: JSON Output Validation

Verify the JSON output structure:

```python
# test_json_output.py
import json

# Load the final JSON
with open("outputs/grievance_analysis_final.json", "r") as f:
    data = json.load(f)

# Check structure
print("✅ Checking JSON structure...")

# 1. Check grievance section
assert "grievance" in data
assert "text" in data["grievance"]
assert "enhanced_query_described" in data["grievance"]
assert "image" in data["grievance"]
assert "location" in data["grievance"]
assert "category" in data["grievance"]
print("   ✓ Grievance section OK")

# 2. Check analysis section
assert "analysis" in data
assert "query_type" in data["analysis"]
assert "emotion" in data["analysis"]
assert "severity" in data["analysis"]
assert "priority" in data["analysis"]
print("   ✓ Analysis section OK")

# 3. Check department section
assert "department" in data
assert "recommended_department" in data["department"]
assert "allocated_department" in data["department"]
if data["department"]["allocated_department"]:
    assert "id" in data["department"]["allocated_department"]
    assert "name" in data["department"]["allocated_department"]
    assert "match_score" in data["department"]["allocated_department"]
assert "contact_information" in data["department"]
assert "jurisdiction" in data["department"]
print("   ✓ Department section OK")

# 4. Check real-time data section
assert "real_time_data" in data
assert "search_results" in data["real_time_data"]
assert "policy_queries" in data["real_time_data"]
print("   ✓ Real-time data section OK")

# 5. Verify no 'reasoning' or 'output' fields
def check_no_forbidden_fields(obj, path=""):
    if isinstance(obj, dict):
        for key, value in obj.items():
            assert key not in ["reasoning", "output", "_raw", "_error"], \
                f"Found forbidden field '{key}' at {path}.{key}"
            check_no_forbidden_fields(value, f"{path}.{key}")
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            check_no_forbidden_fields(item, f"{path}[{i}]")

check_no_forbidden_fields(data)
print("   ✓ No forbidden fields found")

print("\n✅ All JSON structure checks passed!")
```

## Common Issues and Solutions

### Issue 1: Department Not Found
**Symptom:** `allocated_department` is `null`

**Solutions:**
1. Run `python generate_department_embeddings.py` to generate embeddings
2. Check if departments exist in Supabase:
   ```sql
   SELECT COUNT(*) FROM departments;
   ```
3. Verify department data has name, description, address fields populated

### Issue 2: Tavily Search Fails
**Symptom:** Empty `tavily_search_results`

**Solutions:**
1. Verify `TAVILY_API_KEY` is set correctly
2. Check API quota/rate limits
3. Test with simpler queries first

### Issue 3: Image Validation Fails
**Symptom:** `is_validated: false`

**Solutions:**
1. Check if image URL is accessible
2. Verify `GEMINI_API_KEY` is valid
3. Ensure image matches the complaint description

### Issue 4: Supabase Connection Error
**Symptom:** `Error allocating department: connection refused`

**Solutions:**
1. Verify `SUPABASE_DB_PASSWORD` is correct
2. Check Supabase database is running
3. Ensure pgvector extension is installed:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

## Performance Benchmarks

Expected processing times:
- Image validation: 2-3 seconds
- Location extraction: 1-2 seconds
- Image analysis: 2-3 seconds
- Enhanced query creation: 1-2 seconds
- Agent analysis: 5-8 seconds
- Tavily search: 3-5 seconds
- Department allocation: 0.5-1 second
- Report generation: 2-3 seconds

**Total: ~20-30 seconds per grievance**

## Monitoring

Check logs for:
- ✓ marks indicate successful steps
- ⚠️ marks indicate warnings (non-critical)
- ❌ marks indicate errors (critical)

All steps should complete with ✓ for successful processing.
