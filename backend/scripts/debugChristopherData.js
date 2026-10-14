// backend/scripts/debugChristopherData.js
// Run: node scripts/debugChristopherData.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugData() {
  try {
    // Find Christopher
    const user = await prisma.user.findFirst({
      where: { fullName: { contains: 'CHRISTOPHER MAINA', mode: 'insensitive' } },
      select: { id: true, fullName: true, membership_number: true }
    });

    if (!user) {
      console.log('❌ Christopher not found');
      return;
    }

    console.log('👤 User:', user.fullName);
    console.log('🆔 ID:', user.id);
    console.log('📛 Membership:', user.membership_number);

    // Get his attendance entries with sheet data
    const entries = await prisma.attendanceEntry.findMany({
      where: { userId: user.id },
      include: {
        sheet: {
          select: {
            id: true,
            title: true,
            eventDate: true,
            eventTime: true,
            location: true
          }
        }
      },
      orderBy: { signTime: 'desc' }
    });

    console.log(`\n📊 Found ${entries.length} attendance entries`);
    console.log('─────────────────────────────────────────────');

    entries.forEach((entry, i) => {
      console.log(`\n${i + 1}. Entry ID: ${entry.id}`);
      console.log(`   Sign Time: ${entry.signTime}`);
      console.log(`   Sheet ID: ${entry.sheetId}`);
      console.log(`   Sheet Title: ${entry.sheet?.title || '❌ NO TITLE'}`);
      console.log(`   Sheet Date: ${entry.sheet?.eventDate || '❌ NO DATE'}`);
      console.log(`   Sheet Time: ${entry.sheet?.eventTime || '❌ NO TIME'}`);
      console.log('   ─────────────────────────────');
    });

    // Check if the sheets exist
    const sheetIds = entries.map(e => e.sheetId).filter(id => id);
    if (sheetIds.length > 0) {
      console.log(`\n📋 Checking ${sheetIds.length} sheets:`);
      const sheets = await prisma.attendanceSheet.findMany({
        where: { id: { in: sheetIds } },
        select: { id: true, title: true, eventDate: true, eventTime: true }
      });

      sheets.forEach(sheet => {
        console.log(`   ✅ Sheet: ${sheet.title} | ${sheet.eventDate}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugData();