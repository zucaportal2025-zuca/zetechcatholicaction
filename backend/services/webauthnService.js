const { 
  generateRegistrationOptions, 
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse 
} = require('@simplewebauthn/server');
const { isoUint8Array, isoBase64URL } = require('@simplewebauthn/server/helpers');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ==================== CONFIGURATION ====================
const rpID = process.env.WEBAUTHN_RP_ID || 'localhost';
const rpName = 'ZUCA Portal';

// ✅ FIX: Allow multiple origins
const origins = [
  process.env.WEBAUTHN_ORIGIN || 'http://localhost:5000',
  'http://localhost:8080',  // ← ADD THIS (your file server)
  'http://localhost:5500',  // ← For Live Server
  'http://127.0.0.1:5500',  // ← For Live Server
];

// In-memory challenge store
const challengeStore = new Map();

// Clean expired challenges every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of challengeStore.entries()) {
    if (now - value.createdAt > 600000) {
      challengeStore.delete(key);
    }
  }
}, 300000);

// ==================== REGISTRATION ====================

exports.generateRegistrationOptions = async (userId, userEmail, userName) => {
  const existingCredentials = await prisma.webAuthnCredential.findMany({
    where: { userId, isActive: true },
    select: { credentialId: true }
  });

  const userID = isoUint8Array.fromUTF8String(userId);

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID,
    userName: userName || userEmail,
    userDisplayName: userName || userEmail,
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'required',
    },
    supportedAlgorithmIDs: [-7, -257],
    excludeCredentials: existingCredentials.map(cred => ({
      id: Buffer.from(cred.credentialId, 'base64'),
      type: 'public-key',
    })),
  });

  challengeStore.set(userId, {
    challenge: options.challenge,
    createdAt: Date.now()
  });

  return options;
};

exports.verifyRegistration = async (userId, attestationResponse) => {
  const storedData = challengeStore.get(userId);
  if (!storedData) {
    throw new Error('No registration session found. Please start registration again.');
  }

  // ✅ FIX: Check against multiple origins
  let verification = null;
  let lastError = null;

  for (const origin of origins) {
    try {
      verification = await verifyRegistrationResponse({
        response: attestationResponse,
        expectedChallenge: storedData.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: true,
      });
      if (verification.verified) {
        break; // Success! Stop trying other origins
      }
    } catch (error) {
      lastError = error;
      console.log(`❌ Origin ${origin} failed: ${error.message}`);
    }
  }

  if (!verification || !verification.verified) {
    throw new Error(`Registration verification failed: ${lastError?.message || 'Unknown error'}`);
  }

  const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

  const existing = await prisma.webAuthnCredential.findUnique({
    where: { credentialId: credentialID.toString('base64') }
  });

  if (existing) {
    throw new Error('This device is already registered.');
  }

  const credential = await prisma.webAuthnCredential.create({
    data: {
      userId,
      credentialId: credentialID.toString('base64'),
      publicKey: credentialPublicKey.toString('base64'),
      signCount: counter,
      deviceName: attestationResponse.response.authenticatorData?.name || 'Unknown Device',
      isActive: true
    }
  });

  challengeStore.delete(userId);
  return credential;
};

// ==================== AUTHENTICATION ====================

exports.generateAuthenticationOptions = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { webAuthnCredentials: { where: { isActive: true } } }
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.webAuthnCredentials.length === 0) {
    throw new Error('No fingerprint login set up for this account.');
  }

  const allowCredentials = user.webAuthnCredentials.map(cred => ({
    id: Buffer.from(cred.credentialId, 'base64'),
    type: 'public-key',
  }));

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials,
    userVerification: 'required',
  });

  const sessionKey = `auth-${userId}-${Date.now()}`;
  challengeStore.set(sessionKey, {
    challenge: options.challenge,
    userId: userId,
    createdAt: Date.now()
  });

  return { options, sessionKey };
};

exports.verifyAuthentication = async (sessionKey, assertionResponse) => {
  const storedData = challengeStore.get(sessionKey);
  if (!storedData) {
    throw new Error('No authentication session found. Please start login again.');
  }

  const user = await prisma.user.findUnique({
    where: { id: storedData.userId },
    include: { webAuthnCredentials: { where: { isActive: true } } }
  });

  if (!user) {
    throw new Error('User not found');
  }

  const credential = user.webAuthnCredentials.find(
    c => c.credentialId === assertionResponse.id
  );

  if (!credential) {
    throw new Error('Credential not found. Please use a registered device.');
  }

  // ✅ FIX: Check against multiple origins for authentication too
  let verification = null;
  let lastError = null;

  for (const origin of origins) {
    try {
      verification = await verifyAuthenticationResponse({
        response: assertionResponse,
        expectedChallenge: storedData.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        authenticator: {
          credentialPublicKey: Buffer.from(credential.publicKey, 'base64'),
          credentialID: Buffer.from(credential.credentialId, 'base64'),
          counter: credential.signCount,
        },
        requireUserVerification: true,
      });
      if (verification.verified) {
        break; // Success!
      }
    } catch (error) {
      lastError = error;
      console.log(`❌ Origin ${origin} failed: ${error.message}`);
    }
  }

  if (!verification || !verification.verified) {
    throw new Error(`Authentication verification failed: ${lastError?.message || 'Unknown error'}`);
  }

  await prisma.webAuthnCredential.update({
    where: { id: credential.id },
    data: { 
      signCount: verification.authenticationInfo.newCounter,
      lastUsedAt: new Date()
    }
  });

  challengeStore.delete(sessionKey);
  return { user, verified: true };
};

// ==================== CREDENTIAL MANAGEMENT ====================

exports.getUserCredentials = async (userId) => {
  return await prisma.webAuthnCredential.findMany({
    where: { userId, isActive: true },
    select: {
      id: true,
      deviceName: true,
      createdAt: true,
      lastUsedAt: true,
      isActive: true
    },
    orderBy: { createdAt: 'desc' }
  });
};

exports.deleteCredential = async (credentialId, userId) => {
  const credential = await prisma.webAuthnCredential.findUnique({
    where: { id: credentialId }
  });

  if (!credential) {
    throw new Error('Credential not found');
  }

  if (credential.userId !== userId) {
    throw new Error('Not authorized to delete this credential');
  }

  return await prisma.webAuthnCredential.update({
    where: { id: credentialId },
    data: { isActive: false }
  });
};

exports.getCredentialCount = async (userId) => {
  return await prisma.webAuthnCredential.count({
    where: { userId, isActive: true }
  });
};

exports.hasWebAuthnEnabled = async (userId) => {
  const count = await exports.getCredentialCount(userId);
  return count > 0;
};

exports.getChallengeStore = () => {
  return Array.from(challengeStore.entries()).map(([key, value]) => ({
    key,
    userId: value.userId || 'registration',
    age: Math.floor((Date.now() - value.createdAt) / 1000) + 's'
  }));
};

exports.clearChallenges = () => {
  challengeStore.clear();
  return { cleared: true, count: challengeStore.size };
};

console.log('✅ WebAuthn Service loaded successfully!');
console.log(`✅ Allowed origins: ${origins.join(', ')}`);