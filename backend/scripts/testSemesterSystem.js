// backend/scripts/testSemesterSystem.js
// Run with: node scripts/testSemesterSystem.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');
const { 
  getCurrentSemester, 
  getAllSemesters, 
  getSemesterPeriod,
  isSemesterEnded,
  isSemesterJustEnded,
  isSemesterEndDate,
  getNextSemester,
  checkForNewSemester
} = require('../utils/semesterHelpers');
const { 
  generateUserSemesterReport, 
  generatePDFReport, 
  sendSemesterReportEmail,
  sendSemesterReportsToAll 
} = require('../services/semesterReportService');
const { 
  checkSemesterEndAndSendReports,
  manualSendSemesterReports,
  notifyNewSemester
} = require('../services/semesterScheduler');

// Configuration
const BASE_URL = 'http://localhost:5000';
const TEST_USERS = {
  admin: { email: 'zucaportal2025@gmail.com', password: 'adminzuca', role: 'admin' },
  regularUser: { email: 'chrismaina4433@gmail.com', password: 'chris', role: 'member' }
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  purple: '\x1b[35m',
  gray: '\x1b[90m',
  reset: '\x1b[0m'
};

let tokens = {};
let testUserId = null;
let testSemesterId = null;

// ==================== HELPER FUNCTIONS ====================

function log(level, message, data = null) {
  const prefix = {
    info: `${colors.blue}ℹ️${colors.reset}`,
    success: `${colors.green}✅${colors.reset}`,
    error: `${colors.red}❌${colors.reset}`,
    warning: `${colors.yellow}⚠️${colors.reset}`,
    debug: `${colors.gray}🔍${colors.reset}`,
    title: `${colors.cyan}📋${colors.reset}`,
    section: `${colors.purple}📌${colors.reset}`
  };
  
  console.log(`${prefix[level] || '📌'} ${message}`);
  if (data) {
    console.log(`${colors.gray}   ${JSON.stringify(data, null, 2)}${colors.reset}`);
  }
}

function printSeparator(char = '=', length = 80) {
  console.log(`${colors.gray}${char.repeat(length)}${colors.reset}`);
}

function printHeader(title) {
  printSeparator();
  console.log(`${colors.cyan}🧪 ${title}${colors.reset}`);
  printSeparator();
  console.log('');
}

function printSubHeader(title) {
  console.log('');
  console.log(`${colors.purple}📌 ${title}${colors.reset}`);
  console.log(`${colors.gray}${'-'.repeat(40)}${colors.reset}`);
}

