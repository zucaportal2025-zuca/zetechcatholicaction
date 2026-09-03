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

  // ✅ NO LIMIT - shows all attendees
  return attendees.map((person, index) => {
    const num = startingNumber + index;
    // ✅ JUST THE NAME - clean and simple
    return `${num}. ${person.fullName}`;
  }).join('\n');
}

/**
 * Get or generate check-in link for a sheet
 */
async function getCheckinLink(sheetId, createdBy) {
  try {
    // Find an existing active link for this sheet
    let link = await prisma.attendanceLink.findFirst({
      where: {
        sheetId: sheetId,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // If no link exists, generate one
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
    // Fallback: use sheet ID
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
  
  // ✅ Build the numbered list - CLEAN (no roles, no timestamps, no limit)
  const numberedList = formatAttendanceList(attendees);
  
  // Build the attendance list section
  let listSection = `\n\n📋 *ATTENDANCE LIST*\n`;
  listSection += `👥 *Total:* ${total} members\n\n`;
  listSection += `${numberedList || 'No attendees yet.'}`;
  
  // Build the check-in link section
  let linkSection = '';
  if (checkinLink) {
    linkSection = `\n\n🔗 *Check-in Link:*\n${checkinLink}\n\n_When you check in using this link, your attendance will be recorded and automatically updated here. No need to type anything here, just open the link._`;
  }
  
  // If custom message is provided
  if (customMessage) {
    let custom = customMessage;
    custom = custom.replace(/{title}/g, sheet.title);
    custom = custom.replace(/{date}/g, date);
    custom = custom.replace(/{time}/g, time);
    custom = custom.replace(/{location}/g, location);
    custom = custom.replace(/{total}/g, total);
    custom = custom.replace(/{list}/g, numberedList || 'No attendees yet.');
    custom = custom.replace(/{link}/g, checkinLink || 'Link not available');
    
    // ALWAYS append the attendance list if {list} is missing
    if (!customMessage.includes('{list}')) {
      custom = custom + listSection;
    }
    
    // ALWAYS append the check-in link if {link} is missing
    if (!customMessage.includes('{link}') && checkinLink) {
      custom = custom + linkSection;
    }
    
    return custom;
  }
  
  // Default message
  let message = `📋 *ATTENDANCE LIST*\n\n`;
  message += `📌 *Meeting:* ${sheet.title}\n`;
  message += `📅 *Date:* ${date}\n`;
  message += `🕐 *Time:* ${time}\n`;
  message += `📍 *Venue:* ${location}\n`;
  message += `👥 *Total:* ${total} members\n\n`;
  message += `*Attendees:*\n${numberedList || 'No attendees yet.'}`;
  
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
    
    // Get sheet with entries
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
    
    // Check if auto-send is enabled
    if (!sheet.enableWhatsAppAutoSend) {
      console.log(`ℹ️ WhatsApp auto-send not enabled for sheet ${sheetId}`);
      return { success: false, error: 'Auto-send not enabled' };
    }
    
    // Check if there are group IDs
    if (!sheet.whatsAppGroupIds) {
      console.log(`ℹ️ No WhatsApp groups selected for sheet ${sheetId}`);
      return { success: false, error: 'No groups selected' };
    }
    
    // Parse group IDs
    const groupIds = sheet.whatsAppGroupIds.split(',').map(id => id.trim()).filter(id => id);
    
    if (groupIds.length === 0) {
      return { success: false, error: 'No valid group IDs' };
    }
    
    // Format attendees - clean names only
    const attendees = sheet.entries.map(entry => ({
      fullName: entry.fullName || 'Unknown',
      role: entry.role || 'Member',
      phone: entry.phoneNumber || null,
      signTime: entry.signTime
    }));
    
    if (attendees.length === 0) {
      console.log(`ℹ️ No attendees yet for sheet ${sheetId}`);
      return { success: true, message: 'No attendees yet', sent: 0 };
    }
    
    // Get the check-in link
    const checkinLink = await getCheckinLink(sheetId, sheet.createdBy);
    console.log(`🔗 Check-in link: ${checkinLink}`);
    
    // Build message with link
    const message = buildAttendanceMessage(sheet, attendees, sheet.whatsAppCustomMessage, checkinLink);
    
    // Log the message being sent (for debugging)
    console.log(`📱 Message preview: ${message.substring(0, 200)}...`);
    
    // Send to each group
    const results = [];
    for (const groupId of groupIds) {
      try {
        // Check if bot is connected
        if (!whatsappBot.isConnected) {
          console.log(`⚠️ WhatsApp bot not connected, cannot send to ${groupId}`);
          results.push({ groupId, success: false, error: 'Bot not connected' });
          continue;
        }
        
        // Send message
        const result = await whatsappBot.sendToSpecificGroup(groupId, message);
        results.push({ groupId, success: true, result });
        console.log(`✅ Attendance list sent to group ${groupId}`);
        
        // Update last sent count
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
  getCheckinLink
};