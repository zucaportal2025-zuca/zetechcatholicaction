const CACHE_TTL_MS = 30000;
const balanceCache = new Map();

function cacheKey(semesterId) {
  return "balance_" + semesterId;
}

function getCached(semesterId) {
  const entry = balanceCache.get(cacheKey(semesterId));
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    balanceCache.delete(cacheKey(semesterId));
    return null;
  }
  return entry.data;
}

function setCached(semesterId, data) {
  balanceCache.set(cacheKey(semesterId), { data, timestamp: Date.now() });
}

function clearBalanceCache(semesterId) {
  if (semesterId) {
    balanceCache.delete(cacheKey(semesterId));
  } else {
    balanceCache.clear();
  }
}

async function getSemesterTotals(prisma, semesterId) {
  const inAgg = await prisma.treasurerTransaction.aggregate({
    where: { semesterId, type: "IN", deletedAt: null },
    _sum: { amount: true }
  });
  const outAgg = await prisma.treasurerTransaction.aggregate({
    where: { semesterId, type: "OUT", deletedAt: null },
    _sum: { amount: true }
  });
  return {
    totalIn: inAgg._sum.amount || 0,
    totalOut: outAgg._sum.amount || 0
  };
}

async function getPreviousSemester(prisma, semester) {
  if (!semester.startDate) return null;
  return prisma.schedule.findFirst({
    where: {
      isPublished: true,
      endDate: { lt: semester.startDate },
      id: { not: semester.id }
    },
    orderBy: { endDate: "desc" }
  });
}

async function getOpeningBalance(prisma, semesterId) {
  const cached = getCached(semesterId);
  if (cached && typeof cached.opening === "number") return cached.opening;

  const semester = await prisma.schedule.findUnique({
    where: { id: semesterId },
    select: { id: true, startDate: true, endDate: true }
  });
  if (!semester) return 0;

  const prev = await getPreviousSemester(prisma, semester);
  let opening = 0;
  if (prev) {
    opening = await getClosingBalance(prisma, prev.id);
  }

  const existing = getCached(semesterId) || {};
  setCached(semesterId, { ...existing, opening });
  return opening;
}

async function getClosingBalance(prisma, semesterId) {
  const cached = getCached(semesterId);
  if (cached && typeof cached.closing === "number") return cached.closing;

  const opening = await getOpeningBalance(prisma, semesterId);
  const totals = await getSemesterTotals(prisma, semesterId);
  const closing = opening + totals.totalIn - totals.totalOut;

  const existing = getCached(semesterId) || {};
  setCached(semesterId, {
    ...existing,
    closing,
    totalIn: totals.totalIn,
    totalOut: totals.totalOut
  });
  return closing;
}

async function getSemesterBalanceSummary(prisma, semesterId) {
  const cached = getCached(semesterId);
  if (
    cached &&
    typeof cached.closing === "number" &&
    typeof cached.opening === "number" &&
    typeof cached.totalIn === "number"
  ) {
    return cached;
  }

  const opening = await getOpeningBalance(prisma, semesterId);
  const totals = await getSemesterTotals(prisma, semesterId);
  const closing = opening + totals.totalIn - totals.totalOut;

  const summary = {
    semesterId,
    opening,
    totalIn: totals.totalIn,
    totalOut: totals.totalOut,
    closing,
    netChange: totals.totalIn - totals.totalOut
  };
  setCached(semesterId, summary);
  return summary;
}

async function getBalanceAtDate(prisma, date) {
  const targetDate = new Date(date);
  const inAgg = await prisma.treasurerTransaction.aggregate({
    where: { type: "IN", deletedAt: null, date: { lt: targetDate } },
    _sum: { amount: true }
  });
  const outAgg = await prisma.treasurerTransaction.aggregate({
    where: { type: "OUT", deletedAt: null, date: { lt: targetDate } },
    _sum: { amount: true }
  });
  return (inAgg._sum.amount || 0) - (outAgg._sum.amount || 0);
}

module.exports = {
  getOpeningBalance,
  getClosingBalance,
  getSemesterBalanceSummary,
  getBalanceAtDate,
  getSemesterTotals,
  clearBalanceCache
};