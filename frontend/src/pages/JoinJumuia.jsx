// frontend/src/pages/JoinJumuia.jsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import logo from "../assets/zuca-logo.png";
import { 
  Search, X, Users, Check, Loader, Info, AlertCircle, 
  MessageCircle, Link as LinkIcon, ArrowLeft, Sparkles,
  Crown, Shield, Heart, TrendingUp, Zap
} from 'lucide-react';
import { FaWhatsapp } from "react-icons/fa";

function JoinJumuia() {
  const navigate = useNavigate();
  const [jumuiaList, setJumuiaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [joinedJumuia, setJoinedJumuia] = useState(null);
  const [joiningId, setJoiningId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [hoveredCard, setHoveredCard] = useState(null);

const [user, setUser] = useState(null);

useEffect(() => {
  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    setUser(JSON.parse(storedUser));
  }

}, []);
  const [stats, setStats] = useState({
    total: 0,
    available: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const jRes = await api.get("/api/jumuia");
        setJumuiaList(jRes.data);
        setStats({
          total: jRes.data.length,
          available: jRes.data.length
        });

        const uRes = await api.get("/api/me");
        setJoinedJumuia(uRes.data?.jumuiaId || null);

      } catch (err) {
        console.error(err);
        setError("Unable to load jumuia groups");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const handleFocus = () => fetchData();
    window.addEventListener("focus", handleFocus);

    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const handleJoin = async (id, name) => {
    setJoiningId(id);
    try {
      await api.patch("/api/join-jumuia", { jumuiaId: id });
      setJoinedJumuia(id);
    } catch (err) {
      console.error("Join Jumuia Error:", err.response || err);
      alert(err.response?.data?.error || "Unable to join. Please try again.");
    } finally {
      setJoiningId(null);
    }
  };

  const handleWhatsAppClick = (jumuia, e) => {
    if (joinedJumuia !== jumuia.id) {
      e.preventDefault();
      alert(`Please join ${jumuia.name} first to access their WhatsApp group.`);
      return;
    }
    
    if (!jumuia.whatsappLink) {
      e.preventDefault();
      alert("No WhatsApp group link available for this jumuia.");
    }
  };

  const goBack = () => navigate('/dashboard');

  const filteredJumuia = jumuiaList.filter(j => 
    j.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (j.description && j.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        damping: 20,
        stiffness: 300,
      },
    },
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent}>
          <div style={styles.loadingAnimation}>
            <div style={styles.loadingRing}></div>
            <div style={styles.loadingRingInner}></div>
             {loading && <img src={logo} alt="Loading..." style={{ width: '60px', height: '80px' }} />}
          </div>
<h2 style={styles.loadingTitle}>Hey {user?.fullName?.split(" ")[0] || "User"} Please wait </h2>          <p style={styles.loadingSubtitle}>Loading jumuia groups...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorCard}>
          <AlertCircle size={48} style={styles.errorIcon} />
          <h3 style={styles.errorTitle}>Oops! Something went wrong</h3>
          <p style={styles.errorText}>{error}</p>
          <button onClick={() => window.location.reload()} style={styles.errorButton}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      style={styles.container}
    >
      {/* Animated Background */}
      <div style={styles.bgAnimation}>
        <div style={styles.gradientOrb1}></div>
        <div style={styles.gradientOrb2}></div>
        <div style={styles.gradientOrb3}></div>
      </div>

      {/* Header Section */}
      <motion.div variants={itemVariants} style={styles.header}>
        <div style={styles.headerLeft}>
          <motion.button 
            whileHover={{ scale: 1.05, x: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={goBack} 
            style={styles.backButton}
          >
            <ArrowLeft size={20} />
          </motion.button>
          <div>
            <div style={styles.titleBadge}>
              <Sparkles size={16} />
              <span>Find Your Community</span>
            </div>
            <h1 style={styles.title}>
              Join a <span style={styles.highlight}>Jumuia</span>
            </h1>
            <p style={styles.subtitle}>
Hey {user?.fullName?.split(" ")[0] || "User"}, join your respective jumuia to easily participate in their activities, such as meetings and contributions.
            </p>
          </div>
        </div>
        <motion.div 
          whileHover={{ scale: 1.05 }}
          style={styles.statsBadge}
        >
          <Users size={16} />
          <span>{stats.total} Active Groups</span>
        </motion.div>
      </motion.div>

      {/* Search Bar */}
      <motion.div variants={itemVariants} style={styles.searchContainer}>
        <div style={styles.searchWrapper}>
          <Search size={18} style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          {searchTerm && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={() => setSearchTerm("")}
              style={styles.searchClear}
            >
              <X size={14} />
            </motion.button>
          )}
        </div>
        {searchTerm && (
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={styles.searchResults}
          >
            Found {filteredJumuia.length} {filteredJumuia.length === 1 ? 'group' : 'groups'}
          </motion.p>
        )}
      </motion.div>

      {/* Jumuia Grid */}
      {filteredJumuia.length === 0 ? (
        <motion.div variants={itemVariants} style={styles.emptyState}>
          <div style={styles.emptyIcon}>🙏</div>
          <h3 style={styles.emptyTitle}>No groups found</h3>
          <p style={styles.emptyText}>
            {searchTerm 
              ? `No jumuia matching "${searchTerm}"`
              : "No jumuia groups available at the moment"}
          </p>
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} style={styles.emptyButton}>
              Clear Search
            </button>
          )}
        </motion.div>
      ) : (
        <div style={styles.grid}>
          <AnimatePresence mode="popLayout">
            {filteredJumuia.map((j, index) => (
              <motion.div
                key={j.id}
                layout
                variants={itemVariants}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", damping: 20, delay: index * 0.05 }}
                onMouseEnter={() => setHoveredCard(j.id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  ...styles.card,
                  ...(hoveredCard === j.id && styles.cardHover),
                  ...(joinedJumuia === j.id && styles.cardJoined),
                  opacity: joinedJumuia && joinedJumuia !== j.id ? 0.7 : 1,
                }}
              >
                {/* Card Gradient Border */}
                <div style={styles.cardGradientBorder}></div>
                
                <div style={styles.cardHeader}>
                  <div style={styles.cardIcon}>
                    {joinedJumuia === j.id ? (
                      <Shield size={24} />
                    ) : (
                      <Users size={24} />
                    )}
                  </div>
                  {joinedJumuia === j.id && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      style={styles.joinedIndicator}
                    >
                      <Check size={12} /> Active Member
                    </motion.div>
                  )}
                  {j.isPopular && (
                    <div style={styles.popularBadge}>
                      <TrendingUp size={10} /> Popular
                    </div>
                  )}
                </div>

                <div style={styles.cardContent}>
                  <h3 style={styles.cardTitle}>{j.name}</h3>
                  {j.description && (
                    <p style={styles.cardDescription}>{j.description}</p>
                  )}
                  
                  {/* Member Stats Placeholder */}
                  <div style={styles.cardStats}>
                    <span></span>
                  </div>
                  
                  {j.whatsappLink && (
                    <motion.div 
                      style={styles.whatsappSection}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div style={styles.whatsappHeader}>
                        <MessageCircle size={14} />
                        <span style={styles.whatsappLabel}>Jumuia Chat</span>
                      </div>
                      <a
                        href={j.whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => handleWhatsAppClick(j, e)}
                        style={{
                          ...styles.whatsappLink,
                          ...(joinedJumuia !== j.id && styles.whatsappLinkDisabled),
                        }}
                      >
                        <FaWhatsapp size={14} />
                        <span>
                          {joinedJumuia === j.id 
                            ? "Join WhatsApp Group →" 
                            : "whatsapp group link"}
                        </span>
                      </a>
                    </motion.div>
                  )}
                </div>

                <div style={styles.cardFooter}>
                  <motion.button
                    whileHover={{ scale: joinedJumuia && joinedJumuia !== j.id ? 1 : 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={joinedJumuia && joinedJumuia !== j.id || joiningId === j.id}
                    onClick={() => handleJoin(j.id, j.name)}
                    style={{
                      ...styles.button,
                      ...(joinedJumuia === j.id ? styles.buttonJoined : {}),
                      ...(joinedJumuia && joinedJumuia !== j.id ? styles.buttonDisabled : {}),
                    }}
                  >
                    {joiningId === j.id ? (
                      <span style={styles.buttonContent}>
                        <span style={styles.buttonIcon}>
                          <div style={styles.buttonSpinner}></div>
                        </span>
                        Joining...
                      </span>
                    ) : joinedJumuia === j.id ? (
  <span style={styles.buttonContent}>
    <span style={styles.buttonIcon}><Check size={14} /></span>
    You have joined {j.name}
  </span>
) : joinedJumuia ? (
  <span style={styles.buttonContent}>
    <span style={styles.buttonIcon}>🔒</span>
    You have already joined another Jumuia
  </span>
) : (
  <span style={styles.buttonContent}>
    Join This Jumuia
    <Zap size={14} style={styles.buttonZap} />
  </span>
)}
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Info Note */}
      {!joinedJumuia && jumuiaList.length > 0 && (
        <motion.div 
          variants={itemVariants}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={styles.infoNote}
        >
          <div style={styles.infoIconWrapper}>
            <Info size={16} />
          </div>
          <span>Choose one jumuia to join. After joining, you'll be able to access their WhatsApp group and connect with fellow members.</span>
        </motion.div>
      )}
    </motion.div>
  );
}

const styles = {
  container: {
    minHeight: "calc(100vh - 80px)",
    background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
    padding: "28px 32px",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    position: "relative",
    marginBottom: "40px",
    overflowX: "hidden",
  },

  bgAnimation: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "none",
    overflow: "hidden",
    zIndex: 0,
  },

  gradientOrb1: {
    position: "absolute",
    top: "-20%",
    right: "-10%",
    width: "500px",
    height: "500px",
    background: "radial-gradient(circle, rgba(59,130,246,0.08), transparent)",
    borderRadius: "50%",
    animation: "float 20s ease-in-out infinite",
  },

  gradientOrb2: {
    position: "absolute",
    bottom: "-20%",
    left: "-10%",
    width: "400px",
    height: "400px",
    background: "radial-gradient(circle, rgba(139,92,246,0.08), transparent)",
    borderRadius: "50%",
    animation: "float 15s ease-in-out infinite reverse",
  },

  gradientOrb3: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "600px",
    height: "600px",
    background: "radial-gradient(circle, rgba(6,182,212,0.05), transparent)",
    borderRadius: "50%",
    animation: "pulse 10s ease-in-out infinite",
  },

  loadingContainer: {
    minHeight: "calc(100vh - 80px)",
    background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingContent: {
    textAlign: "center",
  },

  loadingAnimation: {
    position: "relative",
    width: "80px",
    height: "80px",
    margin: "0 auto 24px",
  },

  loadingRing: {
    position: "absolute",
    inset: 0,
    border: "3px solid #e2e8f0",
    borderRadius: "50%",
  },

  loadingRingInner: {
    position: "absolute",
    inset: 0,
    border: "3px solid transparent",
    borderTopColor: "#3b82f6",
    borderRightColor: "#8b5cf6",
    borderBottomColor: "#06b6d4",
    borderRadius: "50%",
    animation: "spin 1.5s linear infinite",
  },

  loadingIcon: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    color: "#3b82f6",
  },

  loadingTitle: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: "8px",
  },

  loadingSubtitle: {
    fontSize: "14px",
    color: "#64748b",
  },

  errorContainer: {
    minHeight: "calc(100vh - 80px)",
    background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  errorCard: {
    background: "#ffffff",
    padding: "40px",
    borderRadius: "24px",
    textAlign: "center",
    maxWidth: "420px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05)",
  },

  errorIcon: {
    color: "#ef4444",
    marginBottom: "20px",
  },

  errorTitle: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: "8px",
  },

  errorText: {
    color: "#64748b",
    fontSize: "14px",
    marginBottom: "24px",
  },

  errorButton: {
    padding: "10px 24px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "32px",
    flexWrap: "wrap",
    gap: "20px",
    position: "relative",
    zIndex: 1,
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
  },

  backButton: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.2s",
    color: "#64748b",
  },

  titleBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "4px 12px",
    background: "linear-gradient(135deg, #3b82f610, #8b5cf610)",
    borderRadius: "30px",
    fontSize: "12px",
    fontWeight: "500",
    color: "#3b82f6",
    marginBottom: "12px",
  },

  title: {
    fontSize: "36px",
    fontWeight: "800",
    color: "#1e293b",
    margin: 0,
    marginBottom: "8px",
    letterSpacing: "-0.02em",
  },

  highlight: {
    background: "linear-gradient(135deg, #3b82f6, #8b5cf6, #06b6d4)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },

  subtitle: {
    fontSize: "15px",
    color: "#64748b",
    margin: 0,
  },

  statsBadge: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 20px",
    background: "#ffffff",
    borderRadius: "40px",
    fontSize: "14px",
    color: "#1e293b",
    border: "1px solid #e2e8f0",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
  },

  searchContainer: {
    marginBottom: "32px",
    position: "relative",
    zIndex: 1,
  },

  searchWrapper: {
    position: "relative",
    maxWidth: "450px",
  },

  searchIcon: {
    position: "absolute",
    left: "16px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#94a3b8",
  },

  searchInput: {
    width: "100%",
    padding: "14px 48px 14px 48px",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    color: "#1e293b",
    fontSize: "14px",
    outline: "none",
    transition: "all 0.2s",
    boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
  },

  searchClear: {
    position: "absolute",
    right: "14px",
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

  searchResults: {
    fontSize: "13px",
    color: "#64748b",
    marginTop: "10px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
    gap: "24px",
    marginBottom: "32px",
    position: "relative",
    zIndex: 1,
  },

  card: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "24px",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)",
  },

  cardHover: {
    transform: "translateY(-8px)",
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.02)",
    borderColor: "#cbd5e1",
  },

  cardGradientBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "4px",
    background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4)",
  },

  cardJoined: {
    borderColor: "#10b981",
    background: "linear-gradient(135deg, #ffffff, #f0fdf4)",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  cardIcon: {
    width: "56px",
    height: "56px",
    borderRadius: "16px",
    background: "linear-gradient(135deg, #3b82f610, #8b5cf610)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#3b82f6",
    border: "1px solid #e2e8f0",
  },

  joinedIndicator: {
    padding: "6px 12px",
    background: "linear-gradient(135deg, #10b981, #059669)",
    color: "#ffffff",
    fontSize: "11px",
    fontWeight: "600",
    borderRadius: "30px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },

  popularBadge: {
    padding: "4px 10px",
    background: "linear-gradient(135deg, #f59e0b, #d97706)",
    color: "#ffffff",
    fontSize: "10px",
    fontWeight: "600",
    borderRadius: "20px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },

  cardContent: {
    flex: 1,
  },

  cardTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: "8px",
  },

  cardDescription: {
    fontSize: "14px",
    color: "#64748b",
    lineHeight: "1.5",
    marginBottom: "12px",
  },

  cardStats: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    color: "#94a3b8",
    marginBottom: "16px",
  },

  whatsappSection: {
    marginTop: "12px",
    paddingTop: "12px",
    borderTop: "1px solid #e2e8f0",
  },

  whatsappHeader: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "10px",
    fontSize: "11px",
    color: "#64748b",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },

  whatsappLabel: {
    fontSize: "11px",
  },

  whatsappLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 16px",
    backgroundColor: "#25D366",
    color: "#ffffff",
    textDecoration: "none",
    borderRadius: "12px",
    fontSize: "13px",
    fontWeight: "600",
    transition: "all 0.2s ease",
    cursor: "pointer",
    width: "100%",
    justifyContent: "center",
  },

  whatsappLinkDisabled: {
    backgroundColor: "#e2e8f0",
    color: "#94a3b8",
    cursor: "not-allowed",
  },

  cardFooter: {
    marginTop: "4px",
  },

  button: {
    width: "100%",
    padding: "12px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 4px rgba(59,130,246,0.2)",
  },

  buttonJoined: {
    background: "linear-gradient(135deg, #10b981, #059669)",
    boxShadow: "0 2px 4px rgba(16,185,129,0.2)",
  },

  buttonDisabled: {
    background: "#f1f5f9",
    color: "#94a3b8",
    cursor: "not-allowed",
    boxShadow: "none",
  },

  buttonContent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },

  buttonIcon: {
    display: "inline-flex",
  },

  buttonSpinner: {
    width: "16px",
    height: "16px",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "#ffffff",
    borderRadius: "50%",
    animation: "spin 0.6s linear infinite",
  },

  buttonZap: {
    marginLeft: "2px",
  },

  emptyState: {
    textAlign: "center",
    padding: "80px 20px",
    background: "#ffffff",
    borderRadius: "24px",
    border: "1px solid #e2e8f0",
    maxWidth: "520px",
    margin: "60px auto",
    position: "relative",
    zIndex: 1,
  },

  emptyIcon: {
    fontSize: "64px",
    marginBottom: "20px",
  },

  emptyTitle: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: "8px",
  },

  emptyText: {
    color: "#64748b",
    fontSize: "14px",
    marginBottom: "24px",
  },

  emptyButton: {
    padding: "10px 24px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    color: "#475569",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s",
  },

  infoNote: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "16px 20px",
    background: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    color: "#64748b",
    fontSize: "13px",
    marginTop: "24px",
    position: "relative",
    zIndex: 1,
  },

  infoIconWrapper: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #3b82f610, #8b5cf610)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#3b82f6",
  },
};

// Add global animation styles
const styleElement = document.createElement('style');
styleElement.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes float {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(30px, -30px) scale(1.1); }
    66% { transform: translate(-20px, 20px) scale(0.9); }
  }
  
  @keyframes pulse {
    0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
    50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; }
  }
  
  .back-btn:hover {
    background: #f1f5f9;
    transform: translateX(-3px);
  }
`;
document.head.appendChild(styleElement);

export default JoinJumuia;