import { QueueServiceClient } from '@azure/storage-queue';
import dotenv from 'dotenv';

dotenv.config();

class AzureQueueService {
    constructor() {
        const connectionString = process.env.AZURE_QUEUE_CONNECTION_STRING || process.env.AZURE_STORAGE_CONNECTION_STRING;
        const queueName = process.env.AZURE_QUEUE_NAME || 'queryanalyst';

        if (!connectionString) {
            throw new Error('AZURE_QUEUE_CONNECTION_STRING or AZURE_STORAGE_CONNECTION_STRING is required. Please configure it in .env file.');
        }

        const queueServiceClient = QueueServiceClient.fromConnectionString(connectionString);
        this.queueClient = queueServiceClient.getQueueClient(queueName);
        console.log('Azure Queue Service initialized');
    }

    async sendMessage(message) {
        try {
            // Ensure queue exists
            await this.queueClient.createIfNotExists();

            const payload = {
                ...message,
                enqueuedAt: new Date().toISOString()
            };

            // Azure Queue messages must be text; base64-encode JSON for safety
            const encodedMessage = Buffer.from(JSON.stringify(payload)).toString('base64');

            const response = await this.queueClient.sendMessage(encodedMessage);

            console.log('Message enqueued to Azure Queue:', {
                messageId: response.messageId,
                insertionTime: response.insertionTime
            });

            return response;
        } catch (error) {
            console.error('Azure Queue sendMessage error:', error.message);
            throw new Error(`Failed to enqueue message to Azure Queue: ${error.message}`);
        }
    }
}

// Export singleton instance
const azureQueueService = new AzureQueueService();
export default azureQueueService;
