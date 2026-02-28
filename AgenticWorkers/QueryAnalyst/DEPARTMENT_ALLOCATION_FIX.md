# Department Allocation Fix

## Problem

The `department_id` field in the `usergrievance` table was not being populated even though the QueryAnalyst agent was successfully finding and allocating departments using Supabase embedding search.

## Root Cause

The `insert_user_grievience()` function in `persistent/supabase.py` was:
1. ✅ Finding the allocated department via embedding search
2. ✅ Storing it in `full_result.department.allocated_department` (JSON)
3. ✅ Storing it in `department_info` (JSON column)
4. ❌ **NOT** setting the `department_id` foreign key column

This meant the department information was in the JSON but not linked via the foreign key relationship.

## Solution

Updated `persistent/supabase.py` to:

### 1. Extract Department ID from Allocated Department
```python
# Extract department_id from full_result.department.allocated_department
department_id_val = None
if full_result and isinstance(full_result, dict):
    dept_section = full_result.get("department", {})
    if isinstance(dept_section, dict):
        allocated_dept = dept_section.get("allocated_department")
        if allocated_dept and isinstance(allocated_dept, dict):
            department_id_val = allocated_dept.get("id")
            print(f"[Supabase] Extracted department_id: {department_id_val} from allocated_department")
```

### 2. Extract Category Fields
```python
# Extract category and sub_category for separate columns
category_val = None
sub_category_val = None
if isinstance(category, dict):
    category_val = category.get("main_category") or category.get("category")
    sub_category_val = category.get("sub_category")
```

### 3. Update SQL to Set Department ID
```sql
UPDATE usergrievance
SET
  ...
  department_id = %(department_id)s,
  category = %(category_val)s,
  sub_category = %(sub_category_val)s,
  ...
WHERE id = %(grievance_id)s;
```

### 4. Add to Parameters
```python
params = {
    ...
    "department_id": department_id_val,
    "category_val": category_val,
    "sub_category_val": sub_category_val,
    ...
}
```

## What This Fixes

### Before
```json
{
  "department_id": null,  ❌ Not set
  "category": {...},      ❌ Full JSON object
  "sub_category": null,   ❌ Not set
  "department_info": {
    "allocated_department": {
      "id": "uuid-here",
      "name": "Sanitation Department"
    }
  }
}
```

### After
```json
{
  "department_id": "uuid-here",  ✅ Foreign key set
  "category": "Sanitation",      ✅ String value
  "sub_category": "Garbage Dumping In Vacant Lot/Land",  ✅ String value
  "department_info": {
    "allocated_department": {
      "id": "uuid-here",
      "name": "Sanitation Department",
      "contact_information": {...},
      "jurisdiction": "..."
    }
  }
}
```

## Benefits

1. **Foreign Key Relationship**: `department_id` now properly links to `departments` table
2. **Query Performance**: Can now use JOIN queries efficiently
3. **Data Integrity**: Database enforces referential integrity
4. **Easier Queries**: Can filter/group by department_id directly
5. **Category Fields**: Separate string fields for easier filtering

## Database Schema

### usergrievance Table
```sql
CREATE TABLE usergrievance (
  id UUID PRIMARY KEY,
  department_id UUID REFERENCES departments(id),  -- Now populated!
  category VARCHAR,                                -- Now populated!
  sub_category VARCHAR,                            -- Now populated!
  department_info JSONB,                           -- Full department details
  ...
);
```

### departments Table
```sql
CREATE TABLE departments (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  description TEXT,
  address TEXT,
  contact_information JSONB,
  jurisdiction TEXT,
  embedding VECTOR(384),
  ...
);
```

## Testing

### 1. Check Department Allocation
```bash
cd Platform/Server
node query_grievances_simple.js <grievance_id>
```

Look for:
```
🏢 CATEGORY & DEPARTMENT
   Category:          Sanitation                    ✅
   Sub Category:      Garbage Dumping...            ✅
   Department ID:     uuid-here                     ✅
```

### 2. Verify Foreign Key
```sql
SELECT 
  g.id,
  g.grievance_id,
  g.department_id,
  d.name as department_name,
  g.category,
  g.sub_category
FROM usergrievance g
LEFT JOIN departments d ON g.department_id = d.id
WHERE g.id = '<grievance_uuid>';
```

Should return:
```
id                  | grievance_id      | department_id | department_name        | category    | sub_category
--------------------|-------------------|---------------|------------------------|-------------|------------------
uuid-here           | GRV-20260228-...  | dept-uuid     | Sanitation Department  | Sanitation  | Garbage Dumping...
```

### 3. Test New Grievance
```bash
# Submit a new grievance
cd Platform/Server
node test_grievance_submission.js

# Wait for QueryAnalyst to process (check worker logs)

# Query the result
node query_grievances_simple.js --recent 1
```

## Workflow

```
1. Citizen submits grievance
   ↓
2. Platform creates usergrievance row
   - Sets: grievance_text, location, image_path
   - Leaves: department_id = NULL
   ↓
3. QueryAnalyst worker picks up message
   ↓
4. AI Analysis Pipeline:
   - Validates image
   - Extracts location
   - Analyzes content
   - Categorizes grievance
   ↓
5. Department Allocation (NEW!)
   - Searches departments table using embedding
   - Matches by: location + category + description
   - Finds top 1 match
   ↓
6. Update Database (FIXED!)
   - Sets department_id = allocated_department.id  ✅
   - Sets category = main_category                 ✅
   - Sets sub_category = sub_category              ✅
   - Stores full details in department_info JSON
   ↓
7. Push to WebCrawler queue
```

## Important Notes

1. **Requires Department Data**: The `departments` table must have:
   - Valid department records
   - Embeddings generated (run `generate_department_embeddings.py`)
   - Proper address, description, jurisdiction fields

2. **Embedding Match**: Department allocation uses semantic search:
   - Query: `location + recommended_department + address + category`
   - Searches: `departments.embedding`
   - Returns: Top 1 match with highest similarity

3. **Fallback**: If no department is found:
   - `department_id` remains NULL
   - `department_info` still contains AI recommendation
   - Can be manually assigned later

4. **Status Field**: Consider updating status when department is assigned:
   ```python
   status = "assigned" if department_id_val else "submitted"
   ```

## Next Steps

1. **Generate Department Embeddings**:
   ```bash
   cd AgenticWorkers/QueryAnalyst
   python generate_department_embeddings.py
   ```

2. **Test with Real Grievance**:
   ```bash
   cd Platform/Server
   node test_grievance_submission.js
   ```

3. **Monitor Worker Logs**:
   ```bash
   cd AgenticWorkers/QueryAnalyst
   python worker.py
   ```
   Look for: `[Supabase] Extracted department_id: <uuid> from allocated_department`

4. **Verify in Database**:
   ```bash
   node query_grievances_simple.js --recent 1
   ```

## Troubleshooting

### Department ID Still NULL

**Possible Causes:**
1. No departments in database
2. Embeddings not generated
3. No matching department found
4. Department allocation failed

**Solutions:**
1. Check departments exist:
   ```sql
   SELECT COUNT(*) FROM departments;
   ```

2. Generate embeddings:
   ```bash
   python generate_department_embeddings.py
   ```

3. Check worker logs for errors:
   ```
   ❌ Error allocating department: ...
   ```

4. Test department allocator directly:
   ```python
   from tools.department_allocator import DepartmentAllocator
   allocator = DepartmentAllocator()
   result = allocator.allocate_department(...)
   ```

### Category Still JSON

If `category` column still contains JSON instead of string:
- Old grievances won't be updated automatically
- Only new grievances (processed after this fix) will have string values
- Can run migration to fix old records if needed

## Summary

✅ `department_id` now properly set from allocated department
✅ `category` and `sub_category` extracted as strings
✅ Foreign key relationship established
✅ Maintains backward compatibility (JSON still stored)
✅ Ready for production use
