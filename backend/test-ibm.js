const axios = require("axios");

const BASE_URL = "http://localhost:5000";
const IBM_API_KEY = "your-secret-key-here";

// Admin credentials
const ADMIN_EMAIL = "zucaportal2025@gmail.com";
const ADMIN_PASS = "adminzuca";

// Normal user credentials  
const USER_EMAIL = "chrismaina4433@gmail.com";
const USER_PASS = "chris";

let adminToken = null;
let userToken = null;
let testPaymentId = null;
let testCampaignId = null;

async function login(email, password) {
  try {
    const response = await axios.post(`${BASE_URL}/api/login`, {
      email,
      password,
    });
    return response.data.token;
  } catch (err) {
    console.error(`❌ Login failed for ${email}:`, err.response?.data || err.message);
    return null;
  }
}

async function testValidate() {
  console.log("\n📌 TEST 1: Validation Endpoint");
  try {
    const response = await axios.post(
      `${BASE_URL}/api/ibm/validate`,
      { customerRef: "Z#001" },
      { headers: { "x-api-key": IBM_API_KEY } }
    );
    console.log("✅ Validation successful:", response.data);
  } catch (err) {
    console.log("❌ Validation failed:", err.response?.data || err.message);
  }
}

async function testWebhook() {
  console.log("\n📌 TEST 2: Webhook Endpoint");
  try {
    const payload = {
      paymentType: "MPESA",
      amount: 5000,
      currency: "KES",
      transactionReference: "TXN123456",
      transactionDate: new Date().toISOString(),
      additions: {
        externalRefNumber: "QK4T7X9Z2W",
        payerName: "Chris Maina",
        payerMobileNumber: "254712345678",
      },
    };

    const response = await axios.post(
      `${BASE_URL}/api/ibm/webhook`,
      payload,
      { headers: { "x-api-key": IBM_API_KEY } }
    );
    console.log("✅ Webhook successful:", response.data);
    testPaymentId = response.data.erpRefId;
  } catch (err) {
    console.log("❌ Webhook failed:", err.response?.data || err.message);
  }
}

async function testCheckCode(token) {
  console.log("\n📌 TEST 3: Check Code Endpoint");
  try {
    const response = await axios.get(
      `${BASE_URL}/api/ibm/check-code/QK4T7X9Z2W`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log("✅ Check code successful:", response.data);
  } catch (err) {
    console.log("❌ Check code failed:", err.response?.data || err.message);
  }
}

async function testClaim(token) {
  console.log("\n📌 TEST 4: Claim Endpoint");
  try {
    // Get first campaign
    const campaigns = await axios.get(`${BASE_URL}/api/contribution-types`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (!campaigns.data || campaigns.data.length === 0) {
      console.log("❌ No campaigns found. Create one first.");
      return;
    }

    testCampaignId = campaigns.data[0].id;
    console.log(`📌 Using campaign: ${campaigns.data[0].title} (${testCampaignId})`);

    const response = await axios.post(
      `${BASE_URL}/api/ibm/claim`,
      {
        code: "QK4T7X9Z2W",
        contributionTypeId: testCampaignId,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log("✅ Claim successful:", response.data);
  } catch (err) {
    console.log("❌ Claim failed:", err.response?.data || err.message);
  }
}

async function runTests() {
  console.log("🚀 STARTING I&M INTEGRATION TESTS\n");
  console.log("===========================================");

  // Test 1: Validation (no auth needed)
  await testValidate();

  // Test 2: Webhook (no auth needed)
  await testWebhook();

  // Login as admin
  console.log("\n🔐 Logging in as admin...");
  adminToken = await login(ADMIN_EMAIL, ADMIN_PASS);
  if (!adminToken) {
    console.log("❌ Admin login failed. Check credentials.");
    return;
  }
  console.log("✅ Admin logged in");

  // Test 3: Check code (needs auth)
  await testCheckCode(adminToken);

  // Test 4: Claim (needs auth)
  await testClaim(adminToken);

  console.log("\n===========================================");
  console.log("✅ I&M INTEGRATION TESTS COMPLETE");
}

runTests();