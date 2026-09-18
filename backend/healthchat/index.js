// healthchat/index.js
const path = require("path");
const express = require("express");
const { gatherHealth, composeReply } = require("./health");

/**
 * @param {object} deps
 * @param {object} deps.prisma    - PrismaClient from server.js
 * @param {object} deps.io        - Socket.IO instance
 * @param {object} deps.healthStore - your in-memory { errors, slowRequests } store (optional)
 * @param {function} deps.authenticate - your JWT auth middleware
 * @param {function} deps.requireAdmin - your admin gate middleware
 */
function createHealthChatRouter(deps = {}) {
  const { prisma, io, healthStore, authenticate, requireAdmin } = deps;
  const router = express.Router();

  // ---------------------------------------------------------
  // HTML page (login + chat)
  // ---------------------------------------------------------
  router.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "chat.html"));
  });

  // Simple probe
  router.get("/status", (req, res) => {
    res.json({ ok: true, page: "health-chat", ts: new Date().toISOString() });
  });

  // ---------------------------------------------------------
  // POST /api/health/chat  →  the "ask the backend" endpoint
  // ---------------------------------------------------------
  router.post("/chat", authenticate, requireAdmin, async (req, res) => {
    try {
      const { message = "" } = req.body;
      const health = await gatherHealth({ prisma, io, healthStore });
      const reply  = composeReply(health, message);

      res.json({
        success: true,
        mood: health.mood,
        emoji: health.emoji,
        reply,
        details: {
          uptime: health.uptimeSec,
          uptimeStr: health.uptimeStr,
          memory: health.memory,
          database: health.database,
          sockets: health.sockets,
          onlineUsers: health.onlineUsers,
          recentErrors: health.recentErrors.length,
          recentSlow: health.recentSlow.length,
          issues: health.issues
        }
      });
    } catch (err) {
      console.error("health/chat error:", err);
      res.status(500).json({ success: false, reply: "Ugh — I can't even check myself right now: " + err.message });
    }
  });

  // ---------------------------------------------------------
  // GET /api/health/chat/quick  →  same thing without a body
  // ---------------------------------------------------------
  router.get("/chat", authenticate, requireAdmin, async (req, res) => {
    try {
      const health = await gatherHealth({ prisma, io, healthStore });
      const reply  = composeReply(health, "how are you");
      res.json({ success: true, mood: health.mood, emoji: health.emoji, reply });
    } catch (err) {
      res.status(500).json({ success: false, reply: err.message });
    }
  });

  return router;
}

module.exports = createHealthChatRouter;