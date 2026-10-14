// backend/scripts/debugReportGeneration.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateUserSemesterReport, generatePDFReport } = require('../services/semesterReportService');

async function debugReportGeneration() {
  try {
    // Get the semester
    const semester = await prisma.schedule.findFirst({
      where: {
        isPublished: true,
        startDate: { not: null },
        endDate: { not: null }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!semester) {
      console.log('❌ No semester found');
      return;
    }

    console.log('📅 Semester:', semester.title);
    console.log('   Start:', semester.startDate);
    console.log('   End:', semester.endDate);
    console.log('');

    // Get ESTHER NDUNGE MUSEMBI
    const user = await prisma.user.findFirst({
      where: {
        email: 'emusembi518@gmail.com'
      },
      select: {
        id: true,
        fullName: true,
        email: true
      }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('👤 User:', user.fullName);
    console.log('   ID:', user.id);
    console.log('');

    // Get attendance entries for this user
    const entries = await prisma.attendanceEntry.findMany({
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
      },
      orderBy: { signTime: 'desc' }
    });

    console.log(`📊 Found ${entries.length} attendance entries for this semester`);
    entries.forEach(e => {
      console.log(`   - ${e.sheet?.title} | ${e.signTime}`);
    });
    console.log('');

    // Get eligible meetings (for missed meetings)
    const isExecutive = await prisma.executive.findFirst({
      where: { userId: user.id, isActive: true }
    });

    console.log('👔 Is Executive:', isExecutive ? 'Yes' : 'No');

    const eligibleSheets = await prisma.attendanceSheet.findMany({
      where: {
        eventDate: {
          gte: new Date(semester.startDate),
          lte: new Date(semester.endDate)
        },
        OR: [
          { jumuiaId: null, isExecutiveOnly: false },
          { jumuiaId: user.jumuiaId },
          ...(isExecutive ? [{ isExecutiveOnly: true }] : [])
        ]
      },
      select: {
        id: true,
        title: true,
        eventDate: true,
        eventTime: true,
        location: true
      }
    });

    console.log(`📊 Found ${eligibleSheets.length} eligible meetings`);
    eligibleSheets.forEach(s => {
      console.log(`   - ${s.title} | ${s.eventDate}`);
    });
    console.log('');

    // Build attendance data
    const attendedSheetIds = new Set(entries.map(e => e.sheetId));
    const allMeetings = eligibleSheets.map(sheet => ({
      ...sheet,
      attended: attendedSheetIds.has(sheet.id)
    }));

    console.log(`📊 All meetings with attendance status:`);
    allMeetings.forEach(m => {
      console.log(`   - ${m.title} | ${m.eventDate} | ${m.attended ? '✅ ATTENDED' : '❌ MISSED'}`);
    });
    console.log('');

    // Generate report
    console.log('📝 Generating report...');
    const reportData = await generateUserSemesterReport(user.id, semester, allMeetings);

    if (reportData) {
      console.log('✅ Report generated successfully!');
      console.log(`   📊 Attendance Rate: ${reportData.stats.attendanceRate}%`);
      console.log(`   📊 Performance: ${reportData.stats.performance}`);
      console.log(`   📊 Total Meetings: ${reportData.stats.totalMeetings}`);
      console.log(`   📊 Attended: ${reportData.stats.attendedMeetings}`);
      console.log(`   📊 Missed: ${reportData.stats.missedMeetings}`);
      
      // Generate PDF
      console.log('📄 Generating PDF...');
      const pdfBuffer = await generatePDFReport(reportData);
      console.log(`✅ PDF generated: ${pdfBuffer.length} bytes`);
      
    } else {
      console.log('❌ Report generation returned null');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

debugReportGeneration();