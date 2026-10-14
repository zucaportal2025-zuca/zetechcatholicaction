const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateDM, getOrCreateConversation } = require('./helpers');

// POST - Schedule a message for later
router.post('/', authenticateDM, async (req, res) => {
  try {
    const { content, recipientId, conversationId, scheduledFor, files } = req.body;
    const userId = req.user.userId;

    if (!scheduledFor) {
      return res.status(400).json({ error: "scheduledFor date is required" });
    }

    const scheduledDate = new Date(scheduledFor);
    if (scheduledDate <= new Date()) {
      return res.status(400).json({ error: "Scheduled time must be in the future" });
    }

    if (!content && (!files || files.length === 0)) {
      return res.status(400).json({ error: "Message content or files required" });
    }

    let convId = conversationId;
    if (!convId && recipientId) {
      const conversation = await getOrCreateConversation(userId, recipientId);
      convId = conversation.id;
    }

    if (!convId) {
      return res.status(400).json({ error: "conversationId or recipientId required" });
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: convId,
        OR: [
          { participant1Id: userId },
          { participant2Id: userId }
        ]
      }
    });

    if (!conversation) {
      return res.status(403).json({ error: "Access denied" });
    }

    const scheduled = await prisma.dMScheduled.create({
      data: {
        userId,
        conversationId: convId,
        content: content || null,
        files: files || null,
        scheduledFor: scheduledDate,
        status: "pending"
      }
    });

    res.status(201).json({
      success: true,
      message: `Message scheduled for ${scheduledDate.toLocaleString()}`,
      scheduled: {
        id: scheduled.id,
        content: scheduled.content,
        scheduledFor: scheduled.scheduledFor,
        status: scheduled.status
      }
    });

  } catch (err) {
    console.error("Schedule message error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Get scheduled messages
router.get('/', authenticateDM, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status, limit = 50 } = req.query;

    const where = { userId };
    if (status && status !== 'all') {
      where.status = status;
    }

    const scheduled = await prisma.dMScheduled.findMany({
      where,
      include: {
        conversation: {
          include: {
            participant1: { select: { id: true, fullName: true, profileImage: true } },
            participant2: { select: { id: true, fullName: true, profileImage: true } }
          }
        }
      },
      orderBy: { scheduledFor: 'asc' },
      take: parseInt(limit)
    });

    const formatted = scheduled.map(s => {
      const recipient = s.conversation.participant1Id === userId 
        ? s.conversation.participant2 
        : s.conversation.participant1;

      return {
        id: s.id,
        content: s.content,
        files: s.files,
        scheduledFor: s.scheduledFor,
        status: s.status,
        errorMessage: s.errorMessage,
        createdAt: s.createdAt,
        recipient,
        conversationId: s.conversationId
      };
    });

    res.json({
      success: true,
      count: formatted.length,
      scheduled: formatted
    });

  } catch (err) {
    console.error("Get scheduled messages error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE - Cancel scheduled message
router.delete('/:id', authenticateDM, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const existing = await prisma.dMScheduled.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ error: "Scheduled message not found" });
    }

    if (existing.status !== 'pending') {
      return res.status(400).json({ error: "Cannot cancel message that has already been sent" });
    }

    await prisma.dMScheduled.update({
      where: { id },
      data: { status: 'cancelled' }
    });

    res.json({ success: true, message: "Scheduled message cancelled" });

  } catch (err) {
    console.error("Cancel scheduled message error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;