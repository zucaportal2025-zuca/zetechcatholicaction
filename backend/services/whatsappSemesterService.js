// services/whatsappSemesterService.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const whatsappBot = require("./whatsapp.bot");

const MONTH_NAMES = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

const ROLE_LABELS = {
  jumuia_leader: "jumuiya moderator",
  jumuiya_leader: "jumuiya moderator",
  jumuiya_moderator: "jumuiya moderator",
  chairperson: "chairperson",
  secretary: "secretary",
  treasurer: "treasurer",
  voice_rep: "voice rep",
  media_moderator: "media moderator",
  organizing_secretary: "organizing secretary",
  vice_chairperson: "vice chairperson",
  vice_secretary: "vice secretary",
  welfare: "welfare",
  liturgist: "liturgist",
  member: "member",
};

function isAlumniMarker(value) {
  const s = String(value || "").trim().toLowerCase();
  if (!s) return false;
  return (
    /^n\/?a$/.test(s) ||
    /^alumni/.test(s) ||
    /^alumnus/.test(s) ||
    /^graduate/.test(s) ||
    /^graduated/.test(s)
  );
}

function semesterPeriodLabel(semester) {
  const s = new Date(semester.startDate);
  const e = new Date(semester.endDate);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return "";
  const sm = MONTH_NAMES[s.getMonth()];
  const em = MONTH_NAMES[e.getMonth()];
  const sy = s.getFullYear();
  const ey = e.getFullYear();
  return sy === ey ? `${sm} — ${em} ${sy}` : `${sm} ${sy} — ${em} ${ey}`;
}

function roleLabel(role) {
  const key = String(role || "").trim().toLowerCase();
  if (!key) return "member";
  if (ROLE_LABELS[key]) return ROLE_LABELS[key];
  return key.replace(/_/g, " ");
}

function formatRosterList(members) {
  return members
    .map((m, i) => {
      const adm = String(
        m.admissionNumber || m.user.admissionNumber || ""
      ).trim();
      const name = String(m.user.fullName || "").toUpperCase();
      const line = adm ? `${i + 1}. ${name} - ${adm}` : `${i + 1}. ${name}`;
      return line;
    })
    .join("\n");
}

function buildSemesterMessage(semester, members, customMessage = null) {
  const period = semesterPeriodLabel(semester);
  const total = members.length;
  const rosterList = formatRosterList(members);

  const registerLink =
  (process.env.FRONTEND_URL || "https://www.zetechcatholicaction.com") +
  "/semester-registration";

  const rosterBlock = [
    `📋 *ROSTER LIST*`,
    `👥 *Total:* ${total} member${total === 1 ? "" : "s"}`,
    "",
    rosterList || "_No members registered yet._",
  ].join("\n");

  const linkBlock =
    `\n\n🔗 *Register / view roster:*\n${registerLink}\n\n` +
    `_When you register using this link, your spot will be confirmed and automatically updated in the roster._`;

  // If admin wrote a custom message
  if (customMessage && customMessage.trim()) {
    let custom = customMessage;

    custom = custom.replace(/{semester}/g, period);
    custom = custom.replace(/{title}/g, semester.title || "");
    custom = custom.replace(/{total}/g, total);
    custom = custom.replace(/{list}/g, rosterList || "_No members registered yet._");
    custom = custom.replace(/{link}/g, registerLink);

    if (!customMessage.includes("{list}")) {
      custom += `\n\n${rosterBlock}`;
    }

    if (!customMessage.includes("{link}")) {
      custom += linkBlock;
    }

    return custom;
  }

  // Default message
  return (
    `*ZETECH UNIVERSITY CATHOLIC ACTION*\n` +
    `Club membership roster — ST. KIZITO, TRC.\n` +
    `*SEMESTER:* ${period}\n\n` +
    `${rosterBlock}` +
    linkBlock
  );
}

async function sendSemesterRosterToWhatsApp(semesterId) {
  try {
    console.log(`📱 Sending semester roster for semester ${semesterId}`);

    const semester = await prisma.schedule.findUnique({
      where: { id: semesterId },
    });
    if (!semester) return { success: false, error: "Semester not found" };

    const settings = await prisma.semesterWhatsAppSetting.findFirst();
    const groupIds = settings?.selectedGroupIds || [];

    if (groupIds.length === 0) {
      return { success: false, error: "No WhatsApp groups selected" };
    }

    const members = await prisma.semesterMembership.findMany({
      where: { semesterId, status: "active" },
      include: {
        user: {
          select: { fullName: true, admissionNumber: true, phone: true },
        },
      },
      orderBy: { registeredAt: "asc" },
    });

    if (members.length === 0) {
      return { success: true, message: "No members registered", sent: 0 };
    }

    const message = buildSemesterMessage(
      semester,
      members,
      settings?.customMessage || null
    );

    console.log(`📱 Message preview: ${message.substring(0, 200)}...`);

    const results = [];
    for (const groupId of groupIds) {
      try {
        if (!whatsappBot.isConnected) {
          results.push({ groupId, success: false, error: "Bot not connected" });
          continue;
        }
        const result = await whatsappBot.sendToSpecificGroup(groupId, message);
        results.push({ groupId, success: true, result });
        console.log(`✅ Roster sent to group ${groupId}`);
      } catch (error) {
        console.error(`❌ Failed to send to ${groupId}:`, error.message);
        results.push({ groupId, success: false, error: error.message });
      }
    }

    return {
      success: true,
      message: `Sent to ${results.filter((r) => r.success).length}/${groupIds.length} groups`,
      results,
      members: members.length,
      sentTo: results.filter((r) => r.success).length,
    };
  } catch (error) {
    console.error("❌ sendSemesterRosterToWhatsApp error:", error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendSemesterRosterToWhatsApp,
  buildSemesterMessage,
  formatRosterList,
  semesterPeriodLabel,
};