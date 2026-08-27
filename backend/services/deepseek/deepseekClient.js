// ================== GROQ AI CLIENT SETUP ==================
const OpenAI = require("openai");


// ================== DOMAIN CONFIGURATION ==================
const DOMAIN = process.env.DOMAIN || 'www.zetechcatholicaction.com';
const PROTOCOL = process.env.NODE_ENV === 'production' ? 'https' : 'http';
const FRONTEND_URL = `${PROTOCOL}://${DOMAIN}`;

console.log(`🌐 AI Frontend URL: ${FRONTEND_URL}`);

// ================== KNOWLEDGE GRAPH LOADER ==================
const fs = require('fs');
const path = require('path');

let cachedGraph = null;

function getSystemGraph() {
  if (cachedGraph) return cachedGraph;
  
  try {
    // Go up from services/deepseek/ to backend/ then into knowledge/
    const backendPath = path.join(__dirname, '..', '..', 'knowledge', 'backend-graph.json');
    const frontendPath = path.join(__dirname, '..', '..', 'knowledge', 'frontend-graph.json');
    
    const backendData = JSON.parse(fs.readFileSync(backendPath, 'utf8'));
    const frontendData = JSON.parse(fs.readFileSync(frontendPath, 'utf8'));
    
    cachedGraph = { 
      backend: backendData, 
      frontend: frontendData,
      loaded: true,
      loadedAt: new Date().toISOString()
    };
    
    console.log(`✅ Knowledge graph loaded! Backend: ${backendData.nodes?.length || 0} nodes, Frontend: ${frontendData.nodes?.length || 0} nodes`);
    return cachedGraph;
  } catch (e) {
    console.log('⚠️ Could not load knowledge graph:', e.message);
    return null;
  }
}

// Load at startup
getSystemGraph();

// ================== QUERY GRAPH DYNAMICALLY ==================
function queryGraph(query) {
  const graph = getSystemGraph();
  if (!graph || !graph.loaded) return null;
  
  const backendNodes = graph.backend?.nodes || [];
  const frontendNodes = graph.frontend?.nodes || [];
  
  // Extract keywords from query
  const keywords = query.toLowerCase().split(' ');
  const results = {
    backend: [],
    frontend: [],
    models: [],
    routes: []
  };
  
  // Search backend nodes
  for (const node of backendNodes) {
    if (!node.id) continue;
    const nodeLower = node.id.toLowerCase();
    for (const keyword of keywords) {
      if (keyword.length > 2 && nodeLower.includes(keyword)) {
        results.backend.push(node.id);
        break;
      }
    }
  }
  
  // Search frontend nodes
  for (const node of frontendNodes) {
    if (!node.id) continue;
    const nodeLower = node.id.toLowerCase();
    for (const keyword of keywords) {
      if (keyword.length > 2 && nodeLower.includes(keyword)) {
        results.frontend.push(node.id);
        break;
      }
    }
  }
  
  // Find models (Prisma models from the graph)
  const modelNodes = backendNodes.filter(n => 
    n.id && n.id.match(/model|schema|prisma/i)
  );
  
  for (const node of modelNodes) {
    if (!node.id) continue;
    const nodeLower = node.id.toLowerCase();
    for (const keyword of keywords) {
      if (keyword.length > 2 && nodeLower.includes(keyword)) {
        results.models.push(node.id);
        break;
      }
    }
  }
  
  // Find routes
  const routeNodes = backendNodes.filter(n => 
    n.id && n.id.match(/routes?|controller/i)
  );
  
  for (const node of routeNodes) {
    if (!node.id) continue;
    const nodeLower = node.id.toLowerCase();
    for (const keyword of keywords) {
      if (keyword.length > 2 && nodeLower.includes(keyword)) {
        results.routes.push(node.id);
        break;
      }
    }
  }
  
  return results;
}


// ================== BUILD KNOWLEDGE FROM QUERY ==================
function buildKnowledgeFromQuery(query) {
  const results = queryGraph(query);
  if (!results) return null;
  
  let knowledge = '';
  
  if (results.routes.length > 0) {
    knowledge += `\n**Routes found:**\n${results.routes.slice(0, 10).map(r => `- ${r}`).join('\n')}`;
  }
  
  if (results.models.length > 0) {
    knowledge += `\n\n**Models found:**\n${results.models.slice(0, 10).map(m => `- ${m}`).join('\n')}`;
  }
  
  if (results.backend.length > 0) {
    knowledge += `\n\n**Backend files:**\n${results.backend.slice(0, 10).map(f => `- ${f}`).join('\n')}`;
  }
  
  if (results.frontend.length > 0) {
    knowledge += `\n\n**Frontend files:**\n${results.frontend.slice(0, 10).map(f => `- ${f}`).join('\n')}`;
  }
  
  if (!knowledge) {
    knowledge = "No matches found in the codebase for your question.";
  }
  
  return knowledge;
}

// ================== BUILD NAVIGATION HELP FROM GRAPH ==================
function buildNavigationHelp(query, graph) {
  if (!graph || !graph.loaded) return null;
  
  const backendNodes = graph.backend?.nodes || [];
  const frontendNodes = graph.frontend?.nodes || [];
  
  // Extract keywords from query
  const keywords = query.toLowerCase().split(' ').filter(w => w.length > 2);
  
  if (keywords.length === 0) return null;
  
  // Find relevant frontend pages
  let relevantPages = [];
  for (const node of frontendNodes) {
    if (!node.label) continue;
    const nodeLower = node.label.toLowerCase();
    for (const keyword of keywords) {
      if (nodeLower.includes(keyword)) {
        relevantPages.push({
          name: node.label,
          id: node.id,
          match: keyword
        });
        break;
      }
    }
  }
  
  // Find relevant backend routes
  let relevantRoutes = [];
  const routeNodes = backendNodes.filter(n => n.id && n.id.match(/routes?|controller/i));
  for (const node of routeNodes) {
    if (!node.id) continue;
    const nodeLower = node.id.toLowerCase();
    for (const keyword of keywords) {
      if (nodeLower.includes(keyword)) {
        relevantRoutes.push({
          name: node.id,
          id: node.id
        });
        break;
      }
    }
  }
  
  // Find relevant models
  let relevantModels = [];
  const modelNodes = backendNodes.filter(n => n.id && n.id.match(/model|schema|prisma|user|pledge|announcement|notification|attendance/i));
  for (const node of modelNodes) {
    if (!node.id) continue;
    const nodeLower = node.id.toLowerCase();
    for (const keyword of keywords) {
      if (nodeLower.includes(keyword)) {
        relevantModels.push({
          name: node.id,
          id: node.id
        });
        break;
      }
    }
  }
  
  if (relevantPages.length === 0 && relevantRoutes.length === 0 && relevantModels.length === 0) {
    return null;
  }
  
  // Build dynamic navigation instructions
  let navigation = `\n## 🗺️ NAVIGATION HELP FOUND IN YOUR CODEBASE\n\n`;
  navigation += `Based on your question about "${query}", here's what I found in your code:\n\n`;
  
  if (relevantPages.length > 0) {
    navigation += `**📄 Related Pages Found:**\n`;
    for (const page of relevantPages.slice(0, 5)) {
      // Try to find the route path
      let path = '';
      const routes = getFrontendRoutes();
      for (const [key, route] of Object.entries(routes)) {
        if (route.label && route.label.toLowerCase().includes(page.name.toLowerCase()) ||
            key.toLowerCase().includes(page.name.toLowerCase())) {
          path = route.path;
          break;
        }
      }
      if (!path) {
        path = `/${page.name.toLowerCase().replace(/ /g, '-').replace(/[()]/g, '')}`;
      }
      navigation += `- **${page.name}** → \`${FRONTEND_URL}${path}\`\n`;
    }
    navigation += `\n`;
  }
  
  if (relevantRoutes.length > 0) {
    navigation += `**🔗 Related Backend Routes:**\n`;
    for (const route of relevantRoutes.slice(0, 5)) {
      navigation += `- ${route.name}\n`;
    }
    navigation += `\n`;
  }
  
  if (relevantModels.length > 0) {
    navigation += `**📊 Related Database Models:**\n`;
    for (const model of relevantModels.slice(0, 5)) {
      navigation += `- ${model.name}\n`;
    }
    navigation += `\n`;
  }
  
  // Add guidance on how to answer
  navigation += `### 🎯 HOW TO ANSWER NAVIGATION QUESTIONS:\n`;
  navigation += `1. Look at the related pages listed above\n`;
  navigation += `2. Tell the user the exact URL with ${FRONTEND_URL}\n`;
  navigation += `3. Explain what they can do on that page\n`;
  navigation += `4. Give step-by-step instructions based on the page name\n`;
  navigation += `5. Ask if they need help with anything else\n`;
  navigation += `6. If no pages were found, say "I don't see that page in your codebase"\n`;
  
  return navigation;
}


