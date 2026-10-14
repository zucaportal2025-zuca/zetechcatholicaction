// backend/scripts/debugPDFData.js
// Run: node scripts/debugPDFData.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://zuca-backend-iw9p.onrender.com';
// const BASE_URL = 'http://localhost:5000';

async function debugPDFData() {
  try {
    console.log('🔍 DEBUGGING PDF DATA FLOW');
    console.log('='.repeat(60));
    
    // Step 1: Login
    console.log('\n📝 STEP 1: Login to get token');
    const loginRes = await axios.post(`${BASE_URL}/api/login`, {
      email: 'zucaportal2025@gmail.com',
      password: 'adminzuca'
    });
    const token = loginRes.data.token;
    console.log('✅ Logged in successfully');
    
    // Step 2: Get Christopher Maina
    console.log('\n📝 STEP 2: Find Christopher Maina');
    const userRes = await axios.get(`${BASE_URL}/api/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const christopher = userRes.data.find(u => u.fullName.includes('CHRISTOPHER MAINA'));
    if (!christopher) {
      console.log('❌ Christopher Maina not found');
      return;
    }
    console.log(`✅ Found Christopher Maina (ID: ${christopher.id})`);
    
    // Step 3: Get current semester
    console.log('\n📝 STEP 3: Get current semester');
    const semRes = await axios.get(`${BASE_URL}/api/semesters/current`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const semester = semRes.data.semester;
    console.log(`✅ Semester: ${semester.title}`);
    console.log(`   Start: ${semester.startDate}`);
    console.log(`   End: ${semester.endDate}`);
    
    // Step 4: Debug the report endpoint
    console.log('\n📝 STEP 4: Check report endpoint');
    try {
      const reportRes = await axios.get(
        `${BASE_URL}/api/semesters/${semester.id}/report/${christopher.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('✅ Report endpoint working');
      const report = reportRes.data.report;
      console.log(`   Meetings in report: ${report.meetings?.length || 0}`);
      if (report.meetings && report.meetings.length > 0) {
        console.log('   First meeting:', JSON.stringify(report.meetings[0], null, 2));
      } else {
        console.log('   ⚠️ No meetings in report!');
      }
    } catch (err) {
      console.log('❌ Report endpoint error:', err.response?.data || err.message);
    }
    
    // Step 5: Direct database query
    console.log('\n📝 STEP 5: Direct database query');
    
    // Get attendance entries with sheet data
    const entries = await prisma.attendanceEntry.findMany({
      where: {
        userId: christopher.id,
        signTime: {
          gte: new Date(semester.startDate),
          lte: new Date(semester.endDate)
        }
      },
      include: {
        sheet: {
          select: {
            id: true,
            title: true,
            eventDate: true,
            eventTime: true,
            location: true
          }
        }
      },
      orderBy: { signTime: 'desc' }
    });
    
    console.log(`📊 Found ${entries.length} attendance entries`);
    if (entries.length > 0) {
      console.log('\n📝 Attendance entries with sheet data:');
      entries.forEach((entry, i) => {
        console.log(`\n   ${i + 1}. Entry ID: ${entry.id}`);
        console.log(`      Sheet ID: ${entry.sheetId}`);
        console.log(`      Sheet Title: ${entry.sheet?.title || '❌ NO TITLE'}`);
        console.log(`      Sheet Date: ${entry.sheet?.eventDate || '❌ NO DATE'}`);
        console.log(`      Sheet Time: ${entry.sheet?.eventTime || '❌ NO TIME'}`);
        console.log(`      Sign Time: ${entry.signTime}`);
        console.log(`      Sign Method: ${entry.signMethod}`);
      });
    } else {
      console.log('⚠️ No attendance entries found for this semester');
    }
    
    // Step 6: Check eligible sheets
    console.log('\n📝 STEP 6: Check eligible sheets');
    const user = await prisma.user.findUnique({
      where: { id: christopher.id },
      select: { jumuiaId: true }
    });
    
    const isExecutive = await prisma.executive.findFirst({
      where: { userId: christopher.id, isActive: true }
    });
    
    const eligibleSheets = await prisma.attendanceSheet.findMany({
      where: {
        eventDate: {
          gte: new Date(semester.startDate),
          lte: new Date(semester.endDate)
        },
        OR: [
          { jumuiaId: null, isExecutiveOnly: false },
          { jumuiaId: user?.jumuiaId },
          ...(isExecutive ? [{ isExecutiveOnly: true }] : [])
        ]
      },
      select: {
        id: true,
        title: true,
        eventDate: true,
        eventTime: true,
        location: true
      },
      orderBy: { eventDate: 'asc' }
    });
    
    console.log(`📊 Found ${eligibleSheets.length} eligible sheets`);
    eligibleSheets.forEach((sheet, i) => {
      console.log(`   ${i + 1}. ${sheet.title} | ${sheet.eventDate} | ${sheet.eventTime}`);
    });
    
    // Step 7: Simulate the generateUserSemesterReport logic
    console.log('\n📝 STEP 7: Simulate report generation');
    
    const attendedSheetIds = new Set(entries.map(e => e.sheetId));
    console.log(`   Attended sheet IDs: ${Array.from(attendedSheetIds).join(', ')}`);
    
    const allMeetings = eligibleSheets.map((sheet, index) => {
      const entry = entries.find(e => e.sheetId === sheet.id);
      return {
        sheet: sheet,
        title: sheet.title || `Meeting ${index + 1}`,
        eventDate: sheet.eventDate,
        eventTime: sheet.eventTime,
        location: sheet.location,
        attended: attendedSheetIds.has(sheet.id),
        signMethod: entry?.signMethod || 'N/A',
        signTime: entry?.signTime || null
      };
    });
    
    console.log(`📊 Generated ${allMeetings.length} meetings`);
    console.log('\n📝 Meetings with attendance status:');
    allMeetings.forEach((meeting, i) => {
      const status = meeting.attended ? '✅ ATTENDED' : '❌ MISSED';
      console.log(`   ${i + 1}. ${meeting.title} | ${meeting.eventDate} | ${status}`);
    });
    
    // Step 8: Check if the report endpoint returns proper meeting data
    console.log('\n📝 STEP 8: Download PDF and check size');
    try {
      const pdfRes = await axios.get(
        `${BASE_URL}/api/semesters/${semester.id}/report/${christopher.id}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'arraybuffer'
        }
      );
      console.log(`✅ PDF downloaded: ${pdfRes.data.length} bytes`);
      
      // Save PDF for inspection
      const filename = `debug_christopher_report_${Date.now()}.pdf`;
      fs.writeFileSync(filename, pdfRes.data);
      console.log(`📄 PDF saved as: ${filename}`);
      console.log(`   Location: ${path.resolve(filename)}`);
    } catch (err) {
      console.log('❌ PDF download error:', err.response?.data || err.message);
    }
    
    // Step 9: Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`   Total Attendance Entries: ${entries.length}`);
    console.log(`   Total Eligible Sheets: ${eligibleSheets.length}`);
    console.log(`   Total Attended: ${attendedSheetIds.size}`);
    console.log(`   Total Missed: ${eligibleSheets.length - attendedSheetIds.size}`);
    console.log(`   Meetings with data: ${allMeetings.filter(m => m.title !== 'Unknown Meeting').length}`);
    
    if (entries.length === 0) {
      console.log('\n⚠️ ISSUE: No attendance entries found in this semester!');
      console.log('   Christopher may not have attended any meetings this semester.');
    } else if (allMeetings.filter(m => m.title !== 'Unknown Meeting').length === 0) {
      console.log('\n⚠️ ISSUE: No eligible sheets found!');
      console.log('   The semester dates may not match the sheet dates.');
    } else {
      console.log('\n✅ Data looks good! Check the PDF for meeting details.');
    }
    
    console.log('\n🏁 Debug complete');
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugPDFData();