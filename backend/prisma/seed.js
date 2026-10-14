const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Check if admin already exists
  const existingAdmin = await prisma.user.findFirst({
    where: { email: 'admin@zuca.com' }
  });

  if (!existingAdmin) {
    // Create REAL admin user
    const hashedPassword = await bcrypt.hash('Admin@zuca', 10);
    
    const admin = await prisma.user.create({
      data: {
        fullName: 'ZUCA ADMIN',
        email: 'admin@zuca.com',
        password: hashedPassword,
        phone: '+254700000000',
        membership_number: 'Z#001',
        role: 'admin',  // ← THIS makes them admin from the start!
        specialRole: null,
        profileImage: null,
        lastActive: new Date()
      }
    });
    
    console.log('✅ Admin user created:', admin.email);
    console.log('   Password: Admin@zuca');
  } else {
    console.log('⚠️ Admin already exists, skipping...');
  }

  console.log('🌱 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });