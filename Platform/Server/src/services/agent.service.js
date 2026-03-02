import axios from 'axios';
import pool from '../config/database.js';
import { BlobServiceClient } from '@azure/storage-blob';
import * as helpers from './agent.helpers.js';

class AgentService {
  constructor() {
    // DeepSeek API configuration
    this.deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    this.deepseekBaseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
    
    // Azure Blob for proof uploads
    this.blobServiceClient = null;
    if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING
      );
    }
  }

  // Delegate to helpers
  loadFieldWorkerState = (userId) => helpers.loadFieldWorkerState(userId);
  saveFieldWorkerState = (userId, state) => helpers.saveFieldWorkerState(userId, state);
  loadContractorState = (userId) => helpers.loadContractorState(userId);
  saveContractorState = (userId, state) => helpers.saveContractorState(userId, state);
  uploadProofToBlob = (userId, media) => helpers.uploadProofToBlob(userId, media);
  uploadDocumentToBlob = (userId, media) => helpers.uploadDocumentToBlob(userId, media);
  storeDailyReport = (userId, report, proofs, score) => helpers.storeDailyReport(userId, report, proofs, score);
  storeContractorProfile = (userId, profile, docs) => helpers.storeContractorProfile(userId, profile, docs);
  getNextQuestion = (field) => helpers.getNextQuestion(field);
  getContractorQuestion = (field) => helpers.getContractorQuestion(field);
  
  analyzeProof = (report, url, media) => 
    helpers.analyzeProof(report, url, media, this.deepseekApiKey, this.deepseekBaseUrl);
  calculateProductivityScore = (report, analysis) => 
    helpers.calculateProductivityScore(report, analysis, this.deepseekApiKey, this.deepseekBaseUrl);
  extractContractorFields = (message, profile) => 
    helpers.extractContractorFields(message, profile, this.deepseekApiKey, this.deepseekBaseUrl);
  analyzeContractorDocument = (url, media) => 
    helpers.analyzeContractorDocument(url, media, this.deepseekApiKey, this.deepseekBaseUrl);

  /**
   * Main entry point for processing messages from any channel
   */
  async processMessage({ userId, userName, message, channel, messageId, media, location }) {
    try {
      // Store conversation in DB
      await this.storeConversation(userId, userName, message, channel, messageId);

      // Get user context and role
      const userContext = await this.getUserContext(userId);

      // Route to appropriate agent based on user role and message content
      const response = await this.routeToAgent({
        userId,
        userName,
        message,
        userContext,
        media,
        location
      });

      // Store agent response
      await this.storeResponse(userId, response.text, channel);

      return response;

    } catch (error) {
      console.error('Error processing message:', error);
      return {
        text: 'Sorry, I encountered an error. Please try again or contact support.',
        error: true
      };
    }
  }

  /**
   * Route message to appropriate workflow based on user role
   * Only two roles: field_worker and contractor
   */
  async routeToAgent({ userId, userName, message, userContext, media, location }) {
    const role = userContext?.role;

    if (!role) {
      return {
        text: 'Please register first. Contact admin to set up your account.'
      };
    }

    // Field Worker - Daily reporting workflow
    if (role === 'field_worker') {
      return await this.fieldWorkerWorkflow({
        userId,
        userName,
        message,
        userContext,
        media
      });
    }

    // Contractor - Onboarding and verification workflow
    if (role === 'contractor') {
      return await this.contractorWorkflow({
        userId,
        userName,
        message,
        userContext,
        media
      });
    }

    return {
      text: `Unknown role: ${role}. Please contact admin.`
    };
  }

  /**
   * 🏗️ FIELD WORKER WORKFLOW
   * Daily reporting with structured extraction
   */
  async fieldWorkerWorkflow({ userId, userName, message, userContext, media }) {
    try {
      // Load or create today's report state
      const state = await this.loadFieldWorkerState(userId);

      // Check if report already submitted today
      if (state.status === 'complete') {
        return {
          text: `You've already submitted your report today! ✅\n\nSummary:\n` +
                `Site: ${state.report.site}\n` +
                `Hours: ${state.report.hours}\n` +
                `Work: ${state.report.description}\n\n` +
                `See you tomorrow! 👷`
        };
      }

      // Handle proof upload
      if (media) {
        const proofUrl = await this.uploadProofToBlob(userId, media);
        state.proofs.push(proofUrl);
        
        // Analyze proof with DeepSeek
        const proofAnalysis = await this.analyzeProof(state.report, proofUrl, media);
        
        if (proofAnalysis.proof_valid) {
          // Calculate productivity score
          const score = await this.calculateProductivityScore(state.report, proofAnalysis);
          
          // Store in database
          await this.storeDailyReport(userId, state.report, state.proofs, score);
          
          state.status = 'complete';
          await this.saveFieldWorkerState(userId, state);
          
          return {
            text: `✅ Report submitted successfully!\n\n` +
                  `📊 Productivity Score: ${score.toFixed(1)}/10\n` +
                  `${proofAnalysis.explanation}\n\n` +
                  `Great work today! 💪`
          };
        } else {
          return {
            text: `⚠️ Proof validation issue:\n${proofAnalysis.explanation}\n\n` +
                  `Please upload a clearer photo showing the completed work.`
          };
        }
      }

      // Extract structured data from message
      const extracted = await this.extractReportFields(message, state.report);
      
      // Update state
      state.report = { ...state.report, ...extracted.fields };
      state.missingFields = extracted.missing_fields;

      // Check if we have all required fields
      if (state.missingFields.length === 0) {
        // Request proof
        await this.saveFieldWorkerState(userId, state);
        return {
          text: `Great! I have all the details:\n\n` +
                `📍 Site: ${state.report.site}\n` +
                `⏰ Hours: ${state.report.hours}\n` +
                `📝 Work: ${state.report.description}\n` +
                `${state.report.blockers ? `⚠️ Blockers: ${state.report.blockers}\n` : ''}\n` +
                `Now please send a photo of your completed work as proof. 📸`
        };
      }

      // Ask for missing field
      await this.saveFieldWorkerState(userId, state);
      const nextQuestion = this.getNextQuestion(state.missingFields[0]);
      
      return {
        text: nextQuestion
      };

    } catch (error) {
      console.error('Error in field worker workflow:', error);
      return {
        text: 'Sorry, I encountered an error processing your report. Please try again.'
      };
    }
  }

  /**
   * 🏗️ CONTRACTOR WORKFLOW
   * Onboarding and verification
   */
  async contractorWorkflow({ userId, userName, message, userContext, media }) {
    try {
      // Load or create contractor state
      const state = await this.loadContractorState(userId);

      // Check verification status
      if (state.verificationStatus === 'verified') {
        return {
          text: `✅ You're already verified!\n\n` +
                `Company: ${state.profile.companyName}\n` +
                `License: ${state.profile.licenseNumber}\n` +
                `Category: ${state.profile.category}\n\n` +
                `You can now bid on projects. Good luck! 🚀`
        };
      }

      if (state.verificationStatus === 'pending_review') {
        return {
          text: `⏳ Your application is under review.\n\n` +
                `We'll notify you once verification is complete (usually 2-3 business days).`
        };
      }

      // Handle document upload
      if (media) {
        const docUrl = await this.uploadDocumentToBlob(userId, media);
        state.documents.push(docUrl);
        
        // Analyze document with DeepSeek
        const docAnalysis = await this.analyzeContractorDocument(docUrl, media);
        
        if (docAnalysis.valid) {
          // Update profile with extracted data
          state.profile = { ...state.profile, ...docAnalysis.extracted };
          state.missingFields = state.missingFields.filter(f => 
            !Object.keys(docAnalysis.extracted).includes(f)
          );
          
          // Check if complete
          if (state.missingFields.length === 0 && state.documents.length > 0) {
            // Store in database
            await this.storeContractorProfile(userId, state.profile, state.documents);
            state.verificationStatus = 'pending_review';
            await this.saveContractorState(userId, state);
            
            return {
              text: `✅ Application submitted successfully!\n\n` +
                    `Your details:\n` +
                    `Company: ${state.profile.companyName}\n` +
                    `License: ${state.profile.licenseNumber}\n` +
                    `GST: ${state.profile.gst}\n` +
                    `Category: ${state.profile.category}\n\n` +
                    `Our team will verify your documents within 2-3 business days. 📋`
            };
          }
          
          await this.saveContractorState(userId, state);
          return {
            text: `✅ Document received!\n\n` +
                  `Extracted: ${JSON.stringify(docAnalysis.extracted, null, 2)}\n\n` +
                  (state.missingFields.length > 0 
                    ? `Still need: ${state.missingFields.join(', ')}`
                    : 'Please upload your license/registration document.')
          };
        } else {
          return {
            text: `⚠️ Document validation issue:\n${docAnalysis.explanation}\n\n` +
                  `Please upload a clear photo of your license or registration certificate.`
          };
        }
      }

      // Extract profile fields from message
      const extracted = await this.extractContractorFields(message, state.profile);
      
      // Update state
      state.profile = { ...state.profile, ...extracted.fields };
      state.missingFields = extracted.missing_fields;

      await this.saveContractorState(userId, state);

      // Check if we need documents
      if (state.missingFields.length === 0 && state.documents.length === 0) {
        return {
          text: `Great! I have your details:\n\n` +
                `Company: ${state.profile.companyName}\n` +
                `License: ${state.profile.licenseNumber}\n` +
                `GST: ${state.profile.gst}\n` +
                `Category: ${state.profile.category}\n\n` +
                `Now please upload your license/registration document. 📄`
        };
      }

      // Ask for missing field
      const nextQuestion = this.getContractorQuestion(state.missingFields[0]);
      return {
        text: nextQuestion
      };

    } catch (error) {
      console.error('Error in contractor workflow:', error);
      return {
        text: 'Sorry, I encountered an error processing your application. Please try again.'
      };
    }
  }

  /**
   * 🧠 DEEPSEEK: Extract structured report fields
   */
  async extractReportFields(message, currentReport) {
    const prompt = `You are a government monitoring assistant extracting daily work report fields.

Current report data: ${JSON.stringify(currentReport)}

User message: "${message}"

Extract and return ONLY valid JSON with this exact structure:
{
  "fields": {
    "description": "string or null",
    "site": "string or null",
    "hours": number or null,
    "blockers": "string or null"
  },
  "missing_fields": ["array of missing field names"]
}

Required fields: description, site, hours
Optional: blockers

Rules:
- Only extract fields explicitly mentioned
- hours must be a number (1-24)
- Return null for fields not mentioned
- missing_fields should list: description, site, hours (only if still missing)`;

    try {
      const response = await axios.post(
        `${this.deepseekBaseUrl}/chat/completions`,
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
            'Authorization': `Bearer ${this.deepseekApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const result = JSON.parse(response.data.choices[0].message.content);
      
      // Merge with current report
      const merged = { ...currentReport };
      Object.keys(result.fields).forEach(key => {
        if (result.fields[key] !== null) {
          merged[key] = result.fields[key];
        }
      });

      // Calculate missing fields
      const required = ['description', 'site', 'hours'];
      const missing = required.filter(field => !merged[field]);

      return {
        fields: result.fields,
        missing_fields: missing
      };

    } catch (error) {
      console.error('DeepSeek extraction error:', error);
      throw error;
    }
  }

  /**
   * Chat with DeepSeek LLM
   */
  async chatWithDeepSeek(userId, message, systemContext) {
    try {
      // Get conversation history
      const history = await this.getConversationHistory(userId, 5);

      const messages = [
        {
          role: 'system',
          content: `${systemContext.context}\n\nYou are part of a government grievance redressal system. Be helpful, professional, and concise.`
        },
        ...history.map(h => ({
          role: h.role,
          content: h.content
        })),
        {
          role: 'user',
          content: message
        }
      ];

      const response = await axios.post(
        `${this.deepseekBaseUrl}/chat/completions`,
        {
          model: 'deepseek-chat',
          messages: messages,
          temperature: 0.7,
          max_tokens: 500
        },
        {
          headers: {
            'Authorization': `Bearer ${this.deepseekApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return {
        text: response.data.choices[0].message.content
      };

    } catch (error) {
      console.error('DeepSeek API error:', error.response?.data || error.message);
      throw new Error('Failed to get response from AI');
    }
  }

  /**
   * Store conversation in database
   */
  async storeConversation(userId, userName, message, channel, messageId) {
    try {
      await pool.query(
        `INSERT INTO whatsapp_conversations 
         (user_id, user_name, message, channel, message_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [userId, userName, message, channel, messageId]
      );
    } catch (error) {
      console.error('Error storing conversation:', error);
    }
  }

  /**
   * Store agent response
   */
  async storeResponse(userId, response, channel) {
    try {
      await pool.query(
        `INSERT INTO whatsapp_conversations 
         (user_id, message, channel, is_bot, created_at)
         VALUES ($1, $2, $3, true, NOW())`,
        [userId, response, channel]
      );
    } catch (error) {
      console.error('Error storing response:', error);
    }
  }

  /**
   * Get user context from database
   */
  async getUserContext(phoneNumber) {
    try {
      const result = await pool.query(
        `SELECT u.id, u.name, u.role, u.department_id, d.name as department_name
         FROM users u
         LEFT JOIN departments d ON u.department_id = d.id
         WHERE u.phone = $1`,
        [phoneNumber]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting user context:', error);
      return null;
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(userId, limit = 5) {
    try {
      const result = await pool.query(
        `SELECT message, is_bot, created_at
         FROM whatsapp_conversations
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [userId, limit * 2] // Get both user and bot messages
      );

      return result.rows.reverse().map(row => ({
        role: row.is_bot ? 'assistant' : 'user',
        content: row.message
      }));
    } catch (error) {
      console.error('Error getting conversation history:', error);
      return [];
    }
  }

  /**
   * Check if message is a progress report
   */
  isProgressReport(message) {
    const keywords = ['completed', 'finished', 'done', 'progress', 'work', 'today', 'report'];
    const lowerMessage = message.toLowerCase();
    return keywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Queue message for async processing
   */
  async queueMessage(data) {
    if (!this.queueClient) return;

    try {
      const message = Buffer.from(JSON.stringify(data)).toString('base64');
      await this.queueClient.sendMessage(message);
    } catch (error) {
      console.error('Error queuing message:', error);
    }
  }

  /**
   * Get pending grievances for department
   */
  async getPendingGrievances(departmentId) {
    const result = await pool.query(
      `SELECT id, title, status, created_at
       FROM grievances
       WHERE department_id = $1 AND status IN ('pending', 'in_progress')
       ORDER BY created_at DESC
       LIMIT 10`,
      [departmentId]
    );
    return result.rows;
  }

  /**
   * Get grievance status
   */
  async getGrievanceStatus(grievanceId, userId) {
    const result = await pool.query(
      `SELECT id, title, description, status, created_at, updated_at
       FROM grievances
       WHERE id = $1 AND user_id = (SELECT id FROM users WHERE phone = $2)`,
      [grievanceId, userId]
    );
    return result.rows[0];
  }

  /**
   * Format grievance list
   */
  formatGrievanceList(grievances) {
    if (grievances.length === 0) {
      return 'No pending grievances at the moment.';
    }

    let text = `📋 Pending Grievances (${grievances.length}):\n\n`;
    grievances.forEach((g, idx) => {
      text += `${idx + 1}. #${g.id} - ${g.title}\n   Status: ${g.status}\n   Date: ${new Date(g.created_at).toLocaleDateString()}\n\n`;
    });
    return text;
  }

  /**
   * Format grievance status
   */
  formatGrievanceStatus(grievance) {
    if (!grievance) {
      return 'Grievance not found or you do not have access to it.';
    }

    return `🔍 Grievance #${grievance.id}\n\n` +
           `Title: ${grievance.title}\n` +
           `Status: ${grievance.status}\n` +
           `Submitted: ${new Date(grievance.created_at).toLocaleDateString()}\n` +
           `Last Updated: ${new Date(grievance.updated_at).toLocaleDateString()}\n\n` +
           `Description: ${grievance.description}`;
  }

  /**
   * Get department analytics
   */
  async getDepartmentAnalytics(departmentId) {
    const result = await pool.query(
      `SELECT 
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'pending') as pending,
         COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
         COUNT(*) FILTER (WHERE status = 'resolved') as resolved
       FROM grievances
       WHERE department_id = $1`,
      [departmentId]
    );
    return result.rows[0];
  }

  /**
   * Format analytics
   */
  formatAnalytics(analytics) {
    return `📊 Department Analytics\n\n` +
           `Total Grievances: ${analytics.total}\n` +
           `Pending: ${analytics.pending}\n` +
           `In Progress: ${analytics.in_progress}\n` +
           `Resolved: ${analytics.resolved}\n\n` +
           `Resolution Rate: ${((analytics.resolved / analytics.total) * 100).toFixed(1)}%`;
  }
}

export default new AgentService();
