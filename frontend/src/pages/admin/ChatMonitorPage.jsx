// frontend/src/pages/admin/ChatMonitorPage.jsx
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import BASE_URL from "../../api";
import { FiCamera } from "react-icons/fi"; 

function ChatMonitorPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUser, setFilterUser] = useState("all");
  const [stats, setStats] = useState({
    totalMessages: 0,
    activeUsers: 0,
    messagesToday: 0,
    topUsers: []
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  
  // WhatsApp-style long press
  const [showMessageActions, setShowMessageActions] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [touchPosition, setTouchPosition] = useState({ x: 0, y: 0 });
  
  // Scroll preservation states
  const chatContainerRef = useRef(null);
  const lastScrollPositionRef = useRef(0);
  const isUserScrollingRef = useRef(false);
  const hasInitialLoadRef = useRef(false);
  
  // Chat input states - SAME AS USER CHAT
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [editMessage, setEditMessage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [showMediaPreview, setShowMediaPreview] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [mutedUsers, setMutedUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const refreshTimerRef = useRef(null);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  

  // Common emojis for reactions
  const commonReactions = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "🎉"];
  // ==================== LOADING STATES FOR ALL ACTIONS ====================
const [pinningMessageId, setPinningMessageId] = useState(null);
const [deletingMessageId, setDeletingMessageId] = useState(null);
const [likingMessageId, setLikingMessageId] = useState(null);
const [replyingToId, setReplyingToId] = useState(null);
const [editingMessageId, setEditingMessageId] = useState(null);
const [sendingMessage, setSendingMessage] = useState(false);
const [uploadingFiles, setUploadingFiles] = useState(false);
const [mutingUserId, setMutingUserId] = useState(null);
const [unmutingUserId, setUnmutingUserId] = useState(null);
const [bulkDeleting, setBulkDeleting] = useState(false);
const [exportingData, setExportingData] = useState(false);
const [refreshingChat, setRefreshingChat] = useState(false);
const [fetchingPinned, setFetchingPinned] = useState(false);
const [fetchingOnline, setFetchingOnline] = useState(false);
const [fetchingStats, setFetchingStats] = useState(false);
const [deletingPermanentId, setDeletingPermanentId] = useState(null);

  // Check authentication and get user

 

  

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    const userData = JSON.parse(localStorage.getItem("user"));
    setCurrentUser(userData);
  }, [token, navigate]);

  // Show notification
  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "" }), 3000);
  };

  // Helper function to parse attachments safely
  const parseAttachments = (attachments) => {
    if (!attachments) return [];
    try {
      if (Array.isArray(attachments)) return attachments;
      if (typeof attachments === 'string') {
        const parsed = JSON.parse(attachments);
        return Array.isArray(parsed) ? parsed : [parsed];
      }
      if (typeof attachments === 'object') return [attachments];
      return [];
    } catch (e) {
      return [];
    }
  };

  // WhatsApp-style long press handlers
  const handleTouchStart = (e, msg) => {
    e.preventDefault();
    const touch = e.touches[0];
    setTouchPosition({ x: touch.clientX, y: touch.clientY });
    
    const timer = setTimeout(() => {
      setSelectedMessage(msg);
      setShowMessageActions(true);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
    
    setLongPressTimer(timer);
  };

  const handleTouchMove = (e) => {
    if (longPressTimer) {
      const touch = e.touches[0];
      const distance = Math.sqrt(
        Math.pow(touch.clientX - touchPosition.x, 2) + 
        Math.pow(touch.clientY - touchPosition.y, 2)
      );
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

  const handleContextMenu = (e, msg) => {
    e.preventDefault();
    setSelectedMessage(msg);
    setShowMessageActions(true);
    if (navigator.vibrate) navigator.vibrate(50);
  };

  // Scroll handling
 //seEffect(() => {
 // const container = chatContainerRef.current;
 // if (!container) return;

//  const handleScroll = () => {
//    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
//    setShowScrollButton(!isNearBottom);
//  };

//  container.addEventListener('scroll', handleScroll);
//  return () => container.removeEventListener('scroll', handleScroll);
 /// []);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };
const fetchMessages = async (isInitialLoad = false) => {
  try {
    const container = chatContainerRef.current;
    
    // Save scroll position BEFORE updating
    const currentScrollTop = container?.scrollTop || 0;
    const wasNearBottom = container ? (container.scrollHeight - container.scrollTop - container.clientHeight < 100) : false;
    
    const response = await axios.get(`${BASE_URL}/api/chat/enhanced`, { headers });
    
    // KEY FIX: Reverse the messages to get newest first, then sort for display
    const parsedMessages = response.data.reverse().map(msg => ({
      ...msg,
      attachments: parseAttachments(msg.attachments),
      files: msg.files || []
    }));
    
    // Merge with existing messages and sort oldest to newest for proper display
    setMessages(prev => {
      const messageMap = new Map();
      // Add existing messages first
      prev.forEach(msg => messageMap.set(msg.id, msg));
      // Add or update with server messages
      parsedMessages.forEach(newMsg => {
        const existingMsg = messageMap.get(newMsg.id);
        if (existingMsg && existingMsg.isTemp) {
          messageMap.set(newMsg.id, { ...newMsg, isTemp: false });
        } else if (!existingMsg) {
          messageMap.set(newMsg.id, newMsg);
        }
      });
      // Sort from oldest to newest for proper display (so newest at bottom)
      const sortedMessages = Array.from(messageMap.values()).sort((a, b) => 
        new Date(a.createdAt) - new Date(b.createdAt)
      );
      
      // ADD THIS BACK - Calculate stats whenever messages change
      calculateStats(sortedMessages);
      
      return sortedMessages;
    });
    
    // SCROLL HANDLING - Always scroll to bottom on initial load
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
    showNotification("Failed to fetch messages", "error");
  } finally {
    if (isInitialLoad) {
      setLoading(false);
      hasInitialLoadRef.current = true;
    }
  }
};
// Add this after your fetchMessages call
useEffect(() => {
  if (!loading && chatContainerRef.current && messages.length > 0) {
    const scrollToBottom = () => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    };
    
    scrollToBottom();
    setTimeout(scrollToBottom, 100);
  }
}, [loading, messages]);
  // Fetch pinned messages
 const fetchPinnedMessages = async () => {
  setFetchingPinned(true);
  try {
    const response = await axios.get(`${BASE_URL}/api/chat/pinned`, { headers });
    setPinnedMessages(response.data);
  } catch (err) {
    console.error("Error fetching pinned messages:", err);
  } finally {
    setFetchingPinned(false);
  }
};
  // Fetch online users
 const fetchOnlineUsers = async () => {
  setFetchingOnline(true);
  try {
    const response = await axios.get(`${BASE_URL}/api/chat/online`, { headers });
    setOnlineUsers(response.data);
  } catch (err) {
    console.error("Error fetching online users:", err);
  } finally {
    setFetchingOnline(false);
  }
};

  // Fetch stats
 const fetchStats = async () => {
  setFetchingStats(true);
  try {
    const response = await axios.get(`${BASE_URL}/api/admin/stats`, { headers });
    setStats(prev => ({ ...prev, ...response.data }));
  } catch (err) {
    console.error("Error fetching stats:", err);
  } finally {
    setFetchingStats(false);
  }
};
     // Initial data fetch
  useEffect(() => {
    const loadInitialData = async () => {
      await fetchMessages(true);
      fetchPinnedMessages();
      fetchOnlineUsers();
      fetchStats();
    };
    
    loadInitialData();
  }, []);  // <-- IMPORTANT: Close the useEffect here


  




  // Calculate stats from messages
  const calculateStats = (messageData) => {
    const today = new Date().toDateString();
    const todayMessages = messageData.filter(m => 
      new Date(m.createdAt).toDateString() === today
    ).length;

    const userCount = {};
    messageData.forEach(m => {
      const userId = m.user?.id || 'unknown';
      userCount[userId] = (userCount[userId] || 0) + 1;
    });

    const topUsers = Object.entries(userCount)
      .map(([userId, count]) => ({
        userId,
        name: messageData.find(m => m.user?.id === userId)?.user?.fullName || 'Unknown',
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

      

    setStats({
      totalMessages: messageData.length,
      activeUsers: new Set(messageData.map(m => m.user?.id)).size,
      messagesToday: todayMessages,
      topUsers
    });
  };

  

  // Handle file selection - SAME AS USER CHAT
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  // Remove file from selection
  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Get file preview URL
  const getFilePreview = (file) => {
    if (file.type?.startsWith('image/')) return URL.createObjectURL(file);
    return null;
  };

  // Upload file
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

      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[uploadId];
        return newProgress;
      });

      return response.data[0];
    } catch (error) {
      console.error("Upload failed:", error);
      showNotification("Failed to upload file", "error");
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[uploadId];
        return newProgress;
      });
      return null;
    }
  };

  // Send message - SAME AS USER CHAT
  const handleSendMessage = async () => {
    if ((!newMessage.trim() && selectedFiles.length === 0) || sending) return;
    

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
      userId: currentUser?.id,
      user: { fullName: "You", role: currentUser?.role },
      isOwn: true,
      isTemp: true,
      attachments: [],
      files: [],
      reactions: [],
      replyTo: replyToMessage ? { id: replyToMessage.id, content: replyToMessage.content, user: replyToMessage.user } : null
    };

    setMessages(prev => [...prev, tempMessage]);
    
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 50);

    try {
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
      
      setMessages(prev => {
        const tempIndex = prev.findIndex(msg => msg.id === tempId);
        if (tempIndex !== -1) {
          const newMessages = [...prev];
          newMessages[tempIndex] = {
            ...response.data,
            attachments: parseAttachments(response.data.attachments),
            files: response.data.files || [],
            isOwn: true,
            isTemp: false
          };
          return newMessages;
        }
        return [...prev, response.data];
      });
      
      showNotification("Message sent", "success");
    } catch (error) {
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      showNotification(error.response?.data?.error || "Failed to send message", "error");
      setNewMessage(messageText);
      setSelectedFiles(filesToSend);
      setReplyTo(replyToMessage);
    } finally {
      setSending(false);
    }
  };

  // Delete message
