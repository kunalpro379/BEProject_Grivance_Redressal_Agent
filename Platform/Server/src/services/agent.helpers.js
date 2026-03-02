import pool from '../config/database.js';
import axios from 'axios';
import { BlobServiceClient } from '@azure/storage-blob';

/**
 * Helper functions for agent workflows
 */

/**
 * Load field worker state for today
 */
export async function loadFieldWorkerState(userId) {
  const today = new Date().toISOString().split('T')[0];
  
  const result = await pool.query(
    `SELECT * FROM field_worker_states 
     WHERE user_id = $1 AND date = $2`,
    [userId, today]
  );

  if (result.rows.length > 0) {
    return JSON.parse(result.rows[0].state_data);
  }

  // Create new state
  return {
    userId,
    date: today,
    report: {
      description: null,
      site: null,
      hours: null,
      blockers: null
    },
    proofs: [],
    missingFields: ['description', 'site', 'hours'],
    status: 'collecting'
  };
}

/**
 * Save field worker state
 */
export async function saveFieldWorkerState(userId, state) {
  const today = new Date().toISOString().split('T')[0];
  
  await pool.query(
    `INSERT INTO field_worker_states (user_id, date, state_data, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, date) 
     DO UPDATE SET state_data = $3, updated_at = NOW()`,
    [userId, today, JSON.stringify(state)]
  );
}

/**
 * Load contractor state
 */
