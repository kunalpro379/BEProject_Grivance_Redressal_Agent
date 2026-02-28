# Azure Blob Upload Fix

## The Problem
File uploads from Telegram were failing when trying to upload proof documents to Azure Blob Storage.

## Root Causes Identified

1. **Insufficient Error Logging** - Hard to diagnose what was failing
2. **Container Access Level** - Container might be set to private, preventing blob access
3. **File Path Issues** - Improper blob naming without folder structure
4. **Missing Error Handling** - Upload failures weren't properly caught and reported

## The Fix

### 1. Enhanced Azure Storage Service
- Added detailed logging for every step of the upload process
- Set container access level to 'blob' (public read access)
- Added proper error handling with error codes and status codes
- Sanitized file names to ensure valid blob names
- Added validation for file paths

### 2. Improved Telegram Bot Upload Flow
- Added proper blob path structure: `grievances/{timestamp}_{userId}_{fileName}`
- Wrapped Azure upload in try-catch with user-friendly error messages
- Added cleanup of temp files on upload failure
- Declared variables in proper scope
- Added detailed console logging

### 3. Test Scripts
Created two test scripts to verify Azure services:
- `test_blob_storage.js` - Tests blob upload functionality
- `test_queue.js` - Tests queue submission functionality

## How to Fix

### Step 1: Test Blob Storage Connection
```bash
cd Platform/Server
node test_blob_storage.js
```

Expected output:
```
✅ Test file created
📤 Uploading test file to Azure Blob Storage...
✅ SUCCESS! File uploaded to Azure
```

If this fails, check:
1. Azure connection string in .env
2. Network connectivity
3. Storage account access key validity

### Step 2: Verify Container Access Level

Option A - Using Azure Portal:
1. Go to Azure Portal → Storage Accounts → igrs
2. Click on "Containers" → "igrs"
3. Click "Change access level"
4. Set to "Blob (anonymous read access for blobs only)"
5. Click "OK"

Option B - Using Azure CLI:
```bash
az storage container set-permission \
  --name igrs \
  --public-access blob \
  --connection-string "YOUR_CONNECTION_STRING"
```

### Step 3: Restart Server
```bash
npm start
```

### Step 4: Test Telegram Upload
1. Open Telegram bot
2. Submit a grievance
3. Upload a proof document
4. Check server logs for detailed upload progress

## What Changed

### Files Modified
1. ✅ `src/services/azure.storage.services.js` - Enhanced error handling and logging
2. ✅ `src/services/telegram.bot.service.js` - Better upload flow and error handling
3. ✅ `test_blob_storage.js` (NEW) - Test script for blob storage

### Key Improvements

#### Azure Storage Service
```javascript
// Before
await containerClient.createIfNotExists();

// After
await containerClient.createIfNotExists({
    access: 'blob' // Public read access
});
```

#### Telegram Bot Service
```javascript
// Before
const azureResult = await azureStorageService.uploadFile(tempFilePath, fileName);

// After
const blobFileName = `grievances/${Date.now()}_${userId}_${fileName}`;
let azureResult;
try {
    azureResult = await azureStorageService.uploadFile(tempFilePath, blobFileName);
} catch (uploadError) {
    // Proper error handling with user feedback
}
```

## Expected Log Output

### Successful Upload
```
[Telegram] File downloaded to temp: ./temp/temp_123456_1234567890_photo.jpg
[Azure Storage] Starting upload: {
  filePath: './temp/temp_123456_1234567890_photo.jpg',
  fileName: 'grievances/1234567890_123456_photo.jpg',
  containerName: 'igrs'
}
[Azure Storage] Uploading file from: ./temp/temp_123456_1234567890_photo.jpg
[Azure Storage] File uploaded successfully: {
  fileName: 'grievances/1234567890_123456_photo.jpg',
  url: 'https://igrs.blob.core.windows.net/igrs/grievances/1234567890_123456_photo.jpg',
  requestId: 'request-id-here'
}
[Telegram] File uploaded to Azure: https://igrs.blob.core.windows.net/...
```

### Failed Upload
```
[Azure Storage] Upload error: {
  message: 'Error message here',
  code: 'ErrorCode',
  statusCode: 403
}
[Telegram] Azure upload failed: Error: Failed to upload file to Azure: ...
```

## Common Errors and Solutions

### Error: "ContainerNotFound"
**Solution:** Container will be created automatically. If error persists, create manually in Azure Portal.

### Error: "AuthenticationFailed" or "InvalidAuthenticationInfo"
**Solution:** 
1. Verify connection string in .env is correct
2. Check if storage account access key has been regenerated
3. Ensure no extra spaces in connection string

### Error: "BlobNotFound" when accessing URL
**Solution:** 
1. Container access level is set to private
2. Change to "Blob" or "Container" access level
3. See "Verify Container Access Level" section above

### Error: "RequestBodyTooLarge"
**Solution:** 
1. File size exceeds Azure limits (default 100MB for block blobs)
2. Add file size validation in Telegram bot
3. Consider using chunked upload for large files

### Error: "InvalidBlobOrBlock"
**Solution:** 
1. Blob name contains invalid characters
2. File path is incorrect
3. Check sanitization logic in azure.storage.services.js

## Testing Checklist

- [ ] Run `node test_blob_storage.js` - Should pass
- [ ] Run `node test_queue.js` - Should pass
- [ ] Verify container exists in Azure Portal
- [ ] Verify container access level is "Blob"
- [ ] Test Telegram photo upload
- [ ] Test Telegram document upload (.pdf)
- [ ] Check uploaded files are accessible via URL
- [ ] Verify grievance is saved to database
- [ ] Verify grievance is queued for AI analysis

## Monitoring

### Check Upload Success Rate
```sql
-- Count grievances with and without images
SELECT 
    COUNT(*) as total,
    COUNT(image_path) as with_images,
    COUNT(*) - COUNT(image_path) as without_images
FROM usergrievance
WHERE created_at > NOW() - INTERVAL '24 hours';
```

### Check Recent Uploads
```sql
-- View recent grievances with image URLs
SELECT 
    id,
    created_at,
    image_path,
    image_description
FROM usergrievance
WHERE image_path IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

## Rollback

If you need to revert changes:

```bash
git checkout HEAD -- src/services/azure.storage.services.js
git checkout HEAD -- src/services/telegram.bot.service.js
```

## Additional Resources

- [Azure Blob Storage Documentation](https://docs.microsoft.com/en-us/azure/storage/blobs/)
- [Azure Storage Node.js SDK](https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/storage/storage-blob)
- [Container Access Levels](https://docs.microsoft.com/en-us/azure/storage/blobs/anonymous-read-access-configure)

## Support

If issues persist after following this guide:

1. Run both test scripts and share output
2. Check server logs for detailed error messages
3. Verify Azure Portal shows the container and storage account
4. Test uploading a file directly via Azure Portal
5. Check network connectivity to Azure endpoints
