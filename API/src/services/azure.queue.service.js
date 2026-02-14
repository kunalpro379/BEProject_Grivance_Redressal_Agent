const { QueueServiceClient } = require('@azure/storage-queue');
require('dotenv').config();

class AzureQueueService {
    constructor() {
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        // API submits grievances to queryanalyst queue
        const queueName = process.env.AZURE_QUEUE_NAME || 'queryanalyst';

        if (!connectionString) {
            throw new Error('AZURE_STORAGE_CONNECTION_STRING is not configured for Azure Queue.');
        }

        const queueServiceClient = QueueServiceClient.fromConnectionString(connectionString);
        this.queueClient = queueServiceClient.getQueueClient(queueName);
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
            console.error('Azure Queue sendMessage error:', error);
            throw new Error(`Failed to enqueue message to Azure Queue: ${error.message}`);
        }
    }
}

module.exports = new AzureQueueService();

