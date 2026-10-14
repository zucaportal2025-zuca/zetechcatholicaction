// ==================== FAREWELL PDF SERVICE ====================
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const PDFDocument = require('pdfkit');
const axios = require('axios');
const SibApiV3Sdk = require('sib-api-v3-sdk');

// Brevo setup (SAME AS 24hourReportService)
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;
const brevoApi = new SibApiV3Sdk.TransactionalEmailsApi();

const ZUCA_LOGO_URL = "https://dcxuxitorpfujfbtyhhn.supabase.co/storage/v1/object/public/profiles/profile_c2dd6c54-4576-41b1-a85d-1af90d88254a_1777067617594.jpg";

/**
 * Generate semester-style farewell PDF with profile, attendance, pledges, executive history
 */
async function generateFarewellPDF(userInfo, records, userObj) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
      const buffers = [];
      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // ===== PAGE 1: HEADER & PROFILE =====
      let logoLoaded = false;
      try {
        const res = await axios.get(ZUCA_LOGO_URL, { responseType: 'arraybuffer', timeout: 3000 });
        doc.image(Buffer.from(res.data), 50, 30, { width: 60 });
        logoLoaded = true;
      } catch (e) {}

      const headerX = logoLoaded ? 120 : 50;
      doc.fontSize(18).font('Helvetica-Bold').fillColor('#003366')
         .text('ZETECH UNIVERSITY CATHOLIC ACTION', headerX, 40, { align: logoLoaded ? 'left' : 'center', width: logoLoaded ? 400 : 500 });
      doc.moveDown(0.5);
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e293b')
         .text('ACCOUNT DELETION RECORD', { align: 'center' });
      doc.fontSize(10).fillColor('#888888')
         .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(1.5);

      // Profile Image
      const startY = doc.y;
      let profileLoaded = false;
      if (userObj?.profileImage) {
        try {
          const profileRes = await axios.get(userObj.profileImage, { responseType: 'arraybuffer', timeout: 3000 });
          const imageX = 50, imageY = startY, imageSize = 80;
          doc.save(); doc.circle(imageX + imageSize/2, imageY + imageSize/2, imageSize/2).clip();
          doc.image(Buffer.from(profileRes.data), imageX, imageY, { width: imageSize, height: imageSize, fit: [imageSize, imageSize] });
          doc.restore(); doc.circle(imageX + imageSize/2, imageY + imageSize/2, imageSize/2).stroke('#003366', 2);
          profileLoaded = true;
        } catch (e) {}
      }

      const infoX = profileLoaded ? 150 : 50, infoY = profileLoaded ? startY + 10 : startY;
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e293b').text(userInfo.fullName, infoX, infoY);
      doc.fontSize(10).font('Helvetica').fillColor('#475569');

      const details = [
        ['Membership #:', userInfo.membershipNumber || 'N/A'],
        ['Jumuia:', userInfo.jumuia],
        ['Role:', `${userInfo.role}${userInfo.specialRole ? ` (${userInfo.specialRole})` : ''}`],
        ['Email:', userInfo.email],
        ['Phone:', userInfo.phone || 'N/A'],
        ['Joined:', new Date(userInfo.joinedDate).toLocaleDateString()],
        ['Deleted:', new Date(userInfo.deletedAt).toLocaleString()],
        ['Reason:', userInfo.reason || 'Not specified'],
      ];

      let yPos = infoY + 25;
      details.forEach(([label, value]) => {
        doc.font('Helvetica-Bold').fillColor('#64748b').text(`${label} `, infoX, yPos, { continued: true });
        doc.font('Helvetica').fillColor('#1e293b').text(value, { continued: false });
        yPos += 18;
      });
      doc.y = Math.max(yPos + 10, startY + 120);

      // Stats Summary Box
      doc.moveDown(1);
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e293b').text('RECORD SUMMARY', { underline: true });
      doc.moveDown(0.5);

      const statsY = doc.y;
      const stats = [
        ['Attendance Records', records.attendance.length],
        ['Contributions', records.pledges.length],
        ['Total Paid', `KES ${records.pledges.reduce((s, p) => s + (p.paid || 0), 0).toLocaleString()}`],
        ['Executive Positions', records.executiveHistory.length],
      ];

      doc.rect(50, statsY, 450, stats.length * 25 + 20).stroke('#e2e8f0');
      stats.forEach(([label, value], i) => {
        const y = statsY + 12 + (i * 25);
        doc.font('Helvetica-Bold').fillColor('#64748b').text(label, 60, y);
        doc.font('Helvetica').fillColor('#1e293b').text(String(value), 250, y);
      });

      doc.moveDown(6);

      // Performance Badge
      const badgeColor = records.attendance.length > 10 ? '#10b981' : records.attendance.length > 5 ? '#3b82f6' : '#f59e0b';
      const badgeLabel = records.attendance.length > 10 ? 'Active Member' : records.attendance.length > 5 ? 'Regular Attendee' : 'Participant';
      doc.rect(50, doc.y, 450, 45).fill(badgeColor);
      doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold')
         .text(`${badgeLabel} — ${records.attendance.length} meetings attended`, 60, doc.y + 10);

      // ===== PAGE 2: ATTENDANCE =====
      doc.addPage();
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e293b').text('ATTENDANCE RECORDS', { underline: true });
      doc.moveDown(0.5);

      if (records.attendance.length > 0) {
        const tt = doc.y;
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#fff');
        doc.rect(50, tt, 450, 20).fill('#003366');
        doc.text('Event', 55, tt + 5); doc.text('Date', 220, tt + 5);
        doc.text('Time', 320, tt + 5); doc.text('Method', 400, tt + 5);

        let y = tt + 25;
        records.attendance.forEach((a, i) => {
          if (y > 750) { doc.addPage(); y = 50; }
          doc.rect(50, y - 2, 450, 16).fill(i % 2 === 0 ? '#f8fafc' : '#ffffff');
          doc.fontSize(8).font('Helvetica').fillColor('#1e293b');
          doc.text((a.title || 'Event').substring(0, 28), 55, y);
          doc.text(a.date ? new Date(a.date).toLocaleDateString() : 'N/A', 220, y);
          doc.text(a.time || 'N/A', 320, y);
          doc.fillColor('#3b82f6').text(a.method || 'N/A', 400, y);
          y += 16;
        });
        doc.y = y + 10;
      } else {
        doc.fontSize(10).fillColor('#666').text('No attendance records.');
      }

      // ===== PAGE 3: PLEDGES =====
      doc.addPage();
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e293b').text('CONTRIBUTION HISTORY', { underline: true });
      doc.moveDown(0.5);

      if (records.pledges.length > 0) {
        const tt = doc.y;
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#fff');
        doc.rect(50, tt, 450, 20).fill('#003366');
        doc.text('Campaign', 55, tt + 5); doc.text('Required', 200, tt + 5);
        doc.text('Paid', 290, tt + 5); doc.text('Pending', 360, tt + 5);
        doc.text('Status', 440, tt + 5);

        let y = tt + 25, tp = 0, tpd = 0;
        records.pledges.forEach((p, i) => {
          if (y > 750) { doc.addPage(); y = 50; }
          doc.rect(50, y - 2, 450, 16).fill(i % 2 === 0 ? '#f8fafc' : '#ffffff');
          doc.fontSize(8).font('Helvetica').fillColor('#1e293b');
          doc.text((p.campaign || 'N/A').substring(0, 22), 55, y);
          doc.text(`KES ${(p.amount || 0).toLocaleString()}`, 200, y);
          doc.text(`KES ${(p.paid || 0).toLocaleString()}`, 290, y);
          doc.text(`KES ${(p.pending || 0).toLocaleString()}`, 360, y);
          const sc = p.status === 'COMPLETED' ? '#10b981' : p.status === 'PENDING' ? '#f59e0b' : '#3b82f6';
          doc.fillColor(sc).text(p.status || 'N/A', 440, y);
          tp += (p.paid || 0); tpd += (p.pending || 0);
          y += 16;
        });
        doc.y = y + 15;
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a237e');
        doc.text(`Total Paid: KES ${tp.toLocaleString()}`, 50, doc.y);
        doc.text(`Total Pending: KES ${tpd.toLocaleString()}`, 250, doc.y);
      } else {
        doc.fontSize(10).fillColor('#666').text('No contribution records.');
      }

      // ===== EXECUTIVE HISTORY =====
      if (records.executiveHistory.length > 0) {
        doc.addPage();
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e293b').text('EXECUTIVE POSITIONS HELD', { underline: true });
        doc.moveDown(0.5);
        records.executiveHistory.forEach((e) => {
          doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b').text(`${e.position || 'Position'}`, 50, doc.y);
          doc.fontSize(9).font('Helvetica').fillColor('#666')
             .text(`Assigned: ${e.assignedAt ? new Date(e.assignedAt).toLocaleDateString() : 'N/A'}  |  Removed: ${e.removedAt ? new Date(e.removedAt).toLocaleDateString() : 'N/A'}`, 50, doc.y);
          doc.moveDown(0.3);
        });
      }

      // Footer
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        const fy = doc.page.height - 30;
        doc.fontSize(8).font('Helvetica').fillColor('#94a3b8');
        doc.text(`Generated on ${new Date().toLocaleString()}`, 50, fy);
        doc.text(`Page ${i + 1} of ${totalPages}`, 500, fy);
        doc.text('© ZUCA Portal', 50, fy + 15);
      }

      doc.end();
    } catch (err) { reject(err); }
  });
}

