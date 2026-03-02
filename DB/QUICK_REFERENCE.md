# Quick Reference Guide - Hierarchy Implementation

## TL;DR

✅ **What Changed**: Added proper foreign key relationships between City Officials, Ward Officers, and Department Officers

✅ **Why**: Previous schema used text fields for relationships, making queries difficult and data inconsistent

✅ **How to Use**: Run the two SQL files in order, then use the views and functions provided

## Quick Start

### 1. Apply Changes (5 minutes)
```bash
# Apply schema changes
psql -U your_user -d your_database -f DB/schema_fixes_hierarchy.sql

# Migrate existing data
psql -U your_user -d your_database -f DB/data_migration_hierarchy.sql
```

### 2. Verify (1 minute)
```sql
-- Check if everything is linked properly
SELECT * FROM public.generate_hierarchy_report();
```

### 3. Start Using (immediately)
```sql
-- Get all officers under a city commissioner
SELECT * FROM public.city_hierarchy_structure 
WHERE city = 'YourCityName';
```

## Most Common Queries

### Query 1: Get Ward Officers Under a City Commissioner
```sql
SELECT 
  wo.ward_number,
  u.full_name as ward_officer_name,
  u.email,
  u.phone
FROM ward_officers wo
JOIN users u ON wo.user_id = u.id
WHERE wo.reports_to_city_official_id = 'city-official-uuid';
```

### Query 2: Get Department Officers in a Ward
```sql
SELECT 
  u.full_name as officer_name,
  d.name as department,
  do_tbl.role,
  do_tbl.status
FROM departmentofficers do_tbl
JOIN users u ON do_tbl.user_id = u.id
JOIN departments d ON do_tbl.department_id = d.id
WHERE do_tbl.ward_id = 'ward-uuid';
```

### Query 3: Get Complete City Hierarchy
```sql
SELECT * FROM city_hierarchy_structure
WHERE city = 'Mumbai'
ORDER BY ward_number;
```

### Query 4: Find Who an Officer Reports To
```sql
SELECT * FROM get_reporting_chain('officer-uuid');
```

### Query 5: Find All Subordinates of an Officer
```sql
SELECT * FROM get_subordinates('officer-uuid');
```

## New Fields Added

### city_officials
- ✨ `city_id` - Links to cities table
- ✨ `district_id` - Links to districts table  
- ✨ `reports_to` - Links to government_officials
- ✨ `department_id` - Optional department

### ward_officers
- ✨ `city_id` - Links to cities table
- ✨ `district_id` - Links to districts table
- ✨ `ward_id` - Links to wards table
- ✨ `reports_to_city_official_id` - Links to city_officials

### departmentofficers
- ✨ `city_id` - Links to cities table
- ✨ `ward_id` - Links to wards table
- ✨ `reports_to_city_official_id` - Links to city_officials
- ✨ `reports_to_ward_officer_id` - Links to ward_officers

## New Views

| View Name | Purpose | Use When |
|-----------|---------|----------|
| `unified_official_hierarchy` | Complete recursive hierarchy | Need full org chart |
| `city_hierarchy_structure` | Flattened city structure | Need simple city view |
| `ward_officers_missing_supervisor` | Find broken links | Debugging/validation |
| `dept_officers_missing_supervisor` | Find broken links | Debugging/validation |
| `city_officials_missing_fk` | Find incomplete data | Debugging/validation |

## New Functions

| Function | Parameters | Returns | Use Case |
|----------|------------|---------|----------|
| `get_subordinates()` | official_id | All subordinates | "Who works under X?" |
| `get_reporting_chain()` | official_id | All superiors | "Who does X report to?" |
| `create_hierarchical_structure()` | state, district, city, name, email | Success/IDs | Create new city structure |
| `generate_hierarchy_report()` | none | Statistics | Check migration status |

## Validation Checklist

After migration, check these:

- [ ] All city officials have `city_id` and `district_id`
- [ ] All ward officers have `reports_to_city_official_id`
- [ ] All department officers have either `reports_to_city_official_id` OR `reports_to_ward_officer_id`
- [ ] No orphaned records (officers without supervisors)
- [ ] Hierarchy report shows expected numbers

