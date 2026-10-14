const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateDM } = require('./helpers');

// Valid reactions
const VALID_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🎉', '🔥', '👏', '💯'];

// POST - Add or remove reaction (toggle)
router.post('/:messageId', authenticateDM, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reaction } = req.body;
    const userId = req.user.userId;

    // Validate reaction
    if (!reaction || !VALID_REACTIONS.includes(reaction)) {
      return res.status(400).json({ error: `Invalid reaction. Use: ${VALID_REACTIONS.join(', ')}` });
    }

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

    // Verify user is in the conversation
    const isParticipant = message.conversation.participant1Id === userId || 
                          message.conversation.participant2Id === userId;
    
    if (!isParticipant) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if reaction already exists
    const existingReaction = await prisma.directMessageReaction.findUnique({
      where: {
        messageId_userId_reaction: {
          messageId,
          userId,
          reaction
        }
      }
    });

    let result;
    let action;

    if (existingReaction) {
      // Remove reaction
      await prisma.directMessageReaction.delete({
        where: { id: existingReaction.id }
      });
      action = 'removed';
      result = { reaction, action };
    } else {
      // Add reaction
      const newReaction = await prisma.directMessageReaction.create({
        data: {
          messageId,
          userId,
          reaction
        },
        include: {
          user: {
            select: { id: true, fullName: true, profileImage: true }
          }
        }
      });
      action = 'added';
      result = {
        id: newReaction.id,
        reaction: newReaction.reaction,
        user: newReaction.user,
        createdAt: newReaction.createdAt,
        action
      };
    }

    // Get updated reaction count for this message
    const reactionCounts = await prisma.directMessageReaction.groupBy({
      by: ['reaction'],
      where: { messageId },
      _count: true
    });

    const counts = {};
    reactionCounts.forEach(r => {
      counts[r.reaction] = r._count;
    });

    // Notify via Socket.io
    const io = req.app.get('io');
    if (io) {
      const conversation = message.conversation;
      io.to(conversation.participant1Id).emit('reaction_updated', {
        messageId,
        reaction,
        action,
        counts,
        userId
      });
      io.to(conversation.participant2Id).emit('reaction_updated', {
        messageId,
        reaction,
        action,
        counts,
        userId
      });
    }

    res.json({
      success: true,
      action,
      reaction,
      counts
    });

  } catch (err) {
    console.error("Reaction error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Get all reactions for a message
router.get('/:messageId', authenticateDM, async (req, res) => {
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

    // Verify user is in the conversation
    const isParticipant = message.conversation.participant1Id === userId || 
                          message.conversation.participant2Id === userId;
    
    if (!isParticipant) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get all reactions with user info
    const reactions = await prisma.directMessageReaction.findMany({
      where: { messageId },
      include: {
        user: {
          select: { id: true, fullName: true, profileImage: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Group by reaction type
    const grouped = {};
    reactions.forEach(r => {
      if (!grouped[r.reaction]) {
        grouped[r.reaction] = [];
      }
      grouped[r.reaction].push({
        userId: r.user.id,
        userName: r.user.fullName,
        userAvatar: r.user.profileImage,
        createdAt: r.createdAt
      });
    });

    // Get current user's reactions
    const myReactions = reactions
      .filter(r => r.userId === userId)
      .map(r => r.reaction);

    res.json({
      success: true,
      total: reactions.length,
      grouped,
      myReactions,
      all: reactions
    });

  } catch (err) {
    console.error("Get reactions error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE - Remove specific reaction
router.delete('/:messageId/:reaction', authenticateDM, async (req, res) => {
  try {
    const { messageId, reaction } = req.params;
    const userId = req.user.userId;

    // Validate reaction
    if (!VALID_REACTIONS.includes(reaction)) {
      return res.status(400).json({ error: "Invalid reaction" });
    }

    // Check if reaction exists
    const existingReaction = await prisma.directMessageReaction.findUnique({
      where: {
        messageId_userId_reaction: {
          messageId,
          userId,
          reaction
        }
      },
      include: {
        message: {
          include: {
            conversation: true
          }
        }
      }
    });

    if (!existingReaction) {
      return res.status(404).json({ error: "Reaction not found" });
    }

    // Delete reaction
    await prisma.directMessageReaction.delete({
      where: { id: existingReaction.id }
    });

    // Get updated counts
    const reactionCounts = await prisma.directMessageReaction.groupBy({
      by: ['reaction'],
      where: { messageId },
      _count: true
    });

    const counts = {};
    reactionCounts.forEach(r => {
      counts[r.reaction] = r._count;
    });

    // Notify via Socket.io
    const io = req.app.get('io');
    if (io) {
      const conversation = existingReaction.message.conversation;
      io.to(conversation.participant1Id).emit('reaction_updated', {
        messageId,
        reaction,
        action: 'removed',
        counts,
        userId
      });
      io.to(conversation.participant2Id).emit('reaction_updated', {
        messageId,
        reaction,
        action: 'removed',
        counts,
        userId
      });
    }

    res.json({
      success: true,
      action: 'removed',
      reaction,
      counts
    });

  } catch (err) {
    console.error("Delete reaction error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Get reaction summary for multiple messages (batch)
router.post('/batch', authenticateDM, async (req, res) => {
  try {
    const { messageIds } = req.body;
    const userId = req.user.userId;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: "messageIds array required" });
    }

    // Get all reactions for these messages
    const reactions = await prisma.directMessageReaction.findMany({
      where: {
        messageId: { in: messageIds }
      },
      include: {
        user: {
          select: { id: true, fullName: true }
        }
      }
    });

    // Group by messageId
    const summary = {};
    messageIds.forEach(id => {
      summary[id] = {
        counts: {},
        myReactions: [],
        total: 0
      };
    });

    reactions.forEach(r => {
      if (!summary[r.messageId]) {
        summary[r.messageId] = { counts: {}, myReactions: [], total: 0 };
      }
      
      // Count reactions
      if (!summary[r.messageId].counts[r.reaction]) {
        summary[r.messageId].counts[r.reaction] = 0;
      }
      summary[r.messageId].counts[r.reaction]++;
      summary[r.messageId].total++;
      
      // Track user's reactions
      if (r.userId === userId) {
        summary[r.messageId].myReactions.push(r.reaction);
      }
    });

    res.json({
      success: true,
      summary
    });

  } catch (err) {
    console.error("Batch reactions error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;