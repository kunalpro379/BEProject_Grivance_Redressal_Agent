/**
 * Simple script to query grievances using existing database service
 * 
 * Usage:
 *   node query_grievances_simple.js <uuid>                    - Read by UUID
 *   node query_grievances_simple.js --string <grievance_id>   - Read by string ID
 *   node query_grievances_simple.js --citizen <citizen_id>    - List by citizen
 *   node query_grievances_simple.js --recent [limit]          - List recent
 */

import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

function displayGrievanceSummary(data) {
  console.log('\n' + '─'.repeat(80));
  console.log(`📋 ${data.grievance_id || data.id}`);
  console.log('─'.repeat(80));
  console.log(`UUID:        ${data.id}`);
  console.log(`Citizen:     ${data.citizen_id || 'Not set'}`);
  console.log(`Status:      ${data.status || 'Not set'}`);
  console.log(`Priority:    ${data.priority || 'Not set'}`);
  console.log(`Location:    ${data.location || 'Not set'}`);
  console.log(`Coords:      ${data.latitude || 'N/A'}, ${data.longitude || 'N/A'}`);
  console.log(`Created:     ${data.created_at}`);
  console.log(`Text:        ${(data.grievance_text || '').substring(0, 80)}...`);
  
  // Check key fields
  const fields = {
    'Enhanced Query': !!data.enhanced_query,
    'Image': !!data.image_path,
    'Location Data': !!data.location_data,
    'Validation': !!data.validation_result,
    'Agent Outputs': !!data.agent_outputs,
    'Full Result': !!data.full_result,
    'Embedding': !!data.embedding,
    'Department': !!data.department_id
  };
  
  console.log('\nFields Present:');
  Object.entries(fields).forEach(([name, present]) => {
    console.log(`   ${present ? '✅' : '❌'} ${name}`);
  });
}

function displayDetailedGrievance(data) {
  console.log('\n' + '═'.repeat(80));
  console.log('DETAILED GRIEVANCE VIEW');
  console.log('═'.repeat(80));
  
  console.log('\n📌 BASIC INFO');
  console.log(`   UUID:              ${data.id}`);
  console.log(`   Grievance ID:      ${data.grievance_id || 'Not set'}`);
  console.log(`   Citizen ID:        ${data.citizen_id || 'Not set'}`);
  console.log(`   Status:            ${data.status || 'Not set'}`);
  console.log(`   Priority:          ${data.priority || 'Not set'}`);
  console.log(`   Created:           ${data.created_at}`);
  console.log(`   Updated:           ${data.updated_at || 'Not set'}`);
  
  console.log('\n📝 CONTENT');
  console.log(`   Text:              ${data.grievance_text || 'Not set'}`);
  if (data.enhanced_query) {
    console.log(`   Enhanced Query:    ${data.enhanced_query.substring(0, 150)}...`);
  }
  
  console.log('\n📍 LOCATION');
  console.log(`   Location:          ${data.location || 'Not set'}`);
  console.log(`   Address:           ${data.address || 'Not set'}`);
  console.log(`   Latitude:          ${data.latitude || 'Not set'}`);
  console.log(`   Longitude:         ${data.longitude || 'Not set'}`);
  
  if (data.location_data) {
    console.log('\n   Location Data:');
    console.log(`      Address:        ${data.location_data.address || 'N/A'}`);
    console.log(`      Landmarks:      ${data.location_data.landmarks?.join(', ') || 'N/A'}`);
    console.log(`      Area Type:      ${data.location_data.area_type || 'N/A'}`);
    console.log(`      Confidence:     ${data.location_data.confidence || 'N/A'}`);
  }
  
  console.log('\n🖼️  IMAGE');
  console.log(`   Image Path:        ${data.image_path || 'Not set'}`);
  console.log(`   Description:       ${data.image_description ? data.image_description.substring(0, 100) + '...' : 'Not set'}`);
  
  if (data.image_analysis) {
    console.log('\n   Image Analysis:');
    console.log(`      Scene Type:     ${data.image_analysis.scene_type || 'N/A'}`);
    console.log(`      Key Objects:    ${data.image_analysis.key_objects?.join(', ') || 'N/A'}`);
    console.log(`      Extracted Text: ${data.image_analysis.extracted_text || 'N/A'}`);
  }
  
  console.log('\n✅ VALIDATION');
  if (data.validation_result) {
    console.log(`   Is Valid:          ${data.validation_result.is_valid}`);
    console.log(`   Score:             ${data.validation_result.validation_score}`);
    console.log(`   Confidence:        ${data.validation_result.confidence || 'N/A'}`);
    console.log(`   Reasoning:         ${data.validation_result.reasoning?.substring(0, 100) || 'N/A'}...`);
  } else {
    console.log('   Not validated yet');
  }
  
  console.log('\n🏢 CATEGORY & DEPARTMENT');
  console.log(`   Category:          ${data.category || 'Not set'}`);
  console.log(`   Sub Category:      ${data.sub_category || 'Not set'}`);
  console.log(`   Department ID:     ${data.department_id || 'Not set'}`);
  console.log(`   Assigned To:       ${data.assigned_to || 'Not set'}`);
  
  console.log('\n🤖 AI ANALYSIS');
  if (data.agent_outputs) {
    const outputs = data.agent_outputs;
    console.log(`   Query Type:        ${outputs.query_type?.query_type || 'N/A'}`);
    console.log(`   Emotion:           ${outputs.emotion?.primary_emotion || 'N/A'}`);
    console.log(`   Severity:          ${outputs.severity?.severity_level || 'N/A'}`);
    console.log(`   Priority:          ${outputs.sentiment_priority?.priority_level || 'N/A'}`);
    console.log(`   Fraud Risk:        ${outputs.fraud?.fraud_risk || 'N/A'}`);
  } else {
    console.log('   Not analyzed yet');
  }
  
  if (data.full_result) {
    console.log('\n📊 FULL RESULT');
    if (data.full_result.department?.allocated_department) {
      const dept = data.full_result.department.allocated_department;
      console.log(`   Allocated Dept:    ${dept.name || 'N/A'}`);
      console.log(`   Dept ID:           ${dept.id || 'N/A'}`);
      console.log(`   Match Score:       ${dept.match_score || 'N/A'}`);
    }
    if (data.full_result.real_time_data?.search_results) {
      const searchCount = Object.keys(data.full_result.real_time_data.search_results).length;
      console.log(`   Real-time Searches: ${searchCount} queries`);
    }
  }
  
  console.log('\n🔢 METADATA');
  console.log(`   Embedding:         ${data.embedding ? `Present (vector)` : 'Not set'}`);
  console.log(`   Proof File:        ${data.proof_file_url || 'Not set'}`);
  console.log(`   Is Anonymous:      ${data.is_anonymous !== null ? data.is_anonymous : 'Not set'}`);
  
  console.log('\n' + '═'.repeat(80));
}

