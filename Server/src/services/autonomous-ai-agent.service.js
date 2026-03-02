import OpenAI from 'openai';
import pool from '../config/database.js';
import stateManager from './state-manager.service.js';

/**
 * Fully Autonomous AI Agent
 * No hardcoded prompts - AI decides everything based on context
 * Uses Puter.js OpenAI-compatible endpoint for free AI access
 * Proper state management with database persistence
 */
class AutonomousAIAgent {
  constructor() {
    this.client = null;
    this.initialize();
  }

  initialize() {
    try {
      const puterAuthToken = process.env.PUTER_AUTH_TOKEN;
      if (!puterAuthToken) {
        console.warn('⚠️  PUTER_AUTH_TOKEN not configured - autonomous agent disabled');
        console.log('💡 Get your token from: https://puter.com/dashboard');
        return;
      }

      // Use Puter's OpenAI-compatible endpoint
      this.client = new OpenAI({
        baseURL: 'https://api.puter.com/puterai/openai/v1/',
        apiKey: puterAuthToken,
      });
      
      console.log('✅ Autonomous AI Agent initialized with Puter.js');
    } catch (error) {
      console.error('❌ Failed to initialize Autonomous AI Agent:', error.message);
    }
  }

  /**
   * Main entry point - AI decides everything
   */
  async processMessage({ userId, userName, message, channel, media, userContext, conversationHistory }) {
    if (!this.client) {
      return this.fallbackResponse(message);
    }

    try {
      // Build comprehensive context for AI
      const context = await this.buildContext({
        userId,
        userName,
        message,
        channel,
        media,
        userContext,
        conversationHistory
      });

      // Let AI decide what to do
      const aiDecision = await this.getAIDecision(context);

      // Execute AI's decision
      const response = await this.executeDecision(aiDecision, context);

      // Store conversation
      this.storeConversation(userId, message, response.text);

      return response;

    } catch (error) {
      console.error('❌ Autonomous AI error:', error);
      return this.fallbackResponse(message);
    }
  }

