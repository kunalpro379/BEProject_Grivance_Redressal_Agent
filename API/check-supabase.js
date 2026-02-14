const { Pool } = require('pg');
require('dotenv').config();

async function checkSupabase() {
    console.log('🔍 Checking Supabase Database\n');

    const pool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: { rejectUnauthorized: false }
    });

    try {
        // Check existing tables
        console.log('📊 Existing Tables:');
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);
        
        if (tables.rows.length === 0) {
            console.log('   (none)\n');
        } else {
            tables.rows.forEach(row => {
                console.log(`   - ${row.table_name}`);
            });
            console.log('');
        }

        // Check existing types
        console.log('🏷️  Existing Types:');
        const types = await pool.query(`
            SELECT typname 
            FROM pg_type 
            WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
            AND typtype = 'e'
            ORDER BY typname
        `);
        
        if (types.rows.length === 0) {
            console.log('   (none)\n');
        } else {
            types.rows.forEach(row => {
                console.log(`   - ${row.typname}`);
            });
            console.log('');
        }

        // Check existing functions
        console.log('⚙️  Existing Functions:');
        const functions = await pool.query(`
            SELECT routine_name 
            FROM information_schema.routines 
            WHERE routine_schema = 'public'
            AND routine_type = 'FUNCTION'
            ORDER BY routine_name
        `);
        
        if (functions.rows.length === 0) {
            console.log('   (none)\n');
        } else {
            functions.rows.forEach(row => {
                console.log(`   - ${row.routine_name}()`);
            });
            console.log('');
        }

        console.log('✅ Database check complete\n');
        console.log('Options:');
        console.log('  1. Run: node clean-supabase.js (to clean existing schema)');
        console.log('  2. Run: npm run migrate:supabase (to create new schema)\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkSupabase();
