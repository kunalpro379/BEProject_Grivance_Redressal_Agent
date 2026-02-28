/**
 * Database Migration Script
 * Fixes the Citizens table case-sensitivity issue
 * Run this once to fix the stored procedures
 */

import { query } from '../config/database.js';

async function runMigration() {
    console.log('🔄 Starting database migration...\n');

    try {
        // Step 1: Check if Citizens table exists (capital C)
        console.log('Step 1: Checking for Citizens table...');
        const checkCapitalTable = await query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'Citizens'
            ) as exists
        `);
        
        const capitalExists = checkCapitalTable.rows[0].exists;
        console.log(`   ${capitalExists ? '✅' : '❌'} Citizens table (capital C): ${capitalExists ? 'Found' : 'Not found'}`);

        // Step 2: Check if citizens table exists (lowercase c)
        console.log('\nStep 2: Checking for citizens table...');
        const checkLowerTable = await query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'citizens'
            ) as exists
        `);
        
        const lowerExists = checkLowerTable.rows[0].exists;
        console.log(`   ${lowerExists ? '✅' : '❌'} citizens table (lowercase c): ${lowerExists ? 'Found' : 'Not found'}`);

        // Determine which table name to use
        const tableName = capitalExists ? 'Citizens' : 'citizens';
        console.log(`\n📌 Using table name: "${tableName}"\n`);

        // Step 2.5: Check UserGrievance table
        console.log('Step 2.5: Checking for UserGrievance table...');
        const checkCapitalGrievance = await query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'UserGrievance'
            ) as exists
        `);
        
        const grievanceCapitalExists = checkCapitalGrievance.rows[0].exists;
        console.log(`   ${grievanceCapitalExists ? '✅' : '❌'} UserGrievance table (capital U & G): ${grievanceCapitalExists ? 'Found' : 'Not found'}`);

        const checkLowerGrievance = await query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'usergrievance'
            ) as exists
        `);
        
        const grievanceLowerExists = checkLowerGrievance.rows[0].exists;
        console.log(`   ${grievanceLowerExists ? '✅' : '❌'} usergrievance table (lowercase): ${grievanceLowerExists ? 'Found' : 'Not found'}`);

        const grievanceTableName = grievanceCapitalExists ? 'UserGrievance' : 'usergrievance';
        console.log(`\n📌 Using grievance table name: "${grievanceTableName}"\n`);

        // Step 3: Add missing columns if they don't exist
        console.log('Step 3: Adding missing columns...');
        
        const columnsToAdd = [
            { name: 'date_of_birth', type: 'date' },
            { name: 'gender', type: 'character varying(20)' },
            { name: 'aadhaar_number', type: 'character varying(12)' },
            { name: 'occupation', type: 'character varying(100)' }
        ];

        for (const col of columnsToAdd) {
            try {
                const checkColumn = await query(`
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name='${tableName}' AND column_name='${col.name}'
                    ) as exists
                `);

                if (!checkColumn.rows[0].exists) {
                    await query(`ALTER TABLE "${tableName}" ADD COLUMN ${col.name} ${col.type}`);
                    console.log(`   Added column: ${col.name}`);
                } else {
                    console.log(`   ⏭️  Column already exists: ${col.name}`);
                }
            } catch (error) {
                console.log(`     Could not add ${col.name}: ${error.message}`);
            }
        }

        // Step 4: Drop old register_citizen function
        console.log('\nStep 4: Dropping old register_citizen function...');
        await query(`DROP FUNCTION IF EXISTS register_citizen(bigint, character varying, character varying, character varying, numeric, numeric, text)`);
        console.log('   Old function dropped');

        // Step 5: Create new register_citizen function with correct table name
        console.log('\nStep 5: Creating new register_citizen function...');
        await query(`
            CREATE OR REPLACE FUNCTION register_citizen(
                p_telegram_id bigint,
                p_phone character varying,
                p_username character varying,
                p_full_name character varying,
                p_latitude numeric,
                p_longitude numeric,
                p_location_address text
            )
            RETURNS uuid
            LANGUAGE plpgsql
            AS $function$
            DECLARE
                v_citizen_id uuid;
                v_existing_id uuid;
            BEGIN
                -- Check if citizen already exists (using correct table name)
                SELECT id INTO v_existing_id
                FROM "${tableName}"
                WHERE telegram_id = p_telegram_id;

                IF v_existing_id IS NOT NULL THEN
                    -- Update existing citizen
                    UPDATE "${tableName}"
                    SET phone = COALESCE(p_phone, phone),
                        username = COALESCE(p_username, username),
                        full_name = COALESCE(p_full_name, full_name),
                        latitude = COALESCE(p_latitude, latitude),
                        longitude = COALESCE(p_longitude, longitude),
                        location_address = COALESCE(p_location_address, location_address),
                        is_registered = true,
                        is_active = true,
                        updated_at = now()
                    WHERE id = v_existing_id
                    RETURNING id INTO v_citizen_id;
                ELSE
                    -- Insert new citizen
                    INSERT INTO "${tableName}" (
                        telegram_id,
                        phone,
                        username,
                        full_name,
                        latitude,
                        longitude,
                        location_address,
                        is_registered,
                        is_active,
                        created_at,
                        updated_at
                    )
                    VALUES (
                        p_telegram_id,
                        p_phone,
                        p_username,
                        p_full_name,
                        p_latitude,
                        p_longitude,
                        p_location_address,
                        true,
                        true,
                        now(),
                        now()
                    )
                    RETURNING id INTO v_citizen_id;
                END IF;

                RETURN v_citizen_id;
            END;
            $function$;
        `);
        console.log('   New register_citizen function created');

        // Step 6: Drop old get_citizen_grievances function
        console.log('\nStep 6: Dropping old get_citizen_grievances function...');
        await query(`DROP FUNCTION IF EXISTS get_citizen_grievances(bigint)`);
        console.log('   Old function dropped');

        // Step 7: Create new get_citizen_grievances function
        console.log('\nStep 7: Creating new get_citizen_grievances function...');
        await query(`
            CREATE OR REPLACE FUNCTION get_citizen_grievances(p_telegram_id bigint)
            RETURNS TABLE (
                id uuid,
                grievance_text text,
                status character varying,
                created_at timestamp with time zone,
                department_name character varying
            )
            LANGUAGE plpgsql
            AS $function$
            BEGIN
                RETURN QUERY
                SELECT 
                    g.id,
                    g.grievance_text,
                    g.status,
                    g.created_at,
                    d.name as department_name
                FROM "${grievanceTableName}" g
                INNER JOIN "${tableName}" c ON g.citizen_id = c.id
                LEFT JOIN departments d ON g.department_id = d.id
                WHERE c.telegram_id = p_telegram_id
                ORDER BY g.created_at DESC;
            END;
            $function$;
        `);
        console.log('   New get_citizen_grievances function created');

        // Step 8: Fix submit_grievance function
        console.log('\nStep 8: Fixing submit_grievance function...');
        await query(`DROP FUNCTION IF EXISTS submit_grievance(uuid, text, text, text, text, text)`);
        await query(`
            CREATE OR REPLACE FUNCTION submit_grievance(
                p_citizen_id uuid,
                p_grievance_text text,
                p_image_path text,
                p_image_description text,
                p_enhanced_query text,
                p_embedding text
            )
            RETURNS uuid
            LANGUAGE plpgsql
            AS $function$
            DECLARE
                v_grievance_id uuid;
            BEGIN
                INSERT INTO "${grievanceTableName}" (
                    citizen_id, grievance_text, image_path, 
                    image_description, enhanced_query, embedding
                ) VALUES (
                    p_citizen_id, p_grievance_text, p_image_path,
                    p_image_description, p_enhanced_query, 
                    CASE 
                        WHEN p_embedding IS NOT NULL THEN p_embedding::vector
                        ELSE NULL 
                    END
                )
                RETURNING id INTO v_grievance_id;
                
                RETURN v_grievance_id;
            END;
            $function$;
        `);
        console.log('   submit_grievance function fixed');

        // Step 9: Create indexes for performance
        console.log('\nStep 9: Creating indexes...');
        const indexes = [
            { name: 'idx_citizens_telegram_id', column: 'telegram_id' },
            { name: 'idx_citizens_email', column: 'email' },
            { name: 'idx_citizens_phone', column: 'phone' }
        ];

        for (const idx of indexes) {
            try {
                await query(`CREATE INDEX IF NOT EXISTS ${idx.name} ON "${tableName}"(${idx.column})`);
                console.log(`   Index created: ${idx.name}`);
            } catch (error) {
                console.log(`   ⏭️  Index already exists: ${idx.name}`);
            }
        }

        // Step 10: Verify the migration
        console.log('\nStep 10: Verifying migration...');
        
        const verifyFunction = await query(`
            SELECT EXISTS (
                SELECT FROM pg_proc p
                JOIN pg_namespace n ON p.pronamespace = n.oid
                WHERE n.nspname = 'public'
                AND p.proname = 'register_citizen'
            ) as exists
        `);

        if (verifyFunction.rows[0].exists) {
            console.log('   register_citizen function verified');
        } else {
            throw new Error('register_citizen function not found after migration');
        }

        const verifyGrievanceFunction = await query(`
            SELECT EXISTS (
                SELECT FROM pg_proc p
                JOIN pg_namespace n ON p.pronamespace = n.oid
                WHERE n.nspname = 'public'
                AND p.proname = 'get_citizen_grievances'
            ) as exists
        `);

        if (verifyGrievanceFunction.rows[0].exists) {
            console.log('   get_citizen_grievances function verified');
        } else {
            throw new Error('get_citizen_grievances function not found after migration');
        }

        const verifySubmitFunction = await query(`
            SELECT EXISTS (
                SELECT FROM pg_proc p
                JOIN pg_namespace n ON p.pronamespace = n.oid
                WHERE n.nspname = 'public'
                AND p.proname = 'submit_grievance'
            ) as exists
        `);

        if (verifySubmitFunction.rows[0].exists) {
            console.log('   submit_grievance function verified');
        } else {
            throw new Error('submit_grievance function not found after migration');
        }

        console.log('\nMigration completed successfully! ✅\n');
        console.log(`📌 Citizens table: "${tableName}"`);
        console.log(`📌 Grievance table: "${grievanceTableName}"`);
        console.log('📌 All stored procedures updated');
        console.log('📌 Indexes created');
        console.log('📌 System ready to use\n');

        return { success: true, tableName, grievanceTableName };

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error('Stack trace:', error.stack);
        throw error;
    }
}

// Export for use in other files
export default runMigration;

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runMigration()
        .then(() => {
            console.log('Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration script failed:', error);
            process.exit(1);
        });
}
