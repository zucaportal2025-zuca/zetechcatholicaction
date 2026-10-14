const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

// ============================================
// GET COUNTDOWN SETTINGS (Public)
// ============================================
router.get('/countdown-settings', async (req, res) => {
  try {
    // Get the first countdown setting (there should only be one)
    let settings = await prisma.countdownSetting.findFirst();

    // If no settings exist, create default
    if (!settings) {
      settings = await prisma.countdownSetting.create({
        data: {
          targetDate: new Date('2026-12-25T00:00:00'),
          title: 'CHRISTMAS CELEBRATION',
          subtitle: 'JOIN US FOR THE BIRTHDAY OF JESUS CHRIST',
          icon: '🎄',
          isActive: false,
          eventColor: '#10b981'
        }
      });
    }

    res.json({
      success: true,
      settings: {
        id: settings.id,
        targetDate: settings.targetDate,
        title: settings.title,
        subtitle: settings.subtitle,
        icon: settings.icon,
        isActive: settings.isActive,
        eventColor: settings.eventColor,
        updatedAt: settings.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching countdown settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch countdown settings'
    });
  }
});

// ============================================
// UPDATE COUNTDOWN SETTINGS (Admin only)
// ============================================
router.put('/admin/countdown-settings', async (req, res) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - No token provided'
      });
    }

    // Verify token and check admin role
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Invalid token'
      });
    }

    // Check if user is admin
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden - Admin access required'
      });
    }

    // Get the request body
    const { targetDate, title, subtitle, icon, isActive, eventColor } = req.body;

    // Get existing settings or create new one
    let settings = await prisma.countdownSetting.findFirst();

    if (!settings) {
      // Create new settings
      settings = await prisma.countdownSetting.create({
        data: {
          targetDate: targetDate ? new Date(targetDate) : new Date('2026-12-25T00:00:00'),
          title: title || 'CHRISTMAS CELEBRATION',
          subtitle: subtitle || null,
          icon: icon || '🎄',
          isActive: isActive !== undefined ? isActive : false,
          eventColor: eventColor || '#10b981',
          createdBy: decoded.id
        }
      });
    } else {
      // Update existing settings
      settings = await prisma.countdownSetting.update({
        where: { id: settings.id },
        data: {
          targetDate: targetDate ? new Date(targetDate) : settings.targetDate,
          title: title || settings.title,
          subtitle: subtitle !== undefined ? subtitle : settings.subtitle,
          icon: icon || settings.icon,
          isActive: isActive !== undefined ? isActive : settings.isActive,
          eventColor: eventColor || settings.eventColor,
          createdBy: decoded.id
        }
      });
    }

    res.json({
      success: true,
      message: 'Countdown settings updated successfully',
      settings: {
        id: settings.id,
        targetDate: settings.targetDate,
        title: settings.title,
        subtitle: settings.subtitle,
        icon: settings.icon,
        isActive: settings.isActive,
        eventColor: settings.eventColor,
        updatedAt: settings.updatedAt,
        createdBy: settings.createdBy
      }
    });
  } catch (error) {
    console.error('Error updating countdown settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update countdown settings'
    });
  }
});

// ============================================
// TOGGLE COUNTDOWN (Admin only)
// ============================================
router.patch('/admin/countdown-settings/toggle', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - No token provided'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Invalid token'
      });
    }

    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden - Admin access required'
      });
    }

    const { isActive } = req.body;

    let settings = await prisma.countdownSetting.findFirst();
    if (!settings) {
      settings = await prisma.countdownSetting.create({
        data: {
          targetDate: new Date('2026-12-25T00:00:00'),
          title: 'CHRISTMAS CELEBRATION',
          subtitle: 'JOIN US FOR THE BIRTHDAY OF JESUS CHRIST',
          icon: '🎄',
          isActive: isActive !== undefined ? isActive : false,
          eventColor: '#10b981',
          createdBy: decoded.id
        }
      });
    } else {
      settings = await prisma.countdownSetting.update({
        where: { id: settings.id },
        data: {
          isActive: isActive !== undefined ? isActive : !settings.isActive,
          createdBy: decoded.id
        }
      });
    }

    res.json({
      success: true,
      message: `Countdown ${settings.isActive ? 'activated' : 'deactivated'}`,
      isActive: settings.isActive,
      settings
    });
  } catch (error) {
    console.error('Error toggling countdown:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle countdown'
    });
  }
});

module.exports = router;