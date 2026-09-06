// ================== SET TIMEZONE FIRST ==================
// This MUST be the first thing before any other code
process.env.TZ = 'Africa/Nairobi';
console.log(`Server timezone set to: ${process.env.TZ}`);
console.log(`Current server time: ${new Date().toString()}`);


// ================== ENV & CORE MODULES ==================
require("dotenv").config();
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const http = require("http");
const axios = require("axios");
// Add this with your other requires
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);
const { send24HourReport } = require('./services/reportService');
const cloudinary = require('cloudinary').v2;

// ================== EXPRESS & MIDDLEWARE ==================
const express = require("express");
const cors = require("cors");
const multer = require("multer");

const app = express();
const messengerRoutes = require('./routes/messenger');
const { checkSemesterEndAndSendReports } = require('./services/semesterScheduler');
const { monitoringMiddleware, systemMonitor } = require('./services/systemMonitor');

const { processBirthdayAdverts } = require("./services/cronJobs");

// ================== DATABASE & AUTH ==================
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcryptjs");

// ================== HELPER FUNCTIONS ==================
async function getNextAvailableMembershipNumber() {
  try {
    const users = await prisma.user.findMany({
      select: { membership_number: true }
    });

    if (users.length === 0) {
      return 'Z#001';
    }

    const usedNumbers = users
      .map(u => parseInt(u.membership_number.replace('Z#', '')))
      .filter(num => !isNaN(num))
      .sort((a, b) => a - b);

    let expected = 1;
    for (const num of usedNumbers) {
      if (num > expected) {
        return `Z#${expected.toString().padStart(3, '0')}`;
      }
      expected++;
    }

    return `Z#${expected.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error("Error finding next number:", error);
    const maxUser = await prisma.user.findFirst({
      orderBy: { membership_number: 'desc' }
    });
    const maxNum = maxUser ? parseInt(maxUser.membership_number.replace('Z#', '')) : 0;
    return `Z#${(maxNum + 1).toString().padStart(3, '0')}`;
  }
}




const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "zuca_super_secret_key";


// ================== ESCAPE HTML HELPER ==================
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}




// ============================================
// GLOBAL URL HELPER FOR PUSH NOTIFICATIONS
// ============================================
function getDeepLinkUrl(type, data = {}) {
  const baseUrl = process.env.FRONTEND_URL || 'https://www.zetechcatholicaction.com';
  
  const routes = {
    // ==================== ATTENDANCE ====================
    'attendance_checkin': '/member/attendance',
    'attendance_thankyou': '/member/attendance',
    'attendance_missed': '/member/attendance',
    'attendance_sheet_opened': '/admin/attendance',
    'attendance_reminder': '/member/attendance',
    'attendance_summary': '/admin/attendance/overview',
    'attendance_automatic_reminder': '/member/attendance',
    'attendance_admin_report': '/admin/attendance/overview',
    'attendance_bulk_checkin': '/admin/attendance',
    
    // ==================== MINUTES ====================
    'meeting_minutes_published': '/minutes',
    'meeting_minutes_comment': '/minutes',
    'minutes_published': '/minutes',
    
    // ==================== ANNOUNCEMENTS ====================
    'announcement': '/announcements',
    'new_announcement': '/announcements',
    'jumuia_announcement': '/announcements',
    
    // ==================== GAMES ====================
    'game_invite': '/games',
    
    // ==================== DIRECT MESSAGES ====================
    'direct_message': '/messenger',
    'message': '/messenger',
    'chat_mention': '/messenger',
    'pin': '/messenger',
    'broadcast': '/messenger',
    'send_email': '/messenger',
    'report_resolved': '/messenger',
    
    // ==================== CONTRIBUTIONS ====================
    'contribution': '/contributions',
    'pledge_approved': '/contributions',
    'payment_added': '/contributions',
    'payment_success': '/contributions',
    'payment_received': '/contributions',
    'jumuia_contribution': '/contributions',
    'pledge_message': '/contributions',
    'new_pledge': '/contributions',
    
    // ==================== EXECUTIVE ====================
    'executive_appointment': '/executive',
    'executive_removed': '/executive',
    
    // ==================== MEDIA ====================
    'new_media': '/gallery',
    'media_comment': '/gallery',
    
    // ==================== YOUTUBE ====================
    'youtube_new_video': '/youtube',
    'youtube_live': '/youtube',
    
    // ==================== SCHEDULES & EVENTS ====================
    'schedule': '/schedules',
    'event_reminder': '/schedules',
    'program': '/mass-programs',
    
    // ==================== JUMUIA ====================
    'jumuia': '/jumuia',


        // ✅ ==================== FEEDBACK ====================
    'feedback_new': '/admin/feedback',
    'feedback_updated': '/feedback/history',
    
    // ==================== SYSTEM ====================
    'test': '/dashboard',
    'user_login': '/dashboard',
    'role_change': '/dashboard',
    'welcome': '/dashboard',
    'api_notify': '/dashboard',
    
    // ==================== DEFAULT ====================
    'default': '/dashboard',

       // ==================== MASS READINGS ====================
    'mass_reading': '/mass-readings',  
  };

  // ✅ Get the clean route - NO IDs, NO parameters appended
  let route = routes[type] || routes['default'];
  
  // ✅ REMOVED ALL ID APPENDAGE:
  // - No /sheet/ 
  // - No ?invite=
  // - No /media/
  // - No ?conversation=
  // - Nothing extra!
  
  const finalUrl = baseUrl + route;
  console.log(`🔗 [${type}] Opening: ${finalUrl}`);
  
  return finalUrl;
}


  global.getDeepLinkUrl = getDeepLinkUrl;


console.log('✅ URL helper loaded for push notifications');


// ================== PUBLIC DEBUG ENDPOINTS (NO AUTH NEEDED) ==================
// Put these BEFORE your authenticate middleware!

// Debug: Check Kenyan time (public - no token needed)
app.get("/api/debug/kenyan-time", (req, res) => {
  const now = new Date();
  const kenyanTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  
  res.json({
    success: true,
    kenyanTime: kenyanTime.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }),
    isoString: now.toISOString(),
    serverTime: now.toString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
});

// Debug: Simple health check (public)
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// ================== KENYAN TIME HELPER (ADD THIS) ==================
const KENYA_TIMEZONE = 'Africa/Nairobi'; // UTC+3

// Helper: Get current Kenyan time
function getKenyanTime() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: KENYA_TIMEZONE }));
}

// Helper: Convert any date to Kenyan time
function toKenyanTime(date) {
  return new Date(date.toLocaleString('en-US', { timeZone: KENYA_TIMEZONE }));
}

// ================== RESET ATTEMPTS ==================
const resetAttempts = new Map();

const { sendEventReminders, sendCampaignReminders, checkNoAnnouncements } = require("./services/cronJobs");

// ================== EMAIL ==================
const { sendPasswordResetEmail, sendPersonalizedEmail, sendWelcomeEmail, sendVerificationEmail } = require("./services/mailer");
// ================== NOTIFICATIONS ==================
const notifications = new Map();
const pendingRegistrations = new Map();

const createNotification = ({ userId, type, title, message }) => {
  const notif = {
    id: Date.now().toString(),
    userId,
    type,
    title,
    message,
    read: false,
    createdAt: new Date(),
  };
  
  if (userId) {
    if (!notifications.has(userId)) {
      notifications.set(userId, []);
    }
    notifications.get(userId).push(notif);
  }
  
  return notif;
};

const readNotifications = (userId) => {
  return notifications.get(userId) || [];
};

const markAsRead = (userId) => {
  const userNotifs = notifications.get(userId) || [];
  userNotifs.forEach(n => n.read = true);
  return userNotifs;
};


// ================== CORS CONFIGURATION - SINGLE PLACE ==================
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5000",
  "http://localhost:5173",
    "http://localhost:5174",

  "http://10.92.196.169:5173",
  "http://100.79.107.46:5173",
  "http://192.168.100.141:5173",
  "https://zetechcatholic.vercel.app",
  "https://zuca-backend-iw9p.onrender.com",
  "https://zucaportal.onrender.com",
  "https://zetechcatholicaction.com",
  "https://www.zetechcatholicaction.com",
  // ADD YOUR TAILSCALE DOMAIN - THIS IS THE MISSING ONE!
  "https://chris-laptop.tail96b26f.ts.net",
  "http://chris-laptop.tail96b26f.ts.net"  // Also add HTTP version
];

// CORS for Express
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      console.log(`❌ CORS blocked: ${origin}`);  // Add logging to debug
      const msg = 'CORS policy does not allow access from this origin.';
      return callback(new Error(msg), false);
    }
    console.log(`✅ CORS allowed: ${origin}`);  // Add logging to debug
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Handle preflight requests
app.options('*', cors());


app.use((req, res, next) => {
  if (req.path === '/api/youtube-webhook' && req.method === 'POST') {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      req.rawBody = data;
      next();
    });
  } else {
    next();
  }
});

app.use(express.json({ limit: '2gb' }));
app.use(express.urlencoded({ extended: true, limit: '2gb' }));


// ================== PUBLIC FEATURED MEDIA ENDPOINT ==================
// This is PUBLIC - no authentication required
app.get("/api/public/featured-media", async (req, res) => {
  try {
    const { limit = 6 } = req.query;
    
    const media = await prisma.media.findMany({
      where: { 
        isPublic: true, 
        isFeatured: true 
      },
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        url: true,
        thumbnailUrl: true,
        type: true,
        createdAt: true,
        uploadedBy: {
          select: {
            id: true,
            fullName: true,
            profileImage: true
          }
        },
        _count: {
          select: {
            likes: true,
            views: true
          }
        }
      }
    });
    
    res.json({
      success: true,
      count: media.length,
      media: media
    });
  } catch (err) {
    console.error("Featured media error:", err);
    res.status(500).json({ error: err.message });
  }
});
app.get("/hymn/:title", async (req, res) => {
  try {
    const title = decodeURIComponent(req.params.title);
    
    // Check if the parameter looks like a UUID (contains dashes)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(title);
    
    let hymn;
    
    if (isUUID) {
      hymn = await prisma.song.findUnique({
        where: {
          id: title,
        },
      });
    } else {
      hymn = await prisma.song.findFirst({
        where: {
          title: {
            equals: title,
            mode: "insensitive",
          },
        },
      });
    }

    if (!hymn) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Hymn Not Found</title>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-height: 100vh; background: #f8fafc; display: flex; align-items: center; justify-content: center; padding: 20px; }
            .error-box { max-width: 500px; background: white; padding: 40px; border-radius: 16px; text-align: center; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
            .error-icon { font-size: 48px; color: #ef4444; margin-bottom: 16px; }
            h1 { color: #1e293b; font-size: 24px; margin-bottom: 8px; }
            p { color: #64748b; margin-bottom: 20px; }
            .btn { display: inline-block; padding: 10px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: 500; }
            .btn:hover { background: #2563eb; }
            .btn i { margin-right: 8px; }
          </style>
        </head>
        <body>
          <div class="error-box">
            <div class="error-icon"><i class="fas fa-music"></i></div>
            <h1>Hymn Not Found</h1>
            <p>We couldn't find the hymn "${escapeHtml(title)}" in our collection.</p>
            <a href="https://www.zetechcatholicaction.com/hymns" class="btn"><i class="fas fa-book"></i> Browse Hymns</a>
          </div>
        </body>
        </html>
      `);
    }

    const escapeHtml = (text = "") => {
      if (!text) return '';
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    };

    // Format lyrics with proper structure
    const formatLyrics = (text) => {
      if (!text) return '';
      
      const lines = text.split('\n');
      let formattedLines = [];
      let chorusLines = [];
      let inChorus = false;
      
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        if (line.trim() === '') {
          if (inChorus && chorusLines.length > 0) {
            formattedLines.push(`<div class="chorus">${chorusLines.join('\n')}</div>`);
            chorusLines = [];
            inChorus = false;
          }
          formattedLines.push('<br>');
          continue;
        }
        
        const hasBold = line.includes('**');
        let processedLine = line;
        if (hasBold) {
          processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        }
        
        const isBoldLine = hasBold && line.trim().startsWith('**') && line.trim().endsWith('**');
        
        if (isBoldLine) {
          if (!inChorus) {
            inChorus = true;
            chorusLines = [];
          }
          chorusLines.push(`<div class="lyric-line">${processedLine}</div>`);
          continue;
        }
        
        if (inChorus && !isBoldLine) {
          if (chorusLines.length > 0) {
            formattedLines.push(`<div class="chorus">${chorusLines.join('\n')}</div>`);
            chorusLines = [];
          }
          inChorus = false;
        }
        
        const trimmedLine = line.trim();
        if (!hasBold && trimmedLine.length > 10 && 
            (trimmedLine === trimmedLine.toUpperCase() || 
             (trimmedLine.match(/^[A-Z][a-z]+\s+[A-Z]/) && trimmedLine.endsWith(',')))) {
          formattedLines.push(`<div class="section-header">${processedLine}</div>`);
          continue;
        }
        
        if (line.match(/^[0-9]+\./)) {
          formattedLines.push(`<div class="verse-marker">${processedLine}</div>`);
          continue;
        }
        
        formattedLines.push(`<div class="lyric-line">${processedLine}</div>`);
      }
      
      if (inChorus && chorusLines.length > 0) {
        formattedLines.push(`<div class="chorus">${chorusLines.join('\n')}</div>`);
      }
      
      return formattedLines.join('\n');
    };

    const pageTitle = `${hymn.title} Lyrics | Zetech Catholic Action`;
    const description = `Read the full lyrics of ${hymn.title}${hymn.reference ? ` (${hymn.reference})` : ""} from the Zetech Catholic Action Hymn Book.`;
    const safeLyrics = formatLyrics(hymn.lyrics);
    const isSwahili = /[āēīōū]/i.test(hymn.title) || hymn.title.includes('YANGU');

    // ZUCA Logo URL
    const ZUCA_LOGO_URL = "https://dcxuxitorpfujfbtyhhn.supabase.co/storage/v1/object/public/profiles/profile_c2dd6c54-4576-41b1-a85d-1af90d88254a_1777067617594.jpg";

    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${pageTitle}</title>
<meta name="description" content="${description}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="https://www.zetechcatholicaction.com/hymn/${encodeURIComponent(hymn.title)}">
<meta property="og:title" content="${pageTitle}">
<meta property="og:description" content="${description}">
<meta property="og:type" content="article">
<meta property="og:url" content="https://www.zetechcatholicaction.com/hymn/${encodeURIComponent(hymn.title)}">

<!-- Font Awesome Icons -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  
  body {
    min-height: 100vh;
    background: #f8fafc;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    color: #1e293b;
    line-height: 1.8;
  }

  /* Header */
  .app-header {
    background: white;
    border-bottom: 1px solid #e2e8f0;
    padding: 12px 20px;
    position: sticky;
    top: 0;
    z-index: 100;
    backdrop-filter: blur(8px);
    background: rgba(255,255,255,0.95);
  }

  .header-content {
    max-width: 900px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .logo {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    overflow: hidden;
    border: 2px solid #3b82f6;
    flex-shrink: 0;
  }

  .logo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .header-title {
    font-size: 20px;
    font-weight: 700;
    color: #1e293b;
  }

  .header-title span {
    color: #3b82f6;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .icon-btn {
    width: 36px;
    height: 36px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: white;
    color: #64748b;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    font-size: 16px;
    text-decoration: none;
  }

  .icon-btn:hover {
    background: #f8fafc;
    border-color: #94a3b8;
    color: #1e293b;
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #3b82f6;
    text-decoration: none;
    background: white;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    padding: 6px 14px;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
  }

  .nav-link:hover {
    background: #f8fafc;
  }

  .nav-link i {
    font-size: 14px;
  }

  /* Main Content */
  .container {
    max-width: 900px;
    margin: 0 auto;
    padding: 20px;
  }

  .content-card {
    background: white;
    border-radius: 16px;
    padding: 40px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }

  /* Header Section */
  .hymn-header {
    text-align: center;
    padding-bottom: 24px;
    border-bottom: 2px solid #f1f5f9;
    margin-bottom: 30px;
  }

  .hymn-title {
    font-size: 32px;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 8px;
    line-height: 1.2;
  }

  .hymn-title.swahili {
    color: #7c3aed;
  }

  .hymn-reference {
    font-size: 16px;
    color: #64748b;
    background: #f1f5f9;
    display: inline-block;
    padding: 4px 16px;
    border-radius: 20px;
    margin-top: 8px;
  }

  /* Lyrics */
  .lyrics-container {
    max-width: 100%;
    margin: 0 auto;
  }

  .lyric-line {
    padding: 3px 0;
    font-size: 17px;
    line-height: 1.8;
    color: #334155;
  }

  .lyric-line strong {
    color: #1e293b;
    font-weight: 700;
  }

  .section-header {
    padding: 12px 0 6px 0;
    font-size: 15px;
    font-weight: 600;
    color: #475569;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    border-top: 1px solid #e2e8f0;
    margin-top: 12px;
  }

  .section-header:first-of-type {
    border-top: none;
    margin-top: 0;
  }

  .verse-marker {
    font-weight: 600;
    color: #64748b;
    padding: 10px 0 4px 0;
    font-size: 15px;
  }

  .chorus {
    background: #f8fafc;
    padding: 16px 20px;
    border-radius: 12px;
    margin: 12px 0;
    border-left: 4px solid #7c3aed;
  }

  .chorus .lyric-line {
    font-weight: 500;
  }

  .chorus .lyric-line strong {
    color: #7c3aed;
  }

  .swahili-hymn .lyric-line {
    font-size: 18px;
  }

  .swahili-hymn .section-header {
    color: #7c3aed;
    font-style: italic;
  }

  .swahili-hymn .chorus {
    border-left-color: #7c3aed;
    background: #faf5ff;
  }

  .swahili-hymn .chorus .lyric-line strong {
    color: #7c3aed;
  }

  /* Action Bar */
  .action-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 30px;
    padding-top: 24px;
    border-top: 1px solid #e2e8f0;
    justify-content: center;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: white;
    color: #1e293b;
    text-decoration: none;
    border-radius: 10px;
    font-weight: 500;
    font-size: 14px;
    border: 1px solid #e2e8f0;
    transition: all 0.2s ease;
    cursor: pointer;
  }

  .btn:hover {
    background: #f8fafc;
    border-color: #94a3b8;
    transform: translateY(-1px);
    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  }

  .btn i {
    font-size: 16px;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .btn-primary:hover {
    background: #2563eb;
    border-color: #2563eb;
    color: white;
  }

  .btn-outline {
    background: transparent;
    color: #3b82f6;
    border-color: #3b82f6;
  }

  .btn-outline:hover {
    background: #eff6ff;
  }

  .btn-success {
    background: #22c55e;
    color: white;
    border-color: #22c55e;
  }

  .btn-success:hover {
    background: #16a34a;
    border-color: #16a34a;
    color: white;
  }

  /* Footer */
  .footer {
    text-align: center;
    color: #94a3b8;
    font-size: 12px;
    margin-top: 30px;
    padding: 20px;
    border-top: 1px solid #e2e8f0;
  }

  .footer a {
    color: #3b82f6;
    text-decoration: none;
  }

  .footer a:hover {
    text-decoration: underline;
  }

  /* Modal */
  .modal-overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    z-index: 1000;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .modal-overlay.active {
    display: flex;
  }

  .modal-content {
    background: white;
    border-radius: 16px;
    padding: 32px;
    max-width: 480px;
    width: 100%;
    position: relative;
    border: 1px solid #e2e8f0;
  }

  .modal-close {
    position: absolute;
    top: 12px;
    right: 12px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    color: #64748b;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    transition: all 0.2s ease;
  }

  .modal-close:hover {
    background: #e2e8f0;
  }

  .modal-title {
    font-size: 20px;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 16px;
  }

  .modal-title i {
    margin-right: 8px;
    color: #3b82f6;
  }

  .share-url-container {
    display: flex;
    gap: 10px;
    margin-top: 12px;
  }

  .share-url-input {
    flex: 1;
    padding: 10px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    background: #f8fafc;
    color: #1e293b;
    font-family: monospace;
  }

  .copy-btn {
    padding: 10px 20px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .copy-btn:hover {
    background: #2563eb;
  }

  .copy-btn i {
    margin-right: 6px;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .container { padding: 12px; }
    .content-card { padding: 20px; border-radius: 12px; }
    .hymn-title { font-size: 24px; }
    .lyric-line { font-size: 16px; }
    .swahili-hymn .lyric-line { font-size: 16px; }
    .action-bar { gap: 8px; }
    .btn { padding: 8px 14px; font-size: 13px; }
    .header-title { font-size: 16px; }
    .header-content { flex-wrap: wrap; gap: 8px; }
    .modal-content { padding: 20px; margin: 12px; }
    .logo { width: 32px; height: 32px; }
  }

  @media print {
    body { background: white; }
    .app-header { display: none; }
    .action-bar { display: none !important; }
    .content-card { border: none; box-shadow: none; padding: 20px; }
    .hymn-title { color: #000 !important; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>

<!-- Header -->
<header class="app-header no-print">
  <div class="header-content">
    <div class="header-left">
      <div class="logo">
        <img src="${ZUCA_LOGO_URL}" alt="ZUCA Logo">
      </div>
      <div class="header-title">Zetech <span>Catholic</span> Action</div>
    </div>
    <div class="header-right">
      <a href="https://www.zetechcatholicaction.com/dashboard" class="nav-link">
        <i class="fas fa-home"></i> Dashboard
      </a>
    </div>
  </div>
</header>

<!-- Main Content -->
<div class="container">
  <div class="content-card ${isSwahili ? 'swahili-hymn' : ''}">
    
    <!-- Hymn Header -->
    <div class="hymn-header">
      <h1 class="hymn-title ${isSwahili ? 'swahili' : ''}">
        ${escapeHtml(hymn.title)}
      </h1>
      ${hymn.reference ? `<div class="hymn-reference">${escapeHtml(hymn.reference)}</div>` : ''}
    </div>

    <!-- Lyrics -->
    <div class="lyrics-container">
      ${safeLyrics}
    </div>

    <!-- Action Buttons -->
    <div class="action-bar no-print">
      <a href="https://www.zetechcatholicaction.com/hymns" class="btn">
        <i class="fas fa-book"></i> All Hymns
      </a>
      <a href="https://www.zetechcatholicaction.com/dashboard" class="btn btn-outline">
        <i class="fas fa-home"></i> Dashboard
      </a>
      <button onclick="window.print()" class="btn">
        <i class="fas fa-print"></i> Print
      </button>
      <button onclick="shareHymn()" class="btn btn-outline">
        <i class="fas fa-share-alt"></i> Share
      </button>
      <button onclick="downloadHymn()" class="btn btn-primary">
        <i class="fas fa-download"></i> Download
      </button>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>From the <a href="https://www.zetechcatholicaction.com">Zetech Catholic Action</a> Hymn Book</p>
      <p style="margin-top: 4px; font-size: 11px;">Zetech Catholic Action Portal</p>
    </div>
  </div>
</div>

<!-- Share Modal -->
<div id="shareModal" class="modal-overlay" onclick="closeModal(event)">
  <div class="modal-content" onclick="event.stopPropagation()">
    <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    <h3 class="modal-title"><i class="fas fa-share-alt"></i> Share Hymn</h3>
    <p style="color: #64748b; font-size: 14px; margin-bottom: 12px;">
      Share this hymn with others
    </p>
    <div class="share-url-container">
      <input id="shareUrl" type="text" value="https://www.zetechcatholicaction.com/hymn/${encodeURIComponent(hymn.title)}" readonly class="share-url-input">
      <button onclick="copyShareLink()" class="copy-btn"><i class="fas fa-copy"></i> Copy</button>
    </div>
  </div>
</div>

<script>
  function shareHymn() {
    if (navigator.share) {
      navigator.share({
        title: '${escapeHtml(hymn.title)}',
        text: 'Check out this hymn: ${escapeHtml(hymn.title)}',
        url: 'https://www.zetechcatholicaction.com/hymn/${encodeURIComponent(hymn.title)}',
      }).catch(err => console.log('Share cancelled'));
    } else {
      document.getElementById('shareModal').classList.add('active');
    }
  }

  function closeModal(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('shareModal').classList.remove('active');
  }

  function copyShareLink() {
    const input = document.getElementById('shareUrl');
    input.select();
    input.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(input.value).then(() => {
      const btn = document.querySelector('.copy-btn');
      btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
      setTimeout(() => { btn.innerHTML = '<i class="fas fa-copy"></i> Copy'; }, 2000);
    }).catch(() => {
      document.execCommand('copy');
      const btn = document.querySelector('.copy-btn');
      btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
      setTimeout(() => { btn.innerHTML = '<i class="fas fa-copy"></i> Copy'; }, 2000);
    });
  }

  function downloadHymn() {
    const html = \`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${escapeHtml(hymn.title)} - Hymn</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.8; }
          .hymn-title { text-align: center; font-size: 28px; color: #1e293b; }
          .hymn-reference { text-align: center; color: #64748b; margin-bottom: 30px; }
          .lyric-line { padding: 2px 0; }
          .section-header { font-weight: 600; margin-top: 12px; color: #475569; }
          .verse-marker { font-weight: 600; color: #64748b; padding: 8px 0 4px 0; }
          .chorus { background: #f8fafc; padding: 12px 16px; border-radius: 8px; margin: 8px 0; border-left: 4px solid #7c3aed; }
          strong { color: #1e293b; }
          .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1 class="hymn-title">${escapeHtml(hymn.title)}</h1>
        ${hymn.reference ? `<div class="hymn-reference">${escapeHtml(hymn.reference)}</div>` : ''}
        <div>${safeLyrics}</div>
        <div class="footer">From the Zetech Catholic Action Hymn Book</div>
      </body>
      </html>
    \`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '${encodeURIComponent(hymn.title)}.html';
    a.click();
    URL.revokeObjectURL(url);
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeModal();
  });

  document.getElementById('shareModal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });
</script>

</body>
</html>
`);
  } catch (err) {
    console.error(err);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-height: 100vh; background: #f8fafc; display: flex; align-items: center; justify-content: center; padding: 20px; }
          .error-box { max-width: 500px; background: white; padding: 40px; border-radius: 16px; text-align: center; border: 1px solid #e2e8f0; }
          .error-icon { font-size: 48px; color: #ef4444; margin-bottom: 16px; }
          h1 { color: #1e293b; font-size: 24px; margin-bottom: 8px; }
          p { color: #64748b; margin-bottom: 20px; }
          .btn { display: inline-block; padding: 10px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: 500; }
          .btn:hover { background: #2563eb; }
          .btn i { margin-right: 8px; }
        </style>
      </head>
      <body>
        <div class="error-box">
          <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
          <h1>Server Error</h1>
          <p>We're having trouble loading this hymn. Please try again later.</p>
          <a href="https://www.zetechcatholicaction.com/dashboard" class="btn"><i class="fas fa-home"></i> Back to Dashboard</a>
        </div>
      </body>
      </html>
    `);
  }
});

// ================== PUBLIC UPCOMING EVENTS ==================
app.get("/api/public/upcoming-events", async (req, res) => {
  try {
    const { limit = 6 } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const events = await prisma.scheduleEvent.findMany({
      where: {
        eventDate: { gte: today },
        schedule: { isPublished: true }
      },
      include: {
        schedule: {
          select: {
            id: true,
            title: true,
            isPublished: true
          }
        }
      },
      orderBy: { eventDate: 'asc' },
      take: parseInt(limit)
    });
    
    res.json({
      success: true,
      count: events.length,
      events: events
    });
  } catch (err) {
    console.error("Error fetching upcoming events:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// Cache for YouTube data
let youtubeCache = {
  data: null,
  timestamp: null,
  cacheDuration: 3600000 // 1 hour in milliseconds
};

// ================== PUBLIC TOP WATCHED YOUTUBE VIDEOS ==================
app.get("/api/public/youtube-top", async (req, res) => {
  try {
    const { limit = 3 } = req.query;
    
    // Check cache first
    const now = Date.now();
    if (youtubeCache.data && youtubeCache.timestamp && (now - youtubeCache.timestamp) < youtubeCache.cacheDuration) {
      console.log('📦 Returning cached YouTube data');
      return res.json(youtubeCache.data);
    }
    
    const channelId = process.env.YOUTUBE_CHANNEL_ID || "UCJ7NvR5_ZUwhtM16sJY4anQ";
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
      return res.json({
        success: false,
        error: "YouTube API not configured",
        channelUrl: "https://www.youtube.com/@zetechUniversityCatholic",
        videos: []
      });
    }
    
    // Get recent videos
    const videosResponse = await axios.get(
      `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet&order=date&maxResults=30&type=video`
    );
    
    if (!videosResponse.data.items || videosResponse.data.items.length === 0) {
      return res.json({
        success: false,
        message: "No videos found",
        channelUrl: "https://www.youtube.com/@zetechUniversityCatholic",
        videos: []
      });
    }
    
    const videoIds = videosResponse.data.items.map(v => v.id.videoId).filter(id => id).join(',');
    
    if (!videoIds) {
      return res.json({
        success: false,
        message: "No video IDs found",
        channelUrl: "https://www.youtube.com/@zetechUniversityCatholic",
        videos: []
      });
    }
    
    const videoStats = await axios.get(
      `https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&id=${videoIds}&part=statistics,contentDetails,snippet`
    );
    
    // Process all videos and sort by view count
    const allVideos = videosResponse.data.items.map(video => {
      const stats = videoStats.data.items.find(v => v.id === video.id.videoId) || {};
      const snippet = video.snippet;
      const viewCount = parseInt(stats.statistics?.viewCount || 0);
      
      return {
        id: video.id.videoId,
        title: snippet.title,
        description: snippet.description,
        thumbnail: snippet.thumbnails.high?.url || snippet.thumbnails.medium?.url,
        publishedAt: snippet.publishedAt,
        views: viewCount,
        likes: parseInt(stats.statistics?.likeCount || 0),
        comments: parseInt(stats.statistics?.commentCount || 0),
        duration: stats.contentDetails?.duration || "PT0S",
        channelTitle: snippet.channelTitle
      };
    });
    
    // Sort by views (most watched first)
    const topWatched = allVideos
      .sort((a, b) => b.views - a.views)
      .slice(0, parseInt(limit));
    
    // Get channel info
    let channel = {};
    try {
      const channelResponse = await axios.get(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`
      );
      channel = channelResponse.data.items?.[0] || {};
    } catch (err) {
      console.log('Could not fetch channel info');
    }
    
    const responseData = {
      success: true,
      channel: {
        name: channel.snippet?.title || "ZUCA Channel",
        subscribers: parseInt(channel.statistics?.subscriberCount || 0),
        totalViews: parseInt(channel.statistics?.viewCount || 0),
        totalVideos: parseInt(channel.statistics?.videoCount || 0),
        thumbnail: channel.snippet?.thumbnails?.default?.url,
        description: channel.snippet?.description
      },
      videos: topWatched,
      count: topWatched.length,
      cached: false,
      timestamp: new Date().toISOString()
    };
    
    // Update cache
    youtubeCache = {
      data: responseData,
      timestamp: now,
      cacheDuration: youtubeCache.cacheDuration
    };
    
    res.json(responseData);
    
  } catch (error) {
    console.error("YouTube API error:", error.message);
    
    // Return cached data if available, even if expired
    if (youtubeCache.data) {
      console.log('⚠️ API error but returning cached data');
      return res.json({
        ...youtubeCache.data,
        cached: true,
        stale: true
      });
    }
    
    res.json({
      success: false,
      error: error.message,
      channelUrl: "https://www.youtube.com/@zetechUniversityCatholic",
      videos: []
    });
  }
});


// ================== PUBLIC HYMNS ENDPOINTS ==================

// Get all hymns (public)
app.get("/api/public/hymns", async (req, res) => {
  try {
    const { page = 1, limit = 12, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = search ? {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } }
      ]
    } : {};
    
    const [songs, total] = await Promise.all([
      prisma.song.findMany({
        where,
        select: {
          id: true,
          title: true,
          reference: true,
          lyrics: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.song.count({ where })
    ]);
    
    // Add preview (first line of lyrics)
    const songsWithPreview = songs.map(song => {
      let preview = '';
      if (song.lyrics) {
        const firstLine = song.lyrics.split('\n').find(line => line.trim());
        preview = firstLine ? firstLine.substring(0, 100) : '';
      }
      return {
        id: song.id,
        title: song.title,
        reference: song.reference,
        preview: preview,
        createdAt: song.createdAt
      };
    });
    
    res.json({
      success: true,
      hymns: songsWithPreview,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      hasMore: skip + songsWithPreview.length < total
    });
  } catch (err) {
    console.error("Error fetching hymns:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get single hymn by ID (public)
app.get("/api/public/hymns/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const hymn = await prisma.song.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        reference: true,
        lyrics: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!hymn) {
      return res.status(404).json({ success: false, error: "Hymn not found" });
    }
    
    res.json({
      success: true,
      hymn: hymn
    });
  } catch (err) {
    console.error("Error fetching hymn:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Search hymns (public)
app.get("/api/public/hymns/search/:query", async (req, res) => {
  try {
    const { query } = req.params;
    const { limit = 20 } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.json({ success: true, hymns: [] });
    }
    
    const hymns = await prisma.song.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { reference: { contains: query, mode: 'insensitive' } },
          { lyrics: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        title: true,
        reference: true,
        lyrics: true
      },
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    });
    
    const results = hymns.map(hymn => {
      let preview = '';
      if (hymn.lyrics) {
        const lines = hymn.lyrics.split('\n');
        preview = lines.find(line => 
          line.toLowerCase().includes(query.toLowerCase())
        ) || lines[0] || '';
        preview = preview.substring(0, 120);
      }
      
      return {
        id: hymn.id,
        title: hymn.title,
        reference: hymn.reference,
        preview: preview
      };
    });
    
    
    res.json({
      success: true,
      query: query,
      count: results.length,
      hymns: results
    });
  } catch (err) {
    console.error("Error searching hymns:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});









// ================== MIDDLEWARE ==================
app.use((req, res, next) => {
  console.log(req.method, req.path, req.body);
  next();
});


const meetingMinutesRoutes = require("./routes/meetingMinutes");
app.use("/api/minutes", meetingMinutesRoutes);


const treasurerReportsRoutes = require("./routes/treasurerReports");


app.use("/api/treasurer", treasurerReportsRoutes);

const ibmRoutes = require("./routes/ibmRoutes");
app.use("/api/ibm", ibmRoutes);


// Direct Messaging System Routes
app.use('/api/messenger', messengerRoutes);
const adminMessagingRoutes = require('./routes/admin-messaging');
app.use('/api/admin/messenger', adminMessagingRoutes);

// Import history routes
const historyRoutes = require('./routes/historyRoutes');
app.use('/api/history', historyRoutes);

//semister
const semesterRoutes = require("./routes/semesterRoutes");
app.use("/api/semesters", semesterRoutes);


//executive view minutes 

const executiveMinutesRoutes = require("./routes/executiveMinutesRoutes");

app.use("/api/executive/minutes", executiveMinutesRoutes);


// ================== BIOMETRIC ROUTES ==================
const biometricRoutes = require('./routes/biometricRoutes');
app.use('/api/biometric', biometricRoutes);
console.log('✅ Biometric routes loaded successfully');


//email settings
const adminEmailSettings = require('./routes/admin/emailSettings');
console.log('✅ Email Settings routes loaded successfully');
app.use('/api/admin/email', adminEmailSettings);

app.get('/api/admin/email/test', (req, res) => {
  res.json({ success: true, message: 'Email settings route is working!', timestamp: new Date().toISOString() });
});


// ================== WEBHOOK ROUTES ==================
const webhookRoutes = require('./routes/webhookRoutes');
app.use('/api/webhooks', webhookRoutes);

// Email Routes
const emailRoutes = require('./routes/emailRoutes');
app.use('/api/email', emailRoutes);

// Email Settings Routes
const emailSettingsRoutes = require('./routes/emailSettingsRoutes');
app.use('/api/email', emailSettingsRoutes);



// ================== YOUTUBE WEBHOOK ROUTES ==================
const youtubeWebhookRoutes = require('./routes/youtubeWebhook');

app.use('/api', youtubeWebhookRoutes);


// ================== MASS READINGS ROUTES ==================
const massReadingsRoutes = require("./routes/massReadings");
app.use("/api/mass-readings", massReadingsRoutes);


const jumuiaMembersRoutes = require('./routes/jumuiaMembers');
app.use('/api/jumuia', jumuiaMembersRoutes);


//delete account 
const deleteAccountRoutes = require("./routes/deleteAccount");
app.use("/api", deleteAccountRoutes);

// ==================== WHATSAPP ADMIN ROUTES ====================
const whatsappAdminRoutes = require('./routes/whatsapp.admin');
app.use('/api/admin/whatsapp', whatsappAdminRoutes);
console.log('✅ WhatsApp Admin routes mounted');


//t
const aiMessageAssistantRoutes = require("./routes/ai.routes");

app.use('/api/admin/ai', aiMessageAssistantRoutes);
//whatsapp

const whatsappBotRoutes = require('./routes/whatsapp.bot.routes');
const bot = require('./services/whatsapp.bot');

app.use('/api/whatsapp/bot', whatsappBotRoutes);

setTimeout(() => {
  console.log('🤖 Starting WhatsApp Bot...');
  bot.connect().catch(err => console.error('Bot start error:', err));
}, 3000);

//feedback
// In app.js or server.js
const feedbackRoutes = require('./routes/feedback.routes');
app.use('/api/feedback', feedbackRoutes);




//countdown
const countdownRoutes = require('./routes/countdown');
app.use('/api', countdownRoutes);


//advert
// Advertisement Routes
const advertisementRoutes = require('./routes/advertisementRoutes');
app.use('/api/advertisements', advertisementRoutes);

//birthday
const birthdayRoutes = require("./routes/birthday");
app.use("/api/birthday", birthdayRoutes);


// ================== IMPROVED PROXY ROUTES (WITH BETTER ERROR HANDLING) ==================

// Proxy for Ora et Labora API (All prayers)
app.get('/api/proxy/prayers', async (req, res) => {
  try {
    console.log('📡 Fetching prayers from Ora et Labora...');
    const response = await fetch('https://oraetlabora.com.br/api/oracoes');
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ Fetched ${Object.keys(data).length} prayers`);
    res.json(data);
  } catch (error) {
    console.error('❌ Prayer API error:', error.message);
    res.status(500).json({ error: 'Failed to fetch prayers', details: error.message });
  }
});

// Proxy for single prayer by ID
app.get('/api/proxy/prayer/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📡 Fetching prayer: ${id}`);
    
    const response = await fetch(`https://oraetlabora.com.br/api/oracoes/${id}`);
    
    if (!response.ok) {
      throw new Error(`Prayer not found: ${id}`);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('❌ Prayer detail error:', error.message);
    res.status(500).json({ error: 'Failed to fetch prayer', details: error.message });
  }
});

// Proxy for Rosary mysteries (FIXED - using alternative API)
app.get('/api/proxy/rosary', async (req, res) => {
  try {
    console.log('📡 Fetching Rosary mysteries...');
    
    // Alternative: Calculate mysteries based on day of week (no external API needed)
    const day = new Date().getDay();
    const mysteriesMap = {
      0: { name: 'Glorious Mysteries', mysteries: ['The Resurrection', 'The Ascension', 'Descent of Holy Spirit', 'Assumption of Mary', 'Coronation of Mary'] },
      1: { name: 'Joyful Mysteries', mysteries: ['The Annunciation', 'The Visitation', 'The Nativity', 'The Presentation', 'Finding in the Temple'] },
      2: { name: 'Sorrowful Mysteries', mysteries: ['Agony in Garden', 'Scourging at Pillar', 'Crowning with Thorns', 'Carrying the Cross', 'The Crucifixion'] },
      3: { name: 'Glorious Mysteries', mysteries: ['The Resurrection', 'The Ascension', 'Descent of Holy Spirit', 'Assumption of Mary', 'Coronation of Mary'] },
      4: { name: 'Luminous Mysteries', mysteries: ['Baptism of Lord', 'Wedding at Cana', 'Proclamation of Kingdom', 'The Transfiguration', 'Institution of Eucharist'] },
      5: { name: 'Sorrowful Mysteries', mysteries: ['Agony in Garden', 'Scourging at Pillar', 'Crowning with Thorns', 'Carrying the Cross', 'The Crucifixion'] },
      6: { name: 'Joyful Mysteries', mysteries: ['The Annunciation', 'The Visitation', 'The Nativity', 'The Presentation', 'Finding in the Temple'] }
    };
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const mysteries = mysteriesMap[day];
    
    const result = {
      title: `${mysteries.name} (${dayNames[day]})`,
      mysteries: mysteries.mysteries,
      day: dayNames[day],
      dayNumber: day
    };
    
    console.log(`✅ Returning ${mysteries.name} for ${dayNames[day]}`);
    res.json(result);
  } catch (error) {
    console.error('❌ Rosary API error:', error.message);
    res.status(500).json({ error: 'Failed to fetch Rosary mysteries', details: error.message });
  }
});

// Proxy for Daily prayers (Universalis)
app.get('/api/proxy/daily-prayers', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`📡 Fetching daily prayers for ${today}...`);
    
    const response = await fetch(`https://universalis.app/api/${today}/prayers.json`);
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Daily prayers fetched');
    res.json(data);
  } catch (error) {
    console.error('❌ Daily prayers error:', error.message);
    
    // Return fallback data instead of error
    res.json({
      morning: "Lord, open my lips, and my mouth shall proclaim Your praise. Let us pray. Lord, grant me the grace to live this day in Your love and service. Amen.",
      evening: "Lord, grant me a peaceful night and a restful sleep. Watch over me and keep me safe. Into Your hands I commend my spirit. Amen.",
      reading: "Your word is a lamp to my feet and a light to my path. Guide me, Lord, in Your truth."
    });
  }
});

// TEST ROUTE 
app.get("/api/test", (req, res) => {
  res.json({ message: "Server is working!", time: new Date().toISOString() });
});

// GAME TEST ROUTE
app.get("/api/game-test", authenticate, (req, res) => {
  res.json({ message: "Game auth works!", userId: req.user.userId });
});



// Prayer routes
const prayerRoutes = require('./routes/prayers');
app.use('/api/prayers', prayerRoutes);





// ==================== ADD GAME ROUTES HERE ====================

// Get all users for game invites
app.get("/api/games/users", authenticate, async (req, res) => {
  console.log("🎮 /api/games/users called!"); // Debug log
  try {
    const users = await prisma.user.findMany({
      where: {
        id: { not: req.user.userId }
      },
      select: {
        id: true,
        fullName: true,
        membership_number: true,
        profileImage: true,
        lastActive: true,
        role: true
      },
      orderBy: { fullName: 'asc' }
    });
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const usersWithStatus = users.map(u => ({
      ...u,
      isOnline: u.lastActive ? new Date(u.lastActive) > fiveMinutesAgo : false
    }));
    
    res.json(usersWithStatus);
  } catch (err) {
    console.error("Error fetching game users:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get user's pending game invites
app.get("/api/games/invites", authenticate, async (req, res) => {
  console.log("🎮 /api/games/invites called!"); // Debug log
  try {
    const invites = await prisma.gameInvite.findMany({
      where: {
        toUserId: req.user.userId,
        status: "pending"
      },
      include: {
        fromUser: { 
          select: { 
            id: true, 
            fullName: true,
            profileImage: true 
          } 
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(invites);
  } catch (err) {
    console.error("Error fetching invites:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get count of pending game invites
app.get("/api/games/invites/count", authenticate, async (req, res) => {
  console.log("🎮 /api/games/invites/count called!"); // Debug log
  try {
    const count = await prisma.gameInvite.count({
      where: {
        toUserId: req.user.userId,
        status: "pending"
      }
    });
    res.json({ count });
  } catch (err) {
    console.error("Error fetching invite count:", err);
    res.status(500).json({ error: err.message });
  }
});

// Create game invite
app.post("/api/games/invite", authenticate, async (req, res) => {
  console.log("🎮 /api/games/invite called!"); // Debug log
  try {
    const { opponentId, gameType } = req.body;
    
    const invite = await prisma.gameInvite.create({
      data: {
        fromUserId: req.user.userId,
        toUserId: opponentId,
        gameType: gameType,
        status: "pending"
      },
      include: {
        fromUser: { select: { id: true, fullName: true, profileImage: true } }
      }
    });
    
    res.json(invite);
  } catch (err) {
    console.error("Error creating invite:", err);
    res.status(500).json({ error: err.message });
  }
});


// ================== SOCKET.IO WITH ONLINE TRACKING ==================
const { Server } = require("socket.io");
const server = http.createServer(app);

// Create io instance with CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,  // This uses the allowedOrigins array defined above
    methods: ["GET", "POST"],
    credentials: true
  },
});

app.set("io", io);

const { setIo } = require('./services/webhookHandler');
setIo(io);

require('./socket/dmSocket')(io);

// Track online users
let onlineUsers = new Map(); // userId -> socketId
let userSocketMap = new Map(); // socketId -> userId

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // When user joins with their userId (from frontend)
  socket.on("join", (userId) => {
    if (!userId) return;
    
    // Store the mapping
    onlineUsers.set(userId, socket.id);
    userSocketMap.set(socket.id, userId);
    
    // Join user to their private room
    socket.join(userId);
    
    console.log(`✅ User ${userId} joined. Online count: ${onlineUsers.size}`);
    
    // Broadcast updated online count to all clients
    io.emit("online_members", { count: onlineUsers.size });
  });

  // When user joins a jumuia room
  socket.on("join-jumuia", (jumuiaId) => {
    if (!jumuiaId) return;
    socket.join(`jumuia-${jumuiaId}`);
    console.log(`User joined jumuia room: jumuia-${jumuiaId}`);
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    const userId = userSocketMap.get(socket.id);
    if (userId) {
      onlineUsers.delete(userId);
      userSocketMap.delete(socket.id);
      console.log(`🔴 User ${userId} disconnected. Online count: ${onlineUsers.size}`);
      
      // Broadcast updated online count
      io.emit("online_members", { count: onlineUsers.size });
    } else {
      console.log("🔴 Unknown user disconnected:", socket.id);
    }

  });

      try {
     require("./socket/chessSocket")(io, socket, onlineUsers, userSocketMap);
     console.log("✅ Chess socket loaded");
   } catch(e) {
     console.log("❌ Chess socket error:", e.message);
   }

});






// ==================== HEALTH CHECK FOR UPTIME MONITORING ====================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0'
  });
});

// Actual cron job endpoints (will be triggered by cron-job.org)
app.post('/api/cron/event-reminders', async (req, res) => {
  try {
    // Verify secret key to prevent abuse
    const secretKey = req.headers['x-cron-secret'];
    if (secretKey !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    await sendEventReminders();
    res.json({ success: true, message: 'Event reminders sent' });
  } catch (error) {
    console.error('Event reminder cron failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cron/campaign-reminders', async (req, res) => {
  try {
    const secretKey = req.headers['x-cron-secret'];
    if (secretKey !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    await sendCampaignReminders();
    res.json({ success: true, message: 'Campaign reminders sent' });
  } catch (error) {
    console.error('Campaign reminder cron failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cron/no-announcements-alert', async (req, res) => {
  try {
    const secretKey = req.headers['x-cron-secret'];
    if (secretKey !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    await checkNoAnnouncements();
    res.json({ success: true, message: 'Announcement check completed' });
  } catch (error) {
    console.error('Announcement check failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ================== PUBLIC TEST ENDPOINT ==================
app.get("/api/public/test-gemini", async (req, res) => {
  if (!geminiModel) {
    return res.json({ 
      success: false, 
      error: "Gemini not initialized",
      availableModels: ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-pro-latest"]
    });
  }
  
  try {
    const result = await geminiModel.generateContent("Say 'Tumsifu Yesu Kristu! ZUCA AI is ready!'");
    const response = await result.response.text();
    res.json({ success: true, response, model: "gemini-2.0-flash" });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});



// ==================== CRON JOB ENDPOINT ====================
// This endpoint is called by cron-job.org every hour
app.post("/api/cron/check", async (req, res) => {
  try {
    // Verify secret key for security
    const secretKey = req.headers["x-cron-secret"];
    if (secretKey !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: "Unauthorized - Invalid secret key" });
    }
    
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const day = now.getDay();
    
    console.log(`🕐 Cron check at ${now.toISOString()} - Hour: ${hour}, Minute: ${minute}, Day: ${day}`);
    
    const executed = [];
    
    // ========== EVENT REMINDERS - EVERY HOUR ==========
    await sendEventReminders();
    executed.push("event_reminders");

     // ========== BIRTHDAY ADVERTS - DAILY AT 8:00 AM ==========
    if (hour === 6 && minute < 5) {
      console.log("🎂 Running birthday advert check...");
      await processBirthdayAdverts();
      executed.push("birthday_adverts");
    }
    
    // ========== ✅ SEMESTER END CHECK - EVERY DAY AT MIDNIGHT ==========
    // Check if a semester has ended and send reports
    if (hour === 0 && minute < 5) {
      console.log("📅 Running semester end check...");
      await checkSemesterEndAndSendReports();
      executed.push("semester_end_check");
    }
    
    // ========== CAMPAIGN REMINDERS - Daily at 8:30 AM ==========
    if (hour === 8 && minute >= 30 && minute < 35) {
      await sendCampaignReminders();
      executed.push("campaign_reminders");
    }
    
    // ========== NO ANNOUNCEMENTS ALERT - Monday at 9:00 AM ==========
    if (day === 1 && hour === 9 && minute < 5) {
      await checkNoAnnouncements();
      executed.push("announcement_check");
    }

     if (hour === 23 && minute >= 59) {
      console.log("📊 Sending 24-hour system report...");
      await send24HourReport();
      executed.push("24h_report");
    }
    
    res.json({
      success: true,
      time: now.toISOString(),
      executed: executed,
      next_check: "Next cron ping in ~60 minutes"
    });
    
  } catch (error) {
    console.error("❌ Cron check failed:", error);
    res.status(500).json({ error: error.message });
  }
})


app.post("/api/admin/reports/trigger-24h", authenticate, requireAdmin, async (req, res) => {
  try {
    console.log("📊 Manually triggering 24-hour report...");
    const result = await send24HourReport();
    if (result) {
      res.json({ success: true, message: "24-hour report generated and sent", report: result });
    } else {
      res.status(500).json({ success: false, error: "Failed to generate report" });
    }
  } catch (err) {
    console.error("Report trigger error:", err);
    res.status(500).json({ error: err.message });
  }
});


// Add this temporary endpoint to check available models
app.get("/api/debug/groq-models", async (req, res) => {
  try {
    const OpenAI = require("openai");
    const groq = new OpenAI({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY,
    });
    
    const models = await groq.models.list();
    const availableModels = models.data.map(m => m.id).sort();
    
    res.json({
      success: true,
      availableModels: availableModels,
      count: availableModels.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==================== SMART AI ASSISTANT ====================
app.post("/api/ai/smart-query", authenticate, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.userId;
    
    console.log(`🧠 SMART QUERY: "${message}"`);
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, specialRole: true }
    });
    
    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isSecretary = user.specialRole === "secretary";
    const isTreasurer = user.specialRole === "treasurer";
    
    if (!isAdmin && !isSecretary && !isTreasurer) {
      return res.json({
        success: false,
        response: "🔒 This feature is only available to admins, secretaries, and treasurers."
      });
    }
    
    const lowerMsg = message.toLowerCase().trim();
    
    // ========== INTELLIGENT ROUTING ==========
    let queryResult = null;
    let response = "";
    
    // --- PATTERN 1: COUNT USERS ---
    if (lowerMsg.includes('how many users') || lowerMsg.includes('user count') || lowerMsg.includes('total users')) {
      const total = await prisma.user.count();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const newToday = await prisma.user.count({
        where: { createdAt: { gte: today } }
      });
      
      response = `👥 **Total Users:** ${total}\n📈 **New Today:** ${newToday}`;
      queryResult = { total, newToday };
    }
    
    // --- PATTERN 2: NEW USERS ---
    else if (lowerMsg.includes('new users') || lowerMsg.includes('recent signups') || lowerMsg.includes('who joined')) {
      const daysAgo = new Date();
      const days = lowerMsg.match(/\d+/)?.[0] || 7;
      daysAgo.setDate(daysAgo.getDate() - parseInt(days));
      
      const newUsers = await prisma.user.findMany({
        where: { createdAt: { gte: daysAgo } },
        select: { fullName: true, email: true, createdAt: true, membership_number: true },
        orderBy: { createdAt: 'desc' },
        take: 20
      });
      
      if (newUsers.length === 0) {
        response = `📭 No new users in the last ${days} days.`;
      } else {
        response = `👤 **New Users (Last ${days} days):**\n\n`;
        newUsers.forEach(u => {
          response += `• ${u.fullName} (${u.email})\n  🆔 ${u.membership_number || 'N/A'} | 📅 ${new Date(u.createdAt).toLocaleDateString()}\n\n`;
        });
      }
      queryResult = { newUsers, count: newUsers.length };
    }
    
    // --- PATTERN 3: PLEDGE STATS ---
    else if (lowerMsg.includes('pledge') || lowerMsg.includes('contribution') || lowerMsg.includes('raised') || lowerMsg.includes('how much')) {
      const totalPledges = await prisma.pledge.count();
      const totalRaised = await prisma.pledge.aggregate({
        where: { status: { in: ["APPROVED", "COMPLETED"] } },
        _sum: { amountPaid: true }
      });
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const newToday = await prisma.pledge.count({
        where: { createdAt: { gte: today } }
      });
      
      response = `💰 **Pledge Summary**\n\n`;
      response += `📊 Total Pledges: ${totalPledges}\n`;
      response += `💵 Total Raised: KES ${(totalRaised._sum.amountPaid || 0).toLocaleString()}\n`;
      response += `📈 New Today: ${newToday}`;
      queryResult = { totalPledges, totalRaised: totalRaised._sum.amountPaid || 0, newToday };
    }
    
    // --- PATTERN 4: ANNOUNCEMENTS ---
    else if (lowerMsg.includes('announcements') || lowerMsg.includes('latest news')) {
      const limit = lowerMsg.match(/\d+/)?.[0] || 5;
      const announcements = await prisma.announcement.findMany({
        where: { published: true },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        include: { author: { select: { fullName: true } } }
      });
      
      if (announcements.length === 0) {
        response = "📢 No announcements found.";
      } else {
        response = `📢 **Latest Announcements**\n\n`;
        announcements.forEach(a => {
          response += `**${a.title}**\n`;
          response += `📝 ${a.content.substring(0, 150)}${a.content.length > 150 ? '...' : ''}\n`;
          response += `👤 By: ${a.author?.fullName || 'Unknown'} | 📅 ${new Date(a.createdAt).toLocaleDateString()}\n\n`;
        });
      }
      queryResult = { announcements };
    }
    
    // --- PATTERN 5: SYSTEM HEALTH ---
    else if (lowerMsg.includes('health') || lowerMsg.includes('status') || lowerMsg.includes('is everything ok')) {
      const uptime = process.uptime();
      const memoryUsage = process.memoryUsage();
      const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      
      let dbStatus = 'healthy';
      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch (err) {
        dbStatus = 'unhealthy';
      }
      
      response = `🩺 **System Health**\n\n`;
      response += `📊 **Status:** ${dbStatus === 'healthy' ? '✅ Healthy' : '❌ Unhealthy'}\n`;
      response += `⏱️ **Uptime:** ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m\n`;
      response += `💾 **Memory:** ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB (${Math.round(memoryPercent)}%)\n`;
      response += `🗄️ **Database:** ${dbStatus}`;
      queryResult = { status: dbStatus, memoryPercent, uptime };
    }
    
    // --- PATTERN 6: ERRORS ---
    else if (lowerMsg.includes('error') || lowerMsg.includes('issue') || lowerMsg.includes('problem') || lowerMsg.includes('anything wrong')) {
      const errorCount = global.errorStore?.length || 0;
      const recentErrors = (global.errorStore || []).slice(0, 10);
      
      if (errorCount === 0) {
        response = "✅ No errors detected in the system!";
      } else {
        response = `⚠️ **${errorCount} Recent Errors**\n\n`;
        recentErrors.forEach(e => {
          response += `• ${e.error?.substring(0, 80)}...\n`;
          if (e.timestamp) response += `  📅 ${new Date(e.timestamp).toLocaleString()}\n`;
        });
      }
      queryResult = { errorCount, recentErrors };
    }
    
    // --- PATTERN 7: HELP ---
    else {
      response = `🤖 **I Can Help With:**\n\n`;
      response += `👥 "How many users?" - Total users\n`;
      response += `📈 "New users" - Recent signups\n`;
      response += `💰 "Pledge stats" - Contribution summary\n`;
      response += `📢 "Announcements" - Latest news\n`;
      response += `🩺 "System health" - Check status\n`;
      response += `⚠️ "Any errors?" - Check issues\n\n`;
      response += `💡 Try asking me anything about the system!`;
    }
    
    res.json({
      success: true,
      response: response,
      data: queryResult
    });
    
  } catch (error) {
    console.error("Smart query error:", error);
    res.status(500).json({
      success: false,
      response: "❌ I had trouble processing your request. Please try again."
    });
  }
});
// ==================== HEALTH CHECK ENDPOINT ====================
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});


// ==================== EXECUTIVE SYSTEM APIs (PUBLIC - NO AUTH) ====================
// These work exactly like your announcements and mass-programs APIs

// 1. Get all executive positions (for dropdowns)
app.get("/api/executive/positions", async (req, res) => {
  try {
    console.log("📋 Executive positions API called from:", req.ip);
    
    const positions = await prisma.executivePosition.findMany({
      orderBy: { level: 'asc' }
    });
    
    res.json({ 
      success: true, 
      positions: positions 
    });
  } catch (err) {
    console.error("❌ Error fetching positions:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// 2. Get current executive team (PUBLIC - like announcements)
app.get("/api/executive/team", async (req, res) => {
  try {
    console.log("👥 Executive team API called from:", req.ip);
    
    const executives = await prisma.executive.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            profileImage: true
          }
        },
        position: true
      },
      orderBy: {
        position: {
          level: 'asc'
        }
      }
    });

    const formattedExecutives = executives.map(exec => ({
      id: exec.id,
      userId: exec.user.id,
      name: exec.user.fullName,
      role: exec.position.title,
      level: exec.position.level,
      category: exec.position.category,
      description: exec.position.description,
      profileImage: exec.user.profileImage,
      phone: exec.customPhone || exec.user.phone,
      email: exec.customEmail || exec.user.email,
      whatsappLink: (exec.customPhone || exec.user.phone) ? 
        `https://wa.me/${(exec.customPhone || exec.user.phone).replace(/[^0-9]/g, '')}` : null,
      callLink: (exec.customPhone || exec.user.phone) ? 
        `tel:${exec.customPhone || exec.user.phone}` : null,
      assignedAt: exec.assignedAt
    }));

    const grouped = {
      leadership: formattedExecutives.filter(e => e.category === 'leadership'),
      choir: formattedExecutives.filter(e => e.category === 'choir'),
      jumuia: formattedExecutives.filter(e => e.category === 'jumuia'),
      media: formattedExecutives.filter(e => e.category === 'media'),
      voice: formattedExecutives.filter(e => e.category === 'voice')
    };

    res.json({ 
      success: true, 
      executives: formattedExecutives,
      grouped,
      total: formattedExecutives.length
    });
  } catch (err) {
    console.error("❌ Error fetching executive team:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// 3. Get executive hierarchy (PUBLIC)
app.get("/api/executive/hierarchy", async (req, res) => {
  try {
    console.log("📊 Executive hierarchy API called from:", req.ip);
    
    const executives = await prisma.executive.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            profileImage: true
          }
        },
        position: true
      },
      orderBy: {
        position: {
          level: 'asc'
        }
      }
    });

    const hierarchy = executives.map(exec => ({
      id: exec.id,
      userId: exec.user.id,
      name: exec.user.fullName,
      role: exec.position.title,
      level: exec.position.level,
      category: exec.position.category,
      profileImage: exec.user.profileImage,
      phone: exec.customPhone || exec.user.phone,
      email: exec.customEmail || exec.user.email
    }));

    res.json({ success: true, hierarchy });
  } catch (err) {
    console.error("❌ Error fetching hierarchy:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// 4. Check if user has executive position (PUBLIC)
app.get("/api/executive/check-user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`🔍 Checking executive position for user: ${userId}`);
    
    const executive = await prisma.executive.findFirst({
      where: { userId, isActive: true },
      include: { position: true }
    });

    res.json({ 
      success: true, 
      hasPosition: !!executive,
      position: executive ? {
        id: executive.position.id,
        title: executive.position.title,
        level: executive.position.level,
        category: executive.position.category
      } : null
    });
  } catch (err) {
    console.error("❌ Error checking user:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// ==================== ADMIN EXECUTIVE APIs (REQUIRE AUTH) ====================
// These are like your admin routes - they need authentication

// 5. Get all users for assignment (Admin only)
app.get("/api/admin/executive/users", authenticate, requireAdmin, async (req, res) => {
  try {
    console.log("👥 Admin fetching users for executive assignment");
    
    const assignedUserIds = await prisma.executive.findMany({
      where: { isActive: true },
      select: { userId: true }
    });
    
    const assignedIds = assignedUserIds.map(a => a.userId);

    const users = await prisma.user.findMany({
      where: {
        id: { notIn: assignedIds }
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        profileImage: true,
        membership_number: true,
        role: true
      },
      orderBy: { fullName: 'asc' }
    });

    res.json({ success: true, users });
  } catch (err) {
    console.error("❌ Error fetching users:", err);
    res.status(500).json({ error: err.message });
  }
});

// 6. Get all current assignments (Admin only)
app.get("/api/admin/executive/assignments", authenticate, requireAdmin, async (req, res) => {
  try {
    console.log("📋 Admin fetching executive assignments");
    
    const assignments = await prisma.executive.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            profileImage: true,
            membership_number: true
          }
        },
        position: true
      },
      orderBy: {
        position: {
          level: 'asc'
        }
      }
    });

    res.json({ success: true, assignments });
  } catch (err) {
    console.error("❌ Error fetching assignments:", err);
    res.status(500).json({ error: err.message });
  }
});

// 7. Get available positions (Admin only)
app.get("/api/admin/executive/available-positions", authenticate, requireAdmin, async (req, res) => {
  try {
    console.log("📋 Admin fetching available positions");
    
    const filledPositionIds = await prisma.executive.findMany({
      where: { isActive: true },
      select: { positionId: true }
    });
    
    const filledIds = filledPositionIds.map(p => p.positionId);

    const availablePositions = await prisma.executivePosition.findMany({
      where: {
        id: { notIn: filledIds }
      },
      orderBy: { level: 'asc' }
    });

    res.json({ success: true, positions: availablePositions });
  } catch (err) {
    console.error("❌ Error fetching available positions:", err);
    res.status(500).json({ error: err.message });
  }
});
// 8. Assign user to position (Admin only)
app.post("/api/admin/executive/assign", authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId, positionId, customPhone, customEmail } = req.body;

    if (!userId || !positionId) {
      return res.status(400).json({ error: "User ID and Position ID are required" });
    }

    console.log(`📝 Assigning user ${userId} to position ${positionId}`);

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const position = await prisma.executivePosition.findUnique({ where: { id: positionId } });
    if (!position) {
      return res.status(404).json({ error: "Position not found" });
    }

    // Check if position is already filled by someone else
    const existingAssignment = await prisma.executive.findFirst({
      where: { positionId, isActive: true, userId: { not: userId } }
    });

    if (existingAssignment) {
      await prisma.executiveHistory.create({
        data: {
          userId: existingAssignment.userId,
          positionId: existingAssignment.positionId,
          assignedBy: existingAssignment.assignedBy,
          assignedAt: existingAssignment.assignedAt,
          removedAt: new Date(),
          removedBy: req.user.userId
        }
      });

      await prisma.executive.update({
        where: { id: existingAssignment.id },
        data: { isActive: false }
      });
    }

    // ✅ CHECK if user already has this position (even if inactive)
    const existingUserPosition = await prisma.executive.findFirst({
      where: { userId, positionId }
    });

    let assignment;

    if (existingUserPosition) {
      // ✅ UPDATE existing record instead of creating new one
      console.log(`🔄 User already had this position, reactivating...`);
      assignment = await prisma.executive.update({
        where: { id: existingUserPosition.id },
        data: {
          isActive: true,
          assignedBy: req.user.userId,
          assignedAt: new Date(),
          customPhone: customPhone || null,
          customEmail: customEmail || null,
          updatedAt: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              profileImage: true
            }
          },
          position: true
        }
      });
    } else {
      // ✅ Create NEW assignment
      assignment = await prisma.executive.create({
        data: {
          userId,
          positionId,
          assignedBy: req.user.userId,
          customPhone: customPhone || null,
          customEmail: customEmail || null,
          isActive: true
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              profileImage: true
            }
          },
          position: true
        }
      });
    }

    // Create formattedAssignment
    const formattedAssignment = {
      id: assignment.id,
      userId: assignment.userId,
      userName: assignment.user.fullName,
      userEmail: assignment.user.email,
      userPhone: assignment.user.phone,
      userProfileImage: assignment.user.profileImage,
      positionId: assignment.positionId,
      positionTitle: assignment.position.title,
      positionLevel: assignment.position.level,
      positionCategory: assignment.position.category,
      customPhone: assignment.customPhone,
      customEmail: assignment.customEmail,
      assignedAt: assignment.assignedAt
    };

    // Update user's specialRole
    let specialRole = null;
    if (position.title === "Chairperson") specialRole = "chairperson";
    else if (position.title === "Secretary") specialRole = "secretary";
    else if (position.title === "Treasurer") specialRole = "treasurer";
    else if (position.title === "Choir Moderator") specialRole = "choir_moderator";
    else if (position.title === "Media Moderator") specialRole = "media_moderator";
    
    if (specialRole) {
      await prisma.user.update({
        where: { id: userId },
        data: { specialRole }
      });
    }

    // Send response
    res.json({ 
      success: true, 
      message: `${targetUser.fullName} appointed as ${position.title}`,
      assignment: formattedAssignment 
    });

    // Send notification in background
    createAndSendNotification({
      userId: userId,
      type: "executive_appointment",
      title: "🎉 Executive Appointment",
      message: `Congratulations! You have been appointed as ${position.title}. Thank you for serving ZUCA!`,
      data: { position: position.title, type: "executive_appointment" }
    }).catch(err => console.error("Notification failed:", err.message));

  } catch (err) {
    console.error("❌ Assignment error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 9. Update executive contact info (Admin only)
app.put("/api/admin/executive/update/:assignmentId", authenticate, requireAdmin, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { customPhone, customEmail } = req.body;

    console.log(`✏️ Updating executive ${assignmentId}`);

    const updated = await prisma.executive.update({
      where: { id: assignmentId },
      data: {
        customPhone: customPhone || null,
        customEmail: customEmail || null,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true
          }
        },
        position: true
      }
    });

    res.json({ 
      success: true, 
      message: "Contact info updated successfully",
      assignment: updated 
    });
  } catch (err) {
    console.error("❌ Update error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 10. Remove executive assignment (Admin only)
app.delete("/api/admin/executive/remove/:assignmentId", authenticate, requireAdmin, async (req, res) => {
  try {
    const { assignmentId } = req.params;

    console.log(`🗑️ Removing executive assignment ${assignmentId}`);

    const assignment = await prisma.executive.findUnique({
      where: { id: assignmentId },
      include: { position: true, user: true }
    });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    // ✅ UPDATE to inactive instead of DELETE (preserve the record)
    await prisma.executive.update({
      where: { id: assignmentId },
      data: { isActive: false }
    });

    // Also add to history
    await prisma.executiveHistory.create({
      data: {
        userId: assignment.userId,
        positionId: assignment.positionId,
        assignedBy: assignment.assignedBy,
        assignedAt: assignment.assignedAt,
        removedAt: new Date(),
        removedBy: req.user.userId
      }
    });

    // Clear user's specialRole if applicable
    const userOtherAssignments = await prisma.executive.findFirst({
      where: { userId: assignment.userId, isActive: true }
    });

    if (!userOtherAssignments) {
      await prisma.user.update({
        where: { id: assignment.userId },
        data: { specialRole: null }
      });
    }

    res.json({ 
      success: true, 
      message: `${assignment.user.fullName} removed from ${assignment.position.title}` 
    });

    // Send notification in background
    createAndSendNotification({
      userId: assignment.userId,
      type: "executive_removed",
      title: "📋 Executive Role Updated",
      message: `You have been removed from the position of ${assignment.position.title}. Thank you for your service!`,
      data: { position: assignment.position.title, type: "executive_removed" }
    }).catch(err => console.error("Notification failed:", err.message));

  } catch (err) {
    console.error("❌ Remove error:", err);
    res.status(500).json({ error: err.message });
  }
});


// Create new executive position (Admin only)
app.post("/api/admin/executive/positions", authenticate, requireAdmin, async (req, res) => {
  try {
    const { title, category, level, description } = req.body;

    if (!title || !category || !level) {
      return res.status(400).json({ error: "Title, category, and level are required" });
    }

    const existing = await prisma.executivePosition.findUnique({
      where: { title }
    });

    if (existing) {
      return res.status(400).json({ error: "Position with this title already exists" });
    }

    const newPosition = await prisma.executivePosition.create({
      data: {
        title,
        category,
        level: parseInt(level),
        description: description || null
      }
    });

    res.status(201).json({ 
      success: true, 
      message: `Position "${title}" created successfully`,
      position: newPosition 
    });
  } catch (err) {
    console.error("Error creating position:", err);
    res.status(500).json({ error: err.message });
  }
});



// Delete executive position (Admin only)
app.delete("/api/admin/executive/positions/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if position exists
    const position = await prisma.executivePosition.findUnique({
      where: { id },
      include: {
        executives: {
          where: { isActive: true }
        }
      }
    });

    if (!position) {
      return res.status(404).json({ error: "Position not found" });
    }

    // Check if position has active executives
    if (position.executives.length > 0) {
      return res.status(400).json({ 
        error: "Cannot delete position with active executives. Remove all executives from this position first." 
      });
    }

    // Delete the position
    await prisma.executivePosition.delete({
      where: { id }
    });

    res.json({ 
      success: true, 
      message: `Position "${position.title}" deleted successfully` 
    });
  } catch (err) {
    console.error("Error deleting position:", err);
    res.status(500).json({ error: err.message });
  }
});

// 11. Get executive stats (Admin only)
app.get("/api/admin/executive/stats", authenticate, requireAdmin, async (req, res) => {
  try {
    console.log("📊 Admin fetching executive stats");
    
    const totalPositions = await prisma.executivePosition.count();
    const filledPositions = await prisma.executive.count({ where: { isActive: true } });
    const vacantPositions = totalPositions - filledPositions;
    const completionRate = totalPositions > 0 ? ((filledPositions / totalPositions) * 100).toFixed(1) : 0;
    
    const allPositions = await prisma.executivePosition.findMany();
    const allExecutives = await prisma.executive.findMany({ 
      where: { isActive: true },
      include: { position: true }
    });
    
    const categoryMap = {};
    allPositions.forEach(pos => {
      if (!categoryMap[pos.category]) {
        categoryMap[pos.category] = { total: 0, filled: 0 };
      }
      categoryMap[pos.category].total++;
    });
    
    allExecutives.forEach(exec => {
      if (exec.position && categoryMap[exec.position.category]) {
        categoryMap[exec.position.category].filled++;
      }
    });
    
    const byCategory = Object.entries(categoryMap).map(([category, data]) => ({
      category,
      total: data.total,
      filled: data.filled
    }));

    const recentHistory = await prisma.executiveHistory.findMany({
      take: 10,
      orderBy: { removedAt: 'desc' },
      include: {
        user: { select: { fullName: true } },
        position: { select: { title: true } }
      }
    });

    const recentAssignments = await prisma.executive.findMany({
      take: 10,
      where: { isActive: true },
      orderBy: { assignedAt: 'desc' },
      include: {
        user: { select: { fullName: true } },
        position: { select: { title: true } }
      }
    });

    res.json({
      success: true,
      stats: {
        totalPositions,
        filledPositions,
        vacantPositions,
        completionRate: parseFloat(completionRate),
        byCategory,
        recentHistory: recentHistory || [],
        recentAssignments: recentAssignments || []
      }
    });
  } catch (err) {
    console.error("❌ Stats error:", err);
    res.json({
      success: true,
      stats: {
        totalPositions: 18,
        filledPositions: 0,
        vacantPositions: 18,
        completionRate: 0,
        byCategory: [
          { category: 'leadership', total: 5, filled: 0 },
          { category: 'choir', total: 2, filled: 0 },
          { category: 'jumuia', total: 6, filled: 0 },
          { category: 'media', total: 1, filled: 0 },
          { category: 'voice', total: 4, filled: 0 }
        ],
        recentHistory: [],
        recentAssignments: []
      }
    });
  }
});



// 3. Get executive history (PUBLIC - shows past leadership)
app.get("/api/executive/history", async (req, res) => {
  try {
    console.log("📜 Executive history API called from:", req.ip);
    
    const history = await prisma.executiveHistory.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            profileImage: true
          }
        },
        position: true
      },
      orderBy: [
        { removedAt: 'desc' },
        { assignedAt: 'desc' }
      ],
      take: 50 // Limit to last 50 history records
    });

    const formattedHistory = history.map(record => ({
      id: record.id,
      userId: record.user.id,
      name: record.user.fullName,
      role: record.position.title,
      level: record.position.level,
      category: record.position.category,
      profileImage: record.user.profileImage,
      assignedAt: record.assignedAt,
      removedAt: record.removedAt,
      termLength: record.removedAt ? 
        `${Math.round((new Date(record.removedAt) - new Date(record.assignedAt)) / (1000 * 60 * 60 * 24))} days` : 
        null
    }));

    // Optional: Group by year/term
    const groupedByYear = formattedHistory.reduce((acc, record) => {
      const year = new Date(record.assignedAt).getFullYear();
      if (!acc[year]) acc[year] = [];
      acc[year].push(record);
      return acc;
    }, {});

    res.json({ 
      success: true, 
      history: formattedHistory,
      groupedByYear,
      total: formattedHistory.length
    });
  } catch (err) {
    console.error("❌ Error fetching executive history:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});


// 4. Get executive history for specific user (PUBLIC)
app.get("/api/executive/history/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    const userHistory = await prisma.executiveHistory.findMany({
      where: { userId },
      include: {
        position: true
      },
      orderBy: { assignedAt: 'desc' }
    });

    const formattedHistory = userHistory.map(record => ({
      role: record.position.title,
      category: record.position.category,
      assignedAt: record.assignedAt,
      removedAt: record.removedAt,
      termLength: record.removedAt ? 
        `${Math.round((new Date(record.removedAt) - new Date(record.assignedAt)) / (1000 * 60 * 60 * 24))} days` : 
        'Current position'
    }));

    res.json({ 
      success: true, 
      history: formattedHistory,
      total: formattedHistory.length
    });
  } catch (err) {
    console.error("❌ Error fetching user history:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// ================== UPLOAD DIRECTORIES ==================
 //Comment out for Vercel, uncomment for Render
 const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
 app.use("/uploads", express.static(uploadDir));

 const thumbnailsDir = path.join(__dirname, "uploads/thumbnails");
 if (!fs.existsSync(thumbnailsDir)) fs.mkdirSync(thumbnailsDir, { recursive: true });

// ================== MULTER CONFIG FOR PROFILE UPLOADS ==================
// Use disk storage for Render
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `profile_${req.params.id}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);

    if (ext && mime) cb(null, true);
    else cb(new Error("Only images allowed"));
  },
});





// ================== PUBLIC DEBUG ENDPOINTS (NO AUTH NEEDED) ==================
app.get("/api/debug/null-readings", async (req, res) => {
  try {
    const { year, month, limit = 100 } = req.query;
    
    let dateFilter = {};
    
    if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59, 999);
      dateFilter = {
        gte: startDate,
        lte: endDate
      };
    }
    
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      dateFilter = {
        gte: startDate,
        lte: endDate
      };
    }
    
    // For JSON fields, we need to use special operators
    const nullReadings = await prisma.liturgicalDay.findMany({
      where: {
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
        // Check if readings is null using the correct JSON operator
        readings: {
          equals: null  // This is the correct way to check null for JSON fields
        }
      },
      select: {
        date: true,
        celebration: true,
        season: true,
        yearCycle: true,
        createdAt: true
      },
      orderBy: {
        date: 'asc'
      },
      take: parseInt(limit)
    });
    
    res.json({
      count: nullReadings.length,
      year: year || 'all',
      month: month || 'all',
      dates: nullReadings.map(d => ({
        date: d.date.toISOString().split('T')[0],
        celebration: d.celebration,
        season: d.season,
        yearCycle: d.yearCycle
      }))
    });
    
  } catch (error) {
    console.error("Error finding null readings:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add this endpoint to find "fallback" entries
app.get("/api/debug/fallback-readings", async (req, res) => {
  try {
    const { year, month, limit = 100 } = req.query;
    
    let dateFilter = {};
    if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59, 999);
      dateFilter = { gte: startDate, lte: endDate };
    }
    
    const fallbackEntries = await prisma.liturgicalDay.findMany({
      where: {
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
        // Find entries where readings.source = "fallback"
        readings: {
          path: ['source'],
          equals: 'fallback'
        }
      },
      select: {
        date: true,
        celebration: true,
        season: true,
        yearCycle: true,
        createdAt: true
      },
      orderBy: { date: 'asc' },
      take: parseInt(limit)
    });
    
    res.json({
      count: fallbackEntries.length,
      dates: fallbackEntries.map(d => d.date.toISOString().split('T')[0])
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ================== CALENDAR ROUTES (PUBLIC - NO AUTH NEEDED) ==================
const calendarService = require('./services/calendarService');
const infiniteCalendar = require('./services/infiniteCalendar');


// ================== BASIC CALENDAR ROUTES ==================

// Get today's liturgical info
app.get("/api/calendar/today", async (req, res) => {
  try {
    const today = new Date();
    const liturgicalDay = await calendarService.getOrCreateLiturgicalDay(today);
    res.json(liturgicalDay);
  } catch (error) {
    console.error("Calendar error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific date
app.get("/api/calendar/date/:year/:month/:day", async (req, res) => {
  try {
    const { year, month, day } = req.params;
    const date = new Date(year, month - 1, day);
    
    // This now works for ANY year - past, present, or future!
    const liturgicalDay = await infiniteCalendar.getReadingsForAnyDate(date, prisma);
    
    if (!liturgicalDay) {
      return res.status(404).json({ error: "No readings found for this date" });
    }
    
    res.json(liturgicalDay);
  } catch (error) {
    console.error("Calendar error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get month view
app.get("/api/calendar/month/:year/:month", async (req, res) => {
  try {
    const { year, month } = req.params;
    const days = await calendarService.getLiturgicalMonth(parseInt(year), parseInt(month) - 1);
    res.json(days);
  } catch (error) {
    console.error("Calendar error:", error);
    res.status(500).json({ error: error.message });
  }
});






/// ================== SEARCH ROUTES (COMPLETELY FIXED) ==================



// Search by Bible verse (e.g., "John 3:16", "Psalm 23")
app.get("/api/calendar/search/verse/:verse", async (req, res) => {
  try {
    const { verse } = req.params;
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    console.log(`🔍 Searching for verse: ${verse}`);
    
    const verseLower = verse.toLowerCase().trim();
    
    // Better verse search - look inside readings JSON
    const results = await prisma.liturgicalDay.findMany({
      where: {
        readings: {
          not: null
        }
      }
    });
    
    // Filter client-side for better matching
    const filtered = results.filter(day => {
      if (!day.readings) return false;
      
      const readingsStr = JSON.stringify(day.readings).toLowerCase();
      
      // Check for exact verse patterns
      const patterns = [
        verseLower,
        verseLower.replace(':', ' '),
        verseLower.replace(/\s+/g, ''),
        verseLower.replace(':', '')
      ];
      
      return patterns.some(pattern => readingsStr.includes(pattern));
    });
    
    console.log(`✅ Found ${filtered.length} results for verse: ${verse}`);
    res.json(filtered);
    
  } catch (error) {
    console.error("❌ Verse search error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    await prisma.$disconnect();
  }
});

// Search by keyword (in celebration name, season, etc.)
app.get("/api/calendar/search/keyword/:keyword", async (req, res) => {
  try {
    const { keyword } = req.params;
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    console.log(`🔍 Searching for keyword: ${keyword}`);
    
    const keywordLower = keyword.toLowerCase().trim();
    
    // If keyword is too short, return empty
    if (keywordLower.length < 2) {
      return res.json([]);
    }
    
    const results = await prisma.liturgicalDay.findMany({
      where: {
        OR: [
          { celebration: { contains: keywordLower, mode: 'insensitive' } },
          { seasonName: { contains: keywordLower, mode: 'insensitive' } },
          { rank: { contains: keywordLower, mode: 'insensitive' } }
        ]
      },
      orderBy: {
        date: 'asc'
      },
      take: 50 // Limit results for performance
    });
    
    console.log(`✅ Found ${results.length} results for keyword: ${keyword}`);
    res.json(results);
    
  } catch (error) {
    console.error("❌ Keyword search error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    await prisma.$disconnect();
  }
});

// Search by liturgical season - FIXED to handle "all"
app.get("/api/calendar/search/season/:season", async (req, res) => {
  try {
    const { season } = req.params;
    const { year } = req.query;
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    console.log(`🔍 Searching for season: ${season}, year: ${year || 'all'}`);
    
    let whereClause = {};
    
    // Only add season filter if not "all"
    if (season !== 'all') {
      whereClause.season = season.toLowerCase();
    }
    
    // Add year filter if provided and not "all"
    if (year && year !== 'all') {
      const startDate = new Date(Date.UTC(parseInt(year), 0, 1));
      const endDate = new Date(Date.UTC(parseInt(year), 11, 31, 23, 59, 59, 999));
      
      whereClause.date = {
        gte: startDate,
        lte: endDate
      };
    }
    
    // If no filters at all, return empty (or could return recent days)
    if (Object.keys(whereClause).length === 0) {
      return res.json([]);
    }
    
    const results = await prisma.liturgicalDay.findMany({
      where: whereClause,
      orderBy: {
        date: 'asc'
      },
      take: 100 // Limit results for performance
    });
    
    console.log(`✅ Found ${results.length} results for season: ${season}`);
    res.json(results);
    
  } catch (error) {
    console.error("❌ Season search error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    await prisma.$disconnect();
  }
});

// Search by date - COMPLETELY FIXED for all years
app.get("/api/calendar/search/date/:date", async (req, res) => {
  try {
    const { date } = req.params;
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const infiniteCalendar = require('./services/infiniteCalendar');
    
    console.log(`🔍 Searching for date: ${date}`);
    
    let startDate, endDate;
    let results = [];
    
    // Check if it's a year-only search (e.g., "2050", "2100")
    if (/^\d{4}$/.test(date)) {
      const year = parseInt(date);
      
      // For ANY year (past or future), use infinite calendar to generate samples
      console.log(`🔮 Year ${year} - using infinite calendar for samples`);
      
      // Generate first day of each month as representative samples
      for (let month = 0; month < 12; month++) {
        const sampleDate = new Date(year, month, 1);
        const reading = await infiniteCalendar.getReadingsForAnyDate(sampleDate, prisma);
        
        if (reading) {
          results.push({
            id: `generated-${year}-${month + 1}`,
            date: sampleDate,
            celebration: reading.celebration,
            season: reading.season,
            seasonName: reading.seasonName,
            yearCycle: reading.yearCycle,
            readings: reading.readings ? {
              firstReading: reading.readings.firstReading ? { citation: reading.readings.firstReading.citation } : null,
              gospel: reading.readings.gospel ? { citation: reading.readings.gospel.citation } : null
            } : null
          });
        }
      }
      
      console.log(`✅ Generated ${results.length} sample days for ${year}`);
      return res.json(results);
    }
    
    // Check if it's a full date (YYYY-MM-DD)
    else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split('-').map(Number);
      
      // For future years > 2035, use infinite calendar directly
      if (year > 2035) {
        console.log(`🔮 Date ${date} beyond database - using infinite calendar`);
        
        const targetDate = new Date(year, month - 1, day);
        const reading = await infiniteCalendar.getReadingsForAnyDate(targetDate, prisma);
        
        if (reading) {
          return res.json([{
            id: `generated-${date}`,
            date: targetDate,
            celebration: reading.celebration,
            season: reading.season,
            seasonName: reading.seasonName,
            yearCycle: reading.yearCycle,
            readings: reading.readings ? {
              firstReading: reading.readings.firstReading ? { citation: reading.readings.firstReading.citation } : null,
              gospel: reading.readings.gospel ? { citation: reading.readings.gospel.citation } : null
            } : null
          }]);
        }
        return res.json([]);
      }
      
      // For years in database, do regular search
      startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
      endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
      
      results = await prisma.liturgicalDay.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: {
          date: 'asc'
        }
      });
    } 
    else {
      return res.status(400).json({ 
        error: "Invalid date format. Use YYYY or YYYY-MM-DD" 
      });
    }
    
    console.log(`✅ Found ${results.length} results for ${date}`);
    res.json(results);
    
  } catch (error) {
    console.error("❌ Date search error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    await prisma.$disconnect();
  }
});

// ================== FULL READINGS ROUTES ==================

// ================== FULL READINGS ROUTES ==================

// Get full readings for a specific date with all details
app.get("/api/calendar/readings/:year/:month/:day", async (req, res) => {
  try {
    const { year, month, day } = req.params;
    const yearNum = parseInt(year);
    const monthNum = parseInt(month) - 1;
    const dayNum = parseInt(day);
    
    console.log(`🔍 Getting readings for ${year}-${month}-${day}`);
    
    let liturgicalDay = null;
    
    // For years 2024-2035, check database first
    if (yearNum >= 2024 && yearNum <= 2035) {
      const startDate = new Date(Date.UTC(yearNum, monthNum, dayNum, 0, 0, 0));
      const endDate = new Date(Date.UTC(yearNum, monthNum, dayNum, 23, 59, 59, 999));
      
      liturgicalDay = await prisma.liturgicalDay.findFirst({
        where: {
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      });
    }
    
    // For years before 2024 or after 2035, use infinite calendar
    if (!liturgicalDay) {
      console.log(`🔮 Using infinite calendar for ${year}-${month}-${day}`);
      const infiniteCalendar = require('./services/infiniteCalendar');
      const targetDate = new Date(Date.UTC(yearNum, monthNum, dayNum));
      liturgicalDay = await infiniteCalendar.getReadingsForAnyDate(targetDate, prisma);
    }
    
    if (!liturgicalDay) {
      return res.status(404).json({ error: "No readings found for this date" });
    }
    
    // FIX: Return the date as a string, not a Date object
    // This prevents timezone shifting
    const responseDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    
    // FIX: Get the correct day of week for the ACTUAL date
    const actualDate = new Date(Date.UTC(yearNum, monthNum, dayNum));
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const actualDayOfWeek = daysOfWeek[actualDate.getUTCDay()];
    
    // FIX: Correct the celebration name to use the actual day of week
    let celebration = liturgicalDay.celebration;
    
    // Check if celebration starts with the correct day
    if (!celebration.startsWith(actualDayOfWeek)) {
      // Try to extract week number and season
      const weekMatch = celebration.match(/(\d+)(?:st|nd|rd|th) week of (.+)/i);
      if (weekMatch) {
        const weekNum = weekMatch[1];
        const season = weekMatch[2];
        const getOrdinalSuffix = (num) => {
          if (num === 1) return 'st';
          if (num === 2) return 'nd';
          if (num === 3) return 'rd';
          return 'th';
        };
        celebration = `${actualDayOfWeek} of the ${weekNum}${getOrdinalSuffix(parseInt(weekNum))} week of ${season}`;
      } else {
        // If no week pattern, just prefix with day
        celebration = `${actualDayOfWeek} - ${celebration}`;
      }
    }
    
    // Return with CORRECT date string (not Date object)
    res.json({
      ...liturgicalDay,
      date: responseDate, // Return as string, not Date object!
      celebration: celebration, // Corrected celebration with actual day
    });
    
  } catch (error) {
    console.error("Readings error:", error);
    res.status(500).json({ error: error.message });
  }
});
// ================== ADMIN/POPULATION ROUTES ==================

// POPULATE - Generate and store calendar data for a month
app.get("/api/calendar/populate/:year/:month", async (req, res) => {
  try {
    const { year, month } = req.params;
    const yearNum = parseInt(year);
    const monthNum = parseInt(month) - 1; // JavaScript months are 0-based
    
    console.log(`🌍 Populating calendar for ${year}/${month}`);
    
    // This will trigger fetching/generating all days for the month
    const days = await calendarService.getLiturgicalMonth(yearNum, monthNum);
    
    res.json({ 
      success: true,
      message: `Successfully populated ${days.length} days for ${year}/${month}`,
      count: days.length,
      data: days 
    });
  } catch (error) {
    console.error("Population error:", error);
    res.status(500).json({ error: error.message });
  }
});

// POPULATE - Generate multiple months or years
app.post("/api/calendar/populate-range", async (req, res) => {
  try {
    const { startYear, startMonth, endYear, endMonth } = req.body;
    
    const results = {
      total: 0,
      months: []
    };
    
    for (let year = startYear; year <= endYear; year++) {
      const monthStart = (year === startYear) ? startMonth : 1;
      const monthEnd = (year === endYear) ? endMonth : 12;
      
      for (let month = monthStart; month <= monthEnd; month++) {
        console.log(`📅 Populating ${year}/${month}`);
        const days = await calendarService.getLiturgicalMonth(year, month - 1);
        results.total += days.length;
        results.months.push({ year, month, count: days.length });
        
        // Small delay to avoid overwhelming
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    res.json({
      success: true,
      message: `Successfully populated ${results.total} days`,
      results
    });
  } catch (error) {
    console.error("Range population error:", error);
    res.status(500).json({ error: error.message });
  }
});

// REFRESH - Update readings for a specific date
app.get("/api/calendar/refresh/:year/:month/:day", async (req, res) => {
  try {
    const { year, month, day } = req.params;
    const date = new Date(year, month - 1, day);
    
    const updated = await calendarService.refreshReadings(date);
    
    if (updated) {
      res.json({ 
        success: true, 
        message: "Readings refreshed successfully",
        data: updated 
      });
    } else {
      res.status(404).json({ error: "Date not found or refresh failed" });
    }
  } catch (error) {
    console.error("Refresh error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ================== DEBUG ROUTES ==================

// DEBUG - Check what's in your database
app.get("/api/calendar/debug/:year/:month", async (req, res) => {
  try {
    const { year, month } = req.params;
    const yearNum = parseInt(year);
    const monthNum = parseInt(month) - 1;
    
    const startDate = new Date(yearNum, monthNum, 1);
    const endDate = new Date(yearNum, monthNum + 1, 0);
    
    const existingDays = await prisma.liturgicalDay.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        date: 'asc'
      }
    });
    
    // Count days with readings
    const withReadings = existingDays.filter(d => d.readings && 
      (d.readings.firstReading || d.readings.gospel)).length;
    
    res.json({
      message: `Found ${existingDays.length} days in database for ${year}/${month}`,
      count: existingDays.length,
      withReadings: withReadings,
      withoutReadings: existingDays.length - withReadings,
      days: existingDays.map(d => ({
        date: d.date,
        celebration: d.celebration,
        season: d.season,
        color: d.liturgicalColor,
        hasReadings: !!(d.readings && (d.readings.firstReading || d.readings.gospel))
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// DEBUG - Get database statistics
app.get("/api/calendar/stats", async (req, res) => {
  try {
    const totalDays = await prisma.liturgicalDay.count();
    const withReadings = await prisma.liturgicalDay.count({
      where: {
        readings: {
          not: null
        }
      }
    });
    
    const bySeason = await prisma.liturgicalDay.groupBy({
      by: ['season'],
      _count: true
    });
    
    const byYear = await prisma.$queryRaw`
      SELECT EXTRACT(YEAR FROM date) as year, COUNT(*) 
      FROM liturgical_days 
      GROUP BY year 
      ORDER BY year ASC
    `;
    
    res.json({
      totalDays,
      withReadings,
      withoutReadings: totalDays - withReadings,
      bySeason,
      byYear
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// TEMPORARY: Delete all data for a specific month
app.delete("/api/calendar/delete-month/:year/:month", async (req, res) => {
  try {
    const { year, month } = req.params;
    const yearNum = parseInt(year);
    const monthNum = parseInt(month) - 1;
    
    const startDate = new Date(yearNum, monthNum, 1);
    const endDate = new Date(yearNum, monthNum + 1, 0);
    
    const deleted = await prisma.liturgicalDay.deleteMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    });
    
    res.json({ 
      success: true, 
      message: `Deleted ${deleted.count} days for ${year}/${month}` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// TEMPORARY: Delete a specific date
app.delete("/api/calendar/delete-date/:year/:month/:day", async (req, res) => {
  try {
    const { year, month, day } = req.params;
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    
    const deleted = await prisma.liturgicalDay.delete({
      where: { date: date }
    });
    
    res.json({ 
      success: true, 
      message: `Deleted ${date.toDateString()}` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================== TEST/DEBUG ROUTES ==================

// DEBUG - Test Romcal directly
app.get("/api/calendar/test-romcal", async (req, res) => {
  try {
    const romcal = require('romcal');
    const methods = Object.keys(romcal);
    
    let sample = null;
    let error = null;
    
    try {
      if (typeof romcal.calendarForYear === 'function') {
        sample = await romcal.calendarForYear({ year: 2026 });
      } else if (typeof romcal.generate === 'function') {
        sample = await romcal.generate({ year: 2026 });
      } else if (typeof romcal.forYear === 'function') {
        sample = await romcal.forYear(2026);
      }
    } catch (e) {
      error = e.message;
    }
    
    res.json({
      availableMethods: methods,
      sample: sample ? 'Method found and executed' : 'No working method found',
      error: error
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// TEST: See what Romcal returns for a single day
app.get("/api/calendar/test-day/:year/:month/:day", async (req, res) => {
  try {
    const { year, month, day } = req.params;
    const romcal = require('romcal');
    
    console.log(`Testing Romcal for ${year}-${month}-${day}`);
    
    const calendar = await romcal.calendarFor({
      year: parseInt(year),
      country: 'general',
      locale: 'en'
    });
    
    console.log(`Romcal returned ${calendar?.length || 0} items`);
    
    const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const dayData = calendar.find(item => {
      return item.date === dateStr || 
             item.day === dateStr || 
             (item.dateStr === dateStr);
    });
    
    res.json({
      totalItems: calendar?.length || 0,
      requestedDate: dateStr,
      found: !!dayData,
      sampleItem: calendar?.[0] || null,
      dayData: dayData || null
    });
    
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// ==================== TREASURER NOTES & CALCULATIONS ====================

// Get all notes for current user
app.get("/api/treasurer/notes", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const notes = await prisma.$queryRaw`
      SELECT * FROM "TreasurerNote" 
      WHERE "userId" = ${userId} 
      ORDER BY "createdAt" DESC
    `;
    
    res.json({ success: true, notes: notes || [] });
  } catch (err) {
    console.error("Error fetching notes:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get single note by ID
app.get("/api/treasurer/notes/:id", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    
    const note = await prisma.$queryRaw`
      SELECT * FROM "TreasurerNote" 
      WHERE "id" = ${id} AND "userId" = ${userId}
    `;
    
    if (!note || note.length === 0) {
      return res.status(404).json({ error: "Note not found" });
    }
    
    res.json({ success: true, note: note[0] });
  } catch (err) {
    console.error("Error fetching note:", err);
    res.status(500).json({ error: err.message });
  }
});

// Create new note
app.post("/api/treasurer/notes", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { title, content } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }
    
    await prisma.$executeRaw`
      INSERT INTO "TreasurerNote" ("id", "userId", "title", "content", "images", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${userId}, ${title}, ${content || ''}, ARRAY[]::TEXT[], NOW(), NOW())
    `;
    
    res.json({ success: true, message: "Note created successfully" });
  } catch (err) {
    console.error("Error creating note:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update note
app.put("/api/treasurer/notes/:id", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { title, content } = req.body;
    
    const result = await prisma.$executeRaw`
      UPDATE "TreasurerNote" 
      SET "title" = ${title}, "content" = ${content || ''}, "updatedAt" = NOW()
      WHERE "id" = ${id} AND "userId" = ${userId}
    `;
    
    if (result === 0) {
      return res.status(404).json({ error: "Note not found" });
    }
    
    res.json({ success: true, message: "Note updated successfully" });
  } catch (err) {
    console.error("Error updating note:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete note
app.delete("/api/treasurer/notes/:id", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    
    const result = await prisma.$executeRaw`
      DELETE FROM "TreasurerNote" 
      WHERE "id" = ${id} AND "userId" = ${userId}
    `;
    
    if (result === 0) {
      return res.status(404).json({ error: "Note not found" });
    }
    
    res.json({ success: true, message: "Note deleted successfully" });
  } catch (err) {
    console.error("Error deleting note:", err);
    res.status(500).json({ error: err.message });
  }
});


// ==================== MEDIA GALLERY - COMPLETE ====================

// Create media temp directory
const mediaTempDir = path.join(__dirname, "uploads/media-temp");
if (!fs.existsSync(mediaTempDir)) fs.mkdirSync(mediaTempDir, { recursive: true });

// Multer config (same as profile upload)
const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, mediaTempDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `media_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`);
  },
});

const mediaUpload = multer({
  storage: mediaStorage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 },
}).fields([
  { name: 'files', maxCount: 10 },
  { name: 'thumbnails', maxCount: 10 }  // Add this line
]);

// Helper: Get media type
function getMediaType(mimetype) {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  return 'document';
}

// Helper: Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}


// Helper function to generate video thumbnail
async function generateVideoThumbnail(videoPath, outputDir, outputName) {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(outputDir, outputName);
    
    ffmpeg(videoPath)
      .screenshots({
        timestamps: ['00:00:12'],
        filename: outputName,
        folder: outputDir,
        size: '640x360',          
        quality: 90               
      })
      .on('end', () => {
        console.log('✅ Thumbnail generated:', outputName);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('❌ Thumbnail generation failed:', err.message);
        reject(err);
      });
  });
}

// Configure Cloudinary (add after your other configs)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ==================== MEDIA GALLERY WITH CLOUDINARY ====================

// ADMIN UPLOAD - Cloudinary Version
app.post("/api/admin/media/upload", authenticate, mediaUpload, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (user.role !== "admin" && user.specialRole !== "secretary" && user.specialRole !== "media_moderator") {
      return res.status(403).json({ error: "Only admins, secretaries, and media moderators can upload media" });
    }

    const files = req.files['files'];
    // Remove thumbnails - Cloudinary auto-generates them!
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const { category, tags, isPublic, isFeatured, description } = req.body;
    const uploadedMedia = [];
    
    // Store file paths for background processing
    const filePaths = [];

    // Process files - upload to Cloudinary
for (const file of files) {
  try {
    const isVideo = file.mimetype.startsWith('video/');
    const mediaType = isVideo ? 'video' : 'image';
    let result;
    
    // ✅ VIDEO UPLOAD - WITH LARGE FILE SUPPORT
    if (isVideo) {
      const fileSizeMB = file.size / (1024 * 1024);
      
      let uploadOptions = {
        folder: 'zuca-gallery',
        resource_type: 'video',
      };

      // ✅ If video is over 40MB, use async processing
      if (fileSizeMB > 40) {
        uploadOptions.eager = [
          { quality: 'auto:good', format: 'mp4' }
        ];
        uploadOptions.eager_async = true;
      } else {
        uploadOptions.transformation = [
          { quality: 'auto:good' },
          { format: 'mp4' }
        ];
      }

      result = await cloudinary.uploader.upload(file.path, uploadOptions);
      
    } else {
      // ✅ IMAGE UPLOAD
      result = await cloudinary.uploader.upload(file.path, {
        folder: 'zuca-gallery',
        resource_type: 'image',
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ]
      })
    }

        // Auto-generate thumbnail for videos
        let thumbnailUrl = null;
        if (isVideo) {
          thumbnailUrl = cloudinary.url(result.public_id, {
            resource_type: 'video',
            format: 'jpg',
            transformation: [
              { start_offset: '2' },
              { width: 640, height: 360, crop: 'fill' },
              { quality: 'auto' }
            ]
          });
        }

        // Save to database
        const media = await prisma.media.create({
          data: {
            title: file.originalname.replace(/\.[^/.]+$/, ""),
            description: description || null,
            filename: result.public_id, // Cloudinary public ID
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: result.bytes,
            sizeFormatted: formatFileSize(result.bytes),
            type: mediaType,
            url: result.secure_url, // Cloudinary URL
            thumbnailUrl: thumbnailUrl,
            category: category || "uncategorized",
            tags: tags ? tags.split(',').map(t => t.trim()) : [],
            isPublic: isPublic === 'true',
            isFeatured: isFeatured === 'true',
            uploadedById: req.user.userId
          }
        });

        uploadedMedia.push(media);
        
        // Clean up temp file
        try { fs.unlinkSync(file.path); } catch(e) {}

      } catch (uploadErr) {
        console.error("Cloudinary upload error:", uploadErr);
        // Clean up temp file
        try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch(e) {}
      }
    }

    // ✅ SEND RESPONSE IMMEDIATELY
    res.status(201).json({ success: true, media: uploadedMedia });

    // Send notifications in background
    if (uploadedMedia.length > 0 && isPublic === 'true') {
      setTimeout(async () => {
        const users = await prisma.user.findMany({ select: { id: true } });
        for (const user of users) {
          try {
            await createAndSendNotification({
              userId: user.id,
              type: "new_media",
              title: "📸 New Gallery Update",
              message: `ZUCA added new ${uploadedMedia.length} item(s) to the gallery`,
              data: { mediaId: uploadedMedia[0].id }
            });
          } catch (err) {
            console.error("Failed to send notification:", err.message);
          }
        }
        console.log(`✅ Sent ${users.length} media notifications`);
      }, 200);
    }

  } catch (err) {
    console.error("Media upload error:", err);
    if (req.files) {
      const allFiles = [...(req.files['files'] || []), ...(req.files['thumbnails'] || [])];
      allFiles.forEach(file => {
        try {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        } catch(e) {}
      });
    }
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});
  

// 2. Get all media (Admin panel) - NO CHANGE NEEDED
app.get("/api/admin/media", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (user.role !== "admin" && user.specialRole !== "secretary" && user.specialRole !== "media_moderator") {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { page = 1, limit = 20, category, type, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = {};
    if (category && category !== 'all') where.category = category;
    if (type && type !== 'all') where.type = type;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    const [media, total] = await Promise.all([
      prisma.media.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: { select: { id: true, fullName: true, profileImage: true } },
          _count: { select: { likes: true, views: true, comments: true, downloads: true, shares: true } }
        }
      }),
      prisma.media.count({ where })
    ]);
    
    res.json({ media, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Update media metadata - NO CHANGE NEEDED
app.put("/api/admin/media/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, tags, isPublic, isFeatured } = req.body;
    
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (user.role !== "admin" && user.specialRole !== "secretary" && user.specialRole !== "media_moderator") {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    const media = await prisma.media.update({
      where: { id },
      data: {
        title,
        description,
        category,
        tags: tags ? tags.split(',').map(t => t.trim()) : undefined,
        isPublic: isPublic !== undefined ? isPublic : undefined,
        isFeatured: isFeatured !== undefined ? isFeatured : undefined,
        updatedAt: new Date()
      }
    });
    
    res.json({ success: true, media });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Delete media - Cloudinary Version
app.delete("/api/admin/media/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (user.role !== "admin" && user.specialRole !== "secretary" && user.specialRole !== "media_moderator") {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) return res.status(404).json({ error: "Media not found" });
    
    // Delete from Cloudinary
    try {
      const publicId = media.filename;
      await cloudinary.uploader.destroy(publicId, {
        resource_type: media.type === 'video' ? 'video' : 'image'
      });
      console.log('✅ Deleted from Cloudinary:', publicId);
    } catch (cloudErr) {
      console.error("Cloudinary delete error:", cloudErr);
    }
    
    // Delete from database
    await prisma.media.delete({ where: { id } });
    
    res.json({ success: true, message: "Media deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== PUBLIC MEDIA ROUTES ====================

// 5. Get public media (Frontpage)
app.get("/api/media/public", async (req, res) => {
  try {
    const { page = 1, limit = 12, category, type, sortBy = 'latest', featured = false } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = {
      isPublic: true,
      ...(category && category !== 'all' && { category }),
      ...(type && type !== 'all' && { type }),
      ...(featured === 'true' && { isFeatured: true })
    };
    
    let orderBy = {};
    switch(sortBy) {
      case 'latest': orderBy = { createdAt: 'desc' }; break;
      case 'popular': orderBy = { likes: { _count: 'desc' } }; break;
      case 'mostViewed': orderBy = { views: { _count: 'desc' } }; break;
      default: orderBy = { createdAt: 'desc' };
    }
    
    const [media, total] = await Promise.all([
      prisma.media.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy,
        include: {
          uploadedBy: { select: { id: true, fullName: true, profileImage: true } },
          _count: { select: { likes: true, views: true, comments: true, downloads: true, shares: true } }
        }
      }),
      prisma.media.count({ where })
    ]);
    
    res.json({ media, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Get single media with details
app.get("/api/media/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || null;
    
    const media = await prisma.media.findFirst({
      where: { id, isPublic: true },
      include: {
        uploadedBy: { select: { id: true, fullName: true, profileImage: true } },
        comments: {
          include: { user: { select: { id: true, fullName: true, profileImage: true } } },
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        _count: { select: { likes: true, views: true, comments: true, downloads: true, shares: true } }
      }
    });
    
    if (!media) return res.status(404).json({ error: "Media not found" });
    
    // Track view (if authenticated)
    if (userId) {
      try {
        await prisma.mediaView.create({
          data: { mediaId: id, userId, viewedAt: new Date() }
        });
      } catch (err) {
        // Ignore duplicate view errors
      }
    }
    
    res.json(media);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Get featured media
app.get("/api/media/featured", async (req, res) => {
  try {
    const { limit = 6 } = req.query;
    
    const media = await prisma.media.findMany({
      where: { isPublic: true, isFeatured: true },
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: { id: true, fullName: true, profileImage: true } },
        _count: { select: { likes: true, views: true } }
      }
    });
    
    res.json(media);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});





// ==================== MEDIA INTERACTIONS ====================

// 8. Like/Unlike media
app.post("/api/media/:id/like", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const existing = await prisma.mediaLike.findUnique({
      where: { mediaId_userId: { mediaId: id, userId } }
    });
    
    if (existing) {
      await prisma.mediaLike.delete({ where: { id: existing.id } });
      res.json({ liked: false, action: 'unliked' });
    } else {
      await prisma.mediaLike.create({ data: { mediaId: id, userId } });
      res.json({ liked: true, action: 'liked' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== LIVE ACTIVITIES ENDPOINTS ====================

// Get recent likes with user and media info
app.get("/api/media/recent-likes", async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const recentLikes = await prisma.mediaLike.findMany({
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, fullName: true, profileImage: true } },
        media: { select: { id: true, title: true, thumbnailUrl: true, type: true } }
      }
    });
    
    res.json(recentLikes);
  } catch (err) {
    console.error("Error fetching recent likes:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get recent comments with user and media info
app.get("/api/media/recent-comments", async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const recentComments = await prisma.mediaComment.findMany({
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, fullName: true, profileImage: true } },
        media: { select: { id: true, title: true, thumbnailUrl: true, type: true } }
      }
    });
    
    res.json(recentComments);
  } catch (err) {
    console.error("Error fetching recent comments:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get recent shares with user and media info
app.get("/api/media/recent-shares", async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const recentShares = await prisma.mediaShare.findMany({
      take: parseInt(limit),
      orderBy: { sharedAt: 'desc' },
      include: {
        user: { select: { id: true, fullName: true, profileImage: true } },
        media: { select: { id: true, title: true, thumbnailUrl: true, type: true } }
      }
    });
    
    res.json(recentShares);
  } catch (err) {
    console.error("Error fetching recent shares:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get combined live feed (all activities)
app.get("/api/media/live-feed", async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    // Fetch all activities in parallel
    const [likes, comments, shares] = await Promise.all([
      prisma.mediaLike.findMany({
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, profileImage: true } },
          media: { select: { id: true, title: true, thumbnailUrl: true, type: true } }
        }
      }),
      prisma.mediaComment.findMany({
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, profileImage: true } },
          media: { select: { id: true, title: true, thumbnailUrl: true, type: true } }
        }
      }),
      prisma.mediaShare.findMany({
        take: parseInt(limit),
        orderBy: { sharedAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, profileImage: true } },
          media: { select: { id: true, title: true, thumbnailUrl: true, type: true } }
        }
      })
    ]);
    
    // Combine and format activities
    const activities = [
      ...likes.map(like => ({
        id: `like-${like.id}`,
        type: 'like',
        userId: like.userId,
        userName: like.user.fullName,
        userAvatar: like.user.profileImage,
        mediaId: like.media.id,
        mediaTitle: like.media.title,
        mediaThumbnail: like.media.thumbnailUrl,
        mediaType: like.media.type,
        action: 'liked',
        icon: '❤️',
        timestamp: like.createdAt,
        timeAgo: formatRelativeTimeStatic(like.createdAt)
      })),
      ...comments.map(comment => ({
        id: `comment-${comment.id}`,
        type: 'comment',
        userId: comment.userId,
        userName: comment.user.fullName,
        userAvatar: comment.user.profileImage,
        mediaId: comment.media.id,
        mediaTitle: comment.media.title,
        mediaThumbnail: comment.media.thumbnailUrl,
        mediaType: comment.media.type,
        action: 'commented',
        icon: '💬',
        timestamp: comment.createdAt,
        timeAgo: formatRelativeTimeStatic(comment.createdAt),
        commentContent: comment.content
      })),
      ...shares.map(share => ({
        id: `share-${share.id}`,
        type: 'share',
        userId: share.userId,
        userName: share.user.fullName,
        userAvatar: share.user.profileImage,
        mediaId: share.media.id,
        mediaTitle: share.media.title,
        mediaThumbnail: share.media.thumbnailUrl,
        mediaType: share.media.type,
        action: 'shared',
        icon: '↗️',
        timestamp: share.sharedAt,
        timeAgo: formatRelativeTimeStatic(share.sharedAt),
        platform: share.platform
      }))
    ];
    
    // Sort by timestamp (newest first) and limit
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json(activities.slice(0, parseInt(limit)));
  } catch (err) {
    console.error("Error fetching live feed:", err);
    res.status(500).json({ error: err.message });
  }
});

// Helper function for time formatting
function formatRelativeTimeStatic(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

// 9. Check if user liked media
app.get("/api/media/:id/liked", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const like = await prisma.mediaLike.findUnique({
      where: { mediaId_userId: { mediaId: id, userId } }
    });
    
    res.json({ liked: !!like });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Add comment
app.post("/api/media/:id/comments", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.userId;
    
    if (!content || content.trim() === "") {
      return res.status(400).json({ error: "Comment cannot be empty" });
    }
    
    const comment = await prisma.mediaComment.create({
      data: {
        content: content.trim(),
        mediaId: id,
        userId
      },
      include: {
        user: { select: { id: true, fullName: true, profileImage: true } }
      }
    });
   // Notify media owner
// Notify media owner
const media = await prisma.media.findUnique({ where: { id }, select: { uploadedById: true } });
if (media && media.uploadedById !== userId) {
  const notification = await createAndSendNotification({
    userId: media.uploadedById,
    type: "media_comment",
    title: "💬 New Comment",
    message: `${comment.user.fullName} commented on your media`,
    data: { mediaId: id, commentId: comment.id }
  });
  
  io.to(media.uploadedById).emit("new_notification", {
    ...notification,
    createdAt: notification.createdAt.toISOString()
  });
}

res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Get comments for media
app.get("/api/media/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [comments, total] = await Promise.all([
      prisma.mediaComment.findMany({
        where: { mediaId: id },
        include: { user: { select: { id: true, fullName: true, profileImage: true } } },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.mediaComment.count({ where: { mediaId: id } })
    ]);
    
    res.json({ comments, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




// 12. Delete comment (owner, media owner, or admin)
app.delete("/api/media/comments/:commentId", authenticate, async (req, res) => {
  try {
    const { commentId } = req.params;
    
    const comment = await prisma.mediaComment.findUnique({
      where: { id: commentId },
      include: { media: true }
    });
    
    if (!comment) return res.status(404).json({ error: "Comment not found" });
    
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isOwner = comment.userId === req.user.userId;
    const isMediaOwner = comment.media.uploadedById === req.user.userId;
    
    if (!isAdmin && !isOwner && !isMediaOwner) {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    await prisma.mediaComment.delete({ where: { id: commentId } });
    
    res.json({ success: true, message: "Comment deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 13. Track download
app.post("/api/media/:id/download", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    await prisma.mediaDownload.create({
      data: { mediaId: id, userId, downloadedAt: new Date() }
    });
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 14. Track share
app.post("/api/media/:id/share", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { platform } = req.body;
    const userId = req.user.userId;
    
    await prisma.mediaShare.create({
      data: { mediaId: id, userId, platform: platform || 'direct', sharedAt: new Date() }
    });
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 15. Get media stats (Admin & Media Moderator)
app.get("/api/admin/media/stats", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    // Allow admin OR media_moderator
    if (user.role !== "admin" && user.specialRole !== "media_moderator") {
      return res.status(403).json({ error: "Admin or Media Moderator only" });
    }
    
    const [totalMedia, totalViews, totalLikes, totalComments, totalDownloads, totalShares, byType, byCategory] = await Promise.all([
      prisma.media.count(),
      prisma.mediaView.count(),
      prisma.mediaLike.count(),
      prisma.mediaComment.count(),
      prisma.mediaDownload.count(),
      prisma.mediaShare.count(),
      prisma.media.groupBy({ by: ['type'], _count: true }),
      prisma.media.groupBy({ by: ['category'], _count: true })
    ]);
    
    const topMedia = await prisma.media.findMany({
      take: 10,
      orderBy: { views: { _count: 'desc' } },
      include: {
        _count: { select: { views: true, likes: true, comments: true, downloads: true, shares: true } }
      }
    });
    
    res.json({
      totalMedia, totalViews, totalLikes, totalComments, totalDownloads, totalShares,
      byType, byCategory, topMedia
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// 16. Get trending media (most interacted in last 7 days)
app.get("/api/media/trending", async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const media = await prisma.media.findMany({
      where: { isPublic: true, createdAt: { gte: sevenDaysAgo } },
      take: parseInt(limit),
      orderBy: [
        { likes: { _count: 'desc' } },
        { views: { _count: 'desc' } }
      ],
      include: {
        uploadedBy: { select: { id: true, fullName: true, profileImage: true } },
        _count: { select: { likes: true, views: true, comments: true } }
      }
    });
    
    res.json(media);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});





app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No content
});



// ================== PUBLIC FILE ACCESS (NO TOKEN NEEDED) ==================
app.get("/api/public/files/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const file = await prisma.file.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    const fileBuffer = Buffer.from(file.data, 'base64');

    res.setHeader('Content-Type', file.type);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.name)}"`);
    res.setHeader('Content-Length', file.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('Access-Control-Allow-Origin', '*');

    res.send(fileBuffer);
  } catch (err) {
    console.error("Error serving file:", err);
    res.status(500).json({ error: "Failed to serve file" });
  }
});

// ================== PUBLIC STATS ENDPOINTS (NO AUTH NEEDED) ==================
// Add these after your other public routes

// Public - anyone can see campaign count
app.get("/api/public/campaigns/count", async (req, res) => {
  try {
    const count = await prisma.contributionType.count({
      where: {
        OR: [
          { deadline: null },
          { deadline: { gte: new Date() } }
        ]
      }
    });
    res.json({ count });
  } catch (err) {
    console.error("Error fetching campaign count:", err);
    res.status(500).json({ error: err.message });
  }
});

// Public - anyone can see user count
app.get("/api/public/users/count", async (req, res) => {
  try {
    const count = await prisma.user.count();
    res.json({ count });
  } catch (err) {
    console.error("Error fetching user count:", err);
    res.status(500).json({ error: err.message });
  }
});

// Public - anyone can see media count
app.get("/api/public/media/count", async (req, res) => {
  try {
    const count = await prisma.media.count({ where: { isPublic: true } });
    res.json({ count });
  } catch (err) {
    console.error("Error fetching media count:", err);
    res.status(500).json({ error: err.message });
  }
});


// ================== GEMINI AI SETUP ==================
const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
let geminiModel = null;

async function initGemini() {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "your_api_key_here") {
    console.log("⚠️ No Gemini API key - AI will use fallback responses");
    return;
  }
  
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    console.log("✅ Gemini AI initialized");
  } catch (err) {
    console.error("❌ Gemini init error:", err.message);
  }
}


app.get('/api/notifications/vapid-public-key', (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});




      

// ================== AUTH MIDDLEWARE ==================
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "No token" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role === "admin") return next();
  if (req.user.specialRole === "admin") return next();
  res.status(403).json({ message: "Admin only" });
}

const hasRole = (req, allowedRoles) => {
  return allowedRoles.includes(req.user.role);
};


// TEMPORARY DEBUG ENDPOINT - NO AUTH REQUIRED
app.get("/api/chat/debug/public-files", async (req, res) => {
  try {
    const files = await prisma.file.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        type: true,
        size: true,
        createdAt: true,
        messageId: true
      }
    });
    
    res.json({ 
      success: true, 
      count: files.length,
      files: files 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TEMPORARY PUBLIC FILE VIEWER
app.get("/api/chat/debug/public-file/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const file = await prisma.file.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    const fileBuffer = Buffer.from(file.data, 'base64');

    res.setHeader('Content-Type', file.type);
    res.setHeader('Content-Disposition', `inline; filename="${file.name}"`);
    res.send(fileBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// ================== COMPLETE YOUTUBE ANALYTICS ROUTES ==================
// Add this to your server.js file

// Helper function to parse ISO 8601 duration (PT1H2M10S)
function parseDuration(duration) {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  const hours = (match[1] ? parseInt(match[1]) : 0);
  const minutes = (match[2] ? parseInt(match[2]) : 0);
  const seconds = (match[3] ? parseInt(match[3]) : 0);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Helper function to calculate percentage change
function calculateChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

// ================== MAIN YOUTUBE ANALYTICS ENDPOINT ==================
app.get("/api/admin/analytics/youtube", authenticate, requireAdmin, async (req, res) => {
  try {
    const channelId = process.env.YOUTUBE_CHANNEL_ID || "UCJ7NvR5_ZUwhtM16sJY4anQ";
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: "YouTube API key not configured" });
    }

    // 1. Get channel statistics
    const channelResponse = await axios.get(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`
    );
    
    if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
      return res.status(404).json({ error: "Channel not found" });
    }
    
    const channelStats = channelResponse.data.items[0];

    // 2. Get recent videos (last 50)
    const videosResponse = await axios.get(
      `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet&order=date&maxResults=50&type=video`
    );

    if (!videosResponse.data.items) {
      return res.json({ channel: { name: channelStats.snippet.title }, videos: [] });
    }

    // 3. Get detailed video statistics
    const videoIds = videosResponse.data.items.map(v => v.id.videoId).filter(id => id).join(',');
    
    let videoStatsResponse = { data: { items: [] } };
    if (videoIds) {
      videoStatsResponse = await axios.get(
        `https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&id=${videoIds}&part=statistics,contentDetails`
      );
    }

    // 4. Process video data
    const videos = videosResponse.data.items.map((video) => {
      const stats = videoStatsResponse.data.items.find(v => v.id === video.id.videoId) || {};
      const publishedAt = new Date(video.snippet.publishedAt);
      
      const views = parseInt(stats.statistics?.viewCount || 0);
      const likes = parseInt(stats.statistics?.likeCount || 0);
      const comments = parseInt(stats.statistics?.commentCount || 0);
      const engagement = views > 0 ? ((likes + comments) / views) * 100 : 0;
      const duration = stats.contentDetails?.duration || 'PT0S';
      
      return {
        id: video.id.videoId,
        title: video.snippet.title,
        thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium?.url,
        publishedAt: publishedAt.toISOString(),
        views,
        likes,
        comments,
        duration,
        durationFormatted: parseDuration(duration),
        engagement: engagement.toFixed(1)
      };
    }).filter(v => v.id); // Remove any undefined videos

    // 5. Calculate date ranges for trends
    const now = new Date();
    const currentPeriodStart = new Date(now);
    currentPeriodStart.setDate(now.getDate() - 28);
    const previousPeriodStart = new Date(currentPeriodStart);
    previousPeriodStart.setDate(currentPeriodStart.getDate() - 28);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // 6. Calculate period stats
    const currentVideos = videos.filter(v => new Date(v.publishedAt) >= currentPeriodStart);
    const previousVideos = videos.filter(v => {
      const date = new Date(v.publishedAt);
      return date >= previousPeriodStart && date < currentPeriodStart;
    });

    const currentViews = currentVideos.reduce((sum, v) => sum + v.views, 0);
    const previousViews = previousVideos.reduce((sum, v) => sum + v.views, 0);
    const currentLikes = currentVideos.reduce((sum, v) => sum + v.likes, 0);
    const previousLikes = previousVideos.reduce((sum, v) => sum + v.likes, 0);
    const currentComments = currentVideos.reduce((sum, v) => sum + v.comments, 0);
    const previousComments = previousVideos.reduce((sum, v) => sum + v.comments, 0);

    // 7. Generate daily stats for chart (last 30 days)
    const dailyStats = {};
    videos.forEach(video => {
      const date = video.publishedAt.split('T')[0];
      if (new Date(date) >= thirtyDaysAgo) {
        if (!dailyStats[date]) {
          dailyStats[date] = { views: 0, videos: 0, likes: 0, comments: 0 };
        }
        dailyStats[date].views += video.views;
        dailyStats[date].videos += 1;
        dailyStats[date].likes += video.likes;
        dailyStats[date].comments += video.comments;
      }
    });

    // Fill in missing dates with zeros
    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      if (!dailyStats[dateStr]) {
        dailyStats[dateStr] = { views: 0, videos: 0, likes: 0, comments: 0 };
      }
    }

    const chartData = Object.entries(dailyStats)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 8. Get top videos
    const topVideos = [...videos].sort((a, b) => b.views - a.views).slice(0, 5);
    const recentVideos = [...videos].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)).slice(0, 10);

    // 9. Calculate average engagement
    const avgEngagement = videos.reduce((sum, v) => sum + parseFloat(v.engagement), 0) / (videos.length || 1);

    // 10. Get comment threads for top 3 videos (NEW)
    const commentThreads = [];
    const topVideoIds = topVideos.slice(0, 3).map(v => v.id);
    
    for (const videoId of topVideoIds) {
      try {
        const commentsRes = await axios.get(
          `https://www.googleapis.com/youtube/v3/commentThreads?key=${apiKey}&videoId=${videoId}&part=snippet&maxResults=5`
        );
        commentThreads.push({
          videoId,
          videoTitle: topVideos.find(v => v.id === videoId)?.title,
          comments: commentsRes.data.items?.map(item => ({
            id: item.id,
            author: item.snippet.topLevelComment.snippet.authorDisplayName,
            authorChannelUrl: item.snippet.topLevelComment.snippet.authorChannelUrl,
            text: item.snippet.topLevelComment.snippet.textDisplay,
            likes: item.snippet.topLevelComment.snippet.likeCount,
            publishedAt: item.snippet.topLevelComment.snippet.publishedAt,
            totalReplies: item.snippet.totalReplyCount
          })) || []
        });
      } catch (e) {
        commentThreads.push({ videoId, comments: [], error: "Comments disabled" });
      }
    }

    // 11. Get upcoming live streams from database (NEW)
    const upcomingLiveStreams = await prisma.scheduleEvent.findMany({
      where: {
        title: { contains: "Live", mode: 'insensitive' },
        eventDate: { gte: new Date() }
      },
      take: 5,
      orderBy: { eventDate: 'asc' }
    });

    // 12. Calculate monthly growth for subscribers (estimate based on views)
    const subscribersCount = parseInt(channelStats.statistics.subscriberCount || 0);
    const estimatedSubscriberGrowth = Math.floor(subscribersCount * 0.03); // ~3% monthly growth estimate

    // 13. Get video categories distribution (NEW)
    const categoryCounts = {
      Mass: 0,
      Choir: 0,
      Events: 0,
      Teachings: 0,
      Other: 0
    };
    
    videos.forEach(video => {
      const title = video.title.toLowerCase();
      if (title.includes('mass') || title.includes('eucharist')) categoryCounts.Mass++;
      else if (title.includes('choir') || title.includes('hymn') || title.includes('song')) categoryCounts.Choir++;
      else if (title.includes('event') || title.includes('festival') || title.includes('celebration')) categoryCounts.Events++;
      else if (title.includes('teaching') || title.includes('sermon') || title.includes('homily')) categoryCounts.Teachings++;
      else categoryCounts.Other++;
    });

    // 14. Prepare final response
    const response = {
      success: true,
      channel: {
        id: channelStats.id,
        name: channelStats.snippet.title,
        description: channelStats.snippet.description,
        thumbnail: channelStats.snippet.thumbnails.default?.url,
        bannerUrl: channelStats.snippet.thumbnails.high?.url,
        subscribers: subscribersCount,
        subscriberChange: estimatedSubscriberGrowth,
        subscriberChangePercent: ((estimatedSubscriberGrowth / (subscribersCount - estimatedSubscriberGrowth)) * 100).toFixed(1),
        totalViews: parseInt(channelStats.statistics.viewCount || 0),
        totalVideos: parseInt(channelStats.statistics.videoCount || 0),
        joinedDate: channelStats.snippet.publishedAt,
        country: channelStats.snippet.country || "Kenya"
      },
      
      // KPI Stats for cards
      stats: {
        subscribers: subscribersCount,
        subscribersChange: estimatedSubscriberGrowth,
        views: parseInt(channelStats.statistics.viewCount || 0),
        viewsChange: currentViews,
        viewsChangePercent: calculateChange(currentViews, previousViews).toFixed(1),
        videos: parseInt(channelStats.statistics.videoCount || 0),
        videosChange: currentVideos.length,
        videosChangePercent: calculateChange(currentVideos.length, previousVideos.length).toFixed(1),
        likes: videos.reduce((sum, v) => sum + v.likes, 0),
        likesChange: currentLikes,
        likesChangePercent: calculateChange(currentLikes, previousLikes).toFixed(1),
        comments: videos.reduce((sum, v) => sum + v.comments, 0),
        commentsChange: currentComments,
        commentsChangePercent: calculateChange(currentComments, previousComments).toFixed(1),
        shares: Math.floor(videos.reduce((sum, v) => sum + v.views, 0) * 0.01), // Approximate shares (1% of views)
        sharesChangePercent: 15
      },
      
      // Chart data
      viewsOverTime: chartData,
      
      // Videos
      topVideos,
      recentVideos,
      categoryDistribution: categoryCounts,
      totalVideosCount: videos.length,
      
      // Engagement metrics
      engagementRate: avgEngagement.toFixed(1),
      engagementChange: (avgEngagement - 4.5).toFixed(1),
      avgWatchTime: "4:32",
      watchTimeChange: -0.12,
      
      // Traffic sources (estimates based on YouTube typical patterns)
      trafficSources: {
        youtubeSearch: 45,
        suggestedVideos: 32,
        direct: 15,
        external: 8
      },
      
      // Comments
      recentComments: commentThreads,
      totalComments: videos.reduce((sum, v) => sum + v.comments, 0),
      
      // Geography (sample data - needs Analytics API)
      geography: {
        topCountries: [
          { country: "Kenya", code: "KE", percentage: 85, flag: "🇰🇪" },
          { country: "United States", code: "US", percentage: 5, flag: "🇺🇸" },
          { country: "United Kingdom", code: "GB", percentage: 3, flag: "🇬🇧" },
          { country: "Canada", code: "CA", percentage: 2, flag: "🇨🇦" },
          { country: "Germany", code: "DE", percentage: 1, flag: "🇩🇪" }
        ],
        topCities: [
          { city: "Nairobi", country: "Kenya", percentage: 45 },
          { city: "Mombasa", country: "Kenya", percentage: 15 },
          { city: "Kisumu", country: "Kenya", percentage: 10 },
          { city: "New York", country: "USA", percentage: 3 },
          { city: "London", country: "UK", percentage: 2 }
        ]
      },
      
      // Demographics (sample data)
      demographics: {
        ageGroups: [
          { age: "18-24", percentage: 20, color: "#3b82f6" },
          { age: "25-34", percentage: 40, color: "#10b981" },
          { age: "35-44", percentage: 25, color: "#f59e0b" },
          { age: "45-54", percentage: 10, color: "#ef4444" },
          { age: "55+", percentage: 5, color: "#8b5cf6" }
        ],
        gender: { 
          male: 45, 
          female: 55,
          maleColor: "#3b82f6",
          femaleColor: "#ec4899"
        }
      },
      
      // Insights
      insights: {
        bestDay: "Sunday",
        bestDayViews: 2500,
        peakHour: "10:00",
        peakHourViews: 1800,
        audienceRetention: 62,
        audienceRetentionChange: 5,
        topGeography: "Kenya",
        topGeographyPercentage: 85,
        topAgeGroup: "25-34",
        topAgeGroupPercentage: 40,
        bestPerformingCategory: Object.entries(categoryCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || "Mass",
        deviceBreakdown: {
          mobile: 65,
          desktop: 25,
          tablet: 10
        }
      },
      
      // Upcoming live streams
      upcomingLiveStreams: upcomingLiveStreams.map(stream => ({
        id: stream.id,
        title: stream.title,
        date: stream.eventDate,
        dateFormatted: new Date(stream.eventDate).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        }),
        time: stream.eventTime || "10:00 AM",
        location: stream.location || "ZUCA Chapel",
        description: stream.description
      })),
      
      // Trends comparison
      trends: {
        views: {
          current: currentViews,
          previous: previousViews,
          change: calculateChange(currentViews, previousViews).toFixed(1),
          direction: currentViews >= previousViews ? 'up' : 'down'
        },
        likes: {
          current: currentLikes,
          previous: previousLikes,
          change: calculateChange(currentLikes, previousLikes).toFixed(1),
          direction: currentLikes >= previousLikes ? 'up' : 'down'
        },
        comments: {
          current: currentComments,
          previous: previousComments,
          change: calculateChange(currentComments, previousComments).toFixed(1),
          direction: currentComments >= previousComments ? 'up' : 'down'
        },
        engagement: {
          current: avgEngagement,
          previous: 4.2,
          change: ((avgEngagement - 4.2) / 4.2 * 100).toFixed(1),
          direction: avgEngagement >= 4.2 ? 'up' : 'down'
        }
      },
      
      // Last updated timestamp
      lastUpdated: new Date().toISOString()
    };

    res.json(response);
    
  } catch (error) {
    console.error("YouTube Analytics Error:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: "Failed to fetch YouTube analytics"
    });
  }
});

// ================== GET SINGLE VIDEO DETAILS ==================
app.get("/api/admin/analytics/youtube/video/:videoId", authenticate, requireAdmin, async (req, res) => {
  try {
    const { videoId } = req.params;
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: "YouTube API key not configured" });
    }

    // Get video details
    const videoResponse = await axios.get(
      `https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&id=${videoId}&part=snippet,statistics,contentDetails`
    );

    if (!videoResponse.data.items || videoResponse.data.items.length === 0) {
      return res.status(404).json({ error: "Video not found" });
    }

    const video = videoResponse.data.items[0];
    const stats = video.statistics || {};
    const snippet = video.snippet || {};
    const contentDetails = video.contentDetails || {};

    // Get comments for this video
    let comments = [];
    try {
      const commentsRes = await axios.get(
        `https://www.googleapis.com/youtube/v3/commentThreads?key=${apiKey}&videoId=${videoId}&part=snippet&maxResults=20`
      );
      comments = commentsRes.data.items?.map(item => ({
        id: item.id,
        author: item.snippet.topLevelComment.snippet.authorDisplayName,
        text: item.snippet.topLevelComment.snippet.textDisplay,
        likes: item.snippet.topLevelComment.snippet.likeCount,
        publishedAt: item.snippet.topLevelComment.snippet.publishedAt,
        totalReplies: item.snippet.totalReplyCount
      })) || [];
    } catch (e) {
      // Comments might be disabled
    }

    const response = {
      success: true,
      video: {
        id: videoId,
        title: snippet.title,
        description: snippet.description,
        thumbnail: snippet.thumbnails.high?.url || snippet.thumbnails.medium?.url,
        publishedAt: snippet.publishedAt,
        views: parseInt(stats.viewCount || 0),
        likes: parseInt(stats.likeCount || 0),
        comments: parseInt(stats.commentCount || 0),
        duration: contentDetails.duration,
        durationFormatted: parseDuration(contentDetails.duration),
        engagementRate: stats.viewCount > 0 
          ? ((parseInt(stats.likeCount || 0) + parseInt(stats.commentCount || 0)) / parseInt(stats.viewCount) * 100).toFixed(1)
          : 0,
        tags: snippet.tags || [],
        categoryId: snippet.categoryId,
        channelTitle: snippet.channelTitle
      },
      comments,
      totalComments: comments.length
    };

    res.json(response);
    
  } catch (error) {
    console.error("YouTube Video Details Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ================== GET VIDEOS BY CATEGORY ==================
app.get("/api/admin/analytics/youtube/category/:category", authenticate, requireAdmin, async (req, res) => {
  try {
    const { category } = req.params;
    const apiKey = process.env.YOUTUBE_API_KEY;
    const channelId = process.env.YOUTUBE_CHANNEL_ID || "UCJ7NvR5_ZUwhtM16sJY4anQ";

    if (!apiKey) {
      return res.status(400).json({ error: "YouTube API key not configured" });
    }

    // Get all videos first
    const videosResponse = await axios.get(
      `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet&maxResults=50&type=video`
    );

    const videoIds = videosResponse.data.items.map(v => v.id.videoId).filter(id => id).join(',');
    let videoStats = { data: { items: [] } };
    
    if (videoIds) {
      videoStats = await axios.get(
        `https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&id=${videoIds}&part=statistics`
      );
    }

    // Filter by category based on title keywords
    const categoryKeywords = {
      mass: ['mass', 'eucharist', 'communion', 'liturgy'],
      choir: ['choir', 'hymn', 'song', 'music', 'sing'],
      events: ['event', 'festival', 'celebration', 'conference'],
      teachings: ['teaching', 'sermon', 'homily', 'bible', 'gospel']
    };

    const keywords = categoryKeywords[category.toLowerCase()] || [];
    
    const filteredVideos = videosResponse.data.items
      .map(video => {
        const stats = videoStats.data.items.find(v => v.id === video.id.videoId) || {};
        return {
          id: video.id.videoId,
          title: video.snippet.title,
          thumbnail: video.snippet.thumbnails.medium?.url,
          publishedAt: video.snippet.publishedAt,
          views: parseInt(stats.statistics?.viewCount || 0),
          likes: parseInt(stats.statistics?.likeCount || 0),
          comments: parseInt(stats.statistics?.commentCount || 0)
        };
      })
      .filter(video => {
        if (keywords.length === 0) return true;
        const title = video.title.toLowerCase();
        return keywords.some(keyword => title.includes(keyword));
      })
      .sort((a, b) => b.views - a.views);

    res.json({
      success: true,
      category,
      count: filteredVideos.length,
      videos: filteredVideos
    });
    
  } catch (error) {
    console.error("YouTube Category Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ================== GET CHANNEL PLAYLISTS ==================
app.get("/api/admin/analytics/youtube/playlists", authenticate, requireAdmin, async (req, res) => {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    const channelId = process.env.YOUTUBE_CHANNEL_ID || "UCJ7NvR5_ZUwhtM16sJY4anQ";

    if (!apiKey) {
      return res.status(400).json({ error: "YouTube API key not configured" });
    }

    const playlistsResponse = await axios.get(
      `https://www.googleapis.com/youtube/v3/playlists?key=${apiKey}&channelId=${channelId}&part=snippet,contentDetails&maxResults=20`
    );

    const playlists = playlistsResponse.data.items?.map(playlist => ({
      id: playlist.id,
      title: playlist.snippet.title,
      description: playlist.snippet.description,
      thumbnail: playlist.snippet.thumbnails.medium?.url,
      itemCount: playlist.contentDetails.itemCount,
      publishedAt: playlist.snippet.publishedAt
    })) || [];

    res.json({
      success: true,
      total: playlists.length,
      playlists
    });
    
  } catch (error) {
    console.error("YouTube Playlists Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ================== GET PLAYLIST ITEMS ==================
app.get("/api/admin/analytics/youtube/playlist/:playlistId/items", authenticate, requireAdmin, async (req, res) => {
  try {
    const { playlistId } = req.params;
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: "YouTube API key not configured" });
    }

    const playlistItemsResponse = await axios.get(
      `https://www.googleapis.com/youtube/v3/playlistItems?key=${apiKey}&playlistId=${playlistId}&part=snippet&maxResults=50`
    );

    const videoIds = playlistItemsResponse.data.items.map(item => item.snippet.resourceId.videoId).join(',');
    let videoStats = { data: { items: [] } };
    
    if (videoIds) {
      videoStats = await axios.get(
        `https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&id=${videoIds}&part=statistics`
      );
    }

    const items = playlistItemsResponse.data.items?.map(item => {
      const stats = videoStats.data.items.find(v => v.id === item.snippet.resourceId.videoId) || {};
      return {
        id: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.medium?.url,
        position: item.snippet.position,
        views: parseInt(stats.statistics?.viewCount || 0),
        likes: parseInt(stats.statistics?.likeCount || 0),
        comments: parseInt(stats.statistics?.commentCount || 0),
        publishedAt: item.snippet.publishedAt
      };
    }) || [];

    res.json({
      success: true,
      total: items.length,
      items
    });
    
  } catch (error) {
    console.error("YouTube Playlist Items Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ================== SEARCH YOUTUBE VIDEOS ==================
app.get("/api/admin/analytics/youtube/search", authenticate, requireAdmin, async (req, res) => {
  try {
    const { q, maxResults = 20 } = req.query;
    const apiKey = process.env.YOUTUBE_API_KEY;
    const channelId = process.env.YOUTUBE_CHANNEL_ID || "UCJ7NvR5_ZUwhtM16sJY4anQ";

    if (!apiKey) {
      return res.status(400).json({ error: "YouTube API key not configured" });
    }

    if (!q || q.trim() === '') {
      return res.status(400).json({ error: "Search query required" });
    }

    const searchResponse = await axios.get(
      `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet&q=${encodeURIComponent(q)}&maxResults=${maxResults}&type=video`
    );

    const videoIds = searchResponse.data.items.map(v => v.id.videoId).filter(id => id).join(',');
    let videoStats = { data: { items: [] } };
    
    if (videoIds) {
      videoStats = await axios.get(
        `https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&id=${videoIds}&part=statistics`
      );
    }

    const videos = searchResponse.data.items?.map(video => {
      const stats = videoStats.data.items.find(v => v.id === video.id.videoId) || {};
      return {
        id: video.id.videoId,
        title: video.snippet.title,
        thumbnail: video.snippet.thumbnails.medium?.url,
        publishedAt: video.snippet.publishedAt,
        views: parseInt(stats.statistics?.viewCount || 0),
        likes: parseInt(stats.statistics?.likeCount || 0),
        comments: parseInt(stats.statistics?.commentCount || 0)
      };
    }) || [];

    res.json({
      success: true,
      query: q,
      total: videos.length,
      videos
    });
    
  } catch (error) {
    console.error("YouTube Search Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ================== EXPORT ANALYTICS REPORT ==================
app.get("/api/admin/analytics/youtube/export", authenticate, requireAdmin, async (req, res) => {
  try {
    const { format = 'json', period = '30d' } = req.query;
    const channelId = process.env.YOUTUBE_CHANNEL_ID || "UCJ7NvR5_ZUwhtM16sJY4anQ";
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: "YouTube API key not configured" });
    }

    // Fetch all data
    const channelResponse = await axios.get(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`
    );
    
    const videosResponse = await axios.get(
      `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet&maxResults=50&type=video`
    );

    const videoIds = videosResponse.data.items.map(v => v.id.videoId).filter(id => id).join(',');
    let videoStats = { data: { items: [] } };
    
    if (videoIds) {
      videoStats = await axios.get(
        `https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&id=${videoIds}&part=statistics,contentDetails`
      );
    }

    const videos = videosResponse.data.items.map(video => {
      const stats = videoStats.data.items.find(v => v.id === video.id.videoId) || {};
      const snippet = video.snippet;
      
      return {
        videoId: video.id.videoId,
        title: snippet.title,
        publishedAt: snippet.publishedAt,
        views: parseInt(stats.statistics?.viewCount || 0),
        likes: parseInt(stats.statistics?.likeCount || 0),
        comments: parseInt(stats.statistics?.commentCount || 0),
        duration: stats.contentDetails?.duration || 'PT0S',
        engagementRate: stats.statistics?.viewCount > 0 
          ? ((parseInt(stats.statistics?.likeCount || 0) + parseInt(stats.statistics?.commentCount || 0)) / parseInt(stats.statistics?.viewCount) * 100).toFixed(2)
          : 0
      };
    }).filter(v => v.videoId);

    const channel = channelResponse.data.items[0];

    const report = {
      generatedAt: new Date().toISOString(),
      period,
      channel: {
        name: channel.snippet.title,
        subscribers: parseInt(channel.statistics.subscriberCount || 0),
        totalViews: parseInt(channel.statistics.viewCount || 0),
        totalVideos: parseInt(channel.statistics.videoCount || 0)
      },
      summary: {
        totalVideos: videos.length,
        totalViews: videos.reduce((sum, v) => sum + v.views, 0),
        totalLikes: videos.reduce((sum, v) => sum + v.likes, 0),
        totalComments: videos.reduce((sum, v) => sum + v.comments, 0),
        averageEngagement: (videos.reduce((sum, v) => sum + parseFloat(v.engagementRate), 0) / (videos.length || 1)).toFixed(2)
      },
      topVideos: [...videos].sort((a, b) => b.views - a.views).slice(0, 10),
      videos
    };

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = ['Video ID', 'Title', 'Published Date', 'Views', 'Likes', 'Comments', 'Duration', 'Engagement Rate (%)'];
      const csvRows = videos.map(v => [
        v.videoId,
        `"${v.title.replace(/"/g, '""')}"`,
        v.publishedAt,
        v.views,
        v.likes,
        v.comments,
        v.duration,
        v.engagementRate
      ]);
      
      const csvContent = [csvHeaders, ...csvRows].map(row => row.join(',')).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=youtube-analytics-${new Date().toISOString().split('T')[0]}.csv`);
      return res.send(csvContent);
    }
    
    res.json(report);
    
  } catch (error) {
    console.error("YouTube Export Error:", error);
    res.status(500).json({ error: error.message });
  }
});

console.log("✅ YouTube Analytics Routes loaded successfully");


// ================== YOUTUBE WEBHOOK / POLLING SYSTEM ==================

// Store last known video IDs and live status
let lastVideoIds = new Set();
let lastLiveVideoId = null;
let lastCheckTime = new Date();

// Function to fetch latest videos and check for new ones
async function checkYouTubeForUpdates() {
  try {
    const channelId = process.env.YOUTUBE_CHANNEL_ID || "UCJ7NvR5_ZUwhtM16sJY4anQ";
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
      console.log("⚠️ YouTube API key not configured - skipping check");
      return;
    }
    
    // Get latest videos
    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet&order=date&maxResults=10&type=video`
    );
    
    const videos = response.data.items || [];
    const currentVideoIds = new Set();
    let newVideoFound = null;
    let isLiveNow = false;
    let liveVideo = null;
    
    for (const video of videos) {
      const videoId = video.id.videoId;
      const isLive = video.snippet.liveBroadcastContent === 'live';
      const isUpcoming = video.snippet.liveBroadcastContent === 'upcoming';
      
      currentVideoIds.add(videoId);
      
      // Check for live stream
      if (isLive) {
        isLiveNow = true;
        liveVideo = video;
      }
      
      // Check for new video (not in our stored set)
      if (!lastVideoIds.has(videoId)) {
        newVideoFound = video;
      }
    }
    
    // NEW VIDEO DETECTED - Send notification
// Only notify if video was published in the last 1 hour
const videoDate = new Date(newVideoFound.snippet.publishedAt);
const hoursSinceUpload = (Date.now() - videoDate.getTime()) / (1000 * 60 * 60);
if (newVideoFound && !lastVideoIds.has(newVideoFound.id.videoId) && hoursSinceUpload < 1) {      console.log(`🎬 NEW VIDEO DETECTED: ${newVideoFound.snippet.title}`);
      
      const videoDetails = await axios.get(
        `https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&id=${newVideoFound.id.videoId}&part=snippet,statistics`
      );
      
      const videoData = videoDetails.data.items?.[0] || {};
      const stats = videoData.statistics || {};
      
      const notificationTitle = "📹 NEW VIDEO UPLOADED!";
      const notificationMessage = `${newVideoFound.snippet.title}\n\n👁️ ${parseInt(stats.viewCount || 0).toLocaleString()} views\n👍 ${parseInt(stats.likeCount || 0).toLocaleString()} likes`;
      
      // Send to ALL users
      const allUsers = await prisma.user.findMany({ select: { id: true } });
      for (const user of allUsers) {
        await createAndSendNotification({
          userId: user.id,
          type: "youtube_new_video",
          title: notificationTitle,
          message: notificationMessage,
          data: {
            videoId: newVideoFound.id.videoId,
            videoTitle: newVideoFound.snippet.title,
            videoThumbnail: newVideoFound.snippet.thumbnails.high?.url,
            videoUrl: `https://www.youtube.com/watch?v=${newVideoFound.id.videoId}`,
            type: "new_video"
          }
        });
      }
      
      console.log(`✅ Sent ${allUsers.length} notifications for new video`);
    }
    
    // LIVE STREAM DETECTED
    if (isLiveNow && lastLiveVideoId !== liveVideo?.id.videoId) {
      console.log(`🔴 LIVE STREAM DETECTED: ${liveVideo?.snippet.title}`);
      
      const notificationTitle = "🔴Zetech University Catholic Action IS LIVE NOW!";
      const notificationMessage = `${liveVideo?.snippet.title}\n\nWatch live now on ZUCA!`;
      
      const allUsers = await prisma.user.findMany({ select: { id: true } });
      for (const user of allUsers) {
        await createAndSendNotification({
          userId: user.id,
          type: "youtube_live",
          title: notificationTitle,
          message: notificationMessage,
          data: {
            videoId: liveVideo.id.videoId,
            videoTitle: liveVideo.snippet.title,
            videoThumbnail: liveVideo.snippet.thumbnails.high?.url,
            videoUrl: `https://www.youtube.com/watch?v=${liveVideo.id.videoId}`,
            type: "live_now"
          }
        });
      }
      
      lastLiveVideoId = liveVideo?.id.videoId;
      console.log(`✅ Sent ${allUsers.length} notifications for live stream`);
    }
    
    // Update stored IDs
    lastVideoIds = currentVideoIds;
    lastCheckTime = new Date();
    
  } catch (error) {
    console.error("❌ YouTube check error:", error.message);
  }
}


// Run immediately on startup
setTimeout(() => {
  checkYouTubeForUpdates();
}, 5000);

// ================== MANUAL NOTIFICATION TRIGGERS ==================

// Admin endpoint to manually send notification about new video
app.post("/api/admin/youtube/notify-new-video", authenticate, requireAdmin, async (req, res) => {
  try {
    const { videoId, videoTitle, videoThumbnail } = req.body;
    
    if (!videoId || !videoTitle) {
      return res.status(400).json({ error: "videoId and videoTitle required" });
    }
    
    const allUsers = await prisma.user.findMany({ select: { id: true } });
    
    for (const user of allUsers) {
      await createAndSendNotification({
        userId: user.id,
        type: "youtube_new_video",
        title: "📹 NEW YOUTUBE VIDEO UPLOADED!",
        message: `${videoTitle}\n\nClick to watch on ZUCA!`,
        data: {
          videoId: videoId,
          videoTitle: videoTitle,
          videoThumbnail: videoThumbnail,
          videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
          type: "new_video"
        }
      });
    }
    
    res.json({ 
      success: true, 
      message: `Sent ${allUsers.length} notifications for new video: ${videoTitle}` 
    });
    
  } catch (error) {
    console.error("Error sending video notification:", error);
    res.status(500).json({ error: error.message });
  }
});

// Admin endpoint to manually notify about live stream
app.post("/api/admin/youtube/notify-live", authenticate, requireAdmin, async (req, res) => {
  try {
    const { videoId, videoTitle, videoThumbnail } = req.body;
    
    if (!videoId || !videoTitle) {
      return res.status(400).json({ error: "videoId and videoTitle required" });
    }
    
    const allUsers = await prisma.user.findMany({ select: { id: true } });
    
    for (const user of allUsers) {
      await createAndSendNotification({
        userId: user.id,
        type: "youtube_live",
        title: "🔴ZUCA IS LIVE NOW!",
        message: `${videoTitle}\n\nWatch live now on ZUCA!`,
        data: {
          videoId: videoId,
          videoTitle: videoTitle,
          videoThumbnail: videoThumbnail,
          videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
          type: "live_now"
        }
      });
    }
    
    res.json({ 
      success: true, 
      message: `Sent ${allUsers.length} notifications for live stream: ${videoTitle}` 
    });
    
  } catch (error) {
    console.error("Error sending live notification:", error);
    res.status(500).json({ error: error.message });
  }
});


// ================== NOTIFICATION SUBSCRIPTION ==================

app.post("/api/notifications/subscribe", authenticate, async (req, res) => {
  try {
    const { subscription } = req.body;
    const userId = req.user.userId;

    if (!subscription) {
      return res.status(400).json({ error: "Subscription object required" });
    }

    console.log(`📱 Saving push subscription for user: ${userId}`);

    // Check if subscription already exists
    const existing = await prisma.pushSubscription.findUnique({
      where: { userId }
    });

    if (existing) {
      // Update existing
      await prisma.pushSubscription.update({
        where: { userId },
        data: { 
          subscription: JSON.stringify(subscription),
          updatedAt: new Date()
        }
      });
    } else {
      // Create new
      await prisma.pushSubscription.create({
        data: {
          userId,
          subscription: JSON.stringify(subscription)
        }
      });
    }

    console.log(`✅ Push subscription saved for user: ${userId}`);
    res.json({ success: true, message: "Subscription saved" });
    
  } catch (error) {
    console.error("❌ Error saving subscription:", error);
    res.status(500).json({ error: error.message });
  }
});

// ================== PUBLIC YOUTUBE ROUTE FOR USERS ==================

// Get latest YouTube videos for user page (NO AUTH NEEDED)
app.get("/api/youtube/latest", async (req, res) => {
  try {
    const channelId = process.env.YOUTUBE_CHANNEL_ID || "UCJ7NvR5_ZUwhtM16sJY4anQ";
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
      return res.status(400).json({ error: "YouTube API key not configured" });
    }
    
    // Get latest videos
    const videosResponse = await axios.get(
      `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet&order=date&maxResults=20&type=video`
    );
    
    const videoIds = videosResponse.data.items.map(v => v.id.videoId).filter(id => id).join(',');
    
    let videoStats = { data: { items: [] } };
    if (videoIds) {
      videoStats = await axios.get(
        `https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&id=${videoIds}&part=statistics`
      );
    }
    
    // Get channel info
    const channelResponse = await axios.get(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`
    );
    
    const channel = channelResponse.data.items?.[0] || {};
    const isLive = videosResponse.data.items.some(v => v.snippet.liveBroadcastContent === 'live');
    const liveVideo = videosResponse.data.items.find(v => v.snippet.liveBroadcastContent === 'live');
    
    const videos = videosResponse.data.items.map(video => {
      const stats = videoStats.data.items.find(v => v.id === video.id.videoId) || {};
      const isLiveVideo = video.snippet.liveBroadcastContent === 'live';
      const isUpcoming = video.snippet.liveBroadcastContent === 'upcoming';
      
      return {
        id: video.id.videoId,
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium?.url,
        publishedAt: video.snippet.publishedAt,
        views: parseInt(stats.statistics?.viewCount || 0),
        likes: parseInt(stats.statistics?.likeCount || 0),
        comments: parseInt(stats.statistics?.commentCount || 0),
        isLive: isLiveVideo,
        isUpcoming: isUpcoming
      };
    });
    
    res.json({
      success: true,
      channel: {
        name: channel.snippet?.title || "ZUCA Channel",
        subscribers: parseInt(channel.statistics?.subscriberCount || 0),
        totalViews: parseInt(channel.statistics?.viewCount || 0),
        totalVideos: parseInt(channel.statistics?.videoCount || 0),
        thumbnail: channel.snippet?.thumbnails?.default?.url,
        description: channel.snippet?.description
      },
      isLive: isLive,
      liveVideo: liveVideo ? {
        id: liveVideo.id.videoId,
        title: liveVideo.snippet.title,
        thumbnail: liveVideo.snippet.thumbnails.high?.url
      } : null,
      videos: videos,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Error fetching YouTube videos:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get single video details
app.get("/api/youtube/video/:videoId", async (req, res) => {
  try {
    const { videoId } = req.params;
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
      return res.status(400).json({ error: "YouTube API key not configured" });
    }
    
    const videoResponse = await axios.get(
      `https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&id=${videoId}&part=snippet,statistics,contentDetails`
    );
    
    const video = videoResponse.data.items?.[0];
    
    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }
    
    const stats = video.statistics || {};
    const snippet = video.snippet || {};
    const contentDetails = video.contentDetails || {};
    
    res.json({
      success: true,
      video: {
        id: videoId,
        title: snippet.title,
        description: snippet.description,
        thumbnail: snippet.thumbnails.high?.url,
        publishedAt: snippet.publishedAt,
        views: parseInt(stats.viewCount || 0),
        likes: parseInt(stats.likeCount || 0),
        comments: parseInt(stats.commentCount || 0),
        duration: contentDetails.duration,
        tags: snippet.tags || [],
        channelTitle: snippet.channelTitle
      }
    });
    
  } catch (error) {
    console.error("Error fetching video:", error);
    res.status(500).json({ error: error.message });
  }
});

console.log("✅ YouTube notification routes loaded successfully!");

// ================== PUBLIC YOUTUBE SEARCH - SEARCH ANYTHING ON YOUTUBE ==================
app.get("/api/youtube/search-any", async (req, res) => {
  try {
    const { q, maxResults = 20 } = req.query;
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: "YouTube API key not configured" });
    }

    if (!q || q.trim() === '') {
      return res.status(400).json({ error: "Search query required" });
    }

    console.log(`🔍 Searching entire YouTube: "${q}"`);

    // Search ALL of YouTube (no channel filter)
    const searchResponse = await axios.get(
      `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&part=snippet&q=${encodeURIComponent(q)}&maxResults=${maxResults}&type=video`
    );

    const videoIds = searchResponse.data.items.map(v => v.id.videoId).filter(id => id).join(',');
    let videoStats = { data: { items: [] } };
    
    if (videoIds) {
      videoStats = await axios.get(
        `https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&id=${videoIds}&part=statistics`
      );
    }

    const videos = searchResponse.data.items?.map(video => {
      const stats = videoStats.data.items.find(v => v.id === video.id.videoId) || {};
      return {
        id: video.id.videoId,
        title: video.snippet.title,
        description: video.snippet.description,
        channelTitle: video.snippet.channelTitle,
        channelId: video.snippet.channelId,
        thumbnail: video.snippet.thumbnails.medium?.url,
        publishedAt: video.snippet.publishedAt,
        views: parseInt(stats.statistics?.viewCount || 0),
        likes: parseInt(stats.statistics?.likeCount || 0),
        comments: parseInt(stats.statistics?.commentCount || 0)
      };
    }) || [];

    res.json({
      success: true,
      query: q,
      total: videos.length,
      videos: videos
    });
    
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ====================
// SIMPLE PAGINATED SONGS
// ====================
app.get("/api/songs", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    
    const skip = (page - 1) * limit;
    
    // Build where clause for search
    const where = search ? {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { lyrics: { contains: search, mode: 'insensitive' } }
      ]
    } : {};
    
    // Get total count for pagination
    const total = await prisma.song.count({ where });
    
    // Get paginated songs
    const songs = await prisma.song.findMany({
      where,
      select: {
        id: true,
        title: true,
        reference: true,
        lyrics: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    });
    
    // Add first line preview
    const songsWithPreview = songs.map(song => {
      let firstLine = '';
      if (song.lyrics) {
        const lines = song.lyrics.split('\n').filter(line => line.trim() !== '');
        firstLine = lines[0] || '';
        if (firstLine.length > 60) {
          firstLine = firstLine.substring(0, 60) + '...';
        }
      }
      return {
        id: song.id,
        title: song.title,
        reference: song.reference,
        firstLine,
        createdAt: song.createdAt
      };
    });
    
    res.json({
      songs: songsWithPreview,
      hasMore: page * limit < total,
      total
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/songs/:id - Get single song with full lyrics
app.get("/api/songs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const song = await prisma.song.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        lyrics: true,
        reference: true,
        createdAt: true
      }
    });
    
    if (!song) {
      return res.status(404).json({ error: "Song not found" });
    }
    
    // Clean HTML tags from lyrics for display
    if (song.lyrics) {
      song.lyrics = song.lyrics.replace(/<[^>]*>/g, '');
    }
    
    res.json(song);
  } catch (err) {
    console.error("Error fetching song:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/songs/search?q=... - Search songs by title or lyrics
app.get("/api/songs/search", async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim() === '') {
      return res.json([]);
    }
    
    const searchTerm = q.trim();
    
    const songs = await prisma.song.findMany({
      where: {
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { lyrics: { contains: searchTerm, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        title: true,
        reference: true,
        lyrics: true
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    
    // Add preview and highlight match
    const results = songs.map(song => {
      // Clean lyrics for preview
      const cleanLyrics = song.lyrics ? song.lyrics.replace(/<[^>]*>/g, '') : '';
      
      let preview = '';
      let matchType = 'title';
      
      if (song.title.toLowerCase().includes(searchTerm.toLowerCase())) {
        matchType = 'title';
        preview = song.title;
      } else if (cleanLyrics.toLowerCase().includes(searchTerm.toLowerCase())) {
        matchType = 'lyrics';
        // Find the line where the term appears
        const lines = cleanLyrics.split('\n');
        const matchingLine = lines.find(line => 
          line.toLowerCase().includes(searchTerm.toLowerCase())
        );
        preview = matchingLine || '';
        if (preview.length > 60) {
          const index = preview.toLowerCase().indexOf(searchTerm.toLowerCase());
          const start = Math.max(0, index - 20);
          const end = Math.min(preview.length, index + searchTerm.length + 20);
          preview = (start > 0 ? '...' : '') + 
                    preview.substring(start, end) + 
                    (end < preview.length ? '...' : '');
        }
      }
      
      return {
        id: song.id,
        title: song.title,
        reference: song.reference,
        matchType,
        preview
      };
    });
    
    res.json(results);
  } catch (err) {
    console.error("Error searching songs:", err);
    res.status(500).json({ error: err.message });
  }
});


// ====================
// ADMIN SONGS ROUTES (with full lyrics)
// ====================

// GET /api/admin/songs - Get all songs with full lyrics (WITH PAGINATION)
app.get("/api/admin/songs", authenticate, async (req, res) => {
  try {
    // Check if user is admin
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId } 
    });
    
const isAdmin = user.role === "admin" || user.specialRole === "admin";    const isSecretary = user.specialRole === "secretary";
    const isChoirModerator = user.specialRole === "choir_moderator";
    
    if (!isAdmin && !isSecretary && !isChoirModerator) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Get pagination parameters from query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    
    const skip = (page - 1) * limit;
    
    // Build search condition
    const where = search ? {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } }
      ]
    } : {};
    
    // Get total count for pagination
    const total = await prisma.song.count({ where });
    
    // Get paginated songs
    const songs = await prisma.song.findMany({
      where,
      select: {
        id: true,
        title: true,
        reference: true,
        lyrics: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    });

    // Add first line preview for convenience
    const songsWithPreview = songs.map(song => {
      let firstLine = '';
      if (song.lyrics) {
        const lines = song.lyrics.split('\n').filter(line => line.trim() !== '');
        firstLine = lines[0] || '';
        if (firstLine.length > 60) {
          firstLine = firstLine.substring(0, 60) + '...';
        }
      }
      
      return {
        ...song,
        firstLine
      };
    });

    // Return paginated response
    res.json({
      songs: songsWithPreview,
      hasMore: page * limit < total,
      total
    });
  } catch (err) {
    console.error("Error fetching admin songs:", err);
    res.status(500).json({ error: err.message });
  }
});

// songs/:id - Get single song with full lyrics
app.get("/api/admin/songs/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user is admin
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId } 
    });
    
const isAdmin = user.role === "admin" || user.specialRole === "admin";    const isSecretary = user.specialRole === "secretary";
    const isChoirModerator = user.specialRole === "choir_moderator";
    
    if (!isAdmin && !isSecretary && !isChoirModerator) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const song = await prisma.song.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        reference: true,
        lyrics: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!song) {
      return res.status(404).json({ error: "Song not found" });
    }

    res.json(song);
  } catch (err) {
    console.error("Error fetching song:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/songs - Create new song
app.post("/api/admin/songs", authenticate, async (req, res) => {
  try {
    const { title, reference, lyrics } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId } 
    });
    
const isAdmin = user.role === "admin" || user.specialRole === "admin";    const isSecretary = user.specialRole === "secretary";
    const isChoirModerator = user.specialRole === "choir_moderator";
    
    if (!isAdmin && !isSecretary && !isChoirModerator) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Check if song already exists
    const existing = await prisma.song.findFirst({
      where: { 
        title: {
          equals: title,
          mode: 'insensitive'
        }
      }
    });

    if (existing) {
      return res.status(400).json({ error: "A song with this title already exists" });
    }

    const song = await prisma.song.create({
      data: {
        title,
        reference: reference || null,
        lyrics: lyrics || null
      }
    });

    // Add first line for response
    let firstLine = '';
    if (song.lyrics) {
      const lines = song.lyrics.split('\n').filter(line => line.trim() !== '');
      firstLine = lines[0] || '';
    }

    res.status(201).json({
      ...song,
      firstLine
    });
  } catch (err) {
    console.error("Error creating song:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/songs/:id - Update song
app.put("/api/admin/songs/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, reference, lyrics } = req.body;

    // Check if user is admin
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId } 
    });
    
const isAdmin = user.role === "admin" || user.specialRole === "admin";    const isSecretary = user.specialRole === "secretary";
    const isChoirModerator = user.specialRole === "choir_moderator";
    
    if (!isAdmin && !isSecretary && !isChoirModerator) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const song = await prisma.song.update({
      where: { id },
      data: {
        title,
        reference: reference || null,
        lyrics: lyrics || null
      }
    });

    // Add first line for response
    let firstLine = '';
    if (song.lyrics) {
      const lines = song.lyrics.split('\n').filter(line => line.trim() !== '');
      firstLine = lines[0] || '';
    }

    res.json({
      ...song,
      firstLine
    });
  } catch (err) {
    console.error("Error updating song:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/songs/:id - Delete song
app.delete("/api/admin/songs/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is admin
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId } 
    });
    
const isAdmin = user.role === "admin" || user.specialRole === "admin";    const isSecretary = user.specialRole === "secretary";
    const isChoirModerator = user.specialRole === "choir_moderator";
    
    if (!isAdmin && !isSecretary && !isChoirModerator) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await prisma.song.delete({
      where: { id }
    });

    res.json({ message: "Song deleted successfully" });
  } catch (err) {
    console.error("Error deleting song:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET all pending songs (for admin page)
app.get("/api/admin/pending-songs", authenticate, async (req, res) => {
  try {
    // Check if user is admin or choir_moderator
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId } 
    });
    
const isAdmin = user.role === "admin" || user.specialRole === "admin";    const isChoirModerator = user.specialRole === "choir_moderator";
    
    if (!isAdmin && !isChoirModerator) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const pendingSongs = await prisma.pendingSong.findMany({
      where: { status: "pending" },
      include: {
        program: {
          select: {
            date: true,
            venue: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(pendingSongs);
  } catch (err) {
    console.error("Error fetching pending songs:", err);
    res.status(500).json({ error: err.message });
  }
});


// Mark pending song as completed (when admin adds lyrics)
app.put("/api/admin/pending-songs/:id/complete", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId } 
    });
    
const isAdmin = user.role === "admin" || user.specialRole === "admin";    const isChoirModerator = user.specialRole === "choir_moderator";
    
    if (!isAdmin && !isChoirModerator) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await prisma.pendingSong.update({
      where: { id },
      data: { status: "completed" }
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Error completing pending song:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE pending song (admin/choir moderator only)
app.delete("/api/admin/pending-songs/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Check authorization
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId } 
    });
    
    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isChoirModerator = user.specialRole === "choir_moderator";
    
    if (!isAdmin && !isChoirModerator) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Check if pending song exists
    const pendingSong = await prisma.pendingSong.findUnique({
      where: { id }
    });

    if (!pendingSong) {
      return res.status(404).json({ error: "Pending song not found" });
    }

    // Delete the pending song
    await prisma.pendingSong.delete({
      where: { id }
    });

    res.json({ success: true, message: "Pending song deleted successfully" });
  } catch (err) {
    console.error("Error deleting pending song:", err);
    res.status(500).json({ error: err.message });
  }
});


app.get("/api/sitemap", async (req, res) => {
  try {
const baseUrl = "https://www.zetechcatholicaction.com";    
    const songs = await prisma.song.findMany({
      select: { title: true },
      orderBy: { createdAt: 'desc' }
    });
    
    // List of titles to exclude
    const excludeTitles = ['Na', 'Nah', 'Na5', 'Na0', 'Nap', 'API', '?NA', '%3FNA', ''];
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${baseUrl}/</loc><priority>1.0</priority></url>
  <url><loc>${baseUrl}/home</loc></url>
  <url><loc>${baseUrl}/login</loc></url>
  <url><loc>${baseUrl}/register</loc></url>
  <url><loc>${baseUrl}/announcements</loc></url>
  <url><loc>${baseUrl}/mass-programs</loc></url>
  <url><loc>${baseUrl}/gallery</loc></url>
  <url><loc>${baseUrl}/prayer</loc></url>
  <url><loc>${baseUrl}/hymns</loc></url>`;
    
    songs.forEach(song => {
      // Clean the title
      let cleanTitle = song.title
        .replace(/[(){}[\],']/g, '')      // Remove parentheses, brackets, commas
        .replace(/\n/g, ' ')              // Replace newlines with spaces
        .replace(/\s+/g, ' ')             // Remove extra spaces
        .trim();
      
      // Skip if title is empty or in exclude list
      if (!cleanTitle || cleanTitle.length < 2) return;
      if (excludeTitles.includes(cleanTitle)) return;
      if (excludeTitles.some(t => cleanTitle.includes(t) && cleanTitle.length < 5)) return;
      
      // Skip URLs that start with problematic characters
      if (cleanTitle.startsWith('?') || cleanTitle.startsWith('%')) return;
      
      const title = encodeURIComponent(cleanTitle);
      xml += `<url><loc>${baseUrl}/hymn/${title}</loc><priority>0.6</priority></url>`;
    });
    
    xml += `</urlset>`;
    
    res.header('Content-Type', 'application/xml');
    res.send(xml);
    
  } catch (err) {
    console.error("Sitemap error:", err);
    res.status(500).send('Error generating sitemap');
  }
});



// ================== UPDATE LAST ACTIVE ==================
async function updateLastActive(req, res, next) {
  if (req.user?.userId) {
    try {
      await prisma.user.update({
        where: { id: req.user.userId },
        data: { lastActive: new Date() },
      });
    } catch (err) {
      console.error("Failed to update lastActive:", err.message);
    }
  }
  next();
}

// ================== AUTH ROUTES ==================
app.post("/api/auth/request", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) return res.status(404).json({ error: "No account found with this email." });

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { email },
      data: { 
        resetCode, 
        resetCodeExpiry: expiry 
      },
    });

    await sendPasswordResetEmail(user.email, resetCode);
    res.json({ message: "Reset code sent! Check your inbox." });

  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ error: "Failed to send email. Check backend logs." });
  }
});

app.post("/api/auth/verify", async (req, res) => {
  const { email, code, newPassword } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user || user.resetCode !== code) {
      return res.status(400).json({ error: "Invalid reset code." });
    }

    if (new Date() > user.resetCodeExpiry) {
      return res.status(400).json({ error: "Code has expired. Request a new one." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email },
      data: { 
        password: hashedPassword, 
        resetCode: null, 
        resetCodeExpiry: null 
      },
    });

    res.json({ message: "Password updated successfully! You can now log in." });

  } catch (err) {
    console.error("Verify Error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});




// ================== REGISTER - NO SAVE UNTIL VERIFIED ==================
app.post("/api/register", async (req, res) => {
  try {
    console.log("🔵 STEP 1: Registration started");
    const { fullName, email, password, phone } = req.body;
    console.log("🔵 STEP 2: Data received", { fullName, email, phone });

    const normalizedEmail = email.toLowerCase();
    
    let formattedPhone = phone;
    if (phone.startsWith("07")) {
      formattedPhone = "+254" + phone.slice(1);
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingEmail) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const existingPhone = await prisma.user.findUnique({
      where: { phone: formattedPhone },
    });
    if (existingPhone) {
      return res.status(400).json({ error: "Phone already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    
    console.log("🔵 STEP 3: About to generate verification code");
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpiry = new Date(Date.now() + 15 * 60 * 1000);
    console.log("🔵 STEP 4: Code generated");

    console.log("🔵 STEP 5: About to store in pendingRegistrations");
    const pendingKey = `${normalizedEmail}`;
    pendingRegistrations.set(pendingKey, {
      fullName,
      email: normalizedEmail,
      password: hashed,
      phone: formattedPhone,
      role: "member",
      verificationCode,
      verificationExpiry,
      createdAt: new Date()
    });
    console.log("🔵 STEP 6: Stored in pendingRegistrations (without membership number)");

    setTimeout(() => {
      if (pendingRegistrations.has(pendingKey)) {
        pendingRegistrations.delete(pendingKey);
      }
    }, 15 * 60 * 1000);
    console.log("🔵 STEP 7: Cleanup timer set");

    console.log("🔵 STEP 8: About to fire email (async)");
    (async () => {
      try {
        console.log(`📧 Sending email to ${normalizedEmail}`);
        const tempUser = { email: normalizedEmail, fullName: fullName };
        await sendVerificationEmail(tempUser, verificationCode);
        console.log(`✅ Verification email sent to ${normalizedEmail}`);
      } catch (err) {
        console.error(`❌ Verification email failed:`, err.message);
      }
    })();
    console.log("🔵 STEP 9: Email fire-and-forget triggered");

    console.log("🔵 STEP 10: About to send response");
    res.json({
      success: true,
      message: "Verification code sent to your email. Please verify to complete registration.",
      email: normalizedEmail,
      requiresVerification: true
    });
    console.log("🔵 STEP 11: Response sent successfully ✅");

  } catch (err) {
    console.error("❌ Registration Error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

// ================== VERIFY EMAIL & THEN SAVE TO DATABASE ==================
app.post("/api/verify-email", async (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ error: "Email and verification code required" });
    }
    
    const normalizedEmail = email.toLowerCase();
    const pendingUser = pendingRegistrations.get(normalizedEmail);
    
    if (!pendingUser) {
      return res.status(404).json({ error: "No pending registration found or code expired" });
    }
    
    if (String(pendingUser.verificationCode) !== String(code)) {
      return res.status(400).json({ error: "Invalid verification code" });
    }
    
    if (pendingUser.verificationExpiry && new Date() > pendingUser.verificationExpiry) {
      pendingRegistrations.delete(normalizedEmail);
      return res.status(400).json({ error: "Verification code has expired. Please register again." });
    }
    
    const membershipNumber = await getNextAvailableMembershipNumber();
    
    console.log(`📊 Creating user with membership: ${membershipNumber}`);
    
    const user = await prisma.user.create({
      data: {
        fullName: pendingUser.fullName,
        email: pendingUser.email,
        password: pendingUser.password,
        phone: pendingUser.phone,
        membership_number: membershipNumber,
        role: pendingUser.role,
        emailVerified: true,
        lastActive: new Date()
      }
    });
    
    pendingRegistrations.delete(normalizedEmail);
    
    (async () => {
      try {
        await sendWelcomeEmail(user, user.membership_number);
        console.log(`✅ Welcome email sent to ${user.email}`);
      } catch (err) {
        console.error(`❌ Welcome email failed:`, err.message);
      }
    })();
    
    const token = jwt.sign(
      { userId: user.id, role: user.role, emailVerified: true },
      JWT_SECRET,
      { expiresIn: "365d" }
    );
    
    res.json({
      success: true,
      message: "Email verified successfully! Account created.",
      token: token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        emailVerified: true,
        membership_number: user.membership_number
      }
    });
    
  } catch (err) {
    console.error("Verification error:", err);
    
    if (err.code === 'P2002') {
      return res.status(409).json({ 
        error: "Membership number conflict. Please try registering again." 
      });
    }
    
    res.status(500).json({ error: err.message });
  }
});

// ================== ADD THIS AT THE TOP OF server.js ==================
// Store pending registrations in memory (resets when server restarts)

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "365d" });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastActive: new Date() },
    });

    // ✅ SEND RESPONSE IMMEDIATELY - User gets logged in right away
    res.json({ token, user });
    
    // ✅ THEN do the slow admin notifications in the background
    // Don't await this - let it happen after user already got their response
    notifyAdminsOfLogin(user).catch(err => console.error("Admin notification failed:", err));
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Move admin notification logic to a separate function
async function notifyAdminsOfLogin(loggedInUser) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: { id: true }
    });
    
    for (const admin of admins) {
      await createAndSendNotification({
        userId: admin.id,
        type: "user_login",
        title: "👤 User Login",
        message: `${loggedInUser.fullName} just logged in`,
        data: {}
      });
    }
  } catch (err) {
    console.error("Failed to notify admins:", err.message);
  }
}



app.post("/api/role-login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase();

    const rolePatterns = [
      { prefix: "stmichael", role: "jumuia_leader", jumuiaCode: "stmichael", jumuiaName: "ST. MICHAEL" },
      { prefix: "stbenedict", role: "jumuia_leader", jumuiaCode: "stbenedict", jumuiaName: "ST. BENEDICT" },
      { prefix: "stperegrine", role: "jumuia_leader", jumuiaCode: "stperegrine", jumuiaName: "ST. PEREGRINE" },
      { prefix: "christtheking", role: "jumuia_leader", jumuiaCode: "christtheking", jumuiaName: "CHRIST THE KING" },
      { prefix: "stgregory", role: "jumuia_leader", jumuiaCode: "stgregory", jumuiaName: "ST. GREGORY" },
      { prefix: "stpacificus", role: "jumuia_leader", jumuiaCode: "stpacificus", jumuiaName: "ST. PACIFICUS" },
      { prefix: "treasurer", role: "treasurer" },
      { prefix: "secretary", role: "secretary" },
      { prefix: "choir", role: "choir_moderator" },
      { prefix: "media", role: "media_moderator" }
    ];

    let matchedRole = null;
    let membershipNumber = null;
    
    for (const pattern of rolePatterns) {
      if (password.startsWith(pattern.prefix)) {
        membershipNumber = password.replace(pattern.prefix, "");
        matchedRole = pattern;
        break;
      }
    }

    if (!matchedRole) {
      return res.status(400).json({ error: "Invalid role login format" });
    }

    let user = await prisma.user.findFirst({
      where: { 
        email: normalizedEmail,
        membership_number: membershipNumber,
        specialRole: matchedRole.role,
        ...(matchedRole.role === "jumuia_leader" && {
          leadingJumuia: { code: matchedRole.jumuiaCode }
        })
      },
      include: { 
        homeJumuia: true,
        leadingJumuia: true 
      }
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    prisma.user.update({
      where: { id: user.id },
      data: { 
        lastRoleLogin: new Date(),
        lastActive: new Date()
      }
    }).catch(err => console.error("Timestamp update failed:", err.message));

    let permissions = [];
    let accessLevel = "role";

    switch(matchedRole.role) {
      case "jumuia_leader":
        permissions = ["view_jumuia", "manage_announcements", "manage_chat"];
        accessLevel = "jumuia_leader";
        break;
      case "treasurer":
        permissions = ["view_contributions", "manage_contributions"];
        accessLevel = "treasurer";
        break;
      case "secretary":
        permissions = ["manage_announcements"];
        accessLevel = "secretary";
        break;
      case "choir_moderator":
        permissions = ["view_mass_programs", "manage_announcements"];
        accessLevel = "choir_moderator";
        break;
      case "media_moderator":  
        permissions = ["manage_media"];
        accessLevel = "media_moderator";
        break;
    }

    const token = jwt.sign(
      { 
        userId: user.id, 
        role: matchedRole.role,
        email: user.email,
        accessLevel,
        permissions,
        jumuiaCode: matchedRole.jumuiaCode || null,
        jumuiaName: matchedRole.jumuiaName || null
      },
      JWT_SECRET,
      { expiresIn: "365h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: matchedRole.role,
        jumuia: matchedRole.jumuiaName || null,
        permissions,
        accessLevel
      }
    });

    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: { id: true }
    });

    if (admins.length > 0) {
      await Promise.allSettled(
        admins.map(admin => 
          createAndSendNotification({
            userId: admin.id,
            type: "user_login",
            title: "👤 Role Login",
            message: `${user.fullName} logged in as ${matchedRole.role}`,
            data: { 
              userId: user.id, 
              userName: user.fullName, 
              role: matchedRole.role,
              jumuia: matchedRole.jumuiaName || null
            }
          })
        )
      );
    }

  } catch (err) {
    console.error("Role login error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});


// ==================== ROLE SWITCHER ====================

// 1. BACKEND — Add this to server.js (near other auth routes)
app.post("/api/switch-role", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { targetRole } = req.body;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, specialRole: true, fullName: true, email: true }
    });
    
    if (!user) return res.status(404).json({ error: "User not found" });
    
    // Switch BACK to member
    if (targetRole === "member") {
      const token = jwt.sign(
        { userId: user.id, role: "member" },
        JWT_SECRET, { expiresIn: "365d" }
      );
      return res.json({ 
        success: true, 
        token, 
        role: "member",
        message: "Switched to Member mode" 
      });
    }
    
  if (user.specialRole === targetRole || user.role === targetRole) {
  let jumuiaCode = null;
  
  if (targetRole === "jumuia_leader") {
    const jumuia = await prisma.jumuia.findFirst({
      where: { leaders: { some: { id: userId } } }
    });
    if (!jumuia) return res.status(403).json({ error: "You are not assigned as a jumuia leader" });
    jumuiaCode = jumuia.code;
  }
  
  const token = jwt.sign(
    { userId: user.id, role: targetRole, jumuiaCode },
    JWT_SECRET, { expiresIn: "365d" }
  );
  return res.json({ 
    success: true, token, role: targetRole, jumuiaCode,
    message: `Switched to ${targetRole} mode` 
  });
}
    
    res.status(403).json({ error: `You don't have the ${targetRole} role` });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ================== TOKEN REFRESH ENDPOINT ==================
app.post("/api/auth/refresh-token", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }
    
    // Verify the existing token (ignore expiration)
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    
    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    
    // Create NEW token with fresh 7-day expiry
    const newToken = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: "365d" }
    );
    
    // Update last active timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActive: new Date() }
    });
    
    // Send back the new token
    res.json({ 
      success: true, 
      token: newToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      }
    });
    
  } catch (err) {
    console.error("Token refresh error:", err);
    res.status(401).json({ error: "Invalid token" });
  }
});

// ================== GET CURRENT USER ==================
app.get("/api/me", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { homeJumuia: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
    console.error("ME ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});
// ================== RESET PASSWORD (EMAIL BASED) ==================
app.post("/api/auth/request-reset", async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    
    const normalizedEmail = email.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });
    
    if (!user) {
      return res.status(404).json({ error: "No account found with this email" });
    }
    
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeExpiry = new Date(Date.now() + 15 * 60 * 1000);
    
    await prisma.user.update({
      where: { id: user.id },
      data: { resetCode, resetCodeExpiry }
    });
    
    // Send email with reset code
    await sendPasswordResetEmail(user.email, resetCode);
    
    res.json({ 
      success: true,
      message: "Reset code sent to your email",
      email: user.email
    });
    
  } catch (err) {
    console.error("Request reset error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/auth/verify-reset", async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: "Email, code, and password are required" });
    }
    
    const normalizedEmail = email.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    if (user.resetCode !== code) {
      return res.status(400).json({ error: "Invalid verification code" });
    }
    
    if (!user.resetCodeExpiry || user.resetCodeExpiry < new Date()) {
      return res.status(400).json({ error: "Code has expired. Request a new one." });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        password: hashedPassword, 
        resetCode: null,
        resetCodeExpiry: null
      }
    });
    
    res.json({ 
      success: true,
      message: "Password updated successfully" 
    });
    
  } catch (err) {
    console.error("Verify reset error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/auth/resend-code", async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    
    const normalizedEmail = email.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeExpiry = new Date(Date.now() + 15 * 60 * 1000);
    
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        resetCode, 
        resetCodeExpiry 
      }
    });
    
    await sendPasswordResetEmail(user.email, resetCode);
    
    res.json({ 
      success: true,
      message: "New code sent to your email" 
    });
    
  } catch (err) {
    console.error("Resend code error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// ==================== ULTRA-FAST LIGHTWEIGHT USERS ENDPOINT (WITH CACHE) ====================
let cachedUsersAll = null;
let cachedUsersTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

app.get("/api/users/light", async (req, res) => {
  try {
    const startTime = Date.now();
    
    // 🔥 ALWAYS return cached data if available (ignore pagination params)
    if (cachedUsersAll && cachedUsersTimestamp && (Date.now() - cachedUsersTimestamp < CACHE_TTL)) {
      const duration = Date.now() - startTime;
      console.log(`⚡ CACHED RESPONSE: ${cachedUsersAll.length} users in ${duration}ms`);
      return res.json(cachedUsersAll); // Return full array, not paginated
    }
    
    console.log('📡 First load - fetching all users...');
    
    // 🔥 Fetch ALL users in one query - NO FILTERING
    const users = await prisma.$queryRaw`
      SELECT 
        u.id, 
        u."fullName" AS "fullName", 
        u.phone, 
        u.role, 
        u."specialRole" AS "specialRole", 
        u."membership_number" AS "membership_number",
        u."jumuiaId" AS "jumuiaId",
        j.name AS "jumuiaName"
      FROM "User" u
      LEFT JOIN "Jumuia" j ON u."jumuiaId" = j.id
      -- ✅ REMOVED: WHERE u.role != 'admin'
      ORDER BY u."fullName" ASC
    `;
    
    const formattedUsers = users.map(u => ({
      id: u.id,
      fullName: u.fullName,
      phone: u.phone,
      role: u.role,
      specialRole: u.specialRole,
      membership_number: u.membership_number,
      jumuiaId: u.jumuiaId,
      homeJumuia: u.jumuiaName ? { name: u.jumuiaName } : null
    }));
    
    // 🔥 Cache it
    cachedUsersAll = formattedUsers;
    cachedUsersTimestamp = Date.now();
    
    const duration = Date.now() - startTime;
    console.log(`✅ Loaded ${formattedUsers.length} users in ${duration}ms (cached for 5 min)`);
    
    res.json(formattedUsers);
    
  } catch (err) {
    console.error("Error fetching lightweight users:", err);
    res.status(500).json({ error: err.message });
  }
});


// Import M-PESA routes
const mpesaRoutes = require("./routes/mpesaRoutes");

// Register M-PESA routes
app.use("/api/mpesa", mpesaRoutes);
app.use("/", mpesaRoutes); // For the /pay/:slug route


// ================== GROQ AI ROUTES ==================
const aiRoutes = require("./routes/ai");
app.use("/api", aiRoutes);

// Attendance registrations
const attendanceRoutes = require("./routes/attendanceRoutes");
app.use("/api/attendance", attendanceRoutes);

// monitoring middleware
app.use(monitoringMiddleware);
global.systemMonitor = systemMonitor;


// ================== PROTECTED ROUTES MIDDLEWARE ==================
app.use(authenticate, updateLastActive);




// ================== DASHBOARD STATS ==================
app.get("/api/announcements/unread", authenticate, async (req, res) => {
  try {
    const count = await prisma.announcement.count({
      where: { published: true }
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/chat/unread", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const defaultRoom = await prisma.chatRoom.findFirst({ where: { name: "default" } });
    
    if (!defaultRoom) {
      return res.json({ count: 0 });
    }
    
    // Count unread messages (no read receipt)
    const count = await prisma.message.count({
      where: { 
        roomId: defaultRoom.id,
        isDeleted: false,
        readReceipts: {
          none: {
            userId: userId
          }
        }
      }
    });
    
    res.json({ count });
  } catch (err) {
    console.error("Error counting unread messages:", err);
    res.status(500).json({ error: err.message });
  }
});

// Mark all messages in default chat as read for current user
app.post("/api/chat/mark-all-read", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const defaultRoom = await prisma.chatRoom.findFirst({ where: { name: "default" } });
    
    if (!defaultRoom) {
      return res.json({ success: true, count: 0 });
    }
    
    // Get all unread messages
    const unreadMessages = await prisma.message.findMany({
      where: {
        roomId: defaultRoom.id,
        isDeleted: false,
        readReceipts: {
          none: { userId: userId }
        }
      },
      select: { id: true }
    });
    
    // Create read receipts for each unread message
    if (unreadMessages.length > 0) {
      await prisma.readReceipt.createMany({
        data: unreadMessages.map(msg => ({
          messageId: msg.id,
          userId: userId,
          readAt: new Date()
        })),
        skipDuplicates: true
      });
    }
    
    res.json({ success: true, count: unreadMessages.length });
  } catch (err) {
    console.error("Error marking messages as read:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/events/upcoming", authenticate, async (req, res) => {
  try {
    const count = await prisma.massProgram.count({
      where: {
        date: {
          gte: new Date()
        }
      }
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================== ANNOUNCEMENTS ==================
app.get("/api/announcements", async (req, res) => {
  try {
    const userId = req.user?.userId;
    
    const announcements = await prisma.announcement.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            profileImage: true
          }
        },
        views: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                profileImage: true,
                membership_number: true,
                role: true,
                specialRole: true
              }
            }
          },
          orderBy: { viewedAt: 'desc' },
          take: 10
        }
      }
    });
    
    const enhanced = announcements.map(announcement => {
      const viewCount = announcement.views.length;
      const hasViewed = userId ? announcement.views.some(v => v.userId === userId) : false;
      
      const viewers = announcement.views.map(v => ({
        id: v.user.id,
        fullName: v.user.fullName,
        profileImage: v.user.profileImage,
        role: v.user.specialRole || v.user.role || 'member',
        viewedAt: v.viewedAt
      }));
      
      const { views, ...rest } = announcement;
      
      return {
        ...rest,
        viewCount,
        hasViewed,
        recentViewers: viewers.slice(0, 5),
        viewerCount: viewCount
      };
    });
    
    res.json(enhanced);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ============ TRACK ANNOUNCEMENT VIEW ============
app.post("/api/announcements/:id/view", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const announcement = await prisma.announcement.findUnique({
      where: { id }
    });
    
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    
    await prisma.announcementView.upsert({
      where: {
        announcementId_userId: {
          announcementId: id,
          userId: userId
        }
      },
      update: {
        viewedAt: new Date()
      },
      create: {
        announcementId: id,
        userId: userId,
        viewedAt: new Date()
      }
    });
    
    const viewCount = await prisma.announcementView.count({
      where: { announcementId: id }
    });
    
    res.json({ 
      success: true, 
      viewCount
    });
  } catch (error) {
    console.error('Error tracking view:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ GET ALL VIEWERS FOR AN ANNOUNCEMENT ============
app.get("/api/announcements/:id/viewers", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Check if user is admin or secretary
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true, specialRole: true }
    });
    
    const isAdmin = user.role === 'admin' || user.specialRole === 'admin';
    const isSecretary = user.specialRole === 'secretary';
    
    if (!isAdmin && !isSecretary) {
      return res.status(403).json({ error: 'Not authorized. Admin or Secretary only.' });
    }
    
    // Check if announcement exists
    const announcement = await prisma.announcement.findUnique({
      where: { id }
    });
    
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    
    const views = await prisma.announcementView.findMany({
      where: { announcementId: id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            profileImage: true,
            membership_number: true,
            role: true,
            specialRole: true,
            homeJumuia: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { viewedAt: 'desc' },
      skip,
      take: parseInt(limit)
    });
    
    const total = await prisma.announcementView.count({
      where: { announcementId: id }
    });
    
    // Calculate stats
    const stats = {
      total,
      byRole: {},
      byJumuia: {}
    };
    
    views.forEach(view => {
      const role = view.user.specialRole || view.user.role || 'member';
      stats.byRole[role] = (stats.byRole[role] || 0) + 1;
      
      const jumuia = view.user.homeJumuia?.name || 'No Jumuia';
      stats.byJumuia[jumuia] = (stats.byJumuia[jumuia] || 0) + 1;
    });
    
    res.json({
      viewers: views.map(v => ({
        ...v.user,
        viewedAt: v.viewedAt
      })),
      total,
      stats,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching viewers:', error);
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/announcements", authenticate, async (req, res) => {
  try {
    const { title, content, category, published } = req.body;
    if (!title || !content) return res.status(400).json({ error: "Title & Content required" });

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isSecretary = user.specialRole === "secretary";
    
    if (!isAdmin && !isSecretary) {
      return res.status(403).json({ error: "Not authorized to create announcements" });
    }

    const announcement = await prisma.announcement.create({
      data: { 
        title, 
        content, 
        category: category || "General", 
        published: published ?? true,
        createdBy: req.user.userId
      },
    });

    console.log("✅ Announcement created:", announcement.id);

    const formattedAnnouncement = {
      ...announcement,
      createdAt: announcement.createdAt.toISOString()
    };

    res.json(formattedAnnouncement);

    const users = await prisma.user.findMany({ select: { id: true } });
    
    if (users.length > 0) {
      Promise.allSettled(
        users.map(async (user) => {
          try {
            await createAndSendNotification({
              userId: user.id,
              type: "announcement",
              title: "📢 New Announcement",
              message: title,
              data: { announcementId: announcement.id }
            });
          } catch (err) {
            console.error("Failed to send announcement notification to user:", user.id, err.message);
          }
        })
      ).then(() => {
        console.log(`✅ Sent ${users.length} announcement push notifications`);
      });
      
      if (io) {
        users.forEach(user => {
          io.to(user.id).emit("new_notification", formattedAnnouncement);
        });
      }
    }

  } catch (err) {
    console.error("❌ Error creating announcement:", err);
    res.status(500).json({ error: err.message });
  }
});
app.put("/api/announcements/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, published } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isSecretary = user.specialRole === "secretary";
    
    if (!isAdmin && !isSecretary) {
      return res.status(403).json({ error: "Not authorized to update announcements" });
    }

    const announcement = await prisma.announcement.update({
      where: { id },
      data: { title, content, category, published },
    });
    
    const formattedAnnouncement = {
      ...announcement,
      createdAt: announcement.createdAt.toISOString()
    };
    
    res.json(formattedAnnouncement);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/announcements/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isSecretary = user.specialRole === "secretary";
    
    if (!isAdmin && !isSecretary) {
      return res.status(403).json({ error: "Not authorized to delete announcements" });
    }

    await prisma.announcement.delete({ where: { id } });
    res.json({ message: "Announcement deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});






// ================== MASS PROGRAM ROUTES ==================

// PUBLIC ROUTE - for users to view programs (no auth needed)
// PUBLIC ROUTE - for users to view programs (no auth needed)
app.get("/api/mass-programs", async (req, res) => {
  try {
    const programs = await prisma.massProgram.findMany({
      orderBy: { date: "asc" },
      include: { 
        songs: { 
          include: { song: true }
          // REMOVED orderBy - createdAt doesn't exist in this table
        } 
      },
    });

    const formatted = programs.map((p) => {
      // Use arrays to store multiple songs per type
      const songMap = {};
      
      p.songs.forEach((s) => {
        if (!songMap[s.type]) {
          songMap[s.type] = [];
        }
        songMap[s.type].push(s.song.title);
      });
      
      // Convert arrays to semicolon-separated strings for frontend
      return {
        id: p.id,
        date: p.date.toISOString().split("T")[0],
        venue: p.venue,
        entrance: (songMap.entrance || []).join('; '),
        mass: (songMap.mass || []).join('; '),
        bible: (songMap.bible || []).join('; '),
        offertory: (songMap.offertory || []).join('; '),
        procession: (songMap.procession || []).join('; '),
        mtakatifu: (songMap.mtakatifu || []).join('; '),
        signOfPeace: (songMap.signOfPeace || []).join('; '),
        communion: (songMap.communion || []).join('; '),
        thanksgiving: (songMap.thanksgiving || []).join('; '),
        exit: (songMap.exit || []).join('; '),
        createdAt: p.createdAt.toISOString()
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching mass programs:", err);
    res.status(500).json({ error: err.message });
  }
});

// ADMIN ROUTES - for admin/choir moderator pages (require auth)

// GET all mass programs (admin view - includes all dates)
app.get("/api/admin/mass-programs", authenticate, async (req, res) => {
  try {
    // Check authorization
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId } 
    });
    
    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isChoirModerator = user.specialRole === "choir_moderator";
    
    if (!isAdmin && !isChoirModerator) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const programs = await prisma.massProgram.findMany({
      orderBy: { date: "desc" },
      include: { 
        songs: { 
          include: { song: true }
          // Remove orderBy if createdAt doesn't exist
        } 
      },
    });

    const formatted = programs.map((p) => {
      // Use arrays to store multiple songs per type
      const songMap = {};
      
      p.songs.forEach((s) => {
        if (!songMap[s.type]) {
          songMap[s.type] = [];
        }
        songMap[s.type].push(s.song.title);
      });
      
      // Convert arrays to semicolon-separated strings for frontend
      return {
        id: p.id,
        date: p.date.toISOString().split("T")[0],
        venue: p.venue,
        entrance: (songMap.entrance || []).join('; '),
        mass: (songMap.mass || []).join('; '),
        bible: (songMap.bible || []).join('; '),
        offertory: (songMap.offertory || []).join('; '),
        procession: (songMap.procession || []).join('; '),
        mtakatifu: (songMap.mtakatifu || []).join('; '),
        signOfPeace: (songMap.signOfPeace || []).join('; '),
        communion: (songMap.communion || []).join('; '),
        thanksgiving: (songMap.thanksgiving || []).join('; '),
        exit: (songMap.exit || []).join('; '),
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt?.toISOString()
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching admin mass programs:", err);
    res.status(500).json({ error: err.message });
  }
});


// CREATE mass program (admin/choir moderator only) - FIXED VERSION (NO REMATCHING)
app.post("/api/admin/mass-programs", authenticate, async (req, res) => {
  try {
    const { date, venue, ...songsData } = req.body;
    
    if (!date || !venue) {
      return res.status(400).json({ error: "Date and venue are required" });
    }

    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId } 
    });
    
    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isChoirModerator = user.specialRole === "choir_moderator";
    
    if (!isAdmin && !isChoirModerator) {
      return res.status(403).json({ error: "Not authorized to create mass programs" });
    }

    const newProgram = await prisma.massProgram.create({
      data: { 
        date: new Date(date), 
        venue, 
        createdBy: req.user.userId
      }
    });

    for (const [type, value] of Object.entries(songsData)) {
      if (!value || value.trim() === "") continue;
      
      const songTitles = value.includes(';') 
        ? value.split(';').map(s => s.trim()).filter(s => s)
        : [value.trim()];
      
      for (const songTitle of songTitles) {
        let song = await prisma.song.findFirst({ 
          where: { 
            title: {
              equals: songTitle,
              mode: 'insensitive'
            }
          } 
        });

        if (!song) {
          song = await prisma.song.create({ 
            data: { 
              title: songTitle,
              composer: "",
              lyrics: "[Pending - Add lyrics]",
              reference: ""
            } 
          });
          
          await prisma.pendingSong.create({
            data: {
              title: songTitle,
              type: type,
              programId: newProgram.id,
              status: "pending"
            }
          });
        }
        
        await prisma.massProgramSong.create({
          data: {
            type,
            massProgramId: newProgram.id,
            songId: song.id
          }
        });
      }
    }

    const completeProgram = await prisma.massProgram.findUnique({
      where: { id: newProgram.id },
      include: { songs: { include: { song: true } } }
    });

    const songMap = {};
    completeProgram.songs.forEach((s) => {
      if (!songMap[s.type]) {
        songMap[s.type] = [];
      }
      songMap[s.type].push(s.song.title);
    });

    const response = {
      id: completeProgram.id,
      date: completeProgram.date.toISOString().split("T")[0],
      venue: completeProgram.venue,
      entrance: (songMap.entrance || []).join('; '),
      mass: (songMap.mass || []).join('; '),
      bible: (songMap.bible || []).join('; '),
      offertory: (songMap.offertory || []).join('; '),
      procession: (songMap.procession || []).join('; '),
      mtakatifu: (songMap.mtakatifu || []).join('; '),
      signOfPeace: (songMap.signOfPeace || []).join('; '),
      communion: (songMap.communion || []).join('; '),
      thanksgiving: (songMap.thanksgiving || []).join('; '),
      exit: (songMap.exit || []).join('; '),
      createdAt: completeProgram.createdAt.toISOString()
    };

    res.status(201).json(response);

    if (io) {
      io.emit("program_created", response);
    }

    const users = await prisma.user.findMany({ select: { id: true } });
    if (users.length > 0) {
      Promise.allSettled(
        users.map(async (user) => {
          try {
            await createAndSendNotification({
              userId: user.id,
              type: "program",
              title: "⛪ New Mass Program",
              message: `Mass at ${venue} on ${new Date(date).toLocaleDateString()}`,
              data: {}
            });
          } catch (err) {
            console.error("Failed to send program notification:", err.message);
          }
        })
      );
    }

  } catch (err) {
    console.error("Error creating mass program:", err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE mass program (admin/choir moderator only) npm
app.put("/api/admin/mass-programs/:id", authenticate, async (req, res) => {
  
  try {
    const { id } = req.params;
    const { date, venue, ...songsData } = req.body;

    // Check authorization
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId } 
    });
    
    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isChoirModerator = user.specialRole === "choir_moderator";
    
    if (!isAdmin && !isChoirModerator) {
      return res.status(403).json({ error: "Not authorized to update mass programs" });
    }

    // Update basic info
    await prisma.massProgram.update({
      where: { id },
      data: { 
        date: new Date(date), 
        venue,
        updatedAt: new Date()
      }
    });

    // Delete  songs
    await prisma.massProgramSong.deleteMany({ 
      where: { massProgramId: id } 
    });

    // ========== FIXED: NO REMATCHING - JUST SAVE EXACTLY WHAT WAS GIVEN ==========
    for (const [type, value] of Object.entries(songsData)) {
      if (!value || value.trim() === "") continue;
      
      // Split into individual song titles
      const songTitles = value.includes(';') 
        ? value.split(';').map(s => s.trim()).filter(s => s)
        : [value.trim()];
      
      console.log(`📝 Saving ${songTitles.length} songs for ${type}:`, songTitles);
      
      // Process each song - NO SEARCHING/MATCHING
      for (const songTitle of songTitles) {
        // FIRST: Try to find existing song with EXACT title
        let song = await prisma.song.findFirst({ 
          where: { 
            title: {
              equals: songTitle,
              mode: 'insensitive'
            }
          } 
        });

        // If NOT found, create a NEW song - NO PARTIAL MATCHING
        if (!song) {
          song = await prisma.song.create({ 
            data: { 
              title: songTitle,
              composer: "",
              lyrics: "[Pending - Add lyrics]",
              reference: ""
            } 
          });
          
          await prisma.pendingSong.create({
            data: {
              title: songTitle,
              type: type,
              programId: id,
              status: "pending"
            }
          });
        }
        
        // Create the relationship
        await prisma.massProgramSong.create({
          data: {
            type,
            massProgramId: id,
            songId: song.id
          }
        });
      }
    }

    // Fetch updated program with songs
    const updatedProgram = await prisma.massProgram.findUnique({
      where: { id },
      include: { 
        songs: { 
          include: { song: true }
        } 
      }
    });

    // Format response - GROUP multiple songs by type
    const songMap = {};
    updatedProgram.songs.forEach((s) => {
      if (!songMap[s.type]) {
        songMap[s.type] = [];
      }
      songMap[s.type].push(s.song.title);
    });

    // Convert arrays to semicolon-separated strings for frontend
    const response = {
      id: updatedProgram.id,
      date: updatedProgram.date.toISOString().split("T")[0],
      venue: updatedProgram.venue,
      entrance: (songMap.entrance || []).join('; '),
      mass: (songMap.mass || []).join('; '),
      bible: (songMap.bible || []).join('; '),
      offertory: (songMap.offertory || []).join('; '),
      procession: (songMap.procession || []).join('; '),
      mtakatifu: (songMap.mtakatifu || []).join('; '),
      signOfPeace: (songMap.signOfPeace || []).join('; '),
      communion: (songMap.communion || []).join('; '),
      thanksgiving: (songMap.thanksgiving || []).join('; '),
      exit: (songMap.exit || []).join('; '),
      createdAt: updatedProgram.createdAt.toISOString(),
      updatedAt: updatedProgram.updatedAt?.toISOString()
    };

    console.log("📤 Update response:", response);

    // Emit socket event
    if (io) {
      io.emit("program_updated", response);
    }

    res.json(response);
  } catch (err) {
    console.error("Error updating mass program:", err);
    res.status(500).json({ error: err.message });
  }
});
// ==================== MASS PROGRAM BOOKLET (LYRICS PDF) ====================
// Any authenticated user can download

// GET /api/mass-programs/:id/booklet-data - Get program with full lyrics
app.get("/api/mass-programs/:id/booklet-data", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`\n📖 Generating booklet for program: ${id}`);
    
    // Get program WITH its songs through the relation
    const program = await prisma.massProgram.findUnique({
      where: { id },
      include: {
        songs: {
          include: {
            song: true  // Get the actual song with lyrics
          }
        }
      }
    });
    
    if (!program) {
      return res.status(404).json({ error: "Program not found" });
    }
    
    console.log(`✅ Program: ${program.date} - ${program.venue}`);
    console.log(`📊 Found ${program.songs.length} song entries`);
    
    // Group songs by type
    const songsByType = {};
    for (const ps of program.songs) {
      if (!songsByType[ps.type]) {
        songsByType[ps.type] = [];
      }
      
      // Clean lyrics if available
      let cleanLyrics = ps.song.lyrics || "[Lyrics not available yet]";
      if (cleanLyrics !== "[Lyrics not available yet]") {
        // Remove HTML tags
        cleanLyrics = cleanLyrics.replace(/<[^>]*>/g, '');
        // Fix escaped newlines
        cleanLyrics = cleanLyrics.replace(/\\n/g, '\n');
      }
      
      songsByType[ps.type].push({
        title: ps.song.title,
        reference: ps.song.reference,
        lyrics: cleanLyrics,
        found: true
      });
    }
    
    // Define sections in liturgy order
    const sectionOrder = [
      { key: "entrance", label: "ENTRANCE HYMN" },
      { key: "mass", label: "MASS HYMN" },
      { key: "bible", label: "BIBLE READING" },
      { key: "offertory", label: "OFFERTORY HYMN" },
      { key: "procession", label: "PROCESSION HYMN" },
      { key: "mtakatifu", label: "MTAKATIFU HYMN" },
      { key: "signOfPeace", label: "SIGN OF PEACE" },
      { key: "communion", label: "COMMUNION HYMN" },
      { key: "thanksgiving", label: "THANKSGIVING HYMN" },
      { key: "exit", label: "EXIT HYMN" }
    ];
    
    const sections = [];
    let totalSongs = 0;
    
    for (let i = 0; i < sectionOrder.length; i++) {
      const section = sectionOrder[i];
      const songs = songsByType[section.key] || [];
      
      if (songs.length > 0) {
        sections.push({
          key: section.key,
          label: section.label,
          order: i,
          songs: songs
        });
        totalSongs += songs.length;
        console.log(`📌 ${section.label}: ${songs.length} song(s)`);
      }
    }
    
    // Format date
    const programDate = new Date(program.date);
    const formattedDate = programDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const response = {
      success: true,
      program: {
        id: program.id,
        date: program.date.toISOString().split('T')[0],
        formattedDate: formattedDate,
        venue: program.venue,
        createdAt: program.createdAt
      },
      sections: sections,
      stats: {
        totalSections: sections.length,
        totalSongs: totalSongs
      }
    };
    
    console.log(`✅ Booklet ready: ${sections.length} sections, ${totalSongs} songs`);
    res.json(response);
    
  } catch (err) {
    console.error("❌ Booklet error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Lightweight preview endpoint (no lyrics)
app.get("/api/mass-programs/:id/booklet-preview", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const program = await prisma.massProgram.findUnique({
      where: { id },
      include: {
        songs: {
          include: {
            song: {
              select: { title: true }
            }
          }
        }
      }
    });
    
    if (!program) {
      return res.status(404).json({ error: "Program not found" });
    }
    
    const sectionOrder = [
      "entrance", "mass", "bible", "offertory", 
      "procession", "mtakatifu", "signOfPeace", 
      "communion", "thanksgiving", "exit"
    ];
    
    const sectionLabels = {
      entrance: "ENTRANCE HYMN",
      mass: "MASS HYMN",
      bible: "BIBLE READING",
      offertory: "OFFERTORY HYMN",
      procession: "PROCESSION HYMN",
      mtakatifu: "MTAKATIFU HYMN",
      signOfPeace: "SIGN OF PEACE",
      communion: "COMMUNION HYMN",
      thanksgiving: "THANKSGIVING HYMN",
      exit: "EXIT HYMN"
    };
    
    const preview = [];
    
    for (const type of sectionOrder) {
      const typeSongs = program.songs.filter(s => s.type === type);
      if (typeSongs.length > 0) {
        preview.push({
          section: sectionLabels[type],
          songs: typeSongs.map(s => s.song.title)
        });
      }
    }
    
    res.json({
      success: true,
      program: {
        id: program.id,
        date: program.date,
        venue: program.venue
      },
      preview: preview
    });
    
  } catch (err) {
    console.error("Preview error:", err);
    res.status(500).json({ error: err.message });
  }
});

console.log("✅ Mass Program Booklet API routes loaded");
// DELETE mass program (admin/choir moderator only)
app.delete("/api/admin/mass-programs/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Check authorization
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId } 
    });
    
    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isChoirModerator = user.specialRole === "choir_moderator";
    
    if (!isAdmin && !isChoirModerator) {
      return res.status(403).json({ error: "Not authorized to delete mass programs" });
    }

    // Delete songs first
    await prisma.massProgramSong.deleteMany({ 
      where: { massProgramId: id } 
    });

    // Delete program
    await prisma.massProgram.delete({ 
      where: { id } 
    });

    // Emit socket event
    if (io) {
      io.emit("program_deleted", id);
    }

    res.json({ message: "Program deleted successfully" });
  } catch (err) {
    console.error("Error deleting mass program:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET upcoming count (for dashboard)
app.get("/api/mass-programs/upcoming/count", async (req, res) => {
  try {
    const count = await prisma.massProgram.count({
      where: {
        date: {
          gte: new Date()
        }
      }
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE all songs for a program (for update)
app.delete("/api/admin/mass-programs/:id/songs", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isChoirModerator = user.specialRole === "choir_moderator";
    
    if (!isAdmin && !isChoirModerator) {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    await prisma.massProgramSong.deleteMany({
      where: { massProgramId: id }
    });
    
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting program songs:", err);
    res.status(500).json({ error: err.message });
  }
});

// Add a single song to a program
app.post("/api/admin/mass-programs/:id/songs", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, title } = req.body;
    
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isChoirModerator = user.specialRole === "choir_moderator";
    
    if (!isAdmin && !isChoirModerator) {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    // Check if program exists
    const program = await prisma.massProgram.findUnique({
      where: { id }
    });
    
    if (!program) {
      return res.status(404).json({ error: "Program not found" });
    }
    
    // Find or create song
    let song = await prisma.song.findFirst({
      where: { title: { equals: title, mode: 'insensitive' } }
    });
    
    if (!song) {
      song = await prisma.song.create({
        data: {
          title: title,
          lyrics: "[Pending - Add lyrics]",
          reference: "",
          composer: ""
        }
      });
    }
    
    // Create the relationship
    const programSong = await prisma.massProgramSong.create({
      data: {
        type,
        massProgramId: id,
        songId: song.id
      },
      include: { song: true }
    });
    
    res.status(201).json(programSong);
  } catch (err) {
    console.error("Error adding song to program:", err);
    res.status(500).json({ error: err.message });
  }
});



// ================== JUMUIA ROUTES ==================
app.get("/api/jumuia", async (req, res) => {
  try {
    const jumuia = await prisma.jumuia.findMany({
      orderBy: { name: "asc" },
    });
    res.json(jumuia);
  } catch (err) {
    console.error("Fetch Jumuia error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/join-jumuia", authenticate, async (req, res) => {
  try {
    const { jumuiaId } = req.body;
    console.log("Joining JumuiaId:", jumuiaId, "User:", req.user);

    if (!jumuiaId)
      return res.status(400).json({ error: "jumuiaId is required" });

    const jumuia = await prisma.jumuia.findUnique({ where: { id: jumuiaId } });
    if (!jumuia) return res.status(404).json({ error: "Jumuia not found" });

    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: { jumuiaId },
      include: { homeJumuia: true },
    });

    res.json({ message: `Joined ${updatedUser.homeJumuia.name}`, user: updatedUser });
  } catch (err) {
    console.error("Join Jumuia error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/admin/jumuia/:userId", authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { jumuiaId } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { jumuiaId: jumuiaId || null },
      include: { homeJumuia: true },
    });

    const message = jumuiaId
      ? `User assigned to ${updated.homeJumuia?.name}`
      : "User removed from a Jumuia";

    res.json({ message, user: updated });
  } catch (err) {
    console.error("Admin PATCH Jumuia error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/admin/jumuia/:userId/remove", authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { jumuiaId: null },
      include: { homeJumuia: true },
    });

    res.json({ message: "User removed from Jumuia", user: updatedUser });
  } catch (err) {
    console.error("Remove User from Jumuia Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Updated: Allow Jumuia Leaders and members to view their jumuia's contributions with personal pledge data
app.get("/api/contributions/jumuia", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { homeJumuia: true, leadingJumuia: true },
    });

    // Determine which jumuia to show
    let jumuiaId = user.homeJumuia?.id;
    
    // If user is a jumuia leader, show their leading jumuia
    if (user.specialRole === "jumuia_leader" && user.leadingJumuia) {
      jumuiaId = user.leadingJumuia.id;
    }

    if (!jumuiaId) return res.status(400).json({ error: "User has not been assigned to any Jumuia" });

    const contributions = await prisma.contributionType.findMany({
      where: { jumuiaId },
      include: {
        pledges: { 
          include: { 
            user: { 
              select: { id: true, fullName: true, membership_number: true } 
            } 
          } 
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform the data to include the current user's pledge info
    const enhancedContributions = contributions.map(contribution => {
      // Find the current user's pledge in this contribution
      const userPledge = contribution.pledges.find(p => p.user.id === req.user.userId);
      
      return {
        id: contribution.id,
        title: contribution.title,
        description: contribution.description,
        amountRequired: contribution.amountRequired,
        deadline: contribution.deadline,
        createdAt: contribution.createdAt,
        // Add user-specific pledge data - THIS IS WHAT YOU NEED
        amountPaid: userPledge?.amountPaid || 0,
        pendingAmount: userPledge?.pendingAmount || 0,
        status: userPledge?.status || "NO_PLEDGE",
        message: userPledge?.message || null,
        pledgeId: userPledge?.id || null,
        // Keep the full pledges list for reference
        pledges: contribution.pledges
      };
    });

    res.json(enhancedContributions);
  } catch (err) {
    console.error("Error in /api/contributions/jumuia:", err);
    res.status(500).json({ error: err.message });
  }
});


app.post("/api/admin/contributions/jumuia", authenticate, async (req, res) => {
  try {
    const { title, description, amountRequired, deadline, jumuiaId } = req.body;
    if (!title || !amountRequired || !jumuiaId)
      return res.status(400).json({ error: "Title, amountRequired & jumuiaId are required" });

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    
    if (!isAdmin && !isTreasurer) {
      return res.status(403).json({ error: "Not authorized to create contributions" });
    }

    const newType = await prisma.contributionType.create({
      data: {
        title,
        description,
        amountRequired: parseFloat(amountRequired),
        deadline: deadline ? new Date(deadline) : null,
        jumuiaId,
      },
    });

    const users = await prisma.user.findMany({ where: { jumuiaId }, select: { id: true } });
    if (users.length > 0) {
      await prisma.pledge.createMany({
        data: users.map(u => ({
          userId: u.id,
          contributionTypeId: newType.id,
          pendingAmount: 0,
          amountPaid: 0,
          status: "PENDING",
        })),
      });
    }

    res.json(newType);

    if (users.length > 0) {
      Promise.allSettled(
        users.map(async (user) => {
          try {
            await createAndSendNotification({
              userId: user.id,
              type: "contribution",
              title: "💰 New Jumuia Contribution",
              message: `New contribution "${title}" for your jumuia. Target: ${amountRequired}`,
              data: { contributionId: newType.id, jumuiaId }
            });
          } catch (err) {
            console.error("Failed to send notification to user:", user.id, err.message);
          }
        })
      ).then(() => {
        console.log(`✅ Sent ${users.length} jumuia contribution push notifications`);
      });
    }

  } catch (err) {
    console.error("Create Jumuia Contribution error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/jumuia/:id/users", authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { jumuiaId: req.params.id },
      select: { id: true, fullName: true, email: true, role: true, specialRole: true },
    });
    res.json(users);
  } catch (err) {
    console.error("Fetch Jumuia Users error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== JUMUIA ACCESS MIDDLEWARE ==================
async function checkJumuiaAccess(req, res, next) {
  try {
    const { jumuiaId } = req.params;
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        leadingJumuia: true,
        homeJumuia: true 
      }
    });

    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isLeaderOfThisJumuia = user.leadingJumuia?.id === jumuiaId;
    const isMemberOfThisJumuia = user.homeJumuia?.id === jumuiaId;

    if (isAdmin || isLeaderOfThisJumuia || isMemberOfThisJumuia) {
      req.jumuiaAccess = {
        isAdmin,
        isLeader: isLeaderOfThisJumuia,
        isMember: isMemberOfThisJumuia
      };
      return next();
    }

    return res.status(403).json({ error: "Access denied to this jumuia" });
  } catch (err) {
    console.error("Access check error:", err);
    return res.status(500).json({ error: err.message });
  }
}

// ================== JUMUIA DETAILS ==================
app.get("/api/jumuia/:identifier", authenticate, async (req, res) => {
  try {
    const { identifier } = req.params;
    const userId = req.user.userId;

    const jumuia = await prisma.jumuia.findFirst({
      where: {
        OR: [
          { id: identifier },
          { code: identifier }
        ]
      },
      include: {
        leaders: {
          select: {
            id: true,
            fullName: true,
            email: true,
            profileImage: true,
            specialRole: true
          }
        },
        members: {
          select: {
            id: true,
            fullName: true,
            email: true,
            profileImage: true,
            membership_number: true,
            role: true,
            specialRole: true,
            lastActive: true
          },
          orderBy: { fullName: "asc" }
        },
        _count: {
          select: {
            members: true,
            contributions: true,
            announcements: true,
            chatRooms: true
          }
        }
      }
    });

    if (!jumuia) {
      return res.status(404).json({ error: "Jumuia not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        leadingJumuia: true,
        homeJumuia: true 
      }
    });

    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isLeaderOfThisJumuia = user.leadingJumuia?.id === jumuia.id;
    const isMemberOfThisJumuia = user.homeJumuia?.id === jumuia.id;

    if (!isAdmin && !isLeaderOfThisJumuia && !isMemberOfThisJumuia) {
      return res.status(403).json({ error: "Access denied to this jumuia" });
    }

    res.json(jumuia);
  } catch (err) {
    console.error("Error fetching jumuia details:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== JUMUIA CONTRIBUTIONS ==================
app.get("/api/jumuia/:jumuiaId/contributions", authenticate, checkJumuiaAccess, async (req, res) => {
  try {
    const { jumuiaId } = req.params;

    const contributions = await prisma.contributionType.findMany({
      where: { jumuiaId },
      include: {
        pledges: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                membership_number: true,
                email: true,
                profileImage: true
              }
            },
            pledgeMessages: {
              orderBy: { createdAt: "desc" },
              take: 1
            }
          },
          orderBy: { createdAt: "desc" }
        },
        _count: {
          select: { pledges: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const enhancedContributions = contributions.map(c => {
      const totalRaised = c.pledges.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
      const totalPending = c.pledges.reduce((sum, p) => sum + (p.pendingAmount || 0), 0);
      const completedPledges = c.pledges.filter(p => p.status === "COMPLETED").length;
      const pendingPledges = c.pledges.filter(p => p.status === "PENDING" && p.pendingAmount > 0).length;
      const approvedPledges = c.pledges.filter(p => p.status === "APPROVED").length;
      
      return {
        ...c,
        deadline: c.deadline?.toISOString(),
        createdAt: c.createdAt.toISOString(),
        stats: {
          totalRaised,
          totalPending,
          totalCommitted: totalRaised + totalPending,
          progress: c.amountRequired > 0 ? (totalRaised / c.amountRequired) * 100 : 0,
          completedPledges,
          pendingPledges,
          approvedPledges,
          totalPledges: c._count.pledges
        }
      };
    });

    res.json(enhancedContributions);
  } catch (err) {
    console.error("Error fetching jumuia contributions:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/jumuia/:jumuiaId/contributions", authenticate, checkJumuiaAccess, async (req, res) => {
  try {
    const { jumuiaId } = req.params;
    const { title, description, amountRequired, deadline } = req.body;

    if (!title || !amountRequired) {
      return res.status(400).json({ error: "Title and amountRequired are required" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    const isLeader = req.jumuiaAccess.isLeader;

    if (!isAdmin && !isTreasurer && !isLeader) {
      return res.status(403).json({ error: "Not authorized to create contributions" });
    }

    const contribution = await prisma.contributionType.create({
      data: {
        title,
        description,
        amountRequired: parseFloat(amountRequired),
        deadline: deadline ? new Date(deadline) : null,
        jumuiaId
      }
    });

    const members = await prisma.user.findMany({
      where: { jumuiaId },
      select: { id: true }
    });

    if (members.length > 0) {
      await prisma.pledge.createMany({
        data: members.map(m => ({
          userId: m.id,
          contributionTypeId: contribution.id,
          pendingAmount: 0,
          amountPaid: 0,
          status: "PENDING"
        }))
      });
    }

    res.status(201).json(contribution);

    if (members.length > 0) {
      Promise.allSettled(
        members.map(async (member) => {
          try {
            await createAndSendNotification({
              userId: member.id,
              type: "contribution",
              title: "💰 New Jumuia Contribution",
              message: `New contribution "${title}" for your jumuia. Target: ${amountRequired}`,
              data: { contributionId: contribution.id, jumuiaId }
            });
          } catch (err) {
            console.error("Failed to send notification:", err.message);
          }
        })
      );
    }

  } catch (err) {
    console.error("Error creating jumuia contribution:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/jumuia/contributions/:contributionId", authenticate, async (req, res) => {
  try {
    const { contributionId } = req.params;
    const { title, description, amountRequired, deadline } = req.body;

    const contribution = await prisma.contributionType.findUnique({
      where: { id: contributionId }
    });

    if (!contribution) {
      return res.status(404).json({ error: "Contribution not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { leadingJumuia: true }
    });

    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    const isLeader = user.leadingJumuia?.id === contribution.jumuiaId;

    if (!isAdmin && !isTreasurer && !isLeader) {
      return res.status(403).json({ error: "Not authorized to edit contributions" });
    }

    const updated = await prisma.contributionType.update({
      where: { id: contributionId },
      data: {
        title,
        description,
        amountRequired: amountRequired ? parseFloat(amountRequired) : contribution.amountRequired,
        deadline: deadline ? new Date(deadline) : contribution.deadline
      }
    });

    res.json(updated);
  } catch (err) {
    console.error("Error updating contribution:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/jumuia/contributions/:contributionId", authenticate, async (req, res) => {
  try {
    const { contributionId } = req.params;

    const contribution = await prisma.contributionType.findUnique({
      where: { id: contributionId }
    });

    if (!contribution) {
      return res.status(404).json({ error: "Contribution not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { leadingJumuia: true }
    });

    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    const isLeader = user.leadingJumuia?.id === contribution.jumuiaId;

    if (!isAdmin && !isTreasurer && !isLeader) {
      return res.status(403).json({ error: "Not authorized to delete contributions" });
    }

    await prisma.pledge.deleteMany({
      where: { contributionTypeId: contributionId }
    });

    await prisma.contributionType.delete({
      where: { id: contributionId }
    });

    res.json({ message: "Contribution deleted successfully" });
  } catch (err) {
    console.error("Error deleting contribution:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== JUMUIA PLEDGE ACTIONS ==================
app.put("/api/jumuia/pledges/:pledgeId/approve", authenticate, async (req, res) => {
  try {
    const { pledgeId } = req.params;
    
    const pledge = await prisma.pledge.findUnique({
      where: { id: pledgeId },
      include: { 
        contributionType: true,
        user: true 
      }
    });

    if (!pledge) {
      return res.status(404).json({ error: "Pledge not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { leadingJumuia: true }
    });

    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    const isLeader = user.leadingJumuia?.id === pledge.contributionType.jumuiaId;

    if (!isAdmin && !isTreasurer && !isLeader) {
      return res.status(403).json({ error: "Not authorized to approve pledges" });
    }

    if (pledge.pendingAmount === 0) {
      return res.status(400).json({ error: "No pending amount to approve" });
    }

    const newAmountPaid = pledge.amountPaid + pledge.pendingAmount;
    const newStatus = newAmountPaid >= pledge.contributionType.amountRequired ? "COMPLETED" : "APPROVED";

    const updated = await prisma.pledge.update({
      where: { id: pledgeId },
      data: {
        amountPaid: newAmountPaid,
        pendingAmount: 0,
        status: newStatus,
        approvedById: req.user.userId,
        approvedAt: new Date()
      },
      include: {
        user: true,
        contributionType: true
      }
    });

  await createAndSendNotification({
  userId: pledge.userId,
  type: "pledge_approved",
  title: newStatus === "COMPLETED" ? "🎉 Pledge Completed!" : "✅ Pledge Approved",
  message: newStatus === "COMPLETED" 
    ? `Your pledge for "${pledge.contributionType.title}" has been fully paid! Thank you.`
    : `Your pledge of ${pledge.pendingAmount} for "${pledge.contributionType.title}" has been approved.`,
  data: { pledgeId: updated.id, jumuiaId: pledge.contributionType.jumuiaId }
});

   
    res.json(updated);
  } catch (err) {
    console.error("Error approving pledge:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/jumuia/pledges/:pledgeId/manual-add", authenticate, async (req, res) => {
  try {
    const { pledgeId } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Valid amount required" });
    }

    const pledge = await prisma.pledge.findUnique({
      where: { id: pledgeId },
      include: { 
        contributionType: true,
        user: true 
      }
    });

    if (!pledge) {
      return res.status(404).json({ error: "Pledge not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { leadingJumuia: true }
    });

    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    const isLeader = user.leadingJumuia?.id === pledge.contributionType.jumuiaId;

    if (!isAdmin && !isTreasurer && !isLeader) {
      return res.status(403).json({ error: "Not authorized to add payments" });
    }

    let newPendingAmount = pledge.pendingAmount;
    let newAmountPaid = pledge.amountPaid;
    let approvedById = null;
    let approvedAt = null;
    
    if (pledge.pendingAmount > 0) {
      if (amount <= pledge.pendingAmount) {
        newPendingAmount = pledge.pendingAmount - amount;
      } else {
        newPendingAmount = 0;
        newAmountPaid = pledge.amountPaid + (amount - pledge.pendingAmount);
        approvedById = req.user.userId;
        approvedAt = new Date();
      }
    } else {
      newAmountPaid = pledge.amountPaid + amount;
    }

    if (newAmountPaid > pledge.contributionType.amountRequired) {
      return res.status(400).json({ error: "Total paid cannot exceed required amount" });
    }

    const newStatus = newAmountPaid >= pledge.contributionType.amountRequired ? "COMPLETED" : pledge.status;

    const updated = await prisma.pledge.update({
      where: { id: pledgeId },
      data: {
        amountPaid: newAmountPaid,
        pendingAmount: newPendingAmount,
        status: newStatus,
        approvedById,
        approvedAt,
        createdByAdmin: true
      }
    });

    let title = "💰 Payment Added";
    let message = `Hi ${pledge.user.fullName}, KES ${amount} has been added to your pledge for "${pledge.contributionType.title}".`;
    
    if (newStatus === "COMPLETED") {
      title = "🎉 Pledge Completed!";
      message = `Hi ${pledge.user.fullName}, your pledge for "${pledge.contributionType.title}" has been fully paid! Thank you.`;
    } else if (pledge.pendingAmount > 0 && newPendingAmount === 0) {
      message = `Hi ${pledge.user.fullName}, KES ${amount} cleared your pending pledge for "${pledge.contributionType.title}".`;
    }

   await createAndSendNotification({
  userId: pledge.userId,
  type: "payment_added",
  title: title,
  message: message,
  data: { pledgeId: updated.id, jumuiaId: pledge.contributionType.jumuiaId }
});


    res.json(updated);
  } catch (err) {
    console.error("Error adding manual payment:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/jumuia/pledges/:pledgeId/edit-message", authenticate, async (req, res) => {
  try {
    const { pledgeId } = req.params;
    const { message } = req.body;

    const pledge = await prisma.pledge.findUnique({
      where: { id: pledgeId },
      include: { contributionType: true }
    });

    if (!pledge) {
      return res.status(404).json({ error: "Pledge not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { leadingJumuia: true }
    });

    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    const isLeader = user.leadingJumuia?.id === pledge.contributionType.jumuiaId;

    if (!isAdmin && !isTreasurer && !isLeader) {
      return res.status(403).json({ error: "Not authorized to edit messages" });
    }

    const updated = await prisma.pledge.update({
      where: { id: pledgeId },
      data: { message }
    });

    res.json(updated);
  } catch (err) {
    console.error("Error editing message:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/jumuia/pledges/:pledgeId/reset", authenticate, async (req, res) => {
  try {
    const { pledgeId } = req.params;

    const pledge = await prisma.pledge.findUnique({
      where: { id: pledgeId },
      include: { contributionType: true }
    });

    if (!pledge) {
      return res.status(404).json({ error: "Pledge not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { leadingJumuia: true }
    });

    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    const isLeader = user.leadingJumuia?.id === pledge.contributionType.jumuiaId;

    if (!isAdmin && !isTreasurer && !isLeader) {
      return res.status(403).json({ error: "Not authorized to reset pledges" });
    }

    const updated = await prisma.pledge.update({
      where: { id: pledgeId },
      data: {
        amountPaid: 0,
        pendingAmount: 0,
        message: null,
        status: "PENDING",
        approvedById: null,
        approvedAt: null
      }
    });

    res.json(updated);
  } catch (err) {
    console.error("Error resetting pledge:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== JUMUIA BULK ACTIONS ==================
app.post("/api/jumuia/contributions/bulk-delete", authenticate, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No campaign IDs provided" });
    }

    const firstCampaign = await prisma.contributionType.findUnique({
      where: { id: ids[0] }
    });

    if (!firstCampaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { leadingJumuia: true }
    });

    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    const isLeader = user.leadingJumuia?.id === firstCampaign.jumuiaId;

    if (!isAdmin && !isTreasurer && !isLeader) {
      return res.status(403).json({ error: "Not authorized to delete campaigns" });
    }

    if (isLeader && !isAdmin) {
      const campaigns = await prisma.contributionType.findMany({
        where: {
          id: { in: ids }
        }
      });

      const allSameJumuia = campaigns.every(c => c.jumuiaId === firstCampaign.jumuiaId);
      if (!allSameJumuia) {
        return res.status(403).json({ error: "Cannot delete campaigns from different jumuias" });
      }
    }

    await prisma.pledge.deleteMany({
      where: {
        contributionTypeId: { in: ids }
      }
    });

    const result = await prisma.contributionType.deleteMany({
      where: {
        id: { in: ids }
      }
    });

    res.json({ 
      message: `Successfully deleted ${result.count} campaigns`,
      count: result.count 
    });
  } catch (err) {
    console.error("Bulk delete error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/jumuia/contributions/bulk-duplicate", authenticate, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No campaign IDs provided" });
    }

    const firstCampaign = await prisma.contributionType.findUnique({
      where: { id: ids[0] }
    });

    if (!firstCampaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { leadingJumuia: true }
    });

    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    const isLeader = user.leadingJumuia?.id === firstCampaign.jumuiaId;

    if (!isAdmin && !isTreasurer && !isLeader) {
      return res.status(403).json({ error: "Not authorized to duplicate campaigns" });
    }

    if (isLeader && !isAdmin) {
      const campaigns = await prisma.contributionType.findMany({
        where: {
          id: { in: ids }
        }
      });

      const allSameJumuia = campaigns.every(c => c.jumuiaId === firstCampaign.jumuiaId);
      if (!allSameJumuia) {
        return res.status(403).json({ error: "Cannot duplicate campaigns from different jumuias" });
      }
    }

    const campaignsToDuplicate = await prisma.contributionType.findMany({
      where: {
        id: { in: ids }
      }
    });

    const duplicatedCampaigns = [];

    for (const campaign of campaignsToDuplicate) {
      const newCampaign = await prisma.contributionType.create({
        data: {
          title: `${campaign.title} (Copy)`,
          description: campaign.description,
          amountRequired: campaign.amountRequired,
          deadline: campaign.deadline,
          jumuiaId: campaign.jumuiaId
        }
      });

      const members = await prisma.user.findMany({
        where: { jumuiaId: campaign.jumuiaId },
        select: { id: true }
      });

      if (members.length > 0) {
        await prisma.pledge.createMany({
          data: members.map(m => ({
            userId: m.id,
            contributionTypeId: newCampaign.id,
            pendingAmount: 0,
            amountPaid: 0,
            status: "PENDING"
          }))
        });
      }

      const completeCampaign = await prisma.contributionType.findUnique({
        where: { id: newCampaign.id },
        include: {
          pledges: {
            include: {
              user: {
                select: { id: true, fullName: true, email: true }
              }
            }
          }
        }
      });

      duplicatedCampaigns.push(completeCampaign);
    }

    res.json({
      message: `Successfully duplicated ${duplicatedCampaigns.length} campaigns`,
      campaigns: duplicatedCampaigns
    });
  } catch (err) {
    console.error("Bulk duplicate error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/jumuia/pledges/bulk-approve", authenticate, async (req, res) => {
  try {
    const { pledgeIds } = req.body;

    if (!pledgeIds || !Array.isArray(pledgeIds) || pledgeIds.length === 0) {
      return res.status(400).json({ error: "No pledge IDs provided" });
    }

    const firstPledge = await prisma.pledge.findUnique({
      where: { id: pledgeIds[0] },
      include: { contributionType: true }
    });

    if (!firstPledge) {
      return res.status(404).json({ error: "Pledge not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { leadingJumuia: true }
    });

    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    const isLeader = user.leadingJumuia?.id === firstPledge.contributionType.jumuiaId;

    if (!isAdmin && !isTreasurer && !isLeader) {
      return res.status(403).json({ error: "Not authorized to approve pledges" });
    }

    const results = [];

    for (const pledgeId of pledgeIds) {
      const pledge = await prisma.pledge.findUnique({
        where: { id: pledgeId },
        include: { contributionType: true }
      });

      if (!pledge || pledge.pendingAmount === 0) continue;

      const newAmountPaid = pledge.amountPaid + pledge.pendingAmount;
      const newStatus = newAmountPaid >= pledge.contributionType.amountRequired ? "COMPLETED" : "APPROVED";

      const updated = await prisma.pledge.update({
        where: { id: pledgeId },
        data: {
          amountPaid: newAmountPaid,
          pendingAmount: 0,
          status: newStatus,
          approvedById: req.user.userId,
          approvedAt: new Date()
        }
      });

      results.push(updated);

     await createAndSendNotification({
  userId: pledge.userId,
  type: "pledge_approved",
  title: newStatus === "COMPLETED" ? "🎉 Pledge Completed!" : "✅ Pledge Approved",
  message: newStatus === "COMPLETED" 
    ? `Hi ${pledge.user.fullName}, Your pledge for "${pledge.contributionType.title}" has been fully paid!`
    : `Hi ${pledge.user.fullName}, Your pledge of ${pledge.pendingAmount} for "${pledge.contributionType.title}" has been approved.`,
  data: { pledgeId: updated.id, jumuiaId: pledge.contributionType.jumuiaId }
});
    }

    res.json({ 
      message: `Successfully approved ${results.length} pledges`,
      count: results.length,
      pledges: results
    });
  } catch (err) {
    console.error("Bulk approve error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== JUMUIA MEMBERS ==================
app.get("/api/jumuia/:jumuiaId/members", authenticate, checkJumuiaAccess, async (req, res) => {
  try {
    const { jumuiaId } = req.params;
    const { search, page = 1, limit = 50 } = req.query;

    const where = { jumuiaId };
    
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { membership_number: { contains: search, mode: 'insensitive' } }
      ];
    }

    const members = await prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        profileImage: true,
        membership_number: true,
        role: true,
        specialRole: true,
        lastActive: true,
        createdAt: true
      },
      orderBy: { fullName: "asc" },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });

    const total = await prisma.user.count({ where });

    res.json({
      members,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error("Error fetching members:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/jumuia/:jumuiaId/members", authenticate, async (req, res) => {
  try {
    const { jumuiaId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { leadingJumuia: true }
    });

    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isLeader = user.leadingJumuia?.id === jumuiaId;

    if (!isAdmin && !isLeader) {
      return res.status(403).json({ error: "Not authorized to add members" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { jumuiaId },
      select: {
        id: true,
        fullName: true,
        email: true,
        jumuiaId: true
      }
    });

    res.json({ message: "Member added successfully", user: updatedUser });
  } catch (err) {
    console.error("Error adding member:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/jumuia/:jumuiaId/members/:userId", authenticate, async (req, res) => {
  try {
    const { jumuiaId, userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { leadingJumuia: true }
    });

    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isLeader = user.leadingJumuia?.id === jumuiaId;

    if (!isAdmin && !isLeader) {
      return res.status(403).json({ error: "Not authorized to remove members" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { jumuiaId: null },
      select: {
        id: true,
        fullName: true,
        email: true
      }
    });

    res.json({ message: "Member removed successfully", user: updatedUser });
  } catch (err) {
    console.error("Error removing member:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/jumuia/:jumuiaId/leaders", authenticate, async (req, res) => {
  try {
    const { jumuiaId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can assign leaders" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        specialRole: "jumuia_leader",
        assignedJumuiaId: jumuiaId
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        specialRole: true,
        leadingJumuia: true
      }
    });

    const jumuia = await prisma.jumuia.findUnique({
      where: { id: jumuiaId }
    });
await createAndSendNotification({
  userId: userId,
  type: "role_change",
  title: "👑 You are now a Jumuia Leader",
  message: `You have been appointed as leader of ${jumuia.name}`,
  data: { jumuiaId: jumuiaId, jumuiaName: jumuia.name }
});

    res.json(updatedUser);
  } catch (err) {
    console.error("Error assigning leader:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/jumuia/:jumuiaId/leaders/:userId", authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can remove leaders" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        specialRole: null,
        assignedJumuiaId: null
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        specialRole: true
      }
    });

    res.json({ message: "Leader removed successfully", user: updatedUser });
  } catch (err) {
    console.error("Error removing leader:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== JUMUIA CHAT ==================
const jumuiaChatUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const chatDir = path.join(__dirname, "uploads/jumuia-chat");
      if (!fs.existsSync(chatDir)) fs.mkdirSync(chatDir, { recursive: true });
      cb(null, chatDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `jchat_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|pdf|doc|docx|txt/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype.split("/")[1]);
    if (ext || mime) cb(null, true);
    else cb(new Error("File type not allowed"), false);
  },
});

app.use("/uploads/jumuia-chat", express.static(path.join(__dirname, "uploads/jumuia-chat")));

app.post("/api/jumuia/chat/upload", authenticate, jumuiaChatUpload.array("files", 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const uploadedFiles = req.files.map(file => ({
      name: file.originalname,
      url: `${baseUrl}/uploads/jumuia-chat/${file.filename}`,
      type: file.mimetype,
      size: file.size,
      filename: file.filename
    }));

    res.json(uploadedFiles);
  } catch (err) {
    console.error("Error uploading files:", err);
    res.status(500).json({ error: "Failed to upload files" });
  }
});

async function ensureJumuiaChatRoom(jumuiaId) {
  let room = await prisma.jumuiaChatRoom.findFirst({
    where: { jumuiaId, name: "general" }
  });

  if (!room) {
    room = await prisma.jumuiaChatRoom.create({
      data: {
        name: "general",
        jumuiaId,
        description: "General discussion"
      }
    });
  }

  return room;
}

app.get("/api/jumuia/:jumuiaId/chat/rooms", authenticate, checkJumuiaAccess, async (req, res) => {
  try {
    const { jumuiaId } = req.params;

    const rooms = await prisma.jumuiaChatRoom.findMany({
      where: { jumuiaId },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            user: {
              select: { id: true, fullName: true, profileImage: true }
            }
          }
        },
        _count: {
          select: { messages: true }
        }
      },
      orderBy: { lastMessageAt: "desc" }
    });

    res.json(rooms);
  } catch (err) {
    console.error("Error fetching chat rooms:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/jumuia/:jumuiaId/chat/rooms", authenticate, checkJumuiaAccess, async (req, res) => {
  try {
    const { jumuiaId } = req.params;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Room name is required" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isLeader = req.jumuiaAccess.isLeader;

    if (!isAdmin && !isLeader) {
      return res.status(403).json({ error: "Only admins and leaders can create rooms" });
    }

    const existingRoom = await prisma.jumuiaChatRoom.findFirst({
      where: { jumuiaId, name }
    });

    if (existingRoom) {
      return res.status(400).json({ error: "Room with this name already exists" });
    }

    const room = await prisma.jumuiaChatRoom.create({
      data: {
        name,
        description,
        jumuiaId,
        createdBy: req.user.userId
      }
    });

    res.status(201).json(room);
  } catch (err) {
    console.error("Error creating chat room:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/jumuia/chat/rooms/:roomId/messages", authenticate, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { cursor = null, limit = 50 } = req.query;

    const room = await prisma.jumuiaChatRoom.findUnique({
      where: { id: roomId },
      include: { jumuia: true }
    });

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { homeJumuia: true, leadingJumuia: true }
    });

    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isMember = user.homeJumuia?.id === room.jumuiaId;
    const isLeader = user.leadingJumuia?.id === room.jumuiaId;

    if (!isAdmin && !isMember && !isLeader) {
      return res.status(403).json({ error: "Access denied" });
    }

    const messages = await prisma.jumuiaChatMessage.findMany({
      where: { 
        roomId,
        isDeleted: false 
      },
      take: parseInt(limit),
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
            role: true
          }
        },
        reactions: {
          include: {
            user: {
              select: { id: true, fullName: true }
            }
          }
        },
        mentions: {
          where: { userId: req.user.userId },
          select: { id: true, readAt: true }
        },
        readReceipts: {
          where: { userId: req.user.userId },
          select: { id: true }
        },
        replyTo: {
          include: {
            user: {
              select: { id: true, fullName: true }
            }
          }
        }
      }
    });

    const formattedMessages = messages.map(m => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      attachments: m.attachments ? JSON.parse(m.attachments) : [],
      isMentioned: m.mentions.length > 0,
      isRead: m.readReceipts.length > 0
    }));

    const mentionIds = messages.flatMap(m => 
      m.mentions.filter(ment => !ment.readAt).map(ment => ment.id)
    );

    if (mentionIds.length > 0) {
      await prisma.jumuiaMention.updateMany({
        where: { id: { in: mentionIds } },
        data: { readAt: new Date() }
      });
    }

    res.json({
      messages: formattedMessages,
      nextCursor: messages.length === parseInt(limit) ? messages[messages.length - 1].id : null
    });
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/jumuia/chat/rooms/:roomId/messages", authenticate, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, replyToId, attachments } = req.body;

    if ((!content || content.trim() === "") && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    const room = await prisma.jumuiaChatRoom.findUnique({
      where: { id: roomId },
      include: { jumuia: true }
    });

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { homeJumuia: true, leadingJumuia: true }
    });

    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isMember = user.homeJumuia?.id === room.jumuiaId;
    const isLeader = user.leadingJumuia?.id === room.jumuiaId;

    if (!isAdmin && !isMember && !isLeader) {
      return res.status(403).json({ error: "Access denied" });
    }

    const message = await prisma.jumuiaChatMessage.create({
      data: {
        content: content || "",
        userId: req.user.userId,
        roomId,
        replyToId: replyToId || null,
        attachments: attachments ? JSON.stringify(attachments) : null
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
            role: true
          }
        }
      }
    });

    await prisma.jumuiaChatRoom.update({
      where: { id: roomId },
      data: { lastMessageAt: new Date() }
    });

   

    const mentionRegex = /@(\w+)/g;
    let match;
    const mentions = [];

    if (content) {
      while ((match = mentionRegex.exec(content)) !== null) {
        const username = match[1];
        const mentionedUser = await prisma.user.findFirst({
          where: { 
            fullName: { contains: username, mode: 'insensitive' },
            homeJumuia: { id: room.jumuiaId }
          }
        });

        if (mentionedUser && mentionedUser.id !== req.user.userId) {
          mentions.push({
            userId: mentionedUser.id,
            messageId: message.id
          });
        }
      }
    }

    if (mentions.length > 0) {
      await prisma.jumuiaMention.createMany({ data: mentions });

      const now = new Date();
      const notifications = mentions.map(m => ({
        id: `jmention-${message.id}-${m.userId}-${Date.now()}`,
        userId: m.userId,
        jumuiaId: room.jumuiaId,
        type: "chat_mention",
        title: "👤 You were mentioned",
        message: `${user.fullName} mentioned you in ${room.name}`,
        data: { messageId: message.id, roomId, jumuiaId: room.jumuiaId },
        read: false,
        createdAt: now,
      }));

   // Send push notifications to all members
for (const notif of notifications) {
  await createAndSendNotification({
    userId: notif.userId,
    type: notif.type,
    title: notif.title,
    message: notif.message,
    data: notif.data || {}
  });
}}

    const formattedMessage = {
      ...message,
      createdAt: message.createdAt.toISOString(),
      attachments: message.attachments ? JSON.parse(message.attachments) : [],
      reactions: [],
      mentions: []
    };

    io.to(`jumuia-${room.jumuiaId}`).emit("new_jumuia_message", formattedMessage);

    res.status(201).json(formattedMessage);
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/jumuia/chat/messages/:messageId/reactions", authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reaction } = req.body;

    if (!reaction) {
      return res.status(400).json({ error: "Reaction is required" });
    }

    const message = await prisma.jumuiaChatMessage.findUnique({
      where: { id: messageId },
      include: { room: { include: { jumuia: true } } }
    });

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { homeJumuia: true, leadingJumuia: true }
    });

    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isMember = user.homeJumuia?.id === message.room.jumuiaId;
    const isLeader = user.leadingJumuia?.id === message.room.jumuiaId;

    if (!isAdmin && !isMember && !isLeader) {
      return res.status(403).json({ error: "Access denied" });
    }

    const existing = await prisma.jumuiaChatReaction.findUnique({
      where: {
        messageId_userId_reaction: {
          messageId,
          userId: req.user.userId,
          reaction
        }
      }
    });

    let result;
    if (existing) {
      await prisma.jumuiaChatReaction.delete({
        where: { id: existing.id }
      });
      result = { action: "removed", reaction };
    } else {
      const newReaction = await prisma.jumuiaChatReaction.create({
        data: {
          messageId,
          userId: req.user.userId,
          reaction
        },
        include: {
          user: {
            select: { id: true, fullName: true }
          }
        }
      });
      result = {
        action: "added",
        reaction: {
          ...newReaction,
          createdAt: newReaction.createdAt.toISOString()
        }
      };
    }

    const reactions = await prisma.jumuiaChatReaction.groupBy({
      by: ['reaction'],
      where: { messageId },
      _count: true
    });

    const reactionCount = reactions.reduce((acc, r) => {
      acc[r.reaction] = r._count;
      return acc;
    }, {});

    await prisma.jumuiaChatMessage.update({
      where: { id: messageId },
      data: { reactionCount }
    });

    io.to(`jumuia-${message.room.jumuiaId}`).emit("jumuia_reaction_updated", {
      messageId,
      reactionCount,
      userId: req.user.userId,
      reaction,
      action: result.action
    });

    res.json(result);
  } catch (err) {
    console.error("Error handling reaction:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/jumuia/chat/messages/:messageId/read", authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await prisma.jumuiaChatMessage.findUnique({
      where: { id: messageId },
      include: { room: { include: { jumuia: true } } }
    });

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const existing = await prisma.jumuiaReadReceipt.findUnique({
      where: {
        messageId_userId: {
          messageId,
          userId: req.user.userId
        }
      }
    });

    if (!existing) {
      await prisma.jumuiaReadReceipt.create({
        data: {
          messageId,
          userId: req.user.userId,
          readAt: new Date()
        }
      });

      io.to(`jumuia-${message.room.jumuiaId}`).emit("jumuia_message_read", {
        messageId,
        userId: req.user.userId
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error marking message as read:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== JUMUIA ANNOUNCEMENTS ==================
app.get("/api/jumuia/:jumuiaId/announcements", authenticate, checkJumuiaAccess, async (req, res) => {
  try {
    const { jumuiaId } = req.params;

    const announcements = await prisma.announcement.findMany({
      where: { 
        jumuiaId,
        published: true 
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            profileImage: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const formatted = announcements.map(a => ({
      ...a,
      createdAt: a.createdAt.toISOString()
    }));

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching jumuia announcements:", err);
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/jumuia/:jumuiaId/announcements", authenticate, checkJumuiaAccess, async (req, res) => {
  try {
    const { jumuiaId } = req.params;
    const { title, content, category } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isSecretary = user.specialRole === "secretary";
    const isLeader = req.jumuiaAccess.isLeader;

    if (!isAdmin && !isSecretary && !isLeader) {
      return res.status(403).json({ error: "Not authorized to create announcements" });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        category: category || "General",
        published: true,
        jumuiaId,
        createdBy: req.user.userId
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            profileImage: true
          }
        }
      }
    });

    const formatted = {
      ...announcement,
      createdAt: announcement.createdAt.toISOString()
    };

    res.status(201).json(formatted);

    const members = await prisma.user.findMany({
      where: { jumuiaId },
      select: { id: true }
    });

    if (members.length > 0) {
      Promise.allSettled(
        members.map(async (member) => {
          try {
            await createAndSendNotification({
              userId: member.id,
              type: "announcement",
              title: "📢 New Jumuia Announcement",
              message: title,
              data: { announcementId: announcement.id, jumuiaId }
            });
          } catch (err) {
            console.error("Failed to send jumuia announcement notification:", err.message);
          }
        })
      ).then(() => {
        console.log(`✅ Sent ${members.length} jumuia announcement push notifications`);
      });
    }

  } catch (err) {
    console.error("Error creating jumuia announcement:", err);
    res.status(500).json({ error: err.message });
  }
});



// ==================== COMPLETE JUMUIA CHAT MISSING ROUTES ====================

// 1. Delete Jumuia Chat Message (Soft delete)
app.delete("/api/jumuia/chat/messages/:messageId", authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await prisma.jumuiaChatMessage.findUnique({
      where: { id: messageId },
      include: { room: { include: { jumuia: true } } }
    });
    
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { leadingJumuia: true }
    });
    
    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isLeader = user.leadingJumuia?.id === message.room.jumuiaId;
    const isOwner = message.userId === req.user.userId;
    
    if (!isAdmin && !isLeader && !isOwner) {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    // Soft delete
    const deleted = await prisma.jumuiaChatMessage.update({
      where: { id: messageId },
      data: { 
        isDeleted: true, 
        deletedAt: new Date(),
        deletedBy: req.user.userId,
        content: "[Message deleted]"
      }
    });
    
    // Emit delete event to room
    io.to(`jumuia-${message.room.jumuiaId}`).emit("jumuia_message_deleted", { 
      messageId, 
      deletedBy: req.user.userId 
    });
    
    res.json({ success: true, message: "Message deleted" });
  } catch (err) {
    console.error("Error deleting jumuia message:", err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Edit Jumuia Chat Message
app.put("/api/jumuia/chat/messages/:messageId", authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    
    if (!content || content.trim() === "") {
      return res.status(400).json({ error: "Message content cannot be empty" });
    }
    
    const message = await prisma.jumuiaChatMessage.findUnique({
      where: { id: messageId },
      include: { room: { include: { jumuia: true } } }
    });
    
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }
    
    // Only message owner can edit (not even admin)
    if (message.userId !== req.user.userId) {
      return res.status(403).json({ error: "Only message owner can edit" });
    }
    
    // Can't edit deleted messages
    if (message.isDeleted) {
      return res.status(400).json({ error: "Cannot edit deleted message" });
    }
    
    const updated = await prisma.jumuiaChatMessage.update({
      where: { id: messageId },
      data: { 
        content: content.trim(),
        isEdited: true,
        updatedAt: new Date()
      },
      include: {
        user: { select: { id: true, fullName: true, profileImage: true } }
      }
    });
    
    // Emit edit event to room
    io.to(`jumuia-${message.room.jumuiaId}`).emit("jumuia_message_edited", {
      id: updated.id,
      content: updated.content,
      isEdited: updated.isEdited,
      updatedAt: updated.updatedAt
    });
    
    res.json(updated);
  } catch (err) {
    console.error("Error editing jumuia message:", err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Get unread message count for a jumuia room
app.get("/api/jumuia/chat/rooms/:roomId/unread-count", authenticate, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;
    
    // Get the room and verify access
    const room = await prisma.jumuiaChatRoom.findUnique({
      where: { id: roomId },
      include: { jumuia: true }
    });
    
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { homeJumuia: true, leadingJumuia: true }
    });
    
    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isMember = user.homeJumuia?.id === room.jumuiaId;
    const isLeader = user.leadingJumuia?.id === room.jumuiaId;
    
    if (!isAdmin && !isMember && !isLeader) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    // Count unread messages (messages without a read receipt from this user)
    const unreadCount = await prisma.jumuiaChatMessage.count({
      where: {
        roomId: roomId,
        isDeleted: false,
        userId: { not: userId }, // Don't count user's own messages
        readReceipts: {
          none: { userId: userId }
        }
      }
    });
    
    res.json({ unreadCount });
  } catch (err) {
    console.error("Error getting unread count:", err);
    res.status(500).json({ error: err.message });
  }
});

// 4. Search jumuia chat messages
app.get("/api/jumuia/chat/search", authenticate, async (req, res) => {
  try {
    const { q, jumuiaId, roomId, limit = 50 } = req.query;
    
    if (!q || q.trim() === "") {
      return res.status(400).json({ error: "Search query required" });
    }
    
    // Build where clause
    const where = {
      isDeleted: false,
      content: { contains: q, mode: 'insensitive' }
    };
    
    if (roomId) {
      where.roomId = roomId;
    } else if (jumuiaId) {
      // Search across all rooms in a jumuia
      const rooms = await prisma.jumuiaChatRoom.findMany({
        where: { jumuiaId },
        select: { id: true }
      });
      where.roomId = { in: rooms.map(r => r.id) };
    }
    
    const messages = await prisma.jumuiaChatMessage.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, profileImage: true } },
        room: { select: { id: true, name: true, jumuiaId: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });
    
    res.json(messages);
  } catch (err) {
    console.error("Error searching jumuia messages:", err);
    res.status(500).json({ error: err.message });
  }
});

// 5. Typing indicator for jumuia chat
app.post("/api/jumuia/chat/rooms/:roomId/typing", authenticate, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { isTyping } = req.body;
    
    const room = await prisma.jumuiaChatRoom.findUnique({
      where: { id: roomId },
      include: { jumuia: true }
    });
    
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    
    // Emit typing event to everyone in the jumuia room
    io.to(`jumuia-${room.jumuiaId}`).emit("jumuia_typing", {
      roomId,
      userId: req.user.userId,
      userName: req.user.fullName,
      isTyping: isTyping || false
    });
    
    res.json({ success: true });
  } catch (err) {
    console.error("Error sending typing indicator:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== COMPLETE JUMUIA ANNOUNCEMENTS MISSING ROUTES ====================

// 6. Update Jumuia Announcement
app.put("/api/jumuia/:jumuiaId/announcements/:announcementId", authenticate, async (req, res) => {
  try {
    const { jumuiaId, announcementId } = req.params;
    const { title, content, category, published } = req.body;
    
    const announcement = await prisma.announcement.findFirst({
      where: { id: announcementId, jumuiaId }
    });
    
    if (!announcement) {
      return res.status(404).json({ error: "Announcement not found" });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { leadingJumuia: true }
    });
    
    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isSecretary = user.specialRole === "secretary";
    const isLeader = user.leadingJumuia?.id === jumuiaId;
    const isCreator = announcement.createdBy === req.user.userId;
    
    if (!isAdmin && !isSecretary && !isLeader && !isCreator) {
      return res.status(403).json({ error: "Not authorized to update this announcement" });
    }
    
    const updated = await prisma.announcement.update({
      where: { id: announcementId },
      data: {
        title: title || announcement.title,
        content: content || announcement.content,
        category: category || announcement.category,
        published: published !== undefined ? published : announcement.published
      },
      include: {
        author: { select: { id: true, fullName: true, profileImage: true } }
      }
    });
    
    // Emit update event to jumuia room
    io.to(`jumuia-${jumuiaId}`).emit("jumuia_announcement_updated", updated);
    
    res.json(updated);
  } catch (err) {
    console.error("Error updating jumuia announcement:", err);
    res.status(500).json({ error: err.message });
  }
});

// 7. Delete Jumuia Announcement
app.delete("/api/jumuia/:jumuiaId/announcements/:announcementId", authenticate, async (req, res) => {
  try {
    const { jumuiaId, announcementId } = req.params;
    
    const announcement = await prisma.announcement.findFirst({
      where: { id: announcementId, jumuiaId }
    });
    
    if (!announcement) {
      return res.status(404).json({ error: "Announcement not found" });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { leadingJumuia: true }
    });
    
    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isSecretary = user.specialRole === "secretary";
    const isLeader = user.leadingJumuia?.id === jumuiaId;
    const isCreator = announcement.createdBy === req.user.userId;
    
    if (!isAdmin && !isSecretary && !isLeader && !isCreator) {
      return res.status(403).json({ error: "Not authorized to delete this announcement" });
    }
    
    await prisma.announcement.delete({ where: { id: announcementId } });
    
    // Emit delete event to jumuia room
    io.to(`jumuia-${jumuiaId}`).emit("jumuia_announcement_deleted", { announcementId });
    
    res.json({ success: true, message: "Announcement deleted" });
  } catch (err) {
    console.error("Error deleting jumuia announcement:", err);
    res.status(500).json({ error: err.message });
  }
});

// 8. Toggle publish status for jumuia announcement
app.patch("/api/jumuia/:jumuiaId/announcements/:announcementId/publish", authenticate, async (req, res) => {
  try {
    const { jumuiaId, announcementId } = req.params;
    const { published } = req.body;
    
    const announcement = await prisma.announcement.findFirst({
      where: { id: announcementId, jumuiaId }
    });
    
    if (!announcement) {
      return res.status(404).json({ error: "Announcement not found" });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { leadingJumuia: true }
    });
    
    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isSecretary = user.specialRole === "secretary";
    const isLeader = user.leadingJumuia?.id === jumuiaId;
    
    if (!isAdmin && !isSecretary && !isLeader) {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    const updated = await prisma.announcement.update({
      where: { id: announcementId },
      data: { published: published }
    });
    
    if (published) {
      // Send notification to all jumuia members when published
      const members = await prisma.user.findMany({
        where: { jumuiaId },
        select: { id: true }
      });
      
      for (const member of members) {
        await createAndSendNotification({
          userId: member.id,
          type: "announcement",
          title: `📢 ${announcement.title}`,
          message: announcement.content.substring(0, 100),
          data: { announcementId, jumuiaId }
        });
      }
    }
    
    res.json(updated);
  } catch (err) {
    console.error("Error toggling announcement publish:", err);
    res.status(500).json({ error: err.message });
  }
});

console.log("✅ Complete Jumuia Chat & Announcements routes added!");

// ================== JUMUIA NOTIFICATIONS ==================
app.get("/api/jumuia/:jumuiaId/notifications", authenticate, checkJumuiaAccess, async (req, res) => {
  try {
    const { jumuiaId } = req.params;
    const userId = req.user.userId;

    const notifications = await prisma.notification.findMany({
      where: { 
        userId,
        jumuiaId 
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    const formatted = notifications.map(n => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
      readAt: n.readAt?.toISOString()
    }));

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching jumuia notifications:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== ENHANCED CHAT WITH DATABASE FILE STORAGE ==================

// Multer config - Store in memory for database storage
const chatUpload = multer({
  storage: multer.memoryStorage(), // Store in memory, not disk
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit (optional, remove if you want unlimited)
  fileFilter: (req, file, cb) => {
    // Allow all file types
    cb(null, true);
  },
});

// Ensure default chat room exists
async function ensureDefaultChatRoom() {
  const room = await prisma.chatRoom.findFirst({ where: { name: "default" } });
  if (!room) await prisma.chatRoom.create({ data: { name: "default" } });
}
ensureDefaultChatRoom();

// ================== FILE UPLOAD & MANAGEMENT ==================

// Upload files to database
app.post("/api/chat/upload", authenticate, chatUpload.array("files", 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      // Convert buffer to base64
      const base64Data = file.buffer.toString('base64');

      // Store in database
      const dbFile = await prisma.file.create({
        data: {
          name: file.originalname,
          type: file.mimetype,
          size: file.size,
          data: base64Data,
          userId: req.user.userId
        }
      });

      // FIXED: Use dynamic URL from request - NO HARDCODING!
      const protocol = req.protocol;
      const host = req.get('host');
      const baseUrl = `${protocol}://${host}`;
      
      uploadedFiles.push({
        id: dbFile.id,
        name: dbFile.name,
        type: dbFile.type,
        size: dbFile.size,
        url: `${baseUrl}/api/chat/files/${dbFile.id}`
      });
    }

    res.json(uploadedFiles);
  } catch (err) {
    console.error("Error uploading files:", err);
    res.status(500).json({ error: "Failed to upload files" });
  }
});

// Serve files from database - accepts token in header OR query param
app.get("/api/chat/files/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    const { token } = req.query;
    
    // Check for token in header or query param
    let userId = null;
    let authToken = null;
    
    // First check query param
    if (token) {
      authToken = token;
    } else {
      // Then check header
      const authHeader = req.headers.authorization;
      if (authHeader) {
        authToken = authHeader.split(" ")[1];
      }
    }
    
    // Verify token
    if (!authToken) {
      return res.status(401).json({ error: "No token provided" });
    }
    
    try {
      const decoded = jwt.verify(authToken, JWT_SECRET);
      userId = decoded.userId;
    } catch (err) {
      return res.status(401).json({ error: "Invalid token" });
    }
    
    // Get file from database
    const file = await prisma.file.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Optional: Check if user has access to this file
    // You can add additional checks here if needed

    // Convert base64 back to buffer
    const fileBuffer = Buffer.from(file.data, 'base64');

    // Set proper headers for image display
    res.setHeader('Content-Type', file.type);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.name)}"`);
    res.setHeader('Content-Length', file.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Send file
    res.send(fileBuffer);
  } catch (err) {
    console.error("Error serving file:", err);
    res.status(500).json({ error: "Failed to serve file" });
  }
});

// Download file (forces download instead of inline display)
app.get("/api/chat/files/:fileId/download", authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const file = await prisma.file.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    const fileBuffer = Buffer.from(file.data, 'base64');

    res.setHeader('Content-Type', file.type);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
    res.setHeader('Content-Length', file.size);
    res.setHeader('Access-Control-Allow-Origin', '*');

    res.send(fileBuffer);
  } catch (err) {
    console.error("Error downloading file:", err);
    res.status(500).json({ error: "Failed to download file" });
  }
});

// Delete file (soft delete by removing message association)
app.delete("/api/chat/files/:fileId", authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: { message: true }
    });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Check if user owns the file or is admin
    if (file.userId !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }

    // If file is attached to a message, remove the association first
    if (file.messageId) {
      await prisma.file.update({
        where: { id: fileId },
        data: { messageId: null }
      });
    }

    // Delete the file from database
    await prisma.file.delete({
      where: { id: fileId }
    });

    // Emit file deleted event
    io.emit("file_deleted", { fileId, messageId: file.messageId });

    res.json({ message: "File deleted successfully" });
  } catch (err) {
    console.error("Error deleting file:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get files for a specific message
app.get("/api/chat/messages/:messageId/files", authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;

    const files = await prisma.file.findMany({
      where: { 
        messageId,
        message: { isDeleted: false }
      },
      select: {
        id: true,
        name: true,
        type: true,
        size: true,
        createdAt: true,
        userId: true
      }
    });

    const filesWithUrls = files.map(f => ({
      ...f,
      url: `/api/chat/files/${f.id}`,
      thumbnail: f.type.startsWith('image/') ? `/api/chat/files/${f.id}` : null
    }));

    res.json(filesWithUrls);
  } catch (err) {
    console.error("Error fetching message files:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== BASIC CHAT ROUTES (keep for compatibility) ==================

app.get("/api/chat", authenticate, async (req, res) => {
  try {
    const defaultRoom = await prisma.chatRoom.findFirst({ where: { name: "default" } });
    const messages = await prisma.message.findMany({
      where: { 
        roomId: defaultRoom.id,
        isDeleted: false 
      },
      include: { 
        user: { 
          select: { 
            id: true, 
            fullName: true, 
            email: true, 
            role: true,
            profileImage: true 
          } 
        },
        files: {
          select: {
            id: true,
            name: true,
            type: true,
            size: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });
    
    const formattedMessages = messages.map(m => ({
    
      createdAt: m.createdAt.toISOString(),
      attachments: m.attachments ? JSON.parse(m.attachments) : [],
      files: m.files.map(f => ({

        ...f,
        url: `/api/chat/files/${f.id}`,
        thumbnail: f.type.startsWith('image/') ? `/api/chat/files/${f.id}` : null
      }))
    }));
    
    res.json(formattedMessages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/chat", authenticate, async (req, res) => {
  try {
    const { content, replyToId, attachments } = req.body;
    
    if ((!content || content.trim() === "") && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    const defaultRoom = await prisma.chatRoom.findFirst({ where: { name: "default" } });
    
    // Create message
    const message = await prisma.message.create({ 
      data: { 
        content: content || "",
        userId: req.user.userId, 
        roomId: defaultRoom.id,
        replyToId: replyToId || null,
        attachments: attachments ? JSON.stringify(attachments) : null
      } 
    });

    // If there are file IDs in attachments, link them to this message
    if (attachments && attachments.length > 0) {
      const fileIds = attachments
        .filter(a => a.id) // Only items that have an id (our new file system)
        .map(a => a.id);
      
      if (fileIds.length > 0) {
        await prisma.file.updateMany({
          where: { id: { in: fileIds } },
          data: { messageId: message.id }
        });
      }
    }
    
    const messageWithUser = await prisma.message.findUnique({
      where: { id: message.id },
      include: { 
        user: { 
          select: { 
            id: true, 
            fullName: true, 
            email: true, 
            role: true,
            profileImage: true 
          } 
        },
        files: {
          select: {
            id: true,
            name: true,
            type: true,
            size: true
          }
        }
      }
    });
    
    const formattedMessage = {
      ...messageWithUser,
      createdAt: messageWithUser.createdAt.toISOString(),
      attachments: messageWithUser.attachments ? JSON.parse(messageWithUser.attachments) : [],
      files: messageWithUser.files.map(f => ({
        ...f,
        url: `/api/chat/files/${f.id}`,
        thumbnail: f.type.startsWith('image/') ? `/api/chat/files/${f.id}` : null
      }))
    };
    
    io.emit("new_message", formattedMessage);
    
    res.json(formattedMessage);
  } catch (err) {
    console.error("Error creating message:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== ENHANCED CHAT ROUTES ==================

app.get("/api/chat/enhanced", authenticate, async (req, res) => {
  try {
    const defaultRoom = await prisma.chatRoom.findFirst({ where: { name: "default" } });
    
    const messages = await prisma.message.findMany({
      where: { 
        roomId: defaultRoom.id,
        isDeleted: false 
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            profileImage: true
          }
        },
        files: {
          select: {
            id: true,
            name: true,
            type: true,
            size: true,
            createdAt: true,
            userId: true
          }
        },
        reactions: {
          include: {
            user: {
              select: { id: true, fullName: true }
            }
          }
        },
        mentions: {
          include: {
            user: {
              select: { id: true, fullName: true }
            }
          }
        },
        readReceipts: {
          include: {
            user: {
              select: { id: true, fullName: true }
            }
          }
        },
        replyTo: {
          include: {
            user: {
              select: { id: true, fullName: true }
            },
            files: {
              select: {
                id: true,
                name: true,
                type: true,
                size: true
              }
            }
          }
        },
        replies: {
          where: { isDeleted: false },
          take: 3,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, fullName: true }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }, // 👈 CHANGE THIS FROM "asc" TO "desc"
    });

    const formattedMessages = messages.map(m => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt?.toISOString(),
      deletedAt: m.deletedAt?.toISOString(),
      attachments: m.attachments ? JSON.parse(m.attachments) : [],
      files: m.files.map(f => ({
        ...f,
        url: `/api/chat/files/${f.id}`,
        thumbnail: f.type.startsWith('image/') ? `/api/chat/files/${f.id}` : null
      })),
      reactions: m.reactions.map(r => ({
        ...r,
        createdAt: r.createdAt.toISOString()
      })),
      mentions: m.mentions.map(ment => ({
        ...ment,
        createdAt: ment.createdAt.toISOString(),
        readAt: ment.readAt?.toISOString()
      })),
      readReceipts: m.readReceipts.map(rr => ({
        ...rr,
        readAt: rr.readAt.toISOString()
      }))
    }));

    res.json(formattedMessages);
  } catch (err) {
    console.error("Error fetching enhanced messages:", err);
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/chat/enhanced", authenticate, async (req, res) => {
  try {
    const { content, replyToId, attachments } = req.body;
    
    if ((!content || content.trim() === "") && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    const defaultRoom = await prisma.chatRoom.findFirst({ where: { name: "default" } });

    if (!defaultRoom) {
      return res.status(404).json({ error: "Chat room not found" });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        content: content || "",
        userId: req.user.userId,
        roomId: defaultRoom.id,
        replyToId: replyToId || null
      }
    });

    // Link files if any
    const fileIds = [];
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        if (attachment.id) {
          fileIds.push(attachment.id);
        }
      }
      
      if (fileIds.length > 0) {
        await prisma.file.updateMany({
          where: { 
            id: { in: fileIds },
            userId: req.user.userId
          },
          data: { messageId: message.id }
        });
      }
    }

    // Get full message with relations
    const fullMessage = await prisma.message.findUnique({
      where: { id: message.id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            profileImage: true
          }
        },
        files: {
          select: {
            id: true,
            name: true,
            type: true,
            size: true,
            createdAt: true
          }
        },
        replyTo: {
          include: {
            user: {
              select: { id: true, fullName: true }
            }
          }
        }
      }
    });

    await prisma.chatRoom.update({
      where: { id: defaultRoom.id },
      data: { lastMessageAt: new Date() }
    });

    // Handle mentions
    if (content) {
      const mentionRegex = /@(\w+)/g;
      let match;
      const mentions = [];
      
      while ((match = mentionRegex.exec(content)) !== null) {
        const username = match[1];
        const mentionedUser = await prisma.user.findFirst({
          where: { fullName: { contains: username, mode: 'insensitive' } }
        });
        if (mentionedUser && mentionedUser.id !== req.user.userId) {
          mentions.push({
            userId: mentionedUser.id,
            messageId: message.id
          });
        }
      }

      if (mentions.length > 0) {
        await prisma.mention.createMany({
          data: mentions
        });

        // Send push notifications for mentions
        for (const mention of mentions) {
          await createAndSendNotification({
            userId: mention.userId,
            type: "mention",
            title: "👤 You were mentioned",
            message: `${req.user.fullName} mentioned you: ${content.substring(0, 50)}...`,
            data: { messageId: message.id }
          });
        }
      }
    }

    const formattedMessage = {
      ...fullMessage,
      createdAt: fullMessage.createdAt.toISOString(),
      files: fullMessage.files.map(f => ({
        ...f,
        url: `/api/chat/files/${f.id}`,
        thumbnail: f.type.startsWith('image/') ? `/api/chat/files/${f.id}` : null
      }))
    };

    io.emit("new_message", formattedMessage);
    res.status(201).json(formattedMessage);
    
  } catch (err) {
    console.error("Error creating enhanced message:", err);
    res.status(500).json({ error: err.message });
  }
}); // <-- Make sure this closing bracket is here
// ================== MESSAGE MANAGEMENT ==================

// Delete message (soft delete)
app.delete("/api/chat/:id", authenticate, async (req, res) => {
  try {
    const messageId = req.params.id;
    
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { files: true }
    });

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if user is authorized (message owner or admin)
    if (message.userId !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Soft delete the message
    await prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user.userId
      }
    });

    // Option 1: Keep files but remove message association
    await prisma.file.updateMany({
      where: { messageId },
      data: { messageId: null }
    });

    // Option 2: Delete files completely (uncomment if you want this)
    // await prisma.file.deleteMany({
    //   where: { messageId }
    // });

    io.emit("message_deleted", { id: messageId });

    res.json({ message: "Message deleted successfully" });
  } catch (err) {
    console.error("Error deleting message:", err);
    res.status(500).json({ error: err.message });
  }
});

// Hard delete message (admin only)
app.delete("/api/chat/:id/hard", requireAdmin, async (req, res) => {
  try {
    const messageId = req.params.id;
    
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { files: true }
    });

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Delete associated files from database
    await prisma.file.deleteMany({
      where: { messageId }
    });

    // Delete the message
    await prisma.message.delete({
      where: { id: messageId }
    });

    io.emit("message_permanently_deleted", { id: messageId });

    res.json({ message: "Message and associated files permanently deleted" });
  } catch (err) {
    console.error("Error hard deleting message:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== REACTIONS ==================

app.post("/api/chat/:messageId/reactions", authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reaction } = req.body;

    if (!reaction) {
      return res.status(400).json({ error: "Reaction is required" });
    }

    // Check if message exists and is not deleted
    const message = await prisma.message.findFirst({
      where: { 
        id: messageId,
        isDeleted: false
      }
    });

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const existing = await prisma.messageReaction.findUnique({
      where: {
        messageId_userId_reaction: {
          messageId,
          userId: req.user.userId,
          reaction
        }
      }
    });

    if (existing) {
      await prisma.messageReaction.delete({
        where: { id: existing.id }
      });
      
      io.emit("reaction_removed", { 
        messageId, 
        userId: req.user.userId, 
        reaction 
      });
      
      res.json({ message: "Reaction removed", action: "removed" });
    } else {
      const newReaction = await prisma.messageReaction.create({
        data: {
          messageId,
          userId: req.user.userId,
          reaction
        },
        include: {
          user: {
            select: { id: true, fullName: true }
          }
        }
      });

      const formattedReaction = {
        ...newReaction,
        createdAt: newReaction.createdAt.toISOString()
      };

      io.emit("new_reaction", formattedReaction);

      res.status(201).json(formattedReaction);
    }
  } catch (err) {
    console.error("Error adding reaction:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== MESSAGE EDITING ==================

app.put("/api/chat/:messageId", authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content || content.trim() === "") {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    const message = await prisma.message.findFirst({
      where: { 
        id: messageId,
        isDeleted: false
      }
    });

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.userId !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: content.trim(),
        isEdited: true,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: { id: true, fullName: true, role: true }
        }
      }
    });

    const formattedMessage = {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString()
    };

    io.emit("message_edited", formattedMessage);

    res.json(formattedMessage);
  } catch (err) {
    console.error("Error editing message:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== READ RECEIPTS ==================

app.post("/api/chat/:messageId/read", authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await prisma.message.findFirst({
      where: { 
        id: messageId,
        isDeleted: false
      }
    });

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const existing = await prisma.readReceipt.findUnique({
      where: {
        messageId_userId: {
          messageId,
          userId: req.user.userId
        }
      }
    });

    if (!existing) {
      const readReceipt = await prisma.readReceipt.create({
        data: {
          messageId,
          userId: req.user.userId,
          readAt: new Date()
        },
        include: {
          user: {
            select: { id: true, fullName: true }
          }
        }
      });

      const formattedReceipt = {
        ...readReceipt,
        readAt: readReceipt.readAt.toISOString()
      };

      io.emit("message_read", formattedReceipt);

      res.json(formattedReceipt);
    } else {
      res.json({ message: "Already marked as read" });
    }
  } catch (err) {
    console.error("Error marking message as read:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== PINNED MESSAGES ==================

app.post("/api/chat/:messageId/pin", authenticate, requireAdmin, async (req, res) => {
  try {
    const { messageId } = req.params;

    // Get the message with its room
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { room: true }
    });

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if already pinned
    const existingPin = await prisma.pin.findFirst({
      where: { 
        messageId: messageId,
        roomId: message.roomId
      }
    });

    if (existingPin) {
      // UNPIN
      await prisma.pin.delete({
        where: { id: existingPin.id }
      });
      
      io.emit("message_unpinned", { messageId, roomId: message.roomId });
      return res.json({ message: "Message unpinned" });
    } 
    
    // PIN - Include ALL required fields
    const pin = await prisma.pin.create({
      data: {
        messageId: messageId,
        roomId: message.roomId,
        userId: req.user.userId  // REQUIRED - add the current user's ID
      },
      include: {
        user: {
          select: { id: true, fullName: true }
        },
        message: {
          include: {
            user: {
              select: { id: true, fullName: true }
            },
            files: {
              select: {
                id: true,
                name: true,
                type: true,
                size: true
              }
            }
          }
        }
      }
    });

    const formattedPin = {
      ...pin,
      createdAt: pin.createdAt.toISOString(),
      message: {
        ...pin.message,
        createdAt: pin.message.createdAt.toISOString(),
        files: pin.message.files.map(f => ({
          ...f,
          url: `/api/chat/files/${f.id}`,
          thumbnail: f.type.startsWith('image/') ? `/api/chat/files/${f.id}` : null
        }))
      }
    };

    io.emit("message_pinned", formattedPin);

   // Notify message author
if (message.userId !== req.user.userId) {
  await createAndSendNotification({
    userId: message.userId,
    type: "pin",
    title: "📌 Your message was pinned",
    message: `Your message was pinned by an admin`,
    data: { messageId: message.id }
  });
}

res.status(201).json(formattedPin);

} catch (err) {
  console.error("Error pinning message:", err);
  res.status(500).json({ error: err.message });
}
});

app.get("/api/chat/pinned", authenticate, async (req, res) => {
  try {
    const defaultRoom = await prisma.chatRoom.findFirst({ where: { name: "default" } });
    
    const pins = await prisma.pin.findMany({
      where: { 
        roomId: defaultRoom.id,
        message: { isDeleted: false }
      },
      include: {
        message: {
          include: {
            user: {
              select: { id: true, fullName: true, role: true }
            },
            files: {
              select: {
                id: true,
                name: true,
                type: true,
                size: true
              }
            }
          }
        },
        user: {
          select: { id: true, fullName: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const formattedPins = pins.map(pin => ({
      ...pin,
      createdAt: pin.createdAt.toISOString(),
      message: {
        ...pin.message,
        createdAt: pin.message.createdAt.toISOString(),
        attachments: pin.message.attachments ? JSON.parse(pin.message.attachments) : [],
        files: pin.message.files.map(f => ({
          ...f,
          url: `/api/chat/files/${f.id}`,
          thumbnail: f.type.startsWith('image/') ? `/api/chat/files/${f.id}` : null
        }))
      }
    }));

    res.json(formattedPins);
  } catch (err) {
    console.error("Error fetching pinned messages:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== USER BLOCKING ==================

app.post("/api/chat/block/:userId", authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId === req.user.userId) {
      return res.status(400).json({ error: "Cannot block yourself" });
    }

    const existing = await prisma.blockedUser.findUnique({
      where: {
        userId_blockedId: {
          userId: req.user.userId,
          blockedId: userId
        }
      }
    });

    if (existing) {
      await prisma.blockedUser.delete({
        where: { id: existing.id }
      });
      res.json({ message: "User unblocked" });
    } else {
      const block = await prisma.blockedUser.create({
        data: {
          userId: req.user.userId,
          blockedId: userId
        }
      });
      res.json({ message: "User blocked", block });
    }
  } catch (err) {
    console.error("Error blocking user:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/chat/blocked", authenticate, async (req, res) => {
  try {
    const blocked = await prisma.blockedUser.findMany({
      where: { userId: req.user.userId },
      include: {
        blocked: {
          select: { id: true, fullName: true, email: true }
        }
      }
    });

    res.json(blocked.map(b => b.blocked));
  } catch (err) {
    console.error("Error fetching blocked users:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== ONLINE USERS ==================

app.get("/api/chat/online", authenticate, async (req, res) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const onlineUsers = await prisma.user.findMany({
      where: {
        lastActive: { gte: fiveMinutesAgo }
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        profileImage: true,
        lastActive: true
      }
    });

    const formatted = onlineUsers.map(u => ({
      ...u,
      lastActive: u.lastActive?.toISOString()
    }));

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching online users:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== SEARCH MESSAGES ==================

app.get("/api/chat/search", authenticate, async (req, res) => {
  try {
    const { q, userId, from, to } = req.query;
    const defaultRoom = await prisma.chatRoom.findFirst({ where: { name: "default" } });

    const where = {
      roomId: defaultRoom.id,
      isDeleted: false,
      ...(q && {
        content: {
          contains: q,
          mode: 'insensitive'
        }
      }),
      ...(userId && { userId }),
      ...(from || to) && {
        createdAt: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) })
        }
      }
    };

    const messages = await prisma.message.findMany({
      where,
      include: {
        user: {
          select: { id: true, fullName: true, role: true }
        },
        files: {
          select: {
            id: true,
            name: true,
            type: true,
            size: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    const formattedMessages = messages.map(m => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      attachments: m.attachments ? JSON.parse(m.attachments) : [],
      files: m.files.map(f => ({
        ...f,
        url: `/api/chat/files/${f.id}`,
        thumbnail: f.type.startsWith('image/') ? `/api/chat/files/${f.id}` : null
      }))
    }));

    res.json(formattedMessages);
  } catch (err) {
    console.error("Error searching messages:", err);
    res.status(500).json({ error: err.message });
  }
});

// DEBUG: Check files in database
app.get("/api/chat/debug/files", authenticate, async (req, res) => {
  try {
    const files = await prisma.file.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        type: true,
        size: true,
        createdAt: true,
        messageId: true,
        userId: true
      }
    });
    
    console.log(`📊 Found ${files.length} files in database`);
    res.json(files);
  } catch (err) {
    console.error("Debug error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== ADMIN STATS ==================
app.get("/api/admin/stats", requireAdmin, async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalAnnouncements = await prisma.announcement.count();
    const totalPrograms = await prisma.massProgram.count();
    const totalMessages = await prisma.message.count();
    res.json({ totalUsers, totalAnnouncements, totalPrograms, totalMessages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================== USER MANAGEMENT ==================
app.get("/api/users", authenticate, async (req, res) => {
  try {
    // Get current user to check permissions
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true, specialRole: true }
    });
    
const isAdmin = currentUser.role === "admin" || currentUser.specialRole === "admin";    const isSecretary = currentUser.role === "secretary" || currentUser.specialRole === "secretary";
    
    if (!isAdmin && !isSecretary) {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    // Rest of your existing code...
    const users = await prisma.user.findMany({
      select: { 
        id: true, 
        fullName: true,
        homeJumuia: true,
        leadingJumuia: true,
        membership_number: true, 
        email: true, 
        phone: true,
        role: true,
        specialRole: true,
        assignedJumuiaId: true,
        lastRoleLogin: true,
        profileImage: true, 
        createdAt: true, 
        lastActive: true 
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const usersWithStatus = users.map((u) => ({
      ...u,
      online: u.lastActive && now - new Date(u.lastActive) < 10 * 60 * 1000,
      createdAt: u.createdAt?.toISOString(),
      lastActive: u.lastActive?.toISOString(),
      lastRoleLogin: u.lastRoleLogin?.toISOString()
    }));

    res.json(usersWithStatus);
  } catch (err) {
    console.error("FETCH USERS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});
app.delete("/api/users/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.userId === id) {
      return res.status(400).json({ error: "You cannot delete yourself" });
    }

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) return res.status(404).json({ error: "User not found" });

    await prisma.message.deleteMany({ where: { userId: id } });
    await prisma.pledge.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("DELETE USER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/users/:id/role", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, specialRole, assignedJumuiaId } = req.body;

    const allowedRoles = ["member", "admin"];
    const allowedSpecialRoles = ["jumuia_leader", "treasurer", "secretary", "choir_moderator", "media_moderator","admin", null];

    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    if (specialRole && !allowedSpecialRoles.includes(specialRole)) {
      return res.status(400).json({ error: "Invalid special role" });
    }

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) return res.status(404).json({ error: "User not found" });

    if (req.user.userId === id && role !== "admin") {
      return res.status(400).json({ error: "You cannot remove your own admin role" });
    }

    if (specialRole === "jumuia_leader" && assignedJumuiaId) {
      const jumuia = await prisma.jumuia.findUnique({
        where: { id: assignedJumuiaId }
      });
      if (!jumuia) {
        return res.status(400).json({ error: "Jumuia not found" });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { 
        role: role || existingUser.role,
        specialRole: specialRole !== undefined ? specialRole : existingUser.specialRole,
        assignedJumuiaId: specialRole === "jumuia_leader" ? assignedJumuiaId : null
      },
      select: { 
        id: true, 
        fullName: true, 
        email: true, 
        role: true,
        specialRole: true,
        assignedJumuiaId: true,
        homeJumuia: true,
        leadingJumuia: true
      },
    });

    res.json({ message: "Role updated successfully", user: updatedUser });
  } catch (err) {
    console.error("ROLE UPDATE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== PROFILE IMAGE ==================
const { supabase } = require("./supabaseClient");

app.post("/api/users/:id/upload-profile", authenticate, upload.single("profile"), async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.userId !== id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Not allowed" });
    }

    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) return res.status(404).json({ error: "User not found" });

    if (existingUser.profileImage) {
      const oldFileName = existingUser.profileImage.split("/").pop();
      await supabase.storage.from("profiles").remove([oldFileName]);
    }

    const fileExt = path.extname(req.file.originalname);
    const fileName = `profile_${id}_${Date.now()}${fileExt}`;

    const { error } = await supabase.storage
      .from("profiles")
      .upload(fileName, fs.createReadStream(req.file.path), {
        contentType: req.file.mimetype,
        upsert: true,
      });

    fs.unlinkSync(req.file.path);

    if (error) return res.status(500).json({ error: error.message });

    const publicURL = `https://dcxuxitorpfujfbtyhhn.supabase.co/storage/v1/object/public/profiles/${fileName}`;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { profileImage: publicURL },
      select: { id: true, fullName: true, email: true, role: true, profileImage: true },
    });

    res.json({ message: "Profile image uploaded successfully", user: updatedUser });
  } catch (err) {
    console.error("Upload profile error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/users/:id/delete-profile", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.userId !== id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Not allowed" });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.profileImage) {
      return res.status(400).json({ error: "No profile image to delete" });
    }

    let pathToDelete = user.profileImage;

    if (user.profileImage.startsWith("http")) {
      try {
        const url = new URL(user.profileImage);
        pathToDelete = decodeURIComponent(
          url.pathname.replace(/^\/storage\/v1\/object\/public\/profiles\//, "")
        );
      } catch (err) {
        console.error("Failed to parse profile image URL:", err);
        return res.status(500).json({ error: "Failed to delete profile image" });
      }
    }

    const { error: storageError } = await supabase.storage
      .from("profiles")
      .remove([pathToDelete]);

    if (storageError) {
      console.error("Failed to delete image from Supabase storage:", storageError);
      return res.status(500).json({ error: "Failed to delete profile image from storage" });
    }

    await prisma.user.update({ where: { id }, data: { profileImage: null } });

    res.json({ message: "Profile image deleted successfully" });
  } catch (err) {
    console.error("Delete profile error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== CONTRIBUTION SYSTEM ==================
// ================== CONTRIBUTION SYSTEM ==================

// ================== GET USER'S PERSONAL PLEDGES (GLOBAL CONTRIBUTIONS) ==================
app.get("/api/my-pledges", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get all pledges for the current user (only global contributions, not jumuia-specific)
    const pledges = await prisma.pledge.findMany({
      where: { 
        userId,
        contributionType: {
          jumuiaId: null // Only global contributions
        }
      },
      include: { 
        contributionType: {
          include: { 
            jumuia: true 
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    // Format the response to match what your frontend expects
    const formatted = pledges.map(p => ({
      id: p.id,
      title: p.contributionType.title,
      description: p.contributionType.description,
      amountRequired: p.contributionType.amountRequired,
      pendingAmount: p.pendingAmount || 0,
      amountPaid: p.amountPaid || 0,
      message: p.message,
      status: p.status,
      contributionTypeId: p.contributionType.id,
      jumuiaId: p.contributionType.jumuiaId,
      deadline: p.contributionType.deadline?.toISOString(),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt?.toISOString(),
      totalCommitted: (p.amountPaid || 0) + (p.pendingAmount || 0),
      remainingNeeded: p.contributionType.amountRequired - (p.amountPaid || 0),
      progress: p.contributionType.amountRequired > 0 
        ? ((p.amountPaid || 0) / p.contributionType.amountRequired) * 100 
        : 0
    }));

    console.log(`Found ${formatted.length} global pledges for user ${userId}`);
    res.json(formatted);
  } catch (err) {
    console.error("Error fetching my pledges:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== GET SINGLE PLEDGE DETAILS ==================
app.get("/api/my-pledges/:pledgeId", authenticate, async (req, res) => {
  try {
    const { pledgeId } = req.params;
    const userId = req.user.userId;

    const pledge = await prisma.pledge.findFirst({
      where: { 
        id: pledgeId,
        userId // Ensure the pledge belongs to the current user
      },
      include: {
        contributionType: {
          include: { 
            jumuia: true 
          }
        },
        pledgeMessages: {
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                role: true,
                profileImage: true
              }
            }
          }
        }
      }
    });

    if (!pledge) {
      return res.status(404).json({ error: "Pledge not found" });
    }

    const formatted = {
      id: pledge.id,
      title: pledge.contributionType.title,
      description: pledge.contributionType.description,
      amountRequired: pledge.contributionType.amountRequired,
      pendingAmount: pledge.pendingAmount || 0,
      amountPaid: pledge.amountPaid || 0,
      message: pledge.message,
      status: pledge.status,
      contributionTypeId: pledge.contributionType.id,
      deadline: pledge.contributionType.deadline?.toISOString(),
      createdAt: pledge.createdAt.toISOString(),
      updatedAt: pledge.updatedAt?.toISOString(),
      totalCommitted: (pledge.amountPaid || 0) + (pledge.pendingAmount || 0),
      remainingNeeded: pledge.contributionType.amountRequired - (pledge.amountPaid || 0),
      progress: pledge.contributionType.amountRequired > 0 
        ? ((pledge.amountPaid || 0) / pledge.contributionType.amountRequired) * 100 
        : 0,
      messages: pledge.pledgeMessages.map(m => ({
        ...m,
        createdAt: m.createdAt.toISOString()
      }))
    };

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching pledge details:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== GET USER CONTRIBUTION STATS ==================
app.get("/api/my-contribution-stats", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    const pledges = await prisma.pledge.findMany({
      where: { 
        userId,
        contributionType: {
          jumuiaId: null // Only global contributions
        }
      },
      include: {
        contributionType: true
      }
    });

    const stats = {
      totalPledged: pledges.reduce((sum, p) => sum + (p.amountPaid || 0) + (p.pendingAmount || 0), 0),
      totalPaid: pledges.reduce((sum, p) => sum + (p.amountPaid || 0), 0),
      totalPending: pledges.reduce((sum, p) => sum + (p.pendingAmount || 0), 0),
      totalRequired: pledges.reduce((sum, p) => sum + p.contributionType.amountRequired, 0),
      completedCount: pledges.filter(p => p.status === "COMPLETED").length,
      pendingCount: pledges.filter(p => p.status === "PENDING" && p.pendingAmount > 0).length,
      approvedCount: pledges.filter(p => p.status === "APPROVED").length,
      totalCampaigns: pledges.length,
      
      byCampaign: pledges.map(p => ({
        campaignId: p.contributionType.id,
        title: p.contributionType.title,
        amountPaid: p.amountPaid || 0,
        amountPending: p.pendingAmount || 0,
        status: p.status,
        progress: p.contributionType.amountRequired > 0 
          ? ((p.amountPaid || 0) / p.contributionType.amountRequired) * 100 
          : 0
      }))
    };

    res.json(stats);
  } catch (err) {
    console.error("Error fetching contribution stats:", err);
    res.status(500).json({ error: err.message });
  }
});


  // existing calculatePledgeState function ...




function calculatePledgeState(currentPledge, operation, amount = 0) {
  const { amountPaid, pendingAmount, status } = currentPledge;
  const amountRequired = currentPledge.contributionType.amountRequired;
  
  let newAmountPaid = amountPaid;
  let newPendingAmount = pendingAmount;
  let approvedById = null;
  let approvedAt = null;
  
  switch(operation) {
    case 'CREATE_PLEDGE':
      newPendingAmount = pendingAmount + amount;
      break;
      
    case 'APPROVE':
      newAmountPaid = amountPaid + pendingAmount;
      newPendingAmount = 0;
      approvedById = currentPledge.approvedById;
      approvedAt = currentPledge.approvedAt;
      break;
      
    case 'MANUAL_ADD':
      const amountToAdd = amount;
      
      if (pendingAmount > 0) {
        if (amountToAdd <= pendingAmount) {
          newPendingAmount = pendingAmount - amountToAdd;
        } else {
          newPendingAmount = 0;
          newAmountPaid = amountPaid + (amountToAdd - pendingAmount);
        }
      } else {
        newAmountPaid = amountPaid + amountToAdd;
      }
      break;
  }
  
  const totalPaid = newAmountPaid;
  const totalPending = newPendingAmount;
  const totalCommitted = totalPaid + totalPending;
  
  let newStatus = status;
  if (totalPaid >= amountRequired) {
    newStatus = 'COMPLETED';
  } else if (totalPaid > 0 && totalPending === 0) {
    newStatus = 'APPROVED';
  } else if (totalPending > 0) {
    newStatus = 'PENDING';
  }
  
  if (totalCommitted > amountRequired) {
    throw new Error(`Total committed (${totalCommitted}) cannot exceed required amount (${amountRequired})`);
  }
  
  return {
    amountPaid: newAmountPaid,
    pendingAmount: newPendingAmount,
    status: newStatus,
    totalPaid,
    totalPending,
    totalCommitted,
    remainingNeeded: amountRequired - totalPaid,
    approvedById,
    approvedAt
  };
}


app.post("/api/contribution-types", authenticate, async (req, res) => {
  try {
    const { title, description, amountRequired, deadline } = req.body;
    if (!title || !amountRequired)
      return res.status(400).json({ error: "Title & amountRequired required" });

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    
    if (!isAdmin && !isTreasurer) {
      return res.status(403).json({ error: "Not authorized to create contribution campaigns" });
    }

    const newType = await prisma.contributionType.create({
      data: {
        title,
        description,
        amountRequired: parseFloat(amountRequired),
        deadline: deadline ? new Date(deadline) : null,
      },
    });

    const users = await prisma.user.findMany({ select: { id: true } });
    if (users.length > 0) {
      await prisma.pledge.createMany({
        data: users.map((u) => ({
          userId: u.id,
          contributionTypeId: newType.id,
          pendingAmount: 0,
          amountPaid: 0,
          status: "PENDING",
        })),
      });
    }

    res.json(newType);
    
    if (users.length > 0) {
      Promise.allSettled(
        users.map(async (user) => {
          try {
            await createAndSendNotification({
              userId: user.id,
              type: "contribution",
              title: "💰 New Contribution Campaign",
              message: `A new contribution "${title}" has been launched. Target: ${amountRequired} per member`,
              data: { contributionId: newType.id }
            });
          } catch (err) {
            console.error("Failed to send notification to user:", user.id, err.message);
          }
        })
      ).then(() => {
        console.log(`✅ Sent ${users.length} contribution push notifications`);
      });
    }
    
  } catch (err) {
    console.error("CREATE ContributionType ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});


app.get("/api/contribution-types", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    
    if (!isAdmin && !isTreasurer) {
      return res.status(403).json({ error: "Not authorized to view contributions" });
    }

    const types = await prisma.contributionType.findMany({
      include: {
        pledges: {
          include: { user: { select: { id: true, fullName: true, email: true } } },
        },
        jumuia: { 
          select: { id: true, name: true, code: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(types);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single contribution type by ID (for payment page)
app.get("/api/contribution-types/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const contributionType = await prisma.contributionType.findUnique({
      where: { id }
    });
    
    if (!contributionType) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    
    res.json(contributionType);
  } catch (err) {
    console.error("Error fetching campaign:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/contribution-types/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, amountRequired, deadline } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    
    if (!isAdmin && !isTreasurer) {
      return res.status(403).json({ error: "Not authorized to update contributions" });
    }

    const updated = await prisma.contributionType.update({
      where: { id },
      data: {
        title,
        description,
        amountRequired: parseFloat(amountRequired),
        deadline: deadline ? new Date(deadline) : null,
      },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/contribution-types/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    
    if (!isAdmin && !isTreasurer) {
      return res.status(403).json({ error: "Not authorized to delete contributions" });
    }

    await prisma.pledge.deleteMany({ where: { contributionTypeId: id } });
    await prisma.contributionType.delete({ where: { id } });

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/contribution-types/bulk-delete", authenticate, async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No campaign IDs provided" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    
    if (!isAdmin && !isTreasurer) {
      return res.status(403).json({ error: "Not authorized to delete campaigns" });
    }

    console.log(`Bulk deleting ${ids.length} campaigns:`, ids);

    await prisma.pledge.deleteMany({
      where: {
        contributionTypeId: {
          in: ids
        }
      }
    });

    const result = await prisma.contributionType.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    });

    console.log(`Successfully deleted ${result.count} campaigns`);

    res.json({ 
      message: `Successfully deleted ${result.count} campaigns`,
      count: result.count 
    });
  } catch (err) {
    console.error("Bulk delete error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/contribution-types/bulk-duplicate", authenticate, async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No campaign IDs provided" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    
    if (!isAdmin && !isTreasurer) {
      return res.status(403).json({ error: "Not authorized to duplicate campaigns" });
    }

    const campaignsToDuplicate = await prisma.contributionType.findMany({
      where: {
        id: {
          in: ids
        }
      },
      include: {
        pledges: {
          include: {
            user: {
              select: { id: true, fullName: true }
            }
          }
        }
      }
    });

    const duplicatedCampaigns = [];

    for (const campaign of campaignsToDuplicate) {
      const newCampaign = await prisma.contributionType.create({
        data: {
          title: `${campaign.title} (Copy)`,
          description: campaign.description,
          amountRequired: campaign.amountRequired,
          deadline: campaign.deadline,
        }
      });

      if (campaign.pledges && campaign.pledges.length > 0) {
        await prisma.pledge.createMany({
          data: campaign.pledges.map(pledge => ({
            userId: pledge.userId,
            contributionTypeId: newCampaign.id,
            amountPaid: 0,
            pendingAmount: 0,
            message: pledge.message,
            status: "PENDING",
          }))
        });
      }

      const completeNewCampaign = await prisma.contributionType.findUnique({
        where: { id: newCampaign.id },
        include: {
          pledges: {
            include: {
              user: {
                select: { id: true, fullName: true, email: true }
              }
            }
          }
        }
      });

      duplicatedCampaigns.push(completeNewCampaign);
    }

    res.json({ 
      message: `Successfully duplicated ${duplicatedCampaigns.length} campaigns`,
      campaigns: duplicatedCampaigns 
    });
  } catch (err) {
    console.error("Bulk duplicate error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/pledges/:contributionTypeId", authenticate, async (req, res) => {
  try {
    const { contributionTypeId } = req.params;
    const { amount, message } = req.body;

    if (!amount || amount <= 0)
      return res.status(400).json({ error: "Invalid amount" });

    const type = await prisma.contributionType.findUnique({
      where: { id: contributionTypeId },
    });
    if (!type) return res.status(404).json({ error: "Contribution type not found" });

    if (type.jumuiaId) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId }
      });

      if (user.jumuiaId !== type.jumuiaId) {
        return res.status(403).json({ error: "You are not a member of this jumuia" });
      }
    }

    let pledge = await prisma.pledge.findFirst({
      where: { userId: req.user.userId, contributionTypeId },
      include: { contributionType: true }
    });

    if (!pledge) {
      pledge = await prisma.pledge.create({
        data: {
          userId: req.user.userId,
          contributionTypeId,
          amountPaid: 0,
          pendingAmount: 0,
          status: "PENDING",
          message: message || null,
        },
        include: { contributionType: true }
      });
    }

    const currentTotal = (pledge.amountPaid || 0) + (pledge.pendingAmount || 0);
    const remainingNeeded = type.amountRequired - currentTotal;
    
    if (amount > remainingNeeded) {
      return res.status(400).json({ 
        error: `Amount exceeds remaining needed. Maximum: ${remainingNeeded}` 
      });
    }

    const newState = calculatePledgeState(pledge, 'CREATE_PLEDGE', parseFloat(amount));

    const updated = await prisma.pledge.update({
      where: { id: pledge.id },
      data: {
        pendingAmount: newState.pendingAmount,
        message: message || pledge.message,
        status: newState.status,
      },
    });

    // Get admins, treasurers, and leaders
    const adminsAndTreasurers = await prisma.user.findMany({
      where: {
        OR: [
          { role: "admin" },
          { specialRole: "treasurer" }
        ]
      },
      select: { id: true }
    });

    if (type.jumuiaId) {
      const leaders = await prisma.user.findMany({
        where: { 
          leadingJumuia: { id: type.jumuiaId }
        },
        select: { id: true }
      });
      adminsAndTreasurers.push(...leaders);
    }

    const uniqueNotifyIds = [...new Set(adminsAndTreasurers.map(u => u.id))];

    // Create notifications with user's name
    if (uniqueNotifyIds.length > 0) {
      const now = new Date();
      
      // Get the pledger's name
const pledger = await prisma.user.findUnique({
  where: { id: req.user.userId },
  select: { fullName: true }
});
const pledgerName = pledger?.fullName || 'A user';

// Send push notifications to admins, treasurers, and leaders
for (const id of uniqueNotifyIds) {
  try {
    await createAndSendNotification({
      userId: id,
      type: "new_pledge",
      title: "💰 New Pledge",
      message: `${pledgerName} pledged ${amount} for "${type.title}"`,
      data: { 
        pledgeId: pledge.id,
        contributionId: type.id,
        amount,
        pledgerName,
        jumuiaId: type.jumuiaId
      }
    });
  } catch (err) {
    console.error("Failed to send pledge notification to user:", id, err.message);
  }
}}
    // Safe response with fallbacks
    res.json({
      ...updated,
      summary: {
        totalPaid: updated?.amountPaid || 0,
        totalPending: updated?.pendingAmount || 0,
        remainingNeeded: (type?.amountRequired || 0) - (updated?.amountPaid || 0),
        status: updated?.status || "PENDING"
      }
    });

  } catch (err) {
    if (err.message.includes('exceed')) {
      return res.status(400).json({ error: err.message });
    }
    console.error("CREATE PLEDGE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== PLEDGE MESSAGES ==================
app.get("/api/pledges/:pledgeId/messages", authenticate, async (req, res) => {
  try {
    const { pledgeId } = req.params;

    const pledge = await prisma.pledge.findUnique({
      where: { id: pledgeId },
      include: { 
        contributionType: {
          include: { jumuia: true }
        }
      }
    });

    if (!pledge) {
      return res.status(404).json({ error: "Pledge not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { leadingJumuia: true }
    });

    const isOwner = pledge.userId === req.user.userId;
    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    const isLeader = user.leadingJumuia?.id === pledge.contributionType.jumuiaId;

    if (!isOwner && !isAdmin && !isTreasurer && !isLeader) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const messages = await prisma.pledgeMessage.findMany({
      where: { pledgeId },
      include: {
        user: { 
          select: { 
            id: true, 
            fullName: true, 
            role: true,
            specialRole: true,
            profileImage: true 
          } 
        }
      },
      orderBy: { createdAt: "asc" }
    });

    const formattedMessages = messages.map(m => ({
      ...m,
      createdAt: m.createdAt.toISOString()
    }));

    res.json(formattedMessages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/pledges/:pledgeId/messages", authenticate, async (req, res) => {
  try {
    const { pledgeId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Message content required" });
    }

    const pledge = await prisma.pledge.findUnique({
      where: { id: pledgeId },
      include: { 
        contributionType: {
          include: { jumuia: true }
        },
        user: true 
      }
    });

    if (!pledge) {
      return res.status(404).json({ error: "Pledge not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { leadingJumuia: true }
    });

    const isOwner = pledge.userId === req.user.userId;
    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isTreasurer = user.specialRole === "treasurer";
    const isLeader = user.leadingJumuia?.id === pledge.contributionType.jumuiaId;

    if (!isOwner && !isAdmin && !isTreasurer && !isLeader) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const message = await prisma.pledgeMessage.create({
      data: {
        pledgeId,
        userId: req.user.userId,
        content: content.trim(),
        isAdmin: isAdmin || isTreasurer || isLeader,
        read: false
      },
      include: {
        user: { 
          select: { 
            id: true, 
            fullName: true, 
            role: true,
            specialRole: true,
            profileImage: true 
          } 
        }
      }
    });

    const notifyUserId = (isAdmin || isTreasurer || isLeader) ? pledge.userId : null;
    
    const otherNotifyIds = [];
    if (isOwner) {
      const adminsAndTreasurers = await prisma.user.findMany({
        where: {
          OR: [
            { role: "admin" },
            { specialRole: "treasurer" }
          ]
        },
        select: { id: true }
      });
      
      if (pledge.contributionType.jumuiaId) {
        const leaders = await prisma.user.findMany({
          where: { 
            leadingJumuia: { id: pledge.contributionType.jumuiaId }
          },
          select: { id: true }
        });
        otherNotifyIds.push(...leaders.map(l => l.id));
      }
      
      otherNotifyIds.push(...adminsAndTreasurers.map(a => a.id));
    }

    const uniqueNotifyIds = [...new Set(otherNotifyIds)].filter(id => id !== req.user.userId);

    if (notifyUserId || uniqueNotifyIds.length > 0) {
      const now = new Date();
      const allNotifyIds = notifyUserId ? [notifyUserId, ...uniqueNotifyIds] : uniqueNotifyIds;
      
   // Send push notifications to all users
for (const id of allNotifyIds) {
  try {
    await createAndSendNotification({
      userId: id,
      type: "pledge_message",
      title: isOwner ? "📬 New question about your pledge" : "📬 New reply to your message",
      message: content.substring(0, 100),
      data: { 
        pledgeId, 
        messageId: message.id,
        fromUser: user.fullName,
        jumuiaId: pledge.contributionType.jumuiaId
      }
    });
  } catch (err) {
    console.error("Failed to send pledge message notification to user:", id, err.message);
  }
}}

    const formattedMessage = {
      ...message,
      createdAt: message.createdAt.toISOString()
    };

    res.status(201).json(formattedMessage);
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/pledges/:pledgeId/messages/read", authenticate, async (req, res) => {
  try {
    const { pledgeId } = req.params;

    await prisma.pledgeMessage.updateMany({
      where: {
        pledgeId,
        userId: { not: req.user.userId },
        read: false
      },
      data: { read: true }
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Error marking messages as read:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== GLOBAL PLEDGE ACTIONS ==================


app.put("/api/pledges/:pledgeId/approve", authenticate, async (req, res) => {
  try {
    const { pledgeId } = req.params;
    
    const pledge = await prisma.pledge.findUnique({
      where: { id: pledgeId },
      include: { 
        contributionType: true,
        user: true 
      }
    });

    if (!pledge) {
      return res.status(404).json({ error: "Pledge not found" });
    }

    // Check if user is authorized (admin or treasurer)
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isTreasurer = user.specialRole === "treasurer";

    if (!isAdmin && !isTreasurer) {
      return res.status(403).json({ error: "Not authorized to approve pledges" });
    }

    if (pledge.pendingAmount === 0) {
      return res.status(400).json({ error: "No pending amount to approve" });
    }

    const newAmountPaid = pledge.amountPaid + pledge.pendingAmount;
    const newStatus = newAmountPaid >= pledge.contributionType.amountRequired ? "COMPLETED" : "APPROVED";

    const updated = await prisma.pledge.update({
      where: { id: pledgeId },
      data: {
        amountPaid: newAmountPaid,
        pendingAmount: 0,
        status: newStatus,
        approvedById: req.user.userId,
        approvedAt: new Date()
      },
      include: {
        user: true,
        contributionType: true
      }
    });

   // Send push notification to the user
await createAndSendNotification({
  userId: pledge.userId,
  type: "pledge_approved",
  title: newStatus === "COMPLETED" ? "🎉 Pledge Completed!" : "✅ Pledge Approved",
  message: newStatus === "COMPLETED" 
    ? `Hi ${pledge.user.fullName}, Your pledge for "${pledge.contributionType.title}" has been fully paid! Thank you.`
    : `Hi ${pledge.user.fullName}, Your pledge of ${pledge.pendingAmount} for "${pledge.contributionType.title}" has been approved.`,
  data: { pledgeId: updated.id }
});

res.json(updated);
} catch (err) {
  console.error("Error approving pledge:", err);
  res.status(500).json({ error: err.message });
}
});

app.put("/api/pledges/:pledgeId/manual-add", authenticate, async (req, res) => {
  try {
    const { pledgeId } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Valid amount required" });
    }

    const pledge = await prisma.pledge.findUnique({
      where: { id: pledgeId },
      include: { 
        contributionType: true,
        user: true 
      }
    });

    if (!pledge) {
      return res.status(404).json({ error: "Pledge not found" });
    }

    // Check if user is authorized (admin or treasurer)
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isTreasurer = user.specialRole === "treasurer";

    if (!isAdmin && !isTreasurer) {
      return res.status(403).json({ error: "Not authorized to add payments" });
    }

    let newPendingAmount = pledge.pendingAmount;
    let newAmountPaid = pledge.amountPaid;
    let approvedById = null;
    let approvedAt = null;
    
    if (pledge.pendingAmount > 0) {
      // First pay off pending amount
      if (amount <= pledge.pendingAmount) {
        // Partial payment of pending
        newPendingAmount = pledge.pendingAmount - amount;
      } else {
        // Pays off all pending + extra goes to paid
        newPendingAmount = 0;
        newAmountPaid = pledge.amountPaid + (amount - pledge.pendingAmount);
        approvedById = req.user.userId;
        approvedAt = new Date();
      }
    } else {
      // No pending, all goes to paid
      newAmountPaid = pledge.amountPaid + amount;
    }

    // Check if total would exceed required amount
    if (newAmountPaid > pledge.contributionType.amountRequired) {
      return res.status(400).json({ error: "Total paid cannot exceed required amount" });
    }

    const newStatus = newAmountPaid >= pledge.contributionType.amountRequired ? "COMPLETED" : pledge.status;

    const updated = await prisma.pledge.update({
      where: { id: pledgeId },
      data: {
        amountPaid: newAmountPaid,
        pendingAmount: newPendingAmount,
        status: newStatus,
        approvedById,
        approvedAt,
        createdByAdmin: true
      }
    });

   // Send push notification to the user
let title = "💰 Payment Added";
let message = `Hi ${pledge.user.fullName}, KES ${amount} has been added to your pledge for "${pledge.contributionType.title}".`;

if (newStatus === "COMPLETED") {
  title = "🎉 Pledge Completed!";
  message = `Hi ${pledge.user.fullName}, Your pledge for "${pledge.contributionType.title}" has been fully paid! Thank you.`;
} else if (pledge.pendingAmount > 0 && newPendingAmount === 0) {
  message = `Hi ${pledge.user.fullName}, KES ${amount} cleared your pending pledge for "${pledge.contributionType.title}".`;
}

await createAndSendNotification({
  userId: pledge.userId,
  type: "payment_added",
  title: title,
  message: message,
  data: { pledgeId: updated.id }
});

res.json(updated);
} catch (err) {
  console.error("Error adding manual payment:", err);
  res.status(500).json({ error: err.message });
}
});
// ================== USER STATS ==================
app.get("/api/user/contribution-stats", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    const pledges = await prisma.pledge.findMany({
      where: { userId },
      include: { contributionType: true }
    });

    const stats = {
      totalPledged: pledges.reduce((sum, p) => sum + (p.amountPaid || 0) + (p.pendingAmount || 0), 0),
      totalPaid: pledges.reduce((sum, p) => sum + (p.amountPaid || 0), 0),
      totalPending: pledges.reduce((sum, p) => sum + (p.pendingAmount || 0), 0),
      totalRequired: pledges.reduce((sum, p) => sum + p.contributionType.amountRequired, 0),
      completedCount: pledges.filter(p => p.status === "COMPLETED").length,
      pendingCount: pledges.filter(p => p.status === "PENDING" && p.pendingAmount > 0).length,
      approvedCount: pledges.filter(p => p.status === "APPROVED").length,
      totalCampaigns: pledges.length,
      
      jumuiaPledges: pledges.filter(p => p.contributionType.jumuiaId).length,
      globalPledges: pledges.filter(p => !p.contributionType.jumuiaId).length,
      
      byJumuia: {}
    };

    pledges.forEach(p => {
      if (p.contributionType.jumuiaId) {
        const jumuiaId = p.contributionType.jumuiaId;
        if (!stats.byJumuia[jumuiaId]) {
          stats.byJumuia[jumuiaId] = {
            totalPaid: 0,
            totalPending: 0,
            count: 0
          };
        }
        stats.byJumuia[jumuiaId].totalPaid += p.amountPaid || 0;
        stats.byJumuia[jumuiaId].totalPending += p.pendingAmount || 0;
        stats.byJumuia[jumuiaId].count += 1;
      }
    });

    res.json(stats);
  } catch (err) {
    console.error("Error fetching user stats:", err);
    res.status(500).json({ error: err.message });
  }
});



// ================== GET VAPID PUBLIC KEY ==================
app.get("/api/notifications/vapid-public-key", (req, res) => {
  try {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    
    if (!publicKey) {
      console.error("❌ VAPID_PUBLIC_KEY not set in environment");
      return res.status(500).json({ error: "VAPID key not configured" });
    }
    
    res.json({ publicKey });
  } catch (err) {
    console.error("Error serving VAPID key:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/send-test-notification", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    await createAndSendNotification({
      userId,
      type: "test",
      title: "📱 Mobile Test",
      message: "This notifocation arrived on your phone! 🎉",
      data: { url: "/dashboard", type: "test" }
    });
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================== PUSH NOTIFICATIONS ==================
const webpush = require('web-push');

// Read from environment variables
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY
};

// Validate keys exist
if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
  console.error('❌ VAPID keys missing! Please add to .env file');
  console.error('Run: node -e "const webpush = require(\'web-push\'); console.log(webpush.generateVAPIDKeys());"');
} else {
  console.log('✅ VAPID keys loaded successfully');
}

webpush.setVapidDetails(
  'mailto:zucaportal2025@gmail.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// ============================================
// FIRST: Define sendPushNotification
// ============================================
async function sendPushNotification(userId, title, body, data = {}) {
  console.log(`🔔 Attempting push for user: ${userId}`);
  
  try {
    const subscription = await prisma.pushSubscription.findUnique({
      where: { userId }
    });

    if (!subscription) {
      console.log(`⚠️ No push subscription for user ${userId}`);
      return;
    }

    console.log(`✅ Found subscription for user ${userId}, sending push...`);

    const unreadCount = await prisma.notification.count({
      where: { userId: userId, read: false }
    });

    // 🎯 Generate the deep link URL using the helper
    const deepLinkUrl = getDeepLinkUrl(data.type || 'default', data);

    const pushSubscription = JSON.parse(subscription.subscription);
    
    await webpush.sendNotification(
      pushSubscription, 
      JSON.stringify({
        title,
        body,
        icon: '/android-chrome-192x192.png',
        badge: '/favicon.ico',
        badgeCount: unreadCount + 1,
        data: {
          ...data,           // Keep all existing data
          url: deepLinkUrl   // ⬅️ ADD THE URL HERE
        },
        url: deepLinkUrl,    // ⬅️ ALSO AT ROOT LEVEL
        timestamp: Date.now()
      }),
      { urgency: 'high' }
    );
    
    console.log(`📱 Push sent to ${userId} with URL: ${deepLinkUrl} (badge: ${unreadCount + 1})`);
  } catch (err) {
    console.error(`❌ Push failed for ${userId}:`, err.message);
    if (err.statusCode === 410) {
      await prisma.pushSubscription.deleteMany({ where: { userId } });
    }
  }
}
// ============================================
// SECOND: Define createAndSendNotification
// ============================================
async function createAndSendNotification({ userId, type, title, message, data = {} }) {
  // 1. Save notification to database
  const notif = await prisma.notification.create({
    data: {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      userId,
      type,
      title,
      message,
      read: false,
      createdAt: new Date(),
    }
  });

  // 2. Send real-time notification via Socket.IO (instant)
  io.to(userId).emit('new_notification', {
    ...notif,
    createdAt: notif.createdAt.toISOString()
  });

  // 3. Send push notification to mobile (fire and forget)
  sendPushNotification(userId, title, message, { type, ...data }).catch(err => {
    console.log('Push not sent:', err.message);
  });

  // 4. Send email (fire and forget - doesn't block)
 /* (async () => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, fullName: true }
      });
      
      if (user?.email) {
        // No await here - runs in background
        sendPersonalizedEmail(user, type, title, message, data)
          .then(() => console.log(`✅ Email sent to ${user.email}`))
          .catch(err => console.error('❌ Email error:', err.message));
      }
    } catch (err) {
      console.error('❌ Email error:', err.message);
    }
  })();*/

  // Return the notification
  return notif;
}


// ============================================
// Connect cronJobs to use createAndSendNotification
// ============================================


// Make globally available
global.createAndSendNotification = createAndSendNotification;
global.io = io;
global.prisma = prisma;




// ============================================
// THIRD: Define Express routes
// ============================================
app.post('/api/notifications/subscribe', authenticate, async (req, res) => {
  try {
    const { subscription } = req.body;
    const userId = req.user.userId;

    await prisma.pushSubscription.upsert({
      where: { userId },
      update: { subscription: JSON.stringify(subscription) },
      create: {
        userId,
        subscription: JSON.stringify(subscription)
      }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error saving subscription:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notifications/unsubscribe', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    await prisma.pushSubscription.deleteMany({ where: { userId } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error removing subscription:', err);
    res.status(500).json({ error: err.message });
  }
});

// Test endpoint to verify notifications work
app.post('/api/send-test-notification', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    await createAndSendNotification({
      userId,
      type: "test",
      title: "🔔 Test Notification",
      message: "If you see this, push notifications are working! 🎉",
      data: { url: "/dashboard", type: "test" }
    });
    
    res.json({ success: true, message: "Test notification sent" });
  } catch (err) {
    console.error('Test notification error:', err);
    res.status(500).json({ error: err.message });
  }
});


// ================== NOTIFICATIONS ==================
app.post("/api/notify", authenticate, async (req, res) => {
  try {
    const { userId = null, type, title, message } = req.body;
    if (!type || !title || !message) {
      return res.status(400).json({ error: "Type, title, message are required" });
    }

    let dbNotif = null;
    if (userId) {
      // Use createAndSendNotification for push notifications
      dbNotif = await createAndSendNotification({
        userId,
        type,
        title,
        message,
        data: { from: "api/notify" }
      });
      
      dbNotif = {
        ...dbNotif,
        createdAt: dbNotif.createdAt.toISOString()
      };
    }

    res.status(201).json(dbNotif);
  } catch (err) {
    console.error("Notify error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/notifications/:userId", authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const formattedNotifications = notifications.map(notif => ({
      ...notif,
      createdAt: notif.createdAt.toISOString()
    }));

    res.json(formattedNotifications);
  } catch (err) {
    console.error("Get notifications error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/notifications/:notificationId/read", authenticate, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { userId } = req.user;

    const updated = await prisma.notification.update({
      where: {
        id: notificationId,
        userId: userId,
      },
      data: {
        read: true,
      },
    });

    const formattedNotification = {
      ...updated,
      createdAt: updated.createdAt.toISOString()
    };

    res.json({ message: "Notification marked as read", notification: formattedNotification });
  } catch (err) {
    console.error("Mark notification read error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/notifications/:userId/read-all", authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    res.json({ 
      message: "All notifications marked as read", 
      count: result.count 
    });
  } catch (err) {
    console.error("Mark notifications read error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notifications/mark-by-type/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { type } = req.body;
    
    const result = await prisma.notification.updateMany({
      where: { 
        userId, 
        type, 
        read: false 
      },
      data: { 
        read: true 
      }
    });
    
    res.json({ success: true, count: result.count });
  } catch (error) {
    console.error("Error marking by type:", error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/notifications/:userId/clear-all', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await prisma.notification.deleteMany({
      where: { userId }
    });
    
    res.json({ 
      success: true, 
      message: 'All notifications cleared successfully',
      count: result.count
    });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});




// ================== SOCKET.IO ==================
io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // Join user to their personal room
  socket.on("join", (userId) => {
    socket.join(userId);
    console.log(`✅ User ${userId} joined their room`);
  });

  // Join jumuia room
  socket.on("join-jumuia", (jumuiaId) => {
    socket.join(`jumuia-${jumuiaId}`);
    console.log(`User joined jumuia room: jumuia-${jumuiaId}`);
  });

// ==================== GAME EVENTS ====================

// Store user ID on socket when they connect
io.use((socket, next) => {
  const userId = socket.handshake.auth.userId;
  if (userId) {
    socket.userId = userId;
  }
  next();
});

// Join game room
socket.on("join_game_room", (gameId) => {
  socket.join(gameId);
  console.log(`✅ User ${socket.userId} joined game room: ${gameId}`);
});

// Send game invite to specific user
socket.on("send_game_invite", async (data) => {
  const { fromUserId, toUserId, fromUserName, gameType } = data;
  
  try {
    // Store invite in database
    const invite = await prisma.gameInvite.create({
      data: {
        fromUserId: fromUserId,
        toUserId: toUserId,
        gameType: gameType,
        status: "pending"
      },
      include: {
        fromUser: { select: { id: true, fullName: true, profileImage: true } }
      }
    });
    
    // ✅ CREATE NOTIFICATION FOR THE BELL ICON AND PUSH NOTIFICATION
await createAndSendNotification({
  userId: toUserId,
  type: "game_invite",
  title: "🎮 Game Invite!",
  message: `${fromUserName} invited you to play ${gameType}!`,
  data: { 
    inviteId: invite.id, 
    fromUserId: fromUserId,
    fromUserName: fromUserName,
    gameType: gameType
  }
});

console.log(`✅ Notification created and sent for user ${toUserId}`);
    // ✅ SEND REALTIME NOTIFICATION TO BELL (matches frontend format)
    io.to(toUserId).emit("new_notification", {
      id: notification.id,
      userId: toUserId,
      type: "game_invite",
      title: "🎮 Game Invite!",
      message: `${fromUserName} invited you to play ${gameType}!`,
      data: { 
        inviteId: invite.id, 
        fromUserId: fromUserId,
        fromUserName: fromUserName,
        gameType: gameType
      },
      read: false,
      createdAt: notification.createdAt.toISOString()
    });
    
    // Also emit game invite specific event for popup
    io.to(toUserId).emit("game_invite_received", {
      id: invite.id,
      fromUser: { 
        id: fromUserId, 
        fullName: fromUserName,
        profileImage: invite.fromUser.profileImage
      },
      gameType: gameType,
      timestamp: new Date()
    });
    
    socket.emit("game_invite_sent", { toUserId, status: "sent" });
    
  } catch (err) {
    console.error("Error sending game invite:", err);
    socket.emit("game_invite_error", { error: err.message });
  }
});

// Accept game invite
socket.on("accept_game_invite", async (data) => {
  const { inviteId, fromUserId, toUserId, gameType } = data;
  
  console.log(`🎮 Accepting invite: from=${fromUserId}, to=${toUserId}`);
  
  try {
    const invite = await prisma.gameInvite.findUnique({
      where: { id: inviteId }
    });
    
    if (!invite || invite.status !== "pending") {
      console.log("Invite already processed");
      return;
    }
    
    const player1 = await prisma.user.findUnique({
      where: { id: fromUserId },
      select: { id: true, fullName: true }
    });
    
    const player2 = await prisma.user.findUnique({
      where: { id: toUserId },
      select: { id: true, fullName: true }
    });
    
    const gameSession = await prisma.gameSession.create({
      data: {
        gameType: gameType,
        player1Id: fromUserId,
        player2Id: toUserId,
        status: "active",
        currentTurn: fromUserId,
        gameState: { board: Array(9).fill(null) }
      }
    });
    
    await prisma.gameInvite.update({
      where: { id: inviteId },
      data: { status: "accepted", sessionId: gameSession.id }
    });
    
    const sockets = await io.fetchSockets();
    
    for (const s of sockets) {
      if (s.userId === fromUserId) {
        s.join(gameSession.id);
        console.log(`✅ Player1 ${fromUserId} joined room ${gameSession.id}`);
      }
      if (s.userId === toUserId) {
        s.join(gameSession.id);
        console.log(`✅ Player2 ${toUserId} joined room ${gameSession.id}`);
      }
    }
    
    io.to(fromUserId).emit("game_start", {
      gameId: gameSession.id,
      playerSymbol: "X",
      opponent: { 
        id: toUserId, 
        fullName: player2?.fullName || "Opponent" 
      },
      firstTurn: true
    });
    
    io.to(toUserId).emit("game_start", {
      gameId: gameSession.id,
      playerSymbol: "O",
      opponent: { 
        id: fromUserId, 
        fullName: player1?.fullName || "Opponent" 
      },
      firstTurn: false
    });
    
    console.log(`✅ Game ${gameSession.id} started between ${player1?.fullName} and ${player2?.fullName}`);
  } catch (err) {
    console.error("Error accepting game invite:", err);
  }
});

// Decline game invite
socket.on("decline_game_invite", async (data) => {
  const { inviteId, fromUserId } = data;
  
  try {
    await prisma.gameInvite.update({
      where: { id: inviteId },
      data: { status: "declined" }
    });
    
    io.to(fromUserId).emit("game_invite_declined", {
      message: "The user declined your invitation"
    });
  } catch (err) {
    console.error("Error declining game invite:", err);
  }
});

// Make a move in game
socket.on("game_move", async (data) => {
  const { gameId, index, symbol, nextTurn, board } = data;
  
  console.log("🎮 Game move received:", { gameId, index, symbol, nextTurn });
  
  try {
    const game = await prisma.gameSession.findUnique({
      where: { id: gameId },
      include: {
        player1: { select: { id: true, fullName: true } },
        player2: { select: { id: true, fullName: true } }
      }
    });
    
    if (!game || game.status !== "active") {
      console.log("Game is no longer active");
      return;
    }
    
    await prisma.gameSession.update({
      where: { id: gameId },
      data: {
        gameState: { board: board },
        currentTurn: nextTurn
      }
    });
    
    const winner = calculateWinnerFromBoard(board);
    
    if (winner) {
      const winnerId = winner === 'X' ? game.player1Id : game.player2Id;
      const winnerPlayer = winner === 'X' ? game.player1 : game.player2;
      
      console.log(`🏆 Winner detected! Updating game ${gameId} to completed`);
      
      await prisma.gameSession.update({
        where: { id: gameId },
        data: {
          status: "completed",
          winner: winnerId,
          updatedAt: new Date()
        }
      });
      
      io.to(gameId).emit("game_finished", {
        gameId: gameId,
        winner: winnerId,
        winnerName: winnerPlayer?.fullName || "Opponent"
      });
      return;
    }
    
    const isTie = board.every(cell => cell !== null);
    if (isTie) {
      await prisma.gameSession.update({
        where: { id: gameId },
        data: {
          status: "completed",
          winner: "tie"
        }
      });
      
      io.to(gameId).emit("game_finished", {
        gameId: gameId,
        winner: "tie",
        winnerName: "tie"
      });
      
      console.log(`🎮 Game ${gameId} ended in a tie!`);
      return;
    }
    
    io.to(nextTurn).emit("opponent_move", {
      gameId: gameId,
      index: index,
      symbol: symbol
    });
    
    console.log("🎮 Emitted opponent_move to:", nextTurn);
  } catch (err) {
    console.error("Error making game move:", err);
  }
});

// ✅ GAME CHAT MESSAGE - MUST BE SEPARATE, NOT INSIDE game_move
socket.on("game_chat_message", (data) => {
  const { gameId, message, senderName, senderAvatar, senderId, timestamp } = data;
  
  console.log(`💬 Chat message received:`);
  console.log(`   Game ID: ${gameId}`);
  console.log(`   From: ${senderName}`);
  console.log(`   Message: "${message}"`);
  
  if (!gameId) {
    console.log("❌ No gameId in message");
    return;
  }
  
  // Broadcast to EVERYONE in the game room (including sender)
  io.to(gameId).emit("game_chat_message", {
    message: message,
    senderName: senderName,
    senderAvatar: senderAvatar,
    senderId: senderId,
    timestamp: timestamp
  });
  
  console.log(`✅ Broadcast to room ${gameId}`);
});
// Game over handler
socket.on("game_over", async (data) => {
  const { gameId, winner } = data;
  
  console.log("🎮 Game over received:", { gameId, winner });
  
  try {
    const existingGame = await prisma.gameSession.findUnique({
      where: { id: gameId }
    });
    
    if (!existingGame) {
      console.log("❌ Game session not found:", gameId);
      return;
    }
    
    console.log(`📊 Current game status: ${existingGame.status}`);
    
    const updatedGame = await prisma.gameSession.update({
      where: { id: gameId },
      data: {
        status: "completed",
        winner: winner === "tie" ? "tie" : winner,
        updatedAt: new Date()
      }
    });
    
    console.log(`✅ Game ${gameId} updated to status: ${updatedGame.status}`);
    
    let winnerName = null;
    if (winner !== "tie") {
      const gameWithPlayers = await prisma.gameSession.findUnique({
        where: { id: gameId },
        include: {
          player1: { select: { fullName: true } },
          player2: { select: { fullName: true } }
        }
      });
      
      const winnerPlayer = winner === gameWithPlayers.player1Id 
        ? gameWithPlayers.player1 
        : gameWithPlayers.player2;
      winnerName = winnerPlayer?.fullName || "Opponent";
    }
    
    io.to(gameId).emit("game_finished", { 
      gameId: gameId,
      winner: winner === "tie" ? "tie" : winner,
      winnerName: winnerName
    });
    
    console.log(`📡 Game finished event sent to room ${gameId}`);
    
  } catch (err) {
    console.error("❌ Error ending game:", err);
  }
});

// Game reset
socket.on("game_reset", async (data) => {
  const { gameId, opponentId } = data;
  
  try {
    await prisma.gameSession.update({
      where: { id: gameId },
      data: {
        gameState: { board: Array(9).fill(null) },
        currentTurn: opponentId,
        status: "active"
      }
    });
    
    io.to(opponentId).emit("game_reset_opponent", {
      gameId: gameId,
      firstTurn: false
    });
  } catch (err) {
    console.error("Error resetting game:", err);
  }
});

// Helper function
function calculateWinnerFromBoard(squares) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }
  return null;
}


  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});

// Get user's active games - STRICT CHECK
app.get("/api/games/active", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Only get games that are ACTIVE and NOT completed
    const activeGame = await prisma.gameSession.findFirst({
      where: {
        OR: [
          { player1Id: userId },
          { player2Id: userId }
        ],
        status: "active",  // Only active status
        NOT: {
          status: "completed"  // Explicitly exclude completed
        }
      },
      include: {
        player1: { select: { id: true, fullName: true } },
        player2: { select: { id: true, fullName: true } }
      }
    });
    
    console.log(`🔍 Active game check for user ${userId}:`, activeGame ? `Found game ${activeGame.id} with status ${activeGame.status}` : "No active game");
    
    if (activeGame && activeGame.status === "active") {
      const isPlayer1 = activeGame.player1Id === userId;
      const playerSymbol = isPlayer1 ? 'X' : 'O';
      const opponent = isPlayer1 ? activeGame.player2 : activeGame.player1;
      const isMyTurn = activeGame.currentTurn === userId;
      
      // Additional check: Don't return if board is full
      const board = activeGame.gameState?.board || Array(9).fill(null);
      const isBoardFull = board.every(cell => cell !== null);
      
      if (isBoardFull) {
        console.log("Board is full, marking game as completed");
        await prisma.gameSession.update({
          where: { id: activeGame.id },
          data: { status: "completed" }
        });
        return res.json({ hasActiveGame: false });
      }
      
      res.json({
        hasActiveGame: true,
        game: {
          gameId: activeGame.id,
          playerSymbol: playerSymbol,
          opponent: opponent,
          isMyTurn: isMyTurn,
          board: board,
          currentTurn: activeGame.currentTurn
        }
      });
    } else {
      res.json({ hasActiveGame: false });
    }
  } catch (err) {
    console.error("Error fetching active game:", err);
    res.status(500).json({ error: err.message });
  }
});


// Force complete a stuck game (admin only)
app.post("/api/admin/force-complete-game/:gameId", authenticate, requireAdmin, async (req, res) => {
  try {
    const { gameId } = req.params;
    
    const game = await prisma.gameSession.update({
      where: { id: gameId },
      data: {
        status: "completed",
        updatedAt: new Date()
      }
    });
    
    res.json({ success: true, game });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update game state (for reconnect)
app.put("/api/games/:gameId/state", authenticate, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { board, currentTurn } = req.body;
    
    const game = await prisma.gameSession.findUnique({
      where: { id: gameId }
    });
    
    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }
    
    // Verify user is in this game
    if (game.player1Id !== req.user.userId && game.player2Id !== req.user.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    const updated = await prisma.gameSession.update({
      where: { id: gameId },
      data: {
        gameState: { board: board },
        currentTurn: currentTurn
      }
    });
    
    res.json({ success: true });
  } catch (err) {
    console.error("Error updating game state:", err);
    res.status(500).json({ error: err.message });
  }
});

// Abandon game endpoint
app.put("/api/games/:gameId/abandon", authenticate, async (req, res) => {
  try {
    const { gameId } = req.params;
    const userId = req.user.userId;
    
    const game = await prisma.gameSession.findUnique({
      where: { id: gameId }
    });
    
    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }
    
    // Only allow players to abandon their own game
    if (game.player1Id !== userId && game.player2Id !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    await prisma.gameSession.update({
      where: { id: gameId },
      data: {
        status: "abandoned"
      }
    });
    
    res.json({ success: true });
  } catch (err) {
    console.error("Error abandoning game:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== ADMIN AI ASSISTANT (SEPARATE ENDPOINT) ==================
app.post("/api/admin/ai/assistant", authenticate, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.userId;
    
    console.log(`👑 ADMIN AI Request: "${message}"`);
    
    // Get user data and verify admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { homeJumuia: true, leadingJumuia: true }
    });
    
    // Check if user is admin
    const isAdmin = user.role === "admin" || user.specialRole === "admin";
    const isSecretary = user.specialRole === "secretary";
    const isTreasurer = user.specialRole === "treasurer";
    
    if (!isAdmin && !isSecretary && !isTreasurer) {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    const lowerMsg = message.toLowerCase().trim();
    const userName = user.fullName.split(" ")[0];
    
    // Helper function
    const hasKeyword = (keywords) => {
      if (typeof keywords === 'string') return lowerMsg.includes(keywords);
      return keywords.some(keyword => lowerMsg.includes(keyword));
    };
  
    // ============ USER MANAGEMENT ============
    
   // List all users - IMPROVED VERSION
if (hasKeyword(['list users', 'all users', 'show users', 'get users', 'user list', 'members list', 'show all users'])) {
  const allUsers = await prisma.user.findMany({
    select: { 
      id: true, fullName: true, email: true, role: true, 
      specialRole: true, membership_number: true, createdAt: true,
      lastActive: true, homeJumuia: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  
  if (allUsers.length === 0) {
    return res.json({ success: true, response: "👥 No users found in the system." });
  }
  
  let response = `👑 **USERS LIST** (${allUsers.length} shown)\n\n`;
  for (const u of allUsers.slice(0, 15)) {
    response += `• **${u.fullName}**\n`;
    response += `  📧 ${u.email}\n`;
    response += `  🆔 ${u.membership_number || 'No membership'}\n`;
    response += `  👔 ${u.role}${u.specialRole ? ` (${u.specialRole})` : ''}\n`;
    response += `  🏠 ${u.homeJumuia?.name || 'None'}\n`;
    response += `  📅 Joined: ${new Date(u.createdAt).toLocaleDateString()}\n\n`;
  }
  if (allUsers.length > 15) response += `... and ${allUsers.length - 15} more users\n`;
  response += `\n💡 To find a specific user, say **"Find user [name]"** or **"Find user [email]"**`;
  return res.json({ success: true, response });
}
    
    // Find specific user - IMPROVED VERSION
if (hasKeyword(['find user', 'search user', 'find', 'get user', 'user details', 'find member', 'search member'])) {
  // Extract the search term - remove command words
  let searchTerm = message
    .replace(/find user|search user|find |get user|user details|find member|search member|show user/i, '')
    .replace(/[\[\]"]/g, '') // Remove brackets and quotes
    .trim();
  
  console.log(`🔍 Searching for user: "${searchTerm}"`);
  
  if (searchTerm && searchTerm.length > 0) {
    const foundUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { fullName: { contains: searchTerm, mode: 'insensitive' } },
          { membership_number: { contains: searchTerm, mode: 'insensitive' } }
        ]
      },
      include: { 
        homeJumuia: true, 
        leadingJumuia: true,
        pledges: { 
          include: { contributionType: true },
          take: 5 
        }
      }
    });
    
    if (foundUser) {
      const totalPaid = foundUser.pledges.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
      const totalPending = foundUser.pledges.reduce((sum, p) => sum + (p.pendingAmount || 0), 0);
      
      let response = `👤 **USER FOUND!**\n\n`;
      response += `📛 **Name:** ${foundUser.fullName}\n`;
      response += `📧 **Email:** ${foundUser.email}\n`;
      response += `📱 **Phone:** ${foundUser.phone || 'Not set'}\n`;
      response += `🆔 **Membership:** ${foundUser.membership_number || 'Not assigned'}\n`;
      response += `👔 **Role:** ${foundUser.role}\n`;
      response += `⭐ **Special Role:** ${foundUser.specialRole || 'None'}\n`;
      response += `🏠 **Jumuia:** ${foundUser.homeJumuia?.name || 'None'}\n`;
      response += `👑 **Leading Jumuia:** ${foundUser.leadingJumuia?.name || 'None'}\n`;
      response += `📅 **Joined:** ${new Date(foundUser.createdAt).toLocaleDateString()}\n`;
      response += `🟢 **Last Active:** ${foundUser.lastActive ? new Date(foundUser.lastActive).toLocaleDateString() : 'Never'}\n`;
      response += `💰 **Total Paid:** KES ${totalPaid.toLocaleString()}\n`;
      response += `⏳ **Total Pending:** KES ${totalPending.toLocaleString()}\n`;
      response += `📊 **Active Pledges:** ${foundUser.pledges.length}\n\n`;
      response += `💡 Say **"Delete user ${foundUser.email}"** to remove this user.`;
      return res.json({ success: true, response });
    } else {
      // Try fuzzy search - find similar users
      const similarUsers = await prisma.user.findMany({
        where: {
          OR: [
            { fullName: { contains: searchTerm.substring(0, 3), mode: 'insensitive' } },
            { email: { contains: searchTerm.substring(0, 3), mode: 'insensitive' } }
          ]
        },
        take: 5,
        select: { fullName: true, email: true, membership_number: true }
      });
      
      if (similarUsers.length > 0) {
        let response = `❌ User "${searchTerm}" not found.\n\n`;
        response += `💡 **Did you mean:**\n`;
        for (const user of similarUsers) {
          response += `• ${user.fullName} (${user.email})\n`;
        }
        response += `\nTry: **"Find user ${similarUsers[0].fullName.split(' ')[0]}"**`;
        return res.json({ success: true, response });
      }
      
      return res.json({ 
        success: true, 
        response: `❌ User "${searchTerm}" not found.\n\n💡 Try:\n• "Find user [name]"\n• "Find user [email]"\n• "List users" to see all users` 
      });
    }}
    // Delete user
    if (hasKeyword(['delete user', 'remove user', 'delete member', 'erase user'])) {
      let targetUser = message.replace(/delete user|remove user|delete member|erase user/gi, '').trim();
      
      if (targetUser) {
        const userToDelete = await prisma.user.findFirst({
          where: {
            OR: [
              { email: { contains: targetUser, mode: 'insensitive' } },
              { fullName: { contains: targetUser, mode: 'insensitive' } },
              { membership_number: { contains: targetUser, mode: 'insensitive' } }
            ]
          }
        });
        
        if (userToDelete && userToDelete.id !== userId) {
          await prisma.pledge.deleteMany({ where: { userId: userToDelete.id } });
          await prisma.message.deleteMany({ where: { userId: userToDelete.id } });
          await prisma.notification.deleteMany({ where: { userId: userToDelete.id } });
          await prisma.user.delete({ where: { id: userToDelete.id } });
          
          return res.json({
            success: true,
            response: `✅ User **${userToDelete.fullName}** (${userToDelete.email}) has been permanently deleted!`
          });
        } else {
          return res.json({ success: true, response: `❌ Could not find user "${targetUser}".` });
        }
      }
    }
    
    // Change user role
    if (hasKeyword(['make admin', 'make treasurer', 'make secretary', 'change role', 'promote', 'demote'])) {
      let parts = message.split(/to|as/i);
      let targetUser = parts[0].replace(/make admin|make treasurer|make secretary|change role|promote|demote/gi, '').trim();
      let newRole = parts[1]?.trim().toLowerCase() || '';
      
      if (targetUser && newRole) {
        const userToUpdate = await prisma.user.findFirst({
          where: {
            OR: [
              { email: { contains: targetUser, mode: 'insensitive' } },
              { fullName: { contains: targetUser, mode: 'insensitive' } }
            ]
          }
        });
        
        if (userToUpdate) {
          let roleKey = 'member';
          let specialRoleKey = null;
          
          if (newRole.includes('admin')) roleKey = 'admin';
          else if (newRole.includes('treasurer')) specialRoleKey = 'treasurer';
          else if (newRole.includes('secretary')) specialRoleKey = 'secretary';
          else if (newRole.includes('choir')) specialRoleKey = 'choir_moderator';
          else if (newRole.includes('media')) specialRoleKey = 'media_moderator';
          else if (newRole.includes('jumuia')) specialRoleKey = 'jumuia_leader';
          
          await prisma.user.update({
            where: { id: userToUpdate.id },
            data: { 
              role: roleKey,
              specialRole: specialRoleKey
            }
          });
          
          return res.json({
            success: true,
            response: `✅ **${userToUpdate.fullName}** is now a **${specialRoleKey || roleKey}**!`
          });
        } else {
          return res.json({ success: true, response: `❌ Could not find user "${targetUser}".` });
        }
      }
    }
    
    // ============ CAMPAIGN MANAGEMENT ============
    
    // Create campaign
    if (hasKeyword(['create campaign', 'add campaign', 'new campaign', 'create contribution'])) {
      const titleMatch = message.match(/['"]([^'"]+)['"]/) || message.match(/campaign[:\\s]+([^,]+)/i);
      const amountMatch = message.match(/(\d+(?:,\d+)*)/);
      
      if (titleMatch && amountMatch) {
        const title = titleMatch[1].trim();
        const amountReq = parseInt(amountMatch[0].replace(/,/g, ''));
        
        const newCampaign = await prisma.contributionType.create({
          data: {
            title: title,
            description: `Created by admin: ${title}`,
            amountRequired: amountReq,
            createdBy: userId
          }
        });
        
        const allUsers = await prisma.user.findMany({ select: { id: true } });
        await prisma.pledge.createMany({
          data: allUsers.map(u => ({
            userId: u.id,
            contributionTypeId: newCampaign.id,
            amountPaid: 0,
            pendingAmount: 0,
            status: "PENDING"
          }))
        });
        
        return res.json({
          success: true,
          response: `✅ Campaign **"${title}"** created with target KES ${amountReq.toLocaleString()}! All users have been notified.`
        });
      } else {
        return res.json({
          success: true,
          response: `📋 To create a campaign, say:\n**"Create campaign 'Building Fund' with target 50000"**`
        });
      }
    }
    
    // List campaigns
    if (hasKeyword(['list campaigns', 'show campaigns', 'all campaigns', 'campaign list'])) {
      const campaigns = await prisma.contributionType.findMany({
        include: {
          _count: { select: { pledges: true } },
          pledges: { select: { amountPaid: true, pendingAmount: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });
      
      let response = `📊 **ACTIVE CAMPAIGNS**\n\n`;
      for (const c of campaigns) {
        const totalPaid = c.pledges.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
        const progress = ((totalPaid / c.amountRequired) * 100).toFixed(1);
        response += `📌 **${c.title}**\n`;
        response += `   🎯 Target: KES ${c.amountRequired.toLocaleString()}\n`;
        response += `   💰 Raised: KES ${totalPaid.toLocaleString()} (${progress}%)\n`;
        response += `   👥 Participants: ${c._count.pledges}\n`;
        response += `   📅 Created: ${new Date(c.createdAt).toLocaleDateString()}\n\n`;
      }
      response += `💡 Say **"Delete campaign [title]"** to remove a campaign.`;
      return res.json({ success: true, response });
    }
    
    // Delete campaign
    if (hasKeyword(['delete campaign', 'remove campaign', 'delete contribution'])) {
      let campaignTitle = message.replace(/delete campaign|remove campaign|delete contribution/gi, '').trim();
      
      if (campaignTitle) {
        const campaign = await prisma.contributionType.findFirst({
          where: { title: { contains: campaignTitle, mode: 'insensitive' } }
        });
        
        if (campaign) {
          await prisma.pledge.deleteMany({ where: { contributionTypeId: campaign.id } });
          await prisma.contributionType.delete({ where: { id: campaign.id } });
          
          return res.json({
            success: true,
            response: `✅ Campaign **"${campaign.title}"** has been deleted!`
          });
        } else {
          return res.json({ success: true, response: `❌ Could not find campaign "${campaignTitle}".` });
        }
      }
    }
    
    // ============ ANNOUNCEMENT MANAGEMENT ============
    
    // Create announcement
    if (hasKeyword(['create announcement', 'add announcement', 'post announcement', 'broadcast'])) {
      let announcementText = message.replace(/create announcement|add announcement|post announcement|broadcast/gi, '').trim();
      
      if (announcementText && announcementText.length > 5) {
        let title = announcementText.substring(0, 60);
        let content = announcementText;
        
        const announcement = await prisma.announcement.create({
          data: {
            title: title,
            content: content,
            category: "General",
            published: true,
            createdBy: userId
          }
        });
        
       const allUsers = await prisma.user.findMany({ select: { id: true } });

 // Send push notifications to all users
        for (const user of allUsers) {
          try {
            await createAndSendNotification({
              userId: user.id,
              type: "announcement",
              title: "📢 New Announcement",
              message: title,
              data: { announcementId: announcement.id }
            });
          } catch (err) {
            console.error("Failed to send announcement to user:", user.id, err.message);
          }
        }

        return res.json({
          success: true,
          response: `✅ Announcement **"${title}"** has been posted to all users!`
        });
      }
    } 
    
    // List announcements
    if (hasKeyword(['list announcements', 'all announcements', 'show announcements'])) {
      const announcements = await prisma.announcement.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10
      });
      
      let response = `📢 **RECENT ANNOUNCEMENTS**\n\n`;
      for (const a of announcements) {
        response += `📌 **${a.title}**\n`;
        response += `   📝 ${a.content.substring(0, 100)}${a.content.length > 100 ? '...' : ''}\n`;
        response += `   📅 ${new Date(a.createdAt).toLocaleDateString()}\n\n`;
      }
      return res.json({ success: true, response });
    }
    
    // Delete announcement
    if (hasKeyword(['delete announcement', 'remove announcement'])) {
      let announcementTitle = message.replace(/delete announcement|remove announcement/gi, '').trim();
      
      if (announcementTitle) {
        const announcement = await prisma.announcement.findFirst({
          where: { title: { contains: announcementTitle, mode: 'insensitive' } }
        });
        
        if (announcement) {
          await prisma.announcement.delete({ where: { id: announcement.id } });
          return res.json({
            success: true,
            response: `✅ Announcement **"${announcement.title}"** has been deleted!`
          });
        } else {
          return res.json({ success: true, response: `❌ Could not find announcement "${announcementTitle}".` });
        }
      }
    }
    
    // ============ SYSTEM STATS ============
    
    if (hasKeyword(['system stats', 'admin stats', 'dashboard stats', 'platform stats', 'overview'])) {
      const [
        totalUsers,
        totalAnnouncements,
        totalCampaigns,
        totalMessages,
        totalMedia,
        totalHymns,
        totalJumuia
      ] = await Promise.all([
        prisma.user.count(),
        prisma.announcement.count(),
        prisma.contributionType.count(),
        prisma.message.count(),
        prisma.media.count(),
        prisma.song.count(),
        prisma.jumuia.count()
      ]);
      
      const totalRaised = await prisma.pledge.aggregate({
        where: { status: 'APPROVED' },
        _sum: { amountPaid: true }
      });
      
      let response = `📊 **ZUCA PLATFORM STATS**\n\n`;
      response += `👥 Users: ${totalUsers}\n`;
      response += `📢 Announcements: ${totalAnnouncements}\n`;
      response += `💰 Campaigns: ${totalCampaigns}\n`;
      response += `💬 Messages: ${totalMessages}\n`;
      response += `📸 Media Items: ${totalMedia}\n`;
      response += `🎵 Hymns: ${totalHymns}\n`;
      response += `🏠 Jumuia Groups: ${totalJumuia}\n`;
      response += `💵 Total Raised: KES ${(totalRaised._sum.amountPaid || 0).toLocaleString()}\n\n`;
      response += `Tumsifu Yesu Kristu! 🙏`;
      return res.json({ success: true, response });
    }
    
    // ============ YOUTUBE STATS ============
    
    if (hasKeyword(['youtube stats', 'youtube analytics', 'channel stats'])) {
      try {
        const channelId = process.env.YOUTUBE_CHANNEL_ID || "UCJ7NvR5_ZUwhtM16sJY4anQ";
        const apiKey = process.env.YOUTUBE_API_KEY;
        
        if (!apiKey) {
          return res.json({ success: true, response: "⚠️ YouTube API key not configured." });
        }
        
        const channelResponse = await axios.get(
          `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`
        );
        
        const channelStats = channelResponse.data.items[0];
        
        let response = `📺 **ZUCA YOUTUBE CHANNEL**\n\n`;
        response += `📛 ${channelStats.snippet.title}\n`;
        response += `👥 Subscribers: ${parseInt(channelStats.statistics.subscriberCount).toLocaleString()}\n`;
        response += `👁️ Views: ${parseInt(channelStats.statistics.viewCount).toLocaleString()}\n`;
        response += `🎬 Videos: ${parseInt(channelStats.statistics.videoCount).toLocaleString()}\n`;
        return res.json({ success: true, response });
      } catch (error) {
        return res.json({ success: true, response: "⚠️ Unable to fetch YouTube stats." });
      }
    }
    
    // ============ MEDIA MANAGEMENT ============
    
    if (hasKeyword(['list media', 'gallery stats', 'all media'])) {
      const media = await prisma.media.findMany({
        include: { uploadedBy: { select: { fullName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10
      });
      
      let response = `📸 **GALLERY ITEMS**\n\n`;
      for (const m of media) {
        response += `• ${m.title} (${m.type})\n`;
        response += `  👤 ${m.uploadedBy?.fullName || 'Unknown'}\n`;
        response += `  📅 ${new Date(m.createdAt).toLocaleDateString()}\n\n`;
      }
      response += `💡 Say **"Delete media [title]"** to remove an item.`;
      return res.json({ success: true, response });
    }
    
    if (hasKeyword(['delete media', 'delete photo', 'delete video'])) {
      let mediaTitle = message.replace(/delete media|delete photo|delete video/gi, '').trim();
      
      if (mediaTitle) {
        const media = await prisma.media.findFirst({
          where: { title: { contains: mediaTitle, mode: 'insensitive' } }
        });
        
        if (media) {
          await prisma.media.delete({ where: { id: media.id } });
          return res.json({
            success: true,
            response: `✅ Media **"${media.title}"** has been deleted!`
          });
        } else {
          return res.json({ success: true, response: `❌ Could not find media "${mediaTitle}".` });
        }
      }
    }
  }
    
    // ============ JUMUIA MANAGEMENT ============
    
    if (hasKeyword(['jumuia stats', 'jumuia report', 'group stats'])) {
      const jumuiaGroups = await prisma.jumuia.findMany();
      let response = `🏠 **JUMUIA GROUPS**\n\n`;
      
      for (const j of jumuiaGroups) {
        const memberCount = await prisma.user.count({ where: { jumuiaId: j.id } });
        response += `📌 **${j.name}** - ${memberCount} members\n`;
      }
      return res.json({ success: true, response });
    }
    
    // ============ ADMIN HELP ============
    
    if (hasKeyword(['admin help', 'what can admin do', 'admin commands'])) {
      return res.json({
        success: true,
        response: `👑 **ADMIN COMMANDS**\n\n` +
          `**👥 USERS**\n` +
          `• "List users" - Show all users\n` +
          `• "Find user [name]" - Get user details\n` +
          `• "Delete user [email]" - Remove user\n` +
          `• "Make [name] admin" - Change role\n\n` +
          `**💰 CAMPAIGNS**\n` +
          `• "Create campaign 'Title' with target 50000"\n` +
          `• "List campaigns" - Show all\n` +
          `• "Delete campaign [title]"\n\n` +
          `**📢 ANNOUNCEMENTS**\n` +
          `• "Create announcement: [message]"\n` +
          `• "List announcements"\n` +
          `• "Delete announcement [title]"\n\n` +
          `**📸 GALLERY**\n` +
          `• "List media" - Show gallery\n` +
          `• "Delete media [title]"\n\n` +
          `**📺 YOUTUBE**\n` +
          `• "YouTube stats" - Channel analytics\n\n` +
          `**📊 STATS**\n` +
          `• "System stats" - Platform overview\n` +
          `• "Jumuia stats" - Group reports\n\n` +
          `Tumsifu Yesu Kristu! 🙏`
      });
    }
    
    // ============ DEFAULT ============
    return res.json({
      success: true,
      response: `👑 Hello ${userName}! I'm your Admin AI.\n\n` +
        `Try:\n` +
        `• "List users" - View all users 👥\n` +
        `• "System stats" - Platform overview 📊\n` +
        `• "Create campaign 'Title' with target 50000" 💰\n` +
        `• "Create announcement: [message]" 📢\n` +
        `• "Admin help" - See all commands ✨`
    });
    
  } catch (error) {
    console.error("Admin AI Error:", error);
    res.json({
      success: true,
      response: "👑 Admin AI is ready! What would you like to manage? Try 'Admin help' for commands."
    });
  }
});


// ================== COMPLETE ZUCA AI WITH PROPER PRIORITY ==================
app.post("/api/ai/assistant", authenticate, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.userId;
    
    console.log(`🤖 ZUCA AI Request: "${message}"`);
    
    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { homeJumuia: true, leadingJumuia: true }
    });
    
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    
    const lowerMsg = message.toLowerCase().trim();
    const userName = user.fullName.split(" ")[0];
    
    // Get pledges data
    const pledges = await prisma.pledge.findMany({
      where: { userId },
      include: { contributionType: true }
    });
    
    const totalPaid = pledges.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    const totalPending = pledges.reduce((sum, p) => sum + (p.pendingAmount || 0), 0);
    
    // Get unread notifications
    const unreadNotifications = await prisma.notification.findMany({
      where: { userId, read: false },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    const jumuiaGroups = await prisma.jumuia.findMany();
    const upcomingPrograms = await prisma.massProgram.findMany({
      where: { date: { gte: new Date() } },
      orderBy: { date: 'asc' },
      take: 5
    });
    
    const recentAnnouncements = await prisma.announcement.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    // ============ HELPER FUNCTION ============
    const hasKeyword = (keywords) => {
      if (typeof keywords === 'string') {
        return lowerMsg.includes(keywords);
      }
      return keywords.some(keyword => lowerMsg.includes(keyword));
    };

        // ============ SYSTEM HEALTH (ADMIN ONLY) ============
    if (hasKeyword(['system health', 'is everything ok', 'system status', 'any issues', 'health check'])) {
      // Check if user is admin
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });
      
      if (currentUser.role !== 'admin') {
        return res.json({
          success: true,
          response: "🔒 This information is only available to admins. Please contact an administrator if you're experiencing issues."
        });
      }
      
      const status = await global.systemMonitor.getSystemStatus();
      const issues = await global.systemMonitor.getIssues();
      
      let response = `🩺 **SYSTEM HEALTH REPORT**\n\n`;
      response += `📊 **Status:** ${status.status.toUpperCase()}\n`;
      response += `⏱️ **Uptime:** ${status.uptime.formatted}\n`;
      response += `💾 **Memory:** ${status.memory.percentUsed}% used (${status.memory.heapUsed} / ${status.memory.heapTotal})\n`;
      response += `🗄️ **Database:** ${status.database.status}\n`;
      response += `👥 **Online Users:** ${status.users.online}\n\n`;
      
      if (issues.length > 0) {
        response += `⚠️ **ISSUES DETECTED (${issues.length})**\n`;
        for (const issue of issues.slice(0, 5)) {
          const icon = issue.severity === 'critical' ? '🔴' : '🟡';
          response += `${icon} **${issue.type}:** ${issue.message}\n`;
          response += `   ${issue.details}\n`;
          if (issue.fix) response += `   💡 ${issue.fix}\n`;
          response += `\n`;
        }
      } else {
        response += `✅ **All systems healthy!** No issues detected.\n\n`;
      }
      
      response += `💡 Say **"Fix [issue]"** to try fixing an issue.`;
      return res.json({ success: true, response });
    }

    // ============ FIX SYSTEM ISSUE ============
    if (hasKeyword(['fix', 'fix issue', 'resolve', 'clear errors', 'fix errors'])) {
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });
      
      if (currentUser.role !== 'admin') {
        return res.json({
          success: true,
          response: "🔒 Only admins can fix system issues."
        });
      }
      
      // Clear error logs
      if (hasKeyword(['clear', 'clean', 'erase', 'remove'])) {
        if (global.healthStore) {
          global.healthStore.errors = [];
          global.healthStore.slowRequests = [];
        }
        return res.json({
          success: true,
          response: "✅ Error logs cleared successfully!"
        });
      }
      
      return res.json({
        success: true,
        response: "🔧 To fix issues, try:\n• **'Clear errors'** - Clear error logs\n• **'Check system health'** - See current issues\n• Restart the server for memory issues"
      });
    }

    // ============ CHECK USER ISSUES ============
    if (hasKeyword(['user issues', 'user problems', 'any users having trouble', 'check user', 'check member'])) {
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });
      
      if (currentUser.role !== 'admin') {
        return res.json({
          success: true,
          response: "🔒 Only admins can check user issues."
        });
      }
      
      // Find target user
      let searchTerm = message.replace(/user issues|user problems|any users having trouble|check user|check member|for/gi, '').trim();
      
      if (searchTerm) {
        const targetUser = await prisma.user.findFirst({
          where: {
            OR: [
              { fullName: { contains: searchTerm, mode: 'insensitive' } },
              { email: { contains: searchTerm, mode: 'insensitive' } }
            ]
          }
        });
        
        if (targetUser) {
          const errors = global.errorStore?.filter(e => e.context?.userId === targetUser.id) || [];
          const unreadCount = await prisma.notification.count({
            where: { userId: targetUser.id, read: false }
          });
          const pendingPledges = await prisma.pledge.count({
            where: { userId: targetUser.id, status: 'PENDING' }
          });
          
          let response = `👤 **USER ISSUES: ${targetUser.fullName}**\n\n`;
          response += `🔔 Unread Notifications: ${unreadCount}\n`;
          response += `💰 Pending Pledges: ${pendingPledges}\n`;
          response += `❌ Recent Errors: ${errors.length}\n\n`;
          
          if (errors.length > 0) {
            response += `**Recent Errors:**\n`;
            for (const err of errors.slice(0, 3)) {
              response += `• ${err.error?.substring(0, 80)}...\n`;
            }
          }
          
          return res.json({ success: true, response });
        } else {
          return res.json({
            success: true,
            response: `❌ User "${searchTerm}" not found. Try "Check user [name]" or "Check user [email]"`
          });
        }
      } else {
        return res.json({
          success: true,
          response: `💡 Say **"Check user [name]"** or **"Check user [email]"** to see their issues.`
        });
      }
    }

    // ============ ACTIVITY FEED ============
    if (hasKeyword(['activity feed', 'whats happening', 'recent activity', 'show activity', 'whats new'])) {
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });
      
      if (currentUser.role !== 'admin') {
        return res.json({
          success: true,
          response: "🔒 Only admins can view the activity feed."
        });
      }
      
      const activities = global.activityStore || [];
      
      if (activities.length === 0) {
        return res.json({
          success: true,
          response: "📭 No recent activity to show."
        });
      }
      
      let response = `📊 **RECENT ACTIVITY**\n\n`;
      for (const activity of activities.slice(0, 10)) {
        const icon = {
          'error': '❌',
          'warning': '⚠️',
          'security': '🛡️',
          'user_login': '👤',
          'checkin': '✅',
          'payment': '💰',
          'announcement': '📢',
          'slow_request': '🐢'
        }[activity.type] || '📌';
        
        const time = new Date(activity.timestamp).toLocaleString();
        response += `${icon} ${activity.type.replace('_', ' ')}\n`;
        response += `   📅 ${time}\n`;
        if (activity.data?.error) {
          response += `   📝 ${activity.data.error.substring(0, 60)}...\n`;
        }
        response += `\n`;
      }
      
      return res.json({ success: true, response });
    }

    // ============ TRENDS ============
    if (hasKeyword(['trends', 'weekly trends', 'system trends', 'whats trending'])) {
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });
      
      if (currentUser.role !== 'admin') {
        return res.json({
          success: true,
          response: "🔒 Only admins can view trends."
        });
      }
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const [newUsers, newPledges, newAnnouncements, totalRaised, errorCount] = await Promise.all([
        prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
        prisma.pledge.count({ where: { createdAt: { gte: weekAgo } } }),
        prisma.announcement.count({ where: { createdAt: { gte: weekAgo } } }),
        prisma.pledge.aggregate({
          where: { 
            createdAt: { gte: weekAgo },
            status: { in: ["APPROVED", "COMPLETED"] }
          },
          _sum: { amountPaid: true }
        }),
        prisma.notification.count({
          where: {
            type: 'error',
            createdAt: { gte: weekAgo }
          }
        })
      ]);
      
      const errorTrend = global.errorStore?.filter(e => 
        new Date(e.timestamp) > weekAgo
      ) || [];
      
      let response = `📈 **SYSTEM TRENDS (Last 7 Days)**\n\n`;
      response += `👥 New Users: ${newUsers}\n`;
      response += `💰 New Pledges: ${newPledges}\n`;
      response += `📢 New Announcements: ${newAnnouncements}\n`;
      response += `💵 Total Raised: KES ${(totalRaised._sum.amountPaid || 0).toLocaleString()}\n`;
      response += `❌ Errors: ${errorTrend.length}\n\n`;
      
      if (errorTrend.length > 0) {
        response += `⚠️ **Recent Errors:**\n`;
        for (const err of errorTrend.slice(0, 3)) {
          response += `• ${err.error?.substring(0, 60)}...\n`;
        }
      }
      
      return res.json({ success: true, response });
    }
    
    // ============ 1. PROFILE (HIGHEST PRIORITY) ============
    if (hasKeyword(['who am i', 'my profile', 'my info', 'tell me about myself', 'my name', 'membership number', 'whats my name'])) {
      return res.json({ 
        success: true, 
        response: `👤 **Your Profile**\n\n📛 Name: ${user.fullName}\n🆔 Membership: ${user.membership_number || 'Not assigned'}\n📧 Email: ${user.email}\n👥 Jumuia: ${user.homeJumuia?.name || 'Not assigned'}\n💰 Total Paid: KES ${totalPaid.toLocaleString()}\n\nTumsifu Yesu Kristu! 🙏` 
      });
    }
    
    // ============ 2. PLEDGES ============
    if (hasKeyword(['what do i owe', 'how much', 'my pledges', 'my contributions', 'what have i paid', 'pledge status'])) {
      if (pledges.length === 0) {
        return res.json({ 
          success: true, 
          response: `💰 You don't have any active pledges.\n\n💡 Say **"I want to give 5000"** to make a pledge!` 
        });
      }
      
      let response = `📊 **YOUR PLEDGES**\n\n`;
      for (const p of pledges.slice(0, 5)) {
        response += `• ${p.contributionType.title}: Paid KES ${(p.amountPaid || 0).toLocaleString()}`;
        if (p.pendingAmount > 0) response += `, Pending KES ${p.pendingAmount.toLocaleString()}`;
        response += `\n`;
      }
      response += `\n💰 **Total Paid:** KES ${totalPaid.toLocaleString()}`;
      if (totalPending > 0) response += `\n⏳ **Total Pending:** KES ${totalPending.toLocaleString()}`;
      return res.json({ success: true, response });
    }
    
    // ============ 3. CREATE PLEDGE ============
    const amountMatch = message.match(/\d+/);
    const amount = amountMatch ? parseInt(amountMatch[0]) : null;
    
    if (hasKeyword(['give', 'pledge', 'donate', 'want to give']) && amount && amount > 0) {
      const campaigns = await prisma.contributionType.findMany({ where: { jumuiaId: null }, take: 1 });
      if (campaigns.length > 0) {
        const campaign = campaigns[0];
        let pledge = await prisma.pledge.findFirst({
          where: { userId, contributionTypeId: campaign.id }
        });
        
        if (pledge) {
          await prisma.pledge.update({
            where: { id: pledge.id },
            data: { pendingAmount: (pledge.pendingAmount || 0) + amount }
          });
        } else {
          await prisma.pledge.create({
            data: { userId, contributionTypeId: campaign.id, amountPaid: 0, pendingAmount: amount, status: "PENDING" }
          });
        }
        
        return res.json({
          success: true,
          response: `✅ Recorded your pledge of **KES ${amount.toLocaleString()}**!\n\nThank you for your generosity! 🙏`
        });
      }
    }
    
    // ============ 4. NOTIFICATIONS ============
    if (hasKeyword(['notifications', 'alerts', 'inbox', 'my notifications', 'show notifications'])) {
      if (unreadNotifications.length === 0) {
        return res.json({ 
          success: true, 
          response: "🔔 You have no unread notifications. Your inbox is clean!" 
        });
      }
      
      let response = `🔔 **You have ${unreadNotifications.length} unread notification(s):**\n\n`;
      for (let i = 0; i < Math.min(unreadNotifications.length, 5); i++) {
        const n = unreadNotifications[i];
        response += `${i+1}. **${n.title}**\n   ${n.message}\n   📅 ${new Date(n.createdAt).toLocaleDateString()}\n\n`;
      }
      response += `💡 Say **"Mark all as read"** to clear all notifications!`;
      return res.json({ success: true, response });
    }
    
    if (hasKeyword(['mark all as read', 'clear notifications', 'delete notifications', 'mark read'])) {
      await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true }
      });
      return res.json({ 
        success: true, 
        response: `✅ Marked all notifications as read! Your inbox is clean. 📬` 
      });
    }
    
    // ============ 5. CHAT ACTIONS ============
    if (hasKeyword(['tell everyone', 'send to chat', 'post to chat', 'broadcast', 'announce to everyone'])) {
      let chatMessage = message.replace(/tell everyone|send to chat|post to chat|announce to everyone|broadcast|say to everyone/gi, '').trim();
      if (chatMessage && chatMessage.length > 0) {
        const defaultRoom = await prisma.chatRoom.findFirst({ where: { name: "default" } });
        if (defaultRoom) {
          const newMessage = await prisma.message.create({
            data: { content: chatMessage, userId, roomId: defaultRoom.id }
          });
          
          if (global.io) {
            global.io.emit("new_message", {
              ...newMessage,
              user: { fullName: user.fullName },
              createdAt: newMessage.createdAt.toISOString()
            });
          }
          
          return res.json({
            success: true,
            response: `✅ Message sent to community chat! 💬\n\n"${chatMessage.substring(0, 100)}${chatMessage.length > 100 ? '...' : ''}"\n\nTumsifu Yesu Kristu! 🙏`
          });
        }
      }
    }
    
    // ============ 6. PAGE NAVIGATION ============
    
    // Gallery
    if (hasKeyword(['gallery', 'photos', 'pictures', 'images', 'media', 'photo gallery'])) {
      return res.json({
        success: true,
        action: "navigate",
        path: "/gallery",
        response: "📸 Opening the ZUCA Gallery! 📷"
      });
    }
    
    // Hymn Book
    if (hasKeyword(['hymn book', 'hymns', 'songs', 'music book', 'song book'])) {
      return res.json({
        success: true,
        action: "navigate",
        path: "/hymns",
        response: "🎵 Opening the Hymn Book! 📖"
      });
    }
    
    // Mass Programs
    if (hasKeyword(['mass', 'mass program', 'mass schedule', 'service', 'liturgy', 'worship'])) {
      return res.json({
        success: true,
        action: "navigate",
        path: "/mass-programs",
        response: "⛪ Opening the Mass Programs page! 📅"
      });
    }
    
    // Contributions
    if (hasKeyword(['contributions', 'contributions page', 'giving page'])) {
      return res.json({
        success: true,
        action: "navigate",
        path: "/contributions",
        response: "💰 Opening your Contributions page! 📊"
      });
    }
    
    // Chat
    if (hasKeyword(['chat', 'discussion', 'community chat', 'talk'])) {
      return res.json({
        success: true,
        action: "navigate",
        path: "/chat",
        response: "💬 Opening Community Chat! 🗣️"
      });
    }
    
    // Calendar
    if (hasKeyword(['calendar', 'liturgical calendar', 'readings', 'feast days'])) {
      return res.json({
        success: true,
        action: "navigate",
        path: "/liturgical-calendar",
        response: "📅 Opening the Liturgical Calendar! 🗓️"
      });
    }
    
    // Announcements
    if (hasKeyword(['announcements', 'news', 'updates', 'latest news'])) {
      return res.json({
        success: true,
        action: "navigate",
        path: "/announcements",
        response: "📢 Opening Announcements! 📰"
      });
    }
    
    // Jumuia
    if (hasKeyword(['jumuia', 'join jumuia', 'groups', 'small christian communities'])) {
      return res.json({
        success: true,
        action: "navigate",
        path: "/join-jumuia",
        response: "🏠 Opening Jumuia Groups! 👥"
      });
    }
    
    // Dashboard
    if (hasKeyword(['dashboard', 'home', 'main page', 'go home'])) {
      return res.json({
        success: true,
        action: "navigate",
        path: "/dashboard",
        response: "🏠 Taking you back to your Dashboard!"
      });
    }
    
    // ============ 7. ZUCA INFORMATION ============
    if (hasKeyword(['zuca', 'what is zuca', 'about zuca', 'tell me about zuca', 'zuca history', 'zetech catholic'])) {
      return res.json({
        success: true,
        response: `🙏 **ZUCA (Zetech University Catholic Action)** is the official Catholic community at Zetech University, Kenya.\n\n` +
          `📅 **Founded:** October 2018\n` +
          `👥 **Members:** ${await prisma.user.count()} registered\n` +
          `🏠 **6 Jumuia Groups:** St. Michael, St. Benedict, St. Peregrine, Christ the King, St. Gregory, St. Pacificus\n` +
          `⛪ **Mass:** Wednesday 4:30 PM at Annex 002\n` +
          `🎵 **Choir:** St. Kizito Choir\n\n` +
          `Tumsifu Yesu Kristu! 🙏`
      });
    }
    
    // ============ 8. JUMUIA GROUPS INFO ============
    if (hasKeyword(['jumuia groups', 'what jumuia', 'list jumuia'])) {
      let response = `🏠 **ZUCA JUMUIA GROUPS**\n\n`;
      for (const j of jumuiaGroups) {
        response += `• **${j.name}**\n`;
      }
      response += `\n💡 Say **"Tell me about St. Michael"** for more details!`;
      return res.json({ success: true, response });
    }
    
    // Specific Jumuia
    for (const j of jumuiaGroups) {
      if (lowerMsg.includes(j.name.toLowerCase())) {
        const members = await prisma.user.count({ where: { jumuiaId: j.id } });
        return res.json({
          success: true,
          response: `🏠 **${j.name} Jumuia**\n\n👥 Members: ${members}\n💡 To join, go to Join Jumuia page!`
        });
      }
    }
    
    // ============ 9. SONG/HYMN REQUESTS (LOWEST PRIORITY - ONLY AFTER ALL COMMANDS FAIL) ============
    // This catches ANY message that might be asking for a song, but ONLY if no command matched above
    
    // Check if it might be a song title (short message, not a question word)
    const isLikelySongTitle = 
      message.length < 40 && 
      !hasKeyword(['how', 'what', 'why', 'who', 'where', 'when', 'is', 'are', 'do', 'does', 'can', 'could', 'would', 'should', 'will', 'may', 'might']);
    
    if (isLikelySongTitle || hasKeyword(['lyrics', 'song', 'hymn', 'sing', 'play', 'open song', 'show song'])) {
      // Extract potential song name
      let songTitle = message
        .replace(/lyrics for|show lyrics for|open lyrics for|find lyrics for|show me|lyrics of|words to|sing|play|open|show|find|search|hymn|song/gi, '')
        .replace(/^\s+|\s+$/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (songTitle.length > 1) {
        console.log(`🎵 Searching for song: "${songTitle}"`);
        
        let hymn = await prisma.song.findFirst({
          where: { title: { contains: songTitle, mode: 'insensitive' } }
        });
        
        if (hymn) {
          return res.json({
            success: true,
            action: "navigate",
            path: `/hymn/${hymn.id}`,
            response: `🎵 Opening **"${hymn.title}"** in the Hymn Book for you! 📖`
          });
        }
      }
    }
    
    // ============ 10. GREETINGS ============
    if (hasKeyword(['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'habari', 'jambo', 'sasa'])) {
      return res.json({ 
        success: true, 
        response: `Tumsifu Yesu Kristu! 👋 Hello ${userName}! How can I help you today?` 
      });
    }
    
    // ============ 11. HELP ============
    if (hasKeyword(['what can you do', 'help', 'capabilities', 'what do you do', 'commands', 'help me'])) {
      return res.json({
        success: true,
        response: `🤖 **I CAN DO:**\n\n` +
          `• "Gallery" - Open photos 📸\n` +
          `• "Hymns" - Open songs 🎵\n` +
          `• "Mass" - Mass schedule ⛪\n` +
          `• "Chat" - Community chat 💬\n` +
          `• "Calendar" - Liturgical calendar 📅\n` +
          `• "Announcements" - Latest news 📢\n` +
          `• "Who am I?" - Your profile 👤\n` +
          `• "What do I owe?" - Check pledges 💰\n` +
          `• "Notifications" - Show alerts 🔔\n` +
          `• "Song name" - Opens that hymn 🎵\n\n` +
          `What would you like to do? Tumsifu Yesu Kristu! 🙏`
      });
    }
    
    // ============ 12. DEFAULT ============
    return res.json({
      success: true,
      response: `Tumsifu Yesu Kristu! 🙋‍♂️ I'm your ZUCA AI assistant.\n\n` +
        `Try: **"Gallery"**, **"Hymns"**, **"Who am I?"**, **"Help"**, or just type a song name! ✨`
    });
    
  } catch (error) {
    console.error("AI Error:", error);
    res.json({
      success: true,
      response: "Tumsifu Yesu Kristu! 🙏 I'm ready to help. Try saying 'Help' to see what I can do!"
    });
  }
});




// ================== PROFILE SETTINGS ENDPOINTS ==================

// Update user profile (full name, email, phone, password)
app.put("/api/users/profile", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { 
      fullName, 
      email, 
      phone, 
      currentPassword,
      newPassword 
    } = req.body;

    // Get current user
    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      include: { homeJumuia: true }
    });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: "Email already in use" });
      }
    }

    // Check if phone is already taken by another user
    if (phone && phone !== user.phone) {
      const existingUser = await prisma.user.findFirst({
        where: { phone: phone }
      });
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: "Phone number already in use" });
      }
    }

    // Prepare update data
    const updateData = {
      fullName: fullName || user.fullName,
      email: email ? email.toLowerCase() : user.email,
      phone: phone || user.phone,
      
    };

    // Handle password change if requested
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: "Current password is required to change password" });
      }
      
      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }
      
      // Hash new password
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        membership_number: true,
        profileImage: true,
        homeJumuia: true,
        createdAt: true,
        
      }
    });

    res.json({ 
      success: true, 
      message: "Profile updated successfully",
      user: updatedUser 
    });
    
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get user profile (already exists, but keep it)
app.get("/api/me", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { homeJumuia: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
    console.error("ME ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});




// ================== OCR.SPACE ENDPOINT ==================
const multerMemory = multer({ storage: multer.memoryStorage() });

app.post("/api/ocr/ocr-space", authenticate, multerMemory.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    // USE ENVIRONMENT VARIABLE - NOT HARDCODED!
    const OCR_SPACE_API_KEY = process.env.OCR_SPACE_API_KEY || "K84282463988957";
    
    // Prepare form data for OCR.space
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: 'image.jpg',
      contentType: req.file.mimetype
    });
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2');

    console.log("📤 Sending to OCR.space...");

    const response = await axios.post('https://api.ocr.space/parse/image', formData, {
      headers: {
        ...formData.getHeaders(),
        'apikey': OCR_SPACE_API_KEY
      },
      timeout: 60000
    });

    if (response.data.IsErroredOnProcessing) {
      const errorMsg = response.data.ErrorMessage?.[0] || "OCR failed";
      console.error("OCR.space error:", errorMsg);
      return res.status(400).json({ error: errorMsg });
    }

    let extractedText = response.data.ParsedResults?.[0]?.ParsedText || "";
    const exitCode = response.data.ParsedResults?.[0]?.FileParseExitCode;
    const confidence = exitCode === 1 ? 95 : 75;

    extractedText = extractedText
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!extractedText || extractedText.length < 10) {
      return res.json({
        success: true,
        text: "",
        confidence: 0,
        wordCount: 0,
        message: "No text detected. Try a clearer image with better lighting."
      });
    }

    res.json({
      success: true,
      text: extractedText,
      confidence: confidence,
      wordCount: extractedText.split(/\s+/).length
    });

  } catch (error) {
    console.error("OCR.space error:", error.message);
    res.status(500).json({ 
      error: "OCR processing failed: " + error.message
    });
  }
});


// ==================== COMPLETE SCHEDULE MANAGEMENT SYSTEM ====================

// Helper function to check if user is admin or secretary
function isAdminOrSecretary(user) {
  return user.role === "admin" || user.specialRole === "secretary";
}

// Helper function to parse date string
function parseDateString(dateStr) {
  if (!dateStr) return null;
  const currentYear = new Date().getFullYear();
  const monthMap = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11,
    'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
    'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
  };
  
  const parts = dateStr.split(' ');
  if (parts.length === 2) {
    let day = parseInt(parts[0]);
    let month = monthMap[parts[1]];
    if (!isNaN(day) && month !== undefined) {
      return new Date(currentYear, month, day);
    }
  }
  return null;
}

function getNotificationMessage(event, timing) {
  const eventTime = event.eventTime || "";
  const location = event.location || "Location to be announced";
  const eventDateFormatted = new Date(event.eventDate).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const messages = {
    "1 week before": `📅 REMINDER: "${event.title}" is in 1 week on ${eventDateFormatted} at ${eventTime} in ${location}. Please prepare and mark your calendar!`,
    "3 days before": `📅 REMINDER: "${event.title}" is in 3 days on ${eventDateFormatted} at ${eventTime} in ${location}. Don't forget to attend!`,
    "1 day before": `🔔 IMPORTANT: "${event.title}" is on ${eventDateFormatted} at ${eventTime} in ${location}. Please be punctual and prepared!`,
    "12 hours before": `⏰ "${event.title}" is in 12 hours (Today at ${eventTime} in ${location}). Get ready and lets all be punctual!`,
    "6 hours before": `⏰ "${event.title}" is in 6 hours at ${eventTime} in ${location}. Make effort to be there!`,
    "1 hour before": `🚨 URGENT: "${event.title}" starts in 1 hour at ${eventTime} in ${location}. Please head to the venue now!`,
    "30 minutes before": `🚨 "${event.title}" starts in 30 minutes at ${location}. Please take your seats!`,
    "Event starting now": `🔴 LIVE: "${event.title}" is starting NOW at ${location}! Join us immediately!`
  };
  
  return messages[timing] || `📢 "${event.title}" is scheduled for ${eventDateFormatted} at ${eventTime} in ${location}.`;
}
// Helper function to create scheduled notifications for an event (FIXED)
async function createEventNotifications(event, scheduleId) {
  try {
    // Parse the event date and time
    const eventDate = new Date(event.eventDate);
    const eventTime = event.eventTime || "16:30";
    const [hours, minutes] = eventTime.split(":").map(Number);
    
    // Create the exact event date-time (when the event actually happens)
    // Use UTC to avoid timezone shifting issues
   const eventDateTime = new Date(
  eventDate.getFullYear(),
  eventDate.getMonth(),
  eventDate.getDate(),
  hours,
  minutes,
  0
  );
    
    console.log(`📅 Event: ${event.title}`);
    console.log(`   Event Date-Time (UTC): ${eventDateTime.toISOString()}`);
    console.log(`   Event Date-Time (Kenyan): ${eventDateTime.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })}`);
const notificationTimings = [
  { daysBefore: 7, label: "1 week before", priority: "normal" },
  { daysBefore: 1, label: "1 day before", priority: "high" }
];
    
    const now = new Date();
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const timing of notificationTimings) {
      // Create a copy of the event date-time using milliseconds
      let notifyAt = new Date(eventDateTime.getTime());
      
      if (timing.daysBefore !== undefined) {
        // Subtract days using milliseconds (24 * 60 * 60 * 1000)
        notifyAt = new Date(notifyAt.getTime() - (timing.daysBefore * 24 * 60 * 60 * 1000));
      } else if (timing.hoursBefore !== undefined) {
        // Subtract hours using milliseconds
        notifyAt = new Date(notifyAt.getTime() - (timing.hoursBefore * 60 * 60 * 1000));
      } else if (timing.minutesBefore !== undefined) {
        // Subtract minutes using milliseconds
        notifyAt = new Date(notifyAt.getTime() - (timing.minutesBefore * 60 * 1000));
      }
      
      // Only create future notifications
      if (notifyAt > now) {
        // Check if notification already exists (by title pattern to avoid duplicates)
        const existing = await prisma.scheduledNotification.findFirst({
          where: { 
            eventId: event.id,
            title: { contains: timing.label }
          }
        });
        
        if (!existing) {
          await prisma.scheduledNotification.create({
            data: {
              eventId: event.id,
              scheduleId: scheduleId,
              title: `⏰ ${timing.label}: ${event.title}`,
              message: getNotificationMessage(event, timing.label),
              notifyAt: notifyAt,
              priority: timing.priority,
              isSent: false
            }
          });
          createdCount++;
          console.log(`   ✅ Created ${timing.label} for ${notifyAt.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })}`);
        } else {
          console.log(`   ⏭️ ${timing.label} already exists`);
          skippedCount++;
        }
      } else {
        console.log(`   ⏭️ Skipping ${timing.label} (already passed - would have been ${notifyAt.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })})`);
        skippedCount++;
      }
    }
    console.log(`📊 Event "${event.title}": Created ${createdCount} new notifications, Skipped ${skippedCount}`);
  } catch (err) {
    console.error(`❌ Error creating notifications for ${event.title}:`, err.message);
  }
}

// Add this to your server.js - FIXED DEBUG ENDPOINT
app.get("/api/admin/debug/check-event-creation/:scheduleId", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId } 
    });
    
    if (!isAdminOrSecretary(user)) {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    const { scheduleId } = req.params;
    
    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: { events: true }
    });
    
    if (!schedule) {
      return res.status(404).json({ error: "Schedule not found" });
    }
    
    const debugInfo = {
      schedule: {
        id: schedule.id,
        title: schedule.title,
        isPublished: schedule.isPublished,
        createdAt: schedule.createdAt
      },
      events: [],
      notificationCreationLog: []
    };
    
    const now = new Date();
    
    for (const event of schedule.events) {
      const eventDate = new Date(event.eventDate);
      const [hours, minutes] = (event.eventTime || "16:30").split(":").map(Number);
      
      // Use LOCAL time (not UTC) - this matches your fixed createEventNotifications
      const eventDateTime = new Date(
        eventDate.getFullYear(),
        eventDate.getMonth(),
        eventDate.getDate(),
        hours,
        minutes,
        0
      );
      
      const notifications = await prisma.scheduledNotification.findMany({
        where: { eventId: event.id }
      });
      
   const notificationTimings = [
  { daysBefore: 7, label: "1 week before" },
  { daysBefore: 1, label: "1 day before" }
];
      
      const wouldCreate = [];
      for (const timing of notificationTimings) {
        let notifyAt = new Date(eventDateTime.getTime());
        
        if (timing.daysBefore !== undefined) {
          notifyAt = new Date(notifyAt.getTime() - (timing.daysBefore * 24 * 60 * 60 * 1000));
        } else if (timing.hoursBefore !== undefined) {
          notifyAt = new Date(notifyAt.getTime() - (timing.hoursBefore * 60 * 60 * 1000));
        } else if (timing.minutesBefore !== undefined) {
          notifyAt = new Date(notifyAt.getTime() - (timing.minutesBefore * 60 * 1000));
        }
        
        wouldCreate.push({
          timing: timing.label,
          notifyAt: notifyAt.toISOString(),
          notifyAtKenyan: notifyAt.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }),
          isFuture: notifyAt > now,
          wouldCreate: notifyAt > now
        });
      }
      
      debugInfo.events.push({
        id: event.id,
        title: event.title,
        eventDate: event.eventDate,
        eventTime: event.eventTime,
        eventDateTimeKenyan: eventDateTime.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }),
        currentTimeKenyan: now.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }),
        notificationsFound: notifications.length,
        expectedNotifications: notificationTimings.length,
        wouldCreateNotifications: wouldCreate
      });
    }
    
    res.json(debugInfo);
  } catch (err) {
    console.error("Debug error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Helper function to notify all users (OPTIMIZED - BATCH PROCESSING)
async function notifyAllUsers(title, message, type, data = {}) {
  try {
    console.log(`📢 Sending notifications: ${title}`);
    
    const users = await prisma.user.findMany({ select: { id: true } });
    console.log(`👥 Found ${users.length} users`);
    
    if (users.length === 0) return;
    
    const now = new Date();
    const batchSize = 50;
    const notifications = [];
    
    for (const user of users) {
      notifications.push({
        userId: user.id,
        type: type,
        title: title,
        message: message,
        data: data,
        read: false,
        createdAt: now
      });
    }
    
    // Send push notifications to all users
    for (const user of users) {
      try {
        await createAndSendNotification({
          userId: user.id,
          type: type,
          title: title,
          message: message,
          data: data || {}
        });
      } catch (err) {
        console.error("Failed to send notification to user:", user.id, err.message);
      }
    }

    console.log(`✅ Push notifications sent to ${users.length} users`);
  } catch (err) {
    console.error("❌ Error sending notifications:", err.message);
  }
}  
// ==================== SCHEDULE DRAFTS ROUTES ====================

// GET all drafts for current user
app.get("/api/admin/schedules/drafts", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId } 
    });
    
    if (!isAdminOrSecretary(user)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const drafts = await prisma.scheduleDraft.findMany({
      where: { createdBy: req.user.userId },
      orderBy: { updatedAt: 'desc' }
    });
    
    res.json(drafts);
  } catch (err) {
    console.error("Error fetching drafts:", err);
    res.status(500).json({ error: err.message });
  }
});

// CREATE new draft
app.post("/api/admin/schedules/drafts", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId } 
    });
    
    if (!isAdminOrSecretary(user)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { title, formData, freeContent, activeTab } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const draft = await prisma.scheduleDraft.create({
      data: {
        title: title,
        content: "",
        description: title,
        formData: formData,
        freeContent: freeContent || "",
        activeTab: activeTab || "structured",
        createdBy: req.user.userId
      }
    });
    
    res.status(201).json(draft);
  } catch (err) {
    console.error("Error saving draft:", err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE draft
app.put("/api/admin/schedules/drafts/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId } 
    });
    
    if (!isAdminOrSecretary(user)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { title, formData, freeContent, activeTab } = req.body;

    const existingDraft = await prisma.scheduleDraft.findFirst({
      where: { id, createdBy: req.user.userId }
    });

    if (!existingDraft) {
      return res.status(404).json({ error: "Draft not found" });
    }

    const updatedDraft = await prisma.scheduleDraft.update({
      where: { id },
      data: {
        title: title || existingDraft.title,
        formData: formData || existingDraft.formData,
        freeContent: freeContent !== undefined ? freeContent : existingDraft.freeContent,
        activeTab: activeTab || existingDraft.activeTab,
        updatedAt: new Date()
      }
    });
    
    res.json(updatedDraft);
  } catch (err) {
    console.error("Error updating draft:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE draft
app.delete("/api/admin/schedules/drafts/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId } 
    });
    
    if (!isAdminOrSecretary(user)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const existingDraft = await prisma.scheduleDraft.findFirst({
      where: { id, createdBy: req.user.userId }
    });

    if (!existingDraft) {
      return res.status(404).json({ error: "Draft not found" });
    }

    await prisma.scheduleDraft.delete({ where: { id } });
    
    res.json({ success: true, message: "Draft deleted successfully" });
  } catch (err) {
    console.error("Error deleting draft:", err);
    res.status(500).json({ error: err.message });
  }
});



app.get("/api/upcoming-events", async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const events = await prisma.scheduleEvent.findMany({
      where: {
        eventDate: { gte: today },
        schedule: { isPublished: true }
      },
      include: {
        schedule: {
          select: {
            id: true,
            title: true,
            isPublished: true
          }
        }
      },
      orderBy: { eventDate: 'asc' },
      take: parseInt(limit)
    });
    
    res.json(events);
  } catch (err) {
    console.error("Error fetching upcoming events:", err);
    res.status(500).json({ error: err.message });
  }
});





// ==================== SCHEDULE PUBLISHING ROUTES ====================

// CREATE schedule (publish) - OPTIMIZED VERSION
app.post("/api/admin/schedules", authenticate, async (req, res) => {
  try {
    console.log("📝 Received schedule creation request");
    
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId } 
    });
    
    if (!isAdminOrSecretary(user)) {
      return res.status(403).json({ error: "Not authorized. Admin or Secretary only." });
    }

    const { 
      title, 
      content, 
      description, 
      startDate, 
      endDate, 
      isPublished,
      events,
      sections,
      generalPoints,
      additionalNotes,
      semesterPeriod
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    console.log("📋 Creating schedule:", title);

    const schedule = await prisma.schedule.create({
      data: {
        title,
        content,
        description: description || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isPublished: isPublished || false,
        createdBy: req.user.userId,
        sections: sections || [],
        generalPoints: generalPoints || [],
        additionalNotes: additionalNotes || "",
        semesterPeriod: semesterPeriod || { start: null, end: null }
      }
    });

    console.log("✅ Schedule created with ID:", schedule.id);

    const createdEvents = [];
    if (events && events.length > 0) {
      console.log(`📝 Creating ${events.length} events...`);
      
      for (const event of events) {
        // Parse the date without timezone shifting
const [year, month, day] = event.eventDate.split('T')[0].split('-').map(Number);
const correctEventDate = new Date(year, month - 1, day, 12, 0, 0); // Noon to avoid DST issues

const createdEvent = await prisma.scheduleEvent.create({
  data: {
    scheduleId: schedule.id,
    title: event.title,
    description: event.description || event.title,
    eventDate: correctEventDate,
    eventTime: event.eventTime || "16:30",
    location: event.location || "",
    groupName: event.groupName,
    reminderDays: event.reminderDays || [7, 1, 0]
  }
});
        createdEvents.push(createdEvent);
        console.log(`  ✅ Event created: ${event.title}`);
      }
    }

    res.status(201).json({ success: true, schedule });
    
    if (isPublished) {
      console.log("📢 Processing notifications in background...");
      
      const users = await prisma.user.findMany({ select: { id: true } });
      
      if (users.length > 0) {
        Promise.allSettled(
          users.map(async (user) => {
            try {
              await createAndSendNotification({
                userId: user.id,
                type: "schedule",
                title: "📅 New Schedule Published",
                message: `${title} has been published`,
                data: { scheduleId: schedule.id }
              });
            } catch (err) {
              console.error("Failed to send schedule notification:", err.message);
            }
          })
        );
      }
      
      for (const event of createdEvents) {
        setTimeout(() => {
          createEventNotifications(event, schedule.id).catch(console.error);
        }, 100);
      }
    }
    
  } catch (err) {
    console.error("❌ Error creating schedule:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET all schedules (Public)
app.get("/api/schedules", async (req, res) => {
  try {
    const { upcoming, published } = req.query;
    
    let where = {};
    
    if (published === 'true' || !req.headers.authorization) {
      where.isPublished = true;
    }
    
    if (upcoming === 'true') {
      where.startDate = { gte: new Date() };
    }
    
    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        events: {
          orderBy: { eventDate: 'asc' }
        },
        creator: {
          select: { id: true, fullName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(schedules);
  } catch (err) {
    console.error("Error fetching schedules:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET single schedule
app.get("/api/schedules/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const schedule = await prisma.schedule.findUnique({
      where: { id },
      include: {
        events: {
          orderBy: { eventDate: 'asc' }
        },
        creator: {
          select: { id: true, fullName: true }
        }
      }
    });
    
    if (!schedule) {
      return res.status(404).json({ error: "Schedule not found" });
    }
    
    let user = null;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      } catch (e) {}
    }
    
    const isAuthorized = user && (user.role === "admin" || user.specialRole === "secretary");
    
    if (!schedule.isPublished && !isAuthorized) {
      return res.status(403).json({ error: "Schedule not published yet" });
    }
    
    res.json(schedule);
  } catch (err) {
    console.error("Error fetching schedule:", err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE schedule
app.put("/api/admin/schedules/:id", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId } 
    });
    
    if (!isAdminOrSecretary(user)) {
      return res.status(403).json({ error: "Not authorized. Admin or Secretary only." });
    }

    const { id } = req.params;
    const { 
      title, 
      content, 
      description, 
      startDate, 
      endDate, 
      isActive,
      isPublished,
      events,
      sections,
      generalPoints,
      additionalNotes,
      semesterPeriod
    } = req.body;

    // Update schedule
    const schedule = await prisma.schedule.update({
      where: { id },
      data: {
        title,
        content,
        description: description || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isActive: isActive !== undefined ? isActive : true,
        isPublished: isPublished !== undefined ? isPublished : false,
        updatedAt: new Date(),
        sections: sections !== undefined ? sections : undefined,
        generalPoints: generalPoints !== undefined ? generalPoints : undefined,
        additionalNotes: additionalNotes !== undefined ? additionalNotes : undefined,
        semesterPeriod: semesterPeriod !== undefined ? semesterPeriod : undefined
      }
    });
    
    // Update events if provided
    if (events !== undefined) {
    // Delete old events and their scheduled notifications
const oldEvents = await prisma.scheduleEvent.findMany({ where: { scheduleId: id } });
for (const oldEvent of oldEvents) {
  await prisma.scheduledNotification.deleteMany({ where: { eventId: oldEvent.id } });
}
await prisma.scheduleEvent.deleteMany({ where: { scheduleId: id } });

// Create new events
const newEvents = [];
if (events.length > 0) {
  for (const event of events) {
    // Parse date correctly to avoid timezone shifting
    let correctDate;
    if (event.eventDate) {
      const [year, month, day] = event.eventDate.split('T')[0].split('-').map(Number);
      correctDate = new Date(year, month - 1, day, 12, 0, 0);
    } else {
      correctDate = new Date();
    }
    
    const newEvent = await prisma.scheduleEvent.create({
      data: {
        scheduleId: id,
        title: event.title,
        description: event.description || event.title,
        eventDate: correctDate,
        eventTime: event.eventTime || "16:30",
        location: event.location || "",
        groupName: event.groupName,
        reminderDays: event.reminderDays || [7, 1, 0]
      }
    });
    newEvents.push(newEvent);
  }
}
      // Create notification schedules for new events in background
      if (isPublished) {
        for (const newEvent of newEvents) {
          setTimeout(() => {
            createEventNotifications(newEvent, id).catch(console.error);
          }, 100);
        }
      }
    }
    
    const updatedSchedule = await prisma.schedule.findUnique({
      where: { id },
      include: {
        events: true,
        creator: {
          select: { id: true, fullName: true }
        }
      }
    });

    res.json({ success: true, schedule: updatedSchedule });
  } catch (err) {
    console.error("Error updating schedule:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE schedule
app.delete("/api/admin/schedules/:id", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId } 
    });
    
    if (!isAdminOrSecretary(user)) {
      return res.status(403).json({ error: "Not authorized. Admin or Secretary only." });
    }

    const { id } = req.params;
    
    // Delete scheduled notifications first
    const events = await prisma.scheduleEvent.findMany({ where: { scheduleId: id } });
    for (const event of events) {
      await prisma.scheduledNotification.deleteMany({ where: { eventId: event.id } });
    }
    
    await prisma.scheduleEvent.deleteMany({ where: { scheduleId: id } });
    await prisma.schedule.delete({ where: { id } });
    
    res.json({ success: true, message: "Schedule deleted successfully" });
  } catch (err) {
    console.error("Error deleting schedule:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== NOTIFICATION ROUTES (USER-FACING) ====================
app.post("/api/schedules/check-notifications", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const now = getKenyanTime();
    
    console.log(`🔍 Checking at Kenyan time: ${now.toLocaleString('en-US', { timeZone: KENYA_TIMEZONE })}`);
    
    const pendingNotifications = await prisma.scheduledNotification.findMany({
      where: {
        notifyAt: { lte: now },
        isSent: false
      },
      include: {
        event: {
          include: {
            schedule: true
          }
        }
      }
    });
    
    console.log(`📬 Found ${pendingNotifications.length} pending`);
    
    const notificationsSent = [];
    
    for (const notification of pendingNotifications) {
      const alreadyReceived = await prisma.notification.findFirst({
        where: {
          userId: userId,
          type: "event_reminder",
          createdAt: {
            gte: new Date(now.setHours(0,0,0))
          },
          data: { 
            path: ['notificationId'], 
            equals: notification.id 
          }
        }
      });
      
      if (!alreadyReceived) {
        await createAndSendNotification({
          userId: userId,
          type: "event_reminder",
          title: notification.title,
          message: notification.message,
          data: { 
            eventId: notification.eventId,
            scheduleId: notification.scheduleId,
            priority: notification.priority,
            notificationId: notification.id
          }
        });
        
        await prisma.scheduledNotification.update({
          where: { id: notification.id },
          data: { 
            isSent: true,
            sentAt: now
          }
        });
        
        notificationsSent.push(notification);
      }
    }
    
    res.json({ 
      success: true, 
      newNotifications: notificationsSent.length,
      kenyanTime: now.toLocaleString('en-US', { timeZone: KENYA_TIMEZONE })
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: err.message });
  }
});



// Get upcoming events for current user
app.get("/api/schedules/my-upcoming-events", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const now = new Date();
    const sixtyDaysLater = new Date(now);
    sixtyDaysLater.setDate(sixtyDaysLater.getDate() + 60);
    
    const events = await prisma.scheduleEvent.findMany({
      where: {
        eventDate: { gte: now, lte: sixtyDaysLater },
        schedule: { isPublished: true }
      },
      include: {
        schedule: {
          select: {
            title: true,
            id: true
          }
        }
      },
      orderBy: { eventDate: 'asc' }
    });
    
    const eventsWithNotifications = await Promise.all(events.map(async (event) => {
      const notificationSchedules = await prisma.scheduledNotification.findMany({
        where: { eventId: event.id },
        orderBy: { notifyAt: 'asc' }
      });
      
      const notificationStatus = await Promise.all(notificationSchedules.map(async (ns) => {
        const received = await prisma.notification.findFirst({
          where: {
            userId: userId,
            data: { path: `notification_${ns.id}` }
          }
        });
        
        const eventDateTime = new Date(event.eventDate);
        const [hours, minutes] = (event.eventTime || "16:30").split(":");
        eventDateTime.setHours(parseInt(hours), parseInt(minutes), 0);
        
        return {
          ...ns,
          received: !!received,
          timeUntilEvent: eventDateTime.getTime() - now.getTime(),
          hoursUntilEvent: Math.round((eventDateTime.getTime() - now.getTime()) / (1000 * 60 * 60))
        };
      }));
      
      const nextNotification = notificationStatus.find(n => !n.received && n.notifyAt > now);
      const daysUntilEvent = Math.ceil((new Date(event.eventDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        ...event,
        notificationSchedules: notificationStatus,
        nextNotification: nextNotification || null,
        daysUntilEvent: daysUntilEvent,
        isToday: daysUntilEvent === 0,
        isTomorrow: daysUntilEvent === 1,
        isThisWeek: daysUntilEvent <= 7 && daysUntilEvent > 0
      };
    }));
    
    res.json(eventsWithNotifications);
  } catch (err) {
    console.error("Error fetching upcoming events:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get event notifications for a specific event
app.get("/api/schedules/events/:eventId/notifications", authenticate, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.userId;
    
    const notifications = await prisma.scheduledNotification.findMany({
      where: { eventId },
      orderBy: { notifyAt: 'asc' }
    });
    
    const notificationsWithStatus = await Promise.all(notifications.map(async (notification) => {
      const received = await prisma.notification.findFirst({
        where: {
          userId: userId,
          data: { path: `notification_${notification.id}` }
        }
      });
      
      return {
        ...notification,
        received: !!received,
        receivedAt: received?.createdAt || null
      };
    }));
    
    res.json(notificationsWithStatus);
  } catch (err) {
    console.error("Error fetching event notifications:", err);
    res.status(500).json({ error: err.message });
  }
});

// Mark notification as read
app.put("/api/schedules/notifications/:id/read", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.notification.update({
      where: { id },
      data: { read: true, readAt: new Date() }
    });
    
    res.json({ success: true });
  } catch (err) {
    console.error("Error marking notification as read:", err);
    res.status(500).json({ error: err.message });
  }
});

// Mark all notifications as read
app.put("/api/schedules/notifications/read-all", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    await prisma.notification.updateMany({
      where: {
        userId: userId,
        read: false,
        type: "event_reminder"
      },
      data: { read: true, readAt: new Date() }
    });
    
    res.json({ success: true });
  } catch (err) {
    console.error("Error marking all notifications as read:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get unread notification count
app.get("/api/schedules/notifications/unread-count", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const count = await prisma.notification.count({
      where: {
        userId: userId,
        read: false,
        type: "event_reminder"
      }
    });
    
    res.json({ unreadCount: count });
  } catch (err) {
    console.error("Error getting unread count:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get all user notifications (paginated)
app.get("/api/schedules/notifications", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: {
          userId: userId,
          type: "event_reminder"
        },
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: parseInt(limit)
      }),
      prisma.notification.count({
        where: {
          userId: userId,
          type: "event_reminder"
        }
      })
    ]);
    
    res.json({
      notifications,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ error: err.message });
  }
});

// Manually trigger reminder for an event (admin only)
app.post("/api/admin/schedules/events/:eventId/remind", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId } 
    });
    
    if (!isAdminOrSecretary(user)) {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    const { eventId } = req.params;
    const { message, priority = "urgent" } = req.body;
    
    const event = await prisma.scheduleEvent.findUnique({
      where: { id: eventId },
      include: { schedule: true }
    });
    
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    
    // Send immediate reminder in background
    notifyAllUsers(
      `🔔 REMINDER: ${event.title}`,
      message || `This is a reminder for "${event.title}" happening on ${new Date(event.eventDate).toLocaleDateString()} at ${event.eventTime} in ${event.location}`,
      "event_reminder",
      { eventId, manual: true, priority: priority }
    ).catch(console.error);
    
    res.json({ success: true, message: "Reminder sent successfully" });
  } catch (err) {
    console.error("Error sending reminder:", err);
    res.status(500).json({ error: err.message });
  }
});

console.log("✅ Schedule management routes loaded successfully");



console.log("✅ Schedule management routes loaded successfully");


// ==================== HEALTH CENTRE ROUTES ====================

const os = require('os');

const healthStore = {
  errors: [],
  slowRequests: [],
  userReports: [],
  apiMetrics: new Map(),
  serverStartTime: new Date(),
  requestCount: 0,
  errorCount: 0
};

// Malicious requests tracking
const maliciousRequests = [];
const bruteForceAttempts = [];
const sqlInjectionAttempts = [];
const xssAttempts = [];

// Backend sleep tracking
let lastRequestTime = new Date();
let sleepHistory = [];

// Middleware for malicious request detection
app.use((req, res, next) => {
  const maliciousPatterns = [
    { pattern: /<script|alert\(|onerror=|onclick=/i, type: 'XSS' },
    { pattern: /' OR '1'='1|UNION SELECT|DROP TABLE|DELETE FROM|INSERT INTO/i, type: 'SQL Injection' },
    { pattern: /\.\.\/|\.\.\\|etc\/passwd/i, type: 'Path Traversal' },
    { pattern: /<\?php|eval\(|base64_decode|system\(/i, type: 'Code Injection' }
  ];
  
  const url = req.url;
  const body = JSON.stringify(req.body || '');
  const fullText = url + body;
  
  for (const { pattern, type } of maliciousPatterns) {
    if (pattern.test(fullText)) {
      maliciousRequests.unshift({
        endpoint: req.path,
        method: req.method,
        maliciousType: type,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      if (maliciousRequests.length > 100) maliciousRequests.pop();
      break;
    }
  }
  
  // Backend sleep tracking
  const now = new Date();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest > 30000) {
    sleepHistory.unshift({
      sleptAt: lastRequestTime,
      wokeAt: now,
      duration: timeSinceLastRequest,
      reason: 'No requests for ' + (timeSinceLastRequest / 1000).toFixed(0) + 's'
    });
    if (sleepHistory.length > 20) sleepHistory.pop();
  }
  lastRequestTime = now;
  
  next();
});

// API performance tracking middleware
app.use((req, res, next) => {
  const start = Date.now();
  healthStore.requestCount++;
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const endpoint = `${req.method} ${req.path}`;
    
    if (!healthStore.apiMetrics.has(endpoint)) {
      healthStore.apiMetrics.set(endpoint, { count: 0, totalTime: 0, slowest: 0 });
    }
    
    const metrics = healthStore.apiMetrics.get(endpoint);
    metrics.count++;
    metrics.totalTime += duration;
    if (duration > metrics.slowest) metrics.slowest = duration;
    
    if (duration > 2000) {
      healthStore.slowRequests.unshift({
        endpoint,
        duration,
        timestamp: new Date().toISOString(),
        userId: req.user?.userId
      });
      if (healthStore.slowRequests.length > 100) healthStore.slowRequests.pop();
    }
    
    if (res.statusCode >= 400) {
      healthStore.errors.unshift({
        statusCode: res.statusCode,
        endpoint,
        method: req.method,
        message: res.statusMessage || 'Request failed',
        timestamp: new Date().toISOString(),
        userId: req.user?.userId,
        ip: req.ip
      });
      if (healthStore.errors.length > 500) healthStore.errors.pop();
    }
  });
  
  next();
});

// ==================== HEALTH ENDPOINTS ====================

app.get("/api/admin/health/system", authenticate, requireAdmin, async (req, res) => {
  const uptime = process.uptime();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  
  res.json({
    success: true,
    uptime: {
      seconds: uptime,
      formatted: `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      startTime: healthStore.serverStartTime
    },
    memory: {
      total: totalMemory,
      used: usedMemory,
      free: freeMemory,
      percentUsed: ((usedMemory / totalMemory) * 100).toFixed(1)
    },
    cpu: {
      cores: os.cpus().length,
      model: os.cpus()[0]?.model,
      loadAverage: os.loadavg()
    },
    requests: {
      total: healthStore.requestCount,
      errors: healthStore.errors.length
    }
  });
});

app.get("/api/admin/health/errors", authenticate, requireAdmin, async (req, res) => {
  const { limit = 100, statusCode } = req.query;
  
  let errors = [...healthStore.errors];
  
  if (statusCode && statusCode !== 'all') {
    errors = errors.filter(e => e.statusCode === parseInt(statusCode));
  }
  
  res.json({
    success: true,
    total: errors.length,
    errors: errors.slice(0, parseInt(limit))
  });
});

app.get("/api/admin/health/slow-requests", authenticate, requireAdmin, async (req, res) => {
  const { limit = 50 } = req.query;
  
  res.json({
    success: true,
    total: healthStore.slowRequests.length,
    requests: healthStore.slowRequests.slice(0, parseInt(limit))
  });
});

app.get("/api/admin/health/api-metrics", authenticate, requireAdmin, async (req, res) => {
  const metrics = [];
  
  for (const [endpoint, data] of healthStore.apiMetrics.entries()) {
    metrics.push({
      endpoint,
      count: data.count,
      avgTime: (data.totalTime / data.count).toFixed(0),
      slowest: data.slowest
    });
  }
  
  metrics.sort((a, b) => b.avgTime - a.avgTime);
  
  res.json({
    success: true,
    endpoints: metrics.slice(0, 50)
  });
});

app.get("/api/admin/health/failed-logins", authenticate, requireAdmin, async (req, res) => {
  const resetAttemptsArray = [];
  
  for (const [email, data] of resetAttempts.entries()) {
    resetAttemptsArray.push({
      email,
      attempts: data,
      timestamp: new Date().toISOString()
    });
  }
  
  res.json({
    success: true,
    total: resetAttemptsArray.length,
    attempts: resetAttemptsArray.slice(0, 50)
  });
});

app.get("/api/admin/health/pending-resets", authenticate, requireAdmin, async (req, res) => {
  const pendingResets = await prisma.user.findMany({
    where: {
      resetCode: { not: null },
      resetCodeExpiry: { gt: new Date() }
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      resetCodeExpiry: true
    }
  });
  
  res.json({
    success: true,
    count: pendingResets.length,
    resets: pendingResets
  });
});

app.get("/api/admin/health/pending-verifications", authenticate, requireAdmin, async (req, res) => {
  const pending = [];
  
  for (const [email, data] of pendingRegistrations.entries()) {
    pending.push({
      email,
      fullName: data.fullName,
      phone: data.phone,
      expiresAt: data.verificationExpiry
    });
  }
  
  res.json({
    success: true,
    count: pending.length,
    pending: pending
  });
});

app.get("/api/admin/health/online-users", authenticate, requireAdmin, async (req, res) => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  const onlineUsers = await prisma.user.findMany({
    where: {
      lastActive: { gte: fiveMinutesAgo }
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      lastActive: true,
      role: true
    }
  });
  
  res.json({
    success: true,
    count: onlineUsers.length,
    users: onlineUsers
  });
});

app.get("/api/admin/health/socket-status", authenticate, requireAdmin, async (req, res) => {
  res.json({
    success: true,
    connectedUsers: onlineUsers.size,
    rooms: Array.from(io.sockets.adapter.rooms.keys()).length
  });
});

app.get("/api/admin/health/services", authenticate, requireAdmin, async (req, res) => {
  const services = {
    database: { status: 'healthy' },
    youtube: { status: 'unknown' },
    email: { status: 'unknown' },
    gemini: { status: 'unknown' }
  };
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    services.database.status = 'healthy';
  } catch (err) {
    services.database.status = 'down';
    services.database.message = err.message;
  }
  
  if (process.env.YOUTUBE_API_KEY) {
    services.youtube.status = 'configured';
  } else {
    services.youtube.status = 'missing';
  }
  
  services.gemini.status = geminiModel ? 'healthy' : 'not_initialized';
  
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    services.pushNotifications = { status: 'configured' };
  }
  
  res.json({ success: true, services });
});

app.get("/api/admin/health/malicious-requests", authenticate, requireAdmin, async (req, res) => {
  res.json({
    success: true,
    total: maliciousRequests.length,
    requests: maliciousRequests.slice(0, 100)
  });
});

app.get("/api/admin/health/attack-trends", authenticate, requireAdmin, async (req, res) => {
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayMalicious = maliciousRequests.filter(m => 
      new Date(m.timestamp).toISOString().split('T')[0] === dateStr
    );
    
    last7Days.push({
      date: dateStr,
      xss: dayMalicious.filter(m => m.maliciousType === 'XSS').length,
      sql: dayMalicious.filter(m => m.maliciousType === 'SQL Injection').length,
      brute: dayMalicious.filter(m => m.maliciousType === 'Brute Force').length
    });
  }
  res.json({ success: true, trends: last7Days });
});

app.get("/api/admin/health/backend-sleep", authenticate, requireAdmin, async (req, res) => {
  res.json({
    success: true,
    lastActive: lastRequestTime,
    sleepHistory: sleepHistory,
    totalSleepEvents: sleepHistory.length
  });
});

app.get("/api/admin/health/storage-metrics", authenticate, requireAdmin, async (req, res) => {
  try {
    const { supabase } = require("./supabaseClient");
    
    let totalSize = 0;
    let totalFiles = 0;
    let images = 0;
    let videos = 0;
    let documents = 0;
    
    const { data: files, error } = await supabase.storage
      .from("media")
      .list("", { limit: 1000 });
    
    if (files && !error) {
      totalFiles = files.length;
      
      for (const file of files) {
        totalSize += file.metadata?.size || 0;
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) images++;
        else if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) videos++;
        else if (['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx'].includes(ext)) documents++;
      }
    }
    
    const totalStorage = 50 * 1024 * 1024 * 1024;
    
    res.json({
      success: true,
      metrics: {
        totalSize: totalStorage,
        usedSize: totalSize,
        freeSize: totalStorage - totalSize,
        percentUsed: totalStorage > 0 ? (totalSize / totalStorage) * 100 : 0,
        totalFiles: totalFiles,
        images: images,
        videos: videos,
        documents: documents
      }
    });
  } catch (err) {
    console.error("Storage metrics error:", err);
    res.json({
      success: false,
      error: err.message,
      metrics: {
        totalSize: 0,
        usedSize: 0,
        freeSize: 0,
        percentUsed: 0,
        totalFiles: 0,
        images: 0,
        videos: 0,
        documents: 0
      }
    });
  }
});

app.post("/api/admin/health/report", authenticate, requireAdmin, async (req, res) => {
  const { title, description, severity } = req.body;
  
  const report = {
    id: Date.now(),
    title,
    description,
    severity: severity || 'medium',
    userId: req.user.userId,
    userName: req.user.fullName,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  healthStore.userReports.unshift(report);
  if (healthStore.userReports.length > 200) healthStore.userReports.pop();
  
  res.json({ success: true, report });
});

app.get("/api/admin/health/reports", authenticate, requireAdmin, async (req, res) => {
  const { status = 'all', limit = 50 } = req.query;
  
  let reports = [...healthStore.userReports];
  
  if (status !== 'all') {
    reports = reports.filter(r => r.status === status);
  }
  
  res.json({
    success: true,
    total: reports.length,
    reports: reports.slice(0, parseInt(limit))
  });
});

app.put("/api/admin/health/reports/:reportId/resolve", authenticate, requireAdmin, async (req, res) => {
  const { reportId } = req.params;
  
  const report = healthStore.userReports.find(r => r.id === parseInt(reportId));
  
  if (!report) {
    return res.status(404).json({ error: "Report not found" });
  }
  
  report.status = 'resolved';
  report.resolvedAt = new Date().toISOString();
  report.resolvedBy = req.user.userId;
  
  res.json({ success: true, report });
});

app.get("/api/admin/health/clear-errors", authenticate, requireAdmin, async (req, res) => {
  healthStore.errors = [];
  
  res.json({ success: true, message: "Error logs cleared" });
});

app.get("/api/admin/health/database-stats", authenticate, requireAdmin, async (req, res) => {
  const [userCount, announcementCount, messageCount, pledgeCount, mediaCount, songCount, jumuiaCount] = await Promise.all([
    prisma.user.count(),
    prisma.announcement.count(),
    prisma.message.count(),
    prisma.pledge.count(),
    prisma.media.count(),
    prisma.song.count(),
    prisma.jumuia.count()
  ]);
  
  res.json({
    success: true,
    stats: {
      users: userCount,
      announcements: announcementCount,
      messages: messageCount,
      pledges: pledgeCount,
      media: mediaCount,
      songs: songCount,
      jumuias: jumuiaCount
    }
  });
});

app.post("/api/admin/health/test-email", authenticate, requireAdmin, async (req, res) => {
  try {
    const testUser = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });
    
    await sendPersonalizedEmail(
      { email: testUser.email, fullName: testUser.fullName },
      'test',
      '🔧 Health Centre Test',
      'This is a test email from ZUCA Health Centre. If you received this, email service is working!',
      {}
    );
    
    res.json({ success: true, message: "Test email sent" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/admin/health/test-youtube", authenticate, requireAdmin, async (req, res) => {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    const channelId = process.env.YOUTUBE_CHANNEL_ID || "UCJ7NvR5_ZUwhtM16sJY4anQ";
    
    if (!apiKey) {
      return res.json({ success: false, error: "YouTube API key not configured" });
    }
    
    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/channels?part=id&id=${channelId}&key=${apiKey}`
    );
    
    if (response.data.items && response.data.items.length > 0) {
      res.json({ success: true, message: "YouTube API working" });
    } else {
      res.json({ success: false, error: "Channel not found" });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/admin/health/export-logs", authenticate, requireAdmin, async (req, res) => {
  const exportData = {
    exportedAt: new Date().toISOString(),
    system: {
      uptime: process.uptime(),
      requestCount: healthStore.requestCount,
      errorCount: healthStore.errors.length
    },
    errors: healthStore.errors.slice(0, 500),
    slowRequests: healthStore.slowRequests.slice(0, 100),
    userReports: healthStore.userReports.slice(0, 100),
    apiEndpoints: Array.from(healthStore.apiMetrics.entries()).slice(0, 50),
    maliciousRequests: maliciousRequests.slice(0, 100),
    sleepHistory: sleepHistory.slice(0, 20)
  };
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=health-logs-${Date.now()}.json`);
  res.json(exportData);
});

app.get("/api/admin/health/recent-logins", authenticate, requireAdmin, async (req, res) => {
  const { limit = 20 } = req.query;
  
  const recentLogins = await prisma.user.findMany({
    orderBy: { lastActive: 'desc' },
    take: parseInt(limit),
    select: {
      id: true,
      fullName: true,
      email: true,
      lastActive: true,
      role: true
    }
  });
  
  res.json({
    success: true,
    logins: recentLogins
  });
});

app.get("/api/admin/health/clear-cache", authenticate, requireAdmin, async (req, res) => {
  healthStore.apiMetrics.clear();
  healthStore.slowRequests = [];
  
  res.json({ success: true, message: "API metrics cache cleared" });
});

// ==================== GLOBAL ERROR HANDLER ====================
// This catches EVERY error in your entire app automatically!


// Add this middleware AFTER all your routes
app.use((err, req, res, next) => {
  // ✅ Automatically logs ANY error from ANY route
  if (systemMonitor) {
    systemMonitor.logError(err, {
      userId: req.user?.userId || null,
      path: req.path,
      method: req.method,
      ip: req.ip,
      body: req.body,
      query: req.query,
      params: req.params
    });
    
    systemMonitor.logActivity('error', {
      userId: req.user?.userId || null,
      path: req.path,
      method: req.method,
      error: err.message,
      statusCode: err.statusCode || 500
    });
  }

  // Log to console
  console.error(`❌ ${req.method} ${req.path} - Error:`, err.message);
  console.error(err.stack);

  // Send response to user
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Also catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  if (systemMonitor) {
    systemMonitor.logError(reason, {
      type: 'unhandled_rejection',
      promise: promise
    });
  }
});

// Catch uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  if (systemMonitor) {
    systemMonitor.logError(error, {
      type: 'uncaught_exception'
    });
  }
  // Don't crash the server
});




// ================== START SERVER ==================
const PORT = 5000;
server.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
