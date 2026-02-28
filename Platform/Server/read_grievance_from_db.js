/**
 * Script to read and display a grievance entry from the database
 * Usage: node read_grievance_from_db.js <grievance_id>
 * Example: node read_grievance_from_db.js 11655943-6c26-437f-9d11-f0a0eda3380a
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function readGrievance(grievanceId) {
  try {
    console.log('\n📋 Reading grievance from database...');
    console.log(`   Grievance ID: ${grievanceId}\n`);

    // Query the usergrievance table
    const { data, error } = await supabase
      .from('usergrievance')
      .select('*')
      .eq('id', grievanceId)
      .single();

    if (error) {
      console.error('❌ Error reading from database:', error.message);
      return;
    }

    if (!data) {
      console.log('⚠️  Grievance not found in database');
      return;
    }

    console.log('✅ Grievance found!\n');
    console.log('═'.repeat(80));
    console.log('BASIC INFORMATION');
    console.log('═'.repeat(80));
    console.log(`ID (UUID):              ${data.id}`);
    console.log(`Grievance ID (String):  ${data.grievance_id || 'Not set'}`);
    console.log(`Citizen ID:             ${data.citizen_id || 'Not set'}`);
    console.log(`Status:                 ${data.status || 'Not set'}`);
    console.log(`Priority:               ${data.priority || 'Not set'}`);
    console.log(`Created At:             ${data.created_at}`);
    console.log(`Updated At:             ${data.updated_at || 'Not set'}`);

    console.log('\n' + '═'.repeat(80));
    console.log('GRIEVANCE CONTENT');
    console.log('═'.repeat(80));
    console.log(`Text:\n${data.grievance_text || 'Not set'}`);
    
    if (data.enhanced_query) {
      console.log(`\nEnhanced Query:\n${data.enhanced_query.substring(0, 200)}...`);
    }

    console.log('\n' + '═'.repeat(80));
    console.log('LOCATION INFORMATION');
    console.log('═'.repeat(80));
    console.log(`Location:               ${data.location || 'Not set'}`);
    console.log(`Latitude:               ${data.latitude || 'Not set'}`);
    console.log(`Longitude:              ${data.longitude || 'Not set'}`);
    console.log(`Address:                ${data.address || 'Not set'}`);

    if (data.location_data) {
      console.log('\nLocation Data (JSON):');
      console.log(JSON.stringify(data.location_data, null, 2));
    }

    console.log('\n' + '═'.repeat(80));
    console.log('IMAGE INFORMATION');
    console.log('═'.repeat(80));
    console.log(`Image Path:             ${data.image_path || 'Not set'}`);
    console.log(`Image Description:      ${data.image_description ? data.image_description.substring(0, 100) + '...' : 'Not set'}`);

    if (data.image_analysis) {
      console.log('\nImage Analysis (JSON):');
      console.log(JSON.stringify(data.image_analysis, null, 2));
    }

    console.log('\n' + '═'.repeat(80));
    console.log('VALIDATION');
    console.log('═'.repeat(80));
    if (data.validation_result) {
      console.log('Validation Result:');
      console.log(JSON.stringify(data.validation_result, null, 2));
    } else {
      console.log('Validation Result:      Not set');
    }

    console.log('\n' + '═'.repeat(80));
    console.log('CATEGORY & DEPARTMENT');
    console.log('═'.repeat(80));
    console.log(`Category:               ${data.category || 'Not set'}`);
    console.log(`Sub Category:           ${data.sub_category || 'Not set'}`);
    console.log(`Department ID:          ${data.department_id || 'Not set'}`);
    console.log(`Assigned To:            ${data.assigned_to || 'Not set'}`);

    console.log('\n' + '═'.repeat(80));
    console.log('AI ANALYSIS');
    console.log('═'.repeat(80));
    
    if (data.agent_outputs) {
      console.log('Agent Outputs:');
      console.log(JSON.stringify(data.agent_outputs, null, 2));
    } else {
      console.log('Agent Outputs:          Not set');
    }

    if (data.full_result) {
      console.log('\nFull Result (Summary):');
      const summary = {
        grievance: data.full_result.grievance ? 'Present' : 'Not set',
        analysis: data.full_result.analysis ? 'Present' : 'Not set',
        department: data.full_result.department ? 'Present' : 'Not set',
        real_time_data: data.full_result.real_time_data ? 'Present' : 'Not set'
      };
      console.log(JSON.stringify(summary, null, 2));
    }

    console.log('\n' + '═'.repeat(80));
    console.log('EMBEDDING & METADATA');
    console.log('═'.repeat(80));
    console.log(`Embedding:              ${data.embedding ? `Vector (${data.embedding.length} dimensions)` : 'Not set'}`);
    console.log(`Proof File URL:         ${data.proof_file_url || 'Not set'}`);
    console.log(`Is Anonymous:           ${data.is_anonymous !== null ? data.is_anonymous : 'Not set'}`);

    console.log('\n' + '═'.repeat(80));
    console.log('RAW DATA (JSON)');
    console.log('═'.repeat(80));
    console.log(JSON.stringify(data, null, 2));
    console.log('═'.repeat(80));

    // Check if all expected fields are present
    console.log('\n📊 FIELD PRESENCE CHECK:');
    const expectedFields = [
      'id', 'grievance_id', 'citizen_id', 'grievance_text', 'status',
      'location', 'latitude', 'longitude', 'image_path', 'enhanced_query',
      'embedding', 'agent_outputs', 'full_result', 'validation_result',
      'location_data', 'image_analysis', 'category', 'department_id'
    ];

    expectedFields.forEach(field => {
      const present = data[field] !== null && data[field] !== undefined;
      const icon = present ? '✅' : '❌';
      console.log(`   ${icon} ${field.padEnd(20)} ${present ? 'Present' : 'Missing'}`);
    });

    console.log('\n✅ Read complete!\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Get grievance ID from command line argument
const grievanceId = process.argv[2];

if (!grievanceId) {
  console.error('❌ Error: Please provide a grievance ID');
  console.log('\nUsage: node read_grievance_from_db.js <grievance_id>');
  console.log('Example: node read_grievance_from_db.js 11655943-6c26-437f-9d11-f0a0eda3380a');
  process.exit(1);
}

// Run the script
readGrievance(grievanceId);
