const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticateDM, getFileTypeIcon, formatFileSize } = require('./helpers');
const { supabase } = require('../../supabaseClient');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => cb(null, true);
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 }, fileFilter });

// Helper: Upload file to Supabase
async function uploadToSupabase(file, userId) {
  const fileExt = path.extname(file.originalname);
  const fileName = `dm_${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}${fileExt}`;
  const filePath = `dm-files/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('media')
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Supabase upload failed: ${uploadError.message}`);
  }

  const publicURL = `https://dcxuxitorpfujfbtyhhn.supabase.co/storage/v1/object/public/media/${filePath}`;

  return {
    name: file.originalname,
    type: file.mimetype,
    size: file.size,
    url: publicURL,
    path: filePath,
    thumbnail: file.mimetype.startsWith('image/') ? publicURL : null
  };
}

// POST - Upload single file (NO DATABASE SAVE)
router.post('/upload', authenticateDM, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const userId = req.user.userId;

    // Upload to Supabase only - NO database save
    const uploaded = await uploadToSupabase(req.file, userId);

    // Return file info - frontend will include this when sending message
    res.json({
      success: true,
      file: {
        name: uploaded.name,
        type: uploaded.type,
        size: uploaded.size,
        sizeFormatted: formatFileSize(uploaded.size),
        url: uploaded.url,
        thumbnail: uploaded.thumbnail,
        icon: getFileTypeIcon(uploaded.type),
        tempId: Date.now().toString()
      }
    });

  } catch (err) {
    console.error("File upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Upload multiple files (NO DATABASE SAVE)
router.post('/upload/multiple', authenticateDM, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const userId = req.user.userId;
    const uploadedFiles = [];

    for (const file of req.files) {
      const uploaded = await uploadToSupabase(file, userId);
      
      uploadedFiles.push({
        name: uploaded.name,
        type: uploaded.type,
        size: uploaded.size,
        sizeFormatted: formatFileSize(uploaded.size),
        url: uploaded.url,
        thumbnail: uploaded.thumbnail,
        icon: getFileTypeIcon(uploaded.type),
        tempId: Date.now().toString() + Math.random().toString(36).substring(7)
      });
    }

    res.json({ success: true, files: uploadedFiles });

  } catch (err) {
    console.error("Multiple upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Download file (for files already saved with messages)
router.get('/:fileId', authenticateDM, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.userId;

    const file = await prisma.directMessageFile.findUnique({
      where: { id: fileId },
      include: { message: { include: { conversation: true } } }
    });

    if (!file) return res.status(404).json({ error: "File not found" });

    let hasAccess = false;
    if (file.message) {
      const conversation = file.message.conversation;
      hasAccess = conversation.participant1Id === userId || conversation.participant2Id === userId;
    } else {
      hasAccess = file.userId === userId;
    }

    if (!hasAccess) return res.status(403).json({ error: "Access denied" });

    res.redirect(file.data);

  } catch (err) {
    console.error("File download error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;