  /**
   * Build comprehensive context for AI
   */
  async buildContext({ userId, userName, message, channel, media, userContext, conversationHistory }) {
    // Get user profile from database
    const userProfile = await this.getUserProfile(userId);
    
    // Get conversation history from state manager
    const history = await stateManager.getConversationHistory(userId);
    
    // Get workflow state
    const workflowState = await stateManager.getWorkflowState(userId);
    
    // Get collected data
    const collectedData = await stateManager.getCollectedData(userId);

    // Analyze media if present
    let mediaAnalysis = null;
    if (media) {
      mediaAnalysis = await this.analyzeMedia(media);
    }

    return {
      user: {
        id: userId,
        name: userName,
        profile: userProfile,
        context: userContext
      },
      conversation: {
        currentMessage: message,
        history: history.slice(-20), // Last 20 messages
        channel: channel
      },
      workflow: workflowState,
      collectedData: collectedData,
      media: mediaAnalysis,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Let AI decide what to do - no hardcoded logic
   */
  async getAIDecision(context) {
    const prompt = `You are an autonomous AI agent for a government grievance management system. You have complete freedom to decide how to respond and what actions to take.

CONTEXT:
${JSON.stringify(context, null, 2)}

AVAILABLE ACTIONS:
1. ask_question - Ask user for information
2. provide_information - Give information to user
3. register_user - Register user (contractor or field worker)
4. collect_data - Collect specific data fields
5. analyze_image - Analyze uploaded image
6. submit_report - Submit collected data
7. check_status - Check registration/report status
8. redirect_user - Redirect to different bot/workflow
9. clarify_intent - Ask user to clarify their intent
10. end_conversation - End the conversation

YOUR TASK:
Analyze the context and decide:
1. What is the user trying to do?
2. What information do you need?
3. What action should you take?
4. What should you say to the user?

IMPORTANT:
- Be conversational and natural
- Don't use rigid templates
- Adapt to user's communication style
- Handle ambiguity intelligently
- Detect if user is using wrong bot
- Extract information from natural language
- Be helpful and guide the user

Respond with JSON:
{
  "understanding": "What you understand user wants",
  "userType": "contractor|field_worker|citizen|unclear",
  "intent": "registration|status_check|report_submission|help|other",
  "confidence": 0.0-1.0,
  "action": "action_to_take",
  "dataNeeded": ["list", "of", "data", "fields", "needed"],
  "dataCollected": {"field": "value"},
  "nextStep": "what to do next",
  "response": "natural conversational response to user",
  "reasoning": "why you made this decision"
}

Return ONLY valid JSON.`;

    try {
      const response = await this.client.chat.completions.create({
        model: 'gemini-2.5-flash-lite', // Fast and free model
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant that responds only in valid JSON format.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const text = response.choices[0].message.content;
      
      try {
        // Try to parse JSON directly
        const parsed = JSON.parse(text);
        return parsed;
      } catch (parseError) {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[1]);
        }
        // Try to find JSON object in text
        const objectMatch = text.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          return JSON.parse(objectMatch[0]);
        }
        throw new Error('No valid JSON found in response');
      }
    } catch (error) {
      console.error('❌ Failed to get AI decision:', error.message);
      return this.fallbackDecision(context);
    }
  }

  /**
   * Execute AI's decision
   */
  async executeDecision(decision, context) {
    console.log('🤖 AI Decision:', JSON.stringify(decision, null, 2));

    // Update workflow state
    await stateManager.updateWorkflowState(context.user.id, {
      intent: decision.intent,
      userType: decision.userType,
      currentStep: decision.action,
      nextAction: decision.nextStep,
      dataNeeded: decision.dataNeeded,
      dataCollected: Object.keys(decision.dataCollected || {})
    });

    // Store collected data
    if (decision.dataCollected && Object.keys(decision.dataCollected).length > 0) {
      await stateManager.updateCollectedData(context.user.id, decision.dataCollected);
    }

    // Execute action based on AI's decision
    switch (decision.action) {
      case 'register_user':
        return await this.handleRegistration(decision, context);
      
      case 'collect_data':
        return await this.handleDataCollection(decision, context);
      
      case 'analyze_image':
        return await this.handleImageAnalysis(decision, context);
      
      case 'submit_report':
        return await this.handleSubmission(decision, context);
      
      case 'check_status':
        return await this.handleStatusCheck(decision, context);
      
      case 'redirect_user':
        return await this.handleRedirect(decision, context);
      
      default:
        return {
          text: decision.response,
          action: decision.action,
          nextStep: decision.nextStep
        };
    }
  }

  /**
   * Handle registration
   */
  async handleRegistration(decision, context) {
    // AI decides what data to collect
    const missingData = decision.dataNeeded.filter(
      field => !decision.dataCollected[field]
    );

    if (missingData.length > 0) {
      // Still collecting data
      return {
        text: decision.response,
        action: 'collecting_data',
        missingFields: missingData
      };
    }

    // All data collected, register user
    try {
      if (decision.userType === 'contractor') {
        // For contractors, ensure we have at least name/company_name
        if (!decision.dataCollected.name && !decision.dataCollected.companyName && !decision.dataCollected.company_name) {
          return {
            text: 'I need your company name to complete the registration. What is your company name?',
            action: 'collecting_data',
            missingFields: ['company_name']
          };
        }
        
        await this.registerContractor(context.user.id, decision.dataCollected);
      } else if (decision.userType === 'field_worker') {
        await this.registerFieldWorker(context.user.id, decision.dataCollected);
      }

      // Mark workflow as complete
      await stateManager.completeWorkflow(context.user.id);

      return {
        text: decision.response + '\n\n✅ Registration complete!',
        action: 'registration_complete'
      };
    } catch (error) {
      console.error('❌ Registration error:', error);
      return {
        text: 'Sorry, there was an error completing your registration. Please try again.',
        action: 'error'
      };
    }
  }

  /**
   * Handle data collection
   */
  async handleDataCollection(decision, context) {
    // Store collected data
    await this.storeUserData(context.user.id, decision.dataCollected);

    return {
      text: decision.response,
      action: 'data_collected',
      dataCollected: decision.dataCollected,
      dataNeeded: decision.dataNeeded
    };
  }

  /**
   * Handle image analysis
   */
  async handleImageAnalysis(decision, context) {
    if (!context.media) {
      return {
        text: 'Please upload an image.',
        action: 'waiting_for_image'
      };
    }

    // AI analyzes the image
    const analysis = await this.analyzeImageWithAI(context.media, context);

    return {
      text: decision.response + `\n\n🤖 Image Analysis: ${analysis.description}`,
      action: 'image_analyzed',
      imageAnalysis: analysis
    };
  }

  /**
   * Handle submission
   */
  async handleSubmission(decision, context) {
    try {
      // Submit based on user type
      if (decision.userType === 'field_worker') {
        await this.submitFieldWorkerReport(context.user.id, decision.dataCollected);
      } else if (decision.userType === 'contractor') {
        await this.submitContractorApplication(context.user.id, decision.dataCollected);
      }

      return {
        text: decision.response + '\n\n✅ Submitted successfully!',
        action: 'submission_complete'
      };
    } catch (error) {
      console.error('❌ Submission error:', error);
      return {
        text: 'Sorry, there was an error submitting. Please try again.',
        action: 'error'
      };
    }
  }

  /**
   * Handle status check
   */
  async handleStatusCheck(decision, context) {
    const status = await this.getUserStatus(context.user.id);
    
    return {
      text: decision.response + `\n\n${status}`,
      action: 'status_checked'
    };
  }

  /**
   * Handle redirect
   */
  async handleRedirect(decision, context) {
    return {
      text: decision.response,
      action: 'redirect',
      redirectTo: decision.nextStep
    };
  }

  /**
   * Analyze media with AI
   */
  async analyzeMedia(media) {
    if (!this.model || !media) return null;

    try {
      const prompt = `Analyze this image and describe what you see. Focus on:
- What type of work or activity is shown
- Quality and completeness of work
- Any issues or concerns
- Relevant details for a work report

Be specific and detailed.`;

      // Note: Actual image analysis would require vision model
      // For now, return placeholder
      return {
        description: 'Image uploaded',
        type: media.mimeType,
        url: media.fileUrl
      };
    } catch (error) {
      console.error('❌ Media analysis error:', error);
      return null;
    }
  }

  /**
   * Analyze image with full context
   */
  async analyzeImageWithAI(media, context) {
    const prompt = `Analyze this image in the context of:
User: ${context.user.name}
Type: ${context.user.profile?.userType || 'unknown'}
Current task: ${context.system?.currentTask || 'unknown'}

Describe what you see and how it relates to their work.`;

    // Placeholder - would use vision model
    return {
      description: 'Work site image',
      relevance: 'high',
      quality: 'good'
    };
  }

  /**
   * Get user profile from database
   */
  async getUserProfile(userId) {
    try {
      // Check contractors table (uses contractor_id, not user_id)
      try {
        const contractorResult = await pool.query(
          `SELECT *, 'contractor' as user_type FROM contractors WHERE contractor_id = $1 LIMIT 1`,
          [userId]
        );
        
        if (contractorResult.rows.length > 0) {
          return contractorResult.rows[0];
        }
      } catch (err) {
        // Table might not exist or column name different, continue
        console.log('⚠️  Contractors table query failed:', err.message);
      }

      // For Telegram users, userId is a number string, not UUID
      // Check if this is a UUID or Telegram ID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      
      if (isUUID) {
        // Check users table by UUID
        try {
          const userResult = await pool.query(
            `SELECT *, 'field_worker' as user_type FROM users WHERE id = $1 AND role = 'field_worker' LIMIT 1`,
            [userId]
          );
          
          if (userResult.rows.length > 0) {
            return userResult.rows[0];
          }
        } catch (err) {
          console.log('⚠️  Users table query failed:', err.message);
        }
      }

      // Check daily_reports to see if user has submitted reports before
      // Only if userId is a valid UUID
      if (isUUID) {
        try {
          const reportResult = await pool.query(
            `SELECT user_id, COUNT(*) as report_count, MAX(date) as last_report_date 
             FROM daily_reports 
             WHERE user_id = $1 
             GROUP BY user_id 
             LIMIT 1`,
            [userId]
          );
          
          if (reportResult.rows.length > 0) {
            return {
              user_id: userId,
              user_type: 'field_worker',
              report_count: reportResult.rows[0].report_count,
              last_report_date: reportResult.rows[0].last_report_date
            };
          }
        } catch (err) {
          console.log('⚠️  Daily reports query failed:', err.message);
        }
      }

      // New user - no profile yet
      return null;
    } catch (error) {
      console.error('❌ Error fetching user profile:', error.message);
      return null;
    }
  }

  /**
   * Get system state for user
   */
  async getSystemState(userId) {
    // Get current workflow state, pending tasks, etc.
    return {
      currentTask: null,
      pendingActions: [],
      lastActivity: new Date().toISOString()
    };
  }

  /**
   * Store conversation
   */
  async storeConversation(userId, userMessage, botResponse) {
    await stateManager.addToHistory(userId, 'user', userMessage);
    await stateManager.addToHistory(userId, 'bot', botResponse);
  }

  /**
   * Clear user state (logout)
   */
  async clearUserState(userId, channel = 'telegram') {
    await stateManager.clearState(userId, channel);
  }

  /**
   * Reset workflow (for /reset command)
   */
  async resetWorkflow(userId, channel = 'telegram') {
    await stateManager.resetWorkflow(userId, channel);
  }

  /**
   * Store user data
   */
  async storeUserData(userId, data) {
    // Store in appropriate table based on data type
    console.log('📦 Storing user data:', userId, data);
  }

  /**
   * Register contractor
   */
  async registerContractor(userId, data) {
    try {
      // Ensure we have company_name (required field)
      const companyName = data.companyName || data.company_name || data.name || 'Unknown Company';
      const contactPerson = data.contactPerson || data.contact_person || data.name || 'Unknown';
      const phone = data.phone || data.phoneNumber || data.contact_number || userId;
      const email = data.email || data.email_address || null;
      const specialization = data.specialization || data.category || null;

      await pool.query(
        `INSERT INTO contractors (contractor_id, company_name, contact_person, phone, email, specialization)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (contractor_id) DO UPDATE SET
         company_name = $2, contact_person = $3, phone = $4, email = $5, specialization = $6`,
        [userId, companyName, contactPerson, phone, email, specialization]
      );
      
      console.log(`✅ Registered contractor: ${companyName} (${userId})`);
    } catch (error) {
      console.error('❌ Error registering contractor:', error.message);
      throw error;
    }
  }

  /**
   * Register field worker
   */
  async registerFieldWorker(userId, data) {
    // Create user in users table if not exists
    await pool.query(
      `INSERT INTO users (id, full_name, phone, role, is_active, created_at)
       VALUES ($1, $2, $3, 'field_worker', true, NOW())
       ON CONFLICT (id) DO UPDATE SET
       full_name = $2, phone = $3, role = 'field_worker', is_active = true`,
      [userId, data.fullName || 'Field Worker', data.phone || userId]
    );
  }

  /**
   * Submit field worker report
   */
  async submitFieldWorkerReport(userId, data) {
    await pool.query(
      `INSERT INTO daily_reports (user_id, description, site, hours, date)
       VALUES ($1, $2, $3, $4, CURRENT_DATE)`,
      [userId, data.description, data.site, data.hours]
    );
  }

  /**
   * Submit contractor application
   */
  async submitContractorApplication(userId, data) {
    await pool.query(
      `UPDATE contractors SET verification_status = 'pending_review'
       WHERE user_id = $1`,
      [userId]
    );
  }

  /**
   * Get user status
   */
  async getUserStatus(userId) {
    try {
      // Check contractors (uses contractor_id)
      try {
        const contractorResult = await pool.query(
          `SELECT is_active, created_at FROM contractors WHERE contractor_id = $1 LIMIT 1`,
          [userId]
        );
        
        if (contractorResult.rows.length > 0) {
          const status = contractorResult.rows[0];
          return `Status: ${status.is_active ? 'Active' : 'Inactive'}\nRegistered: ${new Date(status.created_at).toLocaleDateString()}`;
        }
      } catch (err) {
        console.log('⚠️  Contractors status query failed:', err.message);
      }

      // Check if this is a UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      
      if (isUUID) {
        // Check users table for field workers
        try {
          const userResult = await pool.query(
            `SELECT is_active, created_at FROM users WHERE id = $1 AND role = 'field_worker' LIMIT 1`,
            [userId]
          );
          
          if (userResult.rows.length > 0) {
            const status = userResult.rows[0];
            return `Status: ${status.is_active ? 'Active' : 'Inactive'}\nRegistered: ${new Date(status.created_at).toLocaleDateString()}`;
          }
        } catch (err) {
          console.log('⚠️  Users status query failed:', err.message);
        }
      }

      // Check if user has submitted reports
      try {
        const reportResult = await pool.query(
          `SELECT COUNT(*) as count, MAX(date) as last_date FROM daily_reports WHERE user_id = $1`,
          [userId]
        );
        
        if (reportResult.rows[0].count > 0) {
          return `Reports submitted: ${reportResult.rows[0].count}\nLast report: ${new Date(reportResult.rows[0].last_date).toLocaleDateString()}`;
        }
      } catch (err) {
        console.log('⚠️  Reports status query failed:', err.message);
      }
      
      return 'No registration found. Would you like to register?';
    } catch (error) {
      console.error('❌ Error checking status:', error.message);
      return 'Unable to check status.';
    }
  }

  /**
   * Fallback response when AI is not available
   */
  fallbackResponse(message) {
    return {
      text: 'I understand you want to: ' + message + '\n\nHow can I help you with that?',
      action: 'fallback'
    };
  }

  /**
   * Fallback decision when AI parsing fails
   */
  fallbackDecision(context) {
    return {
      understanding: 'User sent a message',
      userType: 'unclear',
      intent: 'other',
      confidence: 0.5,
      action: 'ask_question',
      dataNeeded: [],
      dataCollected: {},
      nextStep: 'clarify_intent',
      response: 'I want to help you. Could you tell me more about what you need?',
      reasoning: 'Fallback due to AI parsing error'
    };
  }
}

export default new AutonomousAIAgent();
