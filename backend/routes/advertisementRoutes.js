const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

const prisma = new PrismaClient();

// ============================================
// CLOUDINARY
// ============================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ============================================
// MULTER
// Memory storage - image goes directly to Cloudinary
// ============================================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// ============================================
// SIMPLE AUTH - Just verify token exists, NO ROLE CHECK
// ============================================
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - No token provided'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - Invalid token'
    });
  }
}

// ============================================
// CLOUDINARY UPLOAD HELPER
// ============================================
function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'zuca/advertisements',
        resource_type: 'image'
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    stream.end(buffer);
  });
}

// ============================================
// DELETE CLOUDINARY IMAGE
// ============================================
async function deleteCloudinaryImage(cloudinaryId) {
  if (!cloudinaryId) return;

  try {
    await cloudinary.uploader.destroy(cloudinaryId, {
      resource_type: 'image'
    });
  } catch (error) {
    console.error(
      `Failed to delete Cloudinary image ${cloudinaryId}:`,
      error.message
    );
  }
}

// ============================================
// CLEAN EXPIRED ADVERTISEMENTS
// ============================================
async function cleanupExpiredAdvertisements() {
  try {
    const now = new Date();

    const expired = await prisma.advertisement.findMany({
      where: {
        endDate: {
          lte: now
        }
      },
      select: {
        id: true,
        cloudinaryId: true
      }
    });

    if (expired.length === 0) {
      return;
    }

    for (const advert of expired) {
      await deleteCloudinaryImage(advert.cloudinaryId);

      await prisma.advertisement.delete({
        where: {
          id: advert.id
        }
      });
    }

    console.log(
      `Advertisement cleanup: removed ${expired.length} expired advert(s)`
    );
  } catch (error) {
    console.error(
      'Advertisement cleanup error:',
      error.message
    );
  }
}

// ============================================
// GET ACTIVE ADVERTISEMENTS
// PUBLIC - No auth required
// ============================================
router.get('/', async (req, res) => {
  try {
    await cleanupExpiredAdvertisements();

    const now = new Date();

    const advertisements = await prisma.advertisement.findMany({
      where: {
        active: true,
        startDate: {
          lte: now
        },
        endDate: {
          gt: now
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(advertisements);
  } catch (error) {
    console.error('Error fetching advertisements:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch advertisements'
    });
  }
});

// ============================================
// GET ALL ADVERTISEMENTS
// Authenticated users only - NO ROLE CHECK
// ============================================
router.get('/admin/all', authenticate, async (req, res) => {
  try {
    await cleanupExpiredAdvertisements();

    const advertisements = await prisma.advertisement.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      advertisements
    });
  } catch (error) {
    console.error('Error fetching admin advertisements:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch advertisements'
    });
  }
});

// ============================================
// CREATE ADVERTISEMENT
// Authenticated users only - NO ROLE CHECK
// ============================================
router.post(
  '/',
  authenticate,
  upload.single('image'),
  async (req, res) => {
    try {
      const {
        title,
        description,
        buttonText,
        link,
        startDate,
        endDate,
        active
      } = req.body;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'Start date and end date are required'
        });
      }

      const parsedStartDate = new Date(startDate);
      const parsedEndDate = new Date(endDate);

      if (
        Number.isNaN(parsedStartDate.getTime()) ||
        Number.isNaN(parsedEndDate.getTime())
      ) {
        return res.status(400).json({
          success: false,
          error: 'Invalid start or end date'
        });
      }

      if (parsedEndDate <= parsedStartDate) {
        return res.status(400).json({
          success: false,
          error: 'End date must be after start date'
        });
      }

      let image = null;
      let cloudinaryId = null;

      if (req.file) {
        const uploaded = await uploadToCloudinary(req.file.buffer);

        image = uploaded.secure_url;
        cloudinaryId = uploaded.public_id;
      }

      const advertisement =
        await prisma.advertisement.create({
          data: {
            title: title || null,
            description: description || null,
            image,
            cloudinaryId,
            buttonText: buttonText || null,
            link: link || null,
            active:
              active === undefined
                ? true
                : active === 'true' || active === true,
            startDate: parsedStartDate,
            endDate: parsedEndDate
          }
        });

      res.status(201).json({
        success: true,
        message: 'Advertisement created successfully',
        advertisement
      });
    } catch (error) {
      console.error('Error creating advertisement:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to create advertisement'
      });
    }
  }
);

