const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Import the WebAuthn service
const webauthnService = require('../services/webauthnService');

// JWT Secret (use your existing one)
const JWT_SECRET = process.env.JWT_SECRET || 'zuca_super_secret_key';

// ==================== MIDDLEWARE ====================
// Reuse your existing authenticate middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
}

// ==================== REGISTRATION ENDPOINTS ====================

/**
 * POST /api/webauthn/register/begin
 * Step 1: Generate registration options
 * Requires: User must be logged in (authenticate middleware)
 */
router.post('/register/begin', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user already has credentials
    const credentialCount = await webauthnService.getCredentialCount(userId);
    
    // Generate registration options
    const options = await webauthnService.generateRegistrationOptions(
      user.id,
      user.email,
      user.fullName
    );

    res.json({
      success: true,
      options: options,
      hasExistingCredentials: credentialCount > 0,
      credentialCount: credentialCount
    });

  } catch (error) {
    console.error('WebAuthn registration begin error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/webauthn/register/verify
 * Step 2: Verify registration and save credential
 * Requires: User must be logged in
 */
router.post('/register/verify', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { attestationResponse, deviceName } = req.body;

    if (!attestationResponse) {
      return res.status(400).json({ 
        success: false, 
        error: 'Attestation response required' 
      });
    }

    // Verify the registration
    const credential = await webauthnService.verifyRegistration(
      userId,
      attestationResponse
    );

    // Update credential with custom device name if provided
    if (deviceName && credential) {
      await prisma.webAuthnCredential.update({
        where: { id: credential.id },
        data: { deviceName: deviceName }
      });
    }

    // Send notification (optional)
    if (global.createAndSendNotification) {
      await global.createAndSendNotification({
        userId: userId,
        type: 'security',
        title: ' Fingerprint Login Enabled',
        message: `You have successfully set up fingerprint login on "${deviceName || 'Unknown Device'}"!`,
        data: { credentialId: credential.id }
      });
    }

    // Get updated list of credentials
    const credentials = await webauthnService.getUserCredentials(userId);

    res.json({
      success: true,
      message: 'Fingerprint login successfully registered!',
      credential: {
        id: credential.id,
        deviceName: credential.deviceName,
        createdAt: credential.createdAt
      },
      credentials: credentials,
      totalCredentials: credentials.length
    });

  } catch (error) {
    console.error('WebAuthn registration verify error:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ==================== AUTHENTICATION ENDPOINTS ====================

/**
 * POST /api/webauthn/login/begin
 * Step 1: Generate authentication options
 * Public: User enters email only
 */
router.post('/login/begin', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email required' 
      });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { 
        webAuthnCredentials: {
          where: { isActive: true }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    if (user.webAuthnCredentials.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fingerprint login set up for this account. Please use password login to set it up.',
        canRegister: true,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email
        }
      });
    }

    // Generate authentication options
    const { options, sessionKey } = await webauthnService.generateAuthenticationOptions(user.id);

    res.json({
      success: true,
      sessionKey: sessionKey,
      options: options,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        profileImage: user.profileImage
      }
    });

  } catch (error) {
    console.error('WebAuthn login begin error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/webauthn/login/verify
 * Step 2: Verify authentication and return JWT
 * Public: Uses sessionKey from step 1
 */
router.post('/login/verify', async (req, res) => {
  try {
    const { sessionKey, assertionResponse } = req.body;

    if (!sessionKey || !assertionResponse) {
      return res.status(400).json({ 
        success: false, 
        error: 'Session key and assertion response required' 
      });
    }

    // Verify the authentication
    const result = await webauthnService.verifyAuthentication(sessionKey, assertionResponse);

    // Update last active
    await prisma.user.update({
      where: { id: result.user.id },
      data: { lastActive: new Date() }
    });

    // Generate JWT token (same as your existing login)
    const token = jwt.sign(
      { 
        userId: result.user.id, 
        role: result.user.role,
        email: result.user.email
      },
      JWT_SECRET,
      { expiresIn: '365d' }
    );

    // Get user with relations for response
    const userWithRelations = await prisma.user.findUnique({
      where: { id: result.user.id },
      include: { 
        homeJumuia: true,
        leadingJumuia: true
      }
    });

    // Send notification (optional)
    if (global.createAndSendNotification) {
      // Notify admins of fingerprint login (optional)
      const admins = await prisma.user.findMany({
        where: { role: 'admin' },
        select: { id: true }
      });

      for (const admin of admins) {
        try {
          await global.createAndSendNotification({
            userId: admin.id,
            type: 'security',
            title: 'Fingerprint Login',
            message: `${userWithRelations.fullName} logged in using fingerprint`,
            data: { userId: result.user.id }
          });
        } catch (err) {
          // Ignore notification errors
        }
      }
    }

    res.json({
      success: true,
      message: 'Fingerprint authentication successful!',
      token: token,
      user: {
        id: result.user.id,
        fullName: result.user.fullName,
        email: result.user.email,
        role: result.user.role,
        phone: result.user.phone,
        profileImage: result.user.profileImage,
        membership_number: result.user.membership_number,
        jumuia: result.user.homeJumuia?.name || null,
        specialRole: result.user.specialRole
      }
    });

  } catch (error) {
    console.error('WebAuthn login verify error:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ==================== CREDENTIAL MANAGEMENT ====================

/**
 * GET /api/webauthn/credentials
 * Get all registered credentials for the current user
 * Requires: User must be logged in
 */
router.get('/credentials', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    const credentials = await webauthnService.getUserCredentials(userId);

    res.json({
      success: true,
      credentials: credentials,
      total: credentials.length
    });

  } catch (error) {
    console.error('Get credentials error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * DELETE /api/webauthn/credentials/:credentialId
 * Delete (soft delete) a credential
 * Requires: User must be logged in
 */
router.delete('/credentials/:credentialId', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { credentialId } = req.params;

    const result = await webauthnService.deleteCredential(credentialId, userId);

    // Get updated list
    const credentials = await webauthnService.getUserCredentials(userId);

    res.json({
      success: true,
      message: 'Credential removed successfully',
      credentials: credentials,
      total: credentials.length
    });

  } catch (error) {
    console.error('Delete credential error:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * PUT /api/webauthn/credentials/:credentialId/rename
 * Rename a credential
 * Requires: User must be logged in
 */
router.put('/credentials/:credentialId/rename', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { credentialId } = req.params;
    const { deviceName } = req.body;

    if (!deviceName || deviceName.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: 'Device name required' 
      });
    }

    const credential = await prisma.webAuthnCredential.findUnique({
      where: { id: credentialId }
    });

    if (!credential) {
      return res.status(404).json({ 
        success: false, 
        error: 'Credential not found' 
      });
    }

    if (credential.userId !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized' 
      });
    }

    const updated = await prisma.webAuthnCredential.update({
      where: { id: credentialId },
      data: { deviceName: deviceName.trim() }
    });

    res.json({
      success: true,
      message: 'Device renamed successfully',
      credential: {
        id: updated.id,
        deviceName: updated.deviceName
      }
    });

  } catch (error) {
    console.error('Rename credential error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/webauthn/check/:email
 * Check if a user has WebAuthn enabled
 * Public: Used to determine login method on login page
 */
router.get('/check/:email', async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email required' 
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        webAuthnCredentials: {
          where: { isActive: true },
          select: { id: true }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    const hasFingerprint = user.webAuthnCredentials.length > 0;

    res.json({
      success: true,
      hasFingerprint: hasFingerprint,
      credentialCount: user.webAuthnCredentials.length,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Check WebAuthn error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/webauthn/debug/challenges
 * Debug: View active challenges (admin only)
 */
router.get('/debug/challenges', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true }
    });

    if (user?.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin access required' 
      });
    }

    const challenges = webauthnService.getChallengeStore();

    res.json({
      success: true,
      activeChallenges: challenges,
      total: challenges.length
    });

  } catch (error) {
    console.error('Debug challenges error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/webauthn/debug/clear-challenges
 * Debug: Clear all challenges (admin only)
 */
router.post('/debug/clear-challenges', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true }
    });

    if (user?.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin access required' 
      });
    }

    const result = webauthnService.clearChallenges();

    res.json({
      success: true,
      message: 'All challenges cleared',
      result: result
    });

  } catch (error) {
    console.error('Clear challenges error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;