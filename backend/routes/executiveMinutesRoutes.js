const express = require("express");
const router = express.Router();
const { authenticate, requireAdmin } = require("../middleware/auth");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Helper: Check if user has any executive position
async function hasExecutiveRole(userId) {
  try {
    const executive = await prisma.executive.findFirst({
      where: { 
        userId: userId,
        isActive: true 
      },
      select: { id: true }
    });
    return executive !== null;
  } catch (err) {
    console.error("hasExecutiveRole error:", err);
    return false;
  }
}

// Helper: Check if user is admin
async function isAdmin(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    return user?.role === "admin";
  } catch (err) {
    console.error("isAdmin error:", err);
    return false;
  }
}

// ==================== GET ALL EXECUTIVE MINUTES ====================
router.get("/", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAdminUser = await isAdmin(userId);
    const hasExecutive = await hasExecutiveRole(userId);

    // ✅ Only allow admins and executive members
    if (!isAdminUser && !hasExecutive) {
      return res.status(403).json({ 
        error: "Access denied. Only executive members can view executive minutes." 
      });
    }

    // Get user's jumuia for jumuia minutes
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { jumuiaId: true }
    });

    let whereClause = {};

    if (isAdminUser) {
      // Admins see all minutes
      whereClause = {};
    } else {
      // Executives see executive minutes + their jumuia minutes
      whereClause = {
        OR: [
          { type: "EXECUTIVE" },
          { type: "JUMUIA", jumuiaId: user?.jumuiaId }
        ]
      };
    }

    const minutes = await prisma.meetingMinutes.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        meetingDate: true,
        meetingTime: true,
        venue: true,
        type: true,
        status: true,
        presentMembers: true,
        absentMembers: true,
        presentGuests: true,
        createdBy: true,
        createdAt: true,
        publishedAt: true,
        creator: { 
          select: { id: true, fullName: true } 
        },
        publisher: { 
          select: { id: true, fullName: true } 
        },
        assignedActions: {
          select: {
            id: true,
            task: true,
            assignedToUserId: true,
            status: true,
            dueDate: true
          }
        },
        views: {
          where: { userId: userId },
          select: { viewedAt: true },
          take: 1
        }
      },
      orderBy: { meetingDate: "desc" }
    });

    const minutesWithFlags = minutes.map(m => ({
      ...m,
      userHasViewed: m.views.length > 0,
      userHasActionItems: m.assignedActions.some(a => a.assignedToUserId === userId && a.status !== "COMPLETED")
    }));

    res.json({ 
      success: true, 
      minutes: minutesWithFlags,
      userRole: {
        isAdmin: isAdminUser,
        isExecutive: hasExecutive
      }
    });

  } catch (err) {
    console.error("Get executive minutes error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== GET SINGLE MINUTES ====================
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const isAdminUser = await isAdmin(userId);
    const hasExecutive = await hasExecutiveRole(userId);

    // ✅ Only allow admins and executive members
    if (!isAdminUser && !hasExecutive) {
      return res.status(403).json({ 
        error: "Access denied. Only executive members can view executive minutes." 
      });
    }

    const minutes = await prisma.meetingMinutes.findUnique({
      where: { id: id },
      include: {
        creator: { select: { id: true, fullName: true } },
        publisher: { select: { id: true, fullName: true } },
        assignedActions: {
          include: {
            assignedTo: { select: { id: true, fullName: true } }
          }
        },
        excuses: true,
        comments: {
          include: {
            user: { select: { id: true, fullName: true, profileImage: true } }
          },
          orderBy: { createdAt: "asc" },
          take: 50
        },
        views: { 
          where: { userId: userId }, 
          select: { viewedAt: true }, 
          take: 1 
        }
      }
    });

    if (!minutes) {
      return res.status(404).json({ error: "Minutes not found" });
    }

    // Track view
    if (minutes.views.length === 0) {
      await prisma.meetingMinutesView.create({
        data: { minutesId: id, userId: userId }
      });
    }

    res.json({ success: true, minutes });

  } catch (err) {
    console.error("Get single minutes error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== GET EXECUTIVE MINUTES STATS ====================
router.get("/stats", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAdminUser = await isAdmin(userId);
    const hasExecutive = await hasExecutiveRole(userId);

    if (!isAdminUser && !hasExecutive) {
      return res.status(403).json({ 
        error: "Access denied. Only executive members can view executive minutes." 
      });
    }

    const totalMinutes = await prisma.meetingMinutes.count();
    const publishedMinutes = await prisma.meetingMinutes.count({
      where: { 
        status: { in: ["APPROVED", "PUBLISHED"] }
      }
    });
    const executiveMinutes = await prisma.meetingMinutes.count({
      where: { type: "EXECUTIVE" }
    });
    const jumuiaMinutes = await prisma.meetingMinutes.count({
      where: { type: "JUMUIA" }
    });

    res.json({
      success: true,
      stats: {
        totalMinutes,
        publishedMinutes,
        executiveMinutes,
        jumuiaMinutes
      }
    });

  } catch (err) {
    console.error("Get stats error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;