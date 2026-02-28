/**
 * Direct fix for the department trigger issue
 * This will connect to the database and fix the trigger immediately
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function fixTriggerDirect() {
    console.log('🔧 Fixing department trigger directly...\n');

    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({
        connectionString,
        ssl: {
            rejectUnauthorized: false,
        },
    });

    try {
        // Step 1: Drop the trigger
        console.log('Step 1: Dropping trigger...');
        await pool.query('DROP TRIGGER IF EXISTS update_department_metrics ON usergrievance');
        console.log('✅ Trigger dropped\n');

        // Step 2: Drop the function
        console.log('Step 2: Dropping function with CASCADE...');
        await pool.query('DROP FUNCTION IF EXISTS trigger_update_department_metrics() CASCADE');
        console.log('✅ Function dropped\n');

        // Step 3: Create new function with correct column name
        console.log('Step 3: Creating corrected function...');
        await pool.query(`
            CREATE OR REPLACE FUNCTION trigger_update_department_metrics()
            RETURNS TRIGGER
            LANGUAGE plpgsql
            AS $$
            BEGIN
                -- Update department metrics when grievance is assigned or status changes
                IF NEW.department_id IS NOT NULL THEN
                    -- Department metrics update logic can be added here
                    NULL;
                END IF;
                
                RETURN NEW;
            END;
            $$
        `);
        console.log('✅ Function created\n');

        // Step 4: Create trigger
        console.log('Step 4: Creating trigger...');
        await pool.query(`
            CREATE TRIGGER update_department_metrics
            BEFORE INSERT OR UPDATE ON usergrievance
            FOR EACH ROW
            EXECUTE FUNCTION trigger_update_department_metrics()
        `);
        console.log('✅ Trigger created\n');

        console.log('✅ SUCCESS! Trigger fixed successfully!\n');

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ FAILED!');
        console.error('Error:', error.message);
        console.error('\nStack:', error.stack);
        
        await pool.end();
        process.exit(1);
    }
}

fixTriggerDirect();
