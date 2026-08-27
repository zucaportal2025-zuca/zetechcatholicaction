// services/whatsapp.bot.js
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const QRCode = require('qrcode');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

// Load AI service
const { chatWithGroq } = require('./deepseek/deepseekClient');
const { executeToolCall } = require('./deepseek/toolHandlers');

class WhatsAppBot {
  constructor() {
    this.sock = null;
    this.isConnected = false;
    this.qrCode = null;
    this.qrCodeBase64 = null;
    this.groupId = null;
    this.activeGroups = [];
    this.groups = [];
    this.connectionStatus = 'disconnected';
    this.lastError = null;
    this.authFolder = './auth_info';
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.botNumber = null;
    this.botLid = null;
    // ✅ Enable database auth
    this.useDatabaseAuth = true;
    // Conversation memory
this.chatMemory = new Map();
this.maxMemoryMessages = 20;
    // ✅ CACHE for groups to prevent rate limiting
    this.groupsCache = null;
    this.groupsCacheTime = null;
    this.groupsCacheTTL = 5 * 60 * 1000; // 5 minutes
  }

 // =============================================
  // 🧹 CLEAN AI RESPONSE - Remove System Instructions
  // =============================================
  cleanAIResponse(text) {
    if (!text) return '';
    
    const systemPhrases = [
      'Check System Instructions',
      'I need to be warm',
      'Offer assistance with ZUCA features',
      'Keep it under 2000 chars',
      'Use Sheng naturally',
      'system prompt',
      'system instruction',
      'you are zu ca ai',
      'you are zuca bot'
    ];
    
    let cleaned = text;
    for (const phrase of systemPhrases) {
      const regex = new RegExp(phrase, 'gi');
      cleaned = cleaned.replace(regex, '');
    }
    
    cleaned = cleaned.replace(/^[\s]*[-•*]\s*(System|Instruction|Check|Offer|Keep|Use)/gmi, '');
    cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
    
    if (!cleaned || cleaned.length < 3) {
      return '🙏 How can I help you with ZUCA today?';
    }
    
    return cleaned;
  } 

    // =============================================
  // 💾 SAVE CREDS TO DATABASE (SAVE EVERYTHING)
  // =============================================
  async saveCredsToDatabase(creds) {
    try {
      // ✅ Save ALL creds - NO FILTERING
      // Just stringify the entire creds object
      const fullCredsJson = JSON.stringify(creds);
      
      await prisma.WhatsAppAuth.upsert({ 
        where: { key: 'whatsapp_creds' },
        update: { 
          value: fullCredsJson,
          updatedAt: new Date()
        },
        create: { 
          key: 'whatsapp_creds', 
          value: fullCredsJson 
        }
      });
      console.log(`✅ Full creds saved to database (${fullCredsJson.length} characters)`);
      return true;
    } catch (error) {
      console.error('❌ Failed to save creds to database:', error.message);
      return false;
    }
  }
  

  // =============================================
  // 📥 LOAD CREDS FROM DATABASE
  // =============================================
  async loadCredsFromDatabase() {
    try {
      const record = await prisma.WhatsAppAuth.findUnique({
        where: { key: 'whatsapp_creds' }
      });
      if (record && record.value) {
        const parsed = JSON.parse(record.value);
        
        // ✅ Check if we have the required encryption keys
        if (parsed.noiseKey && parsed.registrationId && parsed.me) {
          console.log(`✅ Full creds loaded from database (${record.value.length} chars)`);
          return parsed;
        } else {
          console.log('⚠️ Creds in database are incomplete, clearing...');
          await this.clearCreds();
          return null;
        }
      }
      console.log('ℹ️ No saved creds found in database');
      return null;
    } catch (error) {
      console.error('❌ Failed to load creds from database:', error.message);
      return null;
    }
  }


  // =============================================
// 🔄 RESTORE CREDS FROM DATABASE TO FILE
// =============================================
async restoreCredsFromDatabase() {
  try {
    const creds = await this.loadCredsFromDatabase();
    
    if (creds) {
      // Ensure auth folder exists
      if (!fs.existsSync(this.authFolder)) {
        fs.mkdirSync(this.authFolder, { recursive: true });
      }
      
      // Write creds to file
      const credsPath = path.join(this.authFolder, 'creds.json');
      fs.writeFileSync(credsPath, JSON.stringify(creds, null, 2));
      console.log(`✅ Creds restored from database (${JSON.stringify(creds).length} chars)`);
      return true;
    } else {
      console.log('ℹ️ No creds in database to restore');
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to restore creds:', error.message);
    return false;
  }
}

    // =============================================
  // 🗑️ CLEAR CREDS FROM DATABASE
  // =============================================
  async clearCreds() {
    try {
      await prisma.WhatsAppAuth.deleteMany({
        where: { key: 'whatsapp_creds' }
      });
      console.log('🗑️ Creds cleared from database');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear creds:', error.message);
      return false;
    }
  }


  // =============================================
// 💾 SAVE GROUP TO DATABASE
// =============================================
async saveGroupToDatabase(groupId, isActive, groupName = null, participants = null) {
  try {
    // Get group info if not provided
    if (!groupName || participants === null) {
      const groups = await this.getGroups();
      const group = groups.find(g => g.id === groupId);
      groupName = groupName || group?.name || null;
      participants = participants || group?.participants || 0;
    }

    const result = await prisma.whatsAppGroup.upsert({
      where: { groupId: groupId },
      update: {
        isActive: isActive,
        groupName: groupName || undefined,
        participants: participants || 0,
        activatedAt: isActive ? new Date() : undefined,
        deactivatedAt: !isActive ? new Date() : undefined,
        updatedAt: new Date()
      },
      create: {
        groupId: groupId,
        groupName: groupName,
        isActive: isActive,
        participants: participants || 0,
        activatedAt: isActive ? new Date() : undefined,
      }
    });

    // Update in-memory array
    if (isActive && !this.activeGroups.includes(groupId)) {
      this.activeGroups.push(groupId);
    } else if (!isActive) {
      this.activeGroups = this.activeGroups.filter(id => id !== groupId);
    }

    console.log(`✅ Group ${groupId} ${isActive ? 'activated' : 'deactivated'}`);
    return result;
  } catch (error) {
    console.error('❌ Failed to save group:', error.message);
    return null;
  }
}

// =============================================
// 📥 LOAD ACTIVE GROUPS FROM DATABASE
// =============================================
async loadActiveGroupsFromDatabase() {
  try {
    const dbGroups = await prisma.whatsAppGroup.findMany({
      where: { isActive: true }
    });

    this.activeGroups = dbGroups.map(g => g.groupId);
    console.log(`✅ Loaded ${this.activeGroups.length} active groups from database`);
    return this.activeGroups;
  } catch (error) {
    console.error('❌ Failed to load active groups:', error.message);
    return [];
  }
}

// =============================================
// 🔄 SYNC ALL GROUPS TO DATABASE
// =============================================
async syncAllGroups() {
  try {
    const groups = await this.getGroups(true);
    let updated = 0;
    
    for (const group of groups) {
      await prisma.whatsAppGroup.upsert({
        where: { groupId: group.id },
        update: {
          groupName: group.name,
          participants: group.participants,
          updatedAt: new Date()
        },
        create: {
          groupId: group.id,
          groupName: group.name,
          participants: group.participants,
          isActive: false
        }
      });
      updated++;
    }
    
    console.log(`✅ Synced ${updated} groups to database`);
    return updated;
  } catch (error) {
    console.error('❌ Failed to sync groups:', error.message);
    return 0;
  }
}

 
  // =============================================
  // 🔧 LOAD CONFIG
  // =============================================
  async loadConfig() {
    try {
      const config = await prisma.setting.findUnique({
        where: { key: 'whatsapp_group_id' }
      });
      
      this.groupId = config?.value || process.env.ZUCA_GROUP_ID || null;
      
      const statusConfig = await prisma.setting.findUnique({
        where: { key: 'whatsapp_status' }
      });
      if (statusConfig) {
        this.connectionStatus = statusConfig.value;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error loading config:', error.message);
      this.groupId = process.env.ZUCA_GROUP_ID || null;
      return false;
    }
  }

// =============================================
// 🔌 CONNECT TO WHATSAPP (File Auth + Database Backup)
// =============================================
async connect() {
  // ✅ Prevent multiple connection attempts
  if (this.isConnecting) {
    console.log('⏳ Connection already in progress...');
    return;
  }

  // ✅ If already connected, don't try again
  if (this.isConnected) {
    console.log('✅ Already connected');
    return;
  }

  // ✅ If reconnecting too fast, delay
  if (this._lastReconnectAttempt && Date.now() - this._lastReconnectAttempt < 5000) {
    console.log('⏳ Reconnecting too fast, waiting...');
    return;
  }

  this.isConnecting = true;
  this._lastReconnectAttempt = Date.now();
  this.connectionStatus = 'connecting';
  await this.updateStatus('connecting');

  try {
    await this.loadConfig();
    
    console.log('🔌 Connecting to WhatsApp...');

    await this.restoreCredsFromDatabase(); 
    
    // ✅ Ensure auth folder exists
    if (!fs.existsSync(this.authFolder)) {
      fs.mkdirSync(this.authFolder, { recursive: true });
      console.log('📁 Auth folder created');
    }

    // ✅ USE FILE-BASED AUTH (RELIABLE)
    const { state, saveCreds } = await useMultiFileAuthState(this.authFolder);
    
    // ✅ Save to database as backup - read from file directly
    const saveToDb = async (creds) => {
      try {
        const credsPath = path.join(this.authFolder, 'creds.json');
        if (fs.existsSync(credsPath)) {
          const fileCreds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
          await this.saveCredsToDatabase(fileCreds);
          console.log(`💾 Creds backed up to database from file (${JSON.stringify(fileCreds).length} chars)`);
        } else {
          await this.saveCredsToDatabase(creds);
          console.log('💾 Creds backed up to database (fallback)');
        }
      } catch (error) {
        console.error('❌ Failed to save creds to database:', error.message);
      }
    };

    // ✅ Create socket with file-based auth
    this.sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['ZUCA Bot', 'Chrome', '120.0.0.0'],
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 10000,
      markOnlineOnConnect: true,
      syncFullHistory: false,
    });

    // ✅ Listen for creds updates - save to both file and database
    this.sock.ev.on('creds.update', async (creds) => {
      try {
        await saveCreds(creds);
        await saveToDb(creds);
        console.log('💾 Creds saved to file and database');
      } catch (error) {
        console.error('❌ Error saving creds:', error.message);
      }
    });

    // ✅ CONNECTION UPDATE HANDLER
    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.qrCode = qr;
        try {
          this.qrCodeBase64 = await QRCode.toDataURL(qr, {
            width: 300,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          console.log('✅ QR Code generated for web display');
        } catch (qrError) {
          console.error('❌ QR generation error:', qrError);
        }
        
        try {
          const publicDir = path.join(__dirname, '../public');
          if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
          }
          await QRCode.toFile(path.join(publicDir, 'qr-code.png'), qr, {
            width: 300,
            margin: 2
          });
        } catch (fileError) {
          console.error('❌ QR file save error:', fileError);
        }
        
        this.connectionStatus = 'qr_required';
        await this.updateStatus('qr_required');
        this.isConnecting = false; // QR shown, can accept new connections
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
        console.log(`🔴 Connection closed. Status: ${statusCode}`);
        
        // ✅ QR timeout - stop reconnecting
        if (statusCode === 408) {
          console.log('⏰ QR code timed out. Waiting for user to scan.');
          this.connectionStatus = 'qr_required';
          await this.updateStatus('qr_required');
          this.isConnecting = false;
          this.isConnected = false;
          return;
        }
        
        // ✅ Conflict - wait longer with exponential backoff
        if (statusCode === 440 || statusCode === 409) {
          console.log('⚠️ Conflict detected - waiting before reconnecting...');
          this.reconnectAttempts++;
          const delay = Math.min(10000 * Math.pow(2, this.reconnectAttempts), 120000);
          console.log(`⏳ Waiting ${delay/1000}s before retry (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          this.isConnecting = false;
          this.isConnected = false;
          setTimeout(() => {
            this.connect();
          }, delay);
          return;
        }
        
        if (statusCode === DisconnectReason.loggedOut) {
          this.connectionStatus = 'logged_out';
          this.isConnected = false;
          this.botNumber = null;
          this.botLid = null;
          this.groups = [];
          this.activeGroups = [];
          await this.updateStatus('logged_out');
          console.log('❌ Logged out. Please unlink and relink the bot.');
          
          if (this.useDatabaseAuth) {
            try {
              await this.clearCreds();
              console.log('🗑️ Database creds cleared on logout');
            } catch (e) {
              console.error('❌ Failed to clear database creds:', e.message);
            }
          }
          
          this.cleanupAuth();
          this.isConnecting = false;
          this.isConnected = false;
          return;
        }
        
        // ✅ Only reconnect if we haven't exceeded max attempts
        if (shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(5000 * Math.pow(1.5, this.reconnectAttempts), 60000);
          console.log(`🔄 Reconnecting in ${delay/1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          this.connectionStatus = 'reconnecting';
          await this.updateStatus('reconnecting');
          this.isConnected = false;
          // ✅ CRITICAL: DON'T set isConnecting = false here!
          // Keep it true to prevent overlapping reconnections
          
          setTimeout(() => {
            // ✅ Reset isConnecting before trying to connect
            this.isConnecting = false;
            this.connect();
          }, delay);
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.connectionStatus = 'error';
          this.lastError = 'Max reconnection attempts reached';
          await this.updateStatus('error');
          this.isConnecting = false;
          this.isConnected = false;
          console.log('❌ Max reconnection attempts reached. Manual intervention required.');
        }
      }

      if (connection === 'open') {
        // ✅ Reset reconnect attempts on successful connection
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this._lastReconnectAttempt = null;
        this.connectionStatus = 'connected';
        this.qrCode = null;
        this.qrCodeBase64 = null;
        
        // Store bot's phone number from WhatsApp
        this.botNumber = this.sock?.user?.id?.split(':')[0] || null;
        console.log(`✅ WhatsApp Bot Connected! Bot Number: ${this.botNumber}`);
        
        // Extract and store LID
        try {
          console.log('🔍 Attempting to extract LID...');
          
          let lid = null;
          try {
            const dbCreds = await this.loadCredsFromDatabase();
            if (dbCreds && dbCreds.lid) {
              lid = dbCreds.lid;
              console.log(`✅ LID from database creds: ${lid}`);
            }
            if (!lid && dbCreds && dbCreds.me && dbCreds.me.lid) {
              lid = dbCreds.me.lid;
              console.log(`✅ LID from database creds.me.lid: ${lid}`);
            }
          } catch (e) {
            console.log('⚠️ Could not read database creds:', e.message);
          }
          
          if (!lid) {
            try {
              const authLid = this.sock?.authState?.creds?.lid;
              if (authLid) {
                lid = authLid;
                console.log(`✅ LID from authState: ${lid}`);
              }
            } catch (e) {}
          }
          
          if (!lid) {
            try {
              const userLid = this.sock?.user?.lid;
              if (userLid) {
                lid = userLid;
                console.log(`✅ LID from sock.user: ${lid}`);
              }
            } catch (e) {}
          }
          
          if (!lid) {
            console.log('⚠️ No LID found via methods, using hardcoded LID');
            lid = '273010401485038:3@lid';
          }
          
          if (lid) {
            this.botLid = lid.split(':')[0] || null;
            console.log(`🔑 FINAL BOT LID SET TO: ${this.botLid}`);
          } else {
            this.botLid = '273010401485038';
            console.log(`🔑 BOT LID HARDCODED TO: ${this.botLid}`);
          }
          
        } catch (error) {
          console.error('❌ Error extracting LID:', error.message);
          this.botLid = '273010401485038';
        }

        await this.loadActiveGroupsFromDatabase();
        await this.syncAllGroups();

        setTimeout(async () => {
          try {
            const credsPath = path.join(this.authFolder, 'creds.json');
            if (fs.existsSync(credsPath)) {
              const fileCreds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
              await this.saveCredsToDatabase(fileCreds);
              console.log(`💾 Complete creds saved to database (${JSON.stringify(fileCreds).length} chars)`);
            }
          } catch (error) {
            console.error('❌ Failed to save complete creds:', error.message);
          }
        }, 3000);
        
        await this.updateStatus('connected');
        
        // Refresh group list on connection (force refresh)
        await this.getGroups(true);
        
        console.log(`📱 Bot is ready for group: ${this.groupId || 'Not set'}`);
        console.log(`📋 Active groups: ${this.activeGroups.length}`);
        console.log(`🤖 Bot Number: ${this.botNumber}, LID: ${this.botLid}`);
      }
    });

    // Listen for incoming messages
    this.sock.ev.on('messages.upsert', async (m) => {
      await this.handleIncomingMessage(m);
    });

  } catch (error) {
    console.error('❌ Connection error:', error.message);
    this.connectionStatus = 'error';
    this.lastError = error.message;
    this.isConnecting = false;
    this.isConnected = false;
    await this.updateStatus('error');
    
    // ✅ Don't auto-reconnect here - let the connection.update handler do it
    // Only reconnect if it's a socket creation error
    if (!this.sock) {
      console.log('🔄 Socket creation failed, retrying in 5s...');
      setTimeout(() => {
        this.isConnecting = false;
        this.connect();
      }, 5000);
    }
  }
}

