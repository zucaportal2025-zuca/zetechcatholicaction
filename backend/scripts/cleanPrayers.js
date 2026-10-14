// scripts/cleanPrayers.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanPrayers() {
  const allPrayers = await prisma.prayer.findMany();
  
  for (const prayer of allPrayers) {
    let cleanText = prayer.prayer;
    
    // Remove HTML tags
    cleanText = cleanText.replace(/<[^>]*>/g, '');
    
    // Remove URLs
    cleanText = cleanText.replace(/https?:\/\/[^\s]+/g, '');
    
    // Remove "Share this Page", "More Prayers", etc.
    cleanText = cleanText.replace(/Share this Page.*$/s, '');
    cleanText = cleanText.replace(/More Prayers.*$/s, '');
    cleanText = cleanText.replace(/Daily Reflections.*$/s, '');
    
    // Remove extra whitespace
    cleanText = cleanText.replace(/\s+/g, ' ').trim();
    
    // Only update if prayer has meaningful content
    if (cleanText.length > 20 && cleanText.length < 5000) {
      await prisma.prayer.update({
        where: { id: prayer.id },
        data: { prayer: cleanText }
      });
      console.log(`Cleaned: ${prayer.title}`);
    } else {
      // Delete prayers that are too short or too long after cleaning
      await prisma.prayer.delete({ where: { id: prayer.id } });
      console.log(`Deleted: ${prayer.title} (invalid content)`);
    }
  }
  
  console.log('Done cleaning prayers!');
}

cleanPrayers();