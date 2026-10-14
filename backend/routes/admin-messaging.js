// backend/routes/admin-messaging.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateDM } = require('./messenger/helpers'); // ← CORRECT PATH

// Admin middleware
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

// GET - All conversations (admin view)
router.get('/conversations', authenticateDM, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const adminId = req.user.userId; // Get the admin's ID
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
          participant1: { select: { id: true, fullName: true, email: true, role: true, profileImage: true } },
          participant2: { select: { id: true, fullName: true, email: true, role: true, profileImage: true } },
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
    
    // Format conversations with unread count for the admin viewer
    const formattedConversations = conversations.map(conv => {
      const isAdminParticipant1 = conv.participant1?.id === adminId;
      const otherParticipant = isAdminParticipant1 ? conv.participant2 : conv.participant1;
      
      return {
        id: conv.id,
        participant: otherParticipant,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        lastMessageBy: conv.lastMessageBy,
        unreadCount: isAdminParticipant1 ? conv.unreadCount1 : conv.unreadCount2,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt
      };
    });
    
    res.json({
      success: true,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      conversations: formattedConversations
    });
    
  } catch (err) {
    console.error("Get all conversations error:", err);
    res.status(500).json({ error: err.message });
  }
});


// GET - All conversations for admin (see ALL conversations)
router.get('/all-conversations', authenticateDM, requireAdmin, async (req, res) => {
  try {
    const conversations = await prisma.conversation.findMany({
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
      },
      orderBy: { lastMessageAt: 'desc' }
    });

    // Format each conversation with participant info
    const formattedConversations = conversations.map(conv => {
      // Format participant1 with executive info
      const participant1 = {
        ...conv.participant1,
        executivePosition: conv.participant1?.executiveAssignments?.[0]?.position?.title || null,
        executiveCategory: conv.participant1?.executiveAssignments?.[0]?.position?.category || null
      };
      
      // Format participant2 with executive info
      const participant2 = {
        ...conv.participant2,
        executivePosition: conv.participant2?.executiveAssignments?.[0]?.position?.title || null,
        executiveCategory: conv.participant2?.executiveAssignments?.[0]?.position?.category || null
      };

      // For admin, we want to show both participants
      return {
        id: conv.id,
        participant1,
        participant2,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        lastMessageBy: conv.lastMessageBy,
        unreadCount1: conv.unreadCount1,
        unreadCount2: conv.unreadCount2,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt
      };
    });

    res.json({
      success: true,
      conversations: formattedConversations
    });

  } catch (err) {
    console.error("Get all conversations error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;