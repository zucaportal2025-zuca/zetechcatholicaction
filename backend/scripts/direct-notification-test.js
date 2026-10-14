// backend/scripts/direct-notification-test.js
// Run with: node scripts/direct-notification-test.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Copy the exact function from your attendanceRoutes.js
async function testCreateAndSendNotification({ userId, type, title, message, data = {} }) {
  try {
    console.log(`🔔 TEST: Creating notification: ${title} for user ${userId}`);
    
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

    console.log(`   ✅ Notification created in DB: ${notification.id}`);

    // 2. Send real-time via Socket.IO
    try {
      const io = global.io;
      if (io) {
        io.to(userId).emit('new_notification', {
          ...notification,
          createdAt: notification.createdAt.toISOString()
        });
        console.log(`   ✅ Socket.IO event emitted`);
      } else {
        console.log(`   ⚠️ Socket.IO not available globally`);
      }
    } catch (err) {
      console.log(`   ❌ Socket.IO error:`, err.message);
    }

    // 3. Send PUSH NOTIFICATION
    try {
      const subscription = await prisma.pushSubscription.findUnique({
        where: { userId }
      });

      if (subscription) {
        console.log(`   📱 Push subscription found`);
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
        
        console.log(`   📱 Sending push notification...`);
        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify({
            title,
            body: message,
            icon: '/android-chrome-192x192.png',
            badge: '/favicon.ico',
            badgeCount: unreadCount + 1,
            data: { type, ...data },
            timestamp: Date.now()
          }),
          { urgency: 'high' }
        );
        
        console.log(`   ✅ Push notification sent to user ${userId}`);
      } else {
        console.log(`   ⚠️ No push subscription for user ${userId}`);
      }
    } catch (err) {
      console.error(`   ❌ Push notification failed:`, err.message);
      if (err.statusCode === 410) {
        console.log(`      ⚠️ Subscription expired - removing`);
        await prisma.pushSubscription.deleteMany({ where: { userId } });
      }
    }

    // 4. Send EMAIL
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { homeJumuia: true }
      });
      
      if (user?.email) {
        console.log(`   📧 User has email: ${user.email}`);
        const { sendPersonalizedEmail } = require("../services/mailer");
        
        await sendPersonalizedEmail(
          { email: user.email, fullName: user.fullName },
          type,
          title,
          message,
          data
        );
        
        console.log(`   ✅ Email sent to ${user.email}`);
      } else {
        console.log(`   ⚠️ No email for user ${userId}`);
      }
    } catch (err) {
      console.error(`   ❌ Email failed:`, err.message);
    }

    return notification;
  } catch (err) {
    console.error(`   ❌ createAndSendNotification error:`, err.message);
    return null;
  }
}

async function test() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 DIRECT NOTIFICATION TEST');
  console.log('='.repeat(80));
  
  // Find a user with push subscription
  console.log('\n📌 Finding user with push subscription...');
  
  const sub = await prisma.pushSubscription.findFirst({
    include: { user: true }
  });
  
  if (!sub) {
    console.log('❌ No push subscription found!');
    console.log('   Please subscribe to push notifications first.');
    await prisma.$disconnect();
    return;
  }
  
  console.log(`✅ Found user: ${sub.user.fullName} (${sub.user.email})`);
  console.log(`   User ID: ${sub.userId}`);
  console.log(`   Subscription ID: ${sub.id}`);
  
  // Send test notification
  console.log('\n📨 Sending test notification...');
  
  const result = await testCreateAndSendNotification({
    userId: sub.userId,
    type: "direct_test",
    title: "🔔 Direct Test Notification",
    message: `This is a DIRECT test notification to verify push + email are working!\n\nSent at: ${new Date().toLocaleString()}\n\nIf you received this, the notification system is working correctly!`,
    data: { 
      test: true,
      timestamp: new Date().toISOString(),
      from: "direct-test-script"
    }
  });
  
  if (result) {
    console.log('\n✅ SUCCESS! Notification sent!');
    console.log(`   ID: ${result.id}`);
    console.log(`   Type: ${result.type}`);
    console.log(`   Created: ${result.createdAt}`);
  } else {
    console.log('\n❌ FAILED! Notification not sent.');
  }
  
  // Check recent notifications
  console.log('\n📊 Recent notifications:');
  const recent = await prisma.notification.findMany({
    where: { userId: sub.userId },
    orderBy: { createdAt: 'desc' },
    take: 3
  });
  
  for (const n of recent) {
    console.log(`   - ${n.title} (${n.createdAt.toLocaleString()})`);
  }
  
  await prisma.$disconnect();
}

test().catch(console.error);