// ============================================
// UPDATE ADVERTISEMENT
// Authenticated users only - NO ROLE CHECK
// ============================================
router.put(
  '/:id',
  authenticate,
  upload.single('image'),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid advertisement ID'
        });
      }

      const existing =
        await prisma.advertisement.findUnique({
          where: { id }
        });

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Advertisement not found'
        });
      }

      const {
        title,
        description,
        buttonText,
        link,
        startDate,
        endDate,
        active
      } = req.body;

      const data = {};

      if (title !== undefined) {
        data.title = title || null;
      }

      if (description !== undefined) {
        data.description = description || null;
      }

      if (buttonText !== undefined) {
        data.buttonText = buttonText || null;
      }

      if (link !== undefined) {
        data.link = link || null;
      }

      if (active !== undefined) {
        data.active =
          active === 'true' || active === true;
      }

      if (startDate !== undefined) {
        const parsed = new Date(startDate);

        if (Number.isNaN(parsed.getTime())) {
          return res.status(400).json({
            success: false,
            error: 'Invalid start date'
          });
        }

        data.startDate = parsed;
      }

      if (endDate !== undefined) {
        const parsed = new Date(endDate);

        if (Number.isNaN(parsed.getTime())) {
          return res.status(400).json({
            success: false,
            error: 'Invalid end date'
          });
        }

        data.endDate = parsed;
      }

      const finalStartDate =
        data.startDate || existing.startDate;

      const finalEndDate =
        data.endDate || existing.endDate;

      if (finalEndDate <= finalStartDate) {
        return res.status(400).json({
          success: false,
          error: 'End date must be after start date'
        });
      }

      if (req.file) {
        const uploaded = await uploadToCloudinary(
          req.file.buffer
        );

        data.image = uploaded.secure_url;
        data.cloudinaryId = uploaded.public_id;

        await deleteCloudinaryImage(
          existing.cloudinaryId
        );
      }

      const advertisement =
        await prisma.advertisement.update({
          where: { id },
          data
        });

      res.json({
        success: true,
        message: 'Advertisement updated successfully',
        advertisement
      });
    } catch (error) {
      console.error('Error updating advertisement:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to update advertisement'
      });
    }
  }
);

// ============================================
// TOGGLE ADVERTISEMENT
// Authenticated users only - NO ROLE CHECK
// ============================================
router.patch(
  '/:id/toggle',
  authenticate,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const existing =
        await prisma.advertisement.findUnique({
          where: { id }
        });

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Advertisement not found'
        });
      }

      const advertisement =
        await prisma.advertisement.update({
          where: { id },
          data: {
            active: !existing.active
          }
        });

      res.json({
        success: true,
        message: `Advertisement ${
          advertisement.active
            ? 'activated'
            : 'deactivated'
        }`,
        advertisement
      });
    } catch (error) {
      console.error(
        'Error toggling advertisement:',
        error
      );

      res.status(500).json({
        success: false,
        error: 'Failed to toggle advertisement'
      });
    }
  }
);

// ============================================
// DELETE ADVERTISEMENT
// Authenticated users only - NO ROLE CHECK
// ============================================
router.delete(
  '/:id',
  authenticate,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const existing =
        await prisma.advertisement.findUnique({
          where: { id }
        });

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Advertisement not found'
        });
      }

      await deleteCloudinaryImage(
        existing.cloudinaryId
      );

      await prisma.advertisement.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Advertisement deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting advertisement:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to delete advertisement'
      });
    }
  }
);

// ============================================
// MANUAL CLEANUP
// Authenticated users only - NO ROLE CHECK
// ============================================
router.delete(
  '/admin/cleanup-expired',
  authenticate,
  async (req, res) => {
    try {
      const before =
        await prisma.advertisement.count();

      await cleanupExpiredAdvertisements();

      const after =
        await prisma.advertisement.count();

      res.json({
        success: true,
        message: 'Expired advertisements cleaned up',
        deleted: before - after
      });
    } catch (error) {
      console.error(
        'Error cleaning advertisements:',
        error
      );

      res.status(500).json({
        success: false,
        error: 'Failed to clean expired advertisements'
      });
    }
  }
);

// ============================================
// MULTER / GENERAL ERROR HANDLER
// ============================================
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'Image is too large. Maximum size is 10MB.'
      });
    }

    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  if (error) {
    return res.status(400).json({
      success: false,
      error: error.message || 'Request failed'
    });
  }

  next();
});

module.exports = router;