const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ==================== PUSH NOTIFICATION FUNCTION ====================
async function sendPushNotification({ userId, title, message, data = {} }) {
  try {
    const notification = await prisma.notification.create({
      data: {
        id: `jumuia-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        userId,
        type: "jumuia_member_added",
        title,
        message,
        read: false,
        createdAt: new Date(),
        data: data || {}
      }
    });

    try {
      const io = global.io;
      if (io) {
        io.to(userId).emit('new_notification', {
          ...notification,
          createdAt: notification.createdAt.toISOString()
        });
      }
    } catch (err) {}

    try {
      const subscription = await prisma.pushSubscription.findUnique({
        where: { userId }
      });

      if (subscription) {
        const webpush = require('web-push');
        
        webpush.setVapidDetails(
          'mailto:zucaportal2025@gmail.com',
          process.env.VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY
        );

        const unreadCount = await prisma.notification.count({
          where: { userId, read: false }
        });

        const pushSubscription = JSON.parse(subscription.subscription);
        
        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify({
            title,
            body: message,
            icon: "/android-chrome-192x192.png",
            badge: "/favicon.ico",
            badgeCount: unreadCount + 1,
            data: {
              type: "jumuia_member_added",
              ...data,
              url: `${process.env.FRONTEND_URL || "https://www.zetechcatholicaction.com"}/dashboard`
            },
            timestamp: Date.now()
          }),
          { urgency: "high" }
        );
        
        console.log(`📱 Push notification sent to user ${userId}`);
      }
    } catch (err) {
      console.error(`❌ Push notification failed:`, err.message);
    }

    return notification;
  } catch (err) {
    console.error('❌ Notification error:', err.message);
    return null;
  }
}

// ==================== SEND EMAIL FUNCTION ====================
async function sendWelcomeEmail({ email, fullName, jumuiaName, jumuiaCode, addedBy }) {
  try {
    const { sendPersonalizedEmail } = require("../services/mailer");
    
    await sendPersonalizedEmail(
      { email, fullName },
      "jumuia_member_added",
      `Welcome to ${jumuiaName}! 🎉`,
      `Dear ${fullName},

🎉 Welcome to ${jumuiaName}!

You have been added to the ${jumuiaName} Jumuia by ${addedBy}.

Remember to participate in our jumuia activities including; 1.contributions
2.check announcements and all that concern ${jumuiaName}
We're excited to have you as part of our Jumuia!

Zetech University Catholic Action (ZUCA)`,
      { jumuiaName, jumuiaCode, addedBy }
    );
    
    console.log(`📧 Welcome email sent to ${email}`);
    return true;
  } catch (err) {
    console.error(`❌ Email failed:`, err.message);
    return false;
  }
}

// ==================== GET USERS WITH NO JUMUIA ====================
router.get('/available-users', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        role: true, 
        specialRole: true,
        jumuiaId: true 
      }
    });
    
    const isLeader = currentUser?.specialRole === 'jumuia_leader';
    const isAdmin = currentUser?.role === 'admin' || currentUser?.specialRole === 'admin';
    const isTreasurer = currentUser?.specialRole === 'treasurer';
    
    if (!isLeader && !isAdmin && !isTreasurer) {
      return res.status(403).json({ 
        error: "You don't have permission to view available users" 
      });
    }
    
    // Get users with NO jumuia (jumuiaId is null)
    const availableUsers = await prisma.user.findMany({
      where: {
        jumuiaId: null  // ← Only users with no Jumuia
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        specialRole: true,
        membership_number: true,
        profileImage: true,
        createdAt: true
      },
      orderBy: {
        fullName: 'asc'
      }
    });
    
    console.log(`📋 Found ${availableUsers.length} users with no Jumuia`);
    
    res.json(availableUsers);
    
  } catch (err) {
    console.error("❌ Error fetching available users:", err);
    res.status(500).json({ 
      error: "Failed to fetch available users",
      details: err.message 
    });
  }
});

// ==================== ADD MEMBER TO JUMUIA ====================
router.post('/:jumuiaId/members/add', authenticate, async (req, res) => {
  try {
    const { jumuiaId } = req.params;
    const { userId } = req.body;
    const adminId = req.user.userId;
    
    // Validate
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    // Fetch user, jumuia, and admin
    const [user, jumuia, admin] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.jumuia.findUnique({ where: { id: jumuiaId } }),
      prisma.user.findUnique({ 
        where: { id: adminId },
        select: { fullName: true, email: true }
      })
    ]);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    if (!jumuia) {
      return res.status(404).json({ error: "Jumuia not found" });
    }
    
    // Check if user already has a Jumuia
    if (user.jumuiaId) {
      return res.status(400).json({ 
        error: "User is already in a Jumuia",
        currentJumuiaId: user.jumuiaId
      });
    }
    
    // ========== FIX: Add user to jumuia using jumuiaId ==========
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { 
        jumuiaId: jumuiaId,  // ← Use jumuiaId (not assignedJumuiaId)
        // Note: jumuiaCode doesn't exist in your schema
      }
    });
    
    // Send immediate response
    res.status(200).json({
      success: true,
      message: `${user.fullName} added to ${jumuia.name}`,
      member: {
        id: updatedUser.id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        specialRole: updatedUser.specialRole,
        membership_number: updatedUser.membership_number,
        jumuiaId: updatedUser.jumuiaId
      }
    });
    
    // ========== BACKGROUND: SEND NOTIFICATIONS ==========
    (async () => {
      try {
        // 1. Push notification to the new member
        await sendPushNotification({
          userId: userId,
          title: `👋 Welcome to ${jumuia.name}!`,
          message: `${admin.fullName} added you to ${jumuia.name}. Welcome to the community!`,
          data: { 
            jumuiaId: jumuia.id,
            jumuiaName: jumuia.name,
            jumuiaCode: jumuia.code,
            addedBy: admin.fullName
          }
        });
        
        // 2. Push notification to admin (confirmation)
        await sendPushNotification({
          userId: adminId,
          title: `✅ Member Added to ${jumuia.name}`,
          message: `You added ${user.fullName} to ${jumuia.name}.`,
          data: { 
            jumuiaId: jumuia.id,
            jumuiaName: jumuia.name,
            memberName: user.fullName
          }
        });
        
        // 3. Email to the new member
        if (user.email) {
          await sendWelcomeEmail({
            email: user.email,
            fullName: user.fullName,
            jumuiaName: jumuia.name,
            jumuiaCode: jumuia.code,
            addedBy: admin.fullName
          });
        }
        
        // 4. Socket event for real-time updates
        const io = global.io;
        if (io) {
          io.to(`jumuia_${jumuiaId}`).emit('member_added', {
            jumuiaId: jumuiaId,
            memberId: user.id,
            memberName: user.fullName,
            member: updatedUser,
            addedBy: admin.fullName
          });
        }
        
        console.log(`✅ Member ${user.fullName} added to ${jumuia.name}`);
        
      } catch (err) {
        console.error("❌ Background notification failed:", err.message);
      }
    })();
    
  } catch (err) {
    console.error("❌ Add member error:", err);
    console.error("Error details:", err.message);
    res.status(500).json({ 
      error: "Failed to add member to jumuia",
      details: err.message 
    });
  }
});

// ==================== REMOVE MEMBER FROM JUMUIA ====================
router.delete('/:jumuiaId/members/:userId', authenticate, async (req, res) => {
  try {
    const { jumuiaId, userId } = req.params;
    const adminId = req.user.userId;
    
    const [user, jumuia, admin] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.jumuia.findUnique({ where: { id: jumuiaId } }),
      prisma.user.findUnique({ 
        where: { id: adminId },
        select: { fullName: true }
      })
    ]);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    if (!jumuia) {
      return res.status(404).json({ error: "Jumuia not found" });
    }
    
    if (user.jumuiaId !== jumuiaId) {
      return res.status(400).json({ error: "User is not in this jumuia" });
    }
    
    // Remove user from jumuia
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { 
        jumuiaId: null
      }
    });
    
    res.status(200).json({
      success: true,
      message: `${user.fullName} removed from ${jumuia.name}`,
      member: {
        id: updatedUser.id,
        fullName: updatedUser.fullName,
        jumuiaId: updatedUser.jumuiaId
      }
    });
    
    // Background: Send notification
    (async () => {
      try {
        await sendPushNotification({
          userId: userId,
          title: `👋 Removed from ${jumuia.name}`,
          message: `You have been removed from ${jumuia.name} by ${admin.fullName}.`,
          data: { 
            jumuiaId: jumuia.id,
            jumuiaName: jumuia.name
          }
        });
        
        const io = global.io;
        if (io) {
          io.to(`jumuia_${jumuiaId}`).emit('member_removed', {
            jumuiaId: jumuiaId,
            memberId: user.id,
            memberName: user.fullName,
            removedBy: admin.fullName
          });
        }
      } catch (err) {
        console.error("Background notification failed:", err.message);
      }
    })();
    
  } catch (err) {
    console.error("Remove member error:", err);
    res.status(500).json({ error: "Failed to remove member" });
  }
});

module.exports = router;