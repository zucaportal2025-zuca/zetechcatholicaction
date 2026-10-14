// routes/ai.routes.js
const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { chatWithGroq } = require('../services/deepseek/deepseekClient');

// =============================================
// 🤖 AI MESSAGE POLISHING - Allow Admin & Choir Moderator
// =============================================

// Middleware to check if user is admin OR choir moderator
const isAdminOrChoirModerator = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const role = req.user.specialRole || req.user.role;
  
  if (role === "admin" || role === "choir_moderator") {
    return next();
  }

  return res.status(403).json({ error: "Access denied. Admin or Choir Moderator only." });
};

router.post('/polish-message', authenticate, isAdminOrChoirModerator, async (req, res) => {
  try {
    const { message, tone, type } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Message is required' 
      });
    }

    // Build the system prompt based on type and tone
    const toneDescriptions = {
      professional: 'formal, respectful, and well-structured',
      friendly: 'warm, approachable, and conversational',
      warm: 'caring, pastoral, and encouraging',
      urgent: 'clear, direct, and action-oriented'
    };

    const typeDescriptions = {
      polish: 'improve the grammar, clarity, and flow',
      formal: 'make it more formal and official',
      casual: 'make it more relaxed and conversational',
      announcement: 'format as a church announcement with a clear call to action',
      prayer: 'craft as a prayer or blessing with reverence'
    };

    const systemPrompt = `You are an expert communications assistant for ZUCA (Zimbabwe United Catholic Association).

Your task is to ${typeDescriptions[type] || 'polish'} the user's message with a ${toneDescriptions[tone] || 'professional'} tone.

IMPORTANT RULES:
1. Keep the original meaning and intent
2. Use proper grammar and punctuation
3. Be clear and concise
4. Add appropriate emojis if they enhance the message (max 3)
5. Keep it under 1000 characters
6. For announcements: include a clear subject line and call to action
7. For prayers: use reverent language


Return ONLY the polished message, no explanations or additional text.`;

    const response = await chatWithGroq([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ], { user: req.user });

    const polished = response.content || message;

    res.json({
      success: true,
      original: message,
      polished: polished,
      tone: tone,
      type: type,
      wordCount: {
        original: message.split(/\s+/).length,
        polished: polished.split(/\s+/).length
      }
    });
  } catch (error) {
    console.error('❌ AI polish error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to polish message' 
    });
  }
});

module.exports = router;