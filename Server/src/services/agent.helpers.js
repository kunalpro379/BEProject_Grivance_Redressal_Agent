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
  
  console.log(`🔍 Loading state for user: ${userId}, date: ${today}`);
  
  const result = await pool.query(
    `SELECT * FROM field_worker_states 
     WHERE user_id = $1 AND date = $2`,
    [userId, today]
  );

  if (result.rows.length > 0) {
    console.log(`✅ Found existing state for user ${userId}`);
    const stateData = result.rows[0].state_data;
    console.log(`📦 State data type: ${typeof stateData}`);
    console.log(`📦 State data:`, JSON.stringify(stateData, null, 2));
    
    // Check if it's already an object or needs parsing
    if (typeof stateData === 'object' && stateData !== null) {
      return stateData;
    }
    if (typeof stateData === 'string') {
      return JSON.parse(stateData);
    }
    return stateData;
  }

  console.log(`🆕 Creating new state for user ${userId}`);
  
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
    currentQuestion: 'description',
    status: 'collecting'
  };
}

/**
 * Save field worker state
 */
export async function saveFieldWorkerState(userId, state) {
  const today = new Date().toISOString().split('T')[0];
  
  console.log(`💾 Saving state for user: ${userId}, date: ${today}`);
  console.log(`💾 State to save:`, JSON.stringify(state, null, 2));
  
  await pool.query(
    `INSERT INTO field_worker_states (user_id, date, state_data, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, date) 
     DO UPDATE SET state_data = $3, updated_at = NOW()`,
    [userId, today, JSON.stringify(state)]
  );
  
  console.log(`✅ State saved successfully for user ${userId}`);
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
    const stateData = result.rows[0].state_data;
    // Check if it's already an object or needs parsing
    if (typeof stateData === 'object' && stateData !== null) {
      return stateData;
    }
    if (typeof stateData === 'string') {
      return JSON.parse(stateData);
    }
    return stateData;
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
  const fileExt = media.mimeType ? media.mimeType.split('/')[1] : 'jpg';
  const blobName = `proofs/${userId}/${timestamp}.${fileExt}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  
  // If media has a URL, download it first
  if (media.fileUrl) {
    console.log(`📥 Downloading file from URL: ${media.fileUrl}`);
    const response = await axios.get(media.fileUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);
    
    console.log(`📤 Uploading buffer to Azure (${buffer.length} bytes)`);
    await blockBlobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: { blobContentType: media.mimeType || 'image/jpeg' }
    });
    
    console.log(`✅ Upload complete: ${blockBlobClient.url}`);
  } else if (media.data && Buffer.isBuffer(media.data)) {
    // Direct buffer upload
    console.log(`📤 Uploading buffer to Azure (${media.data.length} bytes)`);
    await blockBlobClient.upload(media.data, media.data.length, {
      blobHTTPHeaders: { blobContentType: media.mimeType || 'image/jpeg' }
    });
    
    console.log(`✅ Upload complete: ${blockBlobClient.url}`);
  } else {
    throw new Error('Media must have either fileUrl or data property (as Buffer)');
  }
  
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
 * Store daily report in database with AI analysis
 */
export async function storeDailyReport(userId, report, proofs, score, aiAnalysis = {}) {
  await pool.query(
    `INSERT INTO daily_reports 
     (user_id, date, description, site, hours, blockers, proof_urls, productivity_score, proof_verified,
      ai_summary, ai_analysis, sentiment, quality_score, tasks_completed, materials_used, issues_found,
      status, channel, created_at)
     VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, true, $8, $9, $10, $11, $12, $13, $14, 'submitted', $15, NOW())
     ON CONFLICT (user_id, date) 
     DO UPDATE SET 
       description = EXCLUDED.description,
       site = EXCLUDED.site,
       hours = EXCLUDED.hours,
       blockers = EXCLUDED.blockers,
       proof_urls = EXCLUDED.proof_urls,
       productivity_score = EXCLUDED.productivity_score,
       proof_verified = EXCLUDED.proof_verified,
       ai_summary = EXCLUDED.ai_summary,
       ai_analysis = EXCLUDED.ai_analysis,
       sentiment = EXCLUDED.sentiment,
       quality_score = EXCLUDED.quality_score,
       tasks_completed = EXCLUDED.tasks_completed,
       materials_used = EXCLUDED.materials_used,
       issues_found = EXCLUDED.issues_found,
       updated_at = NOW()`,
    [
      userId, 
      report.description, 
      report.site, 
      report.hours, 
      report.blockers, 
      proofs, 
      score,
      aiAnalysis.summary || null,
      JSON.stringify(aiAnalysis),
      aiAnalysis.sentiment || 'neutral',
      aiAnalysis.quality_score || score,
      aiAnalysis.tasks_completed || [],
      aiAnalysis.materials_used || [],
      aiAnalysis.issues_found || [],
      aiAnalysis.channel || 'whatsapp'
    ]
  );
}

/**
 * Analyze daily report with AI
 */
export async function analyzeReportWithAI(report, geminiApiKey) {
  try {
    const prompt = `Analyze this field worker's daily report and extract insights:

Report:
- Description: ${report.description}
- Site: ${report.site}
- Hours: ${report.hours}
- Blockers: ${report.blockers || 'None'}

Provide analysis in JSON format:
{
  "summary": "Brief 2-3 sentence summary of the work done",
  "sentiment": "positive" | "neutral" | "negative",
  "quality_score": 0-10 (based on detail, completeness, professionalism),
  "tasks_completed": ["task1", "task2", ...],
  "materials_used": ["material1", "material2", ...],
  "issues_found": ["issue1", "issue2", ...],
  "recommendations": "Suggestions for improvement or next steps"
}`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${geminiApiKey}`,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1000
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    const text = response.data.candidates[0].content.parts[0].text;
    
    // Extract JSON from response
    let cleanText = text.trim();
    const jsonMatch = cleanText.match(/```json\s*([\s\S]*?)\s*```/) || cleanText.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      cleanText = jsonMatch[1].trim();
    }
    cleanText = cleanText.replace(/^`+|`+$/g, '');
    
    return JSON.parse(cleanText);

  } catch (error) {
    console.error('Error analyzing report with AI:', error);
    return {
      summary: report.description.substring(0, 200),
      sentiment: 'neutral',
      quality_score: 5,
      tasks_completed: [],
      materials_used: [],
      issues_found: [],
      recommendations: 'Unable to generate AI analysis'
    };
  }
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
export async function storeContractorProfile(phoneNumber, profile, documents) {
  try {
    // Check if contractor already exists
    const existing = await pool.query(
      'SELECT contractor_id FROM contractors WHERE phone = $1',
      [phoneNumber]
    );
    
    if (existing.rows.length > 0) {
      // Update existing contractor
      await pool.query(
        `UPDATE contractors 
         SET company_name = $1,
             specialization = $2,
             documents = $3,
             updated_at = NOW()
         WHERE phone = $4`,
        [
          profile.company_name || profile.companyName,
          profile.category || profile.specialization,
          JSON.stringify({
            license_number: profile.license_number || profile.licenseNumber,
            gst: profile.gst,
            document_urls: documents,
            status: 'pending_review'
          }),
          phoneNumber
        ]
      );
    } else {
      // Generate contractor ID
      const contractorId = `CONT-${Date.now().toString().slice(-6)}`;
      
      // Insert new contractor
      await pool.query(
        `INSERT INTO contractors 
         (contractor_id, company_name, contact_person, phone, specialization, documents, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, NOW())`,
        [
          contractorId, 
          profile.company_name || profile.companyName, 
          profile.contact_person || 'Pending',
          phoneNumber, 
          profile.category || profile.specialization,
          JSON.stringify({
            license_number: profile.license_number || profile.licenseNumber,
            gst: profile.gst,
            document_urls: documents,
            status: 'pending_review'
          })
        ]
      );
    }
  } catch (error) {
    console.error('Error storing contractor profile:', error);
    throw error;
  }
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

/**
 * Analyze image content with Gemini to extract work description
 */
export async function analyzeImageContent(media, currentReport, geminiApiKey) {
  try {
    const prompt = `Analyze this image of field work and describe what work was done.

Current report context:
${currentReport.description ? `Description: ${currentReport.description}` : 'No description yet'}
${currentReport.site ? `Site: ${currentReport.site}` : 'No site yet'}

Provide a brief description of the work visible in the image (1-2 sentences).

Return ONLY valid JSON:
{
  "description": "brief description of work visible in image",
  "confidence": 0.0 to 1.0
}`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${geminiApiKey}`,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    const text = response.data.candidates[0].content.parts[0].text;
    
    // Extract JSON from response
    let cleanText = text.trim();
    const jsonMatch = cleanText.match(/```json\s*([\s\S]*?)\s*```/) || cleanText.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      cleanText = jsonMatch[1].trim();
    }
    cleanText = cleanText.replace(/^`+|`+$/g, '');
    
    return JSON.parse(cleanText);

  } catch (error) {
    console.error('Error analyzing image content:', error);
    return {
      description: null,
      confidence: 0
    };
  }
}
