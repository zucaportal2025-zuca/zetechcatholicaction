// frontend/src/components/admin/messenger/ConversationsTab.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, ArrowLeft, Check, CheckCheck, MessageCircle, Plus, MoreVertical, Smile, Paperclip, X, Loader, RefreshCw, User, Mail, Phone } from 'lucide-react';
import { api } from '../../../api';
import { io } from 'socket.io-client';
import BASE_URL from '../../../api';

export default function ConversationsTab() {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const inputRef = useRef(null);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // Fetch conversations function
  const fetchConversations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await api.get('/api/admin/messenger/conversations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(res.data.conversations || []);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initialize socket
  const initSocket = () => {
    const token = localStorage.getItem('token');
    if (!token || !currentUser.id) return;

    socketRef.current = io(BASE_URL, {
      transports: ['websocket'],
      auth: { token }
    });

    socketRef.current.on('connect', () => {
      console.log('Admin socket connected');
      socketRef.current.emit('dm:join', currentUser.id);
    });

    socketRef.current.on('dm:new_message', (message) => {
      // Update messages if in current conversation
      if (selectedConversation?.id === message.conversationId) {
        setMessages(prev => {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
        scrollToBottom();
        
        // Reset unread count to 0 since we're in this conversation
        setConversations(prev => prev.map(conv =>
          conv.id === message.conversationId ? { ...conv, unreadCount: 0 } : conv
        ));
      } else {
        // Increment unread count for other conversations
        setConversations(prev => prev.map(conv =>
          conv.id === message.conversationId 
            ? { ...conv, unreadCount: (conv.unreadCount || 0) + 1 }
            : conv
        ));
      }
      
      // Update last message
      setConversations(prev => prev.map(conv =>
        conv.id === message.conversationId
          ? { ...conv, lastMessage: message.content, lastMessageAt: new Date() }
          : conv
      ));
    });
    
    socketRef.current.on('dm:user_online', ({ userId }) => {
      setOnlineUsers(prev => [...new Set([...prev, userId])]);
    });

    socketRef.current.on('dm:user_offline', ({ userId }) => {
      setOnlineUsers(prev => prev.filter(id => id !== userId));
    });

    socketRef.current.on('dm:typing_start', ({ conversationId, userId }) => {
      if (selectedConversation?.id === conversationId) {
        setTypingUsers(prev => ({ ...prev, [userId]: true }));
      }
    });

    socketRef.current.on('dm:typing_stop', ({ conversationId, userId }) => {
      if (selectedConversation?.id === conversationId) {
        setTypingUsers(prev => ({ ...prev, [userId]: false }));
      }
    });
  };

  // Auto-refresh conversations every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations();
      console.log('🔄 Admin: Auto-refreshing conversations...');
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Initial load
  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 768;
      setIsMobile(desktop);
    };
    
    window.addEventListener('resize', handleResize);
    initSocket();
    fetchConversations();
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const fetchMessages = async (conversationId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.get(`/api/messenger/messages/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data.messages || []);
      scrollToBottom();
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || sending) return;
    
    const content = messageInput.trim();
    setMessageInput('');
    setSending(true);
    
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      content,
      senderId: currentUser.id,
      createdAt: new Date().toISOString(),
      sender: { fullName: currentUser.fullName, profileImage: currentUser.profileImage },
      isOptimistic: true
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    scrollToBottom();
    
    try {
      const token = localStorage.getItem('token');
      const res = await api.post('/api/messenger/messages', 
        { conversationId: selectedConversation.id, content },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const realMessage = res.data;
      setMessages(prev => prev.map(msg => msg.id === tempId ? realMessage : msg));
      
      setConversations(prev => prev.map(conv =>
        conv.id === selectedConversation.id
          ? { ...conv, lastMessage: content, lastMessageAt: new Date() }
          : conv
      ));
      
    } catch (err) {
      console.error(err);
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !sending) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTyping = () => {
    socketRef.current?.emit('dm:typing_start', { conversationId: selectedConversation?.id });
    if (window.typingTimeout) clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(() => {
      socketRef.current?.emit('dm:typing_stop', { conversationId: selectedConversation?.id });
    }, 2000);
  };
const openConversation = async (conv) => {
  setSelectedConversation(conv);
  await fetchMessages(conv.id);
  setShowChat(true);
  
  // Force reset unread count locally and on backend
  setConversations(prev => prev.map(c => 
    c.id === conv.id ? { ...c, unreadCount: 0 } : c
  ));
  
  try {
    const token = localStorage.getItem('token');
    await api.put(`/api/messenger/conversations/${conv.id}/read`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Marked conversation ${conv.id} as read`);
    
    // Refresh to get updated counts from backend
    setTimeout(() => fetchConversations(), 500);
  } catch (err) {
    console.error('Error marking as read:', err);
  }
  
  setTimeout(() => scrollToBottom(), 100);
};

  const closeChat = () => {
    setShowChat(false);
    setSelectedConversation(null);
    setMessages([]);
  };

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const getParticipant = (conv) => {
    if (!conv) return null;
    if (conv.participant1?.id === currentUser.id) return conv.participant2;
    if (conv.participant2?.id === currentUser.id) return conv.participant1;
    return conv.participant1 || conv.participant2;
  };

  const isUserOnline = (userId) => onlineUsers.includes(userId);
  const isTyping = selectedConversation && typingUsers[getParticipant(selectedConversation)?.id];

  const formatTime = (date) => {
    if (!date) return '';
    const diff = Math.floor((new Date() - new Date(date)) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff} min ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return new Date(date).toLocaleDateString();
  };

  const formatMsgTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getAvatarColor = (name) => {
    const colors = ['#075E54', '#128C7E', '#25D366', '#34B7F1', '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#10b981'];
    const index = (name?.length || 0) % colors.length;
    return colors[index];
  };

  const filteredConversations = conversations.filter(conv => {
    const p = getParticipant(conv);
    return !searchQuery || p?.fullName?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const adminConversations = filteredConversations.filter(conv => {
    const p = getParticipant(conv);
    return p?.role === 'admin';
  });
  
  const regularConversations = filteredConversations.filter(conv => {
    const p = getParticipant(conv);
    return p?.role !== 'admin';
  });

  return (
    <>
      <div className={`conversations-container ${showChat ? 'chat-open' : ''}`}>
        <div className="conversations-sidebar">
          <div className="sidebar-header">
            <h2>ZUCA Messenger</h2>
            <div className="header-actions">
              <button className="icon-btn" onClick={() => setShowNewChat(true)}>
                <Plus size={20} />
              </button>
              <button className="icon-btn" onClick={fetchConversations}>
                <RefreshCw size={20} />
              </button>
            </div>
          </div>
          
          <div className="search-container">
            <div className="search-box">
              <Search size={18} className="search-icon" />
              <input 
                type="text" 
                placeholder="Search conversations..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
              />
            </div>
          </div>
          
          <div className="chats-scroll">
            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading conversations...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="no-chats">
                <div className="no-chats-icon"><MessageCircle size={48} strokeWidth={1} /></div>
                <h3>No conversations yet</h3>
                <p>Users haven't started any chats</p>
              </div>
            ) : (
              <>
                {adminConversations.length > 0 && searchQuery.length === 0 && (
                  <>
                    <div className="pinned-header">
                      <span className="pinned-icon">👑</span>
                      <span>Admin Conversations</span>
                    </div>
                    {adminConversations.map(conv => {
                      const p = getParticipant(conv);
                      const isOnline = isUserOnline(p?.id);
                      return (
                        <div 
                          key={conv.id} 
                          className={`chat-item pinned-chat ${selectedConversation?.id === conv.id ? 'active' : ''}`} 
                          onClick={() => openConversation(conv)}
                        >
                          <div className="chat-avatar">
                            {p?.profileImage ? (
                              <img src={p.profileImage} alt="" />
                            ) : (
                              <div className="avatar-placeholder" style={{ backgroundColor: getAvatarColor(p?.fullName) }}>
                                {p?.fullName?.charAt(0)?.toUpperCase()}
                              </div>
                            )}
                            {isOnline && <div className="online-indicator"></div>}
                          </div>
                          <div className="chat-info">
                            <div className="chat-name">
                              {p?.fullName}
                              <span className="admin-badge">Admin</span>
                            </div>
                            <div className="chat-message">
                              <span className="message-text">{conv.lastMessage?.substring(0, 35) || 'No messages yet'}</span>
                            </div>
                          </div>
                          <div className="chat-meta">
                            <div className="chat-time">{formatTime(conv.lastMessageAt)}</div>
                            {conv.unreadCount > 0 && <div className="unread-badge">{conv.unreadCount}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
                
                {regularConversations.length > 0 && searchQuery.length === 0 && adminConversations.length > 0 && (
                  <div className="all-chats-header"><span>All Chats</span></div>
                )}
                
                {regularConversations.map(conv => {
                  const p = getParticipant(conv);
                  const isOnline = isUserOnline(p?.id);
                  return (
                    <div 
                      key={conv.id} 
                      className={`chat-item ${selectedConversation?.id === conv.id ? 'active' : ''}`} 
                      onClick={() => openConversation(conv)}
                    >
                      <div className="chat-avatar">
                        {p?.profileImage ? (
                          <img src={p.profileImage} alt="" />
                        ) : (
                          <div className="avatar-placeholder" style={{ backgroundColor: getAvatarColor(p?.fullName) }}>
                            {p?.fullName?.charAt(0)?.toUpperCase()}
                          </div>
                        )}
                        {isOnline && <div className="online-indicator"></div>}
                      </div>
                      <div className="chat-info">
                        <div className="chat-name">{p?.fullName}</div>
                        <div className="chat-message">
                          <span className="message-text">{conv.lastMessage?.substring(0, 35) || 'No messages yet'}</span>
                        </div>
                      </div>
                      <div className="chat-meta">
                        <div className="chat-time">{formatTime(conv.lastMessageAt)}</div>
                        {conv.unreadCount > 0 && <div className="unread-badge">{conv.unreadCount}</div>}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {showChat && selectedConversation ? (
          <div className="chat-window">
            <div className="chat-header">
              {isMobile && (
                <button className="back-btn" onClick={closeChat}>
                  <ArrowLeft size={22} />
                </button>
              )}
              <div className="contact-info" onClick={() => setShowInfoDrawer(true)}>
                <div className="contact-avatar">
                  {getParticipant(selectedConversation)?.profileImage ? (
                    <img src={getParticipant(selectedConversation).profileImage} alt="" />
                  ) : (
                    <div className="avatar-placeholder" style={{ backgroundColor: getAvatarColor(getParticipant(selectedConversation)?.fullName) }}>
                      {getParticipant(selectedConversation)?.fullName?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="contact-details">
                  <h3>{getParticipant(selectedConversation)?.fullName}</h3>
                  <span className="status">
                    {isTyping ? (
                      <span className="typing-status">typing...</span>
                    ) : isUserOnline(getParticipant(selectedConversation)?.id) ? (
                      <span className="online-status">online</span>
                    ) : (
                      <span className="offline-status">offline</span>
                    )}
                  </span>
                </div>
              </div>
              <div className="header-right">
                <button className="icon-btn" onClick={() => setShowInfoDrawer(true)}>
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            <div className="messages-area">
              {messages.length === 0 ? (
                <div className="no-messages">
                  <div className="no-messages-icon"><MessageCircle size={80} strokeWidth={1} /></div>
                  <p>Send a message to start chatting</p>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => {
                    const isOwn = msg.senderId === currentUser.id;
                    const showDate = idx === 0 || new Date(msg.createdAt).toDateString() !== new Date(messages[idx - 1]?.createdAt).toDateString();
                    return (
                      <React.Fragment key={msg.id}>
                        {showDate && (
                          <div className="date-divider">
                            <span>{formatDate(msg.createdAt)}</span>
                          </div>
                        )}
                        <div className={`message ${isOwn ? 'sent' : 'received'}`}>
                          {!isOwn && (
                            <div className="message-avatar">
                              {msg.sender?.profileImage ? (
                                <img src={msg.sender.profileImage} alt="" />
                              ) : (
                                <div className="avatar-initials" style={{ backgroundColor: getAvatarColor(msg.sender?.fullName) }}>
                                  {msg.sender?.fullName?.charAt(0)?.toUpperCase()}
                                </div>
                              )}
                            </div>
                          )}
                          <div className="message-bubble-wrapper">
                            {!isOwn && <div className="sender-name">{msg.sender?.fullName}</div>}
                            <div className={`message-bubble ${isOwn ? 'sent-bubble' : 'received-bubble'}`}>
                              {msg.content && <div className="message-text">{msg.content}</div>}
                              <div className="message-footer">
                                <span className="message-time">{formatMsgTime(msg.createdAt)}</span>
                                {isOwn && (
                                  <span className="message-status">
                                    {msg.isRead ? <CheckCheck size={12} /> : <Check size={12} />}
                                  </span>
                                )}
                                {msg.isEdited && <span className="edited-badge">edited</span>}
                              </div>
                            </div>
                          </div>
                          {isOwn && (
                            <div className="message-avatar message-avatar-right">
                              {currentUser?.profileImage ? (
                                <img src={currentUser.profileImage} alt="" />
                              ) : (
                                <div className="avatar-initials" style={{ backgroundColor: getAvatarColor(currentUser?.fullName) }}>
                                  {currentUser?.fullName?.charAt(0)?.toUpperCase()}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </React.Fragment>
                    );
                  })}
                  {isTyping && (
                    <div className="typing-indicator">
                      <div className="typing-dots">
                        <span></span><span></span><span></span>
                      </div>
                      <span className="typing-text">typing...</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <div className="message-input-container">
              <div className="input-area">
                <button className="input-btn attach-btn">
                  <Paperclip size={22} />
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  className="message-input"
                  placeholder="Type a message"
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value);
                    handleTyping();
                  }}
                  onKeyPress={handleKeyPress}
                />
                <button
                  className={`send-btn ${!messageInput.trim() ? 'disabled' : ''}`}
                  onClick={sendMessage}
                  disabled={!messageInput.trim() || sending}
                >
                  {sending ? <Loader size={20} className="spin" /> : <Send size={20} />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="no-chat">
            <MessageCircle size={64} strokeWidth={1} />
            <h3>ZUCA Messenger Admin</h3>
            <p>Select a conversation to start monitoring</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .conversations-container {
          display: flex;
          gap: 0;
          min-height: 600px;
          background: white;
          border-radius: 16px;
          overflow: hidden;
        }

        .conversations-sidebar {
          width: 380px;
          border-right: 1px solid #e9edef;
          display: flex;
          flex-direction: column;
          background: white;
        }

        .sidebar-header {
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #075e54;
        }

        .sidebar-header h2 {
          font-size: 20px;
          font-weight: 600;
          color: white;
          margin: 0;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .icon-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          transition: background 0.2s;
        }

        .icon-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .search-container {
          padding: 12px 16px;
          background: white;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #f0f2f5;
          border-radius: 30px;
          padding: 8px 16px;
        }

        .search-icon {
          color: #667781;
        }

        .search-box input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-size: 14px;
          color: #111b21;
        }

        .chats-scroll {
          flex: 1;
          overflow-y: auto;
        }

        .pinned-header {
          padding: 8px 16px;
          background: #f8f9fa;
          font-size: 12px;
          color: #667781;
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid #e9edef;
        }

        .all-chats-header {
          padding: 8px 16px;
          background: #f8f9fa;
          font-size: 12px;
          color: #667781;
          border-bottom: 1px solid #e9edef;
        }

        .chat-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 16px;
          cursor: pointer;
          transition: background 0.2s;
          border-bottom: 1px solid #e9edef;
        }

        .chat-item:hover {
          background: #f5f6f6;
        }

        .chat-item.active {
          background: #e8f0fe;
        }

        .chat-avatar {
          position: relative;
          width: 56px;
          height: 56px;
          flex-shrink: 0;
        }

        .chat-avatar img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }

        .avatar-placeholder {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          font-weight: 600;
          color: white;
        }

        .online-indicator {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 14px;
          height: 14px;
          background: #25d366;
          border-radius: 50%;
          border: 2px solid white;
        }

        .chat-info {
          flex: 1;
          min-width: 0;
        }

        .chat-name {
          font-size: 16px;
          font-weight: 500;
          color: #111b21;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .admin-badge {
          font-size: 10px;
          background: #075e54;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
        }

        .chat-message {
          font-size: 13px;
          color: #667781;
        }

        .message-text {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chat-meta {
          text-align: right;
          flex-shrink: 0;
        }

        .chat-time {
          font-size: 11px;
          color: #667781;
          margin-bottom: 6px;
        }

        .unread-badge {
          background: #25d366;
          color: white;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 20px;
        }

        .chat-window {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #ece5dd;
        }

        .chat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 16px;
          background: #075e54;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }

        .back-btn {
          background: transparent;
          border: none;
          color: white;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
        }

        .contact-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          cursor: pointer;
        }

        .contact-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
        }

        .contact-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .contact-details h3 {
          font-size: 16px;
          font-weight: 500;
          color: white;
          margin: 0;
        }

        .status {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.8);
        }

        .online-status, .typing-status {
          color: #25d366;
        }

        .messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSIjZTBlMGUwIiBmaWxsLW9wYWNpdHk9IjAuNCIvPjwvc3ZnPg==');
          background-repeat: repeat;
        }

        .date-divider {
          text-align: center;
          margin: 16px 0;
        }

        .date-divider span {
          background: rgba(0, 0, 0, 0.05);
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          color: #667781;
        }

        .message {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          margin: 4px 0;
        }

        .message.sent {
          justify-content: flex-end;
        }

        .message.received {
          justify-content: flex-start;
        }

        .message-avatar {
          width: 36px;
          height: 36px;
          flex-shrink: 0;
        }

        .message-avatar img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }

        .avatar-initials {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 600;
          color: white;
        }

        .message-bubble-wrapper {
          max-width: 65%;
          position: relative;
        }

        .sender-name {
          font-size: 11px;
          font-weight: 600;
          color: #075e54;
          margin-bottom: 2px;
          margin-left: 8px;
        }

        .message-bubble {
          padding: 8px 12px;
          border-radius: 18px;
          box-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
          word-wrap: break-word;
        }

        .sent-bubble {
          background: #dcf8c6;
          border-top-right-radius: 4px;
        }

        .received-bubble {
          background: white;
          border-top-left-radius: 4px;
        }

        .message-text {
          font-size: 14px;
          line-height: 1.4;
          color: #111b21;
          white-space: pre-wrap;
        }

        .message-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 4px;
          margin-top: 4px;
        }

        .message-time {
          font-size: 10px;
          color: #667781;
        }

        .message-status {
          display: inline-flex;
          color: #667781;
        }

        .edited-badge {
          font-size: 9px;
          color: #667781;
          font-style: italic;
        }

        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          padding: 8px 12px;
          border-radius: 18px;
          width: fit-content;
          margin-top: 8px;
        }

        .typing-dots {
          display: flex;
          gap: 4px;
        }

        .typing-dots span {
          width: 6px;
          height: 6px;
          background: #667781;
          border-radius: 50%;
          animation: typing 1.4s infinite ease-in-out;
        }

        .typing-dots span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .typing-dots span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes typing {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.4;
          }
          30% {
            transform: translateY(-6px);
            opacity: 1;
          }
        }

        .typing-text {
          font-size: 12px;
          color: #667781;
        }

        .message-input-container {
          background: white;
          border-top: 1px solid #e9edef;
          padding: 8px 12px;
        }

        .input-area {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .input-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          color: #667781;
        }

        .input-btn:hover {
          background: #f0f2f5;
        }

        .message-input {
          flex: 1;
          border: none;
          background: #f0f2f5;
          border-radius: 30px;
          padding: 10px 16px;
          font-size: 14px;
          outline: none;
          color: #111b21;
        }

        .send-btn {
          background: #075e54;
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: white;
        }

        .send-btn.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .no-chat {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          background: #ece5dd;
          color: #94a3b8;
        }

        .no-chat h3 {
          color: #111b21;
          margin: 0;
        }

        .loading-state {
          text-align: center;
          padding: 60px 20px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e9edef;
          border-top-color: #075e54;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 16px;
        }

        .no-messages {
          text-align: center;
          padding: 60px 20px;
          color: #667781;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .conversations-sidebar {
            width: 100%;
          }

          .conversations-container.chat-open .conversations-sidebar {
            display: none;
          }

          .chat-window {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 1000;
            border-radius: 0;
          }

          .message-bubble-wrapper {
            max-width: 75%;
          }
        }
      `}</style>
    </>
  );
}