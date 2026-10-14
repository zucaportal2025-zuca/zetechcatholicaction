// scripts/fix-attendance-email-guards.js
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'routes', 'attendance.js');

console.log('🔧 Fixing email guards in attendance.js...');

let content = fs.readFileSync(filePath, 'utf8');
let modified = false;

// 1. Add import for isEmailEnabled if not present
if (!content.includes('isEmailEnabled')) {
  // Find the mailer import line
  const mailerImport = `const { sendPersonalizedEmail } = require("../services/mailer");`;
  const newMailerImport = `const { sendPersonalizedEmail, isEmailEnabled } = require("../services/mailer");`;
  
  if (content.includes(mailerImport)) {
    content = content.replace(mailerImport, newMailerImport);
    modified = true;
    console.log('✅ Added isEmailEnabled import');
  }
}

// 2. Fix createAndSendNotification - replace isEmailTypeEnabled with isEmailEnabled
if (content.includes('isEmailTypeEnabled')) {
  content = content.replace(/isEmailTypeEnabled/g, 'isEmailEnabled');
  modified = true;
  console.log('✅ Fixed isEmailTypeEnabled -> isEmailEnabled');
}

// 3. Fix sendCheckinConfirmation - add email guard
const checkinPattern = /if\s*\(\s*user\?\.email\s*\)\s*\{[\s\S]*?sendPersonalizedEmail\([^)]*\)[\s\S]*?\}\)/g;
const checkinMatch = content.match(checkinPattern);
if (checkinMatch) {
  const newCheckin = `if (user?.email) {
        const emailEnabled = await isEmailEnabled('attendance_checkin');
        if (emailEnabled) {
          sendPersonalizedEmail(
            { email: user.email, fullName: user.fullName },
            "attendance_checkin",
            \`Check-in Confirmation: \${sheetTitle}\`,
            \`Dear \${user.fullName},

This is to confirm that you have been successfully checked in for "\${sheetTitle}".

Check-in Details:
- Meeting: \${sheetTitle}
- Time: \${new Date(entry.signTime).toLocaleString()}
- Method: \${entry.signMethod}

Thank you for your attendance.

Zetech University Catholic Action (ZUCA)\`,
            { sheetTitle, signTime: entry.signTime, signMethod: entry.signMethod }
          ).catch(err => console.error("Check-in email failed:", err.message));
        } else {
          console.log(\`📧 attendance_checkin email disabled, skipping for \${user.email}\`);
        }
      }`;
  
  // Only replace if not already guarded
  if (!content.includes('emailEnabled = await isEmailEnabled')) {
    content = content.replace(checkinMatch[0], newCheckin);
    modified = true;
    console.log('✅ Fixed sendCheckinConfirmation email guard');
  }
}

// 4. Fix sendSheetClosedNotification - add email guards
const closedPattern = /if\s*\(\s*member\.email\s*\)\s*\{[\s\S]*?sendPersonalizedEmail\([^)]*\)[\s\S]*?\}\)/g;
const closedMatch = content.match(closedPattern);
if (closedMatch && !content.includes('emailEnabled = await isEmailEnabled(\'attendance_missed\')')) {
  const newClosed = `if (member.email) {
              const emailEnabled = await isEmailEnabled('attendance_missed');
              if (emailEnabled) {
                sendPersonalizedEmail(
                  { email: member.email, fullName: member.fullName },
                  "attendance_missed",
                  \`Notice of Absence: \${sheet.title}\`,
                  \`Dear \${member.fullName},

This is to notify you that your attendance was not recorded for the following meeting:

Meeting: \${sheet.title}
Date: \${new Date(sheet.eventDate).toLocaleString()}
Location: \${sheet.location || "ZUCA"}

\${tone.actionRequired ? 'Please contact the meeting organizer to discuss any outstanding matters.' : 'We encourage you to attend future meetings to stay informed about ZUCA activities.'}

For any questions, please contact ZUCA administration.

Zetech University Catholic Action (ZUCA)\`,
                  { sheetTitle: sheet.title, meetingDate: sheet.eventDate }
                ).catch(err => console.error(\`Email failed for \${member.email}:\`, err.message));
              } else {
                console.log(\`📧 attendance_missed email disabled, skipping for \${member.email}\`);
              }
            }`;
  
  content = content.replace(closedMatch[0], newClosed);
  modified = true;
  console.log('✅ Fixed sendSheetClosedNotification email guard');
}

