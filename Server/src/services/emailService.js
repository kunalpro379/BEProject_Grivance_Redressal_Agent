import nodemailer from 'nodemailer';

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    const emailService = process.env.EMAIL_SERVICE || 'gmail';
    
    if (emailService === 'gmail') {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });
    } else {
      // Fallback to SMTP configuration
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });
    }
  }

  async sendOTP(email, otp, name = 'User') {
    const subject = 'Your OTP for IGRS Portal Registration';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
          .header { background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .otp-box { background: #FFF8F0; border: 2px solid #F5E6D3; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px; }
          .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #000; font-family: 'Courier New', monospace; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; padding-top: 20px; border-top: 1px solid #eee; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .logo { width: 60px; height: 60px; margin: 0 auto 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">IGRS Portal</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Integrated Grievance Redressal System</p>
            <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.8;">महाराष्ट्र शासन</p>
          </div>
          <div class="content">
            <h2 style="color: #000; margin-top: 0;">Hello ${name},</h2>
            <p>Thank you for registering with IGRS Portal. To complete your registration and verify your email address, please use the One-Time Password (OTP) below:</p>
            
            <div class="otp-box">
              <p style="margin: 0 0 10px 0; color: #666; font-size: 14px; font-weight: 600;">Your One-Time Password</p>
              <div class="otp-code">${otp}</div>
              <p style="margin: 15px 0 0 0; color: #666; font-size: 13px;">Valid for ${process.env.OTP_EXPIRY_MINUTES || 10} minutes</p>
            </div>
            
            <div class="warning">
              <strong style="color: #856404;"> Security Notice:</strong>
              <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #856404;">
                <li>Never share this OTP with anyone</li>
                <li>IGRS Portal will never ask for your OTP via phone or SMS</li>
                <li>This OTP will expire in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes</li>
              </ul>
            </div>
            
            <p style="margin-top: 20px;">If you didn't request this OTP, please ignore this email or contact our support team immediately.</p>
            
            <p style="margin-top: 30px;">Best regards,<br><strong>IGRS Portal Team</strong><br>Government of Maharashtra</p>
          </div>
          <div class="footer">
            <p style="margin: 5px 0;">© 2024 IGRS Portal - Government of Maharashtra</p>
            <p style="margin: 5px 0;">This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      if (!this.transporter) {
        console.log(`\n📧 OTP Email (Email service not configured):`);
        console.log(`   To: ${email}`);
        console.log(`   OTP: ${otp}`);
        console.log(`   Configure EMAIL_USER and EMAIL_PASSWORD in .env to send actual emails\n`);
        return { success: true, message: 'OTP logged to console (email not configured)' };
      }

      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || `"IGRS Portal" <${process.env.EMAIL_USER}>`,
        to: email,
        subject,
        html
      });
      
      console.log(`OTP email sent successfully to ${email}`);
      return { success: true, message: 'OTP sent successfully' };
    } catch (error) {
      console.error('❌ Error sending OTP email:', error);
      // Log to console as fallback
      console.log(`\n📧 OTP Email (Fallback - email failed):`);
      console.log(`   To: ${email}`);
      console.log(`   OTP: ${otp}\n`);
      return { success: false, error: error.message };
    }
  }

  async sendWelcomeEmail(email, name) {
    const subject = 'Welcome to IGRS Portal';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to IGRS Portal!</h1>
          </div>
          <div class="content">
            <h2>Hello ${name},</h2>
            <p>Your account has been successfully created and verified.</p>
            <p>You can now access all features of the IGRS Portal including:</p>
            <ul>
              <li>Submit and track grievances</li>
              <li>View statistics and reports</li>
              <li>Access government announcements</li>
              <li>Participate in community discussions</li>
            </ul>
            <p>Thank you for choosing IGRS Portal.</p>
            <p>Best regards,<br><strong>IGRS Portal Team</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      if (!this.transporter) {
        console.log(`Welcome email would be sent to ${email}`);
        return { success: true };
      }

      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || `"IGRS Portal" <${process.env.EMAIL_USER}>`,
        to: email,
        subject,
        html
      });
      
      console.log(`Welcome email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new EmailService();
