// backend/routes/choir-whatsapp.js
const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// =============================================
// GET ALL WHATSAPP GROUPS
// =============================================
router.get("/groups", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true, specialRole: true }
    });

    const isChoirModerator = user?.specialRole === "choir_moderator" || user?.role === "admin";

    if (!isChoirModerator) {
      return res.status(403).json({ error: "Access denied. Choir moderator only." });
    }

    const groups = await prisma.whatsAppGroup.findMany({
      orderBy: { groupName: 'asc' }
    });

    res.json({
      success: true,
      groups,
      totalCount: groups.length
    });
  } catch (error) {
    console.error("Get groups error:", error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// GET GROUP MEMBERS
// =============================================
router.get("/groups/:groupId/members", authenticate, async (req, res) => {
  try {
    const { groupId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true, specialRole: true }
    });

    const isChoirModerator = user?.specialRole === "choir_moderator" || user?.role === "admin";

    if (!isChoirModerator) {
      return res.status(403).json({ error: "Access denied. Choir moderator only." });
    }

    const group = await prisma.whatsAppGroup.findUnique({
      where: { groupId }
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    const whatsappBot = require("../services/whatsapp.bot");
    let members = [];

    if (whatsappBot.sock && whatsappBot.isConnected) {
      try {
        const groupMetadata = await whatsappBot.sock.groupMetadata(groupId);
        members = groupMetadata.participants || [];
      } catch (err) {
        console.error("Failed to fetch group members:", err.message);
        members = group.members || [];
      }
    } else {
      members = group.members || [];
    }

    res.json({
      success: true,
      groupId,
      groupName: group.groupName,
      members,
      totalMembers: members.length
    });
  } catch (error) {
    console.error("Get group members error:", error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// BROADCAST TO SELECTED GROUPS
// =============================================
router.post("/broadcast", authenticate, async (req, res) => {
  try {
    const { groupIds, message } = req.body;
    const userId = req.user.userId;

    if (!groupIds || !Array.isArray(groupIds) || groupIds.length === 0) {
      return res.status(400).json({ error: "At least one group ID is required" });
    }

    if (!message || message.trim() === "") {
      return res.status(400).json({ error: "Message is required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, email: true, role: true, specialRole: true }
    });

    const isChoirModerator = user?.specialRole === "choir_moderator" || user?.role === "admin";

    if (!isChoirModerator) {
      return res.status(403).json({ error: "Access denied. Choir moderator only." });
    }

    const groups = await prisma.whatsAppGroup.findMany({
      where: {
        groupId: { in: groupIds }
      }
    });

    if (groups.length === 0) {
      return res.status(404).json({ error: "No valid groups found" });
    }

    const whatsappBot = require("../services/whatsapp.bot");
    const results = [];

    if (whatsappBot.sock && whatsappBot.isConnected) {
      for (const group of groups) {
        try {
          await whatsappBot.sock.sendMessage(group.groupId, {
            text: message
          });

          results.push({
            groupId: group.groupId,
            groupName: group.groupName || group.groupId,
            success: true
          });

          console.log(`✅ Broadcast sent to ${group.groupName || group.groupId}`);
        } catch (err) {
          console.error(`❌ Broadcast failed to ${group.groupId}:`, err.message);
          results.push({
            groupId: group.groupId,
            groupName: group.groupName || group.groupId,
            success: false,
            error: err.message
          });
        }
      }
    } else {
      return res.status(503).json({
        error: "WhatsApp bot is not connected. Please link the bot first."
      });
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    const broadcast = await prisma.choirBroadcast.create({
      data: {
        message: message,
        groupIds: groupIds,
        groups: results,
        status: failedCount === 0 ? "sent" : failedCount === groupIds.length ? "failed" : "partial",
        successCount,
        failedCount,
        totalCount: groupIds.length,
        sentBy: userId,
        sentByName: user?.fullName || "Unknown",
        sentAt: new Date(),
        isBroadcast: true
      }
    });

    res.json({
      success: true,
      message: `Broadcast sent to ${successCount} of ${groupIds.length} groups`,
      results,
      broadcastId: broadcast.id,
      summary: {
        total: groupIds.length,
        success: successCount,
        failed: failedCount
      }
    });
  } catch (error) {
    console.error("Broadcast error:", error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// GET BROADCAST HISTORY
// =============================================
router.get("/history", authenticate, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, specialRole: true }
    });

    const isChoirModerator = user?.specialRole === "choir_moderator" || user?.role === "admin";

    if (!isChoirModerator) {
      return res.status(403).json({ error: "Access denied. Choir moderator only." });
    }

    const where = user?.role === "admin" ? {} : { sentBy: userId };

    const broadcasts = await prisma.choirBroadcast.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      skip: parseInt(offset),
      take: parseInt(limit)
    });

    const total = await prisma.choirBroadcast.count({ where });

    res.json({
      success: true,
      broadcasts,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error("Get history error:", error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// RESEND FAILED BROADCAST
// =============================================
router.post("/resend/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, specialRole: true, fullName: true }
    });

    const isChoirModerator = user?.specialRole === "choir_moderator" || user?.role === "admin";

    if (!isChoirModerator) {
      return res.status(403).json({ error: "Access denied. Choir moderator only." });
    }

    const broadcast = await prisma.choirBroadcast.findUnique({
      where: { id }
    });

    if (!broadcast) {
      return res.status(404).json({ error: "Broadcast not found" });
    }

    if (broadcast.sentBy !== userId && user?.role !== "admin") {
      return res.status(403).json({ error: "You can only resend your own broadcasts" });
    }

    const failedGroups = broadcast.groups.filter(g => !g.success);

    if (failedGroups.length === 0) {
      return res.json({
        success: true,
        message: "No failed groups to resend"
      });
    }

    const whatsappBot = require("../services/whatsapp.bot");
    const results = [];

    if (whatsappBot.sock && whatsappBot.isConnected) {
      for (const group of failedGroups) {
        try {
          await whatsappBot.sock.sendMessage(group.groupId, {
            text: broadcast.message
          });

          results.push({
            groupId: group.groupId,
            groupName: group.groupName,
            success: true
          });

          console.log(`✅ Resent to ${group.groupName || group.groupId}`);
        } catch (err) {
          console.error(`❌ Resend failed to ${group.groupId}:`, err.message);
          results.push({
            groupId: group.groupId,
            groupName: group.groupName,
            success: false,
            error: err.message
          });
        }
      }
    } else {
      return res.status(503).json({
        error: "WhatsApp bot is not connected"
      });
    }

    const updatedGroups = [...broadcast.groups];
    for (const result of results) {
      const index = updatedGroups.findIndex(g => g.groupId === result.groupId);
      if (index !== -1) {
        updatedGroups[index] = result;
      }
    }

    const newSuccessCount = updatedGroups.filter(g => g.success).length;
    const newFailedCount = updatedGroups.filter(g => !g.success).length;

    await prisma.choirBroadcast.update({
      where: { id },
      data: {
        groups: updatedGroups,
        successCount: newSuccessCount,
        failedCount: newFailedCount,
        status: newFailedCount === 0 ? "sent" : newFailedCount === broadcast.totalCount ? "failed" : "partial"
      }
    });

    res.json({
      success: true,
      message: `Resent to ${results.filter(r => r.success).length} groups`,
      results
    });
  } catch (error) {
    console.error("Resend error:", error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// SAVE SELECTED GROUPS (GLOBAL FOR ALL CHOIR MODERATORS)
// =============================================
router.post("/settings", authenticate, async (req, res) => {
  try {
    const { selectedGroupIds } = req.body;
    const userId = req.user.userId;

    if (!selectedGroupIds || !Array.isArray(selectedGroupIds)) {
      return res.status(400).json({ error: "selectedGroupIds array required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, specialRole: true, fullName: true }
    });

    const isChoirModerator = user?.specialRole === "choir_moderator" || user?.role === "admin";

    if (!isChoirModerator) {
      return res.status(403).json({ error: "Access denied. Choir moderator only." });
    }

    let settings = await prisma.choirBroadcastSetting.findFirst();

    if (settings) {
      settings = await prisma.choirBroadcastSetting.update({
        where: { id: settings.id },
        data: {
          selectedGroupIds: selectedGroupIds,
          updatedBy: user?.fullName || userId
        }
      });
    } else {
      settings = await prisma.choirBroadcastSetting.create({
        data: {
          selectedGroupIds: selectedGroupIds,
          updatedBy: user?.fullName || userId
        }
      });
    }

    res.json({
      success: true,
      message: "Group selection saved for all choir moderators",
      settings
    });
  } catch (error) {
    console.error("Save settings error:", error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// GET SAVED GROUP SELECTION (GLOBAL)
// =============================================
router.get("/settings", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true, specialRole: true }
    });

    const isChoirModerator = user?.specialRole === "choir_moderator" || user?.role === "admin";

    if (!isChoirModerator) {
      return res.status(403).json({ error: "Access denied. Choir moderator only." });
    }

    const settings = await prisma.choirBroadcastSetting.findFirst();

    res.json({
      success: true,
      settings: settings || { selectedGroupIds: [] },
      updatedBy: settings?.updatedBy || null
    });
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;