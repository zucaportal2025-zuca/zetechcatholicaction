// frontend/src/components/messenger/NewChatModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, Mail, Phone, Loader, Users } from 'lucide-react';
import { useMessenger } from '../../contexts/MessengerContext';

// Helper function to get executive badge info
const getExecutiveBadge = (role, executivePosition) => {
  if (role === 'admin') return { text: 'Admin', color: '#075E54', icon: '👑' };
  
  const badgeMap = {
    'Chairperson': { text: 'Chairperson', color: '#3b82f6', icon: '👑' },
    'Secretary': { text: 'Secretary', color: '#8b5cf6', icon: '📋' },
    'Treasurer': { text: 'Treasurer', color: '#f59e0b', icon: '💰' },
    'Choir Moderator': { text: 'Choir', color: '#10b981', icon: '🎵' },
    'Media Moderator': { text: 'Media', color: '#ef4444', icon: '📸' },
    'Jumuia Leader': { text: 'Jumuia Leader', color: '#06b6d4', icon: '👥' }
  };
  
  for (const [key, value] of Object.entries(badgeMap)) {
    if (executivePosition?.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  
  if (executivePosition) {
    return { text: executivePosition, color: '#64748b', icon: '⭐' };
  }
  
  return null;
};

const NewChatModal = ({ onClose, onChatStart }) => {
  const { searchUsers, startConversation, user, fetchAllUsers } = useMessenger();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startingChat, setStartingChat] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    loadAllUsers();
  }, []);

  // Load all users on mount
  const loadAllUsers = async () => {
    setLoading(true);
    try {
      const usersList = await fetchAllUsers();
      setUsers(usersList);
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Search users when query changes
  useEffect(() => {
    const search = async () => {
      if (searchQuery.length >= 2) {
        setLoading(true);
        const results = await searchUsers(searchQuery);
        setUsers(results);
        setLoading(false);
      } else if (searchQuery.length === 0) {
        // Show all users when search is empty
        loadAllUsers();
      }
    };
    
    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleStartChat = async (selectedUser) => {
    setStartingChat(selectedUser.id);
    const conversation = await startConversation(selectedUser.id);
    if (conversation) {
      onChatStart(conversation);
    }
    setStartingChat(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h3>New Chat</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Search Input */}
        <div className="search-section">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Users List - Shows ALL users */}
        <div className="users-list">
          {loading ? (
            <div className="loading-state">
              <Loader size={32} className="spin" />
              <p>{searchQuery ? 'Searching users...' : 'Loading users...'}</p>
            </div>
          ) : users.length === 0 ? (
            <div className="empty-state">
              <User size={48} strokeWidth={1} />
              <p>{searchQuery ? 'No users found' : 'No other users available'}</p>
            </div>
          ) : (
            users.map((searchUser) => {
              const badge = getExecutiveBadge(searchUser.role, searchUser.executivePosition);
              
              return (
                <div
                  key={searchUser.id}
                  className="user-item"
                  onClick={() => handleStartChat(searchUser)}
                >
                  <div className="user-avatar">
                    {searchUser.profileImage ? (
                      <img src={searchUser.profileImage} alt={searchUser.fullName} />
                    ) : (
                      <div className="avatar-placeholder" style={{ backgroundColor: badge?.color || '#075E54' }}>
                        {searchUser.fullName?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="user-info">
                    <div className="user-name">
                      {searchUser.fullName}
                      {badge && (
                        <span className="executive-badge" style={{ background: badge.color }}>
                          {badge.icon} {badge.text}
                        </span>
                      )}
                      {searchUser.role === 'admin' && !badge && (
                        <span className="admin-badge">Admin</span>
                      )}
                    </div>
                    <div className="user-details">
                      {searchUser.email && (
                        <span className="user-email">
                          <Mail size={12} />
                          {searchUser.email}
                        </span>
                      )}
                      {searchUser.phone && (
                        <span className="user-phone">
                          <Phone size={12} />
                          {searchUser.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <button 
                    className="start-chat-btn"
                    disabled={startingChat === searchUser.id}
                  >
                    {startingChat === searchUser.id ? (
                      <Loader size={16} className="spin" />
                    ) : (
                      'Message'
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .modal-container {
            width: 90%;
            max-width: 500px;
            background: #FFFFFF;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
            animation: modalIn 0.2s ease;
            display: flex;
            flex-direction: column;
            max-height: 90vh;
          }

          @keyframes modalIn {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }

          /* Header */
          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            background: #075E54;
            color: #FFFFFF;
          }

          .modal-header h3 {
            font-size: 18px;
            font-weight: 500;
            margin: 0;
          }

          .close-btn {
            background: transparent;
            border: none;
            color: #FFFFFF;
            cursor: pointer;
            padding: 8px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
          }

          .close-btn:hover {
            background: rgba(255, 255, 255, 0.1);
          }

          /* Search Section */
          .search-section {
            padding: 16px;
            border-bottom: 1px solid #E9EDEF;
          }

          .search-box {
            display: flex;
            align-items: center;
            gap: 12px;
            background: #F0F2F5;
            border-radius: 30px;
            padding: 10px 16px;
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

          .search-box input::placeholder {
            color: #667781;
          }

          /* Users List - Scrollable */
          .users-list {
            flex: 1;
            overflow-y: auto;
            max-height: 500px;
          }

          .loading-state,
          .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #667781;
          }

          .loading-state p,
          .empty-state p {
            margin-top: 12px;
            font-size: 14px;
          }

          .spin {
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          /* User Item */
          .user-item {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 12px 16px;
            cursor: pointer;
            transition: background 0.2s;
            border-bottom: 1px solid #E9EDEF;
          }

          .user-item:hover {
            background: #F5F6F6;
          }

          .user-avatar {
            width: 48px;
            height: 48px;
            flex-shrink: 0;
          }

          .user-avatar img {
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
            font-size: 20px;
            font-weight: 600;
            color: white;
          }

          .user-info {
            flex: 1;
            min-width: 0;
          }

          .user-name {
            font-size: 15px;
            font-weight: 500;
            color: #111B21;
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 6px;
            flex-wrap: wrap;
          }

          .executive-badge {
            font-size: 9px;
            padding: 2px 8px;
            border-radius: 12px;
            font-weight: 500;
            color: white;
            display: inline-flex;
            align-items: center;
            gap: 3px;
          }

          .admin-badge {
            font-size: 10px;
            background: #075E54;
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
          }

          .user-details {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
          }

          .user-email,
          .user-phone {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 11px;
            color: #667781;
          }

          .start-chat-btn {
            background: #075E54;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .start-chat-btn:hover:not(:disabled) {
            background: #054a42;
          }

          .start-chat-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }

          /* Mobile */
          @media (max-width: 768px) {
            .modal-container {
              width: 95%;
              max-height: 90vh;
            }
            
            .user-item {
              padding: 10px 14px;
            }
            
            .user-avatar {
              width: 42px;
              height: 42px;
            }
            
            .executive-badge {
              font-size: 8px;
              padding: 1px 6px;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default NewChatModal;