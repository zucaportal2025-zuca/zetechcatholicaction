// services/mailer.js
const SibApiV3Sdk = require('sib-api-v3-sdk');
const { PrismaClient } = require('@prisma/client');

const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;
const brevoApi = new SibApiV3Sdk.TransactionalEmailsApi();

const prisma = new PrismaClient();

let emailSettingsCache = {};
let cacheTimestamp = 0;
const CACHE_TTL = 60000;

const ZUCA_LOGO_URL = "https://dcxuxitorpfujfbtyhhn.supabase.co/storage/v1/object/public/profiles/profile_c2dd6c54-4576-41b1-a85d-1af90d88254a_1777067617594.jpg";
const ZUCA_GREEN = "#2c5f2d";
const ZUCA_GOLD = "#ffd700";

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
    return true;
  }
}

function clearEmailSettingsCache() {
  emailSettingsCache = {};
  cacheTimestamp = 0;
}

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

    const response = await brevoApi.sendTransacEmail(sendSmtpEmail);
    return true;
  } catch (error) {
    return false;
  }
}

function getFormalGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

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

function formatTextToHtml(text) {
  if (!text) return '';

  const paragraphs = text.split(/\n\s*\n/);

  return paragraphs.map(p => {
    const lines = p.split('\n');
    let inList = false;
    let html = '';

    lines.forEach(line => {
      const trimmed = line.trim();

      if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
        if (!inList) {
          html += '<ul style="margin: 12px 0; padding-left: 24px; color: #444444;">';
          inList = true;
        }
        html += `<li style="margin-bottom: 8px;">${trimmed.substring(1).trim()}</li>`;
      } else {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        if (trimmed !== '') {
          html += `<p style="margin: 0 0 14px 0; color: #444444;">${trimmed}</p>`;
        }
      }
    });

    if (inList) html += '</ul>';
    return html;
  }).join('');
}

