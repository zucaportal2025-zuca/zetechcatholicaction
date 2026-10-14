const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ==================== GET ALL EMAIL SETTINGS ====================
router.get('/settings', authenticate, requireAdmin, async (req, res) => {
  try {
    const settings = await prisma.emailSetting.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });

    // Group by category
    const grouped = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push(setting);
      return acc;
    }, {});

    res.json({
      success: true,
      settings: grouped,
      all: settings
    });

  } catch (error) {
    console.error('Error fetching email settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== UPDATE SINGLE EMAIL SETTING ====================
router.put('/settings/:type', authenticate, requireAdmin, async (req, res) => {
  try {
    const { type } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }

    // Check if setting exists
    let setting = await prisma.emailSetting.findUnique({
      where: { type: type }
    });

    if (setting) {
      setting = await prisma.emailSetting.update({
        where: { type: type },
        data: { 
          enabled: enabled,
          updatedAt: new Date()
        }
      });
    } else {
      // Create new setting if it doesn't exist
      setting = await prisma.emailSetting.create({
        data: {
          type: type,
          category: 'general',
          name: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          description: `Email setting for ${type}`,
          enabled: enabled
        }
      });
    }

    console.log(`📧 Email setting ${type} ${enabled ? 'enabled' : 'disabled'} by admin`);

    res.json({
      success: true,
      message: `Email setting ${type} ${enabled ? 'enabled' : 'disabled'} successfully`,
      setting
    });

  } catch (error) {
    console.error('Error updating email setting:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== UPDATE MULTIPLE EMAIL SETTINGS ====================
router.put('/settings/bulk', authenticate, requireAdmin, async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || !Array.isArray(settings)) {
      return res.status(400).json({ error: 'settings array required' });
    }

    const results = [];
    for (const setting of settings) {
      const { type, enabled } = setting;
      if (!type || typeof enabled !== 'boolean') {
        continue;
      }

      let updated = await prisma.emailSetting.findUnique({
        where: { type: type }
      });

      if (updated) {
        updated = await prisma.emailSetting.update({
          where: { type: type },
          data: { 
            enabled: enabled,
            updatedAt: new Date()
          }
        });
      } else {
        updated = await prisma.emailSetting.create({
          data: {
            type: type,
            category: 'general',
            name: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            description: `Email setting for ${type}`,
            enabled: enabled
          }
        });
      }
      results.push(updated);
    }

    console.log(`📧 Bulk email settings updated by admin`);

    res.json({
      success: true,
      message: `${results.length} settings updated successfully`,
      settings: results
    });

  } catch (error) {
    console.error('Error updating email settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== GET EMAIL STATISTICS ====================
router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    // Get all email settings
    const settings = await prisma.emailSetting.findMany();

    // Get notification counts by type
    const notifications = await prisma.notification.groupBy({
      by: ['type'],
      _count: {
        type: true
      }
    });

    // Create stats map
    const statsMap = {};
    notifications.forEach(n => {
      statsMap[n.type] = n._count.type;
    });

    // Combine with settings
    const stats = settings.map(setting => ({
      ...setting,
      total_sent: statsMap[setting.type] || 0,
      last_30_days: 0,
      last_7_days: 0
    }));

    const totalEmails = await prisma.notification.count();

    res.json({
      success: true,
      stats: stats,
      overall: {
        total_emails: totalEmails,
        last_30_days: 0,
        last_7_days: 0,
        today: 0
      }
    });

  } catch (error) {
    console.error('Error fetching email stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== RESET ALL SETTINGS TO DEFAULT ====================
router.post('/settings/reset', authenticate, requireAdmin, async (req, res) => {
  try {
    // Reset all to enabled
    await prisma.emailSetting.updateMany({
      data: { 
        enabled: true,
        updatedAt: new Date()
      }
    });

    console.log(`📧 All email settings reset to default by admin`);

    res.json({
      success: true,
      message: 'All email settings reset to default (enabled)'
    });

  } catch (error) {
    console.error('Error resetting email settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== GET CATEGORIES ====================
router.get('/categories', authenticate, requireAdmin, async (req, res) => {
  try {
    // Get distinct categories
    const settings = await prisma.emailSetting.findMany({
      select: {
        category: true
      },
      distinct: ['category']
    });

    // Get count per category
    const categoriesWithCount = await Promise.all(
      settings.map(async (s) => {
        const count = await prisma.emailSetting.count({
          where: { category: s.category }
        });
        return {
          category: s.category,
          _count: { category: count }
        };
      })
    );

    res.json({
      success: true,
      categories: categoriesWithCount
    });

  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== TOGGLE CATEGORY ====================
router.put('/categories/:category/toggle', authenticate, requireAdmin, async (req, res) => {
  try {
    const { category } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }

    const updated = await prisma.emailSetting.updateMany({
      where: { category: category },
      data: { 
        enabled: enabled,
        updatedAt: new Date()
      }
    });

    console.log(`📧 Category ${category} ${enabled ? 'enabled' : 'disabled'} by admin`);

    res.json({
      success: true,
      message: `${updated.count} settings in category ${category} ${enabled ? 'enabled' : 'disabled'}`,
      count: updated.count
    });

  } catch (error) {
    console.error('Error toggling category:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;