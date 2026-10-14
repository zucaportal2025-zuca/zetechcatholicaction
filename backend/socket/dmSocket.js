const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const webpush = require('web-push'); 

webpush.setVapidDetails(
  'mailto:zucaportal2025@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);



// ✅ ADD THIS WHOLE FUNCTION - Self-contained notification function
async function createAndSendNotification({ userId, type, title, message, data = {} }) {
  try {
    console.log(`🔔 Creating DM notification: ${title} for user ${userId}`);
    
    // 1. Create notification in database
    const notification = await prisma.notification.create({
      data: {
        id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        userId,
        type,
        title,
        message,
        read: false,
        createdAt: new Date(),
        data: data || {}
      }
    });

    // 2. Send real-time via Socket.IO
    try {
      const io = global.io;
      if (io) {
        io.to(userId).emit('new_notification', {
          ...notification,
          createdAt: notification.createdAt.toISOString()
        });
      }
    } catch (err) {
      // Socket not available, continue
    }

    // 3. Send PUSH NOTIFICATION
    try {
      const subscription = await prisma.pushSubscription.findUnique({
        where: { userId }
      });

      if (subscription) {
        const unreadCount = await prisma.notification.count({
          where: { userId, read: false }
        });

        const pushSubscription = JSON.parse(subscription.subscription);
        
        const deepLinkUrl = global.getDeepLinkUrl
          ? global.getDeepLinkUrl(type, data)
          : `${process.env.FRONTEND_URL || "https://www.zetechcatholicaction.com"}/messenger`;

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify({
            title,
            body: message,
            icon: "/android-chrome-192x192.png",
            badge: "/favicon.ico",
            badgeCount: unreadCount + 1,
            data: {
              type,
              ...data,
              url: deepLinkUrl
            },
            url: deepLinkUrl,
            timestamp: Date.now()
          }),
          { urgency: "high" }
        );
        
        console.log(`📱 Push notification sent to user ${userId}`);
      } else {
        console.log(`⚠️ No push subscription for user ${userId}`);
      }
    } catch (err) {
      console.error(`❌ Push notification failed for user ${userId}:`, err.message);
    }

    return notification;
  } catch (err) {
    console.error('❌ createAndSendNotification error:', err.message);
    return null;
  }
}

