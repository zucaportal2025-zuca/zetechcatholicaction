// services/mailer.js
const SibApiV3Sdk = require('sib-api-v3-sdk');
const { PrismaClient } = require('@prisma/client');


// ==================== BREVO FOR ALL EMAILS ====================
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;
const brevoApi = new SibApiV3Sdk.TransactionalEmailsApi();


// ============================================
// EMAIL SETTINGS GUARD - Centralized Control
// ============================================
const prisma = new PrismaClient();

// Email settings cache
let emailSettingsCache = {};
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Check if an email type is enabled in the database
 * @param {string} emailType - The email type to check
 * @returns {Promise<boolean>}
 */
async function isEmailEnabled(emailType) {
  try {
    const now = Date.now();
    if (emailSettingsCache[emailType] !== undefined && (now - cacheTimestamp) < CACHE_TTL) {
      return emailSettingsCache[emailType];
    }

    const setting = await prisma.emailSetting.findUnique({
      where: { type: emailType },
      select: { enabled: true }
    });

    const enabled = setting ? setting.enabled : true;
    emailSettingsCache[emailType] = enabled;
    cacheTimestamp = now;
    return enabled;
  } catch (error) {
    console.error(`Error checking email setting for ${emailType}:`, error);
    return true; // Default to sending on error
  }
}

/**
 * Clear the email settings cache (call after admin updates)
 */
function clearEmailSettingsCache() {
  emailSettingsCache = {};
  cacheTimestamp = 0;
  console.log('📧 Email settings cache cleared');
}

/**
 * Check if email is enabled and log the decision
 * @param {string} emailType - The email type to check
 * @param {string} recipient - Email recipient for logging
 * @returns {Promise<boolean>}
 */
async function shouldSendEmail(emailType, recipient = 'unknown') {
  const enabled = await isEmailEnabled(emailType);
  if (!enabled) {
    console.log(`📧 Email type "${emailType}" is DISABLED, skipping send to ${recipient}`);
  }
  return enabled;
}


// Helper: Send via Brevo
// services/mailer.js - Update sendViaBrevo function

