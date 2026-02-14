const azureStorage = require('./azure.storage.services');
const azureQueue = require('./azure.queue.service');
const fs = require('fs');
const path = require('path');

class GrievanceService {
    async submitGrievance(grievanceData, file) {
        try {
            const { query, userId, userName } = grievanceData;
            
            // Generate unique grievance ID and file path inside griviences/<grievienceId>/
            const timestamp = Date.now();
            const grievanceId = `GRV_${timestamp}`;

            const fileExtension = path.extname(file.originalname || '');
            const safeOriginalName = (file.originalname || 'proof')
                .replace(/\s+/g, '_')
                .replace(/[^a-zA-Z0-9._-]/g, '');

            // Blob path: griviences/<grievienceId>/<fileName>
            const fileName = `griviences/${grievanceId}/${safeOriginalName || `proof${fileExtension}`}`;
            
            // Upload to Azure Storage
            const uploadResult = await azureStorage.uploadFile(file, fileName);
            
            // Clean up local file
            this.cleanupLocalFile(file.path);
            
            // Create submission record
            const submission = {
                submissionId: grievanceId,
                userId,
                userName,
                query,
                proofFileName: file.originalname,
                azureFileName: fileName,
                azureUrl: uploadResult.url,
                status: 'processing',
                createdAt: new Date().toISOString()
            };

            // Push message to Azure Queue for further processing by QueryAnalyst
            await azureQueue.sendMessage({
                grievanceId,
                submissionId: grievanceId,
                userId,
                userName,
                query,
                proofFileUrl: uploadResult.url,
                current_status: 'QueryAnalyst'
            });
            
            console.log('Grievance submitted successfully:', submission);
            
            return {
                success: true,
                message: "I'm processing your document. I will notify you once processing is done.",
                data: submission
            };
            
        } catch (error) {
            // Clean up local file in case of error
            if (file && file.path) {
                this.cleanupLocalFile(file.path);
            }
            
            console.error('Error in submitGrievance:', error);
            throw new Error(`Failed to submit grievance: ${error.message}`);
        }
    }
    
    cleanupLocalFile(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`Local file cleaned up: ${filePath}`);
            }
        } catch (error) {
            console.error(`Error cleaning up local file: ${error.message}`);
        }
    }
}

module.exports = new GrievanceService();