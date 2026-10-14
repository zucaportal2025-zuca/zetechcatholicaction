// services/whatsappAttendanceService.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const whatsappBot = require('./whatsapp.bot');
const crypto = require('crypto');

/**
 * Format attendance list with numbers - CLEAN VERSION
 * No roles, no timestamps, shows ALL attendees
 */
function formatAttendanceList(attendees, options = {}) {
  const {
    startingNumber = 1
  } = options;

  return attendees.map((person, index) => {
    const num = startingNumber + index;
    return `${num}. ${person.fullName}`;
  }).join('\n');
}

/**
 * Format attendance grouped by category option (Voice Part, Jumuia, etc.)
 * Returns null if the sheet has no category.
 */
function formatCategoryBreakdown(attendees, categoryName, categoryOptions) {
  if (!categoryName || !Array.isArray(categoryOptions) || categoryOptions.length === 0) {
    return null;
  }

  const groups = categoryOptions.map(opt => ({
    option: opt,
    members: (attendees || []).filter(p => p.categoryValue === opt)
  }));

  const unassignedMembers = (attendees || []).filter(
    p => !p.categoryValue || !categoryOptions.includes(p.categoryValue)
  );

  const lines = [];

  // Header
  lines.push(`🎼 BY ${String(categoryName).toUpperCase()}`);
  lines.push('');

  // Each group — show even when 0 (these are expected sections)
  for (const group of groups) {
    lines.push(`${group.option} (${group.members.length}):`);
    if (group.members.length === 0) {
      lines.push('   (none)');
    } else {
      group.members.forEach((person, idx) => {
        lines.push(`   ${idx + 1}. ${person.fullName}`);
      });
    }
    lines.push('');
  }

  // Unassigned — only show when there are any
  if (unassignedMembers.length > 0) {
    lines.push(`Unassigned (${unassignedMembers.length}):`);
    unassignedMembers.forEach((person, idx) => {
      lines.push(`   ${idx + 1}. ${person.fullName}`);
    });
  }

  // Trim trailing blank line
  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  return '\n\n' + lines.join('\n');
}

/**
 * Get or generate check-in link for a sheet
 */
