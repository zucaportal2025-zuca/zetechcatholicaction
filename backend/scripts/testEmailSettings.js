// backend/scripts/testEmailSettings.js
// Run: node scripts/testEmailSettings.js

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:5000';
// const BASE_URL = 'https://zuca-backend-iw9p.onrender.com';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

let adminToken = null;

async function login() {
  try {
    console.log(`\n${colors.blue}🔐 Logging in as admin...${colors.reset}`);
    const response = await axios.post(`${BASE_URL}/api/login`, {
      email: 'zucaportal2025@gmail.com',
      password: 'adminzuca'
    });
    adminToken = response.data.token;
    console.log(`${colors.green}✅ Admin logged in successfully${colors.reset}`);
    return true;
  } catch (error) {
    console.log(`${colors.red}❌ Login failed:${colors.reset}`, error.response?.data?.error || error.message);
    return false;
  }
}

async function testGetSettings() {
  try {
    console.log(`\n${colors.blue}📡 Testing GET /api/admin/email/settings${colors.reset}`);
    const response = await axios.get(`${BASE_URL}/api/admin/email/settings`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log(`${colors.green}✅ GET settings successful${colors.reset}`);
    console.log(`   📊 Total settings: ${response.data.all?.length || 0}`);
    console.log(`   📂 Categories: ${Object.keys(response.data.settings || {}).length}`);
    return true;
  } catch (error) {
    console.log(`${colors.red}❌ GET settings failed:${colors.reset}`, error.response?.data?.error || error.message);
    return false;
  }
}

async function testToggleSetting() {
  try {
    console.log(`\n${colors.blue}🔧 Testing PUT /api/admin/email/settings/:type${colors.reset}`);
    
    const testType = 'test_setting_' + Date.now();
    
    // Create a test setting
    const response = await axios.put(
      `${BASE_URL}/api/admin/email/settings/${testType}`,
      { enabled: true },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    console.log(`${colors.green}✅ Toggle successful: ${response.data.message}${colors.reset}`);
    console.log(`   📝 Created: ${response.data.setting.type}`);
    
    // Clean up - delete it (optional, can also leave it)
    return true;
  } catch (error) {
    console.log(`${colors.red}❌ Toggle failed:${colors.reset}`, error.response?.data?.error || error.message);
    return false;
  }
}

async function testGetStats() {
  try {
    console.log(`\n${colors.blue}📊 Testing GET /api/admin/email/stats${colors.reset}`);
    const response = await axios.get(`${BASE_URL}/api/admin/email/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log(`${colors.green}✅ GET stats successful${colors.reset}`);
    console.log(`   📊 Total emails: ${response.data.overall?.total_emails || 0}`);
    return true;
  } catch (error) {
    console.log(`${colors.red}❌ GET stats failed:${colors.reset}`, error.response?.data?.error || error.message);
    return false;
  }
}

async function testGetCategories() {
  try {
    console.log(`\n${colors.blue}📂 Testing GET /api/admin/email/categories${colors.reset}`);
    const response = await axios.get(`${BASE_URL}/api/admin/email/categories`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log(`${colors.green}✅ GET categories successful${colors.reset}`);
    console.log(`   📊 Categories found: ${response.data.categories?.length || 0}`);
    return true;
  } catch (error) {
    console.log(`${colors.red}❌ GET categories failed:${colors.reset}`, error.response?.data?.error || error.message);
    return false;
  }
}

async function testResetSettings() {
  try {
    console.log(`\n${colors.blue}🔄 Testing POST /api/admin/email/settings/reset${colors.reset}`);
    const response = await axios.post(
      `${BASE_URL}/api/admin/email/settings/reset`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    console.log(`${colors.green}✅ Reset successful: ${response.data.message}${colors.reset}`);
    return true;
  } catch (error) {
    console.log(`${colors.red}❌ Reset failed:${colors.reset}`, error.response?.data?.error || error.message);
    return false;
  }
}

async function runTests() {
  console.log(`\n${colors.cyan}🧪 TESTING EMAIL SETTINGS API${colors.reset}`);
  console.log(`${colors.gray}${'='.repeat(60)}${colors.reset}`);
  
  const loggedIn = await login();
  if (!loggedIn) {
    console.log(`${colors.red}❌ Cannot proceed without admin token${colors.reset}`);
    return;
  }
  
  const results = {
    'GET /settings': await testGetSettings(),
    'PUT /settings/:type': await testToggleSetting(),
    'GET /stats': await testGetStats(),
    'GET /categories': await testGetCategories(),
    'POST /settings/reset': await testResetSettings()
  };
  
  console.log(`\n${colors.cyan}📊 TEST SUMMARY${colors.reset}`);
  console.log(`${colors.gray}${'='.repeat(60)}${colors.reset}`);
  
  let passed = 0;
  let failed = 0;
  
  Object.entries(results).forEach(([name, result]) => {
    const status = result ? `${colors.green}✅ PASSED${colors.reset}` : `${colors.red}❌ FAILED${colors.reset}`;
    console.log(`   ${name.padEnd(30)} ${status}`);
    if (result) passed++;
    else failed++;
  });
  
  console.log(`\n${colors.gray}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}📊 Results: ${colors.green}${passed} passed${colors.reset}, ${colors.red}${failed} failed${colors.reset}, ${colors.gray}${Object.keys(results).length} total${colors.reset}`);
  
  if (passed === Object.keys(results).length) {
    console.log(`\n${colors.green}🎉 ALL TESTS PASSED! Email settings API is working correctly.${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}⚠️ Some tests failed. Please check the logs above.${colors.reset}`);
  }
  
  console.log('');
  await prisma.$disconnect();
}

runTests().catch(console.error);