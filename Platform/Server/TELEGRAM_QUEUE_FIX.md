# Telegram Grievance Queue Submission Fix

## Problem
Grievances submitted via Telegram were not being properly queued for AI analysis due to:
1. Missing location fields (latitude, longitude, location_address) in the UserGrievance table
2. The `submit_grievance` database function not accepting location parameters
3. Insufficient error logging to diagnose queue submission failures

## Solution

### 1. Database Migration
Created `add_location_to_grievances.js` migration that:
- Adds `latitude`, `longitude`, and `location_address` columns to UserGrievance table
- Updates the `submit_grievance` function to accept 9 parameters (including location data)
- Uses DEFAULT NULL for location parameters to maintain backward compatibility

### 2. Service Updates
Updated `grievance.db.service.js`:
- Modified `submitGrievance` method to accept and pass location parameters
- Now properly handles latitude, longitude, and location_address from Telegram submissions

### 3. Enhanced Error Logging
Updated `telegram.bot.service.js`:
- Added detailed console logging for database saves
- Added try-catch specifically for queue submission with detailed error logging
- Added user-friendly error messages when queue submission fails
- Includes location data in queue messages for better tracking

## How to Apply the Fix

### Step 1: Run the Migration
The migration will run automatically when you start the server. If you need to run it manually:

```bash
cd Platform/Server
node src/migrations/add_location_to_grievances.js
```

### Step 2: Restart the Server
```bash
npm start
```

### Step 3: Verify the Fix
1. Check server logs for migration success message
2. Submit a test grievance via Telegram
3. Look for these log messages:
   - `[Telegram] Grievance saved to DB:`
   - `[Telegram] Attempting to send message to queue:`
   - `[Telegram] Message successfully enqueued:`

## What Changed

### Database Schema
```sql
ALTER TABLE UserGrievance ADD COLUMN latitude numeric(10, 8);
ALTER TABLE UserGrievance ADD COLUMN longitude numeric(11, 8);
ALTER TABLE UserGrievance ADD COLUMN location_address text;
```

### Function Signature
```sql
CREATE OR REPLACE FUNCTION submit_grievance(
    p_citizen_id uuid,
    p_grievance_text text,
    p_image_path text,
    p_image_description text,
    p_enhanced_query text,
    p_embedding text,
    p_latitude numeric DEFAULT NULL,
    p_longitude numeric DEFAULT NULL,
    p_location_address text DEFAULT NULL
)
```

### Queue Message Format
Now includes location data:
```javascript
{
    grievance_id: uuid,
    citizen_id: uuid,
    telegram_id: number,
    grievance_text: string,
    image_path: string,
    latitude: number | null,
    longitude: number | null,
    location_address: string | null,
    timestamp: ISO string,
    source: 'telegram'
}
```

## Troubleshooting

### If Queue Submission Still Fails

1. **Check Azure Queue Configuration**
   ```bash
   # Verify .env has correct values
   AZURE_QUEUE_QUERYANALYST_CONNECTION_STRING=...
   AZURE_QUEUE_QUERYANALYST_NAME=queryanalyst
   ```

2. **Check Server Logs**
   Look for error messages starting with `[Telegram]` or `Azure Query Analyst Queue`

3. **Verify Queue Exists**
   - Log into Azure Portal
   - Navigate to Storage Account
   - Check if 'queryanalyst' queue exists

4. **Test Queue Service Directly**
   ```javascript
   import azureQueryAnalystQueueService from './src/services/azure.queue.queryanalyst.service.js';
   
   await azureQueryAnalystQueueService.sendMessage({
       test: 'message',
       timestamp: new Date().toISOString()
   });
   ```

### Common Errors

**Error: "Function submit_grievance does not exist"**
- Solution: Run the migration script

**Error: "Column does not exist"**
- Solution: Run the migration script to add missing columns

**Error: "Failed to enqueue message to Query Analyst Queue"**
- Solution: Check Azure connection string and queue name in .env

## Testing

### Test Telegram Submission Flow
1. Open Telegram bot
2. Send `/start`
3. Register with phone and location
4. Click "Submit New Grievance"
5. Share grievance location
6. Type grievance description
7. Upload proof document
8. Check server logs for successful queue submission

### Expected Log Output
```
[Telegram] Grievance saved to DB: {
  grievance_id: 'uuid-here',
  citizen_id: 'uuid-here',
  has_location: true
}
[Telegram] Attempting to send message to queue: {
  grievance_id: 'uuid-here',
  citizen_id: 'uuid-here',
  telegram_id: 123456789
}
Message enqueued to Query Analyst Queue: {
  messageId: 'message-id',
  insertionTime: '2024-...'
}
[Telegram] Message successfully enqueued: {
  messageId: 'message-id',
  insertionTime: '2024-...'
}
```

## Files Modified

1. `Platform/Server/src/migrations/add_location_to_grievances.js` (NEW)
2. `Platform/Server/src/services/grievance.db.service.js` (UPDATED)
3. `Platform/Server/src/services/telegram.bot.service.js` (UPDATED)
4. `Platform/Server/index.js` (UPDATED)

## Rollback

If you need to rollback these changes:

```sql
-- Remove location columns
ALTER TABLE UserGrievance DROP COLUMN IF EXISTS latitude;
ALTER TABLE UserGrievance DROP COLUMN IF EXISTS longitude;
ALTER TABLE UserGrievance DROP COLUMN IF EXISTS location_address;

-- Restore old function
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
AS $function$
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
$function$;
```
