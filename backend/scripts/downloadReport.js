// backend/scripts/downloadReport.js
// Run: node scripts/downloadReport.js

const axios = require('axios');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'https://zuca-backend-iw9p.onrender.com';
// Or local: const BASE_URL = 'http://localhost:5000';

async function downloadReport() {
  try {
    // Login to get token
    const loginRes = await axios.post(`${BASE_URL}/api/login`, {
      email: 'zucaportal2025@gmail.com',
      password: 'adminzuca'
    });
    
    const token = loginRes.data.token;
    console.log('✅ Logged in successfully');

    // Get Christopher Maina's user ID
    const userRes = await axios.get(`${BASE_URL}/api/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const christopher = userRes.data.find(u => u.fullName.includes('CHRISTOPHER MAINA'));
    if (!christopher) {
      console.log('❌ Christopher Maina not found');
      return;
    }
    
    console.log(`✅ Found Christopher Maina (ID: ${christopher.id})`);

    // Get current semester
    const semRes = await axios.get(`${BASE_URL}/api/semesters/current`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const semesterId = semRes.data.semester.id;
    console.log(`✅ Current semester ID: ${semesterId}`);

    // Download the report
    const response = await axios.get(
      `${BASE_URL}/api/semesters/${semesterId}/report/${christopher.id}/download`,
      {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'arraybuffer'
      }
    );

    // Save to file
    const filename = `christopher_maina_report_${new Date().toISOString().split('T')[0]}.pdf`;
    fs.writeFileSync(filename, response.data);
    console.log(`✅ Report downloaded: ${filename}`);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  } finally {
    await prisma.$disconnect();
  }
}

downloadReport();