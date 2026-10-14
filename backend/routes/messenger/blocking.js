const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateDM } = require('./helpers');

// POST - Block a user
router.post('/:userId', authenticateDM, async (req, res) => {
  try {
    const { userId } = req.params;
    const blockerId = req.user.userId;

    // Cannot block yourself
    if (userId === blockerId) {
      return res.status(400).json({ error: "You cannot block yourself" });
    }

    // Check if user exists
    const userToBlock = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!userToBlock) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if already blocked
    const existingBlock = await prisma.blockedDMUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: blockerId,
          blockedId: userId
        }
      }
    });

    if (existingBlock) {
      return res.status(400).json({ error: "User already blocked" });
    }

    // Create block record
    const block = await prisma.blockedDMUser.create({
      data: {
        blockerId: blockerId,
        blockedId: userId,
        reason: req.body.reason || null
      },
      include: {
        blocked: {
          select: { id: true, fullName: true, email: true, profileImage: true }
        }
      }
    });

    // Optional: Delete any existing conversation to hide messages
    const conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { participant1Id: blockerId, participant2Id: userId },
          { participant1Id: userId, participant2Id: blockerId }
        ]
      }
    });

    if (conversation) {
      // Archive the conversation for the blocker
      const isBlockerParticipant1 = conversation.participant1Id === blockerId;
      if (isBlockerParticipant1) {
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { isDeleted1: true }
        });
      } else {
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { isDeleted2: true }
        });
      }
    }

    // Notify via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(blockerId).emit('user_blocked', { blockedUser: block.blocked });
    }

    res.json({
      success: true,
      message: `Blocked ${userToBlock.fullName}`,
      blocked: block.blocked
    });

  } catch (err) {
    console.error("Block user error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE - Unblock a user
router.delete('/:userId', authenticateDM, async (req, res) => {
  try {
    const { userId } = req.params;
    const blockerId = req.user.userId;

    // Check if block exists
    const block = await prisma.blockedDMUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: blockerId,
          blockedId: userId
        }
      },
      include: {
        blocked: {
          select: { id: true, fullName: true, email: true, profileImage: true }
        }
      }
    });

    if (!block) {
      return res.status(404).json({ error: "User not blocked" });
    }

    // Delete block record
    await prisma.blockedDMUser.delete({
      where: {
        blockerId_blockedId: {
          blockerId: blockerId,
          blockedId: userId
        }
      }
    });

    // Restore conversation visibility
    const conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { participant1Id: blockerId, participant2Id: userId },
          { participant1Id: userId, participant2Id: blockerId }
        ]
      }
    });

    if (conversation) {
      const isBlockerParticipant1 = conversation.participant1Id === blockerId;
      if (isBlockerParticipant1) {
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { isDeleted1: false }
        });
      } else {
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { isDeleted2: false }
        });
      }
    }

    // Notify via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(blockerId).emit('user_unblocked', { unblockedUser: block.blocked });
    }

    res.json({
      success: true,
      message: `Unblocked ${block.blocked.fullName}`,
      unblocked: block.blocked
    });

  } catch (err) {
    console.error("Unblock user error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Get list of blocked users
router.get('/', authenticateDM, async (req, res) => {
  try {
    const userId = req.user.userId;

    const blockedUsers = await prisma.blockedDMUser.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          select: {
            id: true,
            fullName: true,
            email: true,
            profileImage: true,
            role: true,
            lastActive: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = blockedUsers.map(b => ({
      id: b.id,
      user: b.blocked,
      reason: b.reason,
      blockedAt: b.createdAt
    }));

    res.json({
      success: true,
      count: formatted.length,
      blocked: formatted
    });

  } catch (err) {
    console.error("Get blocked users error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Check if user is blocked
router.get('/check/:userId', authenticateDM, async (req, res) => {
  try {
    const { userId } = req.params;
    const blockerId = req.user.userId;

    const block = await prisma.blockedDMUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: blockerId,
          blockedId: userId
        }
      }
    });

    // Also check if current user is blocked BY the other user
    const blockedByOther = await prisma.blockedDMUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: userId,
          blockedId: blockerId
        }
      }
    });

    res.json({
      success: true,
      iBlockedThem: !!block,
      theyBlockedMe: !!blockedByOther,
      canMessage: !block && !blockedByOther
    });

  } catch (err) {
    console.error("Check block status error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Block and report (report + block in one action)
router.post('/:userId/report-and-block', authenticateDM, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason, description } = req.body;
    const reporterId = req.user.userId;

    if (userId === reporterId) {
      return res.status(400).json({ error: "Cannot block/report yourself" });
    }

    const userToBlock = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!userToBlock) {
      return res.status(404).json({ error: "User not found" });
    }

    // Create block
    const block = await prisma.blockedDMUser.create({
      data: {
        blockerId: reporterId,
        blockedId: userId,
        reason: reason || "Reported and blocked"
      }
    });

    // Archive conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { participant1Id: reporterId, participant2Id: userId },
          { participant1Id: userId, participant2Id: reporterId }
        ]
      }
    });

    if (conversation) {
      const isReporterParticipant1 = conversation.participant1Id === reporterId;
      if (isReporterParticipant1) {
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { isDeleted1: true }
        });
      } else {
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { isDeleted2: true }
        });
      }
    }

    // Create report (if reason provided)
    let report = null;
    if (reason) {
      // Find recent messages from this user to report
      const recentMessages = await prisma.directMessage.findMany({
        where: {
          senderId: userId,
          conversationId: conversation?.id,
          isDeleted: false
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      if (recentMessages.length > 0) {
        report = await prisma.reportedDMMessage.create({
          data: {
            messageId: recentMessages[0].id,
            reporterId: reporterId,
            reason: reason,
            description: description || null,
            status: "pending"
          }
        });
      }
    }

    // Notify admins (optional)
    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: { id: true }
    });

    const io = req.app.get('io');
    if (io && admins.length > 0 && report) {
      admins.forEach(admin => {
        io.to(admin.id).emit('new_report', {
          reportId: report.id,
          reportedUser: userToBlock.fullName,
          reporter: req.user.fullName,
          reason: reason
        });
      });
    }

    res.json({
      success: true,
      message: `${userToBlock.fullName} has been blocked and reported`,
      blocked: true,
      reported: !!report
    });

  } catch (err) {
    console.error("Report and block error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;