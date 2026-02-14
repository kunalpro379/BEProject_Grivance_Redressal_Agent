const { Pool } = require('pg');
require('dotenv').config();

async function fixSubmitFunction() {
    console.log('🔧 Fixing submit_grievance function...\n');

    const pool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await pool.query(`
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
              -- Insert without embedding for now (will be added by AI agent later)
              INSERT INTO "UserGrivience" (
                citizen_id, grievance_text, image_path, 
                image_description, enhanced_query
              )
              VALUES (
                p_citizen_id, p_grievance_text, p_image_path,
                p_image_description, p_enhanced_query
              )
              RETURNING id INTO v_grivience_id;
              
              RETURN v_grivience_id;
            END;
            $$;
        `);

        console.log('✅ Function updated successfully!\n');
        console.log('The embedding field will be populated by the AI agent during processing.\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

fixSubmitFunction();
