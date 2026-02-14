const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const citizenService = require('./citizen.service');
const grievanceDBService = require('./grievance.db.service');
const azureStorageService = require('./azure.storage.services');

class TelegramBotService {
    constructor() {
        this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
        this.userSessions = new Map(); // Store user states
        this.setupHandlers();
    }

    setupHandlers() {
        // Start command - Begin registration
        this.bot.start(async (ctx) => {
            const telegramId = ctx.from.id;
            
            try {
                // Check if citizen already registered
                const citizen = await citizenService.getCitizenByTelegramId(telegramId);
                
                if (citizen && citizen.is_registered) {
                    return ctx.reply(
                        `🇮🇳 Welcome back, ${citizen.full_name || 'User'}!\n\n` +
                        'You are already registered. You can:\n' +
                        '• /submit - Submit a new grievance\n' +
                        '• /status - Check your grievances\n' +
                        '• /update - Update your profile\n' +
                        '• /help - Get help'
                    );
                }
                
                // Start registration process
                this.userSessions.set(telegramId.toString(), { step: 'awaiting_phone' });
                
                ctx.reply(
                    '🇮🇳 Welcome to Grievance Redressal System!\n\n' +
                    'Let\'s get you registered. Please share your phone number.',
                    Markup.keyboard([
                        Markup.button.contactRequest('📱 Share Phone Number')
                    ]).resize()
                );
            } catch (error) {
                console.error('Start command error:', error);
                ctx.reply('❌ Something went wrong. Please try again.');
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

        // Submit command
        this.bot.command('submit', async (ctx) => {
            await this.startGrievanceSubmission(ctx);
        });

        // Status command
        this.bot.command('status', async (ctx) => {
            await this.showGrievanceStatus(ctx);
        });

        // Help command
        this.bot.help((ctx) => {
            ctx.reply(
                '📋 Available Commands:\n\n' +
                '/start - Register or login\n' +
                '/submit - Submit a new grievance\n' +
                '/status - Check your grievances\n' +
                '/update - Update your profile\n' +
                '/help - Show this help message\n\n' +
                'To submit a grievance:\n' +
                '1. Use /submit command\n' +
                '2. Type your complaint\n' +
                '3. Upload proof (image/PDF)\n\n' +
                'We will process and forward it to the concerned department.'
            );
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
            ctx.reply('❌ Something went wrong. Please try again later.');
        });
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

        ctx.reply(
            `✅ Phone number received: ${phone}\n\n` +
            'Now, please share your location so we can route your grievances to the correct local authorities.',
            Markup.keyboard([
                Markup.button.locationRequest('📍 Share Location')
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

        try {
            // Register citizen in database
            const result = await citizenService.registerCitizen({
                telegram_id: parseInt(telegramId),
                phone: session.phone,
                username: session.username,
                full_name: session.full_name,
                latitude: latitude,
                longitude: longitude,
                location_address: `${latitude}, ${longitude}`
            });

            // Clear session
            this.userSessions.delete(telegramId);

            ctx.reply(
                '✅ Registration completed successfully!\n\n' +
                `Name: ${session.full_name}\n` +
                `Phone: ${session.phone}\n` +
                `Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}\n\n` +
                'You can now submit grievances using /submit command.',
                Markup.removeKeyboard()
            );
        } catch (error) {
            console.error('Registration error:', error);
            ctx.reply(
                '❌ Registration failed. Please try again with /start',
                Markup.removeKeyboard()
            );
        }
    }

    async startGrievanceSubmission(ctx) {
        const telegramId = ctx.from.id;
        
        try {
            // Check if citizen is registered
            const citizen = await citizenService.getCitizenByTelegramId(telegramId);
            
            if (!citizen || !citizen.is_registered) {
                return ctx.reply(
                    '❌ You need to register first!\n\n' +
                    'Please use /start to register.'
                );
            }

            // Initialize grievance session
            this.userSessions.set(telegramId.toString(), {
                step: 'awaiting_grievance_text',
                citizen_id: citizen.id
            });

            ctx.reply(
                '📝 Please describe your grievance in detail.\n\n' +
                'Type your complaint and I will guide you through the rest.'
            );
        } catch (error) {
            console.error('Start submission error:', error);
            ctx.reply('❌ Something went wrong. Please try again.');
        }
    }

    async showGrievanceStatus(ctx) {
        const telegramId = ctx.from.id;
        
        try {
            const result = await citizenService.getCitizenGrievances(telegramId);
            
            if (result.count === 0) {
                return ctx.reply('You have no grievances submitted yet.\n\nUse /submit to submit a new grievance.');
            }

            let message = `📊 Your Grievances (${result.count}):\n\n`;
            
            result.data.forEach((g, index) => {
                message += `${index + 1}. ${g.grievance_text.substring(0, 50)}...\n`;
                message += `   Status: ${g.status || 'pending'}\n`;
                message += `   Department: ${g.department_name || 'Not assigned'}\n`;
                message += `   Date: ${new Date(g.created_at).toLocaleDateString()}\n\n`;
            });

            ctx.reply(message);
        } catch (error) {
            console.error('Status check error:', error);
            ctx.reply('❌ Failed to fetch grievances. Please try again.');
        }
    }

    async handleTextMessage(ctx) {
        const userId = ctx.from.id.toString();
        const userSession = this.userSessions.get(userId) || {};

        // Check if waiting for grievance text
        if (userSession.step === 'awaiting_grievance_text') {
            userSession.grievance_text = ctx.message.text;
            userSession.step = 'awaiting_proof';
            this.userSessions.set(userId, userSession);

            return ctx.reply(
                '✅ Grievance received!\n\n' +
                `Your complaint: "${ctx.message.text.substring(0, 100)}..."\n\n` +
                '📎 Now please upload proof (image or PDF document) to complete your submission.'
            );
        }

        // Default response
        ctx.reply(
            'Please use commands to interact:\n' +
            '/start - Register\n' +
            '/submit - Submit grievance\n' +
            '/status - Check status\n' +
            '/help - Get help'
        );
    }

    async handleFileUpload(ctx) {
        const userId = ctx.from.id.toString();
        const userSession = this.userSessions.get(userId);

        if (!userSession || userSession.step !== 'awaiting_proof') {
            return ctx.reply(
                'Please start by submitting a grievance first.\n\n' +
                'Use /submit command to begin.'
            );
        }

        try {
            ctx.reply('📤 Processing your document...');

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

            // Upload to Azure Storage
            const azureResult = await azureStorageService.uploadFile(tempFilePath, fileName);
            
            // Submit to database
            const grievanceResult = await grievanceDBService.submitGrievance({
                citizen_id: userSession.citizen_id,
                grievance_text: userSession.grievance_text,
                image_path: azureResult.url,
                image_description: fileName
            });

            // Clean up temp file
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }

            // Clear user session
            this.userSessions.delete(userId);

            // Send success response
            ctx.reply(
                '✅ Grievance submitted successfully!\n\n' +
                `Submission ID: ${grievanceResult.grivience_id}\n` +
                `Document: ${fileName}\n` +
                `Status: Pending AI Analysis\n\n` +
                'Your grievance will be analyzed and forwarded to the appropriate department.\n\n' +
                'Use /status to check your grievance status.\n\n' +
                'Thank you for using our grievance redressal system! 🇮🇳'
            );

        } catch (error) {
            console.error('File upload error:', error);
            ctx.reply(
                '❌ Failed to process your document. Please try again.\n\n' +
                'Make sure your file is under 10MB and in supported format (PDF, JPG, PNG).'
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
            console.log('Telegram bot started successfully');
            
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
            await this.bot.telegram.sendMessage(userId, message);
            console.log(`Notification sent to user ${userId}`);
        } catch (error) {
            console.error(`Failed to send notification to user ${userId}:`, error);
        }
    }
}

module.exports = new TelegramBotService();