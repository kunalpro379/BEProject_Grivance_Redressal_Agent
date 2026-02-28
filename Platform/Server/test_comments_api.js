/**
 * Test script for Comments API
 * Tests all comment endpoints
 */

import dotenv from 'dotenv';
dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

// You need to provide these values
const TEST_CONFIG = {
  // Get this by logging in first
  token: process.env.TEST_TOKEN || 'YOUR_JWT_TOKEN_HERE',
  
  // Use an existing grievance ID
  grievanceId: process.env.TEST_GRIEVANCE_ID || '11655943-6c26-437f-9d11-f0a0eda3380a',
  
  // Test comment text
  commentText: 'This is a test comment from the automated test script.'
};

let createdCommentId = null;

async function makeRequest(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${TEST_CONFIG.token}`,
    'Content-Type': 'application/json',
    ...options.headers
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json();
    
    return {
      status: response.status,
      ok: response.ok,
      data
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message
    };
  }
}

async function test1_AddComment() {
  console.log('\n📝 Test 1: Add Comment');
  console.log('─'.repeat(60));

  const result = await makeRequest(`/grievances/${TEST_CONFIG.grievanceId}/comments`, {
    method: 'POST',
    body: JSON.stringify({
      comment: TEST_CONFIG.commentText,
      isInternal: false
    })
  });

  if (result.ok) {
    createdCommentId = result.data.comment.id;
    console.log('✅ SUCCESS! Comment added');
    console.log(`   Comment ID: ${createdCommentId}`);
    console.log(`   Text: ${result.data.comment.comment}`);
    console.log(`   User: ${result.data.comment.user.name}`);
    console.log(`   Created: ${result.data.comment.created_at}`);
  } else {
    console.log('❌ FAILED!');
    console.log(`   Status: ${result.status}`);
    console.log(`   Error: ${JSON.stringify(result.data, null, 2)}`);
  }

  return result.ok;
}

async function test2_GetComments() {
  console.log('\n📋 Test 2: Get All Comments');
  console.log('─'.repeat(60));

  const result = await makeRequest(`/grievances/${TEST_CONFIG.grievanceId}/comments`);

  if (result.ok) {
    console.log('✅ SUCCESS! Comments retrieved');
    console.log(`   Total Comments: ${result.data.totalCount}`);
    console.log(`   Includes Internal: ${result.data.includesInternal}`);
    console.log('\n   Comments:');
    result.data.comments.forEach((comment, index) => {
      console.log(`   ${index + 1}. ${comment.user.name}: ${comment.comment.substring(0, 50)}...`);
      console.log(`      Created: ${comment.created_at}`);
      console.log(`      Internal: ${comment.is_internal}`);
    });
  } else {
    console.log('❌ FAILED!');
    console.log(`   Status: ${result.status}`);
    console.log(`   Error: ${JSON.stringify(result.data, null, 2)}`);
  }

  return result.ok;
}

async function test3_GetCommentCount() {
  console.log('\n🔢 Test 3: Get Comment Count');
  console.log('─'.repeat(60));

  const result = await makeRequest(`/grievances/${TEST_CONFIG.grievanceId}/comments/count`);

  if (result.ok) {
    console.log('✅ SUCCESS! Comment count retrieved');
    console.log(`   Count: ${result.data.commentCount}`);
  } else {
    console.log('❌ FAILED!');
    console.log(`   Status: ${result.status}`);
    console.log(`   Error: ${JSON.stringify(result.data, null, 2)}`);
  }

  return result.ok;
}

async function test4_UpdateComment() {
  console.log('\n✏️  Test 4: Update Comment');
  console.log('─'.repeat(60));

  if (!createdCommentId) {
    console.log('⚠️  SKIPPED! No comment ID available (Test 1 may have failed)');
    return false;
  }

  const updatedText = TEST_CONFIG.commentText + ' (UPDATED)';

  const result = await makeRequest(`/comments/${createdCommentId}`, {
    method: 'PUT',
    body: JSON.stringify({
      comment: updatedText
    })
  });

  if (result.ok) {
    console.log('✅ SUCCESS! Comment updated');
    console.log(`   Comment ID: ${result.data.comment.id}`);
    console.log(`   New Text: ${result.data.comment.comment}`);
  } else {
    console.log('❌ FAILED!');
    console.log(`   Status: ${result.status}`);
    console.log(`   Error: ${JSON.stringify(result.data, null, 2)}`);
  }

  return result.ok;
}

async function test5_DeleteComment() {
  console.log('\n🗑️  Test 5: Delete Comment');
  console.log('─'.repeat(60));

  if (!createdCommentId) {
    console.log('⚠️  SKIPPED! No comment ID available (Test 1 may have failed)');
    return false;
  }

  const result = await makeRequest(`/comments/${createdCommentId}`, {
    method: 'DELETE'
  });

  if (result.ok) {
    console.log('✅ SUCCESS! Comment deleted');
    console.log(`   Message: ${result.data.message}`);
  } else {
    console.log('❌ FAILED!');
    console.log(`   Status: ${result.status}`);
    console.log(`   Error: ${JSON.stringify(result.data, null, 2)}`);
  }

  return result.ok;
}

async function test6_AddInternalComment() {
  console.log('\n🔒 Test 6: Add Internal Comment (Officials Only)');
  console.log('─'.repeat(60));

  const result = await makeRequest(`/grievances/${TEST_CONFIG.grievanceId}/comments`, {
    method: 'POST',
    body: JSON.stringify({
      comment: 'This is an internal comment for officials only.',
      isInternal: true
    })
  });

  if (result.ok) {
    const isInternal = result.data.comment.is_internal;
    if (isInternal) {
      console.log('✅ SUCCESS! Internal comment added (you have official permissions)');
      console.log(`   Comment ID: ${result.data.comment.id}`);
      console.log(`   Is Internal: ${isInternal}`);
      
      // Clean up - delete the internal comment
      await makeRequest(`/comments/${result.data.comment.id}`, { method: 'DELETE' });
    } else {
      console.log('⚠️  Comment added as public (you don\'t have official permissions)');
      console.log('   This is expected for citizen accounts');
      
      // Clean up
      await makeRequest(`/comments/${result.data.comment.id}`, { method: 'DELETE' });
    }
  } else {
    console.log('❌ FAILED!');
    console.log(`   Status: ${result.status}`);
    console.log(`   Error: ${JSON.stringify(result.data, null, 2)}`);
  }

  return result.ok;
}

async function runAllTests() {
  console.log('\n' + '═'.repeat(60));
  console.log('   COMMENTS API TEST SUITE');
  console.log('═'.repeat(60));
  console.log(`\nAPI URL: ${API_URL}`);
  console.log(`Grievance ID: ${TEST_CONFIG.grievanceId}`);
  console.log(`Token: ${TEST_CONFIG.token.substring(0, 20)}...`);

  if (TEST_CONFIG.token === 'YOUR_JWT_TOKEN_HERE') {
    console.log('\n❌ ERROR: Please set TEST_TOKEN in .env or update TEST_CONFIG');
    console.log('\nTo get a token:');
    console.log('1. Login via /api/auth/login');
    console.log('2. Copy the token from the response');
    console.log('3. Set TEST_TOKEN=<your_token> in .env');
    return;
  }

  const results = {
    passed: 0,
    failed: 0,
    skipped: 0
  };

  // Run tests
  const tests = [
    { name: 'Add Comment', fn: test1_AddComment },
    { name: 'Get Comments', fn: test2_GetComments },
    { name: 'Get Comment Count', fn: test3_GetCommentCount },
    { name: 'Update Comment', fn: test4_UpdateComment },
    { name: 'Delete Comment', fn: test5_DeleteComment },
    { name: 'Add Internal Comment', fn: test6_AddInternalComment }
  ];

  for (const test of tests) {
    try {
      const passed = await test.fn();
      if (passed) {
        results.passed++;
      } else {
        results.failed++;
      }
    } catch (error) {
      console.log(`\n❌ Test "${test.name}" threw an error:`);
      console.log(`   ${error.message}`);
      results.failed++;
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('   TEST SUMMARY');
  console.log('═'.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️  Skipped: ${results.skipped}`);
  console.log(`📊 Total: ${results.passed + results.failed + results.skipped}`);
  console.log('═'.repeat(60) + '\n');

  if (results.failed === 0) {
    console.log('🎉 All tests passed!\n');
  } else {
    console.log('⚠️  Some tests failed. Check the output above for details.\n');
  }
}

// Run tests
runAllTests().catch(console.error);
