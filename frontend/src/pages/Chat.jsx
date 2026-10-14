// frontend/src/pages/Chat.jsx
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import BASE_URL from "../api";
import io from "socket.io-client";
import { FiArrowLeft, FiSend, FiPaperclip, FiSmile, FiSearch, FiMapPin, FiUsers, FiCheck } from "react-icons/fi";

function Chat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [user, setUser] = useState(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showOnlineList, setShowOnlineList] = useState(false);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  
  const [newMessage, setNewMessage] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [editMessage, setEditMessage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [showMediaPreview, setShowMediaPreview] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });

  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showMessageActions, setShowMessageActions] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [touchPosition, setTouchPosition] = useState({ x: 0, y: 0 });

  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showPinned, setShowPinned] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const refreshTimerRef = useRef(null);
  const lastScrollPositionRef = useRef(0);
  const isUserScrollingRef = useRef(false);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const goBack = () => navigate('/dashboard');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [avatarErrors, setAvatarErrors] = useState({});
  // Loading states for chat actions
const [deletingMessageId, setDeletingMessageId] = useState(null);
const [editingMessageId, setEditingMessageId] = useState(null);
const [reactingMessageId, setReactingMessageId] = useState(null);
const [pinningMessageId, setPinningMessageId] = useState(null);
const [blockingUserId, setBlockingUserId] = useState(null);
  



  // Mark all messages as read function
const markAllMessagesAsRead = async () => {
  try {
    await axios.post(`${BASE_URL}/api/chat/mark-all-read`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Messages marked as read");
  } catch (error) {
    console.error("Error marking messages as read:", error);
  }
};

 // Load cached messages instantly on mount
useEffect(() => {
  const cachedMessages = localStorage.getItem('chat_messages_cached');
  if (cachedMessages) {
    const parsed = JSON.parse(cachedMessages);
    // Sort messages by date (oldest to newest for proper display)
    const sortedMessages = parsed.sort((a, b) => 
      new Date(a.createdAt) - new Date(b.createdAt)
    );
    setMessages(sortedMessages);
    // Scroll to bottom after showing cached messages
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 100);
  }
}, []);

// Save messages to cache whenever they change
useEffect(() => {
  if (messages.length > 0 && !loading) {
    localStorage.setItem('chat_messages_cached', JSON.stringify(messages));
  }
}, [messages, loading]);

// Mark messages as read when chat loads
useEffect(() => {
  if (hasInitialLoad && messages.length > 0) {
    markAllMessagesAsRead();
  }
}, [hasInitialLoad, messages]);

// Mark as read when user leaves the chat
useEffect(() => {
  return () => {
    markAllMessagesAsRead();
  };
}, []);

  useEffect(() => {
  const container = chatContainerRef.current;
  if (!container) return;

  const handleScroll = () => {
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    // Show button when NOT near bottom (anywhere above bottom)
    setShowScrollButton(!isNearBottom);
  };

  container.addEventListener('scroll', handleScroll);
  return () => container.removeEventListener('scroll', handleScroll);
}, []);
  // Socket connection for real-time messages
