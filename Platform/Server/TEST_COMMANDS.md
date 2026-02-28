# Quick Test Commands

## Run All Tests
```bash
# Test blob storage
node test_blob_storage.js

# Test queue service
node test_queue.js

# Test grievance submission
node test_grievance_submission.js
```

## Expected Results

### ✅ test_blob_storage.js
```
✅ Test file created
📤 Uploading test file to Azure Blob Storage...
✅ SUCCESS! File uploaded to Azure
```

### ✅ test_queue.js
```
📤 Sending test message to queue...
✅ SUCCESS! Message enqueued
```

### ✅ test_grievance_submission.js
```
✅ Using citizen: Sample Citizen
📤 Submitting test grievance...
✅ SUCCESS! Grievance submitted
   Grievance ID (UUID): ...
   Grievance ID (String): GRV-20260228-XXXXXX
✅ Grievance found in database
   Location: Mumbai, Maharashtra, India
   Coordinates: 19.076, 72.877
```

## If Any Test Fails

### Blob Storage Fails
```bash
# Check container access
node fix_container_access.js

# Verify .env has correct connection string
# AZURE_STORAGE_CONNECTION_STRING=...
```

### Queue Fails
```bash
# Verify .env has correct connection string
# AZURE_QUEUE_QUERYANALYST_CONNECTION_STRING=...
```

### Grievance Submission Fails
```bash
# Fix trigger (already done, but if needed again)
node fix_trigger_direct.js

# Restart server to run migrations
npm start
```

## Start Server
```bash
npm start
```

Look for:
```
✅ Department trigger fix completed
✅ Location fields migration completed
✅ All migrations completed
Telegram Bot initialized
```

## Test via Telegram

1. Open Telegram bot
2. Send: `/start`
3. Register with phone
4. Click: "Submit New Grievance"
5. Share location
6. Type: "Test grievance"
7. Upload a photo

Expected response:
```
✅ Grievance Submitted Successfully!
   Submission ID: GRV-20260228-XXXXXX
```

## Check Database
```sql
-- View recent grievances
SELECT 
    grievance_id,
    grievance_text,
    latitude,
    longitude,
    location_address,
    image_path,
    created_at
FROM usergrievance
ORDER BY created_at DESC
LIMIT 5;
```

## All Systems Go! ✅

If all tests pass, your Telegram integration is fully functional!
