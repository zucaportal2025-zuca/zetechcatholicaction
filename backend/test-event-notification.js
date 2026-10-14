// test-may30-event.js
const axios = require('axios');

const API_URL = 'http://localhost:5000';
const ADMIN_EMAIL = 'zucaportal2025@gmail.com';
const ADMIN_PASSWORD = 'adminzuca';
const TEST_EMAIL = 'chrismaina4433@gmail.com';

let authToken = null;

async function login() {
  console.log('🔐 Logging in...');
  const res = await axios.post(`${API_URL}/api/login`, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });
  authToken = res.data.token;
  console.log('✅ Logged in as ZUCA ADMIN\n');
  return authToken;
}

async function findMay30Event() {
  console.log('🔍 Searching for event on May 30th...');
  
  // Get all schedules
  const schedulesRes = await axios.get(`${API_URL}/api/schedules`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  const schedules = schedulesRes.data;
  let targetEvent = null;
  
  // Search for event on May 30
  for (const schedule of schedules) {
    if (schedule.events) {
      for (const event of schedule.events) {
        const eventDate = new Date(event.eventDate);
        const month = eventDate.getMonth(); // 4 = May (0-indexed)
        const day = eventDate.getDate();
        
        if (month === 4 && day === 30) {
          targetEvent = event;
          console.log(`✅ Found event: "${event.title}"`);
          console.log(`   Date: ${eventDate.toLocaleDateString()}`);
          console.log(`   Time: ${event.eventTime || "16:30"}`);
          console.log(`   Location: ${event.location || "Not specified"}\n`);
          break;
        }
      }
    }
    if (targetEvent) break;
  }
  
  return targetEvent;
}

async function sendTestNotificationToUser() {
  console.log(`📧 Sending test notification to ${TEST_EMAIL}...`);
  
  // First find the user ID
  const usersRes = await axios.get(`${API_URL}/api/users`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  const targetUser = usersRes.data.find(u => u.email === TEST_EMAIL);
  
  if (!targetUser) {
    console.log(`❌ User ${TEST_EMAIL} not found!`);
    return false;
  }
  
  console.log(`✅ Found user: ${targetUser.fullName}\n`);
  
  // Send test notification
  await axios.post(`${API_URL}/api/notify`, {
    userId: targetUser.id,
    type: "event_reminder",
    title: "⛪ TEST: Mass at St Camila's",
    message: `🔔 IMPORTANT: "EXTERNAL MASS ANIMATIONS/OUTDOOR ACTIVITIES" is on Saturday, May 30, 2026 at 16:30 in St Camila's Church. Please be punctual and prepared!`,
    data: { test: true }
  }, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  console.log('✅ Test notification sent!\n');
  return true;
}

async function manuallyTriggerReminders() {
  console.log('⏰ Manually triggering event reminders...');
  
  try {
    const res = await axios.post(`${API_URL}/api/schedules/check-notifications`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log(`✅ Reminder check complete. New notifications: ${res.data.newNotifications}\n`);
    return res.data;
  } catch (err) {
    console.log('⚠️ Could not trigger reminders:', err.response?.data?.error || err.message);
    return null;
  }
}

async function run() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TESTING MAY 30 EVENT NOTIFICATION');
  console.log('='.repeat(60) + '\n');
  
  await login();
  
  // Find the May 30 event
  const event = await findMay30Event();
  
  if (event) {
    console.log('📅 Event Details:');
    console.log(`   Title: ${event.title}`);
    console.log(`   Date: ${new Date(event.eventDate).toLocaleString()}`);
    console.log(`   Location: ${event.location || 'Not set'}`);
    console.log(`   Time: ${event.eventTime || '16:30'}\n`);
  } else {
    console.log('⚠️ No event found on May 30th\n');
  }
  
  // Send test notification
  await sendTestNotificationToUser();
  
  // Trigger reminders
  await manuallyTriggerReminders();
  
  console.log('='.repeat(60));
  console.log('✅ TEST COMPLETE!');
  console.log('='.repeat(60));
  console.log(`\n📧 Check your email: ${TEST_EMAIL}`);
  console.log('   The notification should arrive within a minute.\n');
}

run().catch(console.error);