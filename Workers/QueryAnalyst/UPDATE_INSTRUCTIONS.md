# QueryAnalyst Worker - Database Table Updates

## Table Name Changes

### Old Names → New Names
- `UserGrivience` → `UserGrievance` (raw submissions)
- `UserGrievance` → `Grievances` (processed records)

## What QueryAnalyst Does

1. **Reads from**: Azure Queue (message contains `grievanceId` which is `UserGrievance.id`)
2. **Processes**: Runs AI analysis on the grievance
3. **Writes to**: `Grievances` table (creates processed record with AI analysis)

## Current Flow

```
Telegram Bot
    ↓
Creates UserGrievance record (raw submission)
    ↓
Pushes to Azure Queue: { grievanceId: <UserGrievance.id>, query: "...", ... }
    ↓
QueryAnalyst Worker receives message
    ↓
Runs AI analysis
    ↓
Calls API callback with analysis results
    ↓
API creates Grievances record (processed)
```

## No Code Changes Needed in Worker!

The QueryAnalyst worker **doesn't directly interact with the database**. It:
1. Receives messages from Azure Queue
2. Runs AI analysis
3. Sends results back to API via callback
4. API handles database operations

## API Callback Endpoint

The API endpoint `/api/worker/queryanalyst-callback` handles:
- Receiving analysis results from worker
- Creating `Grievances` record with AI analysis
- Linking to original `UserGrievance` via `grievance_id`

## Verification

The worker code is already correct because it:
- Uses `grievanceId` from message (which is `UserGrievance.id`)
- Doesn't make direct database calls
- Relies on API to handle database operations

## Summary

✅ **No changes needed in QueryAnalyst worker code**
✅ API already updated to use new table names
✅ Migration handles all database schema changes
