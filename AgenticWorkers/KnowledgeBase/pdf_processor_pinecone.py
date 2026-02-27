import os
import json
import uuid
import time
import fitz  # PyMuPDF
from tqdm import tqdm
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone, ServerlessSpec
from groq import Groq
from azure.storage.blob import BlobServiceClient
from config import Config

load_dotenv()

# Configuration
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "grievance-knowledge-base")
EMBED_MODEL = "all-MiniLM-L6-v2"

# Initialize clients
pc = Pinecone(api_key=PINECONE_API_KEY)
client = Groq(api_key=GROQ_API_KEY)
model = SentenceTransformer(EMBED_MODEL)


def extract_pdf_text(path):
    """Extract text from PDF file"""
    doc = fitz.open(path)
    pages = []
    for page_num, page in enumerate(doc):
        text = page.get_text()
        if text.strip():
            pages.append({
                "page": page_num,
                "text": text
            })
    doc.close()
    return pages


def chunk_text(pages, chunk_size=1000, overlap=200):
    """Chunk text with overlap"""
    chunks = []
    for page in pages:
        text = page["text"]
        start = 0
        while start < len(text):
            chunk = text[start:start+chunk_size]
            chunks.append({
                "id": str(uuid.uuid4()),
                "text": chunk,
                "page": page["page"]
            })
            start += chunk_size - overlap
    return chunks


def create_embeddings(chunks):
    """Create embeddings for chunks"""
    for chunk in tqdm(chunks, desc="Embedding"):
        embedding = model.encode(chunk["text"]).tolist()
        chunk["embedding"] = embedding
    return chunks


def store_in_pinecone(chunks, department_id=None):
    """Store embeddings in Pinecone"""
    existing_indexes = [i["name"] for i in pc.list_indexes()]
    if INDEX_NAME not in existing_indexes:
        pc.create_index(
            name=INDEX_NAME,
            dimension=384,
            metric="cosine",
            spec=ServerlessSpec(
                cloud="aws",
                region="us-east-1"
            )
        )
        print("Created Pinecone index")
    
    index = pc.Index(INDEX_NAME)
    vectors = []
    for chunk in chunks:
        metadata = {
            "text": chunk["text"],
            "page": chunk["page"]
        }
        if department_id:
            metadata["department_id"] = department_id
        
        vectors.append({
            "id": chunk["id"],
            "values": chunk["embedding"],
            "metadata": metadata
        })
    
    # Upsert in batches of 100
    batch_size = 100
    for i in range(0, len(vectors), batch_size):
        batch = vectors[i:i+batch_size]
        index.upsert(vectors=batch)
    
    print(f"Stored {len(vectors)} vectors in Pinecone")