const onlineUsers = new Map();
const userSockets = new Map();
const typingUsers = new Map();

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('🔌 New socket connected:', socket.id);

    // Join conversation room for real-time messaging
    socket.on('join_conversation', (conversationId) => {
      if (conversationId) {
        socket.join(`conversation:${conversationId}`);
        console.log(`🔊 Socket ${socket.id} joined conversation room: conversation:${conversationId}`);
      }
    });

    socket.on('dm:join', async (userId) => {
      if (!userId) return;
      
      onlineUsers.set(userId, socket.id);
      userSockets.set(socket.id, userId);
      socket.join(userId);
      
      let isAdmin = false;
try {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });
  
  // Check if user exists
  if (!user) {
    console.log(`⚠️ User ${userId} not found in database - rejecting connection`);
    socket.emit('dm:error', { error: 'User account not found' });
    return;
  }
  
  isAdmin = user.role === 'admin';
  if (isAdmin) {
    socket.join('admin-room');
    console.log(`👑 Admin ${userId} joined admin room`);
  }
  
  // Only update lastActive if user exists
  await prisma.user.update({
    where: { id: userId },
    data: { lastActive: new Date() }
  });
  
} catch (err) {
  console.error('Error in dm:join:', err);
  if (err.code === 'P2025') {
    socket.emit('dm:error', { error: 'User account not found' });
    return;
  }
}
      console.log(`✅ User ${userId} joined DM system (Admin: ${isAdmin})`);
      console.log(`📊 Current online users: ${Array.from(onlineUsers.keys()).join(', ')}`);
      
      io.emit('dm:user_online', { userId, online: true });
      
      const onlineUsersList = Array.from(onlineUsers.keys());
      socket.emit('dm:online_users', { users: onlineUsersList });
      
      if (!isAdmin) {
        io.to('admin-room').emit('dm:user_online', { userId, online: true });
      }
    });
    
    socket.on('disconnect', async () => {
      const userId = userSockets.get(socket.id);
      if (userId) {
        onlineUsers.delete(userId);
        userSockets.delete(socket.id);
        
        for (const [convId, users] of typingUsers.entries()) {
          if (users.has(userId)) {
            users.delete(userId);
            io.to(`conversation:${convId}`).emit('dm:typing_stop', { 
              conversationId: convId, 
              userId 
            });
          }
        }
        
        console.log(`🔴 User ${userId} disconnected`);
        console.log(`📊 Remaining online users: ${Array.from(onlineUsers.keys()).join(', ')}`);
        
        io.emit('dm:user_offline', { userId, online: false });
        io.to('admin-room').emit('dm:user_offline', { userId, online: false });
      }
    });
    
    socket.on('dm:send_message', async (data) => {
      try {
        const { conversationId, content, files, replyToId, tempId } = data;
        const userId = userSockets.get(socket.id);
        
        if (!userId) {
          socket.emit('dm:error', { error: 'Not authenticated' });
          return;
        }
        
        const conversation = await prisma.conversation.findFirst({
          where: {
            id: conversationId,
            OR: [
              { participant1Id: userId },
              { participant2Id: userId }
            ]
          },
          select: { id: true, participant1Id: true, participant2Id: true }
        });
        
        if (!conversation) {
          socket.emit('dm:error', { error: 'Access denied' });
          return;
        }
        
        const recipientId = conversation.participant1Id === userId 
          ? conversation.participant2Id 
          : conversation.participant1Id;
        
        const message = await prisma.directMessage.create({
          data: {
            content: content || null,
            senderId: userId,
            conversationId: conversationId,
            replyToId: replyToId || null
          },
          include: {
            sender: {
              select: { id: true, fullName: true, profileImage: true, role: true }
            }
          }
        });
        
        // Handle files in background
        if (files && files.length > 0) {
          const filePromises = files.map(file => 
            prisma.directMessageFile.create({
              data: {
                name: file.name,
                type: file.type,
                size: file.size,
                data: file.url,
                thumbnail: file.thumbnail,
                userId: userId,
                messageId: message.id
              }
            })
          );
          Promise.all(filePromises).catch(console.error);
        }
        
        // ✅ ONLY ONE EMIT - to conversation room (NO duplicate)
    // ✅ ONLY ONE EMIT - to conversation room (NO duplicate)
io.to(`conversation:${conversationId}`).emit('dm:new_message', {
  id: message.id,
  content: message.content,
  conversationId: conversationId,
  senderId: message.senderId,
  createdAt: message.createdAt,
  replyToId: message.replyToId,
  sender: {
    id: message.sender.id,
    fullName: message.sender.fullName,
    profileImage: message.sender.profileImage,
    role: message.sender.role
  },
  tempId: data.tempId
});

// Confirm to sender
socket.emit('dm:message_sent', {
  id: message.id,
  content: message.content,
  conversationId: conversationId,
  senderId: message.senderId,
  createdAt: message.createdAt,
  sender: {
    id: message.sender.id,
    fullName: message.sender.fullName,
    profileImage: message.sender.profileImage,
    role: message.sender.role
  },
  tempId: data.tempId
});
        
               // Fire and forget - don't await these
        const isSenderParticipant1 = conversation.participant1Id === userId;
        const unreadField = isSenderParticipant1 ? 'unreadCount2' : 'unreadCount1';
        
        // Update conversation with last message AND reactivate for sender
        prisma.conversation.update({
          where: { id: conversationId },
          data: {
            lastMessage: content?.substring(0, 100) || "📎 File attached",
            lastMessageAt: new Date(),
            lastMessageBy: userId,
            ...(isSenderParticipant1 ? { isDeleted1: false } : { isDeleted2: false })
          }
        }).catch(console.error);
        
        // Also reactivate for recipient
        prisma.conversation.update({
          where: { id: conversationId },
          data: {
            ...(conversation.participant1Id === recipientId ? { isDeleted1: false } : { isDeleted2: false })
          }
        }).catch(console.error);
        
        // Update unread count
        prisma.conversation.update({
          where: { id: conversationId },
          data: { [unreadField]: { increment: 1 } }
        }).catch(console.error);
      // ✅ REPLACE WITH THIS - uses createAndSendNotification with push
try {
  await createAndSendNotification({
    userId: recipientId,
    type: "direct_message",
    title: ` New message from ${message.sender.fullName}`,
    message: content?.substring(0, 100) || "📎 New message",
    data: {
      conversationId: conversationId,
      messageId: message.id,
      senderId: userId,
      senderName: message.sender.fullName,
      type: "direct_message"
    }
  });
  console.log(`📱 Push notification sent to ${recipientId} from ${message.sender.fullName}`);
} catch (err) {
  console.error('❌ Push notification failed:', err);
}
      } catch (err) {
        console.error('Send message error:', err);
        socket.emit('dm:error', { error: err.message });
      }
    });
    
    socket.on('dm:typing_start', async ({ conversationId }) => {
      const userId = userSockets.get(socket.id);
      if (!userId) return;
      
      console.log(`📝 User ${userId} started typing in conversation ${conversationId}`);
      
      if (!typingUsers.has(conversationId)) {
        typingUsers.set(conversationId, new Set());
      }
      
      typingUsers.get(conversationId).add(userId);
      
      io.to(`conversation:${conversationId}`).emit('dm:typing_start', {
        conversationId,
        userId
      });
    });
    
    socket.on('dm:typing_stop', async ({ conversationId }) => {
      const userId = userSockets.get(socket.id);
      if (!userId) return;
      
      console.log(`📝 User ${userId} stopped typing in conversation ${conversationId}`);
      
      if (typingUsers.has(conversationId)) {
        typingUsers.get(conversationId).delete(userId);
      }
      
      io.to(`conversation:${conversationId}`).emit('dm:typing_stop', {
        conversationId,
        userId
      });
    });
    
    socket.on('dm:mark_read', async ({ messageId, conversationId }) => {
      const userId = userSockets.get(socket.id);
      if (!userId) return;
      
      try {
        await prisma.directMessageReadReceipt.upsert({
          where: {
            messageId_userId: { messageId, userId }
          },
          update: { readAt: new Date() },
          create: {
            messageId,
            userId,
            readAt: new Date()
          }
        });
        
        await prisma.directMessage.update({
          where: { id: messageId },
          data: { isRead: true, readAt: new Date() }
        });
        
        const message = await prisma.directMessage.findUnique({
          where: { id: messageId },
          select: { senderId: true }
        });
        
        if (message && message.senderId !== userId) {
          io.to(message.senderId).emit('dm:message_read', {
            messageId,
            conversationId,
            userId,
            readAt: new Date()
          });
        }
        
      } catch (err) {
        console.error('Mark read error:', err);
      }
    });
    
    socket.on('dm:mark_conversation_read', async ({ conversationId }) => {
      const userId = userSockets.get(socket.id);
      if (!userId) return;
      
      try {
        const unreadMessages = await prisma.directMessage.findMany({
          where: {
            conversationId,
            senderId: { not: userId },
            isRead: false
          },
          select: { id: true, senderId: true }
        });
        
        for (const msg of unreadMessages) {
          await prisma.directMessageReadReceipt.upsert({
            where: {
              messageId_userId: { messageId: msg.id, userId }
            },
            update: { readAt: new Date() },
            create: {
              messageId: msg.id,
              userId,
              readAt: new Date()
            }
          });
          
          io.to(msg.senderId).emit('dm:message_read', {
            messageId: msg.id,
            conversationId,
            userId,
            readAt: new Date()
          });
        }
        
        await prisma.directMessage.updateMany({
          where: {
            conversationId,
            senderId: { not: userId },
            isRead: false
          },
          data: { isRead: true, readAt: new Date() }
        });
        
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId }
        });
        
        if (conversation) {
          const isParticipant1 = conversation.participant1Id === userId;
          await prisma.conversation.update({
            where: { id: conversationId },
            data: isParticipant1 ? { unreadCount1: 0 } : { unreadCount2: 0 }
          });
        }
        
        socket.emit('dm:conversation_read', { conversationId });
        
      } catch (err) {
        console.error('Mark conversation read error:', err);
      }
    });
    
    socket.on('dm:delete_message', async ({ messageId, conversationId }) => {
      const userId = userSockets.get(socket.id);
      if (!userId) return;
      
      try {
        const message = await prisma.directMessage.findUnique({
          where: { id: messageId }
        });
        
        if (!message || message.senderId !== userId) {
          socket.emit('dm:error', { error: 'Not authorized' });
          return;
        }
        
        await prisma.directMessage.update({
          where: { id: messageId },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: userId,
            content: "[Message deleted]"
          }
        });
        
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId }
        });
        
        if (conversation) {
          io.to(conversation.participant1Id).emit('dm:message_deleted', { messageId });
          io.to(conversation.participant2Id).emit('dm:message_deleted', { messageId });
        }
        
      } catch (err) {
        console.error('Delete message error:', err);
      }
    });
    
    socket.on('dm:edit_message', async ({ messageId, content, conversationId }) => {
      const userId = userSockets.get(socket.id);
      if (!userId) return;
      
      try {
        const message = await prisma.directMessage.findUnique({
          where: { id: messageId }
        });
        
        if (!message || message.senderId !== userId) {
          socket.emit('dm:error', { error: 'Not authorized' });
          return;
        }
        
        const updated = await prisma.directMessage.update({
          where: { id: messageId },
          data: {
            content,
            isEdited: true,
            editedAt: new Date()
          }
        });
        
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId }
        });
        
        if (conversation) {
          io.to(conversation.participant1Id).emit('dm:message_edited', updated);
          io.to(conversation.participant2Id).emit('dm:message_edited', updated);
        }
        
      } catch (err) {
        console.error('Edit message error:', err);
      }
    });
    
    socket.on('dm:add_reaction', async ({ messageId, reaction, conversationId }) => {
      const userId = userSockets.get(socket.id);
      if (!userId) return;
      
      try {
        const existing = await prisma.directMessageReaction.findUnique({
          where: {
            messageId_userId_reaction: { messageId, userId, reaction }
          }
        });
        
        if (existing) {
          await prisma.directMessageReaction.delete({ where: { id: existing.id } });
        } else {
          await prisma.directMessageReaction.create({
            data: { messageId, userId, reaction }
          });
        }
        
        const counts = await prisma.directMessageReaction.groupBy({
          by: ['reaction'],
          where: { messageId },
          _count: true
        });
        
        const reactionCounts = {};
        counts.forEach(c => { reactionCounts[c.reaction] = c._count; });
        
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId }
        });
        
        if (conversation) {
          io.to(conversation.participant1Id).emit('dm:reaction_updated', {
            messageId,
            reaction,
            counts: reactionCounts,
            userId
          });
          io.to(conversation.participant2Id).emit('dm:reaction_updated', {
            messageId,
            reaction,
            counts: reactionCounts,
            userId
          });
        }
        
      } catch (err) {
        console.error('Add reaction error:', err);
      }
    });
  });
};