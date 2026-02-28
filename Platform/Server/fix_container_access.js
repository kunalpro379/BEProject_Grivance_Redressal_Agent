/**
 * Script to check and fix Azure container access level
 * Run with: node fix_container_access.js
 */

import { BlobServiceClient } from '@azure/storage-blob';
import dotenv from 'dotenv';

dotenv.config();

async function fixContainerAccess() {
    console.log('🔧 Checking and fixing Azure container access level...\n');

    try {
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'igrs';

        if (!connectionString) {
            throw new Error('AZURE_STORAGE_CONNECTION_STRING not found in .env');
        }

        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = blobServiceClient.getContainerClient(containerName);

        // Check if container exists
        console.log('📋 Checking container:', containerName);
        const exists = await containerClient.exists();
        
        if (!exists) {
            console.log('❌ Container does not exist. Creating...');
            await containerClient.create({ access: 'blob' });
            console.log('✅ Container created with Blob access level');
        } else {
            console.log('✅ Container exists');
        }

        // Get current access level
        console.log('\n📋 Checking current access level...');
        const accessPolicy = await containerClient.getAccessPolicy();
        const currentAccess = accessPolicy.blobPublicAccess || 'private';
        console.log('   Current access level:', currentAccess);

        // Set to blob access if not already
        if (currentAccess !== 'blob' && currentAccess !== 'container') {
            console.log('\n🔧 Setting access level to "blob"...');
            await containerClient.setAccessPolicy('blob');
            console.log('✅ Access level updated to "blob"');
        } else {
            console.log('✅ Access level is already public');
        }

        // Verify the change
        console.log('\n📋 Verifying access level...');
        const verifyPolicy = await containerClient.getAccessPolicy();
        const newAccess = verifyPolicy.blobPublicAccess || 'private';
        console.log('   New access level:', newAccess);

        if (newAccess === 'blob' || newAccess === 'container') {
            console.log('\n✅ SUCCESS! Container is now publicly accessible');
            console.log('   Container:', containerName);
            console.log('   Access Level:', newAccess);
            console.log('   Blobs can be accessed via their URLs\n');
        } else {
            console.log('\n⚠️  WARNING: Access level is still private');
            console.log('   You may need to set this manually in Azure Portal\n');
        }

        process.exit(0);
    } catch (error) {
        console.error('\n❌ FAILED!');
        console.error('   Error:', error.message);
        
        if (error.code) {
            console.error('   Error Code:', error.code);
        }
        if (error.statusCode) {
            console.error('   Status Code:', error.statusCode);
        }

        console.error('\n💡 Manual Fix:');
        console.error('   1. Go to Azure Portal');
        console.error('   2. Navigate to: Storage Accounts → igrs → Containers → igrs');
        console.error('   3. Click "Change access level"');
        console.error('   4. Select "Blob (anonymous read access for blobs only)"');
        console.error('   5. Click "OK"\n');

        process.exit(1);
    }
}

fixContainerAccess();
