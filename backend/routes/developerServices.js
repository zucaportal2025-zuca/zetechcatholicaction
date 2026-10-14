// routes/developerServices.js
const express = require("express");
const router = express.Router();
const { authenticate, requireAdmin } = require("../middleware/auth");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/* ============================================================
   Helpers
   ============================================================ */

const normaliseSlug = (raw) =>
  String(raw || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

const ALLOWED_ICONS = [
  "terminal",
  "mail",
  "globe",
  "clock",
  "database",
  "cloud",
  "shield",
  "server",
  "link",
];

const toDateOrNull = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const trimOrNull = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};

/* ============================================================
   GET /api/admin/developer-services
   List all services — any authenticated user
   ============================================================ */
router.get("/", authenticate, async (req, res) => {
  try {
    const services = await prisma.developerService.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    res.json({ services });
  } catch (err) {
    console.error("GET developer-services error:", err);
    res.status(500).json({ error: "Failed to load services" });
  }
});

/* ============================================================
   GET /api/admin/developer-services/:slug
   Fetch a single service by slug
   ============================================================ */
router.get("/:slug", authenticate, async (req, res) => {
  try {
    const service = await prisma.developerService.findUnique({
      where: { slug: req.params.slug },
    });

    if (!service) return res.status(404).json({ error: "Service not found" });
    res.json({ service });
  } catch (err) {
    console.error("GET developer-service error:", err);
    res.status(500).json({ error: "Failed to load service" });
  }
});

/* ============================================================
   POST /api/admin/developer-services
   Create a new service (admin only)
   ============================================================ */
router.post("/", authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      slug,
      name,
      description,
      url,
      docsUrl,
      icon,
      category,
      isPrimary,
      sortOrder,
      loginEmail,
      vaultUrl,
      lastRotated,
      notes,
    } = req.body;

    if (!slug || !name || !url) {
      return res.status(400).json({
        error: "slug, name, and url are required",
      });
    }

    const cleanSlug = normaliseSlug(slug);
    if (!cleanSlug) {
      return res.status(400).json({
        error: "Invalid slug — must contain letters or numbers",
      });
    }

    const cleanIcon = ALLOWED_ICONS.includes(icon) ? icon : "terminal";

    const existing = await prisma.developerService.findUnique({
      where: { slug: cleanSlug },
    });
    if (existing) {
      return res.status(409).json({
        error: `A service with the ID "${cleanSlug}" already exists`,
      });
    }

    let finalSortOrder = Number.isFinite(Number(sortOrder))
      ? Number(sortOrder)
      : null;

    if (finalSortOrder === null) {
      const max = await prisma.developerService.aggregate({
        _max: { sortOrder: true },
      });
      finalSortOrder = (max._max.sortOrder || 0) + 1;
    }

    const service = await prisma.developerService.create({
      data: {
        slug: cleanSlug,
        name: String(name).trim().slice(0, 120),
        description: trimOrNull(description),
        url: String(url).trim(),
        docsUrl: trimOrNull(docsUrl),
        icon: cleanIcon,
        category: trimOrNull(category),
        isPrimary: Boolean(isPrimary),
        sortOrder: finalSortOrder,
        loginEmail: trimOrNull(loginEmail),
        vaultUrl: trimOrNull(vaultUrl),
        lastRotated: toDateOrNull(lastRotated),
        notes: trimOrNull(notes),
        createdBy: req.user?.userId || null,
        updatedBy: req.user?.userId || null,
      },
    });

    res.status(201).json({ service });
  } catch (err) {
    console.error("POST developer-services error:", err);
    res.status(500).json({ error: "Failed to create service" });
  }
});

/* ============================================================
   PUT /api/admin/developer-services/:slug
   Update a service (admin only). Slug is immutable.
   ============================================================ */
router.put("/:slug", authenticate, requireAdmin, async (req, res) => {
  try {
    const { slug } = req.params;

    const existing = await prisma.developerService.findUnique({
      where: { slug },
    });
    if (!existing) return res.status(404).json({ error: "Service not found" });

    const {
      name,
      description,
      url,
      docsUrl,
      icon,
      category,
      isPrimary,
      sortOrder,
      loginEmail,
      vaultUrl,
      lastRotated,
      notes,
    } = req.body;

    const data = { updatedBy: req.user?.userId || null };

    if (name !== undefined) data.name = String(name).trim().slice(0, 120);
    if (description !== undefined) data.description = trimOrNull(description);
    if (url !== undefined) data.url = String(url).trim();
    if (docsUrl !== undefined) data.docsUrl = trimOrNull(docsUrl);
    if (icon !== undefined)
      data.icon = ALLOWED_ICONS.includes(icon) ? icon : "terminal";
    if (category !== undefined) data.category = trimOrNull(category);
    if (isPrimary !== undefined) data.isPrimary = Boolean(isPrimary);
    if (sortOrder !== undefined && Number.isFinite(Number(sortOrder)))
      data.sortOrder = Number(sortOrder);
    if (loginEmail !== undefined) data.loginEmail = trimOrNull(loginEmail);
    if (vaultUrl !== undefined) data.vaultUrl = trimOrNull(vaultUrl);
    if (lastRotated !== undefined)
      data.lastRotated = toDateOrNull(lastRotated);
    if (notes !== undefined) data.notes = trimOrNull(notes);

    if (data.url === "") {
      return res.status(400).json({ error: "URL cannot be empty" });
    }

    const service = await prisma.developerService.update({
      where: { slug },
      data,
    });

    res.json({ service });
  } catch (err) {
    console.error("PUT developer-services error:", err);
    res.status(500).json({ error: "Failed to update service" });
  }
});

/* ============================================================
   PATCH /api/admin/developer-services/:slug/notes
   Quick-save just the notes field
   ============================================================ */
router.patch("/:slug/notes", authenticate, requireAdmin, async (req, res) => {
  try {
    const { slug } = req.params;
    const { notes } = req.body;

    const existing = await prisma.developerService.findUnique({
      where: { slug },
    });
    if (!existing) return res.status(404).json({ error: "Service not found" });

    const service = await prisma.developerService.update({
      where: { slug },
      data: {
        notes: trimOrNull(notes),
        updatedBy: req.user?.userId || null,
      },
    });

    res.json({ service });
  } catch (err) {
    console.error("PATCH developer-services notes error:", err);
    res.status(500).json({ error: "Failed to save notes" });
  }
});

/* ============================================================
   DELETE /api/admin/developer-services/:slug
   Remove a service (admin only)
   ============================================================ */
router.delete("/:slug", authenticate, requireAdmin, async (req, res) => {
  try {
    const { slug } = req.params;

    const existing = await prisma.developerService.findUnique({
      where: { slug },
    });
    if (!existing) return res.status(404).json({ error: "Service not found" });

    await prisma.developerService.delete({ where: { slug } });

    res.json({ deleted: slug });
  } catch (err) {
    console.error("DELETE developer-services error:", err);
    res.status(500).json({ error: "Failed to delete service" });
  }
});

module.exports = router;