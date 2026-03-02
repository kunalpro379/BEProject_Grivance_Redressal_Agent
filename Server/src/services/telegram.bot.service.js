import { Telegraf, Markup } from 'telegraf';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import citizenService from './citizen.service.js';
import grievanceDBService from './grievance.db.service.js';
import azureStorageService from './azure.storage.services.js';
import azureQueryAnalystQueueService from './azure.queue.queryanalyst.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TelegramBotService {
    constructor() {
        this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
        this.userSessions = new Map();
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
            'What would you like to do?',
            Markup.keyboard([
                ['Submit New Grievance'],
                ['My Grievances', 'Notifications'],
                ['My Profile', 'Help'],
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
            const citizen = await citizenService.getCitizenByTelegramId(parseInt(userId));
            if (citizen) {
                return this.showMainMenu(ctx, citizen);
            } else {
                return ctx.reply('Cancelled. Use /start to begin again.', Markup.removeKeyboard());
            }
        }

        if (text === 'Submit New Grievance') {
            return await this.startGrievanceSubmission(ctx);
        }
        
        if (text === 'My Grievances') {
            return await this.showGrievanceStatus(ctx);
        }
        
        if (text === 'My Profile') {
            return await this.showProfile(ctx);
        }
        
        if (text === 'Help') {
            return await this.showHelp(ctx);
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

    async handleGrievanceLocation(ctx) {
        const userId = ctx.from.id.toString();
        const userSession = this.userSessions.get(userId);

        if (!userSession || userSession.step !== 'awaiting_grievance_location') {
            return;
        }

        const latitude = ctx.message.location.latitude;
        const longitude = ctx.message.location.longitude;

        // Store location in session
        userSession.grievance_latitude = latitude;
        userSession.grievance_longitude = longitude;
        userSession.grievance_location = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
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

            this.userSessions.set(telegramId.toString(), {
                step: 'awaiting_grievance_location',
                citizen_id: citizen.id
            });

            await ctx.reply(
                'Submit New Grievance\n\n' +
                'Step 1: Share Grievance Location\n\n' +
                'Please share the LIVE LOCATION where the issue is occurring.\n\n' +
                'This helps us:\n' +
                '- Route to correct department\n' +
                '- Assign local officers\n' +
                '- Track issue location accurately\n\n' +
                'Note: This is the location of the problem, not your home address.',
                Markup.keyboard([
                    [Markup.button.locationRequest('Share Grievance Location')],
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
                message += `   ${g.grievance_text.substring(0, 60)}...\n`;
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
            const message = 
                ' Query Analysis Complete!\n\n' +
                `Grievance ID: ${grievanceId}\n\n` +
                `Status: ${analysisResult.validation_status || 'Analyzed'}\n` +
                `Department: ${analysisResult.department?.name || 'Being assigned'}\n` +
                `Priority: ${analysisResult.severity?.level || 'Medium'}\n\n` +
                `${analysisResult.validation_status === 'validated' 
                    ? 'Your grievance has been validated and is being processed.' 
                    : ' Your grievance needs review.'}\n\n` +
                'Next Steps:\n' +
                '- Department assignment in progress\n' +
                '- Officer will be assigned soon\n' +
                '- You will receive updates here\n\n' +
                'Use "My Grievances" to check detailed status.';

            await this.bot.telegram.sendMessage(telegramId, message);
            console.log(`Query analysis notification sent to user ${telegramId}`);
        } catch (error) {
            console.error(`Failed to send query analysis notification to user ${telegramId}:`, error);
        }
    }

    async handleFileUpload(ctx) {
        const userId = ctx.from.id.toString();
        const userSession = this.userSessions.get(userId);

        if (!userSession || userSession.step !== 'awaiting_proof') {
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

            // Create a proper blob path with folder structure
            const blobFileName = `grievances/${Date.now()}_${userId}_${fileName}`;
            let azureResult;
            
            try {
                azureResult = await azureStorageService.uploadFile(tempFilePath, blobFileName);
                console.log('[Telegram] File uploaded to Azure:', azureResult.url);
            } catch (uploadError) {
                console.error('[Telegram] Azure upload failed:', uploadError);
                // Clean up temp file
                if (fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                }
                return ctx.reply(
                    '❌ Upload Failed\n\n' +
                    'Failed to upload your document to cloud storage.\n\n' +
                    'Error: ' + uploadError.message + '\n\n' +
                    'Please try again or contact support if the issue persists.'
                );
            }
            
            await ctx.reply('Saving to database...');

            const grievanceResult = await grievanceDBService.submitGrievance({
                citizen_id: userSession.citizen_id,
                grievance_text: userSession.grievance_text,
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

            const queueMessage = {
                grievance_id: grievanceResult.grievance_id,
                citizen_id: userSession.citizen_id,
                telegram_id: parseInt(userId),
                grievance_text: userSession.grievance_text,
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
                // Don't throw - grievance is saved, just notify user
                await ctx.reply(
                    '⚠️ Warning: Grievance saved but AI analysis queue failed.\n\n' +
                    `Submission ID: ${grievanceResult.grievance_id}\n\n` +
                    'Your grievance is saved and will be processed manually.\n' +
                    'You will receive updates soon.'
                );
                throw queueError; // Re-throw to trigger outer catch
            }

            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }

            this.userSessions.delete(userId);

            await ctx.reply(
                'Grievance Submitted Successfully!\n\n' +
                `Submission ID:\n${grievanceResult.grievance_id}\n\n` +
                `Document: ${fileName}\n` +
                `Status: Pending AI Analysis\n\n` +
                'What happens next?\n' +
                '1. AI analyzes your grievance\n' +
                '2. Automatically routed to department\n' +
                '3. Officer assigned to your case\n' +
                '4. You receive updates here\n\n' +
                'Track Progress:\n' +
                'Use "My Grievances" to check status\n\n' +
                'You will be notified of any updates!\n\n' +
                'Thank you for using our service!'
            );

            const citizen = await citizenService.getCitizenByTelegramId(parseInt(userId));
            await this.showMainMenu(ctx, citizen);

        } catch (error) {
            console.error('File upload error:', error);
            ctx.reply(
                'Upload Failed\n\n' +
                'Failed to process your document. Please try again.\n\n' +
                'Make sure:\n' +
                '- File is under 10MB\n' +
                '- Format is PDF, JPG, or PNG'
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
