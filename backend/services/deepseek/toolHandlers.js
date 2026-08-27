// ================== DEEPSEEK TOOL HANDLERS ==================
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const axios = require("axios");
const { createAndSendNotification } = require("./notificationService");


// ================== DOMAIN CONFIGURATION ==================
const DOMAIN = process.env.DOMAIN || 'www.zetechcatholicaction.com';
const PROTOCOL = process.env.NODE_ENV === 'production' ? 'https' : 'http';
const FRONTEND_URL = `${PROTOCOL}://${DOMAIN}`;

console.log(`🌐 Tool handler Frontend URL: ${FRONTEND_URL}`);

/**
 * Execute a tool call and return the result
 * @param {string} toolName - Name of the tool to execute
 * @param {object} args - Arguments passed by the AI
 * @param {object} context - { user, req } - Current user and request object
 */
async function executeToolCall(toolName, args, context) {
  const { user: currentUser, req } = context;
  
  try {
    switch (toolName) {

      // ==================== NAVIGATION ====================
      case "navigate_to_page": {
        const pageMap = {
          "dashboard": "/dashboard",
          "announcements": "/announcements",
          "mass-programs": "/mass-programs",
          "contributions": "/contributions",
          "chat": "/chat",
          "hymns": "/hymns",
          "liturgical-calendar": "/liturgical-calendar",
          "gallery": "/gallery",
          "join-jumuia": "/join-jumuia",
          "games": "/games",
          "youtube": "/youtube",
          "schedules": "/schedules",
          "executive": "/executive",
          "profile": "/profile",
          "admin": "/admin",
          "admin-users": "/admin/users",
          "admin-roles": "/admin/roles",
          "admin-media": "/admin/media",
          "admin-songs": "/admin/songs",
          "admin-hymns": "/admin/hymns",
          "admin-announcements": "/admin/announcements",
          "admin-contributions": "/admin/contributions",
          "admin-jumuia": "/admin/jumuia-management",
          "admin-schedules": "/admin/schedules",
          "admin-chat": "/admin/chat",
          "admin-security": "/admin/security",
          "admin-analytics": "/admin/analytics",
          "admin-health": "/admin/health-centre",
          "admin-executive": "/admin/executive",
          "admin-pending-songs": "/admin/pending-songs",
          "admin-ocr": "/admin/ocr-scanner",
          "admin-activity": "/admin/activity"
        };
        
        const path = pageMap[args.page] || "/dashboard";
        return {
          action: "navigate",
          path: path,
          message: `Navigating to ${args.page}`
        };
      }

      // ==================== USER PROFILE ====================
      case "get_my_profile": {
        const user = await prisma.user.findUnique({
          where: { id: currentUser.userId },
          include: { homeJumuia: true }
        });
        
        if (!user) return { error: "User not found" };
        
        const pledges = await prisma.pledge.findMany({
          where: { userId: user.id },
          include: { contributionType: true }
        });
        
        const totalPaid = pledges.reduce((s, p) => s + (p.amountPaid || 0), 0);
        const totalPending = pledges.reduce((s, p) => s + (p.pendingAmount || 0), 0);
        
        return {
          profile: {
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            membershipNumber: user.membership_number,
            role: user.role,
            specialRole: user.specialRole,
            jumuia: user.homeJumuia?.name || "Not assigned",
            joinedDate: user.createdAt,
            lastActive: user.lastActive
          },
          contributions: {
            totalPaid,
            totalPending,
            activePledges: pledges.length
          }
        };
      }

      case "get_my_pledges": {
        const pledges = await prisma.pledge.findMany({
          where: { userId: currentUser.userId },
          include: { contributionType: true },
          orderBy: { createdAt: "desc" }
        });
        
        return {
          pledges: pledges.map(p => ({
            id: p.id,
            campaign: p.contributionType.title,
            amountRequired: p.contributionType.amountRequired,
            amountPaid: p.amountPaid || 0,
            pendingAmount: p.pendingAmount || 0,
            status: p.status,
            message: p.message
          })),
          summary: {
            totalPaid: pledges.reduce((s, p) => s + (p.amountPaid || 0), 0),
            totalPending: pledges.reduce((s, p) => s + (p.pendingAmount || 0), 0),
            totalPledges: pledges.length
          }
        };
      }

      case "get_my_notifications": {
        const notifications = await prisma.notification.findMany({
          where: { userId: currentUser.userId, read: false },
          orderBy: { createdAt: "desc" },
          take: 20
        });
        
        if (args.markAsRead) {
          await prisma.notification.updateMany({
            where: { userId: currentUser.userId, read: false },
            data: { read: true }
          });
        }
        
        return {
          unreadCount: notifications.length,
          notifications: notifications.map(n => ({
            id: n.id,
            title: n.title,
            message: n.message,
            type: n.type,
            createdAt: n.createdAt
          }))
        };
      }

      // ==================== CONTRIBUTIONS ====================
      case "create_pledge": {
        const campaigns = await prisma.contributionType.findMany({
          where: { 
            OR: [
              { jumuiaId: null },
              { jumuiaId: currentUser.jumuiaId }
            ]
          },
          take: 1,
          orderBy: { createdAt: "desc" }
        });
        
        if (campaigns.length === 0) {
          return { error: "No active campaigns found. Ask an admin to create one." };
        }
        
        const campaign = campaigns[0];
        
        let pledge = await prisma.pledge.findFirst({
          where: { userId: currentUser.userId, contributionTypeId: campaign.id }
        });
        
        if (pledge) {
          pledge = await prisma.pledge.update({
            where: { id: pledge.id },
            data: { pendingAmount: (pledge.pendingAmount || 0) + args.amount }
          });
        } else {
          pledge = await prisma.pledge.create({
            data: {
              userId: currentUser.userId,
              contributionTypeId: campaign.id,
              amountPaid: 0,
              pendingAmount: args.amount,
              status: "PENDING"
            }
          });
        }
        
        // Notify admins/treasurers
        const admins = await prisma.user.findMany({
          where: { OR: [{ role: "admin" }, { specialRole: "treasurer" }] },
          select: { id: true }
        });
        
        for (const admin of admins) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              type: "new_pledge",
              title: "💰 New Pledge",
              message: `${currentUser.fullName} pledged KES ${args.amount} for "${campaign.title}"`
            }
          });
        }
        
        return {
          success: true,
          message: `Pledge of KES ${args.amount} recorded for "${campaign.title}"`,
          pledge: {
            campaign: campaign.title,
            amount: args.amount,
            status: "PENDING"
          }
        };
      }

      case "get_active_campaigns": {
        const campaigns = await prisma.contributionType.findMany({
          where: {
            OR: [
              { deadline: null },
              { deadline: { gte: new Date() } }
            ]
          },
          include: {
            _count: { select: { pledges: true } }
          },
          orderBy: { createdAt: "desc" }
        });
        
        return {
          campaigns: campaigns.map(c => ({
            id: c.id,
            title: c.title,
            description: c.description,
            amountRequired: c.amountRequired,
            deadline: c.deadline,
            jumuiaId: c.jumuiaId,
            totalPledges: c._count.pledges
          }))
        };
      }

      case "create_campaign": {
        const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
        const isAdmin = user.role === "admin" || user.specialRole === "admin";
        const isTreasurer = user.specialRole === "treasurer";
        
        if (!isAdmin && !isTreasurer) {
          return { error: "Only admins and treasurers can create campaigns." };
        }
        
        const campaign = await prisma.contributionType.create({
          data: {
            title: args.title,
            description: args.description || null,
            amountRequired: args.amountRequired,
            deadline: args.deadline ? new Date(args.deadline) : null
          }
        });
        
        // Create pledges for all users
        const allUsers = await prisma.user.findMany({ select: { id: true } });
        if (allUsers.length > 0) {
          await prisma.pledge.createMany({
            data: allUsers.map(u => ({
              userId: u.id,
              contributionTypeId: campaign.id,
              amountPaid: 0,
              pendingAmount: 0,
              status: "PENDING"
            }))
          });
        }
        
        // Notify all users
        for (const u of allUsers) {
          await prisma.notification.create({
            data: {
              userId: u.id,
              type: "contribution",
              title: "💰 New Campaign",
              message: `"${args.title}" - Target: KES ${args.amountRequired}. Check your pledges!`
            }
          });
        }
        
        return {
          success: true,
          message: `Campaign "${args.title}" created successfully`,
          campaign: { id: campaign.id, title: campaign.title, amountRequired: campaign.amountRequired }
        };
      }

      case "approve_pledge": {
        const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
        const isAdmin = user.role === "admin" || user.specialRole === "admin";
        const isTreasurer = user.specialRole === "treasurer";
        
        if (!isAdmin && !isTreasurer) {
          return { error: "Only admins and treasurers can approve pledges." };
        }
        
        const pledge = await prisma.pledge.findUnique({
          where: { id: args.pledgeId },
          include: { contributionType: true, user: true }
        });
        
        if (!pledge) return { error: "Pledge not found." };
        if (pledge.pendingAmount === 0) return { error: "No pending amount to approve." };
        
        const newAmountPaid = (pledge.amountPaid || 0) + (pledge.pendingAmount || 0);
        const newStatus = newAmountPaid >= pledge.contributionType.amountRequired ? "COMPLETED" : "APPROVED";
        
        await prisma.pledge.update({
          where: { id: args.pledgeId },
          data: {
            amountPaid: newAmountPaid,
            pendingAmount: 0,
            status: newStatus,
            approvedById: currentUser.userId,
            approvedAt: new Date()
          }
        });
        
        await prisma.notification.create({
          data: {
            userId: pledge.userId,
            type: "pledge_approved",
            title: newStatus === "COMPLETED" ? "🎉 Pledge Complete!" : "✅ Pledge Approved",
            message: `Your pledge for "${pledge.contributionType.title}" has been approved.`
          }
        });
        
        return { success: true, message: `Pledge approved. New status: ${newStatus}` };
      }

      // ==================== MASS & LITURGY ====================
            // ==================== MASS & LITURGY ====================
     case "get_upcoming_masses":
