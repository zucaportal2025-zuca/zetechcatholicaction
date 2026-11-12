const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const cloudinary = require("cloudinary").v2;
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({ storage: multer.memoryStorage() });

// 1. GET: Fetch the collection of all saved covers
router.get("/", authenticate, async (req, res) => {
  try {
    const covers = await prisma.media.findMany({
      where: { category: "mass_cover" },
      orderBy: { createdAt: "desc" }
    });
    res.json({ success: true, covers });
  } catch (error) {
    console.error("Fetch covers error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2. POST: Upload a new cover and save to the collection
router.post("/upload", authenticate, upload.single("cover"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "zuca/mass_covers",
          public_id: `cover_${Date.now()}`,
          resource_type: "image"
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    // Save to the Media table so it stays in the collection
    const newCover = await prisma.media.create({
      data: {
        title: "Mass Program Cover",
        filename: result.public_id,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        sizeFormatted: `${(req.file.size / 1024).toFixed(2)} KB`,
        type: "image",
        url: result.secure_url,
        category: "mass_cover",
        uploadedById: req.user.userId,
      }
    });

    res.json({ success: true, cover: newCover });
  } catch (error) {
    console.error("Upload cover error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;