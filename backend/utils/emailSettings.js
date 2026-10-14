// utils/emailSettings.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Cache settings to reduce DB calls
let settingsCache = {};
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Check if a specific email type is enabled
 * @param {string} emailType - The type of email (e.g., 'event_7days', 'user_welcome')
 * @returns {Promise<boolean>}
 */
async function isEmailEnabled(emailType) {
  try {
    // Check cache first
    const now = Date.now();
    if (settingsCache[emailType] !== undefined && (now - cacheTimestamp) < CACHE_TTL) {
      return settingsCache[emailType];
    }

    // Query database
    const setting = await prisma.emailSetting.findUnique({
      where: { type: emailType },
      select: { enabled: true }
    });

    // Default to true if setting doesn't exist (so emails still send)
    const enabled = setting ? setting.enabled : true;
    
    // Update cache
    settingsCache[emailType] = enabled;
    if (Object.keys(settingsCache).length > 100) {
      settingsCache = {};
    }
    cacheTimestamp = now;

    return enabled;

  } catch (error) {
    console.error(`Error checking email setting for ${emailType}:`, error);
    return true; // Default to sending on error
  }
}

/**
 * Clear the settings cache (useful after admin updates)
 */
function clearEmailSettingsCache() {
  settingsCache = {};
  cacheTimestamp = 0;
}

/**
 * Check multiple email settings at once
 */
async function areEmailsEnabled(emailTypes) {
  try {
    const settings = await prisma.emailSetting.findMany({
      where: {
        type: { in: emailTypes }
      },
      select: {
        type: true,
        enabled: true
      }
    });

    const result = {};
    settings.forEach(s => {
      result[s.type] = s.enabled;
    });

    // For any missing settings, default to true
    emailTypes.forEach(type => {
      if (result[type] === undefined) {
        result[type] = true;
      }
    });

    return result;
  } catch (error) {
    console.error('Error checking multiple email settings:', error);
    const result = {};
    emailTypes.forEach(type => {
      result[type] = true;
    });
    return result;
  }
}

/**
 * Wrap an email sending function with a guard
 * @param {string} emailType - The email type to check
 * @param {Function} sendFunction - The function that sends the email
 * @param {any} ...args - Arguments to pass to sendFunction
 * @returns {Promise<{sent: boolean, reason?: string, result?: any}>}
 */
async function sendWithGuard(emailType, sendFunction, ...args) {
  try {
    const enabled = await isEmailEnabled(emailType);
    if (!enabled) {
      console.log(`📧 Email ${emailType} is disabled, skipping send`);
      return { sent: false, reason: 'disabled' };
    }
    
    const result = await sendFunction(...args);
    return { sent: true, result };
  } catch (error) {
    console.error(`Error sending email ${emailType}:`, error);
    throw error;
  }
}

module.exports = {
  isEmailEnabled,
  areEmailsEnabled,
  clearEmailSettingsCache,
  sendWithGuard
};