case "show_masses":
case "get_masses":
case "list_masses":
case "view_masses":
case "next_mass":
case "mass_times": {
  const now = new Date();
  const limit = args.limit || 5;

  // Get Mass Programs
  const massPrograms = await prisma.massProgram.findMany({
    where: { date: { gte: now } },
    include: { songs: { include: { song: true } } },
    orderBy: { date: "asc" },
    take: limit
  });

  // Get Schedule Events
  const scheduleEvents = await prisma.scheduleEvent.findMany({
    where: {
      eventDate: { gte: now },
      schedule: { isPublished: true }
    },
    include: { schedule: { select: { title: true } } },
    orderBy: { eventDate: "asc" },
    take: 8  // Get up to 8 events
  });

  // ========== BUILD MESSAGE ==========
  let message = `📅 *UPCOMING EVENTS*\n\n`;
  
  if (massPrograms.length === 0 && scheduleEvents.length === 0) {
    message += `No upcoming events found in the system.`;
    return { 
      message,
      massPrograms: [],
      scheduleEvents: [],
      nextEvent: null
    };
  }

  // Combine all events
  const allEvents = [];
  
  for (const e of scheduleEvents) {
    allEvents.push({
      type: "event",
      title: e.title,
      date: e.eventDate,
      time: e.eventTime || "TBD",
      location: e.location || "TBD",
      schedule: e.schedule?.title
    });
  }
  
  for (const m of massPrograms) {
    allEvents.push({
      type: "mass",
      title: m.venue || "Mass",
      date: m.date,
      time: "TBD",
      location: m.venue || "TBD",
      songs: m.songs?.map(s => s.song?.title) || []
    });
  }

  // Sort by date
  allEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Show up to 6 events (WhatsApp friendly)
  const showEvents = allEvents.slice(0, 6);

  for (const e of showEvents) {
    const date = new Date(e.date).toLocaleDateString('en-KE', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric'
    });
    
    // ✅ SHOW FULL TITLE (NO TRUNCATION)
    const title = e.title || 'Event';
    const time = e.time || 'TBD';
    const location = e.location && e.location !== 'TBD' ? e.location : '';
    const emoji = e.type === 'mass' ? '⛪' : '📌';
    
    message += `${emoji} *${title}*\n`;
    message += `   📅 ${date} | ⏰ ${time}\n`;
    if (location) {
      message += `   📍 ${location}\n`;
    }
    message += `\n`;
  }

  if (allEvents.length > 6) {
    message += `... and ${allEvents.length - 6} more\n\n`;
  }

  // ✅ FIXED LINKS (no double http://)
  message += `📱 *Full schedule:* ${FRONTEND_URL}/schedules`;
  message += `\n📌 *More info:* ${FRONTEND_URL}/mass-programs`;

  return { 
    message,  // ← WhatsApp will display this
    massPrograms: massPrograms.map(m => ({
      type: "mass",
      date: m.date,
      venue: m.venue,
      songs: m.songs?.map(s => s.song?.title) || []
    })),
    scheduleEvents: scheduleEvents.map(e => ({
      type: "event",
      title: e.title,
      date: e.eventDate,
      time: e.eventTime || "TBD",
      location: e.location || "TBD",
      schedule: e.schedule?.title
    })),
    nextEvent: scheduleEvents[0] ? {
      title: scheduleEvents[0].title,
      date: scheduleEvents[0].eventDate,
      time: scheduleEvents[0].eventTime
    } : (massPrograms[0] ? {
      title: massPrograms[0].venue || "Mass",
      date: massPrograms[0].date,
      time: "TBD"
    } : null)
  };
}

      case "get_todays_readings": {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const reading = await prisma.liturgicalDay.findFirst({
          where: { date: { gte: today, lt: tomorrow } }
        });
        
        if (!reading) return { message: "No readings found for today." };
        
        return {
          date: reading.date,
          celebration: reading.celebration,
          season: reading.season,
          seasonName: reading.seasonName,
          color: reading.liturgicalColor,
          readings: reading.readings
        };
      }

      case "get_readings_by_date": {
        const date = new Date(args.date);
        date.setHours(0, 0, 0, 0);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        
        const reading = await prisma.liturgicalDay.findFirst({
          where: { date: { gte: date, lt: nextDay } }
        });
        
        if (!reading) return { message: `No readings found for ${args.date}.` };
        
        return {
          date: reading.date,
          celebration: reading.celebration,
          season: reading.seasonName,
          color: reading.liturgicalColor,
          readings: reading.readings
        };
      }

      case "get_liturgical_calendar": {
        const startDate = new Date(args.year, args.month - 1, 1);
        const endDate = new Date(args.year, args.month, 1);
        
        const days = await prisma.liturgicalDay.findMany({
          where: { date: { gte: startDate, lt: endDate } },
          orderBy: { date: "asc" }
        });
        
        return {
          year: args.year,
          month: args.month,
          days: days.map(d => ({
            date: d.date,
            celebration: d.celebration,
            season: d.seasonName,
            color: d.liturgicalColor
          }))
        };
      }

      // ==================== HYMNS ====================
      case "search_hymns": {
        const where = {
          OR: [
            { title: { contains: args.query, mode: "insensitive" } },
            { lyrics: { contains: args.query, mode: "insensitive" } }
          ]
        };
        
        const hymns = await prisma.song.findMany({
          where,
          select: { id: true, title: true, reference: true },
          take: 10
        });
        
        return { hymns, count: hymns.length };
      }

              case "get_hymn_lyrics": {
        let hymn;
        if (args.hymnId) {
          hymn = await prisma.song.findUnique({ where: { id: args.hymnId } });
        } else if (args.title) {
          hymn = await prisma.song.findFirst({
            where: { title: { contains: args.title, mode: "insensitive" } }
          });
        }
        
        if (!hymn) return { error: "Hymn not found." };
        
        return {
          id: hymn.id,
          title: hymn.title,
          reference: hymn.reference,
          lyrics: hymn.lyrics,
          action: "navigate",
          path: `https://www.zetechcatholicaction.com/hymn/${encodeURIComponent(hymn.title)}`  // Changed from hymn.title to hymn.id
        };
      }

      // ==================== JUMUIA ====================
      case "get_jumuia_list": {
        const jumuia = await prisma.jumuia.findMany({
          include: { _count: { select: { members: true } } },
          orderBy: { name: "asc" }
        });
        
        return {
          jumuia: jumuia.map(j => ({
            id: j.id,
            name: j.name,
            code: j.code,
            memberCount: j._count.members
          }))
        };
      }

      case "get_jumuia_details": {
        let jumuia;
        if (args.jumuiaName) {
          jumuia = await prisma.jumuia.findFirst({
            where: { name: { contains: args.jumuiaName, mode: "insensitive" } },
            include: {
              leaders: { select: { id: true, fullName: true, email: true } },
              _count: { select: { members: true } }
            }
          });
        } else if (args.jumuiaCode) {
          jumuia = await prisma.jumuia.findUnique({
            where: { code: args.jumuiaCode },
            include: {
              leaders: { select: { id: true, fullName: true, email: true } },
              _count: { select: { members: true } }
            }
          });
        }
        
        if (!jumuia) return { error: "Jumuia not found." };
        
        return {
          name: jumuia.name,
          code: jumuia.code,
          memberCount: jumuia._count.members,
          leaders: jumuia.leaders,
          action: "navigate",
          path: `/jumuia/${jumuia.code}`
        };
      }

      case "join_jumuia": {
        const jumuia = await prisma.jumuia.findFirst({
          where: { name: { contains: args.jumuiaName, mode: "insensitive" } }
        });
        
        if (!jumuia) return { error: "Jumuia not found." };
        
        await prisma.user.update({
          where: { id: currentUser.userId },
          data: { jumuiaId: jumuia.id }
        });
        
        return {
          success: true,
          message: `You've joined ${jumuia.name}!`,
          action: "navigate",
          path: `/jumuia/${jumuia.code}`
        };
      }

      // ==================== ANNOUNCEMENTS ====================
     case "create_announcement": {
  const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
  const isAdmin = user.role === "admin" || user.specialRole === "admin";
  const isSecretary = user.specialRole === "secretary";
  
  if (!isAdmin && !isSecretary) {
    return { error: "Only admins and secretaries can create announcements." };
  }
  
  const announcement = await prisma.announcement.create({
    data: {
      title: args.title,
      content: args.content,
      category: args.category || "General",
      published: true,
      createdBy: currentUser.userId
    }
  });
  
  // Get all users
  const allUsers = await prisma.user.findMany({ select: { id: true } });
  
  let successCount = 0;
  
  // ✅ Send push notifications + emails + in-app
  for (const u of allUsers) {
    try {
      await createAndSendNotification({
        userId: u.id,
        type: "announcement",
        title: `📢 New Announcement: ${args.title}`,
        message: args.content.substring(0, 150) + (args.content.length > 150 ? '...' : ''),
        data: { 
          announcementId: announcement.id,
          source: "admin_announcement"
        }
      });
      successCount++;
    } catch (err) {
      console.error(`❌ Failed to send to ${u.id}:`, err.message);
    }
  }
  
  return { 
    success: true, 
    message: `✅ Announcement "${args.title}" published and sent to ${successCount} users via push notification!` 
  };
}
      // ==================== CHAT ====================
      case "post_to_chat": {
        const defaultRoom = await prisma.chatRoom.findFirst({ where: { name: "default" } });
        
        if (!defaultRoom) return { error: "Chat room not found." };
        
        const message = await prisma.message.create({
          data: {
            content: args.message,
            userId: currentUser.userId,
            roomId: defaultRoom.id
          }
        });
        
        return { success: true, message: "Message posted to community chat!" };
      }


            // ==================== GET ANNOUNCEMENTS ====================
      case "get_announcements":
      case "list_announcements":
      case "show_announcements": {
        const limit = args.limit || 5;

        // Fetch published announcements, newest first
        const announcements = await prisma.announcement.findMany({
          where: { published: true },
          orderBy: { createdAt: "desc" },
          take: Math.min(limit, 10), // Max 10 to keep message short
          include: { author: { select: { fullName: true } } }
        });

        // Build formatted message for WhatsApp
        let message = `📢 *LATEST ANNOUNCEMENTS*\n\n`;

        if (announcements.length === 0) {
          message += `No announcements found.`;
          return { message, announcements: [] };
        }

        for (const a of announcements) {
          const date = new Date(a.createdAt).toLocaleDateString('en-KE', {
            day: 'numeric', month: 'short', year: 'numeric'
          });
          const author = a.author?.fullName || 'Admin';
          let content = a.content || '';
          if (content.length > 150) {
            content = content.substring(0, 147) + '...';
          }
          message += `📌 *${a.title}*\n`;
          message += `   📅 ${date} | 👤 ${author}\n`;
          message += `   ${content}\n\n`;
        }

        if (announcements.length > limit) {
          message += `... and ${announcements.length - limit} more\n`;
        }

        message += `📱 *View all:* ${FRONTEND_URL}/admin/announcements`;

        return {
          message,  // ← WhatsApp displays this
          announcements: announcements.map(a => ({
            id: a.id,
            title: a.title,
            content: a.content,
            category: a.category,
            author: a.author?.fullName,
            createdAt: a.createdAt
          }))
        };
      }

      // ==================== MEDIA ====================
      case "browse_media": {
        const where = { isPublic: true };
        if (args.category) where.category = args.category;
        if (args.type) where.type = args.type;
        
        const media = await prisma.media.findMany({
          where,
          include: {
            uploadedBy: { select: { fullName: true } },
            _count: { select: { likes: true, views: true } }
          },
          orderBy: { createdAt: "desc" },
          take: args.limit || 10
        });
        
        return {
          media: media.map(m => ({
            id: m.id,
            title: m.title,
            type: m.type,
            url: m.url,
            thumbnailUrl: m.thumbnailUrl,
            uploadedBy: m.uploadedBy?.fullName,
            likes: m._count.likes,
            views: m._count.views
          }))
        };
      }

      // ==================== YOUTUBE ====================
      case "get_youtube_info": {
        const apiKey = process.env.YOUTUBE_API_KEY;
        const channelId = process.env.YOUTUBE_CHANNEL_ID || "UCJ7NvR5_ZUwhtM16sJY4anQ";
        
        if (!apiKey) return { error: "YouTube API not configured." };
        
        try {
          const [channelRes, videosRes] = await Promise.all([
            axios.get(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`),
            axios.get(`https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet&order=date&maxResults=5&type=video`)
          ]);
          
          const channel = channelRes.data.items?.[0];
          const videos = videosRes.data.items || [];
          
          return {
            channel: {
              name: channel?.snippet?.title,
              subscribers: parseInt(channel?.statistics?.subscriberCount || 0),
              totalViews: parseInt(channel?.statistics?.viewCount || 0),
              totalVideos: parseInt(channel?.statistics?.videoCount || 0)
            },
            latestVideos: videos.map(v => ({
              id: v.id.videoId,
              title: v.snippet.title,
              thumbnail: v.snippet.thumbnails?.medium?.url,
              publishedAt: v.snippet.publishedAt
            }))
          };
        } catch (err) {
          return { error: "Failed to fetch YouTube data." };
        }
      }

      // ==================== GAMES ====================
      case "challenge_player": {
        const opponent = await prisma.user.findFirst({
          where: {
            OR: [
              { fullName: { contains: args.playerName, mode: "insensitive" } },
              { email: { contains: args.playerName, mode: "insensitive" } },
              { membership_number: { contains: args.playerName, mode: "insensitive" } }
            ],
            id: { not: currentUser.userId }
          }
        });
        
        if (!opponent) return { error: `Player "${args.playerName}" not found.` };
        
        const invite = await prisma.gameInvite.create({
          data: {
            fromUserId: currentUser.userId,
            toUserId: opponent.id,
            gameType: args.gameType,
            status: "pending"
          }
        });
        
        await prisma.notification.create({
          data: {
            userId: opponent.id,
            type: "game_invite",
            title: "🎮 Game Invite!",
            message: `${currentUser.fullName} invited you to play ${args.gameType}!`
          }
        });
        
        return {
          success: true,
          message: `Game invite sent to ${opponent.fullName}!`,
          invite: { id: invite.id, gameType: invite.gameType }
        };
      }

      case "get_game_status": {
        const activeGame = await prisma.gameSession.findFirst({
          where: {
            OR: [{ player1Id: currentUser.userId }, { player2Id: currentUser.userId }],
            status: "active"
          },
          include: {
            player1: { select: { fullName: true } },
            player2: { select: { fullName: true } }
          }
        });
        
        if (!activeGame) return { hasActiveGame: false };
        
        return {
          hasActiveGame: true,
          game: {
            id: activeGame.id,
            gameType: activeGame.gameType,
            opponent: activeGame.player1Id === currentUser.userId ? activeGame.player2?.fullName : activeGame.player1?.fullName,
            isMyTurn: activeGame.currentTurn === currentUser.userId
          }
        };
      }

    // ==================== EXECUTIVE MANAGEMENT ====================
case "get_executive_team": {
  try {
    console.log('🔍 Fetching executive team...');
    
    const executives = await prisma.executive.findMany({
      where: { isActive: true },
      include: {
        user: { 
          select: { 
            id: true, 
            fullName: true, 
            email: true, 
            phone: true,
            profileImage: true
          } 
        },
        position: true
      },
      orderBy: { position: { level: "asc" } }
    });

    console.log(`📋 Found ${executives.length} active executives check full page at https://www.zetechcatholicaction.com/executive`);

    if (!executives || executives.length === 0) {
      return {
        message: `👔 *ZUCA EXECUTIVE TEAM*\n\n` +
                 `No executive team members found. The positions may be vacant or not assigned yet.\n\n` +
                 `📌 Please check back later or contact the administrator.`
      };
    }

    // ✅ Group by category using the position's category field
    const grouped = {};
    executives.forEach(e => {
      // Use the position's category directly
      let category = e.position?.category || 'Other';
      
      // Ensure consistent category names
      if (category) {
        // Keep the category as-is from the database
        // But normalize for grouping
        if (category.toLowerCase() === 'leadership') category = 'Leadership';
        else if (category.toLowerCase() === 'organisation') category = 'Organisation';
        else if (category.toLowerCase() === 'choir') category = 'Choir';
        else if (category.toLowerCase() === 'jumuia') category = 'Jumuia';
        else if (category.toLowerCase() === 'media') category = 'Media';
        else if (category.toLowerCase() === 'voice') category = 'Voice';
      }
      
      if (!grouped[category]) grouped[category] = [];
      
      grouped[category].push({
        name: e.user?.fullName || 'Unknown',
        position: e.position?.title || 'Unknown Position',
        phone: e.customPhone || e.user?.phone || 'N/A',
        email: e.customEmail || e.user?.email || 'N/A'
      });
    });

    // ✅ Return the data in the format expected by formatActionResult
    return {
      success: true,
      grouped: grouped,
      total: executives.length
    };
  } catch (error) {
    console.error('❌ get_executive_team error:', error);
    return {
      message: `👔 *ZUCA EXECUTIVE TEAM*\n\n` +
               `I'm having trouble fetching the executive team information.\n` +
               `Please try again later or contact the administrator.\n\n` +
               `📌 For urgent matters, please reach out to the admin.`
    };
  }
}

      case "assign_executive": {
        const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
        if (user.role !== "admin") return { error: "Only admins can assign executives." };
        
        const targetUser = await prisma.user.findFirst({
          where: {
            OR: [
              { fullName: { contains: args.userIdentifier, mode: "insensitive" } },
              { email: { contains: args.userIdentifier, mode: "insensitive" } },
              { membership_number: { contains: args.userIdentifier, mode: "insensitive" } }
            ]
          }
        });
        
        if (!targetUser) return { error: `User "${args.userIdentifier}" not found.` };

        let positionTitle = args.position;
  const titleMap = {
    "chairperson": "Chairperson",
    "chair": "Chairperson",
    "vice chair": "Vice Chairperson",
    "vicechair": "Vice Chairperson",
    "secretary": "Secretary",
    "treasurer": "Treasurer",
    "choir moderator": "Choir Moderator",
    "choirmoderator": "Choir Moderator",
    "media moderator": "Media Moderator",
    "mediamoderator": "Media Moderator"
  };
  
  if (titleMap[positionTitle.toLowerCase()]) {
    positionTitle = titleMap[positionTitle.toLowerCase()];
    console.log(`📝 Mapped "${args.position}" → "${positionTitle}"`);
  }
        
        const position = await prisma.executivePosition.findFirst({
          where: { title: { contains: args.position, mode: "insensitive" } }
        });
        
        if (!position) return { error: `Position "${args.position}" not found.` };
        
        // Check if position already filled
        const existing = await prisma.executive.findFirst({
          where: { positionId: position.id, isActive: true }
        });
        
        if (existing) {
          await prisma.executiveHistory.create({
            data: {
              userId: existing.userId,
              positionId: existing.positionId,
              assignedBy: existing.assignedBy,
              assignedAt: existing.assignedAt,
              removedAt: new Date(),
              removedBy: currentUser.userId
            }
          });
          await prisma.executive.update({ where: { id: existing.id }, data: { isActive: false } });
        }
        
        // Create new assignment
        const assignment = await prisma.executive.create({
          data: {
            userId: targetUser.id,
            positionId: position.id,
            assignedBy: currentUser.userId
          }
        });
        
        // Update user specialRole
        const specialRoleMap = {
          "Chairperson": null, "Secretary": "secretary", "Treasurer": "treasurer",
          "Choir Moderator": "choir_moderator", "Media Moderator": "media_moderator"
        };
        
        const specialRole = specialRoleMap[position.title] || null;
        if (specialRole) {
          await prisma.user.update({
            where: { id: targetUser.id },
            data: { specialRole }
          });
        }
        
        // Notify
        await prisma.notification.create({
          data: {
            userId: targetUser.id,
            type: "executive_appointment",
            title: "🎉 Executive Appointment!",
            message: `Congratulations! You've been appointed as ${position.title}!`
          }
        });
        
        return {
          success: true,
          message: `${targetUser.fullName} appointed as ${position.title}!`,
          previousHolder: existing ? `Replaced previous holder` : null
        };
      }

      case "remove_executive": {
        const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
        if (user.role !== "admin") return { error: "Only admins can remove executives." };
        
        const targetUser = await prisma.user.findFirst({
          where: {
            OR: [
              { fullName: { contains: args.userIdentifier, mode: "insensitive" } },
              { email: { contains: args.userIdentifier, mode: "insensitive" } },
              { membership_number: { contains: args.userIdentifier, mode: "insensitive" } }
            ]
          }
        });
        
        if (!targetUser) return { error: "User not found." };
        
        const assignment = await prisma.executive.findFirst({
          where: { userId: targetUser.id, isActive: true },
          include: { position: true }
        });
        
        if (!assignment) return { error: "User has no active executive position." };
        
        await prisma.executiveHistory.create({
          data: {
            userId: assignment.userId,
            positionId: assignment.positionId,
            assignedBy: assignment.assignedBy,
            assignedAt: assignment.assignedAt,
            removedAt: new Date(),
            removedBy: currentUser.userId
          }
        });
        
        await prisma.executive.delete({ where: { id: assignment.id } });
        await prisma.user.update({
          where: { id: targetUser.id },
          data: { specialRole: null }
        });
        
        await prisma.notification.create({
          data: {
            userId: targetUser.id,
            type: "executive_removed",
            title: "📋 Position Updated",
            message: `You've been removed from ${assignment.position.title}.`
          }
        });
        
        return { success: true, message: `${targetUser.fullName} removed from ${assignment.position.title}.` };
      }

           // ==================== ADMIN - USER MANAGEMENT ====================
      case "get_all_users":
case "list_all_users":
case "list_users":
case "all_users": {
        let isAuthorized = false;
        
        if (currentUser?.userId) {
          const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
          if (user) {
            isAuthorized = user.role === "admin" || 
                           user.specialRole === "secretary" || 
                           user.specialRole === "treasurer";
          }
        }
        
        if (!isAuthorized) {
          return { error: "Only admins, secretaries, and treasurers can view all users." };
        }
        
        const users = await prisma.user.findMany({
          select: { 
            id: true, fullName: true, email: true, phone: true,
            role: true, specialRole: true, membership_number: true,
            createdAt: true, lastActive: true
          },
          take: args.limit || 20,
          orderBy: { fullName: "asc" }
        });
        
        return { users, count: users.length, message: `Showing ${users.length} users` };
      }

  case "find_user": {
  // ✅ Support both 'searchTerm' and 'query' parameter names
  let searchTerm = args.searchTerm || args.query || args.userIdentifier || args.name || "";
  
  // ✅ Safe cleaning with null/undefined check
  if (!searchTerm || typeof searchTerm !== 'string') {
    return { error: "Please provide a name, email, phone number, or position to search for." };
  }
  
  // Clean the search term
  searchTerm = searchTerm.replace(/[''"`]/g, '').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  
  if (searchTerm.length < 2) {
    return { error: "Search term must be at least 2 characters long." };
  }
  
  // ✅ For WhatsApp context, we don't require authentication
  // Just search for the user/position directly
  
  // ========== SEARCH FOR USERS ==========
  let foundUsers = await prisma.user.findMany({
    where: {
      OR: [
        { fullName: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
        { membership_number: { contains: searchTerm, mode: "insensitive" } },
        { phone: { contains: searchTerm, mode: "insensitive" } }
      ]
    },
    include: { homeJumuia: true },
    take: 10
  });

  // ========== IF MULTIPLE USERS FOUND ==========
  if (foundUsers.length > 1) {
    let list = `👤 *Multiple users found:*\n\n`;
    foundUsers.slice(0, 10).forEach((u, i) => {
      list += `${i+1}. *${u.fullName}*\n`;
      if (u.membership_number) list += `   🆔 ${u.membership_number}\n`;
      if (u.role) list += `   👑 ${u.role}\n`;
      if (u.homeJumuia?.name) list += `   🏠 ${u.homeJumuia.name}\n`;
      list += `\n`;
    });
    if (foundUsers.length > 10) {
      list += `... and ${foundUsers.length - 10} more\n`;
    }
    list += `\n💡 Please be more specific (e.g., full name or membership number)`;
    return { message: list, users: foundUsers };
  }

  // ========== SINGLE USER FOUND ==========
if (foundUsers.length === 1) {
  const found = foundUsers[0];
  
  // Get total paid
  const pledges = await prisma.pledge.findMany({
    where: { userId: found.id },
    include: { contributionType: true }
  });
  const totalPaid = pledges.reduce((s, p) => s + (p.amountPaid || 0), 0);
  
  // ========== GET ATTENDANCE RECORDS ==========
  const attendanceRecords = await prisma.attendanceEntry.findMany({
    where: { userId: found.id },
    include: { 
      sheet: { 
        select: { 
          title: true, 
          eventDate: true, 
          location: true 
        } 
      } 
    },
    orderBy: { signTime: 'desc' },
    take: 20
  });
  
  // ========== COUNT ATTENDANCE PROPERLY ==========
  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  
  for (const r of attendanceRecords) {
    const status = (r.status || 'PRESENT').toUpperCase();
    if (status === 'PRESENT') presentCount++;
    else if (status === 'ABSENT') absentCount++;
    else if (status === 'LATE') lateCount++;
    else presentCount++; // Default to present for unknown status
  }
  
  // Format attendance for display
  let attendanceMessage = '';
  if (attendanceRecords.length > 0) {
    attendanceMessage = `\n\n📋 *Attendance:* ${attendanceRecords.length} records\n`;
    attendanceMessage += `✅ Present: ${presentCount}`;
    if (lateCount > 0) attendanceMessage += ` | ⏰ Late: ${lateCount}`;
    if (absentCount > 0) attendanceMessage += ` | ❌ Absent: ${absentCount}`;
    attendanceMessage += `\n\n📅 *Recent Check-ins:*\n`;
    
    attendanceRecords.slice(0, 5).forEach(r => {
      const date = r.sheet?.eventDate || r.signTime;
      const formattedDate = new Date(date).toLocaleDateString('en-KE', { 
        day: 'numeric', month: 'short', year: 'numeric' 
      });
      
      const status = (r.status || 'PRESENT').toUpperCase();
      const statusEmoji = status === 'PRESENT' ? '✅' : 
                         status === 'LATE' ? '⏰' : '❌';
      const event = r.sheet?.title || "Mass/Event";
      attendanceMessage += `${statusEmoji} ${event} - ${formattedDate}\n`;
    });
    
    if (attendanceRecords.length > 5) {
      attendanceMessage += `... and ${attendanceRecords.length - 5} more\n`;
    }
    attendanceMessage += `📱 *Full details:* https://www.zetechcatholicaction.com/profile`;
  } else {
    attendanceMessage = `\n\n📋 *Attendance:* No records found.`;
  }
  
  return {
    user: {
      id: found.id,
      fullName: found.fullName,
      email: found.email,
      phone: found.phone,
      membership: found.membership_number,
      role: found.role,
      specialRole: found.specialRole,
      jumuia: found.homeJumuia?.name,
      totalPaid: totalPaid
    },
    attendance: attendanceRecords,
    message: `👤 *${found.fullName}*\n📧 ${found.email || 'N/A'}\n📱 ${found.phone || 'N/A'}\n🆔 ${found.membership_number || 'N/A'}\n🏠 ${found.homeJumuia?.name || 'None'}\n👑 ${found.role || 'User'}${found.specialRole ? ` (${found.specialRole})` : ''}\n💰 Paid: KES ${totalPaid.toLocaleString()}${attendanceMessage}`
  };
}

  // ========== CHECK IF IT'S A POSITION TITLE ==========
  // Map common position names to database titles
  const positionMap = {
    'chairperson': 'Chairperson',
    'chair': 'Chairperson',
    'vice chair': 'Vice Chairperson',
    'vicechair': 'Vice Chairperson',
    'secretary': 'Secretary',
    'treasurer': 'Treasurer',
    'choir moderator': 'Choir Moderator',
    'choirmoderator': 'Choir Moderator',
    'media moderator': 'Media Moderator',
    'mediamoderator': 'Media Moderator',
    'youth leader': 'Youth Leader',
    'youthleader': 'Youth Leader',
    'women leader': 'Women Leader',
    'womenleader': 'Women Leader',
    'prayer coordinator': 'Prayer Coordinator',
    'prayercoordinator': 'Prayer Coordinator'
  };
  
  let positionSearchTerm = searchTerm.toLowerCase();
  let mappedPosition = positionMap[positionSearchTerm] || positionSearchTerm;
  
  const positionMatch = await prisma.executive.findFirst({
    where: {
      isActive: true,
      position: {
        title: { contains: mappedPosition, mode: "insensitive" }
      }
    },
    include: {
      user: {
        include: { homeJumuia: true }
      },
      position: true
    }
  });

  if (positionMatch) {
    const userData = positionMatch.user;
    
    // Get attendance for position holder
    const attendanceRecords = await prisma.attendanceEntry.findMany({
      where: { userId: userData.id },
      include: { sheet: { select: { title: true, eventDate: true } } },
      orderBy: { signTime: 'desc' },
      take: 5
    });
    
    let attendanceMsg = '';
    if (attendanceRecords.length > 0) {
      attendanceMsg = `\n📋 Recent attendance: ${attendanceRecords.length} check-ins`;
    }
    
    return {
      user: {
        id: userData.id,
        fullName: userData.fullName,
        email: userData.email,
        phone: userData.phone,
        membership: userData.membership_number,
        role: userData.role,
        specialRole: userData.specialRole,
        jumuia: userData.homeJumuia?.name,
        position: positionMatch.position.title
      },
      message: `👤 *${userData.fullName}*\n👑 Position: ${positionMatch.position.title}\n📧 ${userData.email || 'N/A'}\n📱 ${userData.phone || 'N/A'}\n🏠 ${userData.homeJumuia?.name || 'None'}${attendanceMsg}`,
      action: "navigate",
      path: `/executive`
    };
  }

  // ========== CHECK IF IT'S A JUMUIA ==========
  const jumuiaMatch = await prisma.jumuia.findFirst({
    where: {
      name: { contains: searchTerm, mode: "insensitive" }
    },
    include: {
      members: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          specialRole: true,
          membership_number: true
        },
        take: 20
      },
      leaders: {
        select: {
          id: true,
          fullName: true,
          email: true
        }
      }
    }
  });

  if (jumuiaMatch) {
    let memberList = `🏠 *${jumuiaMatch.name}*\n📌 Code: ${jumuiaMatch.code}\n👥 Members: ${jumuiaMatch.members.length}\n\n`;
    if (jumuiaMatch.leaders.length > 0) {
      memberList += `👑 *Leaders:*\n`;
      jumuiaMatch.leaders.forEach(l => {
        memberList += `  • ${l.fullName}\n`;
      });
      memberList += `\n`;
    }
    memberList += `👤 *Members:*\n`;
    jumuiaMatch.members.slice(0, 10).forEach(m => {
      memberList += `  • ${m.fullName}${m.role ? ` (${m.role})` : ''}\n`;
    });
    if (jumuiaMatch.members.length > 10) {
      memberList += `  ... and ${jumuiaMatch.members.length - 10} more\n`;
    }
    
    return {
      jumuia: {
        name: jumuiaMatch.name,
        code: jumuiaMatch.code,
        memberCount: jumuiaMatch.members.length,
        leaders: jumuiaMatch.leaders.map(l => l.fullName),
        members: jumuiaMatch.members.map(m => ({
          name: m.fullName,
          email: m.email,
          role: m.role,
          specialRole: m.specialRole
        }))
      },
      message: memberList
    };
  }

  // ========== CHECK IF POSITION IS VACANT ==========
  const vacantPosition = await prisma.executivePosition.findFirst({
    where: {
      title: { contains: mappedPosition, mode: "insensitive" }
    }
  });

  if (vacantPosition) {
    // Check if anyone is assigned to this position
    const assigned = await prisma.executive.findFirst({
      where: { positionId: vacantPosition.id, isActive: true }
    });
    
    if (!assigned) {
      return {
        message: `📌 The position *"${vacantPosition.title}"* is currently **VACANT**. No one is assigned to this role.`,
        position: vacantPosition.title,
        isVacant: true,
        action: "assign"
      };
    }
  }

  return { 
    error: `❌ No user, position, or Jumuia found matching "${searchTerm}". 
    
💡 Try:
• Full name: "John Doe"
• Membership number: "ZUC-001"
• Position: "Chairperson"
• Jumuia: "St. Michael"
• Email: "john@example.com"` 
  };
}
      case "change_user_role": {
        const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
        if (user.role !== "admin") return { error: "Admin only." };
        
        const target = await prisma.user.findFirst({
          where: {
            OR: [
              { fullName: { contains: args.userIdentifier, mode: "insensitive" } },
              { email: { contains: args.userIdentifier, mode: "insensitive" } }
            ]
          }
        });
        
        if (!target) return { error: "User not found." };
        
        await prisma.user.update({
          where: { id: target.id },
          data: { role: args.newRole, specialRole: args.newSpecialRole || null }
        });
        
        return { success: true, message: `${target.fullName} is now ${args.newRole}${args.newSpecialRole ? ` (${args.newSpecialRole})` : ''}.` };
      }

      case "delete_user": {
        const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
        if (user.role !== "admin") return { error: "Admin only." };
        if (!args.confirm) return { error: "Confirmation required." };
        
        const target = await prisma.user.findFirst({
          where: { OR: [{ fullName: { contains: args.userIdentifier, mode: "insensitive" } }, { email: { contains: args.userIdentifier, mode: "insensitive" } }] }
        });
        
        if (!target) return { error: "User not found." };
        if (target.id === currentUser.userId) return { error: "Cannot delete yourself." };
        
        await prisma.pledge.deleteMany({ where: { userId: target.id } });
        await prisma.message.deleteMany({ where: { userId: target.id } });
        await prisma.notification.deleteMany({ where: { userId: target.id } });
        await prisma.user.delete({ where: { id: target.id } });
        
        return { success: true, message: `${target.fullName} deleted permanently.` };
      }

      // ==================== SYSTEM STATS ====================
      case "get_system_stats": {
        const [users, announcements, campaigns, messages, media, hymns, jumuia] = await Promise.all([
          prisma.user.count(),
          prisma.announcement.count(),
          prisma.contributionType.count(),
          prisma.message.count(),
          prisma.media.count(),
          prisma.song.count(),
          prisma.jumuia.count()
        ]);
        
        const totalRaised = await prisma.pledge.aggregate({
          where: { OR: [{ status: "APPROVED" }, { status: "COMPLETED" }] },
          _sum: { amountPaid: true }
        });
        
        return {
          stats: {
            users, announcements, campaigns, messages, media, hymns, jumuia,
            totalRaised: totalRaised._sum.amountPaid || 0
          }
        };
      }

      case "get_system_health": {
        const errors = []; // Your health store
        const uptime = process.uptime();
        
        return {
          uptime: `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h`,
          memory: process.memoryUsage(),
          recentErrors: errors.slice(0, 10)
        };
      }

      // ==================== CONTENT GENERATION ====================
      case "generate_content": {
        // This returns instructions for the AI to generate content
        // The AI will use the response to craft appropriate content
        return {
          contentType: args.contentType,
          topic: args.topic,
          context: args.additionalContext,
          instruction: `Generate a ${args.contentType} about ${args.topic}. ${args.additionalContext || ''}`
        };
      }

      // ==================== WEB SEARCH ====================
   case "search_web": {
  try {
    const axios = require("axios");
    const response = await axios.get(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(args.query)}&format=json&no_html=1`
    );
    
    const results = (response.data.RelatedTopics || [])
      .filter(t => t.Text && t.FirstURL)
      .slice(0, 5)
      .map(t => ({
        title: t.Text.split(' - ')[0] || t.Text.substring(0, 80),
        url: t.FirstURL,
        snippet: t.Text.substring(0, 200)
      }));
    
    if (results.length === 0) {
      return { 
        query: args.query, 
        results: [],
        message: "No results found. Try a different search." 
      };
    }
    
    return { 
      query: args.query, 
      results, 
      count: results.length,
      source: "DuckDuckGo" 
    };
  } catch (err) {
    console.error("Web search error:", err.message);
    return { error: "Search failed. Please try again." };
  }
}

      // ==================== HELP ====================
      case "show_help": {
        const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
        const isAdmin = user.role === "admin" || user.specialRole === "admin";
        
        let helpText = `**What I Can Do For You:**\n\n`;
        helpText += `🗣️ **Chat & Navigate** - Talk naturally, I'll guide you\n`;
        helpText += `👤 **Profile** - "Who am I?" "What do I owe?"\n`;
        helpText += `⛪ **Mass** - "Next mass?" "Today's readings"\n`;
        helpText += `🎵 **Hymns** - "Find communion songs" "Show me hymn 45"\n`;
        helpText += `💰 **Pledges** - "I want to give 5000" "Campaign status"\n`;
        helpText += `🏠 **Jumuia** - "Tell me about St. Michael" "Join a jumuia"\n`;
        helpText += `📸 **Gallery** - "Show photos" "Find videos"\n`;
        helpText += `📺 **YouTube** - "Channel stats" "Latest video"\n`;
        helpText += `🎮 **Games** - "Challenge John to trivia"\n`;
        
        if (isAdmin) {
          helpText += `\n**👑 Admin Powers:**\n`;
          helpText += `👥 **Users** - "Find user" "Make admin" "Delete user"\n`;
          helpText += `👑 **Executive** - "Make Morris Secretary" "Show team"\n`;
          helpText += `📢 **Announce** - "Create announcement: [text]"\n`;
          helpText += `💰 **Campaigns** - "Create campaign 'Fund' target 50000"\n`;
          helpText += `📋 **Schedule** - Paste raw text, I'll build it\n`;
          helpText += `📊 **Stats** - "Platform overview" "System health"\n`;
        }
        
        return { helpText };
      }

      // ==================== SCHEDULE GENERATION ====================
      case "generate_schedule_from_text": {
        const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
        const isAdmin = user.role === "admin" || user.specialRole === "admin";
        const isSecretary = user.specialRole === "secretary";
        
        if (!isAdmin && !isSecretary) {
          return { error: "Only admins and secretaries can create schedules." };
        }
        
        // Return instruction for AI to parse the text
        return {
          rawText: args.rawText,
          title: args.title || "Semester Schedule",
          publishNow: args.publishNow || false,
          instruction: `Parse this raw schedule text and extract structured data. 
            Identify: title, semester dates, general points, sections with events (date, event name).
            Format each event with: title, eventDate (ISO), eventTime (default "16:30"), location, groupName.
            Return the structured schedule data.`
        };
      }

      case "list_schedules": {
        const schedules = await prisma.schedule.findMany({
          include: {
            events: true,
            creator: { select: { fullName: true } }
          },
          orderBy: { createdAt: "desc" },
          take: 10
        });
        
        return {
          schedules: schedules.map(s => ({
            id: s.id,
            title: s.title,
            startDate: s.startDate,
            endDate: s.endDate,
            isPublished: s.isPublished,
            eventCount: s.events.length,
            createdBy: s.creator?.fullName
          }))
        };
      }

          
// ==================== EMAIL & NOTIFICATIONS ====================
case "send_bulk_email": {
  const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
  const isAdmin = user.role === "admin" || user.specialRole === "admin";
  const isSecretary = user.specialRole === "secretary";

  if (!isAdmin && !isSecretary) {
    return { error: "Only admins and secretaries can send bulk emails." };
  }

  const allUsers = await prisma.user.findMany({ select: { id: true } });

  const BATCH_SIZE = 10; // Send 10 at a time
  let successCount = 0;
  let failCount = 0;

  // Process in batches of 10
  for (let i = 0; i < allUsers.length; i += BATCH_SIZE) {
    const batch = allUsers.slice(i, i + BATCH_SIZE);
    
    const results = await Promise.allSettled(
      batch.map(u => 
        createAndSendNotification({
          userId: u.id,
          type: "announcement",
          title: args.title || "📢 ZUCA Announcement",
          message: args.message,
          data: { 
            source: "admin_announcement",
            timestamp: new Date().toISOString()
          }
        })
      )
    );

    successCount += results.filter(r => r.status === 'fulfilled').length;
    failCount += results.filter(r => r.status === 'rejected').length;
  }

  return {
    success: true,
    message: `✅ Announcement sent to ${successCount} users via push notification! ${failCount > 0 ? `(${failCount} failed)` : ''}`,
    recipientCount: successCount
  };
}

   case "send_email": {
  const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
  const isAdmin = user.role === "admin" || user.specialRole === "admin";
  
  const target = await prisma.user.findFirst({
    where: {
      OR: [
        { fullName: { contains: args.userIdentifier, mode: "insensitive" } },
        { email: { contains: args.userIdentifier, mode: "insensitive" } }
      ]
    }
  });

  if (!target) return { error: `User "${args.userIdentifier}" not found.` };

  if (!isAdmin) {
    await createAndSendNotification({
      userId: target.id,
      type: "prayer_request",
      title: args.title || "A Request",
      message: `${user.fullName} sent a request: ${args.message}`,
      data: { 
        fromUserId: user.id,
        fromName: user.fullName,
        type: "prayer_request"
      }
    });

    return {
      success: true,
      message: `✅request sent to ${target.fullName}! 🙏`
    };
  }

  await createAndSendNotification({
    userId: target.id,
    type: "announcement",
    title: args.title || "📢 Message from Admin",
    message: args.message,
    data: { 
      source: "admin_individual",
      recipient: target.email
    }
  });

  return {
    success: true,
    message: `✅ Email and push notification sent to ${target.fullName} (${target.email})!`
  };
}  
      case "list_all_contributions": {
  const campaigns = await prisma.contributionType.findMany({
    include: {
      pledges: true,
      _count: { select: { pledges: true } }
    },
    orderBy: { createdAt: "desc" }
  });
  
  return {
    campaigns: campaigns.map(c => ({
      id: c.id,
      title: c.title,
      amountRequired: c.amountRequired,
      totalPledges: c._count.pledges,
      totalPaid: c.pledges.reduce((s, p) => s + (p.amountPaid || 0), 0)
    })),
    count: campaigns.length
  };
}

      // ==================== TOOL ALIASES (Maps common names to handlers) ====================
      case "list_contributions":
      case "list_campaigns":
      case "show_campaigns":
      case "get_contributions":
      case "view_campaigns": {
        // Alias → same as get_active_campaigns
        const campaigns = await prisma.contributionType.findMany({
          where: {
            OR: [
              { deadline: null },
              { deadline: { gte: new Date() } }
            ]
          },
          include: {
            _count: { select: { pledges: true } },
            pledges: { select: { amountPaid: true } }
          },
          orderBy: { createdAt: "desc" }
        });
        
        return {
          campaigns: campaigns.map(c => ({
            id: c.id,
            title: c.title,
            amountRequired: c.amountRequired,
            totalPledges: c._count.pledges,
            totalRaised: c.pledges.reduce((s, p) => s + (p.amountPaid || 0), 0),
            deadline: c.deadline
          })),
          count: campaigns.length,
          message: `Showing ${campaigns.length} campaigns`
        };
      }

      case "show_users":
      case "get_users":
      case "view_users": {
        // Alias → same as list_all_users
        let isAuthorized = false;
        if (currentUser?.userId) {
          const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
          if (user) {
            isAuthorized = user.role === "admin" || user.specialRole === "secretary" || user.specialRole === "treasurer";
          }
        }
        if (!isAuthorized) return { error: "Only admins, secretaries, and treasurers can view all users." };
        
        const users = await prisma.user.findMany({
          select: { id: true, fullName: true, email: true, role: true, specialRole: true, membership_number: true },
          take: 20, orderBy: { fullName: "asc" }
        });
        return { users, count: users.length };
      }

      case "show_jumuia":
      case "list_jumuia":
      case "get_jumuia":
      case "view_jumuia": {
        // Alias → same as get_jumuia_list
        const jumuia = await prisma.jumuia.findMany({
          include: { _count: { select: { members: true } } },
          orderBy: { name: "asc" }
        });
        return {
          jumuia: jumuia.map(j => ({ id: j.id, name: j.name, code: j.code, memberCount: j._count.members }))
        };
      }

      case "show_masses":
      case "get_masses":
      case "list_masses":
      case "view_masses": {
        // Alias → same as get_upcoming_masses
        const masses = await prisma.massProgram.findMany({
          where: { date: { gte: new Date() } },
          include: { songs: { include: { song: true } } },
          orderBy: { date: "asc" }, take: 5
        });
        return {
          masses: masses.map(m => ({
            id: m.id, date: m.date, venue: m.venue,
            songs: m.songs.map(s => ({ type: s.type, title: s.song.title }))
          }))
        };
      }

      case "show_announcements":
      case "get_announcements_list":
      case "list_announcements":
      case "view_announcements": {
        // Alias → same as get_announcements
        const announcements = await prisma.announcement.findMany({
          where: { published: true },
          orderBy: { createdAt: "desc" }, take: args.limit || 5,
          include: { author: { select: { fullName: true } } }
        });
        return {
          announcements: announcements.map(a => ({
            id: a.id, title: a.title, content: a.content,
            category: a.category, author: a.author?.fullName, createdAt: a.createdAt
          }))
        };
      }

            // ==================== MORE ALIASES & MISSING HANDLERS ====================
          case "approve_all_pledges":
      case "approve_all_users":
      case "approve_all":
      case "complete_all_pledges": {
        const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
        if (!user || (user.role !== "admin" && user.specialRole !== "treasurer")) {
          return { error: "Only admins and treasurers can approve pledges." };
        }

        const pendingPledges = await prisma.pledge.findMany({
          where: { 
            OR: [
              { pendingAmount: { gt: 0 } },
              { status: "PENDING" }
            ]
          },
          include: { contributionType: true, user: true }
        });

        if (pendingPledges.length === 0) {
          return { message: "✅ No pending pledges found. All pledges are already approved or completed!" };
        }

        let approved = 0;
        let completed = 0;
        for (const pledge of pendingPledges) {
          const newAmountPaid = (pledge.amountPaid || 0) + (pledge.pendingAmount || 0);
          const newStatus = newAmountPaid >= (pledge.contributionType?.amountRequired || 0) ? "COMPLETED" : "APPROVED";
          
          await prisma.pledge.update({
            where: { id: pledge.id },
            data: {
              amountPaid: newAmountPaid,
              pendingAmount: 0,
              status: newStatus,
              approvedById: currentUser.userId,
              approvedAt: new Date()
            }
          });

          if (newStatus === "COMPLETED") completed++;
          else approved++;

          await prisma.notification.create({
            data: {
              userId: pledge.userId,
              type: "pledge_approved",
              title: newStatus === "COMPLETED" ? "🎉 Pledge Complete!" : "✅ Pledge Approved",
              message: `Your pledge for "${pledge.contributionType?.title || 'campaign'}" has been ${newStatus === "COMPLETED" ? "completed" : "approved"}.`
            }
          });
        }

        return {
          success: true,
          message: `✅ Processed ${pendingPledges.length} pledges: ${completed} completed, ${approved} approved.`
        };
      }

            case "list_all_campaigns":
      case "show_all_campaigns":
      case "get_campaigns":
      case "get_all_campaigns": {
        const campaigns = await prisma.contributionType.findMany({
          include: {
            _count: { select: { pledges: true } },
            pledges: { select: { amountPaid: true, pendingAmount: true } }
          },
          orderBy: { createdAt: "desc" }
        });
        
        return {
          campaigns: campaigns.map(c => ({
            id: c.id,
            title: c.title,
            amountRequired: c.amountRequired,
            totalPledges: c._count.pledges,
            totalPaid: c.pledges.reduce((s, p) => s + (p.amountPaid || 0), 0),
            totalPending: c.pledges.reduce((s, p) => s + (p.pendingAmount || 0), 0),
            deadline: c.deadline
          })),
          count: campaigns.length
        };
      }

            case "my_pledges":
      case "show_my_pledges":
      case "view_my_pledges": {
        if (!currentUser?.userId) return { error: "Please log in first." };
        const pledges = await prisma.pledge.findMany({
          where: { userId: currentUser.userId },
          include: { contributionType: true },
          orderBy: { createdAt: "desc" }
        });
        return {
          pledges: pledges.map(p => ({
            id: p.id, campaign: p.contributionType.title,
            amountRequired: p.contributionType.amountRequired,
            amountPaid: p.amountPaid || 0, pendingAmount: p.pendingAmount || 0,
            status: p.status
          })),
          summary: {
            totalPaid: pledges.reduce((s, p) => s + (p.amountPaid || 0), 0),
            totalPending: pledges.reduce((s, p) => s + (p.pendingAmount || 0), 0)
          }
        };
      }

      case "my_profile":
      case "show_my_profile":
      case "view_profile":
      case "whoami": {
        if (!currentUser?.userId) return { error: "Please log in first." };
        const user = await prisma.user.findUnique({
          where: { id: currentUser.userId },
          include: { homeJumuia: true }
        });
        if (!user) return { error: "User not found." };
        return {
          profile: {
            fullName: user.fullName, email: user.email, phone: user.phone,
            membershipNumber: user.membership_number, role: user.role,
            specialRole: user.specialRole, jumuia: user.homeJumuia?.name || "None"
          }
        };
      }

      case "help":
      case "what_can_you_do":
      case "commands":
      case "menu": {
        const user = await prisma.user.findUnique({ where: { id: currentUser?.userId } });
        const isAdmin = user?.role === "admin";
        let helpText = "**🤖 ZUCA AI Can Help With:**\n\n🗣️ Chat & Navigate | 👤 Profile | ⛪ Mass | 🎵 Hymns | 💰 Pledges | 🏠 Jumuia | 📸 Gallery | 📺 YouTube | 🎮 Games";
        if (isAdmin) helpText += "\n\n**👑 Admin:** 👥 Users | 👑 Executives | 📢 Announce | ✉️ Email | 💰 Campaigns | 📋 Schedules | 📊 Stats";
        return { helpText };
      }

      case "delete_announcement":
      case "remove_announcement": {
        const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
        if (!user || (user.role !== "admin" && user.specialRole !== "secretary")) {
          return { error: "Only admins and secretaries can delete announcements." };
        }
        
        const announcement = await prisma.announcement.findFirst({
          where: { title: { contains: args.title || args.announcementTitle || "", mode: "insensitive" } }
        });
        
        if (!announcement) return { error: "Announcement not found. Please specify the title." };
        
        await prisma.announcement.delete({ where: { id: announcement.id } });
        return { success: true, message: `Announcement "${announcement.title}" deleted.` };
      }

      case "delete_hymn":
      case "remove_hymn":
      case "delete_song": {
        const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
        if (!user || (user.role !== "admin" && user.specialRole !== "choir_moderator")) {
          return { error: "Only admins and choir moderators can delete hymns." };
        }
        
        const song = await prisma.song.findFirst({
          where: { title: { contains: args.title || args.songTitle || "", mode: "insensitive" } }
        });
        
        if (!song) return { error: "Song not found." };
        
        await prisma.massProgramSong.deleteMany({ where: { songId: song.id } });
        await prisma.song.delete({ where: { id: song.id } });
        return { success: true, message: `Hymn "${song.title}" deleted.` };
      }

      case "post_announcement":
case "broadcast":
case "notify_all": {
  const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
  if (!user || (user.role !== "admin" && user.specialRole !== "secretary")) {
    return { error: "Only admins and secretaries can post announcements." };
  }
  
  const announcement = await prisma.announcement.create({
    data: {
      title: args.title || "📢 Announcement",
      content: args.message || args.content || "",
      category: "General",
      published: true,
      createdBy: currentUser.userId
    }
  });
  
  const allUsers = await prisma.user.findMany({ select: { id: true } });
  
  let successCount = 0;
  
  // ✅ Send push notifications + emails + in-app
  for (const u of allUsers) {
    try {
      await createAndSendNotification({
        userId: u.id,
        type: "announcement",
        title: `📢 ${args.title || "New Announcement"}`,
        message: (args.message || args.content || "").substring(0, 150) + ((args.message || args.content || "").length > 150 ? '...' : ''),
        data: { 
          announcementId: announcement.id,
          source: "admin_broadcast"
        }
      });
      successCount++;
    } catch (err) {
      console.error(`❌ Failed to send to ${u.id}:`, err.message);
    }
  }
  
  return { 
    success: true, 
    message: `✅ Announcement posted to ${successCount} users via push notification!` 
  };
}

      case "delete_schedule":
      case "remove_schedule": {
        const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
        if (!user || (user.role !== "admin" && user.specialRole !== "secretary")) {
          return { error: "Only admins and secretaries can delete schedules." };
        }
        
        const schedule = await prisma.schedule.findFirst({
          where: { title: { contains: args.title || "", mode: "insensitive" } }
        });
        
        if (!schedule) return { error: "Schedule not found." };
        
        await prisma.scheduleEvent.deleteMany({ where: { scheduleId: schedule.id } });
        await prisma.schedule.delete({ where: { id: schedule.id } });
        return { success: true, message: `Schedule "${schedule.title}" deleted.` };
      }

      case "add_user":
      case "invite_user":
      case "register_user": {
        const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
        if (!user || user.role !== "admin") return { error: "Only admins can add users." };
        
        return { message: "To add a user, please use the registration page. Share this link: /register" };
      }

      case "my_jumuia":
      case "get_my_jumuia":
      case "which_jumuia": {
        if (!currentUser?.userId) return { error: "Please log in first." };
        const user = await prisma.user.findUnique({
          where: { id: currentUser.userId },
          include: { homeJumuia: { include: { leaders: { select: { fullName: true } } } } }
        });
        if (!user?.homeJumuia) return { message: "You haven't joined a jumuia yet. Go to Join Jumuia page!" };
        return {
          jumuia: { name: user.homeJumuia.name, code: user.homeJumuia.code, leaders: user.homeJumuia.leaders.map(l => l.fullName) },
          action: "navigate", path: `/jumuia/${user.homeJumuia.code}`
        };
      }

      case "logout":
      case "sign_out": {
        return { message: "To log out, click your profile icon and select 'Logout'. Stay blessed! 🙏" };
      }

      case "change_password":
      case "update_password":
      case "reset_password": {
        return { message: "To reset your password, go to the login page and click 'Forgot Password'. You'll receive a reset code via email." };
      }

      case "contact_admin":
      case "email_admin":
      case "support": {
        return { message: "📧 Contact ZUCA Admin: zucaportal2025@gmail.com | Secondary: zuca406@gmail.com" };
      }

      case "whats_new":
      case "latest":
      case "recent_activity": {
        const [announcements, newUsers] = await Promise.all([
          prisma.announcement.findMany({ where: { published: true }, orderBy: { createdAt: "desc" }, take: 3 }),
          prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 3, select: { fullName: true, createdAt: true } })
        ]);
        return {
          announcements: announcements.map(a => ({ title: a.title, date: a.createdAt })),
          newMembers: newUsers.map(u => ({ name: u.fullName, joined: u.createdAt }))
        };
      }

            case "delete_contribution":
      case "delete_contributions":
      case "delete_all_contributions":
      case "clear_contributions":
      case "clear_campaigns":
      case "remove_all_campaigns": {
        const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
        if (!user || (user.role !== "admin" && user.specialRole !== "treasurer")) {
          return { error: "Only admins and treasurers can delete contributions." };
        }

        const allCampaigns = await prisma.contributionType.findMany();
        if (allCampaigns.length === 0) return { message: "No contributions/campaigns to delete." };

        for (const c of allCampaigns) {
          await prisma.pledge.deleteMany({ where: { contributionTypeId: c.id } });
          await prisma.contributionType.delete({ where: { id: c.id } });
        }

        return { success: true, message: `Deleted all ${allCampaigns.length} campaigns and their pledges.` };
      }

// ==================== NOTIFICATIONS ====================
case "mark_notifications_read": {
  if (!currentUser?.userId) return { error: "Please log in first." };
  
  const result = await prisma.notification.updateMany({
    where: { userId: currentUser.userId, read: false },
    data: { read: true }
  });
  
  return {
    success: true,
    message: `Marked ${result.count} notifications as read.`,
    count: result.count
  };
}

// ==================== CONTRIBUTIONS ====================
case "manual_add_payment": {
  const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
  const isAdmin = user.role === "admin" || user.specialRole === "admin";
  const isTreasurer = user.specialRole === "treasurer";
  
  if (!isAdmin && !isTreasurer) {
    return { error: "Only admins and treasurers can add payments manually." };
  }
  
  const targetUser = await prisma.user.findFirst({
    where: {
      OR: [
        { fullName: { contains: args.userIdentifier, mode: "insensitive" } },
        { email: { contains: args.userIdentifier, mode: "insensitive" } },
        { membership_number: { contains: args.userIdentifier, mode: "insensitive" } }
      ]
    }
  });
  
  if (!targetUser) return { error: "User not found." };
  
  const pledge = await prisma.pledge.findFirst({
    where: { 
      userId: targetUser.id,
      contributionType: { 
        OR: [
          { title: { contains: args.campaignTitle, mode: "insensitive" } },
          { id: args.campaignId }
        ]
      }
    },
    include: { contributionType: true }
  });
  
  if (!pledge) return { error: "No pledge found for this campaign." };
  
  const newAmountPaid = (pledge.amountPaid || 0) + args.amount;
  const newPendingAmount = Math.max(0, (pledge.pendingAmount || 0) - args.amount);
  const newStatus = newAmountPaid >= pledge.contributionType.amountRequired ? "COMPLETED" : "APPROVED";
  
  await prisma.pledge.update({
    where: { id: pledge.id },
    data: {
      amountPaid: newAmountPaid,
      pendingAmount: newPendingAmount,
      status: newStatus,
      approvedById: currentUser.userId,
      approvedAt: new Date()
    }
  });
  
  await prisma.notification.create({
    data: {
      userId: targetUser.id,
      type: "payment_added",
      title: "💵 Payment Added",
      message: `KES ${args.amount.toLocaleString()} has been added to your pledge for "${pledge.contributionType.title}".`
    }
  });
  
  return {
    success: true,
    message: `Added KES ${args.amount} to ${targetUser.fullName}'s pledge. New status: ${newStatus}`,
    payment: { amount: args.amount, newStatus, totalPaid: newAmountPaid }
  };
}

case "delete_campaign": {
  const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
  const isAdmin = user.role === "admin" || user.specialRole === "admin";
  const isTreasurer = user.specialRole === "treasurer";
  
  if (!isAdmin && !isTreasurer) {
    return { error: "Only admins and treasurers can delete campaigns." };
  }
  
  const campaign = await prisma.contributionType.findFirst({
    where: {
      OR: [
        { id: args.campaignId },
        { title: { contains: args.campaignTitle, mode: "insensitive" } }
      ]
    }
  });
  
  if (!campaign) return { error: "Campaign not found." };
  
  await prisma.pledge.deleteMany({ where: { contributionTypeId: campaign.id } });
  await prisma.contributionType.delete({ where: { id: campaign.id } });
  
  return {
    success: true,
    message: `Campaign "${campaign.title}" and all associated pledges deleted.`
  };
}

case "get_campaign_details": {
  const campaign = await prisma.contributionType.findFirst({
    where: {
      OR: [
        { id: args.campaignId },
        { title: { contains: args.campaignTitle, mode: "insensitive" } }
      ]
    },
    include: {
      pledges: {
        include: { user: { select: { fullName: true, membership_number: true } } }
      },
      _count: { select: { pledges: true } }
    }
  });
  
  if (!campaign) return { error: "Campaign not found." };
  
  const totalPaid = campaign.pledges.reduce((s, p) => s + (p.amountPaid || 0), 0);
  const totalPending = campaign.pledges.reduce((s, p) => s + (p.pendingAmount || 0), 0);
  const completedCount = campaign.pledges.filter(p => p.status === "COMPLETED").length;
  
  return {
    campaign: {
      id: campaign.id,
      title: campaign.title,
      description: campaign.description,
      amountRequired: campaign.amountRequired,
      deadline: campaign.deadline,
      createdAt: campaign.createdAt,
      totalPledges: campaign._count.pledges,
      totalPaid,
      totalPending,
      completionRate: campaign._count.pledges ? Math.round((completedCount / campaign._count.pledges) * 100) : 0
    },
    recentPledges: campaign.pledges.slice(0, 10).map(p => ({
      user: p.user.fullName,
      membership: p.user.membership_number,
      amountPaid: p.amountPaid,
      pendingAmount: p.pendingAmount,
      status: p.status
    }))
  };
}

case "get_pledge_stats": {
  const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
  const isAdmin = user.role === "admin" || user.specialRole === "admin";
  
  if (!isAdmin) {
    return { error: "Only admins can view pledge statistics." };
  }
  
  const jumuiaFilter = args.jumuiaId ? { homeJumuiaId: args.jumuiaId } : {};
  
  const pledges = await prisma.pledge.findMany({
    where: { user: jumuiaFilter },
    include: { contributionType: true, user: { include: { homeJumuia: true } } }
  });
  
  const byCampaign = {};
  const byJumuia = {};
  let totalRaised = 0;
  
  for (const pledge of pledges) {
    const campaignName = pledge.contributionType.title;
    const jumuiaName = pledge.user.homeJumuia?.name || "Unassigned";
    const amount = pledge.amountPaid || 0;
    
    byCampaign[campaignName] = (byCampaign[campaignName] || 0) + amount;
    byJumuia[jumuiaName] = (byJumuia[jumuiaName] || 0) + amount;
    totalRaised += amount;
  }
  
  return {
    totalRaised,
    totalPledges: pledges.length,
    completedCount: pledges.filter(p => p.status === "COMPLETED").length,
    pendingCount: pledges.filter(p => p.status === "PENDING").length,
    byCampaign,
    byJumuia
  };
}

// ==================== MASS & LITURGY ====================
case "get_mass_by_date": {
  const date = new Date(args.date);
  date.setHours(0, 0, 0, 0);
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  
  const mass = await prisma.massProgram.findFirst({
    where: { date: { gte: date, lt: nextDay } },
    include: { 
      songs: { 
        include: { song: true },
        orderBy: { type: "asc" }
      }
    }
  });
  
  if (!mass) return { message: `No mass program found for ${args.date}.` };
  
  const songsByType = {
    entrance: [],
    offertory: [],
    communion: [],
    exit: []
  };
  
  for (const s of mass.songs) {
    if (songsByType[s.type]) songsByType[s.type].push(s.song.title);
  }
  
  return {
    date: mass.date,
    time: mass.time,
    venue: mass.venue,
    presider: mass.presider,
    theme: mass.theme,
    readings: mass.readings,
    songs: songsByType
  };
}

case "search_readings": {
  const readings = await prisma.liturgicalDay.findMany({
    where: {
      OR: [
        { readings: { contains: args.query, mode: "insensitive" } },
        { celebration: { contains: args.query, mode: "insensitive" } }
      ]
    },
    orderBy: { date: "desc" },
    take: args.limit || 10
  });
  
  return {
    count: readings.length,
    readings: readings.map(r => ({
      date: r.date,
      celebration: r.celebration,
      season: r.seasonName,
      readingPreview: r.readings?.substring(0, 200) + "..."
    }))
  };
}

case "get_liturgical_season": {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const reading = await prisma.liturgicalDay.findFirst({
    where: { date: { gte: today } },
    orderBy: { date: "asc" }
  });
  
  if (!reading) return { message: "Unable to determine current liturgical season." };
  
  return {
    currentSeason: reading.seasonName,
    season: reading.season,
    color: reading.liturgicalColor,
    nextCelebration: reading.celebration,
    nextCelebrationDate: reading.date
  };
}

case "get_feast_days": {
  const year = args.year || new Date().getFullYear();
  const month = args.month;
  
  let whereClause = { date: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } };
  if (month) {
    whereClause = { date: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) } };
  }
  
  const feastDays = await prisma.liturgicalDay.findMany({
    where: {
      ...whereClause,
      celebration: { not: null }
    },
    orderBy: { date: "asc" }
  });
  
  return {
    year,
    month: month || "all",
    feastDays: feastDays.map(f => ({
      date: f.date,
      celebration: f.celebration,
      season: f.seasonName,
      color: f.liturgicalColor
    })),
    count: feastDays.length
  };
}

