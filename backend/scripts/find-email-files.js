// scripts/find-email-files.js
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const SKIP_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.email-backup'];

// Email-related keywords
const EMAIL_KEYWORDS = [
  'sendEmail', 'sendMail', 'sendWelcomeEmail', 'sendVerificationEmail',
  'sendPasswordReset', 'sendEventReminder', 'sendAttendance',
  'sendPledge', 'sendPayment', 'sendAnnouncement', 'sendProgram',
  'sendMinutes', 'sendGameInvite', 'sendReport', 'sendCampaign',
  'sendSMS', 'transporter.sendMail', 'nodemailer'
];

function findEmailFiles(dir) {
  const results = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!SKIP_DIRS.includes(item)) {
          results.push(...findEmailFiles(fullPath));
        }
      } else if (item.endsWith('.js') || item.endsWith('.ts')) {
        // Check if file contains email keywords
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const hasEmail = EMAIL_KEYWORDS.some(keyword => 
            content.includes(keyword) && 
            !content.includes('emailSettings') && 
            !content.includes('email_setting')
          );
          
          if (hasEmail) {
            const relativePath = path.relative(PROJECT_ROOT, fullPath);
            results.push(relativePath);
          }
        } catch (err) {
          // Skip files that can't be read
        }
      }
    }
  } catch (err) {
    // Skip directories that can't be read
  }
  
  return results;
}

console.log('🔍 Scanning for email files...\n');
const emailFiles = findEmailFiles(PROJECT_ROOT);

console.log(`📊 Found ${emailFiles.length} files with email sending:\n`);
emailFiles.sort().forEach(file => {
  console.log(`  - ${file}`);
});

console.log('\n📝 Next steps:');
console.log('1. Update each file manually or run the automatic fix script');
console.log('2. For each file, add email guard checks');
console.log('3. Test thoroughly before deploying');