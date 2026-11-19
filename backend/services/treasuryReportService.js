async function buildSemesterReport(prisma, semesterId) {
  const semester = await prisma.schedule.findUnique({
    where: { id: semesterId },
    select: {
      id: true,
      title: true,
      startDate: true,
      endDate: true,
      treasuryClosedAt: true,
      treasuryReopenCount: true
    }
  });

  if (!semester) return null;

  const {
    getSemesterBalanceSummary
  } = require("../utils/balanceHelpers");

  const summary = await getSemesterBalanceSummary(prisma, semesterId);

  const transactions = await prisma.treasurerTransaction.findMany({
    where: { semesterId, deletedAt: null },
    orderBy: { date: "asc" },
    include: {
      project: { select: { id: true, name: true } },
      attachments: {
        where: { deletedAt: null },
        select: { id: true, fileName: true, cloudinaryUrl: true, fileType: true }
      }
    }
  });

  const projects = await prisma.project.findMany({
    where: { semesterId, deletedAt: null },
    select: { id: true, name: true, targetAmount: true, status: true }
  });

  const projectsMap = new Map();
  for (const p of projects) {
    projectsMap.set(p.id, {
      projectId: p.id,
      projectName: p.name,
      targetAmount: p.targetAmount,
      status: p.status,
      contributionsIn: [],
      expensesOut: [],
      totalIn: 0,
      totalOut: 0,
      net: 0
    });
  }

  const generalIn = [];
  const generalOut = [];

  for (const t of transactions) {
    const entry = {
      id: t.id,
      date: t.date,
      description: t.description,
      category: t.category,
      amount: t.amount,
      type: t.type,
      reference: t.reference,
      notes: t.notes,
      attachments: t.attachments.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        url: a.cloudinaryUrl,
        fileType: a.fileType
      }))
    };

    if (t.projectId && projectsMap.has(t.projectId)) {
      const proj = projectsMap.get(t.projectId);
      if (t.type === "IN") {
        proj.contributionsIn.push(entry);
        proj.totalIn += t.amount;
      } else {
        proj.expensesOut.push(entry);
        proj.totalOut += t.amount;
      }
    } else {
      if (t.type === "IN") generalIn.push(entry);
      else generalOut.push(entry);
    }
  }

  const projectBreakdown = Array.from(projectsMap.values()).map((p) => ({
    ...p,
    net: p.totalIn - p.totalOut,
    completion:
      p.targetAmount > 0
        ? Math.min((p.totalIn / p.targetAmount) * 100, 100)
        : null
  }));

  const generalInGrouped = groupByCategory(generalIn);
  const generalOutGrouped = groupByCategory(generalOut);

  return {
    semester: {
      id: semester.id,
      title: semester.title,
      startDate: semester.startDate,
      endDate: semester.endDate,
      isClosed: !!semester.treasuryClosedAt,
      reopenCount: semester.treasuryReopenCount
    },
    balances: {
      opening: summary.opening,
      totalIn: summary.totalIn,
      totalOut: summary.totalOut,
      closing: summary.closing,
      netChange: summary.netChange
    },
    projects: projectBreakdown,
    generalIn: generalInGrouped,
    generalOut: generalOutGrouped,
    transactionCount: transactions.length,
    generatedAt: new Date().toISOString()
  };
}

function groupByCategory(entries) {
  const groups = {};
  for (const e of entries) {
    if (!groups[e.category]) {
      groups[e.category] = { category: e.category, total: 0, entries: [] };
    }
    groups[e.category].total += e.amount;
    groups[e.category].entries.push(e);
  }
  return Object.values(groups);
}

