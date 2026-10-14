const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateDM } = require('./helpers');

// Helper function to send email notification (reuse from your existing mailer)
const { sendPersonalizedEmail } = require('../../services/mailer');

// Helper to create and send notification (both in-app and email)
async function createMessageNotification(userId, senderName, messageContent, messageId, conversationId, userEmail) {
  try {
    // Create in-app notification
    const notification = await prisma.notification.create({
      data: {
        userId: userId,
        type: "direct_message",
        title: `💬 New message from ${senderName}`,
        message: messageContent?.substring(0, 100) || "📎 New message with attachment",
        data: { messageId, conversationId, type: "direct_message" },
        read: false,
        createdAt: new Date()
      }
    });

    // Send email notification if user has email enabled
    if (userEmail) {
      // Check user's DM settings
      const settings = await prisma.dMSettings.findUnique({
        where: { userId }
      });

      // Send email if email notifications are enabled (default true)
      if (!settings || settings.emailNotifications !== false) {
        await sendPersonalizedEmail(
          { email: userEmail, fullName: senderName },
          'direct_message',
          `💬 New message from ${senderName}`,
          `${senderName} sent you a message:\n\n"${messageContent?.substring(0, 200) || "Check your messages for the attachment"}"\n\nReply in the ZUCA app.`,
          { messageId, conversationId, sender: senderName }
        ).catch(err => console.error("Email send failed:", err.message));
      }
    }

    return notification;
  } catch (err) {
    console.error("Create message notification error:", err);
    return null;
  }
}

// GET - Get all DM notifications for current user
router.get('/', authenticateDM, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 50, unreadOnly = false } = req.query;

    const where = {
      userId,
      type: "direct_message"
    };

    if (unreadOnly === 'true') {
      where.read = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    const formatted = notifications.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      data: n.data,
      read: n.read,
      createdAt: n.createdAt
    }));

    res.json({
      success: true,
      count: formatted.length,
      unreadCount: formatted.filter(n => !n.read).length,
      notifications: formatted
    });

  } catch (err) {
    console.error("Get notifications error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Get unread count for DM notifications
router.get('/unread/count', authenticateDM, async (req, res) => {
  try {
    const userId = req.user.userId;

    const count = await prisma.notification.count({
      where: {
        userId,
        type: "direct_message",
        read: false
      }
    });

    res.json({ unreadCount: count });

  } catch (err) {
    console.error("Get unread count error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT - Mark a notification as read
router.put('/:notificationId/read', authenticateDM, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.userId;

    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
        type: "direct_message"
      }
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true, readAt: new Date() }
    });

    res.json({ success: true });

  } catch (err) {
    console.error("Mark notification read error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT - Mark all DM notifications as read
router.put('/read-all', authenticateDM, async (req, res) => {
  try {
    const userId = req.user.userId;

    await prisma.notification.updateMany({
      where: {
        userId,
        type: "direct_message",
        read: false
      },
      data: { read: true, readAt: new Date() }
    });

    res.json({ success: true, message: "All notifications marked as read" });

  } catch (err) {
    console.error("Mark all read error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE - Clear all DM notifications
router.delete('/clear-all', authenticateDM, async (req, res) => {
  try {
    const userId = req.user.userId;

    await prisma.notification.deleteMany({
      where: {
        userId,
        type: "direct_message"
      }
    });

    res.json({ success: true, message: "All notifications cleared" });

  } catch (err) {
    console.error("Clear notifications error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Test notification (for debugging)
router.post('/test', authenticateDM, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    const notification = await createMessageNotification(
      userId,
      "Test User",
      "This is a test notification to verify DM notifications are working!",
      "test-id",
      "test-conv-id",
      user?.email
    );

    // Emit via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(userId).emit('new_notification', notification);
    }

    res.json({ success: true, message: "Test notification sent" });

  } catch (err) {
    console.error("Test notification error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Export the helper for use in messages.js
module.exports = {
  router,
  createMessageNotification
};