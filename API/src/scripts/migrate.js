const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function runMigration() {
    console.log('🔄 Starting database migration...\n');

    try {
        // Read SQL files
        const dbSqlPath = path.join(__dirname, '../../../Platform/Server/DB.sql');
        const functionsSqlPath = path.join(__dirname, '../../../Platform/Server/functions.sql');

        if (!fs.existsSync(dbSqlPath)) {
            throw new Error(`DB.sql not found at: ${dbSqlPath}`);
        }

        if (!fs.existsSync(functionsSqlPath)) {
            throw new Error(`functions.sql not found at: ${functionsSqlPath}`);
        }

        const dbSql = fs.readFileSync(dbSqlPath, 'utf8');
        const functionsSql = fs.readFileSync(functionsSqlPath, 'utf8');

        console.log('📄 SQL files loaded successfully\n');

        // Execute DB schema
        console.log('1️⃣ Creating database schema...');
        await pool.query(dbSql);
        console.log('✅ Database schema created\n');

        // Execute functions
        console.log('2️⃣ Creating database functions...');
        await pool.query(functionsSql);
        console.log('✅ Database functions created\n');

        // Verify tables
        console.log('3️⃣ Verifying tables...');
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

        console.log('\n🎉 Migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run migration
runMigration();
