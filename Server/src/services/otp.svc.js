import crypto from 'crypto';

class OTPService {
  constructor() {
    // In production, use Redis for distributed systems
    this.otpStore = new Map();
  }

  generateOTP() {
    const length = parseInt(process.env.OTP_LENGTH) || 6;
    const otp = crypto.randomInt(Math.pow(10, length - 1), Math.pow(10, length)).toString();
    return otp;
  }

  async storeOTP(email, otp) {
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;
    const expiryTime = Date.now() + (expiryMinutes * 60 * 1000);
    
    this.otpStore.set(email.toLowerCase(), {
      otp,
      expiryTime,
      attempts: 0,
      createdAt: Date.now()
    });
    
    // Auto-cleanup after expiry
    setTimeout(() => {
      this.otpStore.delete(email.toLowerCase());
    }, expiryMinutes * 60 * 1000);

    console.log(`OTP stored for ${email}: ${otp} (expires in ${expiryMinutes} minutes)`);
  }

  async verifyOTP(email, otp) {
    const stored = this.otpStore.get(email.toLowerCase());
    
    if (!stored) {
      return { 
        success: false, 
        message: 'OTP expired or not found. Please request a new OTP.' 
      };
    }
    
    if (Date.now() > stored.expiryTime) {
      this.otpStore.delete(email.toLowerCase());
      return { 
        success: false, 
        message: 'OTP has expired. Please request a new OTP.' 
      };
    }
    
    if (stored.attempts >= 3) {
      this.otpStore.delete(email.toLowerCase());
      return { 
        success: false, 
        message: 'Too many failed attempts. Please request a new OTP.' 
      };
    }
    
    if (stored.otp !== otp.trim()) {
      stored.attempts++;
      const remainingAttempts = 3 - stored.attempts;
      return { 
        success: false, 
        message: `Invalid OTP. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.` 
      };
    }
    
    // OTP verified successfully - remove from store
    this.otpStore.delete(email.toLowerCase());
    console.log(`OTP verified successfully for ${email}`);
    
    return { 
      success: true, 
      message: 'OTP verified successfully' 
    };
  }

  async hasValidOTP(email) {
    const stored = this.otpStore.get(email.toLowerCase());
    if (!stored) return false;
    if (Date.now() > stored.expiryTime) {
      this.otpStore.delete(email.toLowerCase());
      return false;
    }
    return true;
  }

  async deleteOTP(email) {
    this.otpStore.delete(email.toLowerCase());
  }

  // Get remaining time for OTP
  getRemainingTime(email) {
    const stored = this.otpStore.get(email.toLowerCase());
    if (!stored) return 0;
    
    const remaining = Math.max(0, stored.expiryTime - Date.now());
    return Math.ceil(remaining / 1000); // Return seconds
  }
}

export default new OTPService();