// 5. Fix admin report email in sendSheetClosedNotification
const adminReportPattern = /if\s*\(\s*sheet\.creator\.email\s*\)\s*\{[\s\S]*?sendPersonalizedEmail\([^)]*\)[\s\S]*?\}\)/g;
const adminMatch = content.match(adminReportPattern);
if (adminMatch && !content.includes('emailEnabled = await isEmailEnabled(\'attendance_admin_report\')')) {
  const newAdmin = `if (sheet.creator.email) {
              const emailEnabled = await isEmailEnabled('attendance_admin_report');
              if (emailEnabled) {
                const absentList = absentMembers.map(m => \`• \${m.fullName}\${m.specialRole ? \` (\${m.specialRole})\` : ''}\`).join('\\n');
                const presentList = presentMembers.map(m => \`• \${m.fullName}\${m.specialRole ? \` (\${m.specialRole})\` : ''}\`).join('\\n');
                
                sendPersonalizedEmail(
                  { email: sheet.creator.email, fullName: sheet.creator.fullName },
                  "attendance_admin_report",
                  \`Attendance Report: \${sheet.title}\`,
                  \`Dear \${sheet.creator.fullName},

Here is the official attendance report for "\${sheet.title}":

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MEETING SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\${meetingSummary}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRESENT (\${presentMembers.length})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\${presentList || "None"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ABSENT (\${absentMembers.length})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\${absentList || "None"}

This report is automatically generated by ZUCA attendance system.

Zetech University Catholic Action (ZUCA)\`,
                  { sheetTitle: sheet.title, presentCount: presentMembers.length, absentCount: absentMembers.length, presentList, absentList }
                ).catch(err => console.error("Admin email failed:", err.message));
              } else {
                console.log(\`📧 attendance_admin_report email disabled, skipping for \${sheet.creator.email}\`);
              }
            }`;
  
  content = content.replace(adminMatch[0], newAdmin);
  modified = true;
  console.log('✅ Fixed admin report email guard');
}

// 6. Fix sendReminderToUser
const reminderPattern = /if\s*\(\s*user\.email\s*\)\s*\{[\s\S]*?sendPersonalizedEmail\([^)]*\)[\s\S]*?\}\)/g;
const reminderMatch = content.match(reminderPattern);
if (reminderMatch && !content.includes('emailEnabled = await isEmailEnabled(\'attendance_reminder\')')) {
  const newReminder = `if (user.email) {
      const emailEnabled = await isEmailEnabled('attendance_reminder');
      if (emailEnabled) {
        await sendPersonalizedEmail(
          { email: user.email, fullName: user.fullName },
          "attendance_reminder",
          \`Meeting Reminder: \${sheet.title}\`,
          \`Dear \${user.fullName},

\${message}

Meeting Details:
- Title: \${sheet.title}
- Date: \${new Date(sheet.eventDate).toLocaleString()}
- Location: \${sheet.location || "ZUCA"}

Your attendance is appreciated.

Zetech University Catholic Action (ZUCA)\`,
          { sheetTitle: sheet.title }
        );
      } else {
        console.log(\`📧 attendance_reminder email disabled, skipping for \${user.email}\`);
      }
    }`;
  
  content = content.replace(reminderMatch[0], newReminder);
  modified = true;
  console.log('✅ Fixed sendReminderToUser email guard');
}

// Write the file if modified
if (modified) {
  fs.writeFileSync(filePath, content);
  console.log('\n✅ All email guards added successfully!');
  console.log('📁 File updated: routes/attendance.js');
} else {
  console.log('\n⚠️ No changes needed - file already has email guards');
}

console.log('\n📝 Next steps:');
console.log('1. Test with email enabled - should send emails');
console.log('2. Test with email disabled - should skip emails');
console.log('3. Check logs for "email disabled, skipping" messages');