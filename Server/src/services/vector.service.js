import pool from '../config/database.js';

export const vectorService = {
  /**
   * Find similar grievances using vector similarity
   */
  async findSimilarGrievances(embedding, threshold = 0.7, limit = 10) {
    try {
      const result = await pool.query(
        `SELECT * FROM find_similar_grievances($1::vector, $2, $3)`,
        [JSON.stringify(embedding), threshold, limit]
      );
      return result.rows;
    } catch (error) {
      console.error('Error finding similar grievances:', error);
      throw error;
    }
  },

  /**
   * Find similar resolved cases for reference
   */
  async findSimilarResolvedCases(embedding, limit = 5) {
    try {
      const result = await pool.query(
        `SELECT * FROM find_similar_resolved_cases($1::vector, $2)`,
        [JSON.stringify(embedding), limit]
      );
      return result.rows;
    } catch (error) {
      console.error('Error finding similar resolved cases:', error);
      throw error;
    }
  },

  /**
   * Find relevant policies for a grievance
   */
  async findRelevantPolicies(embedding, departmentId = null, limit = 5) {
    try {
      const result = await pool.query(
        `SELECT * FROM find_relevant_policies($1::vector, $2, $3)`,
        [JSON.stringify(embedding), departmentId, limit]
      );
      return result.rows;
    } catch (error) {
      console.error('Error finding relevant policies:', error);
      throw error;
    }
  },

  /**
   * Find relevant FAQs
   */
  async findRelevantFAQs(embedding, limit = 3) {
    try {
      const result = await pool.query(
        `SELECT * FROM find_relevant_faqs($1::vector, $2)`,
        [JSON.stringify(embedding), limit]
      );
      return result.rows;
    } catch (error) {
      console.error('Error finding relevant FAQs:', error);
      throw error;
    }
  },

  /**
   * Get department grievance clusters
   */
  async getDepartmentClusters(departmentId, threshold = 0.8) {
    try {
      const result = await pool.query(
        `SELECT * FROM get_department_grievance_clusters($1, $2)`,
        [departmentId, threshold]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting department clusters:', error);
      throw error;
    }
  },

  /**
   * Store embedding for a grievance
   */
  async storeGrievanceEmbedding(grievanceId, embedding, metadata = {}) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update grievance with embedding
      await client.query(
        `UPDATE usergrievance 
         SET embedding = $1::vector, updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(embedding), grievanceId]
      );

      // Store metadata
      await client.query(
        `INSERT INTO "EmbeddingMetadata" (entity_type, entity_id, model_name, embedding_dimension)
         VALUES ('grievance', $1, $2, $3)
         ON CONFLICT (entity_type, entity_id) 
         DO UPDATE SET model_name = EXCLUDED.model_name`,
        [grievanceId, metadata.model_name || 'sentence-transformers/all-MiniLM-L6-v2', 384]
      );

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error storing embedding:', error);
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Add policy document with embedding
   */
  async addPolicyDocument(policyData) {
    try {
      const { title, content, department_id, document_url, embedding, metadata } = policyData;

      const result = await pool.query(
        `INSERT INTO policydocuments 
         (title, content, department_id, document_url, embedding, metadata)
         VALUES ($1, $2, $3, $4, $5::vector, $6)
         RETURNING *`,
        [title, content, department_id, document_url, JSON.stringify(embedding), metadata]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error adding policy document:', error);
      throw error;
    }
  },

  /**
   * Add FAQ with embedding
   */
  async addFAQ(faqData) {
    try {
      const { question, answer, category, department_id, embedding } = faqData;

      const result = await pool.query(
        `INSERT INTO faqs 
         (question, answer, category, department_id, embedding)
         VALUES ($1, $2, $3, $4, $5::vector)
         RETURNING *`,
        [question, answer, category, department_id, JSON.stringify(embedding)]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error adding FAQ:', error);
      throw error;
    }
  },

  /**
   * Batch update embeddings for existing grievances
   */
  async batchUpdateEmbeddings(grievanceEmbeddings) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const { id, embedding } of grievanceEmbeddings) {
        await client.query(
          `UPDATE usergrievance 
           SET embedding = $1::vector, updated_at = NOW()
           WHERE id = $2`,
          [JSON.stringify(embedding), id]
        );
      }

      await client.query('COMMIT');
      return { updated: grievanceEmbeddings.length };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error batch updating embeddings:', error);
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Get grievances without embeddings (for processing)
   */
  async getGrievancesWithoutEmbeddings(limit = 100) {
    try {
      const result = await pool.query(
        `SELECT id, grievance_text, category, enhanced_query
         FROM usergrievance
         WHERE embedding IS NULL
         LIMIT $1`,
        [limit]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting grievances without embeddings:', error);
      throw error;
    }
  },

  /**
   * Search grievances by text with vector similarity
   */
  async searchGrievances(queryEmbedding, filters = {}) {
    try {
      let query = `
        SELECT 
          g.*,
          u.full_name as citizen_name,
          d.name as department_name,
          1 - (g.embedding <=> $1::vector) as similarity
        FROM usergrievance g
        LEFT JOIN users u ON g.user_id = u.id
        LEFT JOIN departments d ON g.department_id = d.id
        WHERE g.embedding IS NOT NULL
      `;

      const params = [JSON.stringify(queryEmbedding)];
      let paramCount = 2;

      if (filters.status) {
        query += ` AND g.status = $${paramCount}`;
        params.push(filters.status);
        paramCount++;
      }

      if (filters.department_id) {
        query += ` AND g.department_id = $${paramCount}`;
        params.push(filters.department_id);
        paramCount++;
      }

      if (filters.min_similarity) {
        query += ` AND 1 - (g.embedding <=> $1::vector) >= $${paramCount}`;
        params.push(filters.min_similarity);
        paramCount++;
      }

      query += ` ORDER BY g.embedding <=> $1::vector LIMIT $${paramCount}`;
      params.push(filters.limit || 20);

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error searching grievances:', error);
      throw error;
    }
  },
};
