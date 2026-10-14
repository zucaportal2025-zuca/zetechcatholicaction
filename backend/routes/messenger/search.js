const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateDM } = require('./helpers');

// GET - Search messages in user's conversations
router.get('/messages', authenticateDM, async (req, res) => {
  try {
    const { q, conversationId, limit = 50 } = req.query;
    const userId = req.user.userId;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: "Search query must be at least 2 characters" });
    }

    // Get all conversation IDs the user is part of
    const conversationWhere = {
      OR: [
        { participant1Id: userId, isDeleted1: false },
        { participant2Id: userId, isDeleted2: false }
      ]
    };

    if (conversationId) {
      conversationWhere.id = conversationId;
      conversationWhere.OR = [
        { participant1Id: userId },
        { participant2Id: userId }
      ];
    }

    const conversations = await prisma.conversation.findMany({
      where: conversationWhere,
      select: { id: true }
    });

    const conversationIds = conversations.map(c => c.id);

    if (conversationIds.length === 0) {
      return res.json({ messages: [], total: 0 });
    }

    // Search messages
    const messages = await prisma.directMessage.findMany({
      where: {
        conversationId: { in: conversationIds },
        isDeleted: false,
        content: { contains: q, mode: 'insensitive' }
      },
      include: {
        sender: {
          select: { id: true, fullName: true, profileImage: true, role: true }
        },
        conversation: {
          include: {
            participant1: { select: { id: true, fullName: true, profileImage: true } },
            participant2: { select: { id: true, fullName: true, profileImage: true } }
          }
        },
        files: true,
        reactions: {
          take: 3,
          include: { user: { select: { id: true, fullName: true } } }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    // Highlight search term in content
    const searchTerm = q.toLowerCase();
    const results = messages.map(msg => ({
      ...msg,
      highlightedContent: msg.content?.replace(
        new RegExp(`(${searchTerm})`, 'gi'),
        '<mark>$1</mark>'
      ) || null
    }));

    res.json({
      success: true,
      total: results.length,
      query: q,
      messages: results
    });

  } catch (err) {
    console.error("Search messages error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Search users to start conversation with
router.get('/users', authenticateDM, async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    const userId = req.user.userId;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: "Search query must be at least 2 characters" });
    }

    // Search users (exclude self)
    const users = await prisma.user.findMany({
      where: {
        id: { not: userId },
        OR: [
          { fullName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { membership_number: { contains: q, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        profileImage: true,
        role: true,
        specialRole: true,
        lastActive: true
      },
      take: parseInt(limit)
    });

    // Check if user is blocked
    const blocks = await prisma.blockedDMUser.findMany({
      where: {
        OR: [
          { blockerId: userId, blockedId: { in: users.map(u => u.id) } },
          { blockedId: userId, blockerId: { in: users.map(u => u.id) } }
        ]
      }
    });

    const blockedByMe = new Set(blocks.filter(b => b.blockerId === userId).map(b => b.blockedId));
    const blockedMe = new Set(blocks.filter(b => b.blockedId === userId).map(b => b.blockerId));

    // Check existing conversations
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { participant1Id: userId },
          { participant2Id: userId }
        ]
      },
      select: {
        id: true,
        participant1Id: true,
        participant2Id: true
      }
    });

    const existingConversations = new Map();
    conversations.forEach(conv => {
      const otherId = conv.participant1Id === userId ? conv.participant2Id : conv.participant1Id;
      existingConversations.set(otherId, conv.id);
    });

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const formattedUsers = users.map(u => ({
      ...u,
      isOnline: u.lastActive ? new Date(u.lastActive) > fiveMinutesAgo : false,
      isBlockedByMe: blockedByMe.has(u.id),
      isBlockedMe: blockedMe.has(u.id),
      hasConversation: existingConversations.has(u.id),
      conversationId: existingConversations.get(u.id) || null
    }));

    res.json({
      success: true,
      total: formattedUsers.length,
      query: q,
      users: formattedUsers
    });

  } catch (err) {
    console.error("Search users error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Search conversations (by participant name)
router.get('/conversations', authenticateDM, async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    const userId = req.user.userId;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: "Search query must be at least 2 characters" });
    }

    // Get all user's conversations
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { participant1Id: userId, isDeleted1: false },
          { participant2Id: userId, isDeleted2: false }
        ]
      },
      include: {
        participant1: {
          select: { id: true, fullName: true, email: true, profileImage: true }
        },
        participant2: {
          select: { id: true, fullName: true, email: true, profileImage: true }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    // Filter conversations where the other participant's name matches search
    const filtered = conversations.filter(conv => {
      const otherParticipant = conv.participant1Id === userId ? conv.participant2 : conv.participant1;
      return otherParticipant.fullName.toLowerCase().includes(q.toLowerCase());
    });

    const formatted = filtered.map(conv => {
      const otherParticipant = conv.participant1Id === userId ? conv.participant2 : conv.participant1;
      const isParticipant1 = conv.participant1Id === userId;
      const unreadCount = isParticipant1 ? conv.unreadCount1 : conv.unreadCount2;

      return {
        id: conv.id,
        participant: otherParticipant,
        lastMessage: conv.messages[0]?.content || null,
        lastMessageAt: conv.lastMessageAt,
        unreadCount,
        createdAt: conv.createdAt
      };
    });

    res.json({
      success: true,
      total: filtered.length,
      query: q,
      conversations: formatted.slice(0, parseInt(limit))
    });

  } catch (err) {
    console.error("Search conversations error:", err);
    res.status(500).json({ error: err.message });
  }
});

