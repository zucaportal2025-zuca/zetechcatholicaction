// frontend/src/pages/admin/SecurityPage.jsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiDownload, FiPrinter, FiSearch, FiChevronDown, FiChevronRight } from "react-icons/fi";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export default function SecurityPage() {
  const [expandedSections, setExpandedSections] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [downloadFormat, setDownloadFormat] = useState("html");

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const sections = [
    { id: "overview", title: "Overview", icon: "📋", description: "System overview and user roles" },
    { id: "getting-started", title: "Getting Started", icon: "🚀", description: "Login methods and setup" },
    { id: "dashboard", title: "Dashboard", icon: "📊", description: "Admin dashboard overview" },
    { id: "users", title: "User Management", icon: "👥", description: "Manage all system users" },
    { id: "roles", title: "Role Management", icon: "👑", description: "Assign special roles" },
    { id: "jumuia", title: "Jumuia Management", icon: "⛪", description: "Manage Jumuia groups" },
    { id: "media", title: "Media Management", icon: "🎥", description: "Upload and manage media" },
    { id: "youtube", title: "YouTube Analytics", icon: "▶️", description: "Monitor channel analytics" },
    { id: "songs", title: "Mass Program", icon: "🎵", description: "Create and manage mass programs" },
    { id: "hymns", title: "Hymn Book", icon: "📖", description: "Manage hymn lyrics" },
    { id: "pending-songs", title: "Pending Songs", icon: "⏳", description: "Songs needing lyrics" },
    { id: "announcements", title: "Announcements", icon: "📢", description: "Create and manage announcements" },
    { id: "contributions", title: "Contributions", icon: "💰", description: "Manage pledges and payments" },
    { id: "chat", title: "Chat Monitor", icon: "💬", description: "Moderate public chat" },
    { id: "security", title: "Security", icon: "🔒", description: "Security settings and alerts" },
    { id: "faq", title: "FAQ", icon: "❓", description: "Frequently asked questions" },
    { id: "troubleshooting", title: "Troubleshooting", icon: "🛠️", description: "Common issues and fixes" }
  ];

  const filteredSections = sections.filter(section =>
    section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.id.includes(searchTerm.toLowerCase()) ||
    section.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Download as HTML
  const downloadAsHTML = () => {
    const content = document.getElementById('manual-content').innerHTML;
    const html = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>ZUCA Portal - Admin User Manual</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1200px; margin: 0 auto; padding: 40px; background: #f8fafc; color: #1e293b; line-height: 1.6; }
        h1 { color: #3b82f6; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
        h2 { color: #1e293b; margin-top: 30px; background: #f1f5f9; padding: 10px 15px; border-radius: 8px; }
        h3 { color: #475569; margin-top: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
        th { background: #f1f5f9; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
        .tip { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 15px 0; }
      </style>
    </head>
    <body>
      ${content}
    </body>
    </html>`;
    
    const blob = new Blob([html], { type: 'text/html' });
    saveAs(blob, `zuca-admin-manual-${new Date().toISOString().split('T')[0]}.html`);
  };

  const downloadAsPDF = () => { window.print(); };
  const downloadAsDOC = () => {
    const content = document.getElementById('manual-content').innerHTML;
    const html = `<!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>ZUCA Portal - Admin User Manual</title>
    <style>body { font-family: 'Times New Roman', Times, serif; margin: 1in; }</style>
    </head>
    <body>${content}</body>
    </html>`;
    const blob = new Blob([html], { type: 'application/msword' });
    saveAs(blob, `zuca-admin-manual-${new Date().toISOString().split('T')[0]}.doc`);
  };

  const handleDownload = () => {
    if (downloadFormat === 'html') downloadAsHTML();
    else if (downloadFormat === 'pdf') downloadAsPDF();
    else if (downloadFormat === 'doc') downloadAsDOC();
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📚 Admin User Manual</h1>
          <p style={styles.subtitle}>Complete guide for administrators and moderators</p>
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
        {/* Overview Section */}
        <div id="overview" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection("overview")}>
            <h2 style={styles.sectionTitle}>📋 Overview</h2>
            <span style={styles.toggleIcon}>{expandedSections["overview"] ? <FiChevronDown size={20} /> : <FiChevronRight size={20} />}</span>
          </div>
          {expandedSections["overview"] && (
            <div style={styles.sectionContent}>
              <p>The ZUCA Portal is a comprehensive management system for Zetech University Catholic Action.</p>
              <div style={styles.roleGrid}>
                <div style={styles.roleCard}>
                  <div style={styles.roleIcon}>👑</div>
                  <h4>Administrators</h4>
                  <p>Full system access, user management, role assignment</p>
                </div>
                <div style={styles.roleCard}>
                  <div style={styles.roleIcon}>💰</div>
                  <h4>Treasurers</h4>
                  <p>Manage contributions, approve pledges, track payments</p>
                </div>
                <div style={styles.roleCard}>
                  <div style={styles.roleIcon}>👥</div>
                  <h4>Jumuia Leaders</h4>
                  <p>Manage their jumuia, members, contributions</p>
                </div>
                <div style={styles.roleCard}>
                  <div style={styles.roleIcon}>📝</div>
                  <h4>Secretaries</h4>
                  <p>Create announcements, manage media</p>
                </div>
                <div style={styles.roleCard}>
                  <div style={styles.roleIcon}>🎵</div>
                  <h4>Choir Moderators</h4>
                  <p>Manage songs, hymns, mass programs</p>
                </div>
                <div style={styles.roleCard}>
                  <div style={styles.roleIcon}>🎥</div>
                  <h4>Media Moderators</h4>
                  <p>Upload and manage media gallery</p>
                </div>
              </div>
              <div style={styles.tip}>
                <strong>💡 Tip:</strong> Use the sidebar navigation to access different modules. Your role determines which modules you can see.
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
              <h3>Login Methods</h3>
              <table style={styles.table}>
                <thead><tr><th>Method</th><th>How to Use</th><th>Who Can Use</th></tr></thead>
                <tbody>
                  <tr><td>🔐 Standard Login</td><td>Email + Password</td><td>All users</td></tr>
                  <tr><td>👑 Role Login</td><td>Email + Role Password</td><td>Treasurers, Leaders, Secretaries, Moderators</td></tr>
                </tbody>
              </table>
              <div style={styles.warning}>
                <strong>⚠️ Important:</strong> Role logins only work if you have been assigned that special role by an administrator.
              </div>
            </div>
          )}
        </div>

        {/* User Management */}
        <div id="users" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection("users")}>
            <h2 style={styles.sectionTitle}>👥 User Management</h2>
            <span style={styles.toggleIcon}>{expandedSections["users"] ? <FiChevronDown size={20} /> : <FiChevronRight size={20} />}</span>
          </div>
          {expandedSections["users"] && (
            <div style={styles.sectionContent}>
              <p>Manage all system users from this section.</p>
              <ul style={styles.list}>
                <li><strong>View All Users</strong> - Complete list with search and filters</li>
                <li><strong>Promote/Demote</strong> - Change user roles between Member and Admin</li>
                <li><strong>Delete Users</strong> - Remove users from the system</li>
                <li><strong>Export Data</strong> - Download user lists as Excel or Word</li>
                <li><strong>Bulk Actions</strong> - Select multiple users for bulk operations</li>
              </ul>
              <div style={styles.tip}>
                <strong>💡 Tip:</strong> Use the search bar to quickly find users by name, email, or membership number.
              </div>
            </div>
          )}
        </div>

        {/* Role Management */}
        <div id="roles" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection("roles")}>
            <h2 style={styles.sectionTitle}>👑 Role Management</h2>
            <span style={styles.toggleIcon}>{expandedSections["roles"] ? <FiChevronDown size={20} /> : <FiChevronRight size={20} />}</span>
          </div>
          {expandedSections["roles"] && (
            <div style={styles.sectionContent}>
              <p>Assign special roles to users for granular access control.</p>
              <table style={styles.table}>
                <thead><tr><th>Role</th><th>Permissions</th><th>Icon</th></tr></thead>
                <tbody>
                  <tr><td>Jumuia Leader</td><td>Manage their jumuia, members, contributions</td><td>👑</td></tr>
                  <tr><td>Treasurer</td><td>Manage contributions, approve pledges</td><td>💰</td></tr>
                  <tr><td>Secretary</td><td>Create announcements, manage media</td><td>📝</td></tr>
                  <tr><td>Choir Moderator</td><td>Manage songs, hymns, mass programs</td><td>🎵</td></tr>
                  <tr><td>Media Moderator</td><td>Upload and manage media gallery</td><td>🎥</td></tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Media Management */}
        <div id="media" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection("media")}>
            <h2 style={styles.sectionTitle}>🎥 Media Management</h2>
            <span style={styles.toggleIcon}>{expandedSections["media"] ? <FiChevronDown size={20} /> : <FiChevronRight size={20} />}</span>
          </div>
          {expandedSections["media"] && (
            <div style={styles.sectionContent}>
              <p>Upload and manage images, videos, and documents for the media gallery.</p>
              <h3>Supported File Types:</h3>
              <ul style={styles.list}>
                <li>🖼️ <strong>Images</strong> - JPG, PNG, GIF, WebP (max 10MB)</li>
                <li>🎬 <strong>Videos</strong> - MP4, MOV, AVI (max 50MB)</li>
                <li>🎵 <strong>Audio</strong> - MP3, WAV, OGG (max 20MB)</li>
                <li>📄 <strong>Documents</strong> - PDF, DOC, DOCX (max 10MB)</li>
              </ul>
            </div>
          )}
        </div>

        {/* YouTube Analytics */}
        <div id="youtube" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection("youtube")}>
            <h2 style={styles.sectionTitle}>▶️ YouTube Analytics</h2>
            <span style={styles.toggleIcon}>{expandedSections["youtube"] ? <FiChevronDown size={20} /> : <FiChevronRight size={20} />}</span>
          </div>
          {expandedSections["youtube"] && (
            <div style={styles.sectionContent}>
              <p>Monitor ZUCA's YouTube channel performance and analytics.</p>
              <ul style={styles.list}>
                <li>📊 <strong>Channel Stats</strong> - Subscribers, total views, total videos</li>
                <li>📈 <strong>Performance Overview</strong> - Views over time chart</li>
                <li>🎬 <strong>Top Videos</strong> - Best performing content</li>
                <li>👥 <strong>Audience Demographics</strong> - Age, gender, location</li>
              </ul>
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
              <p>Manage contribution campaigns, pledges, and payments.</p>
              <h3>Pledge Statuses:</h3>
              <table style={styles.table}>
                <thead><tr><th>Status</th><th>Meaning</th><th>Action Needed</th></tr></thead>
                <tbody>
                  <tr><td>🟡 PENDING</td><td>Pledge made, awaiting approval</td><td>Admin/Treasurer approval</td></tr>
                  <tr><td>🟢 APPROVED</td><td>Pledge approved</td><td>None</td></tr>
                  <tr><td>🔵 COMPLETED</td><td>Fully paid</td><td>None</td></tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Chat Monitor */}
        <div id="chat" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection("chat")}>
            <h2 style={styles.sectionTitle}>💬 Chat Monitor</h2>
            <span style={styles.toggleIcon}>{expandedSections["chat"] ? <FiChevronDown size={20} /> : <FiChevronRight size={20} />}</span>
          </div>
          {expandedSections["chat"] && (
            <div style={styles.sectionContent}>
              <p>Monitor and moderate the public chat with full admin controls.</p>
              <ul style={styles.list}>
                <li><strong>View All Messages</strong> - See all chat messages in real-time</li>
                <li><strong>Delete Messages</strong> - Remove inappropriate messages</li>
                <li><strong>Pin Important Messages</strong> - Highlight key announcements</li>
                <li><strong>Mute/Unmute Users</strong> - Temporarily silence disruptive users</li>
                <li><strong>Export Chat History</strong> - Download as CSV for records</li>
              </ul>
              <div style={styles.tip}>
                <strong>💡 Tip:</strong> Long-press on mobile or right-click on desktop to access message actions.
              </div>
            </div>
          )}
        </div>

        {/* FAQ */}
        <div id="faq" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection("faq")}>
            <h2 style={styles.sectionTitle}>❓ FAQ</h2>
            <span style={styles.toggleIcon}>{expandedSections["faq"] ? <FiChevronDown size={20} /> : <FiChevronRight size={20} />}</span>
          </div>
          {expandedSections["faq"] && (
            <div style={styles.sectionContent}>
              <div style={styles.faqItem}><h4>How do I assign a special role to a user?</h4><p>Go to Role Management, find the user, select the role from dropdown, and click Save Changes.</p></div>
              <div style={styles.faqItem}><h4>Why can't a user login with role credentials?</h4><p>Ensure they have been assigned that special role and are using the correct password format.</p></div>
              <div style={styles.faqItem}><h4>How do I delete multiple users at once?</h4><p>In User Management, enable bulk mode, select users, and click delete.</p></div>
              <div style={styles.faqItem}><h4>How do I approve a pledge?</h4><p>Go to Contributions, expand the campaign, find the member, and click the Approve button.</p></div>
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
              <div style={styles.troubleItem}><h4>⚠️ Page not loading?</h4><p>Try refreshing the page or check your internet connection.</p></div>
              <div style={styles.troubleItem}><h4>⚠️ Images not displaying?</h4><p>Clear your browser cache or check your login status.</p></div>
              <div style={styles.troubleItem}><h4>⚠️ Can't upload files?</h4><p>Check file size limits (images: 10MB, videos: 50MB).</p></div>
              <div style={styles.troubleItem}><h4>⚠️ Getting "Not authorized" error?</h4><p>Your session may have expired. Log out and log back in.</p></div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <p>© {new Date().getFullYear()} ZUCA Portal | Built for Unity & Faith</p>
          <p>Portal Built By | CHRISTECH WEBSYS</p>
          <p>Version 2.0 | Last Updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <style>{`
        @media print {
          .search-container, .nav-container, .header-actions {
            display: none !important;
          }
          .section-content {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
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
    color: "#334155",
    fontSize: "14px",
    lineHeight: "1.6",
  },
  roleGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "12px",
    margin: "20px 0",
  },
  roleCard: {
    background: "#f8fafc",
    borderRadius: "12px",
    padding: "14px",
    textAlign: "center",
    border: "1px solid #e2e8f0",
  },
  roleIcon: {
    fontSize: "32px",
    marginBottom: "8px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    margin: "16px 0",
    fontSize: "13px",
  },
  list: {
    margin: "16px 0",
    paddingLeft: "20px",
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

// Add responsive styles
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @media (max-width: 768px) {
    .container { padding: 16px !important; }
    .nav-grid { grid-template-columns: 1fr !important; }
    .role-grid { grid-template-columns: 1fr !important; }
    .section-title { font-size: 16px !important; }
    .header { flex-direction: column !important; align-items: stretch !important; }
    .header-actions { justify-content: flex-start !important; }
  }
`;
document.head.appendChild(styleSheet);