const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateDM, getOrCreateConversation, markConversationRead } = require('./helpers');

// GET - All conversations for current user
router.get('/', authenticateDM, async (req, res) => {
  try {
    const userId = req.user.userId;

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { participant1Id: userId, isDeleted1: false },
          { participant2Id: userId, isDeleted2: false }
        ]
      },
      include: {
        participant1: { 
          select: { 
            id: true, 
            fullName: true, 
            profileImage: true, 
            role: true, 
            specialRole: true,
            lastActive: true,
            executiveAssignments: {
              where: { isActive: true },
              include: { position: { select: { title: true, category: true } } }
            },
            homeJumuia: { select: { name: true } }
          } 
        },
        participant2: { 
          select: { 
            id: true, 
            fullName: true, 
            profileImage: true, 
            role: true, 
            specialRole: true,
            lastActive: true,
            executiveAssignments: {
              where: { isActive: true },
              include: { position: { select: { title: true, category: true } } }
            },
            homeJumuia: { select: { name: true } }
          } 
        }
      }
    });

    // ✅ FORMAT conversations - get last message from actual messages
    const formatted = await Promise.all(conversations.map(async (conv) => {
      const isParticipant1 = conv.participant1Id === userId;
      let otherParticipant = isParticipant1 ? conv.participant2 : conv.participant1;
      
      // ✅ Get the actual last non-deleted message
      const lastMessageData = await prisma.directMessage.findFirst({
        where: {
          conversationId: conv.id,
          isDeleted: false
        },
        orderBy: { createdAt: 'desc' },
        select: {
          content: true,
          createdAt: true,
          senderId: true
        }
      });
      
      const formattedParticipant = {
        ...otherParticipant,
        executivePosition: otherParticipant.executiveAssignments?.[0]?.position?.title || null,
        executiveCategory: otherParticipant.executiveAssignments?.[0]?.position?.category || null
      };
      
      const unreadCount = isParticipant1 ? conv.unreadCount1 : conv.unreadCount2;

      return {
        id: conv.id,
        participant: formattedParticipant,
        lastMessage: lastMessageData?.content || null,
        lastMessageAt: lastMessageData?.createdAt || null,
        lastMessageBy: lastMessageData?.senderId || null,
        unreadCount,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt
      };
    }));

    // ✅ Sort by actual lastMessageAt
    formatted.sort((a, b) => {
      const dateA = a.lastMessageAt ? new Date(a.lastMessageAt) : new Date(0);
      const dateB = b.lastMessageAt ? new Date(b.lastMessageAt) : new Date(0);
      return dateB - dateA;
    });

    res.json({
      success: true,
      conversations: formatted
    });

  } catch (err) {
    console.error("Get conversations error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Start new conversation
router.post('/:userId', authenticateDM, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.userId;

    if (userId === currentUserId) {
      return res.status(400).json({ error: "Cannot start conversation with yourself" });
    }

    const conversation = await getOrCreateConversation(currentUserId, userId);

    const otherParticipant = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        fullName: true, 
        profileImage: true, 
        role: true, 
        specialRole: true,
        executiveAssignments: {
          where: { isActive: true },
          include: { position: { select: { title: true } } }
        }
      }
    });

    const formattedParticipant = {
      ...otherParticipant,
      executivePosition: otherParticipant?.executiveAssignments?.[0]?.position?.title || null
    };

    res.json({
      success: true,
      conversation: {
        id: conversation.id,
        participant: formattedParticipant,
        createdAt: conversation.createdAt
      }
    });

  } catch (err) {
    console.error("Start conversation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT - Archive conversation
router.put('/:conversationId/archive', authenticateDM, async (req, res) => {
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
      return res.status(404).json({ error: "Conversation not found" });
    }

    const isParticipant1 = conversation.participant1Id === userId;
    const updateData = isParticipant1 ? { isArchived1: true } : { isArchived2: true };

    await prisma.conversation.update({
      where: { id: conversationId },
      data: updateData
    });

    res.json({ success: true, message: "Conversation archived" });

  } catch (err) {
    console.error("Archive conversation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT - Unarchive conversation
router.put('/:conversationId/unarchive', authenticateDM, async (req, res) => {
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
      return res.status(404).json({ error: "Conversation not found" });
    }

    const isParticipant1 = conversation.participant1Id === userId;
    const updateData = isParticipant1 ? { isArchived1: false } : { isArchived2: false };

    await prisma.conversation.update({
      where: { id: conversationId },
      data: updateData
    });

    res.json({ success: true, message: "Conversation unarchived" });

  } catch (err) {
    console.error("Unarchive conversation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE - Delete conversation (soft delete for current user ONLY)
router.delete('/:conversationId', authenticateDM, async (req, res) => {
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
      return res.status(404).json({ error: "Conversation not found" });
    }

    const isParticipant1 = conversation.participant1Id === userId;
    const updateData = isParticipant1 ? { isDeleted1: true } : { isDeleted2: true };
    
    await prisma.conversation.update({
      where: { id: conversationId },
      data: updateData
    });
    
    await prisma.directMessage.updateMany({
      where: {
        conversationId: conversationId,
        senderId: userId
      },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
        content: "[You deleted this message]"
      }
    });
    
    await prisma.directMessage.updateMany({
      where: {
        conversationId: conversationId,
        senderId: { not: userId }
      },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
        content: "[Message deleted]"
      }
    });

    res.json({ success: true, message: "Conversation deleted for you" });
  } catch (err) {
    console.error("Delete conversation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Clear all messages in conversation (keep conversation)
router.post('/:conversationId/clear', authenticateDM, async (req, res) => {
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
      return res.status(404).json({ error: "Conversation not found" });
    }

    await prisma.directMessage.updateMany({
      where: {
        conversationId,
        isDeleted: false
      },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
        content: "[Message cleared]"
      }
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: null,
        lastMessageAt: null,
        lastMessageBy: null,
        updatedAt: new Date()
      }
    });

    res.json({ success: true, message: "Chat cleared successfully" });

  } catch (err) {
    console.error("Clear conversation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT - Mark conversation as read
router.put('/:conversationId/read', authenticateDM, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    await markConversationRead(conversationId, userId);

    res.json({ success: true, message: "Conversation marked as read" });

  } catch (err) {
    console.error("Mark conversation read error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;