// backend/routes/messenger/search.js
router.get('/all-users', authenticateDM, async (req, res) => {
  try {
    const userId = req.user.userId;
    const users = await prisma.user.findMany({
      where: {
        id: { not: userId }
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        profileImage: true,
        role: true,
        specialRole: true,  // ← MAKE SURE THIS IS INCLUDED
        lastActive: true,
        // Include executive assignments
        executiveAssignments: {
          where: { isActive: true },
          include: {
            position: {
              select: {
                title: true,
                category: true,
                level: true
              }
            }
          }
        },
        // Include home jumuia
        homeJumuia: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        // Include leading jumuia (for jumuia leaders)
        leadingJumuia: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      },
      orderBy: { fullName: 'asc' }
    });
    
    // Format users with executive info
    const formattedUsers = users.map(user => ({
      ...user,
      executivePosition: user.executiveAssignments[0]?.position?.title || null,
      executiveCategory: user.executiveAssignments[0]?.position?.category || null
    }));
    
    res.json({ 
      success: true, 
      users: formattedUsers,
      total: formattedUsers.length 
    });
  } catch (err) {
    console.error("Error fetching all users:", err);
    res.status(500).json({ error: err.message });
  }
});
// GET - Advanced search with filters
router.get('/advanced', authenticateDM, async (req, res) => {
  try {
    const { 
      q, 
      fromDate, 
      toDate, 
      senderId, 
      hasFiles,
      conversationId,
      limit = 50 
    } = req.query;
    const userId = req.user.userId;

    // Get user's conversation IDs
    const userConversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { participant1Id: userId },
          { participant2Id: userId }
        ]
      },
      select: { id: true }
    });

    const conversationIds = userConversations.map(c => c.id);

    if (conversationIds.length === 0) {
      return res.json({ messages: [], total: 0 });
    }

    // Build where clause
    const where = {
      conversationId: { in: conversationIds },
      isDeleted: false
    };

    if (q && q.trim().length >= 2) {
      where.content = { contains: q, mode: 'insensitive' };
    }

    if (fromDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(fromDate) };
    }

    if (toDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(toDate) };
    }

    if (senderId) {
      where.senderId = senderId;
    }

    if (conversationId) {
      where.conversationId = conversationId;
    }

    // Get messages with file filter
    let messages = await prisma.directMessage.findMany({
      where,
      include: {
        sender: {
          select: { id: true, fullName: true, profileImage: true }
        },
        conversation: {
          include: {
            participant1: { select: { id: true, fullName: true } },
            participant2: { select: { id: true, fullName: true } }
          }
        },
        files: true,
        reactions: {
          take: 5,
          include: { user: { select: { id: true, fullName: true } } }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    // Filter by hasFiles if specified
    if (hasFiles === 'true') {
      messages = messages.filter(m => m.files.length > 0);
    }

    res.json({
      success: true,
      total: messages.length,
      filters: { q, fromDate, toDate, senderId, hasFiles, conversationId },
      messages
    });

  } catch (err) {
    console.error("Advanced search error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;