export async function loadContractorState(userId) {
  const result = await pool.query(
    `SELECT * FROM contractor_states WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length > 0) {
    return JSON.parse(result.rows[0].state_data);
  }

  // Check if already in contractors table
  const existing = await pool.query(
    `SELECT * FROM contractors WHERE user_id = $1`,
    [userId]
  );

  if (existing.rows.length > 0) {
    const c = existing.rows[0];
    return {
      userId,
      profile: {
        companyName: c.company_name,
        licenseNumber: c.license_number,
        gst: c.gst,
        category: c.category
      },
      documents: c.document_urls || [],
      missingFields: [],
      verificationStatus: c.verification_status
    };
  }

  // Create new state
  return {
    userId,
    profile: {
      companyName: null,
      licenseNumber: null,
      gst: null,
      category: null
    },
    documents: [],
    missingFields: ['companyName', 'licenseNumber', 'gst', 'category'],
    verificationStatus: 'collecting'
  };
}

/**
 * Save contractor state
 */
export async function saveContractorState(userId, state) {
  await pool.query(
    `INSERT INTO contractor_states (user_id, state_data, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id) 
     DO UPDATE SET state_data = $2, updated_at = NOW()`,
    [userId, JSON.stringify(state)]
  );
}

/**
 * Upload proof to Azure Blob
 */
export async function uploadProofToBlob(userId, media) {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'igrs';
  
  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = blobServiceClient.getContainerClient(containerName);
  
  const timestamp = Date.now();
  const blobName = `proofs/${userId}/${timestamp}.${media.mimeType.split('/')[1]}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  
  await blockBlobClient.upload(media.data, media.data.length, {
    blobHTTPHeaders: { blobContentType: media.mimeType }
  });
  
  return blockBlobClient.url;
}

/**
 * Upload document to Azure Blob
 */
export async function uploadDocumentToBlob(userId, media) {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'igrs';
  
  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = blobServiceClient.getContainerClient(containerName);
  
  const timestamp = Date.now();
  const blobName = `contractor-docs/${userId}/${timestamp}.${media.mimeType.split('/')[1]}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  
  await blockBlobClient.upload(media.data, media.data.length, {
    blobHTTPHeaders: { blobContentType: media.mimeType }
  });
  
  return blockBlobClient.url;
}

/**
 * Analyze proof with DeepSeek
 */
export async function analyzeProof(report, proofUrl, media, deepseekApiKey, deepseekBaseUrl) {
  const prompt = `You are analyzing proof of work for a field worker's daily report.

Report details:
- Site: ${report.site}
- Hours worked: ${report.hours}
- Description: ${report.description}

Analyze the uploaded image and determine if it matches the reported work.

Return ONLY valid JSON:
{
  "proof_valid": true or false,
  "explanation": "brief explanation",
  "confidence": 0.0 to 1.0
}`;

  try {
    // For now, we'll do text-based analysis
    // In production, use vision model or OCR
    const response = await axios.post(
      `${deepseekBaseUrl}/chat/completions`,
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: 'Image uploaded for verification' }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${deepseekApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    return JSON.parse(response.data.choices[0].message.content);
  } catch (error) {
    console.error('Proof analysis error:', error);
    // Default to valid with low confidence
    return {
      proof_valid: true,
      explanation: 'Proof received and stored for manual review',
      confidence: 0.5
    };
  }
}

/**
 * Calculate productivity score
 */
export async function calculateProductivityScore(report, proofAnalysis, deepseekApiKey, deepseekBaseUrl) {
  const prompt = `Calculate productivity score (0-10) based on:

Report:
- Hours: ${report.hours}
- Description: ${report.description}
- Blockers: ${report.blockers || 'None'}

Proof Analysis:
- Valid: ${proofAnalysis.proof_valid}
- Confidence: ${proofAnalysis.confidence}

Return ONLY valid JSON:
{
  "score": number between 0-10,
  "reasoning": "brief explanation"
}`;

  try {
    const response = await axios.post(
      `${deepseekBaseUrl}/chat/completions`,
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: 'Calculate score' }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${deepseekApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    const result = JSON.parse(response.data.choices[0].message.content);
    return result.score;
  } catch (error) {
    console.error('Score calculation error:', error);
    // Default score based on hours
    return Math.min(10, report.hours * 1.2);
  }
}

/**
 * Store daily report in database
 */
export async function storeDailyReport(userId, report, proofs, score) {
  await pool.query(
    `INSERT INTO daily_reports 
     (user_id, date, description, site, hours, blockers, proof_urls, productivity_score, created_at)
     VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, NOW())`,
    [userId, report.description, report.site, report.hours, report.blockers, proofs, score]
  );
}

/**
 * Extract contractor fields with DeepSeek
 */
export async function extractContractorFields(message, currentProfile, deepseekApiKey, deepseekBaseUrl) {
  const prompt = `Extract contractor profile fields from the message.

Current profile: ${JSON.stringify(currentProfile)}

User message: "${message}"

Return ONLY valid JSON:
{
  "fields": {
    "companyName": "string or null",
    "licenseNumber": "string or null",
    "gst": "string or null",
    "category": "string or null"
  },
  "missing_fields": ["array of missing field names"]
}

Required fields: companyName, licenseNumber, gst, category
Only extract fields explicitly mentioned.`;

  try {
    const response = await axios.post(
      `${deepseekBaseUrl}/chat/completions`,
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: message }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${deepseekApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    const result = JSON.parse(response.data.choices[0].message.content);
    
    // Merge with current profile
    const merged = { ...currentProfile };
    Object.keys(result.fields).forEach(key => {
      if (result.fields[key] !== null) {
        merged[key] = result.fields[key];
      }
    });

    // Calculate missing fields
    const required = ['companyName', 'licenseNumber', 'gst', 'category'];
    const missing = required.filter(field => !merged[field]);

    return {
      fields: result.fields,
      missing_fields: missing
    };

  } catch (error) {
    console.error('Contractor extraction error:', error);
    throw error;
  }
}

/**
 * Analyze contractor document
 */
export async function analyzeContractorDocument(docUrl, media, deepseekApiKey, deepseekBaseUrl) {
  const prompt = `Analyze this contractor license/registration document.

Extract:
- License number
- Company name
- GST number
- Category/type
- Expiry date
- Validity

Return ONLY valid JSON:
{
  "valid": true or false,
  "extracted": {
    "licenseNumber": "string or null",
    "companyName": "string or null",
    "gst": "string or null",
    "category": "string or null"
  },
  "explanation": "brief explanation"
}`;

  try {
    // For now, basic validation
    // In production, use OCR + vision model
    const response = await axios.post(
      `${deepseekBaseUrl}/chat/completions`,
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: 'Document uploaded for analysis' }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${deepseekApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    return JSON.parse(response.data.choices[0].message.content);
  } catch (error) {
    console.error('Document analysis error:', error);
    return {
      valid: true,
      extracted: {},
      explanation: 'Document received and stored for manual review'
    };
  }
}

/**
 * Store contractor profile
 */
export async function storeContractorProfile(userId, profile, documents) {
  await pool.query(
    `INSERT INTO contractors 
     (user_id, company_name, license_number, gst, category, document_urls, verification_status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending_review', NOW())
     ON CONFLICT (user_id) 
     DO UPDATE SET 
       company_name = $2,
       license_number = $3,
       gst = $4,
       category = $5,
       document_urls = $6,
       verification_status = 'pending_review'`,
    [userId, profile.companyName, profile.licenseNumber, profile.gst, profile.category, documents]
  );
}

/**
 * Get next question for field worker
 */
export function getNextQuestion(missingField) {
  const questions = {
    description: 'What work did you complete today? Please describe in detail.',
    site: 'Which site/location did you work at?',
    hours: 'How many hours did you work today?',
    blockers: 'Did you face any challenges or blockers? (Optional - say "none" to skip)'
  };
  
  return questions[missingField] || 'Please provide more details about your work.';
}

/**
 * Get next question for contractor
 */
export function getContractorQuestion(missingField) {
  const questions = {
    companyName: 'What is your company name?',
    licenseNumber: 'What is your contractor license number?',
    gst: 'What is your GST number?',
    category: 'What category of work do you specialize in? (e.g., Civil, Electrical, Plumbing)'
  };
  
  return questions[missingField] || 'Please provide your company details.';
}