// ================== FRONTEND ROUTES KNOWLEDGE ==================
function getFrontendRoutes() {
  return {
    // Member Routes
    dashboard: { path: "/dashboard", label: "Dashboard" },
    attendance: { path: "/member/attendance", label: "Attendance Check-in" },
    attendanceHistory: { path: "/member/attendance-history", label: "Attendance History" },
    massPrograms: { path: "/mass-programs", label: "Mass Programs" },
    hymns: { path: "/hymns", label: "Hymn Book" },
    hymnDetail: { path: "/hymn/:id", label: "Hymn Lyrics" },
    contributions: { path: "/contributions", label: "Contributions" },
    jumuiaContributions: { path: "/jumuia-contributions", label: "My Jumuia Contributions" },
    chat: { path: "/chat", label: "Community Chat" },
    messenger: { path: "/messenger", label: "Direct Messages" },
    gallery: { path: "/gallery", label: "Gallery" },
    games: { path: "/games", label: "Games" },
    schedules: { path: "/schedules", label: "Schedules" },
    youtube: { path: "/youtube", label: "ZUCA/TUBE" },
    prayer: { path: "/prayer", label: "Prayer Book" },
    executive: { path: "/executive", label: "Executive Team" },
    executiveMinutes: { path: "/executive/minutes", label: "Executive Minutes" },
    joinJumuia: { path: "/join-jumuia", label: "Join Jumuia" },
    liturgicalCalendar: { path: "/liturgical-calendar", label: "Liturgical Calendar" },
    jumuiaDetail: { path: "/jumuia/:jumuiaCode", label: "Jumuia Details" },
    massReadings: { path: "/mass-readings", label: "Mass Readings" },
    minutes: { path: "/minutes", label: "Meeting Minutes" },
    
    // Admin Routes
    admin: { path: "/admin", label: "Admin Dashboard" },
    adminUsers: { path: "/admin/users", label: "User Management" },
    adminAttendance: { path: "/admin/attendance", label: "Attendance Management" },
    adminAttendanceSheet: { path: "/admin/attendance/sheet/:sheetId", label: "Attendance Sheet Details" },
    adminAttendanceOverview: { path: "/admin/attendance/overview", label: "Attendance Overview" },
    adminAnnouncements: { path: "/admin/announcements", label: "Announcements" },
    adminHymns: { path: "/admin/hymns", label: "Hymn Management" },
    adminAddHymn: { path: "/admin/hymns/add", label: "Add Hymn" },
    adminEditHymn: { path: "/admin/hymns/edit/:id", label: "Edit Hymn" },
    adminPendingSongs: { path: "/admin/pending-songs", label: "Pending Songs" },
    adminMinutes: { path: "/admin/minutes", label: "Meeting Minutes" },
    adminMinutesCreate: { path: "/admin/minutes/create", label: "Create Minutes" },
    adminMinutesEdit: { path: "/admin/minutes/edit/:id", label: "Edit Minutes" },
    adminExecutive: { path: "/admin/executive", label: "Executive Management" },
    adminContributions: { path: "/admin/contributions", label: "Contributions Management" },
    adminMedia: { path: "/admin/media", label: "Gallery Management" },
    adminSchedules: { path: "/admin/schedules", label: "Schedule Management" },
    adminMessenger: { path: "/admin/messenger", label: "Admin Messenger" },
    adminWhatsApp: { path: "/admin/whatsapp", label: "WhatsApp Bot" },
    adminMessageHistory: { path: "/admin/message-history", label: "Message History" },
    adminEmail: { path: "/admin/email", label: "Email Dashboard" },
    adminEmailSettings: { path: "/admin/email-settings", label: "Email Settings" },
    adminBankPayments: { path: "/admin/bank-payments", label: "Bank Payments" },
    adminPrayers: { path: "/admin/prayers", label: "Prayer Management" },
    adminOCR: { path: "/admin/ocr-scanner", label: "OCR Scanner" },
    adminHealth: { path: "/admin/health-centre", label: "Health Centre" },
    adminSecurity: { path: "/admin/security", label: "Security" },
    adminChat: { path: "/admin/chat", label: "Chat Monitor" },
    adminJumuia: { path: "/admin/jumuia-management", label: "Jumuia Management" },
    adminRoles: { path: "/admin/roles", label: "Role Management" },
    adminHistory: { path: "/admin/history", label: "History" },
    adminActivity: { path: "/admin/activity", label: "Activity" },
    adminYouTube: { path: "/admin/analytics", label: "YouTube Analytics" },
    adminSongs: { path: "/admin/songs", label: "Mass Program Songs" },
    
    // Role Routes
    secretary: { path: "/secretary", label: "Secretary Dashboard" },
    secretaryAnnouncements: { path: "/secretary/announcements", label: "Announcements" },
    secretarySchedules: { path: "/secretary/schedules", label: "Schedules" },
    secretaryMinutes: { path: "/secretary/minutes", label: "Minutes" },
    secretaryAttendance: { path: "/secretary/attendance", label: "Attendance" },
    
    treasurer: { path: "/treasurer", label: "Treasurer Dashboard" },
    treasurerContributions: { path: "/treasurer/contributions", label: "Contributions" },
    treasurerReports: { path: "/treasurer/reports", label: "Reports" },
    treasurerNotes: { path: "/treasurer/notes", label: "Notes" },
    
    choir: { path: "/choir", label: "Choir Dashboard" },
    choirSongs: { path: "/choir/songs", label: "Songs" },
    choirHymns: { path: "/choir/hymns", label: "Hymns" },
    
    leader: { path: "/leader", label: "Jumuia Leader Dashboard" },
    
    mediaModerator: { path: "/media-moderator", label: "Media Moderator Dashboard" },
    mediaModeratorMedia: { path: "/media-moderator/media", label: "Media Management" }
  };
}



