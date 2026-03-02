import axios from 'axios';
import pool from '../config/database.js';
import { BlobServiceClient } from '@azure/storage-blob';
import * as helpers from './agent.helpers.js';

class AgentService {
  constructor() {
    // AI configuration - supports both Gemini and DeepSeek
    this.aiProvider = process.env.AI_PROVIDER || 'gemini';
    this.geminiApiKey = process.env.GEMINI_API_KEY;
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
  clearFieldWorkerState = async (userId) => {
    try {
      await pool.query('DELETE FROM fieldworker_states WHERE user_id = $1', [userId]);
      console.log(`✅ Cleared state for user: ${userId}`);
    } catch (error) {
      console.error('❌ Error clearing state:', error);
    }
  };
  clearUserState = async (userId) => {
    // Clear all user data
    await this.clearFieldWorkerState(userId);
    console.log(`🔄 User ${userId} logged out - all data cleared`);
  };
  loadContractorState = (userId) => helpers.loadContractorState(userId);
  saveContractorState = (userId, state) => helpers.saveContractorState(userId, state);
  uploadProofToBlob = (userId, media) => helpers.uploadProofToBlob(userId, media);
  uploadDocumentToBlob = (userId, media) => helpers.uploadDocumentToBlob(userId, media);
  storeDailyReport = (userId, report, proofs, score, aiAnalysis) => helpers.storeDailyReport(userId, report, proofs, score, aiAnalysis);
  storeContractorProfile = (userId, profile, docs) => helpers.storeContractorProfile(userId, profile, docs);
  getNextQuestion = (field) => helpers.getNextQuestion(field);
  getContractorQuestion = (field) => helpers.getContractorQuestion(field);
  analyzeReportWithAI = (report, proofAnalysis) => helpers.analyzeReportWithAI(report, this.geminiApiKey);
  analyzeImageContent = (media, report) => helpers.analyzeImageContent(media, report, this.geminiApiKey);
  
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
  async processMessage({ userId, userName, message, channel, messageId, media, location, aiContext }) {
    try {
      // Store conversation in DB
      await this.storeConversation(userId, userName, message, channel, messageId);

      // Get user context and role
      const userContext = await this.getUserContext(userId);

      // Check AI context for wrong bot detection
      if (aiContext && aiContext.userType && aiContext.confidence > 0.7) {
        // If AI detected user is contractor but they're using field worker bot
        if (aiContext.userType === 'contractor' && channel === 'telegram_fieldworker') {
          return {
            text: `⚠️ You mentioned being a contractor.\n\n` +
                  `This bot is for FIELD WORKERS (individual employees).\n\n` +
                  `If you're a contractor/company, please use the Contractor Bot instead.\n\n` +
                  `Are you a field worker? Reply "yes" to continue with field worker registration.`
          };
        }
        
        // If AI detected user is field worker but they're using contractor bot
        if (aiContext.userType === 'field_worker' && channel === 'telegram_contractor') {
          return {
            text: `⚠️ You seem to be an individual worker.\n\n` +
                  `This bot is for CONTRACTORS (companies/businesses).\n\n` +
                  `If you're a field worker, please use the Field Worker Bot instead.\n\n` +
                  `Are you a contractor/company? Reply "yes" to continue with contractor registration.`
          };
        }
      }

      // Route to appropriate agent based on user role and message content
      const response = await this.routeToAgent({
        userId,
        userName,
        message,
        userContext,
        media,
        location,
        aiContext
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
   * Department staff members use field_worker workflow
   * New users are onboarded intelligently
   */
  async routeToAgent({ userId, userName, message, userContext, media, location, aiContext }) {
    const role = userContext?.role;

    // New user - intelligent onboarding
    if (!role) {
      return await this.handleNewUser(userId, userName, message, aiContext);
    }

    // Check if user is active
    if (userContext.is_active === false || userContext.staff_status === 'inactive') {
      return {
        text: 'Your account has been deactivated. Please contact your department administrator.'
      };
    }

    // Department Staff - Daily reporting workflow
    if (role === 'field_worker') {
      return await this.fieldWorkerWorkflow({
        userId: userContext.id, // Use user.id instead of phone number
        userName,
        message,
        userContext,
        media,
        aiContext
      });
    }

    // Contractor workflow
    if (role === 'contractor') {
      return await this.contractorWorkflow({
        userId: userContext.id,
        userName,
        message,
        userContext,
        media
      });
    }

    return {
      text: `Your role is not supported for WhatsApp interactions. This service is only for department field staff and contractors.`
    };
  }

  /**
   * Call AI API (Gemini or DeepSeek)
   */
  async callAI(messages, options = {}) {
    const { temperature = 0.3, jsonMode = false, maxTokens = 500 } = options;

    if (this.aiProvider === 'gemini') {
      return await this.callGemini(messages, { temperature, jsonMode, maxTokens });
    } else {
      return await this.callDeepSeek(messages, { temperature, jsonMode, maxTokens });
    }
  }

  /**
   * Call Google Gemini API
   */
  async callGemini(messages, options = {}) {
    const { temperature = 0.3, jsonMode = false, maxTokens = 500 } = options;

    try {
      // Convert messages to Gemini format
      let prompt = '';
      messages.forEach(msg => {
        if (msg.role === 'system') {
          prompt += `${msg.content}\n\n`;
        } else if (msg.role === 'user') {
          prompt += `User: ${msg.content}\n`;
        } else if (msg.role === 'assistant') {
          prompt += `Assistant: ${msg.content}\n`;
        }
      });

      if (jsonMode) {
        prompt += '\n\nCRITICAL: You MUST respond with ONLY valid JSON. Do not include any markdown formatting, code blocks, or explanatory text. Just the raw JSON object.';
      }

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${this.geminiApiKey}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: temperature,
            maxOutputTokens: Math.max(maxTokens, 1000), // Ensure at least 1000 tokens for JSON
            topP: 0.95,
            topK: 40
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000 // Increased to 30 seconds
        }
      );

      // Check if response was blocked or incomplete
      if (!response.data.candidates || response.data.candidates.length === 0) {
        console.error('Gemini response blocked or empty:', JSON.stringify(response.data, null, 2));
        throw new Error('Gemini response was blocked or empty');
      }

      const candidate = response.data.candidates[0];
      
      // Check finish reason
      if (candidate.finishReason === 'MAX_TOKENS') {
        console.warn('⚠️  Gemini response truncated due to max tokens');
      }

      const text = candidate.content.parts[0].text;
      
      console.log('📄 Full Gemini response length:', text.length, 'chars');
      console.log('📄 Finish reason:', candidate.finishReason);
      
      // If JSON mode, try to extract JSON from response
      if (jsonMode) {
        // Remove markdown code blocks if present
        let cleanText = text.trim();
        
        console.log('🔍 Attempting JSON extraction from response...');
        
        // Try to extract JSON from markdown code blocks
        const jsonMatch = cleanText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          cleanText = jsonMatch[1].trim();
          console.log('✅ Extracted JSON from ```json block');
        } else {
          // Try generic code blocks
          const codeMatch = cleanText.match(/```\s*([\s\S]*?)\s*```/);
          if (codeMatch) {
            cleanText = codeMatch[1].trim();
            console.log('✅ Extracted JSON from ``` block');
          } else {
            console.log('⚠️  No code blocks found, using raw text');
          }
        }
        
        // Remove any leading/trailing backticks
        cleanText = cleanText.replace(/^`+|`+$/g, '');
        
        try {
          const parsed = JSON.parse(cleanText);
          console.log('✅ Successfully parsed JSON');
          return parsed;
        } catch (parseError) {
          console.error('❌ JSON parse error:', parseError.message);
          console.error('📝 Raw text (first 500 chars):', text.substring(0, 500));
          console.error('🧹 Cleaned text (first 500 chars):', cleanText.substring(0, 500));
          throw parseError;
        }
      }

      return text;

    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        console.error('⏱️  Gemini API timeout - request took too long');
        throw new Error('AI service timeout - please try again');
      }
      console.error('Gemini API error:', error.response?.data || error.message);
      throw new Error('Failed to get response from Gemini AI');
    }
  }

  /**
   * Call DeepSeek API
   */
  async callDeepSeek(messages, options = {}) {
    const { temperature = 0.3, jsonMode = false, maxTokens = 500 } = options;

    try {
      const requestBody = {
        model: 'deepseek-chat',
        messages: messages,
        temperature: temperature,
        max_tokens: maxTokens
      };

      if (jsonMode) {
        requestBody.response_format = { type: 'json_object' };
      }

      const response = await axios.post(
        `${this.deepseekBaseUrl}/chat/completions`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${this.deepseekApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const text = response.data.choices[0].message.content;
      
      if (jsonMode) {
        return JSON.parse(text);
      }

      return text;

    } catch (error) {
      console.error('DeepSeek API error:', error.response?.data || error.message);
      throw new Error('Failed to get response from DeepSeek AI');
    }
  }

  /**
   * Handle new user with intelligent routing using LLM
   */
  async handleNewUser(phoneNumber, userName, message) {
    try {
      // Get conversation history
      const history = await this.getConversationHistory(phoneNumber, 5);
      
      // Don't send Telegram ID to AI - mask it
      const displayPhone = phoneNumber.length < 15 ? 'Not provided yet' : phoneNumber;
      
      // Use AI to understand intent and extract information
      const prompt = `You are a helpful government service assistant for WhatsApp/Telegram. Analyze the user's message and conversation history to determine their intent and extract relevant information.

User: ${userName}
Phone: ${displayPhone}
Current Message: "${message}"

Previous conversation:
${history.map(h => `${h.role}: ${h.content}`).join('\n')}

Determine:
1. Is the user a contractor, field worker, or citizen?
2. What information have they provided?
3. What should we ask next?

Return ONLY valid JSON:
{
  "user_type": "contractor" | "field_worker" | "citizen" | "unknown",
  "extracted_data": {
    "company_name": "string or null",
    "license_number": "string or null",
    "gst": "string or null",
    "category": "string or null"
  },
  "next_action": "ask_for_details" | "create_contractor" | "register_field_worker" | "provide_info",
  "response": "friendly response message to send to user"
}`;

      const analysis = await this.callAI([
        { role: 'system', content: prompt },
        { role: 'user', content: message }
      ], { jsonMode: true, temperature: 0.3, maxTokens: 1500 });
      
      console.log('🧠 AI Analysis:', JSON.stringify(analysis, null, 2));
      
      // Handle based on AI analysis
      if (analysis.user_type === 'contractor' && analysis.next_action === 'create_contractor') {
        // Extract and create contractor
        const extracted = analysis.extracted_data;
        if (extracted.company_name && extracted.license_number && extracted.gst && extracted.category) {
          // Create pending registration request
          await this.createPendingRegistration({
            userId: phoneNumber,
            userName: userName,
            userType: 'contractor',
            channel: 'telegram', // or detect from context
            data: extracted
          });
          
          return {
            text: `✅ Registration Request Submitted!\n\n` +
                  `📋 Your Details:\n` +
                  `Company: ${extracted.company_name}\n` +
                  `License: ${extracted.license_number}\n` +
                  `GST: ${extracted.gst}\n` +
                  `Category: ${extracted.category}\n\n` +
                  `⏳ Your request has been sent to the department for approval.\n` +
                  `You'll be notified once it's reviewed (usually within 24-48 hours).`
          };
        }
      }
      
      // Handle field worker registration request
      if (analysis.user_type === 'field_worker' && analysis.next_action === 'register_field_worker') {
        // Check if user wants to self-register
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('register') || lowerMessage.includes('sign up') || lowerMessage.includes('join') || lowerMessage.includes('field worker') || lowerMessage === '1' || lowerMessage === '1️⃣') {
          
          // Check if this is a Telegram ID
          const isTelegramId = phoneNumber.length < 15 && /^\d+$/.test(phoneNumber);
          
          if (isTelegramId) {
            // For Telegram, check if phone number is stored
            const storedData = await this.getStoredPhone(phoneNumber);
            
            if (storedData && storedData.phone_number) {
              // Create pending registration with actual phone number
              await pool.query(
                `INSERT INTO pending_registrations 
                 (telegram_user_id, phone, full_name, user_type, channel, status, created_at)
                 VALUES ($1, $2, $3, 'field_worker', 'telegram', 'pending', NOW())
                 ON CONFLICT (telegram_user_id)
                 DO UPDATE SET 
                   phone = $2,
                   full_name = $3,
                   user_type = 'field_worker',
                   status = 'pending',
                   updated_at = NOW()`,
                [phoneNumber, storedData.phone_number, storedData.full_name]
              );
              
              return {
                text: `✅ Field Worker Registration Request Submitted!\n\n` +
                      `📱 Phone: ${storedData.phone_number}\n` +
                      `👤 Name: ${storedData.full_name}\n\n` +
                      `⏳ Your request has been sent to the department officer for approval.\n` +
                      `You'll be notified once it's reviewed (usually within 24-48 hours).`
              };
            } else {
              return {
                text: `📝 Field Worker Registration\n\n` +
                      `To register, please first share your contact:\n` +
                      `Tap the 📎 button → Contact → Share My Contact\n\n` +
                      `Then I'll guide you through the registration process.`,
                reply_markup: {
                  keyboard: [
                    [{
                      text: '📱 Share My Contact',
                      request_contact: true
                    }]
                  ],
                  resize_keyboard: true,
                  one_time_keyboard: true
                }
              };
            }
          } else {
            // For WhatsApp, phoneNumber is already the real phone
            await pool.query(
              `INSERT INTO pending_registrations 
               (whatsapp_phone, phone, full_name, user_type, channel, status, created_at)
               VALUES ($1, $2, $3, 'field_worker', 'whatsapp', 'pending', NOW())
               ON CONFLICT (whatsapp_phone)
               DO UPDATE SET 
                 phone = $2,
                 full_name = $3,
                 user_type = 'field_worker',
                 status = 'pending',
                 updated_at = NOW()`,
              [phoneNumber, phoneNumber, userName]
            );
            
            return {
              text: `✅ Field Worker Registration Request Submitted!\n\n` +
                    `📱 Phone: ${phoneNumber}\n` +
                    `👤 Name: ${userName}\n\n` +
                    `⏳ Your request has been sent to the department officer for approval.\n` +
                    `You'll be notified once it's reviewed (usually within 24-48 hours).`
            };
          }
        }
      }

      // Return AI-generated response
      return {
        text: analysis.response
      };

    } catch (error) {
      console.error('Error in intelligent routing:', error);
      
      // Fallback to simple keyword matching
      const lowerMessage = message.toLowerCase();

      if (lowerMessage.includes('contractor') || lowerMessage.includes('company') || lowerMessage.includes('tender')) {
        return {
          text: `Hi ${userName}! 👋\n\nI see you're a contractor. To register, please provide:\n\n1. Company name\n2. License number\n3. GST number\n4. Category (e.g., Civil, Electrical, Plumbing)\n\nYou can send all details in one message.`
        };
      }

      if (lowerMessage.includes('field worker') || lowerMessage.includes('staff') || lowerMessage.includes('employee')) {
        return {
          text: `Hi ${userName}! 👋\n\nFor field workers, please contact your department administrator to register your phone: ${phoneNumber}`
        };
      }

      return {
        text: `Hi ${userName}! 👋\n\nWelcome! I can help:\n\n🏗️ *Field Workers* - Daily reports\n📋 *Contractors* - Registration\n\nWhat are you?`
      };
    }
  }

  /**
   * 🏗️ FIELD WORKER WORKFLOW
   * Daily reporting with structured extraction
   */
  /**
     * 🏗️ FIELD WORKER WORKFLOW
     * Conversational daily reporting - ask questions one by one
     */
    async fieldWorkerWorkflow({ userId, userName, message, userContext, media, aiContext }) {
      try {
        console.log(`\n🏗️ Field Worker Workflow - User: ${userId}, Message: "${message}"`);
        
        // Check AI context for suspicious activity
        if (aiContext) {
          console.log(`🤖 AI Context:`, aiContext);
          
          // If AI detected user might be a contractor
          if (aiContext.userType === 'contractor' && aiContext.confidence > 0.6) {
            console.log(`⚠️ AI detected potential contractor: ${aiContext.userType} (confidence: ${aiContext.confidence})`);
            return {
              text: `⚠️ I noticed you mentioned being a contractor.\n\n` +
                    `This bot is for FIELD WORKERS (individual employees who work for the department).\n\n` +
                    `Contractors should use the Contractor Bot for company registration.\n\n` +
                    `Are you a field worker employed by the department? Reply "yes" to continue.`
            };
          }
        }
        
        // Load or create today's report state
        const state = await this.loadFieldWorkerState(userId);
        
        console.log(`📊 Current state:`, {
          status: state.status,
          currentQuestion: state.currentQuestion,
          missingFields: state.missingFields,
          report: state.report
        });

        // Check if report already submitted today
        if (state.status === 'complete') {
          return {
            text: `You've already submitted your report today! ✅\n\nSummary:\n` +
                  `📍 Site: ${state.report.site}\n` +
                  `⏰ Hours: ${state.report.hours}\n` +
                  `📝 Work: ${state.report.description}\n\n` +
                  `See you tomorrow! 👷`
          };
        }

        // Handle image/proof upload
        if (media) {
          console.log(`📸 Processing image upload...`);
          try {
            const proofUrl = await this.uploadProofToBlob(userId, media);
            console.log(`✅ Image uploaded to: ${proofUrl}`);

            // Use AI to analyze what's in the image
            const imageAnalysis = await this.analyzeImageContent(media, state.report);
            console.log(`🤖 Image analysis:`, imageAnalysis);

            // If we don't have description yet, use image analysis
            if (!state.report.description && imageAnalysis.description) {
              state.report.description = imageAnalysis.description;
              state.missingFields = state.missingFields.filter(f => f !== 'description');
              console.log(`✅ Extracted description from image: ${imageAnalysis.description}`);
            }

            // Store the proof
            state.proofs.push(proofUrl);
            await this.saveFieldWorkerState(userId, state);

            // Check if all fields are now filled
            const allFieldsFilled = state.report.description && state.report.site && state.report.hours;
            
            if (allFieldsFilled) {
              // All fields collected, submit report
              console.log(`✅ All fields collected, submitting report...`);
              const score = await this.calculateProductivityScore(state.report, { proof_valid: true, confidence: 0.9 });
              const aiAnalysis = await this.analyzeReportWithAI(state.report, { proof_valid: true });
              aiAnalysis.channel = 'telegram';

              await this.storeDailyReport(userId, state.report, state.proofs, score, aiAnalysis);

              state.status = 'complete';
              await this.saveFieldWorkerState(userId, state);

              return {
                text: `✅ Report submitted successfully!\n\n` +
                      `📊 Productivity Score: ${score.toFixed(1)}/10\n` +
                      `🤖 AI Analysis: ${aiAnalysis.summary}\n\n` +
                      `Great work today! 💪`
              };
            }

            // Still have missing fields, ask for them
            let response = `📸 Got your photo! `;
            if (imageAnalysis.description) {
              response += `I can see: ${imageAnalysis.description}\n\n`;
            }

            // Ask next question based on what's missing
            if (!state.report.description) {
              state.currentQuestion = 'description';
              response += `What work did you do today?`;
            } else if (!state.report.site) {
              state.currentQuestion = 'site';
              response += `Which site or location is this?`;
            } else if (!state.report.hours) {
              state.currentQuestion = 'hours';
              response += `How many hours did you work on this?`;
            }

            await this.saveFieldWorkerState(userId, state);
            return { text: response };

          } catch (error) {
            console.error('Error processing image:', error);
            return {
              text: `📸 Photo received! Please continue with your report details.`
            };
          }
        }

        // Process text message based on current question
        const lowerMessage = message.toLowerCase().trim();

        // Handle greetings at the start
        if (!state.report.description && !state.report.site && !state.report.hours && 
            (lowerMessage === 'hi' || lowerMessage === 'hello' || lowerMessage === 'hey' || lowerMessage === 'hi bhai')) {
          state.currentQuestion = 'description';
          await this.saveFieldWorkerState(userId, state);
          
          return {
            text: `Hi ${userName}! 👋\n\nReady to submit your daily work report?\n\nLet's start: What work did you do today?`
          };
        }

        // Collect answer based on current question
        if (state.currentQuestion === 'description' && !state.report.description) {
          state.report.description = message;
          state.missingFields = state.missingFields.filter(f => f !== 'description');
          state.currentQuestion = 'site';
          await this.saveFieldWorkerState(userId, state);
          
          console.log(`✅ Saved description: "${message}", next question: site`);

          return {
            text: `Got it! 📝\n\nWork: ${message}\n\nWhich site or location did you work at?`
          };
        }

        if (state.currentQuestion === 'site' && !state.report.site) {
          state.report.site = message;
          state.missingFields = state.missingFields.filter(f => f !== 'site');
          state.currentQuestion = 'hours';
          await this.saveFieldWorkerState(userId, state);
          
          console.log(`✅ Saved site: "${message}", next question: hours`);

          return {
            text: `Perfect! 📍\n\nSite: ${message}\n\nHow many hours did you work? (Just send the number)`
          };
        }

        if (state.currentQuestion === 'hours' && !state.report.hours) {
          // Extract number from message
          const hoursMatch = message.match(/\d+(\.\d+)?/);
          if (hoursMatch) {
            state.report.hours = parseFloat(hoursMatch[0]);
            state.missingFields = state.missingFields.filter(f => f !== 'hours');
            state.currentQuestion = 'proof';
            await this.saveFieldWorkerState(userId, state);
            
            console.log(`✅ Saved hours: ${state.report.hours}, next question: proof`);

            return {
              text: `Excellent! ⏰\n\nHours: ${state.report.hours}\n\nNow please send a photo of your completed work as proof. 📸`
            };
          } else {
            return {
              text: `Please send just the number of hours (e.g., "8" or "6.5")`
            };
          }
        }

        if (state.currentQuestion === 'proof') {
          return {
            text: `Please send a photo of your completed work. 📸\n\nYou can attach an image using the 📎 button.`
          };
        }

        // Fallback - determine what's missing and ask for it
        console.log(`⚠️ Fallback triggered - checking what's missing`);
        
        if (!state.report.description) {
          state.currentQuestion = 'description';
          await this.saveFieldWorkerState(userId, state);
          return {
            text: `Hi ${userName}! 👋\n\nLet's start your daily report.\n\nWhat work did you do today?`
          };
        } else if (!state.report.site) {
          state.currentQuestion = 'site';
          await this.saveFieldWorkerState(userId, state);
          return {
            text: `Which site or location did you work at?`
          };
        } else if (!state.report.hours) {
          state.currentQuestion = 'hours';
          await this.saveFieldWorkerState(userId, state);
          return {
            text: `How many hours did you work? (Just send the number)`
          };
        } else {
          // All fields filled, ask for proof
          state.currentQuestion = 'proof';
          await this.saveFieldWorkerState(userId, state);
          return {
            text: `Please send a photo of your completed work as proof. 📸`
          };
        }

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
   * 🧠 AI: Extract structured report fields
   */
  async extractReportFields(message, currentReport) {
    const prompt = `You are a government field worker assistant. Extract ONLY explicitly mentioned information from the message.

Current report data: ${JSON.stringify(currentReport)}

User message: "${message}"

Return ONLY valid JSON:
{
  "fields": {
    "description": "what work was done - ONLY if explicitly mentioned (string or null)",
    "site": "work location/site name - ONLY if explicitly mentioned (string or null)",
    "hours": "hours worked as number - ONLY if explicitly mentioned (number or null)",
    "blockers": "any issues/problems - ONLY if explicitly mentioned (string or null)"
  },
  "missing_fields": ["list fields that are still null"]
}

CRITICAL RULES:
1. ONLY extract information that is EXPLICITLY stated
2. DO NOT guess or infer - if not clearly mentioned, return null
3. DO NOT fill in fields based on assumptions
4. If user just says "hi" or casual chat, return all nulls
5. hours must be a NUMBER (1-24), not a string
6. missing_fields should list: description, site, hours (only if still null)

Examples:
- "Fixed pipes" → description: "Fixed pipes", site: null, hours: null
- "at Kansai section" → site: "Kansai section", description: null, hours: null  
- "8 hours" → hours: 8, description: null, site: null
- "Hi" → all null
- "Worked 8 hours at Zone A fixing leaks" → all fields extracted`;

    try {
      const result = await this.callAI([
        { role: 'system', content: prompt },
        { role: 'user', content: message }
      ], { jsonMode: true, temperature: 0.1, maxTokens: 2000 });
      
      // Merge with current report - don't overwrite existing data with null
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
      console.error('AI extraction error:', error);
      throw error;
    }
  }

  /**
   * Chat with AI (Gemini or DeepSeek)
   */
  async chatWithAI(userId, message, systemContext) {
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

      const response = await this.callAI(messages, { temperature: 0.7, maxTokens: 500 });

      return {
        text: response
      };

    } catch (error) {
      console.error('AI API error:', error.message);
      throw new Error('Failed to get response from AI');
    }
  }

  /**
   * Store user phone number temporarily
   */
  async storeUserPhone(telegramUserId, phoneNumber, fullName) {
    try {
      await pool.query(
        `INSERT INTO user_temp_data (telegram_user_id, phone_number, full_name, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (telegram_user_id)
         DO UPDATE SET phone_number = $2, full_name = $3, updated_at = NOW()`,
        [telegramUserId, phoneNumber, fullName]
      );
    } catch (error) {
      console.error('Error storing user phone:', error);
    }
  }

  /**
   * Get stored phone number
   */
  async getStoredPhone(telegramUserId) {
    try {
      const result = await pool.query(
        'SELECT phone_number, full_name FROM user_temp_data WHERE telegram_user_id = $1',
        [telegramUserId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting stored phone:', error);
      return null;
    }
  }

  /**
   * Create pending registration request
   */
  async createPendingRegistration({ userId, userName, userType, channel, data }) {
    try {
      const result = await pool.query(
        `INSERT INTO pending_registrations 
         (telegram_user_id, whatsapp_phone, full_name, user_type, channel, 
          company_name, license_number, gst_number, category, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', NOW())
         ON CONFLICT (telegram_user_id) 
         DO UPDATE SET 
           full_name = $3,
           company_name = $6,
           license_number = $7,
           gst_number = $8,
           category = $9,
           status = 'pending',
           updated_at = NOW()
         RETURNING id`,
        [
          channel === 'telegram' ? userId : null,
          channel === 'whatsapp' ? userId : null,
          userName,
          userType,
          channel,
          data.company_name,
          data.license_number,
          data.gst,
          data.category
        ]
      );

      console.log(`✅ Pending registration created: ${result.rows[0].id}`);
      return result.rows[0].id;

    } catch (error) {
      console.error('Error creating pending registration:', error);
      throw error;
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
   * For Telegram: First check if we have stored phone, otherwise return null
   * For WhatsApp: phoneNumber is the actual phone number
   */
  async getUserContext(userId) {
    try {
      // Check if this is a Telegram ID (numeric, short)
      const isTelegramId = userId.length < 15 && /^\d+$/.test(userId);
      
      if (isTelegramId) {
        // For Telegram, get the stored phone number first
        const storedData = await this.getStoredPhone(userId);
        if (!storedData || !storedData.phone_number) {
          // No phone number stored yet
          return null;
        }
        // Use the real phone number for lookup
        userId = storedData.phone_number;
      }
      
      // Check if user exists in users table with phone number
      // and is a department officer (staff member)
      const result = await pool.query(
        `SELECT u.id, u.full_name, u.role, u.department_id, u.status as is_active, 
                d.name as department_name,
                doff.staff_id, doff.role as staff_role, doff.zone, doff.ward, 
                doff.status as staff_status, doff.specialization
         FROM users u
         LEFT JOIN departments d ON u.department_id = d.id
         LEFT JOIN departmentofficers doff ON doff.user_id = u.id
         WHERE u.phone = $1 
           AND u.status = 'active'
           AND u.role IN ('department_officer', 'department_head')
           AND doff.staff_id IS NOT NULL`,
        [userId]
      );

      if (result.rows.length > 0) {
        const user = result.rows[0];
        return {
          id: user.id,
          name: user.full_name,
          full_name: user.full_name,
          role: 'field_worker', // Map department_officer to field_worker for workflow
          department_id: user.department_id,
          department_name: user.department_name,
          is_active: user.is_active === 'active',
          staff_id: user.staff_id,
          staff_role: user.staff_role,
          zone: user.zone,
          ward: user.ward,
          staff_status: user.staff_status,
          specialization: user.specialization
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting user context:', error);
      throw error; // Re-throw to see the actual error
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
