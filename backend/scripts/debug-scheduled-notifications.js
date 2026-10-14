// backend/scripts/debug-scheduled-notifications.js
// Run with: node backend/scripts/debug-scheduled-notifications.js

require("dotenv").config({ path: "../.env" });
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Kenyan Timezone helper (UTC+3)
const KENYA_TIMEZONE = 'Africa/Nairobi';

function getKenyanTime() {
  const now = new Date();
  const kenyanTimeStr = now.toLocaleString('en-US', { timeZone: KENYA_TIMEZONE });
  return new Date(kenyanTimeStr);
}

function formatKenyanTime(date) {
  return date.toLocaleString('en-US', { 
    timeZone: KENYA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

function formatDateOnly(date) {
  return date.toLocaleDateString('en-US', { 
    timeZone: KENYA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

// Get notification message
function getNotificationMessage(event, timing) {
  const eventTime = event.eventTime || "16:30";
  const location = event.location || "Location to be announced";
  const eventDateFormatted = formatDateOnly(new Date(event.eventDate));
  
  const messages = {
    "1 week before": `📅 REMINDER: "${event.title}" is in 1 week on ${eventDateFormatted} at ${eventTime} in ${location}. Please prepare!`,
    "3 days before": `📅 REMINDER: "${event.title}" is in 3 days on ${eventDateFormatted} at ${eventTime} in ${location}. Don't forget!`,
    "1 day before": `🔔 IMPORTANT: "${event.title}" is TOMORROW at ${eventTime} in ${location}. Please be punctual!`,
    "12 hours before": `⏰ "${event.title}" is in 12 hours at ${eventTime} in ${location}. Get ready!`,
    "6 hours before": `⏰ "${event.title}" is in 6 hours at ${eventTime} in ${location}. Make your way there.`,
    "1 hour before": `🚨 URGENT: "${event.title}" starts in 1 hour at ${eventTime} in ${location}!`,
    "30 minutes before": `🚨 "${event.title}" starts in 30 minutes at ${location}! Please take your seats!`
  };
  
  return messages[timing] || `📢 "${event.title}" is scheduled for ${eventDateFormatted} at ${eventTime} in ${location}.`;
}

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("🔍 SCHEDULED NOTIFICATIONS DEBUG SCRIPT");
  console.log("=".repeat(80));
  console.log(`🕐 Current Kenyan Time: ${formatKenyanTime(getKenyanTime())}\n`);

  // ========== 1. CHECK ALL PUBLISHED SCHEDULES ==========
  console.log("📋 1. CHECKING PUBLISHED SCHEDULES");
  console.log("-".repeat(80));
  
  const schedules = await prisma.schedule.findMany({
    where: { isPublished: true },
    include: {
      events: {
        orderBy: { eventDate: 'asc' }
      }
    }
  });
  
  console.log(`Found ${schedules.length} published schedules\n`);
  
  for (const schedule of schedules) {
    console.log(`📌 Schedule: ${schedule.title}`);
    console.log(`   ID: ${schedule.id}`);
    console.log(`   Published: ${schedule.isPublished}`);
    console.log(`   Events: ${schedule.events.length}`);
    console.log(`   Created: ${formatKenyanTime(schedule.createdAt)}`);
    console.log("");
  }

  // ========== 2. CHECK ALL EVENTS AND THEIR DATES ==========
  console.log("\n📅 2. CHECKING ALL EVENTS");
  console.log("-".repeat(80));
  
  const allEvents = await prisma.scheduleEvent.findMany({
    include: {
      schedule: {
        select: {
          id: true,
          title: true,
          isPublished: true
        }
      }
    },
    orderBy: { eventDate: 'asc' }
  });
  
  const now = getKenyanTime();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  
  const upcomingEvents = allEvents.filter(e => new Date(e.eventDate) >= today);
  const pastEvents = allEvents.filter(e => new Date(e.eventDate) < today);
  
  console.log(`Total Events: ${allEvents.length}`);
  console.log(`Upcoming Events: ${upcomingEvents.length}`);
  console.log(`Past Events: ${pastEvents.length}\n`);
  
  console.log("📅 UPCOMING EVENTS DETAILS:");
  for (const event of upcomingEvents.slice(0, 20)) {
    const eventDate = new Date(event.eventDate);
    const [hours, minutes] = (event.eventTime || "16:30").split(":").map(Number);
    const eventDateTime = new Date(eventDate);
    eventDateTime.setHours(hours, minutes, 0, 0);
    
    const daysUntil = Math.ceil((eventDateTime - now) / (1000 * 60 * 60 * 24));
    const hoursUntil = Math.ceil((eventDateTime - now) / (1000 * 60 * 60));
    
    console.log(`\n   🎯 ${event.title}`);
    console.log(`      Schedule: ${event.schedule?.title || 'Unknown'} (Published: ${event.schedule?.isPublished})`);
    console.log(`      Date: ${formatDateOnly(eventDate)}`);
    console.log(`      Time: ${event.eventTime || "16:30"}`);
    console.log(`      Location: ${event.location || "TBA"}`);
    console.log(`      Days until: ${daysUntil} days`);
    console.log(`      Hours until: ${hoursUntil} hours`);
    console.log(`      Event DateTime (Kenyan): ${formatKenyanTime(eventDateTime)}`);
  }

  // ========== 3. CHECK EXISTING NOTIFICATIONS ==========
  console.log("\n\n🔔 3. CHECKING EXISTING SCHEDULED NOTIFICATIONS");
  console.log("-".repeat(80));
  
  const existingNotifications = await prisma.scheduledNotification.findMany({
    include: {
      event: {
        include: {
          schedule: true
        }
      }
    },
    orderBy: { notifyAt: 'asc' }
  });
  
  console.log(`Total Scheduled Notifications: ${existingNotifications.length}\n`);
  
  const unsentNotifications = existingNotifications.filter(n => !n.isSent);
  const sentNotifications = existingNotifications.filter(n => n.isSent);
  
  console.log(`📬 Unsent: ${unsentNotifications.length}`);
  console.log(`✅ Sent: ${sentNotifications.length}\n`);
  
  if (unsentNotifications.length > 0) {
    console.log("📬 UNSENT NOTIFICATIONS (should be sent in future):");
    for (const notif of unsentNotifications.slice(0, 30)) {
      const shouldBeSent = new Date(notif.notifyAt) <= now;
      console.log(`\n   📌 ${notif.title}`);
      console.log(`      Event: ${notif.event?.title || 'Unknown'}`);
      console.log(`      Notify At: ${formatKenyanTime(new Date(notif.notifyAt))}`);
      console.log(`      Priority: ${notif.priority}`);
      console.log(`      Should be sent now: ${shouldBeSent ? 'YES ⚠️' : 'No'}`);
      console.log(`      Time difference: ${Math.round((new Date(notif.notifyAt) - now) / (1000 * 60))} minutes from now`);
    }
  }

  // ========== 4. CHECK WHICH EVENTS ARE MISSING NOTIFICATIONS ==========
  console.log("\n\n⚠️ 4. EVENTS MISSING NOTIFICATIONS");
  console.log("-".repeat(80));
  
  const notificationTimings = [
    { daysBefore: 7, label: "1 week before", priority: "normal" },
    { daysBefore: 3, label: "3 days before", priority: "normal" },
    { daysBefore: 1, label: "1 day before", priority: "high" },
    { hoursBefore: 12, label: "12 hours before", priority: "high" },
    { hoursBefore: 6, label: "6 hours before", priority: "high" },
    { hoursBefore: 1, label: "1 hour before", priority: "urgent" },
   { minutesBefore: 30, label: "30 minutes before", priority: "urgent" }
  ];
  
  let eventsMissingNotifications = [];
  
  for (const event of upcomingEvents) {
    const existingNotifs = existingNotifications.filter(n => n.eventId === event.id);
    const expectedCount = notificationTimings.length;
    const missingCount = expectedCount - existingNotifs.length;
    
    if (missingCount > 0) {
      const existingLabels = existingNotifs.map(n => {
        if (n.title.includes("1 week")) return "1 week before";
        if (n.title.includes("3 days")) return "3 days before";
        if (n.title.includes("1 day")) return "1 day before";
        if (n.title.includes("12 hours")) return "12 hours before";
        if (n.title.includes("6 hours")) return "6 hours before";
        if (n.title.includes("1 hour")) return "1 hour before";
        if (n.title.includes("30 minutes")) return "30 minutes before";
        return "unknown";
      });
      
      const missingTimings = notificationTimings.filter(t => !existingLabels.includes(t.label));
      
      eventsMissingNotifications.push({
        event: event,
        existingCount: existingNotifs.length,
        missingCount: missingCount,
        missingTimings: missingTimings
      });
    }
  }
  
  console.log(`Events with missing notifications: ${eventsMissingNotifications.length}\n`);
  
  for (const item of eventsMissingNotifications.slice(0, 10)) {
    console.log(`\n   ⚠️ ${item.event.title}`);
    console.log(`      Has: ${item.existingCount}/${notificationTimings.length} notifications`);
    console.log(`      Missing: ${item.missingTimings.map(t => t.label).join(", ")}`);
  }

  // ========== 5. VERIFY DATE CALCULATIONS ==========
  console.log("\n\n🔢 5. VERIFYING DATE CALCULATIONS");
  console.log("-".repeat(80));
  
  for (const event of upcomingEvents.slice(0, 10)) {
    const eventDate = new Date(event.eventDate);
    const [hours, minutes] = (event.eventTime || "16:30").split(":").map(Number);
    const eventDateTime = new Date(eventDate);
    eventDateTime.setHours(hours, minutes, 0, 0);
    
    console.log(`\n   📅 ${event.title}`);
    console.log(`      Event Date: ${formatDateOnly(eventDate)}`);
    console.log(`      Event Time: ${event.eventTime || "16:30"}`);
    console.log(`      Event DateTime (Kenyan): ${formatKenyanTime(eventDateTime)}`);
    
    // Calculate when each notification should trigger
    for (const timing of notificationTimings) {
      let notifyAt = new Date(eventDateTime);
      
      if (timing.daysBefore !== undefined) {
        notifyAt.setDate(notifyAt.getDate() - timing.daysBefore);
      } else {
        notifyAt.setHours(notifyAt.getHours() - timing.hoursBefore);
      }
      
      const isPast = notifyAt <= now;
      const timeUntil = Math.round((notifyAt - now) / (1000 * 60));
      
      console.log(`      ${timing.label.padEnd(18)}: ${formatKenyanTime(notifyAt)} ${isPast ? '🔴 PAST' : `(in ${timeUntil} min)`}`);
    }
  }

  // ========== 6. CHECK FOR DUPLICATE NOTIFICATIONS ==========
  console.log("\n\n🔄 6. CHECKING FOR DUPLICATE NOTIFICATIONS");
  console.log("-".repeat(80));
  
  const notificationGroups = {};
  for (const notif of existingNotifications) {
    const key = `${notif.eventId}_${notif.title}`;
    if (!notificationGroups[key]) {
      notificationGroups[key] = [];
    }
    notificationGroups[key].push(notif);
  }
  
  let duplicatesFound = 0;
  for (const [key, group] of Object.entries(notificationGroups)) {
    if (group.length > 1) {
      duplicatesFound++;
      console.log(`\n   ⚠️ Duplicate found for: ${group[0].title}`);
      console.log(`      Count: ${group.length}`);
      for (const dup of group) {
        console.log(`      - ID: ${dup.id}, Created: ${formatKenyanTime(dup.createdAt)}`);
      }
    }
  }
  
  if (duplicatesFound === 0) {
    console.log("   ✅ No duplicate notifications found");
  }

  // ========== 7. CHECK NOTIFICATION SEND STATUS ==========
  console.log("\n\n📊 7. NOTIFICATION SEND STATUS");
  console.log("-".repeat(80));
  
  const notificationsThatShouldBeSent = unsentNotifications.filter(n => new Date(n.notifyAt) <= now);
  
  console.log(`Notifications that should have been sent but are marked unsent: ${notificationsThatShouldBeSent.length}`);
  
  if (notificationsThatShouldBeSent.length > 0) {
    console.log("\n   🔴 PROBLEM DETECTED: These notifications should have been sent:");
    for (const notif of notificationsThatShouldBeSent.slice(0, 10)) {
      const notifyAt = new Date(notif.notifyAt);
      const minutesLate = Math.round((now - notifyAt) / (1000 * 60));
      console.log(`\n   📌 ${notif.title}`);
      console.log(`      Should have sent: ${formatKenyanTime(notifyAt)}`);
      console.log(`      Currently: ${minutesLate} minutes late`);
      console.log(`      Event: ${notif.event?.title || 'Unknown'}`);
    }
  }

  // ========== 8. CHECK SEND EVENT REMINDERS FUNCTION LOGIC ==========
  console.log("\n\n⚙️ 8. SIMULATING sendEventReminders() LOGIC");
  console.log("-".repeat(80));
  
  // This simulates what sendEventReminders should do
  const notificationsToSend = existingNotifications.filter(n => {
    const notifyAt = new Date(n.notifyAt);
    return !n.isSent && notifyAt <= now;
  });
  
  console.log(`Notifications that would be sent by sendEventReminders(): ${notificationsToSend.length}`);
  
  if (notificationsToSend.length > 0) {
    console.log("\n   📬 Would send these notifications:");
    for (const notif of notificationsToSend.slice(0, 10)) {
      console.log(`\n   📌 ${notif.title}`);
      console.log(`      To: All users`);
      console.log(`      Notify At: ${formatKenyanTime(new Date(notif.notifyAt))}`);
      console.log(`      Message: ${notif.message.substring(0, 100)}...`);
    }
  }

  // ========== 9. GENERATE FIX SCRIPT ==========
  console.log("\n\n🔧 9. GENERATED FIX SUGGESTIONS");
  console.log("-".repeat(80));
  
  if (notificationsThatShouldBeSent.length > 0) {
    console.log("\n   🔧 FIX 1: Run this query to manually send stuck notifications");
    console.log("   ```sql");
    console.log(`   UPDATE scheduled_notifications 
   SET is_sent = true, sent_at = NOW() 
   WHERE id IN (${notificationsThatShouldBeSent.map(n => `'${n.id}'`).join(', ')});`);
    console.log("   ```");
  }
  
  if (eventsMissingNotifications.length > 0) {
    console.log("\n   🔧 FIX 2: Run this to regenerate missing notifications for events");
    console.log("   Run the following in your backend:");
    console.log("   ```javascript");
    console.log("   const { regenerateEventNotifications } = require('./services/cronJobs');");
    console.log(`   const eventIds = [${eventsMissingNotifications.slice(0, 5).map(e => `'${e.event.id}'`).join(', ')}];`);
    console.log("   for (const eventId of eventIds) {");
    console.log("       await regenerateEventNotifications(eventId);");
    console.log("   }");
    console.log("   ```");
  }

  // ========== 10. SUMMARY REPORT ==========
  console.log("\n\n📋 10. SUMMARY REPORT");
  console.log("=".repeat(80));
  console.log(`
  ✅ Total Published Schedules: ${schedules.length}
  ✅ Total Events: ${allEvents.length}
     - Upcoming: ${upcomingEvents.length}
     - Past: ${pastEvents.length}
  
  🔔 Scheduled Notifications:
     - Total: ${existingNotifications.length}
     - Sent: ${sentNotifications.length}
     - Unsent: ${unsentNotifications.length}
     - Should be sent but stuck: ${notificationsThatShouldBeSent.length}
  
  ⚠️ Issues Found:
     - Events missing notifications: ${eventsMissingNotifications.length}
     - Duplicate notifications: ${duplicatesFound}
  
  🟢 Recommendation:
     ${notificationsThatShouldBeSent.length > 0 ? '🔴 URGENT: ' + notificationsThatShouldBeSent.length + ' notifications are stuck!' : '✅ No stuck notifications'}
     ${eventsMissingNotifications.length > 0 ? '⚠️ ' + eventsMissingNotifications.length + ' events are missing notifications' : '✅ All events have complete notifications'}
  `);
  
  console.log("=".repeat(80));
  console.log(`🏁 Script completed at ${formatKenyanTime(getKenyanTime())}`);
  console.log("=".repeat(80) + "\n");
}

// Run the script
main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });