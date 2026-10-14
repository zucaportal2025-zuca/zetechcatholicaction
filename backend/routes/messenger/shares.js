const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateDM } = require('./helpers');
const crypto = require('crypto');

function generateShareId() {
  return crypto.randomBytes(8).toString('hex');
}

// ==================== PUBLIC ROUTE (NO AUTH) ====================
// This MUST be before any router.use or routes that require auth

// GET - View shared message (PUBLIC)
router.get('/share/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params;

    const share = await prisma.dMShare.findFirst({
      where: { shareId },
      include: {
        message: {
          include: {
            sender: { select: { id: true, fullName: true, profileImage: true } },
            files: true
          }
        },
        sharedByUser: { select: { id: true, fullName: true } }
      }
    });

    if (!share) {
      return res.status(404).json({ error: "Share link not found" });
    }

    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      return res.status(410).json({ error: "This share link has expired" });
    }

    // Increment view count
    await prisma.dMShare.update({
      where: { id: share.id },
      data: { views: { increment: 1 } }
    });

    res.json({
      success: true,
      sharedBy: share.sharedByUser.fullName,
      sharedAt: share.createdAt,
      message: {
        id: share.message.id,
        content: share.message.content,
        createdAt: share.message.createdAt,
        sender: share.message.sender,
        files: share.message.files.map(f => ({
          id: f.id,
          name: f.name,
          type: f.type,
          size: f.size,
          url: f.data
        }))
      }
    });

  } catch (err) {
    console.error("View shared message error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== PROTECTED ROUTES (REQUIRE AUTH) ====================

// POST - Create share link
router.post('/messages/:messageId', authenticateDM, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { expiresInDays } = req.body;
    const userId = req.user.userId;

    const message = await prisma.directMessage.findFirst({
      where: { id: messageId, isDeleted: false },
      include: { conversation: true, sender: { select: { id: true, fullName: true } } }
    });

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const isParticipant = message.conversation.participant1Id === userId || 
                          message.conversation.participant2Id === userId;
    
    if (!isParticipant) {
      return res.status(403).json({ error: "Access denied" });
    }

    let share = await prisma.dMShare.findFirst({
      where: { messageId, sharedBy: userId }
    });

    if (share) {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      return res.json({
        success: true,
        share: {
          id: share.id,
          shareId: share.shareId,
          shareUrl: `${baseUrl}/api/messenger/share/${share.shareId}`,
          views: share.views,
          createdAt: share.createdAt,
          expiresAt: share.expiresAt
        }
      });
    }

    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    const shareId = generateShareId();
    share = await prisma.dMShare.create({
      data: {
        messageId,
        shareId,
        sharedBy: userId,
        expiresAt
      }
    });

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    res.status(201).json({
      success: true,
      share: {
        id: share.id,
        shareId: share.shareId,
        shareUrl: `${baseUrl}/api/messenger/share/${share.shareId}`,
        views: share.views,
        createdAt: share.createdAt,
        expiresAt: share.expiresAt
      }
    });

  } catch (err) {
    console.error("Create share error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Get my shares
router.get('/my-shares', authenticateDM, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 50 } = req.query;

    const shares = await prisma.dMShare.findMany({
      where: { sharedBy: userId },
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

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const formatted = shares.map(share => ({
      id: share.id,
      shareId: share.shareId,
      shareUrl: `${baseUrl}/api/messenger/share/${share.shareId}`,
      views: share.views,
      createdAt: share.createdAt,
      expiresAt: share.expiresAt,
      message: {
        id: share.message.id,
        content: share.message.content?.substring(0, 100),
        createdAt: share.message.createdAt,
        sender: share.message.sender
      }
    }));

    res.json({ success: true, count: formatted.length, shares: formatted });

  } catch (err) {
    console.error("Get my shares error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE - Delete share link
router.delete('/:shareId', authenticateDM, async (req, res) => {
  try {
    const { shareId } = req.params;
    const userId = req.user.userId;

    const share = await prisma.dMShare.findFirst({
      where: { shareId, sharedBy: userId }
    });

    if (!share) {
      return res.status(404).json({ error: "Share link not found" });
    }

    await prisma.dMShare.delete({ where: { id: share.id } });
    res.json({ success: true, message: "Share link deleted successfully" });

  } catch (err) {
    console.error("Delete share error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;