const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateDM, batchSendNotifications, createAndSendNotification } = require('./helpers');
const { sendPersonalizedEmail } = require('../../services/mailer');


// ==================== ADMIN MIDDLEWARE ====================
async function requireAdmin(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });
    
    if (user?.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ==================== STATISTICS ====================

// GET - Overall messaging statistics
router.get('/stats', authenticateDM, requireAdmin, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let startDate = new Date();
    if (period === '7d') startDate.setDate(startDate.getDate() - 7);
    else if (period === '30d') startDate.setDate(startDate.getDate() - 30);
    else if (period === '90d') startDate.setDate(startDate.getDate() - 90);
    else startDate = new Date(0);
    
    const [
      totalMessages,
      totalConversations,
      totalFiles,
      totalReports,
      totalBlocks,
      activeUsers,
      messagesByDay,
      topActiveUsers,
      reportedMessages
    ] = await Promise.all([
      // Total messages in period
      prisma.directMessage.count({
        where: { createdAt: { gte: startDate } }
      }),
      
      // Total conversations
      prisma.conversation.count(),
      
      // Total files shared
      prisma.directMessageFile.count({
        where: { createdAt: { gte: startDate } }
      }),
      
      // Total reports
      prisma.reportedDMMessage.count({
        where: { createdAt: { gte: startDate } }
      }),
      
      // Total blocks
      prisma.blockedDMUser.count({
        where: { createdAt: { gte: startDate } }
      }),
      
      // Active users (sent at least one message in period)
      prisma.directMessage.groupBy({
        by: ['senderId'],
        where: { createdAt: { gte: startDate } },
        _count: { senderId: true }
      }),
      
      // Messages per day (last 30 days)
      prisma.$queryRaw`
        SELECT DATE("createdAt") as date, COUNT(*) as count
        FROM "direct_messages"
        WHERE "createdAt" >= ${startDate}
        GROUP BY DATE("createdAt")
        ORDER BY date DESC
        LIMIT 30
      `,
      
      // Top 10 most active users
      prisma.directMessage.groupBy({
        by: ['senderId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      }),
      
      // Pending reports with message details
      prisma.reportedDMMessage.findMany({
        where: { status: 'pending' },
        include: {
          message: {
            include: {
              sender: { select: { id: true, fullName: true, email: true } }
            }
          },
          reporter: { select: { id: true, fullName: true, email: true } }
        },
        take: 20
      })
    ]);
    
    // Get user details for top active users
    const topUsersWithDetails = [];
    for (const user of topActiveUsers) {
      const userDetails = await prisma.user.findUnique({
        where: { id: user.senderId },
        select: { id: true, fullName: true, email: true, role: true }
      });
      if (userDetails) {
        topUsersWithDetails.push({
          ...userDetails,
          messageCount: user._count.id
        });
      }
    }
    
    res.json({
      success: true,
      period,
      stats: {
        totalMessages,
        totalConversations,
        totalFiles,
        totalReports,
        totalBlocks,
        activeUsers: activeUsers.length,
        averageMessagesPerUser: activeUsers.length > 0 ? Math.round(totalMessages / activeUsers.length) : 0
      },
      trends: {
        messagesByDay,
        topActiveUsers: topUsersWithDetails,
        pendingReports: reportedMessages
      }
    });
    
  } catch (err) {
    console.error("Admin stats error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Detailed analytics
router.get('/analytics', authenticateDM, requireAdmin, async (req, res) => {
  try {
    const { from, to } = req.query;
    
    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to) : new Date();
    
    const [
      messagesByHour,
      conversationsByDay,
      filesByType,
      reportsByReason
    ] = await Promise.all([
      // Messages by hour of day
      prisma.$queryRaw`
        SELECT EXTRACT(HOUR FROM "createdAt") as hour, COUNT(*) as count
        FROM "direct_messages"
        WHERE "createdAt" BETWEEN ${startDate} AND ${endDate}
        GROUP BY EXTRACT(HOUR FROM "createdAt")
        ORDER BY hour ASC
      `,
      
      // New conversations per day
      prisma.$queryRaw`
        SELECT DATE("createdAt") as date, COUNT(*) as count
        FROM "conversations"
        WHERE "createdAt" BETWEEN ${startDate} AND ${endDate}
        GROUP BY DATE("createdAt")
        ORDER BY date DESC
      `,
      
      // Files by type
      prisma.directMessageFile.groupBy({
        by: ['type'],
        _count: { id: true },
        where: { createdAt: { gte: startDate, lte: endDate } }
      }),
      
      // Reports by reason
      prisma.reportedDMMessage.groupBy({
        by: ['reason'],
        _count: { id: true },
        where: { createdAt: { gte: startDate, lte: endDate } }
      })
    ]);
    
    res.json({
      success: true,
      period: { from: startDate, to: endDate },
      analytics: {
        messagesByHour,
        conversationsByDay,
        filesByType,
        reportsByReason
      }
    });
    
  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== CONVERSATION MANAGEMENT ====================

// GET - All conversations (admin view)
router.get('/conversations', authenticateDM, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = {};
    if (search) {
      where.OR = [
        { participant1: { fullName: { contains: search, mode: 'insensitive' } } },
        { participant2: { fullName: { contains: search, mode: 'insensitive' } } }
      ];
    }
    
    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          participant1: { select: { id: true, fullName: true, email: true, role: true } },
          participant2: { select: { id: true, fullName: true, email: true, role: true } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        },
        orderBy: { lastMessageAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.conversation.count({ where })
    ]);
    
    res.json({
      success: true,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      conversations
    });
    
  } catch (err) {
    console.error("Get all conversations error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Single conversation (admin view)
router.get('/conversations/:conversationId', authenticateDM, requireAdmin, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participant1: { select: { id: true, fullName: true, email: true, role: true } },
        participant2: { select: { id: true, fullName: true, email: true, role: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 100,
          include: {
            sender: { select: { id: true, fullName: true } },
            files: true
          }
        }
      }
    });
    
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    
    res.json({ success: true, conversation });
    
  } catch (err) {
    console.error("Get conversation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE - Delete old conversations
router.delete('/conversations/old', authenticateDM, requireAdmin, async (req, res) => {
  try {
    const { daysOld = 90 } = req.query;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(daysOld));
    
    const deleted = await prisma.conversation.deleteMany({
      where: {
        lastMessageAt: { lt: cutoffDate },
        messages: { none: {} } // No messages
      }
    });
    
    res.json({
      success: true,
      message: `Deleted ${deleted.count} old conversations`,
      count: deleted.count
    });
    
  } catch (err) {
    console.error("Delete old conversations error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== REPORT MANAGEMENT ====================

// GET - All reports
router.get('/reports', authenticateDM, requireAdmin, async (req, res) => {
  try {
    const { status, limit = 100 } = req.query;
    
    const where = {};
    if (status && status !== 'all') {
      where.status = status;
    }
    
    const reports = await prisma.reportedDMMessage.findMany({
      where,
      include: {
        message: {
          include: {
            sender: { select: { id: true, fullName: true, email: true } },
            conversation: true
          }
        },
        reporter: { select: { id: true, fullName: true, email: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });
    
    const stats = {
      pending: reports.filter(r => r.status === 'pending').length,
      reviewed: reports.filter(r => r.status === 'reviewed').length,
      dismissed: reports.filter(r => r.status === 'dismissed').length,
      actionTaken: reports.filter(r => r.status === 'action_taken').length
    };
    
    res.json({
      success: true,
      stats,
      total: reports.length,
      reports
    });
    
  } catch (err) {
    console.error("Get reports error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT - Review a report
router.put('/reports/:reportId/review', authenticateDM, requireAdmin, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { action, notes } = req.body;
    
    const report = await prisma.reportedDMMessage.findUnique({
      where: { id: reportId },
      include: {
        message: {
          include: {
            sender: true
          }
        }
      }
    });
    
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }
    
    let newStatus = report.status;
    let messageAction = null;
    
    if (action === 'dismiss') {
      newStatus = 'dismissed';
      messageAction = 'Report dismissed';
    } else if (action === 'warn') {
      newStatus = 'action_taken';
      messageAction = 'User warned';
    } else if (action === 'delete') {
      newStatus = 'action_taken';
      // Soft delete the message
      await prisma.directMessage.update({
        where: { id: report.messageId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: req.user.userId,
          content: "[Message removed by admin]"
        }
      });
      messageAction = 'Message deleted';
    } else if (action === 'block') {
      newStatus = 'action_taken';
      // Block the sender
      await prisma.blockedDMUser.create({
        data: {
          blockerId: req.user.userId,
          blockedId: report.message.senderId,
          reason: `Reported: ${report.reason}`
        }
      });
      messageAction = 'User blocked';
    } else if (action === 'suspend') {
      newStatus = 'action_taken';
      // Suspend user (set special flag, you may need to add a suspended field to User model)
      // For now, just block
      await prisma.blockedDMUser.create({
        data: {
          blockerId: req.user.userId,
          blockedId: report.message.senderId,
          reason: `Suspended due to report: ${report.reason}`
        }
      });
      messageAction = 'User suspended';
    }
    
    await prisma.reportedDMMessage.update({
      where: { id: reportId },
      data: {
        status: newStatus,
        reviewedBy: req.user.userId,
        reviewedAt: new Date()
      }
    });
    
    // Notify the reporter
    await createAndSendNotification({
      userId: report.reporterId,
      type: "report_resolved",
      title: "Report Update",
      message: `Your report has been reviewed. Action taken: ${messageAction || 'Reviewed'}`,
      data: { reportId, action }
    });
    
    res.json({
      success: true,
      message: `Report ${newStatus}`,
      action: messageAction
    });
    
  } catch (err) {
    console.error("Review report error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE - Dismiss a report
router.delete('/reports/:reportId/dismiss', authenticateDM, requireAdmin, async (req, res) => {
  try {
    const { reportId } = req.params;
    
    await prisma.reportedDMMessage.update({
      where: { id: reportId },
      data: {
        status: 'dismissed',
        reviewedBy: req.user.userId,
        reviewedAt: new Date()
      }
    });
    
    res.json({ success: true, message: "Report dismissed" });
    
  } catch (err) {
    console.error("Dismiss report error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== MESSAGE MANAGEMENT ====================

// DELETE - Admin delete any message
router.delete('/messages/:messageId', authenticateDM, requireAdmin, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await prisma.directMessage.findUnique({
      where: { id: messageId },
      include: { conversation: true }
    });
    
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }
    
    await prisma.directMessage.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user.userId,
        content: "[Message deleted by admin]"
      }
    });
    
    // Notify both participants
    const io = req.app.get('io');
    if (io) {
      io.to(message.conversation.participant1Id).emit('message_deleted', { messageId });
      io.to(message.conversation.participant2Id).emit('message_deleted', { messageId });
    }
    
    res.json({ success: true, message: "Message deleted by admin" });
    
  } catch (err) {
    console.error("Admin delete message error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== BROADCAST MESSAGES ====================

// POST - Send broadcast message to users
router.post('/broadcast', authenticateDM, requireAdmin, async (req, res) => {
  try {
    const { title, content, targetRole, targetJumuiaId, scheduledFor } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }
    
    // Build user filter
    const userFilter = {};
    if (targetRole && targetRole !== 'all') {
      userFilter.role = targetRole;
    }
    if (targetJumuiaId) {
      userFilter.jumuiaId = targetJumuiaId;
    }
    
    const users = await prisma.user.findMany({
      where: userFilter,
      select: { id: true, email: true, fullName: true }
    });
    
    // Create broadcast record
    const broadcast = await prisma.dMBroadcast.create({
      data: {
        senderId: req.user.userId,
        title,
        content,
        targetRole: targetRole || null,
        targetJumuiaId: targetJumuiaId || null,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        status: scheduledFor ? 'scheduled' : 'sent'
      }
    });
    
    // If scheduled for later, don't send now
    if (scheduledFor) {
      return res.json({
        success: true,
        message: `Broadcast scheduled for ${new Date(scheduledFor).toLocaleString()}`,
        broadcast,
        recipientCount: users.length
      });
    }
    
    // Create receipts and send notifications
    const receipts = [];
    for (const user of users) {
      receipts.push({
        broadcastId: broadcast.id,
        userId: user.id
      });
      
      // Create notification
      await createAndSendNotification({
        userId: user.id,
        type: "broadcast",
        title: ` ${title}`,
        message: content.substring(0, 100),
        data: { broadcastId: broadcast.id, type: "broadcast" }
      });
      
      // Send email
      if (user.email) {
        await sendPersonalizedEmail(
          { email: user.email, fullName: user.fullName },
          'broadcast',
          `📢 ${title}`,
          content,
          { broadcastId: broadcast.id }
        ).catch(err => console.error("Broadcast email failed:", err.message));
      }
    }
    
    // Save receipts
    await prisma.dMBroadcastReceipt.createMany({
      data: receipts,
      skipDuplicates: true
    });
    
    res.json({
      success: true,
      message: `Broadcast sent to ${users.length} users`,
      broadcast,
      recipientCount: users.length
    });
    
  } catch (err) {
    console.error("Broadcast error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET - All broadcasts
router.get('/broadcasts', authenticateDM, requireAdmin, async (req, res) => {
  try {
    const broadcasts = await prisma.dMBroadcast.findMany({
      include: {
        sender: { select: { id: true, fullName: true } },
        receipts: {
          select: { read: true, deliveredAt: true }
        }
      },
      orderBy: { sentAt: 'desc' }
    });
    
    const formatted = broadcasts.map(b => ({
      id: b.id,
      title: b.title,
      content: b.content,
      status: b.status,
      sentAt: b.sentAt,
      scheduledFor: b.scheduledFor,
      sender: b.sender,
      stats: {
        totalRecipients: b.receipts.length,
        readCount: b.receipts.filter(r => r.read).length,
        readRate: b.receipts.length > 0 
          ? Math.round((b.receipts.filter(r => r.read).length / b.receipts.length) * 100) 
          : 0
      }
    }));
    
    res.json({ success: true, broadcasts: formatted });
    
  } catch (err) {
    console.error("Get broadcasts error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Broadcast stats
router.get('/broadcasts/:broadcastId/stats', authenticateDM, requireAdmin, async (req, res) => {
  try {
    const { broadcastId } = req.params;
    
    const broadcast = await prisma.dMBroadcast.findUnique({
      where: { id: broadcastId },
      include: {
        receipts: {
          include: {
            user: { select: { id: true, fullName: true, email: true } }
          }
        }
      }
    });
    
    if (!broadcast) {
      return res.status(404).json({ error: "Broadcast not found" });
    }
    
    const read = broadcast.receipts.filter(r => r.read);
    const unread = broadcast.receipts.filter(r => !r.read);
    
    res.json({
      success: true,
      broadcast: {
        id: broadcast.id,
        title: broadcast.title,
        content: broadcast.content,
        sentAt: broadcast.sentAt
      },
      stats: {
        total: broadcast.receipts.length,
        read: read.length,
        unread: unread.length,
        readRate: broadcast.receipts.length > 0 
          ? Math.round((read.length / broadcast.receipts.length) * 100) 
          : 0
      },
      receipts: {
        read: read.map(r => ({ user: r.user, readAt: r.readAt })),
        unread: unread.map(r => ({ user: r.user }))
      }
    });
    
  } catch (err) {
    console.error("Broadcast stats error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== USER MANAGEMENT ====================

// GET - User messaging summary
router.get('/users/:userId/summary', authenticateDM, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, email: true, role: true }
    });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const [messagesSent, messagesReceived, conversations, reports, blocks] = await Promise.all([
      prisma.directMessage.count({ where: { senderId: userId } }),
      prisma.directMessageReadReceipt.count({ where: { userId } }),
      prisma.conversation.count({
        where: {
          OR: [
            { participant1Id: userId },
            { participant2Id: userId }
          ]
        }
      }),
      prisma.reportedDMMessage.count({ where: { reporterId: userId } }),
      prisma.blockedDMUser.count({ where: { blockerId: userId } })
    ]);
    
    res.json({
      success: true,
      user,
      summary: {
        messagesSent,
        messagesReceived,
        totalConversations: conversations,
        reportsFiled: reports,
        usersBlocked: blocks
      }
    });
    
  } catch (err) {
    console.error("User summary error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== EXPORT ====================

// GET - Export conversation as JSON
router.get('/export/conversation/:conversationId', authenticateDM, requireAdmin, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participant1: { select: { id: true, fullName: true, email: true } },
        participant2: { select: { id: true, fullName: true, email: true } },
        messages: {
          where: { isDeleted: false },
          include: {
            sender: { select: { id: true, fullName: true } },
            files: true
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    
    const exportData = {
      exportedAt: new Date().toISOString(),
      conversation: {
        id: conversation.id,
        participants: [conversation.participant1, conversation.participant2],
        createdAt: conversation.createdAt,
        lastMessageAt: conversation.lastMessageAt
      },
      messages: conversation.messages.map(m => ({
        id: m.id,
        content: m.content,
        sender: m.sender,
        sentAt: m.createdAt,
        files: m.files.map(f => ({ name: f.name, type: f.type, size: f.size }))
      }))
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=conversation_${conversationId}_${Date.now()}.json`);
    res.json(exportData);
    
  } catch (err) {
    console.error("Export conversation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== HEALTH ====================
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'DM Admin', timestamp: new Date().toISOString() });
});

module.exports = router;