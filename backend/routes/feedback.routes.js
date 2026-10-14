// routes/feedback.routes.js
const express = require("express");
const router = express.Router();
const { authenticate, requireAdmin } = require("../middleware/auth");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

console.log('✅ FEEDBACK ROUTES LOADED');

// ==================== MULTER CONFIG ====================
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// ==================== NOTIFICATION HELPER - FIRE AND FORGET ====================
async function sendFeedbackNotification(admins, feedback) {
  if (!admins || admins.length === 0) return;

  const frontendUrl = process.env.FRONTEND_URL || 'https://www.zetechcatholicaction.com';
  const deepLinkUrl = `${frontendUrl}/admin/feedback/${feedback.id}`;
  
  for (const admin of admins) {
    // 🔥 FIRE AND FORGET - each notification runs independently
    setImmediate(async () => {
      try {
        // 1. CREATE IN-APP NOTIFICATION
        await prisma.notification.create({
          data: {
            userId: admin.id,
            type: "feedback_new",
            title: `📋 New Feedback: ${feedback.subject}`,
            message: `From: ${feedback.isAnonymous ? 'Anonymous' : 'User'}\nType: ${feedback.type}\nPriority: ${feedback.priority}`,
            data: { 
              feedbackId: feedback.id,
              type: feedback.type,
              priority: feedback.priority,
              url: deepLinkUrl
            }
          }
        });

        // 2. SEND REAL-TIME VIA SOCKET.IO
        const io = global.io;
        if (io) {
          io.to(admin.id).emit('new_notification', {
            type: "feedback_new",
            title: `📋 New Feedback: ${feedback.subject}`,
            message: `From: ${feedback.isAnonymous ? 'Anonymous' : 'User'}`,
            data: { feedbackId: feedback.id }
          });
        }

        // 3. SEND PUSH NOTIFICATION
        try {
          const subscription = await prisma.pushSubscription.findUnique({
            where: { userId: admin.id }
          });

          if (subscription) {
            const webpush = require('web-push');
            webpush.setVapidDetails(
              'mailto:zucaportal2025@gmail.com',
              process.env.VAPID_PUBLIC_KEY,
              process.env.VAPID_PRIVATE_KEY
            );

            const unreadCount = await prisma.notification.count({
              where: { userId: admin.id, read: false }
            });

            const pushSubscription = JSON.parse(subscription.subscription);
            await webpush.sendNotification(
              pushSubscription,
              JSON.stringify({
                title: `📋 New Feedback: ${feedback.subject}`,
                body: `From: ${feedback.isAnonymous ? 'Anonymous' : 'User'} • ${feedback.type} • ${feedback.priority}`,
                icon: "/android-chrome-192x192.png",
                badge: "/favicon.ico",
                badgeCount: unreadCount + 1,
                data: { 
                  type: "feedback_new",
                  feedbackId: feedback.id,
                  url: deepLinkUrl
                },
                url: deepLinkUrl,
                timestamp: Date.now()
              }),
              { urgency: 'high', TTL: 86400 }
            );
          }
        } catch (err) {
          // Silent fail for push
        }

        // 4. SEND EMAIL
        try {
          const { sendPersonalizedEmail } = require("../services/mailer");
          
          if (admin.email) {
            await sendPersonalizedEmail(
              { email: admin.email, fullName: admin.fullName },
              "feedback_new",
              `New Feedback: ${feedback.subject}`,
              `Dear ${admin.fullName},

A new feedback has been submitted:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEEDBACK DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Subject: ${feedback.subject}
Type: ${feedback.type}
Category: ${feedback.category}
Priority: ${feedback.priority}
Status: ${feedback.status}
From: ${feedback.isAnonymous ? 'Anonymous' : 'User'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DESCRIPTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${feedback.description}

${feedback.attachments ? `\n📎 Attachments: ${feedback.attachments.length} file(s)` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACTION REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Please review and respond at: ${deepLinkUrl}

Zetech Catholic Action Portal`,
              { 
              feedbackId: feedback.id, 
              subject: feedback.subject, 
              type: feedback.type,
              priority: feedback.priority
            }
            );
          }
        } catch (err) {
          // Silent fail for email
        }

      } catch (err) {
        // Silent fail - don't crash
      }
    });
  }
}

// ============================================
// TEST ROUTE
// ============================================
router.get("/ping", (req, res) => {
  res.json({ success: true, message: "Feedback routes are working!" });
});

// ============================================
// ✅ ADMIN ROUTES
// ============================================

// Admin test route
router.get("/admin/test", authenticate, requireAdmin, (req, res) => {
  res.json({
    success: true,
    message: "Admin route is working!",
    user: req.user.fullName,
    role: req.user.role
  });
});

// Get all feedback (admin)
router.get("/admin", authenticate, requireAdmin, async (req, res) => {
  try {
    const { status, type, priority, limit = 50, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (priority) where.priority = priority;

    const [feedbacks, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              role: true,
              specialRole: true,
              membership_number: true,
              homeJumuia: { select: { name: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.feedback.count({ where })
    ]);

    const stats = {
      total: await prisma.feedback.count(),
      pending: await prisma.feedback.count({ where: { status: 'PENDING' } }),
      inReview: await prisma.feedback.count({ where: { status: 'IN_REVIEW' } }),
      resolved: await prisma.feedback.count({ where: { status: 'RESOLVED' } }),
      closed: await prisma.feedback.count({ where: { status: 'CLOSED' } }),
      rejected: await prisma.feedback.count({ where: { status: 'REJECTED' } }),
      byType: {
        feedback: await prisma.feedback.count({ where: { type: 'FEEDBACK' } }),
        complaint: await prisma.feedback.count({ where: { type: 'COMPLAINT' } }),
        suggestion: await prisma.feedback.count({ where: { type: 'SUGGESTION' } }),
        bugReport: await prisma.feedback.count({ where: { type: 'BUG_REPORT' } }),
      }
    };

    res.json({
      success: true,
      feedbacks,
      stats,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Admin feedback error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get feedback stats (admin)
router.get("/admin/stats/summary", authenticate, requireAdmin, async (req, res) => {
  try {
    const [total, pending, inReview, resolved, closed, rejected] = await Promise.all([
      prisma.feedback.count(),
      prisma.feedback.count({ where: { status: 'PENDING' } }),
      prisma.feedback.count({ where: { status: 'IN_REVIEW' } }),
      prisma.feedback.count({ where: { status: 'RESOLVED' } }),
      prisma.feedback.count({ where: { status: 'CLOSED' } }),
      prisma.feedback.count({ where: { status: 'REJECTED' } })
    ]);

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const [thisMonthCount, lastMonthCount] = await Promise.all([
      prisma.feedback.count({ where: { createdAt: { gte: thisMonth } } }),
      prisma.feedback.count({ 
        where: { 
          createdAt: { 
            gte: new Date(thisMonth.getFullYear(), thisMonth.getMonth() - 1, 1),
            lt: thisMonth
          }
        }
      })
    ]);

    const percentageChange = lastMonthCount > 0 
      ? ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100 
      : thisMonthCount > 0 ? 100 : 0;

    res.json({
      success: true,
      stats: {
        total,
        pending,
        inReview,
        resolved,
        closed,
        rejected,
        thisMonth: thisMonthCount,
        lastMonth: lastMonthCount,
        percentageChange: Math.round(percentageChange)
      }
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update feedback status (admin)
router.patch("/admin/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminResponse } = req.body;

    const existing = await prisma.feedback.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!existing) {
      return res.status(404).json({ error: "Feedback not found" });
    }

    // Build update data
    const data = {
      status: status,
      adminResponse: adminResponse !== undefined ? adminResponse : existing.adminResponse
    };

    // If resolved/closed/rejected, set resolved fields
    if (['RESOLVED', 'CLOSED', 'REJECTED'].includes(status)) {
      data.resolvedAt = new Date();
      data.resolvedBy = req.user.userId;
    }

    // Update feedback
    const feedback = await prisma.feedback.update({
      where: { id },
      data: data,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    // Notify user about status change (fire and forget)
    if (!existing.isAnonymous && existing.user) {
      setImmediate(async () => {
        try {
          const frontendUrl = process.env.FRONTEND_URL || 'https://www.zetechcatholicaction.com';
          const deepLinkUrl = `${frontendUrl}/feedback/${feedback.id}`;
          
          // In-app notification
          await prisma.notification.create({
            data: {
              userId: existing.userId,
              type: "feedback_updated",
              title: `📋 Feedback Update: ${existing.subject}`,
              message: `Your feedback has been ${status.toLowerCase()}. ${adminResponse ? 'Admin response: ' + adminResponse : ''}`,
              data: { 
                feedbackId: feedback.id,
                status: feedback.status,
                url: deepLinkUrl
              }
            }
          });

          // Push notification
          try {
            const subscription = await prisma.pushSubscription.findUnique({
              where: { userId: existing.userId }
            });

            if (subscription) {
              const webpush = require('web-push');
              webpush.setVapidDetails(
                'mailto:zucaportal2025@gmail.com',
                process.env.VAPID_PUBLIC_KEY,
                process.env.VAPID_PRIVATE_KEY
              );

              const pushSubscription = JSON.parse(subscription.subscription);
              await webpush.sendNotification(
                pushSubscription,
                JSON.stringify({
                  title: `📋 Feedback Update: ${existing.subject}`,
                  body: `Your feedback has been ${status.toLowerCase()}`,
                  icon: "/android-chrome-192x192.png",
                  badge: "/favicon.ico",
                  data: { 
                    type: "feedback_updated",
                    feedbackId: feedback.id,
                    url: deepLinkUrl
                  },
                  url: deepLinkUrl,
                  timestamp: Date.now()
                }),
                { urgency: 'high' }
              );
            }
          } catch (err) {}

          // Email
          try {
            const { sendPersonalizedEmail } = require("../services/mailer");
            if (existing.user.email) {
              await sendPersonalizedEmail(
                { email: existing.user.email, fullName: existing.user.fullName },
                "feedback_updated",
                `Feedback Update: ${existing.subject}`,
                `Your feedback has been updated to ${status.toLowerCase()}.`,
                { feedbackId: feedback.id, status: status }
              );
            }
          } catch (err) {}

        } catch (err) {}
      });
    }

    res.json({
      success: true,
      message: "Feedback updated successfully",
      feedback
    });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete feedback (admin)
router.delete("/admin/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.feedback.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: "Feedback not found" });
    }

    // Delete attachments from Cloudinary (fire and forget)
    if (existing.attachments) {
      setImmediate(async () => {
        for (const att of existing.attachments) {
          if (att.publicId) {
            try {
              await cloudinary.uploader.destroy(att.publicId);
            } catch (err) {}
          }
        }
      });
    }

    await prisma.feedback.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: "Feedback deleted successfully"
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get single feedback (admin)
router.get("/admin/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const feedback = await prisma.feedback.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            specialRole: true,
            membership_number: true
          }
        }
      }
    });

    if (!feedback) {
      return res.status(404).json({ error: "Feedback not found" });
    }

    res.json({ success: true, feedback });
  } catch (error) {
    console.error("Get feedback error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// USER ROUTES
// ============================================

// Submit feedback - FIRE AND FORGET EVERYTHING
router.post("/", authenticate, upload.array('attachments', 5), async (req, res) => {
  try {
    console.log("📝 Feedback POST received");
    
    const { 
      type, category, subject, description, 
      priority, isAnonymous, pageUrl 
    } = req.body;

    // Quick validation
    if (!type || !category || !subject || !description) {
      return res.status(400).json({ 
        error: "Missing required fields: type, category, subject, description" 
      });
    }

    // ⚡ START BACKGROUND PROCESSING - DON'T WAIT
    setImmediate(async () => {
      try {
        // 1. Upload files to Cloudinary (if any)
        let uploadedFiles = [];
        if (req.files?.length > 0) {
          for (const file of req.files) {
            try {
              const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                  {
                    folder: 'feedback',
                    resource_type: 'auto',
                    allowed_formats: ['jpg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv']
                  },
                  (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                  }
                );
                uploadStream.end(file.buffer);
              });

              uploadedFiles.push({
                url: result.secure_url,
                filename: file.originalname,
                type: file.mimetype,
                size: file.size,
                publicId: result.public_id
              });
            } catch (err) {
              console.error('File upload failed:', err.message);
            }
          }
        }

        // 2. Create feedback in database
        const feedback = await prisma.feedback.create({
          data: {
            userId: req.user.userId,
            type,
            category,
            subject,
            description,
            priority: priority || 'MEDIUM',
            status: 'PENDING',
            isAnonymous: isAnonymous === 'true',
            pageUrl: pageUrl || null,
            deviceInfo: req.headers['user-agent'] || null,
            attachments: uploadedFiles.length > 0 ? uploadedFiles : null
          }
        });

        console.log("✅ Feedback created:", feedback.id);

        // 3. Send notifications (FIRE AND FORGET)
        const admins = await prisma.user.findMany({
          where: { role: 'admin' },
          select: { id: true, fullName: true, email: true }
        });

        if (admins.length > 0) {
          sendFeedbackNotification(admins, feedback).catch(() => {});
        }

      } catch (err) {
        console.error('Background processing error:', err.message);
      }
    });

    // ⚡ SEND RESPONSE IMMEDIATELY
    res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
      feedback: {
        id: "processing",
        status: "PENDING",
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Submit error:", error);
    res.status(500).json({ 
      error: "Failed to submit feedback",
      details: error.message 
    });
  }
});

// Get user's feedback history
router.get("/my", authenticate, async (req, res) => {
  try {
    const feedbacks = await prisma.feedback.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        category: true,
        subject: true,
        description: true,
        status: true,
        priority: true,
        adminResponse: true,
        createdAt: true,
        updatedAt: true,
        resolvedAt: true
      }
    });

    res.json({ success: true, feedbacks });
  } catch (error) {
    console.error("History error:", error);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

// Get single feedback (user or admin)
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const feedback = await prisma.feedback.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    if (!feedback) {
      return res.status(404).json({ error: "Feedback not found" });
    }

    const isAdmin = ['admin', 'secretary'].includes(req.user.role) || 
                    ['admin', 'secretary'].includes(req.user.specialRole);
                    
    if (feedback.userId !== req.user.userId && !isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({ success: true, feedback });
  } catch (error) {
    console.error("Get error:", error);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

// Upload attachments
router.post("/upload", authenticate, upload.array('files', 5), async (req, res) => {
  try {
    const files = req.files;
    
    if (!files?.length) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const uploadedFiles = [];

    for (const file of files) {
      try {
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'feedback',
              resource_type: 'auto',
              allowed_formats: ['jpg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv']
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(file.buffer);
        });

        uploadedFiles.push({
          fileName: file.originalname,
          fileUrl: result.secure_url,
          publicId: result.public_id,
          fileType: file.mimetype,
          fileSize: file.size
        });
      } catch (err) {
        console.error(`Upload failed for ${file.originalname}:`, err.message);
      }
    }

    if (!uploadedFiles.length) {
      return res.status(400).json({ 
        success: false, 
        error: "No files could be uploaded" 
      });
    }

    res.json({
      success: true,
      files: uploadedFiles
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;