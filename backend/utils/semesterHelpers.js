// backend/utils/semesterHelpers.js

/**
 * Get the current semester from published schedules
 * @param {PrismaClient} prisma - Prisma client instance
 * @returns {Promise<Object|null>} - Current semester schedule or null
 */
async function getCurrentSemester(prisma) {
  try {
    const today = new Date();
    
    // First try to find a schedule that has an active flag set
    const activeSchedule = await prisma.schedule.findFirst({
      where: {
        isPublished: true,
        isActiveSemester: true  // You'll need to add this field
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (activeSchedule) {
      return activeSchedule;
    }
    
    // If no active flag, find schedule where today falls within date range
    const schedules = await prisma.schedule.findMany({
      where: {
        isPublished: true,
        startDate: { not: null },
        endDate: { not: null }
      },
      orderBy: { startDate: 'desc' }
    });
    
    for (const schedule of schedules) {
      const start = new Date(schedule.startDate);
      const end = new Date(schedule.endDate);
      // Set to end of day for inclusive comparison
      end.setHours(23, 59, 59, 999);
      
      if (today >= start && today <= end) {
        return schedule;
      }
    }
    
    // If no current semester, return the most recent schedule
    if (schedules.length > 0) {
      return schedules[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error getting current semester:', error);
    return null;
  }
}

/**
 * Get all semesters (published schedules with date ranges)
 * @param {PrismaClient} prisma - Prisma client instance
 * @returns {Promise<Array>} - Array of semester schedules
 */
async function getAllSemesters(prisma) {
  try {
    const schedules = await prisma.schedule.findMany({
      where: {
        isPublished: true,
        startDate: { not: null },
        endDate: { not: null }
      },
      orderBy: { startDate: 'desc' }
    });
    
    return schedules.map(schedule => ({
      id: schedule.id,
      title: schedule.title,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      isCurrent: false // Will be set by caller
    }));
  } catch (error) {
    console.error('Error getting semesters:', error);
    return [];
  }
}

/**
 * Get semester period for a specific schedule
 * @param {Object} schedule - Schedule object with startDate and endDate
 * @returns {Object} - Formatted semester period
 */
function getSemesterPeriod(schedule) {
  if (!schedule || !schedule.startDate || !schedule.endDate) {
    return null;
  }
  
  const start = new Date(schedule.startDate);
  const end = new Date(schedule.endDate);
  
  const startStr = start.toLocaleDateString('en-US', { 
    month: 'short', 
    year: 'numeric' 
  });
  const endStr = end.toLocaleDateString('en-US', { 
    month: 'short', 
    year: 'numeric' 
  });
  
  return {
    start: schedule.startDate,
    end: schedule.endDate,
    display: `${startStr} - ${endStr}`,
    startFormatted: startStr,
    endFormatted: endStr
  };
}

/**
 * Check if a date falls within a semester period
 * @param {Date} date - Date to check
 * @param {Object} semester - Semester schedule with startDate and endDate
 * @returns {boolean} - True if date is within semester
 */
function isDateInSemester(date, semester) {
  if (!semester || !semester.startDate || !semester.endDate) {
    return false;
  }
  
  const checkDate = new Date(date);
  const start = new Date(semester.startDate);
  const end = new Date(semester.endDate);
  end.setHours(23, 59, 59, 999);
  
  return checkDate >= start && checkDate <= end;
}

// ==================== SEMESTER END DETECTION ====================

/**
 * Check if a semester has ended (end date has passed)
 * @param {Object} semester - Semester schedule object
 * @returns {boolean} - True if semester has ended
 */
function isSemesterEnded(semester) {
  if (!semester || !semester.endDate) return false;
  const endDate = new Date(semester.endDate);
  const today = new Date();
  // Set to end of day for comparison
  endDate.setHours(23, 59, 59, 999);
  return today >= endDate;
}

/**
 * Check if semester just ended (within the last 24 hours)
 * @param {Object} semester - Semester schedule object
 * @returns {boolean} - True if semester just ended
 */
function isSemesterJustEnded(semester) {
  if (!semester || !semester.endDate) return false;
  const endDate = new Date(semester.endDate);
  const today = new Date();
  const diffTime = today - endDate;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  // Within 1 day after end date
  return diffDays >= 0 && diffDays <= 1;
}

/**
 * Check if today is the exact end date of the semester
 * @param {Object} semester - Semester schedule object
 * @returns {boolean} - True if today is the end date
 */
function isSemesterEndDate(semester) {
  if (!semester || !semester.endDate) return false;
  const endDate = new Date(semester.endDate);
  const today = new Date();
  return today.getFullYear() === endDate.getFullYear() &&
         today.getMonth() === endDate.getMonth() &&
         today.getDate() === endDate.getDate();
}

/**
 * Get the next semester (the one that starts after the current one ends)
 * @param {PrismaClient} prisma - Prisma client instance
 * @param {Object} currentSemester - Current semester schedule
 * @returns {Promise<Object|null>} - Next semester schedule or null
 */
async function getNextSemester(prisma, currentSemester) {
  if (!currentSemester) return null;
  
  try {
    const currentEnd = new Date(currentSemester.endDate);
    
    const nextSemester = await prisma.schedule.findFirst({
      where: {
        isPublished: true,
        startDate: { gt: currentEnd },
        startDate: { not: null },
        endDate: { not: null }
      },
      orderBy: { startDate: 'asc' }
    });
    
    return nextSemester;
  } catch (error) {
    console.error('Error getting next semester:', error);
    return null;
  }
}

/**
 * Check if a new semester should start (based on today's date)
 * @param {PrismaClient} prisma - Prisma client instance
 * @param {Object} currentSemester - Current semester schedule
 * @returns {Promise<Object|null>} - New semester schedule if found
 */
async function checkForNewSemester(prisma, currentSemester) {
  try {
    // If there's no current semester, check if any schedule started today
    if (!currentSemester) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const newSemester = await prisma.schedule.findFirst({
        where: {
          isPublished: true,
          startDate: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          },
          endDate: { not: null }
        }
      });
      
      return newSemester;
    }
    
    // If current semester exists, check if it's over and a new one has started
    if (isSemesterEnded(currentSemester)) {
      const nextSemester = await getNextSemester(prisma, currentSemester);
      
      if (nextSemester) {
        const nextStart = new Date(nextSemester.startDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // If the next semester has started today or earlier
        if (nextStart <= today) {
          return nextSemester;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error checking for new semester:', error);
    return null;
  }
}

/**
 * Get date filter for a specific semester
 * @param {PrismaClient} prisma - Prisma client instance
 * @param {string} semesterId - 'current', 'all', or specific schedule ID
 * @returns {Promise<Object|null>} - Date filter object { gte, lte } or null
 */
async function getSemesterDateFilter(prisma, semesterId) {
  try {
    // If 'current' or undefined, get active semester
    if (!semesterId || semesterId === 'current') {
      const current = await getCurrentSemester(prisma);
      if (current && current.startDate && current.endDate) {
        return {
          gte: new Date(current.startDate),
          lte: new Date(current.endDate)
        };
      }
      return null;
    }
    
    // If 'all', return null (no filter)
    if (semesterId === 'all') {
      return null;
    }
    
    // Specific semester ID
    const semester = await prisma.schedule.findUnique({
      where: { id: semesterId }
    });
    
    if (semester && semester.startDate && semester.endDate) {
      return {
        gte: new Date(semester.startDate),
        lte: new Date(semester.endDate)
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting semester date filter:', error);
    return null;
  }
}

module.exports = {
  getCurrentSemester,
  getAllSemesters,
  getSemesterPeriod,
  isDateInSemester,
  isSemesterEnded,
  isSemesterJustEnded,
  isSemesterEndDate,
  getNextSemester,
  checkForNewSemester,
  getSemesterDateFilter
};

