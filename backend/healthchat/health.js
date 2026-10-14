// healthchat/health.js
// Gathers all system signals and produces a natural-language health report.

/**
 * @param {object} deps
 * @param {object} deps.prisma        - PrismaClient instance from server.js
 * @param {object} deps.io            - Socket.IO instance from server.js
 * @param {object} deps.healthStore   - optional, your in-memory error store
 */
async function gatherHealth(deps = {}) {
  const { prisma, io, healthStore } = deps;

  // ---- Process ----
  const uptimeSec = process.uptime();
  const mem = process.memoryUsage();
  const memPercent = (mem.heapUsed / mem.heapTotal) * 100;
  const heapUsedMB  = +(mem.heapUsed  / 1024 / 1024).toFixed(1);
  const heapTotalMB = +(mem.heapTotal / 1024 / 1024).toFixed(1);
  const rssMB       = +(mem.rss       / 1024 / 1024).toFixed(1);

  const uptimeStr =
    uptimeSec >= 86400
      ? `${Math.floor(uptimeSec / 86400)}d ${Math.floor((uptimeSec % 86400) / 3600)}h ${Math.floor((uptimeSec % 3600) / 60)}m`
      : uptimeSec >= 3600
      ? `${Math.floor(uptimeSec / 3600)}h ${Math.floor((uptimeSec % 3600) / 60)}m`
      : `${Math.floor(uptimeSec / 60)}m`;

  // ---- Database ----
  let dbOk = true, dbMs = 0, dbError = null;
  if (prisma) {
    try {
      const t0 = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbMs = Date.now() - t0;
    } catch (e) {
      dbOk = false;
      dbError = e.message;
    }
  } else {
    dbOk = false;
    dbError = "prisma not provided";
  }

  // ---- Sockets ----
  const socketCount =
    io?.engine?.clientsCount ??
    io?.sockets?.sockets?.size ??
    0;

  // ---- Recent errors (last hour) from the shared store ----
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const allErrors = healthStore?.errors || [];
  const allSlow   = healthStore?.slowRequests || [];
  const recentErrors = allErrors.filter(e => new Date(e.timestamp).getTime() > oneHourAgo);
  const recentSlow   = allSlow.filter(r => new Date(r.timestamp).getTime() > oneHourAgo);

  // ---- Online users (active in last 5 min) ----
  let onlineUsers = 0;
  if (prisma) {
    try {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      onlineUsers = await prisma.user.count({
        where: { lastActive: { gte: fiveMinAgo } }
      });
    } catch { /* ignore */ }
  }

  // ---- Compose issues ----
  const issues = [];
  if (!dbOk) issues.push(`database is down (${dbError})`);
  else if (dbMs > 1000) issues.push(`database is slow (${dbMs}ms)`);

  if (memPercent > 85) issues.push(`memory is very high (${memPercent.toFixed(0)}%)`);
  else if (memPercent > 70) issues.push(`memory is a bit high (${memPercent.toFixed(0)}%)`);

  if (recentErrors.length > 10) issues.push(`${recentErrors.length} errors in the last hour`);
  else if (recentErrors.length > 0) issues.push(`${recentErrors.length} error(s) in the last hour`);

  if (recentSlow.length > 5) issues.push(`${recentSlow.length} slow requests in the last hour`);
  if (uptimeSec < 300) issues.push(`just restarted ${Math.round(uptimeSec)}s ago`);

  // ---- Mood ----
  let mood, emoji;
  if (!dbOk || memPercent > 90)      { mood = "critical";  emoji = "🔴"; }
  else if (issues.length >= 2)       { mood = "warning";   emoji = "🟡"; }
  else if (issues.length === 1)      { mood = "mostly-ok"; emoji = "🟢"; }
  else                               { mood = "great";     emoji = "🟢"; }

  return {
    mood, emoji, issues,
    uptimeSec, uptimeStr,
    memory: { heapUsedMB, heapTotalMB, rssMB, memPercent: +memPercent.toFixed(1) },
    database: { ok: dbOk, ms: dbMs, error: dbError },
    sockets: socketCount,
    onlineUsers,
    recentErrors, recentSlow
  };
}

/**
 * Turn raw health data into a natural reply.
 */
function composeReply(health, message = "") {
  const lower = message.toLowerCase();
  const { mood, emoji, issues, uptimeStr, memory, database, sockets, onlineUsers, recentErrors, recentSlow } = health;

  const isGeneral = /how are you|how('?s| is) it going|how('?s| is) everything|you (ok|okay|alright|good)|status|health|doing|feeling|running|working/.test(lower);

  // ---- "How are you?" ----
  if (isGeneral) {
    if (mood === "great") {
      return `${emoji} Hey! I'm doing great, thanks for asking.\n\n` +
        `Everything's running smoothly:\n` +
        `• Database: healthy (${database.ms}ms)\n` +
        `• Memory: ${memory.heapUsedMB}MB / ${memory.heapTotalMB}MB (${memory.memPercent}%)\n` +
        `• Uptime: ${uptimeStr}\n` +
        `• People online: ${onlineUsers}\n` +
        `• Socket connections: ${sockets}\n` +
        `• No errors or slow requests in the last hour\n\n` +
        `So yeah — all good on my end. 👍`;
    }
    if (mood === "mostly-ok") {
      return `${emoji} Hey! I'm mostly fine, but one thing to note:\n\n` +
        `⚠️ ${issues[0]}\n\n` +
        `Everything else looks healthy:\n` +
        `• Database: ${database.ok ? "healthy" : "down"} (${database.ms}ms)\n` +
        `• Memory: ${memory.memPercent}%\n` +
        `• Uptime: ${uptimeStr}\n` +
        `• Online: ${onlineUsers}\n\n` +
        `Probably nothing serious, but worth a look.`;
    }
    if (mood === "warning") {
      return `${emoji} Hmm, I'll be honest — I'm not feeling my best right now.\n\n` +
        `Issues I'm seeing:\n` +
        issues.map(i => `• ${i}`).join("\n") + `\n\n` +
        `Other stats:\n` +
        `• Memory: ${memory.heapUsedMB}MB / ${memory.heapTotalMB}MB (${memory.memPercent}%)\n` +
        `• Uptime: ${uptimeStr}\n` +
        `• Online: ${onlineUsers}\n` +
        `• Socket connections: ${sockets}\n\n` +
        `You might want to check the logs.`;
    }
    return `${emoji} I'm not doing well, to be honest.\n\n` +
      `Critical:\n` +
      issues.map(i => `• ${i}`).join("\n") + `\n\n` +
      `You should check this ASAP.`;
  }

  // ---- Specific questions ----
  if (/error|problem|wrong|issue/.test(lower)) {
    if (recentErrors.length === 0) return `✅ No errors in the last hour. Clean as a whistle.`;
    const lines = recentErrors.slice(0, 5).map(e =>
      `• ${e.method || ""} ${e.endpoint || ""} → ${e.statusCode || "?"} (${new Date(e.timestamp).toLocaleTimeString()})`
    );
    return `⚠️ ${recentErrors.length} error(s) in the last hour:\n${lines.join("\n")}`;
  }

  if (/memory|ram/.test(lower)) {
    return `💾 Memory: ${memory.heapUsedMB}MB used / ${memory.heapTotalMB}MB total (${memory.memPercent}%)\n` +
      `RSS: ${memory.rssMB}MB\n` +
      (memory.memPercent > 70 ? `That's higher than ideal.` : `Looking healthy.`);
  }

  if (/db|database|prisma/.test(lower)) {
    return database.ok
      ? `🗄️ Database is healthy — last query took ${database.ms}ms.`
      : `🗄️ Database is DOWN: ${database.error}`;
  }

  if (/uptime|how long/.test(lower)) {
    return `⏱️ I've been running for ${uptimeStr}.`;
  }

  if (/online|users|who/.test(lower)) {
    return `👥 ${onlineUsers} user(s) active in the last 5 minutes. ${sockets} socket connections.`;
  }

  if (/slow/.test(lower)) {
    if (recentSlow.length === 0) return `⚡ No slow requests in the last hour.`;
    return `🐢 ${recentSlow.length} slow request(s) in the last hour:\n` +
      recentSlow.slice(0, 5).map(r =>
        `• ${r.endpoint} took ${r.duration}ms`
      ).join("\n");
  }

  // ---- Fallback ----
  return `I can tell you how I'm doing. Try:\n` +
    `• "how are you?"\n` +
    `• "any errors?"\n` +
    `• "how's memory?"\n` +
    `• "is the database ok?"\n` +
    `• "how long have you been up?"\n` +
    `• "who's online?"\n` +
    `• "any slow requests?"`;
}

module.exports = { gatherHealth, composeReply };