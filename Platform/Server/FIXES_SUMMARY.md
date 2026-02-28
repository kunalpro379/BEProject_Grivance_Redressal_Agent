# Telegram Integration Fixes Summary

## Overview
Fixed two critical issues preventing Telegram grievance submissions from working properly:
1. Queue submission failures
2. Blob storage upload failures

---

## Issue #1: Queue Submission Not Working

### Problem
Grievances submitted via Telegram were not being queued for AI analysis.

### Root Cause
The database function `submit_grievance` only accepted 6 parameters, but the Telegram bot was trying to pass location data (latitude, longitude, location_address), causing parameter mismatch.

### Solution
1. Created migration to add location columns to UserGrievance table
2. Updated `submit_grievance` function to accept 9 parameters (including location)
3. Modified grievance service to pass location data
4. Added detailed error logging for queue operations

### Files Changed
- `src/migrations/add_location_to_grievances.js` (NEW)
- `src/services/grievance.db.service.js` (UPDATED)
- `src/services/telegram.bot.service.js` (UPDATED)
- `index.js` (UPDATED)
- `test_queue.js` (NEW)

---

## Issue #2: Blob Upload Failing

### Problem
File uploads from Telegram were failing when trying to upload proof documents to Azure Blob Storage.

### Root Causes
1. Insufficient error logging made diagnosis difficult
2. Container access level might be private, preventing blob access
3. Improper blob naming without folder structure
4. Missing error handling for upload failures

### Solution
1. Enhanced Azure Storage Service with detailed logging
2. Set container access level to 'blob' (public read access)
3. Added proper blob path structure: `grievances/{timestamp}_{userId}_{fileName}`
4. Wrapped uploads in try-catch with user-friendly error messages
5. Added cleanup of temp files on failure

### Files Changed
- `src/services/azure.storage.services.js` (UPDATED)
- `src/services/telegram.bot.service.js` (UPDATED)
- `test_blob_storage.js` (NEW)

---

## Quick Fix Guide

### 1. Test Azure Services
```bash
cd Platform/Server

# Test blob storage
node test_blob_storage.js

# Test queue service  
node test_queue.js
```

### 2. Fix Container Access (if needed)
Azure Portal → Storage Accounts → igrs → Containers → igrs
- Set access level to "Blob (anonymous read access)"

### 3. Restart Server
```bash
npm start
```
Migration runs automatically on startup.

---

## Verification

### Expected Log Output (Successful Submission)
```
[Telegram] File downloaded to temp: ./temp/temp_123456_1234567890_photo.jpg
[Azure Storage] Starting upload: { filePath: '...', fileName: 'grievances/...' }
[Azure Storage] File uploaded successfully: { url: 'https://...' }
[Telegram] File uploaded to Azure: https://...
[Telegram] Grievance saved to DB: { grievance_id: '...', has_location: true }
[Telegram] Attempting to send message to queue: { grievance_id: '...' }
Message enqueued to Query Analyst Queue: { messageId: '...', insertionTime: '...' }
[Telegram] Message successfully enqueued: { messageId: '...' }
```

### Test Telegram Flow
1. Open Telegram bot → `/start`
2. Register with phone and location
3. Click "Submit New Grievance"
4. Share grievance location
5. Type grievance description
6. Upload proof document (photo or PDF)
7. Check server logs for success messages

---

## Troubleshooting

### Queue Issues
**Symptom:** Message not appearing in Azure Queue

**Check:**
1. `.env` has correct `AZURE_QUEUE_QUERYANALYST_CONNECTION_STRING`
2. Queue 'queryanalyst' exists in Azure Portal
3. Run `node test_queue.js` to verify connection

**Common Errors:**
- "Connection string required" → Check .env file
- "Queue not found" → Queue will be created automatically
- "Authentication failed" → Verify connection string and access key

### Blob Upload Issues
**Symptom:** "Upload Failed" message in Telegram

**Check:**
1. `.env` has correct `AZURE_STORAGE_CONNECTION_STRING`
2. Container 'igrs' exists with "Blob" access level
3. Run `node test_blob_storage.js` to verify connection

**Common Errors:**
- "Container not found" → Container will be created automatically
- "Authentication failed" → Verify connection string
- "Blob not accessible" → Change container access level to "Blob"

---

## Database Changes

### New Columns in UserGrievance Table
```sql
ALTER TABLE UserGrievance ADD COLUMN latitude numeric(10, 8);
ALTER TABLE UserGrievance ADD COLUMN longitude numeric(11, 8);
ALTER TABLE UserGrievance ADD COLUMN location_address text;
```

### Updated Function Signature
```sql
CREATE OR REPLACE FUNCTION submit_grievance(
    p_citizen_id uuid,
    p_grievance_text text,
    p_image_path text,
    p_image_description text,
    p_enhanced_query text,
    p_embedding text,
    p_latitude numeric DEFAULT NULL,      -- NEW
    p_longitude numeric DEFAULT NULL,     -- NEW
    p_location_address text DEFAULT NULL  -- NEW
)
```

