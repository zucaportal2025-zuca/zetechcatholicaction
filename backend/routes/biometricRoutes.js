const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "zuca_super_secret_key";

// ============================================
// HELPER: Get RP ID - HARDCODE YOUR FRONTEND DOMAIN
// ============================================
function getRpId(req) {
  // ✅ YOUR FRONTEND DOMAIN - THIS IS WHAT MATTERS
  const FRONTEND_DOMAIN = 'zetechcatholicaction.com';
  
  // Check if request is from localhost (development)
  const origin = req.get('origin') || '';
  const host = req.get('host') || '';
  
  console.log(`🔍 Origin: ${origin}, Host: ${host}`);
  
  // For localhost development
  if (origin.includes('localhost') || host.includes('localhost')) {
    return 'localhost';
  }
  
  // ✅ ALWAYS return your frontend domain for production
  return FRONTEND_DOMAIN;
}

// Helper: Get device name from user agent
function getDeviceName(userAgent) {
  if (/Android/i.test(userAgent)) return '📱 Android Phone';
  if (/iPhone|iPad|iPod/i.test(userAgent)) return '📱 iOS Device';
  if (/Windows/i.test(userAgent)) return '💻 Windows Computer';
  if (/Macintosh/i.test(userAgent)) return '💻 Mac Computer';
  if (/Linux/i.test(userAgent)) return '💻 Linux Computer';
  return '🖥️ Unknown Device';
}

// Auth middleware
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

