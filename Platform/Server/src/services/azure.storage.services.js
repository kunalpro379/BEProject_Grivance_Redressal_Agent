import { BlobServiceClient } from '@azure/storage-blob';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

class AzureStorageService {
    constructor() {
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'igrs';

        if (!connectionString) {
            throw new Error('AZURE_STORAGE_CONNECTION_STRING is required. Please configure it in .env file.');
        }

        this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        this.containerName = containerName;
        console.log('Azure Storage Service initialized');
    }

    async uploadFile(filePath, fileName) {
        try {
            console.log('[Azure Storage] Starting upload:', {
                filePath: typeof filePath === 'string' ? filePath : filePath?.path,
                fileName,
                containerName: this.containerName
            });

            const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
            
            // Ensure container exists with public read access for blob URLs to work
            const createResponse = await containerClient.createIfNotExists({
                access: 'blob' // Allow public read access to blobs
            });
            
            if (createResponse.succeeded) {
                console.log('[Azure Storage] Container created:', this.containerName);
            }

            // Sanitize fileName to ensure it's a valid blob name
            const sanitizedFileName = fileName.replace(/\\/g, '/');
            const blockBlobClient = containerClient.getBlockBlobClient(sanitizedFileName);
            
            // Upload file - filePath can be a string path or an object with .path property
            const pathToUpload = typeof filePath === 'string' ? filePath : filePath.path;
            
            if (!pathToUpload) {
                throw new Error('Invalid file path provided');
            }

            console.log('[Azure Storage] Uploading file from:', pathToUpload);
            
            const uploadResponse = await blockBlobClient.uploadFile(pathToUpload);
            
            console.log('[Azure Storage] File uploaded successfully:', {
                fileName: sanitizedFileName,
                url: blockBlobClient.url,
                requestId: uploadResponse.requestId
            });
            
            return {
                success: true,
                url: blockBlobClient.url,
                fileName: sanitizedFileName,
                uploadResponse
            };

        } catch (error) {
            console.error('[Azure Storage] Upload error:', {
                message: error.message,
                code: error.code,
                statusCode: error.statusCode,
                stack: error.stack
            });
            throw new Error(`Failed to upload file to Azure: ${error.message}`);
        }
    }

    async deleteFile(fileName) {
        try {
            const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
            const blockBlobClient = containerClient.getBlockBlobClient(fileName);
            
            await blockBlobClient.delete();
            console.log(`File deleted from Azure: ${fileName}`);
            
        } catch (error) {
            console.error('Azure delete error:', error.message);
            throw new Error(`Failed to delete file from Azure: ${error.message}`);
        }
    }
}

// Export singleton instance
const azureStorageService = new AzureStorageService();
export default azureStorageService;
