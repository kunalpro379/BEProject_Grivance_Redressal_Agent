const { Pool } = require('pg');
require('dotenv').config();

async function cleanupDuplicateFields() {
    console.log('🧹 Cleaning up duplicate fields in Supabase\n');

    const pool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('📊 Current UserGrivience structure:');
        const grivienceColumns = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'UserGrivience'
            ORDER BY ordinal_position
        `);
        grivienceColumns.rows.forEach(row => {
            console.log(`   - ${row.column_name} (${row.data_type})`);
        });

        console.log('\n📊 Current UserGrievance structure:');
        const grievanceColumns = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'UserGrievance'
            ORDER BY ordinal_position
        `);
        grievanceColumns.rows.forEach(row => {
            console.log(`   - ${row.column_name} (${row.data_type})`);
        });

        console.log('\n🔧 Removing duplicate fields from UserGrievance...\n');

        // Fields that should ONLY be in UserGrivience (raw submission)
        const grivienceOnlyFields = [
            'grievance_text',
            'image_path', 
            'image_description',
            'enhanced_query',
            'embedding'
        ];

        // Fields that should ONLY be in UserGrievance (processed)
        const grievanceOnlyFields = [
            'status',
            'priority',
            'query_type',
            'category',
            'similar_cases_summary',
            'sentiment_priority',
            'emotion',
            'severity',
            'patterns',
            'fraud',
            'department',
            'policy_search',
            'past_queries_summary',
            'full_result',
            'resolution_text',
            'resolved_at',
            'resolved_by',
            'assigned_officer_id',
            'department_id'
        ];

        // Remove raw submission fields from UserGrievance
        for (const field of grivienceOnlyFields) {
            const checkField = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'UserGrievance' 
                AND column_name = $1
            `, [field]);

            if (checkField.rows.length > 0) {
                console.log(`   Removing ${field} from UserGrievance...`);
                await pool.query(`ALTER TABLE "UserGrievance" DROP COLUMN IF EXISTS "${field}" CASCADE`);
                console.log(`   ✅ Removed ${field}`);
            }
        }

        // Remove processed fields from UserGrivience
        for (const field of grievanceOnlyFields) {
            const checkField = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'UserGrivience' 
                AND column_name = $1
            `, [field]);

            if (checkField.rows.length > 0) {
                console.log(`   Removing ${field} from UserGrivience...`);
                await pool.query(`ALTER TABLE "UserGrivience" DROP COLUMN IF EXISTS "${field}" CASCADE`);
                console.log(`   ✅ Removed ${field}`);
            }
        }

        console.log('\n✅ Cleanup complete!\n');

        console.log('📊 Final UserGrivience structure (Raw Submission):');
        const finalGrivience = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'UserGrivience'
            ORDER BY ordinal_position
        `);
        finalGrivience.rows.forEach(row => {
            console.log(`   - ${row.column_name} (${row.data_type})`);
        });

        console.log('\n📊 Final UserGrievance structure (Processed):');
        const finalGrievance = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'UserGrievance'
            ORDER BY ordinal_position
        `);
        finalGrievance.rows.forEach(row => {
            console.log(`   - ${row.column_name} (${row.data_type})`);
        });

        console.log('\n🎉 Database structure optimized!\n');
        console.log('Summary:');
        console.log('  • UserGrivience: Raw grievance submissions from Telegram');
        console.log('  • UserGrievance: AI-processed grievances with department routing\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('\nFull error:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

cleanupDuplicateFields();
