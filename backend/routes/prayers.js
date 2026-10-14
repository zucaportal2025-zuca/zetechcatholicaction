const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken'); 


// ==================== ALL ROUTES PUBLIC - NO AUTH NEEDED ====================

// GET all prayers (with filters)
router.get("/", async (req, res) => {
  try {
    const { category, language, search, limit = 100, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = { isActive: true };
    if (category && category !== 'all') where.category = category;
    if (language) where.language = language;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { prayer: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    const [prayers, total] = await Promise.all([
      prisma.prayer.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          category: true,
          language: true,
          version: true,
          prayer: true,
          order: true
        }
      }),
      prisma.prayer.count({ where })
    ]);
    
    res.json({
      success: true,
      prayers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error("Error fetching prayers:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET single prayer by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const prayer = await prisma.prayer.findUnique({
      where: { id, isActive: true },
      select: {
        id: true,
        title: true,
        category: true,
        language: true,
        version: true,
        prayer: true,
        order: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!prayer) {
      return res.status(404).json({ error: "Prayer not found" });
    }
    
    res.json({ success: true, prayer });
  } catch (err) {
    console.error("Error fetching prayer:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET prayers by category
router.get("/category/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const { language = 'en', limit = 50 } = req.query;
    
    const prayers = await prisma.prayer.findMany({
      where: {
        category: category,
        language: language,
        isActive: true
      },
      orderBy: { order: 'asc' },
      take: parseInt(limit),
      select: {
        id: true,
        title: true,
        language: true,
        version: true,
        prayer: true
      }
    });
    
    res.json({ success: true, prayers, count: prayers.length });
  } catch (err) {
    console.error("Error fetching prayers by category:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET available categories
router.get("/info/categories", async (req, res) => {
  try {
    const categories = await prisma.prayer.groupBy({
      by: ['category'],
      where: { isActive: true },
      _count: true
    });
    
    res.json({ success: true, categories });
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET user's favorite prayers (public - uses localStorage in frontend)
router.get("/my/favorites", async (req, res) => {
  try {
    // Get favorites from query param instead of auth
    const { userId } = req.query;
    
    if (!userId) {
      return res.json({ success: true, favorites: [] });
    }
    
    const favorites = await prisma.userFavorite.findMany({
      where: { userId },
      include: {
        prayer: {
          select: {
            id: true,
            title: true,
            category: true,
            language: true,
            prayer: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      success: true,
      favorites: favorites.map(f => ({
        id: f.id,
        prayerId: f.prayerId,
        createdAt: f.createdAt,
        prayer: f.prayer
      }))
    });
  } catch (err) {
    console.error("Error fetching favorites:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST add prayer to favorites (public)
router.post("/:id/favorite", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: "UserId required" });
    }
    
    const prayer = await prisma.prayer.findUnique({
      where: { id, isActive: true }
    });
    
    if (!prayer) {
      return res.status(404).json({ error: "Prayer not found" });
    }
    
    const existing = await prisma.userFavorite.findUnique({
      where: {
        userId_prayerId: {
          userId,
          prayerId: id
        }
      }
    });
    
    if (existing) {
      await prisma.userFavorite.delete({
        where: { id: existing.id }
      });
      
      await prisma.prayer.update({
        where: { id },
        data: { favoriteCount: { decrement: 1 } }
      });
      
      return res.json({ success: true, favorited: false, message: "Removed from favorites" });
    }
    
    await prisma.userFavorite.create({
      data: {
        userId,
        prayerId: id
      }
    });
    
    await prisma.prayer.update({
      where: { id },
      data: { favoriteCount: { increment: 1 } }
    });
    
    res.json({ success: true, favorited: true, message: "Added to favorites" });
  } catch (err) {
    console.error("Error toggling favorite:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE remove from favorites
router.delete("/:id/favorite", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: "UserId required" });
    }
    
    const favorite = await prisma.userFavorite.findUnique({
      where: {
        userId_prayerId: {
          userId,
          prayerId: id
        }
      }
    });
    
    if (!favorite) {
      return res.status(404).json({ error: "Favorite not found" });
    }
    
    await prisma.userFavorite.delete({
      where: { id: favorite.id }
    });
    
    await prisma.prayer.update({
      where: { id },
      data: { favoriteCount: { decrement: 1 } }
    });
    
    res.json({ success: true, message: "Removed from favorites" });
  } catch (err) {
    console.error("Error removing favorite:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET user's prayer notes
router.get("/my/notes", async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.json({ success: true, notes: [] });
    }
    
    const notes = await prisma.userPrayerNote.findMany({
      where: { userId },
      include: {
        prayer: {
          select: {
            id: true,
            title: true,
            category: true,
            language: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    res.json({ success: true, notes });
  } catch (err) {
    console.error("Error fetching notes:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST add/update note for a prayer
router.post("/:id/note", async (req, res) => {
  try {
    const { id } = req.params;
    const { note, userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: "UserId required" });
    }
    
    if (!note || note.trim() === "") {
      return res.status(400).json({ error: "Note cannot be empty" });
    }
    
    const prayer = await prisma.prayer.findUnique({
      where: { id, isActive: true }
    });
    
    if (!prayer) {
      return res.status(404).json({ error: "Prayer not found" });
    }
    
    const userNote = await prisma.userPrayerNote.upsert({
      where: {
        userId_prayerId: {
          userId,
          prayerId: id
        }
      },
      update: {
        note: note.trim(),
        updatedAt: new Date()
      },
      create: {
        userId,
        prayerId: id,
        note: note.trim()
      }
    });
    
    res.json({ success: true, note: userNote });
  } catch (err) {
    console.error("Error saving note:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE note for a prayer
router.delete("/:id/note", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: "UserId required" });
    }
    
    await prisma.userPrayerNote.delete({
      where: {
        userId_prayerId: {
          userId,
          prayerId: id
        }
      }
    });
    
    res.json({ success: true, message: "Note deleted" });
  } catch (err) {
    console.error("Error deleting note:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET check if prayer is favorited by user
router.get("/:id/is-favorited", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;
    
    if (!userId) {
      return res.json({ success: true, isFavorited: false });
    }
    
    const favorite = await prisma.userFavorite.findUnique({
      where: {
        userId_prayerId: {
          userId,
          prayerId: id
        }
      }
    });
    
    res.json({ success: true, isFavorited: !!favorite });
  } catch (err) {
    console.error("Error checking favorite:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET user's note for a specific prayer
router.get("/:id/my-note", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;
    
    if (!userId) {
      return res.json({ success: true, note: null });
    }
    
    const note = await prisma.userPrayerNote.findUnique({
      where: {
        userId_prayerId: {
          userId,
          prayerId: id
        }
      }
    });
    
    res.json({ success: true, note: note || null });
  } catch (err) {
    console.error("Error fetching note:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== ADMIN ROUTES (still require admin) ====================

// Middleware for admin - only this needs auth
const requireAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Admin token required" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "zuca_super_secret_key");
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    
    if (user.role !== 'admin' && user.specialRole !== 'secretary') {
      return res.status(403).json({ error: "Admin access required" });
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// POST create new prayer (admin only)
router.post("/admin", requireAdmin, async (req, res) => {
  try {
    const { title, category, prayer, language, version, order } = req.body;
    
    if (!title || !category || !prayer) {
      return res.status(400).json({ error: "Title, category, and prayer content are required" });
    }
    
    const newPrayer = await prisma.prayer.create({
      data: {
        title,
        category,
        prayer,
        language: language || 'en',
        version: version || 'traditional',
        order: order || 0,
        isActive: true,
        source: 'manual'
      }
    });
    
    res.status(201).json({ success: true, prayer: newPrayer });
  } catch (err) {
    console.error("Error creating prayer:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT update prayer (admin only)
router.put("/admin/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, prayer, language, version, order, isActive } = req.body;
    
    const existing = await prisma.prayer.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Prayer not found" });
    }
    
    const updated = await prisma.prayer.update({
      where: { id },
      data: {
        title: title || existing.title,
        category: category || existing.category,
        prayer: prayer || existing.prayer,
        language: language || existing.language,
        version: version || existing.version,
        order: order !== undefined ? order : existing.order,
        isActive: isActive !== undefined ? isActive : existing.isActive
      }
    });
    
    res.json({ success: true, prayer: updated });
  } catch (err) {
    console.error("Error updating prayer:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE prayer (admin only)
router.delete("/admin/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.userFavorite.deleteMany({ where: { prayerId: id } });
    await prisma.userPrayerNote.deleteMany({ where: { prayerId: id } });
    await prisma.prayer.delete({ where: { id } });
    
    res.json({ success: true, message: "Prayer deleted successfully" });
  } catch (err) {
    console.error("Error deleting prayer:", err);
    res.status(500).json({ error: err.message });
  }
});

// Add these to your prayers.js route file

// ==================== ROSARY SPECIFIC ROUTES ====================

// GET Rosary mysteries based on day of week
router.get("/rosary/mysteries", async (req, res) => {
  try {
    const { day } = req.query;
    let dayOfWeek;
    
    if (day !== undefined) {
      dayOfWeek = parseInt(day);
    } else {
      dayOfWeek = new Date().getDay();
    }
    
    const mysteriesMap = {
      0: {
        name: "Glorious Mysteries",
        mysteries: [
          { name: "The Resurrection", description: "Jesus rises from the dead", fruit: "Faith" },
          { name: "The Ascension", description: "Jesus ascends into Heaven", fruit: "Hope" },
          { name: "The Descent of the Holy Spirit", description: "The Holy Spirit descends", fruit: "Love of God" },
          { name: "The Assumption of Mary", description: "Mary is taken into Heaven", fruit: "Grace of a Happy Death" },
          { name: "The Coronation of Mary", description: "Mary is crowned Queen", fruit: "Trust in Mary" }
        ]
      },
      1: {
        name: "Joyful Mysteries",
        mysteries: [
          { name: "The Annunciation", description: "Angel Gabriel announces to Mary", fruit: "Humility" },
          { name: "The Visitation", description: "Mary visits Elizabeth", fruit: "Love of Neighbor" },
          { name: "The Nativity", description: "Jesus is born", fruit: "Poverty of Spirit" },
          { name: "The Presentation", description: "Jesus is presented in the Temple", fruit: "Obedience" },
          { name: "The Finding in the Temple", description: "Jesus is found teaching", fruit: "Joy in Finding Jesus" }
        ]
      },
      2: {
        name: "Sorrowful Mysteries",
        mysteries: [
          { name: "The Agony in the Garden", description: "Jesus prays in Gethsemane", fruit: "Sorrow for Sin" },
          { name: "The Scourging at the Pillar", description: "Jesus is whipped", fruit: "Purity" },
          { name: "The Crowning with Thorns", description: "Jesus is crowned with thorns", fruit: "Courage" },
          { name: "The Carrying of the Cross", description: "Jesus carries His cross", fruit: "Patience" },
          { name: "The Crucifixion", description: "Jesus dies on the cross", fruit: "Perseverance" }
        ]
      },
      3: {
        name: "Glorious Mysteries",
        mysteries: [
          { name: "The Resurrection", description: "Jesus rises from the dead", fruit: "Faith" },
          { name: "The Ascension", description: "Jesus ascends into Heaven", fruit: "Hope" },
          { name: "The Descent of the Holy Spirit", description: "The Holy Spirit descends", fruit: "Love of God" },
          { name: "The Assumption of Mary", description: "Mary is taken into Heaven", fruit: "Grace of a Happy Death" },
          { name: "The Coronation of Mary", description: "Mary is crowned Queen", fruit: "Trust in Mary" }
        ]
      },
      4: {
        name: "Luminous Mysteries",
        mysteries: [
          { name: "The Baptism of Jesus", description: "Jesus is baptized", fruit: "Openness to the Holy Spirit" },
          { name: "The Wedding at Cana", description: "Jesus turns water into wine", fruit: "Trust in Mary" },
          { name: "The Proclamation of the Kingdom", description: "Jesus calls for conversion", fruit: "Repentance" },
          { name: "The Transfiguration", description: "Jesus is transfigured", fruit: "Desire for Holiness" },
          { name: "The Institution of the Eucharist", description: "Jesus gives us the Eucharist", fruit: "Love of the Eucharist" }
        ]
      },
      5: {
        name: "Sorrowful Mysteries",
        mysteries: [
          { name: "The Agony in the Garden", description: "Jesus prays in Gethsemane", fruit: "Sorrow for Sin" },
          { name: "The Scourging at the Pillar", description: "Jesus is whipped", fruit: "Purity" },
          { name: "The Crowning with Thorns", description: "Jesus is crowned with thorns", fruit: "Courage" },
          { name: "The Carrying of the Cross", description: "Jesus carries His cross", fruit: "Patience" },
          { name: "The Crucifixion", description: "Jesus dies on the cross", fruit: "Perseverance" }
        ]
      },
      6: {
        name: "Joyful Mysteries",
        mysteries: [
          { name: "The Annunciation", description: "Angel Gabriel announces to Mary", fruit: "Humility" },
          { name: "The Visitation", description: "Mary visits Elizabeth", fruit: "Love of Neighbor" },
          { name: "The Nativity", description: "Jesus is born", fruit: "Poverty of Spirit" },
          { name: "The Presentation", description: "Jesus is presented in the Temple", fruit: "Obedience" },
          { name: "The Finding in the Temple", description: "Jesus is found teaching", fruit: "Joy in Finding Jesus" }
        ]
      }
    };
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const mysteries = mysteriesMap[dayOfWeek];
    
    if (!mysteries) {
      return res.status(400).json({ error: "Invalid day" });
    }
    
    res.json({
      success: true,
      day: dayNames[dayOfWeek],
      dayNumber: dayOfWeek,
      mysteries: mysteries
    });
    
  } catch (err) {
    console.error("Error fetching Rosary mysteries:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET Rosary guide with all prayers
router.get("/rosary/guide", async (req, res) => {
  try {
    const dayOfWeek = new Date().getDay();
    const mysteriesMap = {
      0: "Glorious Mysteries",
      1: "Joyful Mysteries",
      2: "Sorrowful Mysteries",
      3: "Glorious Mysteries",
      4: "Luminous Mysteries",
      5: "Sorrowful Mysteries",
      6: "Joyful Mysteries"
    };
    
    // Fetch prayers from database
    const ourFather = await prisma.prayer.findFirst({
      where: { title: { contains: 'Our Father', mode: 'insensitive' } }
    });
    
    const hailMary = await prisma.prayer.findFirst({
      where: { title: { contains: 'Hail Mary', mode: 'insensitive' } }
    });
    
    const gloryBe = await prisma.prayer.findFirst({
      where: { title: { contains: 'Glory Be', mode: 'insensitive' } }
    });
    
    const apostlesCreed = await prisma.prayer.findFirst({
      where: { title: { contains: 'Apostles Creed', mode: 'insensitive' } }
    });
    
    const fatimaPrayer = await prisma.prayer.findFirst({
      where: { title: { contains: 'Fatima', mode: 'insensitive' } }
    });
    
    const hailHolyQueen = await prisma.prayer.findFirst({
      where: { title: { contains: 'Hail Holy Queen', mode: 'insensitive' } }
    });
    
    res.json({
      success: true,
      dayMystery: mysteriesMap[dayOfWeek],
      prayers: {
        ourFather: ourFather?.prayer || "Our Father...",
        hailMary: hailMary?.prayer || "Hail Mary...",
        gloryBe: gloryBe?.prayer || "Glory be...",
        apostlesCreed: apostlesCreed?.prayer || "I believe...",
        fatimaPrayer: fatimaPrayer?.prayer || "O my Jesus...",
        hailHolyQueen: hailHolyQueen?.prayer || "Hail Holy Queen..."
      }
    });
    
  } catch (err) {
    console.error("Error fetching Rosary guide:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET specific mystery details
router.get("/rosary/mystery/:mysteryName", async (req, res) => {
  try {
    const { mysteryName } = req.params;
    
    const allMysteries = {
      "annunciation": { name: "The Annunciation", description: "Angel Gabriel announces to Mary that she will conceive Jesus", fruit: "Humility" },
      "visitation": { name: "The Visitation", description: "Mary visits her cousin Elizabeth", fruit: "Love of Neighbor" },
      "nativity": { name: "The Nativity", description: "Jesus is born in Bethlehem", fruit: "Poverty of Spirit" },
      "presentation": { name: "The Presentation", description: "Jesus is presented in the Temple", fruit: "Obedience" },
      "finding": { name: "The Finding in the Temple", description: "Mary and Joseph find Jesus teaching", fruit: "Joy in Finding Jesus" },
      "baptism": { name: "The Baptism of Jesus", description: "Jesus is baptized by John in the Jordan", fruit: "Openness to the Holy Spirit" },
      "cana": { name: "The Wedding at Cana", description: "Jesus turns water into wine", fruit: "Trust in Mary" },
      "kingdom": { name: "The Proclamation of the Kingdom", description: "Jesus calls for conversion", fruit: "Repentance" },
      "transfiguration": { name: "The Transfiguration", description: "Jesus is transfigured before Peter, James, and John", fruit: "Desire for Holiness" },
      "eucharist": { name: "The Institution of the Eucharist", description: "Jesus gives us the Eucharist at the Last Supper", fruit: "Love of the Eucharist" },
      "agony": { name: "The Agony in the Garden", description: "Jesus prays in Gethsemane", fruit: "Sorrow for Sin" },
      "scourging": { name: "The Scourging at the Pillar", description: "Jesus is whipped", fruit: "Purity" },
      "crowning": { name: "The Crowning with Thorns", description: "Jesus is crowned with thorns", fruit: "Courage" },
      "carrying": { name: "The Carrying of the Cross", description: "Jesus carries His cross", fruit: "Patience" },
      "crucifixion": { name: "The Crucifixion", description: "Jesus dies on the cross", fruit: "Perseverance" },
      "resurrection": { name: "The Resurrection", description: "Jesus rises from the dead", fruit: "Faith" },
      "ascension": { name: "The Ascension", description: "Jesus ascends into Heaven", fruit: "Hope" },
      "descent": { name: "The Descent of the Holy Spirit", description: "The Holy Spirit descends on Mary and the apostles", fruit: "Love of God" },
      "assumption": { name: "The Assumption of Mary", description: "Mary is taken body and soul into Heaven", fruit: "Grace of a Happy Death" },
      "coronation": { name: "The Coronation of Mary", description: "Mary is crowned Queen of Heaven and Earth", fruit: "Trust in Mary's Intercession" }
    };
    
    const key = mysteryName.toLowerCase().replace(/^the\s+/, '');
    const mystery = allMysteries[key];
    
    if (!mystery) {
      return res.status(404).json({ error: "Mystery not found" });
    }
    
    res.json({
      success: true,
      mystery: mystery
    });
    
  } catch (err) {
    console.error("Error fetching mystery:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET all prayers - ADMIN ONLY
router.get("/admin/all", requireAdmin, async (req, res) => {
  try {
    const prayers = await prisma.prayer.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ success: true, prayers, count: prayers.length });
  } catch (err) {
    console.error("Error fetching all prayers:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;