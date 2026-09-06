// services/cronJobs.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Helper function to check if email type is enabled
async function isEmailTypeEnabled(type) {
  try {
    const { isEmailEnabled } = require("./mailer");
    return await isEmailEnabled(type);
  } catch (err) {
    console.log(`⚠️ Could not check email setting for ${type}, defaulting to send:`, err.message);
    return true;
  }
}

// Helper function to get birthday message
function getBirthdayMessage(fullName) {
  return `Today we celebrate one of our own. 🎉\n\nLet us all join in wishing ${fullName} a happy, blessed, and cheerful birthday.\n\nHappy Birthday, ${fullName}! 🎂✨\n\nFrom all of us at ZUCA ❤️`;
}

async function sendEventReminders() {
  console.log("🕐 Running semester schedule event reminders check...");
  
  const isEnabled = await isEmailTypeEnabled('event_reminder');
  if (!isEnabled) {
    console.log("📧 Event reminders are disabled, skipping");
    return;
  }
  
  const now = new Date();
  
  const pendingNotifications = await prisma.scheduledNotification.findMany({
    where: {
      notifyAt: { lte: now },
      isSent: false
    },
    include: {
      event: {
        include: {
          schedule: true
        }
      }
    }
  });
  
  if (pendingNotifications.length === 0) {
    console.log("📭 No pending event reminders");
    return;
  }
  
  console.log(`📢 Found ${pendingNotifications.length} pending notifications`);
  
  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true, fullName: true }
  });
  
  for (const notification of pendingNotifications) {
    console.log(`📧 Processing: ${notification.title}`);
    
    for (const user of allUsers) {
      try {
        if (global.createAndSendNotification) {
          await global.createAndSendNotification({
            userId: user.id,
            type: "event_reminder",
            title: notification.title,
            message: notification.message,
            data: { 
              eventId: notification.eventId,
              scheduleId: notification.scheduleId,
              priority: notification.priority
            }
          });
        } else {
          console.log(`⚠️ createAndSendNotification not available, only creating DB notification`);
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: "event_reminder",
              title: notification.title,
              message: notification.message,
              data: { 
                eventId: notification.eventId,
                scheduleId: notification.scheduleId,
                priority: notification.priority
              },
              read: false,
              createdAt: new Date()
            }
          });
          
          if (global.io) {
            global.io.to(user.id).emit("new_notification", {
              id: `${Date.now()}`,
              userId: user.id,
              type: "event_reminder",
              title: notification.title,
              message: notification.message,
              read: false,
              createdAt: new Date().toISOString()
            });
          }
        }
      } catch (err) {
        console.error(`Failed to send to user ${user.id}:`, err.message);
      }
    }
    
    await prisma.scheduledNotification.update({
      where: { id: notification.id },
      data: { isSent: true, sentAt: new Date() }
    });
    
    console.log(`✅ Sent "${notification.title}" to ${allUsers.length} users`);
  }
}

async function sendCampaignReminders() {
  console.log("💰 Running campaign deadline check...");
  
  const isEnabled = await isEmailTypeEnabled('campaign_reminder');
  if (!isEnabled) {
    console.log("📧 Campaign reminders are disabled, skipping");
    return;
  }
  
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const campaigns = await prisma.contributionType.findMany({
    where: {
      deadline: {
        lte: threeDaysFromNow,
        gte: today
      }
    },
    include: {
      pledges: {
        where: { pendingAmount: { gt: 0 } },
        include: { user: true }
      }
    }
  });
  
  for (const campaign of campaigns) {
    const daysLeft = Math.ceil((campaign.deadline - new Date()) / (1000 * 60 * 60 * 24));
    
    for (const pledge of campaign.pledges) {
      if (global.createAndSendNotification) {
        await global.createAndSendNotification({
          userId: pledge.user.id,
          type: "campaign_reminder",
          title: `⏰ Campaign Deadline: ${daysLeft} days left`,
          message: `The "${campaign.title}" campaign ends in ${daysLeft} days. Your pending amount is KES ${pledge.pendingAmount.toLocaleString()}.`,
          data: { campaignId: campaign.id, daysLeft }
        });
      }
    }
    console.log(`✅ Reminders sent for campaign: ${campaign.title}`);
  }
}

