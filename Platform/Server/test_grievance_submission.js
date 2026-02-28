/**
 * Test script to verify grievance submission with location data
 * Run with: node test_grievance_submission.js
 */

import grievanceDBService from './src/services/grievance.db.service.js';
import { query } from './src/config/database.js';

async function testGrievanceSubmission() {
    console.log('🧪 Testing Grievance Submission...\n');

    try {
        // First, get a test citizen_id
        console.log('📋 Finding a test citizen...');
        const citizenResult = await query(`
            SELECT id, full_name, phone FROM citizens LIMIT 1
        `);

        if (citizenResult.rows.length === 0) {
            console.log('❌ No citizens found in database');
            console.log('   Please register a citizen first via Telegram or web\n');
            process.exit(1);
        }

        const testCitizen = citizenResult.rows[0];
        console.log(`✅ Using citizen: ${testCitizen.full_name} (${testCitizen.phone})\n`);

        // Test grievance submission
        console.log('📤 Submitting test grievance...');
        const testGrievance = {
            citizen_id: testCitizen.id,
            grievance_text: 'Test grievance from automated test script',
            image_path: 'https://example.com/test-image.jpg',
            image_description: 'test_image.jpg',
            enhanced_query: null,
            embedding: null,
            latitude: 19.0760,
            longitude: 72.8777,
            location_address: 'Mumbai, Maharashtra, India'
        };

        const result = await grievanceDBService.submitGrievance(testGrievance);

        console.log('\n✅ SUCCESS! Grievance submitted:');
        console.log('   Grievance ID (UUID):', result.grievance_id);
        console.log('   Message:', result.message);

        // Verify the grievance was created
        console.log('\n📋 Verifying grievance in database...');
        const verifyResult = await query(`
            SELECT 
                id,
                grievance_id,
                citizen_id,
                grievance_text,
                latitude,
                longitude,
                location_address,
                created_at
            FROM usergrievance
            WHERE id = $1
        `, [result.grievance_id]);

        if (verifyResult.rows.length > 0) {
            const grievance = verifyResult.rows[0];
            console.log('✅ Grievance found in database:');
            console.log('   ID (UUID):', grievance.id);
            console.log('   Grievance ID (String):', grievance.grievance_id);
            console.log('   Citizen ID:', grievance.citizen_id);
            console.log('   Text:', grievance.grievance_text.substring(0, 50) + '...');
            console.log('   Location:', grievance.location_address);
            console.log('   Coordinates:', `${grievance.latitude}, ${grievance.longitude}`);
            console.log('   Created:', grievance.created_at);
        } else {
            console.log('❌ Grievance not found in database');
        }

        console.log('\n✅ Test completed successfully!\n');
        console.log('🎯 The grievance submission is working correctly with location data.\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ FAILED!');
        console.error('   Error:', error.message);
        
        if (error.code) {
            console.error('   Error Code:', error.code);
        }
        if (error.detail) {
            console.error('   Detail:', error.detail);
        }
        if (error.hint) {
            console.error('   Hint:', error.hint);
        }

        console.error('\n💡 Common Issues:');
        console.error('   1. Database migration not run - restart server or run migration manually');
        console.error('   2. submit_grievance function not updated - check migration logs');
        console.error('   3. grievance_id column constraint - function should generate this automatically');
        console.error('   4. No citizens in database - register via Telegram or web first\n');

        process.exit(1);
    }
}

testGrievanceSubmission();
