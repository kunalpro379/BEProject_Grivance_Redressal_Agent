const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const citizenService = require('./citizen.service');
const grievanceDBService = require('./grievance.db.service');
const azureStorageService = require('./azure.storage.services');
const azureQueueService = require('./azure.queue.service');

class TelegramBotService {
    constructor() {
        this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
        this.userSessions = new Map();
        this.setupHandlers();
    }

    setupHandlers() {
        // Start command - Welcome message
        this.bot.start(async (ctx) => {
            const telegramId = ctx.from.id;
            const firstName = ctx.from.first_name || 'User';
            
            try {
                const citizen = await citizenService.getCitizenByTelegramId(telegramId);
                
                if (citizen && citizen.is_registered) {
                    // Already registered - show main menu
                    return this.showMainMenu(ctx, citizen);
                }
                
                // New user - show welcome and registration
                await ctx.reply(
                    `🙏 Welcome ${firstName}!\n\n` +
                    '🇮🇳 *Grievance Redressal System*\n\n' +
                    'I will help you submit and track your grievances to government departments.\n\n' +
                    '📋 *How it works:*\n' +
                    '1️⃣ Register with your phone & location\n' +
                    '2️⃣ Submit your grievance with proof\n' +
                    '3️⃣ AI analyzes and routes to department\n' +
                    '4️⃣ Track progress and get updates\n\n' +
                    'Let\'s get started! 👇',
                    { parse_mode: 'Markdown' }
                );

                await ctx.reply(
                    '📝 *Step 1: Registration*\n\n' +
                    'To submit grievances, I need your phone number to verify your identity.',
                    {
                        parse_mode: 'Markdown',
                        ...Markup.keyboard([
                            [Markup.button.contactRequest('📱 Share Phone Number')],
                            ['❌ Cancel']
                        ]).resize()
                    }
                );

                this.userSessions.set(telegramId.toString(), { 
                    step: 'awaiting_phone',
                    started_at: Date.now()
                });

            } catch (error) {
                console.error('Start command error:', error);
                ctx.reply('❌ Something went wrong. Please try /start again.');
            }
        });

        // Handle contact (phone number)
        this.bot.on('contact', async (ctx) => {
            await this.handlePhoneNumber(ctx);
        });

        // Handle location
        this.bot.on('location', async (ctx) => {
            await this.handleLocation(ctx);
        });

        // Handle callback queries (button clicks)
        this.bot.on('callback_query', async (ctx) => {
            await this.handleCallbackQuery(ctx);
        });

        // Text message handler
        this.bot.on('text', async (ctx) => {
            await this.handleTextMessage(ctx);
        });

        // Document/photo handler
        this.bot.on(['document', 'photo'], async (ctx) => {
            await this.handleFileUpload(ctx);
        });

        // Error handler
        this.bot.catch((err, ctx) => {
            console.error('Bot error:', err);
            ctx.reply('❌ Something went wrong. Please try /start again.');
        });
    }

