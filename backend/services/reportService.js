const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const PDFDocument = require('pdfkit');
const SibApiV3Sdk = require('sib-api-v3-sdk');

// ==================== BREVO SETUP ====================
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;
const brevoApi = new SibApiV3Sdk.TransactionalEmailsApi();

// ZUCA Logo URL
const ZUCA_LOGO_URL = "https://dcxuxitorpfujfbtyhhn.supabase.co/storage/v1/object/public/profiles/profile_c2dd6c54-4576-41b1-a85d-1af90d88254a_1777067617594.jpg";

// ==================== HELPER: GET FORMAL GREETING ====================
function getFormalGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good evening";
}

/**
 * Generate a PDF report from the report data
 */
function generatePDFReport(report) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ========== HEADER ==========
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .fillColor('#1a237e')
         .text('ZUCA SYSTEM REPORT', { align: 'center' });
      
      doc.moveDown(0.5);
      
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#666')
         .text(`Report Period: ${new Date(report.reportPeriod.start).toLocaleString()} - ${new Date(report.reportPeriod.end).toLocaleString()}`, { align: 'center' });
      
      doc.text(`Generated: ${new Date(report.reportDate).toLocaleString()}`, { align: 'center' });
      
      doc.moveDown(1);
      doc.lineWidth(1).strokeColor('#1a237e').moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      // ========== SUMMARY SECTION ==========
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fillColor('#1a237e')
         .text('SUMMARY', { underline: true });  // ✅ Removed emoji
      
      doc.moveDown(0.5);
      
      const summary = report.summary;
      const summaryItems = [
        ['New Users', summary.newUsers],
        ['New Pledges', summary.newPledges],
        ['Announcements', summary.newAnnouncements],
        ['Active Users', summary.activeUsers],
        ['Errors', summary.errors],
        ['Total Activities', summary.totalActivities]
      ];
      
      let xPos = 50;
      let yPos = doc.y;
      const boxWidth = 230;
      const boxHeight = 60;
      
      summaryItems.forEach((item, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        
        if (col === 0) {
          xPos = 50;
        } else {
          xPos = 50 + boxWidth + 20;
        }
        
        if (row > 0 && col === 0) {
          yPos += boxHeight + 10;
        }
        
        doc.rect(xPos, yPos, boxWidth, boxHeight)
           .fillAndStroke('#f5f5f5', '#e0e0e0');
        
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#666')
           .text(item[0], xPos + 10, yPos + 5, { width: boxWidth - 20, align: 'center' });
        
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .fillColor(item[0] === 'Errors' && item[1] > 0 ? '#f44336' : '#1a237e')
           .text(String(item[1]), xPos + 10, yPos + 20, { width: boxWidth - 20, align: 'center' });
      });
      
      doc.y = yPos + boxHeight + 20;
      
      doc.moveDown(1);
      doc.lineWidth(1).strokeColor('#e0e0e0').moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      // ========== NEW USERS ==========
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#1a237e')
         .text(`NEW USERS (${report.details.newUsers.length})`);  // ✅ Removed emoji
      
      doc.moveDown(0.5);
      
      if (report.details.newUsers.length > 0) {
        const tableTop = doc.y;
        doc.fontSize(9)
           .font('Helvetica-Bold')
           .fillColor('#fff');
        
        doc.rect(50, tableTop, 130, 20).fill('#1a237e');
        doc.text('Name', 55, tableTop + 4);
        
        doc.rect(180, tableTop, 160, 20).fill('#1a237e');
        doc.text('Email', 185, tableTop + 4);
        
        doc.rect(340, tableTop, 100, 20).fill('#1a237e');
        doc.text('Membership', 345, tableTop + 4);
        
        doc.rect(440, tableTop, 105, 20).fill('#1a237e');
        doc.text('Jumuia', 445, tableTop + 4);
        
        let rowY = tableTop + 20;
        report.details.newUsers.slice(0, 15).forEach((u, i) => {
          const bgColor = i % 2 === 0 ? '#f9f9f9' : '#ffffff';
          
          doc.rect(50, rowY, 495, 18).fill(bgColor);
          doc.fontSize(8)
             .font('Helvetica')
             .fillColor('#333');
          
          doc.text(u.name.substring(0, 20), 55, rowY + 3);
          doc.text(u.email.substring(0, 25), 185, rowY + 3);
          doc.text(u.membership || 'N/A', 345, rowY + 3);
          doc.text(u.jumuia.substring(0, 15), 445, rowY + 3);
          
          rowY += 18;
        });
        
        doc.y = rowY + 5;
        
        if (report.details.newUsers.length > 15) {
          doc.fontSize(9).fillColor('#666').text(`... and ${report.details.newUsers.length - 15} more users`);
        }
      } else {
        doc.fontSize(10).fillColor('#666').text('No new users in the last 24 hours.');
      }
      
      doc.moveDown(1);
      doc.lineWidth(1).strokeColor('#e0e0e0').moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      // ========== NEW PLEDGES ==========
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#1a237e')
         .text(`NEW PLEDGES (${report.details.newPledges.length})`);  // ✅ Removed emoji
      
      doc.moveDown(0.5);
      
      if (report.details.newPledges.length > 0) {
        const tableTop = doc.y;
        doc.fontSize(9)
           .font('Helvetica-Bold')
           .fillColor('#fff');
        
        doc.rect(50, tableTop, 120, 20).fill('#1a237e');
        doc.text('User', 55, tableTop + 4);
        
        doc.rect(170, tableTop, 130, 20).fill('#1a237e');
        doc.text('Campaign', 175, tableTop + 4);
        
        doc.rect(300, tableTop, 80, 20).fill('#1a237e');
        doc.text('Amount', 305, tableTop + 4);
        
        doc.rect(380, tableTop, 80, 20).fill('#1a237e');
        doc.text('Pending', 385, tableTop + 4);
        
        doc.rect(460, tableTop, 85, 20).fill('#1a237e');
        doc.text('Status', 465, tableTop + 4);
        
        let rowY = tableTop + 20;
        report.details.newPledges.slice(0, 15).forEach((p, i) => {
          const bgColor = i % 2 === 0 ? '#f9f9f9' : '#ffffff';
          
          doc.rect(50, rowY, 495, 18).fill(bgColor);
          doc.fontSize(8)
             .font('Helvetica')
             .fillColor('#333');
          
          doc.text(p.user.substring(0, 15), 55, rowY + 3);
          doc.text(p.campaign.substring(0, 20), 175, rowY + 3);
          doc.text(`KES ${p.amount.toLocaleString()}`, 305, rowY + 3);
          doc.text(`KES ${p.pending.toLocaleString()}`, 385, rowY + 3);
          
          const statusColor = p.status === 'COMPLETED' ? '#4caf50' : p.status === 'PENDING' ? '#ff9800' : '#2196f3';
          doc.fillColor(statusColor).text(p.status, 465, rowY + 3);
          
          rowY += 18;
        });
        
        doc.y = rowY + 5;
      } else {
        doc.fontSize(10).fillColor('#666').text('No new pledges in the last 24 hours.');
      }
      
      doc.moveDown(1);
      doc.lineWidth(1).strokeColor('#e0e0e0').moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      // ========== ERRORS ==========
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor(report.details.errors.length > 0 ? '#f44336' : '#1a237e')
         .text(`ERRORS (${report.details.errors.length})`);  // ✅ Removed emoji
      
      doc.moveDown(0.5);
      
      if (report.details.errors.length > 0) {
        report.details.errors.slice(0, 10).forEach((e) => {
          doc.fontSize(9)
             .font('Helvetica-Bold')
             .fillColor('#f44336')
             .text('• ' + e.message.substring(0, 80), { width: 495 });
          
          doc.fontSize(8)
             .font('Helvetica')
             .fillColor('#666')
             .text(`  Path: ${e.path} | Method: ${e.method} | User: ${e.userId}`, { width: 495 });
          
          doc.text(`  Time: ${new Date(e.timestamp).toLocaleString()}`, { width: 495 });
          doc.moveDown(0.3);
        });
        
        if (report.details.errors.length > 10) {
          doc.fontSize(9).fillColor('#666').text(`... and ${report.details.errors.length - 10} more errors`);
        }
      } else {
        doc.fontSize(10).fillColor('#4caf50').text('No errors detected in the last 24 hours.');
      }
      
      doc.moveDown(1);
      doc.lineWidth(1).strokeColor('#e0e0e0').moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      // ========== SECURITY ==========
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor(report.details.maliciousRequests.length > 0 ? '#ff9800' : '#1a237e')
         .text('SECURITY');  // ✅ Removed emoji
      
      doc.moveDown(0.5);
      
      if (report.details.maliciousRequests.length > 0) {
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#ff9800')
           .text(`⚠️ ${report.details.maliciousRequests.length} Malicious Request(s) Blocked`);
        
        report.details.maliciousRequests.slice(0, 5).forEach((m) => {
          doc.fontSize(8)
             .font('Helvetica')
             .fillColor('#666')
             .text(`• ${m.type} - ${m.endpoint} (${m.method}) from ${m.ip} at ${new Date(m.timestamp).toLocaleString()}`);
        });
      } else {
        doc.fontSize(10).fillColor('#4caf50').text('No malicious requests detected.');
      }
      
      doc.moveDown(1);
      doc.lineWidth(1).strokeColor('#e0e0e0').moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      // ========== SYSTEM HEALTH ==========
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#1a237e')
         .text('SYSTEM HEALTH');  // ✅ Removed emoji
      
      doc.moveDown(0.5);
      
      const health = report.details.systemHealth;
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#333');
      
      doc.text(`Status: ${health.status.toUpperCase()}`, { continued: true });
      const statusColor = health.status === 'healthy' ? '#4caf50' : '#f44336';
      doc.fillColor(statusColor).text(` ${health.status.toUpperCase()}`, { continued: false });
      
      doc.fillColor('#333');
      doc.text(`Uptime: ${health.uptime}`);
      doc.text(`Memory: ${health.memory.heapUsed} / ${health.memory.heapTotal} (RSS: ${health.memory.rss})`);
      doc.text(`Database: ${health.database.toUpperCase()}`);
      
      doc.moveDown(1);
      
      // ========== FOOTER ==========
      doc.lineWidth(1).strokeColor('#1a237e').moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);
      
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#666')
         .text('This is an automated report from ZUCA System Monitor.', { align: 'center' });
      
      doc.text('Tumsifu Yesu Kristu! 🙏', { align: 'center' });
      
      doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });

      doc.end();
      
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generate a 24-hour system activity report
 */