  // =============================================
  // 🔌 DISCONNECT
  // =============================================
  async disconnect() {
    try {
      if (this.sock) {
        this.sock.ws?.close();
        this.sock = null;
      }
      this.isConnected = false;
      this.isConnecting = false;
      this.connectionStatus = 'disconnected';
      this.qrCode = null;
      this.qrCodeBase64 = null;
      this.botNumber = null;
      this.botLid = null;
      this.groups = [];
      this.activeGroups = [];
      await this.updateStatus('disconnected');
      console.log('🔌 Disconnected from WhatsApp');
      return true;
    } catch (error) {
      console.error('❌ Disconnect error:', error.message);
      return false;
    }
  }

  // =============================================
// 🧹 CLEANUP AUTH
// =============================================
cleanupAuth() {
  try {
    // Clean file-based auth (if any)
    if (fs.existsSync(this.authFolder)) {
      fs.rmSync(this.authFolder, { recursive: true, force: true });
      console.log('🧹 Auth folder cleaned up');
    }
    
    // ✅ Also clear database auth
    if (this.useDatabaseAuth) {
      prisma.WhatsAppAuth.deleteMany({
        where: { key: 'whatsapp_creds' }
      }).then(() => {
        console.log('🧹 Database auth cleaned up');
      }).catch((error) => {
        console.error('❌ Failed to clear database auth:', error.message);
      });
    }
    
    this.qrCode = null;
    this.qrCodeBase64 = null;
    this.botNumber = null;
    this.botLid = null;
    this.groups = [];
    this.activeGroups = [];
    this.groupsCache = null;
    this.groupsCacheTime = null;
  } catch (error) {
    console.error('❌ Cleanup error:', error.message);
  }
}