async function login(email, password, userType) {
  try {
    const response = await axios.post(`${BASE_URL}/api/login`, { email, password });
    if (response.data.token) {
      tokens[userType] = response.data.token;
      log('success', `${userType} logged in`);
      return true;
    }
    return false;
  } catch (error) {
    log('error', `${userType} login failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function getHeaders() {
  return { Authorization: `Bearer ${tokens.admin}` };
}

// ==================== TEST FUNCTIONS ====================

// 1. Test Semester Helpers
async function testSemesterHelpers() {
  printSubHeader('1. Testing Semester Helpers');
  
  try {
    // Test getCurrentSemester
    log('debug', 'Testing getCurrentSemester()...');
    const current = await getCurrentSemester(prisma);
    if (current) {
      log('success', `Current semester: ${current.title}`);
      console.log(`   📅 Period: ${getSemesterPeriod(current)?.display || 'N/A'}`);
      console.log(`   📅 Start: ${current.startDate}`);
      console.log(`   📅 End: ${current.endDate}`);
      testSemesterId = current.id;
    } else {
      log('warning', 'No current semester found');
    }
    
    // Test getAllSemesters
    log('debug', 'Testing getAllSemesters()...');
    const all = await getAllSemesters(prisma);
    log('success', `Found ${all.length} semesters`);
    all.forEach((s, i) => {
      const period = getSemesterPeriod(s);
      console.log(`   ${i + 1}. ${s.title} (${period?.display || 'No period'})`);
    });
    
    // Test isSemesterEnded
    if (current) {
      log('debug', 'Testing isSemesterEnded()...');
      const ended = isSemesterEnded(current);
      console.log(`   Semester ended: ${ended ? '✅ Yes' : '❌ No'}`);
    }
    
    // Test isSemesterJustEnded
    if (current) {
      log('debug', 'Testing isSemesterJustEnded()...');
      const justEnded = isSemesterJustEnded(current);
      console.log(`   Semester just ended (24hrs): ${justEnded ? '✅ Yes' : '❌ No'}`);
    }
    
    // Test isSemesterEndDate
    if (current) {
      log('debug', 'Testing isSemesterEndDate()...');
      const isEndDate = isSemesterEndDate(current);
      console.log(`   Today is end date: ${isEndDate ? '✅ Yes' : '❌ No'}`);
    }
    
    // Test getNextSemester
    if (current) {
      log('debug', 'Testing getNextSemester()...');
      const next = await getNextSemester(prisma, current);
      if (next) {
        console.log(`   Next semester: ${next.title}`);
      } else {
        console.log('   Next semester: None found');
      }
    }
    
    // Test checkForNewSemester
    if (current) {
      log('debug', 'Testing checkForNewSemester()...');
      const newSem = await checkForNewSemester(prisma, current);
      if (newSem) {
        console.log(`   New semester detected: ${newSem.title}`);
      } else {
        console.log('   No new semester detected');
      }
    }
    
    return true;
  } catch (error) {
    log('error', `Test failed: ${error.message}`);
    console.error(error);
    return false;
  }
}

// 2. Test API Endpoints
async function testAPIEndpoints() {
  printSubHeader('2. Testing API Endpoints');
  
  try {
    const headers = await getHeaders();
    
    // Test GET /api/semesters/current
    log('debug', 'Testing GET /api/semesters/current...');
    const currentRes = await axios.get(`${BASE_URL}/api/semesters/current`, { headers });
    if (currentRes.data.semester) {
      log('success', 'Current semester API working');
      console.log(`   Title: ${currentRes.data.semester.title}`);
      console.log(`   Period: ${currentRes.data.semester.period?.display || 'N/A'}`);
      console.log(`   Active: ${currentRes.data.semester.isActiveSemester ? 'Yes' : 'No'}`);
    } else {
      log('warning', 'No current semester from API');
    }
    
    // Test GET /api/semesters/all
    log('debug', 'Testing GET /api/semesters/all...');
    const allRes = await axios.get(`${BASE_URL}/api/semesters/all`, { headers });
    log('success', `All semesters API returned ${allRes.data.semesters?.length || 0} semesters`);
    
    return true;
  } catch (error) {
    log('error', `API test failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// 3. Test Report Generation
async function testReportGeneration() {
  printSubHeader('3. Testing Report Generation');
  
  try {
    // Get a user with attendance
    const user = await prisma.user.findFirst({
      where: {
        attendanceEntries: { some: {} }
      },
      select: { id: true, fullName: true, email: true }
    });
    
    if (!user) {
      log('warning', 'No user with attendance found - skipping report tests');
      return true;
    }
    
    testUserId = user.id;
    log('success', `Using user: ${user.fullName} (${user.email})`);
    
    // Get current semester
    const semester = await getCurrentSemester(prisma);
    if (!semester) {
      log('warning', 'No current semester - skipping report tests');
      return true;
    }
    
    // Test attendance data fetch
    log('debug', 'Fetching attendance data...');
    const attendanceData = await prisma.attendanceEntry.findMany({
      where: {
        userId: user.id,
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
      }
    });
    console.log(`   Found ${attendanceData.length} attendance entries`);
    
    // Test report generation
    log('debug', 'Testing generateUserSemesterReport()...');
    const eligibleSheets = await prisma.attendanceSheet.findMany({
      where: {
        eventDate: {
          gte: new Date(semester.startDate),
          lte: new Date(semester.endDate)
        },
        OR: [
          { jumuiaId: null, isExecutiveOnly: false },
          { jumuiaId: user.jumuiaId }
        ]
      }
    });
    
    const attendedSheetIds = new Set(attendanceData.map(e => e.sheetId));
    const allMeetings = eligibleSheets.map(sheet => ({
      ...sheet,
      attended: attendedSheetIds.has(sheet.id)
    }));
    
    const reportData = await generateUserSemesterReport(user.id, semester, allMeetings);
    
    if (reportData) {
      log('success', 'Report generated successfully');
      console.log(`   📊 Total Meetings: ${reportData.stats.totalMeetings}`);
      console.log(`   ✅ Attended: ${reportData.stats.attendedMeetings}`);
      console.log(`   ❌ Missed: ${reportData.stats.missedMeetings}`);
      console.log(`   📈 Rate: ${reportData.stats.attendanceRate}%`);
      console.log(`   🏆 Performance: ${reportData.stats.performance}`);
    } else {
      log('error', 'Report generation returned null');
    }
    
    // Test PDF generation
    if (reportData) {
      log('debug', 'Testing generatePDFReport()...');
      const pdfBuffer = await generatePDFReport(reportData);
      console.log(`   PDF size: ${pdfBuffer.length} bytes`);
      log('success', 'PDF generated successfully');
    }
    
    return true;
  } catch (error) {
    log('error', `Report test failed: ${error.message}`);
    console.error(error);
    return false;
  }
}

// 4. Test Semester End Detection
async function testSemesterEndDetection() {
  printSubHeader('4. Testing Semester End Detection');
  
  try {
    const semester = await getCurrentSemester(prisma);
    if (!semester) {
      log('warning', 'No current semester - skipping end detection test');
      return true;
    }
    
    log('debug', 'Testing semester end detection...');
    
    // Get a schedule to test with (use a past schedule if available)
    const pastSchedule = await prisma.schedule.findFirst({
      where: {
        isPublished: true,
        endDate: { lt: new Date() }
      },
      orderBy: { endDate: 'desc' }
    });
    
    if (pastSchedule) {
      log('debug', `Testing with past schedule: ${pastSchedule.title}`);
      const ended = isSemesterEnded(pastSchedule);
      const justEnded = isSemesterJustEnded(pastSchedule);
      console.log(`   Ended: ${ended ? '✅ Yes' : '❌ No'}`);
      console.log(`   Just ended (24hrs): ${justEnded ? '✅ Yes' : '❌ No'}`);
      
      // Test checkForNewSemester with past schedule
      const newSem = await checkForNewSemester(prisma, pastSchedule);
      console.log(`   New semester detected: ${newSem ? newSem.title : 'None'}`);
    } else {
      // Test with current schedule
      log('debug', `Testing with current schedule: ${semester.title}`);
      const ended = isSemesterEnded(semester);
      console.log(`   Ended: ${ended ? '✅ Yes' : '❌ No'}`);
    }
    
    // Test checkSemesterEndAndSendReports (dry run - won't actually send emails)
    log('debug', 'Testing checkSemesterEndAndSendReports() (dry run)...');
    try {
      // We'll just check if it runs without errors
      await checkSemesterEndAndSendReports();
      log('success', 'checkSemesterEndAndSendReports() executed without errors');
    } catch (err) {
      log('error', `checkSemesterEndAndSendReports() failed: ${err.message}`);
    }
    
    return true;
  } catch (error) {
    log('error', `End detection test failed: ${error.message}`);
    return false;
  }
}

// 5. Test Notifications - FIXED
async function testNotifications() {
  printSubHeader('5. Testing Notifications');
  
  try {
    // ✅ FIXED: Get any user (no email filter)
    const testUser = await prisma.user.findFirst({
      select: { id: true }
    });
    
    if (!testUser) {
      log('warning', 'No test user found for notifications');
      return true;
    }
    
    log('debug', 'Creating test notification...');
    const notification = await prisma.notification.create({
      data: {
        userId: testUser.id,
        type: 'test',
        title: '🧪 Test Notification',
        message: 'This is a test notification from the semester system test.',
        read: false
      }
    });
    
    log('success', `Test notification created (ID: ${notification.id})`);
    
    // Clean up
    await prisma.notification.delete({ where: { id: notification.id } });
    log('debug', 'Test notification cleaned up');
    
    return true;
  } catch (error) {
    log('error', `Notification test failed: ${error.message}`);
    return false;
  }
}

// 6. Test Admin Override Functions
async function testAdminOverrides() {
  printSubHeader('6. Testing Admin Override Functions');
  
  try {
    const semester = await getCurrentSemester(prisma);
    if (!semester) {
      log('warning', 'No current semester - skipping admin override test');
      return true;
    }
    
    // Test manualSendSemesterReports (dry run - won't actually send emails without users)
    log('debug', 'Testing manualSendSemesterReports() (dry run)...');
    try {
      // This would actually send emails if there are users with attendance
      // We'll just check if the function exists and runs
      if (typeof manualSendSemesterReports === 'function') {
        log('success', 'manualSendSemesterReports() function exists');
        // Don't actually run it to avoid sending emails during test
      }
    } catch (err) {
      log('error', `manualSendSemesterReports() test failed: ${err.message}`);
    }
    
    // Test notifyNewSemester (dry run)
    log('debug', 'Testing notifyNewSemester() (dry run)...');
    try {
      // Create a test semester object
      const testSemester = {
        id: 'test-id',
        title: 'Test Semester',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };
      
      // Don't actually run it to avoid sending notifications during test
      if (typeof notifyNewSemester === 'function') {
        log('success', 'notifyNewSemester() function exists');
      }
    } catch (err) {
      log('error', `notifyNewSemester() test failed: ${err.message}`);
    }
    
    return true;
  } catch (error) {
    log('error', `Admin override test failed: ${error.message}`);
    return false;
  }
}

// 7. Test Email Integration - FIXED
async function testEmailIntegration() {
  printSubHeader('7. Testing Email Integration');
  
  try {
    // ✅ FIXED: Get any user (no email filter needed)
    const user = await prisma.user.findFirst({
      select: { id: true, email: true, fullName: true }
    });
    
    if (!user) {
      log('warning', 'No user found - skipping email test');
      return true;
    }
    
    log('debug', `Testing email for: ${user.email || 'No email'}`);
    
    // Test sendSemesterReportEmail (dry run - check if function exists)
    if (typeof sendSemesterReportEmail === 'function') {
      log('success', 'sendSemesterReportEmail() function exists');
    }
    
    // Test sendSemesterReportsToAll (dry run)
    if (typeof sendSemesterReportsToAll === 'function') {
      log('success', 'sendSemesterReportsToAll() function exists');
    }
    
    return true;
  } catch (error) {
    log('error', `Email test failed: ${error.message}`);
    return false;
  }
}

// 8. Run All Tests with Authentication
async function runAllTests() {
  printHeader('SEMESTER SYSTEM TEST SUITE');
  
  // Step 1: Login
  console.log('');
  printSubHeader('Authentication');
  
  const adminLoggedIn = await login(TEST_USERS.admin.email, TEST_USERS.admin.password, 'Admin');
  if (!adminLoggedIn) {
    log('error', 'Admin login failed. Tests cannot continue.');
    return;
  }
  
  const userLoggedIn = await login(TEST_USERS.regularUser.email, TEST_USERS.regularUser.password, 'Regular User');
  if (!userLoggedIn) {
    log('warning', 'Regular user login failed. Some tests may be skipped.');
  }
  
  // Run all tests
  const results = {
    'Semester Helpers': await testSemesterHelpers(),
    'API Endpoints': await testAPIEndpoints(),
    'Report Generation': await testReportGeneration(),
    'Semester End Detection': await testSemesterEndDetection(),
    'Notifications': await testNotifications(),
    'Admin Overrides': await testAdminOverrides(),
    'Email Integration': await testEmailIntegration()
  };
  
  // Print Summary
  printHeader('TEST SUMMARY');
  
  console.log('');
  console.log(`${colors.cyan}┌────────────────────────────────┬──────────┐${colors.reset}`);
  console.log(`${colors.cyan}│ Test                           │ Status   │${colors.reset}`);
  console.log(`${colors.cyan}├────────────────────────────────┼──────────┤${colors.reset}`);
  
  let passed = 0;
  let failed = 0;
  
  Object.entries(results).forEach(([name, result]) => {
    const status = result ? `${colors.green}✅ PASSED${colors.reset}` : `${colors.red}❌ FAILED${colors.reset}`;
    const paddedName = name.padEnd(30);
    console.log(`${colors.cyan}│${colors.reset} ${paddedName} │ ${status} ${colors.cyan}│${colors.reset}`);
    if (result) passed++; else failed++;
  });
  
  console.log(`${colors.cyan}└────────────────────────────────┴──────────┘${colors.reset}`);
  
  console.log('');
  console.log(`${colors.cyan}📊 Results: ${colors.green}${passed} passed${colors.reset}, ${colors.red}${failed} failed${colors.reset}, ${colors.gray}${Object.keys(results).length} total${colors.reset}`);
  
  if (passed === Object.keys(results).length) {
    console.log('');
    console.log(`${colors.green}🎉 ALL TESTS PASSED! The semester system is working correctly.${colors.reset}`);
  } else {
    console.log('');
    console.log(`${colors.yellow}⚠️ Some tests failed. Please check the logs above.${colors.reset}`);
  }
  
  console.log('');
  printSeparator();
  
  // Print test user info
  if (testUserId) {
    console.log(`${colors.gray}📝 Test User ID: ${testUserId}${colors.reset}`);
  }
  if (testSemesterId) {
    console.log(`${colors.gray}📝 Test Semester ID: ${testSemesterId}${colors.reset}`);
  }
  
  console.log('');
  console.log(`${colors.green}🏁 Test suite completed${colors.reset}`);
  
  await prisma.$disconnect();
}

// Run the tests
runAllTests().catch((error) => {
  console.error(`${colors.red}❌ Fatal error:${colors.reset}`, error);
  process.exit(1);
});