async function checkNoAnnouncements() {
  console.log("📢 Checking for recent announcements...");
  
  const isEnabled = await isEmailTypeEnabled('announcement_new');
  if (!isEnabled) {
    console.log("📧 Announcement suggestions are disabled, skipping");
    return;
  }
  
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  
  const recentAnnouncement = await prisma.announcement.findFirst({
    where: { createdAt: { gte: twoWeeksAgo } }
  });
  
  if (!recentAnnouncement) {
    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: { id: true, email: true, fullName: true }
    });
    
    for (const admin of admins) {
      if (global.createAndSendNotification) {
        await global.createAndSendNotification({
          userId: admin.id,
          type: "suggestion",
          title: "📢 Announcement Suggestion",
          message: "No announcements have been posted in 2 weeks. Would you like me to draft one?",
          data: { action: "draft_announcement" }
        });
      }
    }
    console.log(`✅ Alert sent to ${admins.length} admins`);
  }
}

// =============================================
// BIRTHDAY ADVERT PROCESSING - UPDATED
// =============================================

async function processBirthdayAdverts() {
  console.log("🎂 Running birthday advert check...");

  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  const settings = await prisma.birthdaySetting.findFirst();

  if (!settings || !settings.autoCreateAdvert) {
    console.log("Birthday adverts are disabled, skipping");
    return;
  }

  const users = await prisma.user.findMany({
    where: {
      birthdayOptIn: true,
      birthMonth: month,
      birthDay: day,
      birthdayPhoto: { not: null }
    }
  });

  if (users.length === 0) {
    console.log("No birthdays today");
    return;
  }

  console.log(`Found ${users.length} birthday(s) today`);

  for (const user of users) {
    try {
      console.log(`Processing birthday for: ${user.fullName}`);

      const imageUrl = user.birthdayPhoto;
      
      // ✅ Get the formatted birthday message
      const birthdayDescription = getBirthdayMessage(user.fullName);

      let advert = null;
      if (settings.autoCreateAdvert && imageUrl) {
        advert = await prisma.advertisement.create({
          data: {
            title: `Happy Birthday, ${user.fullName}! 🎂`,
            description: birthdayDescription,
            image: imageUrl,
            startDate: new Date(),
            endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            active: true,
            buttonText: "Add Your's here",
            link: "/profile",
            birthdayUser: {
              connect: { id: user.id }
            }
          }
        });

        await prisma.user.update({
          where: { id: user.id },
          data: { birthdayAdvertId: advert.id }
        });

        console.log(`Advertisement created for ${user.fullName}`);
      }

      if (settings.sendPushToAll && advert) {
        const allUsers = await prisma.user.findMany({
          select: { id: true }
        });

        let sentCount = 0;
        for (const targetUser of allUsers) {
          try {
            if (global.createAndSendNotification) {
              await global.createAndSendNotification({
                userId: targetUser.id,
                type: "birthday",
                title: `Today is ${user.fullName.split(" ")[0]}'s Birthday! 🎉`,
                message: `Celebrate with ${user.fullName}! Check the ZUCA dashboard to wish them a happy birthday! 🎂✨`,
                data: {
                  type: "birthday",
                  birthdayUserId: user.id,
                  advertId: advert.id
                }
              });
              sentCount++;
            }
          } catch (err) {
            // Silent fail for individual notifications
          }
        }
        console.log(`Push notifications sent to ${sentCount} users`);
      }

      if (settings.sendToWhatsApp && imageUrl) {
        try {
          const whatsappBot = require("./whatsapp.bot");
          const activeGroups = await prisma.whatsAppGroup.findMany({
            where: { isActive: true }
          });

          if (activeGroups.length > 0) {
            // ✅ Use the same formatted message for WhatsApp
            const message = (settings.whatsAppMessage || birthdayDescription).replace(/{name}/g, user.fullName);

            for (const group of activeGroups) {
              try {
                if (whatsappBot.sock && whatsappBot.isConnected) {
                  await whatsappBot.sock.sendMessage(group.groupId, {
                    image: { url: imageUrl },
                    caption: message
                  });
                  console.log(`WhatsApp sent to ${group.groupName || group.groupId}`);
                } else {
                  console.log(`⚠️ Bot not connected, message not sent to ${group.groupId}`);
                }

                // ✅ SET BIRTHDAY MODE IN DATABASE
                await prisma.whatsAppGroup.update({
                  where: { groupId: group.groupId },
                  data: {
                    birthdayMode: true,
                    birthdayModeExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
                  }
                });

                console.log(`🔒 Birthday mode ON for ${group.groupName || group.groupId} (24 hours)`);
              } catch (err) {
                console.error(`Failed for ${group.groupId}:`, err.message);
              }
            }
          }
        } catch (err) {
          console.error("WhatsApp send failed:", err.message);
        }
      }

      console.log(`✅ Birthday completed for ${user.fullName}`);

    } catch (error) {
      console.error(`❌ Birthday failed for ${user.fullName}:`, error.message);
    }
  }
}

module.exports = {
  sendEventReminders,
  sendCampaignReminders,
  checkNoAnnouncements,
  processBirthdayAdverts
};