  // =============================================
  // 💾 UPDATE STATUS
  // =============================================
  async updateStatus(status) {
    try {
      await prisma.setting.upsert({
        where: { key: 'whatsapp_status' },
        update: { 
          value: status,
          updatedAt: new Date()
        },
        create: {
          key: 'whatsapp_status',
          value: status,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      // Silently fail
    }
  }

  // =============================================
  // 📝 SET GROUP ID
  // =============================================
  async setGroupId(groupId) {
    try {
      if (!groupId) {
        throw new Error('Group ID is required');
      }
      
      if (!groupId.includes('@g.us')) {
        groupId = groupId.replace(/[^0-9]/g, '') + '@g.us';
      }
      
      await prisma.setting.upsert({
        where: { key: 'whatsapp_group_id' },
        update: { 
          value: groupId,
          updatedAt: new Date()
        },
        create: {
          key: 'whatsapp_group_id',
          value: groupId,
          updatedAt: new Date()
        }
      });
      
      this.groupId = groupId;
      console.log(`✅ Group ID set to: ${groupId}`);
      
      if (this.isConnected) {
        await this.sendToGroup('🔄 Group ID has been updated successfully!');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to set group ID:', error.message);
      throw error;
    }
  }

  // =============================================
  // 📋 GET GROUP ID
  // =============================================
  async getGroupId() {
    if (this.groupId) return this.groupId;
    
    const config = await prisma.setting.findUnique({
      where: { key: 'whatsapp_group_id' }
    });
    
    return config?.value || null;
  }

  // =============================================
  // 📤 SEND TO DEFAULT GROUP (Legacy)
  // =============================================
  async sendToGroup(message) {
    if (!this.sock || !this.isConnected) {
      throw new Error('Bot is not connected to WhatsApp');
    }

    if (!this.groupId) {
      throw new Error('Group ID not set. Please configure the group ID first.');
    }

    try {
     const result = await this.sock.sendMessage(
    groupId,
    {
        text: message
    },
    quoted ? { quoted } : {}
);
      console.log(`✅ Group message sent: ${message.substring(0, 50)}...`);
      
      // ✅ Track message
      if (result && result.key && result.key.id) {
        await prisma.whatsAppMessage.create({
          data: {
            messageId: result.key.id,
            groupId: this.groupId,
            message: message,
            originalMessage: message,
            type: 'group',
            status: 'sent',
            sentAt: new Date()
          }
        });
        console.log(`📝 Message tracked: ${result.key.id}`);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Failed to send group message:', error.message);
      throw error;
    }
  }

  // =============================================
  // 📤 SEND TO SPECIFIC GROUP (BY ID)
  // =============================================
 async sendToSpecificGroup(groupId, message, quoted = null, mentionedJids = []) {
  if (!this.sock || !this.isConnected) {
    throw new Error('Bot is not connected to WhatsApp');
  }

  try {
    // ✅ Build message with mentions support
    const sendOptions = {
      text: message
    };
    
    // ✅ Add mentions if any JIDs provided
    if (mentionedJids && mentionedJids.length > 0) {
      sendOptions.mentions = mentionedJids;
      console.log(`📌 Tagging ${mentionedJids.length} users:`, mentionedJids);
    }
    
    const result = await this.sock.sendMessage(
      groupId,
      sendOptions,
      quoted ? { quoted } : {}
    );
    
    console.log(`✅ Message sent to ${groupId}`);
    
    // ✅ Track message
    if (result && result.key && result.key.id) {
      await prisma.whatsAppMessage.create({
        data: {
          messageId: result.key.id,
          groupId: groupId,
          message: message,
          originalMessage: message,
          type: 'group',
          status: 'sent',
          sentAt: new Date()
        }
      });
      console.log(`📝 Message tracked: ${result.key.id}`);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Failed to send to ${groupId}:`, error.message);
    throw error;
  }
}

  // =============================================
  // 📤 SEND TO USER
  // =============================================
  async sendToUser(phoneNumber, message) {
    if (!this.sock || !this.isConnected) {
      throw new Error('Bot is not connected to WhatsApp');
    }

    try {
      let cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
      
      if (cleanNumber.startsWith('0')) {
        cleanNumber = '254' + cleanNumber.substring(1);
      } else if (!cleanNumber.startsWith('254') && cleanNumber.length === 10) {
        cleanNumber = '254' + cleanNumber;
      } else if (!cleanNumber.startsWith('254')) {
        cleanNumber = '254' + cleanNumber;
      }
      
      let jid = `${cleanNumber}@s.whatsapp.net`;

      const result = await this.sock.sendMessage(
    groupId,
    {
        text: message
    },
    quoted ? { quoted } : {}
);
      console.log(`✅ Message sent to ${phoneNumber}`);
      
      // ✅ Track message
      if (result && result.key && result.key.id) {
        await prisma.whatsAppMessage.create({
          data: {
            messageId: result.key.id,
            phoneNumber: phoneNumber,
            message: message,
            originalMessage: message,
            type: 'user',
            status: 'sent',
            sentAt: new Date()
          }
        });
        console.log(`📝 Message tracked: ${result.key.id}`);
      }
      
      return result;
    } catch (error) {
      console.error(`❌ Failed to send to ${phoneNumber}:`, error.message);
      throw error;
    }
  }

  // =============================================
  // 📤 SEND CONTRIBUTION LIST
  // =============================================
  async sendContributionList(campaignId) {
    try {
      const campaign = await prisma.contributionType.findUnique({
        where: { id: campaignId },
        include: {
          pledges: {
            include: {
              user: {
                select: {
                  fullName: true,
                  membership_number: true
                }
              }
            }
          }
        }
      });

      if (!campaign) {
        throw new Error(`Campaign ${campaignId} not found`);
      }

      let message = `📊 *${campaign.title} CONTRIBUTION LIST*\n\n`;
      
      const sorted = [...campaign.pledges].sort((a, b) => b.amountPaid - a.amountPaid);
      
      let count = 1;
      const contributors = campaign.pledges.filter(p => p.amountPaid > 0);
      
      if (contributors.length === 0) {
        message += 'No contributions yet. Be the first to give! 🙏\n\n';
      } else {
        for (const p of sorted) {
          if (p.amountPaid > 0) {
            message += `${count}. ${p.user.fullName} - KES ${p.amountPaid.toLocaleString()} ✅\n`;
            count++;
          }
        }
      }

      const totalRaised = campaign.pledges.reduce((sum, p) => sum + p.amountPaid, 0);
      const target = campaign.amountRequired;
      const percentage = target > 0 ? ((totalRaised / target) * 100).toFixed(1) : 0;

      message += `\n💰 *Total Raised:* KES ${totalRaised.toLocaleString()}`;
      message += `\n🎯 *Target:* KES ${target.toLocaleString()} (${percentage}%)`;
      message += `\n👥 *Contributors:* ${contributors.length} members`;
      message += `\n\n_T_`;

      const result = await this.sendToGroup(message);
      console.log(`✅ Contribution list sent for ${campaign.title}`);
      return true;

    } catch (error) {
      console.error('❌ Error sending contribution list:', error.message);
      throw error;
    }
  }

  // =============================================
  // 📥 HANDLE INCOMING MESSAGES - FIXED VERSION
  // =============================================
  async handleIncomingMessage(m) {
    try {
      // ✅ Ensure LID is set
      if (!this.botLid) {
        console.log('⚠️ LID not set, using fallback');
        this.botLid = '273010401485038';
      }
      
      const msg = m.messages[0];
      if (!msg || !msg.message) return;

      const from = msg.key.remoteJid;
      const sender = msg.key.participant || msg.key.remoteJid;
      
      // Get bot identifiers
      const botId = this.sock?.user?.id;
      const botNumber = botId?.split(':')[0] || this.botNumber;
      
      // Get LID from stored value
      const lidNumber = this.botLid;
      
      // Log for debugging
      console.log(`🔑 Bot Number: ${botNumber}, LID: ${lidNumber || 'null'}`);
      
      // Ignore own messages
      if (sender === botId || from === botId || sender?.includes(botNumber)) {
        console.log(`⏭️ Ignoring own message`);
        return;
      }

      const text = msg.message.conversation || 
                   msg.message.extendedTextMessage?.text || 
                   msg.message.imageMessage?.caption ||
                   '';

      if (!text) return;

      console.log(`📩 Message from ${from}: ${text.substring(0, 50)}`);

      const isGroup = from.endsWith('@g.us');
      
      if (isGroup) {
        // =============================================
        // 🔍 CHECK IF BOT IS MENTIONED
        // =============================================
        
        // Get the bot's full JID
        const botJid = this.sock?.user?.id || botId;
        const botJidNumber = botJid?.split(':')[0] || botNumber;
        
        // Check for mentions in the message text
        const hasPhoneMention = text.includes(`@${botJidNumber}`);
        const hasLIDMention = lidNumber ? text.includes(`@${lidNumber}`) : false;
        const hasLIDInText = lidNumber ? text.includes(lidNumber) : false;
        
        // Check for bot name mentions (case insensitive)
        const botNameMentions = [
          'zuca bot',
          '@zuca',
          '@zucabot',
          'hey bot',
          'hello bot',
          'hi bot',
          'zuccabot',
          'zucabot',
          '@zucabot'
        ];
        const hasTextMention = botNameMentions.some(mention => 
          text.toLowerCase().includes(mention.toLowerCase())
        );
        
        // Check mentioned JIDs from the message context
        const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const hasMentionedJid = mentionedJids.some(jid => {
          if (!jid) return false;
          const jidNumber = jid.split(/[:@]/)[0];
          return jidNumber === botJidNumber || 
                 (lidNumber && jidNumber === lidNumber) ||
                 jid === botJid ||
                 (lidNumber && jid.includes(lidNumber));
        });
        
        // Check if message is a reply to bot
        const isReplyToBot = msg.message?.extendedTextMessage?.contextInfo?.participant === botJid ||
                            msg.message?.extendedTextMessage?.contextInfo?.participant === botId ||
                            (lidNumber && msg.message?.extendedTextMessage?.contextInfo?.participant?.includes(lidNumber));
        
        // Check if bot number or LID appears in text (without @)
        const hasBotNumberInText = text.includes(botJidNumber) || 
                                   (lidNumber && text.includes(lidNumber));
        
        // COMBINED MENTION CHECK
        const isMentioned = hasPhoneMention || 
                           hasLIDMention || 
                           hasLIDInText || 
                           hasTextMention || 
                           hasMentionedJid || 
                           isReplyToBot ||
                           hasBotNumberInText;
        
        // Log mention detection for debugging
        console.log(`🔍 Mention check: phone=${hasPhoneMention}, lid=${hasLIDMention}, lidInText=${hasLIDInText}, text=${hasTextMention}, jid=${hasMentionedJid}, reply=${isReplyToBot}, numberInText=${hasBotNumberInText}`);
        console.log(`🔍 Bot JID: ${botJidNumber}, LID: ${lidNumber || 'null'}, Message: "${text}"`);
        
        // =============================================
        // 🤖 IF MENTIONED, REPLY WHERE MENTIONED
        // =============================================
        if (isMentioned) {
          console.log(`🤖 Bot mentioned/replied! Processing with AI...`);
          await this.handleAIMention(from, text, msg);
          return;
        }

        console.log(`⏭️ Ignoring normal message (no mention/reply)`);
        return;
      }

    } catch (error) {
      console.error('❌ Error handling message:', error.message);
    }
  }

    // =============================================
  // 🤖 HANDLE AI MENTION - WITH TAGGING SUPPORT
  // =============================================
  async handleAIMention(from, text, msg) {
    try {
      await this.sock.sendPresenceUpdate('composing', from);
      
      const botNumber = this.botNumber || this.sock?.user?.id?.split(':')[0];
      const lidNumber = this.botLid;
      const sender = msg.key.participant || msg.key.remoteJid;
      
      // ✅ EXTRACT USER MENTIONS
const userJids = [];

// ✅ 1. Get mentioned user's JID from the message context (EXACT FORMAT)
const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
if (mentionedJids.length > 0) {
  for (const jid of mentionedJids) {
    const jidNumber = jid.split(/[:@]/)[0];
    if (jidNumber !== botNumber && jidNumber !== lidNumber) {
      if (!userJids.some(j => j === jid)) {
        userJids.push(jid);
        console.log(`📌 Using JID from message: ${jid}`);
      }
    }
  }
}

// ✅ 2. If no JID from context, check previous message's context
if (userJids.length === 0) {
  const history = this.getConversationHistory(from);
  if (history && history.length > 0) {
    for (let i = history.length - 1; i >= 0; i--) {
      const prevMsg = history[i];
      if (prevMsg.role === 'user' && prevMsg.jids && prevMsg.jids.length > 0) {
        for (const jid of prevMsg.jids) {
          const jidNumber = jid.split(/[:@]/)[0];
          if (jidNumber !== botNumber && jidNumber !== lidNumber) {
            if (!userJids.some(j => j === jid)) {
              userJids.push(jid);
              console.log(`📌 Using JID from history: ${jid}`);
            }
          }
        }
        break;
      }
    }
  }
}

// ✅ 3. ADD THE SENDER TO MENTIONS (use EXACT JID)
if (sender && !sender.includes(botNumber) && !sender.includes(lidNumber)) {
  const senderExists = userJids.some(j => j === sender);
  if (!senderExists) {
    userJids.push(sender);
    console.log(`📌 Adding sender to mentions: ${sender}`);
  }
}
      
      // Clean the text - remove ONLY bot mentions, KEEP user mentions
      let cleanText = text
        .replace(new RegExp(`@${botNumber}`, 'g'), '')
        .replace(new RegExp(`@${lidNumber}`, 'g'), '')
        .replace(/@ZUCA_Bot/gi, '')
        .replace(/@ZUCA Bot/gi, '')
        .replace(/ZUCA Bot/gi, '')
        .replace(/zuca bot/gi, '')
        .replace(/hey bot/gi, '')
        .replace(/hello bot/gi, '')
        .replace(/hi bot/gi, '')
        .replace(/@zuca/gi, '')
        .replace(new RegExp(botNumber, 'g'), '')
        .replace(new RegExp(lidNumber, 'g'), '')
        // ✅ KEEP user @mentions - DON'T remove them
        .replace(/\s+/g, ' ')
        .trim();
      
      const cleanForAI = cleanText;
      
      console.log(`📝 Original: "${text}"`);
      console.log(`📝 Clean text: "${cleanText}"`);
      console.log(`📝 For AI: "${cleanForAI}"`);
      console.log(`📌 Mentions found: ${userJids.length}`, userJids);
      
      if (!cleanForAI || cleanForAI.length < 2) {
        await this.sendToSpecificGroup(from, '🙏 How can I help you?\n\n💡 Try: "What\'s today\'s mass?" or "Show campaigns"');
        return;
      }
      
      console.log(`🤖 Sending to AI: "${cleanForAI}"`);
      
      // ✅ Get sender's name for AI context
      const senderName = msg.pushName || 'Someone';
      console.log(`👤 Sender name: ${senderName}`);
      
      // ✅ Pass sender name and JIDs to AI
      const aiResponse = await this.callAISystem(cleanForAI, from, userJids, senderName);
      
      if (aiResponse) {
        // ✅ Send with mentions (both mentioned user AND sender)
        await this.sendToSpecificGroup(from, aiResponse, msg, userJids);
      } else {
        await this.sendToSpecificGroup(from, '🙏 Sorry, I had trouble processing that. Please try again.');
      }
      
    } catch (error) {
      console.error('❌ AI mention error:', error);
      try {
        await this.sendToSpecificGroup(from, '🙏 Sorry, I had trouble processing that. Please try again.');
      } catch (e) {
        console.error('❌ Failed to send error response:', e.message);
      }
    }
  }// =============================================
// 🧠 CALL AI SYSTEM - WITH SENDER NAME
// =============================================
async callAISystem(message, from, mentionedJids = [], senderName = 'Someone') {
  try {
    const userContext = {
      user: { fullName: senderName },  // ← Pass sender name to AI
      stats: {},
      currentTime: new Date().toISOString(),
      source: 'whatsapp',
      mentionedJids: mentionedJids
    };
    
    const history = this.getConversationHistory(from);

    const messages = [
      {
        role: "system",
        content: "You are ZUCA Bot. Remember previous messages in this conversation and answer follow-up questions naturally."
      },
      ...history,
      {
        role: "user",
        content: message
      }
    ];
    
    const aiResponse = await chatWithGroq(messages, userContext);
    
    let finalReply = aiResponse.content || '';
    
    if (aiResponse.action && aiResponse.action.name) {
      console.log(`🔧 Executing action: ${aiResponse.action.name}`);
      
      try {
        const actionResult = await executeToolCall(
          aiResponse.action.name,
          aiResponse.action.arguments || {},
          { user: null, req: null }
        );
        
        console.log('📦 Action result:', JSON.stringify(actionResult, null, 2));
        
        if (actionResult) {
          if (actionResult.message) {
            finalReply = actionResult.message;
          } else {
            const formatted = this.formatActionResult(actionResult);
            if (formatted) {
              finalReply = formatted;
            }
          }
        }
      } catch (actionError) {
        console.error('❌ Action execution error:', actionError);
        finalReply = finalReply || '🙏 I tried to do that but encountered an issue. Please try again.';
      }
    }
    
    this.saveConversation(from, "user", message);
    this.saveConversation(from, "assistant", finalReply);

    return finalReply;
    
  } catch (error) {
    console.error('AI call error:', error);
    return null;
  }
}

  // =============================================
// 📝 FORMAT ACTION RESULTS FOR WHATSAPP
// =============================================
formatActionResult(actionResult) {
  if (!actionResult) return null;

    if (actionResult.message) {
    return actionResult.message;
  }
  
  if (actionResult.error) {
    return `❌ ${actionResult.error}`;
  }
  
  if (actionResult.profile) {
    const p = actionResult.profile;
    let reply = `👤 *${p.fullName}*\n\n`;
    reply += `📧 ${p.email}\n`;
    reply += `📱 ${p.phone || 'N/A'}\n`;
    reply += `🆔 ${p.membershipNumber || 'N/A'}\n`;
    reply += `🏠 ${p.jumuia || 'None'}\n`;
    reply += `💰 Paid: KES ${(actionResult.contributions?.totalPaid || 0).toLocaleString()}`;
    return reply;
  }
  
  if (actionResult.pledges) {
    let reply = `💰 *YOUR PLEDGES*\n\n`;
    actionResult.pledges.slice(0, 5).forEach((p, i) => {
      reply += `${i+1}. *${p.campaign}*\n`;
      reply += `   Paid: KES ${p.amountPaid.toLocaleString()}\n`;
      reply += `   Status: ${p.status}\n\n`;
    });
    if (actionResult.summary?.totalPaid) {
      reply += `📊 Total Paid: KES ${actionResult.summary.totalPaid.toLocaleString()}`;
    }
    return reply;
  }


  
  
  if (actionResult.massPrograms && actionResult.massPrograms.length > 0) {
    let reply = '⛪ *UPCOMING MASSES*\n\n';
    actionResult.massPrograms.slice(0, 5).forEach((m, i) => {
      const date = new Date(m.date);
      reply += `${i+1}. ${date.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })} — ${m.venue}\n`;
      if (m.time) reply += `   🕐 ${m.time}\n`;
    });
    return reply;
  }
  
  if (actionResult.announcements && actionResult.announcements.length > 0) {
    let reply = '📢 *ANNOUNCEMENTS*\n\n';
    actionResult.announcements.slice(0, 3).forEach(a => {
      reply += `*${a.title}*\n`;
      reply += `${(a.content || '').substring(0, 150)}${(a.content || '').length > 150 ? '...' : ''}\n\n`;
    });
    return reply;
  }
  
  if (actionResult.campaigns && actionResult.campaigns.length > 0) {
    let reply = '💰 *ACTIVE CAMPAIGNS*\n\n';
    actionResult.campaigns.forEach(c => {
      reply += `*${c.title}*\n`;
      reply += `🎯 Target: KES ${c.amountRequired?.toLocaleString()}\n`;
      if (c.totalRaised) reply += `💰 Raised: KES ${c.totalRaised.toLocaleString()}\n`;
      reply += `\n`;
    });
    return reply;
  }
  
  if (actionResult.readings) {
    const r = actionResult.readings;
    let reply = `📖 *READINGS FOR TODAY*\n\n`;
    reply += `📕 ${r.celebration || 'Today\'s Mass'}\n\n`;
    if (r.firstReading) reply += `📕 ${r.firstReading}\n\n`;
    if (r.gospel) reply += `✝️ ${r.gospel}\n`;
    return reply;
  }
  
  if (actionResult.helpText) {
    return actionResult.helpText;
  }
  
  if (actionResult.message) {
    return actionResult.message;
  }
  
  if (actionResult.success && actionResult.message) {
    return `✅ ${actionResult.message}`;
  }

  if (actionResult.title && actionResult.lyrics) {
    const lyrics = actionResult.lyrics.replace(/<[^>]*>/g, '').trim();
    const preview = lyrics.substring(0, 500);
    const isLong = lyrics.length > 500;
    return `🎵 *${actionResult.title}*${actionResult.reference ? ` (${actionResult.reference})` : ''}\n\n${preview}${isLong ? '\n\n📖 *Full lyrics available in the hymn book! at https://www.zetechcatholicaction.com/hymns*' : ''}`;
  }

  if (actionResult.hymns && actionResult.hymns.length > 0) {
    let reply = `🎵 *Hymns Found (${actionResult.count || actionResult.hymns.length}):*\n\n`;
    actionResult.hymns.slice(0, 10).forEach((h, i) => {
      reply += `${i+1}. *${h.title}*${h.reference ? ` (${h.reference})` : ''}${h.hasLyrics ? ' 📝' : ''}\n`;
    });
    if (actionResult.hymns.length > 10) {
      reply += `\n... and ${actionResult.hymns.length - 10} more`;
    }
    reply += `\n\n💡 Say *"Get lyrics for [title]"* to see full lyrics!`;
    return reply;
  }
  
  // ✅ Handle executive team response with proper hierarchy
if (actionResult.grouped && actionResult.total !== undefined) {
  let reply = "👔 *ZUCA EXECUTIVE TEAM*\n\n";
  
  // ✅ Proper hierarchical order based on your data
  const categoryOrder = [
    'leadership',     // Chairperson, Vice Chair, Secretary, Treasurer
    'Organisation',   // Organising Secretary, Welfare, Liturgist
    'choir',          // Choir Moderator
    'jumuia',         // All Jumuia Moderators
    'media',          // Media Moderator
    'voice'           // Voice Reps
  ];
  
  // Sort categories by the defined order
  const sortedCategories = Object.keys(actionResult.grouped).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a.toLowerCase());
    const indexB = categoryOrder.indexOf(b.toLowerCase());
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  for (const category of sortedCategories) {
    const members = actionResult.grouped[category] || [];
    if (members.length === 0) continue;
    
    // Format category name properly
    let displayName = category.charAt(0).toUpperCase() + category.slice(1);
    if (category.toLowerCase() === 'choir') displayName = 'CHOIR';
    else if (category.toLowerCase() === 'jumuia') displayName = 'JUMUIA MODERATORS';
    else if (category.toLowerCase() === 'voice') displayName = 'VOICE REPS';
    else if (category.toLowerCase() === 'media') displayName = 'MEDIA';
    
    reply += `*${displayName.toUpperCase()}*\n`;
    
    // Sort members by level within category
    const sortedMembers = [...members].sort((a, b) => {
      const levelMap = {
        'Chairperson': 1,
        'Vice Chairperson': 2,
        'Secretary': 3,
        'Vice Secretary': 4,
        'Treasurer': 5,
        'Organising Secretary': 6,
        'Welfare': 7,
        'Liturgist': 8,
        'Choir Moderator': 9,
        'St. Gregory Moderator': 10,
        'St. Peregrine Moderator': 11,
        'St. Benedict Moderator': 12,
        'St. Michael Moderator': 13,
        'Christ the King Moderator': 14,
        'St. Pacificus Moderator': 15,
        'instumentals': 16,
        'Media Moderator': 17,
        'SOPRANO Voice Rep': 18,
        'ALTO Voice Rep': 19,
        'TENOR Voice Rep': 20,
        'BASS Voice Rep': 21
      };
      const aLevel = levelMap[a.position] || 99;
      const bLevel = levelMap[b.position] || 99;
      return aLevel - bLevel;
    });
    
    sortedMembers.forEach(m => {
      reply += `  • *${m.position}*: ${m.name}\n`;
      if (m.phone && m.phone !== 'N/A') {
        reply += `    📱 ${m.phone}\n`;
      }
      if (m.email && m.email !== 'N/A') {
        reply += `    📧 ${m.email}\n`;
      }
    });
    reply += `\n`;
  }

  reply += `📌 Total: ${actionResult.total} active executives check full page at   https://www.zetechcatholicaction.com/executive`;
  return reply;
}
  
  return null;
}

  // =============================================
  // 📊 GET BOT STATUS
  // =============================================
  getStatus() {
    return {
      connected: this.isConnected,
      groupId: this.groupId,
      connectionStatus: this.connectionStatus,
      qrCode: this.qrCodeBase64 || null,
      qrRequired: this.connectionStatus === 'qr_required',
      ready: this.sock !== null && this.isConnected,
      lastError: this.lastError,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      botNumber: this.botNumber || null,
      lid: this.botLid || null,
      activeGroups: this.activeGroups,
      totalGroups: this.groups?.length || 0
    };
  }

  // =============================================
  // 📋 GET ALL GROUPS THE BOT IS IN
  // =============================================
async getGroups(forceRefresh = false) {
  // ✅ Return cached data if still valid (prevents rate limiting)
  if (!forceRefresh && this.groupsCache && this.groupsCacheTime) {
    const age = Date.now() - this.groupsCacheTime;
    if (age < this.groupsCacheTTL) {
      console.log(`📋 Returning cached groups (${Math.round(age/1000)}s old)`);
      return this.groupsCache;
    }
  }

  if (!this.sock || !this.isConnected) {
    console.log('⚠️ Bot not connected');
    return this.groupsCache || [];
  }

  try {
    console.log('🔄 Fetching fresh groups from WhatsApp...');
    const chats = await this.sock.groupFetchAllParticipating();
    if (!chats) {
      this.groupsCache = [];
      this.groupsCacheTime = Date.now();
      return [];
    }

    const groups = Object.values(chats).map(group => ({
      id: group.id,
      name: group.subject || 'Unnamed Group',
      description: group.desc || '',
      participants: group.participants?.length || 0,
      isActive: this.activeGroups?.includes(group.id) || false,
      owner: group.owner,
      createdAt: group.creation,
      isCommunity: group.isCommunity || false,
      isAnnouncement: group.announce || false
    }));

    this.groupsCache = groups;
    this.groupsCacheTime = Date.now();
    this.groups = groups;
    console.log(`📋 Found ${groups.length} groups (cached)`);
    return groups;

  } catch (error) {
    console.error('❌ Error fetching groups:', error.message);
    // ✅ Return cached data even if expired, rather than failing
    return this.groupsCache || [];
  }
}


// =============================================
// 📋 GET GROUPS WITH STATUS FROM DATABASE
// =============================================
async getGroupsWithStatus(forceRefresh = false) {
  const whatsappGroups = await this.getGroups(forceRefresh);
  
  const dbGroups = await prisma.whatsAppGroup.findMany();
  const statusMap = {};
  dbGroups.forEach(g => {
    statusMap[g.groupId] = {
      isActive: g.isActive,
      activatedAt: g.activatedAt,
      deactivatedAt: g.deactivatedAt,
      groupName: g.groupName,
      participants: g.participants
    };
  });

  return whatsappGroups.map(group => ({
    ...group,
    isActive: statusMap[group.id]?.isActive || false,
    activatedAt: statusMap[group.id]?.activatedAt || null,
    deactivatedAt: statusMap[group.id]?.deactivatedAt || null,
    dbGroupName: statusMap[group.id]?.groupName || null,
    dbParticipants: statusMap[group.id]?.participants || group.participants
  }));
}

// =============================================
// ➕ ADD/ACTIVATE GROUP (Database Persisted)
// =============================================
async addActiveGroup(groupId) {
  // Verify bot is in the group
  const groups = await this.getGroups();
  const group = groups.find(g => g.id === groupId);
  
  if (!group) {
    console.log(`❌ Bot is not in group: ${groupId}`);
    return false;
  }

  // Save to database
  await this.saveGroupToDatabase(groupId, true, group.name, group.participants);
  console.log(`✅ Group activated: ${groupId}`);
  return true;
}

// =============================================
// ➖ REMOVE/DEACTIVATE GROUP (Database Persisted)
// =============================================
async removeActiveGroup(groupId) {
  await this.saveGroupToDatabase(groupId, false);
  console.log(`🗑️ Group deactivated: ${groupId}`);
  return true;
}

  // =============================================
  // 📤 SEND TO GROUP BY NAME
  // =============================================
  async sendToGroupByName(groupName, message) {
    const groups = await this.getGroups();
    const group = groups.find(g => 
      g.name.toLowerCase() === groupName.toLowerCase()
    );
    
    if (!group) {
      throw new Error(`Group not found: ${groupName}`);
    }
    
    return await this.sendToSpecificGroup(group.id, message);
  }

  // =============================================
  // 📤 BROADCAST TO ALL ACTIVE GROUPS
  // =============================================
  async broadcastToAllGroups(message, excludeGroups = []) {
    if (!this.sock || !this.isConnected) {
      throw new Error('Bot is not connected to WhatsApp');
    }

    const results = [];
    const targetGroups = this.activeGroups?.filter(
      id => !excludeGroups.includes(id)
    ) || [];

    if (targetGroups.length === 0) {
      console.log('⚠️ No active groups to broadcast to');
      return [];
    }

    for (const groupId of targetGroups) {
      try {
        const result = await this.sendToSpecificGroup(groupId, message);
        results.push({ groupId, success: true, result });
        
        // ✅ Track broadcast message
        if (result && result.key && result.key.id) {
          await prisma.whatsAppMessage.create({
            data: {
              messageId: result.key.id,
              groupId: groupId,
              message: message,
              originalMessage: message,
              type: 'broadcast_group',
              status: 'sent',
              sentAt: new Date()
            }
          });
          console.log(`📝 Broadcast message tracked: ${result.key.id}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({ groupId, success: false, error: error.message });
      }
    }

    console.log(`📢 Broadcast sent to ${results.filter(r => r.success).length}/${targetGroups.length} groups`);
    return results;
  }

  // =============================================
  // 📊 GET GROUP STATS
  // =============================================
  async getGroupStats() {
    const groups = await this.getGroups();
    return {
      totalGroups: groups.length,
      activeGroups: this.activeGroups?.length || 0,
      activeGroupIds: this.activeGroups || [],
      groups: groups.map(g => ({
        name: g.name,
        id: g.id,
        isActive: this.activeGroups?.includes(g.id) || false,
        participants: g.participants,
        description: g.description
      }))
    };
  }

  // =============================================
  // 📤 SEND TO JUMUIA (by Jumuia name)
  // =============================================
  async sendToJumuia(jumuiaName, message) {
    const jumuiaMap = {
      'stmichael': 'ST. MICHAEL',
      'stbenedict': 'ST. BENEDICT',
      'stperegrine': 'ST. PEREGRINE',
      'christtheking': 'CHRIST THE KING',
      'stgregory': 'ST. GREGORY',
      'stpacificus': 'ST. PACIFICUS'
    };

    const groupName = jumuiaMap[jumuiaName.toLowerCase()];
    if (!groupName) {
      throw new Error(`Unknown Jumuia: ${jumuiaName}`);
    }

    return await this.sendToGroupByName(groupName, message);
  }

  // =============================================
  // 🔍 CHECK IF IN GROUP
  // =============================================
  async isInGroup(groupId) {
    const groups = await this.getGroups();
    return groups.some(g => g.id === groupId);
  }

  // =============================================
  // 📋 GET GROUP MEMBERS
  // =============================================
  async getGroupMembers(groupId) {
    if (!this.sock || !this.isConnected) {
      throw new Error('Bot is not connected');
    }

    try {
      const metadata = await this.sock.groupMetadata(groupId);
      return metadata.participants || [];
    } catch (error) {
      console.error('❌ Error getting group members:', error.message);
      return [];
    }
  }


  // =============================================
// ✏️ EDIT MESSAGE
// =============================================
async editMessage(groupId, messageId, newText) {
  if (!this.sock || !this.isConnected) {
    throw new Error('Bot is not connected to WhatsApp');
  }

  try {
    const result = await this.sock.sendMessage(groupId, {
      text: newText,
      edit: {
        remoteJid: groupId,
        fromMe: true,
        id: messageId
      }
    });
    console.log(`✅ Message ${messageId} edited successfully`);
    return result;
  } catch (error) {
    console.error('❌ Failed to edit message:', error.message);
    throw error;
  }
}

  // =============================================
  // 🔄 REFRESH GROUP LIST
  // =============================================
  async refreshGroups() {
    this.groups = null;
    return await this.getGroups();
  }

  // =============================================
  // 🔄 GENERATE NEW QR CODE
  // =============================================
  async generateNewQR() {
    try {
      if (this.sock) {
        await this.disconnect();
      }
      
      this.cleanupAuth();
      
      this.isConnected = false;
      this.isConnecting = false;
      this.qrCode = null;
      this.qrCodeBase64 = null;
      this.connectionStatus = 'disconnected';
      this.botNumber = null;
      this.botLid = null;
      this.groups = [];
      this.activeGroups = [];
      this.reconnectAttempts = 0;
      
      await this.connect();
      
      let attempts = 0;
      while (!this.qrCode && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      
      return this.qrCode;
    } catch (error) {
      console.error('❌ Generate QR error:', error);
      throw error;
    }
  }

  // =============================================
  // 🔄 RESET BOT
  // =============================================
  async resetBot() {
    try {
      console.log('🔄 Resetting WhatsApp bot...');
      
      await this.disconnect();
      this.cleanupAuth();
      
      this.isConnected = false;
      this.isConnecting = false;
      this.qrCode = null;
      this.qrCodeBase64 = null;
      this.connectionStatus = 'disconnected';
      this.botNumber = null;
      this.botLid = null;
      this.groups = [];
      this.activeGroups = [];
      this.reconnectAttempts = 0;
      this.lastError = null;
      this.sock = null;
      
      await prisma.setting.deleteMany({
        where: { 
          key: { 
            in: ['whatsapp_status', 'whatsapp_group_id'] 
          } 
        }
      });
      
      // ✅ Also clear WhatsApp auth from database
      if (this.useDatabaseAuth) {
        await prisma.WhatsAppAuth.deleteMany({
          where: { key: 'whatsapp_creds' }
        });
        console.log('🗑️ WhatsApp auth cleared from database');
      }
      
      console.log('✅ Bot reset complete');
      return true;
    } catch (error) {
      console.error('❌ Reset error:', error);
      return false;
    }
  }

  // =============================================
// 💾 SAVE CONVERSATION
// =============================================
saveConversation(chatId, role, content) {
  if (!this.chatMemory.has(chatId)) {
    this.chatMemory.set(chatId, []);
  }

  const history = this.chatMemory.get(chatId);

  history.push({
    role,
    content
  });

  if (history.length > this.maxMemoryMessages) {
    history.splice(0, history.length - this.maxMemoryMessages);
  }
}

// =============================================
// 📚 GET CONVERSATION HISTORY
// =============================================
getConversationHistory(chatId) {
  return this.chatMemory.get(chatId) || [];
}

  // =============================================
  // 🧹 CLEANUP
  // =============================================
  async cleanup() {
    await this.disconnect();
    this.cleanupAuth();
    this.connectionStatus = 'disconnected';
    await this.updateStatus('disconnected');
    this.groups = [];
    this.activeGroups = [];
  }
}




module.exports = new WhatsAppBot();