const handleDeleteMessage = async (messageId) => {
  setDeletingMessageId(messageId);
  try {
    await axios.delete(`${BASE_URL}/api/chat/${messageId}`, { headers });
    setMessages(prev => prev.filter(m => m.id !== messageId));
    setShowMessageActions(false);
    setSelectedMessage(null);
    setShowDeleteModal(false);
    setMessageToDelete(null);
    showNotification("Message deleted successfully");
  } catch (err) {
    console.error("Error deleting message:", err);
    showNotification("Failed to delete message", "error");
  } finally {
    setDeletingMessageId(null);
  }
};

  // Edit message
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

  // Pin/Unpin message
 const handlePinMessage = async (messageId) => {
  setPinningMessageId(messageId);
  try {
    const response = await axios.post(`${BASE_URL}/api/chat/${messageId}/pin`, {}, { headers });
    if (response.data.message === "Message unpinned") {
      setPinnedMessages(prev => prev.filter(p => p.messageId !== messageId));
      showNotification("Message unpinned");
    } else {
      await fetchPinnedMessages();
      showNotification("Message pinned");
    }
    setShowMessageActions(false);
    setSelectedMessage(null);
  } catch (err) {
    console.error("Error pinning message:", err);
    showNotification("Failed to pin message", "error");
  } finally {
    setPinningMessageId(null);
  }
};

  // Add reaction
 const handleAddReaction = async (messageId, reaction) => {
  setLikingMessageId(messageId);
  try {
    await axios.post(`${BASE_URL}/api/chat/${messageId}/reactions`, { reaction }, { headers });
    await fetchMessages(false);
    setShowMessageActions(false);
    setSelectedMessage(null);
  } catch (err) {
    console.error("Error adding reaction:", err);
  } finally {
    setLikingMessageId(null);
  }
};

  // Reply to message
 const handleReply = (message) => {
  setReplyingToId(message.id);
  setReplyTo(message);
  setShowMessageActions(false);
  setSelectedMessage(null);
  setTimeout(() => {
    const input = document.querySelector('textarea');
    if (input) input.focus();
    setReplyingToId(null);
  }, 100);
};

  // Copy message
  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
    showNotification("Copied to clipboard", "success");
    setShowMessageActions(false);
    setSelectedMessage(null);
  };

  // Mute user
  const handleMuteUser = (userId) => {
  setMutingUserId(userId);
  setMutedUsers(prev => [...prev, userId]);
  setShowMessageActions(false);
  setSelectedMessage(null);
  showNotification("User muted", "success");
  setTimeout(() => setMutingUserId(null), 500);
};

const handleUnmuteUser = (userId) => {
  setUnmutingUserId(userId);
  setMutedUsers(prev => prev.filter(id => id !== userId));
  showNotification("User unmuted", "success");
  setTimeout(() => setUnmutingUserId(null), 500);
};

  // Bulk delete
 const handleBulkDelete = async () => {
  if (selectedMessages.length === 0) return;
  setBulkDeleting(true);
  try {
    await Promise.all(
      selectedMessages.map(id => 
        axios.delete(`${BASE_URL}/api/chat/${id}`, { headers })
      )
    );
    setMessages(prev => prev.filter(m => !selectedMessages.includes(m.id)));
    setSelectedMessages([]);
    setSelectAll(false);
    showNotification(`${selectedMessages.length} messages deleted`);
  } catch (err) {
    console.error("Error bulk deleting messages:", err);
    showNotification("Failed to delete messages", "error");
  } finally {
    setBulkDeleting(false);
  }
};
  // Toggle select all
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedMessages([]);
    } else {
      setSelectedMessages(filteredMessages.map(m => m.id));
    }
    setSelectAll(!selectAll);
  };

  // Toggle select message
  const toggleSelectMessage = (messageId) => {
    setSelectedMessages(prev =>
      prev.includes(messageId)
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  // Export messages
  const handleExport = async () => {
    setExportLoading(true);
    try {
      const response = await axios.get(
        `${BASE_URL}/api/chat/search?from=${dateRange.start}&to=${dateRange.end}`,
        { headers }
      );

      const data = response.data;
      const csv = [
        ["Date", "User", "Message", "Reactions", "Replies", "Status"],
        ...data.map(m => [
          new Date(m.createdAt).toLocaleString(),
          m.user?.fullName || "Unknown",
          m.content,
          m.reactions?.length || 0,
          m.replyCount || 0,
          m.isDeleted ? "Deleted" : m.isEdited ? "Edited" : "Active"
        ])
      ].map(row => row.join(",")).join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chat-export-${dateRange.start}-to-${dateRange.end}.csv`;
      a.click();

        showNotification("Export completed");
  } catch (err) {
    console.error("Error exporting messages:", err);
    showNotification("Export failed", "error");
  } finally {
    setExportingData(false);
  }
};

  // Handle typing
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (editMessage) handleEditMessage();
      else handleSendMessage();
    }
  };

  // Format time
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Filter messages
  const filteredMessages = messages.filter(msg => {
    const matchesSearch = msg.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUser = filterUser === "all" || msg.user?.id === filterUser;
    const notMuted = !mutedUsers.includes(msg.user?.id);
    return matchesSearch && matchesUser && notMuted;
  });

  // Clean up object URLs
  useEffect(() => {
    return () => {
      selectedFiles.forEach(file => {
        if (file.preview) URL.revokeObjectURL(file.preview);
      });
    };
  }, [selectedFiles]);

  // Go back to dashboard
  const goBack = () => navigate('/dashboard');

  if (loading) {
    return (
      <div style={loadingStyles.container}>
        <div style={loadingStyles.spinner} />
        <p style={loadingStyles.text}>Loading admin chat console...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Back Button */}
      <button onClick={goBack} style={styles.backButton}>
        ← Back to Dashboard
      </button>

      {/* Notification */}
      <AnimatePresence>
        {notification.show && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            style={{
              ...styles.notification,
              ...(notification.type === "success" ? styles.notificationSuccess : styles.notificationError),
            }}
          >
            {notification.type === "success" ? "✅" : "⚠️"} {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* WhatsApp-style Message Actions Modal */}
      <AnimatePresence>
        {showMessageActions && selectedMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={actionModalStyles.overlay}
            onClick={() => {
              setShowMessageActions(false);
              setSelectedMessage(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              style={actionModalStyles.modal}
              onClick={e => e.stopPropagation()}
            >
              <div style={actionModalStyles.header}>
                <div style={actionModalStyles.avatar}>
  {selectedMessage.user?.profileImage ? (
    <img 
      src={selectedMessage.user.profileImage.startsWith("http") ? selectedMessage.user.profileImage : `${BASE_URL}/${selectedMessage.user.profileImage}`}
      alt={selectedMessage.user?.fullName}
      style={actionModalStyles.avatarImage}
      onError={(e) => {
        e.target.style.display = 'none';
        e.target.parentElement.innerHTML = selectedMessage.user?.fullName?.charAt(0).toUpperCase() || '?';
      }}
    />
  ) : (
    selectedMessage.user?.fullName?.charAt(0).toUpperCase() || '?'
  )}
</div>
                <div style={actionModalStyles.userInfo}>
                  <span style={actionModalStyles.userName}>{selectedMessage.user?.fullName}</span>
                  <span style={actionModalStyles.time}>{formatTime(selectedMessage.createdAt)}</span>
                </div>
              </div>
              
              <div style={actionModalStyles.preview}>
                {selectedMessage.content || (selectedMessage.files?.length > 0 ? '📎 Attachment' : '')}
              </div>

              <div style={actionModalStyles.grid}>
                {commonReactions.map(emoji => (
                  <button
                    key={emoji}
                    style={actionModalStyles.emoji}
                    onClick={() => handleAddReaction(selectedMessage.id, emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <div style={actionModalStyles.divider} />

              <div style={actionModalStyles.list}>
                <button style={actionModalStyles.item} onClick={() => handleReply(selectedMessage)}>
                  <span style={actionModalStyles.icon}>↩️</span>
                  <span>Reply</span>
                </button>

                {selectedMessage.content && (
                  <button style={actionModalStyles.item} onClick={() => handleCopy(selectedMessage.content)}>
                    <span style={actionModalStyles.icon}>📋</span>
                    <span>Copy</span>
                  </button>
                )}

              {selectedMessage.isOwn && (
  <button 
    style={actionModalStyles.item} 
    onClick={() => { setEditMessage(selectedMessage); setShowMessageActions(false); setSelectedMessage(null); }}
    disabled={editingMessageId === selectedMessage.id}
  >
    <span style={actionModalStyles.icon}>
      {editingMessageId === selectedMessage.id ? (
        <div className="spinner-small" style={{ width: '16px', height: '16px' }}></div>
      ) : '✏️'}
    </span>
    <span>{editingMessageId === selectedMessage.id ? 'Opening...' : 'Edit'}</span>
  </button>
)}

                {currentUser?.role === 'admin' && (
  <button 
    style={actionModalStyles.item} 
    onClick={() => handlePinMessage(selectedMessage.id)}
    disabled={pinningMessageId === selectedMessage.id}
  >
    <span style={actionModalStyles.icon}>
      {pinningMessageId === selectedMessage.id ? (
        <div className="spinner-small" style={{ width: '16px', height: '16px' }}></div>
      ) : (
        pinnedMessages.some(p => p.messageId === selectedMessage.id) ? '📌' : '📍'
      )}
    </span>
    <span>
      {pinningMessageId === selectedMessage.id ? 'Processing...' : 
        (pinnedMessages.some(p => p.messageId === selectedMessage.id) ? 'Unpin' : 'Pin')
      }
    </span>
  </button>
)}

                {(selectedMessage.isOwn || currentUser?.role === 'admin') && (
                  <button 
                    style={{...actionModalStyles.item, color: '#ff4d6d'}} 
                    onClick={() => {
                      setShowDeleteModal(true);
                      setMessageToDelete(selectedMessage);
                      setShowMessageActions(false);
                    }}
                  >
                    <span style={actionModalStyles.icon}>🗑️</span>
                    <span>Delete</span>
                  </button>
                )}

               {!selectedMessage.isOwn && (
  <button 
    style={actionModalStyles.item} 
    onClick={() => mutedUsers.includes(selectedMessage.user?.id) 
      ? handleUnmuteUser(selectedMessage.user?.id) 
      : handleMuteUser(selectedMessage.user?.id)
    }
    disabled={mutingUserId === selectedMessage.user?.id || unmutingUserId === selectedMessage.user?.id}
  >
    <span style={actionModalStyles.icon}>
      {(mutingUserId === selectedMessage.user?.id || unmutingUserId === selectedMessage.user?.id) ? (
        <div className="spinner-small" style={{ width: '16px', height: '16px' }}></div>
      ) : (
        mutedUsers.includes(selectedMessage.user?.id) ? '🔊' : '🔇'
      )}
    </span>
    <span>
      {(mutingUserId === selectedMessage.user?.id || unmutingUserId === selectedMessage.user?.id) ? 'Processing...' :
        (mutedUsers.includes(selectedMessage.user?.id) ? 'Unmute' : 'Mute')
      }
    </span>
  </button>
)}
              </div>

              <button 
                style={actionModalStyles.cancel} 
                onClick={() => {
                  setShowMessageActions(false);
                  setSelectedMessage(null);
                }}
              >
                Cancel
              </button>
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
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              style={styles.editModal}
              onClick={e => e.stopPropagation()}
            >
              <h3 style={styles.editModalTitle}>Edit Message</h3>
              <textarea
                value={editMessage.content}
                onChange={(e) => setEditMessage({ ...editMessage, content: e.target.value })}
                style={styles.editModalInput}
                rows="3"
                autoFocus
              />
              <div style={styles.editModalButtons}>
                <button onClick={() => setEditMessage(null)} style={styles.editModalCancel}>Cancel</button>
                <button onClick={handleEditMessage} style={styles.editModalSave}>Save</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.modalOverlay}
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              style={styles.modal}
              onClick={e => e.stopPropagation()}
            >
              <h3 style={styles.modalTitle}>Delete Message</h3>
              <p style={styles.modalText}>
                Are you sure you want to delete this message?
                {messageToDelete && (
                  <span style={styles.modalPreview}>
                    "{messageToDelete.content?.substring(0, 100)}..."
                  </span>
                )}
              </p>
              <div style={styles.modalActions}>
                <button
                  style={styles.modalCancelBtn}
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </button>
                <button
                  style={styles.modalDeleteBtn}
                  onClick={() => handleDeleteMessage(messageToDelete.id)}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Preview Modal - SAME AS USER CHAT */}
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
                <img 
                  src={showMediaPreview.url} 
                  alt="preview" 
                  style={styles.modalImage}
                  onError={(e) => {
                    console.error("Image failed to load:", showMediaPreview.url);
                    e.target.src = "https://via.placeholder.com/400x300?text=Failed+to+load";
                  }}
                />
              )}
              <button
                style={styles.modalClose}
                onClick={() => setShowMediaPreview(null)}
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>👑 Admin Chat Console</h1>
          <p style={styles.subtitle}>Full control over chat: monitor, moderate, and participate</p>
        </div>
        <div style={styles.headerControls}>
          <label style={styles.autoRefreshLabel}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh ({refreshInterval/1000}s)
          </label>
          <button
            onClick={() => {
              fetchMessages(false);
              fetchOnlineUsers();
              fetchPinnedMessages();
            }}
            style={styles.refreshBtn}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>💬</div>
          <div>
            <div style={styles.statValue}>{stats.totalMessages}</div>
            <div style={styles.statLabel}>Total Messages</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>👥</div>
          <div>
            <div style={styles.statValue}>{onlineUsers.length}</div>
            <div style={styles.statLabel}>Online Now</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📌</div>
          <div>
            <div style={styles.statValue}>{pinnedMessages.length}</div>
            <div style={styles.statLabel}>Pinned</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>👤</div>
          <div>
            <div style={styles.statValue}>{stats.activeUsers}</div>
            <div style={styles.statLabel}>Active Users</div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={styles.whatsappContainer}>
        {/* Chat Header */}
        <div style={styles.chatHeader}>
          <div style={styles.chatHeaderLeft}>
            <h2 style={styles.chatTitle}>General Chat</h2>
            <span style={styles.onlineCount}>{onlineUsers.length} online</span>
          </div>
          <div style={styles.chatHeaderRight}>
            <input
              type="text"
              placeholder="Search messages..."
              style={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              style={styles.filterSelect}
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
            >
              <option value="all">All Users</option>
              {onlineUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.fullName} {user.role === 'admin' ? '👑' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Scroll to Bottom Button */}
        <AnimatePresence>
          {showScrollButton && (
            <motion.button
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              onClick={scrollToBottom}
              style={styles.scrollButton}
            >
              ↓
            </motion.button>
          )}
        </AnimatePresence>

        {/* Messages Area */}
        <div style={styles.messagesArea} ref={chatContainerRef}>
          {filteredMessages.length === 0 ? (
            <div style={styles.noMessages}>
              <span style={styles.noMessagesIcon}>💬</span>
              <h3>No messages yet</h3>
              <p>Start a conversation</p>
            </div>
          ) : (
            filteredMessages.map((msg, index) => {
              const isOwn = msg.user?.id === currentUser?.id;
             const isAdmin = msg.user?.role === "admin" || msg.user?.specialRole === "admin";
              const isPinned = pinnedMessages.some(p => p.messageId === msg.id);
              const showAvatar = index === 0 || filteredMessages[index - 1]?.user?.id !== msg.user?.id;

              return (
                <div
                  key={msg.id}
                  style={{
                    ...styles.messageWrapper,
                    ...(isOwn ? styles.messageWrapperOwn : {}),
                  }}
                  onTouchStart={(e) => handleTouchStart(e, msg)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchEnd}
                  onContextMenu={(e) => handleContextMenu(e, msg)}
                >
                 {!isOwn && showAvatar && (
  <div style={styles.messageAvatar}>
    {msg.user?.profileImage ? (
      <img 
        src={msg.user.profileImage.startsWith("http") ? msg.user.profileImage : `${BASE_URL}/${msg.user.profileImage}`}
        alt={msg.user?.fullName}
        style={styles.avatarImage}
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.parentElement.innerHTML = msg.user?.fullName?.charAt(0).toUpperCase() || '?';
        }}
      />
    ) : (
      msg.user?.fullName?.charAt(0).toUpperCase() || '?'
    )}
    {isAdmin && <span style={styles.messageAdminBadge}>👑</span>}
  </div>
)}

                  <div style={{
                    ...styles.messageContent,
                    ...(isOwn ? styles.messageContentOwn : {}),
                    ...(!showAvatar && !isOwn ? styles.messageContentNested : {}),
                  }}>
                    {!isOwn && showAvatar && (
                      <div style={styles.messageSender}>
                        <span style={styles.messageSenderName}>
                          {msg.user?.fullName}
                          {isAdmin && <span style={styles.adminIndicator}>Admin</span>}
                        </span>
                        <span style={styles.messageTime}>{formatTime(msg.createdAt)}</span>
                      </div>
                    )}

                    {msg.replyTo && (
                      <div style={styles.messageReply}>
                        ↪️ {msg.replyTo.user?.fullName}: {msg.replyTo.content?.substring(0, 30)}...
                      </div>
                    )}

                    <div style={styles.messageBubble}>
                      {msg.content && <p style={styles.messageText}>{msg.content}</p>}

                      {/* Files from database - SAME AS USER CHAT */}
                      {msg.files && msg.files.length > 0 && (
                        <div style={styles.messageAttachments}>
                          {msg.files.map((file) => {
                            const isImage = file.type?.startsWith('image/') || 
                                          file.name?.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i);
                            const isVideo = file.type?.startsWith('video/') || 
                                          file.name?.match(/\.(mp4|webm|mov|avi|mkv)$/i);
                            
const fileUrl = `${BASE_URL}/api/public/files/${file.id}`;
      
      if (isImage) {
        return (
          <div 
            key={file.id} 
            style={styles.imageAttachment}
            onClick={(e) => {
              e.stopPropagation();
              setShowMediaPreview({ url: fileUrl, type: 'image' });
            }}
          >
            <img 
              src={fileUrl}
              alt={file.name} 
              style={styles.attachmentImage}
              onError={(e) => {
                e.target.style.display = 'none';
                const parent = e.target.parentNode;
                const fallback = document.createElement('div');
                fallback.innerHTML = '🖼️';
                fallback.style.cssText = styles.fallbackImage;
                parent.appendChild(fallback);
              }}
            />
            {file.size && (
              <span style={styles.imageSizeBadge}>
                {(file.size / 1024).toFixed(0)}KB
              </span>
            )}
          </div>
        );
      } else if (isVideo) {
        return (
          <div 
            key={file.id} 
            style={styles.videoAttachment}
            onClick={(e) => {
              e.stopPropagation();
              setShowMediaPreview({ url: fileUrl, type: 'video' });
            }}
          >
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
          <a
            key={file.id}
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.fileAttachment}
            onClick={(e) => e.stopPropagation()}
          >
            <span style={styles.fileIcon}>📎</span>
            <span style={styles.fileName}>{file.name}</span>
            <span style={styles.fileSize}>
              {(file.size / 1024).toFixed(0)}KB
            </span>
          </a>
        );
      }
    })}
  </div>
)}

                      {/* Reactions */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div style={styles.messageReactions}>
                          {msg.reactions.map((r, i) => (
                            <span key={i} style={styles.messageReaction}>{r.reaction}</span>
                          ))}
                        </div>
                      )}

                      <div style={styles.messageFooter}>
                        {isPinned && <span style={styles.pinnedIcon}>📌</span>}
                        {msg.isEdited && <span style={styles.editedIcon}>edited</span>}
                        
                        {/* Message Actions - Show on hover */}
                        <div style={styles.messageActions}>
                          <button
                            style={styles.messageAction}
                            onClick={() => setReplyTo(msg)}
                            title="Reply"
                          >
                            ↩️
                          </button>
                          <button
                            style={styles.messageAction}
                            onClick={() => handleAddReaction(msg.id, "👍")}
                            title="Like"
                          >
                            👍
                          </button>
                          <button
                            style={styles.messageAction}
                            onClick={() => handleAddReaction(msg.id, "❤️")}
                            title="Love"
                          >
                            ❤️
                          </button>
                         {currentUser?.role === 'admin' && (
  <button
    style={{
      ...styles.messageAction,
      ...(isPinned && styles.messageActionActive)
    }}
    onClick={() => handlePinMessage(msg.id)}
    title={isPinned ? "Unpin" : "Pin"}
  >
    📌
  </button>
)}
                          <button
                            style={{ ...styles.messageAction, color: "#ff4d6d" }}
                            onClick={() => {
                              setMessageToDelete(msg);
                              setShowDeleteModal(true);
                            }}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* File Preview Area - SAME AS USER CHAT */}
        {selectedFiles.length > 0 && (
          <div style={styles.filePreviewArea}>
            {selectedFiles.map((file, index) => {
              const preview = getFilePreview(file);
              const isVideo = file.type?.startsWith('video/');
              return (
                <div key={index} style={styles.filePreview}>
                  {preview ? (
                    <img src={preview} alt="preview" style={styles.previewImage} />
                  ) : isVideo ? (
                    <div style={styles.previewIcon}>🎬</div>
                  ) : (
                    <div style={styles.previewIcon}>📎</div>
                  )}
                  <div style={styles.previewInfo}>
                    <span style={styles.previewName}>{file.name}</span>
                    <span style={styles.previewSize}>
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <button
                    style={styles.removeFileBtn}
                    onClick={() => removeFile(index)}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Reply Indicator */}
        {replyTo && (
          <div style={styles.replyContainer}>
            <div style={styles.replyContent}>
              <span style={styles.replyLabel}>Replying to {replyTo.user?.fullName}</span>
              <span style={styles.replyText}>{replyTo.content?.substring(0, 50)}</span>
            </div>
            <button style={styles.cancelReply} onClick={() => setReplyTo(null)}>
              ×
            </button>
          </div>
        )}

        {/* Input Area - SAME AS USER CHAT */}
        <div style={styles.inputContainer}>
          <button
            style={styles.attachButton}
            onClick={() => fileInputRef.current?.click()}
            title="Attach file"
          >
            📎
          </button>
          
          <button
            style={styles.emojiButton}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="Emoji"
          >
            😊
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx"
            style={{ display: "none" }}
            onChange={handleFileSelect}
          />

          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                style={styles.emojiPicker}
              >
                {["😊", "😂", "❤️", "👍", "🙏", "🎉", "🔥", "✨", "💯", "👏", "🥳", "😢", "😍", "🤔", "👀"].map(emoji => (
                  <button
                    key={emoji}
                    style={styles.emoji}
                    onClick={() => {
                      setNewMessage(prev => prev + emoji);
                      setShowEmojiPicker(false);
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <textarea
            value={editMessage ? editMessage.content : newMessage}
            onChange={editMessage ? (e) => setEditMessage({ ...editMessage, content: e.target.value }) : handleTyping}
            onKeyPress={handleKeyPress}
            placeholder={editMessage ? "Edit message..." : "Type a message..."}
            style={styles.messageInput}
            rows="1"
          />

          <button
            onClick={editMessage ? handleEditMessage : handleSendMessage}
            disabled={sending || (selectedFiles.length === 0 && !newMessage.trim() && !editMessage)}
            style={{
              ...styles.sendButton,
              ...((sending || (selectedFiles.length === 0 && !newMessage.trim() && !editMessage)) && styles.sendButtonDisabled),
            }}
          >
            {sending ? <div style={styles.sendSpinner}></div> : (editMessage ? "Save" : "Send")}
          </button>
        </div>

        {/* Upload Progress */}
        {Object.entries(uploadProgress).map(([id, progress]) => (
          <div key={id} style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
            <span style={styles.progressText}>Uploading... {progress}%</span>
          </div>
        ))}
      </div>

      {/* ADMIN MONITORING SECTION */}
      <div style={styles.adminSection}>
        <h2 style={styles.adminSectionTitle}>🛡️ Admin Monitoring Tools</h2>

        {/* Online Users Grid */}
        <div style={styles.adminGrid}>
          <div style={styles.adminCard}>
            <h3 style={styles.adminCardTitle}>🟢 Online Users ({onlineUsers.length})</h3>
            <div style={styles.onlineUsersGrid}>
              {onlineUsers.length === 0 ? (
                <p style={styles.noData}>No users online</p>
              ) : (
                onlineUsers.map(user => (
                  <div key={user.id} style={styles.adminUserCard}>
                   <div style={styles.adminUserAvatar}>
  {user.profileImage ? (
    <img 
      src={user.profileImage.startsWith("http") ? user.profileImage : `${BASE_URL}/${user.profileImage}`}
      alt={user.fullName}
      style={styles.avatarImageSmall}
      onError={(e) => {
        e.target.style.display = 'none';
        e.target.parentElement.innerHTML = user.fullName?.charAt(0).toUpperCase() || '?';
      }}
    />
  ) : (
    user.fullName?.charAt(0).toUpperCase() || '?'
  )}
  <span style={styles.onlineDot} />
</div>
                    <div style={styles.adminUserInfo}>
                      <span style={styles.adminUserName}>
                        {user.fullName}
                        {user.role === 'admin' && <span style={styles.adminStar}>👑</span>}
                      </span>
                      <span style={styles.adminUserTime}>
                        {formatTime(user.lastActive)}
                      </span>
                    </div>
                    <button
                      style={styles.muteBtn}
                      onClick={() => mutedUsers.includes(user.id) ? handleUnmuteUser(user.id) : handleMuteUser(user.id)}
                      title={mutedUsers.includes(user.id) ? "Unmute" : "Mute"}
                    >
                      {mutedUsers.includes(user.id) ? "🔊" : "🔇"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pinned Messages */}
          <div style={styles.adminCard}>
            <h3 style={styles.adminCardTitle}>📌 Pinned Messages ({pinnedMessages.length})</h3>
            <div style={styles.pinnedMessagesList}>
              {pinnedMessages.length === 0 ? (
                <p style={styles.noData}>No pinned messages</p>
              ) : (
                pinnedMessages.map(pin => (
                  <div key={pin.id} style={styles.adminPinnedItem}>
                    <div style={styles.adminPinnedHeader}>
                      <span style={styles.adminPinnedUser}>{pin.message?.user?.fullName}</span>
                      <span style={styles.adminPinnedTime}>{formatTime(pin.createdAt)}</span>
                    </div>
                    <p style={styles.adminPinnedContent}>
                      {pin.message?.content?.substring(0, 100)}...
                    </p>
                    {pin.message?.attachments?.length > 0 && (
                      <div style={styles.adminPinnedAttachments}>
                        📎 {pin.message.attachments.length} file(s)
                      </div>
                    )}
                    <button
                      style={styles.adminUnpinBtn}
                      onClick={() => handlePinMessage(pin.messageId)}
                    >
                      Unpin
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Users */}
          <div style={styles.adminCard}>
            <h3 style={styles.adminCardTitle}>🏆 Top Users</h3>
            <div style={styles.topUsersList}>
              {stats.topUsers.map((user, index) => (
                <div key={user.userId} style={styles.adminTopUser}>
                  <span style={styles.adminTopRank}>{index + 1}</span>
                  <span style={styles.adminTopName}>{user.name}</span>
                  <span style={styles.adminTopCount}>{user.count} msgs</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div style={styles.adminCard}>
            <h3 style={styles.adminCardTitle}>📊 Quick Stats</h3>
            <div style={styles.adminStatsList}>
              <div style={styles.adminStatRow}>
                <span>Total Messages:</span>
                <strong>{stats.totalMessages}</strong>
              </div>
              <div style={styles.adminStatRow}>
                <span>Messages Today:</span>
                <strong>{stats.messagesToday}</strong>
              </div>
              <div style={styles.adminStatRow}>
                <span>Active Users:</span>
                <strong>{stats.activeUsers}</strong>
              </div>
              <div style={styles.adminStatRow}>
                <span>Muted Users:</span>
                <strong>{mutedUsers.length}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Actions & Export */}
        <div style={styles.bulkActionsSection}>
          <div style={styles.bulkActionsHeader}>
            <h3 style={styles.adminCardTitle}>⚡ Bulk Actions</h3>
            <div style={styles.bulkControls}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={toggleSelectAll}
                />
                Select All ({selectedMessages.length})
              </label>
              {selectedMessages.length > 0 && (
                <button
                  style={styles.bulkDeleteBtn}
                  onClick={handleBulkDelete}
                >
                  Delete Selected ({selectedMessages.length})
                </button>
              )}
            </div>
          </div>

          <div style={styles.exportSection}>
            <h4 style={styles.exportTitle}>📅 Export Data</h4>
            <div style={styles.dateRangePicker}>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                style={styles.dateInput}
              />
              <span style={styles.dateSeparator}>→</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                style={styles.dateInput}
              />
              <button
                style={styles.exportBtn}
                onClick={handleExport}
                disabled={exportLoading}
              >
                {exportLoading ? "Exporting..." : "📊 Export CSV"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          textarea {
            resize: none;
            font-family: 'Inter', sans-serif;
          }
          
          textarea:focus {
            outline: none;
          }
          
          .message-wrapper:hover .message-actions {
            opacity: 1 !important;
          }

          .spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  display: inline-block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  /* ... rest of media query ... */
}
          
          @media (max-width: 768px) {
            .stats-grid {
              grid-template-columns: repeat(2, 1fr) !important;
            }
            .message-content {
              max-width: 85% !important;
            }

            
            .message-actions {
              opacity: 1 !important;
              top: -25px !important;
            }
          }

          


        `}
      </style>
    </div>
  );
}

// Action Modal Styles
const actionModalStyles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    backdropFilter: "blur(5px)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    zIndex: 10000,
    padding: "20px",
  },
  modal: {
    width: "100%",
    maxWidth: "400px",
    background: "#fff",
    borderRadius: "20px",
    overflow: "hidden",
    boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
  },
  header: {
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    borderBottom: "1px solid #e2e8f0",
  },
 // Update in actionModalStyles