def extract_chunk_universal(text):
    """Extract structured knowledge from text using LLM"""
    prompt = f"""Convert the given text into CLEAN, MEANINGFUL, DASHBOARD-READY JSON.

CRITICAL RULES:
1. Use only meaningful keys like:
   - department
   - projects
   - officials
   - services
   - schemes
   - locations
   - contacts
   - programs

2. REMOVE useless data like:
   - random numbers
   - serial numbers
   - IDs without meaning
   - duplicate entries
   - empty fields

3. DO NOT create keys like:
   numbers, codes, ids, indexes, sr_no

4. Always group into logical categories:
   projects → all missions, schemes
   officials → officers, engineers
   services → public services
   department → department info

5. Make dashboard-friendly structure.
6. Return ONLY valid JSON.

TEXT:
{text}
"""
    
    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            temperature=0,
            messages=[
                {
                    "role": "system",
                    "content": "You convert unstructured text into structured JSON knowledge."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )
        
        result = completion.choices[0].message.content.strip()
        if not result:
            return None
        
        # Extract JSON from markdown code blocks
        if "```" in result:
            parts = result.split("```")
            for part in parts:
                if "{" in part:
                    result = part
                    break
        
        # Find JSON boundaries
        start = result.find("{")
        end = result.rfind("}") + 1
        result = result[start:end]
        
        return json.loads(result)
    except Exception as e:
        print(f"Extraction error: {e}")
        return None


def merge_json(master, new):
    """Merge new JSON into master"""
    if not new:
        return master
    
    for key, value in new.items():
        if key not in master:
            master[key] = value
        else:
            # CASE 1: both dict → merge dict
            if isinstance(master[key], dict) and isinstance(value, dict):
                master[key].update(value)
            # CASE 2: both list → extend list
            elif isinstance(master[key], list) and isinstance(value, list):
                master[key].extend(value)
            # CASE 3: master list, new single → append
            elif isinstance(master[key], list):
                master[key].append(value)
            # CASE 4: master single, new list → convert to list
            elif isinstance(value, list):
                master[key] = [master[key]] + value
            # CASE 5: both single values → convert to list
            else:
                master[key] = [master[key], value]
    
    return master


def build_knowledge_base(chunks):
    """Build knowledge base from chunks"""
    master = {}
    for chunk in tqdm(chunks, desc="Extracting knowledge"):
        extracted = None
        for attempt in range(3):
            extracted = extract_chunk_universal(chunk["text"])
            if extracted:
                break
            time.sleep(1)
        master = merge_json(master, extracted)
    
    return master


def upload_to_azure_blob(content, blob_path, department_id):
    """Upload content to Azure Blob Storage"""
    try:
        blob_service = BlobServiceClient.from_connection_string(
            Config.AZURE_STORAGE_CONNECTION_STRING
        )
        container_name = Config.AZURE_STORAGE_CONTAINER_NAME
        
        # Ensure container exists
        container_client = blob_service.get_container_client(container_name)
        try:
            container_client.create_container()
        except Exception:
            pass
        
        # Create blob path with department structure
        full_blob_path = f"departments/{department_id}/{blob_path}"
        blob_client = container_client.get_blob_client(full_blob_path)
        
        # Upload
        if isinstance(content, str):
            content_bytes = content.encode('utf-8')
        else:
            content_bytes = content
        
        blob_client.upload_blob(content_bytes, overwrite=True)
        
        print(f"   Uploaded to Azure: {full_blob_path}")
        return blob_client.url
    except Exception as e:
        print(f"   ❌ Failed to upload to Azure: {e}")
        return None


def process_pdf(pdf_path, department_id=None):
    """Main processing function"""
    print(f"\n=== Processing PDF: {pdf_path} ===")
    print(f"Department ID: {department_id or 'Not specified'}")
    
    # Extract PDF text
    print("Extracting PDF...")
    pages = extract_pdf_text(pdf_path)
    print(f"Extracted {len(pages)} pages")
    
    # Chunk text
    print("Chunking...")
    chunks = chunk_text(pages)
    print(f"Created {len(chunks)} chunks")
    
    # Create embeddings
    print("Embedding...")
    chunks = create_embeddings(chunks)
    
    # Store in Pinecone
    print("Storing in Pinecone...")
    store_in_pinecone(chunks, department_id)
    
    # Build knowledge base
    print("Building dynamic knowledge base...")
    knowledge = build_knowledge_base(chunks)
    
    # Save to Azure Blob Storage
    if department_id and Config.AZURE_STORAGE_CONNECTION_STRING:
        print("Uploading to Azure Blob Storage...")
        
        # Upload knowledge JSON
        knowledge_json = json.dumps(knowledge, indent=2, ensure_ascii=False)
        knowledge_url = upload_to_azure_blob(
            knowledge_json,
            "knowledge_base.json",
            department_id
        )
        
        # Upload embeddings metadata
        embeddings_metadata = [{
            "id": chunk["id"],
            "page": chunk["page"],
            "text_preview": chunk["text"][:200]
        } for chunk in chunks]
        embeddings_json = json.dumps(embeddings_metadata, indent=2)
        embeddings_url = upload_to_azure_blob(
            embeddings_json,
            "embeddings_metadata.json",
            department_id
        )
        
        print(f"\n✅ Processing complete!")
        print(f"   Knowledge URL: {knowledge_url}")
        print(f"   Embeddings URL: {embeddings_url}")
    else:
        # Save locally if no Azure config
        output_file = "knowledge_base.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(knowledge, f, indent=2, ensure_ascii=False)
        print(f"\n✅ Processing complete! Saved to {output_file}")
    
    return knowledge


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python pdf_processor_pinecone.py <pdf_path> [department_id]")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    department_id = sys.argv[2] if len(sys.argv) > 2 else None
    
    if not os.path.exists(pdf_path):
        print(f"Error: PDF file not found: {pdf_path}")
        sys.exit(1)
    
    process_pdf(pdf_path, department_id)
