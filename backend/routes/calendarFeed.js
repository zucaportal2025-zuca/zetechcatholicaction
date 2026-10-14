// backend/routes/calendarFeed.js
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/* ============================================================
   Helpers
============================================================ */
const pad = (n) => String(n).padStart(2, "0");

// Format a Date as YYYYMMDDTHHmmssZ (UTC) — used for DTSTAMP, DTSTART, DTEND
const fmtUTC = (d) => {
  const x = new Date(d);
  return (
    `${x.getUTCFullYear()}` +
    `${pad(x.getUTCMonth() + 1)}` +
    `${pad(x.getUTCDate())}` +
    `T${pad(x.getUTCHours())}` +
    `${pad(x.getUTCMinutes())}` +
    `00Z`
  );
};

// Deterministic UID — same event always has same UID across add / cancel / update
const stableUid = (event) => {
  const key = `${event.scheduleId}|${event.id}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return `zuca-${h.toString(36)}@zuca-portal`;
};

// Combine a date (Date or ISO string) + a time ("16:30") into a single Date.
// The date comes from the DB in UTC; the time is what the admin typed, in Nairobi local.
// Nairobi is UTC+3 year-round.
const buildEventStart = (eventDate, eventTime) => {
  const asDate =
    eventDate instanceof Date ? eventDate : new Date(eventDate);
  if (isNaN(asDate.getTime())) return new Date();

  if (eventTime && /^\d{1,2}:\d{2}$/.test(eventTime)) {
    const [hh, mm] = eventTime.split(":").map(Number);
    const iso = asDate.toISOString();
    const [y, mo, day] = iso.slice(0, 10).split("-").map(Number);
    const utcMs = Date.UTC(y, mo - 1, day, hh - 3, mm, 0);
    return new Date(utcMs);
  }

  // No time → default 4:30 PM Nairobi
  const iso = asDate.toISOString();
  const [y, mo, day] = iso.slice(0, 10).split("-").map(Number);
  const utcMs = Date.UTC(y, mo - 1, day, 16 - 3, 30, 0);
  return new Date(utcMs);
};

// Escape for iCal text fields
const esc = (str) =>
  String(str || "")
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n");

// Build a single VEVENT block from a schedule event
const buildVEvent = (event, now) => {
  const start = buildEventStart(event.eventDate, event.eventTime);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour
  const uid = stableUid(event);
  const isPast = end < new Date(now.getTime() - 24 * 60 * 60 * 1000);

  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${fmtUTC(now)}`,
    `DTSTART:${fmtUTC(start)}`,
    `DTEND:${fmtUTC(end)}`,
    `SUMMARY:${esc(event.title || event.groupName || "Event")}`,
    `DESCRIPTION:${esc(event.description || "")}`,
    `LOCATION:${esc(event.location || "Zetech University")}`,
    ...(isPast ? ["STATUS:CANCELLED", "SEQUENCE:99"] : []),
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder",
    "END:VALARM",
    "END:VEVENT",
  ];
};

/* ============================================================
   PUBLIC feed — whole schedule as .ics
   GET /api/calendar/:scheduleId.ics
============================================================ */
router.get("/:scheduleId.ics", async (req, res) => {
  try {
    const schedule = await prisma.schedule.findUnique({
      where: { id: req.params.scheduleId },
      include: { events: true },
    });

    if (!schedule || !schedule.isPublished) {
      return res.status(404).send("Schedule not found");
    }

    const now = new Date();
    const events = schedule.events || [];

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ZUCA Portal//Schedules//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:${esc(schedule.title)}`,
      "X-WR-TIMEZONE:Africa/Nairobi",
    ];

    events.forEach((event) => {
      lines.push(...buildVEvent(event, now));
    });

    lines.push("END:VCALENDAR");

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${schedule.id}.ics"`
    );
    res.setHeader("Cache-Control", "public, max-age=300");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(lines.join("\r\n"));
  } catch (err) {
    console.error("calendar feed error:", err);
    res.status(500).send("Server error");
  }
});

/* ============================================================
   Single event feed — used by the per-event "Add" button
   GET /api/calendar/event/:eventId.ics
============================================================ */
router.get("/event/:eventId.ics", async (req, res) => {
  try {
    const event = await prisma.scheduleEvent.findUnique({
      where: { id: req.params.eventId },
      include: { schedule: { select: { title: true, isPublished: true } } },
    });

    if (!event || !event.schedule?.isPublished) {
      return res.status(404).send("Event not found");
    }

    const now = new Date();

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ZUCA Portal//Schedules//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:${esc(event.title || event.groupName || "Event")}`,
      "X-WR-TIMEZONE:Africa/Nairobi",
      ...buildVEvent(event, now),
      "END:VCALENDAR",
    ];

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${event.id}.ics"`
    );
    res.setHeader("Cache-Control", "public, max-age=300");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(lines.join("\r\n"));
  } catch (err) {
    console.error("single event feed error:", err);
    res.status(500).send("Server error");
  }
});

/* ============================================================
   Cancel a single event (used later by the "Remove" button)
   GET /api/calendar/cancel/:uid.ics
============================================================ */
router.get("/cancel/:uid.ics", (req, res) => {
  const uid = req.params.uid;
  const now = new Date();

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ZUCA Portal//Schedules//EN",
    "METHOD:CANCEL",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${fmtUTC(now)}`,
    `DTSTART:${fmtUTC(now)}`,
    `DTEND:${fmtUTC(new Date(now.getTime() + 60 * 60 * 1000))}`,
    "SUMMARY:Cancelled",
    "STATUS:CANCELLED",
    "SEQUENCE:99",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.send(lines.join("\r\n"));
});

module.exports = router;