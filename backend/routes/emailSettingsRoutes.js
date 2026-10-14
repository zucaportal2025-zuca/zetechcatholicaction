const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all email settings
router.get('/settings', async (req, res) => {
  try {
    const settings = await prisma.emailSetting.findMany({
      orderBy: { category: 'asc' }
    });
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error fetching email settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update email setting
router.put('/settings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    
    const updated = await prisma.emailSetting.update({
      where: { id },
      data: { enabled, updatedAt: new Date() }
    });
    
    // Clear cache in mailer
    const { clearEmailSettingsCache } = require('../services/mailer');
    clearEmailSettingsCache();
    
    res.json({ success: true, setting: updated });
  } catch (error) {
    console.error('Error updating email setting:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user email status
router.get('/users/status', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        specialRole: true,
        createdAt: true
      }
    });
    
    // Get status from Brevo for each user
    const { getContactStatus } = require('../services/brevoService');
    const usersWithStatus = await Promise.all(
      users.map(async (user) => {
        try {
          const status = await getContactStatus(user.email);
          return {
            ...user,
            brevoStatus: status,
            emailStatus: status.unsubscribed ? 'unsubscribed' : 'active'
          };
        } catch (error) {
          return {
            ...user,
            brevoStatus: null,
            emailStatus: 'unknown'
          };
        }
      })
    );
    
    res.json({ success: true, users: usersWithStatus });
  } catch (error) {
    console.error('Error fetching user email status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;