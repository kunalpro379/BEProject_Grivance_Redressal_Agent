/**
 * Test script to verify Azure Queue service is working
 * Run with: node test_queue.js
 */

import azureQueryAnalystQueueService from './src/services/azure.queue.queryanalyst.service.js';

async function testQueue() {
    console.log('🧪 Testing Azure Query Analyst Queue Service...\n');

    try {
        const testMessage = {
            test: true,
            grievance_id: 'test-' + Date.now(),
            citizen_id: 'test-citizen',
            telegram_id: 123456789,
            grievance_text: 'This is a test message',
            image_path: null,
            timestamp: new Date().toISOString(),
            source: 'test'
        };

        console.log('📤 Sending test message to queue...');
        console.log('Message:', JSON.stringify(testMessage, null, 2));

        const response = await azureQueryAnalystQueueService.sendMessage(testMessage);

        console.log('\n✅ SUCCESS! Message enqueued:');
        console.log('   Message ID:', response.messageId);
        console.log('   Insertion Time:', response.insertionTime);
        console.log('   Expiration Time:', response.expirationTime);
        console.log('\n✅ Queue service is working correctly!\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ FAILED! Queue service error:');
        console.error('   Error:', error.message);
        console.error('   Stack:', error.stack);
        console.error('\n❌ Please check your Azure Queue configuration in .env file\n');
        
        console.log('Required environment variables:');
        console.log('   AZURE_QUEUE_QUERYANALYST_CONNECTION_STRING or AZURE_STORAGE_CONNECTION_STRING');
        console.log('   AZURE_QUEUE_QUERYANALYST_NAME (default: queryanalyst)');
        
        process.exit(1);
    }
}

testQueue();
