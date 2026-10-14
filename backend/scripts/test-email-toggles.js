// scripts/test-email-toggles.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendPersonalizedEmail, isEmailEnabled, clearEmailSettingsCache } = require('../services/mailer');

// Test configuration
const TEST_EMAIL = 'zucaportal2025@gmail.com'; // Change to your test email
const TEST_USER_ID = '97532cb4-7cac-4c8d-9a2e-5d70dec6d6d9'; // Your admin user ID

// All email types to test
const EMAIL_TYPES = [
  // User Management
  { type: 'user_welcome', label: 'Welcome Email' },
  { type: 'user_verification', label: 'Verification Email' },
  { type: 'user_login', label: 'Login Alert' },
  { type: 'user_password_reset', label: 'Password Reset' },
  
  // Attendance
  { type: 'attendance_checkin', label: 'Check-in Confirmation' },
  { type: 'attendance_missed', label: 'Missed Meeting' },
  { type: 'attendance_thankyou', label: 'Thank You for Attending' },
  { type: 'attendance_reminder', label: 'Attendance Reminder' },
  { type: 'attendance_summary', label: 'Attendance Summary' },
  
  // Pledges & Payments
  { type: 'pledge_created', label: 'Pledge Created' },
  { type: 'pledge_approved', label: 'Pledge Approved' },
  { type: 'pledge_reminder', label: 'Pledge Reminder' },
  { type: 'payment_success', label: 'Payment Success' },
  { type: 'payment_failed', label: 'Payment Failed' },
  { type: 'payment_receipt', label: 'Payment Receipt' },
  
  // Announcements
  { type: 'announcement_new', label: 'New Announcement' },
  { type: 'announcement_important', label: 'Important Announcement' },
  
  // Programs
  { type: 'program_new', label: 'New Mass Program' },
  { type: 'program_reminder', label: 'Program Reminder' },
  
  // Minutes
  { type: 'minutes_published', label: 'Minutes Published' },
  { type: 'minutes_reminder', label: 'Minutes Reminder' },
  
  // Others
  { type: 'game_invite', label: 'Game Invite' },
  { type: 'semester_report', label: 'Semester Report' },
  { type: 'sms_notification', label: 'SMS Notification' },
  { type: 'campaign_reminder', label: 'Campaign Reminder' },
];

// Test results
const results = {
  passed: [],
  failed: [],
  skipped: [],
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function getUser() {
  const user = await prisma.user.findUnique({
    where: { id: TEST_USER_ID },
    select: { id: true, email: true, fullName: true }
  });
  
  if (!user) {
    log('❌ Test user not found! Please update TEST_USER_ID', 'red');
    process.exit(1);
  }
  
  return user;
}

async function resetAllSettings() {
  log('\n📋 Resetting all email settings to enabled...', 'cyan');
  await prisma.emailSetting.updateMany({
    data: { enabled: true }
  });
  clearEmailSettingsCache();
  log('✅ All settings reset to enabled', 'green');
}

async function testEmailType(type, label, user, shouldBeEnabled) {
  log(`\n📧 Testing: ${label} (${type})`, 'blue');
  
  try {
    // Check current setting
    const setting = await prisma.emailSetting.findUnique({
      where: { type: type },
      select: { enabled: true }
    });
    
    const isEnabled = setting ? setting.enabled : true;
    const statusText = isEnabled ? 'ENABLED' : 'DISABLED';
    log(`   Current status: ${statusText}`, isEnabled ? 'green' : 'red');
    
    // If we're testing with a specific expectation
    if (shouldBeEnabled !== undefined) {
      if (isEnabled !== shouldBeEnabled) {
        log(`   ❌ Expected ${shouldBeEnabled ? 'ENABLED' : 'DISABLED'} but got ${statusText}`, 'red');
        results.failed.push({ type, label, reason: `Expected ${shouldBeEnabled}` });
        return false;
      }
    }
    
    // Try sending the email
    const testData = {
      type: 'test',
      message: `This is a test email for ${label}`,
      timestamp: new Date().toISOString()
    };
    
    // Check if email will be sent (guard check)
    const willSend = await isEmailEnabled(type);
    
    if (willSend) {
      log(`   ✅ Email will be sent (enabled)`, 'green');
      
      // Actually send the test email (only for critical tests)
      if (['user_login', 'attendance_checkin'].includes(type)) {
        const result = await sendPersonalizedEmail(
          user,
          type,
          `🧪 TEST: ${label}`,
          `This is a test email for "${label}" (${type}).\n\nIf you received this, the email system is working correctly.\n\nTest time: ${new Date().toISOString()}\n\nThis is a test from the ZUCA email toggle testing script.`,
          testData
        );
        
        if (result && result.sent !== false) {
          log(`   ✅ Test email sent successfully!`, 'green');
          results.passed.push({ type, label, status: 'sent' });
        } else {
          log(`   ⚠️ Email send returned:`, 'yellow');
          console.log(result);
          results.skipped.push({ type, label, reason: 'Send returned false' });
        }
      } else {
        log(`   ⏭️ Skipping actual send (non-critical email type)`, 'yellow');
        results.passed.push({ type, label, status: 'enabled_but_skipped' });
      }
      
    } else {
      log(`   ⏭️ Email will NOT be sent (disabled)`, 'yellow');
      results.passed.push({ type, label, status: 'disabled' });
    }
    
    return true;
    
  } catch (error) {
    log(`   ❌ Error: ${error.message}`, 'red');
    results.failed.push({ type, label, reason: error.message });
    return false;
  }
}

async function testToggle(type, label, user) {
  log(`\n🔄 Testing toggle for: ${label} (${type})`, 'magenta');
  
  try {
    // Get current state
    const current = await prisma.emailSetting.findUnique({
      where: { type: type },
      select: { enabled: true }
    });
    
    const currentState = current ? current.enabled : true;
    const newState = !currentState;
    
    log(`   Current: ${currentState ? 'ENABLED' : 'DISABLED'} → New: ${newState ? 'ENABLED' : 'DISABLED'}`, 'cyan');
    
    // Toggle
    await prisma.emailSetting.update({
      where: { type: type },
      data: { enabled: newState }
    });
    clearEmailSettingsCache();
    
    // Verify
    const updated = await prisma.emailSetting.findUnique({
      where: { type: type },
      select: { enabled: true }
    });
    
    if (updated && updated.enabled === newState) {
      log(`   ✅ Toggle successful!`, 'green');
      
      // Test if the guard respects the new state
      const willSend = await isEmailEnabled(type);
      if (willSend === newState) {
        log(`   ✅ Guard respects new state: ${willSend ? 'ENABLED' : 'DISABLED'}`, 'green');
        results.passed.push({ type, label, status: `toggled_to_${newState}` });
      } else {
        log(`   ❌ Guard mismatch! Expected ${newState} but got ${willSend}`, 'red');
        results.failed.push({ type, label, reason: 'Guard mismatch after toggle' });
      }
      
    } else {
      log(`   ❌ Toggle failed!`, 'red');
      results.failed.push({ type, label, reason: 'Toggle failed' });
    }
    
  } catch (error) {
    log(`   ❌ Error toggling: ${error.message}`, 'red');
    results.failed.push({ type, label, reason: error.message });
  }
}

async function testCategoryToggle(category, user) {
  log(`\n📂 Testing category toggle: ${category}`, 'magenta');
  
  try {
    // Get all settings in this category
    const settings = await prisma.emailSetting.findMany({
      where: { category: category },
      select: { type: true, enabled: true }
    });
    
    if (settings.length === 0) {
      log(`   ⚠️ No settings found for category: ${category}`, 'yellow');
      return;
    }
    
    const allEnabled = settings.every(s => s.enabled);
    const newState = !allEnabled;
    
    log(`   Category has ${settings.length} settings`, 'cyan');
    log(`   Current: ${allEnabled ? 'ALL ENABLED' : 'SOME/MIXED'} → New: ${newState ? 'ALL ENABLED' : 'ALL DISABLED'}`, 'cyan');
    
    // Toggle all
    await prisma.emailSetting.updateMany({
      where: { category: category },
      data: { enabled: newState }
    });
    clearEmailSettingsCache();
    
    // Verify
    const updated = await prisma.emailSetting.findMany({
      where: { category: category },
      select: { type: true, enabled: true }
    });
    
    const allMatch = updated.every(s => s.enabled === newState);
    
    if (allMatch) {
      log(`   ✅ Category toggle successful! All ${updated.length} settings are now ${newState ? 'ENABLED' : 'DISABLED'}`, 'green');
      results.passed.push({ category, status: `category_toggled_to_${newState}` });
    } else {
      log(`   ❌ Category toggle failed! Not all settings match`, 'red');
      results.failed.push({ category, reason: 'Category toggle mismatch' });
    }
    
  } catch (error) {
    log(`   ❌ Error toggling category: ${error.message}`, 'red');
    results.failed.push({ category, reason: error.message });
  }
}

async function printSummary() {
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 TEST SUMMARY', 'cyan');
  log('='.repeat(60), 'cyan');
  
  log(`\n✅ Passed: ${results.passed.length}`, 'green');
  log(`❌ Failed: ${results.failed.length}`, 'red');
  log(`⏭️ Skipped: ${results.skipped.length}`, 'yellow');
  
  if (results.failed.length > 0) {
    log('\n❌ Failed Tests:', 'red');
    results.failed.forEach(f => {
      console.log(`  - ${f.label || f.category || f.type}: ${f.reason}`);
    });
  }
  
  if (results.skipped.length > 0) {
    log('\n⏭️ Skipped Tests:', 'yellow');
    results.skipped.forEach(s => {
      console.log(`  - ${s.label}: ${s.reason}`);
    });
  }
  
  if (results.passed.length > 0) {
    log('\n✅ Passed Tests:', 'green');
    results.passed.slice(0, 10).forEach(p => {
      console.log(`  - ${p.label || p.category || p.type}: ${p.status}`);
    });
    if (results.passed.length > 10) {
      console.log(`  ... and ${results.passed.length - 10} more`);
    }
  }
  
  log('\n' + '='.repeat(60), 'cyan');
  
  if (results.failed.length === 0) {
    log('🎉 ALL TESTS PASSED! Email toggles are working correctly.', 'green');
  } else {
    log('⚠️ Some tests failed. Please review the errors above.', 'red');
  }
}

async function main() {
  log('\n🧪 STARTING EMAIL TOGGLE TEST SUITE', 'cyan');
  log('='.repeat(60), 'cyan');
  
  // Get test user
  const user = await getUser();
  log(`\n👤 Test User: ${user.fullName} (${user.email})`, 'green');
  
  // Reset all settings to enabled
  await resetAllSettings();
  
  // Test all email types
  log('\n📧 TESTING ALL EMAIL TYPES', 'cyan');
  log('='.repeat(60), 'cyan');
  
  for (const emailType of EMAIL_TYPES) {
    await testEmailType(emailType.type, emailType.label, user);
  }
  
  // Test toggling specific email types
  log('\n🔄 TESTING TOGGLES', 'cyan');
  log('='.repeat(60), 'cyan');
  
  const testToggles = [
    { type: 'user_login', label: 'Login Alert' },
    { type: 'attendance_checkin', label: 'Check-in Confirmation' },
    { type: 'pledge_created', label: 'Pledge Created' },
  ];
  
  for (const toggle of testToggles) {
    await testToggle(toggle.type, toggle.label, user);
  }
  
  // Test category toggles
  log('\n📂 TESTING CATEGORY TOGGLES', 'cyan');
  log('='.repeat(60), 'cyan');
  
  const categories = ['user', 'attendance', 'pledge'];
  for (const category of categories) {
    await testCategoryToggle(category, user);
  }
  
  // Final summary
  await printSummary();
  
  // Clean up - reset all to enabled
  log('\n🔄 Resetting all settings to enabled...', 'cyan');
  await resetAllSettings();
  
  log('\n✅ Test suite complete!', 'green');
}

// Run the test
main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });