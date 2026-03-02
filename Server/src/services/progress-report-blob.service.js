import { BlobServiceClient } from '@azure/storage-blob';
import fs from 'fs/promises';
import path from 'path';
import pool from '../config/database.js';

class ProgressReportBlobService {
  constructor() {
    this.blobServiceClient = null;
    this.containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'igrs';
    
    if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING
      );
    }
  }

  /**
   * Upload a progress report markdown file to Azure Blob Storage
   */
  async uploadReportToBlob(filePath, departmentName) {
    if (!this.blobServiceClient) {
      throw new Error('Azure Blob Storage not configured');
    }

    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      
      // Ensure container exists
      await containerClient.createIfNotExists({
        access: 'blob'
      });

      // Read the file
      const fileContent = await fs.readFile(filePath, 'utf-8');
      
      // Generate blob name with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = path.basename(filePath);
      const blobName = `progress-reports/${departmentName}/${timestamp}_${fileName}`;
      
      // Upload to blob
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.upload(fileContent, Buffer.byteLength(fileContent), {
        blobHTTPHeaders: {
          blobContentType: 'text/markdown'
        }
      });

      // Return the blob URL
      return blockBlobClient.url;
    } catch (error) {
      console.error('Error uploading report to blob:', error);
      throw error;
    }
  }

  /**
   * Save report URL to department_dashboards table
   */
  async saveReportUrlToDashboard(departmentId, reportUrl, reportMetadata = {}) {
    try {
      const result = await pool.query(
        `UPDATE department_dashboards 
         SET dashboard_data = jsonb_set(
           COALESCE(dashboard_data, '{}'::jsonb),
           '{aiAnalysisReports}',
           COALESCE(dashboard_data->'aiAnalysisReports', '[]'::jsonb) || $1::jsonb
         ),
         updated_at = NOW()
         WHERE department_id = $2
         RETURNING id`,
        [
          JSON.stringify({
            url: reportUrl,
            uploadedAt: new Date().toISOString(),
            ...reportMetadata
          }),
          departmentId
        ]
      );

      if (result.rows.length === 0) {
        // Create dashboard entry if it doesn't exist
        await pool.query(
          `INSERT INTO department_dashboards (department_id, dashboard_data, created_at, updated_at)
           VALUES ($1, $2, NOW(), NOW())`,
          [
            departmentId,
            JSON.stringify({
              aiAnalysisReports: [{
                url: reportUrl,
                uploadedAt: new Date().toISOString(),
                ...reportMetadata
              }]
            })
          ]
        );
      }

      return reportUrl;
    } catch (error) {
      console.error('Error saving report URL to dashboard:', error);
      throw error;
    }
  }

  /**
   * Process all reports in the ProgressTrackingAgent reports folder
   */
  async processProgressReports(reportsDir, departmentId, departmentName) {
    try {
      const files = await fs.readdir(reportsDir);
      const markdownFiles = files.filter(f => f.endsWith('.md'));

      const uploadedReports = [];

      for (const file of markdownFiles) {
        const filePath = path.join(reportsDir, file);
        
        // Upload to blob
        const blobUrl = await this.uploadReportToBlob(filePath, departmentName);
        
        // Extract metadata from filename
        const metadata = this.extractMetadataFromFilename(file);
        
        // Save to database
        await this.saveReportUrlToDashboard(departmentId, blobUrl, {
          fileName: file,
          ...metadata
        });

        uploadedReports.push({
          fileName: file,
          blobUrl,
          metadata
        });

        console.log(`✅ Uploaded report: ${file} -> ${blobUrl}`);
      }

      return uploadedReports;
    } catch (error) {
      console.error('Error processing progress reports:', error);
      throw error;
    }
  }

  /**
   * Extract metadata from report filename
   * Example: department_Water_Supply_Department_20260228_225157.md
   */
  extractMetadataFromFilename(filename) {
    const match = filename.match(/department_(.+)_(\d{8})_(\d{6})\.md/);
    
    if (match) {
      const [, departmentName, date, time] = match;
      return {
        departmentName: departmentName.replace(/_/g, ' '),
        reportDate: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`,
        reportTime: `${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}`
      };
    }

    return {
      fileName: filename
    };
  }

  /**
   * Fetch report content from blob URL
   */
  async fetchReportContent(blobUrl) {
    try {
      const response = await fetch(blobUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch report: ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      console.error('Error fetching report content:', error);
      throw error;
    }
  }

  /**
   * Get all reports for a department
   */
  async getDepartmentReports(departmentId) {
    try {
      const result = await pool.query(
        `SELECT dashboard_data->'aiAnalysisReports' as reports
         FROM department_dashboards
         WHERE department_id = $1`,
        [departmentId]
      );

      if (result.rows.length === 0 || !result.rows[0].reports) {
        return [];
      }

      return result.rows[0].reports;
    } catch (error) {
      console.error('Error getting department reports:', error);
      throw error;
    }
  }
}

export default new ProgressReportBlobService();
