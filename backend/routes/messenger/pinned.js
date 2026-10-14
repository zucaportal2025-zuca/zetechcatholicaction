const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateDM } = require('./helpers');

// POST - Pin a message
router.post('/messages/:messageId', authenticateDM, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    // Check if message exists and user has access
    const message = await prisma.directMessage.findFirst({
      where: { id: messageId, isDeleted: false },
      include: {
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

    // Check if already pinned
    const existingPin = await prisma.dMPinned.findUnique({
      where: {
        messageId_userId: {
          messageId,
          userId
        }
      }
    });

    if (existingPin) {
      return res.status(400).json({ error: "Message already pinned" });
    }

    // Create pin
    const pin = await prisma.dMPinned.create({
      data: {
        messageId,
        conversationId: message.conversationId,
        userId
      },
      include: {
        message: {
          include: {
            sender: { select: { id: true, fullName: true, profileImage: true } },
            files: true
          }
        }
      }
    });

    // Notify via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(message.conversation.participant1Id).emit('message_pinned', {
        messageId,
        userId,
        pinnedAt: pin.pinnedAt
      });
      io.to(message.conversation.participant2Id).emit('message_pinned', {
        messageId,
        userId,
        pinnedAt: pin.pinnedAt
      });
    }

    res.status(201).json({
      success: true,
      message: "Message pinned successfully",
      pin: {
        id: pin.id,
        messageId: pin.messageId,
        pinnedAt: pin.pinnedAt,
        message: pin.message
      }
    });

  } catch (err) {
    console.error("Pin message error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE - Unpin a message
router.delete('/messages/:messageId', authenticateDM, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const pin = await prisma.dMPinned.findUnique({
      where: {
        messageId_userId: {
          messageId,
          userId
        }
      },
      include: {
        message: {
          include: { conversation: true }
        }
      }
    });

    if (!pin) {
      return res.status(404).json({ error: "Pin not found" });
    }

    await prisma.dMPinned.delete({
      where: { id: pin.id }
    });

    // Notify via Socket.io
    const io = req.app.get('io');
    if (io && pin.message?.conversation) {
      io.to(pin.message.conversation.participant1Id).emit('message_unpinned', {
        messageId,
        userId
      });
      io.to(pin.message.conversation.participant2Id).emit('message_unpinned', {
        messageId,
        userId
      });
    }

    res.json({
      success: true,
      message: "Message unpinned successfully"
    });

  } catch (err) {
    console.error("Unpin message error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Get all pinned messages in a conversation
router.get('/conversations/:conversationId', authenticateDM, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    // Verify user is in conversation
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

    const pins = await prisma.dMPinned.findMany({
      where: {
        conversationId,
        userId
      },
      include: {
        message: {
          include: {
            sender: { select: { id: true, fullName: true, profileImage: true, role: true } },
            files: true,
            reactions: {
              take: 5,
              include: { user: { select: { id: true, fullName: true } } }
            }
          }
        }
      },
      orderBy: { pinnedAt: 'desc' }
    });

    const formatted = pins.map(pin => ({
      id: pin.id,
      pinnedAt: pin.pinnedAt,
      message: {
        id: pin.message.id,
        content: pin.message.content,
        createdAt: pin.message.createdAt,
        sender: pin.message.sender,
        files: pin.message.files,
        reactions: pin.message.reactions
      }
    }));

    res.json({
      success: true,
      count: formatted.length,
      pinnedMessages: formatted
    });

  } catch (err) {
    console.error("Get pinned messages error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Check if a specific message is pinned
router.get('/messages/:messageId/check', authenticateDM, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const pin = await prisma.dMPinned.findUnique({
      where: {
        messageId_userId: {
          messageId,
          userId
        }
      }
    });

    res.json({
      success: true,
      isPinned: !!pin,
      pinnedAt: pin?.pinnedAt || null
    });

  } catch (err) {
    console.error("Check pin status error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;