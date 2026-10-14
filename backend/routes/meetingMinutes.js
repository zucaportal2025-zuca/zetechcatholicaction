const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const createAndSendNotification = global.createAndSendNotification || (() => {
  console.log("⚠️ createAndSendNotification not available");
  return Promise.resolve(null);
});

// Cache for executive users (refresh every 5 minutes)
let executiveUsersCache = null;
let executiveUsersCacheTime = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function isExecutive(userId) {
  try {
    const executive = await prisma.executive.findFirst({
      where: { userId: userId, isActive: true },
      select: { id: true }
    });
    return executive !== null;
  } catch (err) {
    console.error("isExecutive error:", err);
    return false;
  }
}

// Helper: Check if user is admin - ADD THIS
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

// Helper: Check if user is admin OR secretary
async function isAdminOrSecretary(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, specialRole: true }
  });
  return user?.role === "admin" || user?.specialRole === "secretary" || user?.role === "secretary";
}

// Helper: Get all executive users (with caching)
async function getAllExecutiveUsers() {
  const now = Date.now();
  if (executiveUsersCache && (now - executiveUsersCacheTime) < CACHE_TTL) {
    return executiveUsersCache;
  }
  
  const executives = await prisma.executive.findMany({
    where: { isActive: true },
    include: { 
      user: { 
        select: { 
          id: true, 
          fullName: true, 
          email: true,
          role: true,
          specialRole: true
        } 
      },
      position: {
        select: { title: true }
      }
    }
  });
  
  executiveUsersCache = executives.map(exec => ({
    ...exec.user,
    executivePosition: exec.position?.title || null
  }));
  executiveUsersCacheTime = now;
  return executiveUsersCache;
}

// Helper: Get jumuia members (optimized with select)
async function getJumuiaMembers(jumuiaId) {
  const users = await prisma.user.findMany({
    where: { jumuiaId: jumuiaId },
    select: { 
      id: true, 
      fullName: true, 
      email: true, 
      role: true,
      specialRole: true
    }
  });
  
  // Get executive positions for these users
  const userIds = users.map(u => u.id);
  const executives = await prisma.executive.findMany({
    where: { 
      userId: { in: userIds },
      isActive: true
    },
    include: {
      position: { select: { title: true } }
    }
  });
  
  const executiveMap = new Map();
  executives.forEach(exec => {
    executiveMap.set(exec.userId, exec.position?.title);
  });
  
  return users.map(user => ({
    ...user,
    executivePosition: executiveMap.get(user.id) || null
  }));
}
// Helper: Get attendance data from sheet (optimized - single query)
async function getAttendanceData(sheetId) {
  const sheet = await prisma.attendanceSheet.findUnique({
    where: { id: sheetId },
    include: {
      entries: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              role: true,
              specialRole: true
            }
          }
        }
      }
    }
  });

  if (!sheet) return null;

  // Get target members based on sheet type (optimized)
  let targetMembers = [];
  if (sheet.jumuiaId === null) {
    targetMembers = await getAllExecutiveUsers();
  } else if (sheet.jumuiaId) {
    targetMembers = await getJumuiaMembers(sheet.jumuiaId);
  } else {
    targetMembers = await prisma.user.findMany({
      select: { id: true, fullName: true, email: true, role: true }
    });
     targetMembers = targetMembers.filter(m => m.role !== 'admin');
  }

  // Use Set for O(1) lookups
  const presentUserIds = new Set();
  const presentMembers = [];
  const presentGuests = [];

  for (const entry of sheet.entries) {
    if (entry.userId) {
      presentUserIds.add(entry.userId);
      presentMembers.push({
        userId: entry.userId,
        fullName: entry.user?.fullName || entry.fullName,
        role: entry.user?.specialRole || entry.user?.role || entry.role,
        signTime: entry.signTime,
        signMethod: entry.signMethod
      });
    } else {
      presentGuests.push({
        fullName: entry.fullName,
        phoneNumber: entry.phoneNumber,
        role: entry.role || "Guest",
        signTime: entry.signTime
      });
    }
  }

  // Filter absent members efficiently
 const absentMembers = targetMembers
  .filter(m => !presentUserIds.has(m.id))
  .map(m => ({
    userId: m.id,
    fullName: m.fullName,
    role: m.specialRole || m.role,
    executivePosition: m.executivePosition || null,  
    excuse: null,
    excused: false
  }));

  return {
    sheet,
    presentMembers,
    presentGuests,
    absentMembers,
    totalMembers: targetMembers.length
  };
}

// ==================== CREATE MINUTES ====================
router.post("/", authenticate, async (req, res) => {
  try {
    const {
      attendanceSheetId,
      presentMembers: frontendPresentMembers,
      agenda,
      preliminaries,
      sections,
      aob,
      adjournment
    } = req.body;

    if (!attendanceSheetId) {
      return res.status(400).json({ error: "Attendance sheet ID is required" });
    }

    const attendanceData = await getAttendanceData(attendanceSheetId);
    if (!attendanceData) {
      return res.status(404).json({ error: "Attendance sheet not found" });
    }

    // ✅ FIX: Remove presentMembers from attendanceData destructuring
    const { sheet, presentGuests, absentMembers } = attendanceData;
    const type = sheet.jumuiaId === null ? "EXECUTIVE" : "JUMUIA";

    const minutes = await prisma.meetingMinutes.create({
      data: {
        title: sheet.title,
        meetingDate: sheet.eventDate,
        meetingTime: sheet.eventTime || null,
        venue: sheet.location || null,
        type: type,
        jumuiaId: sheet.jumuiaId || null,
        attendanceSheetId: attendanceSheetId,
        // ✅ FIX: Use the frontend presentMembers (with executive positions)
        presentMembers: frontendPresentMembers || [],
        presentGuests: presentGuests,
        absentMembers: absentMembers,
        agenda: agenda || null,
        preliminaries: preliminaries || null,
        sections: sections || null,
        aob: aob || null,
        adjournment: adjournment || null,
        createdBy: req.user.userId,
        status: "DRAFT"
      }
    });

    res.status(201).json({ success: true, minutes });

  } catch (err) {
    console.error("Create minutes error:", err);
    res.status(500).json({ error: err.message });
  }
});
// ==================== GET ALL MINUTES (optimized) ====================
router.get("/", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAdminUser = await isAdmin(userId);
    const isExecutiveUser = await isExecutive(userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { jumuiaId: true }
    });

    let whereClause = {};

    if (isAdminUser) {
      whereClause = {};
    } else if (isExecutiveUser) {
      whereClause = {
        OR: [
          { type: "EXECUTIVE" },
          { type: "JUMUIA", jumuiaId: user?.jumuiaId }
        ]
      };
    } else {
      whereClause = {
        type: "JUMUIA",
        jumuiaId: user?.jumuiaId
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
        creator: { select: { id: true, fullName: true } },
        publisher: { select: { id: true, fullName: true } },
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

    res.json({ success: true, minutes: minutesWithFlags });

  } catch (err) {
    console.error("Get minutes error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== GET SINGLE MINUTES (optimized) ====================
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const [minutes, isAdminUser, isExecutiveUser, userJumuia] = await Promise.all([
      prisma.meetingMinutes.findUnique({
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
          views: { where: { userId: userId }, select: { viewedAt: true }, take: 1 }
        }
      }),
      isAdmin(userId),
      isExecutive(userId),
      prisma.user.findUnique({ where: { id: userId }, select: { jumuiaId: true } })
    ]);

    if (!minutes) {
      return res.status(404).json({ error: "Minutes not found" });
    }

    let canView = false;
    if (isAdminUser) canView = true;
    else if (minutes.type === "EXECUTIVE" && isExecutiveUser) canView = true;
    else if (minutes.type === "JUMUIA" && minutes.jumuiaId === userJumuia?.jumuiaId) canView = true;

    if (!canView) {
      return res.status(403).json({ error: "Access denied" });
    }

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

// ==================== UPDATE MINUTES ====================
router.put("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const {
      agenda,
      preliminaries,
      sections,
      aob,
      adjournment,
      actionItems
    } = req.body;

    const minutes = await prisma.meetingMinutes.findUnique({
      where: { id: id },
      select: { createdBy: true, agenda: true, preliminaries: true, sections: true, aob: true, adjournment: true, actionItems: true }
    });

    if (!minutes) {
      return res.status(404).json({ error: "Minutes not found" });
    }

   const isAdminOrSec = await isAdminOrSecretary(userId);
if (minutes.createdBy !== userId && !isAdminOrSec) {
  return res.status(403).json({ error: "Only the creator, admin, or secretary can edit minutes" });
}

    const updated = await prisma.meetingMinutes.update({
      where: { id: id },
      data: {
        agenda: agenda !== undefined ? agenda : minutes.agenda,
        preliminaries: preliminaries !== undefined ? preliminaries : minutes.preliminaries,
        sections: sections !== undefined ? sections : minutes.sections,
        aob: aob !== undefined ? aob : minutes.aob,
        adjournment: adjournment !== undefined ? adjournment : minutes.adjournment,
        actionItems: actionItems !== undefined ? actionItems : minutes.actionItems,
        updatedAt: new Date()
      }
    });

    // Update action items in separate table if provided
    if (actionItems && Array.isArray(actionItems) && actionItems.length > 0) {
      await prisma.meetingActionItem.deleteMany({ where: { minutesId: id } });
      
      const newActions = actionItems
        .filter(item => item.task && item.assignedToUserId)
        .map(item => ({
          minutesId: id,
          task: item.task,
          assignedToUserId: item.assignedToUserId,
          assignedToName: item.assignedToName || "",
          dueDate: item.dueDate ? new Date(item.dueDate) : null,
          status: item.status || "PENDING"
        }));
      
      if (newActions.length > 0) {
        await prisma.meetingActionItem.createMany({ data: newActions });
      }
    }

    res.json({ success: true, minutes: updated });

  } catch (err) {
    console.error("Update minutes error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== ADD/UPDATE EXCUSE ====================
router.post("/:id/excuse", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, reason, excused } = req.body;
    const currentUserId = req.user.userId;

    const minutes = await prisma.meetingMinutes.findUnique({
      where: { id: id },
      select: { createdBy: true, absentMembers: true }
    });

    if (!minutes) {
      return res.status(404).json({ error: "Minutes not found" });
    }

    const isAdminUser = await isAdmin(currentUserId);
    if (minutes.createdBy !== currentUserId && !isAdminUser) {
      return res.status(403).json({ error: "Only the creator can add excuses" });
    }

    const excuse = await prisma.meetingExcuse.upsert({
      where: {
        minutesId_userId: { minutesId: id, userId: userId }
      },
      update: {
        reason: reason || null,
        excused: excused !== undefined ? excused : false,
        updatedAt: new Date()
      },
      create: {
        minutesId: id,
        userId: userId,
        reason: reason || null,
        excused: excused !== undefined ? excused : false
      }
    });

    // Update absentMembers JSON efficiently
    const currentAbsentMembers = minutes.absentMembers || [];
    const updatedAbsentMembers = currentAbsentMembers.map(m => {
      if (m.userId === userId) {
        return { ...m, excuse: reason, excused: excused };
      }
      return m;
    });

    await prisma.meetingMinutes.update({
      where: { id: id },
      data: { absentMembers: updatedAbsentMembers }
    });

    res.json({ success: true, excuse });

  } catch (err) {
    console.error("Add excuse error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== PUBLISH MINUTES (optimized notifications) ====================
router.post("/:id/publish", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const minutes = await prisma.meetingMinutes.findUnique({
      where: { id: id },
      include: { assignedActions: { select: { assignedToUserId: true } } }
    });

    if (!minutes) {
      return res.status(404).json({ error: "Minutes not found" });
    }

    const isAdminOrSec = await isAdminOrSecretary(userId);
if (minutes.createdBy !== userId && !isAdminOrSec) {
  return res.status(403).json({ error: "Only the creator, admin, or secretary can publish minutes" });
}

    const published = await prisma.meetingMinutes.update({
      where: { id: id },
      data: {
        status: "APPROVED",
        publishedAt: new Date(),
        publishedBy: userId
      }
    });

    // Send notifications in background (don't await - fire and forget)
    (async () => {
      try {
        let notifyUsers = [];
        if (minutes.type === "EXECUTIVE") {
          const executives = await getAllExecutiveUsers();
          notifyUsers = executives.map(exec => exec.id);
        } else if (minutes.type === "JUMUIA" && minutes.jumuiaId) {
          const members = await getJumuiaMembers(minutes.jumuiaId);
          notifyUsers = members.map(m => m.id);
        }

        const actionItemUserIds = minutes.assignedActions.map(a => a.assignedToUserId);
        notifyUsers = [...new Set([...notifyUsers, ...actionItemUserIds])];

        // Send notifications in batches
        const batchSize = 50;
        for (let i = 0; i < notifyUsers.length; i += batchSize) {
          const batch = notifyUsers.slice(i, i + batchSize);
          await Promise.allSettled(
            batch.map(notifyUserId => 
              createAndSendNotification({
                userId: notifyUserId,
                type: "meeting_minutes_published",
                title: `Minutes Published: ${minutes.title}`,
                message: `Minutes for "${minutes.title}" are now available.`,
                data: { minutesId: minutes.id, type: minutes.type }
              })
            )
          );
        }
      } catch (err) {
        console.error("Background notification error:", err);
      }
    })();

    res.json({ success: true, minutes: published });

  } catch (err) {
    console.error("Publish minutes error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== DELETE MINUTES ====================
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const minutes = await prisma.meetingMinutes.findUnique({
      where: { id: id },
      select: { createdBy: true }
    });

    if (!minutes) {
      return res.status(404).json({ error: "Minutes not found" });
    }

    const isAdminOrSec = await isAdminOrSecretary(userId);
if (minutes.createdBy !== userId && !isAdminOrSec) {
  return res.status(403).json({ error: "Only the creator, admin, or secretary can delete minutes" });
}
    await prisma.$transaction([
      prisma.meetingActionItem.deleteMany({ where: { minutesId: id } }),
      prisma.meetingMinutesView.deleteMany({ where: { minutesId: id } }),
      prisma.meetingExcuse.deleteMany({ where: { minutesId: id } }),
      prisma.meetingComment.deleteMany({ where: { minutesId: id } }),
      prisma.meetingMinutes.delete({ where: { id: id } })
    ]);

    res.json({ success: true, message: "Minutes deleted" });

  } catch (err) {
    console.error("Delete minutes error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== ADD COMMENT ====================
router.post("/:id/comment", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const userId = req.user.userId;

    if (!comment || comment.trim() === "") {
      return res.status(400).json({ error: "Comment cannot be empty" });
    }

    const minutes = await prisma.meetingMinutes.findUnique({
      where: { id: id },
      select: { createdBy: true, title: true }
    });

    if (!minutes) {
      return res.status(404).json({ error: "Minutes not found" });
    }

    const newComment = await prisma.meetingComment.create({
      data: {
        minutesId: id,
        userId: userId,
        comment: comment.trim()
      },
      include: {
        user: { select: { id: true, fullName: true, profileImage: true } }
      }
    });

    if (minutes.createdBy !== userId) {
      createAndSendNotification({
        userId: minutes.createdBy,
        type: "meeting_minutes_comment",
        title: "New Comment on Minutes",
        message: `${req.user.fullName} commented on "${minutes.title}"`,
        data: { minutesId: id, commentId: newComment.id }
      }).catch(err => console.error("Notification error:", err));
    }

    res.status(201).json({ success: true, comment: newComment });

  } catch (err) {
    console.error("Add comment error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== GET USER'S ACTION ITEMS ====================
router.get("/my/action-items", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    const actionItems = await prisma.meetingActionItem.findMany({
      where: {
        assignedToUserId: userId,
        status: { not: "COMPLETED" }
      },
      include: {
        minutes: {
          select: {
            id: true,
            title: true,
            meetingDate: true,
            type: true
          }
        }
      },
      orderBy: { dueDate: "asc" },
      take: 50
    });

    res.json({ success: true, actionItems });

  } catch (err) {
    console.error("Get action items error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== UPDATE ACTION ITEM STATUS ====================
router.put("/action-items/:itemId", authenticate, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { status, completedNotes } = req.body;

    const actionItem = await prisma.meetingActionItem.findUnique({
      where: { id: itemId },
      select: { assignedToUserId: true, status: true }
    });

    if (!actionItem) {
      return res.status(404).json({ error: "Action item not found" });
    }

    const isAdminUser = await isAdmin(req.user.userId);
    if (actionItem.assignedToUserId !== req.user.userId && !isAdminUser) {
      return res.status(403).json({ error: "Only the assignee can update this action item" });
    }

    const updated = await prisma.meetingActionItem.update({
      where: { id: itemId },
      data: {
        status: status || actionItem.status,
        completedAt: status === "COMPLETED" ? new Date() : null,
        completedNotes: completedNotes || null
      }
    });

    res.json({ success: true, actionItem: updated });

  } catch (err) {
    console.error("Update action item error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== GET MINUTES BY ATTENDANCE SHEET ====================
router.get("/attendance-sheet/:sheetId", authenticate, async (req, res) => {
  try {
    const { sheetId } = req.params;

    const minutes = await prisma.meetingMinutes.findFirst({
      where: { attendanceSheetId: sheetId },
      select: { id: true, title: true, status: true }
    });

    res.json({ success: true, minutes });

  } catch (err) {
    console.error("Get minutes by sheet error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== REFRESH ATTENDANCE DATA ====================
router.post("/:id/refresh-attendance", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const minutes = await prisma.meetingMinutes.findUnique({
      where: { id: id },
      select: { createdBy: true, attendanceSheetId: true, absentMembers: true }
    });

    if (!minutes) {
      return res.status(404).json({ error: "Minutes not found" });
    }

   const isAdminOrSec = await isAdminOrSecretary(userId);
if (minutes.createdBy !== userId && !isAdminOrSec) {
  return res.status(403).json({ error: "Only the creator, admin, or secretary can refresh attendance" });
}

    const attendanceData = await getAttendanceData(minutes.attendanceSheetId);
    if (!attendanceData) {
      return res.status(404).json({ error: "Attendance sheet not found" });
    }

    const existingExcuses = await prisma.meetingExcuse.findMany({
      where: { minutesId: id },
      select: { userId: true, reason: true, excused: true }
    });
    
    const excuseMap = new Map();
    existingExcuses.forEach(e => excuseMap.set(e.userId, { reason: e.reason, excused: e.excused }));

    const absentMembersWithExcuses = attendanceData.absentMembers.map(m => ({
      ...m,
      excuse: excuseMap.get(m.userId)?.reason || null,
      excused: excuseMap.get(m.userId)?.excused || false
    }));

    const updated = await prisma.meetingMinutes.update({
      where: { id: id },
      data: {
        presentMembers: attendanceData.presentMembers,
        presentGuests: attendanceData.presentGuests,
        absentMembers: absentMembersWithExcuses
      },
      select: { id: true, presentMembers: true, presentGuests: true, absentMembers: true }
    });

    res.json({ success: true, minutes: updated });

  } catch (err) {
    console.error("Refresh attendance error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;