// ============================================
// 1. CHECK BIOMETRIC STATUS (UPDATED)
// ============================================
router.get("/status", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { 
        biometricRegistered: true,
        biometricCredentialId: true,
        biometricCredentials: true
      }
    });
    
    let credentials = [];
    try {
      if (user?.biometricCredentials) {
        credentials = JSON.parse(user.biometricCredentials);
      }
    } catch (e) {
      credentials = [];
    }
    
    // If user has old single credential but no credentials array, add it
    if (user?.biometricRegistered && user?.biometricCredentialId && credentials.length === 0) {
      credentials = [{
        credentialId: user.biometricCredentialId,
        deviceName: 'Unknown Device',
        registeredAt: new Date().toISOString(),
        lastUsed: null
      }];
    }
    
    res.json({ 
      success: true,
      registered: user?.biometricRegistered || false,
      hasCredential: !!user?.biometricCredentialId,
      credentials: credentials // ✅ Send all credentials to frontend
    });
  } catch (err) {
    console.error("Biometric status error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// 2. GET REGISTRATION CHALLENGE (UNCHANGED)
// ============================================
router.post("/register-challenge", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const challenge = crypto.randomBytes(32).toString('base64url');
    const rpId = getRpId(req);
    
    console.log(`📝 Registration challenge - RP ID: ${rpId}`);
    
    await prisma.biometricChallenge.create({
      data: {
        userId,
        challenge,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      }
    });
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, email: true }
    });
    
    res.json({
      success: true,
      challenge,
      rpId: rpId,
      rpName: "ZUCA Portal",
      userId: userId.toString(),
      userName: user?.email || user?.fullName || "Zuca User",
      userDisplayName: user?.fullName || "ZUCA Member"
    });
  } catch (err) {
    console.error("Registration challenge error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// 3. COMPLETE BIOMETRIC REGISTRATION (UPDATED)
// ============================================
router.post("/register", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { credentialId, publicKey, transports } = req.body;
    
    if (!credentialId) {
      return res.status(400).json({ error: "Credential ID required" });
    }
    
    console.log(`📝 Registration for user ${userId}, credential: ${credentialId.substring(0, 30)}...`);
    
    // Verify challenge was valid
    const challengeRecord = await prisma.biometricChallenge.findFirst({
      where: {
        userId,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!challengeRecord) {
      return res.status(400).json({ error: "Challenge expired. Please try again." });
    }
    
    // Check if credential already exists for ANY user
    const existingUser = await prisma.user.findFirst({
      where: { biometricCredentialId: credentialId }
    });
    
    if (existingUser && existingUser.id !== userId) {
      return res.status(400).json({ error: "This fingerprint is already registered to another user" });
    }
    
    // ✅ NEW: Get existing credentials or create new array
    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: { biometricCredentials: true }
    });
    
    let credentials = [];
    try {
      if (userRecord?.biometricCredentials) {
        credentials = JSON.parse(userRecord.biometricCredentials);
      }
    } catch (e) {
      credentials = [];
    }
    
    // Get device name
    const userAgent = req.get('user-agent') || '';
    const deviceName = getDeviceName(userAgent);
    
    // Check if credential already exists for this user
    const existingCredential = credentials.find(c => c.credentialId === credentialId);
    if (existingCredential) {
      // Update existing credential
      existingCredential.lastUsed = new Date().toISOString();
      existingCredential.deviceName = deviceName;
    } else {
      // Add new credential
      credentials.push({
        credentialId: credentialId,
        deviceName: deviceName,
        registeredAt: new Date().toISOString(),
        lastUsed: null,
        transports: transports || JSON.stringify(['internal', 'hybrid'])
      });
    }
    
    // ✅ Store all credentials as JSON
    await prisma.user.update({
      where: { id: userId },
      data: {
        biometricRegistered: true,
        biometricCredentialId: credentialId, // Keep primary credential
        biometricPublicKey: publicKey || null,
        biometricTransports: transports || JSON.stringify(['internal', 'hybrid']),
        biometricCredentials: JSON.stringify(credentials) // Store all credentials
      }
    });
    
    // Clean up used challenges
    await prisma.biometricChallenge.deleteMany({
      where: { userId }
    });
    
    console.log(`✅ Biometric registered for user ${userId} on device: ${deviceName}`);
    console.log(`📊 Total credentials: ${credentials.length}`);
    
    res.json({ 
      success: true, 
      message: `Fingerprint registered successfully on ${deviceName}!`,
      credentials: credentials,
      deviceName: deviceName
    });
  } catch (err) {
    console.error("Biometric registration error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// 4. GET LOGIN CHALLENGE (UPDATED - check all credentials)
// ============================================
router.post("/login-challenge", async (req, res) => {
  try {
    const { email } = req.body;
    const rpId = getRpId(req);
    
    console.log(`🔐 Login challenge - RP ID: ${rpId}`);
    
    if (email) {
      const user = await prisma.user.findFirst({
        where: { 
          email: email.toLowerCase(),
          biometricRegistered: true
        }
      });
      
      if (user) {
        const challenge = crypto.randomBytes(32).toString('base64url');
        
        await prisma.biometricChallenge.create({
          data: {
            userId: user.id,
            challenge,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            type: 'login'
          }
        });
        
        // ✅ Get all credentials for this user
        let allCredentials = [];
        try {
          if (user.biometricCredentials) {
            allCredentials = JSON.parse(user.biometricCredentials);
          }
        } catch (e) {
          allCredentials = [];
        }
        
        // If no credentials in array, use the primary one
        if (allCredentials.length === 0 && user.biometricCredentialId) {
          allCredentials = [{
            credentialId: user.biometricCredentialId,
            deviceName: 'Unknown Device'
          }];
        }
        
        // Build allowCredentials from all credentials
        const allowCredentials = allCredentials.map(cred => ({
          id: cred.credentialId,
          type: 'public-key',
          transports: ['internal', 'hybrid']
        }));
        
        return res.json({
          success: true,
          challenge,
          rpId: rpId,
          allowCredentials: allowCredentials, // ✅ Send all credentials
          userVerification: 'required'
        });
      }
    }
    
    // No biometric user found
    const challenge = crypto.randomBytes(32).toString('base64url');
    res.json({
      success: true,
      challenge,
      rpId: rpId,
      userVerification: 'required'
    });
  } catch (err) {
    console.error("Login challenge error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// 5. LOGIN WITH BIOMETRIC (UPDATED)
// ============================================
router.post("/login", async (req, res) => {
  try {
    const { credentialId } = req.body;
    
    if (!credentialId) {
      return res.status(400).json({ error: "Credential ID required" });
    }
    
    console.log(`🔐 Login attempt with credential: ${credentialId.substring(0, 30)}...`);
    
    // First, try to find user with this credential as primary
    let user = await prisma.user.findFirst({
      where: { 
        biometricCredentialId: credentialId,
        biometricRegistered: true
      },
      include: {
        homeJumuia: true,
        leadingJumuia: true
      }
    });
    
    // ✅ If not found in primary, check the credentials array
    if (!user) {
      console.log('🔍 Checking credentials array for match...');
      const allUsers = await prisma.user.findMany({
        where: { biometricRegistered: true },
        include: {
          homeJumuia: true,
          leadingJumuia: true
        }
      });
      
      for (const u of allUsers) {
        if (u.biometricCredentials) {
          try {
            const credentials = JSON.parse(u.biometricCredentials);
            const found = credentials.find(c => c.credentialId === credentialId);
            if (found) {
              user = u;
              // Update last used timestamp
              found.lastUsed = new Date().toISOString();
              await prisma.user.update({
                where: { id: u.id },
                data: {
                  biometricCredentials: JSON.stringify(credentials),
                  biometricCredentialId: credentialId // Update primary
                }
              });
              console.log(`✅ Found credential in credentials array for user ${u.email}`);
              break;
            }
          } catch (e) {
            console.log('Error parsing credentials:', e.message);
          }
        }
      }
    }
    
    if (!user) {
      return res.status(401).json({ 
        error: "Fingerprint not recognized on this device. Please login with password and register fingerprint on this device." 
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        role: user.role,
        specialRole: user.specialRole
      },
      JWT_SECRET,
      { expiresIn: "365d" }
    );
    
    // Update last active and biometric login
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        lastActive: new Date(),
        lastBiometricLogin: new Date()
      }
    });
    
    console.log(`🔐 Biometric login for ${user.email}`);
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        specialRole: user.specialRole,
        membership_number: user.membership_number,
        profileImage: user.profileImage,
        jumuiaId: user.jumuiaId,
        jumuia: user.homeJumuia?.name || null,
        leadingJumuia: user.leadingJumuia?.code || null
      }
    });
  } catch (err) {
    console.error("Biometric login error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// 6. REMOVE BIOMETRIC (UPDATED - remove specific device)
// ============================================
router.delete("/remove", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { credentialId } = req.body; // ✅ Optional: remove specific device
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        biometricRegistered: true,
        biometricCredentials: true,
        biometricCredentialId: true
      }
    });
    
    if (!user?.biometricRegistered) {
      return res.status(400).json({ error: "No biometric registered" });
    }
    
    let credentials = [];
    try {
      if (user.biometricCredentials) {
        credentials = JSON.parse(user.biometricCredentials);
      }
    } catch (e) {
      credentials = [];
    }
    
    // If credentialId provided, remove only that credential
    if (credentialId) {
      credentials = credentials.filter(c => c.credentialId !== credentialId);
    } else {
      // Remove all (old behavior)
      credentials = [];
    }
    
    // Update user
    const updateData = {
      biometricCredentials: JSON.stringify(credentials),
      biometricTransports: null,
      lastBiometricLogin: null
    };
    
    // If no credentials left, clear everything
    if (credentials.length === 0) {
      updateData.biometricRegistered = false;
      updateData.biometricCredentialId = null;
      updateData.biometricPublicKey = null;
    } else {
      // Set primary to first credential
      updateData.biometricCredentialId = credentials[0].credentialId;
    }
    
    await prisma.user.update({
      where: { id: userId },
      data: updateData
    });
    
    await prisma.biometricChallenge.deleteMany({
      where: { userId }
    });
    
    console.log(`🗑️ Biometric removed for user ${userId}, remaining: ${credentials.length}`);
    
    res.json({ 
      success: true, 
      message: credentialId ? "Fingerprint removed from this device!" : "All fingerprints removed!",
      remaining: credentials.length
    });
  } catch (err) {
    console.error("Remove biometric error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// DEBUG: Check RP ID
// ============================================
router.get("/debug/rp-id", async (req, res) => {
  const rpId = getRpId(req);
  res.json({
    rpId: rpId,
    origin: req.get('origin'),
    host: req.get('host'),
    referer: req.get('referer'),
    frontendDomain: 'zetechcatholicaction.com'
  });
});

module.exports = router;