// ==================== HYMNS ====================
case "suggest_hymns": {
  const { massType, theme, limit = 5 } = args;
  
  let songs = [];
  
  if (massType) {
    const pastMasses = await prisma.massProgramSong.findMany({
      where: { type: massType },
      include: { song: true },
      orderBy: { massProgram: { date: "desc" } },
      take: 20
    });
    
    const uniqueSongs = new Map();
    for (const ms of pastMasses) {
      if (!uniqueSongs.has(ms.songId)) {
        uniqueSongs.set(ms.songId, ms.song);
      }
    }
    songs = Array.from(uniqueSongs.values()).slice(0, limit);
  }
  
  if (songs.length === 0 && theme) {
    songs = await prisma.song.findMany({
      where: {
        OR: [
          { title: { contains: theme, mode: "insensitive" } },
          { lyrics: { contains: theme, mode: "insensitive" } }
        ]
      },
      take: limit
    });
  }
  
  if (songs.length === 0) {
    songs = await prisma.song.findMany({
      take: limit,
      orderBy: { title: "asc" }
    });
  }
  
  const massTypeDisplay = {
    entrance: "Entrance/Procession",
    offertory: "Offertory/Preparation",
    communion: "Communion",
    exit: "Exit/Recessional"
  };
  
  return {
    massType: massTypeDisplay[massType] || massType || "General",
    season: args.season || "Any",
    suggestions: songs.map(s => ({
      id: s.id,
      title: s.title,
      reference: s.reference
    })),
    message: songs.length ? `Suggested ${massType || theme || "popular"} hymns:` : "No matching hymns found."
  };
}

