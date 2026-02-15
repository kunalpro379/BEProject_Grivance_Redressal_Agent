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
            const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
            
            // Ensure container exists with private access (most secure)
            await containerClient.createIfNotExists();

            const blockBlobClient = containerClient.getBlockBlobClient(fileName);
            
            // Upload file - filePath can be a string path or an object with .path property
            const pathToUpload = typeof filePath === 'string' ? filePath : filePath.path;
            const uploadResponse = await blockBlobClient.uploadFile(pathToUpload);
            
            console.log(`File uploaded successfully to Azure: ${fileName}`);
            
            return {
                success: true,
                url: blockBlobClient.url,
                fileName: fileName,
                uploadResponse
            };

        } catch (error) {
            console.error('Azure upload error:', error.message);
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
