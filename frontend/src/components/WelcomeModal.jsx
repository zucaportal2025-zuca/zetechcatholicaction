import { motion, AnimatePresence } from "framer-motion";
import { FiCheck, FiCopy, FiAlertCircle } from "react-icons/fi";
import { useState, useEffect } from "react";
import axios from "axios";
import BASE_URL from "../api";
import zucaLlogo from "../assets/zuca-logo.png";

export default function WelcomeModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [userName, setUserName] = useState("");
  const [membershipNumber, setMembershipNumber] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch user data from database (same as Dashboard)
  useEffect(() => {
    if (isOpen) {
      const fetchUserData = async () => {
        try {
          const token = localStorage.getItem("token");
          const storedUser = JSON.parse(localStorage.getItem("user"));
          
          if (token && storedUser) {
            // First, use stored user data
            setUserName(storedUser.fullName || storedUser.name || "Member");
            setMembershipNumber(storedUser.membership_number || "");
            
            // Then fetch fresh data from API
            const response = await axios.get(`${BASE_URL}/api/me`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            const userData = response.data;
            setUserName(userData.fullName || userData.name || "Member");
            setMembershipNumber(userData.membership_number || "");
            
            // Update localStorage with fresh data
            localStorage.setItem("user", JSON.stringify(userData));
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          // Fallback to localStorage
          const storedUser = JSON.parse(localStorage.getItem("user"));
          if (storedUser) {
            setUserName(storedUser.fullName || storedUser.name || "Member");
            setMembershipNumber(storedUser.membership_number || "");
          }
        } finally {
          setLoading(false);
        }
      };
      
      fetchUserData();
    }
  }, [isOpen]);

  if (!isOpen) return null;
  
  const handleCopy = () => {
    if (membershipNumber) {
      navigator.clipboard.writeText(membershipNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleContinue = () => {
    if (understood && membershipNumber) {
      onClose();
    }
  };

  if (loading) {
    return (
      <AnimatePresence>
        <div style={styles.overlay}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            style={styles.modal}
          >
            <div style={styles.logoContainer}>
              <img src={zucaLlogo} alt="ZUCA Logo" style={styles.logoImage} />
            </div>
            <div style={styles.loadingSpinner}></div>
            <p style={styles.loadingText}>Loading your account...</p>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <div style={styles.overlay}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          style={styles.modal}
        >
          {/* ZUCA Logo */}
          <div style={styles.logoContainer}>
            <img src={zucaLlogo} alt="ZUCA Logo" style={styles.logoImage} />
          </div>
          
          <h2 style={styles.title}>
            Hello <strong>{userName}</strong>! Welcome to ZUCA!
          </h2>
          
          <p style={styles.message}>
            🙏<br />
            You are now part of the Zetech University Catholic Action Club.
          </p>
          
          {/* Membership Number Section */}
          <div style={styles.membershipSection}>
            <div style={styles.membershipHeader}>
              <FiAlertCircle size={16} color="#4f46e5" />
              <span style={styles.membershipLabel}>YOUR MEMBERSHIP NUMBER</span>
            </div>
            
            <div style={styles.membershipCard}>
              <div style={styles.membershipDisplay}>
                {membershipNumber}
              </div>
              
              <div style={styles.membershipConfirmed}>
                <span style={styles.confirmedText}>
                  ✓ Your ZUCA Membership Number: {membershipNumber}
                </span>
                <button onClick={handleCopy} style={styles.copyButton}>
                  <FiCopy size={14} /> {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
            
            {/* Updated Important Instructions - Removed password reset reference */}
            <div style={styles.importantBox}>
              <div style={styles.importantTitle}>⭐ IMPORTANT - SAVE THIS NUMBER</div>
              <ul style={styles.importantList}>
                <li>This is your official <strong>ZUCA Membership Number</strong></li>
                <li>It is used For special log-ins within ZUCA System</li>
                <li><strong>Save this email or screenshot this page</strong> - you'll need it later</li>
                <li>Each letter stands for; (Z-ZUCA) (#-NUMBER) and finally the number its self eg(001,002 etc.)</li>
                <li>Your membership number format: <strong style={{color: "#4f46e5", fontSize: "14px"}}>{membershipNumber}</strong></li>
              </ul>
            </div>
          </div>
          
          {/* Confirmation Checkbox - Updated text */}
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              style={styles.checkbox}
            />
            <span>I understand and will save my ZUCA Membership Number: <strong>{membershipNumber}</strong></span>
          </label>
          
          <button 
            onClick={handleContinue}
            style={{
              ...styles.button,
              opacity: understood && membershipNumber ? 1 : 0.5,
              cursor: understood && membershipNumber ? "pointer" : "not-allowed"
            }}
            disabled={!understood || !membershipNumber}
          >
            <FiCheck size={18} /> I Accept & Continue
          </button>
          
          <p style={styles.footnote}>
            ⭐ Keep your membership number safe: <strong>{membershipNumber}</strong>
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999999,
    padding: "20px",
  },
  modal: {
    background: "linear-gradient(135deg, #ffffff, #f8fafc)",
    borderRadius: "28px",
    padding: "40px 32px",
    maxWidth: "520px",
    width: "100%",
    textAlign: "center",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
    border: "1px solid rgba(79,70,229,0.2)",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  logoContainer: {
    marginBottom: "20px",
    display: "flex",
    justifyContent: "center",
  },
  logoImage: {
    width: "80px",
    height: "80px",
    objectFit: "contain",
    borderRadius: "50%",
    boxShadow: "0 8px 20px rgba(79,70,229,0.3)",
  },
  title: {
    fontSize: "24px",
    fontWeight: "700",
    background: "linear-gradient(135deg, #0f172a, #1e293b)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    marginBottom: "12px",
  },
  message: {
    fontSize: "15px",
    color: "#334155",
    lineHeight: "1.5",
    marginBottom: "24px",
  },
  membershipSection: {
    marginBottom: "24px",
  },
  membershipHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    marginBottom: "12px",
  },
  membershipLabel: {
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "1px",
    color: "#4f46e5",
    textTransform: "uppercase",
  },
  membershipCard: {
    background: "#f1f5f9",
    borderRadius: "16px",
    padding: "20px",
    marginBottom: "16px",
  },
  membershipDisplay: {
    fontSize: "32px",
    fontWeight: "800",
    fontFamily: "monospace",
    marginBottom: "16px",
    padding: "16px",
    background: "linear-gradient(135deg, #e0e7ff, #fef3c7)",
    borderRadius: "12px",
    color: "#1e293b",
    wordBreak: "break-all",
  },
  membershipConfirmed: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
  },
  confirmedText: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#065f46",
    background: "#d1fae5",
    padding: "10px 16px",
    borderRadius: "12px",
    flex: 1,
    wordBreak: "break-all",
  },
  copyButton: {
    padding: "8px 16px",
    fontSize: "12px",
    background: "#4f46e5",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontWeight: "500",
  },
  importantBox: {
    background: "#f0fdf4",
    borderLeft: "4px solid #10b981",
    padding: "16px",
    borderRadius: "12px",
    textAlign: "left",
  },
  importantTitle: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#059669",
    marginBottom: "8px",
  },
  importantList: {
    fontSize: "13px",
    color: "#065f46",
    margin: 0,
    paddingLeft: "20px",
    lineHeight: "1.6",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    marginBottom: "24px",
    fontSize: "13px",
    textAlign: "left",
    color: "#334155",
    cursor: "pointer",
  },
  checkbox: {
    marginTop: "2px",
    width: "18px",
    height: "18px",
    cursor: "pointer",
  },
  button: {
    background: "linear-gradient(135deg, #4f46e5, #6366f1)",
    color: "white",
    border: "none",
    padding: "14px 28px",
    borderRadius: "40px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "10px",
    justifyContent: "center",
    width: "100%",
    transition: "all 0.2s",
  },
  footnote: {
    marginTop: "16px",
    fontSize: "11px",
    color: "#94a3b8",
    textAlign: "center",
  },
  loadingSpinner: {
    width: "40px",
    height: "40px",
    border: "3px solid #e2e8f0",
    borderTopColor: "#4f46e5",
    borderRadius: "50%",
    margin: "20px auto",
    animation: "spin 0.6s linear infinite",
  },
  loadingText: {
    color: "#64748b",
    fontSize: "14px",
  },
};

// Add keyframes for spinner animation
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);