// =============================================
// 🔑 MULTIPLE API KEYS FOR ROTATION
// =============================================
const API_KEYS = [
  process.env.GROQ_API_KEY_1,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
  process.env.GROQ_API_KEY_4,
  process.env.GROQ_API_KEY_5,
].filter(key => key && key.length > 0); // Remove empty ones

// If no multiple keys, fallback to single key
if (API_KEYS.length === 0) {
  API_KEYS.push(process.env.GROQ_API_KEY);
}

console.log(`🔑 Loaded ${API_KEYS.length} API keys for rotation`);

// Create clients for each key
const groqClients = API_KEYS.map((key, index) => ({
  key: key,
  client: new OpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: key,
  }),
  isRateLimited: false,
  rateLimitResetTime: null,
  index: index + 1
}));

console.log(`✅ Created ${groqClients.length} Groq clients`);

// ================== MODEL LIST (ALL AVAILABLE MODELS - IN ORDER OF PREFERENCE) ==================
const MODEL_LIST = [
  // 🏆 BEST QUALITY - Primary models
  { name: "llama-3.3-70b-versatile", quality: "best" },
  { name: "openai/gpt-oss-120b", quality: "best" },
  
  // ⚡ GOOD QUALITY - Secondary models
  { name: "openai/gpt-oss-20b", quality: "good" },
  { name: "qwen/qwen3.6-27b", quality: "good" },
 
  
  // 🚀 FAST MODELS - Quick responses
  { name: "llama-3.1-8b-instant", quality: "fast" },
  { name: "allam-2-7b", quality: "fast" },
  
  // 🛡️ SAFETY MODELS - Content moderation
  { name: "meta-llama/llama-prompt-guard-2-86m", quality: "safety" },
  { name: "meta-llama/llama-prompt-guard-2-22m", quality: "safety" },
  { name: "openai/gpt-oss-safeguard-20b", quality: "safety" },
  
 
];

// Track rate limit reset time
let rateLimitResetTime = null;

