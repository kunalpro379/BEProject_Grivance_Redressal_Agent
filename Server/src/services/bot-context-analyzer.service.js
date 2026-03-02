import { GoogleGenerativeAI } from '@google/generative-ai';

class BotContextAnalyzerService {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.initialize();
  }

  initialize() {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn('⚠️  GEMINI_API_KEY not configured - context analysis disabled');
        return;
      }

      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-3.1-pro-preview' });
      console.log('✅ Bot Context Analyzer initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Bot Context Analyzer:', error.message);
    }
  }

  /**
   * Analyze user message to determine intent and extract information
   * @param {string} message - User's message
   * @param {string} botType - 'contractor' or 'fieldworker'
   * @param {object} conversationHistory - Previous messages for context
   * @returns {object} Analysis result with intent, entities, and suggestions
   */
  async analyzeMessage(message, botType, conversationHistory = []) {
    if (!this.model) {
      return this.fallbackAnalysis(message, botType);
    }

    try {
      const prompt = this.buildAnalysisPrompt(message, botType, conversationHistory);
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      // Parse JSON response
      const analysis = JSON.parse(this.extractJSON(response));
      
      return {
        success: true,
        ...analysis
      };
    } catch (error) {
      console.error('❌ Context analysis error:', error.message);
      return this.fallbackAnalysis(message, botType);
    }
  }

  /**
   * Build prompt for AI analysis
   */
  buildAnalysisPrompt(message, botType, conversationHistory) {
    const botContext = botType === 'contractor' 
      ? this.getContractorContext() 
      : this.getFieldWorkerContext();

    const historyText = conversationHistory.length > 0
      ? `\n\nConversation History:\n${conversationHistory.map(h => `${h.role}: ${h.message}`).join('\n')}`
      : '';

    return `You are an intelligent bot context analyzer for a government grievance management system.

${botContext}

Current User Message: "${message}"
${historyText}

Analyze this message and provide a JSON response with the following structure:
{
  "intent": "registration|status_check|document_upload|general_query|greeting|help",
  "confidence": 0.0-1.0,
  "userType": "contractor|field_worker|unclear",
  "entities": {
    "companyName": "extracted company name if mentioned",
    "licenseNumber": "extracted license if mentioned",
    "gstNumber": "extracted GST if mentioned",
    "phoneNumber": "extracted phone if mentioned",
    "experience": "extracted years of experience if mentioned",
    "category": "extracted category/specialization if mentioned",
    "location": "extracted location if mentioned"
  },
  "nextStep": "What the bot should ask or do next",
  "suggestedResponse": "A friendly response to the user",
  "isRelevantToBot": true/false,
  "reasoning": "Brief explanation of the analysis"
}

Important:
- Be context-aware: understand if user is a contractor or field worker
- Extract all relevant information from the message
- Provide clear next steps
- If user seems confused about bot purpose, explain it
- Handle greetings naturally
- Detect registration intent even if not explicitly stated

Return ONLY valid JSON, no additional text.`;
  }

  getContractorContext() {
    return `Bot Type: CONTRACTOR REGISTRATION BOT

Purpose: This bot helps contractors register for government projects by collecting:
- Company name and details
- License number
- GST number
- Years of experience
- Specializations (e.g., road construction, electrical work)
- Certifications
- Supporting documents

Contractors are BUSINESSES/COMPANIES that bid on government projects.
They are NOT individual workers or field staff.

Key indicators of contractor:
- Mentions company name
- Talks about licenses, GST, certifications
- Discusses project bidding, tenders
- Refers to business operations
- Mentions team/employees`;
  }

  getFieldWorkerContext() {
    return `Bot Type: FIELD WORKER REGISTRATION BOT

Purpose: This bot helps department field workers register and submit daily progress reports by collecting:
- Full name (individual person)
- Phone number
- Department assignment
- Zone/ward allocation
- Specialization (e.g., plumber, electrician)
- Daily work reports
- Progress photos

Field workers are INDIVIDUAL EMPLOYEES who work for the department.
They are NOT companies or contractors.

Key indicators of field worker:
- Individual person registering
- Mentions department/government employment
- Talks about daily work, tasks, assignments
- Refers to zones, wards, areas
- Discusses progress reports, site visits
- Individual name (not company name)`;
  }

  /**
   * Extract JSON from AI response
   */
  extractJSON(text) {
    // Try to find JSON in the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }
    return text;
  }

  /**
   * Fallback analysis when AI is not available
   */
  fallbackAnalysis(message, botType) {
    const lowerMessage = message.toLowerCase();
    
    // Detect intent
    let intent = 'general_query';
    if (lowerMessage.match(/\b(hi|hello|hey|start)\b/)) {
      intent = 'greeting';
    } else if (lowerMessage.match(/\b(register|registration|sign up|join)\b/)) {
      intent = 'registration';
    } else if (lowerMessage.match(/\b(status|check|progress|where)\b/)) {
      intent = 'status_check';
    } else if (lowerMessage.match(/\b(help|how|what|guide)\b/)) {
      intent = 'help';
    }

    // Extract entities
    const entities = {};
    
    // Phone number
    const phoneMatch = message.match(/\b(\+?\d{10,15})\b/);
    if (phoneMatch) entities.phoneNumber = phoneMatch[1];
    
    // GST number
    const gstMatch = message.match(/\b(\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1})\b/);
    if (gstMatch) entities.gstNumber = gstMatch[1];
    
    // License number
    const licenseMatch = message.match(/\b(LIC[-_]?\d+|LICENSE[-_]?\d+)\b/i);
    if (licenseMatch) entities.licenseNumber = licenseMatch[1];

    return {
      success: true,
      intent,
      confidence: 0.6,
      userType: botType === 'contractor' ? 'contractor' : 'field_worker',
      entities,
      nextStep: this.getNextStep(intent, botType),
      suggestedResponse: this.getSuggestedResponse(intent, botType),
      isRelevantToBot: true,
      reasoning: 'Fallback rule-based analysis'
    };
  }

  getNextStep(intent, botType) {
    if (intent === 'greeting') {
      return `Explain ${botType} bot purpose and ask if they want to register`;
    } else if (intent === 'registration') {
      return `Start ${botType} registration flow`;
    } else if (intent === 'status_check') {
      return `Check ${botType} registration status in database`;
    } else {
      return `Provide help about ${botType} registration process`;
    }
  }

  getSuggestedResponse(intent, botType) {
    const botName = botType === 'contractor' ? 'Contractor Registration' : 'Field Worker';
    
    if (intent === 'greeting') {
      return `Welcome to ${botName} Bot! I help ${botType === 'contractor' ? 'companies register for government projects' : 'field workers register and submit daily reports'}. Would you like to register?`;
    } else if (intent === 'registration') {
      return `Great! Let's start your ${botType} registration. ${botType === 'contractor' ? 'What is your company name?' : 'What is your full name?'}`;
    } else if (intent === 'status_check') {
      return `Let me check your registration status...`;
    } else {
      return `I'm the ${botName} Bot. I can help you with registration and ${botType === 'contractor' ? 'document submission' : 'daily progress reports'}. Type "register" to get started!`;
    }
  }

  /**
   * Validate if user is using the correct bot
   */
  async validateBotUsage(message, botType, conversationHistory = []) {
    if (!this.model) {
      return { isCorrectBot: true, suggestion: null };
    }

    try {
      const prompt = `You are validating if a user is using the correct Telegram bot.

Bot Type: ${botType.toUpperCase()}
${botType === 'contractor' ? this.getContractorContext() : this.getFieldWorkerContext()}

User Message: "${message}"

Conversation History:
${conversationHistory.map(h => `${h.role}: ${h.message}`).join('\n')}

Analyze if the user seems to be:
1. A contractor (company/business) using the contractor bot ✅
2. A field worker (individual employee) using the field worker bot ✅
3. A contractor mistakenly using the field worker bot ❌
4. A field worker mistakenly using the contractor bot ❌

Return JSON:
{
  "isCorrectBot": true/false,
  "detectedUserType": "contractor|field_worker|unclear",
  "confidence": 0.0-1.0,
  "suggestion": "If wrong bot, suggest the correct bot name and purpose",
  "reasoning": "Brief explanation"
}

Return ONLY valid JSON.`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      const validation = JSON.parse(this.extractJSON(response));
      
      return validation;
    } catch (error) {
      console.error('❌ Bot validation error:', error.message);
      return { isCorrectBot: true, suggestion: null };
    }
  }

  /**
   * Extract structured data from free-form text
   */
  async extractStructuredData(message, dataType) {
    if (!this.model) {
      return null;
    }

    try {
      const prompts = {
        company: `Extract company information from: "${message}"\nReturn JSON: {"companyName": "", "type": "pvt ltd|llp|proprietorship|other"}`,
        experience: `Extract years of experience from: "${message}"\nReturn JSON: {"years": number, "description": ""}`,
        specializations: `Extract specializations/skills from: "${message}"\nReturn JSON: {"specializations": ["skill1", "skill2"]}`,
        certifications: `Extract certifications from: "${message}"\nReturn JSON: {"certifications": ["cert1", "cert2"]}`,
        contact: `Extract contact information from: "${message}"\nReturn JSON: {"phone": "", "email": "", "address": ""}`
      };

      const prompt = prompts[dataType] || message;
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      return JSON.parse(this.extractJSON(response));
    } catch (error) {
      console.error('❌ Data extraction error:', error.message);
      return null;
    }
  }
}

export default new BotContextAnalyzerService();
