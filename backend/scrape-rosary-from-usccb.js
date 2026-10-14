const axios = require('axios');
const cheerio = require('cheerio');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeRosaryFromUSCCB() {
  console.log('\n📿 SCRAPING ROSARY MYSTERIES FROM USCCB (OFFICIAL)\n');
  console.log('='.repeat(60));
  
  // First, check if we already have rosary mysteries
  const existingCount = await prisma.prayer.count({
    where: { category: 'rosary' }
  });
  
  if (existingCount >= 20) {
    console.log(`✅ Already have ${existingCount} rosary mysteries. Skipping scrape.`);
    await prisma.$disconnect();
    return;
  }
  
  // USCCB official page
  const url = 'https://www.usccb.org/how-to-pray-the-rosary';
  
  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    
    // Find all mystery sections
    let totalSaved = 0;
    
    // Look for the mystery lists in the page
    // They appear in ordered lists
    $('ol, ul').each(async (i, list) => {
      const listText = $(list).text().toLowerCase();
      
      let mysteryType = null;
      if (listText.includes('joyful')) mysteryType = 'joyful';
      else if (listText.includes('sorrowful')) mysteryType = 'sorrowful';
      else if (listText.includes('glorious')) mysteryType = 'glorious';
      else if (listText.includes('luminous')) mysteryType = 'luminous';
      
      if (mysteryType) {
        console.log(`\n📖 Found ${mysteryType} mysteries`);
        
        const items = $(list).find('li');
        let order = 1;
        
        for (const item of items) {
          const title = $(item).text().trim().replace(/[\[\]]/g, '');
          if (title && title.length > 3 && title.length < 100) {
            console.log(`  ${order}. ${title}`);
            
            // Check if exists
            const existing = await prisma.prayer.findFirst({
              where: {
                category: 'rosary',
                subcategory: mysteryType,
                order: order
              }
            });
            
            if (!existing) {
              await prisma.prayer.create({
                data: {
                  title: title,
                  category: 'rosary',
                  subcategory: mysteryType,
                  prayer: `Meditation on the ${title}`,
                  language: 'en',
                  version: 'traditional',
                  order: order,
                  isActive: true,
                  source: url
                }
              });
              totalSaved++;
              console.log(`    ✅ Saved`);
            }
            order++;
          }
        }
      }
    });
    
    console.log('\n' + '='.repeat(60));
    console.log(`\n✨ TOTAL ROSARY MYSTERIES SAVED: ${totalSaved}`);
    
  } catch (err) {
    console.error('Error scraping USCCB:', err.message);
    console.log('\n⚠️ Scraping failed. Using fallback data...\n');
    await addFallbackMysteries();
  }
  
  await prisma.$disconnect();
}

// Fallback function to add mysteries directly
async function addFallbackMysteries() {
  console.log('📿 ADDING ROSARY MYSTERIES (FALLBACK)\n');
  
  const allMysteries = {
    joyful: [
      { order: 1, title: "The Annunciation", description: "The Angel Gabriel appears to Mary and announces that she will conceive Jesus." },
      { order: 2, title: "The Visitation", description: "Mary visits her cousin Elizabeth, who is filled with the Holy Spirit." },
      { order: 3, title: "The Nativity", description: "Jesus is born in Bethlehem." },
      { order: 4, title: "The Presentation", description: "Mary and Joseph present Jesus in the Temple." },
      { order: 5, title: "The Finding in the Temple", description: "After three days, Mary and Joseph find Jesus teaching in the Temple." }
    ],
    sorrowful: [
      { order: 1, title: "The Agony in the Garden", description: "Jesus prays in the Garden of Gethsemane, sweating blood." },
      { order: 2, title: "The Scourging at the Pillar", description: "Jesus is brutally whipped by Roman soldiers." },
      { order: 3, title: "The Crowning with Thorns", description: "Soldiers mock Jesus, placing a crown of thorns on His head." },
      { order: 4, title: "The Carrying of the Cross", description: "Jesus carries His heavy cross to Calvary." },
      { order: 5, title: "The Crucifixion", description: "Jesus is nailed to the cross and dies for our sins." }
    ],
    glorious: [
      { order: 1, title: "The Resurrection", description: "On the third day, Jesus rises from the dead." },
      { order: 2, title: "The Ascension", description: "Jesus ascends into heaven." },
      { order: 3, title: "The Descent of the Holy Spirit", description: "The Holy Spirit descends upon Mary and the apostles at Pentecost." },
      { order: 4, title: "The Assumption of Mary", description: "Mary is assumed body and soul into heavenly glory." },
      { order: 5, title: "The Coronation of Mary", description: "Mary is crowned Queen of Heaven and Earth." }
    ],
    luminous: [
      { order: 1, title: "The Baptism of Jesus", description: "John baptizes Jesus in the Jordan River. The Spirit descends and the Father speaks." },
      { order: 2, title: "The Wedding at Cana", description: "Jesus performs His first miracle, turning water into wine at Mary's request." },
      { order: 3, title: "The Proclamation of the Kingdom", description: "Jesus preaches the Good News and calls for repentance." },
      { order: 4, title: "The Transfiguration", description: "Jesus reveals His divine glory to Peter, James, and John." },
      { order: 5, title: "The Institution of the Eucharist", description: "Jesus establishes the Eucharist at the Last Supper." }
    ]
  };
  
  let totalAdded = 0;
  
  for (const [type, mysteries] of Object.entries(allMysteries)) {
    for (const mystery of mysteries) {
      const existing = await prisma.prayer.findFirst({
        where: {
          category: 'rosary',
          subcategory: type,
          order: mystery.order
        }
      });
      
      if (!existing) {
        await prisma.prayer.create({
          data: {
            title: mystery.title,
            category: 'rosary',
            subcategory: type,
            prayer: mystery.description,
            language: 'en',
            version: 'traditional',
            order: mystery.order,
            isActive: true,
            source: 'fallback'
          }
        });
        console.log(`  ✅ Added: ${type} - ${mystery.title}`);
        totalAdded++;
      } else {
        console.log(`  ⏭️ Already exists: ${type} - ${mystery.title}`);
      }
    }
  }
  
  console.log(`\n✨ Total fallback mysteries added: ${totalAdded}`);
}

// Run the scraper
scrapeRosaryFromUSCCB().catch(console.error);