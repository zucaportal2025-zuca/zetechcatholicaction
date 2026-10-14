// frontend/src/pages/role/RoleLayout.jsx
import { Outlet, useNavigate, useLocation, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";          
import BASE_URL from "../../api"; 
import { FaBook, FaCalculator, FaDashcube, FaHandsHelping, FaPlus, FaRegFilePowerpoint, FaUniversity } from "react-icons/fa";


export default function RoleLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!user.role && !user.specialRole) {
      navigate("/login");
    }
  }, [navigate, user.role, user.specialRole]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const getBasePath = () => {
    const role = user.specialRole || user.role;
    switch(role) {
      case "secretary": return "/secretary";
      case "treasurer": return "/treasurer";
      case "choir_moderator": return "/choir";
      case "jumuia_leader": return "/leader";
      case "media_moderator": return "/media-moderator";
      default: return "";
    }
  };

  const getRoleInfo = () => {
    const role = user.specialRole || user.role;
    const basePath = getBasePath();
    
    switch(role) {
      case "secretary":
        return { 
          icon: "📋", 
          name: "Secretary", 
          color: "#10b981",
          description: "Manage announcements, schedules & minutes",
          modules: [
            { path: `${basePath}/announcements`, icon: "📢", label: "Announcements" },
            { path: `${basePath}/schedules`, icon: "📅", label: "Schedules" },
            { path: `${basePath}/minutes`, icon: "📝", label: "Minutes" },
            { path: `${basePath}/attendance`, icon: "✅", label: "Attendance" },
             { path: `${basePath}/history`, icon: "📜", label: "History" } 
          ],
          quickActions: [
            { action: `${basePath}/announcements`, label: "New Announcement", icon: "➕" },
            { action: `${basePath}/schedules`, label: "Create Schedule", icon: "📅" },
            { action: `${basePath}/minutes/create`, label: "New Minutes", icon: "📝" },
             { action: `${basePath}/history`, label: "Manage History", icon: "📜" }
          ]
        };
     case "treasurer":
  return { 
    icon: "💰", 
    name: "Treasurer", 
    color: "#0c0c0c",
    description: "Manage contributions & financial reports",
    modules: [
      { path: `${basePath}/contributions`, icon: <FaHandsHelping size = "23px" /> , label: "Contributions" },
      { path: `${basePath}/reports`, icon: <FaDashcube  size = "23px" />, label: "Reports" },
      { path: `${basePath}/notes`, icon: <FaBook size = "23px" />, label: "Notes" },
      { path: `/treasurer/bank-payments`, icon: <FaUniversity size="23px"/> , label: "Bank Payments" }
    ],
    quickActions: [
      { action: `${basePath}/notes?new=true`, label: "New Note", icon: <FaPlus size = "18px"/> },
      { action: `${basePath}/notes?calculator=true`, label: "Calculator", icon: <FaCalculator size = "18px"/> },  
      { action: `${basePath}/contributions`, label: "Add Contribution", icon: <FaPlus size = "18px"/> },
      { action: `${basePath}/reports`, label: "Generate Report", icon: <FaRegFilePowerpoint size = "18px"/> },
     { action: `/treasurer/bank-payments`, label: "View Bank Payments", icon: <FaUniversity size="25px" /> }
    ]
  };
      case "choir_moderator":
  return { 
    icon: "🎵", 
    name: "Choir Moderator", 
    color: "#ec4899",
    description: "Manage mass programs & songs",
    modules: [
      { path: `${basePath}/songs`, icon: "🎵", label: "Programs" },
      // ADD THIS LINE 👇
      { path: `${basePath}/hymns`, icon: "📖", label: "Hymns" }
    ],
    quickActions: [
      { action: `${basePath}/songs`, label: "Add Song", icon: "➕" },
      // ADD THIS LINE 👇
      { action: `${basePath}/hymns`, label: "View Hymns", icon: "📖" }
    ]
  };
      case "jumuia_leader":
        return { 
          icon: "👑", 
          name: "Jumuia Leader", 
          color: "#8b5cf6",
          description: "Manage your jumuia members & activities",
          modules: [
            { path: `${basePath}`, icon: "👥", label: "Dashboard" }
          ],
          quickActions: [
            { action: `${basePath}`, label: "View Dashboard", icon: "📊" }
          ]
        };
      case "media_moderator":
  return { 
    icon: "📸", 
    name: "Media Moderator", 
    color: "#3b82f6",
    description: "Manage gallery, media & advertisements",
    modules: [
      { path: `${basePath}/media`, icon: "🖼️", label: "Gallery" },
      { path: `${basePath}/advertisements`, icon: "📢", label: "Advertisements" }
    ],
    quickActions: [
      { action: `${basePath}/media`, label: "Upload Media", icon: "📸" },
      { action: `${basePath}/advertisements`, label: "Manage Ads", icon: "📢" }
    ]
  };
      default:
        return { 
          icon: "👤", 
          name: "Member", 
          color: "#64748b",
          description: "Welcome to your dashboard",
          modules: [],
          quickActions: []
        };
    }
  };

  const roleInfo = getRoleInfo();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const handleQuickAction = (action) => {
    navigate(action);
    setIsMobileMenuOpen(false);
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="role-layout">
      {/* Mobile Bottom Navigation - Only on Mobile */}
      {isMobile && (
        <div className="mobile-bottom-nav">
          {roleInfo.modules.slice(0, 4).map((module, idx) => (
            <NavLink
              key={module.path}
              to={module.path}
              className={({ isActive }) => 
                `bottom-nav-item ${isActive ? 'active' : ''}`
              }
            >
              <span className="bottom-nav-icon">{module.icon}</span>
              <span className="bottom-nav-label">{module.label}</span>
            </NavLink>
          ))}
        </div>
      )}

      {/* Top Bar */}
      <div className="top-bar">
        <div className="top-bar-left">
          {isMobile && (
            <button 
              className="mobile-menu-btn"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              ☰
            </button>
          )}
          <div className="role-badge-mini" style={{ background: `${roleInfo.color}15`, color: roleInfo.color }}>
            <span>{roleInfo.icon}</span>
            <span>{roleInfo.name}</span>
          </div>
          {!isMobile && <span className="role-desc-mini">{roleInfo.description}</span>}
        </div>
              <div className="top-bar-right">
          {/* ==================== BACK TO MEMBER BUTTON ==================== */}
<button 
  className="back-to-member-btn"
  onClick={async (e) => {
    const btn = e.currentTarget;
    const originalHTML = btn.innerHTML;
    
    // Show loading
    btn.innerHTML = `
      <span style="display:inline-block;width:12px;height:12px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 0.6s linear infinite;margin-right:6px;"></span>
      Switching...
    `;
    btn.style.opacity = "0.7";
    btn.style.pointerEvents = "none";
    
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${BASE_URL}/api/switch-role`, 
        { targetRole: "member" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      localStorage.setItem("token", res.data.token);
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      storedUser.role = "member";
      localStorage.setItem("user", JSON.stringify(storedUser));
      
      window.location.href = "/dashboard";
    } catch (err) {
      btn.innerHTML = originalHTML;
      btn.style.opacity = "1";
      btn.style.pointerEvents = "auto";
      alert("Failed to switch back to member mode");
    }
  }}
>
  👤 Back to Member
</button>
          
          {!isMobile && <span className="user-name-mini">{user.fullName || user.name || "User"}</span>}
          <button className="logout-btn-mini" onClick={handleLogout}>
            <span>🚪</span>
            {!isMobile && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="layout-container">
        {/* Desktop Sidebar */}
        {!isMobile && (
  <aside className="sidebar-compact">
    {/* ===== USER PROFILE SECTION ===== */}
    <div className="sidebar-user-profile">
      {user.profileImage ? (
        <img 
          src={user.profileImage} 
          alt={user.fullName || user.name || "User"} 
          className="sidebar-user-avatar"
        />
      ) : (
        <div className="sidebar-user-avatar-placeholder" style={{ background: roleInfo.color }}>
          {(user.fullName || user.name || "U").charAt(0).toUpperCase()}
        </div>
      )}
      <div className="sidebar-user-info">
        <div className="sidebar-user-name">{user.fullName || user.name || "User"}</div>
        <div className="sidebar-user-role" style={{ color: roleInfo.color }}>
          {roleInfo.icon} {roleInfo.name}
        </div>
      </div>
    </div>

    <div className="sidebar-divider"></div>

    <nav className="sidebar-nav-compact">
      {roleInfo.modules.map((module) => (
        <NavLink
          key={module.path}
          to={module.path}
          className={({ isActive }) => 
            `nav-item-compact ${isActive ? 'active' : ''}`
          }
        >
          <span className="nav-icon-compact">{module.icon}</span>
          <span className="nav-label-compact">{module.label}</span>
        </NavLink>
      ))}
    </nav>

    {roleInfo.quickActions.length > 0 && (
      <div className="quick-actions-compact">
        <div className="quick-actions-header">
          <span>⚡ Quick Actions</span>
        </div>
        {roleInfo.quickActions.map((action, idx) => (
          <button
            key={idx}
            className="quick-action-btn"
            onClick={() => handleQuickAction(action.action)}
          >
            <span>{action.icon}</span>
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    )}
  </aside>
)}

        {/* Main Content */}
        <main className="main-content-compact">
          <Outlet />
        </main>
      </div>

      {/* Mobile Slide-out Menu */}
      {isMobile && (
        <>
          <div 
            className={`mobile-overlay ${isMobileMenuOpen ? 'open' : ''}`} 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
            <div className="mobile-menu-header">
  <button 
    className="mobile-menu-close"
    onClick={() => setIsMobileMenuOpen(false)}
  >
    ✕
  </button>
  
  {/* ===== USER PROFILE WITH IMAGE ===== */}
  {user.profileImage ? (
    <img 
      src={user.profileImage} 
      alt={user.fullName || user.name || "User"} 
      className="mobile-user-avatar-img"
    />
  ) : (
    <div className="mobile-user-avatar" style={{ background: roleInfo.color }}>
      {(user.fullName || user.name || "U").charAt(0).toUpperCase()}
    </div>
  )}
  
  <span className="mobile-user-name">{user.fullName || user.name || "User"}</span>
  <span className="mobile-user-role" style={{ color: roleInfo.color }}>{roleInfo.name}</span>
</div>
            
            <nav className="mobile-nav">
              {roleInfo.modules.map((module) => (
                <NavLink
                  key={module.path}
                  to={module.path}
                  className={({ isActive }) => 
                    `mobile-nav-item ${isActive ? 'active' : ''}`
                  }
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="mobile-nav-icon">{module.icon}</span>
                  <span className="mobile-nav-label">{module.label}</span>
                </NavLink>
              ))}
            </nav>
            
            {roleInfo.quickActions.length > 0 && (
              <div className="mobile-quick-actions">
                <div className="mobile-quick-header">Quick Actions</div>
                {roleInfo.quickActions.map((action, idx) => (
                  <button
                    key={idx}
                    className="mobile-action-btn"
                    onClick={() => handleQuickAction(action.action)}
                  >
                    <span>{action.icon}</span>
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            )}
            
            <button className="mobile-logout-btn" onClick={handleLogout}>
              <span>🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </>
      )}

      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .role-layout {
          min-height: 100vh;
          background: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          width: 100%;
          overflow-x: hidden;
        }

        /* Top Bar */
        .top-bar {
          background: white;
          border-bottom: 1px solid #e2e8f0;
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 100;
          width: 100%;
        }

        .top-bar-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .role-badge-mini {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
        }

        .role-desc-mini {
          font-size: 12px;
          color: #64748b;
        }

        .top-bar-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-name-mini {
          font-size: 13px;
          font-weight: 500;
          color: #1e293b;
        }

        .logout-btn-mini {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #f1f5f9;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }

        .logout-btn-mini:active {
          background: #e2e8f0;
          transform: scale(0.95);
        }

        /* Mobile Menu Button */
        .mobile-menu-btn {
          background: #f1f5f9;
          border: none;
          font-size: 22px;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 500;
        }

        .mobile-menu-btn:active {
          background: #e2e8f0;
          transform: scale(0.95);
        }

        /* Layout Container */
        .layout-container {
          display: flex;
          max-width: auto;
          margin: 0 auto;
          width: auto;
        }

        /* Desktop Sidebar */
        .sidebar-compact {
          width: 260px;
          background: white;
          min-height: calc(100vh - 57px);
          border-right: 1px solid #e2e8f0;
          padding: 20px 0;
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 57px;
          height: calc(100vh - 57px);
          overflow-y: auto;
        }

        .sidebar-nav-compact {
          flex: 1;
          padding: 0 16px;
        }

        .nav-item-compact {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          margin: 4px 0;
          border-radius: 10px;
          color: #475569;
          text-decoration: none;
          transition: all 0.2s;
          font-size: 14px;
          font-weight: 500;
        }

        .nav-item-compact:active {
          background: #f8fafc;
          transform: scale(0.98);
        }

        .nav-item-compact.active {
          background: ${roleInfo.color}10;
          color: ${roleInfo.color};
        }

        .nav-icon-compact {
          font-size: 18px;
        }

        /* Quick Actions */
        .quick-actions-compact {
          padding: 20px 16px;
          border-top: 1px solid #e2e8f0;
          margin-top: auto;
        }

        .quick-actions-header {
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }

        .quick-action-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 8px 12px;
          margin: 4px 0;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 12px;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
        }

        .quick-action-btn:active {
          background: ${roleInfo.color}10;
          transform: scale(0.98);
        }

        /* Main Content */
        .main-content-compact {
          flex: 1;
          padding: 20px;
          min-height: calc(100vh - 57px);
          background: #f8fafc;
          width: 100%;
          overflow-x: hidden;
        }

        /* Mobile Bottom Navigation */
        .mobile-bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding: 8px 12px;
          border-top: 1px solid #e2e8f0;
          z-index: 100;
          box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
        }

        .bottom-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
 padding: 8px 12px;
          text-decoration: none;
          color: #94a3b8;
          transition: all 0.2s;
          border-radius: 8px;
          flex: 1;
          max-width: 80px;
        }

        .bottom-nav-item.active {
          color: ${roleInfo.color};
          background: ${roleInfo.color}10;
        }

        .bottom-nav-item:active {
          transform: scale(0.95);
        }

        .bottom-nav-icon {
          font-size: 22px;
        }

        .bottom-nav-label {
          font-size: 11px;
          font-weight: 500;
        }

        /* Mobile Overlay & Menu */
        .mobile-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          z-index: 200;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
        }

        .mobile-overlay.open {
          opacity: 1;
          visibility: visible;
        }

        .mobile-menu {
          position: fixed;
          top: 0;
          left: 0;
          width: 85%;
          max-width: 320px;
          height: 100vh;
          background: white;
          z-index: 201;
          padding: 20px;
          display: flex;
          flex-direction: column;
          transform: translateX(-100%);
          transition: transform 0.3s ease;
          box-shadow: 2px 0 20px rgba(0,0,0,0.1);
        }

        .mobile-menu.open {
          transform: translateX(0);
        }

        .mobile-menu-header {
          position: relative;
          text-align: center;
          padding-bottom: 20px;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 20px;
        }

        .mobile-menu-close {
          position: absolute;
          top: 0;
          right: 0;
          background: #f1f5f9;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mobile-menu-close:active {
          background: #e2e8f0;
        }

        .mobile-user-avatar {
          width: 60px;
          height: 60px;
          border-radius: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          margin: 0 auto 12px;
        }

        .mobile-user-name {
          display: block;
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
        }

        .mobile-user-role {
          display: block;
          font-size: 12px;
          margin-top: 4px;
          font-weight: 500;
        }

        .mobile-nav {
          flex: 1;
        }

        .mobile-nav-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          margin: 4px 0;
          border-radius: 12px;
          color: #475569;
          text-decoration: none;
          transition: all 0.2s;
          font-weight: 500;
        }

        .mobile-nav-item:active {
          background: #f1f5f9;
          transform: scale(0.98);
        }

        .mobile-nav-item.active {
          background: ${roleInfo.color}10;
          color: ${roleInfo.color};
        }

        .mobile-nav-icon {
          font-size: 20px;
        }

        .mobile-nav-label {
          font-size: 15px;
        }

        .mobile-quick-actions {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
        }

        .mobile-quick-header {
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }

        .mobile-action-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 14px;
          margin: 6px 0;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          cursor: pointer;
          font-size: 14px;
          color: #475569;
          transition: all 0.2s;
        }

        .mobile-action-btn:active {
          background: ${roleInfo.color}10;
          transform: scale(0.98);
        }

        .mobile-logout-btn {
          margin-top: 20px;
          margin-bottom: 50px;
          padding: 14px;
          background: #fee2e2;
          color: #ef4444;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-size: 15px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .mobile-logout-btn:active {
          background: #fecaca;
          transform: scale(0.98);
        }

        /* Responsive Breakpoints */
        @media (max-width: 768px) {
          .top-bar {
            padding: 10px 12px;
          }

          .role-desc-mini {
            display: none;
          }

          .user-name-mini {
            display: none;
          }

          .logout-btn-mini span:last-child {
            display: none;
          }

          .logout-btn-mini {
            padding: 8px 10px;
          }

          .main-content-compact {
            padding: 16px;
            margin-bottom: 70px;
          }

          .layout-container {
            flex-direction: column;
          }
        }

                .back-to-member-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: linear-gradient(135deg, #e54646, #ed3a43);
          color: white;
          border: none;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .back-to-member-btn:active {
          transform: scale(0.95);
          opacity: 0.9;
        }

        /* ===== SIDEBAR USER PROFILE ===== */
.sidebar-user-profile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 16px 12px;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 12px;
}

.sidebar-user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #e2e8f0;
  flex-shrink: 0;
}

.sidebar-user-avatar-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  font-weight: 600;
  flex-shrink: 0;
}

.sidebar-user-info {
  flex: 1;
  min-width: 0;
}

.sidebar-user-name {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-user-role {
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 4px;
}

.sidebar-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 0 16px 12px;
}

/* ===== MOBILE USER PROFILE IMAGE ===== */
.mobile-user-avatar-img {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #e2e8f0;
  margin: 0 auto 12px;
  display: block;
}

/* Update existing mobile-user-avatar for fallback */
.mobile-user-avatar {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  color: white;
  margin: 0 auto 12px;
}

        @media (max-width: 768px) {
          .back-to-member-btn {
            padding: 6px 10px;
            font-size: 11px;
          }
        }

        @media (min-width: 769px) and (max-width: 1024px) {
          .main-content-compact {
            padding: 20px;
          }

          .sidebar-compact {
            width: 240px;
          }
        }

        /* Touch-friendly tap highlights removal */
        .nav-item-compact,
        .quick-action-btn,
        .logout-btn-mini,
        .mobile-nav-item,
        .mobile-action-btn,
        .mobile-logout-btn,
        .mobile-menu-btn,
        .mobile-menu-close,
        .bottom-nav-item {
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        /* Scrollbar */
        .sidebar-compact::-webkit-scrollbar {
          width: 4px;
        }

        .sidebar-compact::-webkit-scrollbar-track {
          background: #f1f5f9;
        }

        .sidebar-compact::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        /* Smooth scrolling */
        .main-content-compact {
          -webkit-overflow-scrolling: touch;
        }
      `}</style>
    </div>
  );
}