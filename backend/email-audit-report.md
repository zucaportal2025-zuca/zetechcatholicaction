# Email Settings Audit Report
Generated: 2026-06-25T08:18:52.886Z

## Summary
- Total files scanned: 86
- Files needing email guard: 13
- Email references found: 172

## Files Needing Email Guard Checks

### SERVICES (3 files)

#### 📄 C:/Users/HP/projects/zuca-portal/backend/services/cronJobs.js

**Needs email guard checks for:**

- `sendEventReminder`: found in 2 place(s)
  - Line 17: `async function sendEventReminders() {`
  - Line 203: `sendEventReminders,`
- `campaign_reminder`: found in 2 place(s)
  - Line 119: `const isEnabled = await isEmailTypeEnabled('campaign_reminder');`
  - Line 153: `type: "campaign_reminder",`
- `announcement_new`: found in 1 place(s)
  - Line 168: `const isEnabled = await isEmailTypeEnabled('announcement_new');`

#### 📄 C:/Users/HP/projects/zuca-portal/backend/services/deepseek/toolHandlers.js

**Needs email guard checks for:**

- `pledge_approved`: found in 2 place(s)
  - Line 331: `type: "pledge_approved",`
  - Line 1467: `type: "pledge_approved",`
- `game_invite`: found in 4 place(s)
  - Line 732: `type: "game_invite",`
  - Line 2716: `type: "game_invite",`
  - Line 2757: `case "accept_game_invite": {`
  - ... and 1 more occurrences

#### 📄 C:/Users/HP/projects/zuca-portal/backend/services/mailer.js

**Needs ⭐ HIGH PRIORITY - Email Service email guard checks for:**

- `sendWelcomeEmail`: found in 2 place(s)
  - Line 67: `async function sendWelcomeEmail(user, membershipNumber) {`
  - Line 1212: `sendWelcomeEmail,`
- `sendVerificationEmail`: found in 2 place(s)
  - Line 256: `async function sendVerificationEmail(user, verificationCode) {`
  - Line 1213: `sendVerificationEmail,`
- `sendPasswordReset`: found in 2 place(s)
  - Line 372: `async function sendPasswordResetEmail(email, resetCode) {`
  - Line 1210: `sendPasswordResetEmail,`
- `payment_receipt`: found in 1 place(s)
  - Line 628: `if (notificationType === 'payment_receipt') {`
- `pledge_approved`: found in 1 place(s)
  - Line 658: `'pledge_approved': '/contributions',`
- `payment_success`: found in 1 place(s)
  - Line 659: `'payment_success': '/contributions',`
- `game_invite`: found in 1 place(s)
  - Line 661: `'game_invite': '/games',`
- `semester_report`: found in 1 place(s)
  - Line 1177: `name: `semester_report_${semester.title.replace(/\s/g, '_')}.pdf`,`


### ROUTES (5 files)

#### 📄 C:/Users/HP/projects/zuca-portal/backend/routes/attendanceRoutes.js

**Needs email guard checks for:**

- `sendEmail`: found in 3 place(s)
  - Line 111: `let shouldSendEmail = true;`
  - Line 114: `shouldSendEmail = await isEmailTypeEnabled(type);`
  - Line 119: `if (!shouldSendEmail) {`
- `attendance_missed`: found in 3 place(s)
  - Line 138: `if (type === "attendance_missed") {`
  - Line 698: `type: "attendance_missed",`
  - Line 712: `"attendance_missed",`
- `attendance_thankyou`: found in 2 place(s)
  - Line 140: `} else if (type === "attendance_thankyou") {`
  - Line 680: `type: "attendance_thankyou",`
- `attendance_summary`: found in 2 place(s)
  - Line 142: `} else if (type === "attendance_summary") {`
  - Line 738: `type: "attendance_summary",`
- `attendance_checkin`: found in 6 place(s)
  - Line 380: `type: "attendance_checkin",`
  - Line 390: `"attendance_checkin",`
  - Line 401: `io.to(`sheet-${qrToken.sheetId}`).emit("attendance_checkin", {`
  - ... and 3 more occurrences
- `attendance_sheet_opened`: found in 2 place(s)
  - Line 611: `type: "attendance_sheet_opened",`
  - Line 914: `type: "attendance_sheet_opened",`
- `attendance_reminder`: found in 2 place(s)
  - Line 804: `type: "attendance_reminder",`
  - Line 813: `"attendance_reminder",`

#### 📄 C:/Users/HP/projects/zuca-portal/backend/routes/ibmRoutes.js

**Needs email guard checks for:**

- `claim_success`: found in 2 place(s)
  - Line 390: `type: "claim_success",`
  - Line 399: `type: "claim_success",`
- `payment_claimed_admin`: found in 3 place(s)
  - Line 433: `type: "payment_claimed_admin",`
  - Line 441: `type: "payment_claimed_admin",`
  - Line 455: `"payment_claimed_admin",`
- `payment_claimed_treasurer`: found in 3 place(s)
  - Line 476: `type: "payment_claimed_treasurer",`
  - Line 484: `type: "payment_claimed_treasurer",`
  - Line 498: `"payment_claimed_treasurer",`

#### 📄 C:/Users/HP/projects/zuca-portal/backend/routes/meetingMinutes.js

**Needs email guard checks for:**

- `minutes_published`: found in 1 place(s)
  - Line 579: `type: "meeting_minutes_published",`

#### 📄 C:/Users/HP/projects/zuca-portal/backend/routes/mpesaRoutes.js

**Needs email guard checks for:**

- `payment_receipt`: found in 1 place(s)
  - Line 322: `"payment_receipt",`
- `payment_success`: found in 1 place(s)
  - Line 343: `type: "payment_success",`
- `payment_failed`: found in 1 place(s)
  - Line 496: `type: "payment_failed",`

#### 📄 C:/Users/HP/projects/zuca-portal/backend/routes/semesterRoutes.js

**Needs email guard checks for:**

- `semester_report`: found in 1 place(s)
  - Line 358: `const filename = `semester_report_${userId}_${semester.title.replace(/\s/g, '_')...`


### UNKNOWN (5 files)

#### 📄 C:/Users/HP/projects/zuca-portal/backend/scripts/check-email-usage.js

**Needs email guard checks for:**

- `sendEmail`: found in 2 place(s)
  - Line 14: `'sendEmail',`
  - Line 19: `'sendEmailNotification',`
- `sendMail`: found in 2 place(s)
  - Line 15: `'sendMail',`
  - Line 16: `'transporter.sendMail',`
- `nodemailer`: found in 1 place(s)
  - Line 17: `'nodemailer',`
- `emailService`: found in 7 place(s)
  - Line 18: `'emailService',`
  - Line 80: `'emailService.js',`
  - Line 202: `function isEmailService(filePath) {`
  - ... and 4 more occurrences
- `sendWelcomeEmail`: found in 1 place(s)
  - Line 20: `'sendWelcomeEmail',`
- `sendVerificationEmail`: found in 1 place(s)
  - Line 21: `'sendVerificationEmail',`
- `sendPasswordReset`: found in 1 place(s)
  - Line 22: `'sendPasswordReset',`
- `sendEventReminder`: found in 1 place(s)
  - Line 23: `'sendEventReminder',`
- `sendAttendanceEmail`: found in 1 place(s)
  - Line 24: `'sendAttendanceEmail',`
- `sendPledgeEmail`: found in 1 place(s)
  - Line 25: `'sendPledgeEmail',`
- `sendPaymentEmail`: found in 1 place(s)
  - Line 26: `'sendPaymentEmail',`
- `sendAnnouncementEmail`: found in 1 place(s)
  - Line 27: `'sendAnnouncementEmail',`
- `sendProgramEmail`: found in 1 place(s)
  - Line 28: `'sendProgramEmail',`
- `sendMinutesEmail`: found in 1 place(s)
  - Line 29: `'sendMinutesEmail',`
- `sendGameInvite`: found in 1 place(s)
  - Line 30: `'sendGameInvite',`
- `sendReportEmail`: found in 1 place(s)
  - Line 31: `'sendReportEmail',`
- `sendCampaignEmail`: found in 1 place(s)
  - Line 32: `'sendCampaignEmail',`
- `sendSMSEmail`: found in 1 place(s)
  - Line 33: `'sendSMSEmail',`
- `event_7days`: found in 1 place(s)
  - Line 36: `'event_7days',`
- `event_3days`: found in 1 place(s)
  - Line 37: `'event_3days',`
- `event_1day`: found in 1 place(s)
  - Line 38: `'event_1day',`
- `event_12hours`: found in 1 place(s)
  - Line 39: `'event_12hours',`
- `event_6hours`: found in 1 place(s)
  - Line 40: `'event_6hours',`
- `event_1hour`: found in 1 place(s)
  - Line 41: `'event_1hour',`
- `event_30min`: found in 1 place(s)
  - Line 42: `'event_30min',`
- `attendance_checkin`: found in 1 place(s)
  - Line 43: `'attendance_checkin',`
- `attendance_missed`: found in 1 place(s)
  - Line 44: `'attendance_missed',`
- `attendance_thankyou`: found in 1 place(s)
  - Line 45: `'attendance_thankyou',`
- `attendance_summary`: found in 1 place(s)
  - Line 46: `'attendance_summary',`
- `attendance_sheet_opened`: found in 1 place(s)
  - Line 47: `'attendance_sheet_opened',`
- `attendance_reminder`: found in 1 place(s)
  - Line 48: `'attendance_reminder',`
- `announcement_new`: found in 1 place(s)
  - Line 49: `'announcement_new',`
- `announcement_important`: found in 1 place(s)
  - Line 50: `'announcement_important',`
- `pledge_created`: found in 1 place(s)
  - Line 51: `'pledge_created',`
- `pledge_approved`: found in 1 place(s)
  - Line 52: `'pledge_approved',`
- `pledge_reminder`: found in 1 place(s)
  - Line 53: `'pledge_reminder',`
- `payment_success`: found in 1 place(s)
  - Line 54: `'payment_success',`
- `payment_failed`: found in 1 place(s)
  - Line 55: `'payment_failed',`
- `payment_receipt`: found in 1 place(s)
  - Line 56: `'payment_receipt',`
- `payment_claimed_admin`: found in 1 place(s)
  - Line 57: `'payment_claimed_admin',`
- `payment_claimed_treasurer`: found in 1 place(s)
  - Line 58: `'payment_claimed_treasurer',`
- `claim_success`: found in 1 place(s)
  - Line 59: `'claim_success',`
- `user_welcome`: found in 1 place(s)
  - Line 60: `'user_welcome',`
- `user_verification`: found in 1 place(s)
  - Line 61: `'user_verification',`
- `user_login`: found in 1 place(s)
  - Line 62: `'user_login',`
- `user_password_reset`: found in 1 place(s)
  - Line 63: `'user_password_reset',`
- `program_new`: found in 1 place(s)
  - Line 64: `'program_new',`
- `program_reminder`: found in 1 place(s)
  - Line 65: `'program_reminder',`
- `schedule_update`: found in 1 place(s)
  - Line 66: `'schedule_update',`
- `schedule_reminder`: found in 1 place(s)
  - Line 67: `'schedule_reminder',`
- `minutes_published`: found in 1 place(s)
  - Line 68: `'minutes_published',`
- `minutes_reminder`: found in 1 place(s)
  - Line 69: `'minutes_reminder',`
- `game_invite`: found in 1 place(s)
  - Line 70: `'game_invite',`
- `semester_report`: found in 1 place(s)
  - Line 71: `'semester_report',`
- `notification_general`: found in 1 place(s)
  - Line 72: `'notification_general',`
- `notification_claim`: found in 1 place(s)
  - Line 73: `'notification_claim',`
- `sms_notification`: found in 1 place(s)
  - Line 74: `'sms_notification',`
- `campaign_reminder`: found in 1 place(s)
  - Line 75: `'campaign_reminder',`

#### 📄 C:/Users/HP/projects/zuca-portal/backend/scripts/debug-scheduled-notifications.js

**Needs email guard checks for:**

- `sendEventReminder`: found in 2 place(s)
  - Line 306: `console.log("\n\n⚙️ 8. SIMULATING sendEventReminders() LOGIC");`
  - Line 315: `console.log(`Notifications that would be sent by sendEventReminders(): ${notific...`

#### 📄 C:/Users/HP/projects/zuca-portal/backend/scripts/scanEmailFunctions.js

**Needs email guard checks for:**

- `sendWelcomeEmail`: found in 1 place(s)
  - Line 32: `{ pattern: /sendWelcomeEmail\(/g, type: 'sendWelcomeEmail' },`
- `sendVerificationEmail`: found in 1 place(s)
  - Line 33: `{ pattern: /sendVerificationEmail\(/g, type: 'sendVerificationEmail' },`
- `sendPasswordReset`: found in 1 place(s)
  - Line 34: `{ pattern: /sendPasswordResetEmail\(/g, type: 'sendPasswordResetEmail' },`
- `sendEventReminder`: found in 1 place(s)
  - Line 42: `{ pattern: /sendEventReminders\(/g, type: 'sendEventReminders' },`
- `user_login`: found in 2 place(s)
  - Line 47: `{ pattern: /type: ['"](event_reminder|attendance|announcement|pledge|payment|use...`
  - Line 54: `'user_login',`
- `attendance_sheet_opened`: found in 1 place(s)
  - Line 53: `'attendance_sheet_opened',`
- `attendance_checkin`: found in 1 place(s)
  - Line 55: `'attendance_checkin',`
- `attendance_thankyou`: found in 1 place(s)
  - Line 57: `'attendance_thankyou',`
- `attendance_missed`: found in 1 place(s)
  - Line 58: `'attendance_missed',`
- `attendance_summary`: found in 1 place(s)
  - Line 60: `'attendance_summary',`
- `payment_claimed_treasurer`: found in 1 place(s)
  - Line 61: `'payment_claimed_treasurer',`
- `payment_claimed_admin`: found in 1 place(s)
  - Line 62: `'payment_claimed_admin',`
- `claim_success`: found in 1 place(s)
  - Line 63: `'claim_success',`
- `payment_failed`: found in 1 place(s)
  - Line 65: `'payment_failed',`
- `payment_success`: found in 1 place(s)
  - Line 66: `'payment_success'`

#### 📄 C:/Users/HP/projects/zuca-portal/backend/server.js

**Needs email guard checks for:**

- `sendEventReminder`: found in 3 place(s)
  - Line 95: `const { sendEventReminders, sendCampaignReminders, checkNoAnnouncements } = requ...`
  - Line 926: `await sendEventReminders();`
  - Line 1005: `await sendEventReminders();`
- `sendWelcomeEmail`: found in 3 place(s)
  - Line 98: `const { sendPasswordResetEmail, sendPersonalizedEmail, sendWelcomeEmail, sendVer...`
  - Line 5830: `await sendWelcomeEmail(user, user.membership_number);`
  - Line 5875: `await sendWelcomeEmail(user, user.membership_number);`
- `campaign_reminder`: found in 1 place(s)
  - Line 1019: `executed.push("campaign_reminders");`
- `sendPasswordReset`: found in 3 place(s)
  - Line 5635: `await sendPasswordResetEmail(user.email, resetCode);`
  - Line 6211: `await sendPasswordResetEmail(user.email, resetCode);`
  - Line 6300: `await sendPasswordResetEmail(user.email, resetCode);`
- `sendVerificationEmail`: found in 1 place(s)
  - Line 5746: `await sendVerificationEmail(tempUser, verificationCode);`
- `user_login`: found in 2 place(s)
  - Line 5959: `type: "user_login",`
  - Line 6096: `type: "user_login",`
- `pledge_approved`: found in 3 place(s)
  - Line 8021: `type: "pledge_approved",`
  - Line 8444: `type: "pledge_approved",`
  - Line 12075: `type: "pledge_approved",`
- `game_invite`: found in 9 place(s)
  - Line 12692: `socket.on("send_game_invite", async (data) => {`
  - Line 12712: `type: "game_invite",`
  - Line 12728: `type: "game_invite",`
  - ... and 6 more occurrences

#### 📄 C:/Users/HP/projects/zuca-portal/backend/test-emails.js

**Needs email guard checks for:**

- `sendWelcomeEmail`: found in 2 place(s)
  - Line 4: `sendWelcomeEmail,`
  - Line 23: `await sendWelcomeEmail(testUser, 'ZUCA-2024-001234');`
- `sendVerificationEmail`: found in 2 place(s)
  - Line 5: `sendVerificationEmail,`
  - Line 28: `await sendVerificationEmail(testUser, '123456');`
- `sendPasswordReset`: found in 2 place(s)
  - Line 6: `sendPasswordResetEmail,`
  - Line 33: `await sendPasswordResetEmail(testUser.email, '789012');`
- `payment_receipt`: found in 1 place(s)
  - Line 38: `await sendPersonalizedEmail(testUser, 'payment_receipt', 'Payment Confirmation',...`
- `pledge_approved`: found in 1 place(s)
  - Line 56: `await sendPersonalizedEmail(testUser, 'pledge_approved', 'Pledge Approved', 'You...`


## Recommended Actions

1. **Create email guard utility** in `backend/utils/emailSettings.js`
2. **Update all email services** to check settings before sending
3. **Add cache** for email settings to avoid DB calls
4. **Log skipped emails** for debugging
5. **Add tests** for email guard functionality

## Priority Files to Update

### 🔴 HIGHEST PRIORITY - Email Services
- `C:/Users/HP/projects/zuca-portal/backend/services/mailer.js`

