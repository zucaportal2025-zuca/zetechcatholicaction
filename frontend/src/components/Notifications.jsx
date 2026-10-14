// frontend/src/components/Notifications.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaBell } from "react-icons/fa";
import { FiX, FiCheck, FiClock, FiEyeOff } from "react-icons/fi";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import BASE_URL from "../api";
import io from "socket.io-client";
import badgeManager from "../utils/badgeManager";
import pushService from "../services/pushService";
import soundManager from "../utils/soundManager";

export default function Notifications({ userId }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);
  const socketRef = useRef(null);
  const hasMarkedReadForCurrentPage = useRef(new Set());
  
  const [dismissedIds, setDismissedIds] = useState(() => {
    if (!userId) return new Set();
    const saved = localStorage.getItem(`dismissed_notifications_${userId}`);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  useEffect(() => {
    if (!userId) return;
    localStorage.setItem(
      `dismissed_notifications_${userId}`, 
      JSON.stringify([...dismissedIds])
    );
  }, [dismissedIds, userId]);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BASE_URL}/api/notifications/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const filtered = res.data.filter(n => !dismissedIds.has(n.id));
      setNotifications(filtered);

      const unread = filtered.filter(n => !n.read);
      window.dispatchEvent(new CustomEvent('notificationUpdate', {
        detail: { unreadCount: unread.length }
      }));
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, dismissedIds]);

  useEffect(() => {
    if (!userId) return;

    socketRef.current = io(BASE_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current.on('connect', () => {
      console.log('Socket connected');
      socketRef.current.emit('join', userId);
    });

    socketRef.current.on('new_notification', (notification) => {
      try {
        console.log('🔔 New notification received:', notification);
        
        if (dismissedIds.has(notification.id)) {
          console.log('Notification was previously dismissed, ignoring');
          return;
        }
        
        try {
          if (soundManager && soundManager.playNotificationSound) {
            soundManager.playNotificationSound();
          }
        } catch(e) { console.log('Sound error:', e); }
        
        setNotifications(prev => {
          const exists = prev.some(n => n.id === notification.id);
          if (exists) return prev;
          
          try {
            if (window.showInAppToast) {
              window.showInAppToast({
                title: notification.title || "New Notification",
                message: notification.message,
                body: notification.message,
                type: notification.type,
                id: notification.id,
                entityId: notification.entityId,
                createdAt: notification.createdAt,
                data: notification.data
              });
            }
          } catch(e) { console.log('Toast error:', e); }
          
          try {
            if (document.hidden && Notification.permission === "granted") {
              new Notification(notification.title || "New Notification", {
                body: notification.message,
                icon: "/android-chrome-192x192.png",
                badge: "/favicon.ico",
                tag: notification.id,
                vibrate: [200, 100, 200],
                data: {
                  url: notification.data?.url || getNotificationPath(notification.type),
                  id: notification.id,
                  type: notification.type,
                  entityId: notification.entityId
                }
              });
            }
          } catch(e) { console.log('Browser notif error:', e); }
          
          try {
            if (badgeManager && badgeManager.incrementBadge) {
              badgeManager.incrementBadge();
            }
          } catch(e) { console.log('Badge error:', e); }

          window.dispatchEvent(new CustomEvent('newNotification', {
            detail: { notification }
          }));
      
          window.dispatchEvent(new CustomEvent('notificationUpdate', {
            detail: { unreadCount: unreadCount + 1 }
          }));
          
          return [notification, ...prev];
        });
        
      } catch(err) {
        console.error('Notification handler crashed:', err);
      }
    });

    socketRef.current.on('new_notification_batch', () => {
      fetchNotifications();
    });

    socketRef.current.on('connect_error', (error) => {
      console.log('Socket connection error:', error);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [userId, dismissedIds, fetchNotifications]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const unread = notifications.filter(n => !n.read).length;
    setUnreadCount(unread);
    badgeManager.updateBadgeCount(unread);
  }, [notifications]);

  useEffect(() => {
    badgeManager.loadCount();
  }, []);

  // Helper function to get notification path
  const getNotificationPath = (type) => {
    const paths = {
      'attendance_checkin': '/member/attendance',
      'attendance_thankyou': '/member/attendance',
      'attendance_missed': '/member/attendance',
      'attendance_reminder': '/member/attendance',
      'attendance_automatic_reminder': '/member/attendance',
      'attendance_sheet_opened': '/admin/attendance',
      'attendance_summary': '/admin/attendance/overview',
      'attendance_admin_report': '/admin/attendance/overview',
      'attendance_bulk_checkin': '/admin/attendance',
      'meeting_minutes_published': '/minutes',
      'meeting_minutes_comment': '/minutes',
      'minutes_published': '/minutes',
      'announcement': '/announcements',
      'new_announcement': '/announcements',
      'jumuia_announcement': '/announcements',
      'game_invite': '/games',
      'direct_message': '/messenger',
      'message': '/messenger',
      'chat_mention': '/messenger',
      'pin': '/messenger',
      'broadcast': '/messenger',
      'send_email': '/messenger',
      'report_resolved': '/messenger',
      'contribution': '/contributions',
      'pledge_approved': '/contributions',
      'payment_added': '/contributions',
      'payment_success': '/contributions',
      'payment_received': '/contributions',
      'jumuia_contribution': '/contributions',
      'pledge_message': '/contributions',
      'new_pledge': '/contributions',
      'executive_appointment': '/executive',
      'executive_removed': '/executive',
      'new_media': '/gallery',
      'media_comment': '/gallery',
      'media_like': '/gallery',
      'youtube_new_video': '/youtube',
      'youtube_live': '/youtube',
      'schedule': '/schedules',
      'event_reminder': '/schedules',
      'program': '/mass-programs',
      'jumuia': '/jumuia',
      'mass_reading': '/mass-readings',
      'test': '/dashboard',
      'user_login': '/dashboard',
      'role_change': '/dashboard',
      'welcome': '/dashboard',
      'api_notify': '/dashboard',
       'feedback_new': '/admin/feedback',      
    'feedback_updated': '/feedback/history',
      'default': '/dashboard'
    };
    return paths[type] || paths['default'];
  };

  // Page type detection for auto-marking as read
  useEffect(() => {
    if (!userId || !location.pathname) return;

    const markNotificationsForCurrentPage = async () => {
      let pageType = null;
      let pagePath = location.pathname;


      

      // Attendance (Member)
      if (pagePath.includes('/member/attendance')) {
        pageType = 'attendance_checkin';
      }
      // Attendance (Admin)
      else if (pagePath.includes('/admin/attendance/overview')) {
        pageType = 'attendance_summary';
      }
      else if (pagePath.includes('/admin/attendance')) {
        pageType = 'attendance_sheet_opened';
      }
      // Minutes
      else if (pagePath.includes('/minutes')) {
        pageType = 'minutes_published';
      }
      // Announcements
      else if (pagePath.includes('/announcements')) {
        pageType = 'announcement';
      }
      // Mass Programs
      else if (pagePath.includes('/mass-programs')) {
        pageType = 'program';
      }
      // Mass Readings
      else if (pagePath.includes('/mass-readings')) {
        pageType = 'mass_reading';
      }
      // Messenger
      else if (pagePath.includes('/messenger')) {
        pageType = 'direct_message';
      }
      // Chat
      else if (pagePath.includes('/chat')) {
        pageType = 'message';
      }
      // Contributions
      else if (pagePath.includes('/contributions') || pagePath.includes('/jumuia-contributions')) {
        pageType = 'contribution';
      }
      // Gallery
      else if (pagePath.includes('/gallery')) {
        pageType = 'new_media';
      }
      // YouTube
      else if (pagePath.includes('/youtube')) {
        pageType = 'youtube_new_video';
      }
      // Schedules
      else if (pagePath.includes('/schedules')) {
        pageType = 'schedule';
      }
      // Executive
      else if (pagePath.includes('/executive')) {
        pageType = 'executive_appointment';
      }
      // Games
      else if (pagePath.includes('/games')) {
        pageType = 'game_invite';
      }
      // Jumuia
      else if (pagePath.includes('/jumuia')) {
        pageType = 'jumuia';
      }
      else if (pagePath.includes('/admin/feedback')) {
      pageType = 'feedback_new';
    }
    else if (pagePath.includes('/feedback/history')) {
      pageType = 'feedback_updated';
    }
    else if (pagePath.includes('/feedback')) {
      pageType = 'feedback_new';
    }

      
      // Dashboard - don't mark anything
      else if (pagePath.includes('/dashboard')) {
        return;
      }

      if (!pageType) return;

      const pageKey = `${pageType}-${pagePath}`;
      
      if (hasMarkedReadForCurrentPage.current.has(pageKey)) return;

      const unreadForThisPage = notifications.filter(
        n => !n.read && n.type === pageType
      );

      if (unreadForThisPage.length === 0) return;

      console.log(`Auto-marking ${unreadForThisPage.length} ${pageType} notifications as read`);

      try {
        const token = localStorage.getItem("token");
        
        await axios.put(
          `${BASE_URL}/api/notifications/mark-by-type/${userId}`,
          { type: pageType },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setNotifications(prev =>
          prev.map(n => 
            n.type === pageType ? { ...n, read: true } : n
          )
        );

        hasMarkedReadForCurrentPage.current.add(pageKey);
        
      } catch (err) {
        console.error("Error marking notifications as read:", err);
      }
    };

    const timer = setTimeout(() => {
      markNotificationsForCurrentPage();
    }, 500);

    return () => clearTimeout(timer);
  }, [location.pathname, userId, notifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (notificationId) => {
    try {
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );

      const token = localStorage.getItem("token");
      await axios.put(`${BASE_URL}/api/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      window.dispatchEvent(new CustomEvent('notificationRead', {
        detail: { notificationId }
      }));
    
      window.dispatchEvent(new CustomEvent('notificationUpdate', {
        detail: { unreadCount: unreadCount - 1 }
      }));
      
    } catch (err) {
      console.error("Error marking as read:", err);
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );

      badgeManager.updateBadgeCount(0);

      const token = localStorage.getItem("token");
      await axios.put(`${BASE_URL}/api/notifications/${userId}/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      window.dispatchEvent(new CustomEvent('notificationAllRead'));
      window.dispatchEvent(new CustomEvent('notificationUpdate', {
        detail: { unreadCount: 0 }
      }));
      
    } catch (err) {
      console.error("Error marking all as read:", err);
      fetchNotifications();
    }
  };

  const dismissAllFromDropdown = () => {
    const newDismissed = new Set(dismissedIds);
    notifications.forEach(n => newDismissed.add(n.id));
    setDismissedIds(newDismissed);
    
    setNotifications([]);
    setShowDropdown(false);
    badgeManager.updateBadgeCount(0);
    console.log("All notifications permanently dismissed");
  };

  const dismissNotification = (notificationId) => {
    const newDismissed = new Set(dismissedIds);
    newDismissed.add(notificationId);
    setDismissedIds(newDismissed);
    
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    
    const newUnreadCount = notifications.filter(n => n.id !== notificationId && !n.read).length;
    badgeManager.updateBadgeCount(newUnreadCount);
  };

  // COMPLETE handleNotificationClick with ALL types
  const handleNotificationClick = (notif) => {
    if (!notif.read) {
      markAsRead(notif.id);
    }
    
    let path = getNotificationPath(notif.type);
    let state = {};
    
    // Special handling for types with extra data
    switch(notif.type) {
      case 'direct_message':
      case 'message':
        state = { 
          conversationId: notif.data?.conversationId,
          messageId: notif.data?.messageId
        };
        break;
      case 'game_invite':
        state = { 
          pendingInviteId: notif.data?.inviteId,
          fromUserId: notif.data?.fromUserId,
          gameType: notif.data?.gameType
        };
        break;
      case 'mass_reading':
        if (notif.data?.readingId) {
          state = { readingId: notif.data.readingId };
        }
        break;
      case 'attendance_checkin':
      case 'attendance_thankyou':
      case 'attendance_missed':
      case 'attendance_reminder':
        if (notif.data?.sheetId) {
          state = { sheetId: notif.data.sheetId };
        }
        break;
      case 'attendance_summary':
      case 'attendance_admin_report':
        if (notif.data?.sheetId) {
          state = { sheetId: notif.data.sheetId };
        }
        break;
      case 'new_media':
      case 'media_comment':
      case 'media_like':
        if (notif.data?.mediaId) {
          path = `/gallery?media=${notif.data.mediaId}`;
        }
        break;
      case 'contribution':
      case 'pledge_approved':
      case 'payment_added':
      case 'new_pledge':
        if (notif.data?.pledgeId) {
          state = { pledgeId: notif.data.pledgeId };
        }
        break;
      case 'minutes_published':
        if (notif.data?.minutesId) {
          state = { minutesId: notif.data.minutesId };
        }
        break;
      case 'youtube_new_video':
        if (notif.data?.videoId) {
          state = { videoId: notif.data.videoId };
        }
        break;
      case 'event_reminder':
        if (notif.data?.eventId) {
          state = { eventId: notif.data.eventId };
        }
        break;
      case 'schedule':
        if (notif.data?.scheduleId) {
          state = { scheduleId: notif.data.scheduleId };
        }
        break;
      case 'announcement':
      case 'new_announcement':
        if (notif.data?.announcementId) {
          state = { announcementId: notif.data.announcementId };
        }
        break;
      default:
        break;
    }
    
    navigate(path, { state });
    setShowDropdown(false);
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'Just now';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return 'Just now';
    }
  };

  // COMPLETE getNotificationIcon with ALL types
  const getNotificationIcon = (type) => {
    switch(type) {
      // Attendance
      case 'attendance_checkin':
      case 'attendance_thankyou':
      case 'attendance_missed':
      case 'attendance_reminder':
      case 'attendance_automatic_reminder':
      case 'attendance_sheet_opened':
      case 'attendance_summary':
      case 'attendance_admin_report':
      case 'attendance_bulk_checkin':
        return '✅';
      
      // Minutes
      case 'meeting_minutes_published':
      case 'meeting_minutes_comment':
      case 'minutes_published':
        return '📋';
      
      // Announcements
      case 'announcement':
      case 'new_announcement':
      case 'jumuia_announcement':
        return '📢';
      
      // Games
      case 'game_invite':
        return '🎮';
      
      // Messages
      case 'direct_message':
      case 'message':
      case 'chat_mention':
      case 'pin':
      case 'broadcast':
      case 'send_email':
      case 'report_resolved':
        return '💬';
      
      // Contributions
      case 'contribution':
      case 'pledge_approved':
      case 'payment_added':
      case 'payment_success':
      case 'payment_received':
      case 'jumuia_contribution':
      case 'pledge_message':
      case 'new_pledge':
        return '💰';
      
      // Executive
      case 'executive_appointment':
      case 'executive_removed':
        return '👑';
      
      // Media
      case 'new_media':
      case 'media_comment':
      case 'media_like':
        return '📸';
      
      // YouTube
      case 'youtube_new_video':
      case 'youtube_live':
        return '📺';
      
      // Schedules
      case 'schedule':
      case 'event_reminder':
        return '📅';
      
      // Programs
      case 'program':
        return '⛪';
      
      // Jumuia
      case 'jumuia':
      
        return '🏠';
      
      // Mass Readings
      case 'mass_reading':
        return '📖';
      
      // System
      case 'test':
      case 'user_login':
      case 'role_change':
      case 'welcome':
      case 'api_notify':
        return '🔔';

         case 'feedback_new':
      return '📋';
    case 'feedback_updated':
      return '✉️';
      
      default:
        return '🔔';
    }
  };

  // Rest of the component (render section remains the same)
  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  return (
    <div style={styles.container} ref={dropdownRef}>
      <motion.button
        whileHover={{ scale: 1.05, rotate: 8 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowDropdown(!showDropdown)}
        style={styles.bellButton}
      >
        <span style={{ fontSize: '22px', lineHeight: 1 }}>🔔</span>
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={styles.badge}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
        {isLoading && unreadCount === 0 && (
          <span style={styles.loadingDot} />
        )}
      </motion.button>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={styles.dropdown}
          >
            <div style={styles.dropdownHeader}>
              <h3 style={styles.dropdownTitle}>
                Notifications
                {unreadCount > 0 && (
                  <span style={styles.unreadCountBadge}>{unreadCount} new</span>
                )}
              </h3>
              <div style={styles.headerActions}>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} style={styles.markAllButton} title="Mark all as read">
                    <FiCheck size={14} />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button onClick={dismissAllFromDropdown} style={styles.dismissAllButton} title="Dismiss all from view">
                    <FiEyeOff size={14} />
                  </button>
                )}
              </div>
            </div>

            <div style={styles.notificationList}>
              {unreadNotifications.length > 0 && (
                <>
                  <div style={styles.sectionHeader}>
                    <span style={styles.sectionTitle}>NEW</span>
                  </div>
                  {unreadNotifications.map((notif) => (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      style={styles.notificationItemWrapper}
                    >
                      <div 
                        style={styles.unreadNotificationItem}
                        onClick={() => handleNotificationClick(notif)}
                      >
                        <div style={styles.notificationIcon}>
                          {getNotificationIcon(notif.type)}
                        </div>
                        <div style={styles.notificationContent}>
                          <div style={styles.notificationTitle}>{notif.title}</div>
                          <div style={styles.notificationMessage}>{notif.message}</div>
                          <div style={styles.notificationTime}>
                            <FiClock size={10} />
                            {formatTime(notif.createdAt)}
                          </div>
                        </div>
                        <div style={styles.unreadDot} />
                      </div>
                      <button 
                        style={styles.dismissButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissNotification(notif.id);
                        }}
                        title="Dismiss permanently"
                      >
                        <FiX size={14} />
                      </button>
                    </motion.div>
                  ))}
                </>
              )}

              {readNotifications.length > 0 && (
                <>
                  <div style={styles.sectionHeader}>
                    <span style={styles.sectionTitle}>EARLIER</span>
                  </div>
                  {readNotifications.slice(0, 5).map((notif) => (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={styles.notificationItemWrapper}
                    >
                      <div 
                        style={styles.readNotificationItem}
                        onClick={() => handleNotificationClick(notif)}
                      >
                        <div style={styles.notificationIcon}>
                          {getNotificationIcon(notif.type)}
                        </div>
                        <div style={styles.notificationContent}>
                          <div style={styles.notificationTitle}>{notif.title}</div>
                          <div style={styles.notificationMessage}>{notif.message}</div>
                          <div style={styles.notificationTime}>
                            <FiClock size={10} />
                            {formatTime(notif.createdAt)}
                          </div>
                        </div>
                      </div>
                      <button 
                        style={styles.dismissButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissNotification(notif.id);
                        }}
                        title="Dismiss permanently"
                      >
                        <FiX size={14} />
                      </button>
                    </motion.div>
                  ))}
                  {readNotifications.length > 5 && (
                    <div style={styles.viewAllContainer}>
                      <button style={styles.viewAllButton}>
                        View all read notifications
                      </button>
                    </div>
                  )}
                </>
              )}

              {notifications.length === 0 && (
                <div style={styles.emptyState}>
                  <span style={styles.emptyIcon}>🔔</span>
                  <p style={styles.emptyText}>No notifications</p>
                </div>
              )}
            </div>

            <div style={styles.dropdownFooter}>
              <button onClick={() => setShowDropdown(false)} style={styles.closeButton}>
                <FiX size={14} /> Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


const styles = {
  container: {
    position: "relative",
    zIndex: 999999,
  },
  
  bellButton: {
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "50%",
    width: "44px",
    height: "44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    position: "relative",
    transition: "all 0.2s",
    minWidth: "44px",
    minHeight: "44px",
    outline: "none",
    WebkitTapHighlightColor: "transparent",
  },
  
  // ADDED: Golden bell specific style
  goldenBell: {
    filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.5))",
  },
  
  badge: {
    position: "absolute",
    top: "-5px",
    right: "-5px",
    background: "#ef4444",
    color: "white",
    fontSize: "11px",
    fontWeight: "bold",
    minWidth: "20px",
    height: "20px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid #1e293b",
    zIndex: 1000000,
  },
  
  loadingDot: {
    position: "absolute",
    bottom: "-2px",
    right: "-2px",
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    background: "#4f46e5",
    border: "2px solid #1e293b",
    animation: "pulse 1.5s infinite",
    zIndex: 1000000,
  },
  
  dropdown: {
    position: "fixed",
    top: "70px",
    right: "20px",
    width: "380px",
    maxWidth: "calc(100vw - 40px)",
    background: "#ffffff",
    borderRadius: "20px",
    boxShadow: "0 20px 35px -8px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.05)",
    zIndex: 9999999,
    overflow: "hidden",
    "@media (max-width: 480px)": {
      right: "10px",
      left: "10px",
      width: "calc(100vw - 20px)",
      maxWidth: "calc(100vw - 20px)",
      top: "60px",
    },
  },
  
  dropdownHeader: {
    padding: "16px 20px",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#ffffff",
    flexWrap: "wrap",
    gap: "10px",
  },
  
  dropdownTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#0f172a",
    margin: 0,
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  
  unreadCountBadge: {
    background: "#4f46e5",
    color: "white",
    fontSize: "11px",
    fontWeight: "600",
    padding: "3px 8px",
    borderRadius: "12px",
  },
  
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  
  markAllButton: {
    background: "#eef2ff",
    border: "none",
    color: "#4f46e5",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    padding: "8px",
    borderRadius: "8px",
    transition: "all 0.2s",
    minWidth: "36px",
    minHeight: "36px",
    outline: "none",
    WebkitTapHighlightColor: "transparent",
  },
  
  dismissAllButton: {
    background: "#f1f5f9",
    border: "none",
    color: "#64748b",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    padding: "8px",
    borderRadius: "8px",
    transition: "all 0.2s",
    minWidth: "36px",
    minHeight: "36px",
    outline: "none",
    WebkitTapHighlightColor: "transparent",
  },
  
  notificationItemWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  
  dismissButton: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "transparent",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
    padding: "6px",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    ":hover": {
      background: "#fee2e2",
      color: "#ef4444",
    },
  },
  
  notificationList: {
    maxHeight: "min(450px, 70vh)",
    overflowY: "auto",
    background: "#ffffff",
    WebkitOverflowScrolling: "touch",
  },
  
  sectionHeader: {
    padding: "8px 20px",
    background: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
    borderTop: "1px solid #e2e8f0",
  },
  
  sectionTitle: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  
  unreadNotificationItem: {
    display: "flex",
    gap: "12px",
    padding: "16px 20px",
    paddingRight: "48px",
    borderBottom: "1px solid #f1f5f9",
    cursor: "pointer",
    transition: "background 0.2s",
    position: "relative",
    background: "#f0f9ff",
    borderLeft: "4px solid #4f46e5",
    minHeight: "70px",
    width: "100%",
  },
  
  readNotificationItem: {
    display: "flex",
    gap: "12px",
    padding: "16px 20px",
    paddingRight: "48px",
    borderBottom: "1px solid #f1f5f9",
    cursor: "pointer",
    transition: "background 0.2s",
    position: "relative",
    background: "#ffffff",
    opacity: 0.8,
    width: "100%",
  },
  
  notificationIcon: {
    fontSize: "24px",
    minWidth: "32px",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  
  notificationContent: {
    flex: 1,
  },
  
  notificationTitle: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: "6px",
    lineHeight: 1.3,
  },
  
  notificationMessage: {
    fontSize: "14px",
    color: "#475569",
    marginBottom: "8px",
    lineHeight: 1.4,
    wordBreak: "break-word",
  },
  
  notificationTime: {
    fontSize: "12px",
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  
  unreadDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#4f46e5",
    position: "absolute",
    top: "20px",
    right: "20px",
    zIndex: 1000,
  },
  
  emptyState: {
    padding: "60px 20px",
    textAlign: "center",
    background: "#ffffff",
    minHeight: "200px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  
  emptyIcon: {
    fontSize: "48px",
    display: "block",
    marginBottom: "16px",
  },
  
  emptyText: {
    fontSize: "16px",
    color: "#94a3b8",
  },
  
  viewAllContainer: {
    padding: "12px 20px",
    textAlign: "center",
    borderTop: "1px solid #e2e8f0",
  },
  
  viewAllButton: {
    background: "none",
    border: "none",
    color: "#4f46e5",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    padding: "8px",
  },
  
  dropdownFooter: {
    padding: "12px 20px",
    borderTop: "1px solid #e2e8f0",
    textAlign: "center",
    background: "#ffffff",
  },
  
  closeButton: {
    background: "#f1f5f9",
    border: "none",
    borderRadius: "30px",
    padding: "12px 24px",
    fontSize: "14px",
    color: "#475569",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "all 0.2s",
    width: "100%",
    minHeight: "48px",
    fontWeight: "500",
    outline: "none",
    WebkitTapHighlightColor: "transparent",
  },
};

const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
  
  .notifications-dropdown {
    z-index: 9999999 !important;
  }
  
  @media (max-width: 480px) {
    .notification-item {
      padding: 16px !important;
    }
    .notification-title {
      font-size: 15px !important;
    }
    .notification-message {
      font-size: 14px !important;
    }
  }
  
  button, div[role="button"] {
    -webkit-tap-highlight-color: transparent;
  }
  
  .notifications-list {
    -webkit-overflow-scrolling: touch;
  }

  .mark-all-button:hover {
    background: #dbeafe !important;
  }
  
  .dismiss-all-button:hover {
    background: #e2e8f0 !important;
    color: #475569 !important;
  }
  
  .dismiss-button:hover {
    background: #fee2e2 !important;
    color: #ef4444 !important;
  }
`;
document.head.appendChild(style);