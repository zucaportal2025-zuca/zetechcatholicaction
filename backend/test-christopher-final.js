// test-christopher-final.js
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testChristopher() {
  console.log('🔐 TESTING CHRISTOPHER MAINA LOGIN\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // Step 1: Login
    console.log('📝 Step 1: Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/api/login`, {
      email: 'chrismaina4433@gmail.com',
      password: 'chris'
    });
    
    console.log('✅ Login successful!');
    console.log('Response:', JSON.stringify(loginResponse.data, null, 2));
    
    const token = loginResponse.data.token;
    
    if (!token) {
      console.log('❌ No token received!');
      return;
    }
    
    console.log('\n🎫 Token received:', token.substring(0, 50) + '...');
    
    // Step 2: Test the member meetings endpoint
    console.log('\n📊 Step 2: Testing member meetings endpoint...');
    
    try {
      const meetingsResponse = await axios.get(`${BASE_URL}/api/attendance/member/all-meetings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Member meetings endpoint working!');
      console.log('\n📈 ATTENDANCE STATISTICS:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Total Meetings: ${meetingsResponse.data.stats?.totalMeetings || 0}`);
      console.log(`Attended: ${meetingsResponse.data.stats?.attendedMeetings || 0}`);
      console.log(`Missed: ${meetingsResponse.data.stats?.missedMeetings || 0}`);
      console.log(`Attendance Rate: ${meetingsResponse.data.stats?.attendanceRate || 0}%`);
      
      if (meetingsResponse.data.allMeetings && meetingsResponse.data.allMeetings.length > 0) {
        console.log('\n📋 MEETINGS:');
        meetingsResponse.data.allMeetings.forEach((meeting, i) => {
          const status = meeting.userAttended ? '✅' : '❌';
          const date = new Date(meeting.eventDate).toLocaleDateString();
          console.log(`${status} ${meeting.title} - ${date}`);
        });
      }
      
    } catch (error) {
      console.log('❌ Member meetings endpoint failed');
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Error:', error.response.data);
      }
    }
    
  } catch (error) {
    console.log('❌ Login failed');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      console.log('⚠️ Server not running on port 5000');
    } else {
      console.log('Error:', error.message);
    }
  }
}

testChristopher();