async function generate24HourReport() {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  console.log(`📊 Generating 24-hour report from ${twentyFourHoursAgo.toISOString()} to ${now.toISOString()}`);

  // ========== 1. NEW USERS ==========
  const newUsers = await prisma.user.findMany({
    where: {
      createdAt: { gte: twentyFourHoursAgo }
    },
    select: {
      fullName: true,
      email: true,
      phone: true,
      membership_number: true,
      role: true,
      specialRole: true,
      homeJumuia: { select: { name: true } },
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });

  // ========== 2. ERRORS ==========
  const errors = global.errorStore?.filter(e => 
    new Date(e.timestamp) >= twentyFourHoursAgo
  ) || [];

  // ========== 3. SYSTEM ACTIVITY ==========
  const activities = global.activityStore?.filter(a => 
    new Date(a.timestamp) >= twentyFourHoursAgo
  ) || [];

  // ========== 4. PLEDGES ==========
  const newPledges = await prisma.pledge.findMany({
    where: {
      createdAt: { gte: twentyFourHoursAgo }
    },
    include: {
      user: { select: { fullName: true, email: true } },
      contributionType: { select: { title: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // ========== 5. ANNOUNCEMENTS ==========
  const newAnnouncements = await prisma.announcement.findMany({
    where: {
      createdAt: { gte: twentyFourHoursAgo }
    },
    include: {
      author: { select: { fullName: true, email: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // ========== 6. LOGINS ==========
  const activeUsers = await prisma.user.findMany({
    where: {
      lastActive: { gte: twentyFourHoursAgo }
    },
    select: {
      fullName: true,
      email: true,
      lastActive: true,
      role: true
    },
    orderBy: { lastActive: 'desc' }
  });

  // ========== 7. SYSTEM HEALTH ==========
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  let dbStatus = 'healthy';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    dbStatus = 'unhealthy';
  }

  // ========== 8. MALICIOUS REQUESTS ==========
  const maliciousRequests = global.maliciousRequests?.filter(m => 
    new Date(m.timestamp) >= twentyFourHoursAgo
  ) || [];

  // ========== 9. SLOW REQUESTS ==========
  const slowRequests = global.slowRequests?.filter(m => 
    new Date(m.timestamp) >= twentyFourHoursAgo
  ) || [];

  // ========== 10. BUILD REPORT ==========
  const report = {
    reportDate: now.toISOString(),
    reportPeriod: {
      start: twentyFourHoursAgo.toISOString(),
      end: now.toISOString()
    },
    summary: {
      newUsers: newUsers.length,
      newPledges: newPledges.length,
      newAnnouncements: newAnnouncements.length,
      activeUsers: activeUsers.length,
      errors: errors.length,
      maliciousRequests: maliciousRequests.length,
      slowRequests: slowRequests.length,
      totalActivities: activities.length
    },
    details: {
      newUsers: newUsers.map(u => ({
        name: u.fullName,
        email: u.email,
        phone: u.phone,
        membership: u.membership_number,
        role: u.role,
        specialRole: u.specialRole,
        jumuia: u.homeJumuia?.name || 'None',
        joinedAt: u.createdAt.toISOString()
      })),
      newPledges: newPledges.map(p => ({
        user: p.user.fullName,
        userEmail: p.user.email,
        campaign: p.contributionType.title,
        amount: p.amountPaid || 0,
        pending: p.pendingAmount || 0,
        status: p.status,
        createdAt: p.createdAt.toISOString()
      })),
      newAnnouncements: newAnnouncements.map(a => ({
        title: a.title,
        content: a.content.substring(0, 200) + (a.content.length > 200 ? '...' : ''),
        author: a.author?.fullName || 'Unknown',
        authorEmail: a.author?.email || 'Unknown',
        createdAt: a.createdAt.toISOString()
      })),
      activeUsers: activeUsers.map(u => ({
        name: u.fullName,
        email: u.email,
        role: u.role,
        lastActive: u.lastActive?.toISOString()
      })),
      errors: errors.map(e => ({
        message: e.error || e.message || 'Unknown error',
        path: e.context?.path || 'Unknown path',
        method: e.context?.method || 'Unknown method',
        userId: e.context?.userId || 'Unknown user',
        timestamp: e.timestamp || new Date().toISOString()
      })),
      maliciousRequests: maliciousRequests.map(m => ({
        type: m.maliciousType || 'Unknown',
        endpoint: m.endpoint || 'Unknown',
        method: m.method || 'Unknown',
        ip: m.ip || 'Unknown',
        timestamp: m.timestamp || new Date().toISOString()
      })),
      slowRequests: slowRequests.map(s => ({
        endpoint: s.endpoint || 'Unknown',
        duration: s.duration || 0,
        userId: s.userId || 'Unknown',
        timestamp: s.timestamp || new Date().toISOString()
      })),
      systemHealth: {
        status: 'healthy',
        uptime: `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
        memory: {
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`
        },
        database: dbStatus
      }
    }
  };

  return report;
}

/**
 * Send 24-hour report email to admins with PDF attachment
 * Uses direct Brevo API (same pattern as semesterReportService)
 */
async function send24HourReport() {
  try {
    console.log('📧 Generating 24-hour report...');
    
    // Generate the report
    const report = await generate24HourReport();
    
    // Get all admin emails
    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { email: true, fullName: true }
    });

    if (admins.length === 0) {
      console.log('⚠️ No admins found to send report to');
      return null;
    }

    // ✅ Generate PDF
    console.log('📄 Generating PDF report...');
    let pdfBuffer = null;
    try {
      pdfBuffer = await generatePDFReport(report);
      console.log(`✅ PDF generated: ${pdfBuffer.length} bytes`);
    } catch (pdfErr) {
      console.error('❌ PDF generation failed:', pdfErr.message);
      // Continue without PDF
    }

    // Build email body
    const emailBody = buildReportEmail(report);
    const textContent = buildReportText(report);

    // Send to each admin
    let successCount = 0;
    for (const admin of admins) {
      try {
        // ✅ Create email with attachment (SAME PATTERN AS SEMESTER REPORT)
        let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
        sendSmtpEmail.to = [{ email: admin.email }];
        sendSmtpEmail.sender = { 
          email: process.env.EMAIL_USER || "zucaportal2025@gmail.com", 
          name: "ZUCA"
        };
        sendSmtpEmail.subject = `📊 ZUCA System Report - ${new Date().toLocaleDateString()}`;
        sendSmtpEmail.htmlContent = emailBody;
        sendSmtpEmail.textContent = textContent;
        
        // ✅ ATTACH PDF - THIS IS THE KEY!
        if (pdfBuffer) {
          sendSmtpEmail.attachment = [{
            name: `system_report_${new Date().toISOString().split('T')[0]}.pdf`,
            content: pdfBuffer.toString('base64')
          }];
        }
        
        const response = await brevoApi.sendTransacEmail(sendSmtpEmail);
        console.log(`✅ Report sent to ${admin.email}, MessageId: ${response.messageId}`);
        successCount++;
        
      } catch (err) {
        console.error(`❌ Failed to send report to ${admin.email}:`, err.message);
      }
    }

    console.log(`✅ 24-hour report completed. Sent to ${successCount} admins.`);
    return report;
    
  } catch (err) {
    console.error('❌ Failed to generate 24-hour report:', err.message);
    return null;
  }
}

/**
 * Build HTML email body from report
 */
function buildReportEmail(report) {
  const { summary, details } = report;
  const greeting = getFormalGreeting();
  
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #1a237e; border-bottom: 3px solid #1a237e; padding-bottom: 10px; }
        h2 { color: #283593; margin-top: 25px; }
        .summary-box { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 15px 0; }
        .stat-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin: 10px 0; }
        .stat-item { background: white; padding: 10px; border-radius: 5px; text-align: center; border: 1px solid #e0e0e0; }
        .stat-number { font-size: 24px; font-weight: bold; color: #1a237e; }
        .stat-label { font-size: 12px; color: #666; }
        .error-item { background: #ffebee; border-left: 4px solid #f44336; padding: 10px; margin: 5px 0; border-radius: 3px; }
        .activity-item { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 10px; margin: 5px 0; border-radius: 3px; }
        .warning-item { background: #fff3e0; border-left: 4px solid #ff9800; padding: 10px; margin: 5px 0; border-radius: 3px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th { background: #1a237e; color: white; padding: 10px; text-align: left; }
        td { padding: 8px; border-bottom: 1px solid #e0e0e0; }
        tr:hover { background: #f5f5f5; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #e0e0e0; text-align: center; color: #666; font-size: 12px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; }
        .badge-green { background: #4caf50; color: white; }
        .badge-red { background: #f44336; color: white; }
        .badge-yellow { background: #ff9800; color: white; }
        .badge-blue { background: #2196f3; color: white; }
        .pdf-note { background: #e8eaf6; padding: 10px; border-radius: 5px; margin: 15px 0; text-align: center; border: 1px dashed #1a237e; }
      </style>
    </head>
    <body>
      <h1>📊 ZUCA System Report</h1>
      <p><strong>Report Period:</strong> ${new Date(report.reportPeriod.start).toLocaleString()} - ${new Date(report.reportPeriod.end).toLocaleString()}</p>
      <p><strong>Generated:</strong> ${new Date(report.reportDate).toLocaleString()}</p>

      <div class="pdf-note">
        📄 <strong>PDF Attachment:</strong> A PDF version of this report is attached to this email for offline viewing.
      </div>

      <div class="summary-box">
        <h2>📈 Summary</h2>
        <div class="stat-grid">
          <div class="stat-item">
            <div class="stat-number">${summary.newUsers}</div>
            <div class="stat-label">New Users</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${summary.newPledges}</div>
            <div class="stat-label">New Pledges</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${summary.newAnnouncements}</div>
            <div class="stat-label">Announcements</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${summary.activeUsers}</div>
            <div class="stat-label">Active Users</div>
          </div>
          <div class="stat-item">
            <div class="stat-number" style="color: ${summary.errors > 0 ? '#f44336' : '#4caf50'}">${summary.errors}</div>
            <div class="stat-label">Errors</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${summary.totalActivities}</div>
            <div class="stat-label">Total Activities</div>
          </div>
        </div>
      </div>

      <h2>👤 New Users (${details.newUsers.length})</h2>
      ${details.newUsers.length > 0 ? `
        <table>
          <tr><th>Name</th><th>Email</th><th>Membership</th><th>Role</th><th>Jumuia</th></tr>
          ${details.newUsers.map(u => `
            <tr>
              <td>${u.name}</td>
              <td>${u.email}</td>
              <td>${u.membership || 'N/A'}</td>
              <td>${u.role}${u.specialRole ? ` (${u.specialRole})` : ''}</td>
              <td>${u.jumuia}</td>
            </tr>
          `).join('')}
        </table>
      ` : '<p>No new users in the last 24 hours.</p>'}

      <h2>💰 New Pledges (${details.newPledges.length})</h2>
      ${details.newPledges.length > 0 ? `
        <table>
          <tr><th>User</th><th>Campaign</th><th>Amount Paid</th><th>Pending</th><th>Status</th></tr>
          ${details.newPledges.map(p => `
            <tr>
              <td>${p.user}</td>
              <td>${p.campaign}</td>
              <td>KES ${p.amount.toLocaleString()}</td>
              <td>KES ${p.pending.toLocaleString()}</td>
              <td><span class="badge ${p.status === 'COMPLETED' ? 'badge-green' : p.status === 'PENDING' ? 'badge-yellow' : 'badge-blue'}">${p.status}</span></td>
            </tr>
          `).join('')}
        </table>
      ` : '<p>No new pledges in the last 24 hours.</p>'}

      <h2>📢 New Announcements (${details.newAnnouncements.length})</h2>
      ${details.newAnnouncements.length > 0 ? `
        ${details.newAnnouncements.map(a => `
          <div class="activity-item">
            <strong>${a.title}</strong><br>
            <span style="color: #666;">By: ${a.author}</span><br>
            <span style="color: #666; font-size: 12px;">${new Date(a.createdAt).toLocaleString()}</span><br>
            <p style="margin: 5px 0; color: #555;">${a.content}</p>
          </div>
        `).join('')}
      ` : '<p>No new announcements in the last 24 hours.</p>'}

      <h2>❌ Errors (${details.errors.length})</h2>
      ${details.errors.length > 0 ? `
        ${details.errors.map(e => `
          <div class="error-item">
            <strong>${e.message}</strong><br>
            <span style="color: #666;">Path: ${e.path} | Method: ${e.method} | User: ${e.userId}</span><br>
            <span style="color: #666; font-size: 12px;">${new Date(e.timestamp).toLocaleString()}</span>
          </div>
        `).join('')}
      ` : '<p>✅ No errors detected in the last 24 hours.</p>'}

      <h2>🛡️ Security</h2>
      ${details.maliciousRequests.length > 0 ? `
        <div class="warning-item">
          <strong>⚠️ ${details.maliciousRequests.length} Malicious Request(s) Blocked</strong>
          ${details.maliciousRequests.map(m => `
            <div style="padding: 5px 0; font-size: 13px;">
              • ${m.type} - ${m.endpoint} (${m.method}) from ${m.ip}
            </div>
          `).join('')}
        </div>
      ` : '<p>✅ No malicious requests detected.</p>'}

      ${details.slowRequests.length > 0 ? `
        <div class="warning-item">
          <strong>🐢 ${details.slowRequests.length} Slow Request(s)</strong>
          ${details.slowRequests.map(s => `
            <div style="padding: 5px 0; font-size: 13px;">
              • ${s.endpoint} took ${s.duration}ms
            </div>
          `).join('')}
        </div>
      ` : ''}

      <h2>🖥️ System Health</h2>
      <div class="summary-box">
        <p><strong>Status:</strong> <span class="badge ${details.systemHealth.status === 'healthy' ? 'badge-green' : 'badge-red'}">${details.systemHealth.status.toUpperCase()}</span></p>
        <p><strong>Uptime:</strong> ${details.systemHealth.uptime}</p>
        <p><strong>Memory:</strong> ${details.systemHealth.memory.heapUsed} / ${details.systemHealth.memory.heapTotal} (RSS: ${details.systemHealth.memory.rss})</p>
        <p><strong>Database:</strong> <span class="badge ${details.systemHealth.database === 'healthy' ? 'badge-green' : 'badge-red'}">${details.systemHealth.database.toUpperCase()}</span></p>
      </div>

      <div class="footer">
        <p>This is an automated report from ZUCA System Monitor.</p>
        <p>Tumsifu Yesu Kristu! 🙏</p>
        <p style="font-size: 10px; color: #999;">Generated: ${new Date().toLocaleString()}</p>
      </div>
    </body>
    </html>
  `;

  return html;
}

/**
 * Build plain text email body
 */
function buildReportText(report) {
  const { summary, details } = report;
  
  let text = `
ZUCA SYSTEM REPORT
==================
Report Period: ${new Date(report.reportPeriod.start).toLocaleString()} - ${new Date(report.reportPeriod.end).toLocaleString()}
Generated: ${new Date(report.reportDate).toLocaleString()}

📈 SUMMARY
----------
New Users: ${summary.newUsers}
New Pledges: ${summary.newPledges}
Announcements: ${summary.newAnnouncements}
Active Users: ${summary.activeUsers}
Errors: ${summary.errors}
Total Activities: ${summary.totalActivities}

👤 New Users (${details.newUsers.length})
${details.newUsers.length > 0 ? details.newUsers.map(u => `  • ${u.name} (${u.email})`).join('\n') : '  No new users'}

💰 New Pledges (${details.newPledges.length})
${details.newPledges.length > 0 ? details.newPledges.map(p => `  • ${p.user} - ${p.campaign}: KES ${p.amount.toLocaleString()}`).join('\n') : '  No new pledges'}

❌ Errors (${details.errors.length})
${details.errors.length > 0 ? details.errors.map(e => `  • ${e.message}`).join('\n') : '  ✅ No errors'}

🖥️ System Health
-----------------
Status: ${details.systemHealth.status.toUpperCase()}
Uptime: ${details.systemHealth.uptime}
Memory: ${details.systemHealth.memory.heapUsed} / ${details.systemHealth.memory.heapTotal}
Database: ${details.systemHealth.database.toUpperCase()}

---
Tumsifu Yesu Kristu! 🙏
  `;

  return text;
}

module.exports = {
  generate24HourReport,
  send24HourReport
};