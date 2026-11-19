const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function getActiveSemester(prismaClient) {
  return prismaClient.schedule.findFirst({
    where: { isActiveSemester: true },
    select: {
      id: true,
      title: true,
      treasuryClosedAt: true,
      treasuryClosedBy: true,
      treasuryReopenCount: true
    }
  });
}

async function isSemesterClosed(prismaClient, semesterId) {
  if (!semesterId) return false;
  const semester = await prismaClient.schedule.findUnique({
    where: { id: semesterId },
    select: { treasuryClosedAt: true }
  });
  return !!semester?.treasuryClosedAt;
}

function requireSemesterOpen(options = {}) {
  const {
    semesterIdFrom = "body",
    semesterField = "semesterId",
    allowIfNoSemester = false
  } = options;

  return async (req, res, next) => {
    try {
      let semesterId = null;

      if (semesterIdFrom === "body") {
        semesterId = req.body?.[semesterField] || null;
      } else if (semesterIdFrom === "params") {
        semesterId = req.params?.[semesterField] || null;
      } else if (semesterIdFrom === "query") {
        semesterId = req.query?.[semesterField] || null;
      }

      if (!semesterId) {
        const active = await getActiveSemester(prisma);
        if (!active) {
          if (allowIfNoSemester) return next();
          return res.status(400).json({ error: "No active semester found" });
        }
        semesterId = active.id;
      }

      const semester = await prisma.schedule.findUnique({
        where: { id: semesterId },
        select: { id: true, title: true, treasuryClosedAt: true }
      });

      if (!semester) {
        if (allowIfNoSemester) return next();
        return res.status(404).json({ error: "Semester not found" });
      }

      if (semester.treasuryClosedAt) {
        return res.status(403).json({
          error: "Semester treasury is closed. Reopen to make changes.",
          semesterId: semester.id,
          semesterTitle: semester.title,
          closedAt: semester.treasuryClosedAt
        });
      }

      req.semester = {
        id: semester.id,
        title: semester.title,
        closedAt: semester.treasuryClosedAt
      };

      next();
    } catch (err) {
      console.error("semesterLock middleware error:", err);
      res.status(500).json({ error: "Failed to verify semester lock" });
    }
  };
}

async function attachActiveSemester(req, res, next) {
  try {
    const active = await getActiveSemester(prisma);
    req.activeSemester = active || null;
    next();
  } catch (err) {
    console.error("attachActiveSemester error:", err);
    req.activeSemester = null;
    next();
  }
}

module.exports = {
  requireSemesterOpen,
  isSemesterClosed,
  getActiveSemester,
  attachActiveSemester
};