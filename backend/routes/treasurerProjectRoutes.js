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

async function resolveSemesterId(providedSemesterId) {
  if (providedSemesterId) return providedSemesterId;
  const active = await getActiveSemester(prisma);
  return active?.id || null;
}

async function logAuditAction(projectId, action, oldData, newData, userId, userName, req) {
  setImmediate(async () => {
    try {
      const ipAddress = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || null;
      const userAgent = req.headers["user-agent"] || null;

      await prisma.treasurerAuditLog.create({
        data: {
          transactionId: projectId,
          action: "PROJECT_" + action,
          oldData,
          newData,
          changedFields: null,
          performedBy: userId,
          performedByName: userName,
          ipAddress,
          userAgent,
          timestamp: new Date()
        }
      });
    } catch (err) {
      console.error("Failed to create project audit log:", err);
    }
  });
}

router.get("/", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAuthorized = await isTreasurerOrAdmin(userId);
    if (!isAuthorized) return res.status(403).json({ error: "Not authorized" });

    const { semesterId, status } = req.query;
    const resolvedSemesterId = await resolveSemesterId(semesterId);

    const whereClause = { deletedAt: null };
    if (resolvedSemesterId) whereClause.semesterId = resolvedSemesterId;
    if (status && status !== "all") whereClause.status = status;

    const projects = await prisma.project.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        creator: { select: { id: true, fullName: true } },
        transactions: {
          where: { deletedAt: null },
          select: { id: true, type: true, amount: true, category: true, date: true }
        }
      }
    });

    const projectsWithStats = projects.map((p) => {
      let contributionsIn = 0;
      let expensesOut = 0;
      for (const t of p.transactions) {
        if (t.type === "IN") contributionsIn += t.amount;
        else expensesOut += t.amount;
      }
      const net = contributionsIn - expensesOut;
      const completion = p.targetAmount > 0 ? (contributionsIn / p.targetAmount) * 100 : null;

      return {
        id: p.id,
        semesterId: p.semesterId,
        name: p.name,
        description: p.description,
        targetAmount: p.targetAmount,
        startDate: p.startDate,
        endDate: p.endDate,
        status: p.status,
        createdBy: p.createdBy,
        creator: p.creator,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        contributionsIn,
        expensesOut,
        net,
        transactionCount: p.transactions.length,
        completion: completion !== null ? Math.min(completion, 100) : null
      };
    });

    res.json({
      success: true,
      semesterId: resolvedSemesterId,
      projects: projectsWithStats,
      count: projectsWithStats.length
    });
  } catch (err) {
    console.error("Error fetching projects:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAuthorized = await isTreasurerOrAdmin(userId);
    if (!isAuthorized) return res.status(403).json({ error: "Not authorized" });

    const { name, description, targetAmount, startDate, endDate, status, semesterId } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "Project name is required" });
    }

    const resolvedSemesterId = await resolveSemesterId(semesterId);
    if (!resolvedSemesterId) {
      return res.status(400).json({ error: "No active semester found. Please select a semester." });
    }

    const closed = await isSemesterClosed(prisma, resolvedSemesterId);
    if (closed) {
      return res.status(403).json({
        error: "Semester treasury is closed. Reopen to make changes."
      });
    }

    const project = await prisma.project.create({
      data: {
        semesterId: resolvedSemesterId,
        name: name.trim(),
        description: description || null,
        targetAmount: targetAmount ? parseFloat(targetAmount) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: status || "OPEN",
        createdBy: userId
      },
      include: {
        creator: { select: { id: true, fullName: true } }
      }
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, email: true }
    });
    await logAuditAction(project.id, "CREATE", null, project, userId, user?.fullName || user?.email || userId, req);

    res.status(201).json({ success: true, project });
  } catch (err) {
    console.error("Error creating project:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const isAuthorized = await isTreasurerOrAdmin(userId);
    if (!isAuthorized) return res.status(403).json({ error: "Not authorized" });

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, fullName: true } },
        semester: { select: { id: true, title: true, startDate: true, endDate: true } },
        transactions: {
          where: { deletedAt: null },
          orderBy: { date: "asc" },
          include: {
            user: { select: { id: true, fullName: true } },
            attachments: {
              where: { deletedAt: null },
              select: {
                id: true,
                cloudinaryUrl: true,
                fileType: true,
                fileName: true,
                fileSize: true
              }
            }
          }
        }
      }
    });

    if (!project || project.deletedAt) {
      return res.status(404).json({ error: "Project not found" });
    }

    let contributionsIn = 0;
    let expensesOut = 0;
    let runningBalance = 0;
    const transactionsWithBalance = project.transactions.map((t) => {
      const amount = Number(t.amount);
      if (t.type === "IN") {
        contributionsIn += amount;
        runningBalance += amount;
      } else {
        expensesOut += amount;
        runningBalance -= amount;
      }
      return { ...t, amount, runningBalance };
    });

    const net = contributionsIn - expensesOut;
    const completion = project.targetAmount > 0 ? (contributionsIn / project.targetAmount) * 100 : null;

    res.json({
      success: true,
      project: {
        ...project,
        transactions: transactionsWithBalance.reverse(),
        contributionsIn,
        expensesOut,
        net,
        transactionCount: project.transactions.length,
        completion: completion !== null ? Math.min(completion, 100) : null
      }
    });
  } catch (err) {
    console.error("Error fetching project detail:", err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const isAuthorized = await isTreasurerOrAdmin(userId);
    if (!isAuthorized) return res.status(403).json({ error: "Not authorized" });

    const oldProject = await prisma.project.findUnique({
      where: { id },
      select: { id: true, name: true, description: true, targetAmount: true, startDate: true, endDate: true, status: true, semesterId: true, deletedAt: true }
    });

    if (!oldProject || oldProject.deletedAt) {
      return res.status(404).json({ error: "Project not found" });
    }

    const closed = await isSemesterClosed(prisma, oldProject.semesterId);
    if (closed) {
      return res.status(403).json({
        error: "Semester treasury is closed. Reopen to make changes."
      });
    }

    const { name, description, targetAmount, startDate, endDate, status } = req.body;

    const updateData = { updatedAt: new Date() };
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: "Project name cannot be empty" });
      }
      updateData.name = name.trim();
    }
    if (description !== undefined) updateData.description = description || null;
    if (targetAmount !== undefined) updateData.targetAmount = targetAmount ? parseFloat(targetAmount) : null;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (status !== undefined) updateData.status = status;

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
      include: { creator: { select: { id: true, fullName: true } } }
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, email: true }
    });
    await logAuditAction(id, "UPDATE", oldProject, project, userId, user?.fullName || user?.email || userId, req);

    res.json({ success: true, project });
  } catch (err) {
    console.error("Error updating project:", err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const isAuthorized = await isTreasurerOrAdmin(userId);
    if (!isAuthorized) return res.status(403).json({ error: "Not authorized" });

    const oldProject = await prisma.project.findUnique({
      where: { id },
      select: { id: true, name: true, description: true, targetAmount: true, startDate: true, endDate: true, status: true, semesterId: true, deletedAt: true }
    });

    if (!oldProject || oldProject.deletedAt) {
      return res.status(404).json({ error: "Project not found" });
    }

    const closed = await isSemesterClosed(prisma, oldProject.semesterId);
    if (closed) {
      return res.status(403).json({
        error: "Semester treasury is closed. Reopen to make changes."
      });
    }

    const linkedCount = await prisma.treasurerTransaction.count({
      where: { projectId: id, deletedAt: null }
    });

    if (linkedCount > 0) {
      return res.status(400).json({
        error: "Cannot delete project with " + linkedCount + " linked transaction(s). Reassign or delete them first.",
        linkedTransactions: linkedCount
      });
    }

    await prisma.project.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId }
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, email: true }
    });
    await logAuditAction(id, "DELETE", oldProject, null, userId, user?.fullName || user?.email || userId, req);

    clearBalanceCache(oldProject.semesterId);

    res.json({ success: true, message: "Project soft-deleted" });
  } catch (err) {
    console.error("Error deleting project:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;