function renderEmailLayout({ variant = 'newsletter', title, greeting, body, actionUrl, buttonText, data = {} }) {
  const currentYear = new Date().getFullYear();

  const header = `
    <div style="background-color: ${ZUCA_GREEN}; padding: 24px 30px; border-bottom: 3px solid ${ZUCA_GOLD};">
      <img src="${ZUCA_LOGO_URL}" alt="ZUCA Logo" style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover; display: block;">
      <div style="color: #ffffff; font-size: 17px; font-weight: 600; margin-top: 10px;">Zetech University Catholic Action</div>
    </div>
  `;

  const footer = `
    <div style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
      <p style="font-size: 12px; color: #6c757d; margin: 0 0 6px 0;">
        Zetech University Catholic Action (ZUCA)<br>
        Copyright ${currentYear} ZUCA. All rights reserved.
      </p>
      <p style="font-size: 11px; color: #adb5bd; margin: 0;">
        This is an automated message. Please do not reply directly to this email.
      </p>
    </div>
  `;

  let content = '';
  let wrapperStyle = 'max-width: 600px; margin: 0 auto; background: #ffffff; font-family: Arial, Helvetica, sans-serif; line-height: 1.6;';

  if (variant === 'security') {
    content = `
      <div style="padding: 40px 30px; text-align: center;">
        <h2 style="color: #333333; margin-top: 0; font-size: 22px; font-weight: 600;">${title}</h2>
        <p style="color: #555555; font-size: 15px; margin: 16px 0;">${greeting}</p>
        <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 24px; margin: 30px 0;">
          <strong style="font-size: 12px; color: #666666; letter-spacing: 1px; text-transform: uppercase;">Your Code</strong>
          <div style="font-size: 36px; font-weight: 700; font-family: Courier New, monospace; color: ${ZUCA_GREEN}; letter-spacing: 6px; margin: 16px 0;">${data.code}</div>
          <div style="font-size: 12px; color: #888888;">Valid for 15 minutes</div>
        </div>
        <p style="font-size: 13px; color: #888888; margin-top: 30px;">If you did not request this, please ignore this email.</p>
      </div>
    `;
  } else if (variant === 'receipt') {
    content = `
      <div style="padding: 30px;">
        <h2 style="color: ${ZUCA_GREEN}; border-bottom: 2px solid ${ZUCA_GREEN}; padding-bottom: 10px; margin-top: 0; font-size: 18px; font-weight: 600;">OFFICIAL PAYMENT RECEIPT</h2>

        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px;">
          <tr><td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #666666; width: 40%;">Receipt Number:</td><td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; font-weight: 600; color: #333333;">${data.receiptNumber}</td></tr>
          <tr><td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #666666;">Date:</td><td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; font-weight: 600; color: #333333;">${data.date}</td></tr>
          <tr><td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #666666;">Received From:</td><td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; font-weight: 600; color: #333333;">${data.senderName}</td></tr>
          <tr><td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #666666;">Campaign:</td><td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; font-weight: 600; color: #333333;">${data.campaignTitle}</td></tr>
          <tr><td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #666666;">Method:</td><td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; font-weight: 600; color: #333333;">M-PESA</td></tr>
          <tr><td style="padding: 16px 0; color: #666666;">Amount:</td><td style="padding: 16px 0; font-weight: 700; font-size: 20px; color: ${ZUCA_GREEN};">KES ${data.amount}</td></tr>
        </table>

        <div style="margin-top: 30px; text-align: center; border-top: 1px solid #eeeeee; padding-top: 20px;">
          <p style="font-size: 12px; color: #888888; margin: 0;">This is an official receipt from Zetech University Catholic Action.</p>
        </div>
      </div>
    `;
  } else if (variant === 'alert') {
    const borderColor = data.alertType === 'error' ? '#ef4444' : data.alertType === 'success' ? '#10b981' : '#f59e0b';
    content = `
      <div style="padding: 30px;">
        <div style="border-left: 4px solid ${borderColor}; background: #f8f9fa; padding: 20px; margin-bottom: 24px;">
          <h2 style="color: #333333; margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">${title}</h2>
          <p style="color: #555555; margin: 0; font-size: 14px;">${greeting}</p>
        </div>
        <div style="font-size: 14px; color: #444444; line-height: 1.6;">
          ${formatTextToHtml(body)}
        </div>
        ${actionUrl ? `
        <div style="text-align: center; margin-top: 30px;">
          <a href="${actionUrl}" style="display: inline-block; background: ${ZUCA_GREEN}; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 4px; font-weight: 600; font-size: 14px;">${buttonText || 'View Details'}</a>
        </div>
        ` : ''}
      </div>
    `;
  } else if (variant === 'media') {
    content = `
      <div style="padding: 30px;">
        <h2 style="color: #333333; margin-top: 0; font-size: 20px; font-weight: 600;">${title}</h2>
        <p style="color: #555555; font-size: 14px; margin: 12px 0 20px 0;">${greeting}</p>
        <div style="text-align: center; margin: 20px 0;">
          <img src="${data.thumbnail}" alt="Video Thumbnail" style="max-width: 100%; border-radius: 6px; border: 1px solid #e9ecef;">
          <p style="font-size: 14px; color: #444444; margin-top: 12px; font-weight: 600;">${data.videoTitle}</p>
          ${data.isLive ? '<div style="background: #ef4444; color: #ffffff; display: inline-block; padding: 4px 14px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-top: 8px;">LIVE NOW</div>' : ''}
        </div>
        <div style="text-align: center; margin-top: 24px;">
          <a href="${actionUrl}" style="display: inline-block; background: ${data.isLive ? '#ef4444' : ZUCA_GREEN}; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 4px; font-weight: 600; font-size: 14px;">${buttonText}</a>
        </div>
      </div>
    `;
  } else {
    content = `
      <div style="padding: 30px;">
        <h2 style="color: ${ZUCA_GREEN}; border-bottom: 2px solid #e9ecef; padding-bottom: 12px; margin-top: 0; font-size: 20px; font-weight: 600;">${title}</h2>
        <p style="color: #555555; font-size: 15px; margin: 16px 0;">${greeting}</p>
        <div style="font-size: 14px; color: #444444; line-height: 1.6;">
          ${formatTextToHtml(body)}
        </div>
        ${data.amount ? `
        <div style="background: #f8f9fa; padding: 20px; margin: 24px 0; text-align: center; border-radius: 6px; border: 1px solid #dee2e6;">
          <strong style="font-size: 12px; color: #666666; letter-spacing: 1px; text-transform: uppercase;">Amount</strong>
          <div style="font-size: 24px; font-weight: 700; color: ${ZUCA_GREEN}; margin-top: 8px;">KES ${data.amount.toLocaleString()}</div>
        </div>
        ` : ''}
        ${actionUrl ? `
        <div style="text-align: center; margin-top: 30px;">
          <a href="${actionUrl}" style="display: inline-block; background: ${ZUCA_GREEN}; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 4px; font-weight: 600; font-size: 14px;">${buttonText || 'View Details'}</a>
        </div>
        ` : ''}
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 20px 0;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="${wrapperStyle}">
              <tr><td>${header}</td></tr>
              <tr><td>${content}</td></tr>
              <tr><td>${footer}</td></tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

async function sendWelcomeEmail(user, membershipNumber) {
  try {
    const greeting = getFormalGreeting();
    const firstName = user.fullName?.split(' ')[0] || 'Member';
    const currentDateTime = getCurrentDateTime();
    const frontendUrl = process.env.NODE_ENV === 'production'
      ? 'https://zetechcatholicaction.com'
      : 'https://zetechcatholic.vercel.app';

    const htmlContent = renderEmailLayout({
      variant: 'newsletter',
      title: 'Membership Confirmed',
      greeting: `${greeting}, ${firstName}.`,
      body: `Thank you for registering with ZUCA. Your membership has been successfully created.

Your official ZUCA membership number is ${membershipNumber}.

Please save this membership number. It is required for account verification and support inquiries. This number cannot be changed.

You can now access the ZUCA portal using your registered email address and password.

Available features include:
- View announcements and mass programs
- Make contributions and track pledges
- Access community discussions
- View event calendar and schedules`,
      actionUrl: `${frontendUrl}/dashboard`,
      buttonText: 'Access Dashboard',
      data: { amount: null }
    });

    const textContent = `ZUCA MEMBERSHIP CONFIRMATION

${greeting}, ${firstName}.

Thank you for registering with ZUCA. Your membership has been successfully created.

MEMBERSHIP NUMBER: ${membershipNumber}

Please save this membership number. It is required for account verification.

Access your dashboard: ${frontendUrl}/dashboard

Available features:
- View announcements and mass programs
- Make contributions and track pledges
- Access community discussions
- View event calendar and schedules

Zetech University Catholic Action (ZUCA)
${currentDateTime}`;

    await sendViaBrevo(user.email, `ZUCA Membership Confirmation - ${membershipNumber}`, htmlContent, textContent, "ZUCA");
    return true;
  } catch (error) {
    return false;
  }
}

async function sendVerificationEmail(user, verificationCode) {
  try {
    const greeting = getFormalGreeting();
    const firstName = user.fullName?.split(' ')[0] || 'Member';

    const htmlContent = renderEmailLayout({
      variant: 'security',
      title: 'Email Verification',
      greeting: `${greeting}, ${firstName}. Please verify your email address using the code below.`,
      data: { code: verificationCode }
    });

    const textContent = `ZUCA EMAIL VERIFICATION

${greeting}, ${firstName}.

Verification Code: ${verificationCode}
Valid for 15 minutes.

Enter this code in the application to verify your email address.

If you did not request this verification, please ignore this email.

Zetech University Catholic Action (ZUCA)`;

    await sendViaBrevo(user.email, `[ZUCA] Email Verification Code: ${verificationCode}`, htmlContent, textContent, "ZUCA");
    return true;
  } catch (error) {
    return false;
  }
}

async function sendPasswordResetEmail(email, resetCode) {
  try {
    const greeting = getFormalGreeting();

    const htmlContent = renderEmailLayout({
      variant: 'security',
      title: 'Password Reset',
      greeting: `${greeting}. A request was received to reset your ZUCA account password. Use the code below to proceed.`,
      data: { code: resetCode }
    });

    const textContent = `ZUCA PASSWORD RESET

${greeting},

Password Reset Code: ${resetCode}
Valid for 15 minutes.

If you did not request this reset, please ignore this email.

Zetech University Catholic Action (ZUCA)`;

    await sendViaBrevo(email, `[ZUCA] Password Reset Code: ${resetCode}`, htmlContent, textContent, "ZUCA");
    return true;
  } catch (error) {
    return false;
  }
}

async function sendPersonalizedEmailOriginal(user, notificationType, title, message, data = {}) {
  try {
    const greeting = getFormalGreeting();
    const currentDateTime = getCurrentDateTime();
    const firstName = user.fullName?.split(' ')[0] || 'Member';
    const frontendUrl = process.env.NODE_ENV === 'production'
      ? 'https://zetechcatholicaction.com'
      : 'https://zetechcatholic.vercel.app';

    if (notificationType === 'payment_receipt') {
      const htmlContent = renderEmailLayout({
        variant: 'receipt',
        title: 'Payment Receipt',
        greeting: '',
        data: {
          receiptNumber: data.receiptNumber || 'N/A',
          date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          senderName: data.payerName || 'N/A',
          campaignTitle: data.campaignTitle || data.campaign || 'Contribution',
          amount: (data.amount || 0).toLocaleString()
        }
      });

      const textContent = `ZUCA PAYMENT RECEIPT

Receipt Number: ${data.receiptNumber || 'N/A'}
Amount: KES ${(data.amount || 0).toLocaleString()}
Campaign: ${data.campaignTitle || data.campaign || 'Contribution'}
Payer: ${data.payerName || 'N/A'}

This is an official receipt from Zetech University Catholic Action.`;

      await sendViaBrevo(
        user.email,
        `ZUCA Payment Receipt - ${data.receiptNumber || 'Payment Confirmation'}`,
        htmlContent,
        textContent,
        "ZUCA"
      );
      return true;
    }

    let actionUrl = `${frontendUrl}/dashboard`;
    let buttonText = 'View Details';
    let variant = 'newsletter';

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
      'attendance_checkin': '/attendance/history',
      'attendance_missed': '/attendance/history',
      'attendance_reminder': '/attendance/history',
      'attendance_sheet_opened': '/attendance',
      'attendance_thankyou': '/attendance/history',
      'attendance_summary': '/attendance',
      'attendance_admin_report': '/attendance',
      'attendance_automatic_reminder': '/attendance/history',
      'youtube_new_video': '/youtube',
      'youtube_live': '/youtube'
    };

    if (urlMap[notificationType]) {
      actionUrl = `${frontendUrl}${urlMap[notificationType]}`;
    }

    if (notificationType === 'attendance_missed' || notificationType === 'attendance_reminder' || notificationType === 'attendance_automatic_reminder') {
      variant = 'alert';
      buttonText = 'View Attendance History';
      data.alertType = 'warning';
    } else if (notificationType === 'attendance_checkin' || notificationType === 'attendance_thankyou') {
      variant = 'alert';
      buttonText = 'View Attendance History';
      data.alertType = 'success';
    }

    if (notificationType === 'youtube_new_video' || notificationType === 'youtube_live') {
      const isLive = notificationType === 'youtube_live';
      const videoUrl = data.videoUrl || `https://www.youtube.com/watch?v=${data.videoId}`;
      const thumbnail = data.videoThumbnail || `https://img.youtube.com/vi/${data.videoId}/hqdefault.jpg`;
      const videoTitle = data.videoTitle || title;

      const htmlContent = renderEmailLayout({
        variant: 'media',
        title: title,
        greeting: `${greeting}, ${firstName}.`,
        body: message,
        actionUrl: videoUrl,
        buttonText: isLive ? 'Watch Live Now' : 'Watch on YouTube',
        data: { thumbnail, videoTitle, isLive, videoId: data.videoId }
      });

      const textContent = `${title}

${greeting}, ${firstName}.

${message}

${isLive ? 'LIVE NOW' : 'New Video'}
Title: ${videoTitle}
Video ID: ${data.videoId}
Watch: ${videoUrl}

Zetech University Catholic Action (ZUCA)
${currentDateTime}`;

      await sendViaBrevo(user.email, `${isLive ? '[LIVE]' : '[VIDEO]'} ${title}`, htmlContent, textContent, "ZUCA");
      return true;
    }

    const htmlContent = renderEmailLayout({
      variant: variant,
      title: title,
      greeting: `${greeting}, ${firstName}.`,
      body: message,
      actionUrl: actionUrl,
      buttonText: buttonText,
      data: data
    });

    const textContent = `${title}

${greeting}, ${firstName}.

${message}

${data.amount ? `Amount: KES ${data.amount.toLocaleString()}` : ''}
${data.receiptNumber ? `Receipt: ${data.receiptNumber}` : ''}

View details: ${actionUrl}

Zetech University Catholic Action (ZUCA)
${currentDateTime}`;

    await sendViaBrevo(user.email, `ZUCA: ${title}`, htmlContent, textContent, "ZUCA");
    return true;
  } catch (error) {
    return false;
  }
}