async function sendViaBrevo(to, subject, htmlContent, textContent, fromName = "ZUCA") {
  try {
    let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.sender = { 
      email: process.env.EMAIL_USER || "zucaportal2025@gmail.com", 
      name: fromName
    };
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.textContent = textContent || "";
    
    // 🔑 IMPORTANT: Add headers that tell email clients to fetch Gravatar
    sendSmtpEmail.headers = {
      'X-Gravatar-Email': process.env.EMAIL_USER || "zucaportal2025@gmail.com",
      'X-Gravatar-ID': '42d31adaf32701eba8883fda0f3baf3f', // Your Gravatar hash
      'X-Entity-Ref-ID': 'zuca-official',
      'Auto-Submitted': 'auto-generated'
    };
    
    const response = await brevoApi.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ Email sent to ${to} via Brevo, MessageId: ${response.messageId}`);
    return true;
  } catch (error) {
    console.error(`❌ Brevo email failed to ${to}:`, error.message);
    return false;
  }
}


// ============================================
// WRAPPED: sendViaBrevo with email guard
// ============================================
async function sendViaBrevoWithGuard(to, subject, htmlContent, textContent, fromName = "ZUCA", emailType = 'general') {
  // Check if email is enabled
  const enabled = await isEmailEnabled(emailType);
  if (!enabled) {
    console.log(`📧 Email type "${emailType}" is DISABLED, skipping send to ${to}`);
    return { sent: false, reason: 'disabled', emailType };
  }
  
  console.log(`📧 Sending email type "${emailType}" to ${to}`);
  return await sendViaBrevo(to, subject, htmlContent, textContent, fromName);
}


// Helper: Get formal greeting
function getFormalGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good evening";
}

// Helper: Format current date professionally
function getCurrentDateTime() {
  return new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
}

// ZUCA Logo URL
const ZUCA_LOGO_URL = "https://dcxuxitorpfujfbtyhhn.supabase.co/storage/v1/object/public/profiles/profile_c2dd6c54-4576-41b1-a85d-1af90d88254a_1777067617594.jpg";

// ==================== WELCOME EMAIL (FORMAL) ====================
async function sendWelcomeEmail(user, membershipNumber) {
  try {
    const greeting = getFormalGreeting();
    const firstName = user.fullName?.split(' ')[0] || 'Member';
    const currentDateTime = getCurrentDateTime();
    const frontendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://zetechcatholicaction.com'
      : 'https://zetechcatholic.vercel.app';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ZUCA</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            background: #f5f5f5;
            line-height: 1.5;
          }
          .container {
            max-width: 550px;
            margin: 0 auto;
            background: #ffffff;
          }
          .header {
            background: #2c5f2d;
            padding: 24px 30px;
            border-bottom: 3px solid #ffd700;
          }
          .logo {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            object-fit: cover;
          }
          .title {
            color: #ffffff;
            font-size: 22px;
            font-weight: 600;
            margin: 8px 0 0;
          }
          .content {
            padding: 30px;
          }
          .greeting {
            font-size: 16px;
            color: #333333;
            margin-bottom: 20px;
          }
          .membership-box {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 20px;
            margin: 25px 0;
            text-align: center;
          }
          .membership-number {
            font-size: 28px;
            font-weight: 700;
            font-family: 'Courier New', monospace;
            letter-spacing: 1px;
            color: #2c5f2d;
          }
          .notice {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            font-size: 13px;
            color: #856404;
          }
          .button {
            display: inline-block;
            background: #2c5f2d;
            color: #ffffff;
            text-decoration: none;
            padding: 12px 25px;
            border-radius: 4px;
            font-weight: 500;
            margin: 15px 0;
          }
          .footer {
            background: #f8f9fa;
            padding: 20px 30px;
            font-size: 11px;
            color: #6c757d;
            text-align: center;
            border-top: 1px solid #dee2e6;
          }
          hr {
            border: none;
            border-top: 1px solid #e9ecef;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${ZUCA_LOGO_URL}" alt="ZUCA Logo" class="logo">
            <div class="title">Zetech University Catholic Action</div>
          </div>
          
          <div class="content">
            <div class="greeting">
              ${greeting}, ${firstName}.
            </div>
            
            <p>Thank you for registering with ZUCA. Your membership has been successfully created.</p>
            
            <div class="membership-box">
              <strong style="font-size: 12px; color: #666;">MEMBERSHIP NUMBER</strong>
              <div class="membership-number">${membershipNumber}</div>
              <div style="font-size: 12px; color: #666; margin-top: 8px;">This is your official ZUCA identifier</div>
            </div>
            
            <div class="notice">
              <strong>Important:</strong> Please save this membership number. It is required for account verification and support inquiries. This number cannot be changed.
            </div>
            
            <p>You can now access the ZUCA portal using your registered email address and password.</p>
            
            <div style="text-align: center;">
              <a href="${frontendUrl}/dashboard" class="button">Access Dashboard</a>
            </div>
            
            <hr>
            
            <p style="font-size: 13px; color: #666;">Available features include:</p>
            <ul style="font-size: 13px; color: #666; padding-left: 20px;">
              <li>View announcements and mass programs</li>
              <li>Make contributions and track pledges</li>
              <li>Access community discussions</li>
              <li>View event calendar and schedules</li>
            </ul>
          </div>
          
          <div class="footer">
            Zetech University Catholic Action (ZUCA)<br>
            ${currentDateTime}<br>
            This is an official communication from ZUCA.
          </div>
        </div>
      </body>
      </html>
    `;
    
    const textContent = `
ZUCA MEMBERSHIP CONFIRMATION

${greeting}, ${firstName}.

Thank you for registering with ZUCA. Your membership has been successfully created.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MEMBERSHIP NUMBER: ${membershipNumber}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IMPORTANT: Please save this membership number. It is required for account verification.

Access your dashboard: ${frontendUrl}/dashboard

Available features:
- View announcements and mass programs
- Make contributions and track pledges
- Access community discussions
- View event calendar and schedules

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Zetech University Catholic Action (ZUCA)
${currentDateTime}
This is an official communication from ZUCA.
    `;
    
    await sendViaBrevo(user.email, `ZUCA Membership Confirmation - ${membershipNumber}`, htmlContent, textContent, "ZUCA");
    console.log(`✅ Welcome email sent to ${user.email}`);
    return true;
  } catch (error) {
    console.error(`❌ Welcome email failed:`, error.message);
    return false;
  }
}

