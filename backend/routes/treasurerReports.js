const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Simple in-memory cache with TTL
const cache = new Map();
const CACHE_TTL = 30000; // 30 seconds cache

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

// Helper: Check if user is treasurer or admin (fast with caching)
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

// Helper: Get user's full name
async function getUserName(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true, email: true }
  });
  return user?.fullName || user?.email || userId;
}

// Helper: Log all ledger actions for audit trail (async, non-blocking)
async function logAuditAction(transactionId, action, oldData, newData, userId, userName, req) {
  setImmediate(async () => {
    try {
      let changedFields = null;
      if (action === "UPDATE" && oldData && newData) {
        const fields = ['amount', 'description', 'category', 'type', 'date', 'reference', 'notes'];
        changedFields = [];
        
        fields.forEach(field => {
          let oldValue = oldData[field];
          let newValue = newData[field];
          
          if (field === 'date' && oldValue && newValue) {
            oldValue = new Date(oldValue).toISOString().split('T')[0];
            newValue = new Date(newValue).toISOString().split('T')[0];
          }
          
          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            changedFields.push({ field, oldValue, newValue });
          }
        });
        
        if (changedFields.length === 0) changedFields = null;
      }
      
      const ipAddress = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || null;
      const userAgent = req.headers['user-agent'] || null;
      
      await prisma.treasurerAuditLog.create({
        data: {
          transactionId, action, oldData, newData, changedFields,
          performedBy: userId, performedByName: userName,
          ipAddress, userAgent, timestamp: new Date()
        }
      });
    } catch (err) {
      console.error("❌ Failed to create audit log:", err);
    }
  });
}