```sql
-- Run this to check all at once
SELECT * FROM generate_hierarchy_report();
```

## Common Issues & Fixes

### Issue: "Ward officer has no supervisor"
```sql
-- Find the issue
SELECT * FROM ward_officers_missing_supervisor;

-- Fix manually
UPDATE ward_officers 
SET reports_to_city_official_id = 'correct-city-official-uuid'
WHERE id = 'ward-officer-uuid';
```

### Issue: "City name doesn't match cities table"
```sql
-- Find mismatches
SELECT DISTINCT city FROM city_officials
WHERE city_id IS NULL;

-- Fix by updating city name or creating city record
INSERT INTO cities (district_id, city_name, city_code, city_type)
VALUES ('district-uuid', 'Correct City Name', 'CCN', 'Municipal Corporation');
```

### Issue: "Department officer has no supervisor"
```sql
-- Find the issue
SELECT * FROM dept_officers_missing_supervisor;

-- Fix by linking to ward officer
UPDATE departmentofficers 
SET reports_to_ward_officer_id = 'ward-officer-uuid'
WHERE id = 'dept-officer-uuid';

-- OR link to city official
UPDATE departmentofficers 
SET reports_to_city_official_id = 'city-official-uuid'
WHERE id = 'dept-officer-uuid';
```

## API Integration Examples

### Node.js/Express Example
```javascript
// Get ward officers under a commissioner
async function getWardOfficers(cityOfficialId) {
  const result = await db.query(`
    SELECT 
      wo.id,
      u.full_name,
      wo.ward_number,
      wo.zone
    FROM ward_officers wo
    JOIN users u ON wo.user_id = u.id
    WHERE wo.reports_to_city_official_id = $1
    ORDER BY wo.ward_number
  `, [cityOfficialId]);
  
  return result.rows;
}

// Get complete city hierarchy
async function getCityHierarchy(cityName) {
  const result = await db.query(`
    SELECT * FROM city_hierarchy_structure
    WHERE city = $1
    ORDER BY ward_number, department_name
  `, [cityName]);
  
  return result.rows;
}
```

### Python Example
```python
# Get subordinates of an official
def get_subordinates(official_id):
    query = "SELECT * FROM get_subordinates(%s)"
    cursor.execute(query, (official_id,))
    return cursor.fetchall()

# Get reporting chain
def get_reporting_chain(official_id):
    query = "SELECT * FROM get_reporting_chain(%s)"
    cursor.execute(query, (official_id,))
    return cursor.fetchall()
```

## Performance Tips

1. **Use indexes**: All foreign key columns have indexes created automatically
2. **Use views**: Pre-built views are optimized for common queries
3. **Limit recursion**: When using recursive queries, add depth limits
4. **Cache results**: Hierarchy doesn't change often, cache in application layer

## Rollback Instructions

If you need to undo these changes:
```bash
psql -U your_user -d your_database -f DB/rollback_hierarchy.sql
```

## Next Steps

1. ✅ Apply schema changes
2. ✅ Migrate existing data
3. ✅ Validate with reports
4. 🔄 Update application code to use new fields
5. 🔄 Update API endpoints
6. 🔄 Update frontend to display hierarchy
7. 📝 Train team on new structure

## Support & Questions

- **Schema Issues**: Check `DB/schema_fixes_hierarchy.sql`
- **Data Issues**: Check `DB/data_migration_hierarchy.sql`
- **Detailed Docs**: Check `DB/HIERARCHY_DOCUMENTATION.md`
- **This Guide**: `DB/QUICK_REFERENCE.md`

## Summary

**Before**: Text-based relationships, hard to query, inconsistent data
```
ward_officers.city = "Mumbai" (text)
ward_officers.reporting_to = user_id (generic)
```

**After**: Proper foreign keys, easy queries, data integrity
```
ward_officers.city_id = uuid (FK to cities)
ward_officers.reports_to_city_official_id = uuid (FK to city_officials)
```

**Result**: Clean hierarchy, powerful queries, maintainable structure! 🎉
