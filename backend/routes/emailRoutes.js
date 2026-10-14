const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getAggregatedStats } = require('../services/brevoService');

/**
 * Get email dashboard stats
 * Combines local webhook logs + Brevo API data
 */
router.get('/dashboard/stats', async (req, res) => {
  try {
    // Get stats from local database
    const [totalLogs, delivered, opened, clicked, bounced, errors] = await Promise.all([
      prisma.emailWebhookLog.count(),
      prisma.emailWebhookLog.count({ where: { eventType: 'delivered' } }),
      prisma.emailWebhookLog.count({ where: { eventType: 'opened' } }),
      prisma.emailWebhookLog.count({ where: { eventType: 'clicked' } }),
      prisma.emailWebhookLog.count({ where: { eventType: { in: ['hard_bounce', 'soft_bounce'] } } }),
      prisma.emailWebhookLog.count({ where: { eventType: 'error' } })
    ]);

    // Get recent activity
    const recentActivity = await prisma.emailWebhookLog.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
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

    // Get Brevo stats (optional - if you want real-time from Brevo)
    let brevoStats = {};
    try {
      brevoStats = await getAggregatedStats({ limit: 100 });
    } catch (error) {
      console.log('Could not fetch Brevo stats:', error.message);
    }

    res.json({
      success: true,
      stats: {
        total: totalLogs,
        delivered,
        opened,
        clicked,
        bounced,
        errors,
        openRate: totalLogs > 0 ? Math.round((opened / totalLogs) * 100) : 0,
        deliveryRate: totalLogs > 0 ? Math.round((delivered / totalLogs) * 100) : 0
      },
      recentActivity: recentActivity.map(log => ({
        id: log.id,
        eventType: log.eventType,
        email: log.email,
        subject: log.subject,
        userName: log.user?.fullName || 'Unknown',
        createdAt: log.createdAt
      })),
      brevoStats
    });

  } catch (error) {
    console.error('Error fetching email stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get email history for a specific user
 */
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;

    const logs = await prisma.emailWebhookLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    res.json({
      success: true,
      count: logs.length,
      logs
    });

  } catch (error) {
    console.error('Error fetching user email history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get user's email subscription status from Brevo
 */
router.get('/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, fullName: true }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Get status from Brevo
    const { getContactStatus } = require('../services/brevoService');
    const status = await getContactStatus(user.email);

    res.json({
      success: true,
      user: {
        id: userId,
        email: user.email,
        fullName: user.fullName
      },
      status
    });

  } catch (error) {
    console.error('Error fetching user status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Re-subscribe a user (unlock them)
 */
router.post('/resubscribe/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, fullName: true }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Re-subscribe in Brevo
    const { resubscribeContact } = require('../services/brevoService');
    const result = await resubscribeContact(user.email);

    res.json({
      success: true,
      message: `User ${user.fullName} (${user.email}) has been re-subscribed!`,
      result
    });

  } catch (error) {
    console.error('Error re-subscribing user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;