const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const {
  isSemesterClosed,
  getActiveSemester
} = require("../middleware/semesterLock");

const { clearBalanceCache } = require("../utils/balanceHelpers");

const userRoleCache = new Map();

async function getUser(userId) {
  if (userRoleCache.has(userId)) {
    return userRoleCache.get(userId);
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, fullName: true, email: true, role: true, specialRole: true }
  });
  userRoleCache.set(userId, user);
  setTimeout(() => userRoleCache.delete(userId), 60000);
  return user;
}

async function canManageSemester(user) {
  if (!user) return false;
  return (
    user.role === "admin" ||
    user.specialRole === "treasurer" ||
    user.specialRole === "secretary"
  );
}

router.post("/:semesterId/close", authenticate, async (req, res) => {
  try {
    const { semesterId } = req.params;
    const userId = req.user.userId;

    const user = await getUser(userId);
    if (!(await canManageSemester(user))) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const semester = await prisma.schedule.findUnique({
      where: { id: semesterId },
      select: {
        id: true,
        title: true,
        treasuryClosedAt: true,
        treasuryClosedBy: true,
        treasuryReopenCount: true
      }
    });

    if (!semester) {
      return res.status(404).json({ error: "Semester not found" });
    }

    if (semester.treasuryClosedAt) {
      return res.status(400).json({
        error: "Semester treasury is already closed",
        closedAt: semester.treasuryClosedAt
      });
    }

    const updated = await prisma.schedule.update({
      where: { id: semesterId },
      data: {
        treasuryClosedAt: new Date(),
        treasuryClosedBy: userId
      }
    });

    clearBalanceCache(semesterId);

    res.json({
      success: true,
      message: "Semester treasury closed. Books are now locked.",
      semester: {
        id: updated.id,
        title: updated.title,
        treasuryClosedAt: updated.treasuryClosedAt,
        treasuryClosedBy: updated.treasuryClosedBy
      }
    });
  } catch (err) {
    console.error("Error closing semester:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/:semesterId/reopen", authenticate, async (req, res) => {
  try {
    const { semesterId } = req.params;
    const userId = req.user.userId;
    const { reason } = req.body || {};

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({
        error: "A reason is required to reopen a semester (min 5 characters)"
      });
    }

    const user = await getUser(userId);
    if (!(await canManageSemester(user))) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const semester = await prisma.schedule.findUnique({
      where: { id: semesterId },
      select: {
        id: true,
        title: true,
        treasuryClosedAt: true,
        treasuryReopenCount: true
      }
    });

    if (!semester) {
      return res.status(404).json({ error: "Semester not found" });
    }

    if (!semester.treasuryClosedAt) {
      return res.status(400).json({
        error: "Semester treasury is not closed. Nothing to reopen."
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const reopenLog = await tx.semesterReopenLog.create({
        data: {
          semesterId,
          reason: reason.trim(),
          reopenedBy: userId,
          reopenedByName: user.fullName || user.email || userId
        }
      });

      const updated = await tx.schedule.update({
        where: { id: semesterId },
        data: {
          treasuryClosedAt: null,
          treasuryClosedBy: null,
          treasuryReopenCount: semester.treasuryReopenCount + 1,
          treasuryLastReopenedAt: new Date(),
          treasuryLastReopenedBy: userId
        }
      });

      return { reopenLog, updated };
    });

    clearBalanceCache(semesterId);

    res.json({
      success: true,
      message: "Semester treasury reopened. Books are now unlocked.",
      semester: {
        id: result.updated.id,
        title: result.updated.title,
        treasuryClosedAt: result.updated.treasuryClosedAt,
        treasuryReopenCount: result.updated.treasuryReopenCount,
        treasuryLastReopenedAt: result.updated.treasuryLastReopenedAt
      },
      reopenLog: {
        id: result.reopenLog.id,
        reason: result.reopenLog.reason,
        reopenedAt: result.reopenLog.reopenedAt,
        reopenedByName: result.reopenLog.reopenedByName
      }
    });
  } catch (err) {
    console.error("Error reopening semester:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/:semesterId/reopen-history", authenticate, async (req, res) => {
  try {
    const { semesterId } = req.params;
    const userId = req.user.userId;

    const user = await getUser(userId);
    if (!(await canManageSemester(user))) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const semester = await prisma.schedule.findUnique({
      where: { id: semesterId },
      select: { id: true, title: true, treasuryReopenCount: true }
    });

    if (!semester) {
      return res.status(404).json({ error: "Semester not found" });
    }

    const logs = await prisma.semesterReopenLog.findMany({
      where: { semesterId },
      orderBy: { reopenedAt: "desc" }
    });

    res.json({
      success: true,
      semesterId: semester.id,
      semesterTitle: semester.title,
      reopenCount: semester.treasuryReopenCount,
      logs
    });
  } catch (err) {
    console.error("Error fetching reopen history:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/current-status", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await getUser(userId);
    if (!(await canManageSemester(user))) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const active = await getActiveSemester(prisma);
    if (!active) {
      return res.json({ success: true, semester: null });
    }

    const closed = await isSemesterClosed(prisma, active.id);

    res.json({
      success: true,
      semester: {
        id: active.id,
        title: active.title,
        treasuryClosedAt: active.treasuryClosedAt,
        treasuryClosedBy: active.treasuryClosedBy,
        treasuryReopenCount: active.treasuryReopenCount,
        isClosed: closed
      }
    });
  } catch (err) {
    console.error("Error fetching current status:", err);
    res.status(500).json({ error: err.message });
  }
});


router.get("/list", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await getUser(userId);
    if (!(await canManageSemester(user))) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const semesters = await prisma.schedule.findMany({
      where: { isPublished: true },
      orderBy: { startDate: "desc" },
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        isActiveSemester: true,
        treasuryClosedAt: true,
        treasuryReopenCount: true
      }
    });

    res.json({
      success: true,
      semesters: semesters.map((s) => ({
        id: s.id,
        title: s.title,
        startDate: s.startDate,
        endDate: s.endDate,
        isActive: s.isActiveSemester,
        isClosed: !!s.treasuryClosedAt,
        closedAt: s.treasuryClosedAt,
        reopenCount: s.treasuryReopenCount,
        status: s.isActiveSemester
          ? "ACTIVE"
          : s.treasuryClosedAt
          ? "CLOSED"
          : "UPCOMING"
      }))
    });
  } catch (err) {
    console.error("Error listing semesters:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;