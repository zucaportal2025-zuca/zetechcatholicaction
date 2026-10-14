// ================== DEEPSEEK AI ROUTES ==================
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const jwt = require("jsonwebtoken");

const { chatWithGroq } = require("../services/deepseek/deepseekClient");
const { executeToolCall } = require("../services/deepseek/toolHandlers");

const JWT_SECRET = process.env.JWT_SECRET || "zuca_super_secret_key";
const { sendPersonalizedEmail } = require("../services/mailer");

// Conversation store (in-memory — resets on server restart)
const conversations = new Map();

// Clean old conversations every hour
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [key, conv] of conversations) {
    if (conv.lastActive < oneHourAgo) {
      conversations.delete(key);
    }
  }
}, 60 * 60 * 1000);

/**
 * Auth middleware for AI routes
 */
function authenticateAI(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    req.user = null;
    next();
  }
}

/**
 * Build user context object for the AI
 */
async function buildUserContext(userId) {
  if (!userId) {
    return { user: null, stats: {}, currentTime: new Date().toISOString() };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { homeJumuia: true }
    });

    if (!user) {
      return { user: null, stats: {}, currentTime: new Date().toISOString() };
    }

    const [unreadCount, activePledges] = await Promise.all([
      prisma.notification.count({ where: { userId, read: false } }),
      prisma.pledge.count({ where: { userId, status: { not: "COMPLETED" } } })
    ]);

    return {
      user: {
        fullName: user.fullName,
        role: user.role,
        specialRole: user.specialRole,
        homeJumuia: user.homeJumuia,
        membership_number: user.membership_number,
        email: user.email,
        phone: user.phone
      },
      stats: { unreadNotifications: unreadCount, activePledges },
      currentTime: new Date().toISOString()
    };
  } catch (error) {
    console.error("Error building user context:", error);
    return { user: null, stats: {}, currentTime: new Date().toISOString() };
  }
}

/**
 * Format action result into a readable reply
 */
function formatActionResult(actionResult) {
  if (!actionResult) return null;

  // Error
  if (actionResult.error) {
    return `❌ ${actionResult.error}`;
  }

// User list (with safety check)
if (actionResult.users && Array.isArray(actionResult.users)) {
  let reply = `**👥 Users (${actionResult.count || actionResult.users.length}):**\n\n`;
  actionResult.users.forEach((u, i) => {
    reply += `**${i + 1}. ${u.fullName}** — ${u.email}\n   Role: ${u.role}${u.specialRole ? ` (${u.specialRole})` : ''} | ID: ${u.membership_number || 'N/A'}\n\n`;
  });
  return reply;
}

  // Single user
  if (actionResult.user) {
    const u = actionResult.user;
    return `**👤 User Found:**\n\n📛 **Name:** ${u.fullName}\n📧 **Email:** ${u.email}\n📱 **Phone:** ${u.phone || 'N/A'}\n🆔 **Membership:** ${u.membership || 'N/A'}\n👔 **Role:** ${u.role}${u.specialRole ? ` (${u.specialRole})` : ''}\n🏠 **Jumuia:** ${u.jumuia || 'None'}\n💰 **Total Paid:** KES ${(u.totalPaid || 0).toLocaleString()}`;
  }

  // Jumuia list
  if (actionResult.jumuia) {
    let reply = `**🏠 Jumuia Groups:**\n\n`;
    actionResult.jumuia.forEach(j => {
      reply += `• **${j.name}** (${j.code}) — ${j.memberCount} members\n`;
    });
    return reply;
  }

  // Profile
  if (actionResult.profile) {
    const p = actionResult.profile;
    return `**👤 Your Profile:**\n\n📛 **Name:** ${p.fullName}\n📧 **Email:** ${p.email}\n📱 **Phone:** ${p.phone}\n🆔 **Membership:** ${p.membershipNumber || 'N/A'}\n👔 **Role:** ${p.role}${p.specialRole ? ` (${p.specialRole})` : ''}\n🏠 **Jumuia:** ${p.jumuia}\n💰 **Total Paid:** KES ${(actionResult.contributions?.totalPaid || 0).toLocaleString()}\n⏳ **Pending:** KES ${(actionResult.contributions?.totalPending || 0).toLocaleString()}`;
  }

  // Pledges
  if (actionResult.pledges) {
    let reply = `**💰 Your Pledges:**\n\n`;
    actionResult.pledges.forEach(p => {
      reply += `• **${p.campaign}** — Paid: KES ${p.amountPaid.toLocaleString()} | Pending: KES ${p.pendingAmount.toLocaleString()} | Status: ${p.status}\n`;
    });
    reply += `\n**Total Paid:** KES ${actionResult.summary?.totalPaid?.toLocaleString() || 0}\n**Total Pending:** KES ${actionResult.summary?.totalPending?.toLocaleString() || 0}`;
    return reply;
  }

  // Masses
   // Masses & Events (from both MassProgram and ScheduleEvent)
  if (actionResult.massPrograms !== undefined || actionResult.scheduleEvents !== undefined) {
    let reply = `**⛪ Upcoming Masses & Events:**\n\n`;
    
    // Show next event prominently
    if (actionResult.nextEvent) {
      const nextDate = new Date(actionResult.nextEvent.date);
      const dayName = nextDate.toLocaleDateString('en-KE', { weekday: 'long' });
      const dateStr = nextDate.toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });
      reply += `### 🔜 Next: **${actionResult.nextEvent.title}**\n`;
      reply += `📅 **${dayName}, ${dateStr}** at **${actionResult.nextEvent.time}**\n\n`;
    }
    
    // Schedule Events
    if (actionResult.scheduleEvents?.length > 0) {
      reply += `**📅 From Semester Schedule:**\n`;
      actionResult.scheduleEvents.forEach((e, i) => {
        const date = new Date(e.date);
        const dayName = date.toLocaleDateString('en-KE', { weekday: 'short' });
        const dateStr = date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
        reply += `${i + 1}. **${e.title}** — ${dayName} ${dateStr} at ${e.time} 📍 ${e.location}\n`;
      });
      reply += `\n`;
    }
    
    // Mass Programs
    if (actionResult.massPrograms?.length > 0) {
      reply += `**📋 Mass Programs:**\n`;
      actionResult.massPrograms.forEach((m, i) => {
        const date = new Date(m.date);
        reply += `${i + 1}. ${date.toLocaleDateString('en-KE', { weekday: 'long', month: 'long', day: 'numeric' })} — ${m.venue}\n`;
        if (m.songs?.length) reply += `   🎵 ${m.songs.join(', ')}\n`;
      });
    }
    
    if (!actionResult.massPrograms?.length && !actionResult.scheduleEvents?.length) {
      reply += `No upcoming masses or events found.`;
    }
    
    return reply;
  }

  // Hymns
  if (actionResult.hymns) {
    let reply = `**🎵 Hymns Found (${actionResult.count}):**\n\n`;
    actionResult.hymns.forEach(h => {
      reply += `• **${h.title}** ${h.reference ? `(${h.reference})` : ''}\n`;
    });
    return reply;
  }

  // Hymn lyrics (navigate)
  if (actionResult.action === "navigate" && actionResult.path?.startsWith("/hymn/")) {
    return `🎵 **${actionResult.title}**\n\n${actionResult.lyrics?.substring(0, 500) || 'Loading lyrics...'}\n\n📖 *Opening full hymn...*`;
  }

  // Announcements
  if (actionResult.announcements) {
    let reply = `**📢 Announcements:**\n\n`;
    actionResult.announcements.forEach(a => {
      reply += `• **${a.title}** (${a.category}) — ${new Date(a.createdAt).toLocaleDateString()}\n  ${a.content?.substring(0, 100)}...\n\n`;
    });
    return reply;
  }

  // Executive team
  if (actionResult.executives) {
    let reply = `**👑 Executive Team (${actionResult.total}):**\n\n`;
    Object.entries(actionResult.executives).forEach(([category, members]) => {
      reply += `**${category.toUpperCase()}:**\n`;
      members.forEach(m => {
        reply += `• ${m.name} — ${m.position}\n`;
      });
      reply += `\n`;
    });
    return reply;
  }

  // Campaigns
  if (actionResult.campaigns) {
    let reply = `**💰 Active Campaigns:**\n\n`;
    actionResult.campaigns.forEach(c => {
      reply += `• **${c.title}** — Target: KES ${c.amountRequired?.toLocaleString()} | Pledges: ${c.totalPledges}\n`;
    });
    return reply;
  }

  // System stats
  if (actionResult.stats) {
    const s = actionResult.stats;
    return `**📊 Platform Overview:**\n\n👥 Users: ${s.users}\n📢 Announcements: ${s.announcements}\n💰 Campaigns: ${s.campaigns}\n💬 Messages: ${s.messages}\n📸 Media: ${s.media}\n🎵 Hymns: ${s.hymns}\n🏠 Jumuia: ${s.jumuia}\n💵 Total Raised: KES ${(s.totalRaised || 0).toLocaleString()}`;
  }

  // Notifications
  if (actionResult.notifications) {
    let reply = `**🔔 Notifications (${actionResult.unreadCount} unread):**\n\n`;
    actionResult.notifications.forEach(n => {
      reply += `• **${n.title}** — ${n.message}\n  ${new Date(n.createdAt).toLocaleString()}\n\n`;
    });
    return reply;
  }


  // ==================== PLEDGE STATS ====================
if (actionResult.totalRaised !== undefined || actionResult.totalPledges !== undefined) {
  let reply = `💰 **PLEDGE STATISTICS**\n\n`;
  reply += `📊 Total Pledges: ${actionResult.totalPledges || 0}\n`;
  reply += `💵 Total Raised: KES ${(actionResult.totalRaised || 0).toLocaleString()}\n`;
  reply += `✅ Completed: ${actionResult.completedCount || 0}\n`;
  reply += `⏳ Pending: ${actionResult.pendingCount || 0}\n\n`;
  
  // By Campaign
  if (actionResult.byCampaign && Object.keys(actionResult.byCampaign).length > 0) {
    reply += `**📌 By Campaign:**\n`;
    for (const [campaign, amount] of Object.entries(actionResult.byCampaign)) {
      if (amount > 0) {
        reply += `  • ${campaign}: KES ${amount.toLocaleString()}\n`;
      }
    }
  }
  
  // By Jumuia
  if (actionResult.byJumuia && Object.keys(actionResult.byJumuia).length > 0) {
    reply += `\n**🏠 By Jumuia:**\n`;
    for (const [jumuia, amount] of Object.entries(actionResult.byJumuia)) {
      if (amount > 0) {
        reply += `  • ${jumuia}: KES ${amount.toLocaleString()}\n`;
      }
    }
  }
  
  return reply;
}

  // Schedule list
  if (actionResult.schedules) {
    let reply = `**📋 Schedules:**\n\n`;
    actionResult.schedules.forEach(s => {
      reply += `• **${s.title}** — ${s.eventCount} events — ${s.isPublished ? '✅ Published' : '📝 Draft'}\n`;
    });
    return reply;
  }

  // Help text
  if (actionResult.helpText) {
    return actionResult.helpText;
  }

  // Simple success message
  if (actionResult.success && actionResult.message) {
    return `✅ ${actionResult.message}`;
  }

  // Web search results
  if (actionResult.results) {
    let reply = `**🌐 Search Results for "${actionResult.query}":**\n\n`;
    actionResult.results.forEach((r, i) => {
      reply += `**${i + 1}. ${r.title}**\n${r.snippet}\n🔗 ${r.url}\n\n`;
    });
    return reply;
  }


   // Liturgical Calendar
  if (actionResult.days) {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    let reply = `**📅 Liturgical Calendar — ${monthNames[actionResult.month - 1]} ${actionResult.year}**\n\n`;
    
    // Group by week
    let currentWeek = "";
    actionResult.days.forEach(d => {
      const date = new Date(d.date);
      const dayName = date.toLocaleDateString('en-KE', { weekday: 'short' });
      const dayNum = date.getDate();
      
      // Highlight Sundays and special feasts
      const isSunday = dayName === "Sun" || d.celebration?.includes("Sunday");
      const isSpecial = d.celebration?.includes("Pentecost") || d.celebration?.includes("Ascension") || d.celebration?.includes("Trinity");
      
      const prefix = isSpecial ? "🔥 " : isSunday ? "✝️ " : "• ";
      reply += `${prefix}**${dayName} ${dayNum}** — ${d.celebration} (${d.color})\n`;
    });
    
    return reply;
  }


    // Today's/Tomorrow's Readings
  if (actionResult.date && (actionResult.readings || actionResult.celebration)) {
    const date = new Date(actionResult.date);
    const dayName = date.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    
    let reply = `**📖 Readings for ${dayName}**\n\n`;
    reply += `**${actionResult.celebration}**\n`;
    reply += `🟡 Season: ${actionResult.seasonName} | 🎨 Color: ${actionResult.color}\n\n`;
    
    if (actionResult.readings) {
      const r = actionResult.readings;
      
      if (r.firstReading?.citation) {
        const text = (r.firstReading.text || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().substring(0, 300);
        reply += `**First Reading:** *${r.firstReading.citation}*\n${text}\n\n`;
      }
      
      if (r.responsorialPsalm?.citation) {
        const text = (r.responsorialPsalm.text || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().substring(0, 300);
        reply += `**Psalm:** *${r.responsorialPsalm.citation}*\n${text}\n\n`;
      }
      
      if (r.secondReading?.citation) {
        const text = (r.secondReading.text || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().substring(0, 300);
        reply += `**Second Reading:** *${r.secondReading.citation}*\n${text}\n\n`;
      }
      
      if (r.gospel?.citation) {
  const text = (r.gospel.text || '')
    .replace(/<[^>]+>/g, '')           // Remove ALL HTML tags
    .replace(/&[^;]+;/g, '')           // Remove HTML entities
    .replace(/john\/\d+\?\d+\s*"/gi, '') // Remove "john/10?27 ">"
    .replace(/R\.\s*Alleluia[^.]*\./gi, '') // Remove Alleluia responses
    .replace(/En Español.*$/gi, '')     // Remove footer
    .replace(/View Calendar.*$/gi, '')  // Remove footer
    .replace(/Get Daily Readings.*$/gi, '') // Remove footer
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .substring(0, 500);
  reply += `**✝️ Gospel:** *${r.gospel.citation}*\n${text}\n`;
}
    }
    
    return reply;
  }


  // Fallback: return JSON
  return JSON.stringify(actionResult, null, 2);
}

 

/**
 * POST /api/deepseek/chat
 */
router.post("/deepseek/chat", authenticateAI, async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    const userId = req.user?.userId || null;

    if (!message || message.trim() === "") {
      return res.status(400).json({ error: "Message is required" });
    }

    console.log(`🤖 AI: "${message.substring(0, 80)}${message.length > 80 ? '...' : ''}" | User: ${userId || 'guest'}`);

    const convId = conversationId || userId || "guest";
    if (!conversations.has(convId)) {
      conversations.set(convId, { messages: [], lastActive: Date.now() });
    }

    const conversation = conversations.get(convId);
    conversation.lastActive = Date.now();

   const userContext = await buildUserContext(userId);
userContext.query = message; // Pass the user's question to the AI

    conversation.messages.push({ role: "user", content: message });
    if (conversation.messages.length > 20) {
      conversation.messages = conversation.messages.slice(-20);
    }

    // Send to Groq AI
    const aiResponse = await chatWithGroq(conversation.messages, userContext);

    // Execute action if AI requested one
    let actionResult = null;
    let finalReply = aiResponse.content || "";

    if (aiResponse.action && aiResponse.action.name) {
      console.log(`🔧 Executing: ${aiResponse.action.name}`, aiResponse.action.arguments || {});

      try {
        actionResult = await executeToolCall(
          aiResponse.action.name,
          aiResponse.action.arguments || {},
          {
            user: req.user ? { userId: req.user.userId, fullName: userContext.user?.fullName } : null,
            req
          }
        );
        console.log(`✅ Result: ${JSON.stringify(actionResult).substring(0, 200)}`);
      } catch (err) {
        console.error(`❌ Action failed: ${aiResponse.action.name}`, err.message);
        actionResult = { error: err.message };
      }

      // Format the result
      const formattedResult = formatActionResult(actionResult);
      if (formattedResult) {
        finalReply = formattedResult;
      }
    }

        // Send email/push for successful actions that create/approve things
    if (actionResult && actionResult.success && req.user?.userId) {
      const actionName = aiResponse.action.name;
      const args = aiResponse.action.arguments || {};
      
      // Map of actions that should trigger emails
      const shouldNotify = [
        "create_campaign", "create_announcement", "assign_executive",
        "approve_all_pledges", "approve_user_pledge", "approve_pledge",
        "send_bulk_email", "send_email", "post_announcement", "broadcast"
      ].includes(actionName);

      if (shouldNotify) {
        try {
          const adminUser = await prisma.user.findUnique({ where: { id: req.user.userId } });
          if (adminUser?.email) {
            await sendPersonalizedEmail(
              adminUser,
              actionName,
              actionResult.message || "Action completed",
              actionResult.message || "Action processed successfully",
              {}
            );
            console.log(`📧 Email sent to ${adminUser.email} for ${actionName}`);
          }
        } catch (emailErr) {
          console.error("Email failed:", emailErr.message);
        }
      }
    }

    // Build navigation action
    let navigationAction = null;
    if (actionResult && actionResult.action === "navigate" && actionResult.path) {
      navigationAction = {
        action: "navigate",
        path: actionResult.path,
        message: actionResult.message || finalReply
      };
    }

    // Add to conversation history
    conversation.messages.push({ role: "assistant", content: finalReply });

    res.json({
      success: true,
      reply: finalReply,
      action: navigationAction,
      conversationId: convId
    });

  } catch (error) {
    console.error("❌ AI Chat Error:", error.message);
    res.status(500).json({
      success: false,
      error: "AI service temporarily unavailable.",
      reply: " I'm having trouble. Please try again."
    });
  }
});

/**
 * POST /api/deepseek/clear-conversation
 */
router.post("/deepseek/clear-conversation", authenticateAI, async (req, res) => {
  const userId = req.user?.userId || "guest";
  conversations.delete(userId);
  res.json({ success: true, message: "Conversation cleared." });
});

/**
 * GET /api/deepseek/health
 */
router.get("/deepseek/health", async (req, res) => {
  try {
    const testMessages = [
      { role: "user", content: "Say 'ZUCA AI is online! Tumsifu Yesu Kristu!'" }
    ];
    const response = await chatWithGroq(testMessages, { user: null, stats: {}, currentTime: new Date().toISOString() });

    res.json({
      success: true,
      status: "online",
      reply: response.content,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      success: false,
      status: "offline",
      error: error.message
    });
  }
});

module.exports = router;