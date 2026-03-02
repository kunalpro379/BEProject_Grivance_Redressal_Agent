import express from 'express';
import { verifyWebhook, handleIncomingMessage } from '../controllers/whatsapp.controller.js';

const router = express.Router();

// Webhook verification (GET) - Meta will call this to verify your webhook
router.get('/webhook', verifyWebhook);

// Webhook handler (POST) - Receives incoming WhatsApp messages
router.post('/webhook', handleIncomingMessage);

export default router;
