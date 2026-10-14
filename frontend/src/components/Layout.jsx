// frontend/src/components/Layout.jsx
import { Outlet, NavLink } from "react-router-dom";
import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "../assets/zuca-logo.png";
import Notifications from "./Notifications";
import axios from "axios";
import BASE_URL from "../api";
import AnimatedBackground from "./AnimatedBackground";
import FloatingInstallButton from "./FloatingInstallButton";
import { 
  FiHome, FiCalendar, FiBook, FiImage, FiUsers, FiBell, 
  FiDollarSign, FiMusic, FiMessageSquare, FiUserCheck, 
  FiAward, FiYoutube, FiMapPin, 
} from "react-icons/fi";
import { FaYoutube, FaChurch, FaMoneyBillWave, FaMusic, FaComments, FaUserTie, FaImages, FaPhotoVideo ,FaUsers, FaCalendar, FaRegCalendar, FaThLarge, FaDonate,FaHandHoldingHeart, FaDove, FaPrayingHands,FaGamepad,FaCalendarPlus, FaFileAlt, FaFileExcel, FaFileArchive, FaFileImport, FaRegFilePdf, FaSun} from "react-icons/fa";
import { api } from "../api";
import { io } from "socket.io-client";
import { GiGamepad, GiPrayerBeads } from "react-icons/gi";
import { toggleDark } from "../utils/darkReader";


// Messenger Icon with Badge Component - ADD THIS BEFORE the Layout function
const MessengerIcon = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await api.get('/api/messenger/unread/count', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUnreadCount(res.data.unreadCount);
      } catch (err) {
        console.error('Error fetching unread count:', err);
      }
    };
    
    fetchUnreadCount();
    
    // Setup socket connection for real-time updates
    const socket = io(BASE_URL, {
      transports: ['websocket'],
      auth: { token: localStorage.getItem("token") }
    });
    
    socket.on('dm:new_message', () => {
      setUnreadCount(prev => prev + 1);
    });
    
    socket.on('dm:message_read', () => {
      fetchUnreadCount();
    });
    
    return () => socket.disconnect();
  }, []);

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9l-5.05 1.9z" />
        <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1z" />
        <path d="M14 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1z" />
      </svg>
      {unreadCount > 0 && (
        <span className="messenger-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
      )}
    </div>
  );
};


function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [sidebarShadow, setSidebarShadow] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
  const scrollContainerRef = useRef(null);
  const userMenuRef = useRef(null);
  const sidebarRef = useRef(null);
  const [jumuiaName, setJumuiaName] = useState("");
const [isJumuiaLoading, setIsJumuiaLoading] = useState(true);
const [isExecutive, setIsExecutive] = useState(false);
const [loadingExecutive, setLoadingExecutive] = useState(true);

// Fetch user details including jumuia name
useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token) return;

  const fetchUserDetails = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userData = response.data;
      if (userData.homeJumuia?.name) {
        setJumuiaName(userData.homeJumuia.name);
      }
      // Optionally update the full user object if you want to keep it fresh
      setUser(userData);
    } catch (error) {
      console.error("Failed to fetch user details", error);
    } finally {
      setIsJumuiaLoading(false);
    }
  };

  fetchUserDetails();
}, []); 

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) setUser(storedUser);
  }, []);


  // Check if user has executive position
