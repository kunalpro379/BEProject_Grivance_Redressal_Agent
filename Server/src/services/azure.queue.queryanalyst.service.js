import { QueueServiceClient } from '@azure/storage-queue';
import dotenv from 'dotenv';

dotenv.config();

class AzureQueryAnalystQueueService {
    constructor() {
        const connectionString = process.env.AZURE_QUEUE_QUERYANALYST_CONNECTION_STRING || process.env.AZURE_STORAGE_CONNECTION_STRING;
        const queueName = process.env.AZURE_QUEUE_QUERYANALYST_NAME || 'queryanalyst';

        if (!connectionString) {
            throw new Error('AZURE_QUEUE_QUERYANALYST_CONNECTION_STRING or AZURE_STORAGE_CONNECTION_STRING is required. Please configure it in .env file.');
        }

        const queueServiceClient = QueueServiceClient.fromConnectionString(connectionString);
        this.queueClient = queueServiceClient.getQueueClient(queueName);
        console.log(`Azure Query Analyst Queue Service initialized (queue: ${queueName})`);
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

            console.log('Message enqueued to Query Analyst Queue:', {
                messageId: response.messageId,
                insertionTime: response.insertionTime
            });

            return response;
        } catch (error) {
            console.error('Azure Query Analyst Queue sendMessage error:', error.message);
            throw new Error(`Failed to enqueue message to Query Analyst Queue: ${error.message}`);
        }
    }
}

// Export singleton instance
const azureQueryAnalystQueueService = new AzureQueryAnalystQueueService();
export default azureQueryAnalystQueueService;