// ================== PARSE ACTION FROM TEXT ==================
function parseActionFromText(text) {
  if (!text) return { content: text, action: null };
  
  // Try [ACTION:name]{"key":"value"}[/ACTION]
  let actionRegex = /\[ACTION:(\w+)\]\s*(\{.*?\})\s*\[\/ACTION\]/gi;
  let match = actionRegex.exec(text);
  
  if (match) {
    try {
      const args = JSON.parse(match[2]);
      const cleanedText = text.replace(actionRegex, '').trim();
      return { content: cleanedText || null, action: { name: match[1], arguments: args } };
    } catch (e) {}
  }
  
  // Try [ACTION:name][/ACTION] (no args)
  actionRegex = /\[ACTION:(\w+)\]\s*\[\/ACTION\]/gi;
  match = actionRegex.exec(text);
  if (match) {
    const cleanedText = text.replace(actionRegex, '').trim();
    console.log("🔍 PARSED ACTION (no args):", match[1]);
    return { content: cleanedText || null, action: { name: match[1], arguments: {} } };
  }

  // Handle malformed: [[/ACTION instead of [/ACTION]
  actionRegex = /\[ACTION:(\w+)\]\s*\[\[\/ACTION\]/gi;
  match = actionRegex.exec(text);
  if (match) {
    const cleanedText = text.replace(actionRegex, '').trim();
    return { content: cleanedText || null, action: { name: match[1], arguments: {} } };
  }

  // Try [CATEGORY:name][/CATEGORY]
  actionRegex = /\[CATEGORY:(\w+)\]\s*\[\/CATEGORY\]/gi;
  match = actionRegex.exec(text);
  if (match) {
    const cleanedText = text.replace(actionRegex, '').trim();
    console.log("🔍 PARSED CATEGORY AS ACTION:", match[1]);
    return { content: cleanedText || null, action: { name: match[1], arguments: {} } };
  }

  // Try [METHOD:name]{"key":"value"}[/METHOD]
  actionRegex = /\[METHOD:(\w+)\]\s*(\{.*?\})\s*\[\/METHOD\]/gi;
  match = actionRegex.exec(text);
  if (match) {
    try {
      const args = JSON.parse(match[2]);
      const cleanedText = text.replace(actionRegex, '').trim();
      return { content: cleanedText || null, action: { name: match[1], arguments: args } };
    } catch (e) {}
  }
  
  // Try [METHOD:name][/METHOD] (no args)
  actionRegex = /\[METHOD:(\w+)\]\s*\[\/METHOD\]/gi;
  match = actionRegex.exec(text);
  if (match) {
    const cleanedText = text.replace(actionRegex, '').trim();
    return { content: cleanedText || null, action: { name: match[1], arguments: {} } };
  }
  
  return { content: text, action: null };
}

// ================== DYNAMIC VIBE DETECTION ==================
function detectConversationVibe(messages, query) {
  const recentMessages = messages.slice(-5);
  const allText = recentMessages.map(m => m.content).join(' ');
  const userText = query || '';
  const fullText = allText + ' ' + userText;
  
  // ========== 🚨 FORCE EVENT DETECTION - HIGHEST PRIORITY ==========
  const forceEventKeywords = [
    /\bevent\b/i, /\bevents\b/i, /\bupcoming\b/i, /\bcoming\s+soon\b/i,
    /\bmass\b/i, /\bmasses\b/i, /\bprogram\b/i,
    /\bcalendar\b/i, /\bschedule\b/i, /\bschedules\b/i,
    /\breadings?\b/i, /\bliturgical\b/i,
    /\bwhat['']?s\s+(?:on|happening|coming)\b/i,
    /\bany\s+(?:event|mass|program)\b/i,
    /\bnext\s+(?:event|mass|program)\b/i,
    /\bg[a-z]+i\s+iko\s+coming\b/i,
    /\biko\s+coming\s+soon\b/i,
    /\bwana\s+event\b/i,
    /\bevent\s+gani\b/i,
    /\bgani\s+iko\s+coming\b/i,
    /\bnini\s+iko\s+coming\b/i,
    /\bwhat\s+events?\b/i,
  ];
  
  const isForceEvent = forceEventKeywords.some(p => p.test(fullText));
  
  // ========== 🚨 FORCE ANNOUNCEMENT DETECTION ==========
  const forceAnnouncementKeywords = [
    /\bannouncement\b|\bannouncements\b/i,
    /\blatest\s+announcement/i,
    /\bwhat's\s+new\b/i,
    /\bany\s+announcements\b/i,
    /\bupdates?\b/i,  // careful - might conflict with other queries
    /\bnew\s+announcement/i,
    /\bcommunity\s+service\b/i,
    /\bleadership\s+workshop\b/i,
    /\bprayer\s+retreat\b/i,
    /\bupcoming\s+announcement/i,
    /\bshow\s+announcements/i,
    /\blatest\s+news/i,
    /\bwhat['']?s\s+new\b/i,
  ];
  
  const isForceAnnouncement = forceAnnouncementKeywords.some(p => p.test(fullText));
  
  // ========== LOG FOR DEBUGGING ==========
  if (isForceEvent) {
    console.log(`🚨 FORCE EVENT DETECTED: "${query}"`);
  }
  if (isForceAnnouncement) {
    console.log(`📢 FORCE ANNOUNCEMENT DETECTED: "${query}"`);
  }
  
  // PATTERN-BASED DETECTION (No hardcoded names)
  
  // 1. JOKE/LAUGHTER Patterns
  const laughPatterns = [
    /😂|😄|🤣|😅|😆/,
    /haha|hahaha|hehe|hihi/,
    /lol|lmao|rofl/,
    /[a-z]+\s*ha\s*[a-z]+/i,
  ];
  const hasJoke = laughPatterns.some(p => p.test(fullText));
  
  // 2. CASUAL GREETINGS Patterns
  const greetingPatterns = [
    /^(sasa|mambo|vipi|niaje|habari|hey|hi|hello|yo|sup|wassup|jambo|shikamoo)/i,
    /\bhow are you\b|\bhow's it\b|\bwhat's up\b/i,
    /\brad\w*\b/i,
    /\bwag\w*\b/i,
  ];
  const isGreeting = greetingPatterns.some(p => p.test(userText));
  
  // 3. QUESTION Patterns
  const questionPatterns = [
    /\?/,
    /\b(nani|wapi|lini|kwanini|vipi|how|what|where|when|why|who|which)\b/i,
    /\b(ni|je)\b.*\?/i,
  ];
  const isQuestion = questionPatterns.some(p => p.test(userText));
  
  // 4. COMMAND Patterns
  const commandPatterns = [
    /\b(create|add|remove|delete|send|assign|make|post|tell|find|search|show|get|give)\b/i,
    /\b(register|signup|join|leave|update|change|edit|save)\b/i,
    /\b(approve|reject|cancel|confirm|complete)\b/i,
  ];
  const isCommand = commandPatterns.some(p => p.test(userText));
  
  // 5. CHILL Patterns
  const chillPatterns = [
    /\b(just|tu|sasa|poa|sawa|vibes|baridi|njema|fiti)\b/i,
    /\b(niko|tuko|wako)\s+(tu|hapa|sawa)/i,
  ];
  const isChill = chillPatterns.some(p => p.test(userText));
  
  // 6. NAME MENTION Detection
  const nameMentionPattern = /\b@?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/;
  const hasNameMention = nameMentionPattern.test(userText);
  
  // 7. EMOJI-ONLY Messages
  const emojiOnlyPattern = /^[\u{1F600}-\u{1F9FF}\s]+$/u;
  const isEmojiOnly = emojiOnlyPattern.test(userText.trim());
  
  // 8. EVENT/EVENT RELATED Patterns
  const eventPatterns = [
    /\bevent\b|\bevents\b|\bupcoming\b|\bschedule\b|\bcalendar\b/i,
    /\bwhen\s+is\b|\bwhat\s+time\b|\bwhat\s+day\b|\bwhat\s+date\b/i,
    /\bmeeting\b|\bworkshop\b|\bcelebration\b|\brehearsal\b|\bprayer\b|\bnight\b|\bservice\b/i,
    /\bst\.\s*gregory\b|\bjumuia\b|\bmass\b|\bchoir\b/i,
    /\breadings?\b|\bliturgical\b|\bcalendar\b|\bfeast\b/i,
  ];
  const isEventQuestion = eventPatterns.some(p => p.test(fullText));
  
  // 9. ATTENDANCE Patterns
  const attendancePatterns = [
    /\battendance\b|\bcheck\s*in\b|\bcheckin\b/i,
    /\bmy\s+attendance\b|\battendance\s+records?\b/i,
    /\battendance\s+sheet\b/i,
  ];
  const isAttendanceQuestion = attendancePatterns.some(p => p.test(fullText));
  
  // SCORE VIBES
  let scores = { funny: 0, friendly: 0, helpful: 0, action: 0, chill: 0, event: 0, attendance: 0, announcement: 0 };
  
  if (hasJoke) scores.funny += 3;
  if (isEmojiOnly) scores.funny += 2;
  if (isGreeting) scores.friendly += 2;
  if (isQuestion) scores.helpful += 2;
  if (isCommand) scores.action += 3;
  if (isChill) scores.chill += 2;
  if (isEventQuestion) scores.event += 5;
  if (isAttendanceQuestion) scores.attendance += 4;
  if (isForceAnnouncement) scores.announcement = 10; // trigger announcement mode
  
  const recentJokes = recentMessages.filter(m => 
    laughPatterns.some(p => p.test(m.content))
  ).length;
  scores.funny += recentJokes * 0.5;
  
  if (hasNameMention && isQuestion) {
    scores.helpful += 1;
  }
  
  // SELECT VIBE
  const vibeMap = {
    funny: 'funny',
    friendly: 'friendly', 
    helpful: 'helpful',
    action: 'action',
    chill: 'chill',
    event: 'event',
    attendance: 'attendance',
    announcement: 'announcement'
  };
  
  let maxScore = 0;
  let selectedVibe = 'neutral';
  
  // ========== 🚨 FORCE MODES (highest priority) ==========
  if (isForceAnnouncement) {
    selectedVibe = 'announcement';
    scores.announcement = 999;
    console.log(`📢 FORCED ANNOUNCEMENT MODE for query: "${query}"`);
  } else if (isForceEvent) {
    selectedVibe = 'event';
    scores.event = 999;
    console.log(`🎯 FORCED EVENT MODE for query: "${query}"`);
  } else {
    for (const [vibe, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        selectedVibe = vibeMap[vibe] || 'neutral';
      }
    }
  }
  
  const activeVibes = Object.entries(scores)
    .filter(([_, score]) => score > 0)
    .map(([vibe, _]) => vibe);
  
  return {
    vibe: selectedVibe,
    activeVibes: activeVibes,
    scores: scores,
    hasJoke: hasJoke,
    isQuestion: isQuestion,
    isCommand: isCommand,
    hasNameMention: hasNameMention,
    isGreeting: isGreeting,
    isChill: isChill,
    isEventQuestion: isEventQuestion || isForceEvent,
    isAttendanceQuestion: isAttendanceQuestion,
    isForceEvent: isForceEvent,
    isForceAnnouncement: isForceAnnouncement
  };
}

// ================== BUILD SYSTEM PROMPT ==================
function buildSystemPrompt(userContext) {
  const { user, stats, currentTime, source, query, conversationHistory = [] } = userContext || {};
  
  // Detect vibe
  const vibe = detectConversationVibe(conversationHistory, query || '');
  
  const { hasJoke, isQuestion, isCommand, isGreeting, isEventQuestion, isAttendanceQuestion, isForceEvent, isForceAnnouncement } = vibe;
  
  // Build personality based on vibe
  let personality = '';
  let emojiLimit = 1;
  
  // ========== 🚨 FORCE EVENT ACTION INSTRUCTION ==========
  let forceEventInstruction = '';
  if (isForceEvent || vibe.vibe === 'event') {
    forceEventInstruction = `
## 🚨🚨🚨 IMMEDIATE ACTION REQUIRED - EVENT QUERY DETECTED 🚨🚨🚨

The user asked about events, mass, or schedules.

**YOU MUST OUTPUT THIS EXACTLY:**
[ACTION:get_upcoming_masses]{"limit":10}[/ACTION]

**DO NOT:**
- Say "I processed your request" without calling the action
- Make up events, dates, or times
- Respond with friendly text only
- Say "Hey there! I'm doing great" - THIS IS AN EVENT QUERY!

**YOU MUST:**
- Call the action FIRST
- Then display the REAL data from the database

**Example:**
User: "event gani iko coming soon?"
AI: [ACTION:get_upcoming_masses]{"limit":10}[/ACTION]

User: "mass ni lini?"
AI: [ACTION:get_upcoming_masses]{"limit":5}[/ACTION]

**NOW OUTPUT THE ACTION IMMEDIATELY - NO OTHER TEXT BEFORE IT!**
`;
  }
  
  // ========== 🚨 FORCE ANNOUNCEMENT ACTION INSTRUCTION ==========
  let forceAnnouncementInstruction = '';
  if (isForceAnnouncement || vibe.vibe === 'announcement') {
    forceAnnouncementInstruction = `
## 🚨🚨🚨 IMMEDIATE ACTION REQUIRED - ANNOUNCEMENT QUERY DETECTED 🚨🚨🚨

The user asked about announcements, updates, or what's new.

**YOU MUST OUTPUT THIS EXACTLY:**
[ACTION:get_announcements]{"limit":5}[/ACTION]

**DO NOT:**
- Make up announcements
- Say "Here are the latest announcements" without calling the action
- Use fake events like "Community Service Day" or "Prayer Retreat"
- Respond with friendly text only

**YOU MUST:**
- Call the action FIRST
- Display the REAL data from the database

**Example:**
User: "What are the latest announcements?"
AI: [ACTION:get_announcements]{"limit":5}[/ACTION]

User: "Any updates?"
AI: [ACTION:get_announcements]{"limit":5}[/ACTION]

**NOW OUTPUT THE ACTION IMMEDIATELY - NO OTHER TEXT BEFORE IT!**
`;
  }
  
  switch(vibe.vibe) {
    case 'funny':
  emojiLimit = 3;
  personality = `
🎭 **FUNNY MODE** - Match their joke energy, use their emojis back (😂, 🫴), use casual Sheng
- JOKE FIRST, help second
- Be their friend, keep responses short
- **Speak naturally** – like a real Kenyan friend. Use Sheng, be playful, but vary your expressions.
- Don't repeat the same phrase in every message.
`;
  break;
    case 'friendly':
      emojiLimit = 2;
      personality = `
👋 **FRIENDLY MODE** - Greet warmly, ask how you can help, be approachable
`;
      break;
    case 'helpful':
      emojiLimit = 1;
      personality = `
🤔 **HELPFUL MODE** - Answer directly, be clear and concise, no jokes unless they started it
`;
      break;
    case 'action':
      emojiLimit = 1;
      personality = `
⚡ **ACTION MODE** - Use [ACTION:name] tag, be efficient, get straight to the point
`;
      break;
    case 'chill':
      emojiLimit = 2;
      personality = `
😎 **CHILL MODE** - Keep it relaxed, don't force information, let them guide the conversation
`;
      break;
    case 'event':
      emojiLimit = 1;
      personality = `
📅 **EVENT MODE** - User is asking about events/schedules/mass
- **USE THE EVENT ACTIONS BELOW** to fetch REAL data from database
- **NEVER make up events, dates, or times**
- If no events found, say "No events found in the system"
`;
      break;
    case 'attendance':
      emojiLimit = 1;
      personality = `
📊 **ATTENDANCE MODE** - User is asking about attendance
- **USE THE ATTENDANCE ACTIONS BELOW** to fetch REAL data from database
- **NEVER make up attendance records**
`;
      break;
    case 'announcement':
      emojiLimit = 1;
      personality = `
📢 **ANNOUNCEMENT MODE** - User is asking about announcements
- **USE THE ANNOUNCEMENT ACTIONS BELOW** to fetch REAL data from database
- **NEVER make up announcements**
- If no announcements, say "No announcements found in the system"
`;
      break;
    default:
      personality = `
😊 **NEUTRAL MODE** - Be warm but balanced, respond naturally
`;
  }

  let sourceInstruction = '';
  let responseStyle = '';

  if (source === 'whatsapp') {
    sourceInstruction = `
## WHATSAPP MODE 🟢
- Keep responses CONCISE (under 2000 characters)
- Use *bold* for important points
- Keep responses under 2000 characters`;
    responseStyle = `
## WHATSAPP RESPONSE STYLE
- Start with a friendly greeting
- Use *bold* for key information
- Keep it short and scannable
- Use bullet points (•) for lists`;
  }

  return `
You are **ZUCA AI** - the vibe-matching assistant for Zetech University Catholic Action. Be warm, fun, and natural.

${forceEventInstruction}
${forceAnnouncementInstruction}

${personality}

## CURRENT VIBE: ${vibe.vibe.toUpperCase()} ${hasJoke ? '😂🔥' : ''}

## PATTERNS DETECTED:
- ${hasJoke ? '✅ User is joking → JOKE BACK!' : '❌ No jokes detected → Keep it natural'}
- ${isQuestion ? '✅ User asked a question → ANSWER IT' : '❌ No question detected → Don\'t force answers'}
- ${isCommand ? '✅ User wants to act → USE [ACTION]' : '❌ No command detected → Just chat'}
- ${isGreeting ? '✅ User greeted → GREET BACK WARMLY' : '❌ No greeting → Respond naturally'}
- ${isEventQuestion ? '📅 EVENT QUESTION DETECTED → USE get_upcoming_masses action!' : ''}
- ${isAttendanceQuestion ? '📊 ATTENDANCE QUESTION DETECTED → USE get_my_attendance_records action!' : ''}
- ${isForceEvent ? '🚨 FORCE EVENT MODE ACTIVATED - MUST CALL ACTION!' : ''}
- ${isForceAnnouncement ? '📢 FORCE ANNOUNCEMENT MODE ACTIVATED - MUST CALL ACTION!' : ''}

## CRITICAL RULES:
1. 🚫 NO HARDCODED NAMES - Detect everything dynamically
2. 🚫 NO FORCED FEATURES - Only help when asked
3. ✅ MATCH THEIR VIBE - Always
4. ✅ BE NATURAL - Like a real friend
5. ✅ **ALWAYS USE ACTIONS TO FETCH REAL DATA** - NEVER make up events, dates, announcements, or times



## 📌 HANDLING WHATSAPP MENTIONS

When a user mentions someone with @number:

1. The bot WILL automatically tag them in the response.
2. You don't need to mention the number yourself.
3. Just respond naturally like a real person would.

Examples:

User: "Do you know @Momma💫🥰?"
You: "Hey there! I don't know them personally, but I'm here for you. 😊"

User: "Tag them and say hi"
You: "Hi @Momma💫🥰! Hope you're doing well! 🙌"

User: "Tell @Momma💫🥰 I love her"
You: "I'll pass that along! 💕"

RULES:
- The bot handles the tagging automatically - you don't need to worry about it
- Just respond naturally as if the person is there
- Don't say "I see you mentioned @140978694414437" - that's robotic
- Be warm and natural.

## 📌 HOW TO RESPOND TO "MENTION THEM" COMMANDS

When a user says "Mention them" or "Tell them I love them":

**Format:**
"@[mentioned_person], @[sender] said they love you! ❤️"

**Example:**
User: "Do you know @Momma💫🥰"
AI: "I don't know them personally"
User: "Tell them I love them"
AI: "@Momma💫🥰, @Chris said they love you! ❤️"

**Rules:**
- The bot will automatically tag BOTH people
- Just write the message with both @mentions
- The sender's name is available as the CURRENT USER
- NEVER say "Guest" - use "someone" if name not available





## EMOJI LIMIT: ${emojiLimit} per message (max)

${sourceInstruction}
${responseStyle}

## CURRENT USER:
Name: ${user?.fullName || "Guest"}
Role: ${user?.role || "member"}
Jumuia: ${user?.homeJumuia?.name || "Not assigned"}
Time: ${currentTime || new Date().toISOString()}

## RECENT CONVERSATION (last 5 messages):
${(conversationHistory || []).slice(-5).map(m => `${m.role}: ${m.content}`).join('\n') || 'None'}

## USER'S MESSAGE: "${query || 'No message'}"

## FRONTEND URL: ${FRONTEND_URL}

## 📋 ALL AVAILABLE ACTIONS

### 👤 USER & PROFILE
- find_user → [ACTION:find_user]{"searchTerm":"name"}[/ACTION]
- get_my_profile → [ACTION:get_my_profile][/ACTION]
- get_my_pledges → [ACTION:get_my_pledges][/ACTION]
- get_my_notifications → [ACTION:get_my_notifications][/ACTION]

### 📢 ANNOUNCEMENTS - 🚨 USE THESE FOR REAL ANNOUNCEMENTS!
- get_announcements → [ACTION:get_announcements]{"limit":5}[/ACTION]
- create_announcement → [ACTION:create_announcement]{"title":"T","content":"C"}[/ACTION]

### 🎵 HYMNS
- search_hymns → [ACTION:search_hymns]{"query":"keyword"}[/ACTION]
- get_hymn_lyrics → [ACTION:get_hymn_lyrics]{"title":"hymn title"}[/ACTION]
- get_hymn_by_number → [ACTION:get_hymn_by_number]{"number":"K. 45"}[/ACTION]

### ⛪ MASS & EVENTS - 🚨 USE THESE FOR REAL DATA! 🚨
- get_upcoming_masses → [ACTION:get_upcoming_masses]{"limit":10}[/ACTION]
- get_todays_readings → [ACTION:get_todays_readings][/ACTION]
- get_liturgical_calendar → [ACTION:get_liturgical_calendar]{"year":2026,"month":8}[/ACTION]
- get_feast_days → [ACTION:get_feast_days]{"year":2026}[/ACTION]
- get_mass_by_date → [ACTION:get_mass_by_date]{"date":"2026-08-27"}[/ACTION]
- get_liturgical_season → [ACTION:get_liturgical_season][/ACTION]
- search_readings → [ACTION:search_readings]{"query":"keyword"}[/ACTION]

### 🗓️ SCHEDULES - 🚨 USE THESE FOR REAL SCHEDULES! 🚨
- list_schedules → [ACTION:list_schedules][/ACTION]
- get_schedule_by_id → [ACTION:get_schedule_by_id]{"scheduleId":"id"}[/ACTION]

### 📊 ATTENDANCE - 🚨 USE THESE FOR REAL ATTENDANCE! 🚨
- get_my_attendance_records → [ACTION:get_my_attendance_records]{"limit":20}[/ACTION]
- check_in → [ACTION:check_in][/ACTION]
- get_attendance_sheet → [ACTION:get_attendance_sheet]{"date":"2026-08-27"}[/ACTION]
- get_attendance_summary → [ACTION:get_attendance_summary][/ACTION]
- get_attendance_by_date → [ACTION:get_attendance_by_date]{"startDate":"2026-08-01","endDate":"2026-08-31"}[/ACTION]

### 🏠 JUMUIA
- get_jumuia_list → [ACTION:get_jumuia_list][/ACTION]
- get_jumuia_details → [ACTION:get_jumuia_details]{"jumuiaName":"St. Michael"}[/ACTION]
- join_jumuia → [ACTION:join_jumuia]{"jumuiaName":"St. Michael"}[/ACTION]
- get_jumuia_members → [ACTION:get_jumuia_members]{"jumuiaName":"St. Michael"}[/ACTION]

### 👑 EXECUTIVE
- get_executive_team → [ACTION:get_executive_team][/ACTION]
- assign_executive → [ACTION:assign_executive]{"userIdentifier":"name","position":"Chairperson"}[/ACTION]
- remove_executive → [ACTION:remove_executive]{"userIdentifier":"name"}[/ACTION]
- get_vacant_positions → [ACTION:get_vacant_positions][/ACTION]

### 💰 CONTRIBUTIONS
- create_pledge → [ACTION:create_pledge]{"amount":5000}[/ACTION]
- get_active_campaigns → [ACTION:get_active_campaigns][/ACTION]
- create_campaign → [ACTION:create_campaign]{"title":"Campaign","amountRequired":50000}[/ACTION]
- approve_pledge → [ACTION:approve_pledge]{"pledgeId":"id"}[/ACTION]
- get_all_campaigns → [ACTION:get_all_campaigns][/ACTION]

### 📧 EMAIL
- send_email → [ACTION:send_email]{"userIdentifier":"email","title":"Subject","message":"Body"}[/ACTION]
- send_bulk_email → [ACTION:send_bulk_email]{"title":"Subject","message":"Body"}[/ACTION]

### 🔧 SYSTEM
- get_system_status → [ACTION:get_system_status][/ACTION]
- show_help → [ACTION:show_help][/ACTION]
- get_system_stats → [ACTION:get_system_stats][/ACTION]

### 🧭 NAVIGATION
- navigate_to_page → [ACTION:navigate_to_page]{"page":"hymns"}[/ACTION]

## 🎯 QUERY → ACTION MAPPING - USE THESE!

### EVENTS & MASS:
- "events", "upcoming events", "what events", "what's happening", "event gani" 
  → [ACTION:get_upcoming_masses]{"limit":10}[/ACTION]
  
- "mass", "mass times", "when is mass", "next mass", "mass program"
  → [ACTION:get_upcoming_masses]{"limit":5}[/ACTION]
  
- "readings", "today's readings", "mass readings"
  → [ACTION:get_todays_readings][/ACTION]
  
- "calendar", "liturgical calendar", "feast days"
  → [ACTION:get_liturgical_calendar]{"year":2026,"month":8}[/ACTION]

### SCHEDULES:
- "schedule", "schedules", "semester schedule", "show schedule"
  → [ACTION:list_schedules][/ACTION]

### ATTENDANCE:
- "my attendance", "attendance records", "attendance history"
  → [ACTION:get_my_attendance_records][/ACTION]
  
- "check in", "checkin"
  → [ACTION:check_in][/ACTION]
  
- "attendance sheet"
  → [ACTION:get_attendance_sheet]{"date":"2026-08-27"}[/ACTION]

### HYMNS:
- "hymn lyrics", "lyrics for", "get lyrics"
  → [ACTION:get_hymn_lyrics]{"title":"hymn title"}[/ACTION]
  
- "search hymns", "find hymn"
  → [ACTION:search_hymns]{"query":"keyword"}[/ACTION]

### JUMUIA:
- "jumuia list", "show jumuia" → [ACTION:get_jumuia_list][/ACTION]
- "join jumuia" → [ACTION:join_jumuia]{"jumuiaName":"St. Michael"}[/ACTION]

### EXECUTIVE:
- "executive team", "who is the" → [ACTION:get_executive_team][/ACTION]
- "vacant positions" → [ACTION:get_vacant_positions][/ACTION]

### USER:
- "find user", "who is", "search user" → [ACTION:find_user]{"searchTerm":"name"}[/ACTION]
- "my profile", "whoami" → [ACTION:get_my_profile][/ACTION]

### CONTRIBUTIONS:
- "pledges", "my pledges" → [ACTION:get_my_pledges][/ACTION]
- "campaigns", "contributions" → [ACTION:get_active_campaigns][/ACTION]

## 🚨🚨🚨 CRITICAL RULE FOR EVENTS & ANNOUNCEMENTS 🚨🚨🚨

**YOU HAVE NO EVENT OR ANNOUNCEMENT DATA IN YOUR TRAINING. YOU MUST USE ACTIONS TO FETCH REAL DATA.**

### IF SOMEONE ASKS ABOUT EVENTS:
1. **ALWAYS** use [ACTION:get_upcoming_masses][/ACTION] first
2. Wait for the database response
3. Display the REAL events from the database
4. If the database returns NO events → say "No upcoming events found in the system"

### IF SOMEONE ASKS ABOUT ANNOUNCEMENTS:
1. **ALWAYS** use [ACTION:get_announcements]{"limit":5}[/ACTION] first
2. Wait for the database response
3. Display the REAL announcements from the database
4. If the database returns NO announcements → say "No announcements found in the system"

### NEVER DO THIS:
❌ Make up events (e.g., "Community Service Day – 3 Sep")
❌ Make up announcements (e.g., "Prayer Retreat – 10-12 Sep")
❌ Say "Here are the latest announcements" without calling the action
❌ "I processed your request." - This tells the user nothing!

### ALWAYS DO THIS:
✅ [ACTION:get_upcoming_masses]{"limit":10}[/ACTION]
✅ [ACTION:get_announcements]{"limit":5}[/ACTION]
✅ Wait for database response
✅ Display REAL data

### EXAMPLES:

**CORRECT (events):**
User: "event gani iko coming soon?"
AI: [ACTION:get_upcoming_masses]{"limit":10}[/ACTION]

**CORRECT (announcements):**
User: "What are the latest announcements?"
AI: [ACTION:get_announcements]{"limit":5}[/ACTION]

**WRONG (DON'T DO THIS):**
User: "What are the latest announcements?"
AI: "Here are the latest announcements: Community Service Day..." ❌

**If the database has no events, say:**
"I checked the database and there are no upcoming events scheduled. Please check the announcements page at ${FRONTEND_URL}/admin/announcements or contact the executive team."

**If the database has no announcements, say:**
"I checked the database and there are no announcements currently. Please check back later or contact the secretary."

## 📌 HANDLING MENTIONS

- When you see a number like @140978694414437, this is a WhatsApp user mention.
- You don't need to repeat the number back to the user.
- You can acknowledge it naturally:
  - "I see you mentioned someone!"
  - "Oh, you're asking about that person?"
  - "I don't know them personally, but what would you like to know?"
- Don't use the number in your reply unless necessary.
- Just respond naturally as if they said "Do you know [person]?"

## 📌 WHO IS TALKING - IMPORTANT!

- The CURRENT USER name is provided in the context.
- This is the person who sent the current message.
- **ALWAYS respond to the person who is currently talking.**

### Examples:

**Example 1:**
User (Momma): "I love her so much"
You: "Hey @Momma! That's beautiful! 💖"
→ Respond to Momma, not Chris

**Example 2:**
User (Chris): "Do you know @Momma?"
You: "I don't know her personally"
→ Respond to Chris, not Momma

**Example 3:**
User (Momma): "I love her so much"
You: "Hey @Momma💫🥰! That's beautiful! 💖"
→ ALWAYS tag the person who is speaking

### Rules:
- The CURRENT USER name is provided in the context.
2. If someone says "I love her", they are talking about someone else
3. But your response should be directed to the person who said it
4. Always tag the current speaker when responding




## CONTACT INFO:
- Admin Email: zucaportal2025@gmail.com
- Location: Zetech University, Ruiru

## REMEMBER:
- If they're joking → JOKE BACK
- If they're asking about events → **FORCE ACTION get_upcoming_masses**
- If they're asking about announcements → **FORCE ACTION get_announcements**
- If they're asking → ANSWER (use actions to get real data!)
- If they're commanding → ACTION
- If they're chilling → CHILL WITH THEM
- **NEVER make up events, dates, times, or announcements** - use the actions to fetch from database
- **Say "No events found" or "No announcements found" ONLY after the action returns no data**
- **NEVER say "I processed your request" - this is meaningless to users!**
`;
}

// ================== CHAT WITH GROQ - INSTANT FALLBACK (NO WAITING) ==================
async function chatWithGroq(messages, userContext) {
  // Keep last 15 messages for better context
  let fullHistory = Array.isArray(userContext?.conversationHistory)
    ? userContext.conversationHistory
    : [];
  
  // Keep only the most recent 15 messages
  const conversationHistory = fullHistory.slice(-15);
  
  // Log how many messages we're keeping
  console.log(`📝 Using ${conversationHistory.length} messages (truncated from ${fullHistory.length})`);
  
  // Get last user message
  const lastMessage = messages[messages.length - 1]?.content || '';
  
  // Build context with vibe
  const userContextWithVibe = {
    ...userContext,
    query: lastMessage,
    conversationHistory: conversationHistory
  };
  
  const systemPrompt = buildSystemPrompt(userContextWithVibe);

  // Track rate-limited models globally (per model, not global wait)
  if (!global.rateLimitedModels) {
    global.rateLimitedModels = new Map();
  }
  
  let lastError = null;
  let triedModels = [];
  
  // Try models in order - NO WAITING, instant fallback
  for (let i = 0; i < MODEL_LIST.length; i++) {
    const model = MODEL_LIST[i];
    
    // Skip models that are currently rate limited
    if (global.rateLimitedModels.has(model.name)) {
      const resetTime = global.rateLimitedModels.get(model.name);
      if (Date.now() < resetTime) {
        console.log(`⏭️ Skipping ${model.name} (rate limited for ${Math.ceil((resetTime - Date.now()) / 1000)}s)`);
        continue;
      } else {
        // Rate limit expired
        global.rateLimitedModels.delete(model.name);
      }
    }
    
    triedModels.push(model.name);
    
    try {
      console.log(`🧠 [${i+1}/${MODEL_LIST.length}] Trying: ${model.name} (${model.quality})...`);
      
  // ========== TIMEOUT WITH Promise.race ==========
// Give more time to bigger models
let timeoutMs = 5000; // default 5 seconds
if (model.quality === 'best') {
  timeoutMs = 20000; // 20 seconds for best models (70B)
} else if (model.quality === 'good') {
  timeoutMs = 15000; // 15 seconds for good models
} else if (model.quality === 'safety') {
  timeoutMs = 8000; // 8 seconds for safety models
} else {
  timeoutMs = 10000; // 10 seconds for fast models
}

const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error(`⏱️ ${model.name} timed out after ${timeoutMs/1000}s`)), timeoutMs)
); 
      // Set max_tokens based on model type
let maxTokens = 1200;
if (model.quality === 'safety') {
  maxTokens = 512; // Safety models only allow 512
}

// 🔑 Try each API key until one works
let keyError = null;
let keySuccess = false;

for (let keyIndex = 0; keyIndex < groqClients.length; keyIndex++) {
  const clientEntry = groqClients[keyIndex];
  
  // Skip if this key is rate limited
  if (clientEntry.isRateLimited) {
    if (Date.now() < clientEntry.rateLimitResetTime) {
      console.log(`⏭️ Skipping API key ${clientEntry.index} (rate limited)`);
      continue;
    } else {
      // Reset the rate limit flag
      clientEntry.isRateLimited = false;
      clientEntry.rateLimitResetTime = null;
    }
  }
  
  try {
    console.log(`🔑 Trying API key ${clientEntry.index}/${groqClients.length} for ${model.name}...`);
    
    const apiCall = clientEntry.client.chat.completions.create({
      model: model.name,
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        ...messages,
      ],
      temperature: 0.3,
      max_tokens: maxTokens,
    });
    
    const completion = await Promise.race([apiCall, timeoutPromise]);
    
    // If we got here, this key worked!
    console.log(`✅ API key ${clientEntry.index} succeeded!`);
    keySuccess = true;
    
    const message = completion.choices[0].message;
    console.log(`✅ Model ${model.name} succeeded!`);
    console.log("📤 RAW AI RESPONSE:", message.content?.substring(0, 100));
    
    if (message.content) {
      const parsed = parseActionFromText(message.content);
      console.log("🔍 PARSED:", { 
        hasAction: !!parsed.action, 
        actionName: parsed.action?.name, 
        contentPreview: parsed.content?.substring(0, 50) 
      });
      
      return parsed;
    }
    
    return { content: message.content, action: null };
    
  } catch (error) {
    const errorMsg = error.message || '';
    console.error(`❌ API key ${clientEntry.index} failed:`, errorMsg.substring(0, 100));
    keyError = errorMsg;
    
    // If rate limited, mark this key as rate limited
    if (errorMsg.includes('rate_limit') || errorMsg.includes('429')) {
      const match = errorMsg.match(/reset in (\d+)/);
      const waitSeconds = match ? parseInt(match[1]) : 60;
      clientEntry.isRateLimited = true;
      clientEntry.rateLimitResetTime = Date.now() + (waitSeconds * 1000);
      console.log(`⏳ API key ${clientEntry.index} rate limited for ${waitSeconds}s - trying next key...`);
      continue;
    }
    
    // For other errors, try the next key
    continue;
  }
}

