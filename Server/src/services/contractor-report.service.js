import pool from '../config/database.js';
import { BlobServiceClient } from '@azure/storage-blob';
import OpenAI from 'openai';
import { createRequire } from 'module';
import axios from 'axios';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

class ContractorReportService {
  constructor() {
    // Initialize Gemini API for embeddings
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.geminiBaseUrl = 'https://generativelanguage.googleapis.com/v1beta';

    // Initialize Azure Blob Storage (optional)
    if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
      try {
        this.blobServiceClient = BlobServiceClient.fromConnectionString(
          process.env.AZURE_STORAGE_CONNECTION_STRING
        );
        this.containerClient = this.blobServiceClient.getContainerClient(
          process.env.AZURE_STORAGE_CONTAINER_NAME || 'igrs'
        );
      } catch (error) {
        console.warn('⚠️  Azure Blob Storage not configured, document uploads will be disabled');
        this.blobServiceClient = null;
        this.containerClient = null;
      }
    } else {
      console.warn('⚠️  Azure Blob Storage not configured, document uploads will be disabled');
      this.blobServiceClient = null;
      this.containerClient = null;
    }
  }

  /**
   * Generate embeddings for text using Gemini
   */
  async generateEmbedding(text) {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${this.geminiApiKey}`,
        {
          model: "models/text-embedding-004",
          content: {
            parts: [{ text }]
          }
        }
      );
      return response.data.embedding.values;
    } catch (error) {
      console.error('Error generating embedding:', error.response?.data || error.message);
      // Return null instead of throwing - embeddings are optional
      return null;
    }
  }

  /**
   * Upload document to Azure Blob Storage
   */
  async uploadDocument(buffer, fileName, contractorId) {
    if (!this.containerClient) {
      throw new Error('Azure Blob Storage not configured');
    }
    
    try {
      const blobName = `contractors/${contractorId}/${Date.now()}_${fileName}`;
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      
      await blockBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: {
          blobContentType: this.getContentType(fileName)
        }
      });

      return blockBlobClient.url;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  }

  /**
   * Extract text from PDF buffer
   */
  async extractTextFromPDF(buffer) {
    try {
      // pdf-parse requires instantiating PDFParse class
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      return result.text;
    } catch (error) {
      console.error('Error extracting text from PDF:', error.message);
      return null;
    }
  }

  /**
   * Process document: upload to blob and extract text if PDF
   */
  async processDocument(buffer, fileName, contractorId) {
    try {
      // Upload to blob storage
      const blobUrl = await this.uploadDocument(buffer, fileName, contractorId);
      
      // Extract text if PDF
      let extractedText = null;
      if (fileName.toLowerCase().endsWith('.pdf')) {
        extractedText = await this.extractTextFromPDF(buffer);
      }

      return {
        url: blobUrl,
        fileName,
        extractedText,
        fileType: this.getContentType(fileName)
      };
    } catch (error) {
      console.error('Error processing document:', error);
      throw error;
    }
  }

  getContentType(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const contentTypes = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png'
    };
    return contentTypes[ext] || 'application/octet-stream';
  }

  /**
   * Save contractor report with embeddings
   */
  async saveReport(data) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Build report text including extracted PDF content
      let reportText = `
        Project: ${data.project_name}
        Contract ID: ${data.contract_id}
        Progress: ${data.progress_percentage}%
        Description: ${data.description}
        Challenges: ${data.challenges || 'None'}
        Next Steps: ${data.next_steps || 'None'}
      `.trim();

      // Add extracted text from documents
      if (data.extracted_texts && data.extracted_texts.length > 0) {
        reportText += '\n\nDocument Content:\n';
        data.extracted_texts.forEach((text, index) => {
          if (text) {
            reportText += `\nDocument ${index + 1}:\n${text.substring(0, 2000)}\n`;
          }
        });
      }

      // Try to generate embedding, but don't fail if it doesn't work
      let embedding = null;
      try {
        embedding = await this.generateEmbedding(reportText);
      } catch (embeddingError) {
        console.warn('⚠️  Could not generate embedding, saving without it:', embeddingError.message);
      }

      // Insert report with embedding and AI analysis
      const result = await client.query(
        `INSERT INTO contractor_reports (
          contractor_id,
          user_id,
          project_name,
          contract_id,
          progress_percentage,
          description,
          challenges,
          next_steps,
          document_urls,
          document_metadata,
          extracted_texts,
          report_text,
          embedding,
          ai_analysis,
          conversation_history
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          data.contractor_id,
          data.user_id,
          data.project_name,
          data.contract_id,
          data.progress_percentage,
          data.description,
          data.challenges,
          data.next_steps,
          data.document_urls || [],
          JSON.stringify(data.document_metadata || []),
          data.extracted_texts || [],
          reportText,
          embedding ? JSON.stringify(embedding) : null,
          data.ai_analysis ? JSON.stringify(data.ai_analysis) : null,
          data.conversation_history ? JSON.stringify(data.conversation_history) : null
        ]
      );

      await client.query('COMMIT');
      return result.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error saving contractor report:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all reports for a contractor
   */
  async getContractorReports(contractorId, limit = 50) {
    const result = await pool.query(
      `SELECT 
        id,
        contractor_id,
        user_id,
        project_name,
        contract_id,
        progress_percentage,
        description,
        challenges,
        next_steps,
        document_urls,
        document_metadata,
        extracted_texts,
        report_text,
        ai_analysis,
        conversation_history,
        created_at,
        updated_at
      FROM contractor_reports
      WHERE contractor_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
      [contractorId, limit]
    );

    return result.rows;
  }

  /**
   * Search reports using vector similarity
   */
  async searchReports(query, limit = 10) {
    try {
      const queryEmbedding = await this.generateEmbedding(query);

      const result = await pool.query(
        `SELECT 
          cr.id,
          cr.contractor_id,
          cr.project_name,
          cr.contract_id,
          cr.progress_percentage,
          cr.description,
          cr.created_at,
          c.company_name,
          1 - (cr.embedding <=> $1::vector) as similarity
        FROM contractor_reports cr
        JOIN contractors c ON cr.contractor_id = c.id
        WHERE cr.embedding IS NOT NULL
        ORDER BY cr.embedding <=> $1::vector
        LIMIT $2`,
        [JSON.stringify(queryEmbedding), limit]
      );

      return result.rows;
    } catch (error) {
      console.error('Error searching reports:', error);
      throw error;
    }
  }

  /**
   * Get report statistics for a contractor
   */
  async getContractorStats(contractorId) {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_reports,
        AVG(progress_percentage) as avg_progress,
        MAX(created_at) as last_report_date,
        COUNT(DISTINCT contract_id) as active_projects
      FROM contractor_reports
      WHERE contractor_id = $1`,
      [contractorId]
    );

    return result.rows[0];
  }

  /**
   * Get all contractors with their latest reports
   */
  async getAllContractorsWithReports(limit = 100) {
    const result = await pool.query(
      `SELECT 
        c.id as contractor_id,
        c.company_name,
        c.contractor_id as license_number,
        c.specialization as category,
        COALESCE(c.is_active, true) as verification_status,
        c.contractor_report_id,
        cr_linked.report_text as linked_report_text,
        cr_linked.project_name as linked_project_name,
        cr_linked.progress_percentage as linked_progress,
        cr_linked.created_at as linked_report_date,
        COUNT(cr.id) as total_reports,
        AVG(cr.progress_percentage) as avg_progress,
        MAX(cr.created_at) as last_report_date,
        json_agg(
          json_build_object(
            'id', cr.id,
            'project_name', cr.project_name,
            'contract_id', cr.contract_id,
            'progress_percentage', cr.progress_percentage,
            'description', cr.description,
            'challenges', cr.challenges,
            'next_steps', cr.next_steps,
            'document_urls', cr.document_urls,
            'document_metadata', cr.document_metadata,
            'extracted_texts', cr.extracted_texts,
            'report_text', cr.report_text,
            'ai_analysis', cr.ai_analysis,
            'conversation_history', cr.conversation_history,
            'created_at', cr.created_at
          ) ORDER BY cr.created_at DESC
        ) FILTER (WHERE cr.id IS NOT NULL) as recent_reports
      FROM contractors c
      LEFT JOIN contractor_reports cr ON c.id = cr.contractor_id
      LEFT JOIN contractor_reports cr_linked ON c.contractor_report_id = cr_linked.id
      GROUP BY c.id, c.company_name, c.contractor_id, c.specialization, c.is_active, 
               c.contractor_report_id, cr_linked.report_text, cr_linked.project_name, 
               cr_linked.progress_percentage, cr_linked.created_at
      ORDER BY last_report_date DESC NULLS LAST
      LIMIT $1`,
      [limit]
    );

    return result.rows;
  }
}

export default new ContractorReportService();
