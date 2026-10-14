// test-emails.js
require('dotenv').config();
const { 
  sendWelcomeEmail, 
  sendVerificationEmail, 
  sendPasswordResetEmail,
  sendPersonalizedEmail 
} = require('./services/mailer');

async function testEmails() {
  console.log('📧 Starting email tests to chrismaina4433@gmail.com...\n');

  // Test user object
  const testUser = {
    email: 'chrismaina4433@gmail.com',
    fullName: 'Chris Maina',
    phone: '254712345678',
    homeJumuia: { name: 'St. Joseph Jumuia' }
  };

  // Test 1: Welcome Email
  console.log('1. Testing WELCOME email...');
  await sendWelcomeEmail(testUser, 'ZUCA-2024-001234');
  await delay(3000);

  // Test 2: Verification Email
  console.log('2. Testing VERIFICATION email...');
  await sendVerificationEmail(testUser, '123456');
  await delay(3000);

  // Test 3: Password Reset Email
  console.log('3. Testing PASSWORD RESET email...');
  await sendPasswordResetEmail(testUser.email, '789012');
  await delay(3000);

  // Test 4: Payment Receipt Email
  console.log('4. Testing PAYMENT RECEIPT email...');
  await sendPersonalizedEmail(testUser, 'payment_receipt', 'Payment Confirmation', 'Your contribution has been received successfully.', {
    amount: 2500,
    receiptNumber: 'MPESA-RCPT-123456',
    campaignTitle: 'Building Fund Drive 2024',
    campaign: 'Building Fund Drive 2024',
    payerName: 'Chris Maina',
    payerPhone: '254712345678',
    jumuiaName: 'St. Joseph Jumuia'
  });
  await delay(3000);

  // Test 5: Announcement Email
  console.log('5. Testing ANNOUNCEMENT email...');
  await sendPersonalizedEmail(testUser, 'announcement', 'Important: End of Year Mass', 'We are pleased to announce the End of Year Thanksgiving Mass on December 15th, 2024 at 10:00 AM. All members are cordially invited to attend.');
  await delay(3000);

  // Test 6: Pledge Approved Email
  console.log('6. Testing PLEDGE APPROVED email...');
  await sendPersonalizedEmail(testUser, 'pledge_approved', 'Pledge Approved', 'Your pledge of KES 5,000 has been approved. Thank you for your commitment to ZUCA.', {
    amount: 5000
  });
  await delay(3000);

  // Test 7: Event Reminder
  console.log('7. Testing EVENT REMINDER email...');
  await sendPersonalizedEmail(testUser, 'event_reminder', 'Reminder: Weekly Bible Study', 'Join us for our weekly Bible study session tomorrow at 4:00 PM at the University Chapel.');
  await delay(3000);

  // Test 8: New Contribution Campaign
  console.log('8. Testing CONTRIBUTION email...');
  await sendPersonalizedEmail(testUser, 'contribution', 'New Contribution Drive', 'ZUCA has launched a new fundraising campaign for the Community Outreach Program. Your support is greatly appreciated.');

  console.log('\n✅ All test emails sent to chrismaina4433@gmail.com!');
  console.log('📧 Please check the inbox (and spam folder) for all 8 test emails.');
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the test
testEmails().catch(console.error);