avatar: {
  width: "48px",
  height: "48px",
  borderRadius: "50%",
  background: "#3b82f6",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "20px",
  fontWeight: "600",
  color: "#fff",
  overflow: "hidden", // Important for images
},
  userInfo: {
    flex: 1,
  },

  // Add to actionModalStyles object
avatarImage: {
  width: '100%',
  height: '100%',
  borderRadius: '50%',
  objectFit: 'cover',
},

  userName: {
    display: "block",
    fontSize: "16px",
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: "4px",
  },
  time: {
    fontSize: "12px",
    color: "#64748b",
  },
  preview: {
    padding: "16px 20px",
    fontSize: "14px",
    color: "#475569",
    borderBottom: "1px solid #e2e8f0",
    maxHeight: "100px",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "8px",
    padding: "16px",
    borderBottom: "1px solid #e2e8f0",
  },
  emoji: {
    width: "100%",
    aspectRatio: "1/1",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    color: "#1e293b",
    fontSize: "24px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "&:hover": {
      background: "#f1f5f9",
    },
  },
  divider: {
    height: "8px",
    background: "#f8fafc",
  },
  list: {
    padding: "8px",
  },
  item: {
    width: "100%",
    padding: "14px 16px",
    background: "none",
    border: "none",
    borderRadius: "12px",
    color: "#1e293b",
    fontSize: "15px",
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    "&:hover": {
      background: "#f8fafc",
    },
  },
  icon: {
    fontSize: "20px",
    width: "24px",
  },
  cancel: {
    width: "100%",
    padding: "16px",
    background: "#f8fafc",
    border: "none",
    borderTop: "1px solid #e2e8f0",
    color: "#ef4444",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    "&:hover": {
      background: "#f1f5f9",
    },
  },
};

