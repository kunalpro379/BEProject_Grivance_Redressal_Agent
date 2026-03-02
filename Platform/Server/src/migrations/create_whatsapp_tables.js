import pool from '../config/database.js';

async function createWhatsAppTables() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('Creating WhatsApp conversations table...');

    // Create whatsapp_conversations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_conversations (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        user_name VARCHAR(255),
        message TEXT NOT NULL,
        channel VARCHAR(20) DEFAULT 'whatsapp',
        message_id VARCHAR(255),
        is_bot BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        metadata JSONB
      );
    `);

    // Create index for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_whatsapp_user_id 
      ON whatsapp_conversations(user_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_whatsapp_created_at 
      ON whatsapp_conversations(created_at DESC);
    `);

    // Create whatsapp_media table for storing media references
    await client.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_media (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES whatsapp_conversations(id),
        media_type VARCHAR(50),
        media_url TEXT,
        blob_url TEXT,
        mime_type VARCHAR(100),
        file_size INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Add phone column to users table if not exists
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'phone'
        ) THEN
          ALTER TABLE users ADD COLUMN phone VARCHAR(20) UNIQUE;
        END IF;
      END $$;
    `);

    await client.query('COMMIT');
    console.log('✅ WhatsApp tables created successfully');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating WhatsApp tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default createWhatsAppTables;
