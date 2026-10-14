const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const axios = require('axios');
const xml2js = require('xml2js');

let lastVideoId = null;
let lastLiveId = null;

// ========== COMPLETE NOTIFICATION FUNCTION ==========
async function createAndSendNotification({ userId, type, title, message, data = {} }) {
  try {
    // 1. Save to database
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

    // 2. Socket.IO (real-time bell icon)
    try {
      const io = global.io;
      if (io) {
        io.to(userId).emit('new_notification', {
          ...notification,
          createdAt: notification.createdAt.toISOString()
        });
      }
    } catch (err) {}

    // 3. Push Notification (mobile)
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

        const pushSubscription = JSON.parse(subscription.subscription);
        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify({
            title,
            body: message,
            icon: '/android-chrome-192x192.png',
            badge: '/favicon.ico',
            data: data || {},
            timestamp: Date.now()
          }),
          { urgency: 'high' }
        );
        console.log(`📱 Push sent to user ${userId}`);
      }
    } catch (err) {
      console.log(`⚠️ Push failed for ${userId}:`, err.message);
    }

    // 4. ✅ EMAIL NOTIFICATION
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, fullName: true }
      });

      if (user?.email) {
        const { sendPersonalizedEmail } = require("../services/mailer");
        
        await sendPersonalizedEmail(
          { email: user.email, fullName: user.fullName },
          type,
          title,
          message,
          data
        );
        console.log(`📧 Email sent to ${user.email}`);
      }
    } catch (err) {
      console.log(`⚠️ Email failed for ${userId}:`, err.message);
    }

    return notification;
  } catch (err) {
    console.error('❌ Notification error:', err.message);
    return null;
  }
}

// ========== WEBHOOK VERIFICATION ==========
router.get("/youtube-webhook", (req, res) => {
  const userAgent = req.headers['user-agent'] || '';
  if (userAgent.includes('bot') || userAgent.includes('crawler') || userAgent.includes('scanner')) {
    return res.status(404).send('Not found');
  }
  
  const mode = req.query['hub.mode'];
  const challenge = req.query['hub.challenge'];
  
  console.log(`🔔 YouTube webhook verification: ${mode}`);
  
  if (mode === 'subscribe' && challenge) {
    res.status(200).send(challenge);
    console.log('✅ Webhook verified successfully!');
  } else {
    res.status(404).send('Not found');
  }
});

// ========== WEBHOOK NOTIFICATIONS ==========
router.post("/youtube-webhook", async (req, res) => {
  try {
    console.log('🔔 YouTube webhook notification received!');
    
    const rawBody = req.rawBody;
    if (!rawBody || !rawBody.trim().startsWith('<')) {
      console.log('⚠️ Not XML, ignoring');
      return res.status(200).send('OK');
    }
    
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(rawBody);
    
    const entry = result.feed?.entry;
    if (!entry) {
      console.log('📭 No entry in webhook');
      return res.status(200).send('OK');
    }
    
    const videoId = entry['yt:videoId'] || null;
    const title = entry.title || 'Unknown Title';
    const isLive = entry['yt:liveBroadcast'] === 'live';
    
    if (!videoId) {
      console.log('⚠️ No video ID found');
      return res.status(200).send('OK');
    }
    
    console.log(`📺 Video detected:`);
    console.log(`   Title: ${title}`);
    console.log(`   Video ID: ${videoId}`);
    console.log(`   Live: ${isLive}`);
    
    // Prevent duplicates
    if (isLive) {
      if (lastLiveId === videoId) {
        console.log('⏭️ Live stream already notified');
        return res.status(200).send('OK');
      }
      lastLiveId = videoId;
    } else {
      if (lastVideoId === videoId) {
        console.log('⏭️ Video already notified');
        return res.status(200).send('OK');
      }
      lastVideoId = videoId;
    }
    
    // ===== SEND TO ALL USERS IN PARALLEL =====
    console.log('📢 Sending notifications to all users...');
    const startTime = Date.now();
    
    const users = await prisma.user.findMany({ select: { id: true } });
    
    // Send ALL at once
    const notificationPromises = users.map(user => 
      createAndSendNotification({
        userId: user.id,
        type: isLive ? "youtube_live" : "youtube_new_video",
        title: isLive ? "Zetech University Catholic Action IS LIVE NOW!" : " Zetech University Catholic Action IS LIVE NOW!",
        message: isLive 
          ? `${title}\n\nWatch live now on ZUCA!` 
          : `${title}\n\nNavigate to ZUCA/TUBE on your app side bar to watch on ZUCA APP!`,
        data: {
          videoId: videoId,
          videoTitle: title,
          videoThumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
          type: isLive ? "live_now" : "new_video"
        }
      }).catch(err => {
        console.error(`Failed to send to user ${user.id}:`, err.message);
        return null;
      })
    );
    
    const results = await Promise.all(notificationPromises);
    const successCount = results.filter(r => r !== null).length;
    
    const duration = Date.now() - startTime;
    console.log(`✅ Sent notifications to ${successCount} users in ${duration}ms!`);
    
    res.status(200).send('OK');
    
  } catch (error) {
    console.error('❌ Webhook error:', error.message);
    res.status(500).send('Error');
  }
});

// ========== REGISTER WEBHOOK ==========
router.get("/setup-youtube-webhook", async (req, res) => {
  try {
    const channelId = process.env.YOUTUBE_CHANNEL_ID || "UCJ7NvR5_ZUwhtM16sJY4anQ";
    const baseUrl = process.env.PUBLIC_URL;
    
    if (!baseUrl) {
      return res.status(400).json({
        success: false,
        error: "PUBLIC_URL not set in .env"
      });
    }
    
    const callbackUrl = `${baseUrl}/api/youtube-webhook`;
    
    console.log(`📡 Subscribing to YouTube channel: ${channelId}`);
    console.log(`   Callback URL: ${callbackUrl}`);
    
    await axios.post('https://pubsubhubbub.appspot.com/subscribe', null, {
      params: {
        'hub.mode': 'subscribe',
        'hub.topic': `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channelId}`,
        'hub.callback': callbackUrl,
        'hub.verify': 'sync'
      }
    });
    
    res.json({
      success: true,
      message: "Webhook registration sent to YouTube!",
      channelId,
      callbackUrl
    });
    
  } catch (error) {
    console.error('❌ Setup error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== CHECK STATUS ==========
router.get("/youtube-webhook-status", async (req, res) => {
  res.json({
    success: true,
    status: "active",
    lastVideoId: lastVideoId,
    lastLiveId: lastLiveId,
    serverUrl: process.env.PUBLIC_URL,
    channelId: process.env.YOUTUBE_CHANNEL_ID,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;