/**
 * Send farewell email with PDF via Brevo (WITH ATTACHMENT)
 */
async function sendFarewellEmailWithPDF(email, fullName, pdfBuffer, filename) {
  try {
    let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.to = [{ email }];
    sendSmtpEmail.sender = { email: process.env.EMAIL_USER || "zucaportal2025@gmail.com", name: "ZUCA" };
    sendSmtpEmail.subject = `🙏 Your ZUCA Records - ${fullName}`;
    sendSmtpEmail.htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a237e;">ZUCA Account Records</h2>
        <p>Dear ${fullName},</p>
        <p>Your ZUCA account has been deleted. Attached is a PDF with all your records — attendance, contributions, and executive positions.</p>
        <p>We're sad to see you go. May God bless your journey ahead.</p>
        <p style="margin-top: 30px; color: #666;">Tumsifu Yesu Kristu! 🙏</p>
        <p style="color: #999; font-size: 12px;">— ZUCA Team</p>
      </div>
    `;
    sendSmtpEmail.textContent = `Dear ${fullName},\n\nYour ZUCA account has been deleted. A PDF of your records is attached.\n\nGod bless you!\n\n- ZUCA Team`;
    
    // ✅ ATTACH PDF
    sendSmtpEmail.attachment = [{
      name: filename,
      content: pdfBuffer.toString('base64')
    }];

    const response = await brevoApi.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ Farewell PDF sent to ${email}, MessageId: ${response.messageId}`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to send PDF to ${email}:`, err.message);
    return false;
  }
}

module.exports = { generateFarewellPDF, sendFarewellEmailWithPDF };