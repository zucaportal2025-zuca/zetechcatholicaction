// frontend/src/components/admin/messenger/AdminChatsList.jsx
import React, { useState, useEffect } from 'react';
import { Search, Plus, MoreVertical, MessageCircle } from 'lucide-react';
import { api } from '../../../api';
import { io } from 'socket.io-client';
import BASE_URL from '../../../api';

const AdminChatsList = ({ onSelectChat, onNewChat, darkMode = false }) => {
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await api.get('/api/messenger/conversations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const conversationsData = res.data.conversations || [];
      setConversations(conversationsData);
      console.log('Conversations loaded:', conversationsData);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  
  // Socket connection for online status
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = io(BASE_URL, {
      transports: ['websocket'],
      auth: { token }
    });

    socket.on('connect', () => {
      console.log('Admin chats list socket connected');
      socket.emit('dm:join', currentUser.id);
    });

    socket.on('dm:online_users', ({ users }) => {
      setOnlineUsers(users || []);
    });

    socket.on('dm:user_online', ({ userId }) => {
      setOnlineUsers(prev => [...new Set([...prev, userId])]);
    });

    socket.on('dm:user_offline', ({ userId }) => {
      setOnlineUsers(prev => prev.filter(id => id !== userId));
    });

    socket.on('dm:new_message', () => {
      fetchConversations();
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    fetchConversations();
  }, []);

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const isUserOnline = (userId) => onlineUsers.includes(userId);

  // Filter conversations by search query
  const filteredConversations = conversations.filter(conv => {
    const p = conv.participant;
    return !searchQuery || p?.fullName?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Separate conversations where participant is admin vs regular user
  const adminConversations = filteredConversations.filter(conv => {
    return conv.participant?.role === 'admin';
  });
  
  const regularConversations = filteredConversations.filter(conv => {
    return conv.participant?.role !== 'admin';
  });

  
  return (
    <div className={`chats-list-container ${darkMode ? 'dark' : ''}`}>
      <div className={`chats-header ${darkMode ? 'dark' : ''}`}>
        <div className="logo-section">
          <h2>Messages</h2>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={onNewChat}>
            <Plus size={22} />
          </button>
          <button className="icon-btn" onClick={fetchConversations}>
            <MoreVertical size={22} />
          </button>
        </div>
      </div>

      <div className={`search-container ${darkMode ? 'dark' : ''}`}>
        <div className={`search-box ${darkMode ? 'dark' : ''}`}>
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className={`chats-scroll ${darkMode ? 'dark' : ''}`}>
        {filteredConversations.length === 0 ? (
          <div className={`no-chats ${darkMode ? 'dark' : ''}`}>
            <div className="no-chats-icon">
              <MessageCircle size={48} strokeWidth={1} />
            </div>
            <h3>No conversations yet</h3>
            <p>Start a new chat to begin messaging</p>
            <button className="new-chat-btn" onClick={onNewChat}>
              <Plus size={18} /> New Chat
            </button>
          </div>
        ) : (
          <>
            {/* Admin conversations (pinned at top) */}
            {adminConversations.length > 0 && searchQuery.length === 0 && (
              <div className={`pinned-header ${darkMode ? 'dark' : ''}`}>
                <span className="pinned-icon">📌</span>
                <span>Pinned</span>
              </div>
            )}
            
            {adminConversations.map((conv) => {
              const participant = conv.participant;
              const isOnline = isUserOnline(participant?.id);
              return (
                <div
                  key={conv.id}
                  className={`chat-item pinned-chat ${darkMode ? 'dark' : ''}`}
                  onClick={() => onSelectChat(conv)}
                >
                  <div className="chat-avatar">
                    {participant?.profileImage ? (
                      <img src={participant.profileImage} alt="" />
                    ) : (
                      <div className="avatar-placeholder" style={{ backgroundColor: '#075E54' }}>
                        {participant?.fullName?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                    {isOnline && <div className="online-indicator"></div>}
                    <div className="pinned-crown">👑</div>
                  </div>
                  <div className="chat-info">
                    <div className="chat-name">
                      {participant?.fullName}
                      <span className="admin-badge">Admin</span>
                    </div>
                    <div className="chat-message">
                      <span className="message-text">{conv.lastMessage?.substring(0, 35) || 'No messages yet'}</span>
                    </div>
                  </div>
                  <div className="chat-meta">
                    <div className="chat-time">{formatTime(conv.lastMessageAt)}</div>
                    {conv.unreadCount > 0 && (
                      <div className="unread-badge">{conv.unreadCount}</div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* Regular user conversations */}
            {regularConversations.length > 0 && searchQuery.length === 0 && adminConversations.length > 0 && (
              <div className={`all-chats-header ${darkMode ? 'dark' : ''}`}>
                <span>Chats</span>
              </div>
            )}
            
            {regularConversations.map((conv) => {
              const participant = conv.participant;
              const isOnline = isUserOnline(participant?.id);
              return (
                <div
                  key={conv.id}
                  className={`chat-item ${darkMode ? 'dark' : ''}`}
                  onClick={() => onSelectChat(conv)}
                >
                  <div className="chat-avatar">
                    {participant?.profileImage ? (
                      <img src={participant.profileImage} alt="" />
                    ) : (
                      <div className="avatar-placeholder" style={{ backgroundColor: '#128C7E' }}>
                        {participant?.fullName?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                    {isOnline && <div className="online-indicator"></div>}
                  </div>
                  <div className="chat-info">
                    <div className="chat-name">{participant?.fullName}</div>
                    <div className="chat-message">
                      <span className="message-text">{conv.lastMessage?.substring(0, 35) || 'No messages yet'}</span>
                    </div>
                  </div>
                  <div className="chat-meta">
                    <div className="chat-time">{formatTime(conv.lastMessageAt)}</div>
                    {conv.unreadCount > 0 && (
                      <div className="unread-badge">{conv.unreadCount}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      <style jsx>{`
        .chats-list-container {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #FFFFFF;
        }

        .chats-list-container.dark {
          background: #111B21;
        }

        .chats-header {
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #075E54;
        }

        .chats-header.dark {
          background: #202C33;
        }

        .logo-section h2 {
          font-size: 18px;
          font-weight: 600;
          color: #FFFFFF;
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
          color: #FFFFFF;
          transition: all 0.2s;
        }

        .icon-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .search-container {
          padding: 12px 16px;
          background: #FFFFFF;
        }

        .search-container.dark {
          background: #111B21;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #F0F2F5;
          border-radius: 30px;
          padding: 8px 16px;
        }

        .search-box.dark {
          background: #202C33;
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
          color: #111B21;
        }

        .search-box.dark input {
          color: #E9EDEF;
        }

        .chats-scroll {
          flex: 1;
          overflow-y: auto;
          background: #FFFFFF;
        }

        .chats-scroll.dark {
          background: #111B21;
        }

        .pinned-header {
          padding: 8px 16px;
          background: #F8F9FA;
          font-size: 12px;
          color: #667781;
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid #E9EDEF;
        }

        .pinned-header.dark {
          background: #202C33;
          color: #8696A0;
          border-bottom-color: #2A3942;
        }

        .all-chats-header {
          padding: 8px 16px;
          background: #F8F9FA;
          font-size: 12px;
          color: #667781;
          border-bottom: 1px solid #E9EDEF;
        }

        .all-chats-header.dark {
          background: #202C33;
          color: #8696A0;
          border-bottom-color: #2A3942;
        }

        .chat-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 16px;
          cursor: pointer;
          transition: background 0.2s;
          border-bottom: 1px solid #E9EDEF;
        }

        .chat-item.dark {
          border-bottom-color: #2A3942;
        }

        .chat-item.pinned-chat {
          background: #F8F9FA;
        }

        .chat-item.pinned-chat.dark {
          background: #202C33;
        }

        .chat-item:hover {
          background: #F5F6F6;
        }

        .chat-item.dark:hover {
          background: #2A3942;
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
          background: #25D366;
          border-radius: 50%;
          border: 2px solid #FFFFFF;
        }

        .pinned-crown {
          position: absolute;
          top: -4px;
          right: -4px;
          font-size: 14px;
        }

        .chat-info {
          flex: 1;
          min-width: 0;
        }

        .chat-name {
          font-size: 16px;
          font-weight: 500;
          color: #111B21;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .chat-item.dark .chat-name {
          color: #E9EDEF;
        }

        .admin-badge {
          font-size: 10px;
          background: #075E54;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
        }

        .chat-message {
          font-size: 13px;
          color: #667781;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .chat-item.dark .chat-message {
          color: #8696A0;
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

        .chat-item.dark .chat-time {
          color: #8696A0;
        }

        .unread-badge {
          background: #25D366;
          color: white;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 20px;
          min-width: 20px;
          text-align: center;
        }

        .no-chats {
          text-align: center;
          padding: 60px 20px;
        }

        .no-chats h3 {
          font-size: 18px;
          color: #111B21;
          margin-bottom: 8px;
        }

        .no-chats p {
          font-size: 14px;
          color: #667781;
          margin-bottom: 24px;
        }

        .new-chat-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #075E54;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 30px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }

        .chats-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 16px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #E9EDEF;
          border-top-color: #075E54;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .chat-avatar {
            width: 48px;
            height: 48px;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminChatsList;