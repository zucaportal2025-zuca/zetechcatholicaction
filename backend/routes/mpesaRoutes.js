const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const mpesaService = require("../services/mpesaService");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const jwt = require("jsonwebtoken");
const { sendPersonalizedEmail } = require("../services/mailer");

// Helper to get base URL
function getBaseUrl(req) {
  const protocol = req.protocol;
  const host = req.get("host");
  return `${protocol}://${host}`;
}

// Helper function to create and send notification
async function createNotification({ userId, type, title, message, data = {} }) {
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
  return notif;
}

// ==================== ROUTES ====================

// 1. Generate payment link for a campaign
router.post("/campaigns/:id/generate-link", async (req, res) => {
  try {
    const { id } = req.params;
    
    const campaign = await prisma.contributionType.findUnique({ where: { id } });
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    
    let slug = campaign.paymentSlug;
    if (!slug) {
      slug = `${campaign.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.random().toString(36).substring(2, 8)}`;
      await prisma.contributionType.update({
        where: { id },
        data: { paymentSlug: slug }
      });
    }
    
    // Only return the slug, let frontend construct the full URL
    res.json({ success: true, slug });
  } catch (err) {
    console.error("Error generating payment link:", err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Initiate STK Push payment
router.post("/stk-push", async (req, res) => {
  try {
    const { campaignId, amount, phoneNumber, userId, email } = req.body;
    
    if (!campaignId || !amount || !phoneNumber) {
      return res.status(400).json({ error: "Missing required fields: campaignId, amount, phoneNumber" });
    }
    
    const campaign = await prisma.contributionType.findUnique({
      where: { id: campaignId }
    });
    
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    
    // Find or create user by phone number
    let user = null;
    
    if (userId) {
      user = await prisma.user.findUnique({
        where: { id: userId }
      });
    }
    
    if (!user && phoneNumber) {
      user = await prisma.user.findFirst({
        where: { phone: phoneNumber }
      });
    }
    
    if (!user) {
      const tempEmail = email || `guest_${Date.now()}@temp.zuca.org`;
      const tempPassword = await bcrypt.hash(Math.random().toString(36), 10);
      
      user = await prisma.user.create({
        data: {
          fullName: `Guest ${phoneNumber.slice(-4)}`,
          email: tempEmail,
          password: tempPassword,
          phone: phoneNumber,
          role: "member",
          emailVerified: false
        }
      });
      console.log(`Created temporary user for guest payment: ${user.id}`);
    }
    
    // ========== REMOVED ALL PLEDGE CODE ==========
    // Create payment record directly - NO pledge!
 const payment = await prisma.payment.create({
  data: {
    amount: amount,
    phoneNumber: phoneNumber,
    status: "PENDING",
    userId: user.id,
    contributionTypeId: campaignId  // Direct link to campaign
  }
});
    
    // Initiate STK Push
    const callbackUrl = process.env.MPESA_CALLBACK_URL 
        ? `${process.env.MPESA_CALLBACK_URL}/api/mpesa/callback`
        : `${getBaseUrl(req)}/api/mpesa/callback`;

    console.log("📡 Callback URL:", callbackUrl);
    
    // Determine campaign type
    const campaignType = campaign.jumuiaId ? 'Jumuia' : 'ZUCA';
    let shortTitle = campaign.title;

    if (shortTitle.length > 25) {
        shortTitle = shortTitle.substring(0, 22) + '...';
    }

    const accountReference = `${campaignType}: ${shortTitle}`;
    const transactionDesc = `Payment to ${campaignType} - ${shortTitle}`;
    
    const result = await mpesaService.stkPush(
      phoneNumber,
      amount,
      accountReference,
      transactionDesc,
      callbackUrl
    );

    console.log("📢 STK Push Result:", JSON.stringify(result, null, 2));

    // ALWAYS save the checkoutRequestID if we have one
    if (result.checkoutRequestID) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { checkoutRequestID: result.checkoutRequestID }
      });
    }

    // Even if result.success is false, the STK push might still be processing
    // Keep the payment as PENDING, don't mark as FAILED immediately
    if (result.success) {
      res.json({
        success: true,
        message: "STK Push sent. Check your phone for the M-PESA prompt.",
        checkoutRequestID: result.checkoutRequestID,
        paymentId: payment.id
      });
    } else {
      // Don't mark as FAILED - the user might still receive the prompt
      console.log("⚠️ STK Push response was not successful, but keeping as PENDING");
      console.log("Error details:", result.error);
      
      // Keep payment as PENDING (don't update status to FAILED)
      res.json({
        success: false,
        message: "Payment is being processed. Please check your phone for the M-PESA prompt.",
        error: result.error,
        paymentId: payment.id,
        checkoutRequestID: result.checkoutRequestID
      });
    }
  } catch (err) {
    console.error("STK Push error:", err);
    res.status(500).json({ error: err.message });
  }
});// 3. M-PESA Callback URL (webhook)
router.post("/callback", async (req, res) => {
  try {
    console.log("M-PESA Callback received:", JSON.stringify(req.body, null, 2));
    
    const { Body } = req.body;
    if (!Body) {
      return res.status(200).json({ ResultCode: 0, ResultDesc: "No body" });
    }
    
    const { stkCallback } = Body;
    const { ResultCode, ResultDesc, CheckoutRequestID, CallbackMetadata } = stkCallback;
    
    // Find payment - NO pledge, include user and contributionType directly
    const payment = await prisma.payment.findFirst({
      where: { checkoutRequestID: CheckoutRequestID },
      include: {
        user: true,
        contributionType: {
          include: {
            jumuia: true
          }
        }
      }
    });
    
    if (!payment) {
      console.log("Payment not found for CheckoutRequestID:", CheckoutRequestID);
      return res.status(200).json({ ResultCode: 0, ResultDesc: "OK" });
    }

    console.log("=== JUMUIA PAYMENT DEBUG ===");
console.log("Campaign ID:", payment.contributionTypeId);
console.log("Campaign has jumuiaId?", payment.contributionType?.jumuiaId);
console.log("Campaign Jumuia:", payment.contributionType?.jumuia?.name);
console.log("User Jumuia:", payment.user?.jumuiaId);
    
    // DECLARE THESE ONCE HERE (outside the if block)
    const campaign = payment.contributionType;
    const payer = payment.user;
    
    if (ResultCode === 0) {
      let mpesaReceiptNumber = "";
      let amount = payment.amount;
      
      if (CallbackMetadata && CallbackMetadata.Item) {
        for (const item of CallbackMetadata.Item) {
          if (item.Name === "MpesaReceiptNumber") {
            mpesaReceiptNumber = item.Value;
          }
          if (item.Name === "Amount") {
            amount = item.Value;
          }
        }
      }
      
      // Update payment status to SUCCESS
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCESS",
          mpesaReceiptNumber: mpesaReceiptNumber,
          resultCode: ResultCode,
          resultDesc: ResultDesc,
          completedAt: new Date()
        }
      });

    // Find the user's pledge for this campaign
let userPledge = await prisma.pledge.findFirst({
  where: {
    userId: payer.id,
    contributionTypeId: campaign.id
  }
});

if (userPledge) {
  // Update existing pledge - JUST LIKE MANUAL ADD!
  const newAmountPaid = (userPledge.amountPaid || 0) + amount;
  const newPendingAmount = Math.max(0, (userPledge.pendingAmount || 0) - amount);
  let newStatus = userPledge.status;
  
  if (newPendingAmount === 0 && newAmountPaid > 0) {
    newStatus = "APPROVED";
  }
  if (newAmountPaid >= campaign.amountRequired) {
    newStatus = "COMPLETED";
  }
  
  await prisma.pledge.update({
    where: { id: userPledge.id },
    data: {
      amountPaid: newAmountPaid,
      pendingAmount: newPendingAmount,
      status: newStatus
    }
  });
  
  console.log(`✅ Updated pledge: amountPaid=${newAmountPaid}, pendingAmount=${newPendingAmount}, status=${newStatus}`);
} else {
  // No pledge exists - create one with the payment as amountPaid
  await prisma.pledge.create({
    data: {
      userId: payer.id,
      contributionTypeId: campaign.id,
      amountPaid: amount,
      pendingAmount: 0,
      status: "APPROVED"
    }
  });
  console.log(`✅ Created new pledge with amountPaid=${amount}`);
}

// Also update campaign collected amount
await prisma.contributionType.update({
  where: { id: campaign.id },
  data: {
    collectedAmount: {
      increment: amount
    }
  }
});
      
      // ========== REMOVED ALL PLEDGE CODE ==========
      const isJumuiaCampaign = campaign.jumuiaId !== null;
      const jumuiaName = campaign.jumuia?.name || "Global";
      const jumuiaId = campaign.jumuiaId;
      
    // Send receipt email with ALL details
// Send receipt email with ALL details
if (payer.email) {
  (async () => {
    try {
      await sendPersonalizedEmail(
        { email: payer.email, fullName: payer.fullName, phone: payer.phone },
        "payment_receipt",
        ` Payment Receipt for ${campaign.title}`,
        `Dear ${payer.fullName},\n\nThank you for your payment...`,
        { 
          amount: amount, 
          receiptNumber: mpesaReceiptNumber, 
          campaignTitle: campaign.title,
          jumuiaName: jumuiaName !== "Global" ? jumuiaName : null,
          payerName: payer.fullName,
          payerPhone: payer.phone
        }
      );
    } catch (emailErr) {
      console.error("Failed to send receipt email:", emailErr.message);
    }
  })();
}
      
           // Create notification for user
      await createNotification({
        userId: payer.id,
        type: "payment_success",
        title: "Payment Successful!",
        message: `Your payment of KES ${amount.toLocaleString()} for "${campaign.title}"${jumuiaName !== "Global" ? ` (${jumuiaName} Jumuia)` : ''} has been received. Receipt: ${mpesaReceiptNumber}`,
        data: { amount, receiptNumber: mpesaReceiptNumber, campaignTitle: campaign.title, jumuiaName }
      });
      
      // Notify admins (with email)
      const admins = await prisma.user.findMany({
        where: { role: "admin" },
        select: { id: true, fullName: true, email: true }
      });
      
      for (const admin of admins) {
        await createNotification({
          userId: admin.id,
          type: "payment_received",
          title: " New Payment Received",
          message: `${payer.fullName} paid KES ${amount.toLocaleString()} for "${campaign.title}" (${jumuiaName})`,
          data: { userId: payer.id, amount, campaignTitle: campaign.title, jumuiaName, receiptNumber: mpesaReceiptNumber }
        });
        
        // Send email to admin
        if (admin.email) {
          (async () => {
            try {
              await sendPersonalizedEmail(
                { email: admin.email, fullName: admin.fullName },
                "payment_received",
                `💰 New Payment: ${campaign.title}`,
                `Dear ${admin.fullName},\n\n${payer.fullName} has made a payment of KES ${amount.toLocaleString()} for "${campaign.title}"${jumuiaName !== "Global" ? ` (${jumuiaName} Jumuia)` : ''}.\n\nReceipt: ${mpesaReceiptNumber}\nDate: ${new Date().toLocaleString()}\n\nTumsifu Yesu Kristu! 🙏`,
                { amount, campaignTitle: campaign.title, payerName: payer.fullName, receiptNumber: mpesaReceiptNumber, jumuiaName }
              );
            } catch (err) {
              console.error("Failed to send admin email:", err.message);
            }
          })();
        }
      }
      
      // Notify treasurers (with email)
      const treasurers = await prisma.user.findMany({
        where: { specialRole: "treasurer" },
        select: { id: true, fullName: true, email: true }
      });
      
      for (const treasurer of treasurers) {
        await createNotification({
          userId: treasurer.id,
          type: "payment_received",
          title: " New Payment Received",
          message: `${payer.fullName} paid KES ${amount.toLocaleString()} for "${campaign.title}" (${jumuiaName})`,
          data: { userId: payer.id, amount, campaignTitle: campaign.title, jumuiaName, receiptNumber: mpesaReceiptNumber }
        });
        
        // Send email to treasurer
        if (treasurer.email) {
          (async () => {
            try {
              await sendPersonalizedEmail(
                { email: treasurer.email, fullName: treasurer.fullName },
                "payment_received",
                `💰 New Payment: ${campaign.title}`,
                `Dear ${treasurer.fullName},\n\n${payer.fullName} has made a payment of KES ${amount.toLocaleString()} for "${campaign.title}"${jumuiaName !== "Global" ? ` (${jumuiaName} Jumuia)` : ''}.\n\nReceipt: ${mpesaReceiptNumber}\nDate: ${new Date().toLocaleString()}\n\nTumsifu Yesu Kristu! 🙏`,
                { amount, campaignTitle: campaign.title, payerName: payer.fullName, receiptNumber: mpesaReceiptNumber, jumuiaName }
              );
            } catch (err) {
              console.error("Failed to send treasurer email:", err.message);
            }
          })();
        }
      }
      
      // Notify Jumuia Leaders (only for this specific Jumuia, with email)
      if (isJumuiaCampaign && jumuiaId) {
        const jumuiaLeaders = await prisma.user.findMany({
          where: { 
            specialRole: "jumuia_leader",
            assignedJumuiaId: jumuiaId
          },
          select: { id: true, fullName: true, email: true }
        });
        
        for (const leader of jumuiaLeaders) {
          // Create notification
          await createNotification({
            userId: leader.id,
            type: "jumuia_payment",
            title: ` ${jumuiaName} - New Payment`,
            message: `${payer.fullName} paid KES ${amount.toLocaleString()} for "${campaign.title}"`,
            data: { userId: payer.id, amount, campaignTitle: campaign.title, jumuiaId, jumuiaName, receiptNumber: mpesaReceiptNumber }
          });
          
          // Send email to Jumuia leader
          if (leader.email) {
            (async () => {
              try {
                await sendPersonalizedEmail(
                  { email: leader.email, fullName: leader.fullName },
                  "jumuia_payment",
                  `🏠 ${jumuiaName} - New Contribution`,
                  `Dear ${leader.fullName},\n\n${payer.fullName} has made a payment of KES ${amount.toLocaleString()} for "${campaign.title}" in your Jumuia.\n\nReceipt: ${mpesaReceiptNumber}\nDate: ${new Date().toLocaleString()}\n\nTumsifu Yesu Kristu! 🙏`,
                  { amount, campaignTitle: campaign.title, payerName: payer.fullName, receiptNumber: mpesaReceiptNumber, jumuiaName }
                );
              } catch (err) {
                console.error(`Failed to send email to Jumuia leader ${leader.email}:`, err.message);
              }
            })();
          }
        }
      }
      
      // Socket.io events
      const io = req.app.get("io");
      if (io) {
        io.to(payer.id).emit("payment_updated", {
          amountJustPaid: amount,
          receiptNumber: mpesaReceiptNumber
        });
        
        io.emit("admin_payment_received", {
          userName: payer.fullName,
          amount: amount,
          campaign: campaign.title,
          jumuiaName: jumuiaName,
          receiptNumber: mpesaReceiptNumber,
          timestamp: new Date().toISOString()
        });
        
        if (isJumuiaCampaign && jumuiaId) {
          io.to(`jumuia-${jumuiaId}`).emit("jumuia_payment_received", {
            userName: payer.fullName,
            amount: amount,
            campaign: campaign.title,
            receiptNumber: mpesaReceiptNumber
          });
        }
      }
      
      console.log(`✅ Payment processed: ${mpesaReceiptNumber} for ${payer.fullName} (${jumuiaName})`);
      
    } else {
      // Payment failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          resultCode: ResultCode,
          resultDesc: ResultDesc
        }
      });
      
      await createNotification({
        userId: payment.userId,
        type: "payment_failed",
        title: " Payment Failed",
        message: `Your payment of KES ${payment.amount.toLocaleString()} for "${payment.contributionType.title}" failed. Reason: ${ResultDesc}`,
        data: { amount: payment.amount }
      });
      
      console.log(`❌ Payment failed: ${ResultDesc}`);
    }
    
    res.status(200).json({ ResultCode: 0, ResultDesc: "OK" });
  } catch (err) {
    console.error("Callback error:", err);
    res.status(200).json({ ResultCode: 0, ResultDesc: "OK" });
  }
});

// Get campaign by slug (no auth needed)
router.get("/campaign-by-slug/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const campaign = await prisma.contributionType.findFirst({
      where: { paymentSlug: slug },
      include: { jumuia: true }
    });
    
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Get campaign by ID (for direct payment from user page)
router.get("/campaign-by-id/:campaignId", async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const campaign = await prisma.contributionType.findUnique({
      where: { id: campaignId },
       include: { jumuia: true } 
    });
    
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    
    res.json(campaign);
  } catch (err) {
    console.error("Error fetching campaign by ID:", err);
    res.status(500).json({ error: err.message });
  }
});
// 4. Query payment status
router.get("/payment/:paymentId/status", async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId }
    });
    
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }
    
    console.log("📊 Status check - Payment:", {
      id: payment.id,
      status: payment.status,
      checkoutRequestID: payment.checkoutRequestID,
      amount: payment.amount
    });
    
    // Only query M-PESA if still pending and we have a checkoutRequestID
    if (payment.status === "PENDING" && payment.checkoutRequestID) {
      try {
        console.log("🔍 Querying M-PESA status for:", payment.checkoutRequestID);
        const result = await mpesaService.queryStatus(payment.checkoutRequestID);
        console.log("📡 M-PESA query result:", JSON.stringify(result, null, 2));
        
        // ResultCode 0 = Success
        if (result.ResultCode == 0) {
          console.log("✅ Payment successful!");
          await prisma.payment.update({
            where: { id: payment.id },
            data: { 
              status: "SUCCESS",
              completedAt: new Date()
            }
          });
          payment.status = "SUCCESS";
        } 
      // ResultCode 1037 or 4999 = Pending (still processing)
else if (result.ResultCode === "1037" || result.ResultCode === "4999" || result.ResultCode == 1037) {
  console.log("⏳ Payment still pending - waiting for PIN...");
  // Keep as PENDING - don't change
}
        // Any other ResultCode = Failed
        else {
          console.log("❌ Payment failed with code:", result.ResultCode);
          await prisma.payment.update({
            where: { id: payment.id },
            data: { 
              status: "FAILED", 
              resultDesc: result.ResultDesc || "Payment failed"
            }
          });
          payment.status = "FAILED";
        }
      } catch (err) {
        console.error("❌ Status query error:", err.message);
        console.error("Full error:", err);
        // Don't change status on error - keep as PENDING
      }
    } else {
      console.log("📊 Not querying M-PESA. Status:", payment.status, "Has checkoutID:", !!payment.checkoutRequestID);
    }
    
    // Return payment status to frontend
    res.json({
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        mpesaReceiptNumber: payment.mpesaReceiptNumber,
        resultDesc: payment.resultDesc,
        createdAt: payment.createdAt,
        completedAt: payment.completedAt
      }
    });
  } catch (err) {
    console.error("❌ Status check error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get payment page by campaign ID (no slug needed)
router.get("/pay/campaign/:campaignId", async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const campaign = await prisma.contributionType.findUnique({
      where: { id: campaignId }
    });
    
    if (!campaign) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Campaign Not Found - ZUCA</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: red; }
          </style>
        </head>
        <body>
          <h1 class="error">❌ Campaign Not Found</h1>
          <p>This campaign does not exist or has been removed.</p>
          <p>Please contact your Jumuia leader or administrator for assistance.</p>
        </body>
        </html>
      `);
    }
    
    // Get or create slug for this campaign (for future sharing)
    let slug = campaign.paymentSlug;
    if (!slug) {
      slug = `${campaign.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.random().toString(36).substring(2, 8)}`;
      await prisma.contributionType.update({
        where: { id: campaignId },
        data: { paymentSlug: slug }
      });
    }
    
    // Get user info from token if available
    let user = null;
    let preFilledPhone = "";
    let preFilledAmount = campaign.amountRequired;
    
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (user) preFilledPhone = user.phone;
      } catch (e) {}
    }
    
    const tokenQuery = req.query.token;
    if (tokenQuery && !user) {
      try {
        const decoded = jwt.verify(tokenQuery, process.env.JWT_SECRET);
        user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (user) preFilledPhone = user.phone;
      } catch (e) {}
    }
    
    const isLoggedIn = !!user;
    const userIdFromServer = user ? user.id : null;
    
    // Send the payment page HTML (same as your existing /pay/:slug route)
    let html = '<!DOCTYPE html>\n';
    html += '<html>\n';
    html += '<head>\n';
    html += '<title>Pay: ' + campaign.title + ' - ZUCA</title>\n';
    html += '<meta name="viewport" content="width=device-width, initial-scale=1">\n';
    html += '<style>\n';
    html += '* { margin: 0; padding: 0; box-sizing: border-box; }\n';
    html += 'body {\n';
    html += '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;\n';
    html += '  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n';
    html += '  min-height: 100vh;\n';
    html += '  display: flex;\n';
    html += '  justify-content: center;\n';
    html += '  align-items: center;\n';
    html += '  padding: 20px;\n';
    html += '}\n';
    html += '.container {\n';
    html += '  max-width: 500px;\n';
    html += '  width: 100%;\n';
    html += '  background: white;\n';
    html += '  border-radius: 20px;\n';
    html += '  box-shadow: 0 20px 60px rgba(0,0,0,0.3);\n';
    html += '  overflow: hidden;\n';
    html += '}\n';
    html += '.header {\n';
    html += '  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n';
    html += '  color: white;\n';
    html += '  padding: 30px;\n';
    html += '  text-align: center;\n';
    html += '}\n';
    html += '.header h1 { font-size: 28px; margin-bottom: 10px; }\n';
    html += '.header p { opacity: 0.9; }\n';
    html += '.content { padding: 30px; }\n';
    html += '.campaign-info {\n';
    html += '  background: #f7f7f7;\n';
    html += '  padding: 20px;\n';
    html += '  border-radius: 12px;\n';
    html += '  margin-bottom: 25px;\n';
    html += '}\n';
    html += '.campaign-title { font-size: 20px; font-weight: bold; margin-bottom: 10px; color: #333; }\n';
    html += '.campaign-desc { color: #666; margin-bottom: 15px; line-height: 1.5; }\n';
    html += '.required-amount { font-size: 24px; font-weight: bold; color: #667eea; }\n';
    html += '.form-group { margin-bottom: 20px; }\n';
    html += 'label { display: block; margin-bottom: 8px; font-weight: 500; color: #333; }\n';
    html += 'input {\n';
    html += '  width: 100%;\n';
    html += '  padding: 12px 15px;\n';
    html += '  border: 2px solid #e0e0e0;\n';
    html += '  border-radius: 10px;\n';
    html += '  font-size: 16px;\n';
    html += '  transition: border-color 0.3s;\n';
    html += '}\n';
    html += 'input:focus {\n';
    html += '  outline: none;\n';
    html += '  border-color: #667eea;\n';
    html += '}\n';
    html += '.pay-btn {\n';
    html += '  width: 100%;\n';
    html += '  padding: 15px;\n';
    html += '  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n';
    html += '  color: white;\n';
    html += '  border: none;\n';
    html += '  border-radius: 10px;\n';
    html += '  font-size: 18px;\n';
    html += '  font-weight: bold;\n';
    html += '  cursor: pointer;\n';
    html += '  transition: transform 0.2s;\n';
    html += '}\n';
    html += '.pay-btn:hover { transform: translateY(-2px); }\n';
    html += '.pay-btn:disabled {\n';
    html += '  opacity: 0.6;\n';
    html += '  cursor: not-allowed;\n';
    html += '  transform: none;\n';
    html += '}\n';
    html += '.message {\n';
    html += '  margin-top: 20px;\n';
    html += '  padding: 12px;\n';
    html += '  border-radius: 8px;\n';
    html += '  display: none;\n';
    html += '}\n';
    html += '.message.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }\n';
    html += '.message.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }\n';
    html += '.message.info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }\n';
    html += '.spinner {\n';
    html += '  display: inline-block;\n';
    html += '  width: 20px;\n';
    html += '  height: 20px;\n';
    html += '  border: 3px solid rgba(255,255,255,0.3);\n';
    html += '  border-radius: 50%;\n';
    html += '  border-top-color: white;\n';
    html += '  animation: spin 0.8s linear infinite;\n';
    html += '  margin-right: 8px;\n';
    html += '}\n';
    html += '@keyframes spin { to { transform: rotate(360deg); } }\n';
    html += '.login-section {\n';
    html += '  background: #f0f0f0;\n';
    html += '  padding: 15px;\n';
    html += '  border-radius: 12px;\n';
    html += '  margin-bottom: 20px;\n';
    html += '  text-align: center;\n';
    html += '}\n';
    html += '.login-section a { color: #667eea; text-decoration: none; font-weight: bold; }\n';
    html += '.login-section .logged-in { color: #28a745; font-weight: bold; }\n';
    html += '.login-btn {\n';
    html += '  background: #28a745;\n';
    html += '  color: white;\n';
    html += '  border: none;\n';
    html += '  padding: 10px 20px;\n';
    html += '  border-radius: 8px;\n';
    html += '  cursor: pointer;\n';
    html += '  font-size: 14px;\n';
    html += '  margin-top: 10px;\n';
    html += '}\n';
    html += '.login-btn:hover { background: #218838; }\n';
    html += '.login-form { margin-top: 10px; display: none; }\n';
    html += '.login-form input { margin-bottom: 10px; }\n';
    html += '.small-btn {\n';
    html += '  background: #667eea;\n';
    html += '  color: white;\n';
    html += '  border: none;\n';
    html += '  padding: 8px 15px;\n';
    html += '  border-radius: 6px;\n';
    html += '  cursor: pointer;\n';
    html += '  font-size: 12px;\n';
    html += '}\n';
    html += '</style>\n';
    html += '</head>\n';
    html += '<body>\n';
    html += '<div class="container">\n';
    html += '<div class="header">\n';
    html += '<h1> ' + campaign.title + '</h1>\n';
    html += '<p>Make a payment via M-PESA</p>\n';
    html += '</div>\n';
    html += '<div class="content">\n';
    
    html += '<div class="login-section" id="loginSection">\n';
    if (isLoggedIn) {
      html += '<div class="logged-in"> Logged in as ' + user.fullName + '</div>\n';
      html += '<button class="small-btn" onclick="logout()">Logout</button>\n';
    } else {
      html += '<div> Already have a ZUCA account? <a href="#" onclick="showLoginForm()">Login here</a></div>\n';
      html += '<div id="loginForm" class="login-form">\n';
      html += '<input type="email" id="loginEmail" placeholder="Email" style="width: 100%; margin-bottom: 8px;">\n';
      html += '<input type="password" id="loginPassword" placeholder="Password" style="width: 100%; margin-bottom: 8px;">\n';
      html += '<button class="login-btn" onclick="handleLogin()">Login</button>\n';
      html += '<button class="small-btn" onclick="hideLoginForm()">Cancel</button>\n';
      html += '<div id="loginMessage" style="font-size: 12px; margin-top: 8px;"></div>\n';
      html += '</div>\n';
      html += '<div style="font-size: 12px; margin-top: 8px;">Don\'t have an account? <a href="/register">Register</a></div>\n';
    }
    html += '</div>\n';
    
    html += '<div class="campaign-info">\n';
    html += '<div class="campaign-title">' + campaign.title + '</div>\n';
    html += '<div class="campaign-desc">' + (campaign.description || "Support our cause") + '</div>\n';
    html += '<div class="required-amount">Target: KES ' + campaign.amountRequired.toLocaleString() + '</div>\n';
    html += '</div>\n';
    
    html += '<div class="form-group">\n';
    html += '<label> M-PESA Phone Number</label>\n';
    html += '<input type="tel" id="phone" placeholder="0712345678" value="' + preFilledPhone + '">\n';
    html += '<small style="color: #666;">Enter the number that receives M-PESA messages</small>\n';
    html += '</div>\n';
    
    html += '<div class="form-group">\n';
    html += '<label> Amount (KES)</label>\n';
    html += '<input type="number" id="amount" placeholder="Enter amount" value="' + preFilledAmount + '" min="10">\n';
    html += '</div>\n';
    
    html += '<button class="pay-btn" id="payBtn"> Pay Now with M-PESA</button>\n';
    html += '<div id="message" class="message"></div>\n';
    html += '</div>\n';
    html += '</div>\n';
    
    html += '<script>\n';
    html += 'const campaignId = "' + campaign.id + '";\n';
    html += 'let userId = ' + (userIdFromServer ? '"' + userIdFromServer + '"' : "null") + ';\n';
    html += '\n';
    html += 'function showLoginForm() {\n';
    html += '  document.getElementById("loginForm").style.display = "block";\n';
    html += '}\n';
    html += '\n';
    html += 'function hideLoginForm() {\n';
    html += '  document.getElementById("loginForm").style.display = "none";\n';
    html += '}\n';
    html += '\n';
    html += 'async function handleLogin() {\n';
    html += '  const email = document.getElementById("loginEmail").value;\n';
    html += '  const password = document.getElementById("loginPassword").value;\n';
    html += '  const msgDiv = document.getElementById("loginMessage");\n';
    html += '  if (!email || !password) {\n';
    html += '    msgDiv.innerHTML = "Please enter email and password";\n';
    html += '    msgDiv.style.color = "red";\n';
    html += '    return;\n';
    html += '  }\n';
    html += '  msgDiv.innerHTML = "Logging in...";\n';
    html += '  msgDiv.style.color = "blue";\n';
    html += '  try {\n';
    html += '    const response = await fetch("/api/login", {\n';
    html += '      method: "POST",\n';
    html += '      headers: { "Content-Type": "application/json" },\n';
    html += '      body: JSON.stringify({ email, password })\n';
    html += '    });\n';
    html += '    const data = await response.json();\n';
    html += '    if (response.ok) {\n';
    html += '      localStorage.setItem("token", data.token);\n';
    html += '      msgDiv.innerHTML = " Login successful! Refreshing...";\n';
    html += '      msgDiv.style.color = "green";\n';
    html += '      setTimeout(() => { window.location.reload(); }, 1500);\n';
    html += '    } else {\n';
    html += '      msgDiv.innerHTML = " " + (data.error || "Login failed");\n';
    html += '      msgDiv.style.color = "red";\n';
    html += '    }\n';
    html += '  } catch (err) {\n';
    html += '    msgDiv.innerHTML = " Network error";\n';
    html += '    msgDiv.style.color = "red";\n';
    html += '  }\n';
    html += '}\n';
    html += '\n';
    html += 'function logout() {\n';
    html += '  localStorage.removeItem("token");\n';
    html += '  window.location.reload();\n';
    html += '}\n';
    html += '\n';
    html += 'document.getElementById("payBtn").addEventListener("click", async () => {\n';
    html += '  const phone = document.getElementById("phone").value.trim();\n';
    html += '  const amount = parseFloat(document.getElementById("amount").value);\n';
    html += '  if (!phone) {\n';
    html += '    showMessage("Please enter your M-PESA phone number", "error");\n';
    html += '    return;\n';
    html += '  }\n';
    html += '  if (!amount || amount < 10) {\n';
    html += '    showMessage("Please enter a valid amount (minimum KES 10)", "error");\n';
    html += '    return;\n';
    html += '  }\n';
    html += '  const btn = document.getElementById("payBtn");\n';
    html += '  const originalText = btn.innerHTML;\n';
    html += '  btn.innerHTML = \'<span class="spinner"></span> Processing...\';\n';
    html += '  btn.disabled = true;\n';
    html += '  try {\n';
    html += '    const token = localStorage.getItem("token");\n';
    html += '    const headers = { "Content-Type": "application/json" };\n';
    html += '    if (token) {\n';
    html += '      headers["Authorization"] = "Bearer " + token;\n';
    html += '    }\n';
    html += '    const response = await fetch("/api/mpesa/stk-push", {\n';
    html += '      method: "POST",\n';
    html += '      headers: headers,\n';
    html += '      body: JSON.stringify({ campaignId, amount, phoneNumber: phone, userId: userId })\n';
    html += '    });\n';
    html += '    const data = await response.json();\n';
    html += '    if (data.success) {\n';
    html += '      showMessage(" Check your phone! Enter your M-PESA PIN to complete payment.", "success");\n';
    html += '      pollPaymentStatus(data.paymentId);\n';
    html += '    } else {\n';
    html += '      showMessage(" " + (data.error || "Payment failed. Please try again."), "error");\n';
    html += '      btn.innerHTML = originalText;\n';
    html += '      btn.disabled = false;\n';
    html += '    }\n';
    html += '  } catch (err) {\n';
    html += '    showMessage(" Network error. Please check your connection.", "error");\n';
    html += '    btn.innerHTML = originalText;\n';
    html += '    btn.disabled = false;\n';
    html += '  }\n';
    html += '});\n';
    html += '\n';
    html += 'function pollPaymentStatus(paymentId) {\n';
    html += '  let attempts = 0;\n';
    html += '  const interval = setInterval(async () => {\n';
    html += '    attempts++;\n';
    html += '    try {\n';
    html += '      const response = await fetch("/api/mpesa/payment/" + paymentId + "/status");\n';
    html += '      const data = await response.json();\n';
    html += '      if (data.payment && data.payment.status === "SUCCESS") {\n';
    html += '        clearInterval(interval);\n';
    html += '        showMessage(" Payment successful! Receipt: " + (data.payment.mpesaReceiptNumber || "N/A"), "success");\n';
    html += '        document.getElementById("payBtn").innerHTML = " Payment Complete";\n';
    html += '        setTimeout(function() { window.location.href = "/contributions"; }, 3000);\n';
    html += '      } else if (data.payment && data.payment.status === "FAILED") {\n';
    html += '        clearInterval(interval);\n';
    html += '        showMessage(" Payment failed: " + (data.payment.resultDesc || "Please try again"), "error");\n';
    html += '        document.getElementById("payBtn").innerHTML = " Try Again";\n';
    html += '        document.getElementById("payBtn").disabled = false;\n';
    html += '      }\n';
    html += '    } catch (err) {}\n';
    html += '    if (attempts > 30) {\n';
    html += '      clearInterval(interval);\n';
    html += '      showMessage(" Payment is being processed. You will receive an SMS and email confirmation.", "info");\n';
    html += '      document.getElementById("payBtn").innerHTML = " Pay Now";\n';
    html += '      document.getElementById("payBtn").disabled = false;\n';
    html += '    }\n';
    html += '  }, 3000);\n';
    html += '}\n';
    html += '\n';
    html += 'function showMessage(msg, type) {\n';
    html += '  const msgDiv = document.getElementById("message");\n';
    html += '  msgDiv.textContent = msg;\n';
    html += '  msgDiv.className = "message " + type;\n';
    html += '  msgDiv.style.display = "block";\n';
    html += '  setTimeout(function() {\n';
    html += '    if (type !== "success") {\n';
    html += '      msgDiv.style.display = "none";\n';
    html += '    }\n';
    html += '  }, 5000);\n';
    html += '}\n';
    html += '</script>\n';
    html += '</body>\n';
    html += '</html>';
    
    res.send(html);
  } catch (err) {
    console.error("Payment page error:", err);
    res.status(500).send("Internal server error");
  }
});

// 5. Get payment page HTML (served directly)
router.get("/pay/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    
    const campaign = await prisma.contributionType.findFirst({
      where: { paymentSlug: slug }
    });
    
    if (!campaign) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Payment Not Found - ZUCA</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: red; }
          </style>
        </head>
        <body>
          <h1 class="error"> Payment Link Not Found</h1>
          <p>This payment link is invalid or has expired.</p>
          <p>Please contact your Jumuia leader or administrator for assistance.</p>
        </body>
        </html>
      `);
    }
    
    let user = null;
    let preFilledPhone = "";
    let preFilledAmount = campaign.amountRequired;
    
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (user) preFilledPhone = user.phone;
      } catch (e) {}
    }
    
    const tokenQuery = req.query.token;
    if (tokenQuery && !user) {
      try {
        const decoded = jwt.verify(tokenQuery, process.env.JWT_SECRET);
        user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (user) preFilledPhone = user.phone;
      } catch (e) {}
    }
    
    const isLoggedIn = !!user;
    const userIdFromServer = user ? user.id : null;
    
    let html = '<!DOCTYPE html>\n';
    html += '<html>\n';
    html += '<head>\n';
    html += '<title>Pay: ' + campaign.title + ' - ZUCA</title>\n';
    html += '<meta name="viewport" content="width=device-width, initial-scale=1">\n';
    html += '<style>\n';
    html += '* { margin: 0; padding: 0; box-sizing: border-box; }\n';
    html += 'body {\n';
    html += '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;\n';
    html += '  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n';
    html += '  min-height: 100vh;\n';
    html += '  display: flex;\n';
    html += '  justify-content: center;\n';
    html += '  align-items: center;\n';
    html += '  padding: 20px;\n';
    html += '}\n';
    html += '.container {\n';
    html += '  max-width: 500px;\n';
    html += '  width: 100%;\n';
    html += '  background: white;\n';
    html += '  border-radius: 20px;\n';
    html += '  box-shadow: 0 20px 60px rgba(0,0,0,0.3);\n';
    html += '  overflow: hidden;\n';
    html += '}\n';
    html += '.header {\n';
    html += '  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n';
    html += '  color: white;\n';
    html += '  padding: 30px;\n';
    html += '  text-align: center;\n';
    html += '}\n';
    html += '.header h1 { font-size: 28px; margin-bottom: 10px; }\n';
    html += '.header p { opacity: 0.9; }\n';
    html += '.content { padding: 30px; }\n';
    html += '.campaign-info {\n';
    html += '  background: #f7f7f7;\n';
    html += '  padding: 20px;\n';
    html += '  border-radius: 12px;\n';
    html += '  margin-bottom: 25px;\n';
    html += '}\n';
    html += '.campaign-title { font-size: 20px; font-weight: bold; margin-bottom: 10px; color: #333; }\n';
    html += '.campaign-desc { color: #666; margin-bottom: 15px; line-height: 1.5; }\n';
    html += '.required-amount { font-size: 24px; font-weight: bold; color: #667eea; }\n';
    html += '.form-group { margin-bottom: 20px; }\n';
    html += 'label { display: block; margin-bottom: 8px; font-weight: 500; color: #333; }\n';
    html += 'input {\n';
    html += '  width: 100%;\n';
    html += '  padding: 12px 15px;\n';
    html += '  border: 2px solid #e0e0e0;\n';
    html += '  border-radius: 10px;\n';
    html += '  font-size: 16px;\n';
    html += '  transition: border-color 0.3s;\n';
    html += '}\n';
    html += 'input:focus {\n';
    html += '  outline: none;\n';
    html += '  border-color: #667eea;\n';
    html += '}\n';
    html += '.pay-btn {\n';
    html += '  width: 100%;\n';
    html += '  padding: 15px;\n';
    html += '  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n';
    html += '  color: white;\n';
    html += '  border: none;\n';
    html += '  border-radius: 10px;\n';
    html += '  font-size: 18px;\n';
    html += '  font-weight: bold;\n';
    html += '  cursor: pointer;\n';
    html += '  transition: transform 0.2s;\n';
    html += '}\n';
    html += '.pay-btn:hover { transform: translateY(-2px); }\n';
    html += '.pay-btn:disabled {\n';
    html += '  opacity: 0.6;\n';
    html += '  cursor: not-allowed;\n';
    html += '  transform: none;\n';
    html += '}\n';
    html += '.message {\n';
    html += '  margin-top: 20px;\n';
    html += '  padding: 12px;\n';
    html += '  border-radius: 8px;\n';
    html += '  display: none;\n';
    html += '}\n';
    html += '.message.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }\n';
    html += '.message.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }\n';
    html += '.message.info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }\n';
    html += '.spinner {\n';
    html += '  display: inline-block;\n';
    html += '  width: 20px;\n';
    html += '  height: 20px;\n';
    html += '  border: 3px solid rgba(255,255,255,0.3);\n';
    html += '  border-radius: 50%;\n';
    html += '  border-top-color: white;\n';
    html += '  animation: spin 0.8s linear infinite;\n';
    html += '  margin-right: 8px;\n';
    html += '}\n';
    html += '@keyframes spin { to { transform: rotate(360deg); } }\n';
    html += '.login-section {\n';
    html += '  background: #f0f0f0;\n';
    html += '  padding: 15px;\n';
    html += '  border-radius: 12px;\n';
    html += '  margin-bottom: 20px;\n';
    html += '  text-align: center;\n';
    html += '}\n';
    html += '.login-section a { color: #667eea; text-decoration: none; font-weight: bold; }\n';
    html += '.login-section .logged-in { color: #28a745; font-weight: bold; }\n';
    html += '.login-btn {\n';
    html += '  background: #28a745;\n';
    html += '  color: white;\n';
    html += '  border: none;\n';
    html += '  padding: 10px 20px;\n';
    html += '  border-radius: 8px;\n';
    html += '  cursor: pointer;\n';
    html += '  font-size: 14px;\n';
    html += '  margin-top: 10px;\n';
    html += '}\n';
    html += '.login-btn:hover { background: #218838; }\n';
    html += '.login-form { margin-top: 10px; display: none; }\n';
    html += '.login-form input { margin-bottom: 10px; }\n';
    html += '.small-btn {\n';
    html += '  background: #667eea;\n';
    html += '  color: white;\n';
    html += '  border: none;\n';
    html += '  padding: 8px 15px;\n';
    html += '  border-radius: 6px;\n';
    html += '  cursor: pointer;\n';
    html += '  font-size: 12px;\n';
    html += '}\n';
    html += '</style>\n';
    html += '</head>\n';
    html += '<body>\n';
    html += '<div class="container">\n';
    html += '<div class="header">\n';
    html += '<h1> ' + campaign.title + '</h1>\n';
    html += '<p>Make a payment via M-PESA</p>\n';
    html += '</div>\n';
    html += '<div class="content">\n';
    
    html += '<div class="login-section" id="loginSection">\n';
    if (isLoggedIn) {
      html += '<div class="logged-in"> Logged in as ' + user.fullName + '</div>\n';
      html += '<button class="small-btn" onclick="logout()">Logout</button>\n';
    } else {
      html += '<div> Already have a ZUCA account? <a href="#" onclick="showLoginForm()">Login here</a></div>\n';
      html += '<div id="loginForm" class="login-form">\n';
      html += '<input type="email" id="loginEmail" placeholder="Email" style="width: 100%; margin-bottom: 8px;">\n';
      html += '<input type="password" id="loginPassword" placeholder="Password" style="width: 100%; margin-bottom: 8px;">\n';
      html += '<button class="login-btn" onclick="handleLogin()">Login</button>\n';
      html += '<button class="small-btn" onclick="hideLoginForm()">Cancel</button>\n';
      html += '<div id="loginMessage" style="font-size: 12px; margin-top: 8px;"></div>\n';
      html += '</div>\n';
      html += '<div style="font-size: 12px; margin-top: 8px;">Don\'t have an account? <a href="/register">Register</a></div>\n';
    }
    html += '</div>\n';
    
    html += '<div class="campaign-info">\n';
    html += '<div class="campaign-title">' + campaign.title + '</div>\n';
    html += '<div class="campaign-desc">' + (campaign.description || "Support our cause") + '</div>\n';
    html += '<div class="required-amount">Target: KES ' + campaign.amountRequired.toLocaleString() + '</div>\n';
    html += '</div>\n';
    
    html += '<div class="form-group">\n';
    html += '<label> M-PESA Phone Number</label>\n';
    html += '<input type="tel" id="phone" placeholder="0712345678" value="' + preFilledPhone + '">\n';
    html += '<small style="color: #666;">Enter the number that receives M-PESA messages</small>\n';
    html += '</div>\n';
    
    html += '<div class="form-group">\n';
    html += '<label> Amount (KES)</label>\n';
    html += '<input type="number" id="amount" placeholder="Enter amount" value="' + preFilledAmount + '" min="10">\n';
    html += '</div>\n';
    
    html += '<button class="pay-btn" id="payBtn"> Pay Now with M-PESA</button>\n';
    html += '<div id="message" class="message"></div>\n';
    html += '</div>\n';
    html += '</div>\n';
    
    html += '<script>\n';
    html += 'const campaignId = "' + campaign.id + '";\n';
    html += 'let userId = ' + (userIdFromServer ? '"' + userIdFromServer + '"' : "null") + ';\n';
    html += '\n';
    html += '// Check if user is logged in via token\n';
    html += 'async function checkLoggedInUser() {\n';
    html += '  if (userId !== null) return;\n';
    html += '  const token = localStorage.getItem("token");\n';
    html += '  if (!token) return;\n';
    html += '  try {\n';
    html += '    const response = await fetch("/api/me", {\n';
    html += '      headers: { "Authorization": "Bearer " + token }\n';
    html += '    });\n';
    html += '    if (response.ok) {\n';
    html += '      const userData = await response.json();\n';
    html += '      userId = userData.id;\n';
    html += '      console.log("User ID set from token:", userId);\n';
    html += '      document.getElementById("loginSection").innerHTML = \'<div class="logged-in"> Logged in as \' + userData.fullName + \'</div><button class="small-btn" onclick="logout()">Logout</button>\';\n';
    html += '    }\n';
    html += '  } catch (err) {\n';
    html += '    console.error("Failed to get user:", err);\n';
    html += '  }\n';
    html += '}\n';
    html += '\n';
    html += 'function showLoginForm() {\n';
    html += '  document.getElementById("loginForm").style.display = "block";\n';
    html += '}\n';
    html += '\n';
    html += 'function hideLoginForm() {\n';
    html += '  document.getElementById("loginForm").style.display = "none";\n';
    html += '}\n';
    html += '\n';
    html += 'async function handleLogin() {\n';
    html += '  const email = document.getElementById("loginEmail").value;\n';
    html += '  const password = document.getElementById("loginPassword").value;\n';
    html += '  const msgDiv = document.getElementById("loginMessage");\n';
    html += '  if (!email || !password) {\n';
    html += '    msgDiv.innerHTML = "Please enter email and password";\n';
    html += '    msgDiv.style.color = "red";\n';
    html += '    return;\n';
    html += '  }\n';
    html += '  msgDiv.innerHTML = "Logging in...";\n';
    html += '  msgDiv.style.color = "blue";\n';
    html += '  try {\n';
    html += '    const response = await fetch("/api/login", {\n';
    html += '      method: "POST",\n';
    html += '      headers: { "Content-Type": "application/json" },\n';
    html += '      body: JSON.stringify({ email, password })\n';
    html += '    });\n';
    html += '    const data = await response.json();\n';
    html += '    if (response.ok) {\n';
    html += '      localStorage.setItem("token", data.token);\n';
    html += '      msgDiv.innerHTML = " Login successful! Refreshing...";\n';
    html += '      msgDiv.style.color = "green";\n';
    html += '      setTimeout(() => { window.location.reload(); }, 1500);\n';
    html += '    } else {\n';
    html += '      msgDiv.innerHTML = " " + (data.error || "Login failed");\n';
    html += '      msgDiv.style.color = "red";\n';
    html += '    }\n';
    html += '  } catch (err) {\n';
    html += '    msgDiv.innerHTML = " Network error";\n';
    html += '    msgDiv.style.color = "red";\n';
    html += '  }\n';
    html += '}\n';
    html += '\n';
    html += 'function logout() {\n';
    html += '  localStorage.removeItem("token");\n';
    html += '  window.location.reload();\n';
    html += '}\n';
    html += '\n';
    html += 'document.getElementById("payBtn").addEventListener("click", async () => {\n';
    html += '  const phone = document.getElementById("phone").value.trim();\n';
    html += '  const amount = parseFloat(document.getElementById("amount").value);\n';
    html += '  if (!phone) {\n';
    html += '    showMessage("Please enter your M-PESA phone number", "error");\n';
    html += '    return;\n';
    html += '  }\n';
    html += '  if (!amount || amount < 10) {\n';
    html += '    showMessage("Please enter a valid amount (minimum KES 10)", "error");\n';
    html += '    return;\n';
    html += '  }\n';
    html += '  const btn = document.getElementById("payBtn");\n';
    html += '  const originalText = btn.innerHTML;\n';
    html += '  btn.innerHTML = \'<span class="spinner"></span> Processing...\';\n';
    html += '  btn.disabled = true;\n';
    html += '  try {\n';
    html += '    const token = localStorage.getItem("token");\n';
    html += '    const headers = { "Content-Type": "application/json" };\n';
    html += '    if (token) {\n';
    html += '      headers["Authorization"] = "Bearer " + token;\n';
    html += '    }\n';
    html += '    const response = await fetch("/api/mpesa/stk-push", {\n';
    html += '      method: "POST",\n';
    html += '      headers: headers,\n';
    html += '      body: JSON.stringify({ campaignId, amount, phoneNumber: phone, userId: userId })\n';
    html += '    });\n';
    html += '    const data = await response.json();\n';
    html += '    if (data.success) {\n';
    html += '      showMessage(" Check your phone! Enter your M-PESA PIN to complete payment.", "success");\n';
    html += '      pollPaymentStatus(data.paymentId);\n';
    html += '    } else {\n';
    html += '      showMessage(" " + (data.error || "Payment failed. Please try again."), "error");\n';
    html += '      btn.innerHTML = originalText;\n';
    html += '      btn.disabled = false;\n';
    html += '    }\n';
    html += '  } catch (err) {\n';
    html += '    showMessage(" Network error. Please check your connection.", "error");\n';
    html += '    btn.innerHTML = originalText;\n';
    html += '    btn.disabled = false;\n';
    html += '  }\n';
    html += '});\n';
    html += '\n';
    html += 'function pollPaymentStatus(paymentId) {\n';
    html += '  let attempts = 0;\n';
    html += '  const interval = setInterval(async () => {\n';
    html += '    attempts++;\n';
    html += '    try {\n';
    html += '      const response = await fetch("/api/mpesa/payment/" + paymentId + "/status");\n';
    html += '      const data = await response.json();\n';
    html += '      if (data.payment && data.payment.status === "SUCCESS") {\n';
    html += '        clearInterval(interval);\n';
    html += '        showMessage(" Payment successful! Receipt: " + (data.payment.mpesaReceiptNumber || "N/A"), "success");\n';
    html += '        document.getElementById("payBtn").innerHTML = " Payment Complete";\n';
    html += '        setTimeout(function() { window.location.href = "/contributions"; }, 3000);\n';
    html += '      } else if (data.payment && data.payment.status === "FAILED") {\n';
    html += '        clearInterval(interval);\n';
    html += '        showMessage(" Payment failed: " + (data.payment.resultDesc || "Please try again"), "error");\n';
    html += '        document.getElementById("payBtn").innerHTML = " Try Again";\n';
    html += '        document.getElementById("payBtn").disabled = false;\n';
    html += '      }\n';
    html += '    } catch (err) {}\n';
    html += '    if (attempts > 30) {\n';
    html += '      clearInterval(interval);\n';
    html += '      showMessage(" Payment is being processed. You will receive an SMS and email confirmation.", "info");\n';
    html += '      document.getElementById("payBtn").innerHTML = " Pay Now";\n';
    html += '      document.getElementById("payBtn").disabled = false;\n';
    html += '    }\n';
    html += '  }, 3000);\n';
    html += '}\n';
    html += '\n';
    html += 'function showMessage(msg, type) {\n';
    html += '  const msgDiv = document.getElementById("message");\n';
    html += '  msgDiv.textContent = msg;\n';
    html += '  msgDiv.className = "message " + type;\n';
    html += '  msgDiv.style.display = "block";\n';
    html += '  setTimeout(function() {\n';
    html += '    if (type !== "success") {\n';
    html += '      msgDiv.style.display = "none";\n';
    html += '    }\n';
    html += '  }, 5000);\n';
    html += '}\n';
    html += '\n';
    html += '// Call this when page loads\n';
    html += 'checkLoggedInUser();\n';
    html += '</script>\n';
    html += '</body>\n';
    html += '</html>';
    
    res.send(html);
  } catch (err) {
    console.error("Payment page error:", err);
    res.status(500).send("Internal server error");
  }
});

module.exports = router;