// frontend/src/contexts/MessengerContext.jsx
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import BASE_URL, { api } from '../api';
import { io } from 'socket.io-client';

const MessengerContext = createContext();

export const useMessenger = () => useContext(MessengerContext);


export const MessengerProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState({});
  const [darkMode, setDarkMode] = useState(false);
  const [fontSize, setFontSize] = useState('medium');
  
  // Caching states
  const [messageCache, setMessageCache] = useState({});
  const [conversationsCache, setConversationsCache] = useState(null);
  const [userCache, setUserCache] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const socketRef = useRef(null);
  const activeConversationRef = useRef(null);

  // Apply theme to body when darkMode changes
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  // Apply font size to body
  useEffect(() => {
    const fontSizeMap = {
      small: '12px',
      medium: '14px',
      large: '16px'
    };
    document.body.style.fontSize = fontSizeMap[fontSize] || '14px';
  }, [fontSize]);

  // Load user settings from backend
  const loadUserSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.get('/api/messenger/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const settings = res.data.settings;
      
      if (settings.theme === 'dark') {
        setDarkMode(true);
      } else if (settings.theme === 'light') {
        setDarkMode(false);
      } else if (settings.theme === 'system') {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(systemDark);
      }
      
      setFontSize(settings.messageFontSize || 'medium');
      
      return settings;
    } catch (error) {
      console.error('Error loading settings:', error);
      return null;
    }
  };

  // Wrapper for setActiveConversation to update both state and ref
  const updateActiveConversation = (conversation) => {
    setActiveConversation(conversation);
    activeConversationRef.current = conversation;
  };

  // Load cached data from localStorage on mount
  useEffect(() => {
    const loadCachedData = () => {
      try {
        const cachedUser = localStorage.getItem('messenger_user');
        const cachedConversations = localStorage.getItem('messenger_conversations');
        const cachedMessages = localStorage.getItem('messenger_messages_cache');
        
        if (cachedUser) {
          const userData = JSON.parse(cachedUser);
          setUser(userData);
          setUserCache(userData);
          initSocket(userData.id);
        }
        
        if (cachedConversations) {
          const convData = JSON.parse(cachedConversations);
          setConversations(convData);
          setConversationsCache(convData);
        }
        
        if (cachedMessages) {
          setMessageCache(JSON.parse(cachedMessages));
        }
        
        setIsInitialized(true);
      } catch (err) {
        console.error('Error loading cached data:', err);
      }
    };
    
    loadCachedData();
  }, []);

  // Save conversations to localStorage
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('messenger_conversations', JSON.stringify(conversations));
      setConversationsCache(conversations);
    }
  }, [conversations]);

  // Save user to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('messenger_user', JSON.stringify(user));
      setUserCache(user);
    }
  }, [user]);

  // Save message cache to localStorage
  useEffect(() => {
    if (Object.keys(messageCache).length > 0) {
      localStorage.setItem('messenger_messages_cache', JSON.stringify(messageCache));
    }
  }, [messageCache]);

    // Fetch conversations (with cache)
  const fetchConversations = async () => {
    if (conversationsCache) {
      setConversations(conversationsCache);
      setLoading(false);
      fetchConversationsInBackground();
      return conversationsCache;
    }
    
    setLoading(true);
    try {
      const res = await api.get('/api/messenger/conversations');
      const convData = res.data.conversations || [];
      setConversations(convData);
      setConversationsCache(convData);
      localStorage.setItem('messenger_conversations', JSON.stringify(convData));
      return convData;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };
  
  const fetchConversationsInBackground = async () => {
    try {
      const res = await api.get('/api/messenger/conversations');
      const convData = res.data.conversations || [];
      setConversations(convData);
      setConversationsCache(convData);
      localStorage.setItem('messenger_conversations', JSON.stringify(convData));
    } catch (error) {
      console.error('Background fetch error:', error);
    }
  };



  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      await fetchUser();
      await fetchConversations();
      await loadUserSettings();
    };
    init();
  }, []);

  // Initialize socket connection
  const initSocket = (userId) => {
    if (socketRef.current?.connected) return;
    
    socketRef.current = io(BASE_URL, {
      transports: ['websocket'],
      auth: { userId }
    });

    socketRef.current.on('connect', () => {
      console.log('🔌 Socket connected');
      socketRef.current.emit('dm:join', userId);
    });

    socketRef.current.on('dm:user_online', ({ userId }) => {
      setOnlineUsers(prev => [...new Set([...prev, userId])]);
    });

    socketRef.current.on('dm:user_offline', ({ userId }) => {
      setOnlineUsers(prev => prev.filter(id => id !== userId));
    });

    socketRef.current.on('dm:online_users', ({ users }) => {
      setOnlineUsers(users);
    });
    
socketRef.current.on('dm:new_message', (message) => {
  console.log('📨 Message received:', message.id, 'tempId:', message.tempId);
  
  // Handle sender's own message (replace optimistic)
  if (message.tempId) {
    setMessages(prev => {
      const hasOptimistic = prev.some(msg => msg.id === message.tempId);
      if (hasOptimistic) {
        return prev.map(msg => 
          msg.id === message.tempId ? { ...message, id: message.id } : msg
        );
      }
      if (prev.some(m => m.id === message.id)) return prev;
      return [...prev, message];
    });
    
    setMessageCache(prev => ({
      ...prev,
      [message.conversationId]: prev[message.conversationId]?.map(msg => 
        msg.id === message.tempId ? { ...message, id: message.id } : msg
      ) || [message]
    }));

    
    
    // Update conversation list for sender (move to top)
    setConversations(prev => {
      const existingConvIndex = prev.findIndex(conv => conv.id === message.conversationId);
      if (existingConvIndex !== -1) {
        const updatedConv = {
          ...prev[existingConvIndex],
          lastMessage: message.content,
          lastMessageAt: new Date(),
        };
        return [updatedConv, ...prev.filter((_, i) => i !== existingConvIndex)];
      }
      return prev;
    });
    return;
  }
  
  // For recipient: add message to chat
  if (activeConversationRef.current?.id === message.conversationId) {
    setMessages(prev => {
      if (prev.some(m => m.id === message.id)) return prev;
      return [...prev, message];
    });
  }
  
  // Update cache
  setMessageCache(prev => ({
    ...prev,
    [message.conversationId]: [...(prev[message.conversationId] || []), message]
  }));
  
  // Update conversation list - ADD NEW or UPDATE EXISTING and MOVE TO TOP
  setConversations(prev => {
    
    const existingConvIndex = prev.findIndex(conv => conv.id === message.conversationId);
    const isActive = activeConversationRef.current?.id === message.conversationId;
    
    if (existingConvIndex !== -1) {
      // Update existing conversation
      const updatedConv = {
        ...prev[existingConvIndex],
        lastMessage: message.content,
        lastMessageAt: new Date(),
        unreadCount: isActive ? 0 : (prev[existingConvIndex].unreadCount || 0) + 1
      };
      // Remove from current position
      const newList = prev.filter((_, i) => i !== existingConvIndex);
      // Add to top
      return [updatedConv, ...newList];
} else {
  // Add brand new conversation - IMMEDIATE DISPLAY
  const newConversation = {
    id: message.conversationId,
    participant: message.sender || {
      id: message.senderId,
      fullName: "User",
      profileImage: null,
      role: "member"
    },
    lastMessage: message.content,
    lastMessageAt: new Date(),
    unreadCount: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  // Force add to top of list
  return [newConversation, ...prev];
}
  });

  
});
    socketRef.current.on('dm:typing_start', ({ conversationId, userId }) => {
      if (conversationId === activeConversationRef.current?.id) {
        setTypingUsers(prev => ({ ...prev, [userId]: true }));
      }
    });

    socketRef.current.on('dm:typing_stop', ({ conversationId, userId }) => {
      if (conversationId === activeConversationRef.current?.id) {
        setTypingUsers(prev => ({ ...prev, [userId]: false }));
      }
    });

    socketRef.current.on('dm:message_read', ({ messageId, conversationId }) => {
      setMessageCache(prev => ({
        ...prev,
        [conversationId]: prev[conversationId]?.map(msg => 
          msg.id === messageId ? { ...msg, isRead: true } : msg
        ) || []
      }));
      
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, isRead: true } : msg
      ));
    });

    socketRef.current.on('dm:message_deleted', ({ messageId, conversationId }) => {
      setMessageCache(prev => ({
        ...prev,
        [conversationId]: prev[conversationId]?.filter(msg => msg.id !== messageId) || []
      }));
      
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    });

    socketRef.current.on('dm:message_edited', (updatedMessage) => {
      setMessageCache(prev => ({
        ...prev,
        [updatedMessage.conversationId]: prev[updatedMessage.conversationId]?.map(msg => 
          msg.id === updatedMessage.id ? updatedMessage : msg
        ) || []
      }));
      
      setMessages(prev => prev.map(msg => 
        msg.id === updatedMessage.id ? updatedMessage : msg
      ));
    });
  };

  // Fetch user data (with cache)
  const fetchUser = async () => {
    if (userCache) {
      setUser(userCache);
      return userCache;
    }
    
    try {
      const res = await api.get('/api/me');
      setUser(res.data);
      setUserCache(res.data);
      initSocket(res.data.id);
      return res.data;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  };



  // Fetch messages for a conversation (with cache)
  const fetchMessages = async (conversationId) => {
    if (messageCache[conversationId]) {
      setMessages(messageCache[conversationId]);
      fetchMessagesInBackground(conversationId);
      return messageCache[conversationId];
    }
    
    try {
      const res = await api.get(`/api/messenger/messages/${conversationId}`);
      const newMessages = res.data.messages || [];
      
      setMessageCache(prev => ({
        ...prev,
        [conversationId]: newMessages
      }));
      setMessages(newMessages);
      localStorage.setItem('messenger_messages_cache', JSON.stringify(messageCache));
      
      api.put(`/api/messenger/conversations/${conversationId}/read`).catch(console.error);
      
      setConversations(prev => prev.map(conv =>
        conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
      ));
      
      return newMessages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  };
  
  const fetchMessagesInBackground = async (conversationId) => {
    try {
      const res = await api.get(`/api/messenger/messages/${conversationId}`);
      const newMessages = res.data.messages || [];
      
      setMessageCache(prev => ({
        ...prev,
        [conversationId]: newMessages
      }));
      localStorage.setItem('messenger_messages_cache', JSON.stringify(messageCache));
      
      if (activeConversationRef.current?.id === conversationId) {
        setMessages(newMessages);
      }
    } catch (error) {
      console.error('Background message fetch error:', error);
    }
  };

  // Send a message with optimistic update
 // Send a message with optimistic update
const sendMessage = async (conversationId, content, files = []) => {
  if (!content && files.length === 0) return null;
  
  const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const currentUser = user;
  
  const optimisticMessage = {
    id: tempId,
    content: content,
    senderId: currentUser?.id,
    conversationId: conversationId,
    isRead: false,
    isDeleted: false,
    isEdited: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sender: {
      id: currentUser?.id,
      fullName: currentUser?.fullName,
      profileImage: currentUser?.profileImage,
      role: currentUser?.role
    },
    files: files,
    isOptimistic: true
  };
  
  setMessages(prev => [...prev, optimisticMessage]);
  setConversations(prev => prev.map(conv =>
    conv.id === conversationId 
      ? { ...conv, lastMessage: content, lastMessageAt: new Date() }
      : conv
  ));
  
  setMessageCache(prev => ({
    ...prev,
    [conversationId]: [...(prev[conversationId] || []), optimisticMessage]
  }));
  
  // Socket emit
  socketRef.current?.emit('dm:send_message', {
    conversationId,
    content,
    files,
    tempId: tempId
  });
  
  return { id: tempId, isOptimistic: true };
};

  // Clear all messages 
  const clearConversation = async (conversationId) => {
    try {
      await api.post(`/api/messenger/conversations/${conversationId}/clear`);
      
      if (activeConversation?.id === conversationId) {
        setMessages([]);
      }
      
      setConversations(prev => prev.map(conv =>
        conv.id === conversationId 
          ? { ...conv, lastMessage: null, lastMessageAt: null, lastMessageBy: null }
          : conv
      ));
      
      setMessageCache(prev => ({
        ...prev,
        [conversationId]: []
      }));
      
      console.log(`✅ Cleared all messages in conversation ${conversationId}`);
      return true;
    } catch (error) {
      console.error('Error clearing conversation:', error);
      return false;
    }
  };

  // ✅ ADDED: Delete entire conversation (soft delete for current user)
 const deleteConversation = async (conversationId) => {
  try {
    await api.delete(`/api/messenger/conversations/${conversationId}`);
    
    setConversations(prev => prev.filter(conv => conv.id !== conversationId));
    
    // ✅ Clear active conversation and messages if it was deleted
    if (activeConversation?.id === conversationId) {
      setActiveConversation(null);
      setMessages([]);  // Clear messages from state
    }
    
    // ✅ Clear message cache for this conversation
    setMessageCache(prev => {
      const newCache = { ...prev };
      delete newCache[conversationId];
      return newCache;
    });
    
    // ✅ Also remove from localStorage cache
    const cachedMessages = localStorage.getItem('messenger_messages_cache');
    if (cachedMessages) {
      const cache = JSON.parse(cachedMessages);
      delete cache[conversationId];
      localStorage.setItem('messenger_messages_cache', JSON.stringify(cache));
    }
    
    console.log(`✅ Deleted conversation ${conversationId}`);
    return true;
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return false;
  }
};
  // Start new conversation
  const startConversation = async (userId) => {
    try {
      const res = await api.post(`/api/messenger/conversations/${userId}`);
      const newConversation = res.data.conversation;
      setConversations(prev => [newConversation, ...prev]);
      updateActiveConversation(newConversation);
      localStorage.setItem('messenger_conversations', JSON.stringify(conversations));
      return newConversation;
    } catch (error) {
      console.error('Error starting conversation:', error);
      return null;
    }
  };

  // Send typing indicator
  const sendTyping = (conversationId, isTyping) => {
    socketRef.current?.emit(isTyping ? 'dm:typing_start' : 'dm:typing_stop', { conversationId });
  };

  // Mark message as read
  const markAsRead = async (messageId, conversationId) => {
    try {
      await api.put(`/api/messenger/read-receipts/messages/${messageId}`);
      socketRef.current?.emit('dm:mark_read', { messageId, conversationId });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Delete message
  const deleteMessage = async (messageId, conversationId) => {
    try {
      await api.delete(`/api/messenger/messages/${messageId}`);
      
      setMessageCache(prev => ({
        ...prev,
        [conversationId]: prev[conversationId]?.filter(msg => msg.id !== messageId) || []
      }));
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      localStorage.setItem('messenger_messages_cache', JSON.stringify(messageCache));
      
      socketRef.current?.emit('dm:delete_message', { messageId, conversationId });
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  // Add reaction
  const addReaction = async (messageId, reaction, conversationId) => {
    try {
      await api.post(`/api/messenger/reactions/${messageId}`, { reaction });
      socketRef.current?.emit('dm:add_reaction', { messageId, reaction, conversationId });
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  // Search users
  const searchUsers = async (query) => {
    if (query.length < 2) return [];
    try {
      const res = await api.get(`/api/messenger/search/users?q=${query}`);
      return res.data.users || [];
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  };

  // Fetch all users
  const fetchAllUsers = async () => {
    try {
      const res = await api.get('/api/messenger/search/all-users');
      return res.data.users || [];
    } catch (error) {
      console.error('Error fetching all users:', error);
      return [];
    }
  };

  // Upload file
  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await api.post('/api/messenger/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data.file;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  };

  // Clear all cache
  const clearCache = () => {
    localStorage.removeItem('messenger_user');
    localStorage.removeItem('messenger_conversations');
    localStorage.removeItem('messenger_messages_cache');
    setMessageCache({});
    setConversationsCache(null);
    setUserCache(null);
  };

  const value = {
    user,
    conversations,
    activeConversation,
    setActiveConversation: updateActiveConversation,
    messages,
    onlineUsers,
    loading,
    typingUsers,
     setTypingUsers,
    darkMode,
    setDarkMode,
    fontSize,
    setFontSize,
    socket: socketRef,
    fetchUser,
    fetchConversations,
    fetchMessages,
    sendMessage,
    startConversation,
    sendTyping,
    markAsRead,
    deleteMessage,
    addReaction,
    searchUsers,
    uploadFile,
    fetchAllUsers,
    clearCache,
    isInitialized,
    loadUserSettings,
    clearConversation,    // ✅ ADDED
    deleteConversation,   // ✅ ADDED
  };

  return (
    <MessengerContext.Provider value={value}>
      {children}
    </MessengerContext.Provider>
  );
};

export default MessengerProvider;