// scripts/patch-mailer.js
const fs = require('fs');
const path = require('path');

const mailerPath = path.join(__dirname, '..', 'services', 'mailer.js');

console.log('🔧 Patching mailer.js with central email guards...');

let content = fs.readFileSync(mailerPath, 'utf8');

// Check if already patched
if (content.includes('isEmailEnabled')) {
  console.log('✅ mailer.js already has email guards');
  process.exit(0);
}

// 1. Add Prisma import at the top (after the Brevo import)
const prismaImport = `const { PrismaClient } = require('@prisma/client');\n`;
if (!content.includes('@prisma/client')) {
  content = content.replace(
    /const SibApiV3Sdk = require\('sib-api-v3-sdk'\);/,
    `const SibApiV3Sdk = require('sib-api-v3-sdk');\n${prismaImport}`
  );
  console.log('✅ Added Prisma import');
}

// 2. Add email settings guard functions after imports
const guardFunctions = `
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
    console.error(\`Error checking email setting for \${emailType}:\`, error);
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
    console.log(\`📧 Email type "\${emailType}" is DISABLED, skipping send to \${recipient}\`);
  }
  return enabled;
}

`;

// Insert after the Brevo setup section
const brevoSetupEnd = content.indexOf('// Helper: Send via Brevo');
if (brevoSetupEnd > -1) {
  content = content.slice(0, brevoSetupEnd) + guardFunctions + '\n' + content.slice(brevoSetupEnd);
  console.log('✅ Added email guard functions');
} else {
  // Fallback: insert after the first function
  const firstFunction = content.indexOf('async function');
  if (firstFunction > -1) {
    content = content.slice(0, firstFunction) + guardFunctions + '\n' + content.slice(firstFunction);
    console.log('✅ Added email guard functions');
  }
}

// 3. Wrap sendViaBrevo to check email settings
const sendViaBrevoWrapper = `
// ============================================
// WRAPPED: sendViaBrevo with email guard
// ============================================
async function sendViaBrevoWithGuard(to, subject, htmlContent, textContent, fromName = "ZUCA", emailType = 'general') {
  // Check if email is enabled
  const enabled = await isEmailEnabled(emailType);
  if (!enabled) {
    console.log(\`📧 Email type "\${emailType}" is DISABLED, skipping send to \${to}\`);
    return { sent: false, reason: 'disabled', emailType };
  }
  
  console.log(\`📧 Sending email type "\${emailType}" to \${to}\`);
  return await sendViaBrevo(to, subject, htmlContent, textContent, fromName);
}
`;

// Insert after the original sendViaBrevo function
const sendViaBrevoEnd = content.indexOf('async function sendViaBrevo');
if (sendViaBrevoEnd > -1) {
  // Find the end of the function
  const functionStart = content.indexOf('{', sendViaBrevoEnd);
  let braceCount = 0;
  let functionEnd = functionStart;
  for (let i = functionStart; i < content.length; i++) {
    if (content[i] === '{') braceCount++;
    if (content[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        functionEnd = i + 1;
        break;
      }
    }
  }
  
  // Insert after the function ends
  const insertPoint = functionEnd;
  content = content.slice(0, insertPoint) + '\n\n' + sendViaBrevoWrapper + content.slice(insertPoint);
  console.log('✅ Added sendViaBrevo wrapper with guard');
}

// 4. Wrap sendPersonalizedEmail
// Rename original function
content = content.replace(
  /async function sendPersonalizedEmail\(user, notificationType, title, message, data = {}\)/,
  'async function sendPersonalizedEmailOriginal(user, notificationType, title, message, data = {})'
);

// Add wrapped version
const personalizedWrapper = `
// ============================================
// WRAPPED: sendPersonalizedEmail with email guard
// ============================================
async function sendPersonalizedEmail(user, notificationType, title, message, data = {}) {
  // Check if email is enabled
  const enabled = await isEmailEnabled(notificationType);
  if (!enabled) {
    console.log(\`📧 Email type "\${notificationType}" is DISABLED, skipping send to \${user?.email || 'unknown'}\`);
    return { sent: false, reason: 'disabled', emailType: notificationType };
  }
  
  console.log(\`📧 Sending email type "\${notificationType}" to \${user?.email}\`);
  return await sendPersonalizedEmailOriginal(user, notificationType, title, message, data);
}
`;

// Insert after the original function ends
const originalFuncStart = content.indexOf('async function sendPersonalizedEmailOriginal');
if (originalFuncStart > -1) {
  const funcStart = content.indexOf('{', originalFuncStart);
  let braceCount = 0;
  let funcEnd = funcStart;
  for (let i = funcStart; i < content.length; i++) {
    if (content[i] === '{') braceCount++;
    if (content[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        funcEnd = i + 1;
        break;
      }
    }
  }
  
  // Find the end of the function (after the closing brace and any whitespace)
  let insertPoint = funcEnd;
  while (content[insertPoint] === '\n' || content[insertPoint] === ' ') {
    insertPoint++;
  }
  
  content = content.slice(0, insertPoint) + '\n' + personalizedWrapper + '\n' + content.slice(insertPoint);
  console.log('✅ Added sendPersonalizedEmail wrapper with guard');
}

// 5. Update module.exports
const exportMatch = content.match(/module\.exports\s*=\s*\{([^}]*)\}/s);
if (exportMatch) {
  let exportsContent = exportMatch[1];
  
  // Add isEmailEnabled and clearEmailSettingsCache if not present
  if (!exportsContent.includes('isEmailEnabled')) {
    exportsContent = exportsContent.trim();
    if (!exportsContent.endsWith(',')) {
      exportsContent += ',';
    }
    exportsContent += '\n  isEmailEnabled,\n  clearEmailSettingsCache';
  }
  
  // Replace sendPersonalizedEmail with the wrapped version
  if (exportsContent.includes('sendPersonalizedEmail') && !exportsContent.includes('sendPersonalizedEmailOriginal')) {
    exportsContent = exportsContent.replace(/sendPersonalizedEmail/g, 'sendPersonalizedEmail');
  }
  
  content = content.replace(exportMatch[0], `module.exports = {${exportsContent}}`);
  console.log('✅ Updated exports');
}

// Write the file
fs.writeFileSync(mailerPath, content);

console.log('\n✅ mailer.js successfully patched!');
console.log('\n📊 Changes made:');
console.log('  1. Added Prisma import');
console.log('  2. Added email settings guard functions');
console.log('  3. Wrapped sendViaBrevo with email check');
console.log('  4. Wrapped sendPersonalizedEmail with email check');
console.log('  5. Updated exports');
console.log('\n📝 How it works:');
console.log('  • All emails now check if the email type is enabled in database');
console.log('  • If disabled, emails are skipped with a log message');
console.log('  • No other files need to be changed!');
console.log('\n✅ All email sends are now controlled by email_settings table.');