useEffect(() => {
  if (!user) return;

  const socket = io(BASE_URL);
  
  socket.on('connect', () => {
    console.log('Socket connected for chat');
    // Join the general chat room
    socket.emit('join-chat');
  });

 // Listen for new messages
socket.on('new_message', (newMessage) => {
  // Don't add duplicate if it's our own message (we already have temp)
  if (newMessage.userId === user?.id) return;
  
  setMessages(prev => {
    // Check if message already exists
    if (prev.some(m => m.id === newMessage.id)) return prev;
    
    return [...prev, {
      ...newMessage,
      attachments: parseAttachments(newMessage.attachments),
      files: newMessage.files || [],
      isOwn: false
    }];
  });
  
  // Mark as read when receiving new message while in chat
  if (document.hasFocus()) {
    markAllMessagesAsRead();
  }
});  // <-- THIS CLOSING BRACKET WAS IN THE WRONG PLACE
  // Listen for message updates (edit, delete, reaction)
  socket.on('message_updated', (updatedMessage) => {
    setMessages(prev => prev.map(msg => 
      msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg
    ));
  });

  socket.on('message_deleted', ({ messageId }) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  });

  return () => {
    socket.disconnect();
  };
}, [user]);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    const userData = JSON.parse(localStorage.getItem("user"));
    setUser(userData);
  }, [token, navigate]);

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "" }), 3000);
  };

  const parseAttachments = (attachments) => {
    if (!attachments) return [];
    try {
      if (Array.isArray(attachments)) return attachments;
      if (typeof attachments === 'string') {
        const parsed = JSON.parse(attachments);
        return Array.isArray(parsed) ? parsed : [parsed];
      }
      return [];
    } catch (e) {
      return [];
    }
  };

  const fetchPinnedMessages = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/chat/pinned`, { headers });
      setPinnedMessages(response.data);
    } catch (err) {
      console.error("Error fetching pinned messages:", err);
    }
  };

  const togglePinMessage = async (messageId) => {
    try {
      const response = await axios.post(`${BASE_URL}/api/chat/${messageId}/pin`, {}, { headers });
      showNotification(response.data.message === "Message unpinned" ? "Message unpinned" : "Message pinned", "success");
      fetchPinnedMessages();
      setShowMessageActions(false);
      setSelectedMessage(null);
    } catch (err) {
      showNotification("Failed to pin message", "error");
    }
  };

  const fetchBlockedUsers = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/chat/blocked`, { headers });
      setBlockedUsers(response.data);
    } catch (err) {
      console.error("Error fetching blocked users:", err);
    }
  };

 const toggleBlockUser = async (userId) => {
  setBlockingUserId(userId);
  try {
    const response = await axios.post(`${BASE_URL}/api/chat/block/${userId}`, {}, { headers });
    showNotification(response.data.message, "success");
    fetchBlockedUsers();
  } catch (err) {
    showNotification("Failed to block user", "error");
  } finally {
    setBlockingUserId(null);
  }
};
  const searchMessages = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const response = await axios.get(`${BASE_URL}/api/chat/search?q=${encodeURIComponent(query)}`, { headers });
      setSearchResults(response.data);
    } catch (err) {
      showNotification("Search failed", "error");
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (searchQuery) {
      const timeout = setTimeout(() => searchMessages(searchQuery), 500);
      return () => clearTimeout(timeout);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleTouchStart = (e, message) => {
    e.preventDefault();
    const touch = e.touches[0];
    setTouchPosition({ x: touch.clientX, y: touch.clientY });
    const timer = setTimeout(() => {
      setSelectedMessage(message);
      setShowMessageActions(true);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleTouchMove = (e) => {
    if (longPressTimer) {
      const touch = e.touches[0];
      const distance = Math.sqrt(Math.pow(touch.clientX - touchPosition.x, 2) + Math.pow(touch.clientY - touchPosition.y, 2));
      if (distance > 10) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const scrollToBottom = () => {
  if (chatContainerRef.current) {
    chatContainerRef.current.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth'
    });
  }
};

  const handleEditMessage = async () => {
  if (!editMessage || !editMessage.content.trim()) return;
  setEditingMessageId(editMessage.id);
  try {
    const response = await axios.put(`${BASE_URL}/api/chat/${editMessage.id}`, 
      { content: editMessage.content }, 
      { headers }
    );
    setMessages(prev => prev.map(msg => 
      msg.id === editMessage.id ? { ...msg, content: response.data.content, isEdited: true } : msg
    ));
    setEditMessage(null);
    showNotification("Message edited", "success");
  } catch (err) {
    showNotification("Failed to edit message", "error");
  } finally {
    setEditingMessageId(null);
  }
};

 const handleDeleteMessage = async (messageId) => {
  if (!window.confirm("Delete this message?")) return;
  setDeletingMessageId(messageId);
  try {
    await axios.delete(`${BASE_URL}/api/chat/${messageId}`, { headers });
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
    setShowMessageActions(false);
    setSelectedMessage(null);
    showNotification("Message deleted", "success");
  } catch (err) {
    showNotification("Failed to delete message", "error");
  } finally {
    setDeletingMessageId(null);
  }
};

  const handleHardDeleteMessage = async (messageId) => {
    if (!window.confirm("Permanently delete this message? This cannot be undone!")) return;
    try {
      await axios.delete(`${BASE_URL}/api/chat/${messageId}/hard`, { headers });
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      setShowMessageActions(false);
      setSelectedMessage(null);
      showNotification("Message permanently deleted", "success");
    } catch (err) {
      showNotification("Failed to delete message", "error");
    }
  };

 const addReaction = async (messageId, reaction) => {
  setReactingMessageId(messageId);
  try {
    const response = await axios.post(`${BASE_URL}/api/chat/${messageId}/reactions`, { reaction }, { headers });
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const existingReaction = msg.reactions?.find(r => r.userId === user?.id && r.reaction === reaction);
        if (existingReaction) {
          return { ...msg, reactions: msg.reactions.filter(r => r !== existingReaction) };
        } else {
          return { ...msg, reactions: [...(msg.reactions || []), response.data] };
        }
      }
      return msg;
    }));
    setShowMessageActions(false);
    setSelectedMessage(null);
  } catch (err) {
    console.error("Error adding reaction:", err);
  } finally {
    setReactingMessageId(null);
  }
};

  const handleReply = (message) => {
    setReplyTo(message);
    setShowMessageActions(false);
    setSelectedMessage(null);
    document.querySelector('textarea')?.focus();
  };

  const markAsRead = async (messageId) => {
    try {
      await axios.post(`${BASE_URL}/api/chat/${messageId}/read`, {}, { headers });
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

const fetchMessages = async (isInitialLoad = false) => {
  try {
    const response = await axios.get(`${BASE_URL}/api/chat/enhanced`, { headers });
    const parsedMessages = response.data.reverse().map(msg => ({
      ...msg,
      attachments: parseAttachments(msg.attachments),
      files: msg.files || [],
      isOwn: msg.userId === user?.id
    }));
    
    // Save scroll position BEFORE updating
    const container = chatContainerRef.current;
    const currentScrollTop = container?.scrollTop || 0;
    const wasNearBottom = container ? (container.scrollHeight - container.scrollTop - container.clientHeight < 100) : false;
    
    // MERGE instead of REPLACE - preserve existing messages
    setMessages(prev => {
      const messageMap = new Map();
      // Add existing messages first
      prev.forEach(msg => messageMap.set(msg.id, msg));
      // Add or update with server messages
      parsedMessages.forEach(newMsg => {
        const existingMsg = messageMap.get(newMsg.id);
        if (existingMsg && existingMsg.isTemp) {
          // Replace temp message with real one
          messageMap.set(newMsg.id, { ...newMsg, isTemp: false });
        } else if (!existingMsg) {
          // Add new message
          messageMap.set(newMsg.id, newMsg);
        }
      });
      // Convert back to array and sort by date
      return Array.from(messageMap.values()).sort((a, b) => 
        new Date(a.createdAt) - new Date(b.createdAt)
      );
    });
    
   // Mark all messages as read at once (more efficient)
if (parsedMessages.some(msg => !msg.isOwn)) {
  markAllMessagesAsRead();
}
    
    // SCROLL HANDLING
    setTimeout(() => {
      if (container) {
        if (isInitialLoad) {
          // On page refresh/load - scroll to bottom
          container.scrollTop = container.scrollHeight;
        } else {
          // Background refresh - restore position or stay at bottom
          if (wasNearBottom) {
            container.scrollTop = container.scrollHeight;
          } else {
            container.scrollTop = currentScrollTop;
          }
        }
      }
    }, 50);
  } catch (err) {
    console.error("Error fetching messages:", err);
  } finally {
    if (isInitialLoad) {
      setLoading(false);
      setHasInitialLoad(true);
    }
  }
};
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const handleScrollStart = () => { isUserScrollingRef.current = true; };
    const handleScrollEnd = () => { setTimeout(() => { isUserScrollingRef.current = false; }, 150); };
    container.addEventListener('scroll', handleScrollStart);
    container.addEventListener('scrollend', handleScrollEnd);
    return () => {
      container.removeEventListener('scroll', handleScrollStart);
      container.removeEventListener('scrollend', handleScrollEnd);
    };
  }, []);

  const fetchOnlineCount = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/chat/online`, { headers });
      setOnlineUsers(response.data);
      setOnlineCount(response.data.length);
    } catch (err) {
      console.error("Error fetching online users:", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMessages(true);
      fetchOnlineCount();
      fetchPinnedMessages();
      fetchBlockedUsers();
    }
    
    return () => { if (refreshTimerRef.current) clearInterval(refreshTimerRef.current); };
  }, [user, hasInitialLoad]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append("files", file);
    const uploadId = Date.now().toString();
    setUploadProgress(prev => ({ ...prev, [uploadId]: 0 }));
    try {
      const response = await axios.post(`${BASE_URL}/api/chat/upload`, formData, {
        headers: { ...headers, "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(prev => ({ ...prev, [uploadId]: percentCompleted }));
        },
      });
      setUploadProgress(prev => { const newProgress = { ...prev }; delete newProgress[uploadId]; return newProgress; });
      return response.data[0];
    } catch (error) {
      showNotification("Failed to upload file", "error");
      setUploadProgress(prev => { const newProgress = { ...prev }; delete newProgress[uploadId]; return newProgress; });
      return null;
    }
  };

 // INSTANT MESSAGE SENDING - Optimistic update with proper replacement
const handleSendMessage = async () => {
  if (selectedFiles.length === 0 && !newMessage.trim()) return;
  if (sending) return;

  setSending(true);
  const messageText = newMessage.trim();
  const filesToSend = [...selectedFiles];
  const replyToMessage = replyTo;
  
  setNewMessage("");
  setSelectedFiles([]);
  setReplyTo(null);
  if (fileInputRef.current) fileInputRef.current.value = "";

  const tempId = `temp-${Date.now()}`;
  const tempMessage = {
    id: tempId,
    content: messageText,
    createdAt: new Date().toISOString(),
    userId: user?.id,
    user: { fullName: "You", role: user?.role },
    isOwn: true,
    isTemp: true,
    attachments: [],
    files: [],
    reactions: [],
    replyTo: replyToMessage ? { id: replyToMessage.id, content: replyToMessage.content, user: replyToMessage.user } : null
  };

  // Add temp message instantly
  setMessages(prev => [...prev, tempMessage]);
  
  // Scroll to bottom
  setTimeout(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, 50);

  try {
    // Upload files if any
    const attachments = [];
    for (let i = 0; i < filesToSend.length; i++) {
      const uploaded = await uploadFile(filesToSend[i]);
      if (uploaded) attachments.push(uploaded);
    }

    const payload = {
      content: messageText,
      replyToId: replyToMessage?.id,
      attachments: attachments.length > 0 ? attachments : undefined
    };

    const response = await axios.post(`${BASE_URL}/api/chat/enhanced`, payload, { headers });
    
    // CRITICAL FIX: Replace temp message with real message
    setMessages(prev => {
      // Find the index of the temp message
      const tempIndex = prev.findIndex(msg => msg.id === tempId);
      if (tempIndex !== -1) {
        // Create new array with the temp message replaced
        const newMessages = [...prev];
        newMessages[tempIndex] = {
          ...response.data,
          attachments: parseAttachments(response.data.attachments),
          files: response.data.files || [],
          isOwn: true,
          isTemp: false  // Make sure isTemp is false
        };
        return newMessages;
      }
      // If temp not found, just add the new message
      return [...prev, response.data];
    });
    
    showNotification("Message sent", "success");
  } catch (error) {
    // Remove temp message on error
    setMessages(prev => prev.filter(msg => msg.id !== tempId));
    showNotification(error.response?.data?.error || "Failed to send message", "error");
    // Restore input
    setNewMessage(messageText);
    setSelectedFiles(filesToSend);
    setReplyTo(replyToMessage);
  } finally {
    setSending(false);
  }
};

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (editMessage) handleEditMessage();
      else handleSendMessage();
    }
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const diffHours = diff / (1000 * 60 * 60);
    if (diffHours < 24) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    else if (diffHours < 48) return 'Yesterday';
    else return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  const groupMessagesByDate = () => {
    const groups = {};
    messages.forEach(msg => {
      const date = new Date(msg.createdAt).toLocaleDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });
    return groups;
  };

  const getFilePreview = (file) => {
    if (file.type?.startsWith('image/')) return URL.createObjectURL(file);
    return null;
  };

  useEffect(() => {
    return () => {
      selectedFiles.forEach(file => { if (file.preview) URL.revokeObjectURL(file.preview); });
    };
  }, [selectedFiles]);

  const getReactionsForMessage = (messageId) => {
    const msg = messages.find(m => m.id === messageId);
    return msg?.reactions || [];
  };

  const messageGroups = groupMessagesByDate();
  const commonReactions = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "🎉"];

  //if (loading) {
   // return (
     // <div style={styles.loadingContainer}>
        //<div style={styles.loadingSpinner}></div>
      //  <p style={styles.loadingText}>Loading chat...</p>
    //  </div>
  //  );
//  }

  return (
    <div style={styles.container}>
      {/* Back Button */}
      <div style={styles.backButtonContainer}>
        <button onClick={goBack} style={styles.backButton}>
          <FiArrowLeft size={20} />
          <span>Back</span>
        </button>
      </div>

      {/* Notification */}
      <AnimatePresence>
        {notification.show && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            style={{ ...styles.notification, ...styles[notification.type] }}
          >
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>ZUCA Chat</h1>
          <p style={styles.subtitle}>{onlineCount} online • {messages.length} messages</p>
        </div>
        <div style={styles.headerActions}>
          <button style={styles.iconButton} onClick={() => setShowSearch(!showSearch)}>
            <FiSearch size={18} />
          </button>
          <button style={styles.iconButton} onClick={() => setShowPinned(!showPinned)}>
            <FiMapPin size={18} />
            {pinnedMessages.length > 0 && <span style={styles.badge}>{pinnedMessages.length}</span>}
          </button>
          <button style={styles.onlineButton} onClick={() => setShowOnlineList(!showOnlineList)}>
            <FiUsers size={14} />
            <span>{onlineCount}</span>
          </button>
        </div>
      </div>

      {/* Online Users Dropdown */}
      <AnimatePresence>
        {showOnlineList && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={styles.onlineDropdown}
          >
            <div style={styles.onlineHeader}>
              <h3>Online Members</h3>
              <button onClick={() => setShowOnlineList(false)}>✕</button>
            </div>
    <div style={styles.onlineList}>
  {onlineUsers.length === 0 ? (
    <p style={styles.noOnline}>No one online</p>
  ) : (
    onlineUsers.map(u => (
      <div key={u.id} style={styles.onlineItem}>
        <div style={styles.onlineAvatar}>
          {u.profileImage ? (
            <img 
              src={u.profileImage.startsWith("http") ? u.profileImage : `${BASE_URL}/${u.profileImage}`}
              alt={u.fullName}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                objectFit: 'cover'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
                const textNode = document.createTextNode(u.fullName?.charAt(0).toUpperCase() || '?');
                e.target.parentElement.appendChild(textNode);
              }}
            />
          ) : (
            <span style={{ fontSize: '14px', fontWeight: '600' }}>
              {u.fullName?.charAt(0).toUpperCase() || '?'}
            </span>
          )}
        </div>
        {/* ADD THE USER NAME - THIS WAS MISSING! */}
        <span style={styles.onlineName}>{u.fullName}</span>
        {u.role === 'admin' && <span style={styles.adminBadge}>Admin</span>}
      </div>
    ))
  )}
</div>
             
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll to Bottom Button */}
<AnimatePresence>
  {showScrollButton && (
    <motion.button
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      onClick={scrollToBottom}
      style={styles.scrollButton}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      <span style={styles.scrollButtonIcon}>↓</span>
    </motion.button>
  )}
</AnimatePresence>

      {/* Search Panel */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            style={styles.searchPanel}
          >
            <div style={styles.searchHeader}>
              <input
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
                autoFocus
              />
              <button onClick={() => setShowSearch(false)} style={styles.searchClose}>✕</button>
            </div>
            {searching && <div style={styles.searchSpinner} />}
            {searchResults.length > 0 && (
              <div style={styles.searchResults}>
                {searchResults.map(msg => (
                  <div key={msg.id} style={styles.searchResult} onClick={() => {
                    const element = document.getElementById(`msg-${msg.id}`);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth' });
                      setShowSearch(false);
                    }
                  }}>
                    <div style={styles.searchResultHeader}>
                      <span style={styles.searchResultUser}>{msg.user.fullName}</span>
                      <span style={styles.searchResultTime}>{formatMessageTime(msg.createdAt)}</span>
                    </div>
                    <p style={styles.searchResultContent}>{msg.content}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pinned Messages Panel */}
      <AnimatePresence>
        {showPinned && (
          <motion.div
            initial={{ x: 300 }}
            animate={{ x: 0 }}
            exit={{ x: 300 }}
            style={styles.pinnedPanel}
          >
            <div style={styles.pinnedHeader}>
              <h3>📌 Pinned Messages</h3>
              <button onClick={() => setShowPinned(false)}>✕</button>
            </div>
            <div style={styles.pinnedList}>
              {pinnedMessages.length === 0 ? (
                <p style={styles.noPinned}>No pinned messages</p>
              ) : (
                pinnedMessages.map(pin => (
                  <div key={pin.id} style={styles.pinnedItem}>
                    <div style={styles.pinnedItemHeader}>
                      <span style={styles.pinnedItemUser}>{pin.message.user.fullName}</span>
                      <span style={styles.pinnedItemTime}>{formatMessageTime(pin.message.createdAt)}</span>
                    </div>
                    <p style={styles.pinnedItemContent}>{pin.message.content || (pin.message.files?.length > 0 ? '📎 Attachments' : '')}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Actions Modal */}
      <AnimatePresence>
        {showMessageActions && selectedMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.actionOverlay}
            onClick={() => { setShowMessageActions(false); setSelectedMessage(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              style={styles.actionModal}
              onClick={e => e.stopPropagation()}
            >
              <div style={styles.actionHeader}>
<div style={styles.actionAvatar}>
  {selectedMessage.user?.profileImage ? (
    <img 
      src={selectedMessage.user.profileImage.startsWith("http") ? selectedMessage.user.profileImage : `${BASE_URL}/${selectedMessage.user.profileImage}`}
      alt={selectedMessage.user?.fullName}
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        objectFit: 'cover'
      }}
      onError={(e) => {
        e.target.style.display = 'none';
        e.target.parentElement.innerHTML = selectedMessage.user?.fullName?.charAt(0).toUpperCase() || '?';
      }}
    />
  ) : (
    selectedMessage.user?.fullName?.charAt(0).toUpperCase() || '?'
  )}
</div>                <div style={styles.actionUserInfo}>
                  <span style={styles.actionUserName}>{selectedMessage.user?.fullName}</span>
                  <span style={styles.actionTime}>{formatMessageTime(selectedMessage.createdAt)}</span>
                </div>
              </div>
              <div style={styles.actionPreview}>{selectedMessage.content || (selectedMessage.files?.length > 0 ? '📎 Attachment' : '')}</div>
              <div style={styles.actionGrid}>
                {commonReactions.map(emoji => (
                  <button key={emoji} style={styles.actionEmoji} onClick={() => addReaction(selectedMessage.id, emoji)}>{emoji}</button>
                ))}
              </div>
              <div style={styles.actionDivider} />
              <div style={styles.actionList}>
                <button style={styles.actionItem} onClick={() => handleReply(selectedMessage)}><span>↩️</span><span>Reply</span></button>
                {selectedMessage.content && (
                  <button style={styles.actionItem} onClick={() => { navigator.clipboard.writeText(selectedMessage.content); showNotification("Copied!", "success"); setShowMessageActions(false); setSelectedMessage(null); }}>
                    <span>📋</span><span>Copy</span>
                  </button>
                )}
                {selectedMessage.isOwn && (
  <button 
    style={styles.actionItem} 
    onClick={() => { setEditMessage(selectedMessage); setShowMessageActions(false); setSelectedMessage(null); }}
    disabled={editingMessageId === selectedMessage.id}
  >
    <span>{editingMessageId === selectedMessage.id ? '⏳' : '✏️'}</span>
    <span>{editingMessageId === selectedMessage.id ? 'Opening...' : 'Edit'}</span>
  </button>
)}
                {user?.role === 'admin' && (
                  <button style={styles.actionItem} onClick={() => togglePinMessage(selectedMessage.id)}>
                    <span>{pinnedMessages.some(p => p.messageId === selectedMessage.id) ? '📌' : '📍'}</span>
                    <span>{pinnedMessages.some(p => p.messageId === selectedMessage.id) ? 'Unpin' : 'Pin'}</span>
                  </button>
                )}
                {(selectedMessage.isOwn || user?.role === 'admin') && (
  <button 
    style={{...styles.actionItem, color: '#ff4444'}} 
    onClick={() => handleDeleteMessage(selectedMessage.id)}
    disabled={deletingMessageId === selectedMessage.id}
  >
    <span>{deletingMessageId === selectedMessage.id ? '⏳' : '🗑️'}</span>
    <span>{deletingMessageId === selectedMessage.id ? 'Deleting...' : 'Delete'}</span>
  </button>
)}
                {!selectedMessage.isOwn && (
  <button 
    style={styles.actionItem} 
    onClick={() => toggleBlockUser(selectedMessage.userId)}
    disabled={blockingUserId === selectedMessage.userId}
  >
    <span>{blockingUserId === selectedMessage.userId ? '⏳' : (blockedUsers.some(b => b.id === selectedMessage.userId) ? '🔓' : '🔒')}</span>
    <span>{blockingUserId === selectedMessage.userId ? 'Processing...' : (blockedUsers.some(b => b.id === selectedMessage.userId) ? 'Unblock' : 'Block')}</span>
  </button>
)}
              </div>
              <button style={styles.actionCancel} onClick={() => { setShowMessageActions(false); setSelectedMessage(null); }}>Cancel</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Message Modal */}
      <AnimatePresence>
        {editMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.modalOverlay}
            onClick={() => setEditMessage(null)}
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} style={styles.editModal} onClick={e => e.stopPropagation()}>
              <h3 style={styles.editModalTitle}>Edit Message</h3>
              <textarea value={editMessage.content} onChange={(e) => setEditMessage({ ...editMessage, content: e.target.value })} style={styles.editModalInput} rows="3" autoFocus />
              <div style={styles.editModalButtons}>
                <button onClick={() => setEditMessage(null)} style={styles.editModalCancel}>Cancel</button>
                <button 
  onClick={handleEditMessage} 
  style={styles.editModalSave}
  disabled={editingMessageId === editMessage?.id}
>
  {editingMessageId === editMessage?.id ? 'Saving...' : 'Save'}
</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Container */}
      <div style={styles.messagesWrapper}>
        <div style={styles.messagesContainer} ref={chatContainerRef}>
          {messages.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>💬</div>
              <h3>Welcome to ZUCA Chat</h3>
              <p>Send a message to start the conversation</p>
            </div>
          ) : (
            Object.entries(messageGroups).map(([date, msgs]) => (
              <div key={date}>
                <div style={styles.dateHeader}><span style={styles.dateText}>{date}</span></div>
                {msgs.map((msg) => {
                  const isOwn = msg.userId === user?.id;
                const isAdmin = msg.user?.role === "admin" || msg.user?.role === "ADMIN" || msg.user?.specialRole === "admin";
                  const reactions = getReactionsForMessage(msg.id);
                  const isPinned = pinnedMessages.some(p => p.messageId === msg.id);
                  const isBlocked = blockedUsers.some(b => b.id === msg.userId);
                  if (isBlocked && !isOwn) return null;

                  return (
                    <div
                      key={msg.id}
                      id={`msg-${msg.id}`}
style={{ ...styles.messageRow, ...(isOwn ? styles.messageRowOwn : {}) }}                      onTouchStart={(e) => handleTouchStart(e, msg)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onContextMenu={(e) => { e.preventDefault(); setSelectedMessage(msg); setShowMessageActions(true); if (navigator.vibrate) navigator.vibrate(50); }}
                    >
{(
  <div style={styles.messageAvatar}>
    {msg.user?.profileImage ? (
      <img 
        src={msg.user.profileImage.startsWith("http") ? msg.user.profileImage : `${BASE_URL}/${msg.user.profileImage}`}
        alt={msg.user?.fullName}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          objectFit: 'cover'
        }}
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.parentElement.innerHTML = msg.user?.fullName?.charAt(0).toUpperCase() || '?';
        }}
      />
    ) : (
      msg.user?.fullName?.charAt(0).toUpperCase() || '?'
    )}
    {isAdmin && <span style={styles.adminCrown}>👑</span>}
  </div>
)}                      <div style={{ ...styles.messageBubbleWrapper, ...(isOwn ? styles.messageBubbleWrapperOwn : {}) }}>
                        {!isOwn && <span style={styles.messageSenderName}>{msg.user?.fullName}</span>}
                        {isPinned && <div style={styles.pinIndicator}>📌 Pinned</div>}
                        {msg.replyTo && (
                          <div style={styles.replyPreview}>
                            <span style={styles.replyIcon}>↪️</span>
                            <span style={styles.replyText}>{msg.replyTo.user?.fullName}: {msg.replyTo.content?.substring(0, 30)}</span>
                          </div>
                        )}
                        <div style={{ ...styles.messageBubble, ...(isOwn ? styles.messageBubbleOwn : {}) }}>
                          {msg.isEdited && <span style={styles.editedIndicator}>(edited) </span>}
                          {msg.content && <p style={styles.messageText}>{msg.content}</p>}
 {msg.files?.length > 0 && (
  <div style={styles.attachments}>
    {msg.files.map((file) => {
      const isImage = file.type?.startsWith('image/') || file.name?.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i);
      const isVideo = file.type?.startsWith('video/') || file.name?.match(/\.(mp4|webm|mov|avi|mkv)$/i);
      const fileUrl = `${BASE_URL}/api/public/files/${file.id}`;
      
      if (isImage) {
        return (
          <div key={file.id} style={styles.imageWrapper} onClick={(e) => { e.stopPropagation(); setShowMediaPreview({ url: fileUrl, type: 'image' }); }}>
            <img src={fileUrl} alt={file.name} style={styles.attachmentImage} />
          </div>
        );
      } else if (isVideo) {
        return (
          <div key={file.id} style={styles.videoWrapper} onClick={(e) => { e.stopPropagation(); setShowMediaPreview({ url: fileUrl, type: 'video' }); }}>
            <video 
              src={fileUrl} 
              preload="metadata"
              style={styles.videoThumbnail}
              onClick={(e) => e.stopPropagation()}
            />
            <div style={styles.videoPlayOverlay}>
              <span style={styles.playIcon}>▶</span>
            </div>
          </div>
        );
      } else {
        return (
          <a key={file.id} href={fileUrl} target="_blank" rel="noopener noreferrer" style={styles.fileAttachment} onClick={(e) => e.stopPropagation()}>
            <span>📎</span>
            <span>{file.name}</span>
          </a>
        );
      }
    })}
  </div>
)}
                          {reactions.length > 0 && (
                            <div style={styles.reactions}>
                              {reactions.map((reaction, i) => <span key={i} style={styles.reaction}>{reaction.reaction}</span>)}
                            </div>
                          )}
                          <div style={styles.messageFooter}>
                            <span style={styles.messageTime}>{formatMessageTime(msg.createdAt)}</span>
                            {isOwn && (
                              <span style={styles.messageStatus}>
                                {msg.readReceipts?.length > 0 ? <FiCheck size={10} /> : <FiCheck size={10} />}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* File Previews */}
      {selectedFiles.length > 0 && (
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} style={styles.previewContainer}>
          <div style={styles.previewScroller}>
            {selectedFiles.map((file, index) => {
              const preview = getFilePreview(file);
              return (
                <div key={index} style={styles.previewItem}>
                  {preview ? <img src={preview} alt="preview" style={styles.previewImage} /> : <div style={styles.previewIcon}>📎</div>}
                  <button style={styles.previewRemove} onClick={() => removeFile(index)}>×</button>
                  <div style={styles.previewName}>{file.name}</div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Reply Bar */}
      <AnimatePresence>
        {replyTo && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} style={styles.replyBar}>
            <div style={styles.replyBarContent}>
              <span style={styles.replyBarLabel}>Replying to {replyTo.user?.fullName}</span>
              <span style={styles.replyBarText}>{replyTo.content || (replyTo.attachments?.length > 0 ? '📎 Attachment' : '')}</span>
            </div>
            <button style={styles.replyBarClose} onClick={() => setReplyTo(null)}>×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div style={styles.inputWrapper}>
        <div style={styles.inputContainer}>
          <button style={styles.attachButton} onClick={() => fileInputRef.current?.click()}>
            <FiPaperclip size={18} />
          </button>
          <button style={styles.emojiButton} onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
            <FiSmile size={18} />
          </button>
          <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx" style={{ display: "none" }} onChange={handleFileSelect} />
          <textarea
            value={editMessage ? editMessage.content : newMessage}
            onChange={editMessage ? (e) => setEditMessage({ ...editMessage, content: e.target.value }) : handleTyping}
            onKeyPress={handleKeyPress}
            placeholder={editMessage ? "Edit message..." : "Type a message"}
            style={styles.messageInput}
            rows="1"
          />
          <button
  onClick={editMessage ? handleEditMessage : handleSendMessage}
  disabled={sending || (selectedFiles.length === 0 && !newMessage.trim() && !editMessage)}
  style={{ ...styles.sendButton, ...((sending || (selectedFiles.length === 0 && !newMessage.trim() && !editMessage)) && styles.sendButtonDisabled) }}
>
  <FiSend size={16} />
</button>
        </div>

        {/* Emoji Picker */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div initial={{ y: 20, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0, scale: 0.9 }} style={styles.emojiPicker}>
              {["😊", "😂", "❤️", "👍", "🙏", "🎉", "🔥", "✨", "💯", "👏", "🥳", "😢", "😍", "🤔", "👀"].map(emoji => (
                <button key={emoji} style={styles.emoji} onClick={() => {
                  if (editMessage) setEditMessage({ ...editMessage, content: editMessage.content + emoji });
                  else setNewMessage(prev => prev + emoji);
                  setShowEmojiPicker(false);
                }}>{emoji}</button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

     {/* Media Preview Modal */}
<AnimatePresence>
  {showMediaPreview && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={styles.modalOverlay}
      onClick={() => setShowMediaPreview(null)}
    >
      <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
        {showMediaPreview.type === 'video' ? (
          <video 
            src={showMediaPreview.url} 
            controls 
            autoPlay
            style={styles.modalVideo}
          />
        ) : (
          <img src={showMediaPreview.url} alt="preview" style={styles.modalImage} />
        )}
        <button style={styles.modalClose} onClick={() => setShowMediaPreview(null)}>×</button>
      </div>
    </motion.div>
  )}
</AnimatePresence>

      {/* Upload Progress */}
      {Object.entries(uploadProgress).map(([id, progress]) => (
        <motion.div key={id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} style={styles.progressOverlay}>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
            <span style={styles.progressText}>{progress}%</span>
          </div>
        </motion.div>
      ))}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        textarea { resize: none; font-family: inherit; }
        textarea:focus { outline: none; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
  minHeight: "calc(100vh - 80px)",
  background: "#a3b9cf",
  display: "flex",
  flexDirection: "column",
  fontFamily: "'Inter', -apple-system, sans-serif",
  position: "relative",
  paddingBottom: "env(safe-area-inset-bottom, 20px)",
  height: "calc(100vh - 80px)",  // Fixed height instead of minHeight
  maxHeight: "calc(100vh - 80px)",  // Maximum height
  overflow: "hidden",  // Prevents container from scrolling
     marginTop: "-65px",
  },
  
  backButtonContainer: { padding: "16px 20px 0" },
  backButton: { display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "30px", fontSize: "13px", fontWeight: "500", color: "#475569", cursor: "pointer" },
  
  loadingContainer: { minHeight: "calc(100vh - 80px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc" },
  loadingSpinner: { width: "48px", height: "48px", border: "3px solid #e2e8f0", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "16px" },
  loadingText: { color: "#64748b", fontSize: "14px" },
  
  notification: { position: "fixed", top: "100px", left: "50%", transform: "translateX(-50%)", padding: "10px 20px", borderRadius: "30px", zIndex: 9999, fontSize: "13px", fontWeight: "500", whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" },
  success: { background: "#10b981", color: "white" },
  error: { background: "#ef4444", color: "white" },
  info: { background: "#3b82f6", color: "white" },
  
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "#ffffff", borderBottom: "1px solid #e2e8f0" },
  headerLeft: { flex: 1 },
  title: { fontSize: "24px", fontWeight: "700", color: "#1e293b", margin: 0 },
  subtitle: { fontSize: "12px", color: "#64748b", margin: "4px 0 0" },
  headerActions: { display: "flex", gap: "8px", alignItems: "center" },
  iconButton: { position: "relative", width: "40px", height: "40px", borderRadius: "50%", background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b" },
  badge: { position: "absolute", top: "-4px", right: "-4px", minWidth: "18px", height: "18px", borderRadius: "9px", background: "#ef4444", color: "white", fontSize: "10px", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" },
  onlineButton: { display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "30px", fontSize: "13px", fontWeight: "500", color: "#475569", cursor: "pointer" },
  
  onlineDropdown: { position: "absolute", top: "80px", right: "20px", width: "280px", background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)", zIndex: 100, overflow: "hidden" },
  onlineHeader: { padding: "16px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", "& h3": { fontSize: "16px", fontWeight: "600", color: "#1e293b", margin: 0 }, "& button": { background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#64748b" } },
  onlineList: { maxHeight: "300px", overflowY: "auto", padding: "8px" },
  onlineItem: { display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", borderRadius: "12px", "&:hover": { background: "#f8fafc" } },
onlineAvatar: { 
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
  overflow: "hidden"  // Add this line
},  onlineName: { flex: 1, fontSize: "14px", fontWeight: "500", color: "#1e293b" },
  adminBadge: { fontSize: "10px", padding: "2px 8px", background: "#fef3c7", color: "#d97706", borderRadius: "12px" },
  noOnline: { textAlign: "center", color: "#64748b", padding: "20px", fontSize: "13px" },
  
  searchPanel: { position: "absolute", top: "80px", left: "50%", transform: "translateX(-50%)", width: "90%", maxWidth: "500px", background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)", zIndex: 100, overflow: "hidden" },
  searchHeader: { padding: "12px", display: "flex", gap: "8px" },
  searchInput: { flex: 1, padding: "10px 14px", borderRadius: "30px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none" },
  searchClose: { width: "36px", height: "36px", borderRadius: "50%", background: "#f1f5f9", border: "none", cursor: "pointer", fontSize: "16px", color: "#64748b" },
  searchSpinner: { width: "24px", height: "24px", margin: "12px auto", border: "2px solid #e2e8f0", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" },
  searchResults: { maxHeight: "300px", overflowY: "auto", padding: "8px" },
  searchResult: { padding: "12px", borderRadius: "12px", cursor: "pointer", "&:hover": { background: "#f8fafc" } },
  searchResultHeader: { display: "flex", justifyContent: "space-between", marginBottom: "4px" },
  searchResultUser: { fontSize: "12px", fontWeight: "600", color: "#3b82f6" },
  searchResultTime: { fontSize: "10px", color: "#94a3b8" },
  searchResultContent: { fontSize: "13px", color: "#475569", wordBreak: "break-word" },
  
  pinnedPanel: { position: "absolute", top: "80px", right: "20px", width: "320px", height: "400px", background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)", zIndex: 100, display: "flex", flexDirection: "column", overflow: "hidden" },
  pinnedHeader: { padding: "16px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", "& h3": { fontSize: "16px", fontWeight: "600", color: "#1e293b", margin: 0 }, "& button": { background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#64748b" } },
  pinnedList: { flex: 1, overflowY: "auto", padding: "12px" },
  noPinned: { textAlign: "center", color: "#0368f5", padding: "20px" },
  pinnedItem: { background: "#f8fafc", borderRadius: "12px", padding: "12px", marginBottom: "8px" },
  pinnedItemHeader: { display: "flex", justifyContent: "space-between", marginBottom: "6px" },
  pinnedItemUser: { fontSize: "12px", fontWeight: "600", color: "#3b82f6" },
  pinnedItemTime: { fontSize: "10px", color: "#94a3b8" },
  pinnedItemContent: { fontSize: "12px", color: "#475569", margin: 0 },
  
  actionOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 10000, padding: "20px" },
  actionModal: { width: "100%", maxWidth: "400px", background: "#ffffff", borderRadius: "24px", overflow: "hidden", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" },
  actionHeader: { padding: "20px", display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid #e2e8f0" },
actionAvatar: { 
  width: "48px", 
  height: "48px", 
  borderRadius: "50%", 
  background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", 
  display: "flex", 
  alignItems: "center", 
  justifyContent: "center", 
  fontSize: "20px", 
  fontWeight: "600", 
  color: "white",
  overflow: "hidden"  // Add this line
},  actionUserInfo: { flex: 1 },
  actionUserName: { display: "block", fontSize: "15px", fontWeight: "600", color: "#1e293b", marginBottom: "2px" },
  actionTime: { fontSize: "11px", color: "#64748b" },
  actionPreview: { padding: "16px 20px", fontSize: "13px", color: "#475569", borderBottom: "1px solid #e2e8f0" },
  actionGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", padding: "16px", borderBottom: "1px solid #e2e8f0" },
  actionEmoji: { padding: "12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "20px", cursor: "pointer" },
  actionDivider: { height: "8px", background: "#f8fafc" },
  actionList: { padding: "8px" },
  actionItem: { width: "100%", padding: "14px 16px", background: "none", border: "none", borderRadius: "12px", fontSize: "14px", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: "14px", "&:hover": { background: "#f8fafc" } },
  actionCancel: { width: "100%", padding: "16px", background: "#f8fafc", border: "none", borderTop: "1px solid #e2e8f0", color: "#ef4444", fontSize: "15px", fontWeight: "500", cursor: "pointer" },
  
  editModal: { width: "90%", maxWidth: "400px", background: "#ffffff", borderRadius: "20px", padding: "24px" },
  editModalTitle: { fontSize: "18px", fontWeight: "600", color: "#1e293b", marginBottom: "16px" },
  editModalInput: { width: "100%", padding: "12px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "13px", marginBottom: "16px", fontFamily: "inherit" },
  editModalButtons: { display: "flex", gap: "12px", justifyContent: "flex-end" },
  editModalCancel: { padding: "8px 16px", borderRadius: "30px", border: "1px solid #e2e8f0", background: "#ffffff", color: "#64748b", cursor: "pointer" },
  editModalSave: { padding: "8px 16px", borderRadius: "30px", border: "none", background: "#3b82f6", color: "white", cursor: "pointer" },
  
  messagesWrapper: { flex: 1, overflow: "hidden", position: "relative" },
  messagesContainer: { height: "100%", overflowY: "auto", padding: "20px" },
  emptyState: { height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "40px" },
  emptyIcon: { fontSize: "64px", marginBottom: "16px", opacity: 0.5 },
  
  dateHeader: { display: "flex", justifyContent: "center", margin: "16px 0" },
  dateText: { background: "#f1f5f9", padding: "6px 16px", borderRadius: "20px", fontSize: "11px", fontWeight: "500", color: "#64748b" },
  
  messageRow: { display: "flex", gap: "12px", marginBottom: "16px" },
  messageRowOwn: { flexDirection: "row-reverse"},
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
  overflow: "hidden"  // Add this line - important for images
},  adminCrown: { position: "absolute", top: "-4px", right: "-4px", fontSize: "10px" },
  messageBubbleWrapper: { maxWidth: "100%", position: "relative" },
  messageBubbleWrapperOwn: { display: "flex", flexDirection: "column", alignItems: "flex-end" },
  messageSenderName: { fontSize: "11px", fontWeight: "600", color: "#ffffff", marginBottom: "2px", marginLeft: "4px" },
  pinIndicator: { fontSize: "10px", color: "#f59e0b", marginBottom: "2px", marginLeft: "4px" },
  replyPreview: { display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "#64748b", marginBottom: "4px", marginLeft: "4px", background: "#f8fafc", padding: "4px 8px", borderRadius: "8px" },
  replyIcon: { fontSize: "10px" },
  replyText: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  messageBubble: { background: "#ffffff", borderRadius: "18px", padding: "10px 14px", border: "1px solid #e2e8f0", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" },
  messageBubbleOwn: { background: "#ffffff", borderColor: "#3b82f6" },
  editedIndicator: { fontSize: "9px", color: "#94a3b8", fontStyle: "italic", marginRight: "4px" },
  messageText: { fontSize: "14px", lineHeight: "1.5", margin: "0 0 4px 0", color: "#1e293b", wordBreak: "break-word" },
  attachments: { display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" },
imageWrapper: { 
  maxWidth: "250px",  // Changed from 150px to 250px
  minWidth: "150px",  // Added minimum width
  borderRadius: "12px", 
  overflow: "hidden", 
  cursor: "pointer", 
  background: "#f1f5f9",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",  // Added shadow for better visibility
},  
attachmentImage: { 
  width: "100%", 
  height: "auto", 
  maxHeight: "400px",  // Changed from 150px to 300px
  objectFit: "contain", 
  display: "block", 
  backgroundColor: "#f0f0f0" 
},

videoWrapper: {
  maxWidth: "100%",
  minWidth: "200px",
  borderRadius: "12px",
  overflow: "hidden",
  background: "#000",
  marginTop: "4px",
},

videoPlayer: {
  width: "100%",
  maxHeight: "300px",
  borderRadius: "8px",
  outline: "none",
},

videoWrapper: {
  position: "relative",
  maxWidth: "100%",
  minWidth: "200px",
  borderRadius: "12px",
  overflow: "hidden",
  background: "#000",
  cursor: "pointer",
},

videoThumbnail: {
  width: "100%",
  maxHeight: "200px",
  objectFit: "cover",
  display: "block",
},

videoPlayOverlay: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "background 0.2s",
  "&:hover": {
    background: "rgba(0,0,0,0.5)",
  },
},

playIcon: {
  fontSize: "48px",
  color: "white",
  textShadow: "0 2px 4px rgba(0,0,0,0.3)",
},

modalVideo: {
  maxWidth: "95vw",
  maxHeight: "95vh",
  width: "auto",
  height: "auto",
  borderRadius: "12px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
},
  fileAttachment: { display: "flex", alignItems: "center", gap: "6px", padding: "6px 10px", background: "#f8fafc", borderRadius: "8px", textDecoration: "none", fontSize: "12px", color: "#475569" },
  reactions: { display: "flex", gap: "4px", marginTop: "6px", flexWrap: "wrap" },
  reaction: { fontSize: "12px", background: "#f8fafc", padding: "2px 6px", borderRadius: "12px" },
  messageFooter: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px", marginTop: "4px" },
  messageTime: { fontSize: "9px", color: "#000000" },
  messageStatus: { fontSize: "10px", color: "#ff0000", display: "flex", alignItems: "center" },
  
  previewContainer: { background: "#ffffff", borderTop: "1px solid #e2e8f0", padding: "12px", overflowX: "auto" },
  previewScroller: { display: "flex", gap: "12px" },
  previewItem: { position: "relative", width: "60px", height: "60px", borderRadius: "8px", overflow: "hidden", flexShrink: 0, background: "#f8fafc", border: "1px solid #e2e8f0" },
  previewImage: { width: "100%", height: "100%", objectFit: "cover" },
  previewIcon: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" },
  previewRemove: { position: "absolute", top: "2px", right: "2px", width: "18px", height: "18px", borderRadius: "9px", background: "#ef4444", color: "white", border: "none", fontSize: "12px", cursor: "pointer" },
  previewName: { position: "absolute", bottom: "0", left: "0", right: "0", background: "rgba(0,0,0,0.6)", fontSize: "8px", padding: "2px", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "white" },
  
  replyBar: { background: "#ffffff", borderTop: "1px solid #e2e8f0", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  replyBarContent: { flex: 1, minWidth: 0 },
  replyBarLabel: { fontSize: "11px", color: "#3b82f6", display: "block", marginBottom: "2px", fontWeight: "500" },
  replyBarText: { fontSize: "12px", color: "#64748b", fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  replyBarClose: { background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#64748b", padding: "4px 8px" },
  
  inputWrapper: { background: "#ffffff", borderTop: "1px solid #e2e8f0", padding: "12px 16px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 20px))" },
  inputContainer: { display: "flex", gap: "10px", alignItems: "center" },
  attachButton: { width: "40px", height: "40px", borderRadius: "50%", background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b" },
  emojiButton: { width: "40px", height: "40px", borderRadius: "50%", background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b" },
  messageInput: { flex: 1, padding: "10px 16px", borderRadius: "24px", border: "1px solid #e2e8f0", fontSize: "14px", minHeight: "42px", maxHeight: "100px", fontFamily: "inherit", background: "#f8fafc" },
  sendButton: { width: "40px", height: "40px", borderRadius: "50%", background: "#3b82f6", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white", transition: "all 0.2s" },
  sendButtonDisabled: { opacity: 0.5, cursor: "not-allowed" },
  sendSpinner: { width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.6s linear infinite" },
  
  emojiPicker: { position: "absolute", bottom: "80px", left: "5ytb%", transform: "translateX(-50%)", background: "#ffffff", borderRadius: "16px", padding: "9px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", border: "1px solid #e2e8f0", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)", zIndex: 100, width: "90%", maxWidth: "320px" },
  emoji: { padding: "10px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "20px", cursor: "pointer", "&:hover": { background: "#f1f5f9" } },
  
  progressOverlay: { position: "fixed", bottom: "100px", left: "50%", transform: "translateX(-50%)", zIndex: 100 },
  progressBar: { width: "200px", height: "40px", background: "#ffffff", borderRadius: "20px", overflow: "hidden", border: "1px solid #e2e8f0", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" },
  progressFill: { position: "absolute", left: 0, top: 0, bottom: 0, background: "#3b82f6", transition: "width 0.3s ease" },
  progressText: { position: "relative", color: "#1e293b", fontSize: "12px", fontWeight: "600", zIndex: 1 },
  
modalOverlay: { 
  position: "fixed", 
  top: 80, 
  left: 0, 
  right: 0, 
  bottom: 200, 
  width: "100%",
  height: "90%",
background: "rgba(0, 0, 0, 0)",
backdropFilter: "blur(1px)",
  display: "flex", 
  alignItems: "center", 
  justifyContent: "center", 
  zIndex: 10000, 
  padding: 0,
  margin: 0,
  marginBottom: "100px",
  boxSizing: "border-box",
  cursor: "pointer",  // Shows it's clickable to close
},

modalContent: { 
  position: "relative", 
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0,0,0,0.85)",
  cursor: "pointer",  // Click to close
},

modalImage: { 
  maxWidth: "100%", 
  maxHeight: "100%", 
  width: "auto",
  height: "auto",
  objectFit: "contain", 
  display: "block",
  cursor: "default",  // Don't close when clicking on image
},

modalVideo: {
  maxWidth: "100%",
  maxHeight: "100%",
  width: "auto",
  height: "auto",
  objectFit: "contain",
  cursor: "default",  // Don't close when clicking on video
},

modalClose: { 
  position: "fixed", 
  top: "20px", 
  right: "20px", 
  width: "44px", 
  height: "44px", 
  borderRadius: "50%", 
  background: "rgba(0,0,0,0.85)", 
  border: "1px solid rgba(255,255,255,0.2)", 
  color: "white", 
  fontSize: "24px", 
  cursor: "pointer",
  zIndex: 10001,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backdropFilter: "blur(8px)",
  transition: "all 0.2s",
  "&:hover": {
    background: "rgba(255,255,255,0.2)",
  },
},

scrollButton: {
  position: "fixed",
  bottom: "100px",
  right: "20px",
  width: "48px",
  height: "48px",
  borderRadius: "50%",
  background: "#3b82f6",
  color: "white",
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 4px 12px rgba(59,130,246,0.4)",
  zIndex: 100,
  transition: "all 0.2s",
  "&:hover": {
    background: "#2563eb",
    transform: "scale(1.05)",
  },
},

scrollButtonIcon: {
  fontSize: "24px",
  fontWeight: "bold",
},
};

export default Chat;