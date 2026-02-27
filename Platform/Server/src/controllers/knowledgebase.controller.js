import azureStorageService from '../services/azure.storage.services.js';
import azureKnowledgeBaseQueueService from '../services/azure.queue.knowledgebase.service.js';
import pool from '../config/database.js';

class KnowledgeBaseController {
  // Upload PDF to blob storage and send URL to queue
  async uploadPDF(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const file = req.file;
      const fileName = `knowledgebase/${Date.now()}_${file.originalname}`;

      // Upload to Azure Blob Storage
      const uploadResult = await azureStorageService.uploadFile(file.path, fileName);

      // Store in database
      const result = await pool.query(
        `INSERT INTO departmentknowledgebase (file_name, file_url, file_type, uploaded_by, status)
         VALUES ($1, $2, 'pdf', $3, 'processing')
         RETURNING *`,
        [file.originalname, uploadResult.url, req.user.id]
      );

      // Send URL to Azure Queue for processing (with ID)
      await azureKnowledgeBaseQueueService.sendMessage({
        type: 'pdf_upload',
        id: result.rows[0].id,
        url: uploadResult.url,
        fileName: fileName,
        originalName: file.originalname,
        uploadedBy: req.user.id,
        uploadedAt: new Date().toISOString()
      });

      res.json({
        success: true,
        message: 'PDF uploaded successfully and queued for processing',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Upload PDF error:', error);
      res.status(500).json({ error: 'Failed to upload PDF' });
    }
  }

  // Add URL to queue for web crawling
  async addURL(req, res) {
    try {
      const { url, description } = req.body;

      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      // Validate URL format
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ error: 'Invalid URL format' });
      }

      // Store in database
      const result = await pool.query(
        `INSERT INTO departmentknowledgebase (file_name, file_url, file_type, uploaded_by, status, description)
         VALUES ($1, $2, 'url', $3, 'processing', $4)
         RETURNING *`,
        [url, url, req.user.id, description]
      );

      // Send URL to Azure Queue for processing (with ID)
      await azureKnowledgeBaseQueueService.sendMessage({
        type: 'url_crawl',
        id: result.rows[0].id,
        url: url,
        description: description || '',
        uploadedBy: req.user.id,
        uploadedAt: new Date().toISOString()
      });

      res.json({
        success: true,
        message: 'URL added successfully and queued for processing',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Add URL error:', error);
      res.status(500).json({ error: 'Failed to add URL' });
    }
  }

  // Get all knowledge base entries
  async getAll(req, res) {
    try {
      const { status, type, page = 1, limit = 20 } = req.query;

      // NOTE:
      // The actual "departmentknowledgebase" table (see Platform/DB/db.sql)
      // does NOT have the "uploaded_by" or "status" columns that older
      // controller code expected. Instead, it has:
      // - uploaded_by_officer_id
      // - is_active
      // - content_text
      //
      // To keep the admin UI working without changing the DB schema, we:
      // - join via uploaded_by_officer_id
      // - treat all active records as part of the list
      // - derive a synthetic "status" field from content_text:
      //   - "processing" when content_text IS NULL
      //   - "completed" when content_text IS NOT NULL
      let query = `
        SELECT 
          kb.id,
          kb.created_at,
          kb.updated_at,
          kb.department_id,
          kb.title,
          kb.description,
          kb.file_name,
          kb.file_url,
          kb.file_type,
          kb.file_size,
          kb.category,
          kb.tags,
          kb.view_count,
          kb.download_count,
          COALESCE(u.full_name, 'Unknown') AS uploaded_by_name,
          CASE 
            WHEN kb.content_text IS NULL THEN 'processing'
            ELSE 'completed'
          END AS status
        FROM departmentknowledgebase kb
        LEFT JOIN users u ON kb.uploaded_by_officer_id = u.id
        WHERE kb.is_active = TRUE
      `;

      const params = [];
      let paramCount = 1;

      if (type) {
        query += ` AND kb.file_type = $${paramCount}`;
        params.push(type);
        paramCount++;
      }

      query += ` ORDER BY kb.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(limit, (page - 1) * limit);

      const result = await pool.query(query, params);

      // Get total count
      const countResult = await pool.query(
        'SELECT COUNT(*) FROM departmentknowledgebase WHERE is_active = TRUE'
      );

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count)
        }
      });
    } catch (error) {
      console.error('Get knowledge base error:', error);

      // If the departmentknowledgebase table does not exist yet OR columns
      // referenced here are missing (undefined_table / undefined_column in PostgreSQL),
      // return an empty result instead of a 500 so that the admin UI still
      // works gracefully even on a partially-migrated database.
      if (error.code === '42P01' || error.code === '42703') {
        return res.json({
          success: true,
          data: [],
          pagination: {
            page: 1,
            limit: parseInt(req.query.limit || 20),
            total: 0
          }
        });
      }

      res.status(500).json({ error: 'Failed to fetch knowledge base entries' });
    }
  }

  // Delete knowledge base entry
  async delete(req, res) {
    try {
      const { id } = req.params;

      // Get entry details
      const entry = await pool.query(
        'SELECT * FROM departmentknowledgebase WHERE id = $1',
        [id]
      );

      if (entry.rows.length === 0) {
        return res.status(404).json({ error: 'Entry not found' });
      }

      const entryData = entry.rows[0];

      // Delete from Azure if it's a PDF
      if (entryData.file_type === 'pdf') {
        try {
          const fileName = entryData.file_url.split('/').pop();
          await azureStorageService.deleteFile(fileName);
        } catch (error) {
          console.error('Failed to delete from Azure:', error);
        }
      }

      // Delete from database
      await pool.query('DELETE FROM departmentknowledgebase WHERE id = $1', [id]);

      res.json({
        success: true,
        message: 'Entry deleted successfully'
      });
    } catch (error) {
      console.error('Delete knowledge base error:', error);
      res.status(500).json({ error: 'Failed to delete entry' });
    }
  }

  // Update knowledge base status (called by worker)
  async updateStatus(req, res) {
    try {
      const {
        id,
        status,
        knowledge,
        processed_files,
        stats,
        error,
        processed_at
      } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID is required' });
      }

      // Update database
      const result = await pool.query(
        `UPDATE departmentknowledgebase
         SET status = $1,
             knowledge = $2,
             processed_files = $3,
             stats = $4,
             error = $5,
             processed_at = $6,
             updated_at = NOW()
         WHERE id = $7
         RETURNING *`,
        [
          status,
          JSON.stringify(knowledge || {}),
          JSON.stringify(processed_files || {}),
          JSON.stringify(stats || {}),
          error || null,
          processed_at || new Date().toISOString(),
          id
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Entry not found' });
      }

      console.log(`Knowledge base entry ${id} updated: ${status}`);

      res.json({
        success: true,
        message: 'Status updated successfully',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Update status error:', error);
      res.status(500).json({ error: 'Failed to update status' });
    }
  }
}

export default new KnowledgeBaseController();
