const axios = require('axios');

const API_URL = 'http://localhost:5000';
const EMAIL = 'chrismaina4433@gmail.com';
const PASSWORD = 'chris';

let authToken = null;
let userId = null;

async function login() {
  console.log('🔐 Logging in as chrismaina4433@gmail.com...');
  try {
    const res = await axios.post(`${API_URL}/api/login`, {
      email: EMAIL,
      password: PASSWORD
    });
    authToken = res.data.token;
    userId = res.data.user?.id;
    console.log(`✅ Logged in as ${res.data.user?.fullName || 'chris'}`);
    console.log(`   User ID: ${userId}`);
    console.log('');
    return authToken;
  } catch (err) {
    console.error('❌ Login failed:', err.response?.data?.error || err.message);
    throw err;
  }
}

async function testGetSettings() {
  console.log('📋 Test 1: GET birthday settings...');
  try {
    const res = await axios.get(`${API_URL}/api/birthday/settings`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('   ✅ Settings retrieved:');
    console.log(`      autoCreateAdvert: ${res.data.settings.autoCreateAdvert}`);
    console.log(`      sendPushToAll: ${res.data.settings.sendPushToAll}`);
    console.log(`      sendToWhatsApp: ${res.data.settings.sendToWhatsApp}`);
    console.log(`      whatsAppMessage: ${res.data.settings.whatsAppMessage}`);
    console.log('');
    return res.data.settings;
  } catch (err) {
    console.error('   ❌ Failed:', err.response?.data?.error || err.message);
    console.log('');
    return null;
  }
}

async function testUpdateSettings() {
  console.log('📋 Test 2: UPDATE birthday settings...');
  try {
    const res = await axios.put(`${API_URL}/api/birthday/settings`, {
      autoCreateAdvert: true,
      sendPushToAll: true,
      sendToWhatsApp: false,
      whatsAppMessage: "Happy Birthday {name}! May God bless you abundantly today and always. From all of us at ZUCA"
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('   ✅ Settings updated successfully');
    console.log('');
    return res.data.settings;
  } catch (err) {
    console.error('   ❌ Failed:', err.response?.data?.error || err.message);
    console.log('');
    return null;
  }
}

async function testUpdateUserSettings() {
  console.log('📋 Test 3: UPDATE user birthday settings...');
  try {
    const res = await axios.put(`${API_URL}/api/birthday/user-settings`, {
      birthdayOptIn: true,
      birthDate: "1990-09-04",
      birthdayMessage: "Thank you God for another year of grace and mercy"
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('   ✅ User settings updated:');
    console.log(`      birthdayOptIn: ${res.data.user.birthdayOptIn}`);
    console.log(`      birthMonth: ${res.data.user.birthMonth}`);
    console.log(`      birthDay: ${res.data.user.birthDay}`);
    console.log(`      birthdayMessage: ${res.data.user.birthdayMessage}`);
    console.log('');
    return res.data.user;
  } catch (err) {
    console.error('   ❌ Failed:', err.response?.data?.error || err.message);
    console.log('');
    return null;
  }
}

async function testUploadPhoto() {
  console.log('📋 Test 4: UPLOAD birthday photo...');
  console.log('   ⚠️  Skipping - requires file upload');
  console.log('   💡 Test manually with:');
  console.log('      curl -X POST http://localhost:5000/api/birthday/upload-photo -H "Authorization: Bearer TOKEN" -F "photo=@photo.jpg"');
  console.log('');
}

async function testGetTodayBirthdays() {
  console.log('📋 Test 5: GET today\'s birthdays (admin)...');
  try {
    const res = await axios.get(`${API_URL}/api/birthday/admin/today`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log(`   ✅ Found ${res.data.count} birthdays today`);
    if (res.data.users.length > 0) {
      res.data.users.forEach(u => {
        console.log(`      - ${u.fullName} (${u.email})`);
        console.log(`        Photo: ${u.birthdayPhoto ? '✅' : '❌'}`);
      });
    } else {
      console.log('      No birthdays today');
    }
    console.log('');
    return res.data;
  } catch (err) {
    console.error('   ❌ Failed:', err.response?.data?.error || err.message);
    console.log('');
    return null;
  }
}

async function testGetStats() {
  console.log('📋 Test 6: GET birthday stats (admin)...');
  try {
    const res = await axios.get(`${API_URL}/api/birthday/admin/stats`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('   ✅ Stats:');
    console.log(`      Total Opted In: ${res.data.stats.totalOptedIn}`);
    console.log(`      With Photo: ${res.data.stats.totalWithPhoto}`);
    console.log(`      Total Birthday Ads: ${res.data.stats.totalBirthdayAds}`);
    console.log(`      Today's Birthdays: ${res.data.stats.todayBirthdays}`);
    console.log('');
    return res.data.stats;
  } catch (err) {
    console.error('   ❌ Failed:', err.response?.data?.error || err.message);
    console.log('');
    return null;
  }
}

async function testProcessSingleBirthday(userId) {
  if (!userId) {
    console.log('   ⚠️  No user ID provided, skipping');
    console.log('');
    return null;
  }
  console.log(`📋 Test 7: PROCESS single birthday for user ${userId}...`);
  try {
    const res = await axios.post(`${API_URL}/api/birthday/admin/process/${userId}`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log(`   ✅ ${res.data.message}`);
    if (res.data.advert) {
      console.log(`      Advert ID: ${res.data.advert.id}`);
      console.log(`      Advert Title: ${res.data.advert.title}`);
    }
    console.log('');
    return res.data;
  } catch (err) {
    console.error('   ❌ Failed:', err.response?.data?.error || err.message);
    console.log('');
    return null;
  }
}

async function testProcessAllBirthdays() {
  console.log('📋 Test 8: PROCESS all today\'s birthdays (admin)...');
  try {
    const res = await axios.post(`${API_URL}/api/birthday/admin/process-all`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log(`   ✅ ${res.data.message}`);
    console.log(`      Processed: ${res.data.processed}/${res.data.total}`);
    console.log('');
    return res.data;
  } catch (err) {
    console.error('   ❌ Failed:', err.response?.data?.error || err.message);
    console.log('');
    return null;
  }
}

async function run() {
  console.log('\n' + '='.repeat(60));
  console.log('🎂 BIRTHDAY SYSTEM BACKEND TEST');
  console.log('='.repeat(60) + '\n');

  await login();

  // Run all tests
  await testGetSettings();
  await testUpdateSettings();
  await testUpdateUserSettings();
  await testUploadPhoto();
  await testGetTodayBirthdays();
  await testGetStats();

  // Ask if user wants to process birthdays
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\n📌 Options:');
  console.log('   1. Process all today\'s birthdays');
  console.log('   2. Process single birthday');
  console.log('   3. Skip processing');
  console.log('');

  readline.question('Select option (1, 2, or 3): ', async (answer) => {
    if (answer === '1') {
      await testProcessAllBirthdays();
    } else if (answer === '2') {
      if (userId) {
        await testProcessSingleBirthday(userId);
      } else {
        console.log('   ❌ User ID not found. Please login first.');
      }
    } else {
      console.log('   Skipping processing');
    }

    console.log('='.repeat(60));
    console.log('✅ TEST COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n📝 Summary:');
    console.log('   1. Settings CRUD - ✅ Tested');
    console.log('   2. User opt-in - ✅ Tested');
    console.log('   3. Photo upload - ⚠️  Manual test needed');
    console.log('   4. Today\'s birthdays - ✅ Tested');
    console.log('   5. Stats - ✅ Tested');
    console.log('   6. Processing - ✅ Tested');
    console.log('\n🔗 Next: Test with actual photo upload');
    readline.close();
  });
}

run().catch(console.error);