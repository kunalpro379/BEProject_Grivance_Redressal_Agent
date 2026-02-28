# Water Department Contractors Setup

## Overview
This document explains how to add Water department contractors with AI analysis data and display them in the Department Dashboard.

## Changes Made

### 1. Backend API Update ✅
**File**: `Platform/Server/src/routes/department-dashboard.routes.js`

Updated the `/api/department-dashboard/:depId/contractors` endpoint to:
- Filter contractors by `department_id` (shows contractors for specific department OR contractors with no department assigned)
- Include `ai_analysis` field in the response
- Sort by performance_score (descending) then company_name

### 2. Database Schema
**New Column**: `department_id` (uuid) added to `contractors` table
- References `departments(id)`
- Allows contractors to be assigned to specific departments

### 3. Water Department Contractors Data
Created 6 contractors specifically for Water & Sanitation department:

1. **CONT-WAT-2024-001** - AquaTech Solutions Pvt Ltd (93.8%)
   - Specialization: Water Pipeline Installation, Leak Detection
   - 72 workers, 20 vehicles
   - Success Rate: 94.7%

2. **CONT-WAT-2024-002** - HydroFlow Engineering (91.2%)
   - Specialization: Water Treatment, Filtration Systems
   - 58 workers, 15 vehicles
   - Success Rate: 93.5%

3. **CONT-WAT-2024-003** - PureWater Infrastructure Ltd (89.5%)
   - Specialization: Water Storage Tanks, Overhead Reservoirs
   - 45 workers, 12 vehicles
   - Success Rate: 92.3%

4. **CONT-WAT-2024-004** - Sewage Solutions India (87.8%)
   - Specialization: Sewage Treatment, Drainage Systems
   - 62 workers, 18 vehicles
   - Success Rate: 89.6%

5. **CONT-WAT-2024-005** - CleanFlow Systems (90.4%)
   - Specialization: Water Distribution, Meter Installation
   - 68 workers, 16 vehicles
   - Success Rate: 94.1%

6. **CONT-WAT-2024-006** - DrainTech Professionals (86.3%)
   - Specialization: Drain Cleaning, Sewer Maintenance
   - 38 workers, 10 vehicles
   - Success Rate: 90.9%

## How to Add the Data

### Option 1: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Open the file `Platform/DB/add_water_contractors_manual.sql`
4. Copy and paste the entire SQL content
5. Click "Run" to execute

The SQL will:
- Add the `department_id` column if it doesn't exist
- Automatically find the Water & Sanitation department ID
- Insert all 6 contractors with AI analysis data
- Verify the results

### Option 2: Using the Migration Script (When Database is Available)

```bash
cd Platform/Server
node scripts/add-water-contractors.js
```

Note: This requires the database connection to be stable.

## Frontend Display

The contractors will automatically display in the Department Dashboard when:
1. User logs in as Water & Sanitation department
2. Navigates to Dashboard > Resources > Contractors tab

The UI will show:
- Project types accepted (blue badges)
- Resources available (workers, vehicles, equipment)
- Work history (active, completed, success rate, avg duration)
- Risk level and contract value
- All in a 3-column grid layout

## Testing

1. **Add the data** using one of the options above

2. **Start the backend server**:
   ```bash
   cd Platform/Server
   npm start
   ```

3. **Start the frontend**:
   ```bash
   cd Platform/IGRS-portal
   npm run dev
   ```

4. **Login as Water department user** and navigate to:
   - Dashboard > Resources > Contractors tab

5. **Verify**:
   - 6 Water department contractors are displayed
   - Each card shows AI analysis data
   - Cards are in 3-column grid format
   - Data loads without errors

## API Response Format

The contractors endpoint now returns:
```javascript
{
  success: true,
  data: [
    {
      contractor_id: "CONT-WAT-2024-001",
      company_name: "AquaTech Solutions Pvt Ltd",
      contact_person: "Suresh Patil",
      phone: "+91-9876501234",
      email: "suresh@aquatech.com",
      specialization: "Water Pipeline Installation, Leak Detection",
      performance_score: 93.8,
      active_projects: 5,
      completed_projects: 38,
      avg_completion_time: 28,
      contract_value: 28000000,
      ai_analysis: {
        project_types_accepted: [...],
        resources_available: {...},
        work_history: {...},
        performance_insights: {...},
        financial_summary: {...}
      }
    },
    // ... more contractors
  ]
}
```

## Files Modified/Created

### Modified
- `Platform/Server/src/routes/department-dashboard.routes.js` - Updated contractors endpoint

### Created
- `Platform/Server/scripts/add-water-contractors.js` - Automated migration script
- `Platform/DB/add_water_contractors_manual.sql` - Manual SQL script
- `WATER_CONTRACTORS_SETUP.md` - This documentation

## Notes

- Contractors with `department_id = NULL` will be shown to all departments
- Contractors with a specific `department_id` will only show to that department
- The frontend UI already supports displaying AI analysis data (from previous update)
- No frontend changes are needed - just add the backend data

## Troubleshooting

**Issue**: Contractors not showing
- Check if the Water department ID is correct in the database
- Verify the contractors were inserted successfully
- Check browser console for API errors

**Issue**: AI analysis not displaying
- Verify the `ai_analysis` column exists in contractors table
- Check that the JSON data is valid
- Ensure the backend API includes `ai_analysis` in the SELECT query

**Issue**: Database connection timeout
- Use the manual SQL script in Supabase SQL Editor instead
- Wait a few minutes and try again
- Check Supabase dashboard for any service issues
