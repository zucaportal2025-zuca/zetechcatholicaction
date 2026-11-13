const express = require('express');
const router = express.Router();
const bot = require('../services/whatsapp.bot');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'zuca_super_secret_key');
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

router.get('/chats', authenticate, async (req, res) => {
  try {
    let chatList = [];
    
    const groups = await prisma.whatsAppGroup.findMany();
    groups.forEach(g => {
      chatList.push({
        chatId: g.groupId,
        name: g.groupName || "WhatsApp Group",
        lastMessage: "Group Chat",
        timestamp: new Date(0),
        isGroup: true
      });
    });

    const recentChats = await prisma.chatHistory.groupBy({
      by: ['chatId'],
      _max: { timestamp: true },
    });

    for (const rc of recentChats) {
      const lastMsg = await prisma.chatHistory.findFirst({
        where: { chatId: rc.chatId },
        orderBy: { timestamp: 'desc' }
      });
      
      const existingIndex = chatList.findIndex(c => c.chatId === rc.chatId);
      
      if (existingIndex > -1) {
        chatList[existingIndex].lastMessage = lastMsg.text;
        chatList[existingIndex].timestamp = rc._max.timestamp;
      } else {
        let displayName = rc.chatId.split('@')[0];
        
        if (!rc.chatId.includes('@g.us') && !lastMsg.isFromMe) {
          displayName = lastMsg.senderName || displayName;
        }

        chatList.push({
          chatId: rc.chatId,
          name: displayName,
          lastMessage: lastMsg.text,
          timestamp: rc._max.timestamp,
          isGroup: rc.chatId.includes('@g.us')
        });
      }
    }

    chatList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json({ success: true, chats: chatList });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/chats/:chatId/messages', authenticate, async (req, res) => {
  try {
    const messages = await prisma.chatHistory.findMany({
      where: { chatId: req.params.chatId },
      orderBy: { timestamp: 'asc' },
      take: 100
    });
    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/chats/:chatId/send', authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { message } = req.body;

    if (!bot.isConnected) {
      return res.status(503).json({ error: 'WhatsApp bot is currently offline. Check connection.' });
    }

    let result;
    if (chatId.includes('@g.us')) {
      result = await bot.sendToSpecificGroup(chatId, message);
    } else {
      result = await bot.sendToUser(chatId, message);
    }

    await prisma.chatHistory.create({
      data: {
        chatId: chatId,
        senderName: 'Admin',
        senderJid: bot.botNumber ? bot.botNumber + '@s.whatsapp.net' : 'admin',
        text: message,
        isFromMe: true
      }
    });

    res.json({ success: true, result });
  } catch (error) {
    console.error("❌ Send error:", error);
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
});

router.post('/new-chat', authenticate, async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    let clean = phoneNumber.replace(/\D/g, '');
    if (clean.startsWith('0')) clean = '254' + clean.slice(1);
    else if (!clean.startsWith('254') && clean.length === 9) clean = '254' + clean;
    
    const chatId = `${clean}@s.whatsapp.net`;
    res.json({ success: true, chatId, name: clean });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;