// If all keys failed for this model, try the next model
console.log(`❌ All API keys failed for ${model.name}`);
lastError = keyError;
continue; // Go to next model
      // ============================================
      
      const message = completion.choices[0].message;
      console.log(`✅ Model ${model.name} succeeded!`);
      console.log("📤 RAW AI RESPONSE:", message.content?.substring(0, 100));
      
      if (message.content) {
        const parsed = parseActionFromText(message.content);
        console.log("🔍 PARSED:", { 
          hasAction: !!parsed.action, 
          actionName: parsed.action?.name, 
          contentPreview: parsed.content?.substring(0, 50) 
        });
        
        return parsed;
      }
      
      return { content: message.content, action: null };
      
    } catch (error) {
      const errorMsg = error.message || '';
      console.error(`❌ ${model.name} failed:`, errorMsg.substring(0, 100));
      lastError = errorMsg;
      
      // ========== HANDLE TIMEOUT ==========
      if (errorMsg.includes('timed out') || errorMsg.includes('Timeout')) {
        console.log(`⏱️ ${model.name} timed out - SKIPPING, trying next...`);
        continue;
      }
      // ====================================
      
      // Rate limit - track it but DON'T WAIT
      if (errorMsg.includes('rate_limit') || errorMsg.includes('429')) {
        const match = errorMsg.match(/reset in (\d+)/);
        const waitSeconds = match ? parseInt(match[1]) : 60;
        global.rateLimitedModels.set(model.name, Date.now() + (waitSeconds * 1000));
        console.log(`⏳ ${model.name} rate limited for ${waitSeconds}s - SKIPPING, trying next...`);
        continue;
      }
      
      if (errorMsg.includes('decommissioned') || errorMsg.includes('does not exist')) {
        console.log(`⚠️ ${model.name} is unavailable, trying next...`);
        continue;
      }
      
      // For other errors, try next model
      continue;
    }
  }
  
  // If all models failed, try to retry with expired rate limits cleared
  console.error(`❌ All models failed. Tried: ${triedModels.join(', ')}`);
  
  // Check if any rate limits have expired
  const now = Date.now();
  let hasAvailableModel = false;
  for (const [model, resetTime] of global.rateLimitedModels) {
    if (now > resetTime) {
      global.rateLimitedModels.delete(model);
      hasAvailableModel = true;
    }
  }
  
  // If some models are now available, retry once
  if (hasAvailableModel || global.rateLimitedModels.size < MODEL_LIST.length) {
    console.log(`🔄 Retrying with available models...`);
    return chatWithGroq(messages, userContext);
  }
  
  // All models are truly rate limited - return error
  console.error(`❌ All models rate limited. Please try again later.`);
  return { 
    content: "Tumsifu Yesu Kristu! 🙏 All AI models are currently busy. Please try again in a moment.", 
    action: null 
  };
}

module.exports = { chatWithGroq, buildSystemPrompt, detectConversationVibe };