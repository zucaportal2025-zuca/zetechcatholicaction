const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const os = require('os');
const fs = require('fs');
const path = require('path');

// Store recent errors in memory (for speed)
const errorStore = [];
const MAX_ERRORS = 100;
const activityStore = [];
const MAX_ACTIVITY = 50;

class SystemMonitor {
  constructor() {
    this.startTime = Date.now();
    this.errorCount = 0;
    this.warningCount = 0;
    this.isHealthy = true;
  }

  // ========== LOG ERRORS ==========
  logError(error, context = {}) {
    const entry = {
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      timestamp: new Date().toISOString(),
      error: error.message || error,
      stack: error.stack,
      context: {
        userId: context.userId || null,
        path: context.path || null,
        method: context.method || null,
        ip: context.ip || null,
        ...context
      },
      resolved: false
    };
    
    errorStore.unshift(entry);
    if (errorStore.length > MAX_ERRORS) errorStore.pop();
    this.errorCount++;
    
    // Log to file
    this.writeToLog('error', entry);
    
    return entry;
  }

  // ========== LOG ACTIVITY ==========
  logActivity(type, data = {}) {
    const entry = {
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      timestamp: new Date().toISOString(),
      type: type, // 'user_login', 'checkin', 'payment', 'error', 'warning'
      data: data,
      userId: data.userId || null
    };
    
    activityStore.unshift(entry);
    if (activityStore.length > MAX_ACTIVITY) activityStore.pop();
    
    // Log important activities to file
    if (['error', 'warning', 'security'].includes(type)) {
      this.writeToLog('activity', entry);
    }
    
    return entry;
  }

  // ========== WRITE TO LOG FILE ==========
  writeToLog(type, entry) {
    try {
      const logDir = path.join(__dirname, '../logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      const logFile = path.join(logDir, `${type}-${new Date().toISOString().split('T')[0]}.log`);
      const line = JSON.stringify(entry) + '\n';
      fs.appendFileSync(logFile, line);
    } catch (err) {
      // Silent fail - don't crash the system
    }
  }

  // ========== GET SYSTEM STATUS ==========
  async getSystemStatus() {
    const now = Date.now();
    
    // Check database
    let dbStatus = 'healthy';
    let dbError = null;
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (err) {
      dbStatus = 'unhealthy';
      dbError = err.message;
    }

    // Check memory
    const memoryUsage = process.memoryUsage();
    const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    const memoryStatus = memoryPercent > 90 ? 'critical' : memoryPercent > 70 ? 'warning' : 'healthy';

    // Get recent errors (last 24 hours)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentErrors = errorStore.filter(e => e.timestamp > new Date(oneDayAgo).toISOString());

    // Get online users
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
    const onlineCount = await prisma.user.count({
      where: { lastActive: { gte: fiveMinutesAgo } }
    });

    // Get today's activity
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayActivity = activityStore.filter(e => 
      new Date(e.timestamp) >= today
    );

    return {
      status: this.isHealthy ? 'healthy' : 'degraded',
      uptime: {
        seconds: Math.floor((now - this.startTime) / 1000),
        formatted: this.formatUptime(now - this.startTime)
      },
      database: {
        status: dbStatus,
        error: dbError
      },
      memory: {
        status: memoryStatus,
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
        percentUsed: Math.round(memoryPercent)
      },
      errors: {
        total: this.errorCount,
        recent24h: recentErrors.length,
        recent: recentErrors.slice(0, 10)
      },
      users: {
        online: onlineCount,
        registered: await prisma.user.count()
      },
      activity: {
        today: todayActivity.length,
        recent: todayActivity.slice(0, 10)
      },
      warnings: this.warningCount,
      lastError: errorStore[0] || null
    };
  }

  // ========== FORMAT UPTIME ==========
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  }

