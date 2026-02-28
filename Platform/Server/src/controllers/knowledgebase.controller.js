import azureStorageService from '../services/azure.storage.services.js';
import azureKnowledgeBaseQueueService from '../services/azure.queue.knowledgebase.service.js';
import pool from '../config/database.js';

class KnowledgeBaseController {
  async uploadPDF(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const file = req.file;
      
      // Get department_id from request body or user
      let departmentId = req.body.department_id || req.user.department_id;
      
      if (!departmentId) {
        // Get first available department as fallback
        const deptResult = await pool.query(
          'SELECT id FROM departments LIMIT 1'
        );
        if (deptResult.rows.length > 0) {
          departmentId = deptResult.rows[0].id;
        } else {
          return res.status(400).json({ 
            error: 'No departments available. Please create a department first.' 
          });
        }
      }

      // Create department-specific path: knowledgebase/department/{department_id}/{timestamp}_{filename}
      const fileName = `knowledgebase/department/${departmentId}/${Date.now()}_${file.originalname}`;

      // Upload to Azure Blob Storage
      const uploadResult = await azureStorageService.uploadFile(file.path, fileName);

      // Store in database
      const result = await pool.query(
        `INSERT INTO departmentknowledgebase (
          title, 
          file_name, 
          file_url, 
          file_type, 
          file_size,
          uploaded_by_officer_id, 
          department_id,
          description
        )
         VALUES ($1, $2, $3, 'pdf', $4, $5, $6, $7)
         RETURNING *`,
        [
          file.originalname, // title
          file.originalname, // file_name
          uploadResult.url,  // file_url
          file.size,         // file_size
          req.user.id,       // uploaded_by_officer_id
          departmentId,      // department_id
          'Processing PDF...' // description
        ]
      );

      // Send URL to Azure Queue for processing (with ID and department info)
      await azureKnowledgeBaseQueueService.sendMessage({
        type: 'pdf_upload',
        id: result.rows[0].id,
        url: uploadResult.url,
        fileName: fileName,
        originalName: file.originalname,
        uploadedBy: req.user.id,
        departmentId: departmentId,
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
      // Note: Using uploaded_by_officer_id (not uploaded_by)
      // Get department_id from user or fetch first available department
      let departmentId = req.user.department_id;
      
      if (!departmentId) {
        // Get first available department as fallback
        const deptResult = await pool.query(
          'SELECT id FROM departments LIMIT 1'
        );
        if (deptResult.rows.length > 0) {
          departmentId = deptResult.rows[0].id;
        } else {
          return res.status(400).json({ 
            error: 'No departments available. Please create a department first.' 
          });
        }
      }
      
      const result = await pool.query(
        `INSERT INTO departmentknowledgebase (
          title,
          file_name, 
          file_url, 
          file_type, 
          uploaded_by_officer_id, 
          department_id,
          description
        )
         VALUES ($1, $2, $3, 'url', $4, $5, $6)
         RETURNING *`,
        [
          url,              // title
          url,              // file_name
          url,              // file_url
          req.user.id,      // uploaded_by_officer_id
          departmentId,     // department_id
          description || 'Processing URL...' // description
        ]
      );

      // Send URL to Azure Queue for processing (with ID and department info)
      await azureKnowledgeBaseQueueService.sendMessage({
        type: 'url_crawl',
        id: result.rows[0].id,
        url: url,
        description: description || '',
        uploadedBy: req.user.id,
        departmentId: departmentId,
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
            WHEN kb.content_text IS NULL AND (kb.tags->>'status' IS NULL OR kb.tags->>'status' = 'processing') THEN 'processing'
            WHEN kb.tags->>'status' = 'failed' THEN 'failed'
            WHEN kb.content_text IS NOT NULL THEN 'completed'
            ELSE 'processing'
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

      // Extract content_text from knowledge if available
      const contentText = knowledge?.summary || knowledge?.content || '';
      
      // Store processed_files, stats, and other metadata in tags (JSONB)
      const metadata = {
        status: status || 'completed',
        knowledge: knowledge || {},
        processed_files: processed_files || {},
        stats: stats || {},
        error: error || null,
        processed_at: processed_at || new Date().toISOString()
      };

      // Update database - use actual schema columns
      const result = await pool.query(
        `UPDATE departmentknowledgebase
         SET content_text = $1,
             tags = $2,
             description = $3,
             updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [
          contentText,
          JSON.stringify(metadata),
          status === 'failed' ? `Error: ${error}` : (knowledge?.summary || 'Processed successfully'),
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

  // Generate shareable link for a document
  async generateShareableLink(req, res) {
    try {
      const { id } = req.params;
      const { expiryMinutes = 60 } = req.body;

      // Get document details
      const result = await pool.query(
        'SELECT * FROM departmentknowledgebase WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const document = result.rows[0];

      // Extract blob name from URL
      const url = new URL(document.file_url);
      const blobName = url.pathname.substring(url.pathname.indexOf('/') + 1);

      // Generate SAS URL
      const sasUrl = await azureStorageService.generateSasUrl(blobName, expiryMinutes);

      res.json({
        success: true,
        data: {
          shareableLink: sasUrl,
          expiresIn: expiryMinutes,
          expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString()
        }
      });
    } catch (error) {
      console.error('Generate shareable link error:', error);
      res.status(500).json({ error: 'Failed to generate shareable link' });
    }
  }
}

export default new KnowledgeBaseController();
