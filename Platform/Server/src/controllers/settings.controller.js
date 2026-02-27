import pool from '../config/database.js';

export const settingsController = {
  // Get all settings
  async getAllSettings(req, res) {
    try {
      const result = await pool.query(`
        SELECT 
          id,
          setting_key,
          setting_value,
          description,
          category,
          is_active,
          updated_at
        FROM settings
        WHERE is_active = true
        ORDER BY category, setting_key
      `);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch settings'
      });
    }
  },

  // Get setting by key
  async getSettingByKey(req, res) {
    try {
      const { key } = req.params;

      const result = await pool.query(`
        SELECT 
          id,
          setting_key,
          setting_value,
          description,
          category,
          is_active,
          updated_at
        FROM settings
        WHERE setting_key = $1 AND is_active = true
      `, [key]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Setting not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error fetching setting:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch setting'
      });
    }
  },

  // Update setting
  async updateSetting(req, res) {
    try {
      const { key } = req.params;
      const { setting_value } = req.body;
      const userId = req.user?.id;

      // Validate setting_value
      if (!setting_value) {
        return res.status(400).json({
          success: false,
          message: 'setting_value is required'
        });
      }

      const result = await pool.query(`
        UPDATE settings
        SET 
          setting_value = $1,
          updated_at = now(),
          updated_by_user_id = $2
        WHERE setting_key = $3
        RETURNING 
          id,
          setting_key,
          setting_value,
          description,
          category,
          updated_at
      `, [JSON.stringify(setting_value), userId, key]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Setting not found'
        });
      }

      res.json({
        success: true,
        message: 'Setting updated successfully',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error updating setting:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update setting'
      });
    }
  },

  // Update API keys (add/update/remove key-value pairs)
  async updateApiKeys(req, res) {
    try {
      const { keys } = req.body; // Expected: { "OPENAI_API_KEY": "sk-...", "AZURE_KEY": "..." }
      const userId = req.user?.id;

      if (!keys || typeof keys !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'keys object is required'
        });
      }

      const result = await pool.query(`
        UPDATE settings
        SET 
          setting_value = $1,
          updated_at = now(),
          updated_by_user_id = $2
        WHERE setting_key = 'api_keys'
        RETURNING 
          id,
          setting_key,
          setting_value,
          updated_at
      `, [JSON.stringify(keys), userId]);

      if (result.rows.length === 0) {
        // Create if doesn't exist
        const insertResult = await pool.query(`
          INSERT INTO settings (setting_key, setting_value, description, category, updated_by_user_id)
          VALUES ('api_keys', $1, 'API keys for external services', 'api', $2)
          RETURNING 
            id,
            setting_key,
            setting_value,
            updated_at
        `, [JSON.stringify(keys), userId]);

        return res.json({
          success: true,
          message: 'API keys created successfully',
          data: insertResult.rows[0]
        });
      }

      res.json({
        success: true,
        message: 'API keys updated successfully',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error updating API keys:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update API keys'
      });
    }
  },

  // Update research prompt
  async updateResearchPrompt(req, res) {
    try {
      const { prompt } = req.body;
      const userId = req.user?.id;

      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'prompt string is required'
        });
      }

      const result = await pool.query(`
        UPDATE settings
        SET 
          setting_value = $1,
          updated_at = now(),
          updated_by_user_id = $2
        WHERE setting_key = 'research_prompt'
        RETURNING 
          id,
          setting_key,
          setting_value,
          updated_at
      `, [JSON.stringify({ prompt }), userId]);

      if (result.rows.length === 0) {
        // Create if doesn't exist
        const insertResult = await pool.query(`
          INSERT INTO settings (setting_key, setting_value, description, category, updated_by_user_id)
          VALUES ('research_prompt', $1, 'Research prompt for AI analysis', 'ai', $2)
          RETURNING 
            id,
            setting_key,
            setting_value,
            updated_at
        `, [JSON.stringify({ prompt }), userId]);

        return res.json({
          success: true,
          message: 'Research prompt created successfully',
          data: insertResult.rows[0]
        });
      }

      res.json({
        success: true,
        message: 'Research prompt updated successfully',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error updating research prompt:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update research prompt'
      });
    }
  },

  // Get API keys (masked for security)
  async getApiKeys(req, res) {
    try {
      const result = await pool.query(`
        SELECT setting_value
        FROM settings
        WHERE setting_key = 'api_keys' AND is_active = true
      `);

      if (result.rows.length === 0) {
        return res.json({
          success: true,
          data: {}
        });
      }

      const keys = result.rows[0].setting_value;
      
      // Mask sensitive values (show only first 8 and last 4 characters)
      const maskedKeys = {};
      for (const [key, value] of Object.entries(keys)) {
        if (typeof value === 'string' && value.length > 12) {
          maskedKeys[key] = `${value.substring(0, 8)}...${value.substring(value.length - 4)}`;
        } else {
          maskedKeys[key] = '***';
        }
      }

      res.json({
        success: true,
        data: maskedKeys
      });
    } catch (error) {
      console.error('Error fetching API keys:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch API keys'
      });
    }
  },

  // Get research prompt
  async getResearchPrompt(req, res) {
    try {
      const result = await pool.query(`
        SELECT setting_value
        FROM settings
        WHERE setting_key = 'research_prompt' AND is_active = true
      `);

      if (result.rows.length === 0) {
        return res.json({
          success: true,
          data: { prompt: '' }
        });
      }

      res.json({
        success: true,
        data: result.rows[0].setting_value
      });
    } catch (error) {
      console.error('Error fetching research prompt:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch research prompt'
      });
    }
  }
};
