# Contractors and Zone Allocation UI Changes

## Summary
Updated the Contractors section and Zone Allocation section in the Department Dashboard with enhanced UI and AI analysis data.

## Changes Made

### 1. Database Schema - Contractors Table
**File**: `Platform/DB/add_ai_analysis_contractors.sql`

Added `ai_analysis` column of type `jsonb` to store:
- **project_types_accepted**: Array of project types the contractor handles
- **resources_available**: Object containing workers count, equipment list, vehicles count
- **work_history**: Active projects, completed projects, success rate, avg duration, on-time delivery rate
- **performance_insights**: Strengths, areas for improvement, risk level, reliability score
- **financial_summary**: Contract value, pending payments, payment reliability, credit rating

### 2. Dummy Contractor Data
**File**: `Platform/Server/scripts/add-contractors-ai-analysis.js`

Inserted 6 contractors with complete AI analysis data:
1. **Ambernath Infrastructure Pvt Ltd** - Road Construction, Drainage (94.5% performance)
2. **Shivaji Construction Co** - Water Supply, Sanitation (88.2% performance)
3. **Maharashtra Roads & Bridges Ltd** - Road Repair, Bridge Maintenance (91.7% performance)
4. **Green City Developers** - Waste Management, Sanitation (85.3% performance)
5. **Urban Solutions Engineering** - Street Lighting, Electrical Works (89.6% performance)
6. **Kalyan-Dombivli Infrastructure** - Multi-purpose Infrastructure (87.4% performance)

### 3. Contractors Section UI Update
**File**: `Platform/IGRS-portal/src/pages/department/Dashboard.jsx`

**New Layout Features**:
- Enhanced card design with gradient header (stone-800 to stone-900)
- Performance score prominently displayed in gold (#D4AF37)
- **Project Types Accepted**: Blue badges showing all accepted project types
- **Resources Available**: 
  - Grid showing Workers (green), Vehicles (blue), Equipment count (purple)
  - Equipment list preview (first 3 items)
- **Work History**: 
  - 2x2 grid showing Active, Completed, Success Rate, Avg Duration
  - Color-coded success rate (green)
- **Performance Insights**:
  - Risk level indicator (color-coded: green for low, amber for medium, red for high)
  - Contract value in Crores (₹)
- Maintains 3-column grid layout (responsive: 1 col mobile, 2 cols tablet, 3 cols desktop)

### 4. Zone Allocation Section UI Update
**File**: `Platform/IGRS-portal/src/pages/department/Dashboard.jsx`

**Changed from**: Single-column layout with full grievance details per ward
**Changed to**: Grid layout with ward summary cards

**New Layout Features**:
- **Grid Format**: 3-column grid (responsive: 1 col mobile, 2 cols tablet, 3 cols desktop)
- **Ward Card Structure**:
  - Header: Ward name, location, active grievance count (gold highlight)
  - Quick Stats: Workers, Equipment, Resolved, Avg Days (4-column grid)
  - Grievances Summary: Shows first 3 active grievances with:
    - Grievance ID and priority badge
    - Description (truncated)
    - Progress bar with percentage (color-coded)
    - Stage and days left
  - "+X more grievances" indicator if more than 3
  - "All Clear" message if no active grievances

**Benefits**:
- More compact view showing all wards at once
- Easier to compare ward performance
- Consistent with Contractors section grid layout
- Better use of screen space

## How to Run the Migration

### Option 1: Using the Server Script (Recommended)
```bash
cd Platform/Server
node scripts/add-contractors-ai-analysis.js
```

### Option 2: Using psql (if available)
```bash
cd Platform/DB
psql $DATABASE_URL -f add_ai_analysis_contractors.sql
```

### Option 3: Manual SQL Execution
1. Connect to your Supabase database
2. Run the SQL from `Platform/DB/add_ai_analysis_contractors.sql`

## Backend API Requirements

The contractors endpoint should return data with the `ai_analysis` field:
```javascript
{
  contractor_id: "CONT-2024-001",
  company_name: "Ambernath Infrastructure Pvt Ltd",
  performance_score: 94.5,
  active_projects: 4,
  completed_projects: 32,
  ai_analysis: {
    project_types_accepted: ["Road Construction", "Bridge Construction"],
    resources_available: {
      workers: 65,
      equipment: ["Excavators (5)", "Bulldozers (3)"],
      vehicles: 18
    },
    work_history: {
      success_rate: 96.8,
      avg_project_duration: 42
    },
    performance_insights: {
      risk_level: "Very Low"
    }
  }
}
```

## Testing

1. Start the backend server: `cd Platform/Server && npm start`
2. Start the frontend: `cd Platform/IGRS-portal && npm run dev`
3. Login as a department user
4. Navigate to Dashboard > Resources tab
5. Check Contractors section for new AI analysis display
6. Check Zone Allocation section for new grid layout

## Notes

- The migration script uses INSERT ... ON CONFLICT to safely update existing contractors
- All contractors are marked as `is_active = true`
- The UI gracefully handles missing AI analysis data (shows defaults)
- Zone allocation still supports the detailed grievance view data structure but displays it in a more compact format
