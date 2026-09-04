const express = require("express");
const router = express.Router();
const { authenticate, requireAdmin, requireLeaderOrAdmin } = require("../middleware/auth");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const crypto = require('crypto');

const { sendPersonalizedEmail } = require("../services/mailer");
const { getCurrentSemester, getSemesterDateFilter } = require("../utils/semesterHelpers");
const { sendAttendanceToWhatsApp } = require('../services/whatsappAttendanceService');

// ==================== WHATSAPP AUTO-SEND ROUTES ====================

/**
 * GET - Get WhatsApp settings for a sheet
 */
router.get("/sheet/:sheetId/whatsapp-settings", authenticate, requireLeaderOrAdmin, async (req, res) => {
  try {
    const { sheetId } = req.params;
    
    const sheet = await prisma.attendanceSheet.findUnique({
      where: { id: sheetId },
      select: {
        id: true,
        enableWhatsAppAutoSend: true,
        whatsAppGroupIds: true,
        whatsAppGroupNames: true,
        whatsAppCustomMessage: true,
        whatsAppSendOnCheckin: true,
        whatsAppSendOnClose: true,
        whatsAppLastSentCount: true
      }
    });
    
    if (!sheet) {
      return res.status(404).json({ error: 'Sheet not found' });
    }
    
    res.json({ success: true, settings: sheet });
    
  } catch (error) {
    console.error('❌ Get WhatsApp settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT - Update WhatsApp settings for a sheet
 */
router.put("/sheet/:sheetId/whatsapp-settings", authenticate, requireLeaderOrAdmin, async (req, res) => {
  try {
    const { sheetId } = req.params;
    const { 
      enableWhatsAppAutoSend,
      whatsAppGroupIds,
      whatsAppGroupNames,
      whatsAppCustomMessage,
      whatsAppSendOnCheckin,
      whatsAppSendOnClose
    } = req.body;
    
    const sheet = await prisma.attendanceSheet.findUnique({
      where: { id: sheetId }
    });
    
    if (!sheet) {
      return res.status(404).json({ error: 'Sheet not found' });
    }
    
    const updated = await prisma.attendanceSheet.update({
      where: { id: sheetId },
      data: {
        enableWhatsAppAutoSend: enableWhatsAppAutoSend !== undefined ? enableWhatsAppAutoSend : sheet.enableWhatsAppAutoSend,
        whatsAppGroupIds: whatsAppGroupIds !== undefined ? whatsAppGroupIds : sheet.whatsAppGroupIds,
        whatsAppGroupNames: whatsAppGroupNames !== undefined ? whatsAppGroupNames : sheet.whatsAppGroupNames,
        whatsAppCustomMessage: whatsAppCustomMessage !== undefined ? whatsAppCustomMessage : sheet.whatsAppCustomMessage,
        whatsAppSendOnCheckin: whatsAppSendOnCheckin !== undefined ? whatsAppSendOnCheckin : sheet.whatsAppSendOnCheckin,
        whatsAppSendOnClose: whatsAppSendOnClose !== undefined ? whatsAppSendOnClose : sheet.whatsAppSendOnClose
      }
    });
    
    res.json({ success: true, sheet: updated });
    
  } catch (error) {
    console.error('❌ Update WhatsApp settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST - Manually send attendance list to WhatsApp
 */
router.post("/sheet/:sheetId/send-whatsapp", authenticate, requireLeaderOrAdmin, async (req, res) => {
  try {
    const { sheetId } = req.params;
    
    const result = await sendAttendanceToWhatsApp(sheetId);
    
    if (result.success) {
      res.json({ success: true, ...result });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
    
  } catch (error) {
    console.error('❌ Send WhatsApp error:', error);
    res.status(500).json({ error: error.message });
  }
});


// ==================== UPDATE SHEET DETAILS ====================

/**
 * PUT - Update sheet details (title, description, date, time, location, jumuia)
 */
router.put("/sheet/:sheetId/details", authenticate, requireLeaderOrAdmin, async (req, res) => {
  try {
    const { sheetId } = req.params;
    const { 
      title, 
      description, 
      eventDate, 
      eventTime, 
      location, 
      jumuiaId,
      allowSelfCheckin,
      enableWifiCheckin
    } = req.body;

    // Check if sheet exists
    const sheet = await prisma.attendanceSheet.findUnique({
      where: { id: sheetId }
    });

    if (!sheet) {
      return res.status(404).json({ error: 'Sheet not found' });
    }

    // Handle executive-team special value
    let targetJumuiaId = jumuiaId;
    let isExecutiveOnly = false;

    if (jumuiaId === 'executive-team') {
      targetJumuiaId = null;
      isExecutiveOnly = true;
    }

    // Build update data
    const updateData = {
      title: title || sheet.title,
      description: description !== undefined ? description : sheet.description,
      eventDate: eventDate ? new Date(eventDate) : sheet.eventDate,
      eventTime: eventTime || sheet.eventTime,
      location: location !== undefined ? location : sheet.location,
      jumuiaId: targetJumuiaId,
      isExecutiveOnly: isExecutiveOnly
    };

    // Only update check-in settings if provided
    if (allowSelfCheckin !== undefined) {
      updateData.allowSelfCheckin = allowSelfCheckin;
    }
    if (enableWifiCheckin !== undefined) {
      updateData.enableWifiCheckin = enableWifiCheckin;
    }

    const updated = await prisma.attendanceSheet.update({
      where: { id: sheetId },
      data: updateData
    });

    // Invalidate cache
    invalidateSheetCache(sheetId);

    res.json({ 
      success: true, 
      sheet: updated,
      message: 'Sheet details updated successfully'
    });

  } catch (error) {
    console.error('❌ Update sheet details error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== SHEET CACHE ====================
const sheetCache = new Map();
const SHEET_CACHE_TTL = 60 * 1000; // 1 minute

function getCachedSheet(sheetId) {
  const cached = sheetCache.get(sheetId);
  if (cached && (Date.now() - cached.timestamp < SHEET_CACHE_TTL)) {
    return cached.data;
  }
  return null;
}

function setCachedSheet(sheetId, data) {
  sheetCache.set(sheetId, {
    data: data,
    timestamp: Date.now()
  });
}

function invalidateSheetCache(sheetId) {
  sheetCache.delete(sheetId);
}
// ==================== LOCAL NOTIFICATION FUNCTION (SELF-CONTAINED) ====================
// This handles emails + push notifications with email settings check

async function createAndSendNotification({ userId, type, title, message, data = {} }) {
  try {
    console.log(`🔔 Creating notification: ${title} for user ${userId}`);
    
    // 1. Create notification in database
    const notification = await prisma.notification.create({
      data: {
        id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        userId,
        type,
        title,
        message,
        read: false,
        createdAt: new Date(),
        data: data || {}
      }
    });

    // 2. Send real-time via Socket.IO
    try {
      const io = global.io;
      if (io) {
        io.to(userId).emit('new_notification', {
          ...notification,
          createdAt: notification.createdAt.toISOString()
        });
      }
    } catch (err) {
      // Socket not available, continue
    }

    // 3. Send PUSH NOTIFICATION
    try {
      const subscription = await prisma.pushSubscription.findUnique({
        where: { userId }
      });

      if (subscription) {
        const webpush = require('web-push');
        
        webpush.setVapidDetails(
          'mailto:zucaportal2025@gmail.com',
          process.env.VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY
        );

        const unreadCount = await prisma.notification.count({
          where: { userId, read: false }
        });

        const pushSubscription = JSON.parse(subscription.subscription);
        
   // Build the URL for this notification
const deepLinkUrl = global.getDeepLinkUrl
  ? global.getDeepLinkUrl(type, data)
  : `${process.env.FRONTEND_URL || "https://www.zetechcatholicaction.com"}/dashboard`;

await webpush.sendNotification(
  pushSubscription,
  JSON.stringify({
    title,
    body: message,
    icon: "/android-chrome-192x192.png",
    badge: "/favicon.ico",
    badgeCount: unreadCount + 1,

    data: {
      type,
      ...data,
      url: deepLinkUrl
    },

    url: deepLinkUrl,

    timestamp: Date.now()
  }),
  { urgency: "high" }
);
        
        console.log(`📱 Push notification sent to user ${userId}`);
      } else {
        console.log(`⚠️ No push subscription for user ${userId}`);
      }
    } catch (err) {
      console.error(`❌ Push notification failed for user ${userId}:`, err.message);
    }

    // 4. ✅ CHECK IF EMAIL IS ENABLED BEFORE SENDING
    let shouldSendEmail = true;
    try {
      const { isEmailTypeEnabled } = require("../services/mailer");
      shouldSendEmail = await isEmailTypeEnabled(type);
    } catch (err) {
      console.log(`⚠️ Could not check email setting for ${type}, defaulting to send:`, err.message);
    }

    if (!shouldSendEmail) {
      console.log(`📧 Email ${type} is disabled, skipping email for user ${userId}`);
      return notification; // Return early, skip email
    }

    // 5. Send EMAIL (only if enabled)
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { homeJumuia: true }
      });
      
      if (user?.email) {
        const { sendPersonalizedEmail } = require("../services/mailer");
        
        // Format email based on type
        let emailSubject = title;
        let emailBody = message;
        
        if (type === "attendance_missed") {
          emailBody = `${message}\n\nPlease make sure to attend future meetings.`;
        } else if (type === "attendance_thankyou") {
          emailBody = `${message}\n\nYour attendance is valued!`;
        } else if (type === "attendance_summary") {
          emailBody = `${message}\n\nView full report in the app.`;
        }
        
        await sendPersonalizedEmail(
          { email: user.email, fullName: user.fullName },
          type,
          emailSubject,
          emailBody,
          data
        );
        
        console.log(`✅ Email sent to ${user.email}`);
      } else {
        console.log(`⚠️ No email for user ${userId}`);
      }
    } catch (err) {
      console.error(`❌ Email failed for user ${userId}:`, err.message);
    }

    return notification;
  } catch (err) {
    console.error('❌ createAndSendNotification error:', err.message);
    return null;
  }
}


router.get("/scan/verify/:token", async (req, res) => {
  try {
    const { token } = req.params;
    
    const qrToken = await prisma.qRCodeToken.findFirst({
      where: { 
        token: token, 
        expiresAt: { gt: new Date() }
      },
      include: { 
        sheet: {
          select: {
            id: true,
            title: true,
            eventDate: true,
            eventTime: true,
            location: true,
            isActive: true
          }
        }
      }
    });
    
    if (!qrToken) {
      return res.status(404).json({ error: "Invalid or expired QR code" });
    }
    
    if (!qrToken.sheet.isActive) {
      return res.status(400).json({ error: "Meeting has been closed" });
    }
    
    res.json({ 
      success: true, 
      sheetId: qrToken.sheetId,
      sheet: qrToken.sheet,
      token: qrToken.token
    });
    
  } catch (err) {
    console.error("Verify scan error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Generate QR code for a sheet (admin only)
router.get("/sheet/:sheetId/qr", authenticate, requireLeaderOrAdmin, async (req, res) => {
  try {
    const { sheetId } = req.params;
    
    const sheet = await prisma.attendanceSheet.findUnique({
      where: { id: sheetId }
    });
    
    if (!sheet) {
      return res.status(404).json({ error: "Sheet not found" });
    }
    
    if (!sheet.isActive) {
      return res.status(400).json({ error: "Sheet is closed. Reopen it to generate QR code." });
    }
    
    let qrToken = await prisma.qRCodeToken.findFirst({
      where: { 
        sheetId: sheetId,
        expiresAt: { gt: new Date() }
      }
    });
    
    if (!qrToken) {
      const qrTokenValue = crypto.randomBytes(32).toString('hex');
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      
      qrToken = await prisma.qRCodeToken.create({
        data: {
          token: qrTokenValue,
          sheetId: sheetId,
          expiresAt: expiryDate,
          createdBy: req.user.userId
        }
      });
    }
    
    const baseUrl = req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5173';
    const scanUrl = `${baseUrl}/scan/${qrToken.token}`;
    
    const QRCode = require('qrcode');
    const qrCodeUrl = await QRCode.toDataURL(scanUrl);
    
    res.json({ 
      success: true, 
      qrCodeUrl,
      token: qrToken.token,
      scanUrl: scanUrl,
      expiresAt: qrToken.expiresAt,
      sheet: {
        id: sheet.id,
        title: sheet.title,
        eventDate: sheet.eventDate,
        location: sheet.location
      }
    });
  } catch (err) {
    console.error("QR generation error:", err);
    res.status(500).json({ error: err.message });
  }
});



// QR Code check-in endpoint - OPTIMIZED FOR SPEED
router.post("/qr-checkin", authenticate, async (req, res) => {
  const startTime = Date.now();
  
  try {
     const { token, deviceId, deviceName, userId: specifiedUserId } = req.body;
    const userId = specifiedUserId || req.user.userId;
    
    console.log(`🔍 QR Scan - User: ${userId.substring(0,8)}...`);
    
    // ========== STEP 1: BULK FETCH - ONE DATABASE CALL ==========
    const [user, qrToken] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { 
          id: true, fullName: true, phone: true, 
          role: true, specialRole: true, membership_number: true, 
          jumuiaId: true, email: true 
        }
      }),
      prisma.qRCodeToken.findFirst({
        where: { token: token, expiresAt: { gt: new Date() } },
        include: { sheet: { select: { id: true, title: true, isActive: true, location: true } } }
      })
    ]);
    
    // Quick validation
    if (!user) {
      return res.status(404).json({ error: "User not found", code: "USER_NOT_FOUND" });
    }
    
    if (!qrToken) {
      return res.status(400).json({ error: "Invalid or expired QR code", code: "INVALID_QR" });
    }
    
    if (!qrToken.sheet.isActive) {
      return res.status(400).json({ error: "Meeting has been closed", code: "MEETING_CLOSED" });
    }
    
    // ========== STEP 2: CHECK IF ALREADY CHECKED IN (ONE FAST QUERY) ==========
    const existingEntry = await prisma.attendanceEntry.findFirst({
      where: { sheetId: qrToken.sheetId, userId: userId },
      select: { id: true, signTime: true }
    });
    
    if (existingEntry) {
      return res.status(400).json({ 
        error: "Already checked in",
        message: `Checked in at ${new Date(existingEntry.signTime).toLocaleTimeString()}`,
        code: "ALREADY_CHECKED_IN"
      });
    }
    
    // ========== STEP 3: CREATE CHECK-IN ENTRY (SIMPLE INSERT) ==========
    const entry = await prisma.attendanceEntry.create({
      data: {
        sheetId: qrToken.sheetId,
        userId: userId,
        deviceId: deviceId,
        deviceName: deviceName,
        fullName: user.fullName,
        phoneNumber: user.phone,
        role: user.role,
        specialRole: user.specialRole,
        membershipNumber: user.membership_number,
        jumuiaId: user.jumuiaId,
        signMethod: "QR_CODE",
        signTime: new Date(),
        notes: "Checked in via QR Code"
      },
      select: { id: true, signTime: true } // Only return what's needed
    });
    
    // ========== STEP 4: UPDATE QR TOKEN USAGE (FIRE AND FORGET) ==========
    // Don't await this - let it run in background
    prisma.qRCodeToken.update({
      where: { id: qrToken.id },
      data: { usedCount: { increment: 1 }, usedBy: userId }
    }).catch(err => console.error("Token update failed:", err.message));
    
    // ========== STEP 5: SEND IMMEDIATE RESPONSE ==========
    const duration = Date.now() - startTime;
    console.log(`✅ Check-in complete in ${duration}ms for ${user.fullName}`);
    
    res.json({ 
      success: true, 
      entry: {
        id: entry.id,
        signTime: entry.signTime,
        message: `Welcome ${user.fullName.split(' ')[0]}! You've been checked in.`
      }
    });
    
    // ========== STEP 6: BACKGROUND PROCESSING (FIRE AND FORGET) ==========
    // Send notifications and emails in background - user doesn't wait
    (async () => {
      try {
        // Send in-app notification (fast)
        await createAndSendNotification({
          userId: userId,
          type: "attendance_checkin",
          title: "✅ Check-in Successful!",
          message: `You have been checked in for "${qrToken.sheet.title}"`,
          data: { sheetId: qrToken.sheetId, entryId: entry.id }
        });
        
        // Send email - don't await, just fire
        if (user.email) {
          sendPersonalizedEmail(
            { email: user.email, fullName: user.fullName },
            "attendance_checkin",
            `Check-in Confirmation: ${qrToken.sheet.title}`,
            `Dear ${user.fullName},\n\nYou have been successfully checked in for "${qrToken.sheet.title}".\n\nThank you for your attendance!\n\nZetech University Catholic Action (ZUCA)`,
            { sheetTitle: qrToken.sheet.title, signTime: entry.signTime }
          ).catch(err => console.error("Email failed:", err.message));
        }
        
                // Real-time update for live activity feed (socket)
        const io = req.app.get("io");
        if (io) {
          // Existing event for live activity
          io.to(`sheet-${qrToken.sheetId}`).emit("attendance_checkin", {
            sheetId: qrToken.sheetId,
            userId: userId,
            userName: user.fullName,
            timestamp: entry.signTime
          });
          
          // NEW: Dedicated event for minutes editor (real-time attendance updates)
          io.to(`minutes-editor-${qrToken.sheetId}`).emit("attendance_live_update", {
            sheetId: qrToken.sheetId,
            newEntry: {
              userId: user.id,
              fullName: user.fullName,
              executivePosition: null,
              role: user.specialRole || user.role,
              signTime: entry.signTime,
              signMethod: entry.signMethod
            }
          });
        }

            // ✅ WHATSAPP AUTO-SEND TRIGGER
        const sheet = await prisma.attendanceSheet.findUnique({
          where: { id: qrToken.sheetId },
          select: { enableWhatsAppAutoSend: true, whatsAppSendOnCheckin: true }
        });

        if (sheet?.enableWhatsAppAutoSend && sheet?.whatsAppSendOnCheckin) {
          sendAttendanceToWhatsApp(qrToken.sheetId).catch(err => {
            console.error('⚠️ WhatsApp auto-send failed:', err.message);
          });
        }

      } catch (bgErr) {
        console.error("Background notification failed:", bgErr.message);
      }
    })();
    
 } catch (err) {
  if (err.code === 'P2002' && err.meta?.target?.includes('deviceId')) {
    const existingEntry = await prisma.attendanceEntry.findFirst({
      where: { deviceId: req.body.deviceId },
      include: { user: true }
    });
    const userName = existingEntry?.user?.fullName || 'someone';
    return res.status(400).json({ 
      error: `This device has already been used to check in ${userName}`,
      code: "DEVICE_ALREADY_USED"
    });
  }
  if (err.code === 'P2002' && err.meta?.target?.includes('sheetId') && err.meta?.target?.includes('userId')) {
    return res.status(400).json({ 
      error: "Already checked in",
      code: "ALREADY_CHECKED_IN"
    });
  }
  console.error("QR check-in error:", err);
  res.status(500).json({ error: "Check-in failed. Please try again.", code: "SERVER_ERROR" });
}
});
// Get QR code status for a sheet
router.get("/sheet/:sheetId/qr-status", authenticate, requireLeaderOrAdmin, async (req, res) => {
  try {
    const { sheetId } = req.params;
    
    const qrToken = await prisma.qRCodeToken.findFirst({
      where: { sheetId: sheetId },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      success: true,
      hasQR: !!qrToken,
      token: qrToken?.token || null,
      expiresAt: qrToken?.expiresAt || null,
      createdAt: qrToken?.createdAt || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== HELPER FUNCTIONS ====================

// Get message tone based on user role
function getMessageTone(userRole, specialRole) {
  if (specialRole === 'chairperson') {
    return {
      missedTitle: "Executive Attendance Notice",
      missedMessage: "Your attendance is required at leadership meetings. Please review the meeting minutes and contact the administration regarding your absence.",
      style: "urgent",
      actionRequired: true
    };
  }
  
  if (specialRole === 'secretary') {
    return {
      missedTitle: "Secretary Attendance Notice",
      missedMessage: "You were not recorded as present at today's meeting. As secretary, your attendance is important for meeting documentation. Please contact the chairperson for any updates.",
      style: "important",
      actionRequired: true
    };
  }
  
  if (specialRole === 'treasurer') {
    return {
      missedTitle: "Finance Officer Attendance Notice",
      missedMessage: "Your attendance was not recorded at today's meeting. Financial matters were discussed. Please contact the chairperson for information.",
      style: "important",
      actionRequired: true
    };
  }
  
  if (specialRole === 'jumuia_leader') {
    return {
      missedTitle: "Jumuia Leader Attendance Notice",
      missedMessage: "You were absent from today's meeting. Please check with the administration for any important announcements.",
      style: "urgent",
      actionRequired: true
    };
  }
  
  if (specialRole === 'choir_moderator') {
    return {
      missedTitle: "Choir Leader Attendance Notice",
      missedMessage: "Your attendance was not recorded at today's meeting. Please review the meeting notes for any updates on upcoming services.",
      style: "direct",
      actionRequired: false
    };
  }
  
  if (specialRole === 'media_moderator') {
    return {
      missedTitle: "Media Team Attendance Notice",
      missedMessage: "You missed today's meeting. Please check the group communications for updates on upcoming events.",
      style: "informative",
      actionRequired: false
    };
  }
  
  // Regular member
  return {
    missedTitle: "Meeting Attendance Notice",
    missedMessage: "Your attendance was not recorded for the recent meeting. Please make note of future meeting schedules.",
    style: "gentle",
    actionRequired: false
  };

}

// Send check-in confirmation to member - FIRE AND FORGET
// Send check-in confirmation to member - FIRE AND FORGET (NO AWAIT)
const sendCheckinConfirmation = (userId, sheetTitle, entry) => {
  // 🔥 Use setImmediate to run in background without blocking
  setImmediate(async () => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user) return;
      
      // In-app notification - fire and forget
      createAndSendNotification({
        userId: userId,
        type: "attendance_checkin",
        title: "✅ Check-in Successful!",
        message: `You have been checked in for "${sheetTitle}" at ${new Date(entry.signTime).toLocaleTimeString()}`,
        data: { sheetId: entry.sheetId, entryId: entry.id }
      }).catch(err => console.error("Check-in notif failed:", err.message));
      
      // Send email confirmation - fire and forget (no await)
      if (user.email) {
        sendPersonalizedEmail(
          { email: user.email, fullName: user.fullName },
          "attendance_checkin",
          `Check-in Confirmation: ${sheetTitle}`,
          `Dear ${user.fullName},

This is to confirm that you have been successfully checked in for "${sheetTitle}".

Check-in Details:
- Meeting: ${sheetTitle}
- Time: ${new Date(entry.signTime).toLocaleString()}
- Method: ${entry.signMethod}

Thank you for your attendance.

Zetech University Catholic Action (ZUCA)`,
          { sheetTitle, signTime: entry.signTime, signMethod: entry.signMethod }
        ).catch(err => console.error("Check-in email failed:", err.message));
      }
    } catch (err) {
      console.error("Failed to send check-in confirmation:", err.message);
    }
  });
};

const sendSheetOpenedNotification = async (sheet) => {
  try {
    let targetUsers = [];
    
    if (sheet.isExecutiveOnly) {
      const executives = await prisma.executive.findMany({
        where: { isActive: true },
        select: { userId: true }
      });
      targetUsers = executives.map(exec => ({ id: exec.userId }));
    } else if (sheet.jumuiaId) {
      targetUsers = await prisma.user.findMany({
        where: { jumuiaId: sheet.jumuiaId },
        select: { id: true }
      });
    } else {
      targetUsers = await prisma.user.findMany({ select: { id: true } });
    }
    
    const meetingDate = new Date(sheet.eventDate).toLocaleDateString();
    const meetingTime = sheet.eventTime || "TBD";
    
    for (const user of targetUsers) {
      await createAndSendNotification({
        userId: user.id,
        type: "attendance_sheet_opened",
        title: `📋 Attendance Open: ${sheet.title}`,
        message: `A new attendance sheet has been opened for "${sheet.title}" on ${meetingDate} at ${meetingTime} at ${sheet.location || "ZUCA"}. Please check in when you arrive.`,
        data: { sheetId: sheet.id, title: sheet.title, eventDate: sheet.eventDate }
      });
    }
    
    console.log(`✅ Sent ${targetUsers.length} notifications for sheet opening: ${sheet.title}`);
  } catch (err) {
    console.error("Failed to send sheet opened notifications:", err.message);
  }
};
// Send notification for attendance sheet closed - BATCHED & FIRE-AND-FORGET
const sendSheetClosedNotification = async (sheetId) => {
  (async () => {
    try {
      const sheet = await prisma.attendanceSheet.findUnique({
        where: { id: sheetId },
        include: {
          entries: {
            include: { user: true }
          },
          creator: {
            select: { id: true, fullName: true, email: true }
          }
        }
      });
      
      if (!sheet) return;
      
    let allMembers = [];

// ✅ FIX: Use isExecutiveOnly flag
if (sheet.isExecutiveOnly) {
  // Executive meeting - only executives
  const executives = await prisma.executive.findMany({
    where: { isActive: true },
    include: { user: true }
  });
  allMembers = executives.map(exec => exec.user);
} else if (sheet.jumuiaId) {
  // Jumuia meeting - only that jumuia's members
  allMembers = await prisma.user.findMany({
    where: { jumuiaId: sheet.jumuiaId }
  });
} else {
  // Global meeting - everyone
  allMembers = await prisma.user.findMany();
}
      const presentUserIds = new Set(sheet.entries.map(e => e.userId).filter(id => id));
      const presentMembers = allMembers.filter(m => presentUserIds.has(m.id));
      const absentMembers = allMembers.filter(m => !presentUserIds.has(m.id));
      
      // If no members (empty executive list, etc.), don't send notifications
      if (allMembers.length === 0) {
        console.log(`⚠️ No target members found for sheet ${sheet.id} - skipping notifications`);
        return;
      }
      
      const meetingSummary = `Meeting: ${sheet.title}\nDate: ${new Date(sheet.eventDate).toLocaleString()}\nTotal Expected: ${allMembers.length}\nPresent: ${presentMembers.length}\nAbsent: ${absentMembers.length}\nAttendance Rate: ${((presentMembers.length / allMembers.length) * 100).toFixed(1)}%`;
      
      // 1. Notify present members (thank you)
      const BATCH_SIZE = 20;
      for (let i = 0; i < presentMembers.length; i += BATCH_SIZE) {
        const batch = presentMembers.slice(i, i + BATCH_SIZE);
        Promise.allSettled(
          batch.map(member => 
            createAndSendNotification({
              userId: member.id,
              type: "attendance_thankyou",
              title: "🙏 Thank You for Attending!",
              message: `Thank you for attending "${sheet.title}". Your presence is appreciated! lets build ZUCA together`,
              data: { sheetId: sheet.id, title: sheet.title }
            }).catch(err => console.error(`Notif failed for ${member.id}:`, err.message))
          )
        );
      }
      
      // 2. Notify absent members
      for (let i = 0; i < absentMembers.length; i += BATCH_SIZE) {
        const batch = absentMembers.slice(i, i + BATCH_SIZE);
        Promise.allSettled(
          batch.map(async (member) => {
            const tone = getMessageTone(member.role, member.specialRole);
            
            createAndSendNotification({
              userId: member.id,
              type: "attendance_missed",
              title: tone.missedTitle,
              message: tone.missedMessage,
              data: { 
                sheetId: sheet.id, 
                title: sheet.title,
                style: tone.style,
                actionRequired: tone.actionRequired
              }
            }).catch(err => console.error(`Missed notif failed for ${member.id}:`, err.message));
            
            if (member.email) {
              sendPersonalizedEmail(
                { email: member.email, fullName: member.fullName },
                "attendance_missed",
                `Notice of Absence: ${sheet.title}`,
                `Dear ${member.fullName},

This is to notify you that your attendance was not recorded for the following meeting:

Meeting: ${sheet.title}
Date: ${new Date(sheet.eventDate).toLocaleString()}
Location: ${sheet.location || "ZUCA"}

${tone.actionRequired ? 'Please contact the meeting organizer to discuss any outstanding matters.' : 'We encourage you to attend future meetings to stay informed about ZUCA activities.'}

For any questions, please contact us.

Zetech University Catholic Action (ZUCA)`,
                { sheetTitle: sheet.title, meetingDate: sheet.eventDate }
              ).catch(err => console.error(`Email failed for ${member.email}:`, err.message));
            }
          })
        );
      }
      
      // 3. Notify admin/creator with summary report
      if (sheet.creator) {
        createAndSendNotification({
          userId: sheet.creator.id,
          type: "attendance_summary",
          title: "📊 Attendance Summary Report",
          message: `${sheet.title}\nPresent: ${presentMembers.length}/${allMembers.length}\nAbsent: ${absentMembers.length}\nRate: ${((presentMembers.length / allMembers.length) * 100).toFixed(1)}%\n\nTap to view full report.`,
          data: { sheetId: sheet.id, summary: { present: presentMembers.length, absent: absentMembers.length, total: allMembers.length } }
        }).catch(err => console.error("Summary notif failed:", err.message));
        
        if (sheet.creator.email) {
          const absentList = absentMembers.map(m => `• ${m.fullName}${m.specialRole ? ` (${m.specialRole})` : ''}`).join('\n');
          const presentList = presentMembers.map(m => `• ${m.fullName}${m.specialRole ? ` (${m.specialRole})` : ''}`).join('\n');
          
          sendPersonalizedEmail(
            { email: sheet.creator.email, fullName: sheet.creator.fullName },
            "attendance_admin_report",
            `Attendance Report: ${sheet.title}`,
            `Dear ${sheet.creator.fullName},

Here is the official attendance report for "${sheet.title}":

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MEETING SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${meetingSummary}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRESENT (${presentMembers.length})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${presentList || "None"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ABSENT (${absentMembers.length})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${absentList || "None"}

This report is automatically generated by ZUCA attendance system.

Zetech University Catholic Action (ZUCA)`,
            { sheetTitle: sheet.title, presentCount: presentMembers.length, absentCount: absentMembers.length, presentList, absentList }
          ).catch(err => console.error("Admin email failed:", err.message));
        }
      }
      
      console.log(`✅ Sent notifications for sheet ${sheet.id} (background)`);
    } catch (err) {
      console.error("Failed to send sheet closed notifications:", err.message);
    }
  })();
};

// Send reminder to specific user
const sendReminderToUser = async (userId, sheetId, customMessage = null) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    const sheet = await prisma.attendanceSheet.findUnique({
      where: { id: sheetId }
    });
    
    if (!user || !sheet) return;
    
    const tone = getMessageTone(user.role, user.specialRole);
    const message = customMessage || tone.missedMessage;
    
    await createAndSendNotification({
      userId: user.id,
      type: "attendance_reminder",
      title: `📢 Reminder: ${sheet.title}`,
      message: message,
      data: { sheetId: sheet.id, title: sheet.title }
    });
    
    if (user.email) {
      await sendPersonalizedEmail(
  { email: user.email, fullName: user.fullName },
  "attendance_reminder",
  `Meeting Reminder: ${sheet.title}`,
  `Dear ${user.fullName},

${message}

Meeting Details:
- Title: ${sheet.title}
- Date: ${new Date(sheet.eventDate).toLocaleString()}
- Location: ${sheet.location || "ZUCA"}

Your attendance is appreciated.

Zetech University Catholic Action (ZUCA)`,
  { sheetTitle: sheet.title }
);
    }
    
    return true;
  } catch (err) {
    console.error("Failed to send reminder:", err.message);
    return false;
  }
};

// ==================== CONTROLLER FUNCTIONS ====================

// Create new attendance sheet (OPTIMIZED - Fast response)
const createAttendanceSheet = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      eventDate, 
      eventTime, 
      location,
      allowSelfCheckin,
      enableWifiCheckin,
      wifiSSID,
      jumuiaId,
      enableWhatsAppAutoSend,
      whatsAppGroupIds,
      whatsAppGroupNames,
      whatsAppCustomMessage,
      whatsAppSendOnCheckin,
      whatsAppSendOnClose
    } = req.body;

    if (!title || !eventDate) {
      return res.status(400).json({ error: "Title and event date are required" });
    }

    let targetJumuiaId = jumuiaId;
    let isExecutiveOnly = false;

    if (jumuiaId === 'executive-team') {
      targetJumuiaId = null;
      isExecutiveOnly = true;  
    }

    const sheet = await prisma.attendanceSheet.create({
      data: {
        title,
        description,
        eventDate: new Date(eventDate),
        eventTime,
        location,
        allowSelfCheckin: allowSelfCheckin || false,
        enableWifiCheckin: enableWifiCheckin || false,
        wifiSSID: enableWifiCheckin ? wifiSSID : null,
        jumuiaId: targetJumuiaId,
        isExecutiveOnly: isExecutiveOnly, 
        createdBy: req.user.userId,
        isActive: true,
        enableWhatsAppAutoSend: enableWhatsAppAutoSend || false,
        whatsAppGroupIds: whatsAppGroupIds || null,
        whatsAppGroupNames: whatsAppGroupNames || null,
        whatsAppCustomMessage: whatsAppCustomMessage || null,
        whatsAppSendOnCheckin: whatsAppSendOnCheckin !== undefined ? whatsAppSendOnCheckin : true,
        whatsAppSendOnClose: whatsAppSendOnClose !== undefined ? whatsAppSendOnClose : true
      }
    });

    res.status(201).json({ success: true, sheet });
    
    // Background notifications
    (async () => {
      try {
        let targetUsers = [];
        
        if (sheet.isExecutiveOnly) {
          const executives = await prisma.executive.findMany({
            where: { isActive: true },
            select: { userId: true }
          });
          targetUsers = executives.map(exec => ({ id: exec.userId }));
        } else if (sheet.jumuiaId) {
          targetUsers = await prisma.user.findMany({
            where: { jumuiaId: sheet.jumuiaId },
            select: { id: true }
          });
        } else {
          targetUsers = await prisma.user.findMany({ select: { id: true } });
        }
        
        const meetingDate = new Date(sheet.eventDate).toLocaleDateString();
        
        for (const user of targetUsers) {
          await createAndSendNotification({
            userId: user.id,
            type: "attendance_sheet_opened",
            title: `📋 Attendance Open: ${sheet.title}`,
            message: `Attendance sheet for "${sheet.title}" on ${meetingDate} is now open.`,
            data: { sheetId: sheet.id }
          });
        }
      } catch (err) {
        console.error("Failed to send sheet notifications:", err.message);
      }
    })();
    
  } catch (err) {
    console.error("Create attendance sheet error:", err);
    res.status(500).json({ error: err.message });
  }
};
// Get active sheets (for members)
// Get active sheets (for members)
const getActiveSheets = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user's info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { jumuiaId: true, role: true, specialRole: true }
    });
    
    // Check if user is executive
    const isExecutive = await prisma.executive.findFirst({
      where: { userId: userId, isActive: true }
    });
    
    // Get all active sheets
    const allSheets = await prisma.attendanceSheet.findMany({
      where: {
        isActive: true,
        eventDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      },
      include: { _count: { select: { entries: true } } },
      orderBy: { eventDate: "asc" }
    });
    
   // Filter sheets based on user's access
const visibleSheets = allSheets.filter(sheet => {
  // Executive sheet - only executives + admins + secretaries
  if (sheet.isExecutiveOnly) {
    return isExecutive || user.role === 'admin' || user.specialRole === 'secretary';
  }
  
  // Jumuia sheet - only members of that Jumuia + admins + secretaries
  if (sheet.jumuiaId) {
    return user.jumuiaId === sheet.jumuiaId || user.role === 'admin' || user.specialRole === 'secretary';
  }
  
  // Global sheet (jumuiaId = null, not executive) - everyone can see
  return true;
});
    
    console.log(`📋 User ${userId} can see ${visibleSheets.length} of ${allSheets.length} sheets`);
    
    res.json({ success: true, sheets: visibleSheets });
    
  } catch (err) {
    console.error("Get active sheets error:", err);
    res.status(500).json({ error: err.message });
  }
};

/// Get single sheet with entries (including absent members)
/// Get single sheet with entries (including absent members) - WITH CACHE
const getSheetById = async (req, res) => {
  try {
    const { sheetId } = req.params;
    const userId = req.user.userId;
    const startTime = Date.now();
    
    // ========== STEP 1: CHECK CACHE FIRST ==========
    const cachedData = getCachedSheet(sheetId);
    if (cachedData) {
      const duration = Date.now() - startTime;
      console.log(`⚡ CACHED sheet ${sheetId} returned in ${duration}ms`);
      return res.json({ 
        success: true, 
        sheet: cachedData,
        cached: true,
        duration: `${duration}ms`
      });
    }
    
    console.log(`📡 Fetching sheet ${sheetId} from database...`);
    
    // ========== STEP 2: FETCH SHEET BASIC INFO ==========
    const sheetBasic = await prisma.attendanceSheet.findUnique({
      where: { id: sheetId },
      select: { 
        id: true,
        title: true,
        eventDate: true,
        eventTime: true,
        location: true,
        isActive: true,
        isExecutiveOnly: true, 
        jumuiaId: true,
        allowSelfCheckin: true,
        enableWifiCheckin: true,
        createdAt: true,
        createdBy: true,
        creator: {
          select: { id: true, fullName: true, email: true }
        }
      }
    });
    
    if (!sheetBasic) {
      return res.status(404).json({ error: "Attendance sheet not found" });
    }
    
    // ========== STEP 3: CHECK ACCESS (FAST) ==========
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, specialRole: true, jumuiaId: true }
    });
    
    const isAdmin = currentUser.role === 'admin' || currentUser.specialRole === 'admin';
    const isSecretary = currentUser.role === 'secretary' || currentUser.specialRole === 'secretary';
    
    if (sheetBasic.isExecutiveOnly) {
      const isExecutive = await prisma.executive.findFirst({
        where: { userId: userId, isActive: true },
        select: { id: true }
      });
      if (!isExecutive && !isAdmin && !isSecretary) {
        return res.status(403).json({ error: "Access denied - Executive meeting only" });
      }
    } else if (sheetBasic.jumuiaId) {
      if (!isAdmin && !isSecretary && currentUser.jumuiaId !== sheetBasic.jumuiaId) {
        return res.status(403).json({ error: "Access denied - This meeting is for specific Jumuia only" });
      }
    }
    
    // ========== STEP 4: FETCH ENTRIES (ONLY NEEDED FIELDS) ==========
    const entries = await prisma.attendanceEntry.findMany({
      where: { sheetId: sheetId },
      select: {
        id: true,
        userId: true,
        fullName: true,
        phoneNumber: true,
        role: true,
        specialRole: true,
        membershipNumber: true,
        signMethod: true,
        signTime: true,
        notes: true,
        verifiedBy: true,
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            role: true,
            specialRole: true,
            membership_number: true,
            homeJumuia: { select: { name: true } }
          }
        }
      },
      orderBy: { signTime: "asc" },
      take: 500 // Limit entries
    });
    
    // ========== STEP 5: GET EXECUTIVE POSITIONS ==========
    const presentUserIds = entries.map(e => e.userId).filter(id => id);
    let executiveMap = new Map();
    
    if (presentUserIds.length > 0) {
      const executives = await prisma.executive.findMany({
        where: { 
          userId: { in: presentUserIds },
          isActive: true 
        },
        select: {
          userId: true,
          position: {
            select: { title: true, category: true, level: true }
          }
        }
      });
      
      executives.forEach(exec => {
        executiveMap.set(exec.userId, {
          executivePosition: exec.position?.title || null,
          executiveCategory: exec.position?.category || null
        });
      });
    }
    
    // ========== STEP 6: GET TARGET MEMBERS (LIMITED) ==========
    let allTargetMembers = [];
    let totalMembers = 0;
    
    if (sheetBasic.isExecutiveOnly) {
      const executives = await prisma.executive.findMany({
        where: { isActive: true },
        select: {
          userId: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              role: true,
              membership_number: true,
              homeJumuia: { select: { name: true } }
            }
          },
          position: {
            select: { title: true, category: true, level: true }
          }
        }
      });
      
      allTargetMembers = executives.map(exec => ({
        ...exec.user,
        executivePosition: exec.position?.title || null,
        executiveCategory: exec.position?.category || null
      }));
      totalMembers = allTargetMembers.length;
      
    } else if (sheetBasic.jumuiaId) {
      const users = await prisma.user.findMany({
        where: { jumuiaId: sheetBasic.jumuiaId },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          membership_number: true,
          homeJumuia: { select: { name: true } }
        },
        orderBy: { fullName: 'asc' },
        take: 300
      });
      
      const userIds = users.map(u => u.id);
      let execMap = new Map();
      
      if (userIds.length > 0) {
        const execs = await prisma.executive.findMany({
          where: { userId: { in: userIds }, isActive: true },
          select: {
            userId: true,
            position: { select: { title: true } }
          }
        });
        execs.forEach(e => execMap.set(e.userId, e.position?.title || null));
      }
      
      allTargetMembers = users.map(user => ({
        ...user,
        executivePosition: execMap.get(user.id) || null
      }));
      totalMembers = allTargetMembers.length;
      
    } else {
      // Global meeting - limit to 200
      const users = await prisma.user.findMany({
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          membership_number: true,
          homeJumuia: { select: { name: true } }
        },
        orderBy: { fullName: 'asc' },
        take: 200
      });
      
      const userIds = users.map(u => u.id);
      let execMap = new Map();
      
      if (userIds.length > 0) {
        const execs = await prisma.executive.findMany({
          where: { userId: { in: userIds }, isActive: true },
          select: {
            userId: true,
            position: { select: { title: true } }
          }
        });
        execs.forEach(e => execMap.set(e.userId, e.position?.title || null));
      }
      
      allTargetMembers = users.map(user => ({
        ...user,
        executivePosition: execMap.get(user.id) || null
      }));
      totalMembers = allTargetMembers.length;
    }
    
   // ========== STEP 7: BUILD RESPONSE ==========
