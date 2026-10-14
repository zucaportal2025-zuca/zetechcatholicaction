// frontend/src/pages/JumuiaDashboard.jsx
import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import BASE_URL from "../api";
import io from "socket.io-client";
import SimpleMessageModal from "./SimpleMessageModal";
import { 
  FiArrowLeft, FiHeart, FiDollarSign, FiCheckCircle, 
  FiClock, FiMessageCircle, FiBell, FiUsers, FiTrendingUp,
  FiSend, FiCopy, FiDownload, FiShare2, FiMoreVertical
} from "react-icons/fi";
import { FaFileAlt } from "react-icons/fa";

function JumuiaDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("contributions");
  const [jumuiaName, setJumuiaName] = useState("");
  const [jumuiaId, setJumuiaId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });
  
  // Contributions state
  const [contributions, setContributions] = useState([]);
  const [pledgeInputs, setPledgeInputs] = useState({});
  const [submitting, setSubmitting] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);
  const [filter, setFilter] = useState("all");
  const [messageThread, setMessageThread] = useState(null);
  const [isJumuiaReady, setIsJumuiaReady] = useState(false);
  
  // Announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatRoom, setChatRoom] = useState(null);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  
  const fetchAttempted = useRef(false);
  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const messagesEndRef = useRef(null);

  const goBack = () => navigate('/dashboard');
  const [showLeftArrow, setShowLeftArrow] = useState(false);
const [showRightArrow, setShowRightArrow] = useState(false);
const tabsContainerRef = useRef(null);

const checkScrollPosition = () => {
  if (tabsContainerRef.current) {
    const { scrollLeft, scrollWidth, clientWidth } = tabsContainerRef.current;
    setShowLeftArrow(scrollLeft > 20);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 20);
  }
};

const scrollTabs = (direction) => {
  if (tabsContainerRef.current) {
    const scrollAmount = 200;
    const newScrollLeft = tabsContainerRef.current.scrollLeft + (direction === 'right' ? scrollAmount : -scrollAmount);
    tabsContainerRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  }
};

useEffect(() => {
  const checkScroll = () => checkScrollPosition();
  window.addEventListener('resize', checkScroll);
  return () => window.removeEventListener('resize', checkScroll);
}, []);

useEffect(() => {
  checkScrollPosition();
}, [activeTab]);


  // Replace your existing useEffect that gets jumuia info (lines 57-70)
useEffect(() => {
  const getUserJumuia = async () => {
    if (!token) return;
    
    try {
      const res = await axios.get(`${BASE_URL}/api/me`, { headers });
      console.log("User data from /api/me:", res.data);
      
      if (res.data.homeJumuia) {
        setJumuiaId(res.data.homeJumuia.id);
        setJumuiaName(res.data.homeJumuia.name);
        console.log("✅ Jumuia ID set from API:", res.data.homeJumuia.id);
      } else {
        console.log("User has no jumuia assigned");
      }
    } catch (err) {
      console.error("Failed to get user jumuia:", err);
    } finally {
      setLoading(false);
    }
  };
  
  getUserJumuia();
}, [token]);

