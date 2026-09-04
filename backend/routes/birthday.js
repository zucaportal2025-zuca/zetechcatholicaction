const express = require("express");
const router = express.Router();
const { authenticate, requireAdmin } = require("../middleware/auth");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const cloudinary = require("cloudinary").v2;
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({ storage: multer.memoryStorage() });

// =============================================
// GET BIRTHDAY SETTINGS
// =============================================
router.get("/settings", authenticate, requireAdmin, async (req, res) => {
  try {
    let settings = await prisma.birthdaySetting.findFirst();
    if (!settings) {
      settings = await prisma.birthdaySetting.create({
        data: {
          autoCreateAdvert: true,
          sendPushToAll: true,
          sendToWhatsApp: false,
          whatsAppMessage: "Today we celebrate one of our own. 🎉\n\nLet us all join in wishing {name} a happy, blessed, and cheerful birthday.\n\nHappy Birthday, {name}! 🎂✨\n\nFrom all of us at ZUCA ❤️"
        }
      });
    }
    res.json({ success: true, settings });
  } catch (error) {
    console.error("Get birthday settings error:", error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// UPDATE BIRTHDAY SETTINGS
// =============================================
router.put("/settings", authenticate, requireAdmin, async (req, res) => {
  try {
    const { autoCreateAdvert, sendPushToAll, sendToWhatsApp, whatsAppMessage } = req.body;

    let settings = await prisma.birthdaySetting.findFirst();
    if (!settings) {
      settings = await prisma.birthdaySetting.create({
        data: {
          autoCreateAdvert: autoCreateAdvert !== undefined ? autoCreateAdvert : true,
          sendPushToAll: sendPushToAll !== undefined ? sendPushToAll : true,
          sendToWhatsApp: sendToWhatsApp !== undefined ? sendToWhatsApp : false,
            whatsAppMessage: whatsAppMessage || "Today we celebrate one of our own. 🎉\n\nLet us all join in wishing {name} a happy, blessed, and cheerful birthday.\n\nHappy Birthday, {name}! 🎂✨\n\nFrom all of us at ZUCA ❤️",
          updatedBy: req.user.userId
        }
      });
    } else {
      settings = await prisma.birthdaySetting.update({
        where: { id: settings.id },
        data: {
          autoCreateAdvert: autoCreateAdvert !== undefined ? autoCreateAdvert : settings.autoCreateAdvert,
          sendPushToAll: sendPushToAll !== undefined ? sendPushToAll : settings.sendPushToAll,
          sendToWhatsApp: sendToWhatsApp !== undefined ? sendToWhatsApp : settings.sendToWhatsApp,
          whatsAppMessage: whatsAppMessage !== undefined ? whatsAppMessage : settings.whatsAppMessage,
          updatedBy: req.user.userId,
          updatedAt: new Date()
        }
      });
    }

    res.json({ success: true, settings });
  } catch (error) {
    console.error("Update birthday settings error:", error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// USER: UPDATE BIRTHDAY SETTINGS
// =============================================
router.put("/user-settings", authenticate, async (req, res) => {
  try {
    const { birthdayOptIn, birthDate, birthdayMessage } = req.body;
    const userId = req.user.userId;

    let data = {};

    if (birthdayOptIn !== undefined) {
      data.birthdayOptIn = birthdayOptIn;
    }

    if (birthDate) {
      const date = new Date(birthDate);
      data.birthDate = date;
      data.birthMonth = date.getMonth() + 1;
      data.birthDay = date.getDate();
    }

    if (birthdayMessage !== undefined) {
      data.birthdayMessage = birthdayMessage;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        fullName: true,
        email: true,
        birthdayOptIn: true,
        birthDate: true,
        birthMonth: true,
        birthDay: true,
        birthdayPhoto: true,
        birthdayMessage: true,
        profileImage: true
      }
    });

    res.json({ success: true, user });
  } catch (error) {
    console.error("Update user birthday settings error:", error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// USER: UPLOAD BIRTHDAY PHOTO
// =============================================
router.post("/upload-photo", authenticate, upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No photo uploaded" });
    }

    const userId = req.user.userId;

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "zuca/birthday_photos",
          public_id: `birthday_${userId}_${Date.now()}`,
          resource_type: "image"
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    const user = await prisma.user.update({
      where: { id: userId },
      data: { birthdayPhoto: result.secure_url },
      select: {
        id: true,
        fullName: true,
        email: true,
        birthdayOptIn: true,
        birthDate: true,
        birthMonth: true,
        birthDay: true,
        birthdayPhoto: true,
        birthdayMessage: true,
        profileImage: true
      }
    });

    res.json({
      success: true,
      photoUrl: result.secure_url,
      user
    });
  } catch (error) {
    console.error("Upload birthday photo error:", error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// ADMIN: GET TODAY'S BIRTHDAYS
// =============================================
router.get("/admin/today", authenticate, requireAdmin, async (req, res) => {
  try {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    const users = await prisma.user.findMany({
      where: {
        birthdayOptIn: true,
        birthMonth: month,
        birthDay: day,
        birthdayPhoto: { not: null }
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        birthdayPhoto: true,
        birthdayMessage: true,
        birthdayAdvertId: true,
        role: true,
        specialRole: true,
        membership_number: true,
        homeJumuia: {
          select: { name: true }
        }
      }
    });

    res.json({ success: true, users, count: users.length });
  } catch (error) {
    console.error("Get today's birthdays error:", error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// ADMIN: GET BIRTHDAY STATS
// =============================================
router.get("/admin/stats", authenticate, requireAdmin, async (req, res) => {
  try {
    const totalOptedIn = await prisma.user.count({
      where: { birthdayOptIn: true }
    });

    const totalWithPhoto = await prisma.user.count({
      where: {
        birthdayOptIn: true,
        birthdayPhoto: { not: null }
      }
    });

    const totalBirthdayAds = await prisma.advertisement.count({
      where: {
        birthdayUser: { isNot: null }
      }
    });

    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    const todayBirthdays = await prisma.user.count({
      where: {
        birthdayOptIn: true,
        birthMonth: month,
        birthDay: day
      }
    });

    res.json({
      success: true,
      stats: {
        totalOptedIn,
        totalWithPhoto,
        totalBirthdayAds,
        todayBirthdays
      }
    });
  } catch (error) {
    console.error("Get birthday stats error:", error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// ADMIN: PROCESS SINGLE BIRTHDAY
// =============================================
router.post("/admin/process/:userId", authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.birthdayOptIn) {
      return res.status(400).json({ error: "User has not opted in for birthday wishes" });
    }

    if (!user.birthdayPhoto) {
      return res.status(400).json({ error: "User has not uploaded a birthday photo" });
    }

    const settings = await prisma.birthdaySetting.findFirst();

    let advert = null;
    // ✅ Use original photo directly - NO image generation
    const imageUrl = user.birthdayPhoto;

    if (settings?.autoCreateAdvert !== false) {
      advert = await prisma.advertisement.create({
        data: {
          title: `Happy Birthday, ${user.fullName}!`,
          description: `Today we celebrate ${user.fullName}'s special day. Join us in wishing them a blessed year ahead.`,
          image: imageUrl,
          startDate: new Date(),
          endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          active: true,
          buttonText: "Add Your's here",
          link: "/profile",
          birthdayUser: {
            connect: { id: user.id }
          }
        }
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { birthdayAdvertId: advert.id }
      });
    }

    // ✅ SEND TO WHATSAPP
    if (settings?.sendToWhatsApp && imageUrl) {
      try {
        const whatsappBot = require("../services/whatsapp.bot");
        const activeGroups = await prisma.whatsAppGroup.findMany({
          where: { isActive: true }
        });

        if (activeGroups.length > 0) {
          const message = (settings.whatsAppMessage || "Happy Birthday {name}!").replace(/{name}/g, user.fullName);

          let whatsappSent = 0;
          for (const group of activeGroups) {
            try {
              if (whatsappBot.sock && whatsappBot.isConnected) {
                await whatsappBot.sock.sendMessage(group.groupId, {
                  image: { url: imageUrl },
                  caption: message
                });
                whatsappSent++;
                console.log(`WhatsApp sent to ${group.groupName || group.groupId}`);
              }
            } catch (err) {
              console.error(`Failed to send to ${group.groupId}:`, err.message);
            }
          }
          console.log(`WhatsApp sent to ${whatsappSent} groups`);
        } else {
          console.log("No active WhatsApp groups found");
        }
      } catch (err) {
        console.error("WhatsApp send failed:", err.message);
      }
    }

    res.json({
      success: true,
      message: `Birthday processed for ${user.fullName}`,
      advert
    });
  } catch (error) {
    console.error("Process single birthday error:", error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// ADMIN: PROCESS ALL TODAY'S BIRTHDAYS
// =============================================
router.post("/admin/process-all", authenticate, requireAdmin, async (req, res) => {
  try {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    const users = await prisma.user.findMany({
      where: {
        birthdayOptIn: true,
        birthMonth: month,
        birthDay: day,
        birthdayPhoto: { not: null }
      }
    });

    if (users.length === 0) {
      return res.json({
        success: true,
        message: "No birthdays today",
        processed: 0
      });
    }

    const settings = await prisma.birthdaySetting.findFirst();
    const whatsappBot = require("../services/whatsapp.bot");
    
    let processed = 0;

    for (const user of users) {
      try {
        let advert = null;
        // ✅ Use original photo directly - NO image generation
        const imageUrl = user.birthdayPhoto;

        if (settings?.autoCreateAdvert !== false) {
          advert = await prisma.advertisement.create({
            data: {
              title: `Happy Birthday, ${user.fullName}!`,
              description: `Today we celebrate ${user.fullName}'s special day. Join us in wishing them a blessed year ahead.`,
              image: imageUrl,
              startDate: new Date(),
              endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
              active: true,
              buttonText: "Add Your's here",
              link: "/profile",
              birthdayUser: {
                connect: { id: user.id }
              }
            }
          });

          await prisma.user.update({
            where: { id: user.id },
            data: { birthdayAdvertId: advert.id }
          });
        }

        // ✅ SEND TO WHATSAPP
        if (settings?.sendToWhatsApp && imageUrl) {
          try {
            const activeGroups = await prisma.whatsAppGroup.findMany({
              where: { isActive: true }
            });

            if (activeGroups.length > 0) {
              const message = (settings.whatsAppMessage || "Happy Birthday {name}!").replace(/{name}/g, user.fullName);

              for (const group of activeGroups) {
                try {
                  if (whatsappBot.sock && whatsappBot.isConnected) {
                    await whatsappBot.sock.sendMessage(group.groupId, {
                      image: { url: imageUrl },
                      caption: message
                    });
                    console.log(`WhatsApp sent to ${group.groupName || group.groupId}`);
                  }
                } catch (err) {
                  console.error(`Failed to send to ${group.groupId}:`, err.message);
                }
              }
            }
          } catch (err) {
            console.error("WhatsApp send failed:", err.message);
          }
        }

        processed++;
      } catch (err) {
        console.error(`Failed to process ${user.fullName}:`, err.message);
      }
    }

    res.json({
      success: true,
      message: `Processed ${processed} of ${users.length} birthdays`,
      processed,
      total: users.length
    });
  } catch (error) {
    console.error("Process all birthdays error:", error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// ADMIN: GET ALL BIRTHDAYS (OPTED IN)
// =============================================
router.get("/admin/all", authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        birthdayOptIn: true
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        birthdayPhoto: true,
        birthdayMessage: true,
        birthdayAdvertId: true,
        birthMonth: true,
        birthDay: true,
        role: true,
        specialRole: true,
        membership_number: true,
        homeJumuia: {
          select: { name: true }
        }
      },
      orderBy: { fullName: 'asc' }
    });

    res.json({ success: true, users, count: users.length });
  } catch (error) {
    console.error("Get all birthdays error:", error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// BIRTHDAY WHATSAPP GROUPS - SAVE SELECTION
// =============================================

// Save selected groups for birthday messages
router.post("/whatsapp-groups/save", authenticate, requireAdmin, async (req, res) => {
  try {
    const { selectedGroupIds } = req.body;
    
    if (!selectedGroupIds || !Array.isArray(selectedGroupIds)) {
      return res.status(400).json({ error: "selectedGroupIds array required" });
    }
    
    // Get current state of all groups
    const currentGroups = await prisma.whatsAppGroup.findMany({
      select: { groupId: true, isActive: true }
    });
    
    // Find what changed
    const currentActiveIds = currentGroups.filter(g => g.isActive).map(g => g.groupId);
    const newActiveIds = selectedGroupIds;
    
    // Groups to activate (in selected but not currently active)
    const toActivate = newActiveIds.filter(id => !currentActiveIds.includes(id));
    
    // Groups to deactivate (currently active but not selected)
    const toDeactivate = currentActiveIds.filter(id => !newActiveIds.includes(id));
    
    // Only run updates if there are changes
    if (toActivate.length > 0) {
      await prisma.whatsAppGroup.updateMany({
        where: { groupId: { in: toActivate } },
        data: { isActive: true }
      });
    }
    
    if (toDeactivate.length > 0) {
      await prisma.whatsAppGroup.updateMany({
        where: { groupId: { in: toDeactivate } },
        data: { isActive: false }
      });
    }
    
    res.json({ 
      success: true, 
      message: `WhatsApp groups updated (${toActivate.length} activated, ${toDeactivate.length} deactivated)`,
      activated: toActivate.length,
      deactivated: toDeactivate.length
    });
    
  } catch (error) {
    console.error("Save WhatsApp groups error:", error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// GET WHATSAPP GROUPS
// =============================================
router.get("/whatsapp-groups", authenticate, requireAdmin, async (req, res) => {
  try {
    const groups = await prisma.whatsAppGroup.findMany({
      orderBy: { groupName: 'asc' }
    });
    
    res.json({ success: true, groups });
  } catch (error) {
    console.error("Get WhatsApp groups error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;