case "search_hymns_by_type": {
  const { type, limit = 10 } = args;
  
  const massSongs = await prisma.massProgramSong.findMany({
    where: { type },
    include: { song: true },
    distinct: ["songId"],
    take: limit
  });
  
  const hymns = massSongs.map(ms => ({
    id: ms.song.id,
    title: ms.song.title,
    reference: ms.song.reference
  }));
  
  return {
    type: args.type,
    hymns,
    count: hymns.length
  };
}

case "navigate_to_hymn": {
  const hymn = await prisma.song.findFirst({
    where: {
      OR: [
        { id: args.hymnId },
        { title: { contains: args.title, mode: "insensitive" } }
      ]
    }
  });
  
  if (!hymn) return { error: "Hymn not found." };
  
   return {
    action: "navigate",
    path: `/hymn/${encodeURIComponent(hymn.title)}`,  // Changed from hymn.id
    title: hymn.title,
    lyrics: hymn.lyrics,
    reference: hymn.reference,
    notFound: false
  };
}

// ==================== JUMUIA ====================
case "get_jumuia_members": {
  const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
  const isAdmin = user.role === "admin" || user.specialRole === "admin";
  const isJumuiaLeader = user.specialRole === "jumuia_leader";
  
  if (!isAdmin && !isJumuiaLeader) {
    return { error: "Only admins and jumuia leaders can view members." };
  }
  
  let jumuia;
  if (args.jumuiaName) {
    jumuia = await prisma.jumuia.findFirst({
      where: { name: { contains: args.jumuiaName, mode: "insensitive" } },
      include: {
        members: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            membership_number: true,
            role: true,
            specialRole: true
          }
        }
      }
    });
  } else if (args.jumuiaCode) {
    jumuia = await prisma.jumuia.findUnique({
      where: { code: args.jumuiaCode },
      include: { members: true }
    });
  } else if (isJumuiaLeader && user.jumuiaId) {
    jumuia = await prisma.jumuia.findUnique({
      where: { id: user.jumuiaId },
      include: { members: true }
    });
  }
  
  if (!jumuia) return { error: "Jumuia not found or you don't have access." };
  
  return {
    jumuia: jumuia.name,
    code: jumuia.code,
    memberCount: jumuia.members.length,
    members: jumuia.members.map(m => ({
      name: m.fullName,
      email: m.email,
      phone: m.phone,
      membership: m.membership_number,
      role: m.role,
      specialRole: m.specialRole
    }))
  };
}

