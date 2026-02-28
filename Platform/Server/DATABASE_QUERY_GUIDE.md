# Database Query Guide

## Scripts Available

### 1. read_grievance_from_db.js
Simple script to read a single grievance by UUID with full details.

**Usage:**
```bash
node read_grievance_from_db.js <uuid>
```

**Example:**
```bash
node read_grievance_from_db.js 11655943-6c26-437f-9d11-f0a0eda3380a
```

**Output:**
- Complete grievance details
- All fields displayed in organized sections
- Field presence checklist
- Raw JSON data

---

### 2. query_grievances.js
Advanced query tool with multiple search options.

**Usage:**

#### Read by UUID
```bash
node query_grievances.js <uuid>
```

#### Read by String ID (e.g., GRV-20260228-778302)
```bash
node query_grievances.js --string <grievance_id>
```

#### List all grievances by citizen
```bash
node query_grievances.js --citizen <citizen_id>
```

#### List recent grievances
```bash
node query_grievances.js --recent [limit]
```

#### List by status
```bash
node query_grievances.js --status <status>
```

**Examples:**
```bash
# Read specific grievance
node query_grievances.js 11655943-6c26-437f-9d11-f0a0eda3380a

# Read by string ID
node query_grievances.js --string GRV-20260228-778302

# List all grievances for a citizen
node query_grievances.js --citizen b8b710a2-9ec9-4c44-b173-c6704d5deac1

# List 5 most recent grievances
node query_grievances.js --recent 5

# List all pending grievances
node query_grievances.js --status pending

# List all grievances being analyzed
node query_grievances.js --status QueryAnalyst
```

---

## Quick Commands for Your Test Grievance

Based on your test output:

```bash
# Read by UUID
node query_grievances.js 11655943-6c26-437f-9d11-f0a0eda3380a

# Read by string ID
node query_grievances.js --string GRV-20260228-778302

# List all grievances for this citizen
node query_grievances.js --citizen b8b710a2-9ec9-4c44-b173-c6704d5deac1
```

---

## What Each Script Shows

### read_grievance_from_db.js
Shows complete details including:
- ✅ Basic information (ID, status, priority, dates)
- ✅ Grievance content (text, enhanced query)
- ✅ Location information (coordinates, address, location_data JSON)
- ✅ Image information (path, description, image_analysis JSON)
- ✅ Validation result
- ✅ Category & department
- ✅ AI analysis (agent_outputs, full_result)
- ✅ Embedding & metadata
- ✅ Raw JSON data
- ✅ Field presence checklist

### query_grievances.js
Shows organized view with:
- 📋 Summary view for lists
- 📌 Detailed view for single grievance
- 📍 Location data with landmarks
- 🖼️ Image analysis details
- ✅ Validation status
- 🏢 Category & department allocation
- 🤖 AI analysis summary
- 🔢 Metadata

---

## Troubleshooting

### "Grievance not found"
- Verify the UUID is correct
- Check if the grievance was actually created
- Try listing recent grievances to see what's in the database

### "Error: SUPABASE_URL not set"
- Make sure you're in the Platform/Server directory
- Check that .env file exists and has SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

### "Permission denied"
- Ensure SUPABASE_SERVICE_ROLE_KEY is set (not just the anon key)
- Check that the service role key has read permissions

---

## Common Queries

### Check if grievance was processed by AI
```bash
node query_grievances.js <uuid>
# Look for:
# - ✅ Agent Outputs: Present
# - ✅ Full Result: Present
# - ✅ Embedding: Present
```

### Find grievances waiting for AI processing
```bash
node query_grievances.js --status QueryAnalyst
```

### Find grievances being web crawled
```bash
node query_grievances.js --status WebCrawling
```

### See all your test grievances
```bash
node query_grievances.js --citizen b8b710a2-9ec9-4c44-b173-c6704d5deac1
```

---

## Field Checklist

When viewing a grievance, check for these key fields:

**Basic Fields:**
- ✅ id (UUID)
- ✅ grievance_id (String like GRV-20260228-778302)
- ✅ citizen_id
- ✅ grievance_text
- ✅ status

**Location Fields:**
- ✅ location (string)
- ✅ latitude
- ✅ longitude
- ✅ address
- ✅ location_data (JSON with landmarks, area_type, confidence)

**Image Fields:**
- ✅ image_path
- ✅ image_description
- ✅ image_analysis (JSON with scene_type, key_objects, extracted_text)

**AI Processing Fields:**
- ✅ enhanced_query (LLM-described version)
- ✅ validation_result (image-query match validation)
- ✅ agent_outputs (all AI agent analysis)
- ✅ full_result (complete analysis with department allocation)
- ✅ embedding (vector for semantic search)

**Department Fields:**
- ✅ category
- ✅ sub_category
- ✅ department_id
- ✅ full_result.department.allocated_department (from Supabase search)

---

## Tips

1. **Use query_grievances.js for quick checks**
   - Faster and more organized output
   - Good for checking multiple grievances

2. **Use read_grievance_from_db.js for debugging**
   - Shows complete raw JSON
   - Includes field presence checklist
   - Better for troubleshooting missing data

3. **Check recent grievances regularly**
   ```bash
   node query_grievances.js --recent 10
   ```

4. **Monitor processing status**
   ```bash
   node query_grievances.js --status QueryAnalyst
   node query_grievances.js --status WebCrawling
   node query_grievances.js --status completed
   ```
