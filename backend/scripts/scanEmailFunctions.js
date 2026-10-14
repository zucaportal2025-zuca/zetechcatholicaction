// backend/scripts/scanEmailFunctions.js
// Run: node scripts/scanEmailFunctions.js

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
  reset: '\x1b[0m'
};

// Directories to scan
const directories = [
  './routes',
  './services',
  './controllers',
  './middleware',
  './utils'
];

// Email sending patterns to search for
const emailPatterns = [
  // Direct mailer function calls
  { pattern: /sendPersonalizedEmail\(/g, type: 'sendPersonalizedEmail' },
  { pattern: /sendWelcomeEmail\(/g, type: 'sendWelcomeEmail' },
  { pattern: /sendVerificationEmail\(/g, type: 'sendVerificationEmail' },
  { pattern: /sendPasswordResetEmail\(/g, type: 'sendPasswordResetEmail' },
  { pattern: /sendSemesterReportEmail\(/g, type: 'sendSemesterReportEmail' },
  { pattern: /sendBulkEmails\(/g, type: 'sendBulkEmails' },
  { pattern: /sendSms\(/g, type: 'sendSms' },
  { pattern: /sendViaBrevo\(/g, type: 'sendViaBrevo' },
  
  // Notification functions that may send emails
  { pattern: /createAndSendNotification\(/g, type: 'createAndSendNotification' },
  { pattern: /sendEventReminders\(/g, type: 'sendEventReminders' },
  { pattern: /sendCampaignReminders\(/g, type: 'sendCampaignReminders' },
  { pattern: /sendBulkReminders\(/g, type: 'sendBulkReminders' },
  
  // Check for notification types that might trigger emails
  { pattern: /type: ['"](event_reminder|attendance|announcement|pledge|payment|user_login|program|schedule|minutes|game_invite|semester_report|notification|claim|sms)/g, type: 'notification_type' },
];

// Notification types that trigger emails (from database)
const notificationTypes = [
  'event_reminder',
  'attendance_sheet_opened',
  'user_login',
  'attendance_checkin',
  'schedule',
  'attendance_thankyou',
  'attendance_missed',
  'program',
  'attendance_summary',
  'payment_claimed_treasurer',
  'payment_claimed_admin',
  'claim_success',
  'payment_received',
  'payment_failed',
  'payment_success'
];

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const results = [];
    
    emailPatterns.forEach(({ pattern, type }) => {
      const matches = content.match(pattern);
      if (matches) {
        results.push({
          type: type,
          count: matches.length,
          file: filePath
        });
      }
    });
    
    return results;
  } catch (error) {
    return [];
  }
}

function getAllFiles(dir, fileList = []) {
  try {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        getAllFiles(filePath, fileList);
      } else if (file.endsWith('.js') || file.endsWith('.ts')) {
        fileList.push(filePath);
      }
    });
    return fileList;
  } catch (error) {
    return fileList;
  }
}

function scanAllFiles() {
  console.log(`\n${colors.cyan}🔍 SCANNING FOR EMAIL FUNCTIONS${colors.reset}`);
  console.log(`${colors.gray}${'='.repeat(70)}${colors.reset}`);
  console.log(`\n${colors.gray}📂 Scanning directories:${colors.reset} ${directories.join(', ')}\n`);
  
  let allResults = [];
  const fileMap = {};
  
  directories.forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = getAllFiles(dir);
      files.forEach(file => {
        const results = scanFile(file);
        if (results.length > 0) {
          allResults = allResults.concat(results);
          fileMap[file] = results;
        }
      });
    }
  });
  
  // Group by file
  console.log(`\n${colors.yellow}📋 FILES WITH EMAIL FUNCTIONS:${colors.reset}`);
  console.log(`${colors.gray}${'-'.repeat(70)}${colors.reset}`);
  
  const fileNames = Object.keys(fileMap);
  if (fileNames.length === 0) {
    console.log(`${colors.yellow}⚠️ No email functions found${colors.reset}`);
  } else {
    fileNames.forEach(file => {
      const results = fileMap[file];
      const types = results.map(r => r.type).join(', ');
      console.log(`   ${colors.green}📄${colors.reset} ${file}`);
      console.log(`      ${colors.gray}→${colors.reset} ${types}`);
    });
  }
  
  // Count by type
  console.log(`\n${colors.yellow}📊 EMAIL FUNCTION COUNT BY TYPE:${colors.reset}`);
  console.log(`${colors.gray}${'-'.repeat(70)}${colors.reset}`);
  
  const typeCount = {};
  allResults.forEach(r => {
    if (!typeCount[r.type]) typeCount[r.type] = 0;
    typeCount[r.type] += r.count;
  });
  
  const sortedTypes = Object.keys(typeCount).sort((a, b) => typeCount[b] - typeCount[a]);
  sortedTypes.forEach(type => {
    const count = typeCount[type];
    const bar = '█'.repeat(Math.min(count, 20));
    console.log(`   ${colors.blue}${type.padEnd(30)}${colors.reset} ${count} ${colors.gray}${bar}${colors.reset}`);
  });
  
  // List all notification types that need email settings
  console.log(`\n${colors.yellow}🔔 NOTIFICATION TYPES THAT SEND EMAILS:${colors.reset}`);
  console.log(`${colors.gray}${'-'.repeat(70)}${colors.reset}`);
  
  // Also check the database for notification types
  console.log(`\n${colors.magenta}📊 Database Notification Types (${notificationTypes.length}):${colors.reset}`);
  notificationTypes.forEach((type, i) => {
    const num = String(i + 1).padStart(2);
    console.log(`   ${num}. ${type}`);
  });
  
  // Summary
  console.log(`\n${colors.cyan}📊 SUMMARY${colors.reset}`);
  console.log(`${colors.gray}${'='.repeat(70)}${colors.reset}`);
  console.log(`   ${colors.green}📄 Files with email functions:${colors.reset} ${fileNames.length}`);
  console.log(`   ${colors.blue}📧 Total email function calls:${colors.reset} ${allResults.length}`);
  console.log(`   ${colors.magenta}🔔 Notification types:${colors.reset} ${notificationTypes.length}`);
  console.log(`   ${colors.yellow}📁 Directories scanned:${colors.reset} ${directories.length}`);
  
  // Recommendations
  console.log(`\n${colors.green}💡 RECOMMENDATIONS${colors.reset}`);
  console.log(`${colors.gray}${'-'.repeat(70)}${colors.reset}`);
  console.log(`   ${colors.yellow}1.${colors.reset} Add email settings for each notification type`);
  console.log(`   ${colors.yellow}2.${colors.reset} Update mailer.js to check settings before sending`);
  console.log(`   ${colors.yellow}3.${colors.reset} Update notification functions to use mailer checks`);
  console.log(`   ${colors.yellow}4.${colors.reset} Add 'email_settings' table to database`);
  
  console.log(`\n${colors.cyan}🏁 Scan complete${colors.reset}\n`);
}

// Run the scan
scanAllFiles();