// ============================================
// CHECK SCHEDULES AND EVENTS
// Run: node check-schedules.js
// ============================================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSchedules() {
  console.log('========================================');
  console.log('    SCHEDULES & EVENTS REPORT');
  console.log('========================================');
  console.log('');

  try {
    // 1. Get all schedules
    const schedules = await prisma.schedule.findMany({
      include: {
        events: {
          orderBy: { eventDate: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📋 TOTAL SCHEDULES: ${schedules.length}`);
    console.log('');

    schedules.forEach((schedule, idx) => {
      console.log(`📅 SCHEDULE ${idx + 1}: ${schedule.title}`);
      console.log(`   ID: ${schedule.id}`);
      console.log(`   Created: ${schedule.createdAt}`);
      console.log(`   Published: ${schedule.isPublished ? '✅ Yes' : '❌ No'}`);
      console.log(`   Active: ${schedule.isActive ? '✅ Yes' : '❌ No'}`);
      console.log(`   Start Date: ${schedule.startDate || 'Not set'}`);
      console.log(`   End Date: ${schedule.endDate || 'Not set'}`);
      console.log(`   Events: ${schedule.events.length}`);
      console.log('');

      if (schedule.events.length > 0) {
        console.log('   📌 EVENTS:');
        schedule.events.forEach((event, eIdx) => {
          console.log(`      ${eIdx + 1}. ${event.title}`);
          console.log(`         ID: ${event.id}`);
          console.log(`         Date: ${event.eventDate}`);
          console.log(`         Time: ${event.eventTime || 'TBD'}`);
          console.log(`         Location: ${event.location || 'TBD'}`);
          console.log(`         Group: ${event.groupName || 'All'}`);
          console.log(`         Reminder Days: ${event.reminderDays}`);
          console.log('');
        });
      }
      console.log('----------------------------------------');
    });

    // 2. Get ALL events (including orphans) - FIXED
    const allEvents = await prisma.scheduleEvent.findMany({
      include: {
        schedule: {
          select: { id: true, title: true, isPublished: true }
        },
        notifications: {
          select: { id: true, title: true, notifyAt: true, isSent: true }
        }
      },
      orderBy: { eventDate: 'asc' }
    });

    // Filter orphans manually
    const orphanEvents = allEvents.filter(event => event.schedule === null);
    
    if (orphanEvents.length > 0) {
      console.log('⚠️ ORPHAN EVENTS (No schedule):');
      orphanEvents.forEach(event => {
        console.log(`   ${event.title} - ${event.eventDate}`);
      });
    } else {
      console.log('✅ No orphan events found');
    }

    // 3. Upcoming events (next 30 days)
    console.log('');
    console.log('📅 UPCOMING EVENTS (Next 30 Days):');
    const now = new Date();
    const thirtyDaysLater = new Date(now);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const upcoming = allEvents.filter(event => {
      const eventDate = new Date(event.eventDate);
      return eventDate >= now && eventDate <= thirtyDaysLater;
    });

    if (upcoming.length === 0) {
      console.log('  No upcoming events in next 30 days');
    } else {
      upcoming.forEach((event, idx) => {
        const pendingCount = event.notifications.filter(n => !n.isSent).length;
        console.log(`  ${idx + 1}. ${event.title}`);
        console.log(`     Date: ${event.eventDate}`);
        console.log(`     Time: ${event.eventTime || 'TBD'}`);
        console.log(`     Location: ${event.location || 'TBD'}`);
        console.log(`     Schedule: ${event.schedule?.title || 'No schedule'}`);
        console.log(`     Published: ${event.schedule?.isPublished ? '✅' : '❌'}`);
        console.log(`     Pending Notifications: ${pendingCount}`);
        console.log('');
      });
    }

    // 4. Events by group
    console.log('📊 EVENTS BY GROUP:');
    const groupMap = {};
    allEvents.forEach(event => {
      const group = event.groupName || 'Unassigned';
      if (!groupMap[group]) {
        groupMap[group] = { count: 0, events: [] };
      }
      groupMap[group].count++;
      groupMap[group].events.push(event.eventDate);
    });

    console.log('   Group Name | Count | Dates');
    console.log('   -----------|-------|------');
    Object.keys(groupMap).forEach(group => {
      const dates = groupMap[group].events.map(d => new Date(d).toLocaleDateString()).join(', ');
      console.log(`   ${group.padEnd(10)} | ${String(groupMap[group].count).padStart(5)} | ${dates}`);
    });

    console.log('');
    console.log('📅 COMPLETE EVENT DATE SUMMARY:');
    console.log('   Date       | Event Name');
    console.log('   -----------|----------------------------------------');
    allEvents.forEach(event => {
      const date = new Date(event.eventDate);
      console.log(`   ${date.toLocaleDateString().padEnd(10)} | ${event.title.substring(0, 40)}`);
    });

    // 5. Notification summary by event
    console.log('');
    console.log('🔔 NOTIFICATION SUMMARY BY EVENT:');
    console.log('   Event Name | Total | Sent | Pending');
    console.log('   -----------|-------|------|---------');
    allEvents.forEach(event => {
      const total = event.notifications.length;
      const sent = event.notifications.filter(n => n.isSent).length;
      const pending = total - sent;
      if (total > 0) {
        console.log(`   ${event.title.substring(0, 20).padEnd(10)} | ${String(total).padStart(5)} | ${String(sent).padStart(4)} | ${String(pending).padStart(7)}`);
      }
    });

    console.log('');
    console.log('========================================');
    console.log('✅ CHECK COMPLETE');
    console.log('========================================');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchedules();