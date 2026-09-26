// backend/routes/coverRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { authenticate } = require("../middleware/auth");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/* ---------- Cloudinary config ---------- */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* ---------- Multer: keep file in memory, stream to Cloudinary ---------- */
const upload = multer({ storage: multer.memoryStorage() });

/* =========================================================
   POST /api/users/:id/upload-cover
   Upload a new cover image
   ========================================================= */
router.post(
  "/users/:id/upload-cover",
  authenticate,
  upload.single("cover"),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Only the owner or an admin can upload
      if (req.user.userId !== id && req.user.role !== "admin") {
        return res.status(403).json({ error: "Not allowed" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const existingUser = await prisma.user.findUnique({ where: { id } });
      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Delete the old cover from Cloudinary if it exists
      if (existingUser.coverImage) {
        try {
          const parts = existingUser.coverImage.split("/");
          const fileWithExt = parts[parts.length - 1];
          const publicId = `zuca/covers/${fileWithExt.split(".")[0]}`;
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.warn("Could not delete old cover:", err.message);
        }
      }

      // Upload the new cover to Cloudinary
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "zuca/covers",
            public_id: `cover_${id}_${Date.now()}`,
            resource_type: "image",
            transformation: [
              { width: 1600, height: 500, crop: "limit" },
              { quality: "auto", fetch_format: "auto" },
            ],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

      const publicURL = result.secure_url;

      const updatedUser = await prisma.user.update({
        where: { id },
        data: { coverImage: publicURL },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          profileImage: true,
          coverImage: true,
        },
      });

      res.json({
        message: "Cover image uploaded successfully",
        user: updatedUser,
      });
    } catch (err) {
      console.error("Upload cover error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

/* =========================================================
   DELETE /api/users/:id/delete-cover
   Remove the cover image
   ========================================================= */
router.delete(
  "/users/:id/delete-cover",
  authenticate,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (req.user.userId !== id && req.user.role !== "admin") {
        return res.status(403).json({ error: "Not allowed" });
      }

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return res.status(404).json({ error: "User not found" });

      if (!user.coverImage) {
        return res.status(400).json({ error: "No cover image to delete" });
      }

      // Delete from Cloudinary
      try {
        const parts = user.coverImage.split("/");
        const fileWithExt = parts[parts.length - 1];
        const publicId = `zuca/covers/${fileWithExt.split(".")[0]}`;
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.warn("Could not delete from Cloudinary:", err.message);
      }

      await prisma.user.update({
        where: { id },
        data: { coverImage: null },
      });

      res.json({ message: "Cover image deleted successfully" });
    } catch (err) {
      console.error("Delete cover error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;