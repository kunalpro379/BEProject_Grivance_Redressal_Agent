# Upload Knowledge Base Documents to Department Index

## Overview
This guide will help you upload existing knowledge base documents to the `department` Pinecone index.

## What Changed
- **Pinecone Index**: Changed from `igrs1` to `department`
- **Purpose**: All department knowledge base documents will now be stored in the `department` index for better organization

## Documents to Upload
Based on your knowledge base, these documents will be uploaded:
1. **Test_1testtt** (28/2/2026) - PDF, 0.6 MB
2. **Water Supply SOP** (19/2/2026) - PDF, 2.3 MB
3. **Pipeline Repair Guidelines** (19/2/2026) - PDF, 1.7 MB
4. **Water Quality Standards** (19/2/2026) - DOCX, 0.8 MB

## Steps to Upload

### Option 1: Upload Existing Documents (Recommended)

This will process all existing documents in your database and upload them to the `department` index.

```bash
# Navigate to KB worker directory
cd AgenticWorkers/KB

# Install dependencies (if not already installed)
pip install -r requirements.txt

# Run the upload script
python upload_existing_docs.py
```

The script will:
1. Fetch all PDF documents from `departmentknowledgebase` table
2. Download and process each document
3. Extract text and create embeddings
4. Upload vectors to the `department` Pinecone index
5. Generate and upload knowledge base JSON files
6. Update database with processing status

### Option 2: Start KB Worker for New Uploads

For processing new documents uploaded through the admin panel:

```bash
# Navigate to KB worker directory
cd AgenticWorkers/KB

# Start the worker
python worker.py
```

The worker will:
- Listen to the Azure Queue for new document uploads
- Process documents automatically
- Upload to the `department` Pinecone index

## Verification

After uploading, you can verify the documents are in Pinecone:

1. Check the console output for success messages
2. Look for generated JSON files in `AgenticWorkers/KB/outputs/`
3. Verify in your Pinecone dashboard that the `department` index has vectors

## Configuration Files Updated

 `AgenticWorkers/KB/.env` - Changed `PINECONE_INDEX_NAME=department`
 `Server/.env` - Already has `PINECONE_INDEX_NAME=department`

## Troubleshooting

### Error: "Missing required environment variables"
- Check that all required variables are set in `.env`
- Required: `AZURE_STORAGE_CONNECTION_STRING`, `AZURE_QUEUE_CONNECTION_STRING`, `GROQ_API_KEY`, `PINECONE_API_KEY`

### Error: "Failed to process PDF"
- Ensure the PDF URL is accessible
- Check Azure Blob Storage connection
- Verify the PDF is not corrupted

### Error: "Failed to upsert vectors"
- Check Pinecone API key is valid
- Verify the `department` index exists in Pinecone
- Check network connectivity

## Next Steps

After uploading:
1. Test document search in your application
2. Verify policy extraction works with the new index
3. Monitor the KB worker for any new uploads

## Support

If you encounter issues:
1. Check the console output for detailed error messages
2. Review the generated log files
3. Verify all environment variables are correctly set
