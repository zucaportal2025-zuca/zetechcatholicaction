// frontend/src/pages/UserManual.jsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  FiDownload, FiPrinter, FiSearch, FiChevronDown, FiChevronRight, 
  FiHelpCircle, FiBookOpen, FiStar, FiHeart, FiMessageSquare,
  FiCalendar, FiMapPin, FiClock, FiShare2, FiCopy, FiEye,
  FiArrowLeft, FiUser, FiShield, FiAward
} from "react-icons/fi";
import { saveAs } from 'file-saver';
import logo from "../assets/zuca-logo.png";

export default function UserManual() {
  const navigate = useNavigate();
  const [expandedSections, setExpandedSections] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [downloadFormat, setDownloadFormat] = useState("html");
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user:", e);
      }
    }
  }, []);

  useEffect(() => {
    setIsMobile(window.innerWidth <= 768);
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Expand all sections for print/download
  const expandAllForExport = () => {
    const allExpanded = {};
    sections.forEach(s => { allExpanded[s.id] = true; });
    setExpandedSections(allExpanded);
  };

  const sections = [
    { id: "welcome", title: "🙏 Welcome to ZUCA", icon: "🎉", description: "Introduction to the portal", order: 1 },
    { id: "getting-started", title: "🚀 Getting Started", icon: "🚀", description: "Login and first steps", order: 2 },
    { id: "dashboard", title: "📊 Dashboard", icon: "📊", description: "Your personal dashboard overview", order: 3 },
    { id: "profile", title: "👤 Profile Settings", icon: "👤", description: "Update your profile", order: 4 },
    { id: "liturgical-calendar", title: "🗓️ Liturgical Calendar", icon: "🗓️", description: "Daily readings and seasons", order: 5 },
    { id: "gallery", title: "🖼️ Gallery", icon: "🖼️", description: "View photos and videos", order: 6 },
    { id: "join-jumuia", title: "👥 Join Jumuia", icon: "👥", description: "Find and join Jumuia groups", order: 7 },
    { id: "announcements", title: "📢 Announcements", icon: "📢", description: "View and read announcements", order: 8 },
    { id: "mass-programs", title: "⛪ Mass Programs", icon: "⛪", description: "View weekly mass programs", order: 9 },
    { id: "contributions", title: "💰 Contributions", icon: "💰", description: "Make pledges and track payments", order: 10 },
    { id: "hymn-book", title: "🎵 Hymn Book", icon: "🎵", description: "Browse and read hymns", order: 11 },
    { id: "my-jumuia", title: "🏠 My Jumuia", icon: "🏠", description: "Your Jumuia dashboard", order: 12 },
    { id: "chat", title: "💬 Community Chat", icon: "💬", description: "Chat with fellow members", order: 13 },
    { id: "ai-assistant", title: "🤖 ZUCA AI Assistant", icon: "🤖", description: "Your intelligent helper", order: 14 },
    { id: "roles", title: "👑 User Roles & Permissions", icon: "👑", description: "Understanding member roles", order: 15 },
    { id: "faq", title: "❓ FAQ", icon: "❓", description: "Frequently asked questions", order: 16 },
    { id: "troubleshooting", title: "🛠️ Troubleshooting", icon: "🛠️", description: "Common issues and fixes", order: 17 },
    { id: "tips", title: "💡 Pro Tips", icon: "💡", description: "Tips to enhance your experience", order: 18 }
  ];

  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  const filteredSections = sortedSections.filter(section =>
    section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.id.includes(searchTerm.toLowerCase()) ||
    section.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ============ CLEAN HTML CONTENT GENERATION ============
  const getManualHTML = () => {
    return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>ZUCA Portal - Member User Manual</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', 'Times New Roman', Arial, sans-serif; 
          max-width: 1000px; 
          margin: 0 auto; 
          padding: 40px; 
          background: white; 
          color: #1e293b; 
          line-height: 1.6;
        }
        h1 { 
          color: #3b82f6; 
          border-bottom: 3px solid #3b82f6; 
          padding-bottom: 15px; 
          margin-bottom: 20px;
          font-size: 28px;
        }
        h2 { 
          color: #1e293b; 
          margin-top: 30px; 
          margin-bottom: 15px;
          background: #f1f5f9; 
          padding: 12px 20px; 
          border-radius: 10px;
          font-size: 22px;
          border-left: 4px solid #3b82f6;
        }
        h3 { 
          color: #475569; 
          margin-top: 20px; 
          margin-bottom: 10px;
          font-size: 18px;
        }
        h4 {
          color: #3b82f6;
          margin: 15px 0 8px 0;
          font-size: 16px;
        }
        p { margin: 10px 0; font-size: 14px; }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 20px 0; 
          font-size: 13px;
        }
        th, td { 
          border: 1px solid #e2e8f0; 
          padding: 10px 12px; 
          text-align: left; 
        }
        th { 
          background: #f1f5f9; 
          font-weight: 600;
        }
        ul, ol { margin: 10px 0 10px 25px; }
        li { margin: 5px 0; font-size: 14px; }
        .tip { 
          background: #eff6ff; 
          border-left: 4px solid #3b82f6; 
          padding: 15px; 
          margin: 15px 0; 
          border-radius: 8px;
        }
        .warning { 
          background: #fef3c7; 
          border-left: 4px solid #f59e0b; 
          padding: 15px; 
          margin: 15px 0; 
          border-radius: 8px;
        }
        .success { 
          background: #d1fae5; 
          border-left: 4px solid #10b981; 
          padding: 15px; 
          margin: 15px 0; 
          border-radius: 8px;
        }
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          text-align: center;
          color: #94a3b8;
          font-size: 11px;
          border-top: 1px solid #e2e8f0;
        }
        .logo-area {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo-area img {
          width: 80px;
          height: auto;
        }
        .logo-area h1 {
          border: none;
          margin-top: 10px;
        }
        @media print {
          body { padding: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="logo-area">
        <img src="${logo}" alt="ZUCA Logo" style="width: 70px;" />
        <h1>ZUCA Portal User Manual</h1>
        <p>Hello , welcome to the ZUCA Portal User Manual • Version 2.0</p>
      </div>
      ${getAllSectionsHTML()}
      <div class="footer">
        <p>© ${new Date().getFullYear()} Zetech University Catholic Action (ZUCA)</p>
        <p>Built by CHRISTECH WEBSYS | Tumsifu Yesu Kristu! 🙏</p>
        <p>Last Updated: ${new Date().toLocaleDateString()}</p>
      </div>
    </body>
    </html>`;
  };

  const getAllSectionsHTML = () => {
    let html = '';
    for (const section of sections) {
      html += getSectionHTML(section.id);
    }
    return html;
  };

  const getSectionHTML = (sectionId) => {
    switch(sectionId) {
      case "welcome": return getWelcomeHTML();
      case "getting-started": return getGettingStartedHTML();
      case "dashboard": return getDashboardHTML();
      case "profile": return getProfileHTML();
      case "liturgical-calendar": return getCalendarHTML();
      case "gallery": return getGalleryHTML();
      case "join-jumuia": return getJoinJumuiaHTML();
      case "announcements": return getAnnouncementsHTML();
      case "mass-programs": return getMassProgramsHTML();
      case "contributions": return getContributionsHTML();
      case "hymn-book": return getHymnBookHTML();
      case "my-jumuia": return getMyJumuiaHTML();
      case "chat": return getChatHTML();
      case "ai-assistant": return getAIAssistantHTML();
      case "roles": return getRolesHTML();
      case "faq": return getFAQHTML();
      case "troubleshooting": return getTroubleshootingHTML();
      case "tips": return getTipsHTML();
      default: return "";
    }
  };

  const getWelcomeHTML = () => `
    <h2>🙏 Welcome to ZUCA Portal</h2>
    <p>Welcome to the <strong>Zetech University Catholic Action (ZUCA)</strong> Portal! This platform helps you stay connected with your faith community.</p>
    <div class="success">
      <strong>✨ What you can do on ZUCA Portal:</strong>
      <ul>
        <li>📢 Read announcements from the chaplaincy</li>
        <li>⛪ View weekly Mass programs and hymn lists</li>
        <li>🎵 Browse and read hymns from the hymn book</li>
        <li>🖼️ Explore photos and videos from events</li>
        <li>📅 Follow daily liturgical readings</li>
        <li>💰 Make pledges and track contributions</li>
        <li>👥 Join and participate in Jumuia groups</li>
        <li>💬 Chat with fellow members</li>
        <li>🤖 Get help from the ZUCA AI Assistant</li>
      </ul>
    </div>
  `;

  const getGettingStartedHTML = () => `
    <h2>🚀 Getting Started</h2>
    <h3>How to Log In</h3>
    <ol>
      <li>Go to the ZUCA Portal login page</li>
      <li>Enter your <strong>email address</strong> (the one you registered with)</li>
      <li>Enter your <strong>password</strong></li>
      <li>Click <strong>"Sign In"</strong></li>
    </ol>
    <h3>Forgot Password?</h3>
    <ol>
      <li>Click on <strong>"Forgot Password?"</strong> on the login page</li>
      <li>Enter your <strong>phone number</strong> and <strong>membership number</strong></li>
      <li>You will receive a <strong>6-digit code</strong></li>
      <li>Enter the code and create a new password</li>
    </ol>
    <div class="warning">
      <strong>⚠️ Important:</strong> Keep your password secure. Never share it with anyone.
    </div>
  `;

  const getDashboardHTML = () => `
    <h2>📊 Dashboard</h2>
    <p>The Dashboard is your home screen after logging in. It shows:</p>
    <ul>
      <li><strong>👤 Your Profile Card</strong> - Your name, role, and profile picture</li>
      <li><strong>📊 Quick Stats</strong> - Unread announcements, upcoming events, unread messages</li>
      <li><strong>🎯 Quick Actions</strong> - Fast access to important features</li>
      <li><strong>📰 Recent Activity</strong> - Latest announcements and updates</li>
    </ul>
    <h3>Sidebar Navigation</h3>
    <p>On the left side of your screen (or top on mobile), you'll find the navigation menu with all the sections covered in this manual.</p>
    <div class="tip">
      <strong>💡 Tip:</strong> Click the ZUCA AI button in the header to get help instantly!
    </div>
  `;

  const getProfileHTML = () => `
    <h2>👤 Profile Settings</h2>
    <h3>How to Update Your Profile:</h3>
    <ol>
      <li>Click on your <strong>profile picture or name</strong> in the top-right corner</li>
      <li>Select <strong>"Profile Settings"</strong></li>
      <li>Update your information and click <strong>"Save Changes"</strong></li>
    </ol>
    <h3>How to Change Your Password:</h3>
    <ol>
      <li>Go to <strong>Profile Settings</strong></li>
      <li>Click <strong>"Change Password"</strong></li>
      <li>Enter your current password and new password (minimum 6 characters)</li>
      <li>Click <strong>"Save Changes"</strong></li>
    </ol>
    <h3>How to Change Your Profile Picture:</h3>
    <ol>
      <li>Click the <strong>camera icon</strong> over your profile picture</li>
      <li>Select a photo from your device</li>
      <li><strong>Crop</strong> the image to your preference</li>
      <li>Click <strong>"Save & Upload"</strong></li>
    </ol>
    <div class="tip">
      <strong>💡 Tip:</strong> Use a clear profile picture so other members can recognize you!
    </div>
  `;

  const getCalendarHTML = () => `
    <h2>🗓️ Liturgical Calendar</h2>
    <p>Follow the Church's liturgical year with daily readings and celebrations.</p>
    <h3>Features:</h3>
    <ul>
      <li><strong>📅 Monthly View</strong> - See the entire month at a glance</li>
      <li><strong>📖 Daily Readings</strong> - Click any day to view full readings</li>
      <li><strong>🎨 Color Coding</strong> - Colors indicate liturgical seasons (Purple=Advent/Lent, Green=Ordinary Time, White=Christmas/Easter)</li>
      <li><strong>👑 Celebration Types</strong> - Icons show Solemnities (👑), Feasts (⭐), Memorials (🕊️)</li>
      <li><strong>⛪ Holy Days</strong> - Special badges for Holy Days of Obligation</li>
      <li><strong>🔍 Search</strong> - Search by date, keyword, Bible verse, or season</li>
    </ul>
    <div class="tip">
      <strong>💡 Tip:</strong> Tap on any date to see the full readings and click "View Full Readings" for complete scripture texts!
    </div>
  `;

  const getGalleryHTML = () => `
    <h2>🖼️ Gallery</h2>
    <p>View photos, videos, and audio from ZUCA events and activities.</p>
    <h3>Features:</h3>
    <ul>
      <li><strong>📸 Browse Media</strong> - Scroll through all uploaded content</li>
      <li><strong>🔥 Trending</strong> - See what's popular right now</li>
      <li><strong>🔍 Filter</strong> - Filter by Images, Videos, or Audio</li>
      <li><strong>🏷️ Category Filter</strong> - Sort by Mass, Fellowship, Outreach, Events, Retreats</li>
      <li><strong>❤️ Like</strong> - Show appreciation for media you enjoy</li>
      <li><strong>💬 Comment</strong> - Leave comments on photos and videos</li>
      <li><strong>📱 Share</strong> - Share media with others</li>
      <li><strong>📥 Download</strong> - Save images to your device</li>
    </ul>
    <div class="tip">
      <strong>💡 Tip:</strong> Click on any image or video to open it in full screen and see comments!
    </div>
  `;

  const getJoinJumuiaHTML = () => `
    <h2>👥 Join Jumuia</h2>
    <p>Join a Jumuia (small Christian community) to grow in faith together.</p>
    <h3>How to Join a Jumuia:</h3>
    <ol>
      <li>Go to <strong>"Join Jumuia"</strong> from the sidebar</li>
      <li>Browse the available Jumuia groups</li>
      <li>Read the description of each group</li>
      <li>Click <strong>"Join This Jumuia"</strong> on your chosen group</li>
      <li>Once joined, you'll see the <strong>"My Jumuia"</strong> section in your sidebar</li>
    </ol>
    <h3>Available Jumuia Groups:</h3>
    <ul>
      <li>🕊️ St. Michael Jumuia</li>
      <li>📖 St. Benedict Jumuia</li>
      <li>🙏 St. Peregrine Jumuia</li>
      <li>👑 Christ the King Jumuia</li>
      <li>🎵 St. Gregory Jumuia</li>
      <li>⚓ St. Pacificus Jumuia</li>
    </ul>
    <div class="warning">
      <strong>⚠️ Note:</strong> You can only join ONE Jumuia at a time. Choose the one where you feel most at home!
    </div>
  `;

  const getAnnouncementsHTML = () => `
    <h2>📢 Announcements</h2>
    <p>The Announcements section displays important updates from the chaplaincy and administrators.</p>
    <h3>Features:</h3>
    <ul>
      <li><strong>View Announcements</strong> - Read all official communications</li>
      <li><strong>Mark as Read</strong> - Announcements are automatically marked when viewed</li>
      <li><strong>Filter by Category</strong> - Sort by Mass, Events, General, etc.</li>
      <li><strong>Search</strong> - Find specific announcements by title or content</li>
    </ul>
    <div class="tip">
      <strong>💡 Tip:</strong> The number badge on the Announcements icon shows how many unread announcements you have!
    </div>
  `;

  const getMassProgramsHTML = () => `
    <h2>⛪ Mass Programs</h2>
    <p>View weekly Mass schedules and the hymns for each service.</p>
    <h3>What you can do:</h3>
    <ul>
      <li><strong>📅 View Mass Schedule</strong> - See dates, times, and venues</li>
      <li><strong>🎵 Browse Hymns</strong> - See all songs for each Mass part</li>
      <li><strong>👁️ View Hymn Lyrics</strong> - Click on any hymn to open the hymn book</li>
      <li><strong>📋 Copy Program</strong> - Copy the entire program to share</li>
      <li><strong>📱 Share via WhatsApp</strong> - Share the program with friends</li>
      <li><strong>📥 Download Program</strong> - Save as image, Word, or PDF</li>
      <li><strong>🖨️ Print Program</strong> - Print a physical copy</li>
      <li><strong>❤️ Favorite Programs</strong> - Save programs you like</li>
    </ul>
    <div class="tip">
      <strong>💡 Tip:</strong> Click on any hymn title to instantly open that hymn in the Hymn Book with full lyrics!
    </div>
  `;

  const getContributionsHTML = () => `
    <h2>💰 Contributions</h2>
    <p>Make pledges and track your contributions to various campaigns.</p>
    <h3>How to Make a Pledge:</h3>
    <ol>
      <li>Go to the <strong>Contributions</strong> section</li>
      <li>Find the campaign you want to support</li>
      <li>Click <strong>"+"</strong> to expand the campaign details</li>
      <li>Enter the <strong>amount</strong> you want to pledge</li>
      <li>Add an optional <strong>message</strong></li>
      <li>Click <strong>"Submit Pledge"</strong></li>
      <li>Wait for an administrator to approve your pledge</li>
    </ol>
    <h3>Pledge Status Meanings:</h3>
    <ul>
      <li><strong>🟡 PENDING</strong> - Your pledge is awaiting approval</li>
      <li><strong>🟢 APPROVED</strong> - Your pledge has been approved</li>
      <li><strong>🔵 COMPLETED</strong> - You've paid the full amount</li>
    </ul>
    <div class="tip">
      <strong>💡 Tip:</strong> You can message the treasurer directly by clicking the 💬 button next to the submit button!
    </div>
  `;

  const getHymnBookHTML = () => `
    <h2>🎵 Hymn Book</h2>
    <p>Browse all hymns with full lyrics, reference numbers, and first lines.</p>
    <h3>Features:</h3>
    <ul>
      <li><strong>🔍 Search</strong> - Search by title, lyrics, or reference number</li>
      <li><strong>❤️ Favorites</strong> - Save your favorite hymns for quick access</li>
      <li><strong>📋 Copy Lyrics</strong> - Copy hymn lyrics to clipboard</li>
      <li><strong>📥 Download</strong> - Save lyrics as image, PDF, Word, or text file</li>
      <li><strong>📱 Share</strong> - Share hymns via WhatsApp, Telegram, or Twitter</li>
      <li><strong>📖 View Full Lyrics</strong> - Click any hymn to see complete lyrics</li>
      <li><strong>🔤 Adjust Font Size</strong> - Make text larger or smaller for easier reading</li>
      <li><strong>🕒 Recently Viewed</strong> - Quick access to hymns you've seen before</li>
    </ul>
    <div class="tip">
      <strong>💡 Tip:</strong> Use the search bar to find hymns by typing any word from the title or lyrics!
    </div>
  `;

  const getMyJumuiaHTML = () => `
    <h2>🏠 My Jumuia</h2>
    <p>After joining a Jumuia, this section becomes your Jumuia dashboard.</p>
    <h3>What you can do in My Jumuia:</h3>
    <ul>
      <li><strong>💰 Jumuia Contributions</strong> - See and participate in group contribution campaigns</li>
      <li><strong>📢 Jumuia Announcements</strong> - Read group-specific updates from your Jumuia leader</li>
      <li><strong>💬 Jumuia Chat</strong> - Chat with fellow Jumuia members in a private group</li>
      <li><strong>📱 WhatsApp Group</strong> - Join the Jumuia WhatsApp community (after joining)</li>
    </ul>
    <div class="tip">
      <strong>💡 Tip:</strong> The WhatsApp group link becomes active only after you join the Jumuia!
    </div>
  `;

  const getChatHTML = () => `
    <h2>💬 Community Chat</h2>
    <p>Connect with fellow ZUCA members in real-time!</p>
    <h3>Chat Features:</h3>
    <ul>
      <li><strong>💬 Send Messages</strong> - Type and send messages to everyone</li>
      <li><strong>📎 Attach Files</strong> - Share images, videos, and documents</li>
      <li><strong>🎤 Voice Input</strong> - Use your microphone to type messages</li>
      <li><strong>😊 Emojis</strong> - Express yourself with emojis</li>
      <li><strong>↩️ Reply to Messages</strong> - Reply directly to specific messages</li>
      <li><strong>✏️ Edit Your Messages</strong> - Fix typos in your own messages</li>
      <li><strong>🗑️ Delete Messages</strong> - Remove your own messages</li>
      <li><strong>❤️ Reactions</strong> - Like messages with emoji reactions</li>
      <li><strong>📌 Pinned Messages</strong> - Important messages stay at the top</li>
      <li><strong>🔍 Search Messages</strong> - Find old messages by keyword</li>
      <li><strong>👥 See Who's Online</strong> - Check who's currently active</li>
    </ul>
    <h3>Message Actions:</h3>
    <ul>
      <li><strong>Mobile:</strong> Long press on any message to see action menu</li>
      <li><strong>Desktop:</strong> Right click on any message to see action menu</li>
    </ul>
    <div class="warning">
      <strong>⚠️ Community Guidelines:</strong> Be respectful, no offensive language, no spam, keep conversations faith-focused.
    </div>
  `;

  const getAIAssistantHTML = () => `
    <h2>🤖 ZUCA AI Assistant</h2>
    <p>Your intelligent virtual assistant to help you navigate the portal!</p>
    <h3>What You Can Ask:</h3>
    <table>
      <thead><tr><th>Command</th><th>What Happens</th></tr></thead>
      <tbody>
        <tr><td>📸 "Open Gallery"</td><td>Opens the media gallery</td></tr>
        <tr><td>🎵 "Open Hymn Book"</td><td>Opens all hymns</td></tr>
        <tr><td>📖 "Show lyrics for [song]"</td><td>Opens exact hymn page</td></tr>
        <tr><td>💰 "What do I owe?"</td><td>Shows your pending pledges</td></tr>
        <tr><td>💵 "I want to give 5000"</td><td>Creates a pledge</td></tr>
        <tr><td>💬 "Tell everyone hello"</td><td>Sends message to chat</td></tr>
        <tr><td>🔔 "Read notifications"</td><td>Shows all unread notifications</td></tr>
        <tr><td>✅ "Mark all as read"</td><td>Clears all notifications</td></tr>
        <tr><td>👤 "Who am I?"</td><td>Shows your profile info</td></tr>
        <tr><td>⛪ "When is mass?"</td><td>Shows upcoming Mass schedule</td></tr>
        <tr><td>🏠 "What jumuia groups?"</td><td>Lists all Jumuia groups</td></tr>
      </tbody>
    </table>
    <div class="tip">
      <strong>💡 Tip:</strong> Try asking "Show lyrics for Amazing Grace" to instantly open that hymn!
    </div>
  `;

  const getRolesHTML = () => `
    <h2>👑 User Roles & Permissions</h2>
    <p>ZUCA Portal has different user roles with specific permissions. Here's what each role can do:</p>
    
    <h3>👤 Regular Member</h3>
    <ul>
      <li>View announcements and mass programs</li>
      <li>Browse hymns and view lyrics</li>
      <li>Make pledges and contributions</li>
      <li>Join a Jumuia group</li>
      <li>Participate in community chat</li>
      <li>Update profile and change password</li>
    </ul>

    <h3>👑 Jumuia Leader</h3>
    <ul>
      <li>All regular member permissions</li>
      <li>Manage their Jumuia group</li>
      <li>Create Jumuia announcements</li>
      <li>Moderate Jumuia chat</li>
      <li>View Jumuia member list</li>
      <li>Approve Jumuia contributions</li>
    </ul>

    <h3>💰 Treasurer</h3>
    <ul>
      <li>View all contributions and pledges</li>
      <li>Approve member pledges</li>
      <li>Add manual payments</li>
      <li>Create contribution campaigns</li>
      <li>Export contribution reports</li>
    </ul>

    <h3>📝 Secretary</h3>
    <ul>
      <li>Create and manage announcements</li>
      <li>Upload media to gallery</li>
      <li>Manage hymn book</li>
    </ul>

    <h3>🎵 Choir Moderator</h3>
    <ul>
      <li>Create and edit mass programs</li>
      <li>Manage hymns in the hymn book</li>
      <li>Add lyrics to pending songs</li>
    </ul>

    <h3>📸 Media Moderator</h3>
    <ul>
      <li>Upload and manage gallery media</li>
      <li>Delete inappropriate media</li>
      <li>Feature important content</li>
    </ul>

    <div class="tip">
      <strong>💡 How are roles assigned?</strong><br/>
      Special roles (Jumuia Leader, Treasurer, Secretary, Choir Moderator, Media Moderator) are assigned by administrators (Admins) only. If you need a specific role, contact the ZUCA administrator.
    </div>

    <div class="warning">
      <strong>⚠️ Role Login:</strong> Users with special roles can login using their email and a role-specific password format (e.g., "stmichaelZ#001" for Jumuia Leader).
    </div>
  `;

  const getFAQHTML = () => `
    <h2>❓ Frequently Asked Questions</h2>
    
    <h4>❓ How do I reset my password?</h4>
    <p>Click "Forgot Password?" on the login page, enter your phone number and membership number, then follow the instructions.</p>
    
    <h4>❓ Can I join more than one Jumuia?</h4>
    <p>No, each member can only belong to one Jumuia at a time. This helps build stronger community bonds.</p>
    
    <h4>❓ How do I know if my pledge was approved?</h4>
    <p>You'll receive a notification and the status will change from "PENDING" to "APPROVED" in your Contributions section.</p>
    
    <h4>❓ Why can't I see the WhatsApp group link?</h4>
    <p>You need to join the Jumuia first. After joining, the WhatsApp link will become active and clickable.</p>
    
    <h4>❓ How do I save my favorite hymns?</h4>
    <p>Click the heart icon (❤️) next to any hymn. Favorites will appear when you toggle the "Favorites" filter.</p>
    
    <h4>❓ Can I edit or delete my chat messages?</h4>
    <p>Yes! Long press (mobile) or right-click (desktop) on your message to see Edit and Delete options.</p>
    
    <h4>❓ How do I change my profile picture?</h4>
    <p>Click your profile picture, then "Profile Settings". Click the camera icon to upload a new photo.</p>
    
    <h4>❓ What if I forget my membership number?</h4>
    <p>Contact the ZUCA secretary or administrator. They can provide your membership number.</p>
    
    <h4>❓ How do I get a special role (like Jumuia Leader)?</h4>
    <p>Only administrators can assign special roles. Contact the ZUCA admin and request the role you need.</p>
  `;

  const getTroubleshootingHTML = () => `
    <h2>🛠️ Troubleshooting</h2>
    
    <div class="warning">
      <h4>⚠️ I can't log in</h4>
      <p><strong>Solutions:</strong> Check your email and password. Use "Forgot Password" if needed. Ensure you're using the correct email address you registered with.</p>
    </div>
    
    <div class="warning">
      <h4>⚠️ The page is loading slowly</h4>
      <p><strong>Solutions:</strong> Check your internet connection. Try refreshing the page. Clear your browser cache if the problem persists.</p>
    </div>
    
    <div class="warning">
      <h4>⚠️ Images aren't displaying</h4>
      <p><strong>Solutions:</strong> Refresh the page. Check your internet connection. Try logging out and back in.</p>
    </div>
    
    <div class="warning">
      <h4>⚠️ I'm not receiving notifications</h4>
      <p><strong>Solutions:</strong> Check your browser notification settings. Make sure you clicked "Allow" when prompted. Refresh the page.</p>
    </div>
    
    <div class="warning">
      <h4>⚠️ My pledge is stuck on "PENDING"</h4>
      <p><strong>Solutions:</strong> Wait for admin approval (usually within 24-48 hours). You can message the treasurer using the 💬 button.</p>
    </div>
    
    <div class="warning">
      <h4>⚠️ I can't find a hymn I'm looking for</h4>
      <p><strong>Solutions:</strong> Try different search keywords. Check the spelling. The hymn might not be in the database yet.</p>
    </div>
    
    <div class="warning">
      <h4>⚠️ The chat isn't loading messages</h4>
      <p><strong>Solutions:</strong> Refresh the page. Check your internet connection. Log out and log back in.</p>
    </div>
  `;

  const getTipsHTML = () => `
    <h2>💡 Pro Tips</h2>
    
    <div class="tip">
      <strong>🔥 Tip 1: Use Keyboard Shortcuts</strong>
      <p>Press <strong>Enter</strong> to send messages in chat. Use <strong>Shift + Enter</strong> for new lines.</p>
    </div>
    
    <div class="tip">
      <strong>🔥 Tip 2: Install as App</strong>
      <p>On mobile, tap "Add to Home Screen" to use ZUCA Portal like a native app!</p>
    </div>
    
    <div class="tip">
      <strong>🔥 Tip 3: Enable Push Notifications</strong>
      <p>Allow notifications to never miss important announcements or pledge updates.</p>
    </div>
    
    <div class="tip">
      <strong>🔥 Tip 4: Use Voice Search</strong>
      <p>Use the microphone in the AI Assistant or chat to type with your voice.</p>
    </div>
    
    <div class="tip">
      <strong>🔥 Tip 5: Download Programs for Offline</strong>
      <p>Download Mass Programs as images or PDFs to view them even without internet.</p>
    </div>
    
    <div class="tip">
      <strong>🔥 Tip 6: Bookmark This Manual</strong>
      <p>Save this page for quick reference whenever you need help!</p>
    </div>
    
    <div class="tip">
      <strong>🔥 Tip 7: Use the AI Assistant</strong>
      <p>The ZUCA AI can help you navigate faster. Try asking "Open Gallery" or "Show me my profile"!</p>
    </div>
  `;

  // ============ DOWNLOAD FUNCTIONS ============
  const downloadAsHTML = () => {
    const html = getManualHTML();
    const blob = new Blob([html], { type: 'text/html' });
    saveAs(blob, `zuca-user-manual-${new Date().toISOString().split('T')[0]}.html`);
  };

  const downloadAsPDF = () => { 
    expandAllForExport();
    setTimeout(() => window.print(), 100);
  };
  
  const downloadAsDOC = () => {
    const html = getManualHTML();
    // Create a cleaner Word document version
    const docHtml = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>ZUCA Portal User Manual</title>
      <style>
        body { font-family: 'Times New Roman', Times, serif; margin: 1in; line-height: 1.5; }
        h1 { color: #3b82f6; }
        h2 { background: #f1f5f9; padding: 10px; }
        table { border-collapse: collapse; width: 100%; margin: 15px 0; }
        th, td { border: 1px solid #ccc; padding: 8px; }
        .tip { background: #eff6ff; padding: 12px; margin: 10px 0; }
        .warning { background: #fef3c7; padding: 12px; margin: 10px 0; }
        .success { background: #d1fae5; padding: 12px; margin: 10px 0; }
      </style>
    </head>
    <body>
      ${getAllSectionsHTML()}
    </body>
    </html>`;
    const blob = new Blob([docHtml], { type: 'application/msword' });
    saveAs(blob, `zuca-user-manual-${new Date().toISOString().split('T')[0]}.doc`);
  };

  const handleDownload = () => {
    if (downloadFormat === 'html') downloadAsHTML();
    else if (downloadFormat === 'pdf') downloadAsPDF();
    else if (downloadFormat === 'doc') downloadAsDOC();
  };

  const goBack = () => navigate('/dashboard');

  // Render the main component
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={styles.container}
    >
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <motion.button
            whileHover={{ scale: 1.05, x: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={goBack}
            style={styles.backButton}
          >
            <FiArrowLeft size={20} />
            <span>Back to Dashboard</span>
          </motion.button>
          <div>
            <h1 style={styles.title}>
  Hello {user?.fullName?.split(" ")[0]}! Here is 📖 ZUCA Portal User Manual
</h1>
            <p style={styles.subtitle}>Complete guide for Zetech University Catholic Action members</p>
          </div>
        </div>
        <div style={styles.headerActions}>
          <div style={styles.downloadGroup}>
            <select value={downloadFormat} onChange={(e) => setDownloadFormat(e.target.value)} style={styles.formatSelect}>
              <option value="html">📄 HTML</option>
              <option value="pdf">📑 PDF (Print)</option>
              <option value="doc">📝 Word Document</option>
            </select>
            <button onClick={handleDownload} style={styles.downloadBtn}>
              <FiDownload size={16} /> Download
            </button>
          </div>
          <button onClick={() => window.print()} style={styles.printBtn}>
            <FiPrinter size={16} /> Print
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div style={styles.searchContainer}>
        <FiSearch size={18} style={styles.searchIcon} />
        <input
          type="text"
          placeholder="Search manual sections..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm("")} style={styles.searchClear}>✕</button>
        )}
      </div>

      {/* Quick Navigation */}
      <div style={styles.navContainer}>
        <h3 style={styles.navTitle}>📑 Quick Navigation</h3>
        <div style={styles.navGrid}>
          {filteredSections.map(section => (
            <button
              key={section.id}
              onClick={() => {
                document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                toggleSection(section.id);
              }}
              style={styles.navButton}
            >
              <span style={styles.navIcon}>{section.icon}</span>
              <div>
                <div style={styles.navButtonTitle}>{section.title}</div>
                <div style={styles.navButtonDesc}>{section.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div id="manual-content" style={styles.contentContainer}>
        {/* Welcome Section */}
        <div id="welcome" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection("welcome")}>
            <h2 style={styles.sectionTitle}>🙏 Welcome to ZUCA Portal</h2>
            <span style={styles.toggleIcon}>{expandedSections["welcome"] ? <FiChevronDown size={20} /> : <FiChevronRight size={20} />}</span>
          </div>
          {expandedSections["welcome"] && (
            <div style={styles.sectionContent}>
              <p>Welcome to the <strong>Zetech University Catholic Action (ZUCA)</strong> Portal! This platform helps you stay connected with your faith community.</p>
              <div style={styles.success}>
                <strong>✨ What you can do on ZUCA Portal:</strong>
                <ul style={styles.list}>
                  <li>📢 Read announcements from the chaplaincy</li>
                  <li>⛪ View weekly Mass programs and hymn lists</li>
                  <li>🎵 Browse and read hymns from the hymn book</li>
                  <li>🖼️ Explore photos and videos from events</li>
                  <li>📅 Follow daily liturgical readings</li>
                  <li>💰 Make pledges and track contributions</li>
                  <li>👥 Join and participate in Jumuia groups</li>
                  <li>💬 Chat with fellow members</li>
                  <li>🤖 Get help from the ZUCA {user?.fullName?.split(" ")[0]}! Assistant</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Getting Started */}
        <div id="getting-started" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection("getting-started")}>
            <h2 style={styles.sectionTitle}>🚀 Getting Started</h2>
            <span style={styles.toggleIcon}>{expandedSections["getting-started"] ? <FiChevronDown size={20} /> : <FiChevronRight size={20} />}</span>
          </div>
          {expandedSections["getting-started"] && (
            <div style={styles.sectionContent}>
              <h3>How to Log In</h3>
              <ol style={styles.list}>
                <li>Go to the ZUCA Portal login page</li>
                <li>Enter your <strong>email address</strong> (the one you registered with)</li>
                <li>Enter your <strong>password</strong></li>
                <li>Click <strong>"Sign In"</strong></li>
              </ol>
              <h3>Forgot Password?</h3>
              <ol style={styles.list}>
                <li>Click on <strong>"Forgot Password?"</strong> on the login page</li>
                <li>Enter your <strong>phone number</strong> and <strong>membership number</strong></li>
                <li>You will receive a <strong>6-digit code</strong></li>
                <li>Enter the code and create a new password</li>
              </ol>
              <div style={styles.warning}>
                <strong>⚠️ Important:</strong> Keep your password secure. Never share it with anyone.
              </div>
            </div>
          )}
        </div>

        {/* Dashboard */}
        <div id="dashboard" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection("dashboard")}>
            <h2 style={styles.sectionTitle}>📊 Dashboard</h2>
            <span style={styles.toggleIcon}>{expandedSections["dashboard"] ? <FiChevronDown size={20} /> : <FiChevronRight size={20} />}</span>
          </div>
          {expandedSections["dashboard"] && (
            <div style={styles.sectionContent}>
              <p>The Dashboard is your home screen after logging in. It shows:</p>
              <ul style={styles.list}>
                <li><strong>👤 Your Profile Card</strong> - Your name, role, and profile picture</li>
                <li><strong>📊 Quick Stats</strong> - Unread announcements, upcoming events, unread messages</li>
                <li><strong>🎯 Quick Actions</strong> - Fast access to important features</li>
                <li><strong>📰 Recent Activity</strong> - Latest announcements and updates</li>
              </ul>
              <h3>Sidebar Navigation</h3>
              <p>On the left side of your screen (or top on mobile), you'll find the navigation menu with all the sections covered in this manual.</p>
              <div style={styles.tip}>
                <strong>💡 Tip:</strong> Click the ZUCA {user?.fullName?.split(" ")[0]} button in the header to get help instantly!
              </div>
            </div>
          )}
        </div>

        {/* Profile Settings */}
        <div id="profile" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection("profile")}>
            <h2 style={styles.sectionTitle}>👤 Profile Settings</h2>
            <span style={styles.toggleIcon}>{expandedSections["profile"] ? <FiChevronDown size={20} /> : <FiChevronRight size={20} />}</span>
          </div>
          {expandedSections["profile"] && (
            <div style={styles.sectionContent}>
              <h3>How to Update Your Profile:</h3>
              <ol style={styles.list}>
                <li>Click on your <strong>profile picture or name</strong> in the top-right corner</li>
                <li>Select <strong>"Profile Settings"</strong></li>
                <li>Update your information and click <strong>"Save Changes"</strong></li>
              </ol>
              <h3>How to Change Your Password:</h3>
              <ol style={styles.list}>
                <li>Go to <strong>Profile Settings</strong></li>
                <li>Click <strong>"Change Password"</strong></li>
                <li>Enter your current password and new password (minimum 6 characters)</li>
                <li>Click <strong>"Save Changes"</strong></li>
              </ol>
              <h3>How to Change Your Profile Picture:</h3>
              <ol style={styles.list}>
                <li>Click the <strong>camera icon</strong> over your profile picture</li>
                <li>Select a photo from your device</li>
                <li><strong>Crop</strong> the image to your preference</li>
                <li>Click <strong>"Save & Upload"</strong></li>
              </ol>
              <div style={styles.tip}>
                <strong>💡 Tip:</strong> Use a clear profile picture so other members can recognize you!
              </div>
            </div>
          )}
        </div>

        {/* Liturgical Calendar */}
        <div id="liturgical-calendar" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection("liturgical-calendar")}>
            <h2 style={styles.sectionTitle}>🗓️ Liturgical Calendar</h2>
            <span style={styles.toggleIcon}>{expandedSections["liturgical-calendar"] ? <FiChevronDown size={20} /> : <FiChevronRight size={20} />}</span>
          </div>
          {expandedSections["liturgical-calendar"] && (
            <div style={styles.sectionContent}>
              <p>Follow the Church's liturgical year with daily readings and celebrations.</p>
              <h3>Features:</h3>
              <ul style={styles.list}>
                <li><strong>📅 Monthly View</strong> - See the entire month at a glance</li>
                <li><strong>📖 Daily Readings</strong> - Click any day to view full readings</li>
                <li><strong>🎨 Color Coding</strong> - Colors indicate liturgical seasons</li>
                <li><strong>👑 Celebration Types</strong> - Icons show Solemnities, Feasts, Memorials</li>
                <li><strong>⛪ Holy Days</strong> - Special badges for Holy Days of Obligation</li>
                <li><strong>🔍 Search</strong> - Search by date, keyword, Bible verse, or season</li>
              </ul>
              <div style={styles.tip}>
                <strong>💡 Tip:</strong> Tap on any date to see the full readings for that day!
              </div>
            </div>
          )}
        </div>

        {/* Gallery */}
        <div id="gallery" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection("gallery")}>
            <h2 style={styles.sectionTitle}>🖼️ Gallery</h2>
            <span style={styles.toggleIcon}>{expandedSections["gallery"] ? <FiChevronDown size={20} /> : <FiChevronRight size={20} />}</span>
          </div>
          {expandedSections["gallery"] && (
            <div style={styles.sectionContent}>
              <p>View photos, videos, and audio from ZUCA events and activities.</p>
              <h3>Features:</h3>
              <ul style={styles.list}>
                <li><strong>📸 Browse Media</strong> - Scroll through all uploaded content</li>
                <li><strong>🔥 Trending</strong> - See what's popular right now</li>
                <li><strong>🔍 Filter</strong> - Filter by Images, Videos, or Audio</li>
                <li><strong>🏷️ Category Filter</strong> - Sort by Mass, Fellowship, Outreach, Events, Retreats</li>
                <li><strong>❤️ Like</strong> - Show appreciation for media you enjoy</li>
                <li><strong>💬 Comment</strong> - Leave comments on photos and videos</li>
                <li><strong>📱 Share</strong> - Share media with others</li>
                <li><strong>📥 Download</strong> - Save images to your device</li>
              </ul>
              <div style={styles.tip}>
                <strong>💡 Tip:</strong> Click on any image or video to open it in full screen and see comments from other members!
              </div>
            </div>
          )}
        </div>

        {/* Join Jumuia */}
        <div id="join-jumuia" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection("join-jumuia")}>
            <h2 style={styles.sectionTitle}>👥 Join Jumuia</h2>
            <span style={styles.toggleIcon}>{expandedSections["join-jumuia"] ? <FiChevronDown size={20} /> : <FiChevronRight size={20} />}</span>
          </div>
          {expandedSections["join-jumuia"] && (
            <div style={styles.sectionContent}>
              <p>Join a Jumuia (small Christian community) to grow in faith together.</p>
              <h3>How to Join a Jumuia:</h3>
              <ol style={styles.list}>
                <li>Go to <strong>"Join Jumuia"</strong> from the sidebar</li>
                <li>Browse the available Jumuia groups</li>
                <li>Read the description of each group</li>
                <li>Click <strong>"Join This Jumuia"</strong> on your chosen group</li>
                <li>Once joined, you'll see the <strong>"My Jumuia"</strong> section in your sidebar</li>
              </ol>
              <h3>Available Jumuia Groups:</h3>
              <ul style={styles.list}>
                <li>🕊️ St. Michael Jumuia</li>
                <li>📖 St. Benedict Jumuia</li>
                <li>🙏 St. Peregrine Jumuia</li>
                <li>👑 Christ the King Jumuia</li>
                <li>🎵 St. Gregory Jumuia</li>
                <li>⚓ St. Pacificus Jumuia</li>
              </ul>
              <div style={styles.warning}>
                <strong>⚠️ Note:</strong> You can only join ONE Jumuia at a time. Choose the one where you feel most at home!
              </div>
            </div>
          )}
        </div>

        {/* Announcements */}
        <div id="announcements" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection("announcements")}>
            <h2 style={styles.sectionTitle}>📢 Announcements</h2>
            <span style={styles.toggleIcon}>{expandedSections["announcements"] ? <FiChevronDown size={20} /> : <FiChevronRight size={20} />}</span>
          </div>
          {expandedSections["announcements"] && (
            <div style={styles.sectionContent}>
              <p>The Announcements section displays important updates from the chaplaincy and administrators.</p>
              <h3>Features:</h3>
              <ul style={styles.list}>
                <li><strong>View Announcements</strong> - Read all official communications</li>
                <li><strong>Mark as Read</strong> - Announcements are automatically marked when viewed</li>
                <li><strong>Filter by Category</strong> - Sort by Mass, Events, General, etc.</li>
                <li><strong>Search</strong> - Find specific announcements by title or content</li>
              </ul>
              <div style={styles.tip}>
                <strong>💡 Tip:</strong> The number badge on the Announcements icon shows how many unread announcements you have!
              </div>
            </div>
          )}
        </div>

        {/* Mass Programs */}
        <div id="mass-programs" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection("mass-programs")}>
            <h2 style={styles.sectionTitle}>⛪ Mass Programs</h2>
            <span style={styles.toggleIcon}>{expandedSections["mass-programs"] ? <FiChevronDown size={20} /> : <FiChevronRight size={20} />}</span>
          </div>
          {expandedSections["mass-programs"] && (
            <div style={styles.sectionContent}>
              <p>View weekly Mass schedules and the hymns for each service.</p>
              <h3>What you can do:</h3>
              <ul style={styles.list}>
                <li><strong>📅 View Mass Schedule</strong> - See dates, times, and venues</li>
                <li><strong>🎵 Browse Hymns</strong> - See all songs for each Mass part</li>
                <li><strong>👁️ View Hymn Lyrics</strong> - Click on any hymn to open the hymn book</li>
                <li><strong>📋 Copy Program</strong> - Copy the entire program to share</li>
                <li><strong>📱 Share via WhatsApp</strong> - Share the program with friends</li>
                <li><strong>📥 Download Program</strong> - Save as image, Word, or PDF</li>
                <li><strong>🖨️ Print Program</strong> - Print a physical copy</li>
                <li><strong>❤️ Favorite Programs</strong> - Save programs you like</li>
              </ul>
              <div style={styles.tip}>
                <strong>💡 Tip:</strong> Click on any hymn title to instantly open that hymn in the Hymn Book with full lyrics!
              </div>
            </div>
          )}
        </div>

        {/* Contributions */}
        <div id="contributions" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection("contributions")}>
            <h2 style={styles.sectionTitle}>💰 Contributions</h2>
            <span style={styles.toggleIcon}>{expandedSections["contributions"] ? <FiChevronDown size={20} /> : <FiChevronRight size={20} />}</span>
          </div>
          {expandedSections["contributions"] && (
            <div style={styles.sectionContent}>
              <p>Make pledges and track your contributions to various campaigns.</p>
              <h3>How to Make a Pledge:</h3>
              <ol style={styles.list}>
                <li>Go to the <strong>Contributions</strong> section</li>
                <li>Find the campaign you want to support</li>
                <li>Click <strong>"+"</strong> to expand the campaign details</li>
                <li>Enter the <strong>amount</strong> you want to pledge</li>
                <li>Add an optional <strong>message</strong></li>
                <li>Click <strong>"Submit Pledge"</strong></li>
                <li>Wait for an administrator to approve your pledge</li>
              </ol>
              <h3>Pledge Status Meanings:</h3>
              <ul style={styles.list}>
                <li><strong>🟡 PENDING</strong> - Your pledge is awaiting approval</li>
                <li><strong>🟢 APPROVED</strong> - Your pledge has been approved</li>
                <li><strong>🔵 COMPLETED</strong> - You've paid the full amount</li>
              </ul>
              <div style={styles.tip}>
                <strong>💡 Tip:</strong> You can message the treasurer directly by clicking the 💬 button next to the submit button!
              </div>
            </div>
          )}
        </div>

        {/* Hymn Book */}
        <div id="hymn-book" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection("hymn-book")}>
            <h2 style={styles.sectionTitle}>🎵 Hymn Book</h2>
            <span style={styles.toggleIcon}>{expandedSections["hymn-book"] ? <FiChevronDown size={20} /> : <FiChevronRight size={20} />}</span>
          </div>
          {expandedSections["hymn-book"] && (
            <div style={styles.sectionContent}>
              <p>Browse all hymns with full lyrics, reference numbers, and first lines.</p>
              <h3>Features:</h3>
              <ul style={styles.list}>
                <li><strong>🔍 Search</strong> - Search by title, lyrics, or reference number</li>
                <li><strong>❤️ Favorites</strong> - Save your favorite hymns for quick access</li>
                <li><strong>📋 Copy Lyrics</strong> - Copy hymn lyrics to clipboard</li>
                <li><strong>📥 Download</strong> - Save lyrics as image, PDF, Word, or text file</li>
                <li><strong>📱 Share</strong> - Share hymns via WhatsApp, Telegram, or Twitter</li>
                <li><strong>📖 View Full Lyrics</strong> - Click any hymn to see complete lyrics</li>
                <li><strong>🔤 Adjust Font Size</strong> - Make text larger or smaller for easier reading</li>
                <li><strong>🕒 Recently Viewed</strong> - Quick access to hymns you've seen before</li>
              </ul>
              <div style={styles.tip}>
                <strong>💡 Tip:</strong> Use the search bar to find hymns by typing any word from the title or lyrics!
              </div>
            </div>
          )}
        </div>

        {/* My Jumuia */}
        <div id="my-jumuia" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection("my-jumuia")}>
            <h2 style={styles.sectionTitle}>🏠 My Jumuia</h2>
            <span style={styles.toggleIcon}>{expandedSections["my-jumuia"] ? <FiChevronDown size={20} /> : <FiChevronRight size={20} />}</span>
          </div>
          {expandedSections["my-jumuia"] && (
            <div style={styles.sectionContent}>
              <p>After joining a Jumuia, this section becomes your Jumuia dashboard.</p>
              <h3>What you can do in My Jumuia:</h3>
              <ul style={styles.list}>
                <li><strong>💰 Jumuia Contributions</strong> - See and participate in group contribution campaigns</li>
                <li><strong>📢 Jumuia Announcements</strong> - Read group-specific updates from your Jumuia leader</li>
                <li><strong>💬 Jumuia Chat</strong> - Chat with fellow Jumuia members in a private group</li>
                <li><strong>📱 WhatsApp Group</strong> - Join the Jumuia WhatsApp community (after joining)</li>
              </ul>
              <div style={styles.tip}>
                <strong>💡 Tip:</strong> The WhatsApp group link becomes active only after you join the Jumuia!
              </div>
            </div>
          )}
        </div>

        {/* Chat */}
        <div id="chat" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection("chat")}>
            <h2 style={styles.sectionTitle}>💬 Community Chat</h2>
            <span style={styles.toggleIcon}>{expandedSections["chat"] ? <FiChevronDown size={20} /> : <FiChevronRight size={20} />}</span>
          </div>
          {expandedSections["chat"] && (
            <div style={styles.sectionContent}>
              <p>Connect with fellow ZUCA members in real-time!</p>
              <h3>Chat Features:</h3>
              <ul style={styles.list}>
                <li><strong>💬 Send Messages</strong> - Type and send messages to everyone</li>
                <li><strong>📎 Attach Files</strong> - Share images, videos, and documents</li>
                <li><strong>🎤 Voice Input</strong> - Use your microphone to type messages</li>
                <li><strong>😊 Emojis</strong> - Express yourself with emojis</li>
                <li><strong>↩️ Reply to Messages</strong> - Reply directly to specific messages</li>
                <li><strong>✏️ Edit Your Messages</strong> - Fix typos in your own messages</li>
                <li><strong>🗑️ Delete Messages</strong> - Remove your own messages</li>
                <li><strong>❤️ Reactions</strong> - Like messages with emoji reactions</li>
                <li><strong>📌 Pinned Messages</strong> - Important messages stay at the top</li>
                <li><strong>🔍 Search Messages</strong> - Find old messages by keyword</li>
                <li><strong>👥 See Who's Online</strong> - Check who's currently active</li>
              </ul>
              <h3>Message Actions:</h3>
              <ul style={styles.list}>
                <li><strong>Mobile:</strong> Long press on any message to see action menu</li>
                <li><strong>Desktop:</strong> Right click on any message to see action menu</li>
              </ul>
              <div style={styles.warning}>
                <strong>⚠️ Community Guidelines:</strong> Be respectful, no offensive language, no spam, keep conversations faith-focused.
              </div>
            </div>
          )}
        </div>

        {/* AI Assistant */}
        <div id="ai-assistant" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection("ai-assistant")}>
            <h2 style={styles.sectionTitle}>🤖 ZUCA {user?.fullName?.split(" ")[0]}! Assistant</h2>
            <span style={styles.toggleIcon}>{expandedSections["ai-assistant"] ? <FiChevronDown size={20} /> : <FiChevronRight size={20} />}</span>
          </div>
          {expandedSections["ai-assistant"] && (
            <div style={styles.sectionContent}>
              <p>Your intelligent virtual assistant to help you navigate the portal!</p>
              <h3>What You Can Ask:</h3>
              <table style={styles.table}>
                <thead><tr><th>Command</th><th>What Happens</th></tr></thead>
                <tbody>
                  <tr><td>📸 "Open Gallery"</td><td>Opens the media gallery</td></tr>
                  <tr><td>🎵 "Open Hymn Book"</td><td>Opens all hymns</td></tr>
                  <tr><td>📖 "Show lyrics for [song]"</td><td>Opens exact hymn page</td></tr>
                  <tr><td>💰 "What do I owe?"</td><td>Shows your pending pledges</td></tr>
                  <tr><td>💵 "I want to give 5000"</td><td>Creates a pledge</td></tr>
                  <tr><td>💬 "Tell everyone hello"</td><td>Sends message to chat</td></tr>
                  <tr><td>🔔 "Read notifications"</td><td>Shows all unread notifications</td></tr>
                  <tr><td>✅ "Mark all as read"</td><td>Clears all notifications</td></tr>
                  <tr><td>👤 "Who am I?"</td><td>Shows your profile info</td></tr>
                  <tr><td>⛪ "When is mass?"</td><td>Shows upcoming Mass schedule</td></tr>
                  <tr><td>🏠 "What jumuia groups?"</td><td>Lists all Jumuia groups</td></tr>
                </tbody>
              </table>
              <div style={styles.tip}>
                <strong>💡 Tip:</strong> Try asking "Show lyrics for Amazing Grace" to instantly open that hymn!
              </div>
            </div>
          )}
        </div>

        {/* User Roles & Permissions */}
        <div id="roles" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection("roles")}>
            <h2 style={styles.sectionTitle}>👑 User Roles & Permissions</h2>
            <span style={styles.toggleIcon}>{expandedSections["roles"] ? <FiChevronDown size={20} /> : <FiChevronRight size={20} />}</span>
          </div>
          {expandedSections["roles"] && (
            <div style={styles.sectionContent}>
              <p>ZUCA Portal has different user roles with specific permissions. Here's what each role can do:</p>
              
              <h3>👤 Regular Member</h3>
              <ul style={styles.list}>
                <li>View announcements and mass programs</li>
                <li>Browse hymns and view lyrics</li>
                <li>Make pledges and contributions</li>
                <li>Join a Jumuia group</li>
                <li>Participate in community chat</li>
                <li>Update profile and change password</li>
              </ul>

              <h3>👑 Jumuia Leader</h3>
              <ul style={styles.list}>
                <li>All regular member permissions</li>
                <li>Manage their Jumuia group</li>
                <li>Create Jumuia announcements</li>
                <li>Moderate Jumuia chat</li>
                <li>View Jumuia member list</li>
                <li>Approve Jumuia contributions</li>
              </ul>

              <h3>💰 Treasurer</h3>
              <ul style={styles.list}>
                <li>View all contributions and pledges</li>
                <li>Approve member pledges</li>
                <li>Add manual payments</li>
                <li>Create contribution campaigns</li>
                <li>Export contribution reports</li>
              </ul>

              <h3>📝 Secretary</h3>
              <ul style={styles.list}>
                <li>Create and manage announcements</li>
                <li>Upload media to gallery</li>
                <li>Manage hymn book</li>
              </ul>

              <h3>🎵 Choir Moderator</h3>
              <ul style={styles.list}>
                <li>Create and edit mass programs</li>
                <li>Manage hymns in the hymn book</li>
                <li>Add lyrics to pending songs</li>
              </ul>

              <h3>📸 Media Moderator</h3>
              <ul style={styles.list}>
                <li>Upload and manage gallery media</li>
                <li>Delete inappropriate media</li>
                <li>Feature important content</li>
              </ul>

              <div style={styles.tip}>
                <strong>💡 How are roles assigned?</strong><br/>
                Special roles (Jumuia Leader, Treasurer, Secretary, Choir Moderator, Media Moderator) are assigned by <strong>Administrators (Admins)</strong> only. If you need a specific role, contact the ZUCA administrator.
              </div>

              <div style={styles.warning}>
                <strong>⚠️ Role Login:</strong> Users with special roles can login using their email and a role-specific password format.<br/>
                Example: "stmichaelZ#001" for St. Michael Jumuia Leader
              </div>
            </div>
          )}
        </div>

        {/* FAQ */}
        <div id="faq" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection("faq")}>
            <h2 style={styles.sectionTitle}>❓ Frequently Asked Questions</h2>
            <span style={styles.toggleIcon}>{expandedSections["faq"] ? <FiChevronDown size={20} /> : <FiChevronRight size={20} />}</span>
          </div>
          {expandedSections["faq"] && (
            <div style={styles.sectionContent}>
              <div style={styles.faqItem}>
                <h4>❓ How do I reset my password?</h4>
                <p>Click "Forgot Password?" on the login page, enter your phone number and membership number, then follow the instructions.</p>
              </div>
              
              <div style={styles.faqItem}>
                <h4>❓ Can I join more than one Jumuia?</h4>
                <p>No, each member can only belong to one Jumuia at a time. This helps build stronger community bonds.</p>
              </div>
              
              <div style={styles.faqItem}>
                <h4>❓ How do I know if my pledge was approved?</h4>
                <p>You'll receive a notification and the status will change from "PENDING" to "APPROVED" in your Contributions section.</p>
              </div>
              
              <div style={styles.faqItem}>
                <h4>❓ Why can't I see the WhatsApp group link?</h4>
                <p>You need to join the Jumuia first. After joining, the WhatsApp link will become active and clickable.</p>
              </div>
              
              <div style={styles.faqItem}>
                <h4>❓ How do I save my favorite hymns?</h4>
                <p>Click the heart icon (❤️) next to any hymn. Favorites will appear when you toggle the "Favorites" filter.</p>
              </div>
              
              <div style={styles.faqItem}>
                <h4>❓ Can I edit or delete my chat messages?</h4>
                <p>Yes! Long press (mobile) or right-click (desktop) on your message to see Edit and Delete options.</p>
              </div>
              
              <div style={styles.faqItem}>
                <h4>❓ How do I change my profile picture?</h4>
                <p>Click your profile picture, then "Profile Settings". Click the camera icon to upload a new photo.</p>
              </div>
              
              <div style={styles.faqItem}>
                <h4>❓ What if I forget my membership number?</h4>
                <p>Contact the ZUCA secretary or administrator. They can provide your membership number.</p>
              </div>
              
              <div style={styles.faqItem}>
                <h4>❓ How do I get a special role (like Jumuia Leader)?</h4>
                <p>Only administrators can assign special roles. Contact the ZUCA admin and request the role you need.</p>
              </div>
            </div>
          )}
        </div>

        {/* Troubleshooting */}
        <div id="troubleshooting" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection("troubleshooting")}>
            <h2 style={styles.sectionTitle}>🛠️ Troubleshooting</h2>
            <span style={styles.toggleIcon}>{expandedSections["troubleshooting"] ? <FiChevronDown size={20} /> : <FiChevronRight size={20} />}</span>
          </div>
          {expandedSections["troubleshooting"] && (
            <div style={styles.sectionContent}>
              <div style={styles.troubleItem}>
                <h4>⚠️ I can't log in</h4>
                <p><strong>Solutions:</strong> Check your email and password. Use "Forgot Password" if needed. Ensure you're using the correct email address you registered with.</p>
              </div>
              
              <div style={styles.troubleItem}>
                <h4>⚠️ The page is loading slowly</h4>
                <p><strong>Solutions:</strong> Check your internet connection. Try refreshing the page. Clear your browser cache if the problem persists.</p>
              </div>
              
              <div style={styles.troubleItem}>
                <h4>⚠️ Images aren't displaying</h4>
                <p><strong>Solutions:</strong> Refresh the page. Check your internet connection. Try logging out and back in.</p>
              </div>
              
              <div style={styles.troubleItem}>
                <h4>⚠️ I'm not receiving notifications</h4>
                <p><strong>Solutions:</strong> Check your browser notification settings. Make sure you clicked "Allow" when prompted. Refresh the page.</p>
              </div>
              
              <div style={styles.troubleItem}>
                <h4>⚠️ My pledge is stuck on "PENDING"</h4>
                <p><strong>Solutions:</strong> Wait for admin approval (usually within 24-48 hours). You can message the treasurer using the 💬 button.</p>
              </div>
              
              <div style={styles.troubleItem}>
                <h4>⚠️ I can't find a hymn I'm looking for</h4>
                <p><strong>Solutions:</strong> Try different search keywords. Check the spelling. The hymn might not be in the database yet.</p>
              </div>
              
              <div style={styles.troubleItem}>
                <h4>⚠️ The chat isn't loading messages</h4>
                <p><strong>Solutions:</strong> Refresh the page. Check your internet connection. Log out and log back in.</p>
              </div>
            </div>
          )}
        </div>

        {/* Pro Tips */}
        <div id="tips" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection("tips")}>
            <h2 style={styles.sectionTitle}>💡 Pro Tips</h2>
            <span style={styles.toggleIcon}>{expandedSections["tips"] ? <FiChevronDown size={20} /> : <FiChevronRight size={20} />}</span>
          </div>
          {expandedSections["tips"] && (
            <div style={styles.sectionContent}>
              <div style={styles.tip}>
                <strong>🔥 Tip 1: Use Keyboard Shortcuts</strong>
                <p>Press <strong>Enter</strong> to send messages in chat. Use <strong>Shift + Enter</strong> for new lines.</p>
              </div>
              
              <div style={styles.tip}>
                <strong>🔥 Tip 2: Install as App</strong>
                <p>On mobile, tap "Add to Home Screen" to use ZUCA Portal like a native app!</p>
              </div>
              
              <div style={styles.tip}>
                <strong>🔥 Tip 3: Enable Push Notifications</strong>
                <p>Allow notifications to never miss important announcements or pledge updates.</p>
              </div>
              
              <div style={styles.tip}>
                <strong>🔥 Tip 4: Use Voice Search</strong>
                <p>Use the microphone in the AI Assistant or chat to type with your voice.</p>
              </div>
              
              <div style={styles.tip}>
                <strong>🔥 Tip 5: Download Programs for Offline</strong>
                <p>Download Mass Programs as images or PDFs to view them even without internet.</p>
              </div>
              
              <div style={styles.tip}>
                <strong>🔥 Tip 6: Bookmark This Manual</strong>
                <p>Save this page for quick reference whenever you need help!</p>
              </div>
              
              <div style={styles.tip}>
                <strong>🔥 Tip 7: Use the AI Assistant</strong>
                <p>The ZUCA {user?.fullName?.split(" ")[0]} assistant can help you navigate faster. Try asking "Open Gallery" or "Show me my profile"!</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <p>© {new Date().getFullYear()} ZUCA Portal | Built for Unity & Faith</p>
          <p>Portal Built By | <strong>CHRISTECH WEBSYS</strong></p>
          <p>Version 2.0 | Last Updated: {new Date().toLocaleDateString()}</p>
          <p style={{ marginTop: "8px", fontSize: "11px" }}>Tumsifu Yesu Kristu! 🙏</p>
        </div>
      </div>

      <style>{`
        @media print {
          .search-container, .nav-container, .header-actions, .back-button {
            display: none !important;
          }
          .section-content {
            page-break-inside: avoid;
          }
          body {
            margin: 0;
            padding: 20px;
          }
        }
        
        @media (max-width: 768px) {
          .container { padding: 16px !important; }
          .nav-grid { grid-template-columns: 1fr !important; }
          .section-title { font-size: 16px !important; }
          .header { flex-direction: column !important; align-items: stretch !important; }
          .header-actions { justify-content: flex-start !important; }
        }
        
        button:hover {
          transform: translateY(-2px);
          transition: all 0.2s ease;
        }
        
        .section-content {
          transition: all 0.3s ease;
        }
      `}</style>
    </motion.div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#f8fafc",
    padding: "24px",
    marginTop: "30px",
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "28px",
    flexWrap: "wrap",
    gap: "16px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
  },
  backButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 20px",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    color: "#475569",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  title: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#1e293b",
    margin: "0 0 6px 0",
  },
  subtitle: {
    fontSize: "14px",
    color: "#64748b",
    margin: 0,
  },
  headerActions: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  downloadGroup: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  formatSelect: {
    padding: "8px 14px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    color: "#1e293b",
    fontSize: "13px",
    cursor: "pointer",
  },
  downloadBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 18px",
    borderRadius: "10px",
    border: "none",
    background: "#3b82f6",
    color: "white",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
  },
  printBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 18px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    color: "#475569",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
  },
  searchContainer: {
    position: "relative",
    marginBottom: "28px",
  },
  searchIcon: {
    position: "absolute",
    left: "14px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#94a3b8",
  },
  searchInput: {
    width: "100%",
    padding: "12px 16px 12px 44px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    fontSize: "14px",
    outline: "none",
  },
  searchClear: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "#f1f5f9",
    border: "none",
    borderRadius: "20px",
    width: "26px",
    height: "26px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#64748b",
    cursor: "pointer",
  },
  navContainer: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "20px",
    marginBottom: "28px",
    border: "1px solid #e2e8f0",
  },
  navTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#1e293b",
    margin: "0 0 16px 0",
  },
  navGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "10px",
  },
  navButton: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 14px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.2s",
  },
  navIcon: {
    fontSize: "24px",
  },
  navButtonTitle: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#1e293b",
  },
  navButtonDesc: {
    fontSize: "11px",
    color: "#64748b",
    marginTop: "2px",
  },
  contentContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  section: {
    background: "#ffffff",
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    cursor: "pointer",
    backgroundColor: "#f8fafc",
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#1e293b",
    margin: 0,
  },
  toggleIcon: {
    color: "#94a3b8",
  },
  sectionContent: {
 
  padding: "20px",
  color: "#1e293b",  // ← CHANGE from "#334155" to darker "#1e293b"
  fontSize: "14px",
  lineHeight: "1.6",
},
list: {
  margin: "16px 0",
  paddingLeft: "20px",
  color: "#065f46",     // ← ADD THIS - match success color
},
  table: {
    width: "100%",
    borderCollapse: "collapse",
    margin: "16px 0",
    fontSize: "13px",
  },
  tip: {
    background: "#eff6ff",
    borderLeft: "4px solid #3b82f6",
    padding: "14px",
    borderRadius: "8px",
    margin: "16px 0",
  },
  warning: {
    background: "#fef3c7",
    borderLeft: "4px solid #f59e0b",
    padding: "14px",
    borderRadius: "8px",
    margin: "16px 0",
  },
 success: {
  background: "#d1fae5",
  borderLeft: "4px solid #10b981",
  padding: "14px",
  borderRadius: "8px",
  margin: "16px 0",
  color: "#065f46",     // ← ADD THIS - dark green for contrast
},
  faqItem: {
    marginBottom: "16px",
    padding: "14px",
    background: "#f8fafc",
    borderRadius: "10px",
  },
  troubleItem: {
    marginBottom: "16px",
    padding: "14px",
    background: "#fef2f2",
    borderRadius: "10px",
    borderLeft: "4px solid #ef4444",
  },
  footer: {
    textAlign: "center",
    padding: "24px",
    color: "#94a3b8",
    fontSize: "12px",
    borderTop: "1px solid #e2e8f0",
    marginTop: "16px",
  },
};

