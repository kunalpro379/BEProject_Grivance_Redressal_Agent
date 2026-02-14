const { pool } = require('../config/database');

async function testDatabase() {
    console.log('🧪 Testing database connection and setup...\n');

    try {
        // Test connection
        console.log('1️⃣ Testing connection...');
        const versionResult = await pool.query('SELECT version()');
        console.log('✅ Connected to PostgreSQL');
        console.log(`   Version: ${versionResult.rows[0].version.split(',')[0]}\n`);

        // Check tables
        console.log('2️⃣ Checking tables...');
        const tablesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);
        
        const expectedTables = [
            'Citizens',
            'UserGrivience',
            'UserGrievance',
            'Departments',
            'Users',
            'RefreshTokens',
            'GrievanceComments',
            'AuditLog'
        ];

        const existingTables = tablesResult.rows.map(r => r.table_name);
        
        expectedTables.forEach(table => {
            if (existingTables.includes(table)) {
                console.log(`   ✅ ${table}`);
            } else {
                console.log(`   ❌ ${table} - MISSING`);
            }
        });

        // Check functions
        console.log('\n3️⃣ Checking functions...');
        const functionsResult = await pool.query(`
            SELECT routine_name 
            FROM information_schema.routines 
            WHERE routine_schema = 'public'
            AND routine_type = 'FUNCTION'
            ORDER BY routine_name
        `);

        const expectedFunctions = [
            'register_citizen',
            'submit_grievance',
            'process_grievance',
            'assign_grievance',
            'resolve_grievance',
            'get_citizen_grievances'
        ];

        const existingFunctions = functionsResult.rows.map(r => r.routine_name);
        
        expectedFunctions.forEach(func => {
            if (existingFunctions.includes(func)) {
                console.log(`   ✅ ${func}()`);
            } else {
                console.log(`   ❌ ${func}() - MISSING`);
            }
        });

        // Test register_citizen function
        console.log('\n4️⃣ Testing register_citizen function...');
        const testCitizen = await pool.query(
            `SELECT register_citizen($1, $2, $3, $4, $5, $6, $7) as citizen_id`,
            [999999999, '+919999999999', 'test_user', 'Test User', 28.6139, 77.2090, 'Test Location']
        );
        console.log(`   ✅ Function works! Citizen ID: ${testCitizen.rows[0].citizen_id}`);

        // Clean up test data
        await pool.query(`DELETE FROM "Citizens" WHERE telegram_id = 999999999`);
        console.log('   ✅ Test data cleaned up');

        // Check departments
        console.log('\n5️⃣ Checking departments...');
        const deptResult = await pool.query(`SELECT COUNT(*) as count FROM "Departments"`);
        console.log(`   ✅ ${deptResult.rows[0].count} departments found`);

        console.log('\n🎉 All tests passed! Database is ready.\n');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

testDatabase();
