// routes/whatsapp.bot.routes.js
const express = require('express');
const router = express.Router();
const bot = require('../services/whatsapp.bot');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

// ==================== MIDDLEWARE ====================

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'zuca_super_secret_key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

async function requireAdmin(req, res, next) {
  if (req.user.role === 'admin' || req.user.specialRole === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Admin only' });
  }
}

// ==================== ROUTES ====================

// 📊 Get bot status (Admin only)
router.get('/status', authenticate, requireAdmin, async (req, res) => {
  try {
    const status = bot.getStatus();
    
    // Get additional info from Setting model
    const configs = await prisma.setting.findMany({
      where: {
        key: {
          in: ['whatsapp_group_id', 'whatsapp_status', 'bot_name']
        }
      }
    });
    
    const configMap = {};
    configs.forEach(c => {
      configMap[c.key] = c.value;
    });
    
    res.json({
      success: true,
      ...status,
      config: configMap,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔗 Link/Connect WhatsApp (Admin only)
router.post('/link', authenticate, requireAdmin, async (req, res) => {
  try {
    // If already connected, disconnect first
    if (bot.isConnected) {
      await bot.disconnect();
    }
    
    // Start connection
    await bot.connect();
    
    // Wait a bit for QR to generate
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const status = bot.getStatus();
    
    res.json({
      success: true,
      message: 'WhatsApp linking initiated',
      status: status,
      qrCode: status.qrCode
    });
  } catch (error) {
    console.error('❌ Link error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🔗 Get QR Code (Admin only)
router.get('/qr', authenticate, requireAdmin, async (req, res) => {
  try {
    const status = bot.getStatus();
    
    if (!status.qrCode) {
      return res.status(404).json({ 
        error: 'QR Code not available. Please initiate linking first.',
        status: status.connectionStatus
      });
    }
    
    res.json({
      success: true,
      qrCode: status.qrCode,
      status: status.connectionStatus,
      expiresIn: 120 // seconds
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔌 Unlink/Disconnect WhatsApp (Admin only)
router.post('/unlink', authenticate, requireAdmin, async (req, res) => {
  try {
    // Clean up everything
    await bot.cleanup();
    
    // Clear status from database
    await prisma.setting.deleteMany({
      where: { key: 'whatsapp_status' }
    });
    
    res.json({
      success: true,
      message: 'WhatsApp unlinked successfully'
    });
  } catch (error) {
    console.error('❌ Unlink error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 📱 Set Group ID (Admin only)
router.post('/set-group', authenticate, requireAdmin, async (req, res) => {
  try {
    const { groupId } = req.body;
    
    if (!groupId) {
      return res.status(400).json({ error: 'Group ID is required' });
    }
    
    // Validate format
    let cleanGroupId = groupId;
    if (!cleanGroupId.includes('@g.us')) {
      cleanGroupId = cleanGroupId.replace(/[^0-9]/g, '') + '@g.us';
    }
    
    const result = await bot.setGroupId(cleanGroupId);
    
    res.json({
      success: true,
      message: 'Group ID set successfully',
      groupId: cleanGroupId
    });
  } catch (error) {
    console.error('❌ Set group error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 📱 Get Group ID (Admin only)
router.get('/get-group', authenticate, requireAdmin, async (req, res) => {
  try {
    const groupId = await bot.getGroupId();
    
    res.json({
      success: true,
      groupId: groupId || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📤 Send message to group (Admin only)
router.post('/send-to-group', authenticate, requireAdmin, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await bot.sendToGroup(message);
    
    res.json({
      success: true,
      message: 'Message sent to group',
      result
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 📤 Send contribution list to group (Admin only)
router.post('/contribution-list/:campaignId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const result = await bot.sendContributionList(campaignId);
    
    res.json({
      success: true,
      message: 'Contribution list sent to group',
      result
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 📤 Broadcast to all users (Admin only)
router.post('/broadcast', authenticate, requireAdmin, async (req, res) => {
  try {
    const { title, message } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const users = await prisma.$queryRaw`
      SELECT phone, "fullName" FROM "User" 
      WHERE phone IS NOT NULL AND phone != ''
    `;

    if (users.length === 0) {
      return res.json({
        success: true,
        message: 'No users with phone numbers found',
        sent: 0
      });
    }

    const formattedMessage = `📢 *${title}*\n\n${message}\n\n_Tumsifu Y! 🙏_`;
    
    let sent = 0;
    const failed = [];
    
    for (const user of users) {
      try {
        await bot.sendToUser(user.phone, formattedMessage);
        sent++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to send to ${user.fullName}:`, error.message);
        failed.push({
          phone: user.phone,
          name: user.fullName,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      message: `Sent to ${sent} users`,
      total: users.length,
      failed: failed.length,
      failedDetails: failed.slice(0, 10)
    });
  } catch (error) {
    console.error('❌ Broadcast error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 📤 Send to specific user (Admin only)
router.post('/send-to-user', authenticate, requireAdmin, async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }

    const result = await bot.sendToUser(phoneNumber, message);
    
    res.json({
      success: true,
      message: `Message sent to ${phoneNumber}`,
      result
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// 🤖 WhatsApp AI Webhook (Admin only)
// =============================================
router.post('/ai', authenticate, requireAdmin, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Get the AI service
    const { chatWithGroq } = require('../services/deepseek/deepseekClient');
    const { executeToolCall } = require('../services/deepseek/toolHandlers');
    
    const userContext = {
      user: null,
      stats: {},
      currentTime: new Date().toISOString(),
      source: 'whatsapp'
    };
    
    const messages = [{ role: 'user', content: message }];
    const aiResponse = await chatWithGroq(messages, userContext);
    
    let finalReply = aiResponse.content || '';
    
    if (aiResponse.action) {
      const actionResult = await executeToolCall(
        aiResponse.action.name,
        aiResponse.action.arguments || {},
        { user: null, req: null }
      );
      
      if (actionResult) {
        if (actionResult.error) {
          finalReply = `❌ ${actionResult.error}`;
        } else if (actionResult.message) {
          finalReply = actionResult.message;
        } else {
          finalReply = JSON.stringify(actionResult, null, 2);
        }
      }
    }
    
    if (!finalReply.includes('Tumsifu Yesu Kristu')) {
      finalReply += '\n\n__';
    }
    
    res.json({ 
      success: true, 
      reply: finalReply 
    });
    
  } catch (error) {
    console.error('WhatsApp AI error:', error);
    res.status(500).json({ 
      error: error.message,
      reply: '🙏'
    });
  }
});

console.log('✅ WhatsApp Bot Admin Routes loaded');

module.exports = router;