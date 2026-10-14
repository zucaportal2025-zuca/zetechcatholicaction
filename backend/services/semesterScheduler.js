// backend/services/semesterScheduler.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendSemesterReportsToAll } = require('./semesterReportService');
const { 
  getCurrentSemester, 
  isSemesterJustEnded,
  isSemesterEndDate,
  checkForNewSemester 
} = require('../utils/semesterHelpers');

// Store processed semester IDs to avoid duplicate reports
const processedSemesters = new Set();

/**
 * Check and process semester end - Call this from a cron job or scheduled task
 * This will automatically send reports when a semester ends
 */
async function checkSemesterEndAndSendReports() {
  try {
    console.log('🔄 Checking for semester end...');
    
    const currentSemester = await getCurrentSemester(prisma);
    
    if (!currentSemester) {
      console.log('⚠️ No current semester found');
      return;
    }
    
    // Check if semester just ended (within last 24 hours)
    if (isSemesterJustEnded(currentSemester)) {
      // Check if we already processed this semester
      if (processedSemesters.has(currentSemester.id)) {
        console.log(`⏭️ Semester ${currentSemester.title} already processed`);
        return;
      }
      
      console.log(`📧 Semester ${currentSemester.title} ended. Sending reports...`);
      
      // Send reports to all users
      const result = await sendSemesterReportsToAll(currentSemester);
      
      // Mark as processed
      processedSemesters.add(currentSemester.id);
      
      console.log(`✅ Semester reports sent: ${result.successCount} success, ${result.failCount} failed`);
      
      // Check if new semester has started
      const newSemester = await checkForNewSemester(prisma, currentSemester);
      
      if (newSemester) {
        console.log(`📚 New semester detected: ${newSemester.title}`);
        
        // Send notification about new semester
        await notifyNewSemester(newSemester);
      }
    } else if (isSemesterEndDate(currentSemester)) {
      console.log(`📅 Semester ${currentSemester.title} ends today. Reports will be sent tomorrow.`);
    }
    
    // Clean up old processed entries (keep only last 10)
    if (processedSemesters.size > 10) {
      const entries = Array.from(processedSemesters);
      const toRemove = entries.slice(0, entries.length - 10);
      toRemove.forEach(id => processedSemesters.delete(id));
    }
    
  } catch (error) {
    console.error('❌ Error checking semester end:', error);
  }
}

/**
 * Notify users about new semester
 * @param {Object} newSemester - New semester schedule
 */
async function notifyNewSemester(newSemester) {
  try {
    // Get all users
    const users = await prisma.user.findMany({
      where: { email: { not: null } },
      select: { id: true, email: true, fullName: true }
    });
    
    console.log(`📢 Notifying ${users.length} users about new semester: ${newSemester.title}`);
    
    const period = `${new Date(newSemester.startDate).toLocaleDateString()} - ${new Date(newSemester.endDate).toLocaleDateString()}`;
    
    // Send notifications in batches
    const BATCH_SIZE = 50;
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      
      await Promise.allSettled(
        batch.map(async (user) => {
          try {
            // Create in-app notification
            await prisma.notification.create({
              data: {
                userId: user.id,
                type: 'new_semester',
                title: '📚 New Semester Started!',
                message: `The new semester "${newSemester.title}" (${period}) has started. Your attendance tracking has been reset for this semester. View your history to see past semesters.`,
                read: false,
                data: { semesterId: newSemester.id }
              }
            });
          } catch (err) {
            console.error(`Failed to notify ${user.id}:`, err.message);
          }
        })
      );
    }
    
    console.log(`✅ New semester notifications sent to ${users.length} users`);
    
  } catch (error) {
    console.error('❌ Error notifying about new semester:', error);
  }
}

/**
 * Manual trigger for semester report (admin override)
 * @param {string} semesterId - Semester schedule ID
 */
async function manualSendSemesterReports(semesterId) {
  try {
    const semester = await prisma.schedule.findUnique({
      where: { id: semesterId }
    });
    
    if (!semester) {
      throw new Error('Semester not found');
    }
    
    console.log(`📧 Manually sending reports for: ${semester.title}`);
    const result = await sendSemesterReportsToAll(semester);
    return result;
    
  } catch (error) {
    console.error('❌ Manual report sending failed:', error);
    throw error;
  }
}

module.exports = {
  checkSemesterEndAndSendReports,
  manualSendSemesterReports,
  notifyNewSemester
};