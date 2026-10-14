const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateDM } = require('./helpers');

// POST - Report a message
router.post('/:messageId', authenticateDM, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reason, description } = req.body;
    const reporterId = req.user.userId;

    // Validate reason
    const validReasons = ['spam', 'harassment', 'inappropriate', 'hate_speech', 'other'];
    if (!reason || !validReasons.includes(reason)) {
      return res.status(400).json({ 
        error: `Invalid reason. Use: ${validReasons.join(', ')}` 
      });
    }

    // Check if message exists
    const message = await prisma.directMessage.findFirst({
      where: { id: messageId, isDeleted: false },
      include: {
        conversation: true,
        sender: { select: { id: true, fullName: true } }
      }
    });

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Verify reporter is in the conversation
    const isParticipant = message.conversation.participant1Id === reporterId || 
                          message.conversation.participant2Id === reporterId;
    
    if (!isParticipant) {
      return res.status(403).json({ error: "You can only report messages from your conversations" });
    }

    // Cannot report own messages
    if (message.senderId === reporterId) {
      return res.status(400).json({ error: "You cannot report your own message" });
    }

    // Check if already reported by this user
    const existingReport = await prisma.reportedDMMessage.findFirst({
      where: {
        messageId,
        reporterId
      }
    });

    if (existingReport) {
      return res.status(400).json({ error: "You have already reported this message" });
    }

    // Create report
    const report = await prisma.reportedDMMessage.create({
      data: {
        messageId,
        reporterId,
        reason,
        description: description || null,
        status: "pending"
      },
      include: {
        message: {
          include: {
            sender: { select: { id: true, fullName: true, email: true } }
          }
        },
        reporter: { select: { id: true, fullName: true, email: true } }
      }
    });

    // Notify admins
    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: { id: true }
    });

    const io = req.app.get('io');
    if (io && admins.length > 0) {
      admins.forEach(admin => {
        io.to(admin.id).emit('new_report', {
          reportId: report.id,
          messageId: report.messageId,
          reportedUser: report.message.sender.fullName,
          reportedBy: report.reporter.fullName,
          reason: report.reason,
          createdAt: report.createdAt
        });
      });
    }

    res.status(201).json({
      success: true,
      message: "Message reported successfully. Our team will review it.",
      report: {
        id: report.id,
        reason: report.reason,
        status: report.status,
        createdAt: report.createdAt
      }
    });

  } catch (err) {
    console.error("Report message error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Get my reports
router.get('/', authenticateDM, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status, limit = 50 } = req.query;

    const where = { reporterId: userId };
    if (status && status !== 'all') {
      where.status = status;
    }

    const reports = await prisma.reportedDMMessage.findMany({
      where,
      include: {
        message: {
          include: {
            sender: { select: { id: true, fullName: true } },
            conversation: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    const formatted = reports.map(r => ({
      id: r.id,
      reason: r.reason,
      description: r.description,
      status: r.status,
      createdAt: r.createdAt,
      message: {
        id: r.message.id,
        content: r.message.content,
        sender: r.message.sender,
        createdAt: r.message.createdAt
      }
    }));

    res.json({
      success: true,
      count: formatted.length,
      reports: formatted
    });

  } catch (err) {
    console.error("Get my reports error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT - Cancel a report (only if pending)
router.put('/:reportId/cancel', authenticateDM, async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user.userId;

    const report = await prisma.reportedDMMessage.findFirst({
      where: {
        id: reportId,
        reporterId: userId,
        status: "pending"
      }
    });

    if (!report) {
      return res.status(404).json({ error: "Report not found or already reviewed" });
    }

    await prisma.reportedDMMessage.delete({
      where: { id: reportId }
    });

    res.json({
      success: true,
      message: "Report cancelled successfully"
    });

  } catch (err) {
    console.error("Cancel report error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Get single report details
router.get('/:reportId', authenticateDM, async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user.userId;

    const report = await prisma.reportedDMMessage.findFirst({
      where: {
        id: reportId,
        reporterId: userId
      },
      include: {
        message: {
          include: {
            sender: { select: { id: true, fullName: true, email: true } },
            conversation: {
              include: {
                participant1: { select: { id: true, fullName: true } },
                participant2: { select: { id: true, fullName: true } }
              }
            },
            files: true
          }
        },
        reporter: { select: { id: true, fullName: true } }
      }
    });

    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    res.json({
      success: true,
      report: {
        id: report.id,
        reason: report.reason,
        description: report.description,
        status: report.status,
        createdAt: report.createdAt,
        message: {
          id: report.message.id,
          content: report.message.content,
          createdAt: report.message.createdAt,
          sender: report.message.sender,
          files: report.message.files
        }
      }
    });

  } catch (err) {
    console.error("Get report details error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;