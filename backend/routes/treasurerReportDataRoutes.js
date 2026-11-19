const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const {
  buildSemesterReport,
  buildProjectReport,
  buildRangeReport,
  buildYearReport
} = require("../services/treasuryReportService");

const userRoleCache = new Map();

async function isTreasurerOrAdmin(userId) {
  if (userRoleCache.has(userId)) {
    return userRoleCache.get(userId);
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, specialRole: true }
  });
  const result = user?.role === "admin" || user?.specialRole === "treasurer";
  userRoleCache.set(userId, result);
  setTimeout(() => userRoleCache.delete(userId), 60000);
  return result;
}

router.get("/semester/:semesterId", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAuthorized = await isTreasurerOrAdmin(userId);
    if (!isAuthorized) return res.status(403).json({ error: "Not authorized" });

    const report = await buildSemesterReport(prisma, req.params.semesterId);
    if (!report) {
      return res.status(404).json({ error: "Semester not found" });
    }

    res.json({ success: true, mode: "semester", report });
  } catch (err) {
    console.error("Error generating semester report:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/year/:year", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAuthorized = await isTreasurerOrAdmin(userId);
    if (!isAuthorized) return res.status(403).json({ error: "Not authorized" });

    const year = parseInt(req.params.year);
    if (!year || year < 2000 || year > 2100) {
      return res.status(400).json({ error: "Invalid year" });
    }

    const report = await buildYearReport(prisma, year);
    res.json({ success: true, mode: "year", report });
  } catch (err) {
    console.error("Error generating year report:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/range", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAuthorized = await isTreasurerOrAdmin(userId);
    if (!isAuthorized) return res.status(403).json({ error: "Not authorized" });

    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate required" });
    }

    const report = await buildRangeReport(prisma, startDate, endDate);
    res.json({ success: true, mode: "range", report });
  } catch (err) {
    console.error("Error generating range report:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/project/:projectId", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAuthorized = await isTreasurerOrAdmin(userId);
    if (!isAuthorized) return res.status(403).json({ error: "Not authorized" });

    const report = await buildProjectReport(prisma, req.params.projectId);
    if (!report) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json({ success: true, mode: "project", report });
  } catch (err) {
    console.error("Error generating project report:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;