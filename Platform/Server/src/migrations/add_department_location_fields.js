/**
 * Migration: Add location and contact fields to departments table
 * 
 * Adds columns required by QueryAnalyst department allocation:
 * - latitude, longitude: For geographic distance calculation
 * - contact_information: JSONB for phone, email, etc.
 * - jurisdiction: Text description of coverage area
 */

const { Pool } = require('pg');
require('dotenv').config();

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 Starting migration: add_department_location_fields');
    
    // Add missing columns
    await pool.query(`
      ALTER TABLE departments 
      ADD COLUMN IF NOT EXISTS latitude NUMERIC,
      ADD COLUMN IF NOT EXISTS longitude NUMERIC,
      ADD COLUMN IF NOT EXISTS contact_information JSONB,
      ADD COLUMN IF NOT EXISTS jurisdiction TEXT;
    `);
    
    console.log('✅ Added columns: latitude, longitude, contact_information, jurisdiction');
    
    // Create index for faster geographic queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_departments_location 
      ON departments(latitude, longitude) 
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
    `);
    
    console.log('✅ Created index: idx_departments_location');
    
    // Create index for embedding search (if not exists)
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_departments_embedding 
        ON departments USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
      `);
      console.log('✅ Created index: idx_departments_embedding');
    } catch (err) {
      if (err.message.includes('does not exist')) {
        console.log('⚠️  Skipping embedding index (pgvector extension not installed)');
      } else {
        throw err;
      }
    }
    
    // Verify columns exist
    const result = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'departments'
        AND column_name IN ('latitude', 'longitude', 'contact_information', 'jurisdiction')
      ORDER BY column_name;
    `);
    
    console.log('\n📋 Verified columns:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Check how many departments need location data
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_departments,
        COUNT(latitude) as with_latitude,
        COUNT(longitude) as with_longitude,
        COUNT(contact_information) as with_contact,
        COUNT(jurisdiction) as with_jurisdiction
      FROM departments;
    `);
    
    console.log('\n📊 Department data status:');
    const s = stats.rows[0];
    console.log(`   Total departments: ${s.total_departments}`);
    console.log(`   With latitude: ${s.with_latitude} (${s.total_departments - s.with_latitude} missing)`);
    console.log(`   With longitude: ${s.with_longitude} (${s.total_departments - s.with_longitude} missing)`);
    console.log(`   With contact_information: ${s.with_contact} (${s.total_departments - s.with_contact} missing)`);
    console.log(`   With jurisdiction: ${s.with_jurisdiction} (${s.total_departments - s.with_jurisdiction} missing)`);
    
    if (s.total_departments > 0 && s.with_latitude === '0') {
      console.log('\n⚠️  WARNING: No departments have location data!');
      console.log('   Run the populate_department_locations.js script to add coordinates.');
    }
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration
if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = migrate;
