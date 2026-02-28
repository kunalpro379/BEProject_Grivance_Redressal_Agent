/**
 * Database Migration Script
 * Adds location fields to UserGrievance table and updates submit_grievance function
 */

import { query } from '../config/database.js';

async function addLocationToGrievances() {
    console.log('🔄 Starting location fields migration...\n');

    try {
        // Step 1: Detect which table name exists
        console.log('Step 1: Detecting UserGrievance table name...');
        const checkCapitalGrievance = await query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'UserGrievance'
            ) as exists
        `);
        
        const grievanceCapitalExists = checkCapitalGrievance.rows[0].exists;
        
        const checkLowerGrievance = await query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'usergrievance'
            ) as exists
        `);
        
        const grievanceLowerExists = checkLowerGrievance.rows[0].exists;
        
        const grievanceTableName = grievanceCapitalExists ? 'UserGrievance' : 'usergrievance';
        console.log(`   Using table name: "${grievanceTableName}"\n`);

        // Step 2: Add location columns if they don't exist
        console.log('Step 2: Adding location columns...');
        
        const columnsToAdd = [
            { name: 'latitude', type: 'numeric(10, 8)' },
            { name: 'longitude', type: 'numeric(11, 8)' },
            { name: 'location_address', type: 'text' }
        ];

        for (const col of columnsToAdd) {
            try {
                const checkColumn = await query(`
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name='${grievanceTableName}' AND column_name='${col.name}'
                    ) as exists
                `);

                if (!checkColumn.rows[0].exists) {
                    await query(`ALTER TABLE "${grievanceTableName}" ADD COLUMN ${col.name} ${col.type}`);
                    console.log(`   ✅ Added column: ${col.name}`);
                } else {
                    console.log(`   ⏭️  Column already exists: ${col.name}`);
                }
            } catch (error) {
                console.log(`   ❌ Could not add ${col.name}: ${error.message}`);
            }
        }

        // Step 3: Drop old submit_grievance function
        console.log('\nStep 3: Dropping old submit_grievance function...');
        await query(`DROP FUNCTION IF EXISTS submit_grievance(uuid, text, text, text, text, text)`);
        console.log('   ✅ Old function dropped');

        // Step 4: Create new submit_grievance function with location parameters
        console.log('\nStep 4: Creating new submit_grievance function with location support...');
        await query(`
            CREATE OR REPLACE FUNCTION submit_grievance(
                p_citizen_id uuid,
                p_grievance_text text,
                p_image_path text,
                p_image_description text,
                p_enhanced_query text,
                p_embedding text,
                p_latitude numeric DEFAULT NULL,
                p_longitude numeric DEFAULT NULL,
                p_location_address text DEFAULT NULL
            )
            RETURNS uuid
            LANGUAGE plpgsql
            AS $function$
            DECLARE
                v_grievance_id uuid;
                v_grievance_string_id character varying;
            BEGIN
                -- Generate unique grievance_id string (format: GRV-YYYYMMDD-XXXXXX)
                v_grievance_string_id := 'GRV-' || 
                    TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                    LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
                
                -- Ensure uniqueness (retry if collision)
                WHILE EXISTS (SELECT 1 FROM "${grievanceTableName}" WHERE grievance_id = v_grievance_string_id) LOOP
                    v_grievance_string_id := 'GRV-' || 
                        TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                        LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
                END LOOP;
                
                INSERT INTO "${grievanceTableName}" (
                    grievance_id, citizen_id, grievance_text, image_path, 
                    image_description, enhanced_query, embedding,
                    latitude, longitude, location_address
                ) VALUES (
                    v_grievance_string_id, p_citizen_id, p_grievance_text, p_image_path,
                    p_image_description, p_enhanced_query, 
                    CASE 
                        WHEN p_embedding IS NOT NULL THEN p_embedding::vector
                        ELSE NULL 
                    END,
                    p_latitude, p_longitude, p_location_address
                )
                RETURNING id INTO v_grievance_id;
                
                RETURN v_grievance_id;
            END;
            $function$;
        `);
        console.log('   ✅ New submit_grievance function created');

        // Step 5: Verify the function
        console.log('\nStep 5: Verifying function...');
        const verifyFunction = await query(`
            SELECT EXISTS (
                SELECT 1 FROM pg_proc p
                JOIN pg_namespace n ON p.pronamespace = n.oid
                WHERE n.nspname = 'public'
                AND p.proname = 'submit_grievance'
            ) as exists
        `);

        if (verifyFunction.rows[0].exists) {
            console.log('   ✅ submit_grievance function verified');
        } else {
            throw new Error('submit_grievance function not found after migration');
        }

        console.log('\n✅ Migration completed successfully!\n');
        return { success: true };

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        throw error;
    }
}

export default addLocationToGrievances;

// Run migration if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    addLocationToGrievances()
        .then(() => {
            console.log('Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration script failed:', error);
            process.exit(1);
        });
}