// ==================== VERIFICATION EMAIL (FORMAL) ====================
async function sendVerificationEmail(user, verificationCode) {
  try {
    const greeting = getFormalGreeting();
    const firstName = user.fullName?.split(' ')[0] || 'Member';
    const frontendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://zetechcatholicaction.com'
      : 'https://zetechcatholic.vercel.app';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Email Verification - ZUCA</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #f5f5f5;
          }
          .container {
            max-width: 500px;
            margin: 0 auto;
            background: #ffffff;
          }
          .header {
            background: #2c5f2d;
            padding: 20px 30px;
          }
          .logo {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            object-fit: cover;
          }
          .content {
            padding: 30px;
          }
          .code-box {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 20px;
            text-align: center;
            margin: 25px 0;
          }
          .verification-code {
            font-size: 36px;
            letter-spacing: 8px;
            font-weight: 700;
            font-family: 'Courier New', monospace;
            color: #2c5f2d;
          }
          .footer {
            background: #f8f9fa;
            padding: 15px 30px;
            font-size: 11px;
            color: #6c757d;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${ZUCA_LOGO_URL}" alt="ZUCA" class="logo">
          </div>
          
          <div class="content">
            <p>${greeting}, ${firstName}.</p>
            
            <p>Thank you for registering with ZUCA. To complete your registration, please verify your email address using the code below.</p>
            
            <div class="code-box">
              <strong style="font-size: 12px; color: #666;">VERIFICATION CODE</strong>
              <div class="verification-code">${verificationCode}</div>
              <div style="font-size: 12px; color: #666; margin-top: 8px;">Valid for 15 minutes</div>
            </div>
            
            <p style="font-size: 13px; color: #666;">If you did not request this verification, please ignore this email.</p>
          </div>
          
          <div class="footer">
            Zetech University Catholic Action
          </div>
        </div>
      </body>
      </html>
    `;
    
    const textContent = `
ZUCA EMAIL VERIFICATION

${greeting}, ${firstName}.

Verification Code: ${verificationCode}
Valid for 15 minutes.

Enter this code in the application to verify your email address.

If you did not request this verification, please ignore this email.

Zetech University Catholic Action (ZUCA)
    `;
    
    await sendViaBrevo(user.email, `[ZUCA] Email Verification Code: ${verificationCode}`, htmlContent, textContent, "ZUCA");

    console.log(`✅ Verification email sent to ${user.email}`);
    return true;
  } catch (error) {
    console.error(`❌ Verification email failed:`, error.message);
    return false;
  }
}

// ==================== PASSWORD RESET EMAIL (FORMAL) ====================
async function sendPasswordResetEmail(email, resetCode) {
  try {
    const greeting = getFormalGreeting();
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Password Reset - ZUCA</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #f5f5f5;
          }
          .container {
            max-width: 500px;
            margin: 0 auto;
            background: #ffffff;
          }
          .header {
            background: #2c5f2d;
            padding: 20px 30px;
          }
          .logo {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            object-fit: cover;
          }
          .content {
            padding: 30px;
          }
          .code-box {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 20px;
            text-align: center;
            margin: 25px 0;
          }
          .reset-code {
            font-size: 36px;
            letter-spacing: 8px;
            font-weight: 700;
            font-family: 'Courier New', monospace;
            color: #2c5f2d;
          }
          .footer {
            background: #f8f9fa;
            padding: 15px 30px;
            font-size: 11px;
            color: #6c757d;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${ZUCA_LOGO_URL}" alt="ZUCA" class="logo">
          </div>
          
          <div class="content">
            <p>${greeting},</p>
            
            <p>A request was received to reset your ZUCA account password. Use the verification code below to proceed.</p>
            
            <div class="code-box">
              <strong style="font-size: 12px; color: #666;">PASSWORD RESET CODE</strong>
              <div class="reset-code">${resetCode}</div>
              <div style="font-size: 12px; color: #666; margin-top: 8px;">Valid for 15 minutes</div>
            </div>
            
            <p style="font-size: 13px; color: #666;">If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
          </div>
          
          <div class="footer">
            Zetech University Catholic Action
          </div>
        </div>
      </body>
      </html>
    `;
    
    const textContent = `
ZUCA PASSWORD RESET

${greeting},

Password Reset Code: ${resetCode}
Valid for 15 minutes.

If you did not request this reset, please ignore this email.

Zetech University Catholic Action (ZUCA)
    `;
    
    await sendViaBrevo(email, `[ZUCA] Password Reset Code: ${resetCode}`, htmlContent, textContent, "ZUCA");

    console.log(`✅ Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Password reset email error:', error);
    return false;
  }
}

// ==================== MPESA RECEIPT EMAIL (OFFICIAL FORMAT) ====================
function generateMpesaReceiptHTML(paymentData) {
  const logoUrl = ZUCA_LOGO_URL;
  const amount = paymentData.amount || 0;
  const campaignTitle = paymentData.campaignTitle || 'Contribution';
  const receiptNumber = paymentData.receiptNumber || 'N/A';
  const jumuiaName = paymentData.jumuiaName || null;
  const senderName = paymentData.payerName || 'N/A';
  const senderPhone = paymentData.payerPhone || 'N/A';
  const sentTo = paymentData.sentTo || "ZUCA - Zetech University Catholic Action";
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ZUCA Payment Receipt</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Arial, sans-serif;
          background: #f5f5f5;
        }
        .container {
          max-width: 550px;
          margin: 0 auto;
          background: #ffffff;
        }
        .header {
          background: #2c5f2d;
          padding: 20px 30px;
          border-bottom: 2px solid #ffd700;
        }
        .logo {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          object-fit: cover;
        }
        .organization {
          color: #ffffff;
          font-size: 14px;
          margin-top: 5px;
        }
        .content {
          padding: 30px;
        }
        .receipt-title {
          font-size: 18px;
          font-weight: 600;
          color: #2c5f2d;
          border-bottom: 2px solid #2c5f2d;
          padding-bottom: 8px;
          margin-bottom: 25px;
        }
        .details-table {
          width: 100%;
          margin: 20px 0;
        }
        .details-table td {
          padding: 8px 0;
          border-bottom: 1px solid #e9ecef;
        }
        .label {
          font-size: 13px;
          color: #6c757d;
          width: 40%;
        }
        .value {
          font-size: 13px;
          font-weight: 500;
          color: #333333;
        }
        .amount {
          font-size: 24px;
          font-weight: 700;
          color: #2c5f2d;
        }
        .receipt-footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e9ecef;
          font-size: 11px;
          color: #6c757d;
          text-align: center;
        }
        .footer {
          background: #f8f9fa;
          padding: 15px 30px;
          font-size: 11px;
          color: #6c757d;
          text-align: center;
          border-top: 1px solid #dee2e6;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${logoUrl}" alt="ZUCA" class="logo">
          <div class="organization">Zetech University Catholic Action</div>
        </div>
        
        <div class="content">
          <div class="receipt-title">OFFICIAL PAYMENT RECEIPT</div>
          
          <table class="details-table">
            </tr><td class="label">Receipt Number:</td><td class="value">${receiptNumber}</td></tr>
            <tr><td class="label">Date:</td><td class="value">${new Date().toLocaleDateString()}</td></tr>
            <tr><td class="label">Time:</td><td class="value">${new Date().toLocaleTimeString()}</td></tr>
            <tr><td class="label">Received From:</td><td class="value">${senderName}</td></tr>
            <tr><td class="label">Phone Number:</td><td class="value">${senderPhone}</td></tr>
            ${jumuiaName ? `<tr><td class="label">Jumuia:</td><td class="value">${jumuiaName}</td></tr>` : ''}
            <tr><td class="label">Campaign:</td><td class="value">${campaignTitle}</td></tr>
            <tr><td class="label">Payment Method:</td><td class="value">M-PESA (Lipa Na M-PESA)</td></tr>
            <tr><td class="label">Status:</td><td class="value" style="color: #2c5f2d;">COMPLETED</td></tr>
            <tr><td class="label">Amount:</td><td class="value amount">KES ${amount.toLocaleString()}</td></tr>
          </table>
          
          <div class="receipt-footer">
            This is an official receipt from Zetech University Catholic Action (ZUCA).<br>
            Thank you for your contribution.
          </div>
        </div>
        
        <div class="footer">
          ZUCA - Zetech University Catholic Action
        </div>
      </div>
    </body>
    </html>
  `;
}

// ==================== NOTIFICATION EMAIL (FORMAL) ====================
// ORIGINAL FUNCTION (RENAMED)
async function sendPersonalizedEmailOriginal(user, notificationType, title, message, data = {}) {
  try {
    const greeting = getFormalGreeting();
    const currentDateTime = getCurrentDateTime();
    const firstName = user.fullName?.split(' ')[0] || 'Member';
    const frontendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://zetechcatholicaction.com'
      : 'https://zetechcatholic.vercel.app';

    // Special handling for payment receipts
    if (notificationType === 'payment_receipt') {
      const receiptHTML = generateMpesaReceiptHTML({
        amount: data.amount,
        campaignTitle: data.campaignTitle || data.campaign,
        receiptNumber: data.receiptNumber,
        jumuiaName: data.jumuiaName,
        payerName: data.payerName,
        payerPhone: data.payerPhone,
        sentTo: data.sentTo
      });
      
      await sendViaBrevo(
        user.email, 
        `ZUCA Payment Receipt - ${data.receiptNumber || 'Payment Confirmation'}`, 
        receiptHTML, 
        `Payment Receipt: KES ${data.amount?.toLocaleString()} | Receipt: ${data.receiptNumber}`
      );
      console.log(`✅ Payment receipt email sent to ${user.email}`);
      return true;
    }
    
    // Determine action URL based on notification type
    let actionUrl = `${frontendUrl}/dashboard`;
    let buttonText = 'View Details';
    
    const urlMap = {
      'announcement': '/announcements',
      'program': '/mass-programs',
      'contribution': '/contributions',
      'new_pledge': '/contributions',
      'pledge_approved': '/contributions',
      'payment_success': '/contributions',
      'payment_received': '/contributions',
      'game_invite': '/games',
      'event_reminder': '/calendar',
      'schedule': '/calendar',
      'youtube_new_video': '/youtube',
      'youtube_live': '/youtube'
    };
    
    if (urlMap[notificationType]) {
      actionUrl = `${frontendUrl}${urlMap[notificationType]}`;
    }

    // ===== YOUTUBE SPECIAL HANDLING =====
    if (notificationType === 'youtube_new_video' || notificationType === 'youtube_live') {
      const isLive = notificationType === 'youtube_live';
      const videoUrl = data.videoUrl || `https://www.youtube.com/watch?v=${data.videoId}`;
      const thumbnail = data.videoThumbnail || `https://img.youtube.com/vi/${data.videoId}/hqdefault.jpg`;
      const videoTitle = data.videoTitle || title;
      
      buttonText = isLive ? '🔴 Watch Live Now!' : '▶️ Watch on YouTube';
      actionUrl = videoUrl;
      
      const youtubeHtml = `
        <div style="text-align: center; margin: 20px 0;">
          <img src="${thumbnail}" alt="${videoTitle}" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />
          <div style="font-size: 14px; color: #666; margin-top: 10px;">
            <strong>${videoTitle}</strong>
          </div>
          ${isLive ? `<div style="background: #FF0000; color: white; display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; margin-top: 8px;">🔴 LIVE NOW</div>` : ''}
        </div>
      `;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${title} - ZUCA</title>
          <style>
            body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; }
            .container { max-width: 550px; margin: 0 auto; background: #ffffff; }
            .header { background: #2c5f2d; padding: 20px 30px; }
            .logo { width: 50px; height: 50px; border-radius: 50%; object-fit: cover; }
            .organization { color: #ffffff; font-size: 13px; margin-top: 5px; }
            .content { padding: 30px; }
            .subject-line { font-size: 20px; font-weight: 600; color: #2c5f2d; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #e9ecef; }
            .message-body { font-size: 14px; color: #333333; line-height: 1.6; margin: 20px 0; }
            .button { display: inline-block; background: ${isLive ? '#FF0000' : '#2c5f2d'}; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: 500; font-size: 14px; margin: 15px 0; }
            .button:hover { background: ${isLive ? '#cc0000' : '#1e4420'}; }
            .footer { background: #f8f9fa; padding: 15px 30px; font-size: 11px; color: #6c757d; text-align: center; border-top: 1px solid #dee2e6; }
            hr { border: none; border-top: 1px solid #e9ecef; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${ZUCA_LOGO_URL}" alt="ZUCA" class="logo">
              <div class="organization">Zetech University Catholic Action</div>
            </div>
            <div class="content">
              <div class="subject-line">${isLive ? '🔴' : '📹'} ${title}</div>
              <p>${greeting}, ${firstName}.</p>
              <div class="message-body">${message}</div>
              ${youtubeHtml}
              <div style="text-align: center;">
                <a href="${videoUrl}" class="button">${buttonText}</a>
              </div>
              <hr>
              <p style="font-size: 12px; color: #6c757d;">
                Video ID: ${data.videoId}<br>
                ${isLive ? 'This is a live stream. Join now!' : 'Watch the video on YouTube.'}
              </p>
            </div>
            <div class="footer">
              ZUCA - Zetech University Catholic Action<br>
              ${currentDateTime}
            </div>
          </div>
        </body>
        </html>
      `;
      
      const textContent = `
${isLive ? '🔴' : '📹'} ${title}

${greeting}, ${firstName}.

${message}

${isLive ? '🔴 LIVE NOW' : '📹 New Video'}
Title: ${videoTitle}
Video ID: ${data.videoId}
Watch: ${videoUrl}

---
Zetech University Catholic Action (ZUCA)
${currentDateTime}
      `;
      
      await sendViaBrevo(user.email, `${isLive ? '🔴 LIVE' : '📹'} ${title}`, htmlContent, textContent, "ZUCA");
      console.log(`✅ YouTube ${isLive ? 'live' : 'video'} email sent to ${user.email}`);
      return true;
    }

    // ===== REGULAR EMAIL (for non-YouTube types) =====
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${title} - ZUCA</title>
        <style>
          body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; }
          .container { max-width: 550px; margin: 0 auto; background: #ffffff; }
          .header { background: #2c5f2d; padding: 20px 30px; }
          .logo { width: 50px; height: 50px; border-radius: 50%; object-fit: cover; }
          .organization { color: #ffffff; font-size: 13px; margin-top: 5px; }
          .content { padding: 30px; }
          .subject-line { font-size: 20px; font-weight: 600; color: #2c5f2d; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #e9ecef; }
          .message-body { font-size: 14px; color: #333333; line-height: 1.6; margin: 20px 0; }
          .button { display: inline-block; background: #2c5f2d; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 4px; font-weight: 500; font-size: 13px; margin: 15px 0; }
          .footer { background: #f8f9fa; padding: 15px 30px; font-size: 11px; color: #6c757d; text-align: center; border-top: 1px solid #dee2e6; }
          hr { border: none; border-top: 1px solid #e9ecef; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${ZUCA_LOGO_URL}" alt="ZUCA" class="logo">
            <div class="organization">Zetech University Catholic Action</div>
          </div>
          <div class="content">
            <div class="subject-line">${title}</div>
            <p>${greeting}, ${firstName}.</p>
            <div class="message-body">${message}</div>
            ${data.amount ? `<div style="background: #f8f9fa; padding: 15px; margin: 20px 0; text-align: center;"><strong style="font-size: 12px; color: #666;">AMOUNT</strong><div style="font-size: 24px; font-weight: 700; color: #2c5f2d;">KES ${data.amount.toLocaleString()}</div></div>` : ''}
            <div style="text-align: center;">
              <a href="${actionUrl}" class="button">${buttonText}</a>
            </div>
            <hr>
            <p style="font-size: 12px; color: #6c757d;">If you have any questions, please contact ZUCA support.</p>
          </div>
          <div class="footer">
            ZUCA - Zetech University Catholic Action<br>
            ${currentDateTime}
          </div>
        </div>
      </body>
      </html>
    `;
    
    const textContent = `
ZUCA NOTIFICATION: ${title}

${greeting}, ${firstName}.

${message}

${data.amount ? `Amount: KES ${data.amount.toLocaleString()}` : ''}
${data.receiptNumber ? `Receipt: ${data.receiptNumber}` : ''}

View details: ${actionUrl}

---
Zetech University Catholic Action (ZUCA)
${currentDateTime}
    `;
    
    await sendViaBrevo(user.email, `ZUCA: ${title}`, htmlContent, textContent, "ZUCA");
    console.log(`✅ Notification email sent to ${user.email} (${notificationType})`);
    
    return true;
  } catch (error) {
    console.error(`❌ Email failed to ${user.email}:`, error.message);
    return false;
  }
}

// ============================================
// WRAPPED: sendPersonalizedEmail with email guard
// ============================================
async function sendPersonalizedEmail(user, notificationType, title, message, data = {}) {
  // Check if email is enabled
  const enabled = await isEmailEnabled(notificationType);
  if (!enabled) {
    console.log(`📧 Email type "${notificationType}" is DISABLED, skipping send to ${user?.email || 'unknown'}`);
    return { sent: false, reason: 'disabled', emailType: notificationType };
  }
  
  console.log(`📧 Sending email type "${notificationType}" to ${user?.email}`);
  return await sendPersonalizedEmailOriginal(user, notificationType, title, message, data);
}

// ==================== SMS FUNCTIONS ====================
async function sendSms(phoneNumber, message) {
  try {
    let cleanNumber = phoneNumber.toString().replace(/\+/g, '').replace(/\s/g, '');
    if (cleanNumber.startsWith('0')) {
      cleanNumber = cleanNumber.substring(1);
    }
    
    const response = await fetch('https://api.brevo.com/v3/transactionalSMS/send', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: "ZUCA",
        recipient: cleanNumber,
        content: message.slice(0, 160),
        type: "transactional",
        unicodeEnabled: true
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ SMS sent to ${phoneNumber}, MessageId: ${data.messageId}`);
      return true;
    } else {
      console.error(`❌ SMS failed:`, data.message);
      return false;
    }
  } catch (error) {
    console.error(`❌ SMS error:`, error.message);
    return false;
  }
}

// ==================== BULK EMAIL SENDING ====================
async function sendBulkEmails(users, notificationType, title, message, data = {}) {
  if (!users || users.length === 0) {
    console.log('📧 No users to send emails to');
    return { sent: 0, failed: 0 };
  }
  
  console.log(`📧 Sending ${notificationType} emails to ${users.length} users...`);
  
  let sent = 0;
  let failed = 0;
  const batchSize = 50;
  
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const batches = Math.ceil(users.length / batchSize);
    
    console.log(`📧 Sending batch ${batchNumber}/${batches} (${batch.length} users)...`);
    
    const promises = batch.map(user => 
      sendPersonalizedEmail(user, notificationType, title, message, data)
        .then(success => success ? sent++ : failed++)
        .catch(() => failed++)
    );
    
    await Promise.all(promises);
    
    if (i + batchSize < users.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`✅ Email batch complete! Sent: ${sent}, Failed: ${failed}`);
  return { sent, failed };
}

// ==================== SEMESTER REPORT EMAIL ====================
/**
 * Send semester report email with PDF attachment
 * @param {Object} user - User object with email and fullName
 * @param {Object} reportData - Report data from generateUserSemesterReport
 * @param {Buffer} pdfBuffer - PDF buffer attachment
 * @param {Object} semester - Semester schedule object
 */
async function sendSemesterReportEmail(user, reportData, pdfBuffer, semester) {
  try {
    if (!user || !user.email) {
      console.log('❌ No email provided for user');
      return false;
    }

    const greeting = getFormalGreeting();
    const firstName = user.fullName?.split(' ')[0] || 'Member';
    const currentDateTime = getCurrentDateTime();
    const frontendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://zetechcatholicaction.com'
      : 'https://zetechcatholic.vercel.app';

    // Determine performance emoji and color
    const rate = reportData.stats.attendanceRate;
    let emoji = '📊';
    let color = '#f59e0b';
    let message = 'Keep pushing for better attendance next semester!';
    
    if (rate >= 80) {
      emoji = '🌟';
      color = '#10b981';
      message = 'Excellent work! Your dedication is inspiring! Keep it up!';
    } else if (rate >= 60) {
      emoji = '📈';
      color = '#3b82f6';
      message = 'Good effort! Try to attend even more meetings next semester.';
    } else if (rate >= 40) {
      emoji = '📊';
      color = '#f59e0b';
      message = 'Room for improvement. Aim to attend more meetings next semester.';
    } else {
      emoji = '📉';
      color = '#ef4444';
      message = 'Let\'s make next semester better! Set a goal to attend more meetings.';
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Semester Attendance Report - ZUCA</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            background: #f5f5f5;
            line-height: 1.5;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 8px;
            overflow: hidden;
          }
          .header {
            background: #2c5f2d;
            padding: 24px 30px;
            border-bottom: 3px solid #ffd700;
            text-align: center;
          }
          .logo {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            object-fit: cover;
          }
          .title {
            color: #ffffff;
            font-size: 20px;
            font-weight: 600;
            margin: 8px 0 0;
          }
          .subtitle {
            color: #ffd700;
            font-size: 14px;
            margin: 4px 0 0;
          }
          .content {
            padding: 30px;
          }
          .greeting {
            font-size: 16px;
            color: #333333;
            margin-bottom: 20px;
          }
          .report-header {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 6px;
          }
          .report-header strong {
            color: #2c5f2d;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin: 20px 0;
          }
          .stat-box {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 15px;
            text-align: center;
            border-radius: 6px;
          }
          .stat-number {
            font-size: 28px;
            font-weight: 700;
            color: #2c5f2d;
          }
          .stat-label {
            font-size: 12px;
            color: #6c757d;
            display: block;
            margin-top: 4px;
          }
          .stat-number.green { color: #10b981; }
          .stat-number.red { color: #ef4444; }
          .stat-number.blue { color: #3b82f6; }
          .stat-number.gold { color: #f59e0b; }
          
          .performance-box {
            background: ${color};
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px;
            margin: 20px 0;
          }
          .performance-emoji {
            font-size: 40px;
          }
          .performance-label {
            font-size: 20px;
            font-weight: 700;
            margin: 8px 0;
          }
          .performance-message {
            font-size: 14px;
            opacity: 0.9;
          }
          .button {
            display: inline-block;
            background: #2c5f2d;
            color: #ffffff;
            text-decoration: none;
            padding: 12px 25px;
            border-radius: 4px;
            font-weight: 500;
            margin: 15px 0;
          }
          .button:hover {
            background: #1e4420;
          }
          .footer {
            background: #f8f9fa;
            padding: 20px 30px;
            font-size: 11px;
            color: #6c757d;
            text-align: center;
            border-top: 1px solid #dee2e6;
          }
          hr {
            border: none;
            border-top: 1px solid #e9ecef;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${ZUCA_LOGO_URL}" alt="ZUCA Logo" class="logo">
            <div class="title">Zetech University Catholic Action</div>
            <div class="subtitle">Semester Attendance Report</div>
          </div>
          
          <div class="content">
            <div class="greeting">
              ${greeting}, ${firstName}.
            </div>
            
            <p>Your semester attendance report is ready. Here is your performance summary for <strong>${semester.title}</strong>.</p>
            
            <div class="report-header">
              <strong>📅 Semester Period:</strong> ${reportData.semester.period}
            </div>
            
            <div class="stats-grid">
              <div class="stat-box">
                <div class="stat-number">${reportData.stats.totalMeetings}</div>
                <span class="stat-label">Total Meetings</span>
              </div>
              <div class="stat-box">
                <div class="stat-number green">${reportData.stats.attendedMeetings}</div>
                <span class="stat-label">✅ Attended</span>
              </div>
              <div class="stat-box">
                <div class="stat-number red">${reportData.stats.missedMeetings}</div>
                <span class="stat-label">❌ Missed</span>
              </div>
              <div class="stat-box">
                <div class="stat-number blue">${reportData.stats.attendanceRate}%</div>
                <span class="stat-label">📊 Attendance Rate</span>
              </div>
            </div>
            
            <div class="performance-box">
              <div class="performance-emoji">${emoji}</div>
              <div class="performance-label">${reportData.stats.performance} Performance</div>
              <div class="performance-message">${message}</div>
            </div>
            
            <p style="font-size: 13px; color: #666; text-align: center;">
              A detailed PDF report with all your meeting records is attached to this email.
            </p>
            
            <div style="text-align: center;">
              <a href="${frontendUrl}/attendance/history" class="button">View Full History</a>
            </div>
            
            <hr>
            
            <p style="font-size: 12px; color: #6c757d;">
              If you have any questions about this report, please contact ZUCA administration.
            </p>
          </div>
          
          <div class="footer">
            ZUCA - Zetech University Catholic Action<br>
            ${currentDateTime}<br>
            This is an official communication from ZUCA.
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
ZUCA SEMESTER ATTENDANCE REPORT

${greeting}, ${firstName}.

Semester: ${semester.title}
Period: ${reportData.semester.period}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 ATTENDANCE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Meetings: ${reportData.stats.totalMeetings}
Attended: ${reportData.stats.attendedMeetings}
Missed: ${reportData.stats.missedMeetings}
Attendance Rate: ${reportData.stats.attendanceRate}%
Performance: ${reportData.stats.performance}

${message}

A detailed PDF report is attached to this email.

View your full history: ${frontendUrl}/attendance/history

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Zetech University Catholic Action (ZUCA)
${currentDateTime}
This is an official communication from ZUCA.
    `;

    // Create attachment for Brevo
    const attachment = {
      name: `semester_report_${semester.title.replace(/\s/g, '_')}.pdf`,
      content: pdfBuffer.toString('base64')
    };

    // Send via Brevo with attachment
    let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: user.email }];
    sendSmtpEmail.sender = { 
      email: process.env.EMAIL_USER || "zucaportal2025@gmail.com", 
      name: "ZUCA"
    };
    sendSmtpEmail.subject = `📊 Your Semester Attendance Report - ${semester.title}`;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.textContent = textContent;
    sendSmtpEmail.attachment = [attachment];
    
    const response = await brevoApi.sendTransacEmail(sendSmtpEmail);
    
    console.log(`✅ Semester report email sent to ${user.email}, MessageId: ${response.messageId}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Semester report email failed to ${user?.email}:`, error.message);
    return false;
  }
}

// Helper exports
function getTimeBasedGreeting() { return getFormalGreeting(); }
function getCurrentTime() { return getCurrentDateTime(); }
function getNotificationEmoji(type) { return ''; } // No emojis in formal mode

module.exports = {sendPasswordResetEmail,
  sendPersonalizedEmail,
  sendWelcomeEmail,
  sendVerificationEmail,
  sendBulkEmails,
  sendSms,
  sendSemesterReportEmail,
  getTimeBasedGreeting,
  getCurrentTime,
  getNotificationEmoji,
  isEmailEnabled,
  clearEmailSettingsCache};