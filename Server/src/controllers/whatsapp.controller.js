import whatsappService from '../services/whatsapp.service.js';
import agentService from '../services/agent.service.js';

/**
 * Verify webhook for WhatsApp Cloud API
 * Meta will call this endpoint to verify your webhook URL
 */
export const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'my_verify_token';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ WhatsApp webhook verified');
    res.status(200).send(challenge);
  } else {
    console.error('❌ WhatsApp webhook verification failed');
    res.sendStatus(403);
  }
};

/**
 * Handle incoming WhatsApp messages
 */
export const handleIncomingMessage = async (req, res) => {
  try {
    // Acknowledge receipt immediately
    res.sendStatus(200);

    const body = req.body;

    // Check if this is a message event
    if (body.object !== 'whatsapp_business_account') {
      return;
    }

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    // Handle different message types
    if (value?.messages) {
      await handleMessages(value);
    }

    // Handle message status updates (delivered, read, etc.)
    if (value?.statuses) {
      handleStatusUpdates(value.statuses);
    }

  } catch (error) {
    console.error('Error handling WhatsApp webhook:', error);
  }
};

/**
 * Process incoming messages
 */
async function handleMessages(value) {
  const messages = value.messages;
  const contacts = value.contacts;

  for (const message of messages) {
    const from = message.from; // Phone number
    const messageId = message.id;
    const timestamp = message.timestamp;

    // Get contact name if available
    const contact = contacts?.find(c => c.wa_id === from);
    const userName = contact?.profile?.name || from;

    console.log(`📱 Message from ${userName} (${from}):`, message);

    // Handle different message types
    switch (message.type) {
      case 'text':
        await handleTextMessage(from, userName, message.text.body, messageId);
        break;

      case 'image':
        await handleImageMessage(from, userName, message.image, messageId);
        break;

      case 'document':
        await handleDocumentMessage(from, userName, message.document, messageId);
        break;

      case 'audio':
      case 'voice':
        await handleAudioMessage(from, userName, message[message.type], messageId);
        break;

      case 'location':
        await handleLocationMessage(from, userName, message.location, messageId);
        break;

      case 'interactive':
        await handleInteractiveMessage(from, userName, message.interactive, messageId);
        break;

      default:
        console.log(`Unsupported message type: ${message.type}`);
        await whatsappService.sendMessage(from, 
          'Sorry, I can only process text messages, images, and documents at the moment.'
        );
    }
  }
}

/**
 * Handle text messages - Main conversation flow
 */
async function handleTextMessage(phoneNumber, userName, text, messageId) {
  try {
    // Mark as read
    await whatsappService.markAsRead(messageId);

    // Send typing indicator
    await whatsappService.sendTypingIndicator(phoneNumber);

    // Process message through agent
    const response = await agentService.processMessage({
      userId: phoneNumber,
      userName: userName,
      message: text,
      channel: 'whatsapp',
      messageId: messageId
    });

    // Send response back
    await whatsappService.sendMessage(phoneNumber, response.text);

    // Send any attachments if present
    if (response.attachments) {
      for (const attachment of response.attachments) {
        await whatsappService.sendDocument(phoneNumber, attachment.url, attachment.filename);
      }
    }

  } catch (error) {
    console.error('Error handling text message:', error);
    await whatsappService.sendMessage(phoneNumber, 
      'Sorry, I encountered an error processing your message. Please try again.'
    );
  }
}

/**
 * Handle image messages - For proof of work, site photos, etc.
 */
async function handleImageMessage(phoneNumber, userName, image, messageId) {
  try {
    await whatsappService.markAsRead(messageId);
    await whatsappService.sendTypingIndicator(phoneNumber);

    // Download image from WhatsApp
    const imageData = await whatsappService.downloadMedia(image.id);

    // Process through agent with image
    const response = await agentService.processMessage({
      userId: phoneNumber,
      userName: userName,
      message: image.caption || 'Image uploaded',
      channel: 'whatsapp',
      messageId: messageId,
      media: {
        type: 'image',
        data: imageData,
        mimeType: image.mime_type
      }
    });

    await whatsappService.sendMessage(phoneNumber, response.text);

  } catch (error) {
    console.error('Error handling image:', error);
    await whatsappService.sendMessage(phoneNumber, 
      'Sorry, I had trouble processing your image. Please try again.'
    );
  }
}

/**
 * Handle document messages - PDFs, reports, etc.
 */
async function handleDocumentMessage(phoneNumber, userName, document, messageId) {
  try {
    await whatsappService.markAsRead(messageId);
    await whatsappService.sendTypingIndicator(phoneNumber);

    const documentData = await whatsappService.downloadMedia(document.id);

    const response = await agentService.processMessage({
      userId: phoneNumber,
      userName: userName,
      message: document.caption || `Document: ${document.filename}`,
      channel: 'whatsapp',
      messageId: messageId,
      media: {
        type: 'document',
        data: documentData,
        filename: document.filename,
        mimeType: document.mime_type
      }
    });

    await whatsappService.sendMessage(phoneNumber, response.text);

  } catch (error) {
    console.error('Error handling document:', error);
    await whatsappService.sendMessage(phoneNumber, 
      'Sorry, I had trouble processing your document.'
    );
  }
}

/**
 * Handle audio/voice messages
 */
async function handleAudioMessage(phoneNumber, userName, audio, messageId) {
  await whatsappService.markAsRead(messageId);
  await whatsappService.sendMessage(phoneNumber, 
    'Voice messages are not supported yet. Please send a text message instead.'
  );
}

/**
 * Handle location messages
 */
async function handleLocationMessage(phoneNumber, userName, location, messageId) {
  try {
    await whatsappService.markAsRead(messageId);

    const response = await agentService.processMessage({
      userId: phoneNumber,
      userName: userName,
      message: `Location shared: ${location.latitude}, ${location.longitude}`,
      channel: 'whatsapp',
      messageId: messageId,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        name: location.name,
        address: location.address
      }
    });

    await whatsappService.sendMessage(phoneNumber, response.text);

  } catch (error) {
    console.error('Error handling location:', error);
  }
}

/**
 * Handle interactive button/list responses
 */
async function handleInteractiveMessage(phoneNumber, userName, interactive, messageId) {
  try {
    await whatsappService.markAsRead(messageId);

    let selectedOption = '';
    if (interactive.type === 'button_reply') {
      selectedOption = interactive.button_reply.title;
    } else if (interactive.type === 'list_reply') {
      selectedOption = interactive.list_reply.title;
    }

    const response = await agentService.processMessage({
      userId: phoneNumber,
      userName: userName,
      message: selectedOption,
      channel: 'whatsapp',
      messageId: messageId,
      interactionType: interactive.type
    });

    await whatsappService.sendMessage(phoneNumber, response.text);

  } catch (error) {
    console.error('Error handling interactive message:', error);
  }
}

/**
 * Handle message status updates (optional - for tracking)
 */
function handleStatusUpdates(statuses) {
  for (const status of statuses) {
    console.log(`📊 Message ${status.id} status: ${status.status}`);
    // You can store this in DB for analytics
  }
}
