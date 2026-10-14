// backend/scripts/check-status.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('\n=== CHECKING NOTIFICATION STATUS ===\n');
  
  const notif = await prisma.scheduledNotification.findFirst({
    where: { title: { contains: '5:30 AM TEST' } }
  });
  
  if (notif) {
    console.log('Notification found:');
    console.log('  Title: ' + notif.title);
    console.log('  isSent: ' + notif.isSent);
    console.log('  sentAt: ' + (notif.sentAt || 'Not sent yet'));
    console.log('  notifyAt: ' + notif.notifyAt);
    console.log('  Current time: ' + new Date());
    
    if (notif.isSent) {
      console.log('\n  ✅ NOTIFICATION WAS SENT!');
      console.log('  Check your email at: ' + notif.sentAt);
    } else if (notif.notifyAt < new Date()) {
      console.log('\n  🔴 NOTIFICATION WAS DUE BUT NOT SENT!');
      console.log('  Cron job may not have run or there was an error');
    } else {
      console.log('\n  ⏳ Notification pending, will send at: ' + notif.notifyAt);
    }
  } else {
    console.log('No test notification found');
  }
  
  await prisma.$disconnect();
}

check();