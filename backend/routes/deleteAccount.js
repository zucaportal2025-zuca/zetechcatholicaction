// ==================== routes/deleteAccount.js ====================
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "zuca_super_secret_key";

// ==================== AUTH MIDDLEWARE ====================
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token" });
  try { req.user = jwt.verify(authHeader.split(" ")[1], JWT_SECRET); next(); }
  catch { res.status(401).json({ error: "Invalid token" }); }
}

// ==================== FAST NOTIFICATION (fire & forget) ====================
async function createAndSendNotification({ userId, type, title, message, data = {} }) {
  setImmediate(async () => {
    try {
      const notification = await prisma.notification.create({
        data: { id: `${type}-${Date.now()}`, userId, type, title, message, read: false, createdAt: new Date(), data }
      });
      try { const io = global.io; if (io) io.to(userId).emit('new_notification', { ...notification, createdAt: notification.createdAt.toISOString() }); } catch (e) {}
      try {
        const sub = await prisma.pushSubscription.findUnique({ where: { userId } });
        if (sub) {
          const webpush = require('web-push');
          webpush.setVapidDetails('mailto:zucaportal2025@gmail.com', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
          await webpush.sendNotification(JSON.parse(sub.subscription), JSON.stringify({
            title, body: message, icon: "/android-chrome-192x192.png", badge: "/favicon.ico",
            data: { type, url: `${process.env.FRONTEND_URL || "https://www.zetechcatholicaction.com"}/dashboard` },
            url: `${process.env.FRONTEND_URL || "https://www.zetechcatholicaction.com"}/dashboard`, timestamp: Date.now()
          }), { urgency: "high" });
        }
      } catch (e) {}
    } catch (e) {}
  });
}

// ==================== GATHER USER RECORDS ====================
async function gatherUserRecords(userId) {
  const [attendance, pledges, executiveHistory] = await Promise.all([
    prisma.attendanceEntry.findMany({ where: { userId }, include: { sheet: { select: { title: true, eventDate: true, eventTime: true } } }, orderBy: { signTime: 'desc' } }),
    prisma.pledge.findMany({ where: { userId }, include: { contributionType: { select: { title: true, amountRequired: true } } }, orderBy: { createdAt: 'desc' } }),
    prisma.executiveHistory.findMany({ where: { userId }, include: { position: { select: { title: true } } }, orderBy: { assignedAt: 'desc' } })
  ]);
  return {
    attendance: attendance.map(a => ({ title: a.sheet?.title || 'Event', date: a.sheet?.eventDate || a.signTime, time: a.sheet?.eventTime || 'N/A', method: a.signMethod || 'N/A' })),
    pledges: pledges.map(p => ({ campaign: p.contributionType?.title || 'N/A', amount: p.contributionType?.amountRequired || 0, paid: p.amountPaid || 0, pending: p.pendingAmount || 0, status: p.status })),
    executiveHistory: executiveHistory.map(e => ({ position: e.position?.title || 'N/A', assignedAt: e.assignedAt, removedAt: e.removedAt }))
  };
}

// ==================== DELETE MY ACCOUNT ====================
router.delete("/delete-my-account", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { reason, password } = req.body;

    // Fast validation
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { homeJumuia: { select: { name: true } }, pledges: { select: { id: true } } }
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!password) return res.status(400).json({ error: "Password required" });
    if (!(await bcrypt.compare(password, user.password))) return res.status(400).json({ error: "Incorrect password" });

    // Capture data before deletion
    const userInfo = {
      fullName: user.fullName, email: user.email, phone: user.phone,
      membershipNumber: user.membership_number, jumuia: user.homeJumuia?.name || "None",
      role: user.role, specialRole: user.specialRole, joinedDate: user.createdAt,
      deletedAt: new Date().toISOString(), reason: reason || "No reason provided"
    };
    const userObj = { profileImage: user.profileImage };

    // Gather records (parallel)
    const records = await gatherUserRecords(userId);

    // Get leaders (admin + chairperson only)
    const leaders = await prisma.user.findMany({
      where: { OR: [{ role: "admin" }, { specialRole: "chairperson" }] },
      select: { id: true, email: true, fullName: true }
    });

    // DELETE everything
    await prisma.$transaction([
      prisma.pledge.deleteMany({ where: { userId } }), prisma.pledgeMessage.deleteMany({ where: { userId } }),
      prisma.message.deleteMany({ where: { userId } }), prisma.notification.deleteMany({ where: { userId } }),
      prisma.messageReaction.deleteMany({ where: { userId } }), prisma.readReceipt.deleteMany({ where: { userId } }),
      prisma.pushSubscription.deleteMany({ where: { userId } }), prisma.file.deleteMany({ where: { userId } }),
      prisma.mediaLike.deleteMany({ where: { userId } }), prisma.mediaComment.deleteMany({ where: { userId } }),
      prisma.mediaDownload.deleteMany({ where: { userId } }), prisma.mediaShare.deleteMany({ where: { userId } }),
      prisma.mediaView.deleteMany({ where: { userId } }), prisma.attendanceEntry.deleteMany({ where: { userId } }),
      prisma.executive.deleteMany({ where: { userId } }), prisma.executiveHistory.deleteMany({ where: { userId } }),
      prisma.gameInvite.deleteMany({ where: { OR: [{ fromUserId: userId }, { toUserId: userId }] } }),
      prisma.gameSession.deleteMany({ where: { OR: [{ player1Id: userId }, { player2Id: userId }] } }),
      prisma.jumuiaChatMessage.deleteMany({ where: { userId } }), prisma.jumuiaChatReaction.deleteMany({ where: { userId } }),
      prisma.jumuiaMention.deleteMany({ where: { userId } }), prisma.jumuiaReadReceipt.deleteMany({ where: { userId } }),
      prisma.mention.deleteMany({ where: { userId } }), prisma.pin.deleteMany({ where: { userId } }),
      prisma.scheduleDraft.deleteMany({ where: { createdBy: userId } }),
      prisma.user.delete({ where: { id: userId } })
    ]);

    // ✅ RESPOND IMMEDIATELY
    res.json({ success: true, message: "Account deleted. Your records will be emailed shortly. God bless! 🙏" });

    // ✅ BACKGROUND: PDF + Emails via Brevo
    setImmediate(async () => {
      try {
        const { generateFarewellPDF, sendFarewellEmailWithPDF } = require("../services/farewellPDFService");
        
        const pdfBuffer = await generateFarewellPDF(userInfo, records, userObj);
        const filename = `${userInfo.fullName.replace(/\s/g, '_')}_ZUCA_Records.pdf`;

        // Send PDF to departing user
        await sendFarewellEmailWithPDF(userInfo.email, userInfo.fullName, pdfBuffer, filename);

        // Send PDF to leaders + in-app notification
        for (const leader of leaders) {
          await sendFarewellEmailWithPDF(leader.email, leader.fullName, pdfBuffer, filename);
          
          await createAndSendNotification({
            userId: leader.id,
            type: "account_deleted",
            title: " Member Left ZUCA PORTAL",
            message: `${userInfo.fullName} (${userInfo.membershipNumber}) deleted their account.\nReason: ${userInfo.reason}`,
            data: { deletedUser: userInfo }
          });
        }
        console.log(`📢 PDF sent to user + ${leaders.length} leaders`);
      } catch (bgErr) {
        console.error("Background PDF/email failed:", bgErr.message);
      }
    });

  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

module.exports = router;