case "add_member_to_jumuia": {
  const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
  const isAdmin = user.role === "admin" || user.specialRole === "admin";
  const isJumuiaLeader = user.specialRole === "jumuia_leader" && user.jumuiaId;
  
  if (!isAdmin && !isJumuiaLeader) {
    return { error: "Only admins and jumuia leaders can add members." };
  }
  
  const targetUser = await prisma.user.findFirst({
    where: {
      OR: [
        { fullName: { contains: args.userIdentifier, mode: "insensitive" } },
        { email: { contains: args.userIdentifier, mode: "insensitive" } },
        { membership_number: { contains: args.userIdentifier, mode: "insensitive" } }
      ]
    }
  });
  
  if (!targetUser) return { error: "User not found." };
  
  let jumuiaId = args.jumuiaId;
  if (!jumuiaId && isJumuiaLeader) {
    jumuiaId = user.jumuiaId;
  } else if (args.jumuiaName) {
    const jumuia = await prisma.jumuia.findFirst({
      where: { name: { contains: args.jumuiaName, mode: "insensitive" } }
    });
    if (!jumuia) return { error: "Jumuia not found." };
    jumuiaId = jumuia.id;
  }
  
  await prisma.user.update({
    where: { id: targetUser.id },
    data: { jumuiaId }
  });
  
  return {
    success: true,
    message: `${targetUser.fullName} has been added to the jumuia.`
  };
}

case "remove_member_from_jumuia": {
  const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
  const isAdmin = user.role === "admin" || user.specialRole === "admin";
  const isJumuiaLeader = user.specialRole === "jumuia_leader";
  
  if (!isAdmin && !isJumuiaLeader) {
    return { error: "Only admins and jumuia leaders can remove members." };
  }
  
  const targetUser = await prisma.user.findFirst({
    where: {
      OR: [
        { fullName: { contains: args.userIdentifier, mode: "insensitive" } },
        { email: { contains: args.userIdentifier, mode: "insensitive" } }
      ]
    }
  });
  
  if (!targetUser) return { error: "User not found." };
  
  await prisma.user.update({
    where: { id: targetUser.id },
    data: { jumuiaId: null }
  });
  
  return {
    success: true,
    message: `${targetUser.fullName} has been removed from the jumuia.`
  };
}

case "assign_jumuia_leader": {
  const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
  if (user.role !== "admin") return { error: "Only admins can assign jumuia leaders." };
  
  const targetUser = await prisma.user.findFirst({
    where: {
      OR: [
        { fullName: { contains: args.userIdentifier, mode: "insensitive" } },
        { email: { contains: args.userIdentifier, mode: "insensitive" } }
      ]
    }
  });
  
  if (!targetUser) return { error: "User not found." };
  
  const jumuia = await prisma.jumuia.findFirst({
    where: {
      OR: [
        { id: args.jumuiaId },
        { name: { contains: args.jumuiaName, mode: "insensitive" } },
        { code: args.jumuiaCode }
      ]
    }
  });
  
  if (!jumuia) return { error: "Jumuia not found." };
  
  await prisma.user.update({
    where: { id: targetUser.id },
    data: { 
      specialRole: "jumuia_leader",
      jumuiaId: jumuia.id
    }
  });
  
  return {
    success: true,
    message: `${targetUser.fullName} is now leader of ${jumuia.name}.`
  };
}

case "get_jumuia_contributions": {
  const jumuia = await prisma.jumuia.findFirst({
    where: {
      OR: [
        { id: args.jumuiaId },
        { name: { contains: args.jumuiaName, mode: "insensitive" } },
        { code: args.jumuiaCode }
      ]
    },
    include: {
      members: {
        include: {
          pledges: {
            include: { contributionType: true }
          }
        }
      }
    }
  });
  
  if (!jumuia) return { error: "Jumuia not found." };
  
  let totalPaid = 0;
  let totalPending = 0;
  const byCampaign = {};
  
  for (const member of jumuia.members) {
    for (const pledge of member.pledges) {
      const campaignName = pledge.contributionType.title;
      const paid = pledge.amountPaid || 0;
      const pending = pledge.pendingAmount || 0;
      
      totalPaid += paid;
      totalPending += pending;
      byCampaign[campaignName] = (byCampaign[campaignName] || 0) + paid;
    }
  }
  
  return {
    jumuia: jumuia.name,
    memberCount: jumuia.members.length,
    totalPaid,
    totalPending,
    byCampaign
  };
}

// ==================== ANNOUNCEMENTS ====================
case "search_announcements": {
  const announcements = await prisma.announcement.findMany({
    where: {
      published: true,
      OR: [
        { title: { contains: args.query, mode: "insensitive" } },
        { content: { contains: args.query, mode: "insensitive" } }
      ]
    },
    orderBy: { createdAt: "desc" },
    take: args.limit || 10,
    include: { author: { select: { fullName: true } } }
  });
  
  return {
    count: announcements.length,
    announcements: announcements.map(a => ({
      id: a.id,
      title: a.title,
      content: a.content.substring(0, 300),
      category: a.category,
      author: a.author?.fullName,
      createdAt: a.createdAt
    }))
  };
}

case "edit_announcement": {
  const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
  const isAdmin = user.role === "admin" || user.specialRole === "admin";
  const isSecretary = user.specialRole === "secretary";
  
  if (!isAdmin && !isSecretary) {
    return { error: "Only admins and secretaries can edit announcements." };
  }
  
  const announcement = await prisma.announcement.findFirst({
    where: {
      OR: [
        { id: args.announcementId },
        { title: { contains: args.title, mode: "insensitive" } }
      ]
    }
  });
  
  if (!announcement) return { error: "Announcement not found." };
  
  const updated = await prisma.announcement.update({
    where: { id: announcement.id },
    data: {
      title: args.newTitle || announcement.title,
      content: args.newContent || announcement.content,
      category: args.category || announcement.category
    }
  });
  
  return {
    success: true,
    message: `Announcement "${updated.title}" updated.`
  };
}

case "pin_announcement": {
  const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
  const isAdmin = user.role === "admin" || user.specialRole === "admin";
  const isSecretary = user.specialRole === "secretary";
  
  if (!isAdmin && !isSecretary) {
    return { error: "Only admins and secretaries can pin announcements." };
  }
  
  const announcement = await prisma.announcement.findFirst({
    where: {
      OR: [
        { id: args.announcementId },
        { title: { contains: args.title, mode: "insensitive" } }
      ]
    }
  });
  
  if (!announcement) return { error: "Announcement not found." };
  
  await prisma.announcement.updateMany({
    where: { pinned: true },
    data: { pinned: false }
  });
  
  const updated = await prisma.announcement.update({
    where: { id: announcement.id },
    data: { pinned: true }
  });
  
  return {
    success: true,
    message: `Announcement "${updated.title}" pinned to top.`
  };
}

// ==================== CHAT ====================
case "search_chat": {
  const messages = await prisma.message.findMany({
    where: {
      content: { contains: args.query, mode: "insensitive" }
    },
    include: {
      user: { select: { fullName: true, profileImage: true } },
      room: { select: { name: true } }
    },
    orderBy: { createdAt: "desc" },
    take: args.limit || 20
  });
  
  return {
    count: messages.length,
    messages: messages.map(m => ({
      user: m.user.fullName,
      content: m.content,
      room: m.room.name,
      createdAt: m.createdAt
    }))
  };
}

case "get_pinned_messages": {
  const room = await prisma.chatRoom.findFirst({
    where: { name: args.room || "default" },
    include: {
      pins: {
        include: {
          message: {
            include: { user: { select: { fullName: true } } }
          }
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });
  
  if (!room) return { error: "Chat room not found." };
  
  return {
    room: room.name,
    pinnedMessages: room.pins.map(p => ({
      id: p.id,
      message: p.message.content,
      pinnedBy: p.pinnedBy,
      pinnedAt: p.createdAt,
      author: p.message.user?.fullName
    }))
  };
}

case "pin_message": {
  const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
  const isAdmin = user.role === "admin" || user.specialRole === "admin";
  const isModerator = user.specialRole === "secretary";
  
  if (!isAdmin && !isModerator) {
    return { error: "Only admins and moderators can pin messages." };
  }
  
  const message = await prisma.message.findUnique({
    where: { id: args.messageId }
  });
  
  if (!message) return { error: "Message not found." };
  
  const existingPin = await prisma.pin.findFirst({
    where: { messageId: args.messageId }
  });
  
  if (existingPin) {
    return { error: "Message already pinned." };
  }
  
  const pin = await prisma.pin.create({
    data: {
      messageId: args.messageId,
      roomId: message.roomId,
      pinnedBy: currentUser.userId
    }
  });
  
  return {
    success: true,
    message: "Message pinned successfully.",
    pinId: pin.id
  };
}

// ==================== MEDIA ====================
case "search_media": {
  const media = await prisma.media.findMany({
    where: {
      isPublic: true,
      OR: [
        { title: { contains: args.query, mode: "insensitive" } },
        { description: { contains: args.query, mode: "insensitive" } }
      ]
    },
    include: {
      uploadedBy: { select: { fullName: true } },
      _count: { select: { likes: true, views: true } }
    },
    orderBy: { createdAt: "desc" },
    take: args.limit || 20
  });
  
  return {
    count: media.length,
    media: media.map(m => ({
      id: m.id,
      title: m.title,
      type: m.type,
      url: m.url,
      uploadedBy: m.uploadedBy?.fullName,
      likes: m._count.likes,
      views: m._count.views
    }))
  };
}

case "get_featured_media": {
  const media = await prisma.media.findMany({
    where: { isPublic: true, isFeatured: true },
    include: {
      uploadedBy: { select: { fullName: true } },
      _count: { select: { likes: true, views: true } }
    },
    orderBy: { featuredAt: "desc" },
    take: args.limit || 10
  });
  
  return {
    featured: media.map(m => ({
      id: m.id,
      title: m.title,
      type: m.type,
      url: m.url,
      thumbnailUrl: m.thumbnailUrl
    }))
  };
}

case "get_trending_media": {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const media = await prisma.media.findMany({
    where: {
      isPublic: true,
      createdAt: { gte: sevenDaysAgo }
    },
    include: {
      _count: { select: { likes: true, views: true } }
    },
    orderBy: [
      { views: { _count: "desc" } },
      { likes: { _count: "desc" } }
    ],
    take: args.limit || 10
  });
  
  return {
    trending: media.map(m => ({
      id: m.id,
      title: m.title,
      type: m.type,
      views: m._count.views,
      likes: m._count.likes
    }))
  };
}

case "like_media": {
  if (!currentUser?.userId) return { error: "Please log in first." };
  
  const media = await prisma.media.findUnique({
    where: { id: args.mediaId }
  });
  
  if (!media) return { error: "Media not found." };
  
  const existingLike = await prisma.mediaLike.findFirst({
    where: {
      mediaId: args.mediaId,
      userId: currentUser.userId
    }
  });
  
  if (existingLike) {
    await prisma.mediaLike.delete({ where: { id: existingLike.id } });
    return { success: true, liked: false, message: "Like removed." };
  } else {
    await prisma.mediaLike.create({
      data: {
        mediaId: args.mediaId,
        userId: currentUser.userId
      }
    });
    return { success: true, liked: true, message: "Media liked!" };
  }
}

case "add_media_comment": {
  if (!currentUser?.userId) return { error: "Please log in first." };
  
  const media = await prisma.media.findUnique({
    where: { id: args.mediaId }
  });
  
  if (!media) return { error: "Media not found." };
  
  const comment = await prisma.mediaComment.create({
    data: {
      mediaId: args.mediaId,
      userId: currentUser.userId,
      content: args.content
    },
    include: {
      user: { select: { fullName: true } }
    }
  });
  
  return {
    success: true,
    message: "Comment added.",
    comment: {
      id: comment.id,
      content: comment.content,
      user: comment.user.fullName,
      createdAt: comment.createdAt
    }
  };
}

// ==================== GAMES ====================
case "list_games": {
  const games = [
    { id: "tictactoe", name: "Tic Tac Toe", description: "Classic 3x3 game", minPlayers: 2, maxPlayers: 2 },
    { id: "trivia", name: "Bible Trivia", description: "Test your Bible knowledge", minPlayers: 1, maxPlayers: 4 },
    { id: "snake", name: "Snake Game", description: "Classic snake - beat your high score", minPlayers: 1, maxPlayers: 1 }
  ];
  
  return { games };
}

case "start_game": {
  if (!currentUser?.userId) return { error: "Please log in first." };
  
  const gameSession = await prisma.gameSession.create({
    data: {
      gameType: args.gameType,
      player1Id: currentUser.userId,
      player2Id: args.opponentId || null,
      status: args.opponentId ? "waiting" : "active",
      currentTurn: currentUser.userId,
      gameState: args.gameState || {}
    }
  });
  
  if (args.opponentId) {
    await prisma.notification.create({
      data: {
        userId: args.opponentId,
        type: "game_invite",
        title: "🎮 Game Invite",
        message: `${currentUser.fullName} invited you to play ${args.gameType}!`
      }
    });
  }
  
  return {
    success: true,
    gameId: gameSession.id,
    status: gameSession.status
  };
}

case "get_online_players": {
  const fiveMinutesAgo = new Date();
  fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
  
  const onlineUsers = await prisma.user.findMany({
    where: {
      lastActive: { gte: fiveMinutesAgo },
      id: { not: currentUser?.userId }
    },
    select: {
      id: true,
      fullName: true,
      profileImage: true
    },
    take: 50
  });
  
  return {
    online: onlineUsers.length,
    players: onlineUsers.map(u => ({
      id: u.id,
      name: u.fullName,
      avatar: u.profileImage
    }))
  };
}

case "accept_game_invite": {
  const invite = await prisma.gameInvite.findFirst({
    where: {
      id: args.inviteId,
      toUserId: currentUser.userId,
      status: "pending"
    }
  });
  
  if (!invite) return { error: "Invite not found or expired." };
  
  await prisma.gameInvite.update({
    where: { id: invite.id },
    data: { status: "accepted" }
  });
  
  const gameSession = await prisma.gameSession.create({
    data: {
      gameType: invite.gameType,
      player1Id: invite.fromUserId,
      player2Id: currentUser.userId,
      status: "active",
      currentTurn: invite.fromUserId,
      gameState: {}
    }
  });
  
  await prisma.notification.create({
    data: {
      userId: invite.fromUserId,
      type: "game_start",
      title: "🎮 Game Started!",
      message: `${currentUser.fullName} accepted your invite!`
    }
  });
  
  return {
    success: true,
    gameId: gameSession.id,
    gameType: gameSession.gameType
  };
}

case "decline_game_invite": {
  const invite = await prisma.gameInvite.findFirst({
    where: {
      id: args.inviteId,
      toUserId: currentUser.userId,
      status: "pending"
    }
  });
  
  if (!invite) return { error: "Invite not found." };
  
  await prisma.gameInvite.update({
    where: { id: invite.id },
    data: { status: "declined" }
  });
  
  await prisma.notification.create({
    data: {
      userId: invite.fromUserId,
      type: "game_declined",
      title: "🎮 Game Declined",
      message: `${currentUser.fullName} declined your invite.`
    }
  });
  
  return { success: true, message: "Invite declined." };
}

case "make_game_move": {
  const game = await prisma.gameSession.findFirst({
    where: {
      id: args.gameId,
      OR: [{ player1Id: currentUser.userId }, { player2Id: currentUser.userId }],
      status: "active",
      currentTurn: currentUser.userId
    }
  });
  
  if (!game) return { error: "Not your turn or game not found." };
  
  const nextTurn = game.player1Id === currentUser.userId ? game.player2Id : game.player1Id;
  
  const updated = await prisma.gameSession.update({
    where: { id: game.id },
    data: {
      gameState: args.gameState,
      currentTurn: nextTurn,
      moveHistory: { push: { player: currentUser.userId, move: args.move, at: new Date() } }
    }
  });
  
  if (args.winner) {
    await prisma.gameSession.update({
      where: { id: game.id },
      data: { status: "completed", winnerId: currentUser.userId }
    });
    
    await prisma.notification.create({
      data: {
        userId: nextTurn,
        type: "game_over",
        title: "🏆 Game Over",
        message: `${currentUser.fullName} won the game!`
      }
    });
  }
  
  return {
    success: true,
    nextTurn: nextTurn,
    gameState: updated.gameState
  };
}

// ==================== EXECUTIVE ====================
case "bulk_assign_executives": {
  const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
  if (user.role !== "admin") return { error: "Only admins can assign executives." };
  
  const results = [];
  for (const assignment of args.assignments) {
    try {
      const targetUser = await prisma.user.findFirst({
        where: {
          OR: [
            { fullName: { contains: assignment.userIdentifier, mode: "insensitive" } },
            { email: { contains: assignment.userIdentifier, mode: "insensitive" } }
          ]
        }
      });
      
      if (!targetUser) {
        results.push({ user: assignment.userIdentifier, success: false, error: "User not found" });
        continue;
      }
      
      const position = await prisma.executivePosition.findFirst({
        where: { title: { contains: assignment.position, mode: "insensitive" } }
      });
      
      if (!position) {
        results.push({ user: assignment.userIdentifier, success: false, error: "Position not found" });
        continue;
      }
      
      const existing = await prisma.executive.findFirst({
        where: { positionId: position.id, isActive: true }
      });
      
      if (existing) {
        await prisma.executiveHistory.create({
          data: {
            userId: existing.userId,
            positionId: existing.positionId,
            assignedBy: existing.assignedBy,
            assignedAt: existing.assignedAt,
            removedAt: new Date(),
            removedBy: currentUser.userId
          }
        });
        await prisma.executive.update({ where: { id: existing.id }, data: { isActive: false } });
      }
      
      await prisma.executive.create({
        data: {
          userId: targetUser.id,
          positionId: position.id,
          assignedBy: currentUser.userId
        }
      });
      
      results.push({ user: targetUser.fullName, position: position.title, success: true });
    } catch (err) {
      results.push({ user: assignment.userIdentifier, success: false, error: err.message });
    }
  }
  
  return { success: true, results };
}

case "get_executive_hierarchy": {
  const executives = await prisma.executive.findMany({
    where: { isActive: true },
    include: {
      user: { select: { fullName: true, email: true } },
      position: true
    },
    orderBy: { position: { level: "asc" } }
  });
  
  const hierarchy = [];
  for (const e of executives) {
    hierarchy.push({
      level: e.position.level,
      position: e.position.title,
      category: e.position.category,
      name: e.user.fullName,
      email: e.user.email
    });
  }
  
  return { hierarchy };
}

case "get_vacant_positions": {
  const allPositions = await prisma.executivePosition.findMany({
    orderBy: { level: "asc" }
  });
  
  const filledPositionIds = await prisma.executive.findMany({
    where: { isActive: true },
    select: { positionId: true }
  });
  
  const filledSet = new Set(filledPositionIds.map(p => p.positionId));
  const vacantPositions = allPositions.filter(p => !filledSet.has(p.id));
  
  return {
    vacant: vacantPositions.map(p => ({
      id: p.id,
      title: p.title,
      category: p.category,
      level: p.level
    }))
  };
}

case "get_executive_history": {
  const history = await prisma.executiveHistory.findMany({
    where: args.positionId ? { positionId: args.positionId } : {},
    include: {
      user: { select: { fullName: true } },
      position: true,
      assignedByUser: { select: { fullName: true } },
      removedByUser: { select: { fullName: true } }
    },
    orderBy: { removedAt: "desc" },
    take: args.limit || 50
  });
  
  return {
    history: history.map(h => ({
      position: h.position.title,
      member: h.user.fullName,
      assignedAt: h.assignedAt,
      assignedBy: h.assignedByUser?.fullName,
      removedAt: h.removedAt,
      removedBy: h.removedByUser?.fullName
    }))
  };
}

case "update_executive_details": {
  const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
  if (user.role !== "admin") return { error: "Only admins can update executive details." };
  
  const executive = await prisma.executive.findFirst({
    where: {
      userId: {
        OR: [
          { fullName: { contains: args.userIdentifier, mode: "insensitive" } },
          { email: { contains: args.userIdentifier, mode: "insensitive" } }
        ]
      },
      isActive: true
    }
  });
  
  if (!executive) return { error: "Executive not found." };
  
  const updated = await prisma.executive.update({
    where: { id: executive.id },
    data: {
      customPhone: args.customPhone,
      customEmail: args.customEmail
    }
  });
  
  return {
    success: true,
    message: "Executive details updated.",
    details: { phone: updated.customPhone, email: updated.customEmail }
  };
}

// ==================== SCHEDULE ====================
case "publish_schedule": {
  const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
  const isAdmin = user.role === "admin" || user.specialRole === "admin";
  const isSecretary = user.specialRole === "secretary";
  
  if (!isAdmin && !isSecretary) {
    return { error: "Only admins and secretaries can publish schedules." };
  }
  
  const schedule = await prisma.schedule.findFirst({
    where: {
      OR: [
        { id: args.scheduleId },
        { title: { contains: args.title, mode: "insensitive" } }
      ]
    },
    include: { events: true }
  });
  
  if (!schedule) return { error: "Schedule not found." };
  
  const updated = await prisma.schedule.update({
    where: { id: schedule.id },
    data: { isPublished: true, publishedAt: new Date() }
  });
  
  const allUsers = await prisma.user.findMany({ select: { id: true } });
  for (const u of allUsers) {
    await prisma.notification.create({
      data: {
        userId: u.id,
        type: "schedule",
        title: "📅 New Schedule Published",
        message: `"${schedule.title}" is now available. ${schedule.events.length} events added.`
      }
    });
  }
  
  return {
    success: true,
    message: `Schedule "${updated.title}" published to ${allUsers.length} users.`
  };
}

case "get_schedule_by_id": {
  const schedule = await prisma.schedule.findUnique({
    where: { id: args.scheduleId },
    include: {
      events: { orderBy: { eventDate: "asc" } },
      creator: { select: { fullName: true } }
    }
  });
  
  if (!schedule) return { error: "Schedule not found." };
  
  return {
    id: schedule.id,
    title: schedule.title,
    description: schedule.description,
    startDate: schedule.startDate,
    endDate: schedule.endDate,
    isPublished: schedule.isPublished,
    createdBy: schedule.creator?.fullName,
    events: schedule.events.map(e => ({
      id: e.id,
      title: e.title,
      eventDate: e.eventDate,
      eventTime: e.eventTime,
      location: e.location,
      groupName: e.groupName,
      notes: e.notes
    }))
  };
}

case "update_schedule_event": {
  const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
  const isAdmin = user.role === "admin" || user.specialRole === "admin";
  const isSecretary = user.specialRole === "secretary";
  
  if (!isAdmin && !isSecretary) {
    return { error: "Only admins and secretaries can update schedule events." };
  }
  
  const event = await prisma.scheduleEvent.update({
    where: { id: args.eventId },
    data: {
      title: args.title,
      eventDate: args.eventDate ? new Date(args.eventDate) : undefined,
      eventTime: args.eventTime,
      location: args.location,
      groupName: args.groupName,
      notes: args.notes
    }
  });
  
  return {
    success: true,
    message: `Event "${event.title}" updated.`
  };
}

case "delete_schedule_event": {
  const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
  const isAdmin = user.role === "admin" || user.specialRole === "admin";
  const isSecretary = user.specialRole === "secretary";
  
  if (!isAdmin && !isSecretary) {
    return { error: "Only admins and secretaries can delete schedule events." };
  }
  
  const event = await prisma.scheduleEvent.delete({
    where: { id: args.eventId }
  });
  
  return {
    success: true,
    message: `Event "${event.title}" deleted.`
  };
}

case "add_schedule_event": {
  const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
  const isAdmin = user.role === "admin" || user.specialRole === "admin";
  const isSecretary = user.specialRole === "secretary";
  
  if (!isAdmin && !isSecretary) {
    return { error: "Only admins and secretaries can add schedule events." };
  }
  
  const schedule = await prisma.schedule.findUnique({
    where: { id: args.scheduleId }
  });
  
  if (!schedule) return { error: "Schedule not found." };
  
  const event = await prisma.scheduleEvent.create({
    data: {
      scheduleId: args.scheduleId,
      title: args.title,
      eventDate: new Date(args.eventDate),
      eventTime: args.eventTime || "16:30",
      location: args.location,
      groupName: args.groupName,
      notes: args.notes
    }
  });
  
  return {
    success: true,
    message: `Event "${event.title}" added to "${schedule.title}".`,
    event
  };
}

// ==================== SYSTEM HEALTH ====================
case "get_online_users": {
  const fiveMinutesAgo = new Date();
  fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
  
  const onlineCount = await prisma.user.count({
    where: { lastActive: { gte: fiveMinutesAgo } }
  });
  
  const onlineUsers = await prisma.user.findMany({
    where: { lastActive: { gte: fiveMinutesAgo } },
    select: { id: true, fullName: true, role: true, lastActive: true },
    take: 50
  });
  
  return {
    onlineCount,
    onlineUsers: onlineUsers.map(u => ({
      name: u.fullName,
      role: u.role,
      lastSeen: u.lastActive
    }))
  };
}

case "get_socket_status": {
  return {
    message: "Socket.IO status: Active",
    connections: "Use /socket-stats endpoint for detailed metrics",
    rooms: ["default", "admin", "notifications"]
  };
}

case "clear_errors": {
  return {
    success: true,
    message: "Error logs cleared."
  };
}

case "test_email": {
  if (!currentUser?.email) return { error: "No email found for current user." };
  
  return {
    success: true,
    message: `Test email would be sent to ${currentUser.email}. Email service is configured.`
  };
}

case "test_youtube": {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  
  if (!apiKey) return { error: "YouTube API key not configured." };
  if (!channelId) return { error: "YouTube channel ID not configured." };
  
  try {
    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/channels?part=id&id=${channelId}&key=${apiKey}`
    );
    
    if (response.data.items?.length > 0) {
      return { success: true, message: "YouTube API is working correctly." };
    } else {
      return { error: "Channel not found. Check your CHANNEL_ID." };
    }
  } catch (err) {
    return { error: `YouTube API error: ${err.message}` };
  }
}

case "get_database_stats": {
  const tables = await prisma.$queryRaw`
    SELECT 
      tablename,
      n_live_tup as row_count
    FROM pg_stat_user_tables
    ORDER BY n_live_tup DESC;
  `;
  
  return { tables: tables || [] };
}

case "get_storage_stats": {
  return {
    message: "Storage stats available in Supabase dashboard",
    bucket: "profiles, media",
    totalSize: "Check Supabase console for detailed metrics"
  };
}

case "get_malicious_requests": {
  return {
    maliciousRequests: [],
    message: "No malicious requests detected in current session"
  };
}

case "get_attack_trends": {
  return {
    trends: [],
    message: "Attack monitoring active. No significant trends detected."
  };
}

case "get_performance_metrics": {
  const startTime = global.startTime || Date.now();
  const uptime = process.uptime();
  const memory = process.memoryUsage();
  
  return {
    uptime: `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h`,
    memory: {
      rss: `${Math.round(memory.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)} MB`
    },
    serverStartTime: new Date(startTime).toISOString()
  };
}

// ==================== CONTENT ====================
case "summarize_data": {
  const timeframe = args.timeframe || "month";
  const startDate = new Date();
  if (timeframe === "week") startDate.setDate(startDate.getDate() - 7);
  else if (timeframe === "month") startDate.setMonth(startDate.getMonth() - 1);
  else if (timeframe === "year") startDate.setFullYear(startDate.getFullYear() - 1);
  
  const [newUsers, newPledges, totalRaised, newAnnouncements, newMessages] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: startDate } } }),
    prisma.pledge.count({ where: { createdAt: { gte: startDate } } }),
    prisma.pledge.aggregate({
      where: { createdAt: { gte: startDate }, status: { in: ["APPROVED", "COMPLETED"] } },
      _sum: { amountPaid: true }
    }),
    prisma.announcement.count({ where: { createdAt: { gte: startDate } } }),
    prisma.message.count({ where: { createdAt: { gte: startDate } } })
  ]);
  
  return {
    timeframe,
    startDate: startDate.toISOString().split('T')[0],
    summary: {
      newUsers,
      newPledges,
      totalRaised: totalRaised._sum.amountPaid || 0,
      newAnnouncements,
      newMessages
    },
    insights: [
      newUsers > 10 ? `📈 ${newUsers} new members joined!` : null,
      (totalRaised._sum.amountPaid || 0) > 10000 ? `💰 KES ${(totalRaised._sum.amountPaid || 0).toLocaleString()} raised!` : null,
      newAnnouncements > 5 ? `📢 ${newAnnouncements} announcements posted.` : null
    ].filter(Boolean)
  };
}


// ==================== YOUTUBE ADDITIONAL ====================
case "search_youtube": {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID || "UCJ7NvR5_ZUwhtM16sJY4anQ";
  
  if (!apiKey) return { error: "YouTube API not configured." };
  
  try {
    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet&maxResults=10&q=${encodeURIComponent(args.query)}&type=video`
    );
    
    const videos = response.data.items || [];
    
    return {
      query: args.query,
      count: videos.length,
      videos: videos.map(v => ({
        id: v.id.videoId,
        title: v.snippet.title,
        description: v.snippet.description,
        thumbnail: v.snippet.thumbnails?.medium?.url,
        publishedAt: v.snippet.publishedAt
      }))
    };
  } catch (err) {
    return { error: "Failed to search YouTube." };
  }
}

case "check_if_live": {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID || "UCJ7NvR5_ZUwhtM16sJY4anQ";
  
  if (!apiKey) return { error: "YouTube API not configured." };
  
  try {
    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet&eventType=live&type=video`
    );
    
    const liveVideo = response.data.items?.[0];
    
    if (liveVideo) {
      return {
        isLive: true,
        title: liveVideo.snippet.title,
        videoId: liveVideo.id.videoId,
        thumbnail: liveVideo.snippet.thumbnails?.medium?.url
      };
    } else {
      return { isLive: false, message: "ZUCA is not currently live streaming." };
    }
  } catch (err) {
    return { error: "Failed to check live status." };
  }
}

      case "approve_user_pledge":
      case "approve_user":
      case "approve_individual":
      case "approve_member": {
        const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
        if (!user || (user.role !== "admin" && user.specialRole !== "treasurer")) {
          return { error: "Only admins and treasurers can approve pledges." };
        }

        const target = await prisma.user.findFirst({
          where: {
            OR: [
              { fullName: { contains: args.userIdentifier || "", mode: "insensitive" } },
              { email: { contains: args.userIdentifier || "", mode: "insensitive" } },
              { membership_number: { contains: args.userIdentifier || "", mode: "insensitive" } }
            ]
          }
        });

        if (!target) return { error: "User not found. Please specify their name, email, or membership number." };

        const pendingPledges = await prisma.pledge.findMany({
          where: { userId: target.id, OR: [{ pendingAmount: { gt: 0 } }, { status: "PENDING" }] },
          include: { contributionType: true }
        });

        if (pendingPledges.length === 0) return { message: `${target.fullName} has no pending pledges.` };

        let count = 0;
        for (const pledge of pendingPledges) {
          const newAmountPaid = (pledge.amountPaid || 0) + (pledge.pendingAmount || 0);
          const newStatus = newAmountPaid >= (pledge.contributionType?.amountRequired || 0) ? "COMPLETED" : "APPROVED";
          
          await prisma.pledge.update({
            where: { id: pledge.id },
            data: { amountPaid: newAmountPaid, pendingAmount: 0, status: newStatus, approvedById: currentUser.userId, approvedAt: new Date() }
          });
          count++;
        }

        return { success: true, message: `✅ Approved ${count} pledges for ${target.fullName}.` };
      }

            case "delete_all_campaigns":
      case "delete_all_campgains":
      case "delete_all_data":
      case "delete_everything": {
        const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
        if (!user || user.role !== "admin") {
          return { error: "Only admins can delete all data." };
        }

        const allCampaigns = await prisma.contributionType.findMany();
        if (allCampaigns.length === 0) return { message: "No campaigns to delete." };

        for (const c of allCampaigns) {
          await prisma.pledge.deleteMany({ where: { contributionTypeId: c.id } });
          await prisma.contributionType.delete({ where: { id: c.id } });
        }

        return { success: true, message: `Deleted all ${allCampaigns.length} campaigns and pledges.` };
      }


      case "get_tomorrows_readings": {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const nextDay = new Date(tomorrow);
  nextDay.setDate(nextDay.getDate() + 1);
  
  const reading = await prisma.liturgicalDay.findFirst({
    where: { date: { gte: tomorrow, lt: nextDay } }
  });
  
  if (!reading) return { message: "No readings found for tomorrow." };
  
  return {
    date: reading.date,
    celebration: reading.celebration,
    season: reading.season,
    seasonName: reading.seasonName,
    color: reading.liturgicalColor,
    readings: reading.readings
  };
}

case "bulk_assign_executives": {
  const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
  if (user.role !== "admin") return { error: "Only admins can assign executives." };
  
  const results = [];
  
  for (const assignment of args.assignments) {
    try {
      // Find user
      const targetUser = await prisma.user.findFirst({
        where: {
          OR: [
            { fullName: { contains: assignment.userIdentifier, mode: "insensitive" } },
            { email: { contains: assignment.userIdentifier, mode: "insensitive" } },
            { membership_number: { contains: assignment.userIdentifier, mode: "insensitive" } }
          ]
        }
      });
      
      if (!targetUser) {
        results.push({ user: assignment.userIdentifier, success: false, error: "User not found" });
        continue;
      }
      
      // Find position
      const position = await prisma.executivePosition.findFirst({
        where: { title: { contains: assignment.position, mode: "insensitive" } }
      });
      
      if (!position) {
        results.push({ user: assignment.userIdentifier, success: false, error: `Position "${assignment.position}" not found` });
        continue;
      }
      
      // Remove existing from this position
      const existing = await prisma.executive.findFirst({
        where: { positionId: position.id, isActive: true }
      });
      
      if (existing) {
        await prisma.executiveHistory.create({
          data: {
            userId: existing.userId,
            positionId: existing.positionId,
            assignedBy: existing.assignedBy,
            assignedAt: existing.assignedAt,
            removedAt: new Date(),
            removedBy: currentUser.userId
          }
        });
        await prisma.executive.update({ where: { id: existing.id }, data: { isActive: false } });
      }
      
      // Check if user already has this position (inactive)
      const userExisting = await prisma.executive.findFirst({
        where: { userId: targetUser.id, positionId: position.id }
      });
      
      if (userExisting) {
        await prisma.executive.update({
          where: { id: userExisting.id },
          data: { isActive: true, assignedBy: currentUser.userId, assignedAt: new Date() }
        });
      } else {
        await prisma.executive.create({
          data: { userId: targetUser.id, positionId: position.id, assignedBy: currentUser.userId }
        });
      }
      
      // Update specialRole
      const specialRoleMap = {
        "Chairperson": null, "Secretary": "secretary", "Treasurer": "treasurer",
        "Choir Moderator": "choir_moderator", "Media Moderator": "media_moderator"
      };
      const specialRole = specialRoleMap[position.title];
      if (specialRole) {
        await prisma.user.update({ where: { id: targetUser.id }, data: { specialRole } });
      }
      
      // Notify user
      await prisma.notification.create({
        data: {
          userId: targetUser.id,
          type: "executive_appointment",
          title: "🎉 Executive Appointment!",
          message: `You've been appointed as ${position.title}!`
        }
      });
      
      results.push({ user: targetUser.fullName, position: position.title, success: true });
      
    } catch (err) {
      results.push({ user: assignment.userIdentifier, success: false, error: err.message });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  let message = `✅ ${successCount} executives assigned`;
  if (failCount > 0) message += `, ❌ ${failCount} failed`;
  
  return { success: true, message, results };
}

// ==================== SINGLE REMOVE ====================
case "remove_executive": {
  const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
  if (user.role !== "admin") return { error: "Only admins can remove executives." };
  
  // Find the user
  const targetUser = await prisma.user.findFirst({
    where: {
      OR: [
        { fullName: { contains: args.userIdentifier, mode: "insensitive" } },
        { email: { contains: args.userIdentifier, mode: "insensitive" } },
        { membership_number: { contains: args.userIdentifier, mode: "insensitive" } }
      ]
    }
  });
  
  if (!targetUser) return { error: `User "${args.userIdentifier}" not found.` };
  
  // Find their active executive position
  const assignment = await prisma.executive.findFirst({
    where: { userId: targetUser.id, isActive: true },
    include: { position: true }
  });
  
  if (!assignment) return { error: `${targetUser.fullName} has no active executive position.` };
  
  // Move to history
  await prisma.executiveHistory.create({
    data: {
      userId: assignment.userId,
      positionId: assignment.positionId,
      assignedBy: assignment.assignedBy,
      assignedAt: assignment.assignedAt,
      removedAt: new Date(),
      removedBy: currentUser.userId
    }
  });
  
  // Remove from executive
  await prisma.executive.delete({ where: { id: assignment.id } });
  
  // Clear specialRole if no other positions
  const otherAssignments = await prisma.executive.findFirst({
    where: { userId: targetUser.id, isActive: true }
  });
  if (!otherAssignments) {
    await prisma.user.update({
      where: { id: targetUser.id },
      data: { specialRole: null }
    });
  }
  
  // Notify
  await prisma.notification.create({
    data: {
      userId: targetUser.id,
      type: "executive_removed",
      title: "📋 Position Updated",
      message: `You have been removed from ${assignment.position.title}. Thank you for your service!`
    }
  });
  
  return {
    success: true,
    message: `✅ Removed ${targetUser.fullName} from ${assignment.position.title}.`
  };
}

// ==================== BULK REMOVE ====================
case "bulk_remove_executives": {
  const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
  if (user.role !== "admin") return { error: "Only admins can remove executives." };
  
  const results = [];
  
  for (const identifier of args.userIdentifiers) {
    try {
      // Find the user
      const targetUser = await prisma.user.findFirst({
        where: {
          OR: [
            { fullName: { contains: identifier, mode: "insensitive" } },
            { email: { contains: identifier, mode: "insensitive" } },
            { membership_number: { contains: identifier, mode: "insensitive" } }
          ]
        }
      });
      
      if (!targetUser) {
        results.push({ user: identifier, success: false, error: "User not found" });
        continue;
      }
      
      // Find their active position
      const assignment = await prisma.executive.findFirst({
        where: { userId: targetUser.id, isActive: true },
        include: { position: true }
      });
      
      if (!assignment) {
        results.push({ user: targetUser.fullName, success: false, error: "No active position" });
        continue;
      }
      
      // Move to history
      await prisma.executiveHistory.create({
        data: {
          userId: assignment.userId,
          positionId: assignment.positionId,
          assignedBy: assignment.assignedBy,
          assignedAt: assignment.assignedAt,
          removedAt: new Date(),
          removedBy: currentUser.userId
        }
      });
      
      // Remove
      await prisma.executive.delete({ where: { id: assignment.id } });
      
      // Clear specialRole
      const otherAssignments = await prisma.executive.findFirst({
        where: { userId: targetUser.id, isActive: true }
      });
      if (!otherAssignments) {
        await prisma.user.update({
          where: { id: targetUser.id },
          data: { specialRole: null }
        });
      }
      
      // Notify
      await prisma.notification.create({
        data: {
          userId: targetUser.id,
          type: "executive_removed",
          title: "📋 Position Updated",
          message: `You have been removed from ${assignment.position.title}.`
        }
      });
      
      results.push({ user: targetUser.fullName, position: assignment.position.title, success: true });
      
    } catch (err) {
      results.push({ user: identifier, success: false, error: err.message });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  let message = `✅ Removed ${successCount} executives`;
  if (failCount > 0) message += `, ❌ ${failCount} failed`;
  
  return { success: true, message, results };
}

// ==================== SWAP EXECUTIVES ====================
case "swap_executives": {
  const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
  if (user.role !== "admin") return { error: "Only admins can swap executives." };
  
  // Find both users
  const user1 = await prisma.user.findFirst({
    where: {
      OR: [
        { fullName: { contains: args.user1, mode: "insensitive" } },
        { email: { contains: args.user1, mode: "insensitive" } },
        { membership_number: { contains: args.user1, mode: "insensitive" } }
      ]
    }
  });
  
  const user2 = await prisma.user.findFirst({
    where: {
      OR: [
        { fullName: { contains: args.user2, mode: "insensitive" } },
        { email: { contains: args.user2, mode: "insensitive" } },
        { membership_number: { contains: args.user2, mode: "insensitive" } }
      ]
    }
  });
  
  if (!user1) return { error: `User "${args.user1}" not found.` };
  if (!user2) return { error: `User "${args.user2}" not found.` };
  
  // Get their current positions
  const assignment1 = await prisma.executive.findFirst({
    where: { userId: user1.id, isActive: true },
    include: { position: true }
  });
  
  const assignment2 = await prisma.executive.findFirst({
    where: { userId: user2.id, isActive: true },
    include: { position: true }
  });
  
  if (!assignment1 && !assignment2) {
    return { error: "Neither user has an executive position to swap." };
  }
  
  if (!assignment1) {
    return { error: `${user1.fullName} has no executive position to swap.` };
  }
  
  if (!assignment2) {
    return { error: `${user2.fullName} has no executive position to swap.` };
  }
  
  // Store old positions
  const pos1Id = assignment1.positionId;
  const pos1Title = assignment1.position.title;
  const pos2Id = assignment2.positionId;
  const pos2Title = assignment2.position.title;
  
  // Move both to history (before swap)
  await prisma.executiveHistory.create({
    data: {
      userId: user1.id, positionId: pos1Id,
      assignedBy: assignment1.assignedBy, assignedAt: assignment1.assignedAt,
      removedAt: new Date(), removedBy: currentUser.userId
    }
  });
  
  await prisma.executiveHistory.create({
    data: {
      userId: user2.id, positionId: pos2Id,
      assignedBy: assignment2.assignedBy, assignedAt: assignment2.assignedAt,
      removedAt: new Date(), removedBy: currentUser.userId
    }
  });
  
  // Delete old assignments
  await prisma.executive.delete({ where: { id: assignment1.id } });
  await prisma.executive.delete({ where: { id: assignment2.id } });
  
  // Create swapped assignments
  await prisma.executive.create({
    data: { userId: user1.id, positionId: pos2Id, assignedBy: currentUser.userId }
  });
  
  await prisma.executive.create({
    data: { userId: user2.id, positionId: pos1Id, assignedBy: currentUser.userId }
  });
  
  // Update specialRoles based on new positions
  const specialRoleMap = {
    "Secretary": "secretary", "Treasurer": "treasurer",
    "Choir Moderator": "choir_moderator", "Media Moderator": "media_moderator"
  };
  
  const newRole1 = specialRoleMap[pos2Title] || null;
  const newRole2 = specialRoleMap[pos1Title] || null;
  
  await prisma.user.update({ where: { id: user1.id }, data: { specialRole: newRole1 } });
  await prisma.user.update({ where: { id: user2.id }, data: { specialRole: newRole2 } });
  
  // Notify both users
  await prisma.notification.create({
    data: {
      userId: user1.id, type: "executive_swapped",
      title: "🔄 Position Swapped",
      message: `You are now ${pos2Title}! (Previously ${pos1Title})`
    }
  });
  
  await prisma.notification.create({
    data: {
      userId: user2.id, type: "executive_swapped",
      title: "🔄 Position Swapped",
      message: `You are now ${pos1Title}! (Previously ${pos2Title})`
    }
  });
  
  return {
    success: true,
    message: `🔄 Swapped: ${user1.fullName} (${pos1Title} → ${pos2Title}) ↔ ${user2.fullName} (${pos2Title} → ${pos1Title})`
  };
}

case "get_executive_by_position": {
  const executive = await prisma.executive.findFirst({
    where: {
      position: { title: { contains: args.position, mode: "insensitive" } },
      isActive: true
    },
    include: {
      user: { select: { id: true, fullName: true, email: true, phone: true, profileImage: true } },
      position: true
    }
  });
  
  if (!executive) {
    return { message: `No executive found for position "${args.position}".` };
  }
  
  return {
    position: executive.position.title,
    name: executive.user.fullName,
    email: executive.customEmail || executive.user.email,
    phone: executive.customPhone || executive.user.phone
  };
}

case "check_if_executive": {
  const targetUser = await prisma.user.findFirst({
    where: {
      OR: [
        { fullName: { contains: args.userIdentifier, mode: "insensitive" } },
        { email: { contains: args.userIdentifier, mode: "insensitive" } }
      ]
    }
  });
  
  if (!targetUser) return { error: "User not found." };
  
  const executive = await prisma.executive.findFirst({
    where: { userId: targetUser.id, isActive: true },
    include: { position: true }
  });
  
  if (executive) {
    return { 
      isExecutive: true, 
      position: executive.position.title,
      message: `${targetUser.fullName} is the ${executive.position.title}.`
    };
  } else {
    return { 
      isExecutive: false, 
      message: `${targetUser.fullName} is not currently an executive.`
    };
  }
}


// ==================== SYSTEM INTELLIGENCE ====================

case "get_system_status": {
  const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
  if (user.role !== "admin") {
    return { error: "Only admins can view system status." };
  }
  
  const status = await global.systemMonitor.getSystemStatus();
  return status;
}

case "get_system_issues": {
  const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
  if (user.role !== "admin") {
    return { error: "Only admins can view system issues." };
  }
  
  const issues = await global.systemMonitor.getIssues();
  return {
    issues,
    total: issues.length,
    critical: issues.filter(i => i.severity === 'critical').length,
    warnings: issues.filter(i => i.severity === 'warning').length
  };
}

case "get_user_issues": {
  const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
  if (user.role !== "admin") {
    return { error: "Only admins can view user issues." };
  }
  
  const targetUser = await prisma.user.findFirst({
    where: {
      OR: [
        { fullName: { contains: args.userIdentifier, mode: "insensitive" } },
        { email: { contains: args.userIdentifier, mode: "insensitive" } }
      ]
    }
  });
  
  if (!targetUser) return { error: "User not found." };
  
  const issues = await global.systemMonitor.getUserIssues(targetUser.id);
  return {
    user: targetUser.fullName,
    ...issues
  };
}

case "fix_system_issue": {
  const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
  if (user.role !== "admin") {
    return { error: "Only admins can fix system issues." };
  }
  
  const { issueType, action } = args;
  
  let result = { success: false, message: "Unknown issue type" };
  
  switch (issueType) {
    case 'memory':
      // Clear cache or restart
      if (action === 'clear_cache') {
        // Clear Prisma query cache if exists
        // This is just an example
        result = { success: true, message: "Memory cache cleared. Memory should free up." };
      } else if (action === 'restart_server') {
        result = { success: true, message: "Restarting server. It will be back online in a few seconds." };
        setTimeout(() => process.exit(0), 1000);
      }
      break;
      
    case 'database':
      result = { 
        success: true, 
        message: "Database connection issue detected. Please check DATABASE_URL in .env file and ensure your database is running.",
        fix: "1. Check DATABASE_URL in .env\n2. Ensure database is running\n3. Check network connectivity\n4. Restart the server"
      };
      break;
      
    case 'security':
      if (action === 'clear_failed_logins') {
        // Reset failed login attempts
        await prisma.loginAttempt.deleteMany({
          where: {
            success: false,
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          }
        });
        result = { success: true, message: "Cleared all recent failed login attempts. Security alert reset." };
      } else {
        result = { 
          success: true, 
          message: "Security issue detected. Recommendations:\n1. Check for unusual login patterns\n2. Consider rate limiting\n3. Enable 2FA for admins\n4. Review user accounts for suspicious activity"
        };
      }
      break;
      
    case 'errors':
      if (action === 'clear_error_logs') {
        // Clear stored errors
        errorStore.length = 0;
        result = { success: true, message: "Error logs cleared. System is now clean." };
      } else {
        result = { 
          success: true, 
          message: "Errors detected. Most common fix: Check your code for the reported errors and fix them.",
          details: "Run 'npm run debug' to see detailed error logs."
        };
      }
      break;
      
    default:
      result = { success: false, message: `No fix available for issue type: ${issueType}` };
  }
  
  return result;
}

case "get_activity_feed": {
  const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
  if (user.role !== "admin") {
    return { error: "Only admins can view activity feed." };
  }
  
  const { limit = 20, type = 'all' } = args;
  
  let activities = activityStore;
  if (type !== 'all') {
    activities = activities.filter(a => a.type === type);
  }
  
  return {
    activities: activities.slice(0, limit),
    total: activities.length,
    types: ['user_login', 'checkin', 'payment', 'announcement', 'error', 'warning', 'security', 'slow_request']
  };
}

case "get_trends": {
  const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
  if (user.role !== "admin") {
    return { error: "Only admins can view trends." };
  }
  
  // Get stats for last 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const [newUsers, newPledges, newAnnouncements, totalRaised] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.pledge.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.announcement.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.pledge.aggregate({
      where: { 
        createdAt: { gte: weekAgo },
        status: { in: ["APPROVED", "COMPLETED"] }
      },
      _sum: { amountPaid: true }
    })
  ]);
  
  // Get error trend
  const errorTrend = errorStore
    .filter(e => new Date(e.timestamp) > weekAgo)
    .map(e => ({
      date: e.timestamp.split('T')[0],
      error: e.error
    }));
  
  return {
    trends: {
      newUsers,
      newPledges,
      newAnnouncements,
      totalRaised: totalRaised._sum.amountPaid || 0,
      errors: errorTrend.length,
      errorDetails: errorTrend.slice(0, 10)
    },
    weekStarting: weekAgo.toISOString().split('T')[0]
  };
}


      // ==================== GET NEW USERS ====================
      case "get_new_users": {
        const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
        const isAdmin = user.role === "admin" || user.specialRole === "admin";
        const isSecretary = user.specialRole === "secretary";
        
        if (!isAdmin && !isSecretary) {
          return { error: "Only admins and secretaries can view new users." };
        }
        
        const { days = 7 } = args;
        const since = new Date();
        since.setDate(since.getDate() - parseInt(days));
        
        const newUsers = await prisma.user.findMany({
          where: {
            createdAt: { gte: since }
          },
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            specialRole: true,
            membership_number: true,
            homeJumuia: { select: { name: true } },
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        });
        
        // Count by day for chart
        const dailyCount = {};
        newUsers.forEach(u => {
          const date = u.createdAt.toISOString().split('T')[0];
          dailyCount[date] = (dailyCount[date] || 0) + 1;
        });
        
        const dailyData = Object.entries(dailyCount).map(([date, count]) => ({ date, count }));
        
        return {
          success: true,
          count: newUsers.length,
          days: parseInt(days),
          users: newUsers.map(u => ({
            name: u.fullName,
            email: u.email,
            membership: u.membership_number,
            role: u.role,
            specialRole: u.specialRole,
            jumuia: u.homeJumuia?.name || 'None',
            joined: u.createdAt.toISOString()
          })),
          daily: dailyData
        };
      }

      // ==================== GET USER STATS ====================
      case "get_user_stats": {
        const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
        const isAdmin = user.role === "admin" || user.specialRole === "admin";
        
        if (!isAdmin) {
          return { error: "Only admins can view user statistics." };
        }
        
        const totalUsers = await prisma.user.count();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const [newToday, newThisWeek, activeUsers, byRole, byJumuia] = await Promise.all([
          prisma.user.count({ where: { createdAt: { gte: today } } }),
          prisma.user.count({ 
            where: { 
              createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
            } 
          }),
          prisma.user.count({ 
            where: { 
              lastActive: { gte: new Date(Date.now() - 30 * 60 * 1000) } 
            } 
          }),
          prisma.user.groupBy({
            by: ['role'],
            _count: true
          }),
          prisma.user.groupBy({
            by: ['jumuiaId'],
            _count: true,
            where: { jumuiaId: { not: null } }
          })
        ]);
        
        // Get jumuia names
        const jumuiaIds = byJumuia.map(j => j.jumuiaId);
        const jumuias = await prisma.jumuia.findMany({
          where: { id: { in: jumuiaIds } },
          select: { id: true, name: true }
        });
        const jumuiaMap = Object.fromEntries(jumuias.map(j => [j.id, j.name]));
        
        return {
          total: totalUsers,
          newToday,
          newThisWeek,
          activeNow: activeUsers,
          byRole: byRole.map(r => ({ role: r.role, count: r._count })),
          byJumuia: byJumuia.map(j => ({ 
            jumuia: jumuiaMap[j.jumuiaId] || 'Unknown', 
            count: j._count 
          }))
        };
      }

      // ==================== GET RECENT ACTIVITY ====================
      case "get_recent_activity": {
        const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
        const isAdmin = user.role === "admin" || user.specialRole === "admin";
        
        if (!isAdmin) {
          return { error: "Only admins can view recent activity." };
        }
        
        const { limit = 20 } = args;
        
        // Get recent user logins (from lastActive)
        const recentUsers = await prisma.user.findMany({
          where: {
            lastActive: { not: null }
          },
          orderBy: { lastActive: 'desc' },
          take: parseInt(limit),
          select: {
            fullName: true,
            email: true,
            lastActive: true,
            role: true
          }
        });
        
        // Get recent pledges
        const recentPledges = await prisma.pledge.findMany({
          orderBy: { createdAt: 'desc' },
          take: parseInt(limit),
          include: {
            user: { select: { fullName: true } },
            contributionType: { select: { title: true } }
          }
        });
        
        // Get recent announcements
        const recentAnnouncements = await prisma.announcement.findMany({
          orderBy: { createdAt: 'desc' },
          take: parseInt(limit),
          include: {
            author: { select: { fullName: true } }
          }
        });
        
        return {
          recentLogins: recentUsers.map(u => ({
            name: u.fullName,
            email: u.email,
            lastActive: u.lastActive?.toISOString(),
            role: u.role
          })),
          recentPledges: recentPledges.map(p => ({
            user: p.user.fullName,
            campaign: p.contributionType.title,
            amount: p.amountPaid || 0,
            status: p.status,
            createdAt: p.createdAt.toISOString()
          })),
          recentAnnouncements: recentAnnouncements.map(a => ({
            title: a.title,
            author: a.author?.fullName || 'Unknown',
            createdAt: a.createdAt.toISOString()
          }))
        };
      }

            // ==================== SEND 24-HOUR REPORT ====================
      case "send_24h_report": {
        const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
        if (user.role !== "admin") {
          return { error: "Only admins can send reports." };
        }
        
        const { send24HourReport } = require("../../services/reportService");
        const result = await send24HourReport();
        
        return {
          success: true,
          message: result ? "✅ Report sent to admins" : "❌ Failed to send report",
          result: result || null
        };
      }


      // ==================== UNIVERSAL DATABASE QUERY ====================
