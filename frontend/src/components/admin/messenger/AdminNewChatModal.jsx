// frontend/src/components/admin/messenger/AdminNewChatModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, Mail, Phone, Loader } from 'lucide-react';
import { api } from '../../../api';

const AdminNewChatModal = ({ onClose, onChatStart }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startingChat, setStartingChat] = useState(null);
  const inputRef = useRef(null);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    inputRef.current?.focus();
    loadAllUsers();
  }, []);

  const loadAllUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await api.get('/api/messenger/search/all-users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const filteredUsers = (res.data.users || []).filter(u => u.id !== currentUser.id);
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query) => {
    if (query.length < 2) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await api.get(`/api/messenger/search/users?q=${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const filteredUsers = (res.data.users || []).filter(u => u.id !== currentUser.id);
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const debounce = setTimeout(() => searchUsers(searchQuery), 300);
      return () => clearTimeout(debounce);
    } else if (searchQuery.length === 0) {
      loadAllUsers();
    }
  }, [searchQuery]);

  const handleStartChat = async (selectedUser) => {
    setStartingChat(selectedUser.id);
    try {
      const token = localStorage.getItem('token');
      const res = await api.post(`/api/messenger/conversations/${selectedUser.id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.conversation) {
        onChatStart(res.data.conversation);
        onClose();
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      alert('Failed to start conversation. Please try again.');
    } finally {
      setStartingChat(null);
    }
  };

  const getAvatarColor = (name) => {
    const colors = ['#075E54', '#128C7E', '#25D366', '#34B7F1', '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#10b981'];
    const index = (name?.length || 0) % colors.length;
    return colors[index];
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>New Chat</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

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
            users.map((user) => {
              const isAdmin = user.role === 'admin';
              return (
                <div
                  key={user.id}
                  className="user-item"
                  onClick={() => handleStartChat(user)}
                >
                  <div className="user-avatar">
                    {user.profileImage ? (
                      <img src={user.profileImage} alt={user.fullName} />
                    ) : (
                      <div className="avatar-placeholder" style={{ backgroundColor: getAvatarColor(user.fullName) }}>
                        {user.fullName?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="user-info">
                    <div className="user-name">
                      {user.fullName}
                      {isAdmin && <span className="admin-badge">Admin</span>}
                    </div>
                    <div className="user-details">
                      {user.email && (
                        <span className="user-email">
                          <Mail size={12} />
                          {user.email}
                        </span>
                      )}
                      {user.phone && (
                        <span className="user-phone">
                          <Phone size={12} />
                          {user.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <button 
                    className="start-chat-btn"
                    disabled={startingChat === user.id}
                  >
                    {startingChat === user.id ? (
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
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          animation: modalIn 0.2s ease;
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

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: #075E54;
          color: white;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 18px;
        }

        .close-btn {
          background: transparent;
          border: none;
          color: white;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

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
        }

        .users-list {
          flex: 1;
          overflow-y: auto;
        }

        .loading-state, .empty-state {
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

        .user-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 16px;
          cursor: pointer;
          border-bottom: 1px solid #E9EDEF;
          transition: background 0.2s;
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

        .user-email, .user-phone {
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
          cursor: pointer;
          transition: background 0.2s;
        }

        .start-chat-btn:hover:not(:disabled) {
          background: #054a42;
        }

        .start-chat-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .user-avatar {
            width: 42px;
            height: 42px;
          }
          
          .user-name {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminNewChatModal;