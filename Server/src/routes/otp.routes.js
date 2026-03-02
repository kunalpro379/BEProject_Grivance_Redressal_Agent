import express from 'express';
import emailService from '../services/emailService.js';
import otpService from '../services/otpService.js';
import pool from '../config/database.js';

const router = express.Router();

// Send OTP to email
router.post('/send-otp', async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if email already exists in citizens table
    const existingCitizen = await pool.query(
      'SELECT id FROM citizens WHERE email = $1',
      [email]
    );

    if (existingCitizen.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Email already registered',
        message: 'This email is already registered. Please login instead.'
      });
    }

    // Generate OTP
    const otp = otpService.generateOTP();
    
    // Store OTP
    await otpService.storeOTP(email, otp);
    
    // Send email
    const result = await emailService.sendOTP(email, otp, name || 'User');
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'OTP sent successfully to your email',
        expiresIn: parseInt(process.env.OTP_EXPIRY_MINUTES) || 10
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to send OTP',
        message: 'Please try again or contact support'
      });
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ 
      error: 'Failed to send OTP',
      message: error.message 
    });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ 
        error: 'Email and OTP are required' 
      });
    }

    const result = await otpService.verifyOTP(email, otp);
    
    if (result.success) {
      res.json({ 
        success: true, 
        verified: true, 
        message: result.message 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        verified: false, 
        error: result.message 
      });
    }
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ 
      error: 'Failed to verify OTP',
      message: error.message 
    });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if there's already a valid OTP
    const hasValid = await otpService.hasValidOTP(email);
    if (hasValid) {
      const remaining = otpService.getRemainingTime(email);
      return res.status(429).json({ 
        error: 'OTP already sent',
        message: `Please wait ${remaining} seconds before requesting a new OTP`,
        remainingTime: remaining
      });
    }

    // Generate new OTP
    const otp = otpService.generateOTP();
    
    // Store OTP
    await otpService.storeOTP(email, otp);
    
    // Send email
    const result = await emailService.sendOTP(email, otp, name || 'User');
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'New OTP sent successfully to your email',
        expiresIn: parseInt(process.env.OTP_EXPIRY_MINUTES) || 10
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to resend OTP',
        message: 'Please try again or contact support'
      });
    }
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ 
      error: 'Failed to resend OTP',
      message: error.message 
    });
  }
});

export default router;