useEffect(() => {
  const checkExecutiveStatus = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoadingExecutive(false);
      return;
    }
    
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      
      // Check if user has executive position
      const response = await axios.get(`${BASE_URL}/api/executive/check-user/${userData.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setIsExecutive(response.data.hasPosition || false);
    } catch (error) {
      console.error("Error checking executive status:", error);
      setIsExecutive(false);
    } finally {
      setLoadingExecutive(false);
    }
  };
  
  checkExecutiveStatus();
}, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 900;
      setIsMobile(mobile);
      if (mobile) {
        setMenuOpen(false);
      } else {
        setMenuOpen(true);
      }
    };
    
    window.addEventListener("resize", handleResize);
    handleResize();
    
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobile && 
          sidebarRef.current && 
          !sidebarRef.current.contains(event.target) &&
          !event.target.closest('.mobile-hamburger')) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobile]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        setSidebarShadow(scrollContainerRef.current.scrollTop > 5);
      }
    };
    const container = scrollContainerRef.current;
    container?.addEventListener("scroll", handleScroll);
    return () => container?.removeEventListener("scroll", handleScroll);
  }, []);

  if (!user) return null;

  const profileImageUrl =
    user.profileImage
      ? user.profileImage.startsWith("http")
        ? user.profileImage
        : `${BASE_URL}/${user.profileImage}`
      : null;

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: <FaThLarge /> },
     { path: "/join-jumuia", label: "Join Jumuia", icon: <FaPrayingHands size={25} color="#0f0f0f" /> },
  {path: "/jumuia-contributions", 
    label: jumuiaName ? `${jumuiaName}` : "My Jumuia", 
    icon: <FaDove size={25} color="#4e4939" />
  },  
    { path: "/member/attendance", label: "Attendance", icon: <FaUsers size={28} color="#be1b1b" /> },
  ...(isExecutive || user?.role === "admin" || user?.specialRole === "admin" ? [{
    path: "/executive/minutes", 
    label: "Meeting Minutes", 
    icon: <FaRegFilePdf size={28} color="#141b16" />
  }] : []),
    
             { path: "/announcements", label: "Announcements", icon: <FiBell size={28} color="#1a1818" /> },
              { path: "/mass-programs", label: "Mass Programs", icon: <FaFileAlt size={28} color="rgba(11, 33, 226, 0.91)" /> },
              { path: "/hymns", label: "Lyrics Book", icon: <FiMusic size={28} color="rgba(238, 9, 9, 0.91)" />},

    { path: "/schedules", label: "Schedules", icon: <   FaCalendarPlus size={28} color="#141313" /> },
    
      { path: "/executive", label: "Executive Team", icon: <FaUserTie size={28} color="#1a1818" /> },
    { path: "/liturgical-calendar", label: "Liturgical Calendar", icon: <FaRegCalendar size={28}/> },
       
{ path: "/prayer", label: "Prayer Book", icon: <GiPrayerBeads size={28} /> },
        
    { path: "/contributions", label: "Contributions", icon: <FaHandHoldingHeart size={25} color="#0e0f0e" /> },

      { path: "/youtube", label: "ZUCA/TUBE", icon: <FaYoutube size={28} color="#ff0000" /> },

{ 
  path: "/gallery", 
  label: "Gallery", 
  icon: <span style={{ color: '#000000' }}><FaImages size={28} /></span> 
},   
     
  { path: "/messenger", label: "Messages", icon: <FiMessageSquare /> },
  { path: "/chat", label: "Chat", icon: <FaComments size={28} color="#1a1818" /> },
 
  
    { path: "/games", label: "Games Arcade", icon: <FaGamepad size={28} color="#1a1818" /> },
  ];


  

  return (
    <div style={containerStyle}>
      <AnimatedBackground />
  
      <AnimatePresence>
        {isMobile && menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={backdropStyle}
            onClick={() => setMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        ref={sidebarRef}
        className="sidebar"
        initial={false}
        animate={{ 
          x: menuOpen ? 0 : (isMobile ? "-100%" : 0),
        }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        style={sidebarStyle}
      >
        <div style={logoSection}>
          <img src={logo} alt="ZUCA Logo" style={logoStyle} />
          <div style={logoText}>
            <h3 style={logoTitle}>ZETECH UNIVERSITY</h3>
            <p style={logoSubtitle}>Catholic Action</p>
          </div>
        </div>

        <div style={userBadgeStyle}>
          {profileImageUrl ? (
            <img src={profileImageUrl} alt={user.fullName} style={userBadgeAvatar} />
          ) : (
            <div style={userBadgeFallback}>
              {user.fullName.charAt(0).toUpperCase()}
            </div>
          )}
          <div style={userBadgeInfo}>
            <span style={userBadgeName}>{user.fullName.split(" ")[0]} </span>
            <span style={userBadgeRole}>{user.role || "Member"}</span>
          </div>
        </div>

{/* ==================== ROLE SWITCHER ==================== */}
{(user?.specialRole || user?.role === "admin") && (
  <>
    {user?.role === "admin" && user?.specialRole ? (
      /* ========== DROPDOWN for users with BOTH admin account AND specialRole ========== */
      <div style={{ marginBottom: "16px", position: "relative" }}>
        <select
          onChange={async (e) => {
            const targetRole = e.target.value;
            if (!targetRole) return;
            
            const selectEl = e.target;
            const wrapperEl = selectEl.parentElement;
            
            // Create loading overlay
            const loadingDiv = document.createElement("div");
            loadingDiv.innerHTML = `
              <span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 0.6s linear infinite;margin-right:6px;"></span>
              Switching...
            `;
            loadingDiv.style.cssText = `
              position: absolute;
              inset: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              background: linear-gradient(135deg, #069b12, #1cf32e);
              color: white;
              font-size: 13px;
              font-weight: 600;
              borderRadius: 12px;
              zIndex: 10;
            `;
            wrapperEl.appendChild(loadingDiv);
            selectEl.style.visibility = "hidden";
            
            try {
              const token = localStorage.getItem("token");
              const res = await axios.post(`${BASE_URL}/api/switch-role`, 
                { targetRole },
                { headers: { Authorization: `Bearer ${token}` } }
              );
              
              localStorage.setItem("token", res.data.token);
              const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
              storedUser.role = res.data.role;
              storedUser.jumuiaCode = res.data.jumuiaCode || storedUser.homeJumuia?.code;
              localStorage.setItem("user", JSON.stringify(storedUser));
              
              if (targetRole === "member") window.location.href = "/dashboard";
              else if (targetRole === "jumuia_leader") {
                const code = res.data.jumuiaCode || user?.homeJumuia?.code;
                window.location.href = code ? `/jumuia/${code.toLowerCase()}` : "/leader";
              } else if (targetRole === "admin") window.location.href = "/admin";
              else if (targetRole === "secretary") window.location.href = "/secretary";
              else if (targetRole === "treasurer") window.location.href = "/treasurer";
              else if (targetRole === "choir_moderator") window.location.href = "/choir";
              else if (targetRole === "media_moderator") window.location.href = "/media-moderator";
            } catch (err) {
              loadingDiv.remove();
              selectEl.style.visibility = "visible";
              selectEl.value = "";
              alert("Failed to switch role");
            }
          }}
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: "12px",
            border: "none",
            background: "linear-gradient(135deg, #069b12, #1cf32e)",
            fontSize: "13px",
            fontWeight: "600",
            color: "white",
            cursor: "pointer",
            outline: "none",
            boxShadow: "0 2px 8px rgba(79, 70, 229, 0.3)",
            transition: "all 0.2s ease",
          }}
        >
          <option value="">🔑 Switch Role...</option>
          {window.location.pathname.startsWith("/admin") || 
           window.location.pathname.startsWith("/jumuia") || 
           window.location.pathname.startsWith("/secretary") || 
           window.location.pathname.startsWith("/treasurer") || 
           window.location.pathname.startsWith("/choir") || 
           window.location.pathname.startsWith("/leader") || 
           window.location.pathname.startsWith("/media-moderator") ? (
            <option value="member">👤 Back to Member Mode</option>
          ) : (
            <>
              <option value="admin"> Admin Mode</option>
              <option value={user.specialRole}>
                 {user.specialRole?.replace(/_/g, " ").toUpperCase()} Mode
              </option>
            </>
          )}
        </select>
      </div>
    ) : (
      /* ========== SINGLE BUTTON for users with only ONE role ========== */
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={async (e) => {
          const btn = e.currentTarget;
          const originalHTML = btn.innerHTML;
          
          btn.innerHTML = `
            <span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(11, 165, 36, 0.3);border-top-color:white;border-radius:50%;animation:spin 0.6s linear infinite;margin-right:6px;"></span>
            Switching...
          `;
          btn.style.opacity = "0.7";
          btn.style.pointerEvents = "none";
          
          const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
          const isOnRolePage = window.location.pathname.includes("/admin") || 
                               window.location.pathname.includes("/secretary") || 
                               window.location.pathname.includes("/treasurer") || 
                               window.location.pathname.includes("/choir") || 
                               window.location.pathname.includes("/leader") || 
                               window.location.pathname.includes("/media-moderator");
          const targetRole = isOnRolePage ? "member" : (user.specialRole || user.role);
          
          try {
            const token = localStorage.getItem("token");
            const res = await axios.post(`${BASE_URL}/api/switch-role`, 
              { targetRole },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            
            localStorage.setItem("token", res.data.token);
            storedUser.role = res.data.role;
            storedUser.jumuiaCode = res.data.jumuiaCode || storedUser.homeJumuia?.code;
            localStorage.setItem("user", JSON.stringify(storedUser));
            
            if (targetRole === "member") {
              window.location.href = "/dashboard";
            } else if (targetRole === "jumuia_leader") {
              const code = res.data.jumuiaCode || user?.homeJumuia?.code;
              window.location.href = code ? `/jumuia/${code.toLowerCase()}` : "/leader";
            } else {
              const rolePaths = {
                secretary: "/secretary",
                treasurer: "/treasurer",
                choir_moderator: "/choir",
                admin: "/admin",
                media_moderator: "/media-moderator"
              };
              window.location.href = rolePaths[targetRole] || "/dashboard";
            }
          } catch (err) {
            btn.innerHTML = originalHTML;
            btn.style.opacity = "1";
            btn.style.pointerEvents = "auto";
            alert(err.response?.data?.error || "Failed to switch role. Please try again.");
          }
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 14px",
          background: "linear-gradient(135deg, #069b12, #1cf32e)",
          color: "white",
          border: "none",
          borderRadius: "12px",
          fontSize: "12px",
          fontWeight: "600",
          cursor: "pointer",
          width: "100%",
          justifyContent: "center",
          marginBottom: "16px",
          boxShadow: "0 2px 8px rgba(21, 172, 71, 0.3)",
          transition: "all 0.2s ease",
        }}
      >
        {window.location.pathname.includes("/admin") || 
         window.location.pathname.includes("/secretary") || 
         window.location.pathname.includes("/treasurer") || 
         window.location.pathname.includes("/choir") || 
         window.location.pathname.includes("/leader") || 
         window.location.pathname.includes("/media-moderator")
          ? "👤 Back to Member Mode" 
          : `🔑 Switch to ${(user.specialRole || "ADMIN")?.replace(/_/g, " ").toUpperCase()} Mode`}
      </motion.button>
    )}
  </>
)}

        <div
          ref={scrollContainerRef}
          style={navContainer(sidebarShadow)}
        >
          <nav style={navStyle}>
            {navItems.map((item, index) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (isMobile) setMenuOpen(false);
                }}
              >
                {({ isActive }) => (
                  <motion.div
                    style={navCardStyle(isActive)}
                    whileHover={{ x: 5 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <span style={navCardIcon}>{item.icon}</span>
                    <span style={navCardLabel(isActive)}>{item.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        style={activeIndicatorStyle}
                        transition={{ type: "spring", damping: 20 }}
                      />
                    )}
                  </motion.div>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div style={sidebarFooterStyle}>
          <div style={sidebarFooterDivider} />
          <motion.button
            onClick={handleLogout}
            style={sidebarLogoutButton}
            whileHover={{ backgroundColor: "#dc2626", color: "#fff" }}
            whileTap={{ scale: 0.95 }}
          >
            <span style={logoutIconStyle}>🚪</span>
            Sign Out
          </motion.button>
        </div>
      </motion.aside>

      <main style={mainContentStyle(isMobile, menuOpen)}>
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          style={headerStyle}
        >
          <div style={headerLeftStyle}>
            <motion.button
              onClick={() => setMenuOpen(!menuOpen)}
              style={hamburgerStyle}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="mobile-hamburger"
            >
              <span style={hamburgerIconStyle}>{menuOpen ? "✕" : "☰"}</span>
            </motion.button>
            <span style={pageTitleStyle}>Dashboard</span>
          </div>

        <div style={headerRightStyle}>
  <button onClick={toggleDark} style={{ backgroundColor: "transparent", border: "none", cursor: "pointer" }}>
    <FaSun style={{ fontSize: "24px", color: "#f39c12" }} />
  </button>

            <div style={enhancedNotificationWrapperStyle}>
              <Notifications userId={user.id} />
             
            </div>

            <div ref={userMenuRef} style={userMenuContainerStyle}>
              <motion.div
                style={userMenuTriggerStyle}
                onClick={() => setShowUserMenu(!showUserMenu)}
                whileHover={{ backgroundColor: "#f1f5f9" }}
                whileTap={{ scale: 0.95 }}
              >
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt={user.fullName.split(" ")[0]} style={headerAvatarStyle} />
                ) : (
                  <div style={headerAvatarFallbackStyle}>
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span style={userNameStyle}>{user.fullName.split(" ")[1]}</span>
                <span style={dropdownArrowStyle}>▼</span>
              </motion.div>

              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    style={userDropdownStyle}
                  >
                    <div style={userDropdownHeader}>
                      <strong>{user.fullName}</strong>
                      <span style={userDropdownEmail}>{user.email}</span>
                    </div>
                    <div style={userDropdownDivider} />
                    <motion.button
                      onClick={handleLogout}
                      style={userDropdownLogout}
                      whileHover={{ backgroundColor: "#fef2f2", color: "#dc2626" }}
                    >
                      <span style={dropdownLogoutIcon}>🚪</span>
                      Sign Out
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.header>

        {/* REMOVED the motion.div wrapper that was affecting pages */}
        <Outlet />
      </main>

      <FloatingInstallButton />

      <style>
        {`

        
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }



          html, body, #root {
            height: 100%;
            width: 100%;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden;
          }

          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc;
          }

          main {
            scrollbar-width: thin;
            scrollbar-color: #cbd5e1 #f1f5f9;
          }
          
          main::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          
          main::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 10px;
          }
          
          main::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 10px;
          }
          
          main::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }

          @media (max-width: 900px) {
            .mobile-hamburger {
              display: flex !important;
            }
          }

          .sidebar {
            z-index: 50 !important;
          }

          .mobile-backdrop {
            z-index: 40 !important;
          }

          header {
            z-index: 10 !important;
          }

          .notifications-dropdown,
          [class*="Notifications"] [style*="position: fixed"],
          [class*="Notifications"] [style*="position: absolute"] {
            z-index: 9999999 !important;
          }

          .ai-btn {
  background: linear-gradient(135deg, #cf331e, #830707c5);
  border: none;
  border-radius: 13px;
  padding: 2px 4px;
  display: flex;
  align-items: center;
  gap: 3px;
  color: white;

  font-weight: 800;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.ai-btn:hover {
  transform: scale(1.02);
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
}

.messenger-badge {
  position: absolute;
  top: -8px;
  right: -12px;
  background: #25D366;
  color: white;
  font-size: 10px;
  font-weight: 600;
  min-width: 18px;
  height: 18px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}


        select option {
          background: #0dac28;
          color: white;
          padding: 10px;
        }


                select option {
          background: #11af0c;
          color: white;
          padding: 10px;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }


@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Mobile specific fixes for header */
@media (max-width: 600px) {
  .header-right-wrapper {
    gap: 2px !important;
  }
  
  .notification-wrapper {
    padding: 2px !important;
  }
  
  .user-menu-trigger {
    padding: 2px 6px !important;
  }
  
  .user-name-display {
    display: none !important;
  }
}
        `}
      </style>
    </div>
  );
}

const containerStyle = {
  height: "100vh",
  width: "100vw",
  background: "#f8fafc",
  position: "relative",
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  overflow: "hidden",
  margin: 0,
  padding: 0,
};

const backdropStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.3)",
  backdropFilter: "blur(4px)",
  zIndex: 40,
};

const sidebarStyle = {
  position: "fixed",
  left: 0,
  top: 0,
  height: "100vh",
  width: "250px",
  background: "#ffffff",
  boxShadow: "2px 0 12px rgba(0, 0, 0, 0.73)",
  padding: "24px 16px",
  display: "flex",
  flexDirection: "column",
  zIndex: 50,
  overflowY: "hidden",
};

const logoSection = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px",
  marginBottom: "24px",
  borderBottom: "1px solid #e2e8f0",
};

const logoStyle = {
  width: "44px",
  height: "auto",
  borderRadius: "10px",
};

const logoText = {
  flex: 1,
};

const logoTitle = {
  color: "#790591",
  fontSize: "13px",
  fontWeight: "700",
  margin: 0,
  lineHeight: "1.3",
  letterSpacing: "0.5px",
};

const logoSubtitle = {
  color: "#a0a2a5",
  fontSize: "11px",
  margin: "4px 0 0",
  fontWeight: "500",
};

const userBadgeStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px",
  background: "#f8fafc",
  borderRadius: "12px",
  marginBottom: "24px",
  border: "1px solid #e2e8f0",
};

const userBadgeAvatar = {
  width: "44px",
  height: "44px",
  borderRadius: "44px",
  objectFit: "cover",
  border: "2px solid #3b83f600",
};

const userBadgeFallback = {
  width: "44px",
  height: "44px",
  borderRadius: "44px",
  background: "linear-gradient(135deg, #f63b3b, #5025ebc5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  fontWeight: "600",
  color: "#fff",
};

const userBadgeInfo = {
  flex: 1,
};

const userBadgeName = {
  display: "block",
  color: "#1e293b",
  fontSize: "15px",
  fontWeight: "600",
  marginBottom: "2px",
};

const userBadgeRole = {
  display: "block",
  color: "#64748b",
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const navContainer = (shadow) => ({
  flex: 1,
  overflowY: "auto",
  paddingRight: "4px",
  transition: "box-shadow 0.3s",
  boxShadow: shadow ? "inset 0 8px 10px -8px rgba(0,0,0,0.05)" : "none",
});

const navStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

// NEW: Card styles for navigation (replaces old navItemStyle)
const navCardStyle = (isActive) => ({
  padding: "12px 16px",
  borderRadius: "12px",
  textDecoration: "none",
  color: isActive ? "#2feb8d" : "#475569",
  fontWeight: isActive ? "600" : "500",
  fontSize: "14px",
  fontFamily: "'Inter', sans-serif",
  backgroundColor: isActive ? "#9c9c9c" : "#ffffff",
  border: isActive ? "1px solid #bfdbfe" : "1px solid #e2e8f0",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  position: "relative",
  transition: "all 0.2s",
  cursor: "pointer",
  boxShadow: isActive ? "0 2px 4px rgba(59, 130, 246, 0.1)" : "none",
});

const navCardIcon = {
  fontSize: "20px",
  width: "28px",
};

const navCardLabel = (isActive) => ({
  color: isActive ? "#ffffff" : "#475569",
  fontWeight: isActive ? "600" : "500",
});

const activeIndicatorStyle = {
  position: "absolute",
  left: 0,
  top: "50%",
  transform: "translateY(-50%)",
  width: "3px",
  height: "20px",
  background: "#ff0000",
  borderRadius: "0 3px 3px 0",
};

const sidebarFooterStyle = {
  marginTop: "20px",
};

const sidebarFooterDivider = {
  height: "1px",
  background: "#e2e8f0",
  margin: "16px 0",
};

const sidebarLogoutButton = {
  width: "100%",
  padding: "10px",
  borderRadius: "10px",
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  color: "#dc2626",
  fontSize: "14px",
  fontWeight: "600",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
    marginBottom: "49px",

  gap: "8px",
  cursor: "pointer",
  transition: "all 0.2s",
};

const logoutIconStyle = {
  fontSize: "16px",
};

// CHANGED: Removed padding so pages control their own spacing
const mainContentStyle = (isMobile, menuOpen) => ({
  marginLeft: isMobile ? 0 : "280px",
  padding: 0,  // REMOVED: was "20px" on desktop
  position: "relative",
  zIndex: 1,
  height: "100vh",  
  overflowY: "auto",
  overflowX: "hidden",
  transition: "margin-left 0.3s ease",
  width: isMobile ? "100%" : `calc(100% - 280px)`,
  background: "#f8fafc",
});

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "fit-content",
  background: "#fafafa",
  borderRadius: "5px",
  padding: "4px 20px",
  marginBottom: "0px",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)",
  border: "1px solid #c0c2c4",
  position: "sticky",
  top: 1,
  marginRight: "0px",
  zIndex: 30,
  flexShrink: 0,
};

const headerLeftStyle = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
};

const hamburgerStyle = {
  display: "none",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  width: "40px",
  height: "40px",
  cursor: "pointer",
  alignItems: "center",
  justifyContent: "center",
  "@media (max-width: 900px)": {
    display: "flex",
  },
};

const hamburgerIconStyle = {
  color: "#475569",
  fontSize: "25px",
  fontWeight: "800",
};

const pageTitleStyle = {
  color: "#1e293b",
  fontSize: "16px",
  fontWeight: "600",
  "@media (max-width: 900px)": {
    fontSize: "16px",
  },
};

// Update these styles in your Layout.jsx

const headerRightStyle = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  flexShrink: 0, // Prevents squeezing
  "@media (max-width: 600px)": {
    gap: "4px",
  },
};

const enhancedNotificationWrapperStyle = {
  position: "relative",
  zIndex: 999999,
  isolation: "isolate",
  background: "#f7f4f4f3",
  borderRadius: "52px",
  padding: "0.1px", // Reduced from 0.10px
  border: "0.1px solid #e2e8f0",
  transition: "all 0.2s ease",
  cursor: "pointer",
  // REMOVED: left: "17px" - this was causing issues
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0, // Prevents squeezing
};

const userMenuContainerStyle = {
  position: "relative",
  zIndex: 100,
  // REMOVED: left: "9px" - this was causing issues
  padding: "4px 4px",
  flexShrink: 0, // Prevents squeezing
};

const userMenuTriggerStyle = {
  display: "flex",
  alignItems: "center",
  gap: "4px",
  padding: "4px 10px",
  borderRadius: "40px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  cursor: "pointer",
  position: "relative",
  zIndex: 101,
  flexShrink: 0, // Prevents squeezing
  "@media (max-width: 600px)": {
    padding: "3px 6px",
    gap: "2px",
  },
};

const headerAvatarStyle = {
  width: "40px",
  height: "40px",
  borderRadius: "36px",
  objectFit: "cover",
  border: "2px solid #3b83f600",
  "@media (max-width: 900px)": {
    width: "32px",
    height: "32px",
  },
};

const headerAvatarFallbackStyle = {
  width: "20px",
  height: "20px",
  borderRadius: "36px",
  background: "linear-gradient(135deg, #f3052d, #2563eb)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "16px",
  fontWeight: "600",
  color: "#fff",
  "@media (max-width: 900px)": {
    width: "2px",
    height: "32px",
    fontSize: "14px",
  },
};


const userNameStyle = {
  color: "#1e293b",
  fontSize: "14px",
  fontWeight: "800",
  "@media (max-width: 900px)": {
    display: "none",
  },
};

const dropdownArrowStyle = {
  color: "#94a3b8",
  fontSize: "10px",
  "@media (max-width: 900px)": {
    display: "none",
  },
};

const userDropdownStyle = {
  position: "absolute",
  top: "calc(100% + 8px)",
  right: 0,
  width: "240px",
  background: "#ffffff",
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
  zIndex: 102,
  overflow: "hidden",
  "@media (max-width: 900px)": {
    width: "200px",
  },
};

const userDropdownHeader = {
  padding: "12px 16px",
  borderBottom: "1px solid #e2e8f0",
};

const userDropdownEmail = {
  display: "block",
  color: "#64748b",
  fontSize: "12px",
  marginTop: "4px",
};

const userDropdownDivider = {
  height: "1px",
  background: "#e2e8f0",
};

const userDropdownLogout = {
  width: "100%",
  padding: "12px 16px",
  background: "transparent",
  border: "none",
  color: "#ef4444",
  fontSize: "14px",
  fontWeight: "500",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  cursor: "pointer",
  transition: "all 0.2s",
};

const dropdownLogoutIcon = {
  fontSize: "16px",
};






// REMOVED: contentStyle - no longer needed since we removed the wrapper

export default Layout;