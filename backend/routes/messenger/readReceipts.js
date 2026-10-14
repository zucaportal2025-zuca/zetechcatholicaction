const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateDM } = require('./helpers');

// PUT - Mark single message as read
router.put('/messages/:messageId', authenticateDM, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const message = await prisma.directMessage.findUnique({
      where: { id: messageId },
      include: { conversation: true }
    });

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Don't mark own messages as read
    if (message.senderId === userId) {
      return res.json({ success: true, message: "Cannot mark own message as read" });
    }

    // Verify user is in conversation
    const isParticipant = message.conversation.participant1Id === userId || 
                          message.conversation.participant2Id === userId;
    if (!isParticipant) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Create or update read receipt
    await prisma.directMessageReadReceipt.upsert({
      where: {
        messageId_userId: { messageId, userId }
      },
      update: { readAt: new Date() },
      create: {
        messageId,
        userId,
        readAt: new Date()
      }
    });

    // Update the message isRead flag
    await prisma.directMessage.update({
      where: { id: messageId },
      data: { isRead: true, readAt: new Date() }
    });

    // Update unread count in conversation
    const conversation = message.conversation;
    const isParticipant1 = conversation.participant1Id === userId;
    const unreadField = isParticipant1 ? 'unreadCount1' : 'unreadCount2';
    
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { [unreadField]: { decrement: 1 } }
    });

    // Notify sender via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(message.senderId).emit('message_read', {
        messageId,
        userId,
        readAt: new Date()
      });
    }

    res.json({ success: true });

  } catch (err) {
    console.error("Mark message read error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Mark all messages in conversation as read
router.post('/conversations/:conversationId', authenticateDM, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          { participant1Id: userId },
          { participant2Id: userId }
        ]
      }
    });

    if (!conversation) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get all unread messages from the other participant
    const unreadMessages = await prisma.directMessage.findMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isDeleted: false,
        isRead: false
      },
      select: { id: true }
    });

    if (unreadMessages.length > 0) {
      // Create read receipts in batch
      await prisma.directMessageReadReceipt.createMany({
        data: unreadMessages.map(msg => ({
          messageId: msg.id,
          userId,
          readAt: new Date()
        })),
        skipDuplicates: true
      });

      // Update isRead flag for these messages
      await prisma.directMessage.updateMany({
        where: {
          id: { in: unreadMessages.map(m => m.id) }
        },
        data: { isRead: true, readAt: new Date() }
      });
    }

    // Reset unread count for this user in the conversation
    const isParticipant1 = conversation.participant1Id === userId;
    await prisma.conversation.update({
      where: { id: conversationId },
      data: isParticipant1 ? { unreadCount1: 0 } : { unreadCount2: 0 }
    });

    res.json({ 
      success: true, 
      markedRead: unreadMessages.length 
    });

  } catch (err) {
    console.error("Mark conversation read error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Check if message is read by recipient
router.get('/messages/:messageId/status', authenticateDM, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const message = await prisma.directMessage.findUnique({
      where: { id: messageId },
      include: {
        readReceipts: {
          include: { user: { select: { id: true, fullName: true } } }
        },
        conversation: true
      }
    });

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Only sender can check read status
    if (message.senderId !== userId) {
      return res.status(403).json({ error: "Only sender can check read status" });
    }

    // Find the recipient (the other person in conversation)
    const recipientId = message.conversation.participant1Id === userId 
      ? message.conversation.participant2Id 
      : message.conversation.participant1Id;
    
    const recipientReceipt = message.readReceipts.find(r => r.userId === recipientId);

    res.json({
      isRead: message.isRead,
      readAt: message.readAt,
      readBy: recipientReceipt ? {
        userId: recipientReceipt.user.id,
        userName: recipientReceipt.user.fullName,
        readAt: recipientReceipt.readAt
      } : null
    });

  } catch (err) {
    console.error("Check read status error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Get all read receipts for a message
router.get('/messages/:messageId/all', authenticateDM, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const message = await prisma.directMessage.findUnique({
      where: { id: messageId },
      include: {
        readReceipts: {
          include: { user: { select: { id: true, fullName: true, profileImage: true } } }
        },
        conversation: true
      }
    });

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Verify user is in conversation
    const isParticipant = message.conversation.participant1Id === userId || 
                          message.conversation.participant2Id === userId;
    if (!isParticipant) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({
      messageId,
      isRead: message.isRead,
      readAt: message.readAt,
      receipts: message.readReceipts.map(r => ({
        userId: r.user.id,
        userName: r.user.fullName,
        userAvatar: r.user.profileImage,
        readAt: r.readAt
      }))
    });

  } catch (err) {
    console.error("Get read receipts error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;