async function sendPersonalizedEmail(user, notificationType, title, message, data = {}) {
  const enabled = await isEmailEnabled(notificationType);
  if (!enabled) {
    return { sent: false, reason: 'disabled', emailType: notificationType };
  }

  return await sendPersonalizedEmailOriginal(user, notificationType, title, message, data);
}

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
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
}

async function sendBulkEmails(users, notificationType, title, message, data = {}) {
  if (!users || users.length === 0) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  const batchSize = 50;

  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);

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

  return { sent, failed };
}

async function sendSemesterReportEmail(user, reportData, pdfBuffer, semester) {
  try {
    if (!user || !user.email) {
      return false;
    }

    const greeting = getFormalGreeting();
    const firstName = user.fullName?.split(' ')[0] || 'Member';
    const currentDateTime = getCurrentDateTime();
    const frontendUrl = process.env.NODE_ENV === 'production'
      ? 'https://zetechcatholicaction.com'
      : 'https://zetechcatholic.vercel.app';

    const rate = reportData.stats.attendanceRate;
    let alertType = 'warning';
    let performanceMessage = 'Keep pushing for better attendance next semester.';

    if (rate >= 80) {
      alertType = 'success';
      performanceMessage = 'Excellent work. Your dedication is inspiring. Keep it up.';
    } else if (rate >= 60) {
      alertType = 'success';
      performanceMessage = 'Good effort. Try to attend even more meetings next semester.';
    } else if (rate >= 40) {
      alertType = 'warning';
      performanceMessage = 'Room for improvement. Aim to attend more meetings next semester.';
    } else {
      alertType = 'error';
      performanceMessage = 'Let us make next semester better. Set a goal to attend more meetings.';
    }

    const bodyContent = `Your semester attendance report is ready for ${semester.title}.

Semester Period: ${reportData.semester.period}

Total Meetings: ${reportData.stats.totalMeetings}
Attended: ${reportData.stats.attendedMeetings}
Missed: ${reportData.stats.missedMeetings}
Attendance Rate: ${reportData.stats.attendanceRate}%
Performance: ${reportData.stats.performance}

${performanceMessage}

A detailed PDF report with all your meeting records is attached to this email.`;

    const htmlContent = renderEmailLayout({
      variant: 'alert',
      title: 'Semester Attendance Report',
      greeting: `${greeting}, ${firstName}.`,
      body: bodyContent,
      actionUrl: `${frontendUrl}/attendance/history`,
      buttonText: 'View Full History',
      data: { alertType }
    });

    const textContent = `ZUCA SEMESTER ATTENDANCE REPORT

${greeting}, ${firstName}.

Semester: ${semester.title}
Period: ${reportData.semester.period}

ATTENDANCE SUMMARY
Total Meetings: ${reportData.stats.totalMeetings}
Attended: ${reportData.stats.attendedMeetings}
Missed: ${reportData.stats.missedMeetings}
Attendance Rate: ${reportData.stats.attendanceRate}%
Performance: ${reportData.stats.performance}

${performanceMessage}

A detailed PDF report is attached to this email.

View your full history: ${frontendUrl}/attendance/history

Zetech University Catholic Action (ZUCA)
${currentDateTime}`;

    const attachment = {
      name: `semester_report_${semester.title.replace(/\s/g, '_')}.pdf`,
      content: pdfBuffer.toString('base64')
    };

    let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: user.email }];
    sendSmtpEmail.sender = {
      email: process.env.EMAIL_USER || "zucaportal2025@gmail.com",
      name: "ZUCA"
    };
    sendSmtpEmail.subject = `Your Semester Attendance Report - ${semester.title}`;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.textContent = textContent;
    sendSmtpEmail.attachment = [attachment];

    const response = await brevoApi.sendTransacEmail(sendSmtpEmail);
    return true;

  } catch (error) {
    return false;
  }
}

function getTimeBasedGreeting() { return getFormalGreeting(); }
function getCurrentTime() { return getCurrentDateTime(); }
function getNotificationEmoji() { return ''; }

module.exports = {
  sendPasswordResetEmail,
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
  clearEmailSettingsCache
};