async function buildProjectReport(prisma, projectId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      semester: { select: { id: true, title: true } },
      creator: { select: { id: true, fullName: true } },
      transactions: {
        where: { deletedAt: null },
        orderBy: { date: "asc" },
        include: {
          attachments: {
            where: { deletedAt: null },
            select: { id: true, fileName: true, cloudinaryUrl: true, fileType: true }
          }
        }
      }
    }
  });

  if (!project || project.deletedAt) return null;

  let totalIn = 0;
  let totalOut = 0;
  const contributions = [];
  const expenses = [];

  for (const t of project.transactions) {
    const entry = {
      id: t.id,
      date: t.date,
      description: t.description,
      category: t.category,
      amount: t.amount,
      reference: t.reference,
      attachments: t.attachments.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        url: a.cloudinaryUrl,
        fileType: a.fileType
      }))
    };
    if (t.type === "IN") {
      contributions.push(entry);
      totalIn += t.amount;
    } else {
      expenses.push(entry);
      totalOut += t.amount;
    }
  }

  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      targetAmount: project.targetAmount,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      semester: project.semester,
      creator: project.creator
    },
    summary: {
      totalIn,
      totalOut,
      net: totalIn - totalOut,
      transactionCount: project.transactions.length,
      completion:
        project.targetAmount > 0
          ? Math.min((totalIn / project.targetAmount) * 100, 100)
          : null
    },
    contributions,
    expenses,
    generatedAt: new Date().toISOString()
  };
}

async function buildRangeReport(prisma, startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const { getBalanceAtDate } = require("../utils/balanceHelpers");
  const opening = await getBalanceAtDate(prisma, start);

  const transactions = await prisma.treasurerTransaction.findMany({
    where: {
      deletedAt: null,
      date: { gte: start, lte: end }
    },
    orderBy: { date: "asc" },
    include: {
      project: { select: { id: true, name: true } },
      semester: { select: { id: true, title: true } },
      attachments: {
        where: { deletedAt: null },
        select: { id: true, fileName: true, cloudinaryUrl: true, fileType: true }
      }
    }
  });

  let totalIn = 0;
  let totalOut = 0;
  for (const t of transactions) {
    if (t.type === "IN") totalIn += t.amount;
    else totalOut += t.amount;
  }

  return {
    period: {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0]
    },
    balances: {
      opening,
      totalIn,
      totalOut,
      closing: opening + totalIn - totalOut,
      netChange: totalIn - totalOut
    },
    transactions: transactions.map((t) => ({
      id: t.id,
      date: t.date,
      description: t.description,
      category: t.category,
      amount: t.amount,
      type: t.type,
      reference: t.reference,
      project: t.project,
      semester: t.semester,
      attachments: t.attachments.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        url: a.cloudinaryUrl,
        fileType: a.fileType
      }))
    })),
    transactionCount: transactions.length,
    generatedAt: new Date().toISOString()
  };
}

async function buildYearReport(prisma, year) {
  const start = new Date(year + "-01-01T00:00:00.000Z");
  const end = new Date(year + "-12-31T23:59:59.999Z");

  const semesters = await prisma.schedule.findMany({
    where: {
      isPublished: true,
      startDate: { lte: end },
      endDate: { gte: start }
    },
    orderBy: { startDate: "asc" },
    select: { id: true, title: true, startDate: true, endDate: true }
  });

  const { getSemesterBalanceSummary } = require("../utils/balanceHelpers");

  const semesterReports = [];
  let yearOpening = null;
  let yearClosing = null;

  for (const sem of semesters) {
    const summary = await getSemesterBalanceSummary(prisma, sem.id);
    if (yearOpening === null) yearOpening = summary.opening;
    yearClosing = summary.closing;

    semesterReports.push({
      semesterId: sem.id,
      title: sem.title,
      startDate: sem.startDate,
      endDate: sem.endDate,
      balances: summary
    });
  }

  if (yearOpening === null) yearOpening = 0;
  if (yearClosing === null) yearClosing = 0;

  return {
    year,
    period: {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0]
    },
    balances: {
      opening: yearOpening,
      closing: yearClosing,
      netChange: yearClosing - yearOpening
    },
    semesters: semesterReports,
    generatedAt: new Date().toISOString()
  };
}

module.exports = {
  buildSemesterReport,
  buildProjectReport,
  buildRangeReport,
  buildYearReport
};