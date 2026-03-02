import TelegramBot from 'node-telegram-bot-api';
import pool from '../config/database.js';
import contractorAnalysisService from './contractor-analysis.service.js';
import deepseekAI from './deepseek-ai.service.js';
import contractorReportService from './contractor-report.service.js';
import axios from 'axios';

class TelegramContractorBot {
  constructor() {
    this.bot = null;
    this.states = new Map(); // In-memory state storage
    this.conversationHistory = new Map(); // Store conversation context
  }

  initialize() {
    const token = process.env.TELEGRAM_CONTRACTOR_BOT_TOKEN;
    
    if (!token) {
      console.log('  Telegram Contractor Bot token not configured');
      return;
    }

    // Validate token format
    if (token.includes('your_') || token.length < 20) {
      console.log('  Invalid Telegram Contractor Bot token - please configure a real token');
      return;
    }

    try {
      this.bot = new TelegramBot(token, { polling: true });
      
      // Add error handler to prevent spam
      this.bot.on('polling_error', (error) => {
        console.error('Telegram Contractor Bot polling error:', error.code);
        // Don't stop polling on temporary errors, only on fatal ones
        if (error.code === 'EFATAL' || (error.code === 'ETELEGRAM' && error.response?.statusCode === 401)) {
          console.log('  Stopping Telegram Contractor Bot due to persistent errors');
          if (this.bot) {
            this.bot.stopPolling();
            this.bot = null;
          }
        }
      });

      this.setupHandlers();
      console.log(' Telegram Contractor Bot initialized');
    } catch (error) {
      console.error('Failed to initialize Telegram Contractor Bot:', error.message);
      this.bot = null;
    }
  }

  setupHandlers() {
    if (!this.bot) return;

    // Handle documents FIRST (before message handler)
    this.bot.on('document', (msg) => this.handleDocument(msg));

    // Start command
    this.bot.onText(/\/start/, (msg) => this.handleStart(msg));

    // Register command
    this.bot.onText(/\/register/, (msg) => this.handleRegister(msg));

    // Status command
    this.bot.onText(/\/status/, (msg) => this.handleStatus(msg));

    // Submit report command
    this.bot.onText(/\/report/, (msg) => this.handleReportCommand(msg));

    // View reports command
    this.bot.onText(/\/myreports/, (msg) => this.handleMyReports(msg));

    // Reset command
    this.bot.onText(/\/reset/, (msg) => this.handleReset(msg));

    // Logout command
    this.bot.onText(/\/logout/, (msg) => this.handleLogout(msg));

    // Handle all non-command messages (LAST)
    this.bot.on('message', (msg) => {
      // Skip if it's a command or document
      if (msg.text?.startsWith('/') || msg.document) return;
      
      // Check if user is in report submission flow
      const userId = msg.from.id.toString();
      const state = this.states.get(userId);
      
      if (state && state.mode === 'report') {
        // User is in report flow, handle it there
        return;
      }
      
      // Otherwise, use autonomous AI
      this.handleMessage(msg);
    });
  }

  async handleStart(msg) {
    if (!this.bot) return;
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    const welcomeMessage = `
 *Welcome to Contractor Portal*

I'll help you manage your contractor profile and submit project reports.

*Available Commands:*
/register - Start contractor registration
/status - Check your registration status
/report - Submit a new project report
/myreports - View your submitted reports
/reset - Reset registration and start over
/logout - Clear all data and logout

Let's get started! Use /register to begin or /report to submit a report.
    `;

    await this.bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
  }

  async handleRegister(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    // Check if already registered
    const existing = await this.getContractor(userId);
    
    if (existing) {
      await this.bot.sendMessage(
        chatId,
        `You're already registered!\n\nStatus: ${existing.verification_status}\nCompany: ${existing.company_name}`
      );
      return;
    }

    // Initialize registration state
    this.states.set(userId, {
      step: 'company_name',
      data: {}
    });

    await this.bot.sendMessage(
      chatId,
      ' Let\'s start your registration!\n\nPlease provide your *Company Name*:',
      { parse_mode: 'Markdown' }
    );
  }