// Main Styles
const styles = {
  container: {
    minHeight: "100vh",
    background: "#f8fafc",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    color: "#1e293b",
    padding: "20px",
  },
  backButton: {
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "8px 16px",
    fontSize: "13px",
    cursor: "pointer",
    marginBottom: "20px",
    color: "#475569",
    "&:hover": {
      background: "#f8fafc",
    },
  },
  notification: {
    position: "fixed",
    top: "70px",
    right: "20px",
    padding: "12px 20px",
    borderRadius: "10px",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "500",
    zIndex: 9999,
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  },
  notificationSuccess: { background: "#10b981" },
  notificationError: { background: "#ef4444" },
 
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
    flexWrap: "wrap",
    gap: "15px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "700",
    margin: 0,
    color: "#0f172a",
  },
  subtitle: {
    fontSize: "14px",
    color: "#64748b",
    marginTop: "4px",
  },
  headerControls: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },
  autoRefreshLabel: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "13px",
    color: "#475569",
    cursor: "pointer",
  },
  refreshBtn: {
    padding: "8px 16px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    background: "white",
    color: "#475569",
    fontSize: "13px",
    cursor: "pointer",
    "&:hover": {
      background: "#f8fafc",
    },
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },
  statCard: {
    background: "white",
    borderRadius: "16px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
  },
  statIcon: {
    fontSize: "32px",
    width: "56px",
    height: "56px",
    background: "#eff6ff",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#0f172a",
    lineHeight: "1.2",
  },
  statLabel: {
    fontSize: "13px",
    color: "#64748b",
  },
  whatsappContainer: {
    background: "white",
    borderRadius: "20px",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
    marginBottom: "24px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
    position: "relative",
  },
  chatHeader: {
    padding: "16px 20px",
    background: "white",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px",
  },
  chatHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  chatTitle: {
    fontSize: "18px",
    fontWeight: "600",
    margin: 0,
    color: "#0f172a",
  },
  onlineCount: {
    fontSize: "12px",
    color: "#10b981",
    background: "#ecfdf5",
    padding: "4px 10px",
    borderRadius: "16px",
  },
  chatHeaderRight: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  searchInput: {
    padding: "8px 14px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    color: "#30589a",
    fontSize: "13px",
    width: "200px",
    "::placeholder": { color: "#94a3b8" },
    "&:focus": { outline: "none", borderColor: "#3b82f6" },
  },
  filterSelect: {
    padding: "8px 14px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    color: "#1e293b",
    fontSize: "13px",
    minWidth: "150px",
  },
  scrollButton: {
    position: "fixed",
    bottom: "100px",
    right: "30px",
    width: "44px",
    height: "44px",
    borderRadius: "22px",
    background: "#3b82f6",
    color: "white",
    border: "none",
    cursor: "pointer",
    fontSize: "24px",
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
  messagesArea: {
    height: "500px",
    overflowY: "auto",
    padding: "20px",
    background: "#eeeeeec2",
  },
  noMessages: {
    textAlign: "center",
    padding: "60px 20px",
    color: "#64748b",
  },
  noMessagesIcon: {
    fontSize: "48px",
    display: "block",
    marginBottom: "16px",
  },
  messageWrapper: {
    display: "flex",
    gap: "0px",
    marginBottom: "12px",
    position: "relative",
  },
  messageWrapperOwn: {
    justifyContent: "flex-end",
  },
 // Update in styles object
messageAvatar: {
  width: "40px",
  height: "40px",
  borderRadius: "50%",
  background: "#3b82f6",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "14px",
  fontWeight: "600",
  position: "relative",
  flexShrink: 0,
  color: "white",
  overflow: "hidden", // Important for images
},
  messageAdminBadge: {
    position: "absolute",
    top: "-4px",
    right: "-4px",
    fontSize: "10px",
  },
  messageContent: {
    maxWidth: "70%",
  },
  messageContentOwn: {
    alignItems: "flex-end",
  },
  messageContentNested: {
    marginLeft: "50px",
  },
  messageSender: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "4px",
    marginLeft: "4px",
  },
  messageSenderName: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#3b82f6",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  adminIndicator: {
    fontSize: "10px",
    background: "#eff6ff",
    color: "#3b82f6",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  messageTime: {
    fontSize: "11px",
    color: "#000000",
  },
  messageReply: {
    fontSize: "12px",
    color: "#64748b",
    marginBottom: "4px",
    marginLeft: "4px",
    fontStyle: "italic",
  },
  messageBubble: {
    background: " #e2e8f0",
    borderRadius: "18px",
    padding: "10px 14px",
    border: "1px solid #e2e8f0",
    position: "relative",
    maxWidth: "100%",
    wordWrap: "break-word",
  },

  // Add to styles object
