const express = require('express');
const router = express.Router();
const { handleBrevoWebhook } = require('../services/webhookHandler');

/**
 * Brevo Webhook Endpoint
 * Receives real-time events from Brevo
 * Always returns 200 to acknowledge receipt
 */
router.post('/brevo', async (req, res) => {
  try {
    console.log('📨 Webhook received from Brevo');
    console.log('📦 Payload:', JSON.stringify(req.body, null, 2));
    
    // Process webhook in background (don't block response)
    setImmediate(async () => {
      await handleBrevoWebhook(req.body);
    });
    
    // Always respond with 200 to Brevo
    res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('❌ Webhook route error:', error);
    // Still return 200 so Brevo doesn't retry
    res.status(200).json({ success: false, error: error.message });
  }
});

/**
 * Test webhook endpoint - for manual testing
 */
router.post('/brevo/test', express.json(), async (req, res) => {
  try {
    const testPayload = {
      event: "opened",
      email: "test@example.com",
      "message-id": "test-123",
      date: new Date().toISOString(),
      subject: "Test email from Brevo",
      ts: Math.floor(Date.now() / 1000),
      tag: "test_tag",
      link: "https://example.com"
    };
    
    const result = await handleBrevoWebhook(testPayload);
    res.json({ 
      success: true, 
      result,
      message: "Test webhook processed"
    });
  } catch (error) {
    console.error('❌ Test webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get webhook logs (for debugging)
 */
router.get('/brevo/logs', async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const { limit = 20, email, eventType } = req.query;
    
    const where = {};
    if (email) where.email = { contains: email, mode: 'insensitive' };
    if (eventType) where.eventType = eventType;
    
    const logs = await prisma.emailWebhookLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });
    
    res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    console.error('Error fetching webhook logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;