// backend/services/semesterReportService.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { sendSemesterReportEmail: sendSemesterReportEmailViaMailer } = require('./mailer');

// ZUCA Logo URL
const ZUCA_LOGO_URL = "https://dcxuxitorpfujfbtyhhn.supabase.co/storage/v1/object/public/profiles/profile_c2dd6c54-4576-41b1-a85d-1af90d88254a_1777067617594.jpg";

async function generateUserSemesterReport(userId, semester, attendanceData) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        homeJumuia: { select: { name: true } },
        executiveAssignments: {
          where: { isActive: true },
          include: { 
            position: { 
              select: { 
                id: true,
                title: true,
                category: true,
                level: true
              } 
            } 
          }
        }
      }
    });

    if (!user) return null;

    const totalMeetings = attendanceData.length;
    const attendedMeetings = attendanceData.filter(e => e.attended).length;
    const missedMeetings = totalMeetings - attendedMeetings;
    const attendanceRate = totalMeetings > 0 ? (attendedMeetings / totalMeetings) * 100 : 0;

    const execPosition = user.executiveAssignments && user.executiveAssignments.length > 0
      ? user.executiveAssignments[0].position?.title
      : null;

    // FIX: Create meetings with proper data
    const meetings = attendanceData.map(entry => ({
      title: entry.title || 'Unknown Meeting',
      date: entry.eventDate || entry.signTime || new Date(),
      time: entry.eventTime || 'TBD',
      location: entry.location || 'ZUCA',
      status: entry.attended ? 'Attended' : 'Missed',
      signMethod: entry.signMethod || 'N/A'
    }));

    return {
      user: {
        fullName: user.fullName,
        email: user.email,
        phone: user.phone || 'N/A',
        profileImage: user.profileImage || null,
        membershipNumber: user.membership_number,
        jumuia: user.homeJumuia?.name || 'N/A',
        executivePosition: execPosition
      },
      semester: {
        title: semester.title,
        startDate: semester.startDate,
        endDate: semester.endDate,
        period: `${new Date(semester.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} - ${new Date(semester.endDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
      },
      stats: {
        totalMeetings,
        attendedMeetings,
        missedMeetings,
        attendanceRate: Math.round(attendanceRate),
        performance: attendanceRate >= 80 ? 'Excellent' :
                   attendanceRate >= 60 ? 'Good' :
                   attendanceRate >= 40 ? 'Fair' : 'Needs Improvement'
      },
      meetings: meetings,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating report:', error);
    return null;
  }
}

async function generatePDFReport(reportData, userObj = null, outputPath = null) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 50, 
        size: 'A4',
        bufferPages: true
      });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // ==================== PAGE 1: HEADER & SUMMARY ====================
      
      // Logo
      let logoLoaded = false;
      try {
        const imageResponse = await axios.get(ZUCA_LOGO_URL, { 
          responseType: 'arraybuffer',
          timeout: 3000
        });
        const imageBuffer = Buffer.from(imageResponse.data, 'binary');
        doc.image(imageBuffer, 50, 30, { width: 60 });
        logoLoaded = true;
      } catch (err) {
        console.log('⚠️ Could not load logo:', err.message);
      }

      const headerX = logoLoaded ? 120 : 50;
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .fillColor('#003366')
         .text('ZETECH UNIVERSITY CATHOLIC ACTION', headerX, 40, { 
           align: logoLoaded ? 'left' : 'center',
           width: logoLoaded ? 400 : 500
         });

      doc.moveDown(0.5);
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#1e293b')
         .text('SEMESTER ATTENDANCE REPORT', { align: 'center' });

      doc.fontSize(12)
         .font('Helvetica')
         .fillColor('#666666')
         .text(`Semester: ${reportData.semester.title}`, { align: 'center' });

      doc.fontSize(10)
         .fillColor('#888888')
         .text(`Period: ${reportData.semester.period}`, { align: 'center' });

      doc.moveDown(1.5);

      // User Info
      const startY = doc.y;
      let profileImageLoaded = false;
      
      if (userObj && userObj.profileImage) {
        try {
          const profileResponse = await axios.get(userObj.profileImage, {
            responseType: 'arraybuffer',
            timeout: 3000
          });
          const profileBuffer = Buffer.from(profileResponse.data, 'binary');
          
          const imageX = 50;
          const imageY = startY;
          const imageSize = 80;
          
          doc.save();
          doc.circle(imageX + imageSize/2, imageY + imageSize/2, imageSize/2)
             .clip();
          doc.image(profileBuffer, imageX, imageY, { 
            width: imageSize, 
            height: imageSize,
            fit: [imageSize, imageSize]
          });
          doc.restore();
          doc.circle(imageX + imageSize/2, imageY + imageSize/2, imageSize/2)
             .stroke('#003366', 2);
          
          profileImageLoaded = true;
        } catch (err) {
          console.log('⚠️ Could not load profile image:', err.message);
        }
      }

      const infoX = profileImageLoaded ? 150 : 50;
      const infoY = profileImageLoaded ? startY + 10 : startY;
      
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#1e293b')
         .text(reportData.user.fullName, infoX, infoY);

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#475569');

      const userInfo = [
        ['Membership #:', reportData.user.membershipNumber || 'N/A'],
        ['Jumuia:', reportData.user.jumuia],
        ['Executive Position:', reportData.user.executivePosition || 'N/A'],
        ['Email:', reportData.user.email || 'N/A'],
        ['Phone:', reportData.user.phone || 'N/A']
      ];

      let yPos = infoY + 25;
      userInfo.forEach(([label, value]) => {
        doc.font('Helvetica-Bold')
           .fillColor('#64748b')
           .text(`${label} `, infoX, yPos, { continued: true });
        doc.font('Helvetica')
           .fillColor('#1e293b')
           .text(value, { continued: false });
        yPos += 18;
      });

      if (reportData.user.executivePosition) {
        const badgeX = profileImageLoaded ? 150 : 50;
        const badgeY = yPos + 5;
        doc.rect(badgeX, badgeY, 200, 22)
           .fill('#dbeafe');
        doc.fillColor('#2563eb')
           .fontSize(9)
           .font('Helvetica-Bold')
           .text(`Executive: ${reportData.user.executivePosition}`, badgeX + 10, badgeY + 6);
        yPos += 35;
      }

      doc.y = Math.max(yPos + 10, startY + 120);

      // Attendance Summary
      doc.moveDown(1);
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#1e293b')
         .text('ATTENDANCE SUMMARY', { underline: true });

      doc.moveDown(0.5);

      const statsStartY = doc.y;
      const statsData = [
        ['Total Meetings', reportData.stats.totalMeetings],
        ['Attended', reportData.stats.attendedMeetings],
        ['Missed', reportData.stats.missedMeetings],
        ['Attendance Rate', `${reportData.stats.attendanceRate}%`],
        ['Performance', reportData.stats.performance]
      ];

      const boxWidth = 450;
      const boxHeight = statsData.length * 25 + 20;
      doc.rect(50, statsStartY, boxWidth, boxHeight)
         .stroke('#e2e8f0');

      statsData.forEach(([label, value], index) => {
        const y = statsStartY + 12 + (index * 25);
        doc.font('Helvetica-Bold')
           .fillColor('#64748b')
           .text(label, 60, y);
        doc.font('Helvetica')
           .fillColor('#1e293b')
           .text(String(value), 200, y);
      });

      doc.moveDown(6);

      // Performance
      const rate = reportData.stats.attendanceRate;
      let color = '#10b981';
      let label = 'Excellent';
      let message = 'Outstanding commitment! Your dedication to ZUCA is exemplary.';
      
      if (rate >= 90) {
        color = '#10b981';
        label = 'Excellent';
        message = 'Outstanding commitment! Your dedication to ZUCA is exemplary.';
      } else if (rate >= 80) {
        color = '#10b981';
        label = 'Excellent';
        message = 'Excellent participation! Keep up the great work.';
      } else if (rate >= 70) {
        color = '#3b82f6';
        label = 'Good';
        message = 'Good effort! Try to attend a few more meetings.';
      } else if (rate >= 60) {
        color = '#3b82f6';
        label = 'Fair';
        message = 'Fair attendance. Aim to attend more meetings next semester.';
      } else if (rate >= 50) {
        color = '#f59e0b';
        label = 'Needs Improvement';
        message = 'Room for improvement. Set a goal to attend more meetings.';
      } else {
        color = '#ef4444';
        label = 'Needs Improvement';
        message = 'We encourage you to participate more in ZUCA activities.';
      }

      doc.rect(50, doc.y, 450, 45)
         .fill(color);
      doc.fillColor('#ffffff')
         .fontSize(12)
         .font('Helvetica-Bold')
         .text(`${label} Performance (${reportData.stats.attendanceRate}%)`, 60, doc.y + 10);
      doc.fontSize(9)
         .font('Helvetica')
         .text(message, 60, doc.y + 28);

      // ==================== MEETING DETAILS ====================
      const meetings = reportData.meetings || [];
      
      if (meetings.length > 0) {
        doc.addPage();

        // Meeting Details Header
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#1e293b')
           .text('MEETING DETAILS', { underline: true });

        doc.moveDown(0.5);

        // Table Header
        const tableTop = doc.y;
        
        doc.fontSize(9)
           .font('Helvetica-Bold')
           .fillColor('#ffffff');
        doc.rect(50, tableTop, 450, 20).fill('#003366');
        
        doc.text('Meeting', 55, tableTop + 5);
        doc.text('Date', 250, tableTop + 5);
        doc.text('Time', 330, tableTop + 5);
        doc.text('Status', 410, tableTop + 5);

        let y = tableTop + 25;
        doc.fontSize(8)
           .font('Helvetica');

        // Meeting Rows
        let rowCount = 0;
        meetings.forEach((meeting, index) => {
          if (!meeting.title || meeting.title === 'Unknown Meeting') return;
          
          if (y > 750) {
            doc.addPage();
            y = 50;
            
            doc.fontSize(9)
               .font('Helvetica-Bold')
               .fillColor('#ffffff');
            doc.rect(50, y - 20, 450, 20).fill('#003366');
            doc.text('Meeting', 55, y - 15);
            doc.text('Date', 250, y - 15);
            doc.text('Time', 330, y - 15);
            doc.text('Status', 410, y - 15);
            doc.fontSize(8)
               .font('Helvetica');
          }

          // Row background
          const bgColor = rowCount % 2 === 0 ? '#f8fafc' : '#ffffff';
          doc.rect(50, y - 2, 450, 16).fill(bgColor);
          
          // ✅ FIX: Set text color to DARK for visibility
          doc.fillColor('#1e293b');
          
          const title = meeting.title.length > 25 ? meeting.title.substring(0, 22) + '...' : meeting.title;
          doc.text(title, 55, y);
          
          const dateStr = meeting.date ? new Date(meeting.date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          }) : 'N/A';
          doc.text(dateStr, 250, y);
          
          doc.text(meeting.time || 'TBD', 330, y);

          // ✅ Status with color - GREEN for Attended, RED for Missed
          const statusColor = meeting.status === 'Attended' ? '#10b981' : '#ef4444';
          doc.fillColor(statusColor)
             .text(meeting.status, 410, y);
          
          // Reset color for next row
          doc.fillColor('#1e293b');

          y += 18;
          rowCount++;
        });
      }

      // ==================== CERTIFICATE ====================
      if (reportData.stats.attendanceRate >= 80) {
        doc.addPage();
        
        doc.rect(40, 40, 520, 750)
           .stroke('#003366', 2);
        
        const cornerSize = 20;
        const corners = [
          [40, 40, 40 + cornerSize, 40, 40, 40 + cornerSize],
          [560, 40, 560 - cornerSize, 40, 560, 40 + cornerSize],
          [40, 790, 40 + cornerSize, 790, 40, 790 - cornerSize],
          [560, 790, 560 - cornerSize, 790, 560, 790 - cornerSize]
        ];
        corners.forEach(([x1, y1, x2, y2, x3, y3]) => {
          doc.moveTo(x1, y1)
             .lineTo(x2, y2)
             .lineTo(x3, y3)
             .stroke('#003366', 2);
        });
        
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .fillColor('#003366')
           .text('CERTIFICATE OF EXCELLENCE', 50, 100, { align: 'center' });
        
        doc.moveDown(1);
        doc.fontSize(14)
           .font('Helvetica')
           .fillColor('#1e293b')
           .text('This certifies that', 50, 160, { align: 'center' });
        
        doc.fontSize(22)
           .font('Helvetica-Bold')
           .fillColor('#003366')
           .text(reportData.user.fullName, 50, 200, { align: 'center' });
        
        doc.fontSize(12)
           .font('Helvetica')
           .fillColor('#1e293b')
           .text(
             'has demonstrated outstanding commitment to Zetech University Catholic Action',
             50, 250, { align: 'center' }
           );
        doc.text(
          `by achieving ${reportData.stats.attendanceRate}% attendance during the`,
          50, 270, { align: 'center' }
        );
        doc.text(
          `${reportData.semester.title} semester.`,
          50, 290, { align: 'center' }
        );
        
        doc.moveDown(2);
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#003366')
           .text(`Attendance Rate: ${reportData.stats.attendanceRate}%`, 50, 350, { align: 'center' });
        doc.text(`Meetings Attended: ${reportData.stats.attendedMeetings}/${reportData.stats.totalMeetings}`, 50, 370, { align: 'center' });
        
        doc.moveDown(3);
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#64748b')
           .text('Presented on this day', 50, 430, { align: 'center' });
        doc.text(new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }), 50, 450, { align: 'center' });
        
        doc.moveDown(1);
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#64748b')
           .text('ZUCA - Zetech University Catholic Action', 50, 490, { align: 'center' });
      }

      // ==================== FOOTER ====================
      const pageCount = doc.bufferedPageRange().count;
      
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        
        const footerY = doc.page.height - 30;
        
        doc.fontSize(8)
           .font('Helvetica')
           .fillColor('#94a3b8');
        
        doc.text(
          `Report generated on ${new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}`,
          50, footerY
        );
        
        doc.text(
          `Page ${i + 1} of ${pageCount}`,
          doc.page.width - 50, footerY, { align: 'right' }
        );
        
        doc.text(
          '© ZUCA Portal - All Rights Reserved',
          50, footerY + 15
        );
        
        doc.text(
          'Contact: zucaportal2025@gmail.com',
          doc.page.width - 50, footerY + 15, { align: 'right' }
        );
      }

      doc.end();
    } catch (error) {
      console.error('PDF generation error:', error);
      reject(error);
    }
  });
}

// ==================== SEND SEMESTER REPORT EMAIL ====================
async function sendSemesterReportEmail(userId, semester) {
  try {
    // Get user's attendance data for the semester
    const attendanceData = await prisma.attendanceEntry.findMany({
      where: {
        userId: userId,
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

    // Get eligible meetings (for missed meetings)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { jumuiaId: true, profileImage: true, phone: true }
    });

    const isExecutive = await prisma.executive.findFirst({
      where: { userId: userId, isActive: true }
    });

    const eligibleSheets = await prisma.attendanceSheet.findMany({
      where: {
        eventDate: {
          gte: new Date(semester.startDate),
          lte: new Date(semester.endDate)
        },
        OR: [
          { jumuiaId: null, isExecutiveOnly: false },
{ jumuiaId: user?.jumuiaId, isExecutiveOnly: false },
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

    const attendedSheetIds = new Set(attendanceData.map(e => e.sheetId));
    
    const allMeetings = eligibleSheets.map(sheet => {
      const entry = attendanceData.find(e => e.sheetId === sheet.id);
      return {
        ...sheet,
        attended: attendedSheetIds.has(sheet.id),
        signMethod: entry?.signMethod || 'N/A',
        signTime: entry?.signTime || null
      };
    });

    const reportData = await generateUserSemesterReport(userId, semester, allMeetings);

    if (!reportData) {
      console.log(`❌ Could not generate report for user ${userId}`);
      return false;
    }

    const userObj = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        email: true, 
        fullName: true,
        profileImage: true,
        phone: true
      }
    });

    if (!userObj) {
      console.log(`❌ User ${userId} not found for email`);
      return false;
    }

    const pdfBuffer = await generatePDFReport(reportData, userObj);

    await sendSemesterReportEmailViaMailer(userObj, reportData, pdfBuffer, semester);

    console.log(`✅ Semester report sent to ${userObj.email}`);
    return true;

  } catch (error) {
    console.error(`❌ Error sending semester report to ${userId}:`, error);
    return false;
  }
}

// ==================== SEND REPORTS TO ALL ====================
async function sendSemesterReportsToAll(semester) {
  try {
    console.log(`📧 Sending semester reports to all users for: ${semester.title}`);

    const users = await prisma.$queryRaw`
      SELECT id, email, "fullName" 
      FROM "User" 
      WHERE email IS NOT NULL 
      AND email != ''
    `;

    console.log(`📊 Found ${users.length} users with email addresses`);

    if (users.length === 0) {
      console.log('⚠️ No users with email addresses found');
      return { successCount: 0, failCount: 0, total: 0 };
    }

    let successCount = 0;
    let failCount = 0;

    const BATCH_SIZE = 10;
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      
      console.log(`📊 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(users.length / BATCH_SIZE)}...`);
      
      const results = await Promise.allSettled(
        batch.map(user => sendSemesterReportEmail(user.id, semester))
      );

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          successCount++;
        } else {
          failCount++;
        }
      });

      console.log(`📊 Progress: ${Math.min(i + BATCH_SIZE, users.length)}/${users.length} processed`);
    }

    console.log(`✅ Semester reports sent: ${successCount} success, ${failCount} failed`);
    return { successCount, failCount, total: users.length };
  } catch (error) {
    console.error('❌ Error sending semester reports:', error);
    return { successCount: 0, failCount: 0, total: 0 };
  }
}

module.exports = {
  generateUserSemesterReport,
  generatePDFReport,
  sendSemesterReportEmail,
  sendSemesterReportsToAll
};