avatarImage: {
  width: '100%',
  height: '100%',
  borderRadius: '50%',
  objectFit: 'cover',
},
avatarImageSmall: {
  width: '100%',
  height: '100%',
  borderRadius: '50%',
  objectFit: 'cover',
},


  messageText: {
    fontSize: "14px",
    lineHeight: "1.5",
    margin: "0 0 4px 0",
    color: "#1e293b",
  },
  messageAttachments: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "4px",
  },
imageAttachment: {
  position: "relative",
  maxWidth: "300px",
  minWidth: "200px",
  minHeight: "250px",
  borderRadius: "10px",
  overflow: "hidden",
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  cursor: "pointer",
},

attachmentImage: {
  width: "100%",
  maxHeight: "250px",
  objectFit: "cover",
  transition: "transform 0.2s",
  "&:hover": {
    transform: "scale(1.02)",
  },
},
  videoAttachment: {
    position: "relative",
    maxWidth: "250px",
    minWidth: "100px",
    minHeight: "100px",
    borderRadius: "10px",
    overflow: "hidden",
    background: "#000",
    cursor: "pointer",
  },
  videoThumbnail: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
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
  },
  playIcon: {
    fontSize: "40px",
    color: "white",
    textShadow: "0 2px 4px rgba(0,0,0,0.3)",
  },
 imageSizeBadge: {
  position: "absolute",
  bottom: "4px",
  right: "4px",
  background: "rgba(0,0,0,0.6)",
  color: "#fff",
  fontSize: "9px",
  padding: "2px 4px",
  borderRadius: "4px",
  zIndex: 2,
},
fallbackImage: {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "40px",
  background: "#f1f5f9",
},
  fileAttachment: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    background: "#f8fafc",
    borderRadius: "8px",
    color: "#475569",
    textDecoration: "none",
    fontSize: "13px",
    "&:hover": {
      background: "#f1f5f9",
    },
  },
  fileIcon: { fontSize: "16px" },
  fileName: { maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  fileSize: { fontSize: "10px", color: "#94a3b8", marginLeft: "4px" },
  messageReactions: { display: "flex", gap: "4px", marginBottom: "4px" },
  messageReaction: { fontSize: "12px", background: "#f8fafc", padding: "2px 6px", borderRadius: "12px" },
  messageFooter: { display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#94a3b8", position: "relative" },
  pinnedIcon: { fontSize: "12px" },
  editedIcon: { fontSize: "11px", fontStyle: "italic" },
  messageActions: {
    position: "absolute",
    top: "-30px",
    right: "0",
    display: "flex",
    gap: "4px",
    background: "white",
    borderRadius: "20px",
    padding: "4px",
    opacity: 0,
    transition: "opacity 0.2s",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    zIndex: 10,
    border: "1px solid #e2e8f0",
  },
  messageAction: {
    width: "28px",
    height: "28px",
    borderRadius: "14px",
    border: "none",
    background: "transparent",
    color: "#64748b",
    fontSize: "14px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "&:hover": {
      background: "#f1f5f9",
    },
  },
  messageActionActive: { background: "#eff6ff", color: "#3b82f6" },
  filePreviewArea: { padding: "12px 16px", background: "white", borderTop: "1px solid #e2e8f0", display: "flex", gap: "12px", overflowX: "auto" },
  filePreview: { display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", padding: "8px", borderRadius: "10px", minWidth: "200px", position: "relative", border: "1px solid #e2e8f0" },
  previewImage: { width: "40px", height: "40px", borderRadius: "6px", objectFit: "cover",},
  previewIcon: { width: "40px", height: "40px", background: "#f1f5f9", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" },
  previewInfo: { flex: 1, minWidth: 0 },
  previewName: { fontSize: "13px", fontWeight: "500", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  previewSize: { fontSize: "11px", color: "#94a3b8" },
  removeFileBtn: { width: "20px", height: "20px", borderRadius: "10px", border: "none", background: "#ef4444", color: "#fff", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  replyContainer: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" },
  replyContent: { flex: 1 },
  replyLabel: { fontSize: "12px", color: "#3b82f6", display: "block", marginBottom: "2px", fontWeight: "500" },
  replyText: { fontSize: "13px", color: "#64748b", fontStyle: "italic" },
  cancelReply: { width: "24px", height: "24px", borderRadius: "12px", border: "none", background: "transparent", color: "#64748b", fontSize: "18px", cursor: "pointer", "&:hover": { background: "#f1f5f9" } },
  inputContainer: { padding: "12px 16px", background: "white", borderTop: "1px solid #e2e8f0", display: "flex", gap: "8px", alignItems: "center", position: "relative" },
  attachButton: { width: "36px", height: "36px", borderRadius: "18px", border: "none", background: "#f8fafc", color: "#64748b", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", "&:hover": { background: "#f1f5f9", color: "#3b82f6" } },
  emojiButton: { width: "36px", height: "36px", borderRadius: "18px", border: "none", background: "#f8fafc", color: "#64748b", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", "&:hover": { background: "#f1f5f9", color: "#3b82f6" } },
  emojiPicker: { position: "absolute", bottom: "70px", left: "16px", background: "white", borderRadius: "12px", padding: "12px", display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "8px", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 100 },
  emoji: { width: "32px", height: "32px", borderRadius: "6px", border: "none", background: "#f8fafc", fontSize: "18px", cursor: "pointer", "&:hover": { background: "#f1f5f9" } },
  messageInput: { flex: 1, padding: "10px 14px", borderRadius: "24px", border: "1px solid #e2e8f0", background: "#f8fafc", color: "#1e293b", fontSize: "14px", minHeight: "20px", maxHeight: "100px", "::placeholder": { color: "#94a3b8" }, "&:focus": { outline: "none", borderColor: "#3b82f6" } },
  sendButton: { padding: "0 20px", height: "36px", borderRadius: "18px", border: "none", background: "#3b82f6", color: "#fff", fontSize: "14px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", "&:hover": { background: "#2563eb" } },
  sendButtonDisabled: { opacity: 0.5, cursor: "not-allowed", "&:hover": { background: "#3b82f6" } },
  sendSpinner: { width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.6s linear infinite" },
  progressBar: { position: "fixed", bottom: "20px", right: "20px", width: "200px", height: "40px", background: "white", borderRadius: "20px", overflow: "hidden", border: "1px solid #e2e8f0", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" },
  progressFill: { position: "absolute", left: 0, top: 0, bottom: 0, background: "#3b82f6", transition: "width 0.3s ease" },
  progressText: { position: "relative", color: "#1e293b", fontSize: "12px", fontWeight: "500", zIndex: 1 },
  // Admin Section
  adminSection: { marginTop: "24px", padding: "20px", background: "white", borderRadius: "20px", border: "1px solid #e2e8f0" },
  adminSectionTitle: { fontSize: "20px", fontWeight: "600", marginBottom: "20px", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" },
  adminGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px", marginBottom: "24px" },
  adminCard: { background: "#f8fafc", borderRadius: "16px", padding: "16px", border: "1px solid #e2e8f0" },
  adminCardTitle: { fontSize: "16px", fontWeight: "600", marginBottom: "16px", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" },
  onlineUsersGrid: { display: "flex", flexDirection: "column", gap: "8px", maxHeight: "300px", overflowY: "auto" },
  adminUserCard: { display: "flex", alignItems: "center", gap: "12px", padding: "10px", background: "white", borderRadius: "12px", border: "1px solid #e2e8f0" },
// Update in styles object
adminUserAvatar: {
  width: "40px",
  height: "40px",
  borderRadius: "50%",
  background: "#3b82f6",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "16px",
  fontWeight: "600",
  position: "relative",
  color: "white",
  overflow: "hidden", // Important for images
},  adminUserInfo: { flex: 1 },
  adminUserName: { fontSize: "14px", fontWeight: "500", display: "flex", alignItems: "center", gap: "4px" },
  adminUserTime: { fontSize: "11px", color: "#64748b", display: "block" },
  muteBtn: { width: "30px", height: "30px", borderRadius: "8px", border: "none", background: "#f1f5f9", color: "#64748b", fontSize: "14px", cursor: "pointer", "&:hover": { background: "#e2e8f0" } },
  onlineDot: { position: "absolute", bottom: "0", right: "0", width: "10px", height: "10px", borderRadius: "50%", background: "#10b981", border: "2px solid white" },
  adminStar: { fontSize: "12px" },
  pinnedMessagesList: { display: "flex", flexDirection: "column", gap: "10px", maxHeight: "300px", overflowY: "auto" },
  adminPinnedItem: { background: "white", borderRadius: "10px", padding: "12px", borderLeft: "3px solid #f59e0b" },
  adminPinnedHeader: { display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "12px" },
  adminPinnedUser: { fontWeight: "600", color: "#3b82f6" },
  adminPinnedTime: { color: "#94a3b8" },
  adminPinnedContent: { fontSize: "13px", color: "#475569", margin: "0 0 8px 0" },
  adminPinnedAttachments: { fontSize: "11px", color: "#94a3b8", marginBottom: "8px" },
  adminUnpinBtn: { padding: "4px 10px", borderRadius: "6px", border: "none", background: "#f1f5f9", color: "#64748b", fontSize: "11px", cursor: "pointer", "&:hover": { background: "#e2e8f0" } },
  topUsersList: { display: "flex", flexDirection: "column", gap: "8px" },
  adminTopUser: { display: "flex", alignItems: "center", gap: "10px", padding: "10px", background: "white", borderRadius: "10px", border: "1px solid #e2e8f0" },
  adminTopRank: { width: "28px", height: "28px", borderRadius: "14px", background: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "600", color: "white" },
  adminTopName: { flex: 1, fontSize: "13px", fontWeight: "500" },
  adminTopCount: { fontSize: "12px", color: "#64748b" },
  adminStatsList: { display: "flex", flexDirection: "column", gap: "10px" },
  adminStatRow: { display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "8px 0", borderBottom: "1px solid #e2e8f0" },
  noData: { textAlign: "center", color: "#94a3b8", padding: "20px", fontStyle: "italic" },
  bulkActionsSection: { marginTop: "20px", padding: "20px", background: "#f8fafc", borderRadius: "16px", border: "1px solid #e2e8f0" },
  bulkActionsHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" },
  bulkControls: { display: "flex", gap: "10px", alignItems: "center" },
  checkboxLabel: { display: "flex", alignItems: "center", gap: "5px", fontSize: "13px", cursor: "pointer" },
  bulkDeleteBtn: { padding: "8px 16px", borderRadius: "10px", border: "none", background: "#ef4444", color: "#fff", fontSize: "13px", cursor: "pointer", "&:hover": { background: "#dc2626" } },
  exportSection: { marginTop: "20px" },
  exportTitle: { fontSize: "14px", fontWeight: "600", marginBottom: "10px" },
  dateRangePicker: { display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" },
  dateInput: { padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "white", color: "#1e293b", fontSize: "13px" },
  dateSeparator: { color: "#64748b" },
  exportBtn: { padding: "8px 20px", borderRadius: "10px", border: "none", background: "#3b82f6", color: "#fff", fontSize: "13px", cursor: "pointer", "&:hover": { background: "#2563eb" }, "&:disabled": { opacity: 0.5, cursor: "not-allowed" } },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: "20px" },
  modal: { background: "white", borderRadius: "20px", padding: "24px", maxWidth: "400px", width: "100%", border: "1px solid #e2e8f0" },
  editModal: { background: "white", borderRadius: "20px", padding: "24px", maxWidth: "400px", width: "90%", border: "1px solid #e2e8f0" },
  editModalTitle: { fontSize: "18px", fontWeight: "600", marginBottom: "16px", color: "#0f172a" },
  editModalInput: { width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "14px", marginBottom: "16px", fontFamily: "inherit" },
  editModalButtons: { display: "flex", gap: "12px", justifyContent: "flex-end" },
  editModalCancel: { padding: "8px 16px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "white", color: "#64748b", cursor: "pointer" },
  editModalSave: { padding: "8px 16px", borderRadius: "8px", border: "none", background: "#3b82f6", color: "white", cursor: "pointer" },
  modalTitle: { fontSize: "18px", fontWeight: "600", marginBottom: "12px", color: "#0f172a" },
  modalText: { fontSize: "14px", color: "#475569", marginBottom: "20px", lineHeight: "1.5" },
  modalPreview: { display: "block", background: "#f8fafc", padding: "12px", borderRadius: "8px", marginTop: "10px", fontStyle: "italic", color: "#64748b" },
  modalActions: { display: "flex", gap: "12px", justifyContent: "flex-end" },
  modalCancelBtn: { padding: "10px 20px", borderRadius: "10px", border: "1px solid #e2e8f0", background: "white", color: "#64748b", fontSize: "14px", cursor: "pointer", "&:hover": { background: "#f8fafc" } },
  modalDeleteBtn: { padding: "10px 20px", borderRadius: "10px", border: "none", background: "#ef4444", color: "#fff", fontSize: "14px", cursor: "pointer", "&:hover": { background: "#dc2626" } },
  modalContent: { position: "relative", maxWidth: "90vw", maxHeight: "90vh", marginTop: "60px" },
  modalImage: { maxWidth: "100%", maxHeight: "90vh", objectFit: "contain", borderRadius: "12px" },
  modalVideo: { maxWidth: "100%", maxHeight: "90vh", borderRadius: "12px" },
  modalClose: { position: "absolute", top: "-40px", right: "-40px", width: "40px", height: "40px", borderRadius: "20px", border: "none", background: "#ef4444", color: "#fff", fontSize: "24px", cursor: "pointer", "&:hover": { background: "#dc2626" } },
};

const loadingStyles = {
  container: {
    minHeight: "100vh",
    background: "#f8fafc",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  spinner: {
    width: "48px",
    height: "48px",
    border: "3px solid #e2e8f0",
    borderTopColor: "#3b82f6",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "20px",
  },
  text: {
    color: "#64748b",
    fontSize: "14px",
  },
};

// Add keyframes
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  * {
    box-sizing: border-box;
  }
  
  button {
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  input:focus, select:focus, textarea:focus {
    outline: none;
  }
  
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  
  ::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 10px;
  }

  
  
  ::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 10px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
  
  @media (max-width: 768px) {
    .stats-grid {
      grid-template-columns: repeat(2, 1fr) !important;
    }
    .message-content {
      max-width: 85% !important;
    }
    .message-actions {
      opacity: 1 !important;
      top: -25px !important;
    }
  }
`;
document.head.appendChild(styleSheet);

export default ChatMonitorPage;