  async handleStatus(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    const contractor = await this.getContractor(userId);

    if (!contractor) {
      await this.bot.sendMessage(
        chatId,
        'You are not registered yet. Use /register to start registration.'
      );
      return;
    }

    let statusMessage = `
 *Your Registration Status*

Company: ${contractor.company_name}
License: ${contractor.license_number}
Category: ${contractor.category}
Status: *${contractor.verification_status.toUpperCase()}*
    `;

    if (contractor.ai_analysis) {
      statusMessage += `\n\n *AI Analysis Complete*`;
      statusMessage += `\nScore: ${contractor.analysis_score}/100`;
      statusMessage += `\nRecommendation: ${contractor.ai_analysis.final_recommendation}`;
      statusMessage += `\nPriority: ${contractor.ai_analysis.priority_ranking}`;
    }

    await this.bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
  }

  async handleReportCommand(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    try {
      console.log(` /report command received from user ${userId}`);

      // Check if contractor is registered
      const contractor = await this.getContractor(userId);
      
      if (!contractor) {
        console.log(` User ${userId} not registered as contractor`);
        await this.bot.sendMessage(
          chatId,
          'You need to register first. Use /register to start registration.'
        );
        return;
      }

      console.log(` Contractor found: ${contractor.company_name}`);

      // Initialize report submission state
      const reportState = {
        step: 'project_name',
        data: { contractor_id: contractor.id },
        mode: 'report'
      };
      
      this.states.set(userId, reportState);
      console.log(` Report state initialized for user ${userId}:`, reportState);

      console.log(` Report flow started for user ${userId}`);

      await this.bot.sendMessage(
        chatId,
        ' *Submit Project Report*\n\nLet\'s start with the project name.\n\nWhat is the project name?',
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error(` Error in handleReportCommand for user ${userId}:`, error);
      await this.bot.sendMessage(
        chatId,
        ' Error starting report submission. Please try again or contact support.'
      );
    }
  }

  async handleMyReports(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    try {
      const contractor = await this.getContractor(userId);
      
      if (!contractor) {
        await this.bot.sendMessage(
          chatId,
          'You are not registered yet. Use /register to start registration.'
        );
        return;
      }

      const reports = await contractorReportService.getContractorReports(contractor.id, 10);
      const stats = await contractorReportService.getContractorStats(contractor.id);

      if (reports.length === 0) {
        await this.bot.sendMessage(
          chatId,
          ' You haven\'t submitted any reports yet.\n\nUse /report to submit your first report!'
        );
        return;
      }

      let message = ` *Your Reports Summary*\n\n`;
      message += `Total Reports: ${stats.total_reports}\n`;
      message += `Average Progress: ${Math.round(stats.avg_progress)}%\n`;
      message += `Active Projects: ${stats.active_projects}\n`;
      message += `Last Report: ${new Date(stats.last_report_date).toLocaleDateString()}\n\n`;
      message += `*Recent Reports:*\n\n`;

      reports.slice(0, 5).forEach((report, index) => {
        message += `${index + 1}. ${report.project_name}\n`;
        message += `   Contract: ${report.contract_id}\n`;
        message += `   Progress: ${report.progress_percentage}%\n`;
        message += `   Date: ${new Date(report.created_at).toLocaleDateString()}\n\n`;
      });

      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('Error fetching reports:', error);
      await this.bot.sendMessage(
        chatId,
        ' Error fetching reports. Please try again.'
      );
    }
  }

  async handleReset(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    // Clear registration state
    this.states.delete(userId);
    this.conversationHistory.delete(userId);

    await this.bot.sendMessage(
      chatId,
      ' Registration reset!\n\nYou can start a fresh registration.\n\nUse /register to begin.'
    );
  }

  async handleLogout(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    // Clear all data
    this.states.delete(userId);
    this.conversationHistory.delete(userId);

    await this.bot.sendMessage(
      chatId,
      ' Logged out successfully!\n\nAll your conversation data has been cleared.\n\nTo start again, send /start'
    );
  }

  async handleMessage(msg) {
    // This should never receive commands due to the filter in setupHandlers
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const text = msg.text;

    if (!text) return; // Skip non-text messages

    // Check if user is in report submission flow - PRIORITY CHECK
    const state = this.states.get(userId);
    
    if (state && state.mode === 'report') {
      console.log(` User ${userId} is in report flow, routing to handleReportFlow`);
      await this.handleReportFlow(msg, state);
      return;
    }

    // Check if user is confirming extracted report
    if (state && state.mode === 'confirm_report') {
      if (text.toLowerCase().includes('yes') || text.toLowerCase().includes('confirm') || text.toLowerCase().includes('submit')) {
        await this.submitExtractedReport(userId, chatId, state.data);
        return;
      } else if (text.toLowerCase().includes('no') || text.toLowerCase().includes('cancel')) {
        this.states.delete(userId);
        await this.bot.sendMessage(chatId, 'Report cancelled. Feel free to continue chatting or use /report for structured submission.');
        return;
      }
      // Continue conversation to gather more details
    }

    // Use DeepSeek AI for natural conversation, but stay in domain
    console.log(` User ${userId} chatting with DeepSeek AI`);
    let history = this.conversationHistory.get(userId) || [];
    history.push({ role: 'user', message: text });
    if (history.length > 10) history = history.slice(-10);
    this.conversationHistory.set(userId, history);

    try {
      const response = await deepseekAI.generateContractorResponse(text, history);

      await this.bot.sendMessage(chatId, response);

      history.push({ role: 'assistant', message: response });
      this.conversationHistory.set(userId, history);

      // Check if AI detected report intent and extracted data
      const reportData = await deepseekAI.extractReportDataFromConversation(history);
      
      if (reportData && reportData.has_sufficient_data) {
        // AI detected enough information to create a report
        await this.bot.sendMessage(
          chatId,
          ` I've gathered the following information:\n\n` +
          ` Project: ${reportData.project_name || 'Not specified'}\n` +
          ` Progress: ${reportData.progress_percentage || 'Not specified'}%\n` +
          ` Description: ${reportData.description || 'Not specified'}\n\n` +
          `Would you like me to submit this report? Reply "yes" to confirm or continue chatting to add more details.`
        );
        
        // Store extracted data in state for confirmation
        this.states.set(userId, {
          mode: 'confirm_report',
          data: reportData
        });
      }

    } catch (error) {
      console.error(' Error handling message:', error);
      await this.bot.sendMessage(
        chatId,
        'Sorry, I encountered an error. Please try again or use /report for a structured submission.'
      );
    }
  }

  async submitExtractedReport(userId, chatId, extractedData) {
    try {
      await this.bot.sendMessage(chatId, ' Submitting your report...');

      const contractor = await this.getContractor(userId);
      if (!contractor) {
        await this.bot.sendMessage(chatId, ' You need to register first. Use /register');
        this.states.delete(userId);
        return;
      }

      const history = this.conversationHistory.get(userId) || [];
      
      const reportData = {
        contractor_id: contractor.id,
        user_id: userId,
        project_name: extractedData.project_name || 'Untitled Project',
        contract_id: extractedData.contract_id || contractor.contractor_id,
        progress_percentage: extractedData.progress_percentage || 0,
        description: extractedData.description || 'No description provided',
        challenges: extractedData.challenges,
        next_steps: extractedData.next_steps,
        document_urls: [],
        document_metadata: [],
        extracted_texts: [],
        report_text: `
Project: ${extractedData.project_name || 'Untitled Project'}
Contract ID: ${extractedData.contract_id || contractor.contractor_id}
Progress: ${extractedData.progress_percentage || 0}%

Description:
${extractedData.description || 'No description provided'}

${extractedData.challenges ? `Challenges:\n${extractedData.challenges}\n` : ''}
${extractedData.next_steps ? `Next Steps:\n${extractedData.next_steps}` : ''}
        `.trim(),
        ai_analysis: {
          extraction_method: 'conversational',
          quality_score: 70,
          completeness: 60,
          sentiment: 'neutral'
        },
        conversation_history: history
      };

      const report = await contractorReportService.saveReport(reportData);

      await this.bot.sendMessage(
        chatId,
        ` *Report Submitted Successfully!*\n\n` +
        ` Project: ${report.project_name}\n` +
        ` Progress: ${report.progress_percentage}%\n\n` +
        `Your report has been saved and will appear on the department dashboard.\n\n` +
        `Use /myreports to view all your reports.`,
        { parse_mode: 'Markdown' }
      );

      // Clear state and history
      this.states.delete(userId);
      this.conversationHistory.delete(userId);

    } catch (error) {
      console.error('Error submitting extracted report:', error);
      await this.bot.sendMessage(chatId, ' Error submitting report. Please try again.');
    }
  }

  async handleReportFlow(msg, state) {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const text = msg.text;

    console.log(` Report flow - Step: ${state.step}, User: ${userId}, Input: ${text}`);

    try {
      switch (state.step) {
        case 'project_name':
          state.data.project_name = text;
          state.step = 'contract_id';
          await this.bot.sendMessage(
            chatId,
            ' Project name saved!\n\nWhat is the Contract ID?'
          );
          break;

        case 'contract_id':
          state.data.contract_id = text;
          state.step = 'progress';
          await this.bot.sendMessage(
            chatId,
            ' Contract ID saved!\n\nWhat is the current progress percentage? (0-100)'
          );
          break;

        case 'progress':
          const progress = parseInt(text);
          if (isNaN(progress) || progress < 0 || progress > 100) {
            await this.bot.sendMessage(
              chatId,
              ' Please enter a valid number between 0 and 100.'
            );
            return;
          }
          state.data.progress_percentage = progress;
          state.step = 'description';
          await this.bot.sendMessage(
            chatId,
            ' Progress saved!\n\nPlease provide a detailed description of the work completed:'
          );
          break;

        case 'description':
          state.data.description = text;
          state.step = 'challenges';
          await this.bot.sendMessage(
            chatId,
            ' Description saved!\n\nAre there any challenges or issues? (Type "none" if no challenges)'
          );
          break;

        case 'challenges':
          state.data.challenges = text.toLowerCase() === 'none' ? null : text;
          state.step = 'next_steps';
          await this.bot.sendMessage(
            chatId,
            ' Challenges noted!\n\nWhat are the next steps planned?'
          );
          break;

        case 'next_steps':
          state.data.next_steps = text;
          state.step = 'documents';
          await this.bot.sendMessage(
            chatId,
            ' Next steps saved!\n\nNow upload any supporting documents (photos, PDFs, certificates).\n\nSend documents one by one, or type "done" when finished.'
          );
          break;

        case 'documents':
          if (text.toLowerCase() === 'done') {
            console.log(` Report submission complete for user ${userId}`);
            await this.completeReportSubmission(userId, chatId, state.data);
          } else {
            await this.bot.sendMessage(
              chatId,
              'Please upload documents or type "done" to finish.'
            );
          }
          break;
      }

      this.states.set(userId, state);

    } catch (error) {
      console.error('Error in report flow:', error);
      await this.bot.sendMessage(
        chatId,
        ' Error processing your input. Please try again.'
      );
    }
  }

  async handleDocument(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const state = this.states.get(userId);

    // Check if user is registered
    const contractor = await this.getContractor(userId);
    if (!contractor) {
      await this.bot.sendMessage(
        chatId,
        ' You need to register first. Use /register to start registration.'
      );
      return;
    }

    try {
      await this.bot.sendMessage(chatId, ' Processing document with AI analysis...');

      // Get file info
      const fileId = msg.document.file_id;
      const file = await this.bot.getFile(fileId);
      const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_CONTRACTOR_BOT_TOKEN}/${file.file_path}`;

      // Download file
      const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);

      // Process document (upload + extract text)
      const processedDoc = await contractorReportService.processDocument(
        buffer,
        msg.document.file_name,
        contractor.id
      );

      // If PDF with extracted text, use DeepSeek AI to analyze it
      if (processedDoc.extractedText && processedDoc.extractedText.length > 50) {
        await this.bot.sendMessage(chatId, ' Analyzing report with AI...');

        // Analyze with DeepSeek AI
        const aiAnalysis = await deepseekAI.analyzeContractorReport(
          processedDoc.extractedText,
          ''
        );

        console.log(' AI Analysis completed:', JSON.stringify(aiAnalysis, null, 2));

        // Auto-fill report data from AI analysis
        const reportData = {
          contractor_id: contractor.id,
          user_id: userId,
          project_name: aiAnalysis.project_name || 'Extracted from PDF',
          contract_id: aiAnalysis.contract_id || contractor.contractor_id || 'AUTO-' + Date.now(),
          progress_percentage: aiAnalysis.progress_percentage || 50,
          description: aiAnalysis.description || processedDoc.extractedText.substring(0, 500),
          challenges: aiAnalysis.challenges?.join('; ') || null,
          next_steps: aiAnalysis.next_steps || null,
          document_urls: [processedDoc.url],
          document_metadata: [{
            fileName: processedDoc.fileName,
            fileType: processedDoc.fileType,
            uploadedAt: new Date().toISOString()
          }],
          extracted_texts: [processedDoc.extractedText],
          ai_analysis: aiAnalysis,
          conversation_history: []
        };

        // Save report automatically
        const report = await contractorReportService.saveReport(reportData);

        // Send comprehensive response
        let responseMessage = ` *Report Analyzed & Saved!*\n\n`;
        responseMessage += ` *Document:* ${processedDoc.fileName}\n`;
        responseMessage += ` *Text Extracted:* ${processedDoc.extractedText.length} characters\n\n`;
        
        responseMessage += `* EXTRACTED DATA:*\n`;
        if (aiAnalysis.project_name) {
          responseMessage += ` Project: ${aiAnalysis.project_name}\n`;
        }
        if (aiAnalysis.contract_id) {
          responseMessage += ` Contract ID: ${aiAnalysis.contract_id}\n`;
        }
        if (aiAnalysis.progress_percentage) {
          responseMessage += ` Progress: ${aiAnalysis.progress_percentage}%\n`;
        }
        if (aiAnalysis.quality_score) {
          responseMessage += `⭐ Quality: ${aiAnalysis.quality_score}/100\n`;
        }
        if (aiAnalysis.completeness) {
          responseMessage += ` Completeness: ${aiAnalysis.completeness}/100\n`;
        }
        if (aiAnalysis.sentiment) {
          responseMessage += ` Sentiment: ${aiAnalysis.sentiment}\n`;
        }
        
        if (aiAnalysis.key_insights && aiAnalysis.key_insights.length > 0) {
          responseMessage += `\n* KEY INSIGHTS:*\n`;
          aiAnalysis.key_insights.slice(0, 3).forEach((insight, i) => {
            responseMessage += `${i + 1}. ${insight}\n`;
          });
        }
        
        if (aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0) {
          responseMessage += `\n* RECOMMENDATIONS:*\n`;
          aiAnalysis.recommendations.slice(0, 3).forEach((rec, i) => {
            responseMessage += `${i + 1}. ${rec}\n`;
          });
        }

        if (aiAnalysis.risk_factors && aiAnalysis.risk_factors.length > 0) {
          responseMessage += `\n* RISK FACTORS:*\n`;
          aiAnalysis.risk_factors.slice(0, 2).forEach((risk, i) => {
            responseMessage += `${i + 1}. ${risk}\n`;
          });
        }

        responseMessage += `\n *Report saved successfully!*`;
        responseMessage += `\n View it on the department dashboard`;

        await this.bot.sendMessage(chatId, responseMessage, { parse_mode: 'Markdown' });

        // Clear any conversation state
        this.states.delete(userId);
        this.conversationHistory.delete(userId);

      } else {
        // Non-PDF or no text extracted
        await this.bot.sendMessage(
          chatId,
          ` Document uploaded!\n ${processedDoc.fileName}\n\n Could not extract text from this document. Please upload a PDF with text content for AI analysis.`
        );
      }

    } catch (error) {
      console.error('Error handling document:', error);
      await this.bot.sendMessage(chatId, ` Error processing document: ${error.message}\n\nPlease try again or contact support.`);
    }
  }

  async completeReportSubmission(userId, chatId, data) {
    try {
      await this.bot.sendMessage(chatId, ' Processing your report...');

      // Add user_id to data
      data.user_id = userId;

      // Get conversation history for AI analysis
      const history = this.conversationHistory.get(userId) || [];
      
      // Generate AI summary of the conversation
      let aiAnalysis = null;
      if (history.length > 0) {
        try {
          const analysisPrompt = `Analyze this contractor report submission conversation and provide insights:
          
Conversation History:
${history.map(h => `${h.role}: ${h.message}`).join('\n')}

Report Details:
- Project: ${data.project_name}
- Contract: ${data.contract_id}
- Progress: ${data.progress_percentage}%
- Description: ${data.description}
- Challenges: ${data.challenges || 'None'}
- Next Steps: ${data.next_steps || 'None'}

Provide a JSON analysis with:
1. quality_score (0-100): Overall quality of the report
2. completeness (0-100): How complete the information is
3. risk_factors: Array of identified risks
4. recommendations: Array of recommendations
5. sentiment: positive/neutral/negative
6. key_insights: Array of key insights from the conversation`;

          const aiResponse = await autonomousAIAgent.processMessage({
            userId,
            userName: 'System',
            message: analysisPrompt,
            channel: 'telegram_contractor',
            media: null,
            userContext: null,
            conversationHistory: []
          });

          // Try to parse JSON from response
          try {
            const jsonMatch = aiResponse.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              aiAnalysis = JSON.parse(jsonMatch[0]);
            }
          } catch (e) {
            console.log('Could not parse AI analysis as JSON, storing as text');
            aiAnalysis = { raw_analysis: aiResponse.text };
          }
        } catch (err) {
          console.error('Error generating AI analysis:', err);
        }
      }

      // Add AI analysis to data
      data.ai_analysis = aiAnalysis;
      data.conversation_history = history;

      // Save report with embeddings
      const report = await contractorReportService.saveReport(data);

      let responseMessage = ` *Report Submitted Successfully!*\n\n` +
        `Project: ${report.project_name}\n` +
        `Contract: ${report.contract_id}\n` +
        `Progress: ${report.progress_percentage}%\n` +
        `Documents: ${data.document_urls?.length || 0}\n\n`;

      if (aiAnalysis && aiAnalysis.quality_score) {
        responseMessage += `\n *AI Analysis*\n`;
        responseMessage += `Quality Score: ${aiAnalysis.quality_score}/100\n`;
        responseMessage += `Completeness: ${aiAnalysis.completeness}/100\n`;
        if (aiAnalysis.sentiment) {
          responseMessage += `Sentiment: ${aiAnalysis.sentiment}\n`;
        }
      }

      responseMessage += `\nYour report has been saved and indexed for search.\n\n` +
        `Use /myreports to view all your reports.`;

      await this.bot.sendMessage(chatId, responseMessage, { parse_mode: 'Markdown' });

      // Clear state and history
      this.states.delete(userId);
      this.conversationHistory.delete(userId);

    } catch (error) {
      console.error('Error completing report submission:', error);
      await this.bot.sendMessage(
        chatId,
        ' Error submitting report. Please try again or contact support.'
      );
    }
  }

  async completeRegistration(userId, chatId, data) {
    try {
      await this.bot.sendMessage(chatId, ' Processing your registration...');

      // Save to database
      const result = await pool.query(
        `INSERT INTO contractors (
          user_id, company_name, license_number, gst, category,
          experience_years, specializations, certifications,
          document_urls, verification_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id`,
        [
          userId,
          data.company_name,
          data.license_number,
          data.gst,
          data.category,
          data.experience_years,
          data.specializations,
          data.certifications,
          data.document_urls || [],
          'pending_review'
        ]
      );

      const contractorId = result.rows[0].id;

      // Trigger AI analysis
      await this.bot.sendMessage(chatId, ' Running AI analysis on your profile...');
      
      try {
        const analysis = await contractorAnalysisService.analyzeContractor(contractorId);

        await this.bot.sendMessage(
          chatId,
          ` *Registration Complete!*\n\n` +
          `Your profile has been analyzed:\n` +
          `Score: ${analysis.score}/100\n` +
          `Recommendation: ${analysis.analysis.final_recommendation}\n` +
          `Priority: ${analysis.analysis.priority_ranking}\n\n` +
          `Our team will review your application shortly.\n\n` +
          `Use /status to check your registration status anytime.`,
          { parse_mode: 'Markdown' }
        );
      } catch (analysisError) {
        console.error('Analysis error:', analysisError);
        await this.bot.sendMessage(
          chatId,
          ' Registration complete! Your profile will be analyzed shortly.\n\nUse /status to check your status.'
        );
      }

      // Clear state
      this.states.delete(userId);

    } catch (error) {
      console.error('Error completing registration:', error);
      await this.bot.sendMessage(
        chatId,
        ' Error completing registration. Please try again or contact support.'
      );
    }
  }

  async getContractor(userId) {
    // The contractors table uses contractor_id (phone number) to identify contractors
    // userId from Telegram is the phone number
    const result = await pool.query(
      'SELECT * FROM contractors WHERE contractor_id = $1',
      [userId]
    );
    
    return result.rows[0];
  }
}

export default new TelegramContractorBot();
