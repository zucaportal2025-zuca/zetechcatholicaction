const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const multer = require("multer");

const {
  uploadToCloudinary,
  deleteFromCloudinary,
  validateFile
} = require("../services/cloudinaryService");

const {
  isSemesterClosed,
  getActiveSemester
} = require("../middleware/semesterLock");

const {
  getSemesterBalanceSummary,
  clearBalanceCache
} = require("../utils/balanceHelpers");

const upload = multer({ storage: multer.memoryStorage() });

const cache = new Map();
const CACHE_TTL = 30000;

function getCached(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

function clearCache() {
  cache.clear();
}

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

async function getUserName(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true, email: true }
  });
  return user?.fullName || user?.email || userId;
}

async function logAuditAction(transactionId, action, oldData, newData, userId, userName, req) {
  setImmediate(async () => {
    try {
      let changedFields = null;
      if (action === "UPDATE" && oldData && newData) {
        const fields = ["amount", "description", "category", "type", "date", "reference", "notes"];
        changedFields = [];

        fields.forEach((field) => {
          let oldValue = oldData[field];
          let newValue = newData[field];

          if (field === "date" && oldValue && newValue) {
            oldValue = new Date(oldValue).toISOString().split("T")[0];
            newValue = new Date(newValue).toISOString().split("T")[0];
          }

          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            changedFields.push({ field, oldValue, newValue });
          }
        });

        if (changedFields.length === 0) changedFields = null;
      }

      const ipAddress = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || null;
      const userAgent = req.headers["user-agent"] || null;

      await prisma.treasurerAuditLog.create({
        data: {
          transactionId,
          action,
          oldData,
          newData,
          changedFields,
          performedBy: userId,
          performedByName: userName,
          ipAddress,
          userAgent,
          timestamp: new Date()
        }
      });
    } catch (err) {
      console.error("Failed to create audit log:", err);
    }
  });
}

async function resolveSemesterId(providedSemesterId) {
  if (providedSemesterId) return providedSemesterId;
  const active = await getActiveSemester(prisma);
  return active?.id || null;
}

router.get("/campaign-summary", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAuthorized = await isTreasurerOrAdmin(userId);
    if (!isAuthorized) return res.status(403).json({ error: "Not authorized" });

    const cacheKey = `campaign_summary_global`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const activeSemester = await getActiveSemester(prisma);

    const campaigns = await prisma.contributionType.findMany({
      where: activeSemester?.id ? { semesterId: activeSemester.id } : {},
      select: {
        id: true,
        title: true,
        description: true,
        amountRequired: true,
        deadline: true,
        createdAt: true,
        jumuia: { select: { name: true } },
        pledges: { select: { amountPaid: true, pendingAmount: true, userId: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    const campaignStats = campaigns.map((campaign) => {
      const pledges = campaign.pledges || [];
      let totalCollected = 0;
      let totalPending = 0;
      let paidMembers = 0;

      for (const p of pledges) {
        totalCollected += p.amountPaid || 0;
        totalPending += p.pendingAmount || 0;
        if ((p.amountPaid || 0) > 0) paidMembers++;
      }

      const completion =
        campaign.amountRequired > 0
          ? (totalCollected / campaign.amountRequired) * 100
          : 0;

      return {
        id: campaign.id,
        title: campaign.title,
        description: campaign.description,
        target: campaign.amountRequired,
        collected: totalCollected,
        pending: totalPending,
        paidMembers,
        totalMembers: pledges.length,
        completion: Math.min(completion, 100),
        jumuia: campaign.jumuia?.name || null,
        deadline: campaign.deadline,
        status:
          completion >= 100
            ? "Completed"
            : totalCollected > 0
            ? "Active"
            : "Not Started"
      };
    });

    let grandTotalCollected = 0;
    let grandTotalPending = 0;
    let grandTotalTarget = 0;
    for (const c of campaignStats) {
      grandTotalCollected += c.collected;
      grandTotalPending += c.pending;
      grandTotalTarget += c.target;
    }

    const overallCompletion =
      grandTotalTarget > 0 ? (grandTotalCollected / grandTotalTarget) * 100 : 0;

    const response = {
      success: true,
      semesterId: activeSemester?.id || null,
      semesterTitle: activeSemester?.title || null,
      campaigns: campaignStats,
      summary: {
        totalCampaigns: campaignStats.length,
        totalCollected: grandTotalCollected,
        totalPending: grandTotalPending,
        totalTarget: grandTotalTarget,
        overallCompletion: overallCompletion.toFixed(1),
        activeCampaigns: campaignStats.filter((c) => c.status === "Active").length,
        completedCampaigns: campaignStats.filter((c) => c.status === "Completed").length
      }
    };

    setCache(cacheKey, response);
    res.json(response);
  } catch (err) {
    console.error("Error fetching campaign summary:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/member-summary", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAuthorized = await isTreasurerOrAdmin(userId);
    if (!isAuthorized) return res.status(403).json({ error: "Not authorized" });

    const cacheKey = `member_summary_${JSON.stringify(req.query)}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const { search, jumuiaId, statusFilter } = req.query;
    const activeSemester = await getActiveSemester(prisma);

    let whereClause = {
      AND: [
        { role: { not: "admin" } },
        { NOT: { email: { contains: "zucaportal", mode: "insensitive" } } },
        { NOT: { fullName: { contains: "ZUCA SYSTEM", mode: "insensitive" } } }
      ]
    };

    if (search) {
      whereClause.AND.push({
        OR: [
          { fullName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { membership_number: { contains: search, mode: "insensitive" } }
        ]
      });
    }
    if (jumuiaId && jumuiaId !== "all") {
      whereClause.jumuiaId = jumuiaId;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        fullName: true,
        email: true,
        membership_number: true,
        phone: true,
        jumuiaId: true,
        role: true,
        homeJumuia: { select: { name: true } },
        pledges: {
          where: activeSemester?.id
            ? { contributionType: { semesterId: activeSemester.id } }
            : {},
          select: {
            amountPaid: true,
            pendingAmount: true,
            contributionType: { select: { id: true, title: true, amountRequired: true } }
          }
        }
      },
      orderBy: { fullName: "asc" }
    });

    let totalAllPaid = 0;
    let totalAllPending = 0;
    let membersWithPledges = 0;

    const memberStats = users.map((user) => {
      let totalPaid = 0;
      let totalPending = 0;
      let campaignsParticipated = 0;
      const campaigns = [];

      for (const pledge of user.pledges) {
        totalPaid += pledge.amountPaid || 0;
        totalPending += pledge.pendingAmount || 0;
        if ((pledge.amountPaid || 0) > 0 || (pledge.pendingAmount || 0) > 0) {
          campaignsParticipated++;
        }
        campaigns.push({
          campaignId: pledge.contributionType.id,
          title: pledge.contributionType.title,
          amountPaid: pledge.amountPaid || 0,
          pendingAmount: pledge.pendingAmount || 0,
          required: pledge.contributionType.amountRequired
        });
      }

      totalAllPaid += totalPaid;
      totalAllPending += totalPending;
      if (totalPaid > 0 || totalPending > 0) membersWithPledges++;

      const status =
        totalPaid > 0
          ? totalPending > 0
            ? "Partial"
            : "Completed"
          : totalPending > 0
          ? "Pledged"
          : "No Pledge";

      return {
        id: user.id,
        name: user.fullName,
        email: user.email,
        phone: user.phone,
        membershipNumber: user.membership_number,
        jumuia: user.homeJumuia?.name || "None",
        role: user.role,
        total_paid: totalPaid,
        total_pending: totalPending,
        campaigns_participated: campaignsParticipated,
        status,
        campaigns: campaigns.slice(0, 10)
      };
    });

    let filteredMembers = memberStats;
    if (statusFilter && statusFilter !== "all") {
      filteredMembers = memberStats.filter((m) => m.status === statusFilter);
    }

    const response = {
      success: true,
      semesterId: activeSemester?.id || null,
      semesterTitle: activeSemester?.title || null,
      members: filteredMembers,
      summary: {
        totalMembers: memberStats.length,
        membersWithPledges,
        totalCollected: totalAllPaid,
        totalPending: totalAllPending,
        averagePerMember: membersWithPledges > 0 ? totalAllPaid / membersWithPledges : 0
      }
    };

    setCache(cacheKey, response);
    res.json(response);
  } catch (err) {
    console.error("Error fetching member summary:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/ledger", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAuthorized = await isTreasurerOrAdmin(userId);
    if (!isAuthorized) return res.status(403).json({ error: "Not authorized" });

    const { startDate, endDate, type, category, projectId, semesterId } = req.query;

    const resolvedSemesterId = await resolveSemesterId(semesterId);

    const cacheKey = `ledger_${JSON.stringify(req.query)}_${resolvedSemesterId || "all"}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    let whereClause = { deletedAt: null };
    if (resolvedSemesterId) whereClause.semesterId = resolvedSemesterId;
    if (projectId && projectId !== "all") whereClause.projectId = projectId;
    if (startDate) whereClause.date = { gte: new Date(startDate) };
    if (endDate) whereClause.date = { ...(whereClause.date || {}), lte: new Date(endDate) };
    if (type && type !== "all") whereClause.type = type;
    if (category && category !== "all") whereClause.category = category;

    const transactions = await prisma.treasurerTransaction.findMany({
      where: whereClause,
      orderBy: { date: "asc" },
      select: {
        id: true,
        date: true,
        description: true,
        category: true,
        type: true,
        amount: true,
        reference: true,
        notes: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        semesterId: true,
        projectId: true,
        project: { select: { id: true, name: true } },
        user: { select: { id: true, fullName: true } },
        attachments: {
          where: { deletedAt: null },
          select: {
            id: true,
            cloudinaryUrl: true,
            cloudinaryPublicId: true,
            fileType: true,
            fileName: true,
            fileSize: true,
            mimeType: true
          }
        }
      }
    });

    let balance = 0;
    let totalIn = 0;
    let totalOut = 0;
    const byCategory = {};

    const transactionsWithBalance = transactions.map((t) => {
      const amount = Number(t.amount);
      if (t.type === "IN") {
        balance += amount;
        totalIn += amount;
      } else {
        balance -= amount;
        totalOut += amount;
      }

      if (!byCategory[t.category]) byCategory[t.category] = { in: 0, out: 0 };
      if (t.type === "IN") byCategory[t.category].in += amount;
      else byCategory[t.category].out += amount;

      return { ...t, amount, runningBalance: balance };
    });

    let semesterSummary = null;
    if (resolvedSemesterId) {
      semesterSummary = await getSemesterBalanceSummary(prisma, resolvedSemesterId);
    }

    const response = {
      success: true,
      semesterId: resolvedSemesterId,
      transactions: transactionsWithBalance.reverse(),
      summary: {
        totalIn,
        totalOut,
        balance: totalIn - totalOut,
        count: transactions.length,
        openingBalance: semesterSummary?.opening || 0,
        closingBalance: semesterSummary?.closing || totalIn - totalOut
      },
      byCategory
    };

    setCache(cacheKey, response);
    res.json(response);
  } catch (err) {
    console.error("Error fetching ledger:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/ledger", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userName = await getUserName(userId);
    const isAuthorized = await isTreasurerOrAdmin(userId);
    if (!isAuthorized) return res.status(403).json({ error: "Not authorized" });

    const {
      date,
      description,
      category,
      type,
      amount,
      reference,
      notes,
      semesterId,
      projectId,
      attachmentIds
    } = req.body;

    if (!description || !amount || !category || !type) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (amount <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0" });
    }
    if (type !== "IN" && type !== "OUT") {
      return res.status(400).json({ error: "Type must be IN or OUT" });
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

    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, semesterId: true, deletedAt: true }
      });
      if (!project || project.deletedAt) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (project.semesterId !== resolvedSemesterId) {
        return res.status(400).json({ error: "Project belongs to a different semester" });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.treasurerTransaction.create({
        data: {
          date: new Date(date),
          description,
          category,
          type,
          amount: parseFloat(amount),
          reference: reference || null,
          notes: notes || null,
          createdBy: userId,
          semesterId: resolvedSemesterId,
          projectId: projectId || null
        },
        include: { user: { select: { id: true, fullName: true } } }
      });

      const createdAttachments = [];
      if (Array.isArray(attachmentIds) && attachmentIds.length > 0) {
        for (const att of attachmentIds) {
          const created = await tx.treasurerAttachment.create({
            data: {
              transactionId: transaction.id,
              cloudinaryUrl: att.url,
              cloudinaryPublicId: att.publicId,
              fileType: att.fileType,
              fileName: att.fileName,
              fileSize: att.fileSize,
              mimeType: att.mimeType || null,
              uploadedBy: userId
            }
          });
          createdAttachments.push(created);
        }
      }

      return { transaction, attachments: createdAttachments };
    });

    await logAuditAction(
      result.transaction.id,
      "CREATE",
      null,
      result.transaction,
      userId,
      userName,
      req
    );

    clearCache();
    clearBalanceCache(resolvedSemesterId);

    res.status(201).json({
      success: true,
      transaction: result.transaction,
      attachments: result.attachments
    });
  } catch (err) {
    console.error("Error creating transaction:", err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/ledger/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userName = await getUserName(userId);
    const isAuthorized = await isTreasurerOrAdmin(userId);
    if (!isAuthorized) return res.status(403).json({ error: "Not authorized" });

    const {
      date,
      description,
      category,
      type,
      amount,
      reference,
      notes,
      projectId,
      attachmentIds
    } = req.body;

    const oldTransaction = await prisma.treasurerTransaction.findUnique({
      where: { id },
      select: {
        id: true,
        date: true,
        description: true,
        category: true,
        type: true,
        amount: true,
        reference: true,
        notes: true,
        semesterId: true,
        projectId: true,
        deletedAt: true
      }
    });

    if (!oldTransaction || oldTransaction.deletedAt) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    if (oldTransaction.semesterId) {
      const closed = await isSemesterClosed(prisma, oldTransaction.semesterId);
      if (closed) {
        return res.status(403).json({
          error: "Semester treasury is closed. Reopen to make changes."
        });
      }
    }

    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, semesterId: true, deletedAt: true }
      });
      if (!project || project.deletedAt) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (oldTransaction.semesterId && project.semesterId !== oldTransaction.semesterId) {
        return res.status(400).json({ error: "Project belongs to a different semester" });
      }
    }

    const updateData = {};
    if (date !== undefined) updateData.date = new Date(date);
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (type !== undefined) updateData.type = type;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (reference !== undefined) updateData.reference = reference || null;
    if (notes !== undefined) updateData.notes = notes || null;
    if (projectId !== undefined) updateData.projectId = projectId || null;
    updateData.updatedAt = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.treasurerTransaction.update({
        where: { id },
        data: updateData,
        include: {
          user: { select: { id: true, fullName: true } },
          project: { select: { id: true, name: true } },
          attachments: { where: { deletedAt: null } }
        }
      });

      let createdAttachments = [];
      if (Array.isArray(attachmentIds) && attachmentIds.length > 0) {
        createdAttachments = [];
        for (const att of attachmentIds) {
          const created = await tx.treasurerAttachment.create({
            data: {
              transactionId: transaction.id,
              cloudinaryUrl: att.url,
              cloudinaryPublicId: att.publicId,
              fileType: att.fileType,
              fileName: att.fileName,
              fileSize: att.fileSize,
              mimeType: att.mimeType || null,
              uploadedBy: userId
            }
          });
          createdAttachments.push(created);
        }
      }

      return { transaction, newAttachments: createdAttachments };
    });

    await logAuditAction(
      id,
      "UPDATE",
      oldTransaction,
      result.transaction,
      userId,
      userName,
      req
    );

    clearCache();
    if (oldTransaction.semesterId) clearBalanceCache(oldTransaction.semesterId);

    res.json({
      success: true,
      transaction: result.transaction,
      newAttachments: result.newAttachments
    });
  } catch (err) {
    console.error("Error updating transaction:", err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/ledger/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userName = await getUserName(userId);
    const isAuthorized = await isTreasurerOrAdmin(userId);
    if (!isAuthorized) return res.status(403).json({ error: "Not authorized" });

    const { reason } = req.body || {};

    const oldTransaction = await prisma.treasurerTransaction.findUnique({
      where: { id },
      select: {
        id: true,
        date: true,
        description: true,
        category: true,
        type: true,
        amount: true,
        reference: true,
        notes: true,
        semesterId: true,
        projectId: true,
        deletedAt: true
      }
    });

    if (!oldTransaction || oldTransaction.deletedAt) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    if (oldTransaction.semesterId) {
      const closed = await isSemesterClosed(prisma, oldTransaction.semesterId);
      if (closed) {
        return res.status(403).json({
          error: "Semester treasury is closed. Reopen to make changes."
        });
      }
    }

    await prisma.treasurerTransaction.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
        deleteReason: reason || null
      }
    });

    await logAuditAction(
      id,
      "DELETE",
      oldTransaction,
      null,
      userId,
      userName,
      req
    );

    clearCache();
    if (oldTransaction.semesterId) clearBalanceCache(oldTransaction.semesterId);

    res.json({ success: true, message: "Transaction soft-deleted" });
  } catch (err) {
    console.error("Error deleting transaction:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/dashboard-summary", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAuthorized = await isTreasurerOrAdmin(userId);
    if (!isAuthorized) return res.status(403).json({ error: "Not authorized" });

    const activeSemester = await getActiveSemester(prisma);
    const cacheKey = `dashboard_summary_${activeSemester?.id || "none"}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const semesterFilter = activeSemester?.id
      ? { semesterId: activeSemester.id }
      : {};

    const [campaigns, recentTransactions, totalMembers, membersWithPledges] = await Promise.all([
      prisma.contributionType.findMany({
        where: semesterFilter,
        include: { pledges: { select: { amountPaid: true, pendingAmount: true } } }
      }),
      prisma.treasurerTransaction.findMany({
        where: {
          deletedAt: null,
          ...semesterFilter,
          date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        },
        select: { type: true, amount: true }
      }),
      prisma.user.count(),
      prisma.pledge.groupBy({
        by: ["userId"],
        where: {
          OR: [{ amountPaid: { gt: 0 } }, { pendingAmount: { gt: 0 } }],
          ...(activeSemester?.id
            ? { contributionType: { semesterId: activeSemester.id } }
            : {})
        }
      })
    ]);

    let totalCollected = 0;
    let totalPending = 0;
    for (const c of campaigns) {
      for (const p of c.pledges) {
        totalCollected += p.amountPaid || 0;
        totalPending += p.pendingAmount || 0;
      }
    }

    let ledgerIn = 0;
    let ledgerOut = 0;
    for (const t of recentTransactions) {
      if (t.type === "IN") ledgerIn += t.amount;
      else ledgerOut += t.amount;
    }

    let balanceSummary = null;
    if (activeSemester?.id) {
      balanceSummary = await getSemesterBalanceSummary(prisma, activeSemester.id);
    }

    const response = {
      success: true,
      semesterId: activeSemester?.id || null,
      semesterTitle: activeSemester?.title || null,
      semesterClosed: !!activeSemester?.treasuryClosedAt,
      campaigns: {
        totalCollected,
        totalPending,
        totalCampaigns: campaigns.length,
        completionRate:
          totalCollected + totalPending > 0
            ? (totalCollected / (totalCollected + totalPending)) * 100
            : 0
      },
      ledger: {
        opening: balanceSummary?.opening || 0,
        totalIn: ledgerIn,
        totalOut: ledgerOut,
        netChange: ledgerIn - ledgerOut,
        closing: balanceSummary?.closing || ledgerIn - ledgerOut
      },
      members: {
        total: totalMembers,
        activeContributors: membersWithPledges.length
      }
    };

    setCache(cacheKey, response);
    res.json(response);
  } catch (err) {
    console.error("Error fetching dashboard summary:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/audit-trail", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAuthorized = await isTreasurerOrAdmin(userId);
    if (!isAuthorized) return res.status(403).json({ error: "Not authorized" });

    const cacheKey = `audit_trail_${JSON.stringify(req.query)}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const { limit = 100, transactionId } = req.query;
    let whereClause = {};
    if (transactionId) whereClause.transactionId = transactionId;

    const auditLogs = await prisma.treasurerAuditLog.findMany({
      where: whereClause,
      orderBy: { timestamp: "desc" },
      take: parseInt(limit),
      select: {
        id: true,
        transactionId: true,
        action: true,
        oldData: true,
        newData: true,
        changedFields: true,
        performedByName: true,
        ipAddress: true,
        timestamp: true
      }
    });

    const response = { success: true, auditLogs };
    setCache(cacheKey, response);
    res.json(response);
  } catch (err) {
    console.error("Error fetching audit trail:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/attachments/upload", authenticate, upload.single("file"), async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAuthorized = await isTreasurerOrAdmin(userId);
    if (!isAuthorized) return res.status(403).json({ error: "Not authorized" });

    const validation = validateFile(req.file);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const resolvedSemesterId = await resolveSemesterId(req.body?.semesterId);

    if (resolvedSemesterId) {
      const closed = await isSemesterClosed(prisma, resolvedSemesterId);
      if (closed) {
        return res.status(403).json({
          error: "Semester treasury is closed. Reopen to make changes."
        });
      }
    }

    const uploaded = await uploadToCloudinary(req.file, {
      semesterId: resolvedSemesterId || "unassigned"
    });

    res.json({
      success: true,
      attachment: {
        url: uploaded.url,
        publicId: uploaded.publicId,
        fileType: uploaded.fileType,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      }
    });
  } catch (err) {
    console.error("Attachment upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/attachments/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const isAuthorized = await isTreasurerOrAdmin(userId);
    if (!isAuthorized) return res.status(403).json({ error: "Not authorized" });

    const attachment = await prisma.treasurerAttachment.findUnique({
      where: { id }
    });

    if (!attachment || attachment.deletedAt) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    const transaction = await prisma.treasurerTransaction.findUnique({
      where: { id: attachment.transactionId },
      select: { semesterId: true }
    });

    if (transaction?.semesterId) {
      const closed = await isSemesterClosed(prisma, transaction.semesterId);
      if (closed) {
        return res.status(403).json({
          error: "Semester treasury is closed. Reopen to make changes."
        });
      }
    }

    await prisma.treasurerAttachment.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    try {
      await deleteFromCloudinary(attachment.cloudinaryPublicId, attachment.fileType);
    } catch (err) {
      console.error("Cloudinary delete warning:", err.message);
    }

    if (transaction?.semesterId) {
      clearBalanceCache(transaction.semesterId);
    }

    res.json({ success: true, message: "Attachment deleted" });
  } catch (err) {
    console.error("Attachment delete error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/clear-cache", authenticate, async (req, res) => {
  const userId = req.user.userId;
  const isAuthorized = await isTreasurerOrAdmin(userId);
  if (!isAuthorized) return res.status(403).json({ error: "Not authorized" });

  clearCache();
  clearBalanceCache();
  res.json({ success: true, message: "Cache cleared" });
});

module.exports = router;