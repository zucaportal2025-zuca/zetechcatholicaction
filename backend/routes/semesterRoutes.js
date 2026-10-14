// backend/routes/semesterRoutes.js
const express = require("express");
const router = express.Router();
const { authenticate, requireAdmin } = require("../middleware/auth");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { getCurrentSemester, getAllSemesters, getSemesterPeriod } = require("../utils/semesterHelpers");
const { 
  sendSemesterReportsToAll, 
  generatePDFReport, 
  generateUserSemesterReport 
} = require("../services/semesterReportService");

// ==================== SEMESTER ROUTES ====================

// Get current semester
router.get("/current", async (req, res) => {
  try {
    const currentSemester = await getCurrentSemester(prisma);
    
    if (!currentSemester) {
      return res.json({ 
        success: true, 
        semester: null,
        message: "No active semester found"
      });
    }
    
    const period = getSemesterPeriod(currentSemester);
    
    res.json({
      success: true,
      semester: {
        id: currentSemester.id,
        title: currentSemester.title,
        startDate: currentSemester.startDate,
        endDate: currentSemester.endDate,
        isActiveSemester: currentSemester.isActiveSemester,
        period: period
      }
    });
  } catch (error) {
    console.error("Error getting current semester:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all semesters
router.get("/all", async (req, res) => {
  try {
    const currentSemester = await getCurrentSemester(prisma);
    const semesters = await getAllSemesters(prisma);
    
    // Mark which one is current
    const semestersWithStatus = semesters.map(semester => ({
      ...semester,
      isCurrent: currentSemester && semester.id === currentSemester.id,
      period: getSemesterPeriod(semester)
    }));
    
    res.json({
      success: true,
      semesters: semestersWithStatus,
      currentSemesterId: currentSemester?.id || null
    });
  } catch (error) {
    console.error("Error getting semesters:", error);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Set a schedule as the active semester
router.put("/:scheduleId/activate", authenticate, requireAdmin, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    
    // Check if schedule exists
    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId }
    });
    
    if (!schedule) {
      return res.status(404).json({ error: "Schedule not found" });
    }
    
    if (!schedule.isPublished) {
      return res.status(400).json({ error: "Schedule must be published first" });
    }
    
    // Deactivate all other schedules
    await prisma.schedule.updateMany({
      where: { isActiveSemester: true },
      data: { isActiveSemester: false }
    });
    
    // Activate this schedule
    const updated = await prisma.schedule.update({
      where: { id: scheduleId },
      data: { isActiveSemester: true }
    });
    
    res.json({
      success: true,
      message: `"${updated.title}" is now the active semester`,
      schedule: updated
    });
  } catch (error) {
    console.error("Error activating semester:", error);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Deactivate current semester (no active semester)
router.post("/deactivate", authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.schedule.updateMany({
      where: { isActiveSemester: true },
      data: { isActiveSemester: false }
    });
    
    res.json({
      success: true,
      message: "Active semester deactivated"
    });
  } catch (error) {
    console.error("Error deactivating semester:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== SEMESTER REPORT ROUTES ====================

// Admin: Send semester reports to all users
router.post("/:scheduleId/send-reports", authenticate, requireAdmin, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    
    // Get the semester schedule
    const semester = await prisma.schedule.findUnique({
      where: { id: scheduleId }
    });
    
    if (!semester) {
      return res.status(404).json({ error: "Semester not found" });
    }
    
    // Send reports in background
    res.json({
      success: true,
      message: `Sending semester reports for "${semester.title}" in the background. Users will receive emails with their reports.`
    });
    
    // Process in background (don't await)
    sendSemesterReportsToAll(semester).then(result => {
      console.log(`📊 Semester reports completed: ${result.successCount} sent, ${result.failCount} failed`);
    }).catch(error => {
      console.error("❌ Background report sending failed:", error);
    });
    
  } catch (error) {
    console.error("Error sending semester reports:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's semester report (for viewing in app)
router.get("/:scheduleId/report/:userId", authenticate, async (req, res) => {
  try {
    const { scheduleId, userId } = req.params;
    
    // Check if user is accessing their own report or is admin
    const isOwnReport = req.user.userId === userId;
    const isAdmin = req.user.role === 'admin' || req.user.specialRole === 'secretary';
    
    if (!isOwnReport && !isAdmin) {
      return res.status(403).json({ error: "Access denied. You can only view your own report." });
    }
    
    // Get semester
    const semester = await prisma.schedule.findUnique({
      where: { id: scheduleId }
    });
    
    if (!semester) {
      return res.status(404).json({ error: "Semester not found" });
    }
    
    // Get user's attendance data for the semester
    const attendanceData = await prisma.attendanceEntry.findMany({
      where: {
        userId: userId,
        signTime: {
          gte: new Date(semester.startDate),
          lte: new Date(semester.endDate)
        }
      },
      include: {
        sheet: {
          select: {
            id: true,
            title: true,
            eventDate: true,
            eventTime: true,
            location: true
          }
        }
      },
      orderBy: { signTime: 'desc' }
    });
    
    // Get eligible meetings (for missed meetings)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { jumuiaId: true }
    });
    
    const isExecutive = await prisma.executive.findFirst({
      where: { userId: userId, isActive: true }
    });
    
    const eligibleSheets = await prisma.attendanceSheet.findMany({
      where: {
        eventDate: {
          gte: new Date(semester.startDate),
          lte: new Date(semester.endDate)
        },
        OR: [
          { jumuiaId: null, isExecutiveOnly: false },
          { jumuiaId: user?.jumuiaId },
          ...(isExecutive ? [{ isExecutiveOnly: true }] : [])
        ]
      },
      select: {
        id: true,
        title: true,
        eventDate: true,
        eventTime: true,
        location: true
      }
    });
    
    const attendedSheetIds = new Set(attendanceData.map(e => e.sheetId));
    const allMeetings = eligibleSheets.map(sheet => ({
      ...sheet,
      attended: attendedSheetIds.has(sheet.id)
    }));
    
    // Generate report
    const reportData = await generateUserSemesterReport(userId, semester, allMeetings);
    
    if (!reportData) {
      return res.status(404).json({ error: "Could not generate report for this user" });
    }
    
    res.json({
      success: true,
      report: reportData
    });
    
  } catch (error) {
    console.error("Error getting semester report:", error);
    res.status(500).json({ error: error.message });
  }
});

// Download semester report as PDF
router.get("/:scheduleId/report/:userId/download", authenticate, async (req, res) => {
  try {
    const { scheduleId, userId } = req.params;
    
    // Check access
    const isOwnReport = req.user.userId === userId;
    const isAdmin = req.user.role === 'admin' || req.user.specialRole === 'secretary';
    
    if (!isOwnReport && !isAdmin) {
      return res.status(403).json({ error: "Access denied. You can only download your own report." });
    }
    
    // Get semester
    const semester = await prisma.schedule.findUnique({
      where: { id: scheduleId }
    });
    
    if (!semester) {
      return res.status(404).json({ error: "Semester not found" });
    }
    
    // Get user's attendance data
    const attendanceData = await prisma.attendanceEntry.findMany({
      where: {
        userId: userId,
        signTime: {
          gte: new Date(semester.startDate),
          lte: new Date(semester.endDate)
        }
      },
      include: {
        sheet: {
          select: {
            id: true,
            title: true,
            eventDate: true,
            eventTime: true,
            location: true
          }
        }
      },
      orderBy: { signTime: 'desc' }
    });
    
    // Get eligible meetings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { jumuiaId: true }
    });
    
    const isExecutive = await prisma.executive.findFirst({
      where: { userId: userId, isActive: true }
    });
    
    const eligibleSheets = await prisma.attendanceSheet.findMany({
      where: {
        eventDate: {
          gte: new Date(semester.startDate),
          lte: new Date(semester.endDate)
        },
        OR: [
          { jumuiaId: null, isExecutiveOnly: false },
          { jumuiaId: user?.jumuiaId },
          ...(isExecutive ? [{ isExecutiveOnly: true }] : [])
        ]
      },
      select: {
        id: true,
        title: true,
        eventDate: true,
        eventTime: true,
        location: true
      }
    });
    
    const attendedSheetIds = new Set(attendanceData.map(e => e.sheetId));
    const allMeetings = eligibleSheets.map(sheet => ({
      ...sheet,
      attended: attendedSheetIds.has(sheet.id)
    }));
    
    // Generate report
    const reportData = await generateUserSemesterReport(userId, semester, allMeetings);
    
    if (!reportData) {
      return res.status(404).json({ error: "Could not generate report" });
    }
    
    // Generate PDF
    const pdfBuffer = await generatePDFReport(reportData);
    
    const filename = `semester_report_${userId}_${semester.title.replace(/\s/g, '_')}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error("Error downloading semester report:", error);
    res.status(500).json({ error: error.message });
  }
});


// ==================== AUTO SEMESTER END SCHEDULER ====================

// Import the scheduler
const { checkSemesterEndAndSendReports, manualSendSemesterReports } = require('../services/semesterScheduler');

// Admin: Manually trigger semester end check
router.post("/check-end", authenticate, requireAdmin, async (req, res) => {
  try {
    await checkSemesterEndAndSendReports();
    res.json({
      success: true,
      message: "Semester end check completed. Reports sent if semester just ended."
    });
  } catch (error) {
    console.error("Error checking semester end:", error);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Manually send reports for a specific semester
router.post("/:scheduleId/send-reports-now", authenticate, requireAdmin, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const result = await manualSendSemesterReports(scheduleId);
    
    res.json({
      success: true,
      message: `Reports sent: ${result.successCount} success, ${result.failCount} failed`,
      result
    });
  } catch (error) {
    console.error("Error sending reports:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;