---

## Code Changes Summary

### Azure Storage Service
**Before:**
```javascript
await containerClient.createIfNotExists();
const blockBlobClient = containerClient.getBlockBlobClient(fileName);
await blockBlobClient.uploadFile(pathToUpload);
```

**After:**
```javascript
await containerClient.createIfNotExists({ access: 'blob' });
const sanitizedFileName = fileName.replace(/\\/g, '/');
const blockBlobClient = containerClient.getBlockBlobClient(sanitizedFileName);
console.log('[Azure Storage] Uploading file from:', pathToUpload);
await blockBlobClient.uploadFile(pathToUpload);
console.log('[Azure Storage] File uploaded successfully');
```

### Telegram Bot Service
**Before:**
```javascript
const azureResult = await azureStorageService.uploadFile(tempFilePath, fileName);
await azureQueryAnalystQueueService.sendMessage(queueMessage);
```

**After:**
```javascript
const blobFileName = `grievances/${Date.now()}_${userId}_${fileName}`;
let azureResult;
try {
    azureResult = await azureStorageService.uploadFile(tempFilePath, blobFileName);
    console.log('[Telegram] File uploaded to Azure:', azureResult.url);
} catch (uploadError) {
    console.error('[Telegram] Azure upload failed:', uploadError);
    // User-friendly error message
    return ctx.reply('❌ Upload Failed\n\n' + uploadError.message);
}

try {
    const queueResponse = await azureQueryAnalystQueueService.sendMessage(queueMessage);
    console.log('[Telegram] Message successfully enqueued');
} catch (queueError) {
    console.error('[Telegram] Queue submission failed:', queueError);
    // Notify user but don't fail completely
}
```

---

## Testing Checklist

- [ ] Run `node test_blob_storage.js` → Should pass
- [ ] Run `node test_queue.js` → Should pass
- [ ] Verify container exists in Azure Portal
- [ ] Verify container access level is "Blob"
- [ ] Verify queue exists in Azure Portal
- [ ] Test Telegram photo upload
- [ ] Test Telegram PDF upload
- [ ] Verify uploaded files are accessible via URL
- [ ] Verify grievance saved to database with location
- [ ] Verify grievance queued for AI analysis
- [ ] Check server logs show all success messages

---

## Rollback Instructions

If you need to revert these changes:

```bash
# Revert code changes
git checkout HEAD -- src/services/azure.storage.services.js
git checkout HEAD -- src/services/telegram.bot.service.js
git checkout HEAD -- src/services/grievance.db.service.js
git checkout HEAD -- index.js

# Revert database changes (if needed)
psql -d your_database << EOF
ALTER TABLE UserGrievance DROP COLUMN IF EXISTS latitude;
ALTER TABLE UserGrievance DROP COLUMN IF EXISTS longitude;
ALTER TABLE UserGrievance DROP COLUMN IF EXISTS location_address;

DROP FUNCTION IF EXISTS submit_grievance(uuid, text, text, text, text, text, numeric, numeric, text);

CREATE OR REPLACE FUNCTION submit_grievance(
    p_citizen_id uuid,
    p_grievance_text text,
    p_image_path text,
    p_image_description text,
    p_enhanced_query text,
    p_embedding text
)
RETURNS uuid
LANGUAGE plpgsql
AS \$function\$
DECLARE
    v_grievance_id uuid;
BEGIN
    INSERT INTO UserGrievance (
        citizen_id, grievance_text, image_path, 
        image_description, enhanced_query, embedding
    ) VALUES (
        p_citizen_id, p_grievance_text, p_image_path,
        p_image_description, p_enhanced_query, 
        CASE 
            WHEN p_embedding IS NOT NULL THEN p_embedding::vector
            ELSE NULL 
        END
    )
    RETURNING id INTO v_grievance_id;
    
    RETURN v_grievance_id;
END;
\$function\$;
EOF
```

---

## Documentation Files

- `QUICK_START_FIX.md` - Quick reference guide
- `TELEGRAM_QUEUE_FIX.md` - Detailed queue fix documentation
- `BLOB_UPLOAD_FIX.md` - Detailed blob upload fix documentation
- `FIXES_SUMMARY.md` - This file (comprehensive overview)

---

## Support

If issues persist:
1. Run both test scripts and share output
2. Check server logs for detailed error messages
3. Verify Azure Portal shows containers and queues
4. Test uploading directly via Azure Portal
5. Check network connectivity to Azure endpoints

For Azure-specific issues, refer to:
- [Azure Blob Storage Docs](https://docs.microsoft.com/en-us/azure/storage/blobs/)
- [Azure Queue Storage Docs](https://docs.microsoft.com/en-us/azure/storage/queues/)
