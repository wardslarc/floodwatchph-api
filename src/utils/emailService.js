// src/utils/emailService.js
import nodemailer from 'nodemailer';

class EmailService {
  constructor() {
    this.isConfigured = false;
    this.transporter = null;
    this.brandName = process.env.FROM_NAME || 'FloodWatch.ph';
    this.brandEmail = process.env.FROM_EMAIL || process.env.EMAIL_USER;
    this.initializeTransporter();
  }

  initializeTransporter() {
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('Email configuration missing. Email service disabled.');
      this.isConfigured = false;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_PORT == 465,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 30000,
      });

      this.isConfigured = true;
      console.log('FloodWatch.ph email service initialized successfully');
    } catch (error) {
      console.error('Email transporter initialization error:', error.message);
      this.isConfigured = false;
    }
  }

  async verifyTransporter() {
    if (!this.isConfigured) {
      return { success: false, error: 'Email service not configured' };
    }

    try {
      await this.transporter.verify();
      console.log('Email transporter verified successfully');
      return { success: true };
    } catch (error) {
      console.error('Email transporter verification failed:', error.message);
      this.isConfigured = false;
      return { 
        success: false, 
        error: error.message
      };
    }
  }

  async send2FACode(email, code) {
    if (!this.isConfigured) {
      return { 
        success: false, 
        error: 'Email service not configured'
      };
    }

    if (!email || !code) {
      return {
        success: false,
        error: 'Email and verification code are required'
      };
    }

    const mailOptions = {
      from: `"${this.brandName}" <${this.brandEmail}>`,
      to: email,
      subject: 'Your FloodWatch.ph Verification Code',
      html: this.generate2FATemplate(code),
      text: this.generate2FAText(code),
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`2FA code sent to ${email}`);
      return { 
        success: true, 
        messageId: info.messageId
      };
    } catch (error) {
      console.error('Error sending 2FA code:', error.message);
      return { 
        success: false, 
        error: error.message
      };
    }
  }

  async sendWelcomeEmail(user) {
    if (!this.isConfigured) {
      return { 
        success: false, 
        error: 'Email service not configured'
      };
    }

    if (!user || !user.email || !user.name) {
      return {
        success: false,
        error: 'User information is required'
      };
    }

    const mailOptions = {
      from: `"${this.brandName}" <${this.brandEmail}>`,
      to: user.email,
      subject: 'Welcome to FloodWatch.ph - Community Flood Monitoring',
      html: this.generateWelcomeTemplate(user),
      text: this.generateWelcomeText(user),
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Welcome email sent to ${user.email}`);
      return { 
        success: true, 
        messageId: info.messageId
      };
    } catch (error) {
      console.error('Error sending welcome email:', error.message);
      return { 
        success: false, 
        error: error.message
      };
    }
  }

  generate2FATemplate(code) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FloodWatch.ph Verification Code</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #2d3748; 
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 600px; 
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .header { 
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
        }
        .header h1 {
            font-size: 2.5rem;
            font-weight: 300;
            margin-bottom: 10px;
        }
        .header p {
            opacity: 0.9;
            font-size: 1.1rem;
        }
        .content { 
            padding: 40px 30px; 
        }
        .greeting {
            font-size: 1.2rem;
            margin-bottom: 25px;
            color: #4a5568;
        }
        .code-container { 
            background: #f8fafc; 
            padding: 30px; 
            border-radius: 12px;
            border: 2px dashed #e2e8f0;
            margin: 25px 0; 
            text-align: center;
        }
        .verification-code {
            color: #1e40af;
            font-size: 48px;
            letter-spacing: 8px;
            font-weight: bold;
            font-family: 'Courier New', monospace;
            margin: 15px 0;
        }
        .security-notice {
            background: #fff9ed;
            border: 1px solid #fed7aa;
            border-radius: 12px;
            padding: 20px;
            margin: 25px 0;
        }
        .security-notice h3 {
            color: #c05621;
            margin-bottom: 10px;
        }
        .footer { 
            text-align: center; 
            margin-top: 40px; 
            color: #718096; 
            font-size: 14px;
            border-top: 1px solid #e2e8f0;
            padding-top: 30px;
        }
        @media only screen and (max-width: 600px) {
            .content { padding: 25px 20px; }
            .header { padding: 30px 20px; }
            .header h1 { font-size: 2rem; }
            .verification-code { font-size: 36px; letter-spacing: 6px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌊 FloodWatch.ph</h1>
            <p>Community Flood Monitoring System</p>
        </div>
        <div class="content">
            <div class="greeting">
                <p>Hello FloodWatch User,</p>
            </div>
            
            <p>To help keep our community safe and secure, please use the following verification code to access your FloodWatch.ph account:</p>
            
            <div class="code-container">
                <h3 style="color: #4a5568; margin-bottom: 15px;">Your Verification Code</h3>
                <div class="verification-code">${code}</div>
                <p style="color: #64748b; margin: 0;">This code will expire in 10 minutes</p>
            </div>
            
            <div class="security-notice">
                <h3>🔒 Security Notice</h3>
                <p>This code is required to verify your identity and protect your account. Please do not share this code with anyone.</p>
                <p>If you didn't request this code, please ignore this email or contact our support team immediately.</p>
            </div>
            
            <p>Thank you for helping us maintain a secure community platform for flood monitoring and reporting.</p>
            
            <p>Stay safe,<br>
            <strong>The FloodWatch.ph Team</strong></p>
        </div>
        <div class="footer">
            <p>This is an automated security email. Please do not reply to this message.</p>
            <p>If you need assistance, please visit our help center or contact support.</p>
            <p>&copy; ${new Date().getFullYear()} FloodWatch.ph. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  generate2FAText(code) {
    return `
FLOODWATCH.PH VERIFICATION CODE

Hello FloodWatch User,

To help keep our community safe and secure, please use the following verification code to access your FloodWatch.ph account:

Your Verification Code: ${code}

This code will expire in 10 minutes.

🔒 SECURITY NOTICE:
This code is required to verify your identity and protect your account. Please do not share this code with anyone.

If you didn't request this code, please ignore this email or contact our support team immediately.

Thank you for helping us maintain a secure community platform for flood monitoring and reporting.

Stay safe,
The FloodWatch.ph Team

---
This is an automated security email. Please do not reply to this message.
If you need assistance, please visit our help center or contact support.
© ${new Date().getFullYear()} FloodWatch.ph. All rights reserved.
    `.trim();
  }

  generateWelcomeTemplate(user) {
    const safeUserName = this.escapeHtml(user.name || '');
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to FloodWatch.ph</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #2d3748; 
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 600px; 
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .header { 
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
        }
        .header h1 {
            font-size: 2.5rem;
            font-weight: 300;
            margin-bottom: 10px;
        }
        .header p {
            opacity: 0.9;
            font-size: 1.1rem;
        }
        .content { 
            padding: 40px 30px; 
        }
        .greeting {
            font-size: 1.2rem;
            margin-bottom: 25px;
            color: #4a5568;
        }
        .features-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 30px 0;
        }
        .feature-card {
            background: #f8fafc;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            border: 1px solid #e2e8f0;
        }
        .feature-icon {
            font-size: 2rem;
            margin-bottom: 10px;
        }
        .security-notice {
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
        }
        .security-notice h3 {
            color: #0369a1;
            margin-bottom: 15px;
        }
        .cta-section {
            text-align: center;
            margin: 30px 0;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            font-size: 1.1rem;
        }
        .footer { 
            text-align: center; 
            margin-top: 40px; 
            color: #718096; 
            font-size: 14px;
            border-top: 1px solid #e2e8f0;
            padding-top: 30px;
        }
        @media only screen and (max-width: 600px) {
            .content { padding: 25px 20px; }
            .header { padding: 30px 20px; }
            .header h1 { font-size: 2rem; }
            .features-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌊 Welcome to FloodWatch.ph!</h1>
            <p>Community Flood Monitoring System</p>
        </div>
        <div class="content">
            <div class="greeting">
                <p>Hello <strong>${safeUserName}</strong>,</p>
            </div>
            
            <p>Welcome to FloodWatch.ph! We're excited to have you join our community-driven flood monitoring platform. Together, we can make our communities safer and better prepared for flood events.</p>
            
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">📱</div>
                    <h4>Real-time Reports</h4>
                    <p>Submit and view live flood reports in your area</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🗺️</div>
                    <h4>Interactive Map</h4>
                    <p>Visualize flood data on our community map</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🔔</div>
                    <h4>Alerts & Notifications</h4>
                    <p>Get notified about flood warnings in your area</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">👥</div>
                    <h4>Community Driven</h4>
                    <p>Share information and help keep everyone safe</p>
                </div>
            </div>
            
            <div class="security-notice">
                <h3>🔒 Account Security Enabled</h3>
                <p>To protect our community and your data, we've enabled two-factor authentication for your account. You'll receive verification codes via email when logging in to ensure only you can access your account.</p>
                <p><strong>Each code expires in 10 minutes</strong> for enhanced security.</p>
            </div>
            
            <div class="cta-section">
                <p>Ready to start monitoring and reporting flood conditions in your area?</p>
                <a href="${process.env.FRONTEND_URL || 'https://floodwatch.ph'}" class="cta-button">
                    Explore FloodWatch.ph
                </a>
            </div>
            
            <p>If you have any questions or need assistance, please don't hesitate to reach out to our support team.</p>
            
            <p>Stay safe and thank you for being part of our community!<br>
            <strong>The FloodWatch.ph Team</strong></p>
        </div>
        <div class="footer">
            <p>This is an automated welcome email. Please do not reply to this message.</p>
            <p>For support, please contact our help center or visit our website.</p>
            <p>&copy; ${new Date().getFullYear()} FloodWatch.ph. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  generateWelcomeText(user) {
    return `
WELCOME TO FLOODWATCH.PH!

Hello ${user.name},

Welcome to FloodWatch.ph! We're excited to have you join our community-driven flood monitoring platform. Together, we can make our communities safer and better prepared for flood events.

🌊 WHAT YOU CAN DO:
• Submit and view real-time flood reports in your area
• Visualize flood data on our interactive community map
• Receive alerts and notifications about flood warnings
• Share information and help keep everyone safe

🔒 ACCOUNT SECURITY:
We've enabled two-factor authentication to protect our community and your data. You'll receive verification codes via email when logging in.

Each code expires in 10 minutes for enhanced security.

GET STARTED:
${process.env.FRONTEND_URL || 'https://floodwatch.ph'}

If you have any questions or need assistance, please don't hesitate to reach out to our support team.

Stay safe and thank you for being part of our community!

The FloodWatch.ph Team

---
This is an automated welcome email. Please do not reply to this message.
For support, please contact our help center or visit our website.
© ${new Date().getFullYear()} FloodWatch.ph. All rights reserved.
    `.trim();
  }

  escapeHtml(text) {
    if (!text) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  isReady() {
    return this.isConfigured && this.transporter;
  }
}

// Export as singleton instance
export default new EmailService();