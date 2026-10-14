// test-tomorrow.js
const axios = require('axios');

const API_URL = 'http://127.0.0.1:5000';
const ADMIN_EMAIL = 'zucaportal2025@gmail.com';
const ADMIN_PASSWORD = 'adminzuca';

let authToken = null;

async function login() {
  console.log('Logging in...');
  const response = await axios.post(`${API_URL}/api/login`, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });
  authToken = response.data.token;
  console.log('✅ Logged in\n');
  return authToken;
}

async function createTomorrowEvent() {
  console.log('📅 Creating event for TOMORROW...');
  
  const now = new Date();
  // Create event for tomorrow at 10:00 AM
  const eventDate = new Date(now);
  eventDate.setDate(now.getDate() + 1);
  eventDate.setHours(10, 0, 0, 0);
  
  const eventDateStr = eventDate.toISOString().split('T')[0];
  const eventTimeStr = '10:00';
  
  const testSchedule = {
    title: `TEST FOR TOMORROW - ${now.toLocaleTimeString()}`,
    content: "Test content for tomorrow's event",
    description: "Testing reminder system with future date",
    isPublished: true,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    events: [
      {
        title: "TOMORROW'S TEST EVENT",
        description: "This should create ALL reminders",
        eventDate: eventDateStr,
        eventTime: eventTimeStr,
        location: "Test Room",
        groupName: "Test"
      }
    ]
  };
  
  console.log(`   Event date: ${eventDateStr}`);
  console.log(`   Event time: ${eventTimeStr}`);
  console.log(`   That's TOMORROW at 10:00 AM\n`);
  
  try {
    const response = await axios.post(`${API_URL}/api/admin/schedules`, testSchedule, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Test schedule created!');
    console.log(`   Schedule ID: ${response.data.schedule?.id}`);
    console.log(`   Event ID: ${response.data.schedule?.events?.[0]?.id || 'Check manually'}`);
    
    return response.data.schedule;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data || error.message);
    return null;
  }
}

async function checkNotifications() {
  console.log('\n⏰ Checking for notifications...');
  
  try {
    const response = await axios.post(`${API_URL}/api/schedules/check-notifications`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log(`✅ Found ${response.data.newNotifications} new notifications`);
    return response.data;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data || error.message);
    return null;
  }
}

async function debugEvent(scheduleId) {
  console.log('\n🔍 Debugging event...');
  
  try {
    const response = await axios.get(`${API_URL}/api/admin/debug/check-event-creation/${scheduleId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const event = response.data.events[0];
    if (event) {
      console.log(`\n📊 Event: ${event.title}`);
      console.log(`   Event time: ${event.eventDateTimeUTC}`);
      console.log(`   Current time: ${event.currentTimeUTC}`);
      console.log(`\n   Reminders that WILL be created:`);
      
      event.wouldCreateNotifications.forEach(n => {
        if (n.wouldCreate) {
          console.log(`   ✅ ${n.timing} - ${n.notifyAt}`);
        }
      });
      
      console.log(`\n   Total notifications found in DB: ${event.notificationsFound}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('Debug failed:', error.response?.data || error.message);
    return null;
  }
}

async function run() {
  console.log('═══════════════════════════════════════════════════');
  console.log('     TEST WITH TOMORROW\'S EVENT');
  console.log('═══════════════════════════════════════════════════\n');
  
  await login();
  
  // Create event for tomorrow
  const schedule = await createTomorrowEvent();
  
  if (schedule) {
    console.log('⏳ Waiting 3 seconds for notifications to be created...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Debug to see what notifications were created
    await debugEvent(schedule.id);
    
    // Check for notifications
    await checkNotifications();
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ TEST COMPLETE');
    console.log('═══════════════════════════════════════════════════');
    console.log('\n📝 Expected: 7 notifications should be created');
    console.log('   - 1 week before');
    console.log('   - 3 days before');
    console.log('   - 1 day before');
    console.log('   - 12 hours before');
    console.log('   - 6 hours before');
    console.log('   - 1 hour before');
    console.log('   - 30 minutes before');
  }
}

run().catch(console.error);