    async showMainMenu(ctx, citizen) {
        const firstName = ctx.from.first_name || citizen.full_name || 'User';
        
        await ctx.reply(
            `👋 Welcome back, ${firstName}!\n\n` +
            '🇮🇳 *Grievance Redressal System*\n\n' +
            'What would you like to do?',
            {
                parse_mode: 'Markdown',
                ...Markup.keyboard([
                    ['📝 Submit New Grievance'],
                    ['📊 My Grievances', '🔔 Notifications'],
                    ['👤 My Profile', '❓ Help']
                ]).resize()
            }
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
            `✅ Phone verified: ${phone}\n\n` +
            '📍 *Step 2: Location Permission*\n\n' +
            'Share your location so we can route your grievances to the correct local authorities and departments.',
            {
                parse_mode: 'Markdown',
                ...Markup.keyboard([
                    [Markup.button.locationRequest('📍 Share My Location')],
                    ['❌ Cancel']
                ]).resize()
            }
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

        await ctx.reply('⏳ Completing registration...', Markup.removeKeyboard());

        try {
            const result = await citizenService.registerCitizen({
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
                '🎉 *Registration Successful!*\n\n' +
                '✅ Your account is now active\n\n' +
                `👤 Name: ${session.full_name}\n` +
                `📱 Phone: ${session.phone}\n` +
                `📍 Location: Saved\n\n` +
                'You can now submit grievances!',
                { parse_mode: 'Markdown' }
            );

            // Fetch citizen and show main menu
            const citizen = await citizenService.getCitizenByTelegramId(parseInt(telegramId));
            await this.showMainMenu(ctx, citizen);

        } catch (error) {
            console.error('Registration error:', error);
            ctx.reply(
                '❌ Registration failed. Please try again with /start',
                Markup.removeKeyboard()
            );
        }
    }

    async handleCallbackQuery(ctx) {
        const action = ctx.callbackQuery.data;
        const telegramId = ctx.from.id;

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
            await ctx.answerCbQuery('❌ Error occurred');
        }
    }

    async handleTextMessage(ctx) {
        const userId = ctx.from.id.toString();
        const text = ctx.message.text;
        const userSession = this.userSessions.get(userId) || {};

        // Handle cancel
        if (text === '❌ Cancel') {
            this.userSessions.delete(userId);
            const citizen = await citizenService.getCitizenByTelegramId(parseInt(userId));
            if (citizen) {
                return this.showMainMenu(ctx, citizen);
            } else {
                return ctx.reply('Cancelled. Use /start to begin again.', Markup.removeKeyboard());
            }
        }

        // Handle menu buttons
        if (text === '📝 Submit New Grievance') {
            return await this.startGrievanceSubmission(ctx);
        }
        
        if (text === '📊 My Grievances') {
            return await this.showGrievanceStatus(ctx);
        }
        
        if (text === '👤 My Profile') {
            return await this.showProfile(ctx);
        }
        
        if (text === '❓ Help') {
            return await this.showHelp(ctx);
        }

        // Handle grievance text input
        if (userSession.step === 'awaiting_grievance_text') {
            userSession.grievance_text = text;
            userSession.step = 'awaiting_proof';
            this.userSessions.set(userId, userSession);

            return ctx.reply(
                '✅ *Grievance Description Received*\n\n' +
                `📝 Your complaint:\n"${text.substring(0, 200)}${text.length > 200 ? '...' : ''}"\n\n` +
                '📎 *Step 2: Upload Proof*\n\n' +
                'Please upload supporting document:\n' +
                '• Photo of the issue\n' +
                '• PDF document\n' +
                '• Any relevant proof\n\n' +
                '⚠️ This is mandatory for processing.',
                {
                    parse_mode: 'Markdown',
                    ...Markup.keyboard([
                        ['❌ Cancel']
                    ]).resize()
                }
            );
        }

        // Default response
        const citizen = await citizenService.getCitizenByTelegramId(parseInt(userId));
        if (citizen) {
            return this.showMainMenu(ctx, citizen);
        } else {
            return ctx.reply(
                'Please use /start to register first.',
                Markup.removeKeyboard()
            );
        }
    }

    async startGrievanceSubmission(ctx) {
        const telegramId = ctx.from.id;
        
        try {
            const citizen = await citizenService.getCitizenByTelegramId(telegramId);
            
            if (!citizen || !citizen.is_registered) {
                return ctx.reply(
                    '❌ *Registration Required*\n\n' +
                    'Please register first using /start',
                    { parse_mode: 'Markdown' }
                );
            }

            this.userSessions.set(telegramId.toString(), {
                step: 'awaiting_grievance_text',
                citizen_id: citizen.id
            });

            await ctx.reply(
                '📝 *Submit New Grievance*\n\n' +
                '*Step 1: Describe Your Issue*\n\n' +
                'Please type your complaint in detail:\n\n' +
                '• What is the problem?\n' +
                '• Where is it located?\n' +
                '• When did it start?\n' +
                '• Any other relevant details\n\n' +
                '💡 Be specific for faster resolution.',
                {
                    parse_mode: 'Markdown',
                    ...Markup.keyboard([
                        ['❌ Cancel']
                    ]).resize()
                }
            );
        } catch (error) {
            console.error('Start submission error:', error);
            ctx.reply('❌ Something went wrong. Please try again.');
        }
    }

    async showGrievanceStatus(ctx) {
        const telegramId = ctx.from.id;
        
        try {
            await ctx.reply('⏳ Fetching your grievances...');
            
            const result = await citizenService.getCitizenGrievances(telegramId);
            
            if (result.count === 0) {
                return ctx.reply(
                    '📊 *My Grievances*\n\n' +
                    'You have no grievances submitted yet.\n\n' +
                    'Use "📝 Submit New Grievance" to submit one.',
                    { parse_mode: 'Markdown' }
                );
            }

            let message = `📊 *Your Grievances* (${result.count})\n\n`;
            
            result.data.forEach((g, index) => {
                const statusEmoji = {
                    'pending': '🟡',
                    'in_progress': '🔵',
                    'resolved': '🟢',
                    'rejected': '🔴',
                    'escalated': '🟠'
                }[g.status] || '⚪';

                message += `${index + 1}. ${statusEmoji} *${g.status?.toUpperCase() || 'PENDING'}*\n`;
                message += `   ${g.grievance_text.substring(0, 60)}...\n`;
                message += `   📅 ${new Date(g.created_at).toLocaleDateString()}\n`;
                if (g.department_name) {
                    message += `   🏛️ ${g.department_name}\n`;
                }
                message += `\n`;
            });

            message += '\n💡 Updates will be sent here automatically.';

            ctx.reply(message, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('Status check error:', error);
            ctx.reply('❌ Failed to fetch grievances. Please try again.');
        }
    }

    async showProfile(ctx) {
        const telegramId = ctx.from.id;
        
        try {
            const citizen = await citizenService.getCitizenByTelegramId(telegramId);
            
            if (!citizen) {
                return ctx.reply('❌ Profile not found. Please register with /start');
            }

            const message = 
                '👤 *My Profile*\n\n' +
                `📛 Name: ${citizen.full_name || 'Not set'}\n` +
                `📱 Phone: ${citizen.phone}\n` +
                `🆔 Username: @${citizen.username || 'Not set'}\n` +
                `📍 Location: ${citizen.location_address || 'Not set'}\n` +
                `📅 Registered: ${new Date(citizen.created_at).toLocaleDateString()}\n` +
                `✅ Status: ${citizen.is_active ? 'Active' : 'Inactive'}`;

            ctx.reply(message, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('Profile error:', error);
            ctx.reply('❌ Failed to load profile.');
        }
    }

    async showHelp(ctx) {
        const message =
            '❓ *Help & Information*\n\n' +
            '*Available Options:*\n\n' +
            '📝 *Submit New Grievance*\n' +
            '   Submit a new complaint with proof\n\n' +
            '📊 *My Grievances*\n' +
            '   View all your submitted grievances\n\n' +
            '👤 *My Profile*\n' +
            '   View your registration details\n\n' +
            '🔔 *Notifications*\n' +
            '   You\'ll receive updates automatically\n\n' +
            '*Status Meanings:*\n' +
            '🟡 Pending - Awaiting AI analysis\n' +
            '🔵 In Progress - Assigned to department\n' +
            '🟢 Resolved - Issue fixed\n' +
            '🔴 Rejected - Invalid complaint\n' +
            '🟠 Escalated - Sent to higher authority\n\n' +
            '*Need more help?*\n' +
            'Contact support or use /start to restart.';

        ctx.reply(message, { parse_mode: 'Markdown' });
    }

    async handleFileUpload(ctx) {
        const userId = ctx.from.id.toString();
        const userSession = this.userSessions.get(userId);

        if (!userSession || userSession.step !== 'awaiting_proof') {
            return ctx.reply(
                '❌ Please start by submitting a grievance first.\n\n' +
                'Use "📝 Submit New Grievance" button.'
            );
        }

        try {
            await ctx.reply('📤 *Processing your document...*\n\nPlease wait...', { parse_mode: 'Markdown' });

            let fileId, fileName;
            
            if (ctx.message.document) {
                fileId = ctx.message.document.file_id;
                fileName = ctx.message.document.file_name || 'document';
                
                const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
                const fileExt = path.extname(fileName).toLowerCase();
                if (!allowedTypes.includes(fileExt)) {
                    return ctx.reply('❌ Only PDF, JPG, JPEG, and PNG files are allowed.');
                }
            } else if (ctx.message.photo) {
                const photos = ctx.message.photo;
                fileId = photos[photos.length - 1].file_id;
                fileName = `photo_${Date.now()}.jpg`;
            }

            // Download file from Telegram
            const fileUrl = await ctx.telegram.getFileLink(fileId);
            const response = await axios({
                method: 'GET',
                url: fileUrl.href,
                responseType: 'stream'
            });

            // Save temporary file
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

            await ctx.reply('☁️ Uploading to cloud storage...');

            // Upload to Azure Storage
            const azureResult = await azureStorageService.uploadFile(tempFilePath, fileName);
            
            await ctx.reply('💾 Saving to database...');

            // Submit to database
            const grievanceResult = await grievanceDBService.submitGrievance({
                citizen_id: userSession.citizen_id,
                grievance_text: userSession.grievance_text,
                image_path: azureResult.url,
                image_description: fileName
            });

            await ctx.reply('🤖 Pushing to AI analysis queue...');

            // Push to Azure Queue for AI processing
            const queueMessage = {
                grivience_id: grievanceResult.grivience_id,
                citizen_id: userSession.citizen_id,
                telegram_id: parseInt(userId),
                grievance_text: userSession.grievance_text,
                image_path: azureResult.url,
                timestamp: new Date().toISOString()
            };

            await azureQueueService.sendMessage(JSON.stringify(queueMessage));

            // Clean up temp file
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }

            // Clear user session
            this.userSessions.delete(userId);

            // Send success response
            await ctx.reply(
                '✅ *Grievance Submitted Successfully!*\n\n' +
                `🆔 Submission ID:\n\`${grievanceResult.grivience_id}\`\n\n` +
                `📄 Document: ${fileName}\n` +
                `📊 Status: 🟡 Pending AI Analysis\n\n` +
                '🤖 *What happens next?*\n' +
                '1️⃣ AI analyzes your grievance\n' +
                '2️⃣ Automatically routed to department\n' +
                '3️⃣ Officer assigned to your case\n' +
                '4️⃣ You receive updates here\n\n' +
                '📱 *Track Progress:*\n' +
                'Use "📊 My Grievances" to check status\n\n' +
                '🔔 You\'ll be notified of any updates!\n\n' +
                'Thank you for using our service! 🇮🇳',
                { parse_mode: 'Markdown' }
            );

            // Show main menu
            const citizen = await citizenService.getCitizenByTelegramId(parseInt(userId));
            await this.showMainMenu(ctx, citizen);

        } catch (error) {
            console.error('File upload error:', error);
            ctx.reply(
                '❌ *Upload Failed*\n\n' +
                'Failed to process your document. Please try again.\n\n' +
                'Make sure:\n' +
                '• File is under 10MB\n' +
                '• Format is PDF, JPG, or PNG',
                { parse_mode: 'Markdown' }
            );
        }
    }

    init() {
        if (!process.env.TELEGRAM_BOT_TOKEN) {
            console.warn('Telegram bot token not provided. Bot will not start.');
            return;
        }

        try {
            this.bot.launch();
            console.log('✅ Telegram bot started successfully');
            
            // Enable graceful stop
            process.once('SIGINT', () => this.bot.stop('SIGINT'));
            process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
            
        } catch (error) {
            console.error('Failed to start Telegram bot:', error);
        }
    }

    // Method to send notification to user
    async notifyUser(userId, message) {
        try {
            await this.bot.telegram.sendMessage(userId, message, { parse_mode: 'Markdown' });
            console.log(`Notification sent to user ${userId}`);
        } catch (error) {
            console.error(`Failed to send notification to user ${userId}:`, error);
        }
    }
}

module.exports = new TelegramBotService();
