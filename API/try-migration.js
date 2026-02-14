const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const commonPasswords = ['postgres', 'admin', 'root', '123456', 'password', ''];

async function tryConnection(password) {
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'postgres', // Connect to default database first
        user: 'postgres',
        password: password,
        connectionTimeoutMillis: 3000,
    });

    try {
        await pool.query('SELECT 1');
        await pool.end();
        return true;
    } catch (error) {
        await pool.end();
        return false;
    }
}

async function findPassword() {
    console.log('🔍 Trying to find PostgreSQL password...\n');
    
    for (const password of commonPasswords) {
        const displayPassword = password === '' ? '(empty)' : password;
        process.stdout.write(`Trying password: ${displayPassword}... `);
        
        const success = await tryConnection(password);
        if (success) {
            console.log('✅ SUCCESS!\n');
            return password;
        } else {
            console.log('❌');
        }
    }
    
    return null;
}

async function createDatabase(password) {
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: password,
    });

    try {
        // Check if database exists
        const result = await pool.query(
            "SELECT 1 FROM pg_database WHERE datname = 'grievance_db'"
        );

        if (result.rows.length === 0) {
            console.log('📦 Creating database grievance_db...');
            await pool.query('CREATE DATABASE grievance_db');
            console.log('✅ Database created\n');
        } else {
            console.log('✅ Database grievance_db already exists\n');
        }

        await pool.end();
        return true;
    } catch (error) {
        console.error('❌ Error creating database:', error.message);
        await pool.end();
        return false;
    }
}

async function runMigration(password) {
    console.log('🔄 Running migration...\n');

    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'grievance_db',
        user: 'postgres',
        password: password,
    });

    try {
        // Read SQL files
        const dbSqlPath = path.join(__dirname, '../Platform/Server/DB.sql');
        const functionsSqlPath = path.join(__dirname, '../Platform/Server/functions.sql');

        const dbSql = fs.readFileSync(dbSqlPath, 'utf8');
        const functionsSql = fs.readFileSync(functionsSqlPath, 'utf8');

        console.log('1️⃣ Creating database schema...');
        await pool.query(dbSql);
        console.log('✅ Schema created\n');

        console.log('2️⃣ Creating database functions...');
        await pool.query(functionsSql);
        console.log('✅ Functions created\n');

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

        await pool.end();
        return true;
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        await pool.end();
        return false;
    }
}

async function updateEnvFile(password) {
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');

    // Update password
    envContent = envContent.replace(
        /^DB_PASSWORD=.*$/m,
        `DB_PASSWORD=${password}`
    );

    // Update DATABASE_URL
    envContent = envContent.replace(
        /^DATABASE_URL=.*$/m,
        `DATABASE_URL=postgresql://postgres:${password}@localhost:5432/grievance_db`
    );

    fs.writeFileSync(envPath, envContent);
    console.log('✅ Updated .env file with correct password\n');
}

async function main() {
    console.log('🚀 Automated Database Setup\n');
    console.log('=' .repeat(50) + '\n');

    // Step 1: Find password
    const password = await findPassword();
    
    if (password === null) {
        console.log('\n❌ Could not find PostgreSQL password.');
        console.log('\nPlease manually update API/.env file with your password:');
        console.log('DB_PASSWORD=your_actual_password\n');
        console.log('Then run: npm run migrate\n');
        process.exit(1);
    }

    // Step 2: Update .env file
    await updateEnvFile(password);

    // Step 3: Create database
    const dbCreated = await createDatabase(password);
    if (!dbCreated) {
        process.exit(1);
    }

    // Step 4: Run migration
    const migrationSuccess = await runMigration(password);
    if (!migrationSuccess) {
        process.exit(1);
    }

    console.log('\n🎉 Setup completed successfully!\n');
    console.log('Next steps:');
    console.log('  1. Run: npm run test:db');
    console.log('  2. Run: npm run dev\n');
}

main();