// Add this near the top with other useEffects (around line 55)
useEffect(() => {
  const userStr = localStorage.getItem("user");
  if (userStr) {
    try {
      const userData = JSON.parse(userStr);
      setUser(userData);
      console.log("User loaded from localStorage:", userData.fullName);
    } catch (e) {
      console.error("Failed to parse user", e);
    }
  }
}, []);
useEffect(() => {
  const loadChat = async () => {
    console.log("🔵 LOAD CHAT CALLED - activeTab:", activeTab, "jumuiaId:", jumuiaId);
    
    if (activeTab !== 'chat' || !jumuiaId) {
      console.log("⏸️ Skipping chat load - conditions not met");
      return;
    }
    
    console.log("🟢 Starting chat load...");
    setLoadingChat(true);
    const room = await getOrCreateChatRoom();
    console.log("🟢 Room from getOrCreateChatRoom:", room);
    
   if (room) {
  setChatRoom(room);
  try {
    const msgRes = await axios.get(`${BASE_URL}/api/jumuia/chat/rooms/${room.id}/messages`, { headers });
    setChatMessages(msgRes.data.messages || []);
    // Force scroll after messages are set
    setTimeout(() => scrollToBottom(), 300);
  } catch (err) {
    console.error("Failed to load messages:", err);
  }
} else {
      console.error("❌ No chat room returned!");
    }
    setLoadingChat(false);
  };
  
  loadChat();
}, [activeTab, jumuiaId]);



  // Get user's jumuia info
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        if (userData.jumuia) {
          setJumuiaName(userData.jumuia);
          const jumuiaCode = userData.jumuiaCode || 
            userData.jumuia.toLowerCase().replace(/\./g, '').replace(/\s+/g, '');
          fetchJumuiaId(jumuiaCode);
        }
      } catch (e) {
        console.error("Failed to parse user", e);
      }
    }
  }, []);


  
 const fetchJumuiaId = async (code) => {
  try {
    const res = await axios.get(`${BASE_URL}/api/jumuia/${code}`, { headers });
    setJumuiaId(res.data.id);
    setIsJumuiaReady(true); // ← ADD THIS LINE
  } catch (err) {
    console.error("Failed to fetch jumuia ID:", err);
    setIsJumuiaReady(true); // Also set true on error to prevent infinite loading
  }
};

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "" }), 3000);
  };

  // Socket connection for real-time updates
  useEffect(() => {
    const socket = io(BASE_URL);
    
    socket.on('connect', () => {
      console.log('Connected to real-time updates');
    });

    socket.on('pledge_updated', (updatedPledge) => {
      setContributions(prev => 
        prev.map(pledge => 
          pledge.id === updatedPledge.id ? updatedPledge : pledge
        )
      );
      
      if (updatedPledge.status === "APPROVED") {
        const paidAmount = updatedPledge.amountPaid;
        const remaining = updatedPledge.amountRequired - paidAmount;
        showNotification(
          `✅ Hi ${user?.fullName?.split(' ')[0] || 'User'}, your pledge has been approved! ${remaining > 0 ? `Remaining: KES ${remaining.toLocaleString()}` : 'Fully paid!'}`, 
          "success"
        );
      } else if (updatedPledge.status === "COMPLETED") {
        showNotification(
          `🎉 Congratulations! Your contribution of KES ${updatedPledge.amountRequired.toLocaleString()} is complete!`, 
          "success"
        );
      }
    });

    socket.on('pledge_created', (newPledge) => {
      setContributions(prev => [newPledge, ...prev]);
    });

    socket.on('new_message', (message) => {
      const pledge = contributions.find(p => p.id === message.pledgeId);
      if (pledge) {
        showNotification(`💬 New message about "${pledge.title}"`, "info");
      }
    });

    return () => socket.disconnect();
  }, [contributions]);

  // Silent background refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!refreshing && activeTab === "contributions") {
        silentRefresh();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [activeTab]);

  const silentRefresh = useCallback(async () => {
    if (!token || refreshing) return;
    
    try {
      const res = await axios.get(`${BASE_URL}/api/contributions/jumuia`, { headers });
      setContributions(res.data);
    } catch (err) {
      console.error("Background refresh error:", err);
    }
  }, [token, headers, refreshing]);

  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [token, navigate]);

  const fetchContributions = useCallback(async (isRefresh = false) => {
    if (!token) return;
    
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    setError(null);
    
    try {
      const res = await axios.get(`${BASE_URL}/api/contributions/jumuia`, { headers });
      setContributions(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch contributions");
    } finally {
      setLoading(false);
      setRefreshing(false);
      fetchAttempted.current = true;
    }
  }, [token, headers]);

  useEffect(() => {
    if (token && !fetchAttempted.current && activeTab === "contributions") {
      fetchContributions();
    }
  }, [token, fetchContributions, activeTab]);

  const calculateRemaining = (contribution) => {
    return contribution.amountRequired - contribution.amountPaid;
  };

  const handleOpenMessage = (pledgeId, pledgeTitle) => {
    setMessageThread({ pledgeId, pledgeTitle });
  };

  const optimisticUpdate = (contributionId, updates) => {
    setContributions(prev => 
      prev.map(c => 
        c.id === contributionId ? { ...c, ...updates } : c
      )
    );
  };

  const handlePledge = async (contributionId) => {
    const { amount, message } = pledgeInputs[contributionId] || {};
    const parsedAmount = parseFloat(amount);

    const contribution = contributions.find((c) => c.id === contributionId);
    if (!contribution) return;

    if (!amount || parsedAmount <= 0) {
      showNotification("Please enter a valid amount", "error");
      return;
    }
    
    const remaining = calculateRemaining(contribution);
    if (parsedAmount > remaining) {
      showNotification(`Amount cannot exceed KES ${remaining.toLocaleString()}`, "error");
      return;
    }

    setSubmitting(prev => ({ ...prev, [contributionId]: true }));

    const originalContribution = { ...contribution };

    optimisticUpdate(contributionId, {
      pendingAmount: (contribution.pendingAmount || 0) + parsedAmount,
      message: message?.trim() || contribution.message
    });

    setPledgeInputs(prev => ({
      ...prev,
      [contributionId]: { amount: "", message: "" }
    }));

    try {
      const response = await axios.post(
        `${BASE_URL}/api/pledges/${contribution.id}`,
        { amount: parsedAmount, message: message?.trim() || "" },
        { headers }
      );
      
      setContributions(prev => 
        prev.map(c => {
          if (c.id === contributionId) {
            return {
              ...c,
              pendingAmount: response.data.pendingAmount ?? c.pendingAmount,
              amountPaid: response.data.amountPaid ?? c.amountPaid,
              status: response.data.status ?? c.status,
              message: response.data.message ?? c.message
            };
          }
          return c;
        })
      );
      
      showNotification("Pledge submitted successfully!", "success");
    } catch (err) {
      setContributions(prev => 
        prev.map(c => 
          c.id === contributionId ? originalContribution : c
        )
      );
      showNotification(err.response?.data?.error || "Failed to submit pledge", "error");
    } finally {
      setSubmitting(prev => ({ ...prev, [contributionId]: false }));
    }
  };

  const handleInputChange = (contributionId, field, value) => {
    setPledgeInputs(prev => ({
      ...prev,
      [contributionId]: {
        ...prev[contributionId],
        [field]: value
      }
    }));
  };

  const filteredContributions = contributions.filter(c => {
    if (filter === "all") return true;
    if (filter === "pending") return c.status === "PENDING" && c.pendingAmount > 0;
    if (filter === "approved") return c.status === "APPROVED";
    if (filter === "completed") return c.amountPaid >= c.amountRequired;
    return true;
  });

  const stats = {
    totalPledged: contributions.reduce((sum, c) => sum + (c.amountPaid || 0) + (c.pendingAmount || 0), 0),
    totalPaid: contributions.reduce((sum, c) => sum + (c.amountPaid || 0), 0),
    totalPending: contributions.reduce((sum, c) => sum + (c.pendingAmount || 0), 0),
    completedCount: contributions.filter(c => c.amountPaid >= c.amountRequired).length,
    pendingCount: contributions.filter(c => c.status === "PENDING" && c.pendingAmount > 0).length,
    totalRequired: contributions.reduce((sum, c) => sum + (c.amountRequired || 0), 0),
    progressPercentage: contributions.length > 0 
      ? (contributions.reduce((sum, c) => sum + (c.amountPaid || 0), 0) / 
         contributions.reduce((sum, c) => sum + (c.amountRequired || 0), 0) * 100).toFixed(1)
      : 0
  };

  // ==================== ANNOUNCEMENTS ====================

 const fetchAnnouncements = async () => {
  console.log("📢 fetchAnnouncements called, jumuiaId:", jumuiaId);
  if (!jumuiaId) {
    console.log("❌ No jumuiaId, skipping");
    return;
  }
  
  setLoadingAnnouncements(true);
  try {
    const res = await axios.get(`${BASE_URL}/api/jumuia/${jumuiaId}/announcements`, { headers });
    console.log("📢 Announcements response:", res.data);
    setAnnouncements(res.data);
  } catch (err) {
    console.error("Failed to fetch announcements:", err);
    showNotification("Failed to load announcements", "error");
  } finally {
    setLoadingAnnouncements(false);
  }
};
// Change FROM:
useEffect(() => {
  if (isJumuiaReady && jumuiaId && activeTab === "announcements") {
    fetchAnnouncements();
  }
}, [isJumuiaReady, jumuiaId, activeTab]);

// TO:
useEffect(() => {
  if (jumuiaId && activeTab === "announcements") {
    console.log("📢 Fetching announcements for jumuiaId:", jumuiaId);
    fetchAnnouncements();
  }
}, [jumuiaId, activeTab]);

// TO:
useEffect(() => {
  if (jumuiaId && activeTab === "announcements") {
    console.log("📢 Fetching announcements for jumuiaId:", jumuiaId);
    fetchAnnouncements();
  }
}, [jumuiaId, activeTab]);

  // ==================== CHAT ====================

  const getOrCreateChatRoom = async () => {
    if (!jumuiaId) return null;
    
    try {
      const res = await axios.get(`${BASE_URL}/api/jumuia/${jumuiaId}/chat/rooms`, { headers });
      
      if (res.data && res.data.length > 0) {
        return res.data[0];
      }
      
      const createRes = await axios.post(
        `${BASE_URL}/api/jumuia/${jumuiaId}/chat/rooms`,
        { name: 'general', description: 'General chat' },
        { headers }
      );
      return createRes.data;
    } catch (err) {
      console.error("Chat room error:", err);
      return null;
    }
  };

 useEffect(() => {
  const loadChat = async () => {
    if (activeTab !== 'chat' || !isJumuiaReady || !jumuiaId) return;
    
    setLoadingChat(true);
    const room = await getOrCreateChatRoom();
    
    if (room) {
      setChatRoom(room);
      try {
        const msgRes = await axios.get(`${BASE_URL}/api/jumuia/chat/rooms/${room.id}/messages`, { headers });
        setChatMessages(msgRes.data.messages || []);
        scrollToBottom();  // ← ADD THIS HERE
      } catch (err) {
        console.error("Failed to load messages:", err);
      }
    }
    setLoadingChat(false);
  };
  
  loadChat();
}, [activeTab, isJumuiaReady, jumuiaId]);

  useEffect(() => {
  if (!isJumuiaReady || !jumuiaId) return; // ← Added isJumuiaReady

  const socket = io(BASE_URL);
  
  socket.on('connect', () => {
    socket.emit('join-jumuia', jumuiaId);
  });

  socket.on('new_jumuia_message', (message) => {
  setChatMessages(prev => [...prev, message]);  // Add to END, not beginning
  scrollToBottom();
  
  if (message.userId !== getCurrentUserId()) {
    showNotification(`💬 New message from ${message.user?.fullName}`, "info");
  }
});

  return () => socket.disconnect();
}, [isJumuiaReady, jumuiaId]); // ← Added isJumuiaReady

  // Replace your existing scrollToBottom function (around line 300-310)

const scrollToBottom = () => {
  setTimeout(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, 100);
};

  // Auto-scroll to bottom whenever messages change
useEffect(() => {
  if (chatMessages.length > 0 && !loadingChat) {
    scrollToBottom();
  }
}, [chatMessages, loadingChat]);

  const getCurrentUserId = () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return null;
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.userId;
    } catch (e) {
      return null;
    }
  };

