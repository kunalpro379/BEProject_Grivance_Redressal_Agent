# Quick Start: Fix Telegram Queue Submission & Blob Upload

## The Problems
1. Telegram grievances weren't being submitted to the Azure queue for AI analysis
2. Blob upload was failing when uploading proof documents

## The Fix (4 Steps)

### Step 1: Test Azure Services
```bash
cd Platform/Server

# Test blob storage
node test_blob_storage.js

# Test queue service
node test_queue.js
```

If either fails, check your `.env` file for correct Azure credentials.

### Step 2: Fix Container Access Level
Go to Azure Portal:
1. Storage Accounts → igrs → Containers → igrs
2. Change access level to "Blob (anonymous read access)"
3. Click OK

Or use Azure CLI:
```bash
az storage container set-permission --name igrs --public-access blob
```

### Step 3: Run Migration
The migration runs automatically on server start, or run manually:
```bash
node src/migrations/add_location_to_grievances.js
```

### Step 4: Restart Server
```bash
npm start
```

## What Was Fixed

### Queue Submission
1. **Added location support** - UserGrievance table now stores latitude, longitude, and location_address
2. **Updated database function** - submit_grievance now accepts 9 parameters including location data
3. **Enhanced error logging** - Better debugging with detailed console logs
4. **Improved error handling** - Users get clear feedback if queue submission fails

### Blob Upload
1. **Enhanced error logging** - Detailed logs for every upload step
2. **Fixed container access** - Set to public read access for blobs
3. **Better file naming** - Proper folder structure: `grievances/{timestamp}_{userId}_{fileName}`
4. **Improved error handling** - User-friendly error messages and temp file cleanup

## Verify It's Working

After submitting a grievance via Telegram, check server logs for:

```
✅ [Telegram] File downloaded to temp
✅ [Azure Storage] Starting upload
✅ [Azure Storage] File uploaded successfully
✅ [Telegram] File uploaded to Azure
✅ [Telegram] Grievance saved to DB
✅ [Telegram] Attempting to send message to queue
✅ Message enqueued to Query Analyst Queue
✅ [Telegram] Message successfully enqueued
```

## Still Having Issues?

### Queue Issues
1. **Check Azure credentials in .env**
   - AZURE_QUEUE_QUERYANALYST_CONNECTION_STRING
   - AZURE_QUEUE_QUERYANALYST_NAME

2. **Verify queue exists in Azure Portal**
   - Storage Account → Queues → 'queryanalyst'

3. **Run the test script**
   ```bash
   node test_queue.js
   ```

### Blob Upload Issues
1. **Check Azure credentials in .env**
   - AZURE_STORAGE_CONNECTION_STRING
   - AZURE_STORAGE_CONTAINER_NAME

2. **Verify container access level**
   - Storage Account → Containers → 'igrs'
   - Should be set to "Blob" access level

3. **Run the test script**
   ```bash
   node test_blob_storage.js
   ```

4. **Check server logs for errors**
   - Look for messages starting with `[Azure Storage]` or `[Telegram]`

## Files Changed
- ✅ `src/migrations/add_location_to_grievances.js` (NEW)
- ✅ `src/services/grievance.db.service.js` (UPDATED)
- ✅ `src/services/telegram.bot.service.js` (UPDATED)
- ✅ `src/services/azure.storage.services.js` (UPDATED)
- ✅ `index.js` (UPDATED)
- ✅ `test_queue.js` (NEW - for testing queue)
- ✅ `test_blob_storage.js` (NEW - for testing blob storage)

## Detailed Documentation
- Queue issues: See `TELEGRAM_QUEUE_FIX.md`
- Blob upload issues: See `BLOB_UPLOAD_FIX.md`
