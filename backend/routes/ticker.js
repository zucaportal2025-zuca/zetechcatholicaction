const express = require("express");
const router = express.Router();

const { authenticate, requireAdmin } = require("../middleware/auth");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const webpush = require("web-push");
const { sendPersonalizedEmail } = require("../services/mailer");

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:zucaportal2025@gmail.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

async function sendNotification({ userId, type, title, message, data = {} }) {
  if (typeof global.createAndSendNotification === "function") {
    return global.createAndSendNotification({ userId, type, title, message, data });
  }

  const notification = await prisma.notification.create({
    data: {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      userId,
      type,
      title,
      message,
      read: false,
      createdAt: new Date(),
      data: data || {}
    }
  });

  const io = global.io;
  if (io) {
    io.to(userId).emit("new_notification", {
      ...notification,
      createdAt: notification.createdAt.toISOString()
    });
  }

  try {
    const subscription = await prisma.pushSubscription.findUnique({ where: { userId } });
    if (subscription) {
      const unreadCount = await prisma.notification.count({
        where: { userId, read: false }
      });
      const pushSubscription = JSON.parse(subscription.subscription);
      const deepLinkUrl = global.getDeepLinkUrl
        ? global.getDeepLinkUrl(type, data)
        : `${process.env.FRONTEND_URL || "https://www.zetechcatholicaction.com"}/dashboard`;

      await webpush.sendNotification(
        pushSubscription,
        JSON.stringify({
          title,
          body: message,
          icon: "/android-chrome-192x192.png",
          badge: "/favicon.ico",
          badgeCount: unreadCount + 1,
          data: { type, ...data, url: deepLinkUrl },
          url: deepLinkUrl,
          timestamp: Date.now()
        }),
        { urgency: "high" }
      );
    }
  } catch (err) {
    console.error(`Push failed for ${userId}:`, err.message);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, fullName: true }
    });
    if (user?.email) {
      await sendPersonalizedEmail(
        { email: user.email, fullName: user.fullName },
        type,
        title,
        message,
        data
      );
    }
  } catch (err) {
    console.error(`Email failed for ${userId}:`, err.message);
  }

  return notification;
}

async function getActiveTickersForUser(user) {
  const now = new Date();

  const all = await prisma.ticker.findMany({
    where: {
      active: true,
      startAt: { lte: now },
      OR: [{ endAt: null }, { endAt: { gte: now } }]
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }]
  });

  const matched = all.filter((t) => {
    if (t.target === "all") return true;
    if (t.target === "user") {
      return t.targetUserIds?.some((id) => String(id) === String(user.id));
    }
    if (t.target === "role") {
      const userRoles = [user.role, user.specialRole].filter(Boolean);
      return t.targetRoles?.some((r) => userRoles.includes(r));
    }
    return false;
  });

  if (matched.length === 0) return [];

  const dismissals = await prisma.tickerDismissal.findMany({
    where: {
      userId: user.id,
      tickerId: { in: matched.map((t) => t.id) }
    },
    select: { tickerId: true }
  });

  const dismissedIds = new Set(dismissals.map((d) => d.tickerId));
  return matched.filter((t) => !dismissedIds.has(t.id));
}

async function resolveRecipients(ticker) {
  if (ticker.target === "all") {
    const users = await prisma.user.findMany({ select: { id: true } });
    return users.map((u) => u.id);
  }
  if (ticker.target === "user") {
    return ticker.targetUserIds || [];
  }
  if (ticker.target === "role") {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { role: { in: ticker.targetRoles } },
          { specialRole: { in: ticker.targetRoles } }
        ]
      },
      select: { id: true }
    });
    return users.map((u) => u.id);
  }
  return [];
}

async function fanOutPushForTicker(ticker) {
  const recipientIds = await resolveRecipients(ticker);
  const isPersonal = ticker.target === "user";
  const notifType = isPersonal ? "warning" : "announcement";

  for (const userId of recipientIds) {
    try {
      await sendNotification({
        userId,
        type: notifType,
        title: `${ticker.icon} ${ticker.title || "ZUCA Notice"}`,
        message: ticker.text,
        data: { tickerId: ticker.id, url: "/dashboard" }
      });
    } catch (err) {
      console.error(`Ticker notify failed for ${userId}:`, err.message);
    }
  }
}

// ============ USER ROUTES ============

router.get("/active", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, role: true, specialRole: true, jumuiaId: true }
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    const tickers = await getActiveTickersForUser(user);
    res.json(tickers);
  } catch (err) {
    console.error("ticker/active error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/dismiss", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { acknowledged = false } = req.body || {};

    const ticker = await prisma.ticker.findUnique({ where: { id } });
    if (!ticker) return res.status(404).json({ error: "Ticker not found" });

    const record = await prisma.tickerDismissal.upsert({
      where: { tickerId_userId: { tickerId: id, userId: req.user.userId } },
      update: { acknowledged: acknowledged || undefined },
      create: { tickerId: id, userId: req.user.userId, acknowledged }
    });

    const io = global.io;
    if (io && acknowledged) {
      io.emit("ticker_acknowledged", {
        tickerId: id,
        userId: req.user.userId
      });
    }

    res.json({ success: true, dismissal: record });
  } catch (err) {
    console.error("ticker/dismiss error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============ ADMIN ROUTES ============

router.get("/admin", authenticate, requireAdmin, async (req, res) => {
  try {
    const tickers = await prisma.ticker.findMany({
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      include: {
        creator: { select: { id: true, fullName: true } },
        _count: { select: { dismissals: true } }
      }
    });

    const withAcks = await Promise.all(
      tickers.map(async (t) => {
        const ackCount = await prisma.tickerDismissal.count({
          where: { tickerId: t.id, acknowledged: true }
        });
        return { ...t, ackCount };
      })
    );

    res.json(withAcks);
  } catch (err) {
    console.error("ticker/admin GET error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin", authenticate, requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.text || !body.text.trim()) {
      return res.status(400).json({ error: "Text is required" });
    }

    const ticker = await prisma.ticker.create({
      data: {
        text: body.text,
        title: body.title || null,
        icon: body.icon || "📢",
        style: body.style || "rotate",
        color: body.color || "purple",
        customBg: body.customBg || null,
        customText: body.customText || null,
        linkUrl: body.linkUrl || null,
        linkText: body.linkText || null,
        target: body.target || "all",
        targetRoles: body.targetRoles || [],
        targetUserIds: body.targetUserIds || [],
        targetJumuiaId: body.targetJumuiaId || null,
        priority: body.priority ?? 5,
        dismissible: body.dismissible ?? true,
        requireAck: body.requireAck ?? false,
        sendPushNotification: body.sendPushNotification ?? false,
        startAt: body.startAt ? new Date(body.startAt) : new Date(),
        endAt: body.endAt ? new Date(body.endAt) : null,
        active: body.active ?? true,
        createdBy: req.user.userId
      }
    });

    const io = global.io;
    if (io) io.emit("ticker_updated", { action: "created", tickerId: ticker.id });

    res.status(201).json(ticker);

    if (ticker.sendPushNotification) {
      fanOutPushForTicker(ticker).catch((e) =>
        console.error("Ticker push fan-out failed:", e.message)
      );
    }
  } catch (err) {
    console.error("ticker/admin POST error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/admin/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const existing = await prisma.ticker.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Ticker not found" });

    const updated = await prisma.ticker.update({
      where: { id },
      data: {
        text: body.text ?? existing.text,
        title: body.title ?? existing.title,
        icon: body.icon ?? existing.icon,
        style: body.style ?? existing.style,
        color: body.color ?? existing.color,
        customBg: body.customBg ?? existing.customBg,
        customText: body.customText ?? existing.customText,
        linkUrl: body.linkUrl ?? existing.linkUrl,
        linkText: body.linkText ?? existing.linkText,
        target: body.target ?? existing.target,
        targetRoles: body.targetRoles ?? existing.targetRoles,
        targetUserIds: body.targetUserIds ?? existing.targetUserIds,
        targetJumuiaId: body.targetJumuiaId ?? existing.targetJumuiaId,
        priority: body.priority ?? existing.priority,
        dismissible: body.dismissible ?? existing.dismissible,
        requireAck: body.requireAck ?? existing.requireAck,
        sendPushNotification:
          body.sendPushNotification ?? existing.sendPushNotification,
        startAt: body.startAt ? new Date(body.startAt) : existing.startAt,
        endAt:
          body.endAt !== undefined
            ? body.endAt
              ? new Date(body.endAt)
              : null
            : existing.endAt,
        active: body.active ?? existing.active
      }
    });

    const io = global.io;
    if (io) io.emit("ticker_updated", { action: "updated", tickerId: id });

    res.json(updated);

    if (
      body.sendPushNotification === true &&
      !existing.sendPushNotification
    ) {
      fanOutPushForTicker(updated).catch((e) =>
        console.error("Ticker push fan-out failed:", e.message)
      );
    }
  } catch (err) {
    console.error("ticker/admin PUT error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/admin/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.ticker.delete({ where: { id } });
    const io = global.io;
    if (io) io.emit("ticker_updated", { action: "deleted", tickerId: id });
    res.json({ success: true });
  } catch (err) {
    console.error("ticker/admin DELETE error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.patch("/admin/:id/toggle", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.ticker.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Ticker not found" });

    const updated = await prisma.ticker.update({
      where: { id },
      data: { active: !existing.active }
    });

    const io = global.io;
    if (io) io.emit("ticker_updated", { action: "toggled", tickerId: id });

    res.json(updated);
  } catch (err) {
    console.error("ticker/admin toggle error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/admin/:id/stats", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [total, acked, dismissed] = await Promise.all([
      prisma.user.count(),
      prisma.tickerDismissal.count({
        where: { tickerId: id, acknowledged: true }
      }),
      prisma.tickerDismissal.count({ where: { tickerId: id } })
    ]);

    const dismissals = await prisma.tickerDismissal.findMany({
      where: { tickerId: id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            profileImage: true
          }
        }
      },
      orderBy: { dismissedAt: "desc" }
    });

    res.json({ total, acked, dismissed, dismissals });
  } catch (err) {
    console.error("ticker/admin stats error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;