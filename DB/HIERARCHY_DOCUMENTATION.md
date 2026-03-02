# Database Hierarchy Documentation

## Overview

This document explains the hierarchical structure implemented in the IGRS database schema, specifically focusing on the relationships between City Officials (Commissioners), Ward Officers, and Department Officers.

## Hierarchical Structure

```
State Government
    ↓
District Officials
    ↓
City Officials (City Commissioner)
    ↓
    ├── Ward Officers (Ward 1, Ward 2, ...)
    │   ↓
    │   └── Department Officers (assigned to specific wards)
    │
    └── Department Officers (city-level, not ward-specific)
```

## Database Tables

### 1. `city_officials` (City Commissioners)

**Purpose**: Stores information about city-level officials, primarily City Commissioners who oversee entire municipal corporations.

**Key Fields**:
- `id`: Primary key
- `user_id`: Links to users table
- `city_id`: **NEW** - Foreign key to cities table
- `district_id`: **NEW** - Foreign key to districts table
- `reports_to`: **NEW** - Links to government_officials table (for reporting to district/state officials)
- `department_id`: **NEW** - Optional department affiliation
- `designation`: Role title (e.g., "City Commissioner")
- `corporation_name`: Name of the municipal corporation

**Relationships**:
- Reports to: District Officials or State Officials (via `reports_to`)
- Supervises: Ward Officers (via `ward_officers.reports_to_city_official_id`)
- Supervises: City-level Department Officers (via `departmentofficers.reports_to_city_official_id`)

### 2. `ward_officers` (Ward-Level Officers)

**Purpose**: Stores information about officers responsible for specific wards within a city.

**Key Fields**:
- `id`: Primary key
- `user_id`: Links to users table
- `ward_number`: Ward identifier
- `city_id`: **NEW** - Foreign key to cities table
- `district_id`: **NEW** - Foreign key to districts table
- `ward_id`: **NEW** - Foreign key to wards table
- `reports_to_city_official_id`: **NEW** - Links to city_officials (their supervisor)
- `reporting_to`: Legacy field (kept for backward compatibility)
- `zone`: Zone within the city

**Relationships**:
- Reports to: City Officials (via `reports_to_city_official_id`)
- Supervises: Ward-level Department Officers (via `departmentofficers.reports_to_ward_officer_id`)

### 3. `departmentofficers` (Department Officers)

**Purpose**: Stores information about officers working in specific departments (e.g., Water, Roads, Sanitation).

**Key Fields**:
- `id`: Primary key
- `user_id`: Links to users table
- `department_id`: Links to departments table
- `staff_id`: Employee identifier
- `role`: Officer's role within the department
- `city_id`: **NEW** - Foreign key to cities table
- `ward_id`: **NEW** - Foreign key to wards table (if ward-specific)
- `reports_to_city_official_id`: **NEW** - Links to city_officials (for city-level officers)
- `reports_to_ward_officer_id`: **NEW** - Links to ward_officers (for ward-level officers)
- `zone`: Text field (legacy)
- `ward`: Text field (legacy)

**Relationships**:
- Reports to: Either City Officials OR Ward Officers (depending on assignment level)
- Belongs to: A specific department (via `department_id`)

### 4. `government_officials` (Unified Officials Table)

**Purpose**: Comprehensive table for all government officials with proper hierarchical structure.

**Key Fields**:
- `id`: Primary key
- `user_id`: Links to users table
- `role_id`: Links to government_roles table
- `state_id`, `district_id`, `city_id`, `ward_id`: Geographic assignment
- `department_id`: Department affiliation
- `reports_to`: Self-referencing foreign key for hierarchy
- `designation`: Official title
- `access_level`: Permission level

**Note**: This is the most comprehensive table and should be used as the primary source of truth for official hierarchies.

## Schema Changes Summary

### Added Columns

#### `city_officials`
```sql
- city_id uuid (FK to cities)
- district_id uuid (FK to districts)
- reports_to uuid (FK to government_officials)
- department_id uuid (FK to departments)
```

#### `ward_officers`
```sql
- city_id uuid (FK to cities)
- district_id uuid (FK to districts)
- ward_id uuid (FK to wards)
- reports_to_city_official_id uuid (FK to city_officials)
```

#### `departmentofficers`
```sql
- city_id uuid (FK to cities)
- ward_id uuid (FK to wards)
- reports_to_city_official_id uuid (FK to city_officials)
- reports_to_ward_officer_id uuid (FK to ward_officers)
```

## Views Created

### 1. `unified_official_hierarchy`

Recursive view showing the complete official hierarchy with levels and chains.

**Usage**:
```sql
SELECT * FROM public.unified_official_hierarchy
WHERE city_id = 'some-city-uuid'
ORDER BY hierarchy_level;
```

**Returns**:
- Complete hierarchy path
- Hierarchy level (1 = top, 2 = reports to top, etc.)
- Full chain of command as text

### 2. `city_hierarchy_structure`

Flattened view showing City Commissioner → Ward Officers → Department Officers structure.

**Usage**:
```sql
SELECT * FROM public.city_hierarchy_structure
WHERE city = 'Mumbai'
ORDER BY ward_number, department_name;
```

**Returns**:
- City official information
- Ward officer information (if applicable)
- Department officer information
- Complete reporting structure in one row

### 3. Validation Views

- `ward_officers_missing_supervisor`: Ward officers without city official link
- `dept_officers_missing_supervisor`: Department officers without supervisor link
- `city_officials_missing_fk`: City officials without proper foreign keys

## Functions Created

### 1. `get_subordinates(official_id uuid)`

Returns all direct and indirect subordinates of a given official.

**Usage**:
```sql
SELECT * FROM public.get_subordinates('city-official-uuid');
```

**Returns**:
- subordinate_id
- subordinate_name
- subordinate_designation
- subordinate_level
- hierarchy_depth (1 = direct report, 2 = report's report, etc.)

### 2. `get_reporting_chain(official_id uuid)`

Returns the complete reporting chain from an official up to top management.

**Usage**:
```sql
SELECT * FROM public.get_reporting_chain('ward-officer-uuid');
```

**Returns**:
- superior_id
- superior_name
- superior_designation
- superior_level
- chain_position (0 = immediate supervisor, 1 = supervisor's supervisor, etc.)

### 3. `create_hierarchical_structure(...)`

Helper function to create a complete hierarchical structure (state → district → city → commissioner).

**Usage**:
```sql
SELECT public.create_hierarchical_structure(
  'Maharashtra',
  'Mumbai',
  'Mumbai',
  'John Doe',
  'john.doe@mumbai.gov.in'
);
```

### 4. `generate_hierarchy_report()`

Generates a summary report of the hierarchy setup.

**Usage**:
```sql
SELECT * FROM public.generate_hierarchy_report();
```

## Migration Steps

### Step 1: Apply Schema Changes
```bash
psql -U your_user -d your_database -f DB/schema_fixes_hierarchy.sql
```

### Step 2: Migrate Existing Data
```bash
psql -U your_user -d your_database -f DB/data_migration_hierarchy.sql
```

### Step 3: Validate Migration
```sql
-- Check for missing links
SELECT * FROM public.ward_officers_missing_supervisor;
SELECT * FROM public.dept_officers_missing_supervisor;
SELECT * FROM public.city_officials_missing_fk;

-- Generate report
SELECT * FROM public.generate_hierarchy_report();
```

## Query Examples

### Example 1: Get all ward officers under a city commissioner
```sql
SELECT 
  wo.id,
  u.full_name as ward_officer_name,
  wo.ward_number,
  co_user.full_name as reports_to_commissioner
FROM public.ward_officers wo
JOIN public.users u ON wo.user_id = u.id
JOIN public.city_officials co ON wo.reports_to_city_official_id = co.id
JOIN public.users co_user ON co.user_id = co_user.id
WHERE co.id = 'city-official-uuid';
```

### Example 2: Get all department officers in a ward
```sql
SELECT 
  do_tbl.id,
  u.full_name as officer_name,
  do_tbl.staff_id,
  d.name as department,
  wo_user.full_name as reports_to_ward_officer
FROM public.departmentofficers do_tbl
JOIN public.users u ON do_tbl.user_id = u.id
JOIN public.departments d ON do_tbl.department_id = d.id
LEFT JOIN public.ward_officers wo ON do_tbl.reports_to_ward_officer_id = wo.id
LEFT JOIN public.users wo_user ON wo.user_id = wo_user.id
WHERE do_tbl.ward_id = 'ward-uuid';
```

### Example 3: Get complete hierarchy for a city
```sql
SELECT * FROM public.city_hierarchy_structure
WHERE city = 'Mumbai'
ORDER BY ward_number, department_name;
```

### Example 4: Find all officers reporting to a specific official
```sql
SELECT * FROM public.get_subordinates('official-uuid')
ORDER BY hierarchy_depth, subordinate_name;
```

### Example 5: Get reporting chain for an officer
```sql
SELECT * FROM public.get_reporting_chain('officer-uuid')
ORDER BY chain_position;
```

## Best Practices

1. **Always use foreign keys**: Use the new `*_id` fields instead of text fields for relationships
2. **Maintain consistency**: When creating new officials, ensure proper linking in the hierarchy
3. **Use views for queries**: Leverage the created views for complex hierarchical queries
4. **Validate regularly**: Run validation views to check for missing links
5. **Use functions**: Utilize the helper functions for common hierarchical operations

## Troubleshooting

### Issue: Ward officers not showing under city commissioner
**Solution**: Check if `reports_to_city_official_id` is set:
```sql
SELECT * FROM public.ward_officers_missing_supervisor;
```

### Issue: Department officers not linked to supervisors
**Solution**: Check if either `reports_to_city_official_id` or `reports_to_ward_officer_id` is set:
```sql
SELECT * FROM public.dept_officers_missing_supervisor;
```

### Issue: Text fields don't match foreign key tables
**Solution**: Run the data migration script to populate foreign keys from text fields:
```bash
psql -U your_user -d your_database -f DB/data_migration_hierarchy.sql
```

## Future Enhancements

1. Add triggers to automatically maintain hierarchy consistency
2. Implement role-based access control based on hierarchy
3. Add audit logging for hierarchy changes
4. Create dashboard views for hierarchy visualization
5. Implement automatic escalation based on hierarchy

## Support

For questions or issues with the hierarchy implementation, please refer to:
- Schema file: `DB/schema_fixes_hierarchy.sql`
- Migration file: `DB/data_migration_hierarchy.sql`
- This documentation: `DB/HIERARCHY_DOCUMENTATION.md`
