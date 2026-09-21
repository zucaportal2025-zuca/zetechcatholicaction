const express = require("express");
const router = express.Router();
const { authenticate, requireAdmin, requireLeaderOrAdmin } = require("../middleware/auth");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// ==================== USE MEMORY STORAGE INSTEAD ====================
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// ==================== FIRE-AND-FORGET NOTIFICATIONS ====================

async function sendBulkNotifications(users, title, message, data = {}) {
  if (!users || users.length === 0) return;

  const BATCH_SIZE = 50;
  const frontendUrl = process.env.FRONTEND_URL || 'https://www.zetechcatholicaction.com';
  const deepLinkUrl = `${frontendUrl}/mass-readings`;

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);

    setImmediate(async () => {
      try {
        const notifications = batch.map(user => {
          const personalizedTitle =
            typeof title === 'function'
              ? title(user)
              : title;

          const personalizedMessage =
            typeof message === 'function'
              ? message(user)
              : message;

          return {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            userId: user.id,
            type: "mass_reading",
            title: personalizedTitle,
            message: personalizedMessage,
            read: false,
            data: { ...data, url: deepLinkUrl },
            createdAt: new Date()
          };
        });

        await prisma.notification.createMany({
          data: notifications,
          skipDuplicates: true
        });

       
        const io = global.io;
        if (io) {
          batch.forEach(user => {
            io.to(user.id).emit('new_notification', {
              ...notifications.find(n => n.userId === user.id),
              createdAt: new Date().toISOString()
            });
          });
        }

        try {
          const subscriptions = await prisma.pushSubscription.findMany({
            where: {
              userId: { in: batch.map(u => u.id) }
            }
          });

          const webpush = require('web-push');
          webpush.setVapidDetails(
            'mailto:zucaportal2025@gmail.com',
            process.env.VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
          );

          const unreadCounts = await prisma.notification.groupBy({
            by: ['userId'],
            where: {
              userId: { in: batch.map(u => u.id) },
              read: false
            },
            _count: true
          });
          const unreadMap = {};
          unreadCounts.forEach(u => { unreadMap[u.userId] = u._count; });

          for (const sub of subscriptions) {
            try {
              const pushSubscription = JSON.parse(sub.subscription);
              await webpush.sendNotification(
                pushSubscription,
                JSON.stringify({
                  title,
                  body: message,
                  icon: '/android-chrome-192x192.png',
                  badge: '/favicon.ico',
                  badgeCount: (unreadMap[sub.userId] || 0) + 1,
                  data: { 
                    type: "mass_reading", 
                    ...data,
                    url: deepLinkUrl  // ✅ ADD URL HERE
                  },
                  url: deepLinkUrl,  // ✅ ADD URL HERE TOO
                  timestamp: Date.now()
                }),
                { urgency: 'high', TTL: 86400 }
              );
            } catch (err) {}
          }
        } catch (err) {}
      } catch (err) {
        console.error('Batch notification error:', err.message);
      }
    });
  }
}

// ==================== ROUTES ====================

router.get("/", async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const readings = await prisma.massReading.findMany({
      where: { isPublished: true },
      include: {
        attachments: {
          orderBy: { displayOrder: 'asc' }
        },
        user: {
          select: {
            id: true,
            fullName: true,
            profileImage: true
          }
        }
      },
      orderBy: { date: 'desc' },
      take: parseInt(limit),
      skip: skip
    });

    const total = await prisma.massReading.count({
      where: { isPublished: true }
    });

    res.json({
      success: true,
      readings,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error("Error fetching readings:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const reading = await prisma.massReading.findUnique({
      where: { id },
      include: {
        attachments: {
          orderBy: { displayOrder: 'asc' }
        },
        user: {
          select: {
            id: true,
            fullName: true,
            profileImage: true
          }
        }
      }
    });

    if (!reading) {
      return res.status(404).json({ success: false, error: "Reading not found" });
    }

    res.json({ success: true, reading });
  } catch (err) {
    console.error("Error fetching reading:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/", authenticate, async (req, res) => {
  try {
    const { title, description, date, dateLabel, attachments } = req.body;

    if (!title || !date) {
      return res.status(400).json({ error: "Title and date are required" });
    }

    const reading = await prisma.massReading.create({
      data: {
        title,
        description: description || null,
        date: new Date(date),
        dateLabel: dateLabel || new Date(date).toLocaleDateString('en-US', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }),
        uploadedBy: req.user.userId,
        isPublished: true
      }
    });

    if (attachments && attachments.length > 0) {
      await prisma.massReadingAttachment.createMany({
        data: attachments.map((att, index) => ({
          readingId: reading.id,
          fileName: att.fileName,
          fileUrl: att.fileUrl,
          publicId: att.publicId,
          fileType: att.fileType,
          mimeType: att.mimeType || null,
          fileSize: att.fileSize || null,
          displayOrder: index
        }))
      });
    }

    const completeReading = await prisma.massReading.findUnique({
      where: { id: reading.id },
      include: {
        attachments: {
          orderBy: { displayOrder: 'asc' }
        },
        user: {
          select: {
            id: true,
            fullName: true,
            profileImage: true
          }
        }
      }
    });

    const uploader = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { fullName: true }
    });

    res.status(201).json({
      success: true,
      message: "Reading created successfully",
      reading: completeReading
    });

    setImmediate(async () => {
      try {
        const allUsers = await prisma.user.findMany({
          select: { id: true }
        });

        if (allUsers.length === 0) return;

        const uploaderName = uploader?.fullName || 'Someone';
const formattedDate = new Date(date).toLocaleDateString("en-KE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric"
});

const notifTitle = `Hey ${user.fullName?.trim().split(/\s+/)[1] || "there"} 👋,  Mass Readings for ${formattedDate} Available on the Portal`;        const notifMessage = `${uploaderName} uploaded: ${title} Available on the Portal Click here to view`;
        const notifData = { readingId: reading.id, title, date };

        await sendBulkNotifications(allUsers, notifTitle, notifMessage, notifData);

        const io = req.app.get("io");
        if (io) {
          io.emit("new_mass_reading", {
            readingId: reading.id,
            title: title,
            date: date,
            uploader: uploaderName
          });
        }

        console.log(`📖 Mass reading created: "${title}" - Notifications sent to ${allUsers.length} users`);
      } catch (err) {
        console.error("Background notification error:", err.message);
      }
    });

  } catch (err) {
    console.error("Error creating reading:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, date, dateLabel, isPublished, attachments } = req.body;

    const existing = await prisma.massReading.findUnique({
      where: { id },
      include: { attachments: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: "Reading not found" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (existing.uploadedBy !== req.user.userId && user?.role !== 'admin') {
      return res.status(403).json({ error: "You can only edit your own readings" });
    }

    const updated = await prisma.massReading.update({
      where: { id },
      data: {
        title: title || existing.title,
        description: description !== undefined ? description : existing.description,
        date: date ? new Date(date) : existing.date,
        dateLabel: dateLabel || existing.dateLabel,
        isPublished: isPublished !== undefined ? isPublished : existing.isPublished,
        updatedAt: new Date()
      }
    });

    if (attachments) {
      await prisma.massReadingAttachment.deleteMany({
        where: { readingId: id }
      });

      if (attachments.length > 0) {
        await prisma.massReadingAttachment.createMany({
          data: attachments.map((att, index) => ({
            readingId: id,
            fileName: att.fileName,
            fileUrl: att.fileUrl,
            publicId: att.publicId,
            fileType: att.fileType,
            mimeType: att.mimeType || null,
            fileSize: att.fileSize || null,
            displayOrder: index
          }))
        });
      }
    }

    const completeReading = await prisma.massReading.findUnique({
      where: { id },
      include: {
        attachments: {
          orderBy: { displayOrder: 'asc' }
        },
        user: {
          select: {
            id: true,
            fullName: true,
            profileImage: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: "Reading updated successfully",
      reading: completeReading
    });
  } catch (err) {
    console.error("Error updating reading:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.massReading.findUnique({
      where: { id },
      include: { attachments: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: "Reading not found" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (existing.uploadedBy !== req.user.userId && user?.role !== 'admin') {
      return res.status(403).json({ error: "You can only delete your own readings" });
    }

    for (const att of existing.attachments) {
      setImmediate(async () => {
        try {
          await cloudinary.uploader.destroy(att.publicId);
        } catch (err) {
          console.warn("Could not delete from Cloudinary:", att.publicId);
        }
      });
    }

    await prisma.massReading.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: "Reading deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting reading:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== FIXED UPLOAD ROUTE ====================
router.post("/upload", authenticate, upload.array('files'), async (req, res) => {
  try {
    const files = req.files;
    
    console.log(`📤 Received ${files?.length || 0} files for upload`);
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const uploadedFiles = [];

    for (const file of files) {
      try {
        console.log(`📄 Processing: ${file.originalname} (${file.mimetype}, ${file.size} bytes)`);
        
        // Determine file type
        const isImage = file.mimetype.startsWith('image/');
        const isVideo = file.mimetype.startsWith('video/');
        const isPDF = file.mimetype === 'application/pdf';
        const isWord = file.mimetype === 'application/msword' || 
                       file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        const isPowerPoint = file.mimetype === 'application/vnd.ms-powerpoint' || 
                             file.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

        let options = {
          folder: 'mass-readings',
          resource_type: 'auto'
        };

        if (isVideo) options.resource_type = 'video';
        else if (isPDF || isWord || isPowerPoint) options.resource_type = 'raw';
        else if (isImage) options.resource_type = 'image';

        // Upload file buffer to Cloudinary
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            options,
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          
          // Write the buffer to the stream
          uploadStream.end(file.buffer);
        });

        console.log(`✅ Uploaded: ${file.originalname} -> ${result.secure_url}`);
        
        let fileType = 'image';
        if (isVideo) fileType = 'video';
        else if (isPDF) fileType = 'pdf';
        else if (isWord) fileType = 'word';
        else if (isPowerPoint) fileType = 'powerpoint';
        else fileType = 'image';

        uploadedFiles.push({
          fileName: file.originalname,
          fileUrl: result.secure_url,
          publicId: result.public_id,
          fileType: fileType,
          mimeType: file.mimetype,
          fileSize: file.size
        });
        
      } catch (err) {
        console.error(`❌ Error uploading file ${file.originalname}:`, err.message);
        // Continue with other files
      }
    }

    if (uploadedFiles.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "No files could be uploaded. Please check file formats and try again." 
      });
    }

    console.log(`✅ Successfully uploaded ${uploadedFiles.length} files`);
    
    res.json({
      success: true,
      files: uploadedFiles
    });

  } catch (err) {
    console.error("❌ Error in upload route:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;