// routes/whatsapp.admin.js
const express = require('express');
const router = express.Router();
const bot = require('../services/whatsapp.bot');
const { authenticate, requireAdmin } = require('../middleware/auth');
const QRCode = require('qrcode');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// =============================================
// 📊 GET BOT STATUS
// =============================================
router.get('/status', authenticate, requireAdmin, async (req, res) => {
  try {
    const status = bot.getStatus();
    res.json({
      success: true,
      status: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// 🔗 GENERATE QR CODE (Link WhatsApp)
// =============================================
router.post('/link', authenticate, requireAdmin, async (req, res) => {
  try {
    console.log('🔗 Admin requested QR code...');
    
    const qrCode = await bot.generateNewQR();
    
    if (qrCode) {
      const qrImage = await QRCode.toDataURL(qrCode);
      res.json({
        success: true,
        message: 'QR code generated. Scan with WhatsApp to link.',
        qrCode: qrImage,
        qrCodeText: qrCode,
        instructions: '1. Open WhatsApp on your phone\n2. Tap Settings → Linked Devices\n3. Tap "Link a Device"\n4. Scan this QR code',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to generate QR code. Please try again.',
        qrCode: null
      });
    }
  } catch (error) {
    console.error('❌ QR generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// 🔌 DISCONNECT BOT (Unlink WhatsApp)
// =============================================
router.post('/unlink', authenticate, requireAdmin, async (req, res) => {
  try {
    const { force } = req.body;
    
    if (!force) {
      return res.status(400).json({
        success: false,
        message: 'Confirmation required. Set force: true to unlink.'
      });
    }
    
    const result = await bot.disconnect();
    
    if (result) {
      res.json({
        success: true,
        message: 'WhatsApp bot disconnected successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to disconnect bot'
      });
    }
  } catch (error) {
    console.error('❌ Unlink error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// 📝 SET DEFAULT GROUP ID
// =============================================
router.post('/group', authenticate, requireAdmin, async (req, res) => {
  try {
    const { groupId } = req.body;
    
    if (!groupId) {
      return res.status(400).json({ error: 'Group ID is required' });
    }

    if (!groupId.endsWith('@g.us')) {
      return res.status(400).json({ 
        error: 'Invalid group ID format. Should end with @g.us' 
      });
    }

    const updated = await bot.setGroupId(groupId);
    
    res.json({
      success: true,
      message: `Default Group ID updated to: ${groupId}`,
      groupId: updated,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Set group error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// 📋 GET ALL GROUPS (with rate limit protection)
// =============================================
let lastGroupFetch = 0;
const FETCH_COOLDOWN = 60000; // 1 minute minimum between API calls

router.get('/groups', authenticate, requireAdmin, async (req, res) => {
  try {
    const now = Date.now();
    const timeSinceLastFetch = now - lastGroupFetch;
    
    if (timeSinceLastFetch < FETCH_COOLDOWN && bot.groupsCache) {
      console.log(`⏳ Rate limit: Returning cached groups (${Math.round(timeSinceLastFetch/1000)}s since last fetch)`);
      const stats = await bot.getGroupStats();
      return res.json({
        success: true,
        groups: bot.groupsCache,
        stats: stats,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }
    
    lastGroupFetch = now;
    const groups = await bot.getGroupsWithStatus();
    const stats = await bot.getGroupStats();
    
    res.json({
      success: true,
      groups: groups,
      stats: stats,
      cached: false,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Get groups error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// ➕ ACTIVATE GROUP (Database Persisted)
// =============================================
router.post('/groups/activate', authenticate, requireAdmin, async (req, res) => {
  try {
    const { groupId } = req.body;
    
    if (!groupId) {
      return res.status(400).json({ error: 'Group ID is required' });
    }
    
    const result = await bot.addActiveGroup(groupId);
    bot.groupsCache = null;
    bot.groupsCacheTime = null;
    
    if (result) {
      const stats = await bot.getGroupStats();
      res.json({
        success: true,
        message: `Group activated successfully: ${groupId}`,
        activeGroups: stats.activeGroups,
        activeGroupIds: stats.activeGroupIds,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to activate group. Bot may not be a member.'
      });
    }
  } catch (error) {
    console.error('❌ Activate group error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// ➖ DEACTIVATE GROUP (Database Persisted)
// =============================================
router.post('/groups/deactivate', authenticate, requireAdmin, async (req, res) => {
  try {
    const { groupId } = req.body;
    
    if (!groupId) {
      return res.status(400).json({ error: 'Group ID is required' });
    }
    
    await bot.removeActiveGroup(groupId);
    bot.groupsCache = null;
    bot.groupsCacheTime = null;
    
    const stats = await bot.getGroupStats();
    
    res.json({
      success: true,
      message: `Group deactivated: ${groupId}`,
      activeGroups: stats.activeGroups,
      activeGroupIds: stats.activeGroupIds,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Deactivate group error:', error);
    res.status(500).json({ error: error.message });
  }
});



// =============================================
// 📋 GET GROUP MEMBERS
// =============================================
router.get('/groups/:groupId/members', authenticate, requireAdmin, async (req, res) => {
  try {
    const { groupId } = req.params;
    
    if (!groupId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Group ID is required' 
      });
    }
    
    console.log(`📋 Fetching members for group: ${groupId}`);
    
    const members = await bot.getGroupMembers(groupId);
    
    res.json({
      success: true,
      members: members,
      count: members.length,
      groupId: groupId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Get members error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// =============================================
// 📋 GET MESSAGE HISTORY
// =============================================
router.get('/messages', authenticate, requireAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0, type, search } = req.query;
    
    const where = {};
    if (type && type !== 'all') where.type = type;
    if (search) {
      where.message = { contains: search, mode: 'insensitive' };
    }
    
    const [messages, total] = await Promise.all([
      prisma.whatsAppMessage.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.whatsAppMessage.count({ where })
    ]);
    
    res.json({
      success: true,
      messages,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('❌ Get messages error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// ✏️ EDIT MESSAGE (Within 15 minutes)
// =============================================
router.put('/messages/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message content is required' });
    }
    
    const existing = await prisma.whatsAppMessage.findUnique({
      where: { id }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (new Date(existing.sentAt) < fifteenMinutesAgo) {
      return res.status(400).json({ 
        error: 'Cannot edit message older than 15 minutes' 
      });
    }
    
    if (existing.messageId && existing.groupId) {
      try {
        await bot.editMessage(existing.groupId, existing.messageId, message);
      } catch (editError) {
        console.error('❌ WhatsApp edit error:', editError);
      }
    }
    
    const updated = await prisma.whatsAppMessage.update({
      where: { id },
      data: {
        message: message,
        originalMessage: existing.message,
        status: 'edited',
        editedAt: new Date()
      }
    });
    
    res.json({
      success: true,
      message: 'Message updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('❌ Edit message error:', error);
    res.status(500).json({ error: error.message });
  }
});


// =============================================
// 📤 BULK EDIT MESSAGES
// =============================================
router.put('/messages/bulk-edit', authenticate, requireAdmin, async (req, res) => {
  try {
    const { broadcastIds, message } = req.body;
    
    if (!broadcastIds || !broadcastIds.length) {
      return res.status(400).json({ error: 'No broadcasts selected' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    let updated = 0;
    for (const broadcastId of broadcastIds) {
      // Find all messages with this broadcastId
      const messages = await prisma.whatsAppMessage.findMany({
        where: { 
          OR: [
            { id: broadcastId },
            { broadcastId: broadcastId }
          ]
        }
      });

      for (const msg of messages) {
        // Update each message in WhatsApp and database
        if (msg.messageId && msg.groupId) {
          try {
            await bot.editMessage(msg.groupId, msg.messageId, message);
          } catch (e) {
            console.error('WhatsApp edit error:', e);
          }
        }
        await prisma.whatsAppMessage.update({
          where: { id: msg.id },
          data: {
            message: message,
            originalMessage: msg.message,
            status: 'edited',
            editedAt: new Date()
          }
        });
        updated++;
      }
    }

    res.json({
      success: true,
      message: `Updated ${updated} messages across ${broadcastIds.length} broadcasts`,
      updated
    });
  } catch (error) {
    console.error('❌ Bulk edit error:', error);
    res.status(500).json({ error: error.message });
  }
});


// =============================================
// 🗑️ DELETE ALL MESSAGES
// =============================================
router.delete('/messages/clear-all', authenticate, requireAdmin, async (req, res) => {
  try {
    const { confirm } = req.body;
    
    // Require confirmation to prevent accidental deletion
    if (confirm !== 'DELETE_ALL') {
      return res.status(400).json({
        success: false,
        error: 'Confirmation required. Send confirm: "DELETE_ALL" to proceed.'
      });
    }

    // Get count before deletion
    const count = await prisma.whatsAppMessage.count();
    
    // Delete all messages
    await prisma.whatsAppMessage.deleteMany({});
    
    // Also delete any broadcast records if they exist
    await prisma.whatsAppBroadcast?.deleteMany({});
    
    res.json({
      success: true,
      message: `Successfully deleted ${count} messages from history`,
      deletedCount: count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Clear all messages error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});


// =============================================
// 🗑️ CLEAR BROADCASTS ONLY
// =============================================
router.delete('/messages/clear-broadcasts', authenticate, requireAdmin, async (req, res) => {
  try {
    const { confirm } = req.body;
    
    if (confirm !== 'DELETE_ALL') {
      return res.status(400).json({
        success: false,
        error: 'Confirmation required. Send confirm: "DELETE_ALL" to proceed.'
      });
    }

    const count = await prisma.whatsAppMessage.count({
      where: { 
        type: { in: ['broadcast', 'broadcast_group'] }
      }
    });
    
    await prisma.whatsAppMessage.deleteMany({
      where: { 
        type: { in: ['broadcast', 'broadcast_group'] }
      }
    });
    
    res.json({
      success: true,
      message: `Successfully deleted ${count} broadcast messages`,
      deletedCount: count
    });
  } catch (error) {
    console.error('❌ Clear broadcasts error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================================
// 🗑️ CLEAR NORMAL MESSAGES ONLY
// =============================================
router.delete('/messages/clear-messages', authenticate, requireAdmin, async (req, res) => {
  try {
    const { confirm } = req.body;
    
    if (confirm !== 'DELETE_ALL') {
      return res.status(400).json({
        success: false,
        error: 'Confirmation required. Send confirm: "DELETE_ALL" to proceed.'
      });
    }

    const count = await prisma.whatsAppMessage.count({
      where: { 
        type: { notIn: ['broadcast', 'broadcast_group'] }
      }
    });
    
    await prisma.whatsAppMessage.deleteMany({
      where: { 
        type: { notIn: ['broadcast', 'broadcast_group'] }
      }
    });
    
    res.json({
      success: true,
      message: `Successfully deleted ${count} normal messages`,
      deletedCount: count
    });
  } catch (error) {
    console.error('❌ Clear messages error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================================
// 🗑️ BULK DELETE MESSAGES
// =============================================
router.delete('/messages/bulk-delete', authenticate, requireAdmin, async (req, res) => {
  try {
    const { broadcastIds, permanent } = req.body;
    
    if (!broadcastIds || !broadcastIds.length) {
      return res.status(400).json({ error: 'No broadcasts selected' });
    }

    let deleted = 0;
    for (const broadcastId of broadcastIds) {
      const messages = await prisma.whatsAppMessage.findMany({
        where: { 
          OR: [
            { id: broadcastId },
            { broadcastId: broadcastId }
          ]
        }
      });

      for (const msg of messages) {
        if (permanent) {
          await prisma.whatsAppMessage.delete({ where: { id: msg.id } });
        } else {
          await prisma.whatsAppMessage.update({
            where: { id: msg.id },
            data: { status: 'deleted' }
          });
        }
        deleted++;
      }
    }

    res.json({
      success: true,
      message: `${permanent ? 'Permanently deleted' : 'Soft deleted'} ${deleted} messages from ${broadcastIds.length} broadcasts`,
      deleted
    });
  } catch (error) {
    console.error('❌ Bulk delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// 🗑️ DELETE MESSAGE
// =============================================
router.delete('/messages/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;
    
    const existing = await prisma.whatsAppMessage.findUnique({
      where: { id }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    if (permanent === 'true') {
      await prisma.whatsAppMessage.delete({ where: { id } });
      res.json({ success: true, message: 'Message permanently deleted' });
    } else {
      await prisma.whatsAppMessage.update({
        where: { id },
        data: { status: 'deleted' }
      });
      res.json({ success: true, message: 'Message soft deleted' });
    }
  } catch (error) {
    console.error('❌ Delete message error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// 📊 MESSAGE STATS
// =============================================
router.get('/messages/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const total = await prisma.whatsAppMessage.count();
    
    const byType = await prisma.whatsAppMessage.groupBy({
      by: ['type'],
      _count: true
    });
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const last7DaysRaw = await prisma.whatsAppMessage.findMany({
      where: {
        sentAt: { gte: sevenDaysAgo }
      },
      select: {
        sentAt: true
      },
      orderBy: {
        sentAt: 'desc'
      }
    });
    
    const dayMap = {};
    last7DaysRaw.forEach(msg => {
      const date = msg.sentAt.toISOString().split('T')[0];
      dayMap[date] = (dayMap[date] || 0) + 1;
    });
    
    const last7Days = Object.keys(dayMap).map(date => ({
      date: date,
      count: dayMap[date]
    })).sort((a, b) => b.date.localeCompare(a.date));
    
    res.json({
      success: true,
      stats: {
        total,
        byType: byType.map(item => ({
          type: item.type,
          count: item._count
        })),
        last7Days
      }
    });
  } catch (error) {
    console.error('❌ Message stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// =============================================
// 📊 GET GROUP STATS
// =============================================
router.get('/groups/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const stats = await bot.getGroupStats();
    res.json({
      success: true,
      stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// 📤 SEND TO GROUP (by ID or Name)
// =============================================
router.post('/send', authenticate, requireAdmin, async (req, res) => {
  try {
    const { groupId, groupName, message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    let result;
    if (groupId) {
      result = await bot.sendToSpecificGroup(groupId, message);
    } else if (groupName) {
      result = await bot.sendToGroupByName(groupName, message);
    } else {
      return res.status(400).json({ 
        error: 'Either groupId or groupName is required' 
      });
    }
    
    if (result) {
      res.json({
        success: true,
        message: 'Message sent successfully',
        groupId: groupId || groupName,
        result: result,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to send message. Check group ID/name.'
      });
    }
  } catch (error) {
    console.error('❌ Send error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// 📤 BROADCAST TO ALL ACTIVE GROUPS
// =============================================
router.post('/broadcast-all', authenticate, requireAdmin, async (req, res) => {
  try {
    const { message, excludeGroups } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const results = await bot.broadcastToAllGroups(message, excludeGroups || []);
    
    res.json({
      success: true,
      results: results,
      summary: {
        total: results.length,
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Broadcast error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// 📤 SEND TO JUMUIA GROUP
// =============================================
router.post('/send-jumuia', authenticate, requireAdmin, async (req, res) => {
  try {
    const { jumuiaName, message } = req.body;
    
    if (!jumuiaName || !message) {
      return res.status(400).json({ 
        error: 'jumuiaName and message are required' 
      });
    }
    
    const result = await bot.sendToJumuia(jumuiaName, message);
    
    if (result) {
      res.json({
        success: true,
        message: `Message sent to ${jumuiaName} Jumuia`,
        jumuiaName: jumuiaName,
        result: result,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        message: `Failed to send to ${jumuiaName} Jumuia`
      });
    }
  } catch (error) {
    console.error('❌ Send Jumuia error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// 📤 SEND TEST TO DEFAULT GROUP
// =============================================
router.post('/test-group', authenticate, requireAdmin, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await bot.sendToGroup(message);
    
    if (result) {
      res.json({
        success: true,
        message: 'Test message sent to default group',
        result: result,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test message. Bot may not be connected.'
      });
    }
  } catch (error) {
    console.error('❌ Test group error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// 🧹 RESET BOT
// =============================================
router.post('/reset', authenticate, requireAdmin, async (req, res) => {
  try {
    const { force } = req.body;
    
    if (!force) {
      return res.status(400).json({
        success: false,
        message: 'Confirmation required. Set force: true to reset.'
      });
    }
    
    const result = await bot.resetBot();
    
    if (result) {
      res.json({
        success: true,
        message: 'WhatsApp bot reset successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to reset bot'
      });
    }
  } catch (error) {
    console.error('❌ Reset error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// 🔄 REFRESH GROUPS
// =============================================
router.post('/groups/refresh', authenticate, requireAdmin, async (req, res) => {
  try {
    const groups = await bot.refreshGroups();
    res.json({
      success: true,
      message: 'Groups refreshed successfully',
      groups: groups,
      total: groups.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Refresh groups error:', error);
    res.status(500).json({ error: error.message });
  }
});

console.log('✅ WhatsApp Admin routes loaded');

module.exports = router;