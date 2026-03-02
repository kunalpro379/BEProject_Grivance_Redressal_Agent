#!/usr/bin/env node

/**
 * Hierarchy Test Script
 * 
 * This script connects to your database and demonstrates:
 * 1. Current data in city_officials and ward_officers
 * 2. Simulated hierarchy query (before schema changes)
 * 3. What the query will look like after schema changes
 * 
 * Usage: node test_hierarchy.js
 */

const { Client } = require('pg');
require('dotenv').config({ path: '../Server/.env' });

// Database configuration from .env
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

console.log('\n========================================');
console.log('  HIERARCHY TEST SCRIPT');
console.log('========================================\n');

async function testHierarchy() {
  const client = new Client(dbConfig);
  
  try {
    console.log('📡 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Step 1: Get a sample City Commissioner
    console.log('========================================');
    console.log('STEP 1: Sample City Commissioner');
    console.log('========================================\n');
    
    const commissionerQuery = `
      SELECT 
        co.id,
        u.full_name,
        u.email,
        co.designation,
        co.city,
        co.district,
        co.corporation_name
      FROM city_officials co
      JOIN users u ON co.user_id = u.id
      WHERE co.designation ILIKE '%commissioner%'
      LIMIT 1
    `;
    
    const commissionerResult = await client.query(commissionerQuery);
    
    if (commissionerResult.rows.length === 0) {
      console.log('❌ No City Commissioner found in database');
      console.log('   Please add a city official with designation containing "commissioner"\n');
      return;
    }
    
    const commissioner = commissionerResult.rows[0];
    console.log('📋 City Commissioner Details:');
    console.log('   ID:', commissioner.id);
    console.log('   Name:', commissioner.full_name);
    console.log('   Email:', commissioner.email);
    console.log('   Designation:', commissioner.designation);
    co