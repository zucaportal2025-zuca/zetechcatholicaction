const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Store io instance globally
let ioInstance = null;

/**
 * Set the Socket.io instance
 */
function setIo(io) {
  ioInstance = io;
}

/**
 * Process incoming Brevo webhook events
 */
async function handleBrevoWebhook(payload) {
  try {
    console.log('📨 Brevo webhook received:', {
      event: payload.event,
      email: payload.email,
      tag: payload.tag,
      'message-id': payload['message-id']
    });

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: payload.email }
    });

    if (!user) {
      console.log(`⚠️ User not found for email: ${payload.email}`);
      // Still log the webhook
      const log = await prisma.emailWebhookLog.create({
        data: {
          userId: 'unknown',
          eventType: payload.event || 'unknown',
          email: payload.email,
          messageId: payload['message-id'] || null,
          subject: payload.subject || null,
          tag: payload.tag || null,
          rawPayload: payload
        }
      });
      
      // Emit real-time event even for unknown users
      emitRealTimeEvent({
        ...payload,
        userId: 'unknown',
        userName: 'Unknown User',
        logId: log.id
      });
      
      return { success: true, message: 'User not found, but webhook logged' };
    }

    // Store the raw webhook data
    const log = await prisma.emailWebhookLog.create({
      data: {
        userId: user.id,
        eventType: payload.event || 'unknown',
        email: payload.email,
        messageId: payload['message-id'] || null,
        subject: payload.subject || null,
        tag: payload.tag || null,
        rawPayload: payload
      }
    });

    // Handle different event types
    let eventMessage = '';
    let eventIcon = '📨';
    
    switch(payload.event) {
      case 'delivered':
        eventMessage = `✅ Email delivered to ${user.fullName}`;
        eventIcon = '✅';
        console.log(eventMessage);
        break;

      case 'opened':
        eventMessage = `👁️ ${user.fullName} opened email: ${payload.subject}`;
        eventIcon = '👁️';
        console.log(eventMessage);
        break;

      case 'clicked':
        eventMessage = `🔗 ${user.fullName} clicked: ${payload.link}`;
        eventIcon = '🔗';
        console.log(eventMessage);
        break;

      case 'hard_bounce':
        eventMessage = `❌ Hard bounce for ${user.email}: ${payload.reason}`;
        eventIcon = '❌';
        console.log(eventMessage);
        break;

      case 'soft_bounce':
        eventMessage = `⚠️ Soft bounce for ${user.email}: ${payload.reason}`;
        eventIcon = '⚠️';
        console.log(eventMessage);
        break;

      case 'unsubscribe':
        eventMessage = `🛑 ${user.email} unsubscribed from all emails`;
        eventIcon = '🛑';
        console.log(eventMessage);
        break;

      case 'complaint':
        eventMessage = `🚫 Spam complaint from ${user.email}`;
        eventIcon = '🚫';
        console.log(eventMessage);
        break;

      default:
        eventMessage = `ℹ️ ${payload.event} from ${user.email}`;
        eventIcon = 'ℹ️';
        console.log(eventMessage);
    }

    // 🔥 EMIT REAL-TIME EVENT TO ALL CONNECTED CLIENTS
    emitRealTimeEvent({
      id: log.id,
      eventType: payload.event,
      email: payload.email,
      subject: payload.subject || 'No subject',
      userName: user.fullName,
      userId: user.id,
      createdAt: new Date(),
      icon: eventIcon,
      message: eventMessage,
      raw: payload
    });

    return { success: true };

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Emit real-time event via Socket.io
 */
function emitRealTimeEvent(data) {
  if (ioInstance) {
    ioInstance.emit('new_email_event', data);
    console.log(`📡 Real-time event emitted to ${ioInstance.engine.clientsCount} clients`);
  } else {
    console.log('⚠️ Socket.io not initialized, event not emitted');
  }
}

module.exports = { 
  handleBrevoWebhook,
  setIo
};