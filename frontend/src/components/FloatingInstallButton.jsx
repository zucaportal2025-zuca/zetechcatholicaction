import { useState, useEffect, useRef, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaDownload, FaTimes, FaBell } from "react-icons/fa";

const FloatingInstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [user, setUser] = useState(null);
  const [autoCloseTimer, setAutoCloseTimer] = useState(null);
  const [recurringTimer, setRecurringTimer] = useState(null);
  const [position, setPosition] = useState({ x: window.innerWidth - 85, y: window.innerHeight - 85 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const buttonRef = useRef(null);
  const popupPosition = useRef({ top: 0, left: 0 });

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

  const isAppInstalled = () => {
    return window.matchMedia('(display-mode: standalone)').matches || 
           window.navigator.standalone ||
           window.matchMedia('(display-mode: minimal-ui)').matches;
  };

  const startAutoCloseTimer = () => {
    if (autoCloseTimer) clearTimeout(autoCloseTimer);
    const timer = setTimeout(() => {
      setShowPopup(false);
    }, 30000);
    setAutoCloseTimer(timer);
  };

  const showWithAutoClose = () => {
    if (!isAppInstalled() && !showPopup) {
      calculatePopupPosition();
      setShowPopup(true);
      startAutoCloseTimer();
    }
  };

  const calculatePopupPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const popupWidth = 340;
      const popupHeight = 280;
      
      let top = rect.top - popupHeight - 15;
      let left = rect.left + (rect.width / 2) - (popupWidth / 2);
      
      if (top < 20) {
        top = rect.bottom + 15;
      }
      if (left < 20) {
        left = 20;
      } else if (left + popupWidth > window.innerWidth - 20) {
        left = window.innerWidth - popupWidth - 20;
      }
      
      popupPosition.current = { top, left };
    }
  };

  useEffect(() => {
    if (isAppInstalled()) {
      console.log("App is installed - popup disabled");
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Timer: Show initial popup after 10 seconds
    const initialTimer = setTimeout(() => {
      console.log("Showing initial popup (first entry)");
      showWithAutoClose();
    }, 10000);

    // Timer: Show recurring popup every 100 seconds
    const timer = setInterval(() => {
      console.log("Showing recurring popup (100 seconds later)");
      showWithAutoClose();
    }, 400000);

    setRecurringTimer(timer);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(initialTimer);
      if (timer) clearInterval(timer);
      if (autoCloseTimer) clearTimeout(autoCloseTimer);
    };
  }, []);

  const handleInstall = async () => {
    console.log("Install button clicked");
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log("Install outcome:", outcome);
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowPopup(false);
        if (recurringTimer) clearInterval(recurringTimer);
        if (autoCloseTimer) clearTimeout(autoCloseTimer);
      }
    } else {
      alert(
        '📱 To install ZUCA Portal on your device:\n\n' +
        '🔵 Android (Chrome):\n' +
        '• Tap the menu button (⋮) at top right\n' +
        '• Select "Add to Home screen"\n' +
        '• Tap "Add" or "Install"\n\n' +
        '🍎 iPhone/iPad (Safari):\n' +
        '• Tap the Share button (📤) at bottom\n' +
        '• Scroll down and tap "Add to Home Screen"\n' +
        '• Tap "Add" in top right\n\n' +
        '💻 Desktop (Chrome/Edge):\n' +
        '• Click the install icon (➕) in address bar\n' +
        '• Click "Install"'
      );
    }
  };

  const handleButtonClick = async () => {
    if (!isAppInstalled()) {
      await handleInstall();
      setTimeout(() => {
        showWithAutoClose();
      }, 500);
    }
  };

  const handleDismiss = () => {
    console.log("Dismiss button clicked");
    setShowPopup(false);
    if (autoCloseTimer) clearTimeout(autoCloseTimer);
  };

  const handleDragStart = (e) => {
    e.preventDefault();
    const touch = e.touches ? e.touches[0] : e;
    const rect = buttonRef.current.getBoundingClientRect();
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    });
    setIsDragging(true);
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const touch = e.touches ? e.touches[0] : e;
    const newX = touch.clientX - dragOffset.x;
    const newY = touch.clientY - dragOffset.y;
    
    const maxX = window.innerWidth - 55;
    const maxY = window.innerHeight - 55;
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging]);

  if (isAppInstalled()) {
    return null;
  }

  const userName = user?.fullName?.split(" ")[0];
  const greeting = userName ? `Hey ${userName}!` : "Hey there!";
  const personalMessage = userName 
    ? `Welcome back ${userName}! Kindly install our app for a better experience with fast login and improved performance.

After installation, you'll enjoy:

1. Faster attendance scanning
2. Better access to ZUCA app features
3. No need to log in every time
4. All ZUCA links open directly in the app
5. No more pop-up(s) just a smooth experience.
  TRY DOWNLOADING TODAY REFRESH PAGE AND PRESS THE DOWNLOAD AGAIN
- REGARDS: ZUCA-APP`
    : "Welcome to ZUCA! Install our app for faster access and push notifications.";

  return (
    <>
      <motion.button
        ref={buttonRef}
        onClick={handleButtonClick}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        style={{
          ...styles.floatingButton,
          left: position.x,
          top: position.y,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", damping: 15 }}
        drag={false}
      >
        <FaDownload size={18} color="#1a1a2e" />
        <span style={styles.buttonLabel}>Install</span>
      </motion.button>

      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ 
              scale: 0.3,
              opacity: 0,
              y: 20
            }}
            animate={{ 
              scale: 1,
              opacity: 1,
              y: 0
            }}
            exit={{ 
              scale: 0.3,
              opacity: 0,
              y: 20
            }}
            transition={{ 
              type: "spring", 
              damping: 20,
              stiffness: 300
            }}
            style={{
              ...styles.popupContainer,
              top: popupPosition.current.top,
              left: popupPosition.current.left,
            }}
          >
            <div style={styles.popupCard}>
              <div style={styles.connectionLine} />

              <div style={styles.iconWrapper}>
                <FaBell size={22} color="#ffd700" />
              </div>

              <div style={styles.content}>
                <h3 style={styles.title}>Install ZUCA App! 🚀</h3>
                <p style={styles.description}>
                  <strong>{greeting}</strong><br />
                  {personalMessage.split('\n').map((line, index) => (
                    <Fragment key={index}>
                      {line}
                      {index < personalMessage.split('\n').length - 1 && <br />}
                    </Fragment>
                  ))}
                </p>
                <p style={styles.benefits}>
                  ✓ Faster access • ✓ Push notifications • ✓ Better experience
                </p>
              </div>

              <div style={styles.actions}>
                <motion.button
                  onClick={handleInstall}
                  style={styles.installButton}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FaDownload size={14} />
                  Install Now
                </motion.button>
                
                <motion.button
                  onClick={handleDismiss}
                  style={styles.laterButton}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Later
                </motion.button>
              </div>

              <button onClick={handleDismiss} style={styles.closeButton}>
                <FaTimes size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const styles = {
  floatingButton: {
    position: "fixed",
    zIndex: 9999,
    width: "55px",
    height: "55px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #ffd700, #ffaa00)",
    border: "none",
    boxShadow: "0 6px 20px rgba(255, 215, 0, 0.4)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "1px",
    transition: "box-shadow 0.3s ease",
    userSelect: "none",
    touchAction: "none",
  },
  buttonLabel: {
    fontSize: "8px",
    fontWeight: "700",
    color: "#1a1a2e",
    textTransform: "uppercase",
    letterSpacing: "0.3px",
  },
  popupContainer: {
    position: "fixed",
    zIndex: 10000,
    width: "340px",
    marginTop: "-100px",
    maxWidth: "calc(100% - 20px)",
  },
  popupCard: {
    background: "linear-gradient(135deg, #1e293b, #0f172a)",
    borderRadius: "18px",
    padding: "18px",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
    border: "1px solid rgba(255, 215, 0, 0.3)",
    position: "relative",
    backdropFilter: "blur(10px)",
  },
  connectionLine: {
    position: "absolute",
    bottom: "-18px",
    right: "18px",
    width: "18px",
    height: "18px",
    background: "linear-gradient(135deg, #1e293b, #0f172a)",
    clipPath: "polygon(50% 100%, 0 0, 100% 0)",
    borderBottom: "1px solid rgba(255, 215, 0, 0.3)",
    borderRight: "1px solid rgba(255, 215, 0, 0.3)",
    borderLeft: "1px solid rgba(255, 215, 0, 0.3)",
    borderBottomLeftRadius: "4px",
    borderBottomRightRadius: "4px",
  },
  iconWrapper: {
    position: "absolute",
    top: "-14px",
    left: "18px",
    background: "#1e293b",
    borderRadius: "50%",
    width: "36px",
    height: "36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid #ffd700",
  },
  content: {
    marginTop: "8px",
    marginBottom: "16px",
  },
  title: {
    color: "white",
    fontSize: "16px",
    fontWeight: "700",
    marginBottom: "6px",
  },
  description: {
    color: "#cbd5e1",
    fontSize: "12px",
    lineHeight: "1.5",
    margin: "0 0 6px 0",
  },
  benefits: {
    color: "#ffd700",
    fontSize: "10px",
    margin: "6px 0 0 0",
  },
  actions: {
    display: "flex",
    gap: "10px",
    marginBottom: "0",
  },
  installButton: {
    flex: 2,
    background: "linear-gradient(135deg, #ffd700, #ffaa00)",
    color: "#1a1a2e",
    border: "none",
    borderRadius: "10px",
    padding: "8px 14px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
  },
  laterButton: {
    flex: 1,
    background: "rgba(255, 255, 255, 0.1)",
    color: "white",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: "10px",
    padding: "8px 14px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
  },
  closeButton: {
    position: "absolute",
    top: "10px",
    right: "10px",
    background: "rgba(255, 255, 255, 0.1)",
    border: "none",
    borderRadius: "50%",
    width: "26px",
    height: "26px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#94a3b8",
    transition: "all 0.2s",
    ":hover": {
      background: "rgba(255, 255, 255, 0.2)",
      color: "white",
    },
  },
};

export default FloatingInstallButton;