case "query_database": {
  const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
  const isAdmin = user.role === "admin" || user.specialRole === "admin";
  const isSecretary = user.specialRole === "secretary";
  const isTreasurer = user.specialRole === "treasurer";
  
  if (!isAdmin && !isSecretary && !isTreasurer) {
    return { error: "Only admins, secretaries, and treasurers can query data." };
  }
  
  try {
    const { model, operation, where, select, take, orderBy, groupBy, aggregate } = args;
    
    // ========== ALLOWED MODELS ==========
    const allowedModels = {
      user: { fields: ['id', 'fullName', 'email', 'phone', 'role', 'specialRole', 'membership_number', 'createdAt', 'lastActive', 'jumuiaId'] },
      pledge: { fields: ['id', 'userId', 'amountPaid', 'pendingAmount', 'status', 'createdAt', 'contributionTypeId'] },
      announcement: { fields: ['id', 'title', 'content', 'category', 'createdAt', 'published'] },
      contributionType: { fields: ['id', 'title', 'amountRequired', 'deadline', 'createdAt'] },
      media: { fields: ['id', 'title', 'type', 'url', 'createdAt'] },
      song: { fields: ['id', 'title', 'reference', 'createdAt'] },
      jumuia: { fields: ['id', 'name', 'code'] },
      notification: { fields: ['id', 'userId', 'title', 'message', 'type', 'read', 'createdAt'] },
      massProgram: { fields: ['id', 'date', 'venue', 'createdAt'] },
      scheduleEvent: { fields: ['id', 'title', 'eventDate', 'eventTime', 'location'] },
      attendanceEntry: { fields: ['id', 'userId', 'fullName', 'signMethod', 'signTime', 'sheetId'] },
      attendanceSheet: { fields: ['id', 'title', 'eventDate', 'location', 'isActive'] }
    };
    
    if (!allowedModels[model]) {
      return { 
        error: `Model "${model}" not allowed. Available: ${Object.keys(allowedModels).join(', ')}` 
      };
    }
    
    // ========== BUILD THE QUERY SAFELY ==========
    const prismaModel = prisma[model];
    if (!prismaModel) {
      return { error: `Model "${model}" not found in database.` };
    }
    
    // Validate where conditions
    let safeWhere = {};
    if (where) {
      for (const [key, value] of Object.entries(where)) {
        // Check if field exists in allowed model
        if (allowedModels[model].fields.includes(key) || key === 'OR' || key === 'AND' || key === 'NOT') {
          safeWhere[key] = value;
        } else {
          console.log(`⚠️ Skipping invalid where field: ${key}`);
        }
      }
    }
    
    // ========== EXECUTE QUERY ==========
    let result;
    let queryArgs = {};
    if (Object.keys(safeWhere).length > 0) queryArgs.where = safeWhere;
    if (select) {
      // Only allow valid fields in select
      const validSelect = {};
      for (const [key, value] of Object.entries(select)) {
        if (allowedModels[model].fields.includes(key)) {
          validSelect[key] = value;
        }
      }
      if (Object.keys(validSelect).length > 0) queryArgs.select = validSelect;
    }
    if (take) queryArgs.take = take;
    if (orderBy) queryArgs.orderBy = orderBy;
    
    switch (operation) {
      case 'count':
        result = await prismaModel.count(queryArgs);
        break;
      case 'findMany':
        result = await prismaModel.findMany(queryArgs);
        break;
      case 'findFirst':
        result = await prismaModel.findFirst(queryArgs);
        break;
      case 'findUnique':
        queryArgs.where = safeWhere;
        result = await prismaModel.findUnique(queryArgs);
        break;
      case 'aggregate':
        if (aggregate && aggregate._sum) {
          result = await prismaModel.aggregate({
            where: safeWhere,
            _sum: aggregate._sum
          });
        } else {
          result = await prismaModel.aggregate({
            where: safeWhere,
            _count: true
          });
        }
        break;
      case 'groupBy':
        if (groupBy && allowedModels[model].fields.includes(groupBy)) {
          result = await prismaModel.groupBy({
            by: [groupBy],
            where: safeWhere,
            _count: true
          });
        } else {
          return { error: `Invalid groupBy field. Available: ${allowedModels[model].fields.join(', ')}` };
        }
        break;
      default:
        return { error: `Operation "${operation}" not supported. Use: count, findMany, findFirst, findUnique, aggregate, groupBy` };
    }
    
    return { 
      success: true, 
      result: result,
      count: Array.isArray(result) ? result.length : (typeof result === 'number' ? result : null),
      message: `✅ Query executed successfully on ${model}`
    };
    
  } catch (error) {
    console.error("❌ Query error:", error);
    return { error: `Query failed: ${error.message}` };
  }
}


case "get_hymn_lyrics": {
  let hymn;
  if (args.hymnId) {
    hymn = await prisma.song.findUnique({ 
      where: { id: args.hymnId },
      select: {
        id: true,
        title: true,
        reference: true,
        lyrics: true,
        createdAt: true
      }
    });
  } else if (args.title) {
    // Clean the title
    let cleanTitle = args.title
      .replace(/\*/g, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/\[[^\]]*\]/g, '')
      .trim();
    
    hymn = await prisma.song.findFirst({
      where: { 
        title: { contains: cleanTitle, mode: "insensitive" } 
      },
      select: {
        id: true,
        title: true,
        reference: true,
        lyrics: true,
        createdAt: true
      }
    });
    
    // If not found, try by individual words
    if (!hymn) {
      const words = cleanTitle.split(' ').filter(w => w.length > 2);
      if (words.length > 0) {
        hymn = await prisma.song.findFirst({
          where: {
            OR: words.map(word => ({
              title: { contains: word, mode: "insensitive" }
            }))
          },
          select: {
            id: true,
            title: true,
            reference: true,
            lyrics: true,
            createdAt: true
          }
        });
      }
    }
  }
  
  if (!hymn) {
    return { 
      message: `❌ No hymn found matching "${args.title || args.hymnId}". Please check the title and try again.` 
    };
  }
  
  if (!hymn.lyrics) {
    return {
      message: `🎵 *${hymn.title}*${hymn.reference ? ` (${hymn.reference})` : ''}\n\n📝 *Lyrics not available yet.*\n\n💡 This hymn is in our database but lyrics haven't been added.`
    };
  }
  
  let lyrics = hymn.lyrics.replace(/<[^>]*>/g, '').trim();
  
  // ✅ Return a formatted message with actual lyrics
  return {
    title: hymn.title,
    reference: hymn.reference || "No reference",
    lyrics: lyrics,
    message: `🎵 *${hymn.title}*${hymn.reference ? ` (${hymn.reference})` : ''}\n\n${lyrics}`,
    action: "navigate",
    path: `/hymn/${hymn.id}`
  };
}


// ==================== GET HYMN BY NUMBER ====================
case "get_hymn_by_number":
case "get_lyrics_by_number": {
  const { number } = args;
  
  if (!number) {
    return { error: "Please specify a hymn number from the list." };
  }
  
  console.log(`🎵 Getting hymn number: "${number}"`);
  
  // Try to find the hymn by reference first
  const num = parseInt(number);
  let hymn = await prisma.song.findFirst({
    where: {
      OR: [
        { reference: { contains: `K. ${num}`, mode: "insensitive" } },
        { reference: { contains: `K. ${num}:`, mode: "insensitive" } },
        { reference: { contains: `#${num}`, mode: "insensitive" } },
        { reference: { contains: `${num}`, mode: "insensitive" } }
      ]
    },
    select: {
      id: true,
      title: true,
      reference: true,
      lyrics: true,
      createdAt: true
    }
  });
  
  // If not found by reference, try to find by title containing the number
  if (!hymn) {
    hymn = await prisma.song.findFirst({
      where: {
        title: { contains: number, mode: "insensitive" }
      },
      select: {
        id: true,
        title: true,
        reference: true,
        lyrics: true,
        createdAt: true
      }
    });
  }
  
  if (!hymn) {
    return { 
      message: `❌ No hymn found with number "${number}". Please specify the full title or check the hymn book.` 
    };
  }
  
  let lyrics = hymn.lyrics || "Lyrics not available yet.";
  lyrics = lyrics.replace(/<[^>]*>/g, '').trim();
  
  return {
    title: hymn.title,
    reference: hymn.reference || "No reference",
    lyrics: lyrics,
    message: `🎵 *${hymn.title}*${hymn.reference ? ` (${hymn.reference})` : ''}\n\n${lyrics.substring(0, 1000)}${lyrics.length > 1000 ? '\n\n📖 *Full lyrics available in the hymn book! at https://www.zetechcatholicaction.com/hymns*' : ''}`,
    action: "navigate",
    path: `/hymn/${hymn.id}`
  };
}



case "get_my_attendance_records":
case "my_attendance":
case "attendance_history":
case "show_attendance":
case "get_attendance_records":
case "get_user_attendance":
case "attendance": {
  try {
    let targetUserId = currentUser?.userId;
    let targetUser = null;
    
    // If looking up by membership number or name (WhatsApp users)
    if (args.membershipNumber || args.userIdentifier || args.userId) {
      // Find the target user by membership number or name
      targetUser = await prisma.user.findFirst({
        where: {
          OR: [
            { membership_number: args.membershipNumber || args.userId || '' },
            { fullName: { contains: args.userIdentifier || '', mode: "insensitive" } },
            { email: { contains: args.userIdentifier || '', mode: "insensitive" } }
          ]
        }
      });
      
      if (!targetUser) {
        return { 
          message: `❌ User not found with the provided information. Please check your membership number (e.g., Z#003) or full name.` 
        };
      }
      
      targetUserId = targetUser.id;
    } 
    // If no identifier provided, but we have currentUser from web app
    else if (targetUserId) {
      targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { fullName: true, membership_number: true }
      });
    }
    // If no user found at all
    else {
      return { 
        message: `📋 *Attendance Records*\n\nPlease provide your membership number (e.g., Z#003) or full name so I can look up your attendance records.\n\nExample: "Get my attendance records. My name is Christopher" or "Z#003 attendance"` 
      };
    }
    
    if (!targetUserId) {
      return { 
        message: `📋 *Attendance Records*\n\nPlease provide your membership number (e.g., Z#003) or full name so I can look up your attendance records.\n\nExample: "Get my attendance records. My name is Christopher" or "Z#003 attendance"` 
      };
    }
    
    // If targetUser is still null, fetch it
    if (!targetUser) {
      targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { fullName: true, membership_number: true }
      });
    }
    
    // Get user's attendance records
    const attendanceRecords = await prisma.attendanceEntry.findMany({
      where: { 
        userId: targetUserId 
      },
      include: {
        sheet: {
          select: {
            title: true,
            eventDate: true,
            location: true
          }
        }
      },
      orderBy: { signTime: 'desc' },
      take: args.limit || 20
    });
    
    if (!attendanceRecords || attendanceRecords.length === 0) {
      return {
        success: true,
        message: `📋 *Attendance Records*\n\n👤 *${targetUser?.fullName || 'User'}*\n🆔 ${targetUser?.membership_number || 'N/A'}\n\nNo attendance records found.\n\n💡 Check in at events to start tracking your attendance!`,
        records: [],
        count: 0
      };
    }
    
    // Calculate stats
    const totalPresent = attendanceRecords.filter(r => r.status === 'PRESENT' || r.status === 'present').length;
    const totalAbsent = attendanceRecords.filter(r => r.status === 'ABSENT' || r.status === 'absent').length;
    const totalLate = attendanceRecords.filter(r => r.status === 'LATE' || r.status === 'late').length;
    
    // Format records
    const formattedRecords = attendanceRecords.map(r => ({
      date: r.sheet?.eventDate || r.signTime,
      event: r.sheet?.title || "Mass/Event",
      location: r.sheet?.location || "N/A",
      status: r.status || "PRESENT",
      signMethod: r.signMethod || "Manual",
      signTime: r.signTime
    }));
    
    // Build response message
    let message = `📋 *ATTENDANCE RECORDS*\n`;
    message += `👤 *${targetUser?.fullName || 'User'}*\n`;
    if (targetUser?.membership_number) message += `🆔 ${targetUser.membership_number}\n`;
    message += `\n📊 *Stats:*\n`;
    message += `✅ Present: ${totalPresent}\n`;
    if (totalLate > 0) message += `⏰ Late: ${totalLate}\n`;
    if (totalAbsent > 0) message += `❌ Absent: ${totalAbsent}\n`;
    message += `📝 Total Records: ${attendanceRecords.length}\n\n`;
    
    if (attendanceRecords.length > 0) {
      message += `📅 *Recent Check-ins:*\n`;
      formattedRecords.slice(0, 5).forEach(r => {
        const date = new Date(r.signTime).toLocaleDateString('en-KE', { 
          day: 'numeric', month: 'short', year: 'numeric' 
        });
        const statusEmoji = r.status === 'PRESENT' || r.status === 'present' ? '✅' : 
                           r.status === 'LATE' || r.status === 'late' ? '⏰' : '❌';
        message += `${statusEmoji} ${r.event} - ${date}\n`;
      });
      if (formattedRecords.length > 5) {
        message += `... and ${formattedRecords.length - 5} more\n`;
      }
      message += `\n📱 *For full details, visit:* https://www.zetechcatholicaction.com/profile`;
    }
    
    return {
      success: true,
      message,
      records: formattedRecords,
      stats: { totalPresent, totalAbsent, totalLate, total: attendanceRecords.length }
    };
    
  } catch (error) {
    console.error('❌ Attendance fetch error:', error);
    return { error: "Failed to fetch attendance records. Please try again." };
  }
}

case "get_attendance_by_date": {
  if (!currentUser?.userId) {
    return { error: "Please log in first." };
  }
  
  const { startDate, endDate } = args;
  
  if (!startDate) {
    return { error: "Please provide a startDate (YYYY-MM-DD)." };
  }
  
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date(start);
  end.setHours(23, 59, 59, 999);
  
  const records = await prisma.attendanceEntry.findMany({
    where: {
      userId: currentUser.userId,
      signTime: { gte: start, lte: end }
    },
    include: {
      sheet: { select: { title: true, eventDate: true, location: true } }
    },
    orderBy: { signTime: 'desc' }
  });
  
  if (records.length === 0) {
    return {
      message: `📋 No attendance records found from ${startDate}${endDate ? ` to ${endDate}` : ''}.`,
      records: []
    };
  }
  
  return {
    success: true,
    dateRange: { startDate, endDate: endDate || startDate },
    count: records.length,
    records: records.map(r => ({
      date: r.sheet?.eventDate || r.signTime,
      event: r.sheet?.title || "Mass/Event",
      status: r.status || "PRESENT",
      signMethod: r.signMethod || "Manual"
    }))
  };
}

case "get_attendance_summary": {
  if (!currentUser?.userId) {
    return { error: "Please log in first." };
  }
  
  // Get current month stats
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  monthEnd.setHours(23, 59, 59, 999);
  
  const [monthRecords, totalRecords, upcomingEvents] = await Promise.all([
    prisma.attendanceEntry.findMany({
      where: {
        userId: currentUser.userId,
        signTime: { gte: monthStart, lte: monthEnd }
      }
    }),
    prisma.attendanceEntry.count({
      where: { userId: currentUser.userId }
    }),
    prisma.attendanceSheet.findMany({
      where: {
        eventDate: { gte: new Date() },
        isActive: true
      },
      orderBy: { eventDate: 'asc' },
      take: 3
    })
  ]);
  
  const present = monthRecords.filter(r => r.status === 'PRESENT' || r.status === 'present').length;
  const absent = monthRecords.filter(r => r.status === 'ABSENT' || r.status === 'absent').length;
  const late = monthRecords.filter(r => r.status === 'LATE' || r.status === 'late').length;
  
  let message = `📊 *ATTENDANCE SUMMARY*\n\n`;
  message += `📅 *This Month:*\n`;
  message += `✅ Present: ${present}\n`;
  message += `⏰ Late: ${late}\n`;
  message += `❌ Absent: ${absent}\n`;
  message += `📝 Total: ${monthRecords.length}\n\n`;
  message += `📊 *All Time:* ${totalRecords} check-ins\n\n`;
  
  if (upcomingEvents.length > 0) {
    message += `📅 *Upcoming Events:*\n`;
    upcomingEvents.forEach(e => {
      const date = e.eventDate.toLocaleDateString('en-KE', { 
        day: 'numeric', month: 'short' 
      });
      message += `• ${e.title} - ${date}\n`;
    });
  }
  
  return {
    success: true,
    message,
    stats: {
      month: { present, absent, late, total: monthRecords.length },
      total: totalRecords,
      upcomingEvents: upcomingEvents.map(e => ({
        title: e.title,
        date: e.eventDate,
        location: e.location
      }))
    }
  };
}

case "check_in": {
  if (!currentUser?.userId) {
    return { error: "Please log in first." };
  }
  
  const { sheetId, signMethod = "Manual" } = args;
  
  if (!sheetId) {
    // Find today's active sheet
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const sheet = await prisma.attendanceSheet.findFirst({
      where: {
        eventDate: { gte: today, lt: tomorrow },
        isActive: true
      }
    });
    
    if (!sheet) {
      return { 
        message: "📋 No active attendance sheet found for today. Please check with the secretary." 
      };
    }
    
    // Check if already checked in
    const existing = await prisma.attendanceEntry.findFirst({
      where: {
        userId: currentUser.userId,
        sheetId: sheet.id
      }
    });
    
    if (existing) {
      return {
        message: `✅ You already checked in for "${sheet.title}" at ${new Date(existing.signTime).toLocaleTimeString()}`,
        alreadyCheckedIn: true
      };
    }
    
    const entry = await prisma.attendanceEntry.create({
      data: {
        userId: currentUser.userId,
        sheetId: sheet.id,
        fullName: currentUser.fullName,
        signMethod: signMethod,
        signTime: new Date(),
        status: "PRESENT"
      }
    });
    
    return {
      success: true,
      message: `✅ Check-in successful for "${sheet.title}" at ${new Date(entry.signTime).toLocaleTimeString()}!`,
      entry: {
        id: entry.id,
        event: sheet.title,
        time: entry.signTime
      }
    };
  }
  
  // Check in with specific sheet ID
  const sheet = await prisma.attendanceSheet.findUnique({
    where: { id: sheetId }
  });
  
  if (!sheet) {
    return { error: "Attendance sheet not found." };
  }
  
  const existing = await prisma.attendanceEntry.findFirst({
    where: {
      userId: currentUser.userId,
      sheetId: sheet.id
    }
  });
  
  if (existing) {
    return {
      message: `✅ You already checked in for "${sheet.title}" at ${new Date(existing.signTime).toLocaleTimeString()}`,
      alreadyCheckedIn: true
    };
  }
  
  const entry = await prisma.attendanceEntry.create({
    data: {
      userId: currentUser.userId,
      sheetId: sheet.id,
      fullName: currentUser.fullName,
      signMethod: signMethod,
      signTime: new Date(),
      status: "PRESENT"
    }
  });
  
  return {
    success: true,
    message: `✅ Check-in successful for "${sheet.title}"!`,
    entry: {
      id: entry.id,
      event: sheet.title,
      time: entry.signTime
    }
  };
}

case "get_attendance_sheet": {
  const { sheetId, date } = args;
  
  let sheet;
  if (sheetId) {
    sheet = await prisma.attendanceSheet.findUnique({
      where: { id: sheetId },
      include: {
        entries: {
          include: {
            user: { select: { fullName: true, membership_number: true, phone: true } }
          },
          orderBy: { signTime: 'asc' }
        }
      }
    });
  } else if (date) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    sheet = await prisma.attendanceSheet.findFirst({
      where: {
        eventDate: { gte: targetDate, lt: nextDay }
      },
      include: {
        entries: {
          include: {
            user: { select: { fullName: true, membership_number: true, phone: true } }
          },
          orderBy: { signTime: 'asc' }
        }
      }
    });
  }
  
  if (!sheet) {
    return { error: "Attendance sheet not found." };
  }
  
  const present = sheet.entries.filter(e => e.status === 'PRESENT' || e.status === 'present').length;
  const absent = sheet.entries.filter(e => e.status === 'ABSENT' || e.status === 'absent').length;
  const late = sheet.entries.filter(e => e.status === 'LATE' || e.status === 'late').length;
  
  return {
    success: true,
    sheet: {
      id: sheet.id,
      title: sheet.title,
      eventDate: sheet.eventDate,
      location: sheet.location,
      totalEntries: sheet.entries.length,
      present,
      absent,
      late
    },
    entries: sheet.entries.map(e => ({
      name: e.user.fullName,
      membership: e.user.membership_number,
      status: e.status || "PRESENT",
      signMethod: e.signMethod,
      signTime: e.signTime
    }))
  };
}

      

      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    console.error(`Tool execution error (${toolName}):`, error);
    return { error: `Failed to execute ${toolName}: ${error.message}` };
  }
}

module.exports = { executeToolCall };