const presentUserIdsSet = new Set(presentUserIds);

const entriesWithExecutive = entries
 
  .map(entry => ({
    ...entry,
    executivePosition: executiveMap.get(entry.userId)?.executivePosition || null,
    executiveCategory: executiveMap.get(entry.userId)?.executiveCategory || null
  }));

const absentMembers = allTargetMembers
  .filter(member => !presentUserIdsSet.has(member.id))
 
    
    const responseData = {
      ...sheetBasic,
      entries: entriesWithExecutive,
      totalMembers,
      absentMembers
    };
    
    // ========== STEP 8: CACHE THE RESPONSE ==========
    setCachedSheet(sheetId, responseData);
    
    const duration = Date.now() - startTime;
    console.log(`✅ Sheet ${sheetId} loaded in ${duration}ms (cached)`);
    
    res.json({ 
      success: true, 
      sheet: responseData,
      cached: false,
      duration: `${duration}ms`
    });
    
  } catch (err) {
    console.error("Get sheet error:", err);
    res.status(500).json({ error: err.message });
  }
};
// Self check-in (user adds themselves)
const selfCheckin = async (req, res) => {
  try {
    const { sheetId, deviceId, deviceName } = req.body;
    const userId = req.user.userId;

    if (!sheetId) {
      return res.status(400).json({ error: "Sheet ID required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const sheet = await prisma.attendanceSheet.findUnique({
      where: { id: sheetId, isActive: true }
    });

    if (!sheet) {
      return res.status(404).json({ error: "Attendance sheet not found or closed" });
    }

    if (!sheet.allowSelfCheckin) {
      return res.status(403).json({ error: "Self check-in is not enabled for this meeting" });
    }

    const existingEntry = await prisma.attendanceEntry.findFirst({
      where: {
        sheetId: sheetId,
        userId: userId
      }
    });

    if (existingEntry) {
      return res.status(400).json({ 
        error: "ALREADY_CHECKED_IN",
        message: "You have already checked in for this meeting",
        checkInTime: existingEntry.signTime,
        method: existingEntry.signMethod
      });
    }

    if (deviceId) {
      const deviceEntry = await prisma.attendanceEntry.findFirst({
        where: {
          sheetId: sheetId,
          deviceId: deviceId
        }
      });

      if (deviceEntry) {
        return res.status(400).json({
          error: "DEVICE_ALREADY_USED",
          message: "This device has already been used to check someone in"
        });
      }
    }

    const entry = await prisma.attendanceEntry.create({
      data: {
        sheetId,
        userId,
        deviceId,
        deviceName: deviceName || null,
        fullName: user.fullName,
        phoneNumber: user.phone,
        role: user.role,
        specialRole: user.specialRole,
        membershipNumber: user.membership_number,
        jumuiaId: user.jumuiaId,
        signMethod: "SELF",
        signTime: new Date()
      }
    });

    // Send check-in confirmation
    await sendCheckinConfirmation(userId, sheet.title, entry);

     // ✅ WHATSAPP AUTO-SEND TRIGGER
    if (sheet.enableWhatsAppAutoSend && sheet.whatsAppSendOnCheckin) {
      sendAttendanceToWhatsApp(sheetId).catch(err => {
        console.error('⚠️ WhatsApp auto-send failed:', err.message);
      });
    }

    res.json({ success: true, entry });
  } catch (err) {
    console.error("Self check-in error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Wi-Fi auto check-in
const wifiCheckin = async (req, res) => {
  try {
    const { sheetId, deviceId, deviceName, ssid, bssid } = req.body;
    const userId = req.user.userId;

    if (!sheetId || !ssid) {
      return res.status(400).json({ error: "Sheet ID and SSID required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const sheet = await prisma.attendanceSheet.findUnique({
      where: { id: sheetId, isActive: true }
    });

    if (!sheet) {
      return res.status(404).json({ error: "Attendance sheet not found or closed" });
    }

    if (!sheet.enableWifiCheckin) {
      return res.status(403).json({ error: "Wi-Fi check-in is not enabled for this meeting" });
    }

    if (sheet.wifiSSID !== ssid) {
      return res.status(403).json({ error: "Invalid Wi-Fi network for this meeting" });
    }

    const existingEntry = await prisma.attendanceEntry.findFirst({
      where: {
        sheetId: sheetId,
        userId: userId
      }
    });

    if (existingEntry) {
      return res.status(400).json({ 
        error: "ALREADY_CHECKED_IN",
        message: "You have already checked in for this meeting"
      });
    }

    if (deviceId) {
      const deviceEntry = await prisma.attendanceEntry.findFirst({
        where: {
          sheetId: sheetId,
          deviceId: deviceId
        }
      });

      if (deviceEntry) {
        return res.status(400).json({
          error: "DEVICE_ALREADY_USED",
          message: "This device has already been used to check someone in"
        });
      }
    }

    const entry = await prisma.attendanceEntry.create({
      data: {
        sheetId,
        userId,
        deviceId,
        deviceName: deviceName || null,
        fullName: user.fullName,
        phoneNumber: user.phone,
        role: user.role,
        specialRole: user.specialRole,
        membershipNumber: user.membership_number,
        jumuiaId: user.jumuiaId,
        signMethod: "WIFI_AUTO",
        signTime: new Date(),
        connectedSSID: ssid,
        connectedBSSID: bssid
      }
    });

    await sendCheckinConfirmation(userId, sheet.title, entry);

      // ✅ WHATSAPP AUTO-SEND TRIGGER
    if (sheet.enableWhatsAppAutoSend && sheet.whatsAppSendOnCheckin) {
      sendAttendanceToWhatsApp(sheetId).catch(err => {
        console.error('⚠️ WhatsApp auto-send failed:', err.message);
      });
    }

    res.json({ success: true, entry });
  } catch (err) {
    console.error("Wi-Fi check-in error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Admin add entry (can add anyone)
const adminAddEntry = async (req, res) => {
  try {
    const { sheetId } = req.params;
    const { 
      fullName, 
      phoneNumber, 
      role, 
      specialRole,
      membershipNumber, 
      jumuiaId,
      jumuiaName,
      notes 
    } = req.body;

    if (!fullName) {
      return res.status(400).json({ error: "Full name is required" });
    }

    const sheet = await prisma.attendanceSheet.findUnique({
      where: { id: sheetId }
    });

    if (!sheet) {
      return res.status(404).json({ error: "Attendance sheet not found" });
    }

    let user = null;
    let existingEntry = null;

    // ✅ Try to find user by phone number
    if (phoneNumber) {
      const cleanPhone = phoneNumber.trim().replace(/[\s\-]/g, '');
      
      // Try ALL phone formats
      let phoneFormats = [
        cleanPhone,
        cleanPhone.startsWith('0') ? cleanPhone.substring(1) : `0${cleanPhone}`,
        cleanPhone.startsWith('+254') ? cleanPhone : `+254${cleanPhone.replace(/^0/, '')}`,
        cleanPhone.startsWith('+254') ? cleanPhone.substring(1) : null,
        cleanPhone.startsWith('+254') ? cleanPhone.substring(4) : null,
        cleanPhone.startsWith('254') ? cleanPhone : `+${cleanPhone}`,
        cleanPhone.startsWith('254') ? `0${cleanPhone.substring(3)}` : null,
        cleanPhone.startsWith('254') ? cleanPhone.substring(3) : null,
      ].filter(p => p);
      
      // Remove duplicates
      phoneFormats = [...new Set(phoneFormats)];
      
      user = await prisma.user.findFirst({
        where: {
          OR: phoneFormats.map(phone => ({
            phone: phone
          }))
        }
      });

      // ✅ Check if user already checked in
      if (user) {
        existingEntry = await prisma.attendanceEntry.findFirst({
          where: { sheetId, userId: user.id }
        });

        if (existingEntry) {
          return res.status(400).json({ 
            error: `${user.fullName} is already checked in`,
            existingEntry 
          });
        }
      }
    }

    // ✅ If user not found by phone, try membership number
    if (!user && membershipNumber) {
      user = await prisma.user.findFirst({
        where: { membership_number: membershipNumber }
      });
    }

    // ✅ If still no user, try by full name (exact match)
    if (!user && fullName) {
      user = await prisma.user.findFirst({
        where: { 
          fullName: {
            equals: fullName,
            mode: 'insensitive'
          }
        }
      });
    }

    // ✅ Use user data if found, otherwise use provided data
    const entryData = {
      sheetId,
      userId: user?.id || null,
      fullName: user?.fullName || fullName,
      phoneNumber: user?.phone || phoneNumber || null,
      role: user?.role || role || "Guest",
      specialRole: user?.specialRole || specialRole || null,
      membershipNumber: user?.membership_number || membershipNumber || null,
      jumuiaId: user?.jumuiaId || jumuiaId || null,
      jumuiaName: jumuiaName || null,
      signMethod: "MANUAL",
      verifiedBy: req.user.userId,
      notes: notes || (user ? `Auto-filled from existing user` : null)
    };

    const entry = await prisma.attendanceEntry.create({
      data: entryData
    });

    res.status(201).json({ success: true, entry });
    invalidateSheetCache(sheetId);

    // ✅ Send notification in BACKGROUND
    if (user?.id) {
      sendCheckinConfirmation(user.id, sheet.title, entry);
    }


       // ✅ WHATSAPP AUTO-SEND TRIGGER
    if (sheet.enableWhatsAppAutoSend && sheet.whatsAppSendOnCheckin) {
      sendAttendanceToWhatsApp(sheetId).catch(err => {
        console.error('⚠️ WhatsApp auto-send failed:', err.message);
      });
    }

  } catch (err) {
    console.error("Admin add entry error:", err);
    res.status(500).json({ error: err.message });
  }
};
// Update entry (admin/leader)
const updateEntry = async (req, res) => {
  try {
    const { sheetId, entryId } = req.params;
    const { fullName, phoneNumber, role, notes } = req.body;

    const entry = await prisma.attendanceEntry.findFirst({
      where: { id: entryId, sheetId }
    });

    if (!entry) {
      return res.status(404).json({ error: "Entry not found" });
    }

    const updated = await prisma.attendanceEntry.update({
      where: { id: entryId },
      data: {
        fullName: fullName || entry.fullName,
        phoneNumber: phoneNumber || entry.phoneNumber,
        role: role || entry.role,
        notes: notes !== undefined ? notes : entry.notes
      }
    });

    res.json({ success: true, entry: updated });
    invalidateSheetCache(sheetId)
  } catch (err) {
    console.error("Update entry error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Delete entry (admin only)
const deleteEntry = async (req, res) => {
  try {
    const { sheetId, entryId } = req.params;

    const entry = await prisma.attendanceEntry.findFirst({
      where: { id: entryId, sheetId }
    });

    if (!entry) {
      return res.status(404).json({ error: "Entry not found" });
    }

    await prisma.attendanceEntry.delete({ where: { id: entryId } });

    res.json({ success: true, message: "Entry deleted" });
    invalidateSheetCache(sheetId);
  } catch (err) {
    console.error("Delete entry error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Close sheet (stop accepting check-ins)
const closeSheet = async (req, res) => {
  try {
    const { sheetId } = req.params;

    const updated = await prisma.attendanceSheet.update({
      where: { id: sheetId },
      data: { isActive: false, closedAt: new Date() }
    });

    // Send notifications to all members
    await sendSheetClosedNotification(sheetId);

     // ✅ WHATSAPP AUTO-SEND TRIGGER ON CLOSE
    if (updated.enableWhatsAppAutoSend && updated.whatsAppSendOnClose) {
      sendAttendanceToWhatsApp(sheetId).catch(err => {
        console.error('⚠️ WhatsApp auto-send on close failed:', err.message);
      });
    }

    // Emit socket event
    const io = req.app.get("io");
    if (io) {
      io.emit("attendance_sheet_closed", { sheetId });
    }

    res.json({ success: true, sheet: updated });
    invalidateSheetCache(sheetId);
  } catch (err) {
    console.error("Close sheet error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Update sheet settings
const updateSheetSettings = async (req, res) => {
  try {
    const { sheetId } = req.params;
    const { allowSelfCheckin, enableWifiCheckin, wifiSSID } = req.body;

    const updated = await prisma.attendanceSheet.update({
      where: { id: sheetId },
      data: {
        allowSelfCheckin,
        enableWifiCheckin,
        wifiSSID: enableWifiCheckin ? wifiSSID : null
      }
    });

    res.json({ success: true, sheet: updated });
    invalidateSheetCache(sheetId);
  } catch (err) {
    console.error("Update settings error:", err);
    res.status(500).json({ error: err.message });
  }
};



// Get user's attendance history
const getUserAttendanceHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { semesterId } = req.query; // 'current', 'all', or specific ID
    
    console.log(`📊 Fetching history for user ${userId}, semester: ${semesterId || 'current'}`);
    
    // Build the where clause
    let where = { userId };
    
    // Add semester date filter if applicable
    if (semesterId !== 'all') {
      const dateFilter = await getSemesterDateFilter(prisma, semesterId);
      if (dateFilter) {
        where.signTime = dateFilter;
      }
    }
    // If semesterId === 'all', no date filter (show everything)

    const history = await prisma.attendanceEntry.findMany({
      where,
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
      orderBy: { signTime: "desc" },
      take: 50
    });

    const total = history.length;
    const present = history.length;
    const attendanceRate = total > 0 ? (present / total) * 100 : 0;

    // Get current semester info for response
    const currentSemester = await getCurrentSemester(prisma);
    const semesterName = currentSemester?.title || 'No active semester';

    res.json({ 
      success: true, 
      history,
      stats: {
        total,
        present,
        attendanceRate: attendanceRate.toFixed(1)
      },
      filter: {
        semesterId: semesterId || 'current',
        semesterName: semesterName
      }
    });
  } catch (err) {
    console.error("Get user history error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Delete entire attendance sheet (admin only)
router.delete("/sheet/:sheetId", authenticate, requireLeaderOrAdmin, async (req, res) => {
  try {
    const { sheetId } = req.params;
    
    // First delete all entries
    await prisma.attendanceEntry.deleteMany({
      where: { sheetId: sheetId }
    });
    
    // Then delete the sheet
    await prisma.attendanceSheet.delete({
      where: { id: sheetId }
    });
    
    res.json({ success: true, message: "Sheet deleted successfully" });
  } catch (err) {
    console.error("Delete sheet error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Reopen a closed sheet (admin only)
router.post("/sheet/:sheetId/reopen", authenticate, requireLeaderOrAdmin, async (req, res) => {
  try {
    const { sheetId } = req.params;

    const updated = await prisma.attendanceSheet.update({
      where: { id: sheetId },
      data: { 
        isActive: true,
        closedAt: null,
        eventDate: new Date() // Update to current date when reopening
      }
    });

    res.json({ success: true, sheet: updated });
  } catch (err) {
    console.error("Reopen sheet error:", err);
    res.status(500).json({ error: err.message });
  }
});


// Bulk add entries (admin only) - FAST
router.post("/sheet/:sheetId/entries/batch", authenticate, requireLeaderOrAdmin, async (req, res) => {
  try {
    const { sheetId } = req.params;
    const { users } = req.body;
    
    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ error: "Users array required" });
    }
    
    const sheet = await prisma.attendanceSheet.findUnique({
      where: { id: sheetId }
    });
    
    if (!sheet) {
      return res.status(404).json({ error: "Sheet not found" });
    }
    
    const entries = [];
    const alreadyCheckedIn = [];
    
    // Get ALL existing users by phone in one query
    const phoneNumbers = users
      .map(u => u.phoneNumber)
      .filter(p => p)
      .map(p => p.trim().replace(/[\s\-]/g, ''));
    
    let existingUsers = [];
    if (phoneNumbers.length > 0) {
      // Build all phone format variations
      const allPhoneFormats = [];
      for (const phone of phoneNumbers) {
        allPhoneFormats.push(phone);
        if (phone.startsWith('0')) {
          allPhoneFormats.push(phone.substring(1));
          allPhoneFormats.push(`+254${phone.substring(1)}`);
          allPhoneFormats.push(`254${phone.substring(1)}`);
        }
        if (phone.startsWith('+254')) {
          allPhoneFormats.push(phone.substring(1));
          allPhoneFormats.push(phone.substring(4));
          allPhoneFormats.push(`0${phone.substring(4)}`);
          allPhoneFormats.push(`254${phone.substring(4)}`);
        }
        if (phone.startsWith('254') && !phone.startsWith('+254')) {
          allPhoneFormats.push(`+${phone}`);
          allPhoneFormats.push(`0${phone.substring(3)}`);
          allPhoneFormats.push(`+254${phone.substring(3)}`);
        }
      }
      
      // Remove duplicates
      const uniquePhoneFormats = [...new Set(allPhoneFormats)];
      
      existingUsers = await prisma.user.findMany({
        where: {
          OR: uniquePhoneFormats.map(phone => ({
            phone: phone
          }))
        }
      });
    }
    
    // Build map for phone lookups
    const userMap = new Map();
    existingUsers.forEach(u => {
      if (u.phone) {
        const clean = u.phone.trim().replace(/[\s\-]/g, '');
        userMap.set(clean, u);
        if (clean.startsWith('0')) {
          userMap.set(clean.substring(1), u);
          userMap.set(`+254${clean.substring(1)}`, u);
          userMap.set(`254${clean.substring(1)}`, u);
        }
        if (clean.startsWith('+254')) {
          userMap.set(clean.substring(1), u);
          userMap.set(clean.substring(4), u);
          userMap.set(`0${clean.substring(4)}`, u);
          userMap.set(`254${clean.substring(4)}`, u);
        }
        if (clean.startsWith('254') && !clean.startsWith('+254')) {
          userMap.set(`+${clean}`, u);
          userMap.set(`0${clean.substring(3)}`, u);
          userMap.set(`+254${clean.substring(3)}`, u);
        }
        // Also store by full name for name matching
        if (u.fullName) {
          userMap.set(u.fullName.toLowerCase().trim(), u);
        }
      }
    });
    
    // Helper for name matching
    const normalizeName = (name) => {
      if (!name) return '';
      return name.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^a-z\s]/g, '');
    };
    
    const isNameMatch = (name1, name2) => {
      if (!name1 || !name2) return false;
      const n1 = normalizeName(name1);
      const n2 = normalizeName(name2);
      if (n1 === n2) return true;
      const parts1 = n1.split(' ').filter(w => w.length > 1);
      const parts2 = n2.split(' ').filter(w => w.length > 1);
      if (parts1.length === 1 && parts2.length === 1) {
        return parts1[0] === parts2[0];
      }
      let matches = 0;
      for (const p1 of parts1) {
        for (const p2 of parts2) {
          if (p1 === p2) {
            matches++;
            break;
          }
        }
      }
      const minParts = Math.min(parts1.length, parts2.length);
      return matches >= Math.min(2, minParts);
    };
    
    for (const userData of users) {
      let user = null;
      
      // Try to find by phone
      if (userData.phoneNumber) {
        const cleanPhone = userData.phoneNumber.trim().replace(/[\s\-]/g, '');
        user = userMap.get(cleanPhone);
        if (!user) user = userMap.get(cleanPhone.startsWith('0') ? cleanPhone.substring(1) : `0${cleanPhone}`);
        if (!user) user = userMap.get(cleanPhone.startsWith('+254') ? cleanPhone : `+254${cleanPhone.replace(/^0/, '')}`);
        if (!user) user = userMap.get(cleanPhone.startsWith('+254') ? cleanPhone.substring(1) : null);
        if (!user) user = userMap.get(cleanPhone.startsWith('+254') ? cleanPhone.substring(4) : null);
      }
      
      // Try name matching if phone failed
      if (!user && userData.fullName) {
        const allUsers = Array.from(userMap.values());
        for (const u of allUsers) {
          if (u.fullName && isNameMatch(userData.fullName, u.fullName)) {
            user = u;
            break;
          }
        }
      }
      
      if (user) {
        const existingEntry = await prisma.attendanceEntry.findFirst({
          where: { sheetId, userId: user.id }
        });
        
        if (existingEntry) {
          alreadyCheckedIn.push({
            fullName: user.fullName,
            phone: user.phone,
            existingEntry
          });
          continue;
        }
        
        const entry = await prisma.attendanceEntry.create({
          data: {
            sheetId,
            userId: user.id,
            fullName: user.fullName,
            phoneNumber: user.phone,
            role: user.role,
            specialRole: user.specialRole,
            membershipNumber: user.membership_number,
            jumuiaId: user.jumuiaId,
            jumuiaName: null,
            signMethod: "MANUAL",
            verifiedBy: req.user.userId,
            notes: `Auto-filled from existing user (${user.fullName})`
          }
        });
        entries.push(entry);
      } else {
        const entry = await prisma.attendanceEntry.create({
          data: {
            sheetId,
            userId: null,
            fullName: userData.fullName,
            phoneNumber: userData.phoneNumber || null,
            role: userData.role || "Guest",
            specialRole: userData.specialRole || null,
            membershipNumber: userData.membershipNumber || null,
            jumuiaId: userData.jumuiaId || null,
            jumuiaName: userData.jumuiaName || null,
            signMethod: "MANUAL",
            verifiedBy: req.user.userId,
            notes: userData.notes || "New user added"
          }
        });
        entries.push(entry);
      }
    }
    
    res.json({ 
      success: true, 
      count: entries.length,
      entries: entries,
      alreadyCheckedIn: alreadyCheckedIn.length > 0 ? alreadyCheckedIn : undefined
    });
    
    for (const entry of entries) {
      if (entry.userId) {
        createAndSendNotification({
          userId: entry.userId,
          type: "attendance_checkin",
          title: "✅ Check-in Successful!",
          message: `You have been checked in for "${sheet.title}"`,
          data: { sheetId: sheet.id, entryId: entry.id }
        }).catch(() => {});
      }
    }
    
    const io = req.app.get("io");
    if (io) {
      io.to(`sheet-${sheetId}`).emit("attendance_bulk_checkin", {
        sheetId: sheetId,
        count: entries.length,
        entries: entries
      });
    }

     // ✅ WHATSAPP AUTO-SEND TRIGGER FOR BULK ADD
    if (sheet.enableWhatsAppAutoSend && sheet.whatsAppSendOnCheckin && entries.length > 0) {
      sendAttendanceToWhatsApp(sheetId).catch(err => {
        console.error('⚠️ WhatsApp auto-send (bulk) failed:', err.message);
      });
    }
    
  } catch (err) {
    console.error("Bulk add error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get admin stats (all sheets)// Get admin stats (all sheets) - Allow admin and secretary
// Get admin stats (all sheets) - OPTIMIZED WITH SELECT & PAGINATION
const getAdminStats = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true, specialRole: true }
    });
    
    const isAdmin = user.role === 'admin' || user.specialRole === 'admin';
    const isSecretary = user.role === 'secretary' || user.specialRole === 'secretary';
    
    if (!isAdmin && !isSecretary) {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    // ✅ Get pagination params from query
    const { page = 1, limit = 20, status = 'all' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    
    // ✅ Build where clause
    let where = {};
    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'closed') {
      where.isActive = false;
    }
    
    // ✅ Fetch ALL data in parallel (faster than sequential)
    const [totalSheets, totalEntries, activeSheets, sheets] = await Promise.all([
      prisma.attendanceSheet.count({ where }),
      prisma.attendanceEntry.count(),
      prisma.attendanceSheet.count({ where: { isActive: true } }),
      
      // ✅ Only fetch needed fields (not everything)
      prisma.attendanceSheet.findMany({
        where,
        select: {
          id: true,
          title: true,
          eventDate: true,
          eventTime: true,
          location: true,
          isActive: true,
          createdAt: true,
          closedAt: true,
          _count: {
            select: { entries: true }
          },
          creator: {
            select: { fullName: true }
          }
        },
        orderBy: { eventDate: "desc" },
        skip,
        take
      })
    ]);

    res.json({
      success: true,
      stats: {
        totalSheets,
        totalEntries,
        activeSheets
      },
      sheets,
      pagination: {
        total: totalSheets,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalSheets / parseInt(limit))
      }
    });
  } catch (err) {
    console.error("Get admin stats error:", err);
    res.status(500).json({ error: err.message });
  }
};
// Send reminder to specific user (leader/admin only)
const sendReminder = async (req, res) => {
  try {
    const { sheetId, userId } = req.params;
    const { customMessage } = req.body;
    
    const success = await sendReminderToUser(userId, sheetId, customMessage);
    
    if (success) {
      res.json({ success: true, message: "Reminder sent successfully" });
    } else {
      res.status(404).json({ error: "Failed to send reminder" });
    }
  } catch (err) {
    console.error("Send reminder error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Send bulk reminders to all absent members - FIRE AND FORGET
const sendBulkReminders = async (req, res) => {
  try {
    const { sheetId } = req.params;
    
    const sheet = await prisma.attendanceSheet.findUnique({
      where: { id: sheetId },
      include: { entries: true }
    });
    
    if (!sheet) {
      return res.status(404).json({ error: "Sheet not found" });
    }
    
   let allMembers = [];
if (sheet.isExecutiveOnly) {
  const executives = await prisma.executive.findMany({
    where: { isActive: true },
    include: { user: true }
  });
  allMembers = executives.map(exec => exec.user);
} else if (sheet.jumuiaId) {
  allMembers = await prisma.user.findMany({
    where: { jumuiaId: sheet.jumuiaId }
  });
} else {
  allMembers = await prisma.user.findMany();
}
    
    const presentUserIds = new Set(sheet.entries.map(e => e.userId).filter(id => id));
    const absentMembers = allMembers.filter(m => !presentUserIds.has(m.id));
    
    // Send response immediately
    res.json({ success: true, message: `Sending reminders to ${absentMembers.length} members in background` });
    
    // Process reminders in background (fire and forget)
    (async () => {
      let sentCount = 0;
      const BATCH_SIZE = 10;
      
      for (let i = 0; i < absentMembers.length; i += BATCH_SIZE) {
        const batch = absentMembers.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(
          batch.map(member => sendReminderToUser(member.id, sheetId))
        );
        sentCount += batch.length;
        console.log(`📧 Sent ${sentCount}/${absentMembers.length} reminders`);
      }
      
      console.log(`✅ Bulk reminders completed: ${sentCount} sent`);
    })();
    
  } catch (err) {
    console.error("Bulk reminder error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
};


// ==================== AUTOMATIC NOTIFICATION SYSTEM ====================

// Send automatic reminders to users who haven't checked in (called by cron job)
const sendAutomaticAbsentReminders = async () => {
  try {
    console.log("🕐 Running automatic attendance reminder check...");
    
    // Get all active attendance sheets that started within the last 5 hours
    const fiveHoursAgo = new Date();
    fiveHoursAgo.setHours(fiveHoursAgo.getHours() - 5);
    
    const activeSheets = await prisma.attendanceSheet.findMany({
      where: {
        isActive: true,
        eventDate: {
          gte: fiveHoursAgo
        }
      },
      include: {
        entries: true,
        creator: {
          select: { id: true, fullName: true, email: true }
        }
      }
    });
    
    console.log(`📋 Found ${activeSheets.length} active sheets from last 5 hours`);
   for (const sheet of activeSheets) {
  let targetMembers = [];
  
  if (sheet.isExecutiveOnly) {
    const executives = await prisma.executive.findMany({
      where: { isActive: true },
      include: { user: true }
    });
    targetMembers = executives.map(exec => exec.user);
  } else if (sheet.jumuiaId) {
    targetMembers = await prisma.user.findMany({
      where: { jumuiaId: sheet.jumuiaId }
    });
  } else {
    targetMembers = await prisma.user.findMany();
  }
      
      const presentUserIds = new Set(sheet.entries.map(e => e.userId).filter(id => id));
      const absentMembers = targetMembers.filter(m => !presentUserIds.has(m.id));
      
      if (absentMembers.length === 0) continue;
      
      console.log(`📧 Sending reminders for "${sheet.title}" to ${absentMembers.length} absent members`);
      
      for (const member of absentMembers) {
        const tone = getMessageTone(member.role, member.specialRole);
        const hoursSinceEvent = Math.floor((new Date() - new Date(sheet.eventDate)) / (1000 * 60 * 60));
        
        // Different message based on how long ago the event was
        let reminderMessage = "";
        if (hoursSinceEvent < 1) {
          reminderMessage = `The meeting "${sheet.title}" is happening NOW at ${sheet.location || "ZUCA"}. Please check in!`;
        } else if (hoursSinceEvent < 5) {
          reminderMessage = `You missed "${sheet.title}" which happened ${hoursSinceEvent} hour(s) ago. Please contact the organizer for important updates.`;
        } else {
          reminderMessage = tone.missedMessage;
        }
        
        await createAndSendNotification({
          userId: member.id,
          type: "attendance_automatic_reminder",
          title: `📢 ${hoursSinceEvent < 1 ? "Meeting in Progress" : "You Missed the Meeting"}`,
          message: reminderMessage,
          data: { sheetId: sheet.id, title: sheet.title, hoursSinceEvent }
        });
        
        // Send email for important roles
        if (member.specialRole || member.role === "admin") {
        await sendPersonalizedEmail(
  { email: member.email, fullName: member.fullName },
  "attendance_automatic_reminder",
  `Notice of Missed Meeting: ${sheet.title}`,
  `Dear ${member.fullName},

${reminderMessage}

Meeting Information:
- Title: ${sheet.title}
- Date: ${new Date(sheet.eventDate).toLocaleString()}
- Location: ${sheet.location || "ZUCA"}

${tone.actionRequired ? "Please contact the meeting organizer for important updates." : "Please make note of future meeting schedules."}

Zetech University Catholic Action (ZUCA)`,
  { sheetTitle: sheet.title, eventDate: sheet.eventDate }
);
        }
      }
    }
    
    console.log("✅ Automatic attendance reminders completed");
  } catch (err) {
    console.error("Automatic reminder error:", err.message);
  }
};

// Endpoint to manually trigger automatic reminders (for testing)
router.post("/trigger-automatic-reminders", authenticate, requireAdmin, async (req, res) => {
  try {
    await sendAutomaticAbsentReminders();
    res.json({ success: true, message: "Automatic reminders triggered" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all sheets (both active and closed) for admin and secretary
router.get("/all-sheets", authenticate, requireLeaderOrAdmin, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true, specialRole: true }
    });
    
    const isAdmin = user.role === 'admin' || user.specialRole === 'admin';
    const isSecretary = user.role === 'secretary' || user.specialRole === 'secretary';
    
    if (!isAdmin && !isSecretary) {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    const sheets = await prisma.attendanceSheet.findMany({
      include: {
        _count: {
          select: { entries: true }
        }
      },
      orderBy: { eventDate: "desc" }
    });

    res.json({ success: true, sheets });
  } catch (err) {
    console.error("Get all sheets error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== ROUTES ====================

// User routes
router.get("/active", authenticate, getActiveSheets);
router.post("/self-checkin", authenticate, selfCheckin);
router.post("/wifi-checkin", authenticate, wifiCheckin);
router.get("/my-history", authenticate, getUserAttendanceHistory);

// Leader/Admin routes
router.post("/sheet", authenticate, requireLeaderOrAdmin, createAttendanceSheet);
router.get("/sheet/:sheetId", authenticate, async (req, res) => {
  try {
    const { sheetId } = req.params;
    const userId = req.user.userId;
    
    // Get user info to check permissions
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, specialRole: true, jumuiaId: true }
    });
    
    const isAdmin = currentUser.role === 'admin' || currentUser.specialRole === 'admin';
    const isSecretary = currentUser.role === 'secretary' || currentUser.specialRole === 'secretary';
    
    // Get sheet info to check access
    const sheetInfo = await prisma.attendanceSheet.findUnique({
      where: { id: sheetId },
      select: { isExecutiveOnly: true, jumuiaId: true }
    });
    
    if (!sheetInfo) {
      return res.status(404).json({ error: "Sheet not found" });
    }
    
    // Check access for executive sheets
    if (sheetInfo.isExecutiveOnly) {
      const isExecutive = await prisma.executive.findFirst({
        where: { userId: userId, isActive: true }
      });
      
      if (!isExecutive && !isAdmin && !isSecretary) {
        return res.status(403).json({ error: "Access denied - Executive meeting only" });
      }
    }
    // Check access for jumuia sheets
    else if (sheetInfo.jumuiaId) {
      if (!isAdmin && !isSecretary && currentUser.jumuiaId !== sheetInfo.jumuiaId) {
        return res.status(403).json({ error: "Access denied - This meeting is for specific Jumuia only" });
      }
    }
    
    // All checks passed, proceed to get sheet
    return getSheetById(req, res);
    
  } catch (err) {
    console.error("Get sheet error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/sheet/:sheetId/entry", authenticate, async (req, res, next) => {
  // Check if user is admin, secretary, or leader
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { role: true, specialRole: true }
  });
  
  const isAdmin = user.role === "admin" || user.specialRole === "admin";
  const isSecretary = user.role === "secretary" || user.specialRole === "secretary";
  const isLeader = user.specialRole === "jumuia_leader";
  
  if (isAdmin || isSecretary || isLeader) {
    return next();
  }
  
  return res.status(403).json({ error: "Not authorized" });
}, adminAddEntry);
router.put("/sheet/:sheetId/entry/:entryId", authenticate, requireLeaderOrAdmin, updateEntry);
router.delete("/sheet/:sheetId/entry/:entryId", authenticate, requireLeaderOrAdmin, deleteEntry);
router.put("/sheet/:sheetId/settings", authenticate, requireLeaderOrAdmin, updateSheetSettings);
router.post("/sheet/:sheetId/close", authenticate, requireLeaderOrAdmin, closeSheet);

// Reminder routes
router.post("/sheet/:sheetId/remind/:userId", authenticate, requireLeaderOrAdmin, sendReminder);
router.post("/sheet/:sheetId/remind-all", authenticate, requireLeaderOrAdmin, sendBulkReminders);

// Admin only routes
router.get("/admin/stats", authenticate, getAdminStats);

// ==================== ATTENDANCE LINK ROUTES ====================

// Generate shareable link for a sheet
router.post("/sheet/:sheetId/generate-link", authenticate, requireLeaderOrAdmin, async (req, res) => {
  try {
    const { sheetId } = req.params;
    const { expiresInDays = 7, maxUses = null } = req.body;
    
    const sheet = await prisma.attendanceSheet.findUnique({
      where: { id: sheetId }
    });
    
    if (!sheet) {
      return res.status(404).json({ error: "Sheet not found" });
    }
    
    if (!sheet.isActive) {
      return res.status(400).json({ error: "Sheet is closed. Reopen it first." });
    }
    
const token = crypto.randomBytes(4).toString('hex');
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiresInDays);
    
    const attendanceLink = await prisma.attendanceLink.create({
      data: {
        token: token,
        sheetId: sheetId,
        expiresAt: expiryDate,
        maxUses: maxUses ? parseInt(maxUses) : null,
        createdBy: req.user.userId
      }
    });
    
   const baseUrl = req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5173';
const shareableLink = `${baseUrl}/attendance/link/${token}`;
    
    res.json({
      success: true,
      link: shareableLink,
      token: token,
      expiresAt: expiryDate
    });
    
  } catch (err) {
    console.error("Generate link error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get link info (when user clicks the link)
router.get("/link/:token", async (req, res) => {
  try {
    const { token } = req.params;
    
    const attendanceLink = await prisma.attendanceLink.findUnique({
      where: { token: token },
      include: { sheet: true }
    });
    
    if (!attendanceLink) {
      return res.status(404).json({ error: "Invalid link" });
    }
    
    if (attendanceLink.expiresAt < new Date()) {
      return res.status(400).json({ error: "Link has expired" });
    }
    
    if (!attendanceLink.sheet.isActive) {
      return res.status(400).json({ error: "Meeting has been closed" });
    }
    
    res.json({
      success: true,
      sheetId: attendanceLink.sheetId,
      sheet: {
        id: attendanceLink.sheet.id,
        title: attendanceLink.sheet.title,
        eventDate: attendanceLink.sheet.eventDate,
        eventTime: attendanceLink.sheet.eventTime,
        location: attendanceLink.sheet.location
      }
    });
    
  } catch (err) {
    console.error("Get link error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get all links for a sheet
router.get("/sheet/:sheetId/links", authenticate, requireLeaderOrAdmin, async (req, res) => {
  try {
    const { sheetId } = req.params;
    
    const links = await prisma.attendanceLink.findMany({
      where: { sheetId: sheetId },
      orderBy: { createdAt: "desc" },
      include: {
        creator: {
          select: { id: true, fullName: true }
        }
      }
    });
    
    res.json({ success: true, links });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a link
router.delete("/link/:linkId", authenticate, requireLeaderOrAdmin, async (req, res) => {
  try {
    const { linkId } = req.params;
    
    await prisma.attendanceLink.delete({
      where: { id: linkId }
    });
    
    res.json({ success: true, message: "Link deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==================== GET ALL ENTRIES (ADMIN ONLY) ====================
// Add this after getAdminStats and before module.exports

// Get all entries across all sheets (for admin All Entries tab)
router.get("/all-entries", authenticate, requireLeaderOrAdmin, async (req, res) => {
  try {
    const { limit = 200, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const entries = await prisma.attendanceEntry.findMany({
      skip: skip,
      take: parseInt(limit),
      include: {
        sheet: {
          select: {
            id: true,
            title: true,
            eventDate: true,
            eventTime: true,
            location: true
          }
        },
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            role: true,
            specialRole: true,
            membership_number: true,
            homeJumuia: {
              select: { name: true }
            }
          }
        },
        verifier: {
          select: {
            id: true,
            fullName: true
          }
        }
      },
      orderBy: { signTime: "desc" }
    });
    
    const total = await prisma.attendanceEntry.count();
    
    res.json({
      success: true,
      entries,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error("Get all entries error:", err);
    res.status(500).json({ error: err.message });
  }
});


// Add this to your attendance routes file (before module.exports)

router.get("/member/all-meetings", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { semesterId } = req.query
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        role: true, 
        specialRole: true,
        jumuiaId: true,
        createdAt: true
      }
    });
    
    const isExecutive = await prisma.executive.findFirst({
      where: { userId: userId, isActive: true }
    });
    
    // Build the where clause
let sheetWhere = {
  eventDate: {
    gte: new Date(user.createdAt)
  }
};

// Add semester filter if provided
if (semesterId && semesterId !== 'all') {
  const dateFilter = await getSemesterDateFilter(prisma, semesterId);
  if (dateFilter) {
    sheetWhere.eventDate = {
      gte: dateFilter.gte,
      lte: dateFilter.lte
    };
  }
}

const allSheets = await prisma.attendanceSheet.findMany({
  where: sheetWhere,
  orderBy: { eventDate: "desc" },
  include: {
    entries: {
      where: { userId: userId },
      select: {
        id: true,
        signTime: true,
        signMethod: true,
        userId: true
      }
    },
    _count: {
      select: { entries: true }
    }
  }
});
    
    const visibleSheets = allSheets.filter(sheet => {
      if (sheet.isExecutiveOnly) {
        const isAdmin = user.role === 'admin' || user.specialRole === 'admin';
        const isSecretary = user.specialRole === 'secretary';
        return isAdmin || isSecretary || isExecutive;
      }
      
      if (sheet.jumuiaId) {
        return user.jumuiaId === sheet.jumuiaId || 
               user.role === 'admin' || 
               user.specialRole === 'secretary';
      }
      
      return true;
    });
    
    const visibleSheetIds = new Set(visibleSheets.map(s => s.id));
    const userEntries = await prisma.attendanceEntry.findMany({
      where: { 
        userId: userId,
        sheetId: { in: [...visibleSheetIds] }
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
      orderBy: { signTime: "desc" }
    });
    
    const totalMeetings = visibleSheets.length;
    const attendedMeetings = userEntries.length;
    const attendanceRate = totalMeetings > 0 ? (attendedMeetings / totalMeetings) * 100 : 0;
    
    const upcomingMeetings = visibleSheets.filter(sheet => 
      new Date(sheet.eventDate) > new Date() && sheet.isActive
    ).length;
    
    const attendedSheetIds = new Set(userEntries.map(e => e.sheetId));
    const missedMeetings = visibleSheets.filter(sheet => !attendedSheetIds.has(sheet.id));
    
    const formattedMeetings = visibleSheets.map(sheet => ({
      id: sheet.id,
      title: sheet.title,
      eventDate: sheet.eventDate ? new Date(sheet.eventDate).toISOString() : null,
      eventTime: sheet.eventTime || null,
      location: sheet.location || 'ZUCA',
      isActive: sheet.isActive,
      isExecutiveOnly: sheet.isExecutiveOnly || false,
      jumuiaId: sheet.jumuiaId,
      totalAttendees: sheet._count.entries,
      userAttended: sheet.entries.length > 0,
      userSignTime: sheet.entries[0]?.signTime ? new Date(sheet.entries[0].signTime).toISOString() : null,
      userSignMethod: sheet.entries[0]?.signMethod || null
    }));
    
    const formattedHistory = userEntries.map(entry => ({
      id: entry.id,
      sheetId: entry.sheetId,
      signTime: entry.signTime ? new Date(entry.signTime).toISOString() : null,
      signMethod: entry.signMethod,
      sheet: entry.sheet ? {
        id: entry.sheet.id,
        title: entry.sheet.title,
        eventDate: entry.sheet.eventDate ? new Date(entry.sheet.eventDate).toISOString() : null,
        eventTime: entry.sheet.eventTime,
        location: entry.sheet.location
      } : null
    }));
    
    res.json({
      success: true,
      allMeetings: formattedMeetings,
      userHistory: formattedHistory,
      stats: {
        totalMeetings,
        attendedMeetings,
        missedMeetings: missedMeetings.length,
        attendanceRate: attendanceRate.toFixed(1),
        upcomingMeetings,
        userJoinedDate: user.createdAt.toISOString()
      }
    });
    
  } catch (err) {
    console.error("Get member meetings error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== GET LIVE ATTENDANCE FOR MINUTES ====================
router.get("/:id/attendance-live", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const minutes = await prisma.meetingMinutes.findUnique({
      where: { id: id },
      select: { 
        attendanceSheetId: true,
        createdBy: true,
        type: true,
        jumuiaId: true
      }
    });
    
    if (!minutes) {
      return res.status(404).json({ error: "Minutes not found" });
    }
    
    // Check if user has access to this minutes
    const isAdminUser = await isAdmin(userId);
    const isExecutiveUser = await isExecutive(userId);
    const userJumuia = await prisma.user.findUnique({
      where: { id: userId },
      select: { jumuiaId: true }
    });
    
    let canAccess = false;
    if (isAdminUser) canAccess = true;
    else if (minutes.type === "EXECUTIVE" && isExecutiveUser) canAccess = true;
    else if (minutes.type === "JUMUIA" && minutes.jumuiaId === userJumuia?.jumuiaId) canAccess = true;
    
    if (!canAccess) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    // Get fresh attendance data
    const attendanceData = await getAttendanceData(minutes.attendanceSheetId);
    
    if (!attendanceData) {
      return res.status(404).json({ error: "Attendance sheet not found" });
    }
    
    // Get executive positions for present members
    const presentUserIds = attendanceData.presentMembers.map(m => m.userId).filter(id => id);
    let executiveMap = new Map();
    
    if (presentUserIds.length > 0) {
      const executives = await prisma.executive.findMany({
        where: { 
          userId: { in: presentUserIds },
          isActive: true 
        },
        select: {
          userId: true,
          position: {
            select: { title: true }
          }
        }
      });
      
      executives.forEach(exec => {
        executiveMap.set(exec.userId, exec.position?.title || null);
      });
    }
    
    // Enhance present members with executive positions
    const enhancedPresentMembers = attendanceData.presentMembers.map(member => ({
      ...member,
      executivePosition: executiveMap.get(member.userId) || null
    }));
    
    res.json({
      success: true,
      presentMembers: enhancedPresentMembers,
      presentGuests: attendanceData.presentGuests,
      absentMembers: attendanceData.absentMembers,
      totalMembers: attendanceData.totalMembers,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (err) {
    console.error("Live attendance error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== ADMIN: VIEW ALL MEMBERS ATTENDANCE ====================
router.get("/admin/all-members-attendance", authenticate, requireLeaderOrAdmin, async (req, res) => {
  try {
    console.log("📊 Admin attendance overview request received");
    
    const { 
      page = 1, 
      limit = 50, 
      search = '',
      role = 'all',
      jumuiaId = 'all',
      fromDate = '',
      toDate = '',
      sortBy = 'fullName',
      sortOrder = 'asc',
      semesterId = '' 
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    
    // Build user filter
    let userWhere = {};
    
    if (search) {
      userWhere.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { membership_number: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Filter by role
    if (role === 'executive') {
      const executiveUsers = await prisma.executive.findMany({
        where: { isActive: true },
        select: { userId: true }
      });
      const executiveIds = executiveUsers.map(e => e.userId);
      if (executiveIds.length > 0) {
        userWhere.id = { in: executiveIds };
      } else {
        return res.json({
          success: true,
          users: [],
          pagination: { total: 0, page: parseInt(page), limit: take, totalPages: 0 },
          filters: { jumuias: [] }
        });
      }
    } else if (role === 'member') {
      const executiveUsers = await prisma.executive.findMany({
        where: { isActive: true },
        select: { userId: true }
      });
      const executiveIds = executiveUsers.map(e => e.userId);
      if (executiveIds.length > 0) {
        userWhere.NOT = { id: { in: executiveIds } };
      }
      userWhere.role = 'member';
    } else if (role !== 'all') {
      userWhere.role = role;
    }
    
    if (jumuiaId && jumuiaId !== 'all') {
      userWhere.jumuiaId = jumuiaId;
    }
    
    console.log("📋 User filter:", JSON.stringify(userWhere, null, 2));
    
    // Determine valid sort field
    const validSortFields = ['fullName', 'email', 'role', 'membership_number', 'createdAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'fullName';
    
    // Get all users - simplified query
    const users = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        specialRole: true,
        membership_number: true,
        jumuiaId: true,
        createdAt: true,
        homeJumuia: {
          select: { 
            id: true,
            name: true 
          }
        }
      },
      orderBy: { [sortField]: sortOrder === 'desc' ? 'desc' : 'asc' },
      skip,
      take
    });
    
    console.log(`✅ Found ${users.length} users`);
    
    const totalUsers = await prisma.user.count({ where: userWhere });
    console.log(`📊 Total users: ${totalUsers}`);
    
    // Get executive positions separately
    const userIds = users.map(u => u.id);
    let executiveMap = new Map();
    
    if (userIds.length > 0) {
      try {
        const executives = await prisma.executive.findMany({
          where: { 
            userId: { in: userIds },
            isActive: true 
          },
          select: {
            userId: true,
            position: {
              select: { title: true }
            }
          }
        });
        
        executives.forEach(exec => {
          if (exec.position) {
            executiveMap.set(exec.userId, exec.position.title);
          }
        });
        console.log(`✅ Found ${executives.length} executives`);
      } catch (err) {
        console.log("⚠️ Executive query error:", err.message);
      }
    }
    
    // Get ALL attendance entries for ALL users in ONE query
  // Get ALL attendance entries for ALL users in ONE query
let allEntries = [];
try {
  const entryWhere = {
    userId: { in: userIds }
  };

  // Build date filter from semester OR fromDate/toDate
  let dateFilter = {};
  
  // Check if semester filter is applied
  if (semesterId && semesterId !== 'all') {
    const semesterDateFilter = await getSemesterDateFilter(prisma, semesterId);
    if (semesterDateFilter) {
      dateFilter = {
        gte: semesterDateFilter.gte,
        lte: semesterDateFilter.lte
      };
    }
  } else if (fromDate && toDate) {
    // Use manual date range if no semester filter
    dateFilter = {
      gte: new Date(fromDate),
      lte: new Date(toDate)
    };
  } else if (fromDate) {
    dateFilter = { gte: new Date(fromDate) };
  } else if (toDate) {
    dateFilter = { lte: new Date(toDate) };
  }
  
  // Apply date filter if it exists
  if (Object.keys(dateFilter).length > 0) {
    entryWhere.signTime = dateFilter;
  }
      
      allEntries = await prisma.attendanceEntry.findMany({
        where: entryWhere,
        select: {
          id: true,
          userId: true,
          signTime: true,
          signMethod: true,
          sheetId: true,
          sheet: {
            select: {
              id: true,
              title: true,
              eventDate: true,
              eventTime: true,
              location: true,
              isActive: true,
              isExecutiveOnly: true,
              jumuiaId: true
            }
          }
        },
        orderBy: { signTime: 'desc' }
      });
      console.log(`✅ Found ${allEntries.length} total attendance entries`);
    } catch (err) {
      console.log("⚠️ Attendance entries query error:", err.message);
    }
    
    // Group entries by userId
    const entriesByUser = new Map();
    allEntries.forEach(entry => {
      if (!entriesByUser.has(entry.userId)) {
        entriesByUser.set(entry.userId, []);
      }
      entriesByUser.get(entry.userId).push(entry);
    });
    
    // Get ALL sheets for eligibility calculation
    let allSheets = [];
    try {
      const sheetWhere = {};
      
      if (fromDate && toDate) {
        sheetWhere.eventDate = {
          gte: new Date(fromDate),
          lte: new Date(toDate)
        };
      } else if (fromDate) {
        sheetWhere.eventDate = { gte: new Date(fromDate) };
      } else if (toDate) {
        sheetWhere.eventDate = { lte: new Date(toDate) };
      }
      
      allSheets = await prisma.attendanceSheet.findMany({
        where: sheetWhere,
        select: {
          id: true,
          jumuiaId: true,
          isExecutiveOnly: true
        },
        orderBy: { eventDate: 'desc' }
      });
      console.log(`✅ Found ${allSheets.length} total sheets`);
    } catch (err) {
      console.log("⚠️ Sheets query error:", err.message);
    }
    
    // Group sheets by type
    const globalSheets = allSheets.filter(s => s.jumuiaId === null && !s.isExecutiveOnly);
    const executiveSheets = allSheets.filter(s => s.isExecutiveOnly);
    const jumuiaSheetsMap = new Map();
    allSheets.forEach(s => {
      if (s.jumuiaId && !s.isExecutiveOnly) {
        if (!jumuiaSheetsMap.has(s.jumuiaId)) {
          jumuiaSheetsMap.set(s.jumuiaId, []);
        }
        jumuiaSheetsMap.get(s.jumuiaId).push(s);
      }
    });
    
    // Build users with stats - COMPLETELY FIXED
    const usersWithStats = users.map(user => {
      const entries = entriesByUser.get(user.id) || [];
      const isExecutive = executiveMap.has(user.id);
      const userJumuiaId = user.jumuiaId;
      
      // Get all eligible meetings
      let eligibleSheets = [];
      
      // 1. Global meetings - everyone invited
      eligibleSheets = [...globalSheets];
      
      // 2. Jumuia meetings - only their jumuia
      if (userJumuiaId && jumuiaSheetsMap.has(userJumuiaId)) {
        eligibleSheets = [...eligibleSheets, ...jumuiaSheetsMap.get(userJumuiaId)];
      }
      
      // 3. Executive meetings - only executives
      if (isExecutive) {
        eligibleSheets = [...eligibleSheets, ...executiveSheets];
      }
      
      // Remove duplicates by sheet id
      const uniqueSheetsMap = new Map();
      eligibleSheets.forEach(sheet => {
        if (!uniqueSheetsMap.has(sheet.id)) {
          uniqueSheetsMap.set(sheet.id, sheet);
        }
      });
      let uniqueEligibleSheets = Array.from(uniqueSheetsMap.values());
      
      // ⭐ CRITICAL FIX: Add ANY meeting the user attended, even if not in eligible list
      const attendedSheetIds = new Set(entries.map(e => e.sheetId));
      
      // Check if any attended sheet is missing from eligible sheets
      entries.forEach(entry => {
        if (entry.sheet && !uniqueSheetsMap.has(entry.sheet.id)) {
          console.log(`⚠️ User ${user.fullName} attended a meeting not in eligible list: ${entry.sheet.title}`);
          // Add it to eligible sheets
          uniqueSheetsMap.set(entry.sheet.id, entry.sheet);
        }
      });
      
      // Rebuild unique eligible sheets after adding attended sheets
      uniqueEligibleSheets = Array.from(uniqueSheetsMap.values());
      
      const totalMeetings = uniqueEligibleSheets.length;
      const attendedMeetings = entries.length;
      
      // ⭐ FIX: Ensure total is at least attended
      const finalTotalMeetings = Math.max(totalMeetings, attendedMeetings);
      const finalMissedMeetings = Math.max(0, finalTotalMeetings - attendedMeetings);
      const finalAttendanceRate = finalTotalMeetings > 0 ? (attendedMeetings / finalTotalMeetings) * 100 : 0;
      
      return {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        specialRole: user.specialRole,
        membership_number: user.membership_number,
        jumuiaId: user.jumuiaId,
        createdAt: user.createdAt,
        homeJumuia: user.homeJumuia,
        executivePosition: executiveMap.get(user.id) || null,
        totalMeetings: finalTotalMeetings,
        attendedMeetings: attendedMeetings,
        missedMeetings: finalMissedMeetings,
        attendanceRate: Math.round(finalAttendanceRate),
        recentAttendances: entries.slice(0, 5).map(entry => ({
          id: entry.id,
          title: entry.sheet?.title || 'Unknown',
          date: entry.signTime,
          method: entry.signMethod
        })),
        attendanceHistory: entries.slice(0, 20).map(entry => ({
          id: entry.id,
          sheetTitle: entry.sheet?.title || 'Unknown',
          eventDate: entry.sheet?.eventDate,
          signTime: entry.signTime,
          signMethod: entry.signMethod
        }))
      };
    });
    
    // Get all Jumuia for filter dropdown
    let jumuias = [];
    try {
      jumuias = await prisma.jumuia.findMany({
        select: { 
          id: true, 
          name: true 
        },
        orderBy: { name: 'asc' }
      });
    } catch (err) {
      console.log("⚠️ Could not fetch jumuias:", err.message);
    }
    
    console.log(`✅ Sending ${usersWithStats.length} users to frontend`);
    
    res.json({
      success: true,
      users: usersWithStats,
      pagination: {
        total: totalUsers,
        page: parseInt(page),
        limit: take,
        totalPages: Math.ceil(totalUsers / take)
      },
      filters: {
        jumuias: jumuias || []
      }
    });
    
  } catch (err) {
    console.error("❌ Admin all members attendance error:", err);
    console.error("Stack:", err.stack);
    res.status(500).json({ 
      success: false,
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// ==================== ADMIN: GET MEMBER DETAILED HISTORY ====================
router.get("/admin/member/:userId/history", authenticate, requireLeaderOrAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`📊 Fetching member history for user: ${userId}`);
    
    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        specialRole: true,
        membership_number: true,
        jumuiaId: true,
        createdAt: true,
        homeJumuia: {
          select: { name: true }
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    console.log(`✅ Found user: ${user.fullName}`);
    
    // Get executive position separately
    let execPosition = null;
    let isExecutive = false;
    try {
      const executive = await prisma.executive.findFirst({
        where: { 
          userId: userId,
          isActive: true 
        },
        include: {
          position: {
            select: { title: true }
          }
        }
      });
      if (executive && executive.position) {
        execPosition = executive.position.title;
        isExecutive = true;
      }
    } catch (err) {
      console.log("⚠️ Could not fetch executive position:", err.message);
    }
    
    // Get all attendance entries
    const entries = await prisma.attendanceEntry.findMany({
      where: { userId },
      include: {
        sheet: {
          select: {
            id: true,
            title: true,
            eventDate: true,
            eventTime: true,
            location: true,
            isActive: true,
            isExecutiveOnly: true,
            jumuiaId: true
          }
        }
      },
      orderBy: { signTime: 'desc' }
    });
    
    console.log(`✅ Found ${entries.length} attendance entries`);
    
    const userJumuiaId = user.jumuiaId;
    
    // ⭐ FIX: Get ALL meetings where the user COULD have attended
    // Instead of filtering by jumuia/executive, get ALL meetings
    // that are either global OR match the user's jumuia OR executive meetings
    const allSheets = await prisma.attendanceSheet.findMany({
      where: {
        OR: [
          // Global meetings (not assigned to any jumuia, not executive only)
          { jumuiaId: null, isExecutiveOnly: false },
          // Meetings for this user's jumuia
{ jumuiaId: userJumuiaId, isExecutiveOnly: false },
          // Executive meetings (if user is executive)
          ...(isExecutive ? [{ isExecutiveOnly: true }] : [])
        ]
      },
      orderBy: { eventDate: 'desc' }
    });
    
    // ⭐ FIX: Remove duplicates
    const uniqueSheetMap = new Map();
    allSheets.forEach(sheet => {
      if (!uniqueSheetMap.has(sheet.id)) {
        uniqueSheetMap.set(sheet.id, sheet);
      }
    });
    const uniqueEligibleSheets = Array.from(uniqueSheetMap.values());
    
    console.log(`✅ Found ${uniqueEligibleSheets.length} eligible meetings`);
    console.log(`📋 Eligible meeting IDs:`, uniqueEligibleSheets.map(s => s.id).join(', '));
    
    // ⭐ FIX: Also include any meetings that the user has attended
    // (in case they attended a meeting they weren't technically eligible for)
    const attendedSheetIds = new Set(entries.map(e => e.sheetId));
    const allEligibleSheetIds = new Set(uniqueEligibleSheets.map(s => s.id));
    
    // Add any attended sheets that aren't already in the eligible list
    entries.forEach(entry => {
      if (entry.sheet && !allEligibleSheetIds.has(entry.sheet.id)) {
        console.log(`⚠️ User attended a meeting they weren't eligible for: ${entry.sheet.title} (${entry.sheet.id})`);
        uniqueEligibleSheets.push(entry.sheet);
        allEligibleSheetIds.add(entry.sheet.id);
      }
    });
    
    // Recalculate with all sheets
    const finalTotalSheets = uniqueEligibleSheets;
    const totalMeetings = finalTotalSheets.length;
    const attendedMeetings = entries.length;
    
    // ⭐ FIX: Calculate missed meetings from eligible sheets
    const missedSheets = finalTotalSheets.filter(sheet => !attendedSheetIds.has(sheet.id));
    
    // ⭐ FIX: Ensure total is at least attended (defensive)
    const finalTotalMeetings = Math.max(totalMeetings, attendedMeetings);
    const finalMissedMeetings = Math.max(0, finalTotalMeetings - attendedMeetings);
    const finalAttendanceRate = finalTotalMeetings > 0 ? (attendedMeetings / finalTotalMeetings) * 100 : 0;
    
    console.log(`📊 Final Stats - Total: ${finalTotalMeetings}, Attended: ${attendedMeetings}, Missed: ${finalMissedMeetings}, Rate: ${finalAttendanceRate}%`);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        specialRole: user.specialRole,
        membershipNumber: user.membership_number,
        jumuiaName: user.homeJumuia?.name,
        executivePosition: execPosition
      },
      stats: {
        totalMeetings: finalTotalMeetings,
        attendedMeetings: attendedMeetings,
        missedMeetings: finalMissedMeetings,
        attendanceRate: Math.round(finalAttendanceRate)
      },
      attendanceHistory: entries.map(entry => ({
        id: entry.id,
        sheetTitle: entry.sheet.title,
        sheetId: entry.sheet.id,
        eventDate: entry.sheet.eventDate,
        eventTime: entry.sheet.eventTime,
        location: entry.sheet.location,
        signTime: entry.signTime,
        signMethod: entry.signMethod,
        isActive: entry.sheet.isActive
      })),
      missedMeetings: missedSheets.map(sheet => ({
        id: sheet.id,
        title: sheet.title,
        eventDate: sheet.eventDate,
        eventTime: sheet.eventTime,
        location: sheet.location
      }))
    });
    
  } catch (err) {
    console.error("❌ Get member history error:", err);
    console.error("Stack:", err.stack);
    res.status(500).json({ 
      success: false,
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// ==================== ADMIN: EXPORT ATTENDANCE DATA ====================
router.get("/admin/export-attendance", authenticate, requireLeaderOrAdmin, async (req, res) => {
  try {
    const { 
      format = 'csv',
      search = '',
      role = 'all',
      jumuiaId = 'all',
      fromDate = '',
      toDate = ''
    } = req.query;
    
    // Build filters (same as above)
    let userWhere = {};
    
    if (search) {
      userWhere.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { membership_number: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (role === 'executive') {
      const executiveUsers = await prisma.executive.findMany({
        where: { isActive: true },
        select: { userId: true }
      });
      const executiveIds = executiveUsers.map(e => e.userId);
      if (executiveIds.length > 0) {
        userWhere.id = { in: executiveIds };
      } else {
        return res.json({ success: true, data: [], total: 0 });
      }
    } else if (role !== 'all') {
      userWhere.role = role;
    }
    
    if (jumuiaId && jumuiaId !== 'all') {
      userWhere.jumuiaId = jumuiaId;
    }
    
    // Date filter
    let dateFilter = {};
    if (fromDate && toDate) {
      dateFilter = {
        signTime: {
          gte: new Date(fromDate),
          lte: new Date(toDate)
        }
      };
    } else if (fromDate) {
      dateFilter = {
        signTime: {
          gte: new Date(fromDate)
        }
      };
    } else if (toDate) {
      dateFilter = {
        signTime: {
          lte: new Date(toDate)
        }
      };
    }
    
    const users = await prisma.user.findMany({
      where: userWhere,
      include: {
        homeJumuia: { select: { name: true } },
        attendanceEntries: {
          where: dateFilter,
          include: {
            sheet: {
              select: {
                title: true,
                eventDate: true,
                eventTime: true,
                location: true
              }
            }
          },
          orderBy: { signTime: 'desc' }
        }
      },
      orderBy: { fullName: 'asc' }
    });
    
    // Get executive positions
    const userIds = users.map(u => u.id);
    let executiveMap = new Map();
    
    if (userIds.length > 0) {
      try {
        const executives = await prisma.executive.findMany({
          where: { 
            userId: { in: userIds },
            isActive: true 
          },
          select: {
            userId: true,
            position: {
              select: { title: true }
            }
          }
        });
        
        executives.forEach(exec => {
          if (exec.position) {
            executiveMap.set(exec.userId, exec.position.title);
          }
        });
      } catch (err) {
        console.log("⚠️ Executive query error:", err.message);
      }
    }
    
    // Format for export
    const exportData = users.map(user => {
      const entries = user.attendanceEntries || [];
      const execPosition = executiveMap.get(user.id) || null;
      
      return {
        'Full Name': user.fullName,
        'Membership #': user.membership_number || 'N/A',
        'Email': user.email || 'N/A',
        'Phone': user.phone || 'N/A',
        'Role': user.role || 'N/A',
        'Special Role': user.specialRole || 'N/A',
        'Executive Position': execPosition || 'N/A',
        'Jumuia': user.homeJumuia?.name || 'N/A',
        'Total Attendances': entries.length,
        'Last Attendance': entries.length > 0 ? new Date(entries[0].signTime).toLocaleDateString() : 'Never'
      };
    });
    
    if (format === 'csv') {
      try {
        const { Parser } = require('json2csv');
        const parser = new Parser();
        const csv = parser.parse(exportData);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
        return res.send(csv);
      } catch (err) {
        console.error("CSV parsing error:", err);
        return res.status(500).json({ error: "Failed to generate CSV" });
      }
    }
    
    res.json({
      success: true,
      data: exportData,
      total: exportData.length,
      exportedAt: new Date().toISOString()
    });
    
  } catch (err) {
    console.error("Export attendance error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;