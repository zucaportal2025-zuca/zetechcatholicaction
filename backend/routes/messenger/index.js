const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');  
const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient();

// Import all sub-routers
const conversationsRouter = require('./conversations');
const messagesRouter = require('./messages');
const filesRouter = require('./files');
const reactionsRouter = require('./reactions');
const readReceiptsRouter = require('./readReceipts');
const blockingRouter = require('./blocking');
const reportsRouter = require('./reports');
const searchRouter = require('./search');
const draftsRouter = require('./drafts');
const scheduledRouter = require('./scheduled');
const pinnedRouter = require('./pinned');
const sharesRouter = require('./shares');
const notificationsModule = require('./notifications');
const notificationsRouter = notificationsModule.router;const settingsRouter = require('./settings');
const adminRouter = require('./admin');

// ==================== MOUNT ALL ROUTES ====================

// Core routes
router.use('/conversations', conversationsRouter);
router.use('/messages', messagesRouter);
router.use('/files', filesRouter);
router.use('/reactions', reactionsRouter);
router.use('/read-receipts', readReceiptsRouter);

// User management
router.use('/block', blockingRouter);
router.use('/report', reportsRouter);

// Search
router.use('/search', searchRouter);

// Productivity
router.use('/drafts', draftsRouter);
router.use('/scheduled', scheduledRouter);
router.use('/pinned', pinnedRouter);
router.use('/shares', sharesRouter);

// Notifications & Settings
router.use('/notifications', notificationsRouter);
router.use('/settings', settingsRouter);

// Admin only (mounted separately, but we'll add admin check in the router)
router.use('/admin', adminRouter);

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Get unread count (quick access)
router.get('/unread/count', async (req, res) => {
  // This will be handled in notifications router, but adding here for convenience
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No token provided" });
    }
    
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "zuca_super_secret_key");
    const userId = decoded.userId;
    
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { participant1Id: userId, isDeleted1: false },
          { participant2Id: userId, isDeleted2: false }
        ]
      }
    });
    
    let totalUnread = 0;
    for (const conv of conversations) {
      const isParticipant1 = conv.participant1Id === userId;
      totalUnread += isParticipant1 ? conv.unreadCount1 : conv.unreadCount2;
    }
    
    res.json({ unreadCount: totalUnread });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;