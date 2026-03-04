import { Telegraf, Markup } from 'telegraf';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import citizenService from './citizen.service.js';
import grievanceDBService from './grievance.db.service.js';
import azureStorageService from './azure.storage.services.js';
import azureQueryAnalystQueueService from './azure.queue.queryanalyst.service.js';
import citizenGrievanceAI from './citizen-grievance-ai.service.js';
import imageValidatorService from './image-validator.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TelegramBotService {
    constructor() {
        this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
        this.userSessions = new Map();
        this.conversationHistory = new Map(); // Store conversation history for AI
        this.setupHandlers();
    }

    setupHandlers() {
        // Start command
        this.bot.start(async (ctx) => {
            const telegramId = ctx.from.id;
            const firstName = ctx.from.first_name || 'User';
            
            try {
                const citizen = await citizenService.getCitizenByTelegramId(telegramId);
                
                if (citizen && citizen.is_registered) {
                    return this.showMainMenu(ctx, citizen);
                }
                
                await ctx.reply(
                    `Welcome ${firstName}!\n\n` +
                    'Grievance Redressal System\n\n' +
                    'I will help you submit and track your grievances to government departments.\n\n' +
                    'How it works:\n' +
                    '1. Register with your phone & location\n' +
                    '2. Submit your grievance with proof\n' +
                    '3. AI analyzes and routes to department\n' +
                    '4. Track progress and get updates\n\n' +
                    'Let\'s get started!'
                );

                await ctx.reply(
                    'Step 1: Registration\n\n' +
                    'To submit grievances, I need your phone number to verify your identity.',
                    Markup.keyboard([
                        [Markup.button.contactRequest('Share Phone Number')],
                        ['Cancel']
                    ]).resize()
                );

                this.userSessions.set(telegramId.toString(), { 
                    step: 'awaiting_phone',
                    started_at: Date.now()
                });

            } catch (error) {
                console.error('Start command error:', error);
                ctx.reply('Something went wrong. Please try /start again.');
            }
        });

        this.bot.on('contact', async (ctx) => {
            await this.handlePhoneNumber(ctx);
        });

        this.bot.on('location', async (ctx) => {
            const userId = ctx.from.id.toString();
            const userSession = this.userSessions.get(userId) || {};
            
            // Check if this is for registration or grievance
            if (userSession.step === 'awaiting_location') {
                await this.handleLocation(ctx);
            } else if (userSession.step === 'awaiting_grievance_location') {
                await this.handleGrievanceLocation(ctx);
            } else if (userSession.step === 'ai_conversation') {
                // Handle location in AI conversation mode
                await this.handleGrievanceLocation(ctx);
            }
        });

        this.bot.on('callback_query', async (ctx) => {
            await this.handleCallbackQuery(ctx);
        });

        this.bot.on('text', async (ctx) => {
            await this.handleTextMessage(ctx);
        });

        this.bot.on(['document', 'photo'], async (ctx) => {
            await this.handleFileUpload(ctx);
        });

        this.bot.catch((err, ctx) => {
            console.error('Bot error:', err);
            ctx.reply('Something went wrong. Please try /start again.');
        });
    }

    async showMainMenu(ctx, citizen) {
        const firstName = ctx.from.first_name || citizen.full_name || 'User';
        
        await ctx.reply(
            `Welcome back, ${firstName}!\n\n` +
            'Grievance Redressal System\n\n' +
            'Just chat with me naturally to:\n' +
            '• Report any issue or problem\n' +
            '• Check status of your grievances\n' +
            '• Get help and information\n\n' +
            'Or use the buttons below:',
            Markup.keyboard([
                ['Notifications', 'My Profile'],
                ['Logout']
            ]).resize()
        );
    }

    async handlePhoneNumber(ctx) {
        const telegramId = ctx.from.id.toString();
        const session = this.userSessions.get(telegramId) || {};
        
        if (session.step !== 'awaiting_phone') {
            return;
        }

        const phone = ctx.message.contact.phone_number;
        const username = ctx.from.username;
        const fullName = `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim();

        session.phone = phone;
        session.username = username;
        session.full_name = fullName;
        session.step = 'awaiting_location';
        this.userSessions.set(telegramId, session);

        await ctx.reply(
            `Phone verified: ${phone}\n\n` +
            'Step 2: Location Permission\n\n' +
            'Share your location so we can route your grievances to the correct local authorities and departments.',
            Markup.keyboard([
                [Markup.button.locationRequest('Share My Location')],
                ['Cancel']
            ]).resize()
        );
    }

    async handleLocation(ctx) {
        const telegramId = ctx.from.id.toString();
        const session = this.userSessions.get(telegramId) || {};
        
        if (session.step !== 'awaiting_location') {
            return;
        }

        const latitude = ctx.message.location.latitude;
        const longitude = ctx.message.location.longitude;

        await ctx.reply('Completing registration...', Markup.removeKeyboard());

        try {
            await citizenService.registerCitizen({
                telegram_id: parseInt(telegramId),
                phone: session.phone,
                username: session.username,
                full_name: session.full_name,
                latitude: latitude,
                longitude: longitude,
                location_address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
            });

            this.userSessions.delete(telegramId);

            await ctx.reply(
                'Registration Successful!\n\n' +
                'Your account is now active\n\n' +
                `Name: ${session.full_name}\n` +
                `Phone: ${session.phone}\n` +
                `Location: Saved\n\n` +
                'You can now submit grievances!'
            );

            const citizen = await citizenService.getCitizenByTelegramId(parseInt(telegramId));
            await this.showMainMenu(ctx, citizen);

        } catch (error) {
            console.error('Registration error:', error);
            ctx.reply(
                'Registration failed. Please try again with /start',
                Markup.removeKeyboard()
            );
        }
    }

    async handleCallbackQuery(ctx) {
        const action = ctx.callbackQuery.data;

        try {
            if (action === 'submit_grievance') {
                await this.startGrievanceSubmission(ctx);
            } else if (action === 'my_grievances') {
                await this.showGrievanceStatus(ctx);
            } else if (action === 'my_profile') {
                await this.showProfile(ctx);
            }

            await ctx.answerCbQuery();
        } catch (error) {
            console.error('Callback query error:', error);
            await ctx.answerCbQuery('Error occurred');
        }
    }

    async handleTextMessage(ctx) {
        const userId = ctx.from.id.toString();
        const text = ctx.message.text;
        const userSession = this.userSessions.get(userId) || {};

        if (text === 'Cancel') {
            this.userSessions.delete(userId);
            this.conversationHistory.delete(userId);
            const citizen = await citizenService.getCitizenByTelegramId(parseInt(userId));
            if (citizen) {
                return this.showMainMenu(ctx, citizen);
            } else {
                return ctx.reply('Cancelled. Use /start to begin again.', Markup.removeKeyboard());
            }
        }

        // Keep only essential button handlers
        if (text === 'Notifications') {
            return ctx.reply(
                'Notifications\n\n' +
                'You will receive automatic notifications when:\n' +
                '• Your grievance is analyzed\n' +
                '• Department is assigned\n' +
                '• Officer is assigned\n' +
                '• Status changes\n' +
                '• Resolution is provided\n\n' +
                'All updates will be sent here automatically!'
            );
        }
        
        if (text === 'My Profile') {
            return await this.showProfile(ctx);
        }

        if (text === 'Logout') {
            return await this.handleLogout(ctx);
        }

        if (text === 'Confirm Logout') {
            const session = this.userSessions.get(userId);
            if (session && session.step === 'confirming_logout') {
                return await this.confirmLogout(ctx);
            }
        }

        // Handle skip photo option
        if (text === 'Skip Photo (Not Recommended)' && userSession.step === 'ai_conversation') {
            if (userSession.extracted_data && userSession.extracted_data.has_sufficient_data && userSession.has_location) {
                await ctx.reply(
                    'WARNING: Submitting without proof may delay processing.\n\n' +
                    'Proceeding with submission...'
                );
                
                // Mark as no proof and finalize
                userSession.has_proof = true;
                userSession.image_path = null;
                userSession.image_description = 'No proof provided';
                userSession.awaiting_proof = false; // Clear awaiting flag
                this.userSessions.set(userId, userSession);
                
                return await this.finalizeAIGrievanceSubmission(ctx, userSession);
            } else {
                return ctx.reply('Please provide more details about your issue first.');
            }
        }

        // AI-powered conversation handling
        if (userSession.step === 'ai_conversation') {
            return await this.handleAIConversation(ctx, text);
        }

        // Legacy hardcoded flow (kept as fallback)
        if (userSession.step === 'awaiting_grievance_text') {
            userSession.grievance_text = text;
            userSession.step = 'awaiting_proof';
            this.userSessions.set(userId, userSession);

            return ctx.reply(
                'Grievance Description Received\n\n' +
                `Your complaint:\n"${text.substring(0, 200)}${text.length > 200 ? '...' : ''}"\n\n` +
                'Step 2: Upload Proof\n\n' +
                'Please upload supporting document:\n' +
                '- Photo of the issue\n' +
                '- PDF document\n' +
                '- Any relevant proof\n\n' +
                'This is mandatory for processing.',
                Markup.keyboard([
                    ['Cancel']
                ]).resize()
            );
        }

        // Check if user is registered
        const citizen = await citizenService.getCitizenByTelegramId(parseInt(userId));
        if (!citizen) {
            return ctx.reply(
                'Please use /start to register first.',
                Markup.removeKeyboard()
            );
        }

        // AI-powered smart detection: Check if message looks like a grievance or greeting
        const lowerText = text.toLowerCase();
        const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'namaste'];
        const grievanceKeywords = [
            'problem', 'issue', 'complaint', 'pothole', 'water', 'garbage', 'electricity', 
            'road', 'drainage', 'broken', 'not working', 'damaged', 'dirty', 'leak',
            'supply', 'cut', 'no', 'street', 'light', 'help', 'fix', 'repair'
        ];
        const statusKeywords = ['status', 'check', 'my grievance', 'track', 'where', 'progress', 'update'];
        const helpKeywords = ['help', 'how', 'what', 'guide', 'info', 'information'];

        const isGreeting = greetings.some(greeting => lowerText.includes(greeting));
        const looksLikeGrievance = grievanceKeywords.some(keyword => lowerText.includes(keyword));
        const wantsStatus = statusKeywords.some(keyword => lowerText.includes(keyword));
        const needsHelp = helpKeywords.some(keyword => lowerText.includes(keyword)) && !looksLikeGrievance;

        // If asking for status/grievances
        if (wantsStatus) {
            return await this.showGrievanceStatus(ctx);
        }

        // If asking for help
        if (needsHelp) {
            return await ctx.reply(
                'Help & Information\n\n' +
                'I\'m your AI assistant for grievance redressal!\n\n' +
                'What I can do:\n\n' +
                'Submit Grievances:\n' +
                '   Just tell me about any problem - potholes, water issues, garbage, electricity, roads, etc.\n\n' +
                'Check Status:\n' +
                '   Ask "show my grievances" or "check status"\n\n' +
                'Profile:\n' +
                '   Click "My Profile" button\n\n' +
                'Notifications:\n' +
                '   You\'ll get automatic updates here\n\n' +
                'Examples:\n' +
                '• "There\'s a pothole on Main Street"\n' +
                '• "Water supply cut for 3 days"\n' +
                '• "Garbage not collected"\n' +
                '• "Show my grievances"\n\n' +
                'Just chat naturally - I understand!'
            );
        }

        // If it's a greeting, respond conversationally
        if (isGreeting && !looksLikeGrievance) {
            const greetingResponses = [
                `Hello ${citizen.full_name || 'there'}!\n\nHow can I help you today?\n\nJust tell me about any issue you're facing, or:\n• Ask "show my grievances" to check status\n• Click buttons below for profile/notifications`,
                `Hi ${citizen.full_name || 'there'}!\n\nWelcome back!\n\nYou can:\n• Report any problem by just describing it\n• Ask "check my grievances" for status\n• Use buttons below for other options`,
                `Hey ${citizen.full_name || 'there'}!\n\nGood to see you!\n\nI'm here to help:\n• Describe any issue to report it\n• Ask about your grievance status\n• Access profile and notifications below`
            ];
            const randomGreeting = greetingResponses[Math.floor(Math.random() * greetingResponses.length)];
            
            return await ctx.reply(randomGreeting);
        }

        // If message looks like a grievance, start AI conversation automatically
        if (looksLikeGrievance) {
            await ctx.reply(
                'I noticed you\'re reporting an issue. Let me help you with that!'
            );
            
            // Initialize AI conversation session
            this.userSessions.set(userId, {
                step: 'ai_conversation',
                citizen_id: citizen.id,
                has_location: false,
                has_proof: false,
                location_requested: false, // Track if we already asked for location
                proof_requested: false,    // Track if we already asked for proof
                extracted_data: null
            });

            // Initialize conversation history with user's message
            this.conversationHistory.set(userId, []);

            // Process the message as first grievance input
            return await this.handleAIConversation(ctx, text);
        }

        // For other messages, respond conversationally
        await ctx.reply(
            'I\'m not sure what you mean.\n\n' +
            'You can:\n' +
            '• Describe any problem to report it\n' +
            '• Ask "show my grievances" to check status\n' +
            '• Ask "help" for more information\n' +
            '• Use buttons below for profile/notifications'
        );
    }

    async handleGrievanceLocation(ctx) {
        const userId = ctx.from.id.toString();
        const userSession = this.userSessions.get(userId);

        if (!userSession) {
            return;
        }

        const latitude = ctx.message.location.latitude;
        const longitude = ctx.message.location.longitude;

        // Store location in session with source tracking
        userSession.grievance_latitude = latitude;
        userSession.grievance_longitude = longitude;
        userSession.grievance_location = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        userSession.location_source = 'telegram_share'; // Track that this came from Telegram share
        userSession.has_location = true;

        // Try to get address from coordinates (reverse geocoding would go here)
        // For now, store coordinates as address context
        userSession.extracted_location_context = `Location shared via Telegram: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

        console.log('[Telegram] Location extracted from Telegram share:', {
            latitude,
            longitude,
            source: 'telegram_share'
        });

        // Check if in AI conversation mode
        if (userSession.step === 'ai_conversation') {
            // Ask for proof ONCE after location is received (only if not already asked)
            if (!userSession.proof_requested) {
                userSession.proof_requested = true; // Mark as requested
                this.userSessions.set(userId, userSession);
                
                await ctx.reply(
                    '✅ Location Received!\n\n' +
                    `Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\n\n` +
                    'Final Step: Please upload a photo or document showing the issue.\n\n' +
                    'This helps us verify and process your grievance faster.',
                    Markup.keyboard([
                        ['Skip Photo (Not Recommended)'],
                        ['Cancel']
                    ]).resize()
                );
            }
            return;
        }

        // Legacy flow
        if (userSession.step === 'awaiting_grievance_location') {
            userSession.step = 'awaiting_grievance_text';
            this.userSessions.set(userId, userSession);

            await ctx.reply(
                'Location Received!\n\n' +
                `Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\n\n` +
                'Step 2: Describe Your Issue\n\n' +
                'Please type your complaint in detail:\n\n' +
                '- What is the problem?\n' +
                '- When did it start?\n' +
                '- Any other relevant details\n\n' +
                'Be specific for faster resolution.',
                Markup.keyboard([
                    ['Cancel']
                ]).resize()
            );
        }
    }

    async startGrievanceSubmission(ctx) {
        const telegramId = ctx.from.id;
        
        try {
            const citizen = await citizenService.getCitizenByTelegramId(telegramId);
            
            if (!citizen || !citizen.is_registered) {
                return ctx.reply(
                    'Registration Required\n\n' +
                    'Please register first using /start'
                );
            }

            // Initialize AI-powered conversation session
            this.userSessions.set(telegramId.toString(), {
                step: 'ai_conversation',
                citizen_id: citizen.id,
                has_location: false,
                has_proof: false,
                location_requested: false, // Track if we already asked for location
                proof_requested: false,    // Track if we already asked for proof
                extracted_data: null
            });

            // Initialize conversation history
            this.conversationHistory.set(telegramId.toString(), []);

            await ctx.reply(
                'AI-Powered Grievance Submission\n\n' +
                'I\'m here to help you submit your grievance. Just tell me about the issue you\'re facing in your own words.\n\n' +
                'For example:\n' +
                '• "There\'s a big pothole on MG Road"\n' +
                '• "No water supply for 3 days in Sector 5"\n' +
                '• "Garbage not collected for a week"\n\n' +
                'Go ahead, describe your problem:',
                Markup.keyboard([
                    ['Cancel']
                ]).resize()
            );
        } catch (error) {
            console.error('Start submission error:', error);
            ctx.reply('Something went wrong. Please try again.');
        }
    }

    async showGrievanceStatus(ctx) {
        const telegramId = ctx.from.id;
        
        try {
            await ctx.reply('Fetching your grievances...');
            
            const result = await citizenService.getCitizenGrievances(telegramId);
            
            if (result.count === 0) {
                return ctx.reply(
                    'My Grievances\n\n' +
                    'You have no grievances submitted yet.\n\n' +
                    'Use "Submit New Grievance" to submit one.'
                );
            }

            let message = `Your Grievances (${result.count})\n\n`;
            
            result.data.forEach((g, index) => {
                const statusText = g.status?.toUpperCase() || 'PENDING';
                message += `${index + 1}. [${statusText}]\n`;
                message += `   ${(g.grievance_text || 'Processing...').substring(0, 60)}...\n`;
                message += `   Date: ${new Date(g.created_at).toLocaleDateString()}\n`;
                if (g.department_name) {
                    message += `   Department: ${g.department_name}\n`;
                }
                message += `\n`;
            });

            message += '\nUpdates will be sent here automatically.';

            ctx.reply(message);
        } catch (error) {
            console.error('Status check error:', error);
            ctx.reply('Failed to fetch grievances. Please try again.');
        }
    }

    async showProfile(ctx) {
        const telegramId = ctx.from.id;
        
        try {
            const citizen = await citizenService.getCitizenByTelegramId(telegramId);
            
            if (!citizen) {
                return ctx.reply('Profile not found. Please register with /start');
            }

            const message = 
                'My Profile\n\n' +
                `Name: ${citizen.full_name || 'Not set'}\n` +
                `Phone: ${citizen.phone}\n` +
                `Username: @${citizen.username || 'Not set'}\n` +
                `Location: ${citizen.location_address || 'Not set'}\n` +
                `Registered: ${new Date(citizen.created_at).toLocaleDateString()}\n` +
                `Status: ${citizen.is_active ? 'Active' : 'Inactive'}`;

            ctx.reply(message);
        } catch (error) {
            console.error('Profile error:', error);
            ctx.reply('Failed to load profile.');
        }
    }

    async showHelp(ctx) {
        const message =
            'Help & Information\n\n' +
            'Available Options:\n\n' +
            'Submit New Grievance\n' +
            '   Submit a new complaint with proof\n\n' +
            'My Grievances\n' +
            '   View all your submitted grievances\n\n' +
            'My Profile\n' +
            '   View your registration details\n\n' +
            'Notifications\n' +
            '   You will receive updates automatically\n\n' +
            'Logout\n' +
            '   Unregister from the bot\n\n' +
            'Status Meanings:\n' +
            'PENDING - Awaiting AI analysis\n' +
            'IN_PROGRESS - Assigned to department\n' +
            'RESOLVED - Issue fixed\n' +
            'REJECTED - Invalid complaint\n' +
            'ESCALATED - Sent to higher authority\n\n' +
            'Need more help?\n' +
            'Contact support or use /start to restart.';

        ctx.reply(message);
    }

    async handleLogout(ctx) {
        const telegramId = ctx.from.id;
        
        await ctx.reply(
            'Logout Confirmation\n\n' +
            'Are you sure you want to logout?\n\n' +
            'This will:\n' +
            '- Remove your registration\n' +
            '- Clear your session\n' +
            '- Stop notifications\n\n' +
            'Your grievances will remain in the system.',
            Markup.keyboard([
                ['Confirm Logout'],
                ['Cancel']
            ]).resize()
        );

        this.userSessions.set(telegramId.toString(), {
            step: 'confirming_logout'
        });
    }

    async confirmLogout(ctx) {
        const telegramId = ctx.from.id;
        
        try {
            await citizenService.deactivateCitizen(telegramId);
            this.userSessions.delete(telegramId.toString());
            
            await ctx.reply(
                'Logged Out Successfully\n\n' +
                'Your account has been deactivated.\n\n' +
                'To use the service again, use /start to register.',
                Markup.removeKeyboard()
            );
        } catch (error) {
            console.error('Logout error:', error);
            ctx.reply('Logout failed. Please try again.');
        }
    }

    async notifyQueryAnalyzed(telegramId, grievanceId, analysisResult) {
        try {
            // Check if grievance was rejected due to validation failure
            const isRejected = analysisResult.validation_status === 'rejected' || 
                             analysisResult.validation_status === 'invalid' ||
                             analysisResult.status === 'rejected';
            
            if (isRejected) {
                // Send rejection notification
                const message = 
                    'REJECTED: Grievance Rejected\n\n' +
                    `Grievance ID: ${grievanceId}\n\n` +
                    `Reason: ${analysisResult.validation_reasoning || 'The submitted grievance did not meet validation requirements.'}\n\n` +
                    'Common reasons for rejection:\n' +
                    '• Insufficient or unclear proof\n' +
                    '• Incomplete information\n' +
                    '• Spam or duplicate submission\n' +
                    '• Invalid grievance type\n\n' +
                    'You can submit a new grievance with complete details and proper proof.';

                await this.bot.telegram.sendMessage(telegramId, message);
                console.log(`Grievance rejection notification sent to user ${telegramId}`);
            } else {
                // Send success notification - simplified
                const message = 
                    'SUCCESS: Analysis Complete!\n\n' +
                    `Grievance ID: ${grievanceId}\n\n` +
                    'Your query has been analyzed and assigned to the appropriate department.\n\n' +
                    'You will receive updates as your grievance progresses.';

                await this.bot.telegram.sendMessage(telegramId, message);
                console.log(`Query analysis notification sent to user ${telegramId}`);
            }
        } catch (error) {
            console.error(`Failed to send query analysis notification to user ${telegramId}:`, error);
        }
    }

    /**
     * Handle AI-powered conversation for grievance submission
     */
    async handleAIConversation(ctx, userMessage) {
        const userId = ctx.from.id.toString();
        const userSession = this.userSessions.get(userId);

        if (!userSession || userSession.step !== 'ai_conversation') {
            return;
        }

        try {
            // Get conversation history
            let history = this.conversationHistory.get(userId) || [];
            
            // Add user message to history
            history.push({ role: 'user', message: userMessage });

            // Show typing indicator
            await ctx.sendChatAction('typing');

            // Get AI response
            const userContext = {
                has_location: userSession.has_location,
                has_proof: userSession.has_proof
            };

            const aiResponse = await citizenGrievanceAI.generateCitizenResponse(
                userMessage, 
                history,
                userContext
            );

            // Add AI response to history
            history.push({ role: 'assistant', message: aiResponse });
            this.conversationHistory.set(userId, history);

            // Send AI response
            await ctx.reply(aiResponse);

            // Extract grievance data from conversation
            const extractedData = await citizenGrievanceAI.extractGrievanceData(history);
            
            console.log('[TelegramBot] Extracted data:', extractedData);

            // Update session with extracted data
            userSession.extracted_data = extractedData;
            
            // Check missing data to avoid repetitive questions
            const missingData = {
                has_location: userSession.has_location,
                has_extracted_data: !!extractedData.has_sufficient_data,
                has_sufficient_data: extractedData.has_sufficient_data
            };
            console.log('[Telegram] Missing data:', missingData);

            // FLOW: Only ask for next step if we have sufficient data
            // Step 1: Get grievance details (done through conversation)
            // Step 2: Get location (ask ONCE)
            // Step 3: Get proof (ask ONCE after location)
            // Step 4: Submit
            
            if (extractedData.has_sufficient_data) {
                // We have enough grievance details, now check location and proof
                
                // Ask for location ONCE if not provided and not already asked
                if (!userSession.has_location && !userSession.location_requested) {
                    userSession.location_requested = true; // Mark as requested
                    this.userSessions.set(userId, userSession);
                    
                    await ctx.reply(
                        'Thank you for the details!\n\n' +
                        'Now I need the exact location of the issue.\n\n' +
                        'Please share your location using the button below:',
                        Markup.keyboard([
                            [Markup.button.locationRequest('📍 Share Location')],
                            ['Cancel']
                        ]).resize()
                    );
                    return; // Stop here, wait for location
                }
                
                // If location is provided but proof is not, it will be asked in handleGrievanceLocation
                // Don't ask for anything else here to avoid repetition
            }
            
            this.userSessions.set(userId, userSession);

        } catch (error) {
            console.error('[TelegramBot] AI conversation error:', error);
            await ctx.reply(
                'Sorry, I encountered an error. Can you please rephrase your message?'
            );
        }
    }

    async handleFileUpload(ctx) {
        const userId = ctx.from.id.toString();
        const userSession = this.userSessions.get(userId);

        if (!userSession) {
            return ctx.reply(
                'Please start by submitting a grievance first.\n\n' +
                'Use "Submit New Grievance" button.'
            );
        }

        // Check if in AI conversation mode
        const isAIMode = userSession.step === 'ai_conversation';
        const isLegacyMode = userSession.step === 'awaiting_proof';

        if (!isAIMode && !isLegacyMode) {
            return ctx.reply(
                'Please start by submitting a grievance first.\n\n' +
                'Use "Submit New Grievance" button.'
            );
        }

        try {
            await ctx.reply('Processing your document...\n\nPlease wait...');

            let fileId, fileName;
            
            if (ctx.message.document) {
                fileId = ctx.message.document.file_id;
                fileName = ctx.message.document.file_name || 'document';
                
                const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
                const fileExt = path.extname(fileName).toLowerCase();
                if (!allowedTypes.includes(fileExt)) {
                    return ctx.reply('Only PDF, JPG, JPEG, and PNG files are allowed.');
                }
            } else if (ctx.message.photo) {
                const photos = ctx.message.photo;
                fileId = photos[photos.length - 1].file_id;
                fileName = `photo_${Date.now()}.jpg`;
            }

            const fileUrl = await ctx.telegram.getFileLink(fileId);
            const response = await axios({
                method: 'GET',
                url: fileUrl.href,
                responseType: 'stream'
            });

            const tempDir = './temp';
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const tempFilePath = path.join(tempDir, `temp_${userId}_${Date.now()}_${fileName}`);
            const writer = fs.createWriteStream(tempFilePath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            console.log('[Telegram] File downloaded to temp:', tempFilePath);

            await ctx.reply('Uploading to cloud storage...');

            // Upload to Azure Blob Storage
            const blobFileName = `grievances/${Date.now()}_${userId}_${fileName}`;
            let azureResult;
            
            try {
                azureResult = await azureStorageService.uploadFile(tempFilePath, blobFileName);
                console.log('[Telegram] File uploaded to Azure:', azureResult.url);
            } catch (uploadError) {
                console.error('[Telegram] Azure upload failed:', uploadError);
                if (fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                }
                return ctx.reply(
                    'ERROR: Upload Failed\n\n' +
                    'Failed to upload your document to cloud storage.\n\n' +
                    'Error: ' + uploadError.message + '\n\n' +
                    'Please try again or contact support if the issue persists.'
                );
            }

            // Mark proof as uploaded
            userSession.has_proof = true;
            userSession.image_path = azureResult.url;
            userSession.image_description = fileName;

            // AI Mode: VALIDATE the proof using actual image analysis
            if (isAIMode && userSession.extracted_data) {
                await ctx.reply('Validating your proof with AI...');

                try {
                    // Get the grievance text for validation
                    const grievanceText = userSession.extracted_data.grievance_text || '';
                    
                    // REAL IMAGE VALIDATION using Puter AI
                    const validationResult = await imageValidatorService.validateImageQueryMatch(
                        tempFilePath,  // Use local file for validation
                        grievanceText
                    );

                    console.log('[Telegram] Image Validation Result:', validationResult);

                    // Extract location from image if available
                    if (validationResult.location_info) {
                        const imgLocation = validationResult.location_info;
                        
                        // If no location from Telegram share, use image location
                        if (!userSession.has_location && imgLocation.latitude && imgLocation.longitude) {
                            userSession.grievance_latitude = imgLocation.latitude;
                            userSession.grievance_longitude = imgLocation.longitude;
                            userSession.grievance_location = imgLocation.address || `${imgLocation.latitude.toFixed(6)}, ${imgLocation.longitude.toFixed(6)}`;
                            userSession.location_source = 'image_analysis';
                            userSession.has_location = true;
                            userSession.extracted_location_context = `Location extracted from image: ${imgLocation.description || imgLocation.address || 'coordinates detected'}`;
                            
                            console.log('[Telegram] Location extracted from image:', {
                                latitude: imgLocation.latitude,
                                longitude: imgLocation.longitude,
                                source: 'image_analysis'
                            });
                            
                            await ctx.reply(
                                `📍 Location detected from image:\n${imgLocation.address || imgLocation.description || 'Coordinates extracted'}`
                            );
                        } else if (userSession.has_location && imgLocation.latitude && imgLocation.longitude) {
                            // We have both - store image location as additional context
                            userSession.image_location = {
                                latitude: imgLocation.latitude,
                                longitude: imgLocation.longitude,
                                address: imgLocation.address,
                                description: imgLocation.description
                            };
                            userSession.extracted_location_context += `\nImage location: ${imgLocation.description || imgLocation.address || 'coordinates detected'}`;
                            
                            console.log('[Telegram] Additional location from image stored');
                        }
                    }

                    // Check if validation passed
                    if (!validationResult.is_valid || validationResult.validation_score < 0.5) {
                        // REJECT: Image doesn't match the complaint
                        await ctx.reply(
                            'ERROR: Proof Validation Failed\n\n' +
                            `Reason: ${validationResult.reasoning}\n\n` +
                            `What the image shows:\n${validationResult.image_shows}\n\n` +
                            'Your proof does not match your complaint. Please upload correct evidence or describe your issue more accurately.',
                            Markup.removeKeyboard()
                        );

                        // Clean up uploaded file
                        if (fs.existsSync(tempFilePath)) {
                            fs.unlinkSync(tempFilePath);
                        }

                        // Reset session to allow re-submission
                        userSession.has_proof = false;
                        userSession.image_path = null;
                        userSession.awaiting_proof = true; // Keep awaiting since they need to upload again
                        this.userSessions.set(userId, userSession);

                        return;
                    }

                    // VALID: Proof matches complaint
                    let feedbackMsg = 'SUCCESS: Proof Validated!\n\n';
                    feedbackMsg += `Validation Score: ${(validationResult.validation_score * 100).toFixed(0)}%\n`;
                    feedbackMsg += `Confidence: ${validationResult.confidence}\n\n`;
                    feedbackMsg += `Image shows: ${validationResult.image_shows}`;

                    await ctx.reply(feedbackMsg);

                    // Store validation result in session
                    userSession.proof_validation = validationResult;

                } catch (validationError) {
                    console.error('[Telegram] Validation error:', validationError);
                    
                    // REJECT on validation errors - don't proceed without proof verification
                    await ctx.reply(
                        'ERROR: Proof Validation System Error\n\n' +
                        'Unable to verify your proof due to a technical issue. ' +
                        'Please try uploading your image again.\n\n' +
                        'If the problem persists, please contact support.',
                        Markup.removeKeyboard()
                    );
                    
                    // Clean up and reset session
                    if (fs.existsSync(tempFilePath)) {
                        fs.unlinkSync(tempFilePath);
                    }
                    userSession.has_proof = false;
                    userSession.image_path = null;
                    userSession.awaiting_proof = true; // Keep awaiting since they need to upload again
                    this.userSessions.set(userId, userSession);
                    
                    return; // Stop submission
                }

                // Check if we have everything needed
                if (userSession.has_location && userSession.extracted_data && userSession.extracted_data.has_sufficient_data) {
                    // Ready to submit - clear awaiting_proof flag
                    userSession.awaiting_proof = false;
                    this.userSessions.set(userId, userSession);
                    
                    await ctx.reply(
                        '✅ All information collected!\n\n' +
                        'Submitting your grievance now...'
                    );
                    
                    await this.finalizeAIGrievanceSubmission(ctx, userSession);
                } else {
                    // Debug: Show what's missing
                    console.log('[Telegram] Missing data:', {
                        has_location: userSession.has_location,
                        has_extracted_data: !!userSession.extracted_data,
                        has_sufficient_data: userSession.extracted_data?.has_sufficient_data
                    });
                    
                    if (!userSession.has_location) {
                        // Only ask for location if we're not already waiting for proof
                        await ctx.reply(
                            'Great! Now I need the location where this issue is occurring.\n\n' +
                            'Please share the coordinates/location from Telegram by clicking the button below:',
                            Markup.keyboard([
                                [Markup.button.locationRequest('Share Location')],
                                ['Cancel']
                            ]).resize()
                        );
                        userSession.awaiting_proof = false;
                    } else {
                        await ctx.reply(
                            'Please provide more details about your issue so I can submit your grievance.'
                        );
                    }
                }

                this.userSessions.set(userId, userSession);
                
                // Clean up temp file
                if (fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                }
                return;
            }

            // Legacy Mode: Direct submission
            await ctx.reply(' Saving to database...');

            const grievanceText = userSession.grievance_text || 'Grievance submitted via Telegram';

            const grievanceResult = await grievanceDBService.submitGrievance({
                citizen_id: userSession.citizen_id,
                grievance_text: grievanceText,
                image_path: azureResult.url,
                image_description: fileName,
                latitude: userSession.grievance_latitude || null,
                longitude: userSession.grievance_longitude || null,
                location_address: userSession.grievance_location || null
            });

            console.log('[Telegram] Grievance saved to DB:', {
                grievance_id: grievanceResult.grievance_id,
                citizen_id: userSession.citizen_id,
                has_location: !!(userSession.grievance_latitude && userSession.grievance_longitude)
            });

            await ctx.reply('Pushing to AI analysis queue...');

            // Append location coordinates to grievance text if available
            let enrichedGrievanceText = grievanceText;
            if (userSession.grievance_latitude && userSession.grievance_longitude) {
                enrichedGrievanceText += `\n\n[Location: Latitude ${userSession.grievance_latitude}, Longitude ${userSession.grievance_longitude}]`;
            }

            const queueMessage = {
                grievance_id: grievanceResult.grievance_id,
                citizen_id: userSession.citizen_id,
                telegram_id: parseInt(userId),
                grievance_text: enrichedGrievanceText,
                image_path: azureResult.url,
                latitude: userSession.grievance_latitude || null,
                longitude: userSession.grievance_longitude || null,
                location_address: userSession.grievance_location || null,
                timestamp: new Date().toISOString(),
                source: 'telegram'
            };

            console.log('[Telegram] Attempting to send message to queue:', {
                grievance_id: queueMessage.grievance_id,
                citizen_id: queueMessage.citizen_id,
                telegram_id: queueMessage.telegram_id
            });

            try {
                const queueResponse = await azureQueryAnalystQueueService.sendMessage(queueMessage);
                console.log('[Telegram] Message successfully enqueued:', {
                    messageId: queueResponse.messageId,
                    insertionTime: queueResponse.insertionTime
                });
            } catch (queueError) {
                console.error('[Telegram] Queue submission failed:', {
                    error: queueError.message,
                    stack: queueError.stack,
                    grievance_id: grievanceResult.grievance_id
                });
                await ctx.reply(
                    'WARNING: Grievance saved but AI analysis queue failed.\n\n' +
                    `Submission ID: ${grievanceResult.grievance_id}\n\n` +
                    'Your grievance is saved and will be processed manually.\n' +
                    'You will receive updates soon.'
                );
                throw queueError;
            }

            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }

            this.userSessions.delete(userId);
            this.conversationHistory.delete(userId);

            await ctx.reply(
                'SUCCESS: Grievance Submitted Successfully!\n\n' +
                `Submission ID: ${grievanceResult.grievance_id}\n\n` +
                'Your query is being analyzed by AI agents.\n\n' +
                'You will receive updates here automatically.\n\n' +
                'Use "My Grievances" to check status anytime.'
            );

            const citizen = await citizenService.getCitizenByTelegramId(parseInt(userId));
            await this.showMainMenu(ctx, citizen);

        } catch (error) {
            console.error('File upload error:', error);
            ctx.reply(
                'ERROR: Upload Failed\n\n' +
                'Failed to process your document. Please try again.\n\n' +
                'Make sure:\n' +
                '- File is under 10MB\n' +
                '- Format is PDF, JPG, or PNG'
            );
        }
    }

    /**
     * Finalize AI-powered grievance submission
     */
    async finalizeAIGrievanceSubmission(ctx, userSession) {
        const userId = ctx.from.id.toString();

        try {
            // Generate summary
            const summary = citizenGrievanceAI.generateSubmissionSummary(
                userSession.extracted_data,
                userSession.has_location,
                userSession.has_proof
            );

            await ctx.reply(summary);
            await ctx.reply(' Submitting your grievance...');

            // Prepare grievance text from AI extraction
            let grievanceText = userSession.extracted_data.grievance_text || 
                                  'Grievance submitted via AI-powered Telegram bot';
            
            // Append location coordinates to grievance text if available
            if (userSession.grievance_latitude && userSession.grievance_longitude) {
                grievanceText += `\n\n[Location: Latitude ${userSession.grievance_latitude}, Longitude ${userSession.grievance_longitude}]`;
            }

            // Submit to database
            const grievanceResult = await grievanceDBService.submitGrievance({
                citizen_id: userSession.citizen_id,
                grievance_text: grievanceText,
                image_path: userSession.image_path,
                image_description: userSession.image_description,
                latitude: userSession.grievance_latitude || null,
                longitude: userSession.grievance_longitude || null,
                location_address: userSession.grievance_location || null
            });

            console.log('[Telegram] AI Grievance saved to DB:', {
                grievance_id: grievanceResult.grievance_id,
                citizen_id: userSession.citizen_id,
                extracted_type: userSession.extracted_data.problem_type
            });

            // Send to queue for analysis
            const queueMessage = {
                grievance_id: grievanceResult.grievance_id,
                citizen_id: userSession.citizen_id,
                telegram_id: parseInt(userId),
                grievance_text: grievanceText,
                image_path: userSession.image_path,
                latitude: userSession.grievance_latitude || null,
                longitude: userSession.grievance_longitude || null,
                location_address: userSession.grievance_location || null,
                location_source: userSession.location_source || null, // 'telegram_share' or 'image_analysis'
                extracted_location_context: userSession.extracted_location_context || null,
                image_location: userSession.image_location || null, // Additional location from image if available
                ai_extracted_data: userSession.extracted_data,
                proof_validation: userSession.proof_validation || null, // Real validation result
                timestamp: new Date().toISOString(),
                source: 'telegram_ai'
            };

            const queueResponse = await azureQueryAnalystQueueService.sendMessage(queueMessage);
            console.log('[Telegram] AI Grievance enqueued:', queueResponse.messageId);

            // Clean up session
            this.userSessions.delete(userId);
            this.conversationHistory.delete(userId);

            await ctx.reply(
                'SUCCESS: Grievance Submitted Successfully!\n\n' +
                `Submission ID: ${grievanceResult.grievance_id}\n\n` +
                'Your query is being analyzed by AI agents.\n\n' +
                'You will receive updates here automatically.\n\n' +
                'Use "My Grievances" to check status anytime.'
            );

            const citizen = await citizenService.getCitizenByTelegramId(parseInt(userId));
            await this.showMainMenu(ctx, citizen);

        } catch (error) {
            console.error('[Telegram] Finalize AI submission error:', error);
            await ctx.reply(
                'ERROR: Submission failed. Please try again or contact support.'
            );
        }
    }

    async init() {
        if (!process.env.TELEGRAM_BOT_TOKEN) {
            console.warn('  Telegram bot token not provided. Bot will not start.');
            this.initialized = false;
            return Promise.resolve();
        }

        try {
            // Launch with dropPendingUpdates to avoid conflicts
            await this.bot.launch({
                dropPendingUpdates: true
            });
            this.initialized = true;
            console.log('Telegram bot started successfully');
            
            // Graceful shutdown
            const stopBot = () => {
                console.log('Stopping Telegram bot...');
                this.bot.stop('SIGTERM');
            };
            
            process.once('SIGINT', stopBot);
            process.once('SIGTERM', stopBot);
            
        } catch (error) {
            console.warn('  Failed to start Telegram bot:', error.message);
            console.warn('  This is usually because another bot instance is running');
            console.warn('  Server will continue without Telegram bot functionality');
            this.initialized = false;
            // Don't throw error, just log warning
            return Promise.resolve();
        }
    }

    isInitialized() {
        return this.initialized || false;
    }

    async notifyUser(userId, message) {
        try {
            await this.bot.telegram.sendMessage(userId, message);
            console.log(`Notification sent to user ${userId}`);
        } catch (error) {
            console.error(`Failed to send notification to user ${userId}:`, error);
        }
    }
}

// Export singleton instance
const telegramBotService = new TelegramBotService();
export default telegramBotService;
