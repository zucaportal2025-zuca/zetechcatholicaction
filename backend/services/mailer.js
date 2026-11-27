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

    console.log(`[BREVO] Attempting send → to=${to}, from=${sendSmtpEmail.sender.email}, subject="${subject}"`);

    const response = await brevoApi.sendTransacEmail(sendSmtpEmail);

    console.log(`[BREVO] ✅ Accepted:`, JSON.stringify(response));
    return true;
  } catch (error) {
    console.error(`[BREVO] ❌ FAILED for ${to}`);
    console.error(`[BREVO] Error message:`, error.message);
    if (error.response && error.response.body) {
      console.error(`[BREVO] Error body:`, JSON.stringify(error.response.body));
    }
    if (error.response && error.response.statusCode) {
      console.error(`[BREVO] Status code:`, error.response.statusCode);
    }
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

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTextToHtml(text) {
  if (!text) return '';

  const safeText = escapeHtml(text);
  const paragraphs = safeText.split(/\n\s*\n/);

  return paragraphs.map(paragraph => {
    const lines = paragraph.split('\n');
    let inList = false;
    let html = '';

    lines.forEach(line => {
      const trimmed = line.trim();

      if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
        if (!inList) {
          html += '<ul style="margin: 12px 0; padding-left: 22px; color: #3a3a3a; font-size: 14px; line-height: 1.7;">';
          inList = true;
        }
        html += `<li style="margin-bottom: 8px;">${trimmed.substring(1).trim()}</li>`;
      } else {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        if (trimmed !== '') {
          const formatted = trimmed.replace(/\*\*(.+?)\*\*/g, '<strong style="color: #111111;">$1</strong>');
          html += `<p style="margin: 0 0 14px 0; color: #3a3a3a; font-size: 14px; line-height: 1.7;">${formatted}</p>`;
        }
      }
    });

    if (inList) html += '</ul>';
    return html;
  }).join('');
}

function renderEmailLayout({ variant = 'newsletter', title, greeting, body, actionUrl, buttonText, preheader, data = {} }) {
  const currentYear = new Date().getFullYear();
  const safeTitle = escapeHtml(title || '');
  const safeGreeting = escapeHtml(greeting || '');
  const safePreheader = escapeHtml(preheader || safeTitle);
  const hiddenPreheader = `<div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #ffffff; opacity: 0;">${safePreheader}</div>`;

  const outerTable = (innerContent) => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>${safeTitle}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #eef0f2;">
      ${hiddenPreheader}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #eef0f2; padding: 24px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; font-family: Arial, Helvetica, sans-serif;">
              ${innerContent}
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // ==========================================
  // VARIANT 1: SECURITY (Verification / Reset)
  // ==========================================
  if (variant === 'security') {
    const code = escapeHtml(data.code || '');
    const label = escapeHtml(data.label || 'Verification code');

    return outerTable(`
      <tr>
        <td style="background-color: #ffffff; padding: 20px 28px 10px 28px; text-align: center; border-bottom: 1px solid #f0f0f0;">
          <img src="${ZUCA_LOGO_URL}" alt="ZUCA" width="36" height="36" style="display: inline-block; width: 36px; height: 36px; border-radius: 50%; border: 0;">
          <div style="font-size: 12px; font-weight: 700; color: #333333; margin-top: 6px; letter-spacing: 0.5px;">Zetech University Catholic Action</div>
        </td>
      </tr>
      <tr>
        <td style="padding: 28px 28px 24px 28px; text-align: center; background-color: #ffffff;">
          <div style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #8a8a8a; margin-bottom: 14px;">${label}</div>
          <div style="font-size: 42px; font-weight: 800; font-family: 'Courier New', Courier, monospace; letter-spacing: 10px; color: #111111; line-height: 1.2;">${code}</div>
          <div style="font-size: 12px; color: #8a8a8a; margin-top: 14px;">Valid for 15 minutes</div>
        </td>
      </tr>
      <tr>
        <td style="padding: 0 28px 28px 28px;">
          <p style="font-size: 15px; color: #222222; margin: 0 0 14px 0; line-height: 1.6;">${safeGreeting}</p>
          <div style="font-size: 14px; color: #4a4a4a; line-height: 1.7;">${formatTextToHtml(body)}</div>
        </td>
      </tr>
      <tr>
        <td style="border-top: 1px solid #eeeeee; padding: 18px 28px; text-align: center;">
          <p style="font-size: 11px; color: #9a9a9a; margin: 0 0 4px 0;">Zetech University Catholic Action (ZUCA)</p>
          <p style="font-size: 10px; color: #b5b5b5; margin: 0;">Automated security message. Do not reply.</p>
        </td>
      </tr>
    `);
  }

  // ==========================================
  // VARIANT 2: RECEIPT (Financial)
  // ==========================================
  if (variant === 'receipt') {
    const receiptNumber = escapeHtml(data.receiptNumber || 'N/A');
    const receiptDate = escapeHtml(data.date || '');
    const senderName = escapeHtml(data.senderName || 'N/A');
    const senderPhone = escapeHtml(data.senderPhone || '');
    const campaignTitle = escapeHtml(data.campaignTitle || 'Contribution');
    const jumuiaName = data.jumuiaName ? escapeHtml(data.jumuiaName) : '';
    const amount = escapeHtml(data.amount || '0');

    return outerTable(`
      <tr>
        <td style="background-color: #ffffff; padding: 20px 28px; border-bottom: 3px solid ${ZUCA_GREEN};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="vertical-align: middle;">
                <img src="${ZUCA_LOGO_URL}" alt="ZUCA" width="40" height="40" style="display: block; width: 40px; height: 40px; border-radius: 50%; border: 0;">
              </td>
              <td style="vertical-align: middle; padding-left: 12px;">
                <div style="font-size: 14px; font-weight: 700; color: #111111; line-height: 1.2;">Zetech University Catholic Action</div>
                <div style="font-size: 10px; color: ${ZUCA_GREEN}; margin-top: 2px; letter-spacing: 1px; text-transform: uppercase;">Official Payment Receipt</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="background-color: #1f1f1f; padding: 20px 28px;">
          <div style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #b8b8b8; margin-bottom: 6px;">Amount Paid</div>
          <div style="font-size: 34px; font-weight: 800; color: #ffffff; line-height: 1.1;">KES ${amount}</div>
          <div style="margin-top: 10px;">
            <span style="display: inline-block; background-color: ${ZUCA_GREEN}; color: #ffffff; font-size: 11px; font-weight: 700; letter-spacing: 1px; padding: 5px 12px; border-radius: 3px; text-transform: uppercase;">Completed</span>
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding: 20px 28px 8px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 14px;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #7a7a7a; width: 42%;">Receipt Number</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #111111; font-weight: 600;">${receiptNumber}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #7a7a7a;">Date</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #111111; font-weight: 600;">${receiptDate}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #7a7a7a;">Received From</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #111111; font-weight: 600;">${senderName}</td>
            </tr>
            ${senderPhone ? `<tr><td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #7a7a7a;">Phone Number</td><td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #111111; font-weight: 600;">${senderPhone}</td></tr>` : ''}
            ${jumuiaName ? `<tr><td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #7a7a7a;">Jumuia</td><td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #111111; font-weight: 600;">${jumuiaName}</td></tr>` : ''}
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #7a7a7a;">Campaign</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #111111; font-weight: 600;">${campaignTitle}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #7a7a7a;">Payment Method</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #111111; font-weight: 600;">M-PESA</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 20px 28px 32px 28px;">
          <p style="font-size: 12px; color: #8a8a8a; margin: 0; line-height: 1.6;">This is an official receipt from Zetech University Catholic Action. Retain this message for your records.</p>
        </td>
      </tr>
      <tr>
        <td style="background-color: #f7f7f7; padding: 16px 28px; text-align: center; border-top: 1px solid #ececec;">
          <p style="font-size: 11px; color: #9a9a9a; margin: 0;">Zetech University Catholic Action (ZUCA) &nbsp;|&nbsp; Copyright ${currentYear}</p>
        </td>
      </tr>
    `);
  }

  // ==========================================
  // VARIANT 3: ALERT (Notices / Reminders)
  // ==========================================
  if (variant === 'alert') {
    const alertType = data.alertType || 'warning';
    let accent = '#f59e0b';
    let badgeBg = '#fef3c7';
    let badgeText = '#92400e';
    let badgeLabel = 'Notice';

    if (alertType === 'error') {
      accent = '#dc2626';
      badgeBg = '#fee2e2';
      badgeText = '#991b1b';
      badgeLabel = 'Action Required';
    } else if (alertType === 'success') {
      accent = '#059669';
      badgeBg = '#d1fae5';
      badgeText = '#065f46';
      badgeLabel = 'Confirmed';
    }

    const button = actionUrl ? `
      <tr>
        <td style="padding: 0 28px 32px 28px; text-align: center;">
          <a href="${actionUrl}" style="display: inline-block; background-color: #111111; color: #ffffff; text-decoration: none; padding: 13px 30px; border-radius: 4px; font-weight: 600; font-size: 14px;">${escapeHtml(buttonText || 'View Details')}</a>
        </td>
      </tr>
    ` : '';

    return outerTable(`
      <tr>
        <td style="background-color: #ffffff; padding: 20px 28px; border-bottom: 1px solid #f0f0f0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="vertical-align: middle;">
                <img src="${ZUCA_LOGO_URL}" alt="ZUCA" width="32" height="32" style="display: block; width: 32px; height: 32px; border-radius: 50%; border: 0;">
              </td>
              <td style="vertical-align: middle; padding-left: 10px;">
                <div style="font-size: 13px; font-weight: 700; color: #111111;">Zetech University Catholic Action</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 24px 28px 16px 28px;">
          <span style="display: inline-block; background-color: ${badgeBg}; color: ${badgeText}; font-size: 11px; font-weight: 700; letter-spacing: 1px; padding: 5px 12px; border-radius: 3px; text-transform: uppercase;">${badgeLabel}</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 0 28px 8px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="width: 4px; background-color: ${accent}; border-radius: 2px;"></td>
              <td style="padding-left: 16px;">
                <h1 style="font-size: 20px; font-weight: 700; color: #111111; margin: 0 0 8px 0; line-height: 1.3;">${safeTitle}</h1>
                <p style="font-size: 14px; color: #5a5a5a; margin: 0;">${safeGreeting}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 16px 28px 8px 28px;">
          <div style="font-size: 14px; color: #3a3a3a; line-height: 1.7;">${formatTextToHtml(body)}</div>
        </td>
      </tr>
      ${button}
      <tr>
        <td style="background-color: #f7f7f7; padding: 16px 28px; text-align: center; border-top: 1px solid #ececec;">
          <p style="font-size: 11px; color: #9a9a9a; margin: 0 0 4px 0;">Zetech University Catholic Action (ZUCA)</p>
          <p style="font-size: 10px; color: #b5b5b5; margin: 0;">Automated notification. Do not reply.</p>
        </td>
      </tr>
    `);
  }

  // ==========================================
  // VARIANT 4: MEDIA (YouTube)
  // ==========================================
  if (variant === 'media') {
    const isLive = !!data.isLive;
    const thumbnail = escapeHtml(data.thumbnail || '');
    const videoTitle = escapeHtml(data.videoTitle || title || '');
    const buttonColor = isLive ? '#dc2626' : '#111111';

    const liveBadge = isLive
      ? `<div style="margin-top: 12px;"><span style="display: inline-block; background-color: #dc2626; color: #ffffff; font-size: 11px; font-weight: 700; letter-spacing: 1px; padding: 5px 14px; border-radius: 3px; text-transform: uppercase;">Live Now</span></div>`
      : '';

    return outerTable(`
      <tr>
        <td style="background-color: #111111; padding: 16px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="vertical-align: middle;">
                <img src="${ZUCA_LOGO_URL}" alt="ZUCA" width="32" height="32" style="display: block; width: 32px; height: 32px; border-radius: 50%; border: 0;">
              </td>
              <td style="vertical-align: middle; padding-left: 10px;">
                <div style="font-size: 13px; font-weight: 700; color: #ffffff;">Zetech University Catholic Action</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      ${thumbnail ? `
      <tr>
        <td style="padding: 0;">
          <img src="${thumbnail}" alt="${videoTitle}" width="600" style="display: block; width: 100%; max-width: 600px; height: auto; border: 0;">
        </td>
      </tr>
      ` : ''}
      <tr>
        <td style="padding: 24px 28px 8px 28px;">
          <div style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #8a8a8a; margin-bottom: 10px;">${isLive ? 'Live Stream' : 'New Video'}</div>
          <h1 style="font-size: 21px; font-weight: 700; color: #111111; margin: 0 0 10px 0; line-height: 1.3;">${videoTitle}</h1>
          ${liveBadge}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 28px 8px 28px;">
          <p style="font-size: 14px; color: #5a5a5a; margin: 0 0 14px 0;">${safeGreeting}</p>
          <div style="font-size: 14px; color: #3a3a3a; line-height: 1.7;">${formatTextToHtml(body)}</div>
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 28px 32px 28px; text-align: center;">
          <a href="${actionUrl}" style="display: inline-block; background-color: ${buttonColor}; color: #ffffff; text-decoration: none; padding: 13px 30px; border-radius: 4px; font-weight: 600; font-size: 14px;">${escapeHtml(buttonText || 'Watch Now')}</a>
        </td>
      </tr>
      <tr>
        <td style="background-color: #f7f7f7; padding: 16px 28px; text-align: center; border-top: 1px solid #ececec;">
          <p style="font-size: 11px; color: #9a9a9a; margin: 0;">Zetech University Catholic Action (ZUCA) &nbsp;|&nbsp; Copyright ${currentYear}</p>
        </td>
      </tr>
    `);
  }

  // ==========================================
  // VARIANT 5: NEWSLETTER (Announcements / Welcome)
  // ==========================================
  const amountBlock = data.amount ? `
    <tr>
      <td style="padding: 0 28px 8px 28px;">
        <div style="background-color: #f7f7f7; border: 1px solid #ececec; border-radius: 6px; padding: 18px; text-align: center;">
          <div style="font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: #8a8a8a; margin-bottom: 6px;">Amount</div>
          <div style="font-size: 26px; font-weight: 800; color: ${ZUCA_GREEN};">KES ${escapeHtml(data.amount.toLocaleString())}</div>
        </div>
      </td>
    </tr>
  ` : '';

  const button = actionUrl ? `
    <tr>
      <td style="padding: 8px 28px 32px 28px; text-align: center;">
        <a href="${actionUrl}" style="display: inline-block; background-color: ${ZUCA_GREEN}; color: #ffffff; text-decoration: none; padding: 13px 30px; border-radius: 4px; font-weight: 600; font-size: 14px;">${escapeHtml(buttonText || 'View Details')}</a>
      </td>
    </tr>
  ` : '';

  return outerTable(`
    <tr>
      <td style="background-color: ${ZUCA_GREEN}; padding: 24px 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-right: 14px;">
              <img src="${ZUCA_LOGO_URL}" alt="ZUCA" width="48" height="48" style="display: block; width: 48px; height: 48px; border-radius: 50%; border: 0;">
            </td>
            <td>
              <div style="font-size: 15px; font-weight: 700; color: #ffffff; line-height: 1.3;">Zetech University Catholic Action</div>
              <div style="font-size: 11px; color: ${ZUCA_GOLD}; margin-top: 3px; letter-spacing: 1px; text-transform: uppercase;">Official Communication</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="height: 3px; background-color: ${ZUCA_GOLD}; font-size: 0; line-height: 0;">&nbsp;</td>
    </tr>
    <tr>
      <td style="padding: 28px 28px 8px 28px;">
        <h1 style="font-size: 20px; font-weight: 700; color: #111111; margin: 0 0 12px 0; line-height: 1.3;">${safeTitle}</h1>
        <p style="font-size: 14px; color: #5a5a5a; margin: 0;">${safeGreeting}</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 16px 28px 8px 28px;">
        <div style="font-size: 14px; color: #3a3a3a; line-height: 1.7;">${formatTextToHtml(body)}</div>
      </td>
    </tr>
    ${amountBlock}
    ${button}
    <tr>
      <td style="background-color: #f7f7f7; padding: 18px 28px; text-align: center; border-top: 1px solid #ececec;">
        <p style="font-size: 11px; color: #9a9a9a; margin: 0 0 4px 0;">Zetech University Catholic Action (ZUCA) &nbsp;|&nbsp; Copyright ${currentYear}</p>
        <p style="font-size: 10px; color: #b5b5b5; margin: 0;">This is an automated message. Please do not reply directly to this email.</p>
      </td>
    </tr>
  `);
}

async function sendWelcomeEmail(user, membershipNumber) {
  try {
    const greeting = getFormalGreeting();
    const firstName = user.fullName?.split(' ')[0] || 'Member';
    const currentDateTime = getCurrentDateTime();
    const frontendUrl = process.env.NODE_ENV === 'production'
      ? 'https://zetechcatholicaction.com'
      : 'https://zetechcatholic.vercel.app';

    const body = `Thank you for registering with ZUCA. Your membership has been successfully created.

**Membership Number: ${membershipNumber}**

Please save this membership number. It is required for account verification and support inquiries. This number cannot be changed.

You can now access the ZUCA portal using your registered email address and password.

Available features include:
- View announcements and mass programs
- Make contributions and track pledges
- Access community discussions
- View event calendar and schedules`;

    const htmlContent = renderEmailLayout({
      variant: 'newsletter',
      title: 'Membership Confirmed',
      greeting: `${greeting}, ${firstName}.`,
      body: body,
      actionUrl: `${frontendUrl}/dashboard`,
      buttonText: 'Access Dashboard',
      preheader: `Your ZUCA membership number is ${membershipNumber}.`,
      data: {}
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
      greeting: `${greeting}, ${firstName}.`,
      body: 'Use the code above to verify your email address. If you did not request this verification, please ignore this email.',
      preheader: `Your ZUCA verification code is ${verificationCode}`,
      data: { code: verificationCode, label: 'Verification code' }
    });

    const textContent = `ZUCA EMAIL VERIFICATION

${greeting}, ${firstName}.

Verification Code: ${verificationCode}
Valid for 15 minutes.

Enter this code in the application to verify your email address.

If you did not request this verification, please ignore this email.

Zetech University Catholic Action (ZUCA)`;

    await sendViaBrevo(user.email, `(${verificationCode})Email Verification Code: `, htmlContent, textContent, "ZUCA");
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
      greeting: `${greeting}.`,
      body: 'A request was received to reset your ZUCA account password. Use the code above to proceed. If you did not request a reset, ignore this email and your password will remain unchanged.',
      preheader: `Your ZUCA password reset code is ${resetCode}`,
      data: { code: resetCode, label: 'Password reset code' }
    });

    const textContent = `ZUCA PASSWORD RESET

${greeting},

Password Reset Code: ${resetCode}
Valid for 15 minutes.

If you did not request this reset, please ignore this email.

Zetech University Catholic Action (ZUCA)`;

    await sendViaBrevo(email, `( ${resetCode}) Password Reset Code:`, htmlContent, textContent, "ZUCA");
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
        preheader: `Payment of KES ${(data.amount || 0).toLocaleString()} received. Receipt ${data.receiptNumber || ''}.`,
        data: {
          receiptNumber: data.receiptNumber || 'N/A',
          date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          senderName: data.payerName || 'N/A',
          senderPhone: data.payerPhone || '',
          jumuiaName: data.jumuiaName || '',
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
    let preheader = title;

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
      data.alertType = 'error';
      preheader = `Attendance notice: ${title}`;
    } else if (notificationType === 'attendance_checkin' || notificationType === 'attendance_thankyou') {
      variant = 'alert';
      buttonText = 'View Attendance History';
      data.alertType = 'success';
      preheader = `Check-in confirmed: ${title}`;
    } else if (notificationType === 'attendance_sheet_opened') {
      variant = 'alert';
      buttonText = 'Open Attendance';
      data.alertType = 'warning';
      preheader = `Attendance is now open: ${title}`;
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
        preheader: isLive ? `Live now: ${videoTitle}` : `New video: ${videoTitle}`,
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
      preheader: preheader,
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

    const bodyContent = `Your semester attendance report is ready for **${semester.title}**.

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
      preheader: `Your ${semester.title} attendance rate is ${reportData.stats.attendanceRate}%`,
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

// ================== RE-ENGAGEMENT EMAIL ==================
async function sendReengagementEmail(user) {
  try {
    const nameParts = (user.fullName || 'Member').trim().split(/\s+/);
    const firstName = nameParts[0] || 'Member';
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : firstName;

    const daysSince = Math.floor(
      (Date.now() - new Date(user.lastActive || user.createdAt).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const frontendUrl = process.env.NODE_ENV === 'production'
      ? 'https://www.zetechcatholicaction.com'
      : 'https://zetechcatholic.vercel.app';

    const message = [
      `Hi ${firstName} 👋, I hope you're doing well.`,
      ``,
      `I noticed it has been about ${daysSince} days since you last visited the ZUCA Portal.`,
      `Having trouble logging in or forgot your password? Just reply to this message or reach out to any ZUCA leader to get you sorted right away.`,
      ``,
      `We would love to see you back. Here is what you have been missing:`,
      `- Upcoming Wednesday 4:30 PM Mass updates, choir schedules, and practices (where we usually record attendance)`,
      `- Announcements from the choir forum`,
      `- New lyrics in the ZUCA Hymn Book, Prayer Book, and updates in the Gallery & Calendar`,
      `- Maybe we even missed wishing you a happy birthday! Update your details at ${frontendUrl}/profile`,
      ``,
      `Log in here: ${frontendUrl}/login`,
      ``,
      `Anyway, don't get lost for too long ${lastName}, keep checking in to see what's up 😊`,
      ``,
      `Nice times ahead,`,
      `Regards,`,
      `ZUCA LEADERSHIP FORUM`
    ].join('\n');

    const htmlContent = renderEmailLayout({
      variant: 'newsletter',
      title: 'We Miss You at ZUCA Portal',
      greeting: '', // Left blank because your message already opens with "Hi ${firstName}"
      body: message,
      actionUrl: `${frontendUrl}/login`,
      buttonText: 'Open ZUCA Portal',
      preheader: `It has been about ${daysSince} days since your last visit to ZUCA Portal.`,
      data: {}
    });

    const textContent = message;

    await sendViaBrevo(
      user.email,
      `${firstName}, we miss you at ZUCA Portal`,
      htmlContent,
      textContent,
      'ZUCA'
    );

    return true;
  } catch (error) {
    console.error('sendReengagementEmail error:', error.message);
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
  sendReengagementEmail,
  getTimeBasedGreeting,
  getCurrentTime,
  getNotificationEmoji,
  isEmailEnabled,
  clearEmailSettingsCache
};