const { Pool } = require('pg');
require('dotenv').config();

async function addCitizensTable() {
    console.log('🔧 Adding Citizens Table to Supabase\n');

    const pool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('1️⃣ Creating Citizens table...');
        
        await pool.query(`
            -- Citizens table for Telegram bot registration
            CREATE TABLE IF NOT EXISTS "Citizens" (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              created_at timestamptz DEFAULT now(),
              updated_at timestamptz DEFAULT now(),
              
              telegram_id bigint UNIQUE NOT NULL,
              phone varchar(20) NOT NULL,
              username varchar(255),
              full_name varchar(255),
              
              -- Location coordinates
              latitude decimal(10, 8),
              longitude decimal(11, 8),
              location_address text,
              
              is_registered boolean DEFAULT false,
              is_active boolean DEFAULT true
            );

            CREATE INDEX IF NOT EXISTS idx_citizens_telegram ON "Citizens"(telegram_id);
            CREATE INDEX IF NOT EXISTS idx_citizens_phone ON "Citizens"(phone);
        `);
        
        console.log('✅ Citizens table created\n');

        console.log('2️⃣ Updating UserGrivience table...');
        
        // Check if citizen_id column exists
        const checkColumn = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'UserGrivience' 
            AND column_name = 'citizen_id'
        `);

        if (checkColumn.rows.length === 0) {
            await pool.query(`
                ALTER TABLE "UserGrivience" 
                ADD COLUMN citizen_id uuid REFERENCES "Citizens"(id) ON DELETE CASCADE;
                
                CREATE INDEX IF NOT EXISTS idx_grivience_citizen ON "UserGrivience"(citizen_id);
            `);
            console.log('✅ Added citizen_id to UserGrivience\n');
        } else {
            console.log('✅ citizen_id already exists in UserGrivience\n');
        }

        console.log('3️⃣ Updating UserGrievance table...');
        
        // Check if citizen_id column exists in UserGrievance
        const checkGrievanceColumn = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'UserGrievance' 
            AND column_name = 'citizen_id'
        `);

        if (checkGrievanceColumn.rows.length === 0) {
            await pool.query(`
                ALTER TABLE "UserGrievance" 
                ADD COLUMN citizen_id uuid REFERENCES "Citizens"(id) ON DELETE CASCADE,
                ADD COLUMN grivience_id uuid REFERENCES "UserGrivience"(id) ON DELETE CASCADE;
                
                CREATE INDEX IF NOT EXISTS idx_grievance_citizen ON "UserGrievance"(citizen_id);
                CREATE INDEX IF NOT EXISTS idx_grievance_grivience ON "UserGrievance"(grivience_id);
            `);
            console.log('✅ Added citizen_id and grivience_id to UserGrievance\n');
        } else {
            console.log('✅ citizen_id already exists in UserGrievance\n');
        }

        console.log('4️⃣ Creating database functions...');
        
        await pool.query(`
            -- Function 1: Register citizen from Telegram
            CREATE OR REPLACE FUNCTION register_citizen(
              p_telegram_id bigint,
              p_phone varchar,
              p_username varchar DEFAULT NULL,
              p_full_name varchar DEFAULT NULL,
              p_latitude decimal DEFAULT NULL,
              p_longitude decimal DEFAULT NULL,
              p_location_address text DEFAULT NULL
            )
            RETURNS uuid
            LANGUAGE plpgsql
            AS $$
            DECLARE
              v_citizen_id uuid;
            BEGIN
              INSERT INTO "Citizens" (
                telegram_id, phone, username, full_name,
                latitude, longitude, location_address, is_registered
              )
              VALUES (
                p_telegram_id, p_phone, p_username, p_full_name,
                p_latitude, p_longitude, p_location_address, true
              )
              ON CONFLICT (telegram_id) 
              DO UPDATE SET
                phone = EXCLUDED.phone,
                username = EXCLUDED.username,
                full_name = EXCLUDED.full_name,
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                location_address = EXCLUDED.location_address,
                updated_at = now()
              RETURNING id INTO v_citizen_id;
              
              RETURN v_citizen_id;
            END;
            $$;

            -- Function 2: Submit grievance from Telegram
            CREATE OR REPLACE FUNCTION submit_grievance(
              p_citizen_id uuid,
              p_grievance_text text,
              p_image_path text DEFAULT NULL,
              p_image_description text DEFAULT NULL,
              p_enhanced_query text DEFAULT NULL,
              p_embedding text DEFAULT NULL
            )
            RETURNS uuid
            LANGUAGE plpgsql
            AS $$
            DECLARE
              v_grivience_id uuid;
            BEGIN
              INSERT INTO "UserGrivience" (
                citizen_id, grievance_text, image_path, 
                image_description, enhanced_query, embedding
              )
              VALUES (
                p_citizen_id, p_grievance_text, p_image_path,
                p_image_description, p_enhanced_query, p_embedding
              )
              RETURNING id INTO v_grivience_id;
              
              RETURN v_grivience_id;
            END;
            $$;

            -- Function 3: Get citizen grievances
            CREATE OR REPLACE FUNCTION get_citizen_grievances(
              p_telegram_id bigint
            )
            RETURNS TABLE (
              grievance_id uuid,
              grivience_id uuid,
              grievance_text text,
              image_path text,
              status grievance_status,
              priority varchar,
              category jsonb,
              department_name varchar,
              created_at timestamptz,
              resolved_at timestamptz
            )
            LANGUAGE plpgsql
            AS $$
            BEGIN
              RETURN QUERY
              SELECT 
                ug.id as grievance_id,
                ugr.id as grivience_id,
                ugr.grievance_text,
                ugr.image_path,
                ug.status,
                ug.priority,
                ug.category,
                d.name as department_name,
                ugr.created_at,
                ug.resolved_at
              FROM "Citizens" c
              JOIN "UserGrivience" ugr ON c.id = ugr.citizen_id
              LEFT JOIN "UserGrievance" ug ON ugr.id = ug.grivience_id
              LEFT JOIN "Departments" d ON ug.department_id = d.id
              WHERE c.telegram_id = p_telegram_id
              ORDER BY ugr.created_at DESC;
            END;
            $$;
        `);
        
        console.log('✅ Functions created\n');

        console.log('🎉 Citizens table and functions added successfully!\n');
        console.log('Next steps:');
        console.log('  1. Run: npm run test:db');
        console.log('  2. Run: npm run dev');
        console.log('  3. Test Telegram bot with /start\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('\nFull error:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

addCitizensTable();