// ==================== 1. CAMPAIGN SUMMARY ====================
router.get("/campaign-summary", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAuthorized = await isTreasurerOrAdmin(userId);
    if (!isAuthorized) return res.status(403).json({ error: "Not authorized" });
    
    const cacheKey = `campaign_summary_${userId}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);
    
    const campaigns = await prisma.contributionType.findMany({
      select: {
        id: true, title: true, description: true, amountRequired: true,
        deadline: true, createdAt: true,
        jumuia: { select: { name: true } },
        pledges: { select: { amountPaid: true, pendingAmount: true, userId: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    
    const campaignStats = campaigns.map(campaign => {
      const pledges = campaign.pledges || [];
      let totalCollected = 0, totalPending = 0, paidMembers = 0;
      
      for (const p of pledges) {
        totalCollected += p.amountPaid || 0;
        totalPending += p.pendingAmount || 0;
        if ((p.amountPaid || 0) > 0) paidMembers++;
      }
      
      const completion = campaign.amountRequired > 0 ? (totalCollected / campaign.amountRequired) * 100 : 0;
      
      return {
        id: campaign.id, title: campaign.title, description: campaign.description,
        target: campaign.amountRequired, collected: totalCollected, pending: totalPending,
        paidMembers, totalMembers: pledges.length,
        completion: Math.min(completion, 100),
        jumuia: campaign.jumuia?.name || null, deadline: campaign.deadline,
        status: completion >= 100 ? "Completed" : totalCollected > 0 ? "Active" : "Not Started"
      };
    });
    
    let grandTotalCollected = 0, grandTotalPending = 0, grandTotalTarget = 0;
    for (const c of campaignStats) {
      grandTotalCollected += c.collected;
      grandTotalPending += c.pending;
      grandTotalTarget += c.target;
    }
    
    const overallCompletion = grandTotalTarget > 0 ? (grandTotalCollected / grandTotalTarget) * 100 : 0;
    
    const response = {
      success: true,
      campaigns: campaignStats,
      summary: {
        totalCampaigns: campaignStats.length,
        totalCollected: grandTotalCollected,
        totalPending: grandTotalPending,
        totalTarget: grandTotalTarget,
        overallCompletion: overallCompletion.toFixed(1),
        activeCampaigns: campaignStats.filter(c => c.status === "Active").length,
        completedCampaigns: campaignStats.filter(c => c.status === "Completed").length
      }
    };
    
    setCache(cacheKey, response);
    res.json(response);
    
  } catch (err) {
    console.error("Error fetching campaign summary:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== 2. MEMBER CONTRIBUTION SUMMARY ====================
router.get("/member-summary", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAuthorized = await isTreasurerOrAdmin(userId);
    if (!isAuthorized) return res.status(403).json({ error: "Not authorized" });
    
    const cacheKey = `member_summary_${userId}_${JSON.stringify(req.query)}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);
    
    const { search, jumuiaId, statusFilter } = req.query;
    
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
        id: true, fullName: true, email: true, membership_number: true,
        phone: true, jumuiaId: true, role: true,
        homeJumuia: { select: { name: true } },
        pledges: {
          select: {
            amountPaid: true, pendingAmount: true,
            contributionType: { select: { id: true, title: true, amountRequired: true } }
          }
        }
      },
      orderBy: { fullName: "asc" }
    });
    
    let totalAllPaid = 0, totalAllPending = 0;
    let membersWithPledges = 0;
    
    const memberStats = users.map(user => {
      let totalPaid = 0, totalPending = 0, campaignsParticipated = 0;
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
      
      const status = totalPaid > 0 
        ? (totalPending > 0 ? "Partial" : "Completed") 
        : (totalPending > 0 ? "Pledged" : "No Pledge");
      
      return {
        id: user.id, name: user.fullName, email: user.email, phone: user.phone,
        membershipNumber: user.membership_number, jumuia: user.homeJumuia?.name || "None",
        role: user.role, total_paid: totalPaid, total_pending: totalPending,
        campaigns_participated: campaignsParticipated, status, campaigns: campaigns.slice(0, 10)
      };
    });
    
    let filteredMembers = memberStats;
    if (statusFilter && statusFilter !== "all") {
      filteredMembers = memberStats.filter(m => m.status === statusFilter);
    }
    
    const response = {
      success: true,
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

// ==================== 3. LEDGER TRANSACTIONS ====================
router.get("/ledger", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAuthorized = await isTreasurerOrAdmin(userId);
    if (!isAuthorized) return res.status(403).json({ error: "Not authorized" });
    
    const cacheKey = `ledger_${userId}_${JSON.stringify(req.query)}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);
    
    const { startDate, endDate, type, category } = req.query;
    
    let whereClause = {};
    if (startDate) whereClause.date = { gte: new Date(startDate) };
    if (endDate) whereClause.date = { lte: new Date(endDate) };
    if (type && type !== "all") whereClause.type = type;
    if (category && category !== "all") whereClause.category = category;
    
    const transactions = await prisma.treasurerTransaction.findMany({
      where: whereClause,
      orderBy: { date: "asc" },
      select: {
        id: true, date: true, description: true, category: true,
        type: true, amount: true, reference: true, notes: true,
        createdBy: true, createdAt: true, updatedAt: true,
        user: { select: { id: true, fullName: true } }
      }
    });
    
    let balance = 0;
    let totalIn = 0, totalOut = 0;
    const byCategory = {};
    
    const transactionsWithBalance = transactions.map(t => {
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
    
    const response = {
      success: true,
      transactions: transactionsWithBalance.reverse(),
      summary: { totalIn, totalOut, balance: totalIn - totalOut, count: transactions.length },
      byCategory
    };
    
    setCache(cacheKey, response);
    res.json(response);
    
  } catch (err) {
    console.error("Error fetching ledger:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== 4. CREATE LEDGER TRANSACTION (WITH AUDIT) ====================
router.post("/ledger", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userName = await getUserName(userId);
    const isAuthorized = await isTreasurerOrAdmin(userId);
    if (!isAuthorized) return res.status(403).json({ error: "Not authorized" });
    
    const { date, description, category, type, amount, reference, notes } = req.body;
    
    if (!description || !amount || !category || !type) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (amount <= 0) return res.status(400).json({ error: "Amount must be greater than 0" });
    
    const transaction = await prisma.treasurerTransaction.create({
      data: {
        date: new Date(date), description, category, type,
        amount: parseFloat(amount), reference: reference || null,
        notes: notes || null, createdBy: userId
      },
      include: { user: { select: { id: true, fullName: true } } }
    });
    
    await logAuditAction(transaction.id, "CREATE", null, transaction, userId, userName, req);
    clearCache();
    
    res.status(201).json({ success: true, transaction });
    
  } catch (err) {
    console.error("Error creating transaction:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== 5. UPDATE LEDGER TRANSACTION (WITH AUDIT & FIXED USERNAME) ====================
router.put("/ledger/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userName = await getUserName(userId); // FIXED: Get user name from DB
    const isAuthorized = await isTreasurerOrAdmin(userId);
    if (!isAuthorized) return res.status(403).json({ error: "Not authorized" });
    
    const { date, description, category, type, amount, reference, notes } = req.body;
    
    const oldTransaction = await prisma.treasurerTransaction.findUnique({
      where: { id },
      select: { id: true, date: true, description: true, category: true, type: true, amount: true, reference: true, notes: true }
    });
    
    if (!oldTransaction) return res.status(404).json({ error: "Transaction not found" });
    
    const transaction = await prisma.treasurerTransaction.update({
      where: { id },
      data: {
        date: date ? new Date(date) : undefined, description: description || undefined,
        category: category || undefined, type: type || undefined,
        amount: amount ? parseFloat(amount) : undefined, reference: reference || null,
        notes: notes || null, updatedAt: new Date()
      },
      include: { user: { select: { id: true, fullName: true } } }
    });
    
    await logAuditAction(id, "UPDATE", oldTransaction, transaction, userId, userName, req);
    clearCache();
    
    res.json({ success: true, transaction });
    
  } catch (err) {
    console.error("Error updating transaction:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== 6. DELETE LEDGER TRANSACTION (WITH AUDIT & FIXED USERNAME) ====================
router.delete("/ledger/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userName = await getUserName(userId); // FIXED: Get user name from DB
    const isAuthorized = await isTreasurerOrAdmin(userId);
    if (!isAuthorized) return res.status(403).json({ error: "Not authorized" });
    
    const oldTransaction = await prisma.treasurerTransaction.findUnique({
      where: { id },
      select: { id: true, date: true, description: true, category: true, type: true, amount: true, reference: true, notes: true }
    });
    
    if (!oldTransaction) return res.status(404).json({ error: "Transaction not found" });
    
    await prisma.treasurerTransaction.delete({ where: { id } });
    await logAuditAction(id, "DELETE", oldTransaction, null, userId, userName, req);
    clearCache();
    
    res.json({ success: true, message: "Transaction deleted" });
    
  } catch (err) {
    console.error("Error deleting transaction:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== 7. DASHBOARD SUMMARY ====================
router.get("/dashboard-summary", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAuthorized = await isTreasurerOrAdmin(userId);
    if (!isAuthorized) return res.status(403).json({ error: "Not authorized" });
    
    const cacheKey = `dashboard_summary_${userId}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);
    
    const [campaigns, recentTransactions, totalMembers, membersWithPledges] = await Promise.all([
      prisma.contributionType.findMany({
        include: { pledges: { select: { amountPaid: true, pendingAmount: true } } }
      }),
      prisma.treasurerTransaction.findMany({
        where: { date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        select: { type: true, amount: true }
      }),
      prisma.user.count(),
      prisma.pledge.groupBy({
        by: ["userId"],
        where: { OR: [{ amountPaid: { gt: 0 } }, { pendingAmount: { gt: 0 } }] }
      })
    ]);
    
    let totalCollected = 0, totalPending = 0;
    for (const c of campaigns) {
      for (const p of c.pledges) {
        totalCollected += p.amountPaid || 0;
        totalPending += p.pendingAmount || 0;
      }
    }
    
    let ledgerIn = 0, ledgerOut = 0;
    for (const t of recentTransactions) {
      if (t.type === "IN") ledgerIn += t.amount;
      else ledgerOut += t.amount;
    }
    
    const response = {
      success: true,
      campaigns: {
        totalCollected, totalPending, totalCampaigns: campaigns.length,
        completionRate: totalCollected + totalPending > 0 ? (totalCollected / (totalCollected + totalPending)) * 100 : 0
      },
      ledger: { totalIn: ledgerIn, totalOut: ledgerOut, netChange: ledgerIn - ledgerOut },
      members: { total: totalMembers, activeContributors: membersWithPledges.length }
    };
    
    setCache(cacheKey, response);
    res.json(response);
    
  } catch (err) {
    console.error("Error fetching dashboard summary:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== 8. GET AUDIT TRAIL ====================
router.get("/audit-trail", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAuthorized = await isTreasurerOrAdmin(userId);
    if (!isAuthorized) return res.status(403).json({ error: "Not authorized" });
    
    const cacheKey = `audit_trail_${userId}_${JSON.stringify(req.query)}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);
    
    const { limit = 100, transactionId } = req.query;
    let whereClause = {};
    if (transactionId) whereClause.transactionId = transactionId;
    
    const auditLogs = await prisma.treasurerAuditLog.findMany({
      where: whereClause,
      orderBy: { timestamp: "desc" },
      take: parseInt(limit),
      select: { id: true, transactionId: true, action: true, oldData: true, newData: true, changedFields: true, performedByName: true, ipAddress: true, timestamp: true }
    });
    
    const response = { success: true, auditLogs };
    setCache(cacheKey, response);
    res.json(response);
    
  } catch (err) {
    console.error("Error fetching audit trail:", err);
    res.status(500).json({ error: err.message });
  }
});

// Clear cache endpoint
router.post("/clear-cache", authenticate, async (req, res) => {
  const userId = req.user.userId;
  const isAuthorized = await isTreasurerOrAdmin(userId);
  if (!isAuthorized) return res.status(403).json({ error: "Not authorized" });
  
  clearCache();
  res.json({ success: true, message: "Cache cleared" });
});

module.exports = router;