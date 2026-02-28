/**
 * Test script to verify Azure Blob Storage service is working
 * Run with: node test_blob_storage.js
 */

import azureStorageService from './src/services/azure.storage.services.js';
import fs from 'fs';
import path from 'path';

async function testBlobStorage() {
    console.log('🧪 Testing Azure Blob Storage Service...\n');

    try {
        // Create a test file
        const testDir = './temp';
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }

        const testFilePath = path.join(testDir, 'test_upload.txt');
        const testContent = `Test file created at ${new Date().toISOString()}\nThis is a test upload to Azure Blob Storage.`;
        
        fs.writeFileSync(testFilePath, testContent);
        console.log('✅ Test file created:', testFilePath);

        // Test upload
        console.log('\n📤 Uploading test file to Azure Blob Storage...');
        const testFileName = `test/test_upload_${Date.now()}.txt`;
        
        const result = await azureStorageService.uploadFile(testFilePath, testFileName);

        console.log('\n✅ SUCCESS! File uploaded to Azure:');
        console.log('   File Name:', result.fileName);
        console.log('   URL:', result.url);
        console.log('   Request ID:', result.uploadResponse.requestId);

        // Clean up test file
        fs.unlinkSync(testFilePath);
        console.log('\n🧹 Test file cleaned up');

        console.log('\n✅ Blob Storage service is working correctly!\n');
        console.log('You can access the uploaded file at:');
        console.log(result.url);
        console.log('\nNote: If the URL is not accessible, check your container access level.');
        console.log('Container should have "Blob" or "Container" public access level.\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ FAILED! Blob Storage error:');
        console.error('   Error:', error.message);
        
        if (error.code) {
            console.error('   Error Code:', error.code);
        }
        if (error.statusCode) {
            console.error('   Status Code:', error.statusCode);
        }
        
        console.error('\n❌ Please check your Azure Blob Storage configuration in .env file\n');
        
        console.log('Required environment variables:');
        console.log('   AZURE_STORAGE_CONNECTION_STRING');
        console.log('   AZURE_STORAGE_CONTAINER_NAME (default: igrs)');
        
        console.log('\nCommon issues:');
        console.log('   1. Invalid connection string');
        console.log('   2. Container does not exist (will be created automatically)');
        console.log('   3. Network connectivity issues');
        console.log('   4. Storage account access key expired or invalid');
        
        // Clean up test file if it exists
        const testFilePath = path.join('./temp', 'test_upload.txt');
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
        
        process.exit(1);
    }
}

testBlobStorage();
