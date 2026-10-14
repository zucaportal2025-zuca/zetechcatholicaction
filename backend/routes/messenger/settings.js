const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateDM } = require('./helpers');

// GET - Get user's DM settings
router.get('/', authenticateDM, async (req, res) => {
  try {
    const userId = req.user.userId;

    let settings = await prisma.dMSettings.findUnique({
      where: { userId }
    });

    // If no settings exist, create default ones
    if (!settings) {
      settings = await prisma.dMSettings.create({
        data: {
          userId,
          notificationsEnabled: true,
          emailNotifications: false,
          pushNotifications: true,
          soundEnabled: true,
          theme: 'light',
          messageFontSize: 'medium',
          enterToSend: true,
          showReadReceipts: true,
          showTypingIndicator: true,
          autoDeleteDays: null,
          messagePreview: true,
          blockedNotifications: false,
          deliveryReports: true,
          readReports: true
        }
      });
    }

    res.json({
      success: true,
      settings: {
        notificationsEnabled: settings.notificationsEnabled,
        emailNotifications: settings.emailNotifications,
        pushNotifications: settings.pushNotifications,
        soundEnabled: settings.soundEnabled,
        theme: settings.theme,
        messageFontSize: settings.messageFontSize,
        enterToSend: settings.enterToSend,
        showReadReceipts: settings.showReadReceipts,
        showTypingIndicator: settings.showTypingIndicator,
        autoDeleteDays: settings.autoDeleteDays,
        messagePreview: settings.messagePreview,
        blockedNotifications: settings.blockedNotifications,
        deliveryReports: settings.deliveryReports,
        readReports: settings.readReports
      }
    });

  } catch (err) {
    console.error("Get settings error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT - Update user's DM settings
router.put('/', authenticateDM, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      notificationsEnabled,
      emailNotifications,
      pushNotifications,
      soundEnabled,
      theme,
      messageFontSize,
      enterToSend,
      showReadReceipts,
      showTypingIndicator,
      autoDeleteDays,
      messagePreview,
      blockedNotifications,
      deliveryReports,
      readReports
    } = req.body;

    // Validate theme
    const validThemes = ['light', 'dark', 'system'];
    if (theme && !validThemes.includes(theme)) {
      return res.status(400).json({ error: `Theme must be one of: ${validThemes.join(', ')}` });
    }

    // Validate font size
    const validFontSizes = ['small', 'medium', 'large'];
    if (messageFontSize && !validFontSizes.includes(messageFontSize)) {
      return res.status(400).json({ error: `Font size must be one of: ${validFontSizes.join(', ')}` });
    }

    // Validate autoDeleteDays
    if (autoDeleteDays !== undefined && autoDeleteDays !== null) {
      if (typeof autoDeleteDays !== 'number' || autoDeleteDays < 0) {
        return res.status(400).json({ error: "autoDeleteDays must be a positive number or null" });
      }
    }

    // Update or create settings
    const settings = await prisma.dMSettings.upsert({
      where: { userId },
      update: {
        notificationsEnabled,
        emailNotifications,
        pushNotifications,
        soundEnabled,
        theme,
        messageFontSize,
        enterToSend,
        showReadReceipts,
        showTypingIndicator,
        autoDeleteDays: autoDeleteDays !== undefined ? autoDeleteDays : null,
        messagePreview,
        blockedNotifications,
        deliveryReports,
        readReports,
        updatedAt: new Date()
      },
      create: {
        userId,
        notificationsEnabled: notificationsEnabled ?? true,
        emailNotifications: emailNotifications ?? false,
        pushNotifications: pushNotifications ?? true,
        soundEnabled: soundEnabled ?? true,
        theme: theme ?? 'light',
        messageFontSize: messageFontSize ?? 'medium',
        enterToSend: enterToSend ?? true,
        showReadReceipts: showReadReceipts ?? true,
        showTypingIndicator: showTypingIndicator ?? true,
        autoDeleteDays: autoDeleteDays ?? null,
        messagePreview: messagePreview ?? true,
        blockedNotifications: blockedNotifications ?? false,
        deliveryReports: deliveryReports ?? true,
        readReports: readReports ?? true
      }
    });

    res.json({
      success: true,
      message: "Settings updated successfully",
      settings: {
        notificationsEnabled: settings.notificationsEnabled,
        emailNotifications: settings.emailNotifications,
        pushNotifications: settings.pushNotifications,
        soundEnabled: settings.soundEnabled,
        theme: settings.theme,
        messageFontSize: settings.messageFontSize,
        enterToSend: settings.enterToSend,
        showReadReceipts: settings.showReadReceipts,
        showTypingIndicator: settings.showTypingIndicator,
        autoDeleteDays: settings.autoDeleteDays,
        messagePreview: settings.messagePreview,
        blockedNotifications: settings.blockedNotifications,
        deliveryReports: settings.deliveryReports,
        readReports: settings.readReports
      }
    });

  } catch (err) {
    console.error("Update settings error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT - Reset settings to default
router.put('/reset', authenticateDM, async (req, res) => {
  try {
    const userId = req.user.userId;

    const defaultSettings = {
      notificationsEnabled: true,
      emailNotifications: false,
      pushNotifications: true,
      soundEnabled: true,
      theme: 'light',
      messageFontSize: 'medium',
      enterToSend: true,
      showReadReceipts: true,
      showTypingIndicator: true,
      autoDeleteDays: null,
      messagePreview: true,
      blockedNotifications: false,
      deliveryReports: true,
      readReports: true
    };

    const settings = await prisma.dMSettings.upsert({
      where: { userId },
      update: defaultSettings,
      create: { userId, ...defaultSettings }
    });

    res.json({
      success: true,
      message: "Settings reset to default",
      settings: defaultSettings
    });

  } catch (err) {
    console.error("Reset settings error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Toggle a specific setting
router.post('/toggle/:setting', authenticateDM, async (req, res) => {
  try {
    const { setting } = req.params;
    const userId = req.user.userId;

    const validBooleanSettings = [
      'notificationsEnabled',
      'emailNotifications',
      'pushNotifications',
      'soundEnabled',
      'enterToSend',
      'showReadReceipts',
      'showTypingIndicator',
      'messagePreview',
      'blockedNotifications',
      'deliveryReports',
      'readReports'
    ];

    if (!validBooleanSettings.includes(setting)) {
      return res.status(400).json({ error: `Invalid setting. Must be one of: ${validBooleanSettings.join(', ')}` });
    }

    const current = await prisma.dMSettings.findUnique({
      where: { userId }
    });

    const currentValue = current ? current[setting] : true;
    const newValue = !currentValue;

    await prisma.dMSettings.upsert({
      where: { userId },
      update: { [setting]: newValue },
      create: { userId, [setting]: newValue }
    });

    res.json({
      success: true,
      setting,
      value: newValue,
      message: `${setting} is now ${newValue ? 'enabled' : 'disabled'}`
    });

  } catch (err) {
    console.error("Toggle setting error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;