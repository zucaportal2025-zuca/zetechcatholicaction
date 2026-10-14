const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

// Middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "No token" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "zuca_super_secret_key");
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

// Updated: Allow both Admin AND Secretary
const requireAdminOrSecretary = (req, res, next) => {
  const isAdmin = req.user.role === "admin" || req.user.specialRole === "admin";
  const isSecretary = req.user.role === "secretary";
  
  if (isAdmin || isSecretary) {
    next();
  } else {
    res.status(403).json({ message: "Admin or Secretary only" });
  }
};

// Keep this for routes that need strict admin only (if any)
const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Admin only" });
  next();
};

// ================== PUBLIC ROUTES ==================
// Get active history for landing page (no auth needed)
router.get("/public", async (req, res) => {
  try {
    const history = await prisma.history.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        title: true,
        content: true,
        order: true,
        createdAt: true
      }
    });
    
    res.json({
      success: true,
      history: history,
      count: history.length
    });
  } catch (err) {
    console.error("Error fetching history:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// ================== ADMIN & SECRETARY ROUTES ==================
// Get all history (admin or secretary)
router.get("/admin", authenticate, requireAdminOrSecretary, async (req, res) => {
  try {
    const history = await prisma.history.findMany({
      orderBy: { order: 'asc' }
    });
    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new history entry (admin or secretary)
router.post("/admin", authenticate, requireAdminOrSecretary, async (req, res) => {
  try {
    const { title, content, order } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }
    
    const history = await prisma.history.create({
      data: {
        title: title,
        content: content,
        order: order || 0
      }
    });
    
    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update history entry (admin or secretary)
router.put("/admin/:id", authenticate, requireAdminOrSecretary, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, order, isActive } = req.body;
    
    const history = await prisma.history.update({
      where: { id },
      data: {
        title: title,
        content: content,
        order: order,
        isActive: isActive
      }
    });
    
    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete history entry (admin or secretary)
router.delete("/admin/:id", authenticate, requireAdminOrSecretary, async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.history.delete({
      where: { id }
    });
    
    res.json({ success: true, message: "History entry deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Debug endpoint - check what's in the token
router.get("/debug/token", authenticate, async (req, res) => {
  res.json({
    userId: req.user.userId,
    role: req.user.role,
    specialRole: req.user.specialRole,
    allTokenData: req.user
  });
});

module.exports = router;