/**
 * Test script to verify grievance map data endpoint
 * Tests that the API returns grievances with location data
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:4000';

async function testMapData() {
  console.log('🗺️  Testing Grievance Map Data Endpoint\n');
  console.log('=' .repeat(60));

  try {
    // You'll need to replace this with a valid token
    // Get it from browser localStorage after logging in
    const token = process.env.TEST_TOKEN || 'YOUR_ACCESS_TOKEN_HERE';

    if (token === 'YOUR_ACCESS_TOKEN_HERE') {
      console.log('⚠️  Please set TEST_TOKEN in .env file or replace in script');
      console.log('   Get token from browser localStorage after logging in');
      console.log('   localStorage.getItem("accessToken")');
      return;
    }

    console.log('📡 Fetching grievances from API...\n');

    const response = await axios.get(`${API_URL}/api/grievances`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const grievances = response.data.grievances || [];
    console.log(`✅ API Response: ${grievances.length} total grievances\n`);

    // Filter grievances with valid coordinates
    const withCoordinates = grievances.filter(g => 
      g.latitude && g.longitude && 
      !isNaN(g.latitude) && !isNaN(g.longitude) &&
      g.latitude >= -90 && g.latitude <= 90 &&
      g.longitude >= -180 && g.longitude <= 180
    );

    console.log(`📍 Grievances with valid coordinates: ${withCoordinates.length}\n`);

    if (withCoordinates.length === 0) {
      console.log('⚠️  No grievances with valid coordinates found!');
      console.log('   Make sure QueryAnalyst is extracting location data.');
      return;
    }

    // Show sample data
    console.log('📋 Sample Grievance Data:\n');
    const sample = withCoordinates[0];
    console.log(`   ID: ${sample.grievance_id}`);
    console.log(`   Status: ${sample.status}`);
    console.log(`   Priority: ${sample.priority || 'N/A'}`);
    console.log(`   Category: ${sample.category || 'N/A'}`);
    console.log(`   Location: ${sample.location_address || 'N/A'}`);
    console.log(`   Coordinates: ${sample.latitude}, ${sample.longitude}`);
    console.log(`   Created: ${new Date(sample.created_at).toLocaleString()}`);

    // Statistics
    console.log('\n📊 Statistics:\n');

    const byStatus = {};
    const byPriority = {};
    const byCategory = {};

    withCoordinates.forEach(g => {
      const status = g.status || 'unknown';
      const priority = g.priority || 'medium';
      const category = g.category || 'Other';

      byStatus[status] = (byStatus[status] || 0) + 1;
      byPriority[priority] = (byPriority[priority] || 0) + 1;
      byCategory[category] = (byCategory[category] || 0) + 1;
    });

    console.log('   By Status:');
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`     - ${status}: ${count}`);
    });

    console.log('\n   By Priority:');
    Object.entries(byPriority).forEach(([priority, count]) => {
      console.log(`     - ${priority}: ${count}`);
    });

    console.log('\n   By Category:');
    Object.entries(byCategory).forEach(([category, count]) => {
      console.log(`     - ${category}: ${count}`);
    });

    // Check for required fields
    console.log('\n🔍 Field Validation:\n');
    const requiredFields = [
      'id', 'grievance_id', 'latitude', 'longitude', 'status', 
      'priority', 'category', 'created_at'
    ];

    const missingFields = {};
    withCoordinates.forEach(g => {
      requiredFields.forEach(field => {
        if (!g[field]) {
          missingFields[field] = (missingFields[field] || 0) + 1;
        }
      });
    });

    if (Object.keys(missingFields).length === 0) {
      console.log('   ✅ All required fields present');
    } else {
      console.log('   ⚠️  Some grievances missing fields:');
      Object.entries(missingFields).forEach(([field, count]) => {
        console.log(`     - ${field}: ${count} grievances missing`);
      });
    }

    // Coordinate bounds
    console.log('\n🌍 Coordinate Bounds:\n');
    const lats = withCoordinates.map(g => g.latitude);
    const lngs = withCoordinates.map(g => g.longitude);
    
    console.log(`   Latitude: ${Math.min(...lats).toFixed(4)} to ${Math.max(...lats).toFixed(4)}`);
    console.log(`   Longitude: ${Math.min(...lngs).toFixed(4)} to ${Math.max(...lngs).toFixed(4)}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Map data test completed successfully!');
    console.log('\n🎯 Next Steps:');
    console.log('   1. Start frontend: cd Platform/IGRS-portal && npm run dev');
    console.log('   2. Login to the portal');
    console.log('   3. Navigate to /government/{id}/map or /citizen/{id}/map');
    console.log('   4. Verify markers appear on the map');

  } catch (error) {
    console.error('\n❌ Error testing map data:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data?.error || error.response.statusText}`);
    } else {
      console.error(`   ${error.message}`);
    }
    console.log('\n💡 Troubleshooting:');
    console.log('   - Make sure the server is running (npm run dev)');
    console.log('   - Check if TEST_TOKEN is valid in .env');
    console.log('   - Verify you have permission to view grievances');
  }
}

// Run the test
testMapData();
