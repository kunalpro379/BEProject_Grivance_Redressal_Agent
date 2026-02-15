import express from 'express';

const router = express.Router();

// Telegram webhook endpoint (optional - for production)
router.post('/webhook', (req, res) => {
    // This endpoint can be used for production webhook setup
    console.log('Telegram webhook received:', req.body);
    res.sendStatus(200);
});

export default router;