async function getCheckinLink(sheetId, createdBy) {
  try {
    let link = await prisma.attendanceLink.findFirst({
      where: {
        sheetId: sheetId,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!link) {
      const token = crypto.randomBytes(4).toString('hex');
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);

      link = await prisma.attendanceLink.create({
        data: {
          token: token,
          sheetId: sheetId,
          expiresAt: expiryDate,
          maxUses: null,
          createdBy: createdBy
        }
      });

      console.log(`🔗 Generated new check-in link for sheet ${sheetId}: ${token}`);
    }

    const baseUrl = process.env.FRONTEND_URL || 'https://www.zetechcatholicaction.com';
    return `${baseUrl}/attendance/link/${link.token}`;
  } catch (error) {
    console.error('Error getting check-in link:', error);
    const baseUrl = process.env.FRONTEND_URL || 'https://www.zetechcatholicaction.com';
    return `${baseUrl}/attendance/sheet/${sheetId}`;
  }
}

/**
 * Build the full WhatsApp message
 */
function buildAttendanceMessage(sheet, attendees, customMessage = null, checkinLink = null) {
  const date = new Date(sheet.eventDate).toLocaleDateString('en-KE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const time = sheet.eventTime || 'TBD';
  const location = sheet.location || 'ZUCA';
  const total = attendees.length;

  const hasCategory = !!(
    sheet.categoryName &&
    Array.isArray(sheet.categoryOptions) &&
    sheet.categoryOptions.length > 0
  );

  // Flat numbered list (used only when no category)
  const numberedList = formatAttendanceList(attendees);

  // Grouped list (used when category exists)
  const categoryBreakdown = hasCategory
    ? formatCategoryBreakdown(attendees, sheet.categoryName, sheet.categoryOptions)
    : null;

  // Meeting header — ALWAYS present
  const headerBlock = [
    `📌 *Meeting:* ${sheet.title}`,
    `📅 *Date:* ${date}`,
    `🕐 *Time:* ${time}`,
    `📍 *Venue:* ${location}`,
    `👥 *Total:* ${total} members`
  ].join('\n');

  // Body of the default message
  let attendanceBody;
  if (hasCategory) {
    attendanceBody = `${headerBlock}\n${categoryBreakdown.trim()}`;
  } else {
    attendanceBody = `${headerBlock}\n\n*Attendees:*\n${numberedList || 'No attendees yet.'}`;
  }

  // List section appended for custom messages that omit {list}
  let listSection = '\n\n';
  if (hasCategory) {
    listSection += `${headerBlock}\n${categoryBreakdown.trim()}`;
  } else {
    listSection += `📋 *ATTENDANCE LIST*\n${headerBlock}\n\n${numberedList || 'No attendees yet.'}`;
  }

  // Check-in link section
  let linkSection = '';
  if (checkinLink) {
    linkSection = `\n\n🔗 *Check-in Link:*\n${checkinLink}\n\n_When you check in using this link, your attendance will be recorded and automatically updated here. No need to type anything here, just open the link._`;
  }

  // Custom message path
  if (customMessage) {
    let custom = customMessage;
    custom = custom.replace(/{title}/g, sheet.title);
    custom = custom.replace(/{date}/g, date);
    custom = custom.replace(/{time}/g, time);
    custom = custom.replace(/{location}/g, location);
    custom = custom.replace(/{total}/g, total);
    custom = custom.replace(
      /{list}/g,
      hasCategory ? categoryBreakdown.trim() : (numberedList || 'No attendees yet.')
    );
    custom = custom.replace(/{link}/g, checkinLink || 'Link not available');

    if (!customMessage.includes('{list}')) {
      custom = custom + listSection;
    }

    if (!customMessage.includes('{link}') && checkinLink) {
      custom = custom + linkSection;
    }

    return custom;
  }

  // Default message
  let message = `📋 *ATTENDANCE LIST*\n\n`;
  message += `${attendanceBody}`;

  if (checkinLink) {
    message += `\n\n🔗 *Check-in Link:*\n${checkinLink}`;
  }

  message += `\n\n_Automatically sent from ZUCA Attendance System_`;

  return message;
}

/**
 * Send attendance list to WhatsApp groups
 */
async function sendAttendanceToWhatsApp(sheetId) {
  try {
    console.log(`📱 Sending attendance list for sheet ${sheetId}`);

    const sheet = await prisma.attendanceSheet.findUnique({
      where: { id: sheetId },
      include: {
        entries: {
          orderBy: { signTime: 'asc' }
        }
      }
    });

    if (!sheet) {
      console.log(`❌ Sheet ${sheetId} not found`);
      return { success: false, error: 'Sheet not found' };
    }

    if (!sheet.enableWhatsAppAutoSend) {
      console.log(`ℹ️ WhatsApp auto-send not enabled for sheet ${sheetId}`);
      return { success: false, error: 'Auto-send not enabled' };
    }

    if (!sheet.whatsAppGroupIds) {
      console.log(`ℹ️ No WhatsApp groups selected for sheet ${sheetId}`);
      return { success: false, error: 'No groups selected' };
    }

    const groupIds = sheet.whatsAppGroupIds.split(',').map(id => id.trim()).filter(id => id);

    if (groupIds.length === 0) {
      return { success: false, error: 'No valid group IDs' };
    }

    const attendees = sheet.entries.map(entry => ({
      fullName: entry.fullName || 'Unknown',
      role: entry.role || 'Member',
      phone: entry.phoneNumber || null,
      signTime: entry.signTime,
      categoryValue: entry.categoryValue || null
    }));

    if (attendees.length === 0) {
      console.log(`ℹ️ No attendees yet for sheet ${sheetId}`);
      return { success: true, message: 'No attendees yet', sent: 0 };
    }

    const checkinLink = await getCheckinLink(sheetId, sheet.createdBy);
    console.log(`🔗 Check-in link: ${checkinLink}`);

    const message = buildAttendanceMessage(sheet, attendees, sheet.whatsAppCustomMessage, checkinLink);

    console.log(`📱 Message preview: ${message.substring(0, 200)}...`);

    const results = [];
    for (const groupId of groupIds) {
      try {
        if (!whatsappBot.isConnected) {
          console.log(`⚠️ WhatsApp bot not connected, cannot send to ${groupId}`);
          results.push({ groupId, success: false, error: 'Bot not connected' });
          continue;
        }

        const result = await whatsappBot.sendToSpecificGroup(groupId, message);
        results.push({ groupId, success: true, result });
        console.log(`✅ Attendance list sent to group ${groupId}`);

        await prisma.attendanceSheet.update({
          where: { id: sheetId },
          data: { whatsAppLastSentCount: attendees.length }
        });

      } catch (error) {
        console.error(`❌ Failed to send to group ${groupId}:`, error.message);
        results.push({ groupId, success: false, error: error.message });
      }
    }

    return {
      success: true,
      message: `Sent to ${results.filter(r => r.success).length}/${groupIds.length} groups`,
      results,
      attendees: attendees.length,
      sentTo: results.filter(r => r.success).length
    };

  } catch (error) {
    console.error('❌ sendAttendanceToWhatsApp error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendAttendanceToWhatsApp,
  formatAttendanceList,
  buildAttendanceMessage,
  getCheckinLink,
  formatCategoryBreakdown
};