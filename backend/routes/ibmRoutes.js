const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const jwt = require("jsonwebtoken");
const webpush = require("web-push");

const IBM_API_KEY = process.env.IBM_API_KEY || "your-secret-key-here";
const { sendPersonalizedEmail } = require("../services/mailer");

// ============ VAPID SETUP FOR PUSH NOTIFICATIONS ============
webpush.setVapidDetails(
  'mailto:zucaportal2025@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// ============ HELPER: CREATE NOTIFICATION WITH PUSH + EMAIL ============
async function createNotification({ userId, type, title, message, data = {} }) {
  // 1. Save to database
  const notif = await prisma.notification.create({
    data: {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      userId,
      type,
      title,
      message,
      read: false,
      createdAt: new Date(),
      data: data
    }
  });

  // 2. Send Socket.IO (real-time in-app)
  try {
    const io = global.io || req?.app?.get("io");
    if (io) {
      io.to(userId).emit("new_notification", {
        ...notif,
        createdAt: notif.createdAt.toISOString()
      });
    }
  } catch (err) {
    // Socket not available, continue
  }

  // 3. Send PUSH NOTIFICATION
  try {
    const subscription = await prisma.pushSubscription.findUnique({
      where: { userId }
    });

    if (subscription) {
      const unreadCount = await prisma.notification.count({
        where: { userId, read: false }
      });

      const pushSubscription = JSON.parse(subscription.subscription);
      
      await webpush.sendNotification(
        pushSubscription,
        JSON.stringify({
          title,
          body: message,
          icon: '/android-chrome-192x192.png',
          badge: '/favicon.ico',
          badgeCount: unreadCount + 1,
          data: { type, ...data },
          timestamp: Date.now()
        }),
        { urgency: 'high' }
      );
      console.log(`📱 Push notification sent to user ${userId}`);
    } else {
      console.log(`⚠️ No push subscription for user ${userId}`);
    }
  } catch (err) {
    console.log(`⚠️ Push notification failed:`, err.message);
  }

  // 4. Send EMAIL (if enabled)
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { homeJumuia: true }
    });
    
    if (user?.email) {
      let shouldSendEmail = true;
      try {
        const { isEmailTypeEnabled } = require("../services/mailer");
        shouldSendEmail = await isEmailTypeEnabled(type);
      } catch (err) {
        console.log(`⚠️ Could not check email setting, defaulting to send`);
      }
      
      if (shouldSendEmail) {
        await sendPersonalizedEmail(
          { email: user.email, fullName: user.fullName },
          type,
          title,
          message,
          data
        );
        console.log(`✅ Email sent to ${user.email}`);
      }
    }
  } catch (err) {
    console.error(`❌ Email failed:`, err.message);
  }

  return notif;
}

// ============ AUTHENTICATION ============
function authenticateIBM(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  if (apiKey && apiKey === IBM_API_KEY) {
    return next();
  }
  res.status(401).json({
    resultCode: 1,
    message: "Authentication failed. Invalid API key.",
  });
}

function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// ============ HELPERS ============
function extractMembership(customerRef) {
  if (!customerRef) return null;
  const match = customerRef.match(/Z#\d+/);
  return match ? match[0] : customerRef;
}

function normalizePhone(phone) {
  if (!phone) return null;
  let cleaned = phone.replace(/[+\s-]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  }
  return cleaned;
}

router.post("/webhook", authenticateIBM, async (req, res) => {
  try {
    const { paymentType, amount, currency, transactionReference, transactionDate, additions } = req.body;

    const mpesaCode = additions?.externalRefNumber || transactionReference;
    const payerName = additions?.payerName || null;
    const payerPhone = additions?.payerMobileNumber || null;
    const customerRef = additions?.customerRef || null;

    if (!mpesaCode || !amount) {
      return res.status(400).json({
        resultCode: 1,
        resultDesc: "Missing required fields: mpesaCode or amount",
        erpRefId: null,
      });
    }

    const existing = await prisma.bankPayment.findUnique({
      where: { mpesaCode },
    });

    if (existing) {
      return res.status(200).json({
        resultCode: 0,
        resultDesc: "Payment already recorded",
        erpRefId: existing.id,
      });
    }

    let userId = null;
    let status = "UNCLAIMED";

    // 1. Try by customerRef (membership number)
    if (customerRef) {
      const membershipNumber = extractMembership(customerRef);
      if (membershipNumber) {
        const user = await prisma.user.findFirst({
          where: { membership_number: membershipNumber },
        });
        if (user) {
          userId = user.id;
          status = "AUTO_MATCHED";
        }
      }
    }

    // 2. If not found, try by phone
    if (!userId && payerPhone) {
      const normalizedPhone = normalizePhone(payerPhone);
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: payerPhone },
            { phone: normalizedPhone },
            { phone: '0' + normalizedPhone.substring(3) },
            { phone: '+' + normalizedPhone }
          ]
        },
      });
      if (user) {
        userId = user.id;
        status = "AUTO_MATCHED";
      }
    }

    const bankPayment = await prisma.bankPayment.create({
      data: {
        mpesaCode,
        amount,
        payerName,
        payerPhone,
        paymentDate: new Date(transactionDate || Date.now()),
        paymentType: paymentType || "MPESA",
        status,
        userId,
      },
    });

    if (userId && status === "AUTO_MATCHED") {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        const io = req.app.get("io");

        // Get treasurer and admin emails
        const [treasurerUsers, adminUsers] = await Promise.all([
          prisma.user.findMany({
            where: { specialRole: "treasurer" },
            select: { email: true, fullName: true }
          }),
          prisma.user.findMany({
            where: { role: "admin" },
            select: { email: true, fullName: true }
          })
        ]);

        const treasurerEmail = treasurerUsers.length > 0 ? treasurerUsers[0].email : 'treasurer@zuca.org';
        const adminEmail = adminUsers.length > 0 ? adminUsers[0].email : 'admin@zuca.org';
        const treasurerName = treasurerUsers.length > 0 ? treasurerUsers[0].fullName : 'Treasurer';
        const adminName = adminUsers.length > 0 ? adminUsers[0].fullName : 'Admin';

        // Build message with dynamic emails
        const message = `We have received KES ${amount.toLocaleString()} from you (Code: ${mpesaCode}). Please log in to your ZUCA Portal account, go to the Contributions page or Jumuia page, and paste this code to claim your payment to the specific contribution you have paid for. NOTE: The contribution card to which you paste the code will be the one the ZUCA system will update. If you have any issues, feel free to contact the ${treasurerName} at email: ${treasurerEmail} or ${adminName} at email: ${adminEmail}.`;

        // SAVE TO DATABASE
        await createNotification({
          userId: userId,
          type: "payment_received",
          title: " Payment Received - Claim Now!",
          message: message,
          data: { amount, code: mpesaCode }
        });

        // SEND EMAIL TO USER
        if (user.email) {
          (async () => {
            try {
              await sendPersonalizedEmail(
                { email: user.email, fullName: user.fullName },
                "payment_received",
                ` Payment Received - KES ${amount.toLocaleString()}`,
                `Dear ${user.fullName},

We have received KES ${amount.toLocaleString()} from you.

Payment Details:
- Amount: KES ${amount.toLocaleString()}
- M-PESA Code: ${mpesaCode}
- Date: ${new Date().toISOString().split('T')[0]}

How to claim your payment:
1. Log in to ZUCA Portal
2. Go to the Contributions page or Jumuia page
3. Find the specific contribution you paid for
4. Click on "Claim Bank Payment"
5. Paste this M-PESA code: ${mpesaCode}
6. Click "Claim"

IMPORTANT: The contribution card to which you paste the code will be the one the ZUCA system will update.

If you have any issues, please contact:
- ${treasurerName}: ${treasurerEmail}
- ${adminName}: ${adminEmail}

Thank you for your contribution!

Tumsifu Yesu Kristu! `,
                { amount, code: mpesaCode, treasurerEmail, adminEmail }
              );
              console.log(`✅ Webhook: Email sent to ${user.email}`);
            } catch (err) {
              console.error("Failed to send email:", err.message);
            }
          })();
        }

        // SOCKET.IO NOTIFICATIONS (in-app)
        if (io) {
          setTimeout(() => {
            try {
              io.to(userId).emit("new_notification", {
                type: "payment_received",
                title: " Payment Received - Claim Now!",
                message: message,
                data: { amount, code: mpesaCode },
                createdAt: new Date().toISOString(),
              });
              console.log(`✅ Webhook: User notification sent to ${userId}`);

              // Admins
              const notifyAdmins = async () => {
                const admins = await prisma.user.findMany({
                  where: { role: "admin" },
                  select: { id: true, email: true, fullName: true },
                });
                for (const admin of admins) {
                  io.to(admin.id).emit("new_notification", {
                    type: "payment_received_admin",
                    title: " New Payment Received",
                    message: `${user.fullName} paid KES ${amount.toLocaleString()} (Code: ${mpesaCode})`,
                    data: { amount, code: mpesaCode, userId, payerName: user.fullName },
                    createdAt: new Date().toISOString(),
                  });

                  // Admin email
                  if (admin.email) {
                    (async () => {
                      try {
                        await sendPersonalizedEmail(
                          { email: admin.email, fullName: admin.fullName },
                          "payment_received_admin",
                          ` New Payment: ${user.fullName} - KES ${amount.toLocaleString()}`,
                          `Dear ${admin.fullName},

${user.fullName} has made a payment.

Payment Details:
- Amount: KES ${amount.toLocaleString()}
- M-PESA Code: ${mpesaCode}
- Payer: ${user.fullName}

The user will need to claim this payment by pasting the code on the Contributions page.

Tumsifu Yesu Kristu! `,
                          { amount, code: mpesaCode, user: user.fullName }
                        );
                      } catch (err) {
                        console.error("Failed to send admin email:", err.message);
                      }
                    })();
                  }
                }
                console.log(`✅ Webhook: Admin notifications sent (${admins.length} admins)`);
              };
              notifyAdmins();

              // Treasurers
              const notifyTreasurers = async () => {
                const treasurers = await prisma.user.findMany({
                  where: { specialRole: "treasurer" },
                  select: { id: true, email: true, fullName: true },
                });
                for (const treasurer of treasurers) {
                  io.to(treasurer.id).emit("new_notification", {
                    type: "payment_received_admin",
                    title: " New Payment Received",
                    message: `${user.fullName} paid KES ${amount.toLocaleString()} (Code: ${mpesaCode})`,
                    data: { amount, code: mpesaCode, userId, payerName: user.fullName },
                    createdAt: new Date().toISOString(),
                  });

                  // Treasurer email
                  if (treasurer.email) {
                    (async () => {
                      try {
                        await sendPersonalizedEmail(
                          { email: treasurer.email, fullName: treasurer.fullName },
                          "payment_received_admin",
                          ` New Payment: ${user.fullName} - KES ${amount.toLocaleString()}`,
                          `Dear ${treasurer.fullName},

${user.fullName} has made a payment.

Payment Details:
- Amount: KES ${amount.toLocaleString()}
- M-PESA Code: ${mpesaCode}
- Payer: ${user.fullName}

The user will need to claim this payment by pasting the code on the Contributions page.

`,
                          { amount, code: mpesaCode, user: user.fullName }
                        );
                      } catch (err) {
                        console.error("Failed to send treasurer email:", err.message);
                      }
                    })();
                  }
                }
                console.log(`✅ Webhook: Treasurer notifications sent (${treasurers.length} treasurers)`);
              };
              notifyTreasurers();

            } catch (err) {
              console.error("Webhook notification error:", err);
            }
          }, 100);
        }
      }
    }

    res.status(201).json({
      resultCode: 0,
      resultDesc: "Payment received successfully",
      erpRefId: bankPayment.id,
    });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({
      resultCode: 1,
      resultDesc: "Internal server error",
      erpRefId: null,
    });
  }
});
// ============ VALIDATE ENDPOINT ============
router.post("/validate", authenticateIBM, async (req, res) => {
  try {
    const { customerRef } = req.body;

    if (!customerRef) {
      return res.status(400).json({
        resultCode: 1,
        message: "customerRef is required",
        customerName: "",
        customerRef: "",
      });
    }

    const membershipNumber = extractMembership(customerRef);

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { membership_number: membershipNumber },
          { membership_number: customerRef },
          { id: customerRef }
        ],
      },
    });

    if (user) {
      res.json({
        resultCode: 0,
        message: "Customer found",
        customerName: user.fullName,
        customerRef: customerRef,
      });
    } else {
      res.status(404).json({
        resultCode: 1,
        message: "Customer not found",
        customerName: "",
        customerRef: "",
      });
    }
  } catch (err) {
    console.error("Validate error:", err);
    res.status(500).json({
      resultCode: 1,
      message: "Internal server error",
      customerName: "",
      customerRef: "",
    });
  }
});

// ============ CHECK CODE ENDPOINT ============
router.get("/check-code/:code", authenticateUser, async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.user.userId;

    const bankPayment = await prisma.bankPayment.findFirst({
      where: { mpesaCode: code },
    });

    if (!bankPayment) {
      return res.status(404).json({
        success: false,
        message: "No payment found with this code or code already claimed",
      });
    }

    if (bankPayment.status === "CLAIMED") {
      return res.status(400).json({
        success: false,
        message: "This code has already been used. Please check your contributions.",
      });
    }

    if (bankPayment.userId && bankPayment.userId !== userId) {
      return res.json({
        exists: false,
        message: "This payment is linked to a different user",
      });
    }

    res.json({
      exists: true,
      amount: bankPayment.amount,
      payerName: bankPayment.payerName,
      status: bankPayment.status,
      paymentId: bankPayment.id,
    });
  } catch (err) {
    console.error("Check code error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============ CLAIM ENDPOINT ============
router.post("/claim", authenticateUser, async (req, res) => {
  try {
    const { code, contributionTypeId } = req.body;
    const userId = req.user.userId;

    if (!code || !contributionTypeId) {
      return res.status(400).json({
        success: false,
        message: "Code and contributionTypeId are required",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const bankPayment = await tx.bankPayment.findFirst({
        where: {
          mpesaCode: code,
          status: { in: ["UNCLAIMED", "AUTO_MATCHED"] },
        },
      });

      if (!bankPayment) {
        throw new Error("No payment found with this code or code already claimed");
      }

      if (bankPayment.userId && bankPayment.userId !== userId) {
        throw new Error("This payment is linked to a different user");
      }

      const campaign = await tx.contributionType.findUnique({
        where: { id: contributionTypeId },
      });

      if (!campaign) {
        throw new Error("Campaign not found");
      }

      let pledge = await tx.pledge.findFirst({
        where: {
          userId,
          contributionTypeId,
        },
      });

      if (!pledge) {
        pledge = await tx.pledge.create({
          data: {
            userId,
            contributionTypeId,
            amountPaid: 0,
            pendingAmount: 0,
            status: "PENDING",
          },
        });
      }

      const newAmountPaid = pledge.amountPaid + bankPayment.amount;
      let newStatus = "APPROVED";
      if (newAmountPaid >= campaign.amountRequired) {
        newStatus = "COMPLETED";
      }

      const updatedPledge = await tx.pledge.update({
        where: { id: pledge.id },
        data: {
          amountPaid: newAmountPaid,
          pendingAmount: 0,
          status: newStatus,
        },
      });

      await tx.contributionType.update({
        where: { id: contributionTypeId },
        data: {
          collectedAmount: {
            increment: bankPayment.amount,
          },
        },
      });

      const existingPayment = await tx.payment.findFirst({
        where: { mpesaReceiptNumber: bankPayment.mpesaCode },
      });

      if (!existingPayment) {
        await tx.payment.create({
          data: {
            amount: bankPayment.amount,
            phoneNumber: bankPayment.payerPhone || "",
            mpesaReceiptNumber: bankPayment.mpesaCode,
            status: "SUCCESS",
            userId,
            contributionTypeId,
            pledgeId: pledge.id,
            completedAt: new Date(),
          },
        });
      }

      await tx.bankPayment.update({
        where: { id: bankPayment.id },
        data: {
          status: "CLAIMED",
          userId,
          contributionTypeId,
        },
      });

      return { updatedPledge, campaignTitle: campaign.title, amount: bankPayment.amount, user: await tx.user.findUnique({ where: { id: userId } }) };
    });

    // Get the user who claimed
    const user = await prisma.user.findUnique({ where: { id: userId } });

    // Send notifications via createNotification (with push + email)
    await createNotification({
      userId: userId,
      type: "claim_success",
      title: " Payment Claimed!",
      message: `KES ${result.amount} added to ${result.campaignTitle}`,
      data: { amount: result.amount, campaign: result.campaignTitle }
    });

    // Notify admins
    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: { id: true, fullName: true, email: true }
    });

    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        type: "payment_claimed_admin",
        title: " Payment Claimed",
        message: `${user?.fullName || 'A user'} claimed KES ${result.amount} for "${result.campaignTitle}"`,
        data: { amount: result.amount, campaign: result.campaignTitle, userId: userId }
      });
    }

    // Notify treasurers
    const treasurers = await prisma.user.findMany({
      where: { specialRole: "treasurer" },
      select: { id: true, fullName: true, email: true }
    });

    for (const treasurer of treasurers) {
      await createNotification({
        userId: treasurer.id,
        type: "payment_claimed_treasurer",
        title: " Payment Claimed",
        message: `${user?.fullName || 'A user'} claimed KES ${result.amount} for "${result.campaignTitle}"`,
        data: { amount: result.amount, campaign: result.campaignTitle, userId: userId }
      });
    }

    console.log(`✅ All notifications sent for claim ${result.amount}`);

    res.json({
      success: true,
      message: `KES ${result.amount} added to ${result.campaignTitle}`,
      pledge: result.updatedPledge,
    });
  } catch (err) {
    console.error("Claim error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ==================== BANK PAYMENTS ADMIN ROUTES ====================

// Helper: Check if user is admin, treasurer, or secretary
async function isAdminOrTreasurerOrSecretary(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, specialRole: true }
  });
  
  if (!user) return false;
  
  const isAdmin = user.role === "admin" || user.specialRole === "admin";
  const isTreasurer = user.specialRole === "treasurer";
  const isSecretary = user.specialRole === "secretary";
  
  return isAdmin || isTreasurer || isSecretary;
}

// ============ 1. GET ALL BANK PAYMENTS ============
router.get("/payments", authenticateUser, async (req, res) => {
  try {
    const hasAccess = await isAdminOrTreasurerOrSecretary(req.user.userId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { 
      page = 1, 
      limit = 50, 
      status = 'all',
      search = '',
      fromDate = '',
      toDate = ''
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    let where = {};

    if (status !== 'all') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { mpesaCode: { contains: search, mode: 'insensitive' } },
        { payerName: { contains: search, mode: 'insensitive' } },
        { payerPhone: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (fromDate) {
      where.paymentDate = { ...where.paymentDate, gte: new Date(fromDate) };
    }
    if (toDate) {
      where.paymentDate = { ...where.paymentDate, lte: new Date(toDate) };
    }

    const total = await prisma.bankPayment.count({ where });

    const payments = await prisma.bankPayment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            profileImage: true,
            membership_number: true,
            role: true,
            specialRole: true,
            homeJumuia: {
              select: { name: true }
            }
          }
        },
        contributionType: {
          select: {
            id: true,
            title: true,
            amountRequired: true,
            collectedAmount: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take
    });

    // Get stats
    const stats = await prisma.$transaction([
      prisma.bankPayment.count(),
      prisma.bankPayment.count({ where: { status: 'CLAIMED' } }),
      prisma.bankPayment.count({ where: { status: 'UNCLAIMED' } }),
      prisma.bankPayment.count({ where: { status: 'AUTO_MATCHED' } }),
      prisma.bankPayment.aggregate({
        _sum: { amount: true }
      })
    ]);

    res.json({
      success: true,
      payments,
      stats: {
        total: stats[0],
        claimed: stats[1],
        unclaimed: stats[2],
        autoMatched: stats[3],
        totalAmount: stats[4]._sum.amount || 0
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (err) {
    console.error("Get bank payments error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============ 2. GET SINGLE BANK PAYMENT DETAILS ============
router.get("/payments/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    const hasAccess = await isAdminOrTreasurerOrSecretary(req.user.userId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const payment = await prisma.bankPayment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            profileImage: true,
            membership_number: true,
            role: true,
            specialRole: true,
            homeJumuia: {
              select: { name: true }
            },
            leadingJumuia: {
              select: { name: true }
            }
          }
        },
        contributionType: {
          select: {
            id: true,
            title: true,
            description: true,
            amountRequired: true,
            collectedAmount: true,
            createdAt: true,
            jumuia: {
              select: { name: true }
            }
          }
        }
      }
    });

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    // Build timeline
    const timeline = [];

    timeline.push({
      event: "I&M Payment Sent",
      timestamp: payment.paymentDate,
      icon: ""
    });

    timeline.push({
      event: "System Received",
      timestamp: payment.createdAt,
      icon: ""
    });

    if (payment.status === "AUTO_MATCHED" || payment.status === "CLAIMED") {
      const notification = await prisma.notification.findFirst({
        where: {
          userId: payment.userId,
          type: "payment_received",
          createdAt: { gte: payment.createdAt }
        },
        orderBy: { createdAt: 'asc' }
      });
      if (notification) {
        timeline.push({
          event: "User Notified",
          timestamp: notification.createdAt,
          icon: ""
        });
      }
    }

    if (payment.status === "CLAIMED") {
      const claimNotification = await prisma.notification.findFirst({
        where: {
          userId: payment.userId,
          type: "claim_success",
          createdAt: { gte: payment.createdAt }
        },
        orderBy: { createdAt: 'asc' }
      });
      if (claimNotification) {
        timeline.push({
          event: "Payment Claimed",
          timestamp: claimNotification.createdAt,
          icon: ""
        });
      }
    }

    if (payment.contributionTypeId) {
      const pledge = await prisma.pledge.findFirst({
        where: {
          userId: payment.userId,
          contributionTypeId: payment.contributionTypeId
        },
        select: { updatedAt: true }
      });
      if (pledge) {
        timeline.push({
          event: "Pledge Updated",
          timestamp: pledge.updatedAt,
          icon: ""
        });
      }
    }

    res.json({
      success: true,
      payment,
      timeline
    });

  } catch (err) {
    console.error("Get payment details error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============ 3. ASSIGN PAYMENT TO USER ============
router.put("/payments/:id/assign", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, contributionTypeId } = req.body;

    const hasAccess = await isAdminOrTreasurerOrSecretary(req.user.userId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Not authorized" });
    }

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const payment = await prisma.bankPayment.findUnique({
      where: { id }
    });

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    if (payment.status === "CLAIMED") {
      return res.status(400).json({ error: "Payment already claimed" });
    }

    const updated = await prisma.bankPayment.update({
      where: { id },
      data: {
        userId,
        status: "AUTO_MATCHED",
        contributionTypeId: contributionTypeId || null
      }
    });

    await createNotification({
      userId: userId,
      type: "payment_assigned",
      title: " Payment Assigned to You",
      message: `A payment of KES ${payment.amount} has been assigned to you. Please claim it on the Contributions page.`,
      data: { amount: payment.amount, code: payment.mpesaCode }
    });

    res.json({
      success: true,
      message: `Payment assigned to ${targetUser.fullName}`,
      payment: updated
    });

  } catch (err) {
    console.error("Assign payment error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============ 4. MARK PAYMENT AS CLAIMED ============
router.put("/payments/:id/mark-claimed", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { contributionTypeId } = req.body;

    const hasAccess = await isAdminOrTreasurerOrSecretary(req.user.userId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const payment = await prisma.bankPayment.findUnique({
      where: { id }
    });

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    if (!payment.userId) {
      return res.status(400).json({ error: "Payment has no user assigned" });
    }

    if (payment.status === "CLAIMED") {
      return res.status(400).json({ error: "Payment already claimed" });
    }

    let pledge = null;
    let campaignTitle = null;

    if (contributionTypeId) {
      pledge = await prisma.pledge.findFirst({
        where: {
          userId: payment.userId,
          contributionTypeId
        }
      });

      if (!pledge) {
        pledge = await prisma.pledge.create({
          data: {
            userId: payment.userId,
            contributionTypeId,
            amountPaid: 0,
            pendingAmount: 0,
            status: "PENDING"
          }
        });
      }

      const newAmountPaid = pledge.amountPaid + payment.amount;
      const campaign = await prisma.contributionType.findUnique({
        where: { id: contributionTypeId }
      });
      campaignTitle = campaign?.title;

      let newStatus = "APPROVED";
      if (campaign && newAmountPaid >= campaign.amountRequired) {
        newStatus = "COMPLETED";
      }

      await prisma.pledge.update({
        where: { id: pledge.id },
        data: {
          amountPaid: newAmountPaid,
          status: newStatus
        }
      });

      await prisma.contributionType.update({
        where: { id: contributionTypeId },
        data: {
          collectedAmount: { increment: payment.amount }
        }
      });

      await prisma.payment.create({
        data: {
          amount: payment.amount,
          phoneNumber: payment.payerPhone || "",
          mpesaReceiptNumber: payment.mpesaCode,
          status: "SUCCESS",
          userId: payment.userId,
          contributionTypeId,
          pledgeId: pledge.id,
          completedAt: new Date()
        }
      });
    }

    const updated = await prisma.bankPayment.update({
      where: { id },
      data: {
        status: "CLAIMED",
        contributionTypeId: contributionTypeId || payment.contributionTypeId
      }
    });

    await createNotification({
      userId: payment.userId,
      type: "payment_marked_claimed",
      title: " Payment Marked as Claimed",
      message: `Your payment of KES ${payment.amount} has been marked as claimed${campaignTitle ? ` for "${campaignTitle}"` : ''}.`,
      data: { amount: payment.amount }
    });

    res.json({
      success: true,
      message: `Payment marked as claimed${campaignTitle ? ` for "${campaignTitle}"` : ''}`,
      payment: updated
    });

  } catch (err) {
    console.error("Mark claimed error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============ 5. EXPORT PAYMENTS (CSV) ============
router.get("/payments/export/csv", authenticateUser, async (req, res) => {
  try {
    const hasAccess = await isAdminOrTreasurerOrSecretary(req.user.userId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { status = 'all', fromDate = '', toDate = '' } = req.query;

    let where = {};
    if (status !== 'all') where.status = status;
    if (fromDate) where.paymentDate = { ...where.paymentDate, gte: new Date(fromDate) };
    if (toDate) where.paymentDate = { ...where.paymentDate, lte: new Date(toDate) };

    const payments = await prisma.bankPayment.findMany({
      where,
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            membership_number: true
          }
        },
        contributionType: {
          select: { title: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    let csv = 'M-PESA Code,Amount,Payer Name,Payer Phone,Payment Date,Status,Claimed By,Claimed To,Created At\n';
    
    for (const p of payments) {
      csv += `${p.mpesaCode},${p.amount},${p.payerName || ''},${p.payerPhone || ''},${p.paymentDate.toISOString().split('T')[0]},${p.status},${p.user?.fullName || ''},${p.contributionType?.title || ''},${p.createdAt.toISOString()}\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=bank-payments-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);

  } catch (err) {
    console.error("Export error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============ 6. GET PAYMENT STATS ============
router.get("/payments/stats", authenticateUser, async (req, res) => {
  try {
    const hasAccess = await isAdminOrTreasurerOrSecretary(req.user.userId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Simplified stats queries
    const total = await prisma.bankPayment.count();
    const claimed = await prisma.bankPayment.count({ where: { status: 'CLAIMED' } });
    const unclaimed = await prisma.bankPayment.count({ where: { status: 'UNCLAIMED' } });
    const autoMatched = await prisma.bankPayment.count({ where: { status: 'AUTO_MATCHED' } });
    
    const totalAmountAgg = await prisma.bankPayment.aggregate({
      _sum: { amount: true }
    });
    
    const claimedAmountAgg = await prisma.bankPayment.aggregate({
      _sum: { amount: true },
      where: { status: 'CLAIMED' }
    });

    res.json({
      success: true,
      stats: {
        total: total,
        claimed: claimed,
        unclaimed: unclaimed,
        autoMatched: autoMatched,
        totalAmount: totalAmountAgg._sum.amount || 0,
        claimedAmount: claimedAmountAgg._sum.amount || 0
      }
    });

  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;