  // ========== GET SPECIFIC ISSUES ==========
  async getIssues() {
    const issues = [];
    
    // Check for database issues
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (err) {
      issues.push({
        type: 'database',
        severity: 'critical',
        message: 'Database connection failed',
        details: err.message,
        fix: 'Check database connection string and network connectivity.'
      });
    }

    // Check memory
    const memoryUsage = process.memoryUsage();
    const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    if (memoryPercent > 80) {
      issues.push({
        type: 'memory',
        severity: memoryPercent > 90 ? 'critical' : 'warning',
        message: `Memory usage at ${Math.round(memoryPercent)}%`,
        details: `Heap: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        fix: memoryPercent > 90 ? 'Restart server or increase memory limit.' : 'Monitor memory usage.'
      });
    }

    // Check for user issues (failed logins)
    const failedLogins = await prisma.loginAttempt.count({
      where: {
        success: false,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    });
    if (failedLogins > 10) {
      issues.push({
        type: 'security',
        severity: 'warning',
        message: `${failedLogins} failed login attempts in the last 24 hours`,
        details: 'Possible brute force attack or users having trouble logging in.',
        fix: 'Check login patterns. Consider rate limiting if suspicious.'
      });
    }

    // Check for recent errors
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentErrors = errorStore.filter(e => 
      new Date(e.timestamp) > new Date(oneDayAgo)
    );
    
    if (recentErrors.length > 0) {
      const errorTypes = {};
      recentErrors.forEach(e => {
        const key = e.error.split(':')[0] || e.error;
        errorTypes[key] = (errorTypes[key] || 0) + 1;
      });
      
      issues.push({
        type: 'errors',
        severity: recentErrors.length > 5 ? 'critical' : 'warning',
        message: `${recentErrors.length} errors in the last 24 hours`,
        details: Object.entries(errorTypes).map(([key, count]) => `${key}: ${count}x`).join(', '),
        fix: 'Check error logs for details. Address the most frequent errors first.'
      });
    }

    return issues;
  }

  // ========== GET USER-SPECIFIC ISSUES ==========
  async getUserIssues(userId) {
    // Check for failed actions by this user
    const failedActions = await prisma.failedAction.findMany({
      where: {
        userId: userId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Check for unread notifications (they might be missing important info)
    const unreadCount = await prisma.notification.count({
      where: {
        userId: userId,
        read: false
      }
    });

    // Check for pending pledges
    const pendingPledges = await prisma.pledge.count({
      where: {
        userId: userId,
        status: 'PENDING'
      }
    });

    return {
      hasIssues: failedActions.length > 0 || unreadCount > 10 || pendingPledges > 0,
      failedActions: failedActions,
      unreadNotifications: unreadCount,
      pendingPledges: pendingPledges,
      warnings: []
    };
  }

  // ========== LOG USER ACTION FAILURE ==========
  logUserIssue(userId, action, error, context = {}) {
    return this.logError(error, {
      userId,
      action,
      ...context,
      userReported: true
    });
  }
}

// Singleton instance
const systemMonitor = new SystemMonitor();

// ========== EXPRESS MIDDLEWARE ==========
function monitoringMiddleware(req, res, next) {
  // Track request start time
  const startTime = Date.now();
  
  // Store original end function
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Log if slow (> 3 seconds)
    if (responseTime > 3000) {
      systemMonitor.logActivity('slow_request', {
        path: req.path,
        method: req.method,
        responseTime: responseTime,
        userId: req.user?.userId || null,
        statusCode: res.statusCode
      });
    }
    
    // Log errors (status >= 400)
    if (res.statusCode >= 400) {
      const errorMessage = res.statusMessage || `HTTP ${res.statusCode}`;
      systemMonitor.logError(errorMessage, {
        userId: req.user?.userId || null,
        path: req.path,
        method: req.method,
        statusCode: res.statusCode,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
    }
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
}

// ========== EXPORTS ==========
module.exports = {
  systemMonitor,
  monitoringMiddleware,
  errorStore,
  activityStore
};