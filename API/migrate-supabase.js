const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

async function runSupabaseMigration() {
    console.log('🚀 Supabase Database Migration\n');
    console.log('=' .repeat(50) + '\n');

    const pool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: { rejectUnauthorized: false }
    });

    try {
        // Test connection
        console.log('1️⃣ Testing Supabase connection...');
        const versionResult = await pool.query('SELECT version()');
        console.log('✅ Connected to Supabase PostgreSQL');
        console.log(`   ${versionResult.rows[0].version.split(',')[0]}\n`);

        // Read SQL files
        const dbSqlPath = path.join(__dirname, '../Platform/Server/DB.sql');
        const functionsSqlPath = path.join(__dirname, '../Platform/Server/functions.sql');

        if (!fs.existsSync(dbSqlPath)) {
            throw new Error(`DB.sql not found at: ${dbSqlPath}`);
        }

        if (!fs.existsSync(functionsSqlPath)) {
            throw new Error(`functions.sql not found at: ${functionsSqlPath}`);
        }

        const dbSql = fs.readFileSync(dbSqlPath, 'utf8');
        const functionsSql = fs.readFileSync(functionsSqlPath, 'utf8');

        console.log('📄 SQL files loaded\n');

        // Execute DB schema
        console.log('2️⃣ Creating database schema...');
        await pool.query(dbSql);
        console.log('✅ Schema created\n');

        // Execute functions
        console.log('3️⃣ Creating database functions...');
        await pool.query(functionsSql);
        console.log('✅ Functions created\n');

        // Verify tables
        console.log('4️⃣ Verifying tables...');
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);

        console.log('✅ Tables created:');
        result.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });

        // Verify functions
        console.log('\n5️⃣ Verifying functions...');
        const funcResult = await pool.query(`
            SELECT routine_name 
            FROM information_schema.routines 
            WHERE routine_schema = 'public'
            AND routine_type = 'FUNCTION'
            ORDER BY routine_name
        `);

        console.log('✅ Functions created:');
        funcResult.rows.forEach(row => {
            console.log(`   - ${row.routine_name}()`);
        });

        console.log('\n🎉 Supabase migration completed successfully!\n');
        console.log('Next steps:');
        console.log('  1. Run: npm run test:db');
        console.log('  2. Run: npm run dev');
        console.log('  3. Test Telegram bot\n');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('\nFull error:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runSupabaseMigration();
