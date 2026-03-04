/**
 * Verify that grievances have proper location data for the map
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../Server/.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function verifyMapData() {
  const client = await pool.connect();
  
  try {
    console.log('\n🗺️  Verifying Map Data...\n');
    
    // Check what the map endpoint returns
    const result = await client.query(`
      SELECT 
        ug.id,
        ug.grievance_id,
        COALESCE(gp.grievance_text, ug.full_result->>'grievance_text', 'No description') as title,
        ug.status,
        ug.priority,
        COALESCE(gp.location_address, ug.full_result->>'location_address') as location,
        COALESCE(gp.latitude, (ug.full_result->>'latitude')::numeric) as lat,
        COALESCE(gp.longitude, (ug.full_result->>'longitude')::numeric) as lng,
        ug.created_at,
        c.full_name as citizen_name,
        u.full_name as officer_name
      FROM usergrievance ug
      LEFT JOIN grievance_processed gp ON ug.grievance_id = gp.grievance_id
      LEFT JOIN citizens c ON ug.citizen_id = c.id
      LEFT JOIN users u ON ug.assigned_officer_id = u.id
      WHERE (gp.latitude IS NOT NULL OR (ug.full_result->>'latitude') IS NOT NULL)
      ORDER BY ug.created_at DESC
      LIMIT 20
    `);
    
    console.log(`📊 Found ${result.rows.length} grievances with coordinates\n`);
    
    if (result.rows.length === 0) {
      console.log('❌ No grievances with coordinates found!');
      return;
    }
    
    // Check for coordinate diversity
    const uniqueCoords = new Set();
    const coordCounts = {};
    
    result.rows.forEach(row => {
      const coord = `${row.lat},${row.lng}`;
      uniqueCoords.add(coord);
      coordCounts[coord] = (coordCounts[coord] || 0) + 1;
    });
    
    console.log(`📍 Unique coordinate pairs: ${uniqueCoords.size} out of ${result.rows.length}`);
    console.log(`   Diversity: ${((uniqueCoords.size / result.rows.length) * 100).toFixed(1)}%\n`);
    
    // Show sample coordinates
    console.log('📋 Sample coordinates:\n');
    result.rows.slice(0, 10).forEach((row, i) => {
      console.log(`${i + 1}. ${row.grievance_id}`);
      console.log(`   Lat: ${row.lat}, Lng: ${row.lng}`);
      console.log(`   Location: ${row.location?.substring(0, 60)}...`);
      console.log(`   Priority: ${row.priority}, Status: ${row.status}\n`);
    });
    
    // Check for clustering (same coordinates)
    const duplicates = Object.entries(coordCounts).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      console.log('⚠️  Duplicate coordinates found:');
      duplicates.forEach(([coord, count]) => {
        console.log(`   ${coord}: ${count} grievances`);
      });
      console.log('');
    }
    
    // Check coordinate ranges
    const lats = result.rows.map(r => Number(r.lat)).filter(l => !isNaN(l));
    const lngs = result.rows.map(r => Number(r.lng)).filter(l => !isNaN(l));
    
    if (lats.length > 0 && lngs.length > 0) {
      console.log('📐 Coordinate ranges:');
      console.log(`   Latitude:  ${Math.min(...lats).toFixed(4)} to ${Math.max(...lats).toFixed(4)}`);
      console.log(`   Longitude: ${Math.min(...lngs).toFixed(4)} to ${Math.max(...lngs).toFixed(4)}`);
      console.log(`   Spread: ${(Math.max(...lats) - Math.min(...lats)).toFixed(4)}° lat, ${(Math.max(...lngs) - Math.min(...lngs)).toFixed(4)}° lng\n`);
    }
    
    // Check if coordinates are in Ambernath range
    const ambernathLat = [19.17, 19.23];
    const ambernathLng = [73.16, 73.21];
    
    const inRange = result.rows.filter(r => {
      const lat = Number(r.lat);
      const lng = Number(r.lng);
      return lat >= ambernathLat[0] && lat <= ambernathLat[1] &&
             lng >= ambernathLng[0] && lng <= ambernathLng[1];
    });
    
    console.log(`🎯 Coordinates in Ambernath range: ${inRange.length}/${result.rows.length} (${((inRange.length/result.rows.length)*100).toFixed(1)}%)`);
    
    if (inRange.length < result.rows.length) {
      console.log('\n⚠️  Some coordinates are outside Ambernath area!');
      const outside = result.rows.filter(r => {
        const lat = Number(r.lat);
        const lng = Number(r.lng);
        return !(lat >= ambernathLat[0] && lat <= ambernathLat[1] &&
                 lng >= ambernathLng[0] && lng <= ambernathLng[1]);
      });
      console.log('   Outside coordinates:');
      outside.slice(0, 5).forEach(r => {
        console.log(`   - ${r.grievance_id}: ${r.lat}, ${r.lng}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyMapData();