const handleSendMessage = async () => {
  console.log("=== SEND MESSAGE DEBUG ===");
  console.log("newMessage:", newMessage);
  console.log("chatRoom:", chatRoom);
  console.log("sendingMessage:", sendingMessage);
  console.log("jumuiaId:", jumuiaId);
  
  // ✅ FIRST: Validate
  if (!newMessage.trim() || !chatRoom || sendingMessage) {
    console.log("❌ Cannot send - conditions not met");
    return;
  }

  setSendingMessage(true);

  // ✅ THEN: Create temp message
  const tempMessage = {
    id: 'temp-' + Date.now(),
    content: newMessage,
    userId: getCurrentUserId(),
    user: { fullName: 'You' },
    createdAt: new Date().toISOString(),
    isTemp: true
  };

  // ✅ THEN: Update UI
  setChatMessages(prev => [...prev, tempMessage]);
  scrollToBottom();
  
  const messageToSend = newMessage;
  setNewMessage('');

  try {
    const res = await axios.post(
      `${BASE_URL}/api/jumuia/chat/rooms/${chatRoom.id}/messages`,
      { content: messageToSend },
      { headers }
    );
    
    setChatMessages(prev => 
      prev.map(msg => msg.id === tempMessage.id ? res.data : msg)
    );
  } catch (err) {
    setChatMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
    showNotification("Failed to send message", "error");
  } finally {
    setSendingMessage(false);
  }
};

  if (!token) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={styles.container}
    >
      {/* Back Button */}
      <div style={styles.backButtonContainer}>
        <motion.button
          whileHover={{ scale: 1.05, x: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={goBack}
          style={styles.backButton}
        >
          <FiArrowLeft size={20} />
          <span>Back</span>
        </motion.button>
      </div>

      {/* Notification */}
      <AnimatePresence>
        {notification.show && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            style={{...styles.notification, ...styles[notification.type]}}
          >
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>{jumuiaName || 'My Jumuia'}</h1>
          <p style={styles.subtitle}> Hey {user?.fullName?.split(" ")[0] || "User"}, welcome to your jumuia dashboard, here you'll find  {jumuiaName || 'your jumuia'} announcements, and cotribution when they are posted by the moderator.</p>
        </div>
      </div>

      {/* Tabs */}
     <div style={styles.tabsSection}>
  {/* Left Arrow */}
  {showLeftArrow && (
    <button 
      style={styles.scrollArrow} 
      onClick={() => scrollTabs('left')}
      aria-label="Scroll left"
    >
      ◀
    </button>
  )}
  
  {/* Scrollable Tabs */}
  <div 
    ref={tabsContainerRef}
    style={styles.tabs}
    onScroll={checkScrollPosition}
  >
    <button 
      style={{...styles.tabBtn, ...(activeTab === 'contributions' ? styles.tabBtnActive : {})}} 
      onClick={() => setActiveTab('contributions')}
    >
      <FiHeart size={16} /> Contributions
    </button>
    <button 
      style={{...styles.tabBtn, ...(activeTab === 'announcements' ? styles.tabBtnActive : {})}} 
      onClick={() => setActiveTab('announcements')}
    >
      <FiBell size={16} /> Announcements
    </button>
    <button 
      style={{...styles.tabBtn, ...(activeTab === 'chat' ? styles.tabBtnActive : {})}} 
      onClick={() => setActiveTab('chat')}
    >
      <FiMessageCircle size={16} /> Chat
    </button>
  </div>
  
  {/* Right Arrow */}
  {showRightArrow && (
    <button 
      style={styles.scrollArrow} 
      onClick={() => scrollTabs('right')}
      aria-label="Scroll right"
    >
      ▶
    </button>
  )}
</div>
      {/* Tab Content */}
      <div style={styles.tabContent}>
        {/* CONTRIBUTIONS TAB */}
        {activeTab === 'contributions' && (
          <div>
            {/* Stats Cards */}
            {contributions.length > 0 && (
              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <div style={styles.statIcon}>💰</div>
                  <div style={styles.statContent}>
                    <span style={styles.statValue}>KES {stats.totalPledged.toLocaleString()}</span>
                    <span style={styles.statLabel}>Total Pledged</span>
                  </div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statIcon}>✅</div>
                  <div style={styles.statContent}>
                    <span style={styles.statValue}>KES {stats.totalPaid.toLocaleString()}</span>
                    <span style={styles.statLabel}>Amount Paid</span>
                  </div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statIcon}>⏳</div>
                  <div style={styles.statContent}>
                    <span style={styles.statValue}>KES {stats.totalPending.toLocaleString()}</span>
                    <span style={styles.statLabel}>Pending</span>
                  </div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statIcon}>🎯</div>
                  <div style={styles.statContent}>
                    <span style={styles.statValue}>{stats.completedCount}/{contributions.length}</span>
                    <span style={styles.statLabel}>Completed</span>
                  </div>
                </div>
              </div>
            )}

            {/* Filters */}
            {contributions.length > 0 && (
              <div style={styles.filters}>
                <button 
                  style={{...styles.filterBtn, ...(filter === 'all' ? styles.filterBtnActive : {})}}
                  onClick={() => setFilter('all')}
                >
                  All <span style={styles.filterCount}>{contributions.length}</span>
                </button>
                <button 
                  style={{...styles.filterBtn, ...(filter === 'pending' ? styles.filterBtnActive : {})}}
                  onClick={() => setFilter('pending')}
                >
                  Pending <span style={styles.filterCount}>{stats.pendingCount}</span>
                </button>
                <button 
                  style={{...styles.filterBtn, ...(filter === 'approved' ? styles.filterBtnActive : {})}}
                  onClick={() => setFilter('approved')}
                >
                  Approved
                </button>
                <button 
                  style={{...styles.filterBtn, ...(filter === 'completed' ? styles.filterBtnActive : {})}}
                  onClick={() => setFilter('completed')}
                >
                  Completed <span style={styles.filterCount}>{stats.completedCount}</span>
                </button>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div style={styles.loadingState}>
                <div style={styles.spinner}></div>
                <p>Loading your contributions...</p>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div style={styles.errorState}>
                <div style={styles.errorIcon}>⚠️</div>
                <h3>Unable to Load Contributions</h3>
                <p>{error}</p>
                <button style={styles.retryBtn} onClick={() => fetchContributions()}>
                  Try Again
                </button>
              </div>
            )}

            {/* Refresh Indicator */}
            {refreshing && (
              <div style={styles.refreshIndicator}>
                <div style={styles.refreshSpinner}></div>
                <span>Updating...</span>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && filteredContributions.length === 0 && (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}><FaFileAlt/></div>
                <h3>No contributions found</h3>
                <p>No contributions available for this filter.</p>
                {filter !== 'all' && (
                  <button style={styles.resetFilterBtn} onClick={() => setFilter('all')}>
                    View All
                  </button>
                )}
              </div>
            )}

            {/* Contributions List */}
            {!loading && !error && filteredContributions.length > 0 && (
              <div style={styles.contributionsList}>
                {filteredContributions.map((contribution) => (
                  <ContributionCard
                    key={contribution.id}
                    contribution={contribution}
                    pledgeInput={pledgeInputs[contribution.id] || {}}
                    onPledgeChange={(field, value) => 
                      handleInputChange(contribution.id, field, value)
                    }
                    onPledge={() => handlePledge(contribution.id)}
                    isSubmitting={submitting[contribution.id]}
                    remainingAmount={calculateRemaining(contribution)}
                    isExpanded={expandedCard === contribution.id}
                    onToggle={() => setExpandedCard(
                      expandedCard === contribution.id ? null : contribution.id
                    )}
                    onOpenMessage={() => handleOpenMessage(contribution.id, contribution.title)}
                    user={user}

                    
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ANNOUNCEMENTS TAB */}
        {activeTab === 'announcements' && (
          <div>
            {loadingAnnouncements ? (
              <div style={styles.loadingState}>
                <div style={styles.spinner}></div>
                <p>Loading announcements...</p>
              </div>
            ) : announcements.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>📢</div>
                <h3>No Announcements</h3>
                <p>There are no announcements for your jumuia yet.</p>
              </div>
            ) : (
              <div style={styles.announcementsList}>
                {announcements.map((announcement) => (
                  <div key={announcement.id} style={styles.announcementCard}>
                    <div style={styles.announcementHeader}>
                      <h3 style={styles.announcementTitle}>{announcement.title}</h3>
                      <span style={styles.announcementCategory}>{announcement.category}</span>
                    </div>
                    <p style={styles.announcementContent}>{announcement.content}</p>
                    <div style={styles.announcementFooter}>
                      <span>By: {announcement.author?.fullName || 'Unknown'}</span>
                      <span>{new Date(announcement.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CHAT TAB - REDESIGNED */}
  {activeTab === 'chat' && (
  <div style={styles.chatContainer}>
    {/* Chat Header */}
    <div style={styles.chatHeader}>
      <div style={styles.chatHeaderLeft}>
        <div style={styles.chatHeaderAvatar}>
          <FiMessageCircle size={18} />
        </div>
        <div>
          <h3 style={styles.chatHeaderTitle}>{jumuiaName || 'Jumuia'} Chat</h3>
          <p style={styles.chatHeaderSubtitle}> discussion Forum</p>
        </div>
      </div>
    </div>

    {loadingChat ? (
      <div style={styles.loadingState}>
        <div style={styles.spinner}></div>
        <p>Loading messages...</p>
      </div>
    ) : (
      <>
        <div style={styles.messagesWrapper}>
          <div style={styles.messagesContainer}>
            {chatMessages.length === 0 ? (
              <div style={styles.emptyChat}>
                <div style={styles.emptyIcon}>💬</div>
                <h3>No messages yet</h3>
                <p>Be the first to start the conversation!</p>
              </div>
            ) : (
              // REMOVED .reverse() - messages should already be in correct order from API
              chatMessages.map((message) => {
                const isOwn = message.userId === getCurrentUserId();
                const isAdmin = message.user?.role === "admin" || message.user?.specialRole === "admin";
                
                return (
                  <div
                    key={message.id}
                    style={{
                      ...styles.messageRow,
                      ...(isOwn ? styles.messageRowOwn : {})
                    }}
                  >
                    {/* Avatar */}
                    <div style={styles.messageAvatar}>
                      {message.user?.profileImage ? (
                        <img 
                          src={message.user.profileImage}
                          alt={message.user?.fullName}
                          style={styles.avatarImage}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = message.user?.fullName?.charAt(0).toUpperCase() || '?';
                          }}
                        />
                      ) : (
                        <span style={styles.avatarText}>
                          {message.user?.fullName?.charAt(0).toUpperCase() || '?'}
                        </span>
                      )}
                      {isAdmin && <span style={styles.adminCrown}>👑</span>}
                    </div>

                    {/* Message Bubble */}
                    <div style={styles.messageBubbleWrapper}>
                      {!isOwn && (
                        <span style={styles.messageSenderName}>
                          {message.user?.fullName}
                        </span>
                      )}
                      
                      <div style={{
                        ...styles.messageBubble,
                        ...(isOwn ? styles.messageBubbleOwn : {})
                      }}>
                        {message.isEdited && (
                          <span style={styles.editedIndicator}>(edited) </span>
                        )}
                        <p style={styles.messageText}>{message.content}</p>
                        
                        {/* File Attachments */}
                        {message.attachments?.length > 0 && (
                          <div style={styles.attachments}>
                            {message.attachments.map((file, idx) => {
                              const isImage = file.type?.startsWith('image/');
                              return isImage ? (
                                <img 
                                  key={idx} 
                                  src={file.url} 
                                  alt="attachment" 
                                  style={styles.attachmentImage}
                                />
                              ) : (
                                <a key={idx} href={file.url} style={styles.fileAttachment}>
                                  📎 {file.name}
                                </a>
                              );
                            })}
                          </div>
                        )}
                        
                        <div style={styles.messageFooter}>
                          <span style={styles.messageTime}>
                            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div style={styles.inputWrapper}>
          <div style={styles.inputContainer}>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder="Type a message..."
              style={styles.messageInput}
              rows="1"
              disabled={sendingMessage}
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sendingMessage}
              style={{
                ...styles.sendButton,
                ...((!newMessage.trim() || sendingMessage) && styles.sendButtonDisabled)
              }}
            >
              {sendingMessage ? <div style={styles.sendSpinner} /> : <FiSend size={18} />}
            </button>
          </div>
        </div>
      </>
    )}
  </div>
)}
      </div>

      {/* Message Modal */}
      {messageThread && (
        <SimpleMessageModal
          pledgeId={messageThread.pledgeId}
          userName={messageThread.pledgeTitle}
          onClose={() => setMessageThread(null)}
        />
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </motion.div>
  );
}

// Contribution Card Component
const ContributionCard = ({ 
  contribution, 
  pledgeInput, 
  onPledgeChange, 
  onPledge, 
  isSubmitting,
  remainingAmount,
  isExpanded,
  onToggle,
  onOpenMessage,
  user

  
}) => {
  const amountPaid = contribution.amountPaid || 0;
  const pendingAmount = contribution.pendingAmount || 0;
  const amountRequired = contribution.amountRequired || 0;
  
  const completed = amountPaid >= amountRequired;
  const status = completed ? "COMPLETED" : contribution.status || "PENDING";
  
  const paidPercentage = amountRequired > 0 ? Math.min((amountPaid / amountRequired) * 100, 100) : 0;
  const pendingPercentage = amountRequired > 0 ? Math.min((pendingAmount / amountRequired) * 100, 100) : 0;

  const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num || 0);

  const getStatusColor = () => {
    if (completed) return '#059669';
    if (contribution.status === "APPROVED") return '#2563eb';
    if (contribution.status === "PENDING" && pendingAmount > 0) return '#d97706';
    return '#64748b';
  };

  const getStatusBg = () => {
    if (completed) return '#d1fae5';
    if (contribution.status === "APPROVED") return '#dbeafe';
    if (contribution.status === "PENDING" && pendingAmount > 0) return '#fef3c7';
    return '#f1f5f9';
  };

  const getStatusText = () => {
    if (completed) return 'Completed';
    if (contribution.status === "APPROVED") return 'Approved';
    if (contribution.status === "PENDING" && pendingAmount > 0) return 'Pending';
    return 'No Pledge';
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      style={{...styles.contributionCard, ...(isSubmitting ? styles.submitting : {})}}
    >
      {/* Card Header */}
      <div style={styles.cardHeader} onClick={onToggle}>
        <div style={styles.headerMain}>
          <h3 style={styles.cardTitle}>{contribution.title}</h3>
          {contribution.description && (
            <p style={styles.cardDescription}>{contribution.description}</p>
          )}
        </div>
        
        <div style={styles.headerRight}>
          <span style={{...styles.statusBadge, background: getStatusBg(), color: getStatusColor()}}>
            {getStatusText()}
          </span>
          <span style={styles.expandIcon}>{isExpanded ? '−' : '+'}</span>
        </div>
      </div>

      {/* Progress Overview */}
      <div style={styles.progressOverview}>
        <div style={styles.progressStats}>
          <div style={styles.progressStat}>
            <span style={styles.statLabel}>Required</span>
            <span style={styles.statNumber}>KES {formatNumber(amountRequired)}</span>
          </div>
          <div style={styles.progressStat}>
            <span style={styles.statLabel}>Paid</span>
            <span style={{...styles.statNumber, color: "#10b981"}}>KES {formatNumber(amountPaid)}</span>
          </div>
          <div style={styles.progressStat}>
            <span style={styles.statLabel}>Pending</span>
            <span style={{...styles.statNumber, color: "#f59e0b"}}>KES {formatNumber(pendingAmount)}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={styles.progressBarContainer}>
          <div style={styles.progressBar}>
            <div style={{...styles.progressSegmentPaid, width: `${paidPercentage}%`}} />
            <div style={{...styles.progressSegmentPending, width: `${pendingPercentage}%`}} />
          </div>
          <div style={styles.progressLabels}>
            <span style={styles.progressLabel}>
              <span style={{...styles.dot, background: "#10b981"}}></span>
              Paid: {paidPercentage.toFixed(0)}%
            </span>
            <span style={styles.progressLabel}>
              <span style={{...styles.dot, background: "#f59e0b"}}></span>
              Pending: {pendingPercentage.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={styles.expandedContent}
          >
            {/* Full Description */}
            {contribution.description && (
              <div style={styles.detailSection}>
                <h4 style={styles.sectionTitle}>About</h4>
                <p style={styles.sectionText}>{contribution.description}</p>
              </div>
            )}

            {/* Detailed Breakdown */}
            <div style={styles.detailSection}>
              <h4 style={styles.sectionTitle}>Breakdown</h4>
              <div style={styles.breakdownList}>
                <div style={styles.breakdownItem}>
                  <span>Amount Required</span>
                  <span>KES {formatNumber(amountRequired)}</span>
                </div>
                <div style={styles.breakdownItem}>
                  <span>Amount Paid</span>
                  <span style={{color: "#10b981"}}>KES {formatNumber(amountPaid)}</span>
                </div>
                <div style={styles.breakdownItem}>
                  <span>Pending Approval</span>
                  <span style={{color: "#f59e0b"}}>KES {formatNumber(pendingAmount)}</span>
                </div>
                <div style={{...styles.breakdownItem, ...styles.breakdownItemTotal}}>
                  <span>Remaining to Pay</span>
                  <span>KES {formatNumber(remainingAmount)}</span>
                </div>
              </div>
            </div>

            {/* Pledge Form */}
            {!completed && (
              <div style={styles.detailSection}>
                <h4 style={styles.sectionTitle}>Make a Pledge</h4>
                <div style={styles.pledgeForm}>
                  <div style={styles.inputGroup}>
                    <input
                      type="number"
                      placeholder="Amount"
                      style={styles.pledgeInput}
                      value={pledgeInput.amount || ""}
                      onChange={(e) => onPledgeChange("amount", e.target.value)}
                      max={remainingAmount}
                      min={1}
                      disabled={isSubmitting}
                    />
                    <span style={styles.inputHint}>Max: KES {formatNumber(remainingAmount)}</span>
                  </div>

                  <input
                    type="text"
                    placeholder="Add a message (optional)"
                    style={{...styles.pledgeInput, ...styles.pledgeInputMessage}}
                    value={pledgeInput.message || ""}
                    onChange={(e) => onPledgeChange("message", e.target.value)}
                    disabled={isSubmitting}
                  />

                  <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
  <button style={{...styles.pledgeBtn, flex: 1}} onClick={onPledge} disabled={isSubmitting}>
    {isSubmitting ? 'Submitting...' : 'Submit Pledge'}
  </button>
  
  {/* NEW: Pay Now Button */}
  <button 
    style={styles.payNowBtn}
    onClick={() => {
      const paymentLink = `${window.location.origin}/pay/campaign/${contribution.contributionTypeId || contribution.id}`;
      window.open(paymentLink, '_blank');
    }}
    disabled={isSubmitting}
  >
    💳 Pay Now
  </button>
  
  <button style={styles.messageBtn} onClick={onOpenMessage} disabled={isSubmitting}>
    💬
  </button>
</div>
                </div>
                <p style={styles.formNote}>
                  Your pledge will be pending until approved by an administrator.
                </p>
              </div>
            )}

            {/* Completed Message */}
            {completed && (
              <div style={styles.completedMessage}>
                <span style={styles.completedIcon}>🎉</span>
                <div>
                  <h4>Contribution Completed!</h4>
                  <p>Thank you {user?.fullName?.split(' ')[0] || 'User'} for your generous contribution.</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ====== STYLES ======

const styles = {
  container: {
    minHeight: "100vh",
    background: "#f8fafc",
    padding: "20px",
    marginBottom: "40px",
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  
  backButtonContainer: {
    marginBottom: "20px",
  },
  backButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "30px",
    fontSize: "13px",
    fontWeight: "500",
    color: "#475569",
    cursor: "pointer",
    transition: "all 0.2s",
  },

  payNowBtn: {
  flex: 1,
  padding: "14px",
  border: "none",
  borderRadius: "10px",
  background: "#10b981",
  color: "white",
  fontSize: "14px",
  fontWeight: "600",
  cursor: "pointer",
  transition: "all 0.2s",
},
  
  notification: {
    position: "fixed",
    top: "100px",
    right: "20px",
    padding: "12px 20px",
    borderRadius: "10px",
    color: "white",
    fontSize: "14px",
    fontWeight: "500",
    zIndex: 9999,
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  },
  success: { background: "#10b981" },
  error: { background: "#ef4444" },
  info: { background: "#3b82f6" },
  
  header: {
    maxWidth: "1200px",
    margin: "0 auto 24px",
  },
  headerLeft: {
    marginBottom: "8px",
  },
  title: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#1e293b",
    margin: "0 0 4px 0",
  },
  subtitle: {
    fontSize: "14px",
    color: "#64748b",
    margin: 0,
  },
  
 tabs: {
  maxWidth: "1200px",
  margin: "0 auto 24px",
  display: "flex",
  gap: "8px",
  borderBottom: "2px solid #e2e8f0",
  paddingBottom: "8px",
  // SCROLLABLE TABS - EASY TO SCROLL
  overflowX: "auto",
  overflowY: "hidden",
  WebkitOverflowScrolling: "touch",  // Smooth momentum scrolling on iOS
  scrollBehavior: "smooth",          // Smooth scrolling
  cursor: "grab",                    // Shows grab cursor
  "&:active": {
    cursor: "grabbing",              // Shows grabbing when scrolling
  },
  // Hide scrollbar but keep functionality (cleaner look)
  scrollbarWidth: "none",            // Firefox
  msOverflowStyle: "none",           // IE/Edge
  "&::-webkit-scrollbar": {
    display: "none",                 // Chrome/Safari
  },

  tabsWrapper: {
  position: "relative",
  maxWidth: "1200px",
  margin: "0 auto 24px",
  "&::after": {
    content: "''",
    position: "absolute",
    top: 0,
    right: 0,
    width: "40px",
    height: "100%",
    background: "linear-gradient(to right, transparent, #f8fafc)",
    pointerEvents: "none",
    display: "none",
  },
  "@media (max-width: 768px)": {
    "&::after": {
      display: "block",
    },
  },
},

  },
  tabBtn: {
    padding: "10px 20px",
    border: "none",
    background: "none",
    fontSize: "14px",
    fontWeight: "500",
    color: "#64748b",
    cursor: "pointer",
    borderRadius: "8px 8px 0 0",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  tabBtnActive: {
    color: "#3b82f6",
    borderBottom: "2px solid #3b82f6",
    marginBottom: "-10px",
  },
  
  tabContent: {
    maxWidth: "1200px",
    margin: "0 auto",
  },
  
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "16px",
    marginBottom: "24px",
  },
  statCard: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "16px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    border: "1px solid #e2e8f0",
  },
  statIcon: {
    width: "44px",
    height: "44px",
    background: "#f1f5f9",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
  },
  statContent: { flex: 1 },
  statValue: { display: "block", fontSize: "18px", fontWeight: "700", color: "#0f172a", lineHeight: 1.2 },
  statLabel: { display: "block", fontSize: "11px", color: "#64748b" },
  
  filters: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "24px",
  },
  filterBtn: {
    padding: "8px 16px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    borderRadius: "30px",
    fontSize: "13px",
    fontWeight: "500",
    color: "#475569",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  filterBtnActive: {
    background: "#3b82f6",
    borderColor: "#3b82f6",
    color: "white",
  },

  tabsSection: {
  maxWidth: "1200px",
  margin: "0 auto 24px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  position: "relative",
},
scrollArrow: {
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontSize: "14px",
  color: "#475569",
  flexShrink: 0,
  transition: "all 0.2s",
  "@media (min-width: 769px)": {
    display: "none",  // Hide arrows on desktop
  },
  "&:hover": {
    background: "#f1f5f9",
    transform: "scale(1.05)",
  },
  "&:active": {
    transform: "scale(0.95)",
  },
},
tabs: {
  display: "flex",
  gap: "8px",
  borderBottom: "2px solid #e2e8f0",
  paddingBottom: "8px",
  overflowX: "auto",
  overflowY: "hidden",
  WebkitOverflowScrolling: "touch",
  scrollBehavior: "smooth",
  flex: 1,
  // Hide scrollbar
  scrollbarWidth: "none",
  msOverflowStyle: "none",
  "&::-webkit-scrollbar": {
    display: "none",
  },
},
  filterCount: {
    fontSize: "11px",
    background: "#e2e8f0",
    padding: "2px 6px",
    borderRadius: "12px",
  },
  
  loadingState: {
    textAlign: "center",
    padding: "60px 20px",
    color: "#64748b",
  },
  spinner: {
    width: "40px",
    height: "40px",
    margin: "0 auto 16px",
    border: "3px solid #e2e8f0",
    borderTopColor: "#3b82f6",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  
  errorState: {
    maxWidth: "400px",
    margin: "60px auto",
    textAlign: "center",
    padding: "32px 24px",
    background: "#ffffff",
    borderRadius: "20px",
    border: "1px solid #e2e8f0",
  },
  errorIcon: { fontSize: "48px", marginBottom: "16px" },
  retryBtn: {
    padding: "10px 24px",
    border: "none",
    borderRadius: "10px",
    background: "#3b82f6",
    color: "white",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
  },
  
  refreshIndicator: {
    padding: "12px 16px",
    background: "#ffffff",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    color: "#64748b",
    fontSize: "13px",
    marginBottom: "16px",
    border: "1px solid #e2e8f0",
  },
  refreshSpinner: {
    width: "18px",
    height: "18px",
    border: "2px solid #e2e8f0",
    borderTopColor: "#3b82f6",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
    background: "#ffffff",
    borderRadius: "24px",
    border: "1px solid #e2e8f0",
  },
  emptyIcon: { fontSize: "64px", marginBottom: "16px" },
  resetFilterBtn: {
    padding: "10px 24px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    borderRadius: "10px",
    color: "#475569",
    fontSize: "14px",
    cursor: "pointer",
  },
  
  contributionsList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  
  contributionCard: {
    background: "#ffffff",
    borderRadius: "20px",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
    transition: "all 0.2s",
  },
  submitting: { opacity: 0.7, pointerEvents: "none" },
  
  cardHeader: {
    padding: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    cursor: "pointer",
  },
  headerMain: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: "18px", fontWeight: "600", color: "#0f172a", margin: "0 0 4px 0" },
  cardDescription: { fontSize: "13px", color: "#64748b", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },
  headerRight: { display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 },
  statusBadge: { padding: "4px 12px", borderRadius: "30px", fontSize: "11px", fontWeight: "600", whiteSpace: "nowrap" },
  expandIcon: { width: "24px", height: "24px", borderRadius: "30px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", color: "#64748b" },
  
  progressOverview: { padding: "0 20px 20px" },
  progressStats: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "16px" },
  progressStat: { textAlign: "center" },
  statNumber: { display: "block", fontSize: "15px", fontWeight: "600", color: "#0f172a" },
  
  progressBarContainer: { marginTop: "8px" },
  progressBar: { display: "flex", height: "8px", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden", marginBottom: "8px" },
  progressSegmentPaid: { height: "100%", background: "#10b981", transition: "width 0.3s" },
  progressSegmentPending: { height: "100%", background: "#f59e0b", transition: "width 0.3s" },
  progressLabels: { display: "flex", gap: "16px", fontSize: "11px", color: "#64748b" },
  progressLabel: { display: "flex", alignItems: "center", gap: "4px" },
  dot: { width: "8px", height: "8px", borderRadius: "50%" },
  
  expandedContent: { borderTop: "1px solid #f1f5f9", padding: "20px" },
  detailSection: { marginBottom: "20px" },
  sectionTitle: { fontSize: "14px", fontWeight: "600", color: "#0f172a", margin: "0 0 12px 0" },
  sectionText: { fontSize: "13px", lineHeight: 1.6, color: "#475569", margin: 0 },
  
  breakdownList: { background: "#f8fafc", borderRadius: "12px", padding: "12px" },
  breakdownItem: { display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: "13px", color: "#475569", borderBottom: "1px solid #e2e8f0" },
  breakdownItemTotal: { marginTop: "4px", paddingTop: "12px", borderTop: "2px solid #e2e8f0", fontWeight: "600", color: "#0f172a", borderBottom: "none" },
  
  pledgeForm: { display: "flex", flexDirection: "column", gap: "12px" },
  inputGroup: { position: "relative" },
  pledgeInput: { width: "100%", padding: "12px", border: "1px solid #e2e8f0", borderRadius: "10px", fontSize: "13px", boxSizing: "border-box" },
  pledgeInputMessage: { marginTop: "0" },
  inputHint: { position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "10px", color: "#94a3b8" },
  pledgeBtn: { padding: "14px", border: "none", borderRadius: "10px", background: "#0f172a", color: "white", fontSize: "14px", fontWeight: "600", cursor: "pointer" },
  pledgeBtnSubmitting: { opacity: 0.7, cursor: "not-allowed" },
  messageBtn: { width: "48px", height: "48px", border: "none", borderRadius: "10px", background: "#8b5cf6", color: "white", fontSize: "20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  formNote: { marginTop: "12px", fontSize: "11px", color: "#94a3b8" },
  
  completedMessage: { display: "flex", alignItems: "center", gap: "12px", padding: "16px", background: "#f0fdf4", borderRadius: "12px" },
  completedIcon: { fontSize: "24px" },
  
  announcementsList: { display: "flex", flexDirection: "column", gap: "16px" },
  announcementCard: { background: "#ffffff", borderRadius: "16px", padding: "20px", border: "1px solid #e2e8f0" },
  announcementHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" },
  announcementTitle: { fontSize: "18px", fontWeight: "600", color: "#0f172a", margin: 0 },
  announcementCategory: { padding: "4px 12px", background: "#f1f5f9", borderRadius: "20px", fontSize: "11px", color: "#64748b" },
  announcementContent: { fontSize: "14px", lineHeight: 1.6, color: "#475569", margin: "0 0 16px 0" },
  announcementFooter: { display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94a3b8", borderTop: "1px solid #f1f5f9", paddingTop: "12px" },
  
  chatContainer: {
    background: "#ffffff",
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
    height: "550px",
    display: "flex",
    flexDirection: "column",
  },
  messagesList: {
    flex: 1,
    overflowY: "auto",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  messageBubble: {
    maxWidth: "70%",
    padding: "10px 14px",
    background: "#f1f5f9",
    borderRadius: "12px",
    alignSelf: "flex-start",
  },
  ownMessage: {
    alignSelf: "flex-end",
    background: "#3b82f6",
    color: "white",
  },
  tempMessage: { opacity: 0.7 },
  messageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
    fontSize: "11px",
  },
  messageTime: { fontSize: "9px", opacity: 0.7 },
  messageContent: { fontSize: "13px", margin: 0, lineHeight: 1.4 },
  emptyChat: { textAlign: "center", color: "#94a3b8", padding: "40px" },
  chatInputArea: {
    display: "flex",
    padding: "16px",
    gap: "12px",
    borderTop: "1px solid #e2e8f0",
    background: "#ffffff",
  },
  chatInput: {
    flex: 1,
    padding: "12px",
    border: "1px solid #e2e8f0",
    borderRadius: "30px",
    fontSize: "13px",
    outline: "none",
  },
  sendButton: {
    width: "44px",
    height: "44px",
    background: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "50%",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  // Add these to your styles object (around line 800+, before the closing })

  chatHeader: {
    padding: "16px 20px",
    borderBottom: "1px solid #e2e8f0",
    background: "#ffffff",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: "16px 16px 0 0",
  },
  chatHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  chatHeaderAvatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
  },
  chatHeaderTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#1e293b",
    margin: 0,
  },
  chatHeaderSubtitle: {
    fontSize: "12px",
    color: "#64748b",
    margin: "2px 0 0",
  },
  messagesWrapper: {
    flex: 1,
    overflow: "hidden",
    position: "relative",
  },
  messagesContainer: {
    height: "100%",
    overflowY: "auto",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  messageRow: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
  },
  messageRowOwn: {
    flexDirection: "row-reverse",
  },
  messageAvatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: "600",
    color: "white",
    flexShrink: 0,
    position: "relative",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  avatarText: {
    fontSize: "14px",
    fontWeight: "600",
    color: "white",
  },
  adminCrown: {
    position: "absolute",
    top: "-4px",
    right: "-4px",
    fontSize: "12px",
  },
  messageBubbleWrapper: {
    maxWidth: "70%",
    position: "relative",
  },
  messageSenderName: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#3b82f6",
    marginBottom: "2px",
    marginLeft: "4px",
    display: "block",
  },
  messageBubble: {
    background: "#f1f5f9",
    borderRadius: "18px",
    padding: "10px 14px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  },
  messageBubbleOwn: {
    background: "#3b82f6",
    borderColor: "#3b82f6",
  },
  editedIndicator: {
    fontSize: "9px",
    color: "#94a3b8",
    fontStyle: "italic",
    marginRight: "4px",
  },
  messageText: {
    fontSize: "14px",
    lineHeight: "1.5",
    margin: 0,
    color: "#1e293b",
    wordBreak: "break-word",
  },
  attachments: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "8px",
  },
  attachmentImage: {
    maxWidth: "200px",
    maxHeight: "150px",
    borderRadius: "8px",
    objectFit: "cover",
  },
  fileAttachment: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 10px",
    background: "#ffffff",
    borderRadius: "8px",
    textDecoration: "none",
    fontSize: "12px",
    color: "#475569",
  },
  messageFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "4px",
    marginTop: "4px",
  },
  messageTime: {
    fontSize: "9px",
    color: "#94a3b8",
  },
  inputWrapper: {
    background: "#ffffff",
    borderTop: "1px solid #e2e8f0",
    padding: "12px 16px",
  },
  inputContainer: {
    display: "flex",
    gap: "10px",
    alignItems: "flex-end",
  },
  messageInput: {
    flex: 1,
    padding: "10px 16px",
    borderRadius: "24px",
    border: "1px solid #e2e8f0",
    fontSize: "14px",
    minHeight: "42px",
    maxHeight: "100px",
    fontFamily: "inherit",
    background: "#f8fafc",
    resize: "none",
  },
  sendButton: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    background: "#3b82f6",
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "white",
    transition: "all 0.2s",
  },
  sendButtonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  sendSpinner: {
    width: "16px",
    height: "16px",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "white",
    borderRadius: "50%",
    animation: "spin 0.6s linear infinite",
  },
  emptyChat: {
    textAlign: "center",
    padding: "60px 20px",
    color: "#94a3b8",
  },
};

export default JumuiaDashboard;