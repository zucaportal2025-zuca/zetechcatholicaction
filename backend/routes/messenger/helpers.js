const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "zuca_super_secret_key";

// ==================== AUTHENTICATION ====================

async function authenticateDM(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No token provided" });
    }
    
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
}

// ==================== CONVERSATION HELPERS ====================

async function getOrCreateConversation(userId1, userId2) {
  const [id1, id2] = [userId1, userId2].sort();
  
  let conversation = await prisma.conversation.findFirst({
    where: {
      participant1Id: id1,
      participant2Id: id2
    }
  });
  
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        participant1Id: id1,
        participant2Id: id2
      }
    });
  }
  
  return conversation;
}

async function updateConversationLastMessage(conversationId, message, senderId) {
  // Fire and forget - don't block response
  prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessage: message?.substring(0, 100) || "📎 File attached",
      lastMessageAt: new Date(),
      lastMessageBy: senderId
    }
  }).catch(err => console.error("Failed to update last message:", err));
  
  // Update unread count for the OTHER participant
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId }
  });
  
  if (conversation) {
    const isSenderParticipant1 = conversation.participant1Id === senderId;
    const unreadField = isSenderParticipant1 ? 'unreadCount2' : 'unreadCount1';
    
    prisma.conversation.update({
      where: { id: conversationId },
      data: { [unreadField]: { increment: 1 } }
    }).catch(err => console.error("Failed to update unread count:", err));
  }
}

async function markConversationRead(conversationId, userId) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId }
  });
  
  if (!conversation) return;
  
  const isParticipant1 = conversation.participant1Id === userId;
  const unreadField = isParticipant1 ? 'unreadCount1' : 'unreadCount2';
  
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { [unreadField]: 0 }
  });
}

// ==================== MESSAGE HELPERS ====================

async function getMessagesWithPagination(conversationId, userId, cursor, limit = 50) {
  const messages = await prisma.directMessage.findMany({
    where: {
      conversationId,
      isDeleted: false
    },
    take: limit,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      sender: {
        select: { id: true, fullName: true, profileImage: true, role: true }
      },
      files: true,
      reactions: {
        include: { user: { select: { id: true, fullName: true } } }
      },
      readReceipts: {
        where: { userId },
        select: { readAt: true }
      }
    }
  });
  
  // Mark unread messages as read in background
  const unreadMessageIds = messages
    .filter(m => m.senderId !== userId && m.readReceipts.length === 0)
    .map(m => m.id);
  
  if (unreadMessageIds.length > 0) {
    prisma.directMessageReadReceipt.createMany({
      data: unreadMessageIds.map(messageId => ({
        messageId,
        userId,
        readAt: new Date()
      })),
      skipDuplicates: true
    }).catch(err => console.error("Failed to create read receipts:", err));
    
    // Update isRead flag
    prisma.directMessage.updateMany({
      where: { id: { in: unreadMessageIds } },
      data: { isRead: true, readAt: new Date() }
    }).catch(err => console.error("Failed to update isRead:", err));
  }
  
  return {
    messages: messages.reverse(),
    nextCursor: messages.length === limit ? messages[messages.length - 1].id : null
  };
}

// ==================== FILE HELPERS ====================

function getFileTypeIcon(mimeType) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('word')) return 'word';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'excel';
  if (mimeType.includes('powerpoint')) return 'powerpoint';
  return 'document';
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ==================== NOTIFICATION HELPERS ====================

async function batchSendNotifications(userIds, title, message, type, data = {}) {
  const batchSize = 100;
  let success = 0;
  
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);
    const promises = batch.map(userId => 
      createAndSendNotification({
        userId,
        type,
        title,
        message,
        data
      }).catch(err => {
        console.error(`Failed to notify ${userId}:`, err.message);
        return null;
      })
    );
    
    const results = await Promise.allSettled(promises);
    success += results.filter(r => r.status === 'fulfilled' && r.value).length;
  }
  
  return { success, failed: userIds.length - success };
}

// Note: createAndSendNotification should be imported from your main server.js
// or defined here. You may need to pass it as a parameter or import it.

// ==================== SEARCH HELPERS ====================

async function searchMessages(userId, query, limit = 50) {
  // Get all conversation IDs the user is part of
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        { participant1Id: userId },
        { participant2Id: userId }
      ]
    },
    select: { id: true }
  });
  
  const conversationIds = conversations.map(c => c.id);
  
  if (conversationIds.length === 0) {
    return [];
  }
  
  // Search using the search index table
  const results = await prisma.dMSearchIndex.findMany({
    where: {
      conversationId: { in: conversationIds },
      content: { contains: query, mode: 'insensitive' }
    },
    include: {
      message: {
        include: {
          sender: { select: { id: true, fullName: true, profileImage: true } },
          files: true
        }
      },
      conversation: {
        include: {
          participant1: { select: { id: true, fullName: true, profileImage: true } },
          participant2: { select: { id: true, fullName: true, profileImage: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
  
  return results.map(r => ({
    message: r.message,
    conversation: r.conversation,
    score: r.content.toLowerCase().includes(query.toLowerCase()) ? 1 : 0.5
  }));
}

// ==================== ADMIN HELPERS ====================

async function getMessagingStats(startDate, endDate) {
  const whereDate = {};
  if (startDate) whereDate.gte = new Date(startDate);
  if (endDate) whereDate.lte = new Date(endDate);
  
  const [totalMessages, totalConversations, totalFiles, totalUsers] = await Promise.all([
    prisma.directMessage.count({ where: whereDate }),
    prisma.conversation.count(),
    prisma.directMessageFile.count(),
    prisma.user.count()
  ]);
  
  // Active users (sent at least one message in period)
  const activeUsers = await prisma.directMessage.groupBy({
    by: ['senderId'],
    where: whereDate,
    _count: { senderId: true }
  });
  
  // Messages per day
  const messagesByDay = await prisma.$queryRaw`
    SELECT DATE("createdAt") as date, COUNT(*) as count
    FROM "direct_messages"
    ${startDate ? sql`WHERE "createdAt" >= ${startDate}` : sql``}
    GROUP BY DATE("createdAt")
    ORDER BY date DESC
    LIMIT 30
  `;
  
  return {
    totalMessages,
    totalConversations,
    totalFiles,
    totalUsers,
    activeUsers: activeUsers.length,
    messagesByDay
  };
}

// ==================== NOTIFICATION HELPERS (ADD THIS) ====================

async function createAndSendNotification({ userId, type, title, message, data = {} }) {
  try {
    // Get io instance from app if available (you'll need to pass it or get from global)
    const io = global.io; // Or pass as parameter
    
    // Create notification in database
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message: message?.substring(0, 255) || title,
        data: data,
        read: false,
        createdAt: new Date()
      }
    });
    
    // Emit via socket if io is available
    if (io) {
      io.to(userId).emit('new_notification', {
        id: notification.id,
        userId,
        type,
        title,
        message: notification.message,
        data: data,
        read: false,
        createdAt: notification.createdAt.toISOString()
      });
    }
    
    return notification;
  } catch (err) {
    console.error(`Failed to create notification for user ${userId}:`, err.message);
    return null;
  }
}

// Update batchSendNotifications to use createAndSendNotification
async function batchSendNotifications(userIds, title, message, type, data = {}) {
  const batchSize = 100;
  let success = 0;
  const results = [];
  
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);
    const promises = batch.map(userId => 
      createAndSendNotification({
        userId,
        type,
        title,
        message,
        data
      }).catch(err => {
        console.error(`Failed to notify ${userId}:`, err.message);
        return null;
      })
    );
    
    const batchResults = await Promise.all(promises);
    success += batchResults.filter(r => r !== null).length;
    results.push(...batchResults);
  }
  
  return { success, failed: userIds.length - success, results };
}

// ==================== ADD SQL HELPER ====================

// For raw SQL queries that need parameter binding
function sql(strings, ...values) {
  let result = strings[0];
  for (let i = 0; i < values.length; i++) {
    result += values[i] + strings[i + 1];
  }
  return result;
}

module.exports = {
  // Auth
  authenticateDM,
  // Conversation
  getOrCreateConversation,
  updateConversationLastMessage,
  markConversationRead,
  // Message
  getMessagesWithPagination,
  // File
  getFileTypeIcon,
  formatFileSize,
  // Notification
   createAndSendNotification,
  batchSendNotifications,
  // Search
  searchMessages,
  // Admin
  getMessagingStats
};