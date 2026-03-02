import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import agentService from './agent.service.js';

class WhatsAppWebService {
  constructor() {
    this.client = null;
    this.isReady = false;
  }

  /**
   * Initialize WhatsApp Web client
   */
  async initialize() {
    try {
      console.log('🔄 Initializing WhatsApp Web...');

      this.client = new Client({
        authStrategy: new LocalAuth({
          dataPath: './.wwebjs_auth'
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
        }
      });

      // QR Code event
      this.client.on('qr', (qr) => {
        console.log('\n📱 Scan this QR code with WhatsApp:\n');
        qrcode.generate(qr, { small: true });
        console.log('\nOr visit: https://web.whatsapp.com and scan manually\n');
      });

      // Ready event
      this.client.on('ready', () => {
        console.log('✅ WhatsApp Web is ready!');
        this.isReady = true;
      });

      // Authenticated event
      this.client.on('authenticated', () => {
        console.log('✅ WhatsApp authenticated successfully');
      });

      // Auth failure event
      this.client.on('auth_failure', (msg) => {
        console.error('❌ WhatsApp authentication failed:', msg);
        console.log('💡 Tip: Delete .wwebjs_auth folder and scan QR code again');
      });

      // Disconnected event
      this.client.on('disconnected', (reason) => {
        console.log('⚠️  WhatsApp disconnected:', reason);
        this.isReady = false;
        
        // Try to reconnect after 5 seconds
        setTimeout(() => {
          console.log('🔄 Attempting to reconnect...');
          this.initialize().catch(err => {
            console.error('❌ Reconnection failed:', err.message);
          });
        }, 5000);
      });

      // Message event
      this.client.on('message', async (message) => {
        await this.handleMessage(message);
      });

      // Initialize client
      await this.client.initialize();
      
    } catch (error) {
      console.error('❌ WhatsApp initialization error:', error.message);
      
      // If session is corrupted, suggest cleanup
      if (error.message.includes('Execution context was destroyed')) {
        console.log('\n💡 Session corrupted. To fix:');
        console.log('   1. Stop the server');
        console.log('   2. Delete .wwebjs_auth folder');
        console.log('   3. Restart and scan QR code again\n');
      }
      
      throw error;
    }
  }

  /**
   * Handle incoming messages
   */
  async handleMessage(message) {
    try {
      console.log('\n📨 Incoming WhatsApp message:');
      console.log('  From:', message.from);
      console.log('  Body:', message.body);
      console.log('  Type:', message.type);
      
      // Ignore group messages and status updates
      if (message.from.includes('@g.us') || message.from === 'status@broadcast') {
        console.log('  ⏭️  Ignoring group/status message');
        return;
      }

      // Get contact info
      const contact = await message.getContact();
      const phoneNumber = message.from.replace('@c.us', '');
      const userName = contact.pushname || contact.name || phoneNumber;

      console.log(`  📱 Processing message from ${userName} (${phoneNumber})`);

      // Send typing indicator
      const chat = await message.getChat();
      await chat.sendStateTyping();

      // Process message through agent service
      console.log('  🤖 Sending to agent service...');
      const response = await agentService.processMessage({
        userId: phoneNumber,
        userName: userName,
        message: message.body,
        channel: 'whatsapp-web',
        messageId: message.id._serialized,
        media: message.hasMedia ? await this.downloadMedia(message) : null
      });

      console.log('  ✅ Agent response:', response.text.substring(0, 100) + '...');

      // Stop typing
      await chat.clearState();

      // Send response
      await message.reply(response.text);
      console.log('  ✅ Response sent!');

      // Send attachments if any
      if (response.attachments) {
        for (const attachment of response.attachments) {
          await this.client.sendMessage(message.from, attachment.url, {
            caption: attachment.filename
          });
        }
      }

    } catch (error) {
      console.error('❌ Error handling WhatsApp message:', error);
      console.error('   Stack:', error.stack);
      try {
        await message.reply('Sorry, I encountered an error. Please try again.');
      } catch (replyError) {
        console.error('❌ Error sending error message:', replyError);
      }
    }
  }

  /**
   * Download media from message
   */
  async downloadMedia(message) {
    try {
      const media = await message.downloadMedia();
      
      return {
        data: Buffer.from(media.data, 'base64'),
        mimeType: media.mimetype,
        filename: media.filename || 'file'
      };
    } catch (error) {
      console.error('Error downloading media:', error);
      return null;
    }
  }

  /**
   * Send message to a phone number
   */
  async sendMessage(phoneNumber, text) {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }

    try {
      // Format phone number (remove + and add @c.us)
      const chatId = phoneNumber.replace('+', '') + '@c.us';
      await this.client.sendMessage(chatId, text);
      console.log(`✅ Message sent to ${phoneNumber}`);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Send daily report reminder
   */
  async sendDailyReportReminder(phoneNumber, userName) {
    const message = `Hi ${userName}! 👋\n\nTime for your daily progress report.\n\nPlease share:\n1. Work completed today\n2. Site/location\n3. Hours worked\n4. Any challenges faced\n5. Photos/proof of work (optional)\n\nReply with your update!`;
    
    return await this.sendMessage(phoneNumber, message);
  }

  /**
   * Send grievance update notification
   */
  async sendGrievanceUpdate(phoneNumber, grievanceId, status, message) {
    const text = `🔔 Grievance Update\n\nGrievance #${grievanceId}\nStatus: ${status}\n\n${message}`;
    
    return await this.sendMessage(phoneNumber, text);
  }

  /**
   * Get client status
   */
  getStatus() {
    return {
      isReady: this.isReady,
      isConnected: this.client?.info ? true : false
    };
  }
}

export default new WhatsAppWebService();
