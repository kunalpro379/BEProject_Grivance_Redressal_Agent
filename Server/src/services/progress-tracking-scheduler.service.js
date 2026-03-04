/**
 * Progress Tracking Scheduler Service
 * 
 * Runs the Python ProgressTrackingAgent every hour to analyze department progress
 * and uploads the generated reports to Azure Blob Storage
 */

import { spawn } from 'child_process';
import { BlobServiceClient } from '@azure/storage-blob';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProgressTrackingSchedulerService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.pythonWorkerPath = path.join(__dirname, '../../../Agents/ProgressTrackingAgent/worker.py');
    this.reportsDir = path.join(__dirname, '../../../Agents/ProgressTrackingAgent/reports');
    this.intervalHours = 1; // Run every 1 hour
    
    // Azure Blob Storage configuration
    this.connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    this.containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'igrs';
    this.reportsBlobFolder = 'progress-reports';
  }

  /**
   * Start the scheduler
   */
  start() {
    if (this.isRunning) {
      console.log('  Progress Tracking Scheduler is already running');
      return;
    }

    console.log('\n Starting Progress Tracking Scheduler');
    console.log(` Analysis will run every ${this.intervalHours} hour(s)`);
    
    // Run immediately on start
    this.runAnalysis();
    
    // Schedule periodic runs
    this.intervalId = setInterval(() => {
      this.runAnalysis();
    }, this.intervalHours * 60 * 60 * 1000); // Convert hours to milliseconds
    
    this.isRunning = true;
    console.log(' Progress Tracking Scheduler started successfully');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (!this.isRunning) {
      console.log('  Progress Tracking Scheduler is not running');
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log(' Progress Tracking Scheduler stopped');
  }

  /**
   * Run the Python ProgressTrackingAgent
   */
  async runAnalysis() {
    console.log('\n' + '='.repeat(60));
    console.log(' Running Progress Tracking Analysis');
    console.log(` Time: ${new Date().toISOString()}`);
    console.log('='.repeat(60));

    try {
      // Check if Python worker exists
      if (!fs.existsSync(this.pythonWorkerPath)) {
        console.error(` Python worker not found at: ${this.pythonWorkerPath}`);
        return;
      }

      // Run Python worker (single analysis, not continuous)
      await this.runPythonWorker();

      // Upload reports to Azure Blob Storage
      await this.uploadReportsToBlob();

      console.log(' Progress Tracking Analysis completed successfully');
      console.log('='.repeat(60) + '\n');

    } catch (error) {
      console.error(' Error running progress tracking analysis:', error);
      console.error('Stack trace:', error.stack);
    }
  }

  /**
   * Run the Python worker script
   */
  runPythonWorker() {
    return new Promise((resolve, reject) => {
      console.log(' Spawning Python worker process...');

      // Spawn Python process
      const pythonProcess = spawn('python', [this.pythonWorkerPath, '--once'], {
        cwd: path.dirname(this.pythonWorkerPath),
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1' // Ensure real-time output
        }
      });

      let stdout = '';
      let stderr = '';

      // Capture stdout
      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        console.log(`[Python] ${output.trim()}`);
      });

      // Capture stderr
      pythonProcess.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        console.error(`[Python Error] ${output.trim()}`);
      });

      // Handle process completion
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          console.log(' Python worker completed successfully');
          resolve({ stdout, stderr });
        } else {
          console.error(` Python worker exited with code ${code}`);
          reject(new Error(`Python worker failed with exit code ${code}\n${stderr}`));
        }
      });

      // Handle process errors
      pythonProcess.on('error', (error) => {
        console.error(' Failed to start Python worker:', error);
        reject(error);
      });

      // Set timeout (30 minutes max)
      setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('Python worker timeout after 30 minutes'));
      }, 30 * 60 * 1000);
    });
  }

  /**
   * Upload generated reports to Azure Blob Storage
   */
  async uploadReportsToBlob() {
    try {
      console.log('\n Uploading reports to Azure Blob Storage...');

      if (!this.connectionString) {
        console.error(' Azure Storage connection string not configured');
        return;
      }

      // Check if reports directory exists
      if (!fs.existsSync(this.reportsDir)) {
        console.log('  Reports directory not found, skipping upload');
        return;
      }

      // Get all markdown files from reports directory
      const files = fs.readdirSync(this.reportsDir)
        .filter(file => file.endsWith('.md'))
        .map(file => ({
          name: file,
          path: path.join(this.reportsDir, file),
          stats: fs.statSync(path.join(this.reportsDir, file))
        }))
        .sort((a, b) => b.stats.mtime - a.stats.mtime); // Sort by modification time (newest first)

      if (files.length === 0) {
        console.log('  No markdown reports found');
        return;
      }

      console.log(` Found ${files.length} report file(s)`);

      // Initialize Azure Blob Service Client
      const blobServiceClient = BlobServiceClient.fromConnectionString(this.connectionString);
      const containerClient = blobServiceClient.getContainerClient(this.containerName);

      // Ensure container exists
      await containerClient.createIfNotExists();

      // Import pool for database operations
      const { default: pool } = await import('../config/db.js');

      // Upload each file
      let uploadedCount = 0;
      for (const file of files) {
        try {
          // Extract department name from filename
          // Format: department_Water_Supply_Department_20260301_040940.md
          const match = file.name.match(/department_(.+)_(\d{8})_(\d{6})\.md/);
          
          if (!match) {
            console.log(`  Skipping ${file.name} - doesn't match expected format`);
            continue;
          }

          const departmentName = match[1].replace(/_/g, ' ');
          const dateStr = match[2]; // YYYYMMDD
          const timeStr = match[3]; // HHMMSS

          // Get department ID from database
          const deptResult = await pool.query(
            'SELECT id FROM departments WHERE name = $1',
            [departmentName]
          );

          if (deptResult.rows.length === 0) {
            console.log(`  Department not found: ${departmentName}`);
            continue;
          }

          const departmentId = deptResult.rows[0].id;

          // Create blob path: progress-reports/{departmentId}/{filename}
          const blobName = `${this.reportsBlobFolder}/${departmentId}/${file.name}`;
          const blockBlobClient = containerClient.getBlockBlobClient(blobName);

          // Read file content
          const fileContent = fs.readFileSync(file.path, 'utf-8');

          // Upload to blob
          await blockBlobClient.upload(fileContent, Buffer.byteLength(fileContent), {
            blobHTTPHeaders: {
              blobContentType: 'text/markdown'
            },
            metadata: {
              uploadedAt: new Date().toISOString(),
              source: 'progress-tracking-agent',
              departmentId: departmentId,
              departmentName: departmentName,
              reportDate: `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`,
              reportTime: `${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}:${timeStr.slice(4, 6)}`
            }
          });

          const blobUrl = blockBlobClient.url;
          console.log(` Uploaded: ${file.name} → ${blobName}`);

          // Save URL to database in department_dashboards table
          await pool.query(
            `INSERT INTO department_dashboards (department_id, dashboard_data, created_at, updated_at)
             VALUES ($1, $2, NOW(), NOW())
             ON CONFLICT (department_id)
             DO UPDATE SET 
               dashboard_data = jsonb_set(
                 COALESCE(department_dashboards.dashboard_data, '{}'::jsonb),
                 '{progressReports}',
                 COALESCE(department_dashboards.dashboard_data->'progressReports', '[]'::jsonb) || $2::jsonb->'progressReports'
               ),
               updated_at = NOW()`,
            [
              departmentId,
              JSON.stringify({
                progressReports: [{
                  url: blobUrl,
                  fileName: file.name,
                  uploadedAt: new Date().toISOString(),
                  reportDate: `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`,
                  reportTime: `${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}:${timeStr.slice(4, 6)}`,
                  departmentName: departmentName
                }]
              })
            ]
          );

          console.log(` Saved URL to database for department: ${departmentName} (${departmentId})`);
          uploadedCount++;

        } catch (uploadError) {
          console.error(` Failed to upload ${file.name}:`, uploadError.message);
        }
      }

      console.log(`\n Successfully uploaded ${uploadedCount}/${files.length} report(s) to Azure Blob Storage`);

    } catch (error) {
      console.error(' Error uploading reports to blob:', error);
      throw error;
    }
  }

  /**
   * Get the latest report for a specific department from Azure Blob Storage
   */
  async getLatestDepartmentReport(departmentId) {
    try {
      if (!this.connectionString) {
        throw new Error('Azure Storage connection string not configured');
      }

      const blobServiceClient = BlobServiceClient.fromConnectionString(this.connectionString);
      const containerClient = blobServiceClient.getContainerClient(this.containerName);

      // List all blobs in the department-specific folder: progress-reports/{departmentId}/
      const prefix = `${this.reportsBlobFolder}/${departmentId}/`;
      const blobs = [];
      
      for await (const blob of containerClient.listBlobsFlat({ prefix })) {
        blobs.push(blob);
      }

      if (blobs.length === 0) {
        return null;
      }

      // Sort by last modified (newest first)
      blobs.sort((a, b) => new Date(b.properties.lastModified) - new Date(a.properties.lastModified));

      // Get the latest blob
      const latestBlob = blobs[0];
      const blockBlobClient = containerClient.getBlockBlobClient(latestBlob.name);

      // Download blob content
      const downloadResponse = await blockBlobClient.download();
      const content = await this.streamToString(downloadResponse.readableStreamBody);

      return {
        fileName: latestBlob.name,
        content: content,
        lastModified: latestBlob.properties.lastModified,
        size: latestBlob.properties.contentLength
      };

    } catch (error) {
      console.error('Error fetching latest department report:', error);
      throw error;
    }
  }

  /**
   * Helper function to convert stream to string
   */
  async streamToString(readableStream) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      readableStream.on('data', (data) => {
        chunks.push(data.toString());
      });
      readableStream.on('end', () => {
        resolve(chunks.join(''));
      });
      readableStream.on('error', reject);
    });
  }

  /**
   * Get status of the scheduler
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalHours: this.intervalHours,
      pythonWorkerPath: this.pythonWorkerPath,
      reportsDir: this.reportsDir,
      azureConfigured: !!this.connectionString
    };
  }
}

// Export singleton instance
const progressTrackingScheduler = new ProgressTrackingSchedulerService();
export default progressTrackingScheduler;