async function readByUUID(uuid) {
  console.log(`\n🔍 Reading grievance by UUID: ${uuid}`);
  
  const result = await pool.query(
    'SELECT * FROM usergrievance WHERE id = $1',
    [uuid]
  );
  
  if (result.rows.length === 0) {
    console.log('⚠️  Grievance not found');
    return;
  }
  
  displayDetailedGrievance(result.rows[0]);
}

async function readByStringId(grievanceId) {
  console.log(`\n🔍 Reading grievance by string ID: ${grievanceId}`);
  
  const result = await pool.query(
    'SELECT * FROM usergrievance WHERE grievance_id = $1',
    [grievanceId]
  );
  
  if (result.rows.length === 0) {
    console.log('⚠️  Grievance not found');
    return;
  }
  
  displayDetailedGrievance(result.rows[0]);
}

async function listByCitizen(citizenId) {
  console.log(`\n🔍 Listing grievances for citizen: ${citizenId}`);
  
  const result = await pool.query(
    'SELECT * FROM usergrievance WHERE citizen_id = $1 ORDER BY created_at DESC',
    [citizenId]
  );
  
  if (result.rows.length === 0) {
    console.log('⚠️  No grievances found for this citizen');
    return;
  }
  
  console.log(`\n✅ Found ${result.rows.length} grievance(s):`);
  result.rows.forEach(displayGrievanceSummary);
}

async function listRecent(limit = 10) {
  console.log(`\n🔍 Listing ${limit} most recent grievances`);
  
  const result = await pool.query(
    'SELECT * FROM usergrievance ORDER BY created_at DESC LIMIT $1',
    [limit]
  );
  
  if (result.rows.length === 0) {
    console.log('⚠️  No grievances found');
    return;
  }
  
  console.log(`\n✅ Found ${result.rows.length} grievance(s):`);
  result.rows.forEach(displayGrievanceSummary);
}

async function listByStatus(status) {
  console.log(`\n🔍 Listing grievances with status: ${status}`);
  
  const result = await pool.query(
    'SELECT * FROM usergrievance WHERE status = $1 ORDER BY created_at DESC',
    [status]
  );
  
  if (result.rows.length === 0) {
    console.log('⚠️  No grievances found with this status');
    return;
  }
  
  console.log(`\n✅ Found ${result.rows.length} grievance(s):`);
  result.rows.forEach(displayGrievanceSummary);
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
📋 Grievance Query Tool

Usage:
  node query_grievances_simple.js <uuid>                    - Read by UUID
  node query_grievances_simple.js --string <grievance_id>   - Read by string ID
  node query_grievances_simple.js --citizen <citizen_id>    - List by citizen
  node query_grievances_simple.js --recent [limit]          - List recent (default: 10)
  node query_grievances_simple.js --status <status>         - List by status

Examples:
  node query_grievances_simple.js 11655943-6c26-437f-9d11-f0a0eda3380a
  node query_grievances_simple.js --string GRV-20260228-778302
  node query_grievances_simple.js --citizen b8b710a2-9ec9-4c44-b173-c6704d5deac1
  node query_grievances_simple.js --recent 5
  node query_grievances_simple.js --status pending
  `);
  process.exit(0);
}

// Route to appropriate function
(async () => {
  try {
    const command = args[0];
    
    if (command === '--string') {
      await readByStringId(args[1]);
    } else if (command === '--citizen') {
      await listByCitizen(args[1]);
    } else if (command === '--recent') {
      const limit = parseInt(args[1]) || 10;
      await listRecent(limit);
    } else if (command === '--status') {
      await listByStatus(args[1]);
    } else {
      // Assume it's a UUID
      await readByUUID(command);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
})();
