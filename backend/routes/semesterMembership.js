const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { authenticate, requireAdmin } = require("../middleware/auth");
const {
  getCurrentSemester,
  getSemesterPeriod,
} = require("../utils/semesterHelpers");
const XLSX = require("xlsx");

const MONTH_NAMES = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

const ROLE_LABELS = {
  jumuia_leader: "jumuiya moderator",
  jumuiya_leader: "jumuiya moderator",
  jumuiya_moderator: "jumuiya moderator",
  choir_moderator: "choir moderator",
  media_moderator: "media moderator",
  voice_rep: "voice rep",
  vice_chairperson: "vice chairperson",
  vice_secretary: "vice secretary",
  organizing_secretary: "organizing secretary",
  chairperson: "chairperson",
  secretary: "secretary",
  treasurer: "treasurer",
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

function validateAdmissionNumber(raw) {
  const value = String(raw || "").trim();
  if (!value) {
    return {
      ok: false,
      error:
        "Admission number is required. If you are an alumnus, please type N/A.",
    };
  }
  if (value.length > 64) {
    return {
      ok: false,
      error: "Admission number is too long (max 64 characters).",
    };
  }
  if (/[<>{}]/.test(value)) {
    return {
      ok: false,
      error: "Admission number contains invalid characters.",
    };
  }
  return { ok: true, value };
}

function semesterPeriodLabel(semester) {
  const s = new Date(semester.startDate);
  const e = new Date(semester.endDate);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return "";
  const sm = MONTH_NAMES[s.getMonth()];
  const em = MONTH_NAMES[e.getMonth()];
  const sy = s.getFullYear();
  const ey = e.getFullYear();
  return sy === ey ? `${sm}  ${em}  ${sy}` : `${sm}  ${sy}  ${em}  ${ey}`;
}

function normalizePhone(v) {
  let s = String(v || "").replace(/\D/g, "");
  if (s.startsWith("254") && s.length > 9) s = s.slice(3);
  if (s.startsWith("0") && s.length > 9) s = s.slice(1);
  return s;
}

function roleLabel(role) {
  const key = String(role || "").trim().toLowerCase();
  if (!key) return "member";
  if (ROLE_LABELS[key]) return ROLE_LABELS[key];
  return key.replace(/_/g, " ");
}

function htmlEscape(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildRosterRows(memberships) {
  return memberships.map((m, i) => {
    const adm = String(
      m.admissionNumber || m.user.admissionNumber || ""
    ).trim();
    const contact = normalizePhone(m.contact || m.user.phone || "");
    const role = roleLabel(m.role);
    return {
      index: i + 1,
      name: m.user.fullName || "",
      admissionNumber: adm,
      contact,
      role,
    };
  });
}

function extractSheetId(input) {
  if (!input) return null;
  const s = String(input).trim();

  const urlMatch = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch) return urlMatch[1];

  if (/^[a-zA-Z0-9-_]{20,}$/.test(s)) return s;

  return null;
}

function buildRosterHtml(semester, rows, options = {}) {
  const period = semesterPeriodLabel(semester);
  const parts = period.split(/\s{2,}/);
  const email = options.email || "";

  const cBase =
    "border:1px solid #000;padding:4px 6px;" +
    "font-family:Calibri,Arial,sans-serif;font-size:10pt;" +
    "vertical-align:middle;";
  const cBold = cBase + "font-weight:bold;";
  const cRight = cBase + "text-align:right;";
  const cRightBold = cRight + "font-weight:bold;";

  const bodyRows = rows
    .map(
      (r) => `
        <tr>
          <td style="${cRightBold}">${r.index}</td>
          <td style="${cBase}">${htmlEscape(r.name)}</td>
          <td style="${cBase}">${htmlEscape(r.admissionNumber)}</td>
          <td style="${cRight}">${htmlEscape(r.contact)}</td>
          <td style="${cBase}">${htmlEscape(r.role)}</td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${htmlEscape(semester.title)} Roster</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  body { margin: 0; font-family: Calibri, Arial, sans-serif; font-size: 10pt; }
  table { border-collapse: collapse; width: 100%; table-layout: fixed; }
  .roster-header-table { margin-bottom: 0; }
  .roster-spacer { height: 8px; }
</style>
</head>
<body>

  <table class="roster-header-table">
    <colgroup>
      <col style="width:12%" />
      <col style="width:14%" />
      <col style="width:12%" />
      <col style="width:14%" />
      <col style="width:48%" />
    </colgroup>
    <tr>
      <td style="${cBold}">SEMESTER</td>
      <td style="${cBold}">MONTH</td>
      <td style="${cBold}">TO</td>
      <td style="${cBold}">YEAR</td>
      <td style="${cBase}">${htmlEscape(email)}</td>
    </tr>
    <tr>
      <td style="${cBold}">1</td>
      <td style="${cBold}">${htmlEscape(parts[0] || "")}</td>
      <td style="${cBold}">${htmlEscape(parts[1] || "")}</td>
      <td style="${cBold}">${htmlEscape(parts[2] || "")}</td>
      <td style="${cBase}"></td>
    </tr>
  </table>

  <div class="roster-spacer"></div>

  <table>
    <colgroup>
      <col style="width:4%" />
      <col style="width:22%" />
      <col style="width:22%" />
      <col style="width:14%" />
      <col style="width:38%" />
    </colgroup>
    <tr>
      <td style="${cBase}"></td>
      <td style="${cBold}">NAME</td>
      <td style="${cBold}">ADMIN.NO</td>
      <td style="${cRightBold}">CONTACT</td>
      <td style="${cBold}">ROLE e.g. cCairperson, Secreatary, Treasurer, Member etc</td>
    </tr>
    ${bodyRows}
  </table>

</body>
</html>`;
}

async function maybeAutoSendRoster(semesterId, kind) {
  try {
    const semester = await prisma.schedule.findUnique({
      where: { id: semesterId },
    });
    if (!semester) return;

    const waSettings = await prisma.semesterWhatsAppSetting.findFirst();

    // WhatsApp auto-send
    if (waSettings?.enableWhatsAppAutoSend) {
      if (kind === "register" && waSettings.whatsAppSendOnRegister !== false) {
        require("../services/whatsappSemesterService")
          .sendSemesterRosterToWhatsApp(semesterId)
          .catch((e) =>
            console.warn("WhatsApp auto-send (register) failed:", e.message)
          );
      }
      if (kind === "close" && waSettings.whatsAppSendOnClose !== false) {
        require("../services/whatsappSemesterService")
          .sendSemesterRosterToWhatsApp(semesterId)
          .catch((e) =>
            console.warn("WhatsApp auto-send (close) failed:", e.message)
          );
      }
    }

        // Google Sheet auto-push
    if (semester.rosterSheetId) {
      const shouldPush =
        (kind === "register" && semester.sheetAutoPushOnRegister !== false) ||
        (kind === "close" && semester.sheetAutoPushOnClose !== false);

      if (shouldPush) {
        try {
          const memberships = await prisma.semesterMembership.findMany({
            where: { semesterId, status: "active" },
            include: {
              user: {
                select: {
                  fullName: true,
                  phone: true,
                  admissionNumber: true,
                },
              },
            },
            orderBy: { registeredAt: "asc" },
          });

          const rows = buildRosterRows(memberships);

          const allSemesters = await prisma.schedule.findMany({
            orderBy: { startDate: "asc" },
            select: { id: true },
          });
          const semesterIndex =
            allSemesters.findIndex((s) => s.id === semester.id) + 1;

          require("../services/googleSheetService")
            .writeRosterToSheet(
              semester.rosterSheetId,
              semester,
              rows,
              semesterIndex || 1
            )
            .catch((e) =>
              console.warn("Google Sheet auto-push failed:", e.message)
            );
        } catch (e) {
          console.warn("Google Sheet auto-push setup error:", e.message);
        }
      }
    }
  } catch (err) {
    console.warn("Auto-send setup error:", err.message);
  }
}

router.get("/my-semester", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const semester = await getCurrentSemester(prisma);

    if (!semester) {
      return res.json({
        success: true,
        semester: null,
        message: "No active semester found",
      });
    }

    const rawMembership = await prisma.semesterMembership.findUnique({
      where: { userId_semesterId: { userId, semesterId: semester.id } },
    });

    const membership =
      rawMembership && rawMembership.status !== "removed"
        ? rawMembership
        : null;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { admissionNumber: true, phone: true },
    });

    const effectiveAdmission = String(
      membership?.admissionNumber || user?.admissionNumber || ""
    ).trim();

    const needsAdmissionNumber = !effectiveAdmission;
    const isAlumni = isAlumniMarker(effectiveAdmission);

    res.json({
      success: true,
      semester: {
        id: semester.id,
        title: semester.title,
        startDate: semester.startDate,
        endDate: semester.endDate,
        period: getSemesterPeriod(semester),
        registrationOpen: semester.registrationOpen,
      },
      membership: membership
        ? {
            registered: true,
            role: membership.role,
            admissionNumber: membership.admissionNumber,
            contact: membership.contact,
            status: membership.status,
            registeredAt: membership.registeredAt,
          }
        : { registered: false },
      user: {
        admissionNumber: user?.admissionNumber || "",
        phone: user?.phone || "",
      },
      needsAdmissionNumber,
      isAlumni,
    });
  } catch (err) {
    console.error("Error in /my-semester:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/my-semester/register", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { admissionNumber, contact } = req.body;

    const semester = await getCurrentSemester(prisma);

    if (!semester) {
      return res.status(400).json({ error: "No active semester" });
    }

    if (!semester.registrationOpen) {
      return res.status(403).json({
        error:
          "Registration for this semester is not open yet. Please check back later.",
      });
    }

    const existing = await prisma.semesterMembership.findUnique({
      where: { userId_semesterId: { userId, semesterId: semester.id } },
    });

    if (existing && existing.status !== "removed") {
      return res.status(400).json({
        error: "You are already registered for this semester.",
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const incomingAdmission =
      admissionNumber !== undefined && admissionNumber !== null
        ? admissionNumber
        : user.admissionNumber;

    const validated = validateAdmissionNumber(incomingAdmission);
    if (!validated.ok) {
      return res.status(400).json({ error: validated.error });
    }

    const snapshotAdmission = validated.value;
    const alumniFlag = isAlumniMarker(snapshotAdmission);

    const snapshotRole = user.specialRole || user.role || "member";
    const snapshotContact = (contact || user.phone || "").trim() || null;

    let membership;

    if (existing && existing.status === "removed") {
      membership = await prisma.semesterMembership.update({
        where: { id: existing.id },
        data: {
          status: "active",
          admissionNumber: snapshotAdmission,
          contact: snapshotContact,
          role: snapshotRole,
          registeredAt: new Date(),
        },
      });
    } else {
      membership = await prisma.semesterMembership.create({
        data: {
          userId,
          semesterId: semester.id,
          admissionNumber: snapshotAdmission,
          contact: snapshotContact,
          role: snapshotRole,
          status: "active",
        },
      });
    }

    if (snapshotAdmission !== user.admissionNumber) {
      await prisma.user.update({
        where: { id: userId },
        data: { admissionNumber: snapshotAdmission },
      });
    }

    if (semester.notifyOnRegister || semester.notifyOnRegisterEmail) {
      try {
        if (global.createAndSendNotification) {
          await global.createAndSendNotification({
            userId,
            type: "semester_registration_confirmed",
            title: "Registration Confirmed",
            message: alumniFlag
              ? `You are now registered for ${semester.title} as an alumnus.`
              : `You are now registered for ${semester.title} as ${snapshotRole}.`,
            data: {
              url: "/semester-registration",
              semesterId: semester.id,
              sendPush: semester.notifyOnRegister,
              sendEmail: semester.notifyOnRegisterEmail,
            },
          });
        }
      } catch (err) {
        console.warn("Confirmation notification failed:", err.message);
      }
    }

    maybeAutoSendRoster(semester.id, "register");

    res.json({
      success: true,
      message: alumniFlag
        ? `You are now registered for ${semester.title} as an alumnus.`
        : `You are now registered for ${semester.title}`,
      membership,
      isAlumni: alumniFlag,
    });
  } catch (err) {
    console.error("Error registering:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post(
  "/semesters/:semesterId/register-user",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const { semesterId } = req.params;
      const { userId, admissionNumber, contact, role } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "userId is required." });
      }

      const semester = await prisma.schedule.findUnique({
        where: { id: semesterId },
      });
      if (!semester) {
        return res.status(404).json({ error: "Semester not found." });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: "User not found." });

      const existing = await prisma.semesterMembership.findUnique({
        where: { userId_semesterId: { userId, semesterId } },
      });

      if (existing && existing.status === "active") {
        return res.status(400).json({
          error: `${user.fullName} is already registered for this semester.`,
        });
      }

      const incomingAdmission =
        admissionNumber !== undefined && admissionNumber !== null
          ? admissionNumber
          : user.admissionNumber;

      const validated = validateAdmissionNumber(incomingAdmission);
      if (!validated.ok) {
        return res.status(400).json({ error: validated.error });
      }

      const snapshotAdmission = validated.value;
      const snapshotRole =
        (role && String(role).trim()) ||
        user.specialRole ||
        user.role ||
        "member";
      const snapshotContact =
        (contact && String(contact).trim()) || user.phone || null;

      let membership;

      if (existing) {
        membership = await prisma.semesterMembership.update({
          where: { id: existing.id },
          data: {
            status: "active",
            admissionNumber: snapshotAdmission,
            contact: snapshotContact,
            role: snapshotRole,
            registeredAt: new Date(),
          },
        });
      } else {
        membership = await prisma.semesterMembership.create({
          data: {
            userId,
            semesterId,
            admissionNumber: snapshotAdmission,
            contact: snapshotContact,
            role: snapshotRole,
            status: "active",
          },
        });
      }

      if (snapshotAdmission !== user.admissionNumber) {
        await prisma.user.update({
          where: { id: userId },
          data: { admissionNumber: snapshotAdmission },
        });
      }

      maybeAutoSendRoster(semesterId, "register");

      res.json({
        success: true,
        message: `${user.fullName} registered for ${semester.title}.`,
        membership,
        isAlumni: isAlumniMarker(snapshotAdmission),
      });
    } catch (err) {
      console.error("Error admin-registering user:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

router.get(
  "/semesters/:semesterId/eligible-users",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const { semesterId } = req.params;
      const search = String(req.query.search || "").trim();
      const limit = Math.min(Number(req.query.limit) || 50, 200);

      const semester = await prisma.schedule.findUnique({
        where: { id: semesterId },
      });
      if (!semester) {
        return res.status(404).json({ error: "Semester not found." });
      }

      const where = {};
      if (search) {
        where.OR = [
          { fullName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { membership_number: { contains: search, mode: "insensitive" } },
          { admissionNumber: { contains: search, mode: "insensitive" } },
        ];
      }

      const users = await prisma.user.findMany({
        where,
        take: limit,
        orderBy: { fullName: "asc" },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          specialRole: true,
          admissionNumber: true,
          membership_number: true,
        },
      });

      const activeIds = await prisma.semesterMembership.findMany({
        where: { semesterId, status: "active" },
        select: { userId: true },
      });
      const activeSet = new Set(activeIds.map((m) => m.userId));

      const result = users.map((u) => ({
        ...u,
        alreadyRegistered: activeSet.has(u.id),
      }));

      res.json({ success: true, users: result });
    } catch (err) {
      console.error("Error listing eligible users:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

router.put("/my-semester/admission-number", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    const validated = validateAdmissionNumber(req.body.admissionNumber);
    if (!validated.ok) {
      return res.status(400).json({ error: validated.error });
    }

    const admissionNumber = validated.value;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { admissionNumber },
      select: { id: true, admissionNumber: true },
    });

    const semester = await getCurrentSemester(prisma);
    if (semester) {
      await prisma.semesterMembership.updateMany({
        where: { userId, semesterId: semester.id, status: "active" },
        data: { admissionNumber },
      });
    }

    res.json({
      success: true,
      user,
      isAlumni: isAlumniMarker(admissionNumber),
    });
  } catch (err) {
    console.error("Error updating admission number:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/semesters", authenticate, requireAdmin, async (req, res) => {
  try {
    const semesters = await prisma.schedule.findMany({
      orderBy: { startDate: "desc" },
            select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        isActiveSemester: true,
        isPublished: true,
        registrationOpen: true,
        notifyOnOpen: true,
        notifyOnOpenEmail: true,
        notifyOnRegister: true,
        notifyOnRegisterEmail: true,
        rosterSheetId: true,
        sheetAutoPushOnRegister: true,
        sheetAutoPushOnClose: true,
      },
    });

    const withCounts = await Promise.all(
      semesters.map(async (s) => {
        const count = await prisma.semesterMembership.count({
          where: { semesterId: s.id, status: "active" },
        });
        return { ...s, memberCount: count };
      })
    );

    res.json({ success: true, semesters: withCounts });
  } catch (err) {
    console.error("Error listing semesters:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post(
  "/semesters/:id/open-registration",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      const semester = await prisma.schedule.update({
        where: { id },
        data: { registrationOpen: true },
      });

      const shouldPush = semester.notifyOnOpen;
      const shouldEmail = semester.notifyOnOpenEmail;

      res.json({
        success: true,
        message: `Registration opened for ${semester.title}`,
        willNotify: { push: shouldPush, email: shouldEmail },
        semester,
      });

      if (shouldPush || shouldEmail) {
        (async () => {
          try {
            const allUsers = await prisma.user.findMany({
              select: { id: true },
            });

            const title = "Semester Registration Open";
            const message = `Registration for ${semester.title} is now open. Tap to register.`;

            for (const user of allUsers) {
              try {
                if (global.createAndSendNotification) {
                  await global.createAndSendNotification({
                    userId: user.id,
                    type: "semester_registration_open",
                    title,
                    message,
                    data: {
                      url: "/semester-registration",
                      semesterId: semester.id,
                      sendPush: shouldPush,
                      sendEmail: shouldEmail,
                    },
                  });
                }
              } catch (err) {
                console.warn(`Notify failed for ${user.id}:`, err.message);
              }
            }

            console.log(
              `Registration-open notifications sent to ${allUsers.length} users`
            );
          } catch (err) {
            console.error("Bulk notify failed:", err.message);
          }
        })();
      }
    } catch (err) {
      console.error("Error opening registration:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

router.post(
  "/semesters/:id/close-registration",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const semester = await prisma.schedule.update({
        where: { id },
        data: { registrationOpen: false },
      });

      maybeAutoSendRoster(id, "close");

      res.json({
        success: true,
        message: `Registration closed for ${semester.title}`,
        semester,
      });
    } catch (err) {
      console.error("Error closing registration:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

router.post(
  "/semesters/:id/resend-notifications",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const semester = await prisma.schedule.findUnique({ where: { id } });

      if (!semester) {
        return res.status(404).json({ error: "Semester not found" });
      }

      const shouldPush = semester.notifyOnOpen;
      const shouldEmail = semester.notifyOnOpenEmail;

      res.json({ success: true, message: "Resending notifications..." });

      (async () => {
        const allUsers = await prisma.user.findMany({ select: { id: true } });
        const title = "Semester Registration Open";
        const message = `Reminder: Registration for ${semester.title} is open. Tap to register.`;

        for (const user of allUsers) {
          try {
            if (global.createAndSendNotification) {
              await global.createAndSendNotification({
                userId: user.id,
                type: "semester_registration_open",
                title,
                message,
                data: {
                  url: "/semester-registration",
                  semesterId: semester.id,
                  sendPush: shouldPush,
                  sendEmail: shouldEmail,
                },
              });
            }
          } catch (err) {
            console.warn(`Resend failed for ${user.id}:`, err.message);
          }
        }
      })();
    } catch (err) {
      console.error("Error resending notifications:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

router.put(
  "/semesters/:id/notification-settings",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        notifyOnOpen,
        notifyOnOpenEmail,
        notifyOnRegister,
        notifyOnRegisterEmail,
      } = req.body;

      const data = {};
      if (typeof notifyOnOpen === "boolean") data.notifyOnOpen = notifyOnOpen;
      if (typeof notifyOnOpenEmail === "boolean")
        data.notifyOnOpenEmail = notifyOnOpenEmail;
      if (typeof notifyOnRegister === "boolean")
        data.notifyOnRegister = notifyOnRegister;
      if (typeof notifyOnRegisterEmail === "boolean")
        data.notifyOnRegisterEmail = notifyOnRegisterEmail;

      const semester = await prisma.schedule.update({ where: { id }, data });
      res.json({ success: true, semester });
    } catch (err) {
      console.error("Error updating settings:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

router.get(
  "/semesters/:semesterId/members",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const { semesterId } = req.params;

      const semester = await prisma.schedule.findUnique({
        where: { id: semesterId },
      });
      if (!semester) {
        return res.status(404).json({ error: "Semester not found" });
      }

      const memberships = await prisma.semesterMembership.findMany({
        where: { semesterId, status: "active" },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              role: true,
              specialRole: true,
              admissionNumber: true,
            },
          },
        },
        orderBy: { registeredAt: "asc" },
      });

      const roster = memberships.map((m, index) => {
        const adm = String(
          m.admissionNumber || m.user.admissionNumber || ""
        ).trim();
        return {
          index: index + 1,
          userId: m.user.id,
          name: m.user.fullName,
          admissionNumber: adm,
          isAlumni: isAlumniMarker(adm),
          missingAdmission: !adm,
          contact: m.contact || m.user.phone || "",
          role: m.role,
          registeredAt: m.registeredAt,
        };
      });

      const withoutAdmission = roster.filter((r) => r.missingAdmission).length;
      const alumniCount = roster.filter((r) => r.isAlumni).length;

      res.json({
        success: true,
        semester: {
          id: semester.id,
          title: semester.title,
          startDate: semester.startDate,
          endDate: semester.endDate,
        },
        count: roster.length,
        withoutAdmission,
        alumniCount,
        members: roster,
      });
    } catch (err) {
      console.error("Error fetching roster:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

router.get(
  "/semesters/:semesterId/export.xlsx",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const { semesterId } = req.params;

      const semester = await prisma.schedule.findUnique({
        where: { id: semesterId },
      });
      if (!semester) {
        return res.status(404).json({ error: "Semester not found" });
      }

      const memberships = await prisma.semesterMembership.findMany({
        where: { semesterId, status: "active" },
        include: {
          user: {
            select: { fullName: true, phone: true, admissionNumber: true },
          },
        },
        orderBy: { registeredAt: "asc" },
      });

      const rows = buildRosterRows(memberships);
      const period = semesterPeriodLabel(semester);
      const parts = period.split(/\s{2,}/);
      const email = req.user.email || req.user.userEmail || "";

      const aoa = [];

      aoa.push(["SEMESTER", "MONTH", "TO", "YEAR", "", email]);
      aoa.push(["1", parts[0] || "", parts[1] || "", parts[2] || "", "", ""]);
      aoa.push(["", "", "", "", "", ""]);
      aoa.push([
        "",
        "NAME",
        "ADMIN.NO",
        "CONTACT",
        "ROLE e.g. cCairperson, Secreatary, Treasurer, Member etc",
        "",
      ]);

      rows.forEach((r) => {
        aoa.push([
          r.index,
          r.name,
          r.admissionNumber,
          r.contact,
          r.role,
          "",
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(aoa);

      ws["!cols"] = [
        { wch: 6 },
        { wch: 28 },
        { wch: 24 },
        { wch: 14 },
        { wch: 46 },
        { wch: 26 },
      ];

      const range = XLSX.utils.decode_range(ws["!ref"]);
      for (let R = range.s.r; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          let cell = ws[addr];
          if (!cell) {
            cell = { t: "s", v: "" };
            ws[addr] = cell;
          }

          if (C === 3 && R >= 4 && cell.v) {
            cell.t = "s";
            cell.v = String(cell.v);
          }

          const isHeaderRow = R === 0 || R === 1;
          const isColHeadRow = R === 3;
          const isIndexCol = C === 0 && R >= 4;

          const bold = isHeaderRow || isColHeadRow;
          const alignRight = (C === 3 && R >= 3) || isIndexCol;

          cell.s = {
            font: {
              name: "Calibri",
              sz: 11,
              bold: bold || undefined,
            },
            alignment: {
              horizontal: alignRight ? "right" : "left",
              vertical: "center",
              wrapText: C === 4 && isColHeadRow,
            },
            border: {
              top: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } },
            },
          };
        }
      }

      ws["!merges"] = [{ s: { r: 2, c: 0 }, e: { r: 2, c: 5 } }];
      ws["!rows"] = [
        { hpt: 22 },
        { hpt: 22 },
        { hpt: 12 },
        { hpt: 36 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Roster");

      const buf = XLSX.write(wb, {
        bookType: "xlsx",
        type: "buffer",
        cellStyles: true,
      });

      const safeTitle = semester.title.replace(/[^a-z0-9]/gi, "_");
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="roster_${safeTitle}.xlsx"`
      );
      res.send(buf);
    } catch (err) {
      console.error("Error exporting roster xlsx:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

router.get(
  "/semesters/:semesterId/export.csv",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const { semesterId } = req.params;

      const semester = await prisma.schedule.findUnique({
        where: { id: semesterId },
      });
      if (!semester) {
        return res.status(404).json({ error: "Semester not found" });
      }

      const memberships = await prisma.semesterMembership.findMany({
        where: { semesterId, status: "active" },
        include: {
          user: {
            select: { fullName: true, phone: true, admissionNumber: true },
          },
        },
        orderBy: { registeredAt: "asc" },
      });

      const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const periodParts = semesterPeriodLabel(semester).split(/\s{2,}/);
      const rows = buildRosterRows(memberships);
      const email = req.user.email || req.user.userEmail || "";

      const lines = [];
      lines.push(
        ["SEMESTER", "MONTH", "TO", "YEAR", "", "", email].map(esc).join(",")
      );
      lines.push(
        [
          "1",
          periodParts[0] || "",
          periodParts[1] || "",
          periodParts[2] || "",
          "",
          "",
          "",
        ]
          .map(esc)
          .join(",")
      );
      lines.push("");
      lines.push(
        ["", "NAME", "ADMIN.NO", "CONTACT", "ROLE"].map(esc).join(",")
      );

      rows.forEach((r) => {
        lines.push(
          [
            r.index,
            esc(r.name),
            esc(r.admissionNumber),
            esc(r.contact),
            esc(r.role),
          ].join(",")
        );
      });

      const csv = lines.join("\n");
      const safeTitle = semester.title.replace(/[^a-z0-9]/gi, "_");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="roster_${safeTitle}.csv"`
      );
      res.send(csv);
    } catch (err) {
      console.error("Error exporting roster csv:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

router.get(
  "/semesters/:semesterId/export.doc",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const { semesterId } = req.params;

      const semester = await prisma.schedule.findUnique({
        where: { id: semesterId },
      });
      if (!semester) {
        return res.status(404).json({ error: "Semester not found" });
      }

      const memberships = await prisma.semesterMembership.findMany({
        where: { semesterId, status: "active" },
        include: {
          user: {
            select: { fullName: true, phone: true, admissionNumber: true },
          },
        },
        orderBy: { registeredAt: "asc" },
      });

      const rows = buildRosterRows(memberships);
      const html = buildRosterHtml(semester, rows, {
        email: req.user.email || req.user.userEmail || "",
      });
      const safeTitle = semester.title.replace(/[^a-z0-9]/gi, "_");

      res.setHeader("Content-Type", "application/msword");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="roster_${safeTitle}.doc"`
      );
      res.send(html);
    } catch (err) {
      console.error("Error exporting roster doc:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

router.get(
  "/semesters/:semesterId/export.pdf",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const { semesterId } = req.params;

      const semester = await prisma.schedule.findUnique({
        where: { id: semesterId },
      });
      if (!semester) {
        return res.status(404).json({ error: "Semester not found" });
      }

      const memberships = await prisma.semesterMembership.findMany({
        where: { semesterId, status: "active" },
        include: {
          user: {
            select: { fullName: true, phone: true, admissionNumber: true },
          },
        },
        orderBy: { registeredAt: "asc" },
      });

      const rows = buildRosterRows(memberships);
      const html = buildRosterHtml(semester, rows, {
        email: req.user.email || req.user.userEmail || "",
      });
      const safeTitle = semester.title.replace(/[^a-z0-9]/gi, "_");

      let puppeteer;
      try {
        puppeteer = require("puppeteer");
      } catch (e) {
        return res.status(500).json({
          error:
            "PDF export requires the 'puppeteer' package. Run: npm install puppeteer",
        });
      }

      const browser = await puppeteer.launch({
        headless: "new",
        executablePath:
          process.env.CHROME_PATH ||
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });
        const pdfBuffer = await page.pdf({
          format: "A4",
          landscape: true,
          printBackground: true,
          margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="roster_${safeTitle}.pdf"`
        );
        res.send(Buffer.from(pdfBuffer));
      } finally {
        await browser.close();
      }
    } catch (err) {
      console.error("Error exporting roster pdf:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

router.delete(
  "/semesters/:semesterId/members/:userId",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const { semesterId, userId } = req.params;
      await prisma.semesterMembership.update({
        where: { userId_semesterId: { userId, semesterId } },
        data: { status: "removed" },
      });
      res.json({ success: true });
    } catch (err) {
      console.error("Error removing member:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

router.get(
  "/semesters/whatsapp-groups",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const groups = await prisma.whatsAppGroup.findMany({
        where: { isActive: true },
        orderBy: { groupName: "asc" },
      });
      res.json({ success: true, groups });
    } catch (err) {
      console.error("Error loading WhatsApp groups:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

router.get(
  "/semesters/whatsapp/settings",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const settings = await prisma.semesterWhatsAppSetting.findFirst();
      res.json({
        success: true,
        settings: settings || {
          selectedGroupIds: [],
          customMessage: "",
          enableWhatsAppAutoSend: false,
          whatsAppSendOnRegister: true,
          whatsAppSendOnClose: true,
        },
      });
    } catch (err) {
      console.error("Error loading semester WhatsApp settings:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

router.post(
  "/semesters/whatsapp/save",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const {
        selectedGroupIds,
        customMessage,
        enableWhatsAppAutoSend,
        whatsAppSendOnRegister,
        whatsAppSendOnClose,
      } = req.body;

      if (!Array.isArray(selectedGroupIds)) {
        return res
          .status(400)
          .json({ error: "selectedGroupIds must be an array." });
      }

      const payload = {
        selectedGroupIds,
        customMessage: customMessage || null,
        enableWhatsAppAutoSend: !!enableWhatsAppAutoSend,
        whatsAppSendOnRegister: whatsAppSendOnRegister !== false,
        whatsAppSendOnClose: whatsAppSendOnClose !== false,
        updatedBy: req.user.email || req.user.userId,
      };

      const existing = await prisma.semesterWhatsAppSetting.findFirst();

      let settings;
      if (existing) {
        settings = await prisma.semesterWhatsAppSetting.update({
          where: { id: existing.id },
          data: payload,
        });
      } else {
        settings = await prisma.semesterWhatsAppSetting.create({
          data: payload,
        });
      }

      res.json({ success: true, settings });
    } catch (err) {
      console.error("Error saving semester WhatsApp settings:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

router.post(
  "/semesters/:semesterId/send-whatsapp",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const { semesterId } = req.params;

      const result = await require("../services/whatsappSemesterService")
        .sendSemesterRosterToWhatsApp(semesterId);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result);
    } catch (err) {
      console.error("Error sending semester roster:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

router.put(
  "/semesters/:id/roster-sheet",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { sheetUrl } = req.body;

      const sheetId = extractSheetId(sheetUrl);

      if (sheetUrl && !sheetId) {
        return res
          .status(400)
          .json({ error: "Invalid Google Sheet URL or ID." });
      }

      const semester = await prisma.schedule.update({
        where: { id },
        data: { rosterSheetId: sheetId },
      });

      res.json({
        success: true,
        message: sheetId
          ? `Roster sheet linked.`
          : "Roster sheet cleared.",
        semester,
      });
    } catch (err) {
      console.error("Error saving roster sheet:", err);
      res.status(500).json({ error: err.message });
    }
  }
);


router.put(
  "/semesters/:id/sheet-settings",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        sheetUrl,
        sheetAutoPushOnRegister,
        sheetAutoPushOnClose,
      } = req.body;

      const data = {};

      if (sheetUrl !== undefined) {
        const sheetId = extractSheetId(sheetUrl);
        if (sheetUrl && !sheetId) {
          return res
            .status(400)
            .json({ error: "Invalid Google Sheet URL or ID." });
        }
        data.rosterSheetId = sheetId;
      }

      if (typeof sheetAutoPushOnRegister === "boolean") {
        data.sheetAutoPushOnRegister = sheetAutoPushOnRegister;
      }
      if (typeof sheetAutoPushOnClose === "boolean") {
        data.sheetAutoPushOnClose = sheetAutoPushOnClose;
      }

      const semester = await prisma.schedule.update({ where: { id }, data });
      res.json({ success: true, semester });
    } catch (err) {
      console.error("Error saving sheet settings:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

router.post(
  "/semesters/:semesterId/export-to-google-sheet",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const { semesterId } = req.params;

      const semester = await prisma.schedule.findUnique({
        where: { id: semesterId },
      });
      if (!semester) {
        return res.status(404).json({ error: "Semester not found." });
      }
      if (!semester.rosterSheetId) {
        return res.status(400).json({
          error: "No Google Sheet linked to this semester.",
        });
      }

      const memberships = await prisma.semesterMembership.findMany({
        where: { semesterId, status: "active" },
        include: {
          user: {
            select: { fullName: true, phone: true, admissionNumber: true },
          },
        },
        orderBy: { registeredAt: "asc" },
      });

      const rows = buildRosterRows(memberships);

      const allSemesters = await prisma.schedule.findMany({
        orderBy: { startDate: "asc" },
        select: { id: true },
      });
      const semesterIndex =
        allSemesters.findIndex((s) => s.id === semester.id) + 1;

      const result = await require("../services/googleSheetService")
        .writeRosterToSheet(
          semester.rosterSheetId,
          semester,
          rows,
          semesterIndex || 1
        );

      res.json({
        success: true,
        message: `Wrote ${result.written} members to the Google Sheet (${result.mode}).`,
        written: result.written,
        mode: result.mode,
        semesterIndex,
      });
    } catch (err) {
      console.error("Error exporting to Google Sheet:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;