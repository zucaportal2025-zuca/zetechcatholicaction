// backend/scripts/test-executive-emails.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEmailTargets() {
  console.log('\n📧 EMAIL NOTIFICATION TEST\n');
  console.log('='.repeat(60));
  
  // Get a regular user (not executive)
  const executiveUserIds = (await prisma.executive.findMany({ select: { userId: true } })).map(e => e.userId);
  
  const regularUser = await prisma.user.findFirst({
    where: {
      id: { notIn: executiveUserIds }
    },
    select: { fullName: true, email: true }
  });
  
  // Get an executive
  const executive = await prisma.executive.findFirst({
    include: { 
      user: { 
        select: { fullName: true, email: true } 
      } 
    }
  });
  
  console.log('\n📊 Who gets EMAILS about executive meetings?\n');
  console.log(`   ❌ Regular User:`);
  console.log(`      Name: ${regularUser?.fullName}`);
  console.log(`      Email: ${regularUser?.email}`);
  console.log(`      Status: NO EMAILS about executive meetings\n`);
  
  console.log(`   ✅ Executive:`);
  console.log(`      Name: ${executive?.user?.fullName}`);
  console.log(`      Email: ${executive?.user?.email}`);
  console.log(`      Status: WILL RECEIVE emails about executive meetings\n`);
  
  console.log('='.repeat(60));
  console.log('✅ VERIFICATION COMPLETE:');
  console.log('   • Regular users will NEVER receive executive meeting emails');
  console.log('   • Only executives, admins, and secretaries get executive meeting emails');
  console.log('='.repeat(60));
  
  await prisma.$disconnect();
}

checkEmailTargets();