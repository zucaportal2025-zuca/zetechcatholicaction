// frontend/src/components/messenger/ChatInfoDrawer.jsx
import React, { useState } from 'react';
import { X, Phone, Mail, MoreVertical, Star, Archive, Trash2, Flag, Ban, User, Shield, Crown, Award, Briefcase, Users } from 'lucide-react';
import { useMessenger } from '../../contexts/MessengerContext';

// Helper function to get executive badge info
const getExecutiveBadge = (role, executivePosition, specialRole) => {
  // Admin takes priority
  if (role === 'admin') return { text: 'Admin', color: '#075E54', icon: '👑' };
  
  // Check executive position first (from executive system)
  const executiveMap = {
    'Chairperson': { text: 'Chairperson', color: '#3b82f6', icon: '👑' },
    'Secretary': { text: 'Secretary', color: '#8b5cf6', icon: '📋' },
    'Treasurer': { text: 'Treasurer', color: '#f59e0b', icon: '💰' },
    'Choir Moderator': { text: 'Choir Moderator', color: '#10b981', icon: '🎵' },
    'Media Moderator': { text: 'Media Moderator', color: '#ef4444', icon: '📸' },
    'Jumuia Leader': { text: 'Jumuia Leader', color: '#06b6d4', icon: '👥' }
  };
  
  for (const [key, value] of Object.entries(executiveMap)) {
    if (executivePosition?.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  
  // Check special role (from user table)
  const specialRoleMap = {
    'jumuia_leader': { text: 'Jumuia Leader', color: '#06b6d4', icon: '👥' },
    'treasurer': { text: 'Treasurer', color: '#f59e0b', icon: '💰' },
    'secretary': { text: 'Secretary', color: '#8b5cf6', icon: '📋' },
    'choir_moderator': { text: 'Choir Moderator', color: '#10b981', icon: '🎵' },
    'media_moderator': { text: 'Media Moderator', color: '#ef4444', icon: '📸' }
  };
  
  if (specialRole && specialRoleMap[specialRole]) {
    return specialRoleMap[specialRole];
  }
  
  if (executivePosition) {
    return { text: executivePosition, color: '#64748b', icon: '⭐' };
  }
  
  return null;
};

// Helper to format special role display name
const formatSpecialRole = (specialRole) => {
  const roleMap = {
    'jumuia_leader': 'Jumuia Leader',
    'treasurer': 'Treasurer',
    'secretary': 'Secretary',
    'choir_moderator': 'Choir Moderator',
    'media_moderator': 'Media Moderator'
  };
  return roleMap[specialRole] || specialRole;
};

const ChatInfoDrawer = ({ conversation, onClose, onBack, isMobile = false }) => {
  const { user, onlineUsers, blockUser, reportUser, deleteConversation, archiveConversation, clearConversation } = useMessenger();
  const [showActions, setShowActions] = useState(false);
  
  const participant = conversation?.participant;
  const isOnline = onlineUsers.includes(participant?.id);
  const isBlocked = false;
  
  const badge = getExecutiveBadge(participant?.role, participant?.executivePosition, participant?.specialRole);
  const isAdmin = participant?.role === 'admin';
  const hasExecutivePosition = !!participant?.executivePosition;
  const hasSpecialRole = !!participant?.specialRole && participant?.specialRole !== 'jumuia_leader';

  const handleBlock = async () => {
    if (window.confirm(`Block ${participant?.fullName}? They won't be able to message you.`)) {
      await blockUser(participant?.id);
      onClose();
    }
  };

  const handleReport = async () => {
    const reason = prompt('Why are you reporting this user?');
    if (reason) {
      await reportUser(participant?.id, reason);
      alert('User reported. Our team will review.');
    }
  };

 const handleDeleteChat = async () => {
  if (window.confirm(`Delete chat with ${participant?.fullName}? This cannot be undone.`)) {
    await deleteConversation(conversation?.id);
    onClose();  // Close the drawer
    
    // ✅ Also need to go back to chat list
    // The onBack function needs to be passed from parent
    if (onBack) {
      onBack();
    }
  }
};

  const handleArchive = async () => {
    await archiveConversation(conversation?.id);
    onClose();
  };

  // ✅ ADDED: Clear Chat handler
  const handleClearChat = async () => {
    if (window.confirm(`Clear all messages in this chat? This action cannot be undone.`)) {
      try {
        await clearConversation(conversation?.id);
        onClose();
        alert('Chat cleared successfully');
      } catch (error) {
        console.error('Error clearing chat:', error);
        alert('Failed to clear chat');
      }
    }
  };

  const getInitials = (name) => {
    return name?.charAt(0)?.toUpperCase() || '?';
  };

  return (
    <div className={`info-drawer ${isMobile ? 'mobile' : ''}`}>
      {/* Header */}
      <div className="drawer-header">
        <button className="back-btn" onClick={onClose}>
          <X size={20} />
        </button>
        <h3>Contact Info</h3>
        <button className="menu-btn" onClick={() => setShowActions(!showActions)}>
          <MoreVertical size={20} />
        </button>
      </div>

      {/* Actions Menu */}
      {showActions && (
        <div className="actions-menu" onClick={() => setShowActions(false)}>
          <div className="actions-list">
            <button onClick={handleArchive} className="action-item">
              <Archive size={18} />
              <span>Archive Chat</span>
            </button>
            <button onClick={handleClearChat} className="action-item">
              <Trash2 size={18} />
              <span>Clear Chat</span>
            </button>
            <button onClick={handleDeleteChat} className="action-item danger">
              <Trash2 size={18} />
              <span>Delete Chat</span>
            </button>
            <button onClick={handleBlock} className="action-item danger">
              <Ban size={18} />
              <span>Block User</span>
            </button>
            <button onClick={handleReport} className="action-item danger">
              <Flag size={18} />
              <span>Report User</span>
            </button>
          </div>
        </div>
      )}

      {/* Avatar Section with Badge */}
      <div className="avatar-section">
        <div className="large-avatar">
          {participant?.profileImage ? (
            <img src={participant.profileImage} alt={participant.fullName} />
          ) : (
            <div className="avatar-placeholder" style={{ backgroundColor: badge?.color || '#075E54' }}>
              {getInitials(participant?.fullName)}
            </div>
          )}
          {badge && (
            <div className="role-crown" style={{ backgroundColor: badge.color }}>
              {badge.icon}
            </div>
          )}
        </div>
        <h2>{participant?.fullName}</h2>
        {badge && (
          <div className="role-badge" style={{ background: badge.color }}>
            {badge.icon} {badge.text}
          </div>
        )}
        <div className="status-badge">
          {isOnline ? (
            <span className="online">🟢 Online</span>
          ) : (
            <span className="offline">⚫ Offline</span>
          )}
        </div>
      </div>

      {/* Contact Info */}
      <div className="info-section">
        <h4>Contact Information</h4>
        
        {/* Role Information */}
        <div className="info-row">
          <Shield size={18} className="info-icon" />
          <div className="info-details">
            <span className="info-label">Account Type</span>
            <span className="info-value">
              {isAdmin ? 'Administrator' : 'Member'}
            </span>
          </div>
        </div>
        
        {/* Executive Position (from executive system) */}
        {hasExecutivePosition && (
          <div className="info-row">
            <Crown size={18} className="info-icon" />
            <div className="info-details">
              <span className="info-label">Executive Position</span>
              <span className="info-value">{participant.executivePosition}</span>
            </div>
          </div>
        )}
        
        {/* Special Role (from user table - for non-leaders) */}
        {hasSpecialRole && (
          <div className="info-row">
            <Award size={18} className="info-icon" />
            <div className="info-details">
              <span className="info-label">Special Role</span>
              <span className="info-value">{formatSpecialRole(participant.specialRole)}</span>
            </div>
          </div>
        )}
        
        {/* Jumuia Leader (if applicable) */}
        {participant?.specialRole === 'jumuia_leader' && (
          <div className="info-row">
            <Briefcase size={18} className="info-icon" />
            <div className="info-details">
              <span className="info-label">Leading Jumuia</span>
              <span className="info-value">{participant.leadingJumuia?.name || 'Assigned Jumuia'}</span>
            </div>
          </div>
        )}
        
        {/* Home Jumuia */}
        {participant?.homeJumuia?.name && (
          <div className="info-row">
            <Users size={18} className="info-icon" />
            <div className="info-details">
              <span className="info-label">Home Jumuia</span>
              <span className="info-value">{participant.homeJumuia.name}</span>
            </div>
          </div>
        )}
        
        {participant?.phone && (
          <div className="info-row">
            <Phone size={18} className="info-icon" />
            <div className="info-details">
              <span className="info-label">Phone</span>
              <span className="info-value">{participant.phone}</span>
            </div>
            <a href={`tel:${participant.phone}`} className="info-action">Call</a>
          </div>
        )}
        
        {participant?.email && (
          <div className="info-row">
            <Mail size={18} className="info-icon" />
            <div className="info-details">
              <span className="info-label">Email</span>
              <span className="info-value">{participant.email}</span>
            </div>
            <a href={`mailto:${participant.email}`} className="info-action">Email</a>
          </div>
        )}
      </div>

      {/* Media Section (Recent files) */}
      {conversation?.recentFiles && conversation.recentFiles.length > 0 && (
        <div className="media-section">
          <h4>Media</h4>
          <div className="media-grid">
            {conversation.recentFiles.slice(0, 6).map((file, idx) => (
              <div key={idx} className="media-item" onClick={() => window.open(file.url, '_blank')}>
                {file.type?.startsWith('image/') ? (
                  <img src={file.url} alt={file.name} />
                ) : (
                  <div className="file-placeholder">📄</div>
                )}
              </div>
            ))}
          </div>
          {conversation.recentFiles.length > 6 && (
            <button className="view-all-btn">View All Media</button>
          )}
        </div>
      )}

      {/* Blocked Warning */}
      {isBlocked && (
        <div className="blocked-warning">
          <Shield size={20} />
          <div>
            <strong>You've blocked {participant?.fullName}</strong>
            <p>You won't receive messages from this contact.</p>
          </div>
          <button className="unblock-btn">Unblock</button>
        </div>
      )}

      <style jsx>{`
        .info-drawer {
          height: 100%;
          background: #FFFFFF;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }

        .info-drawer.mobile {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          z-index: 100;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        .drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background: #075E54;
          color: #FFFFFF;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .back-btn, .menu-btn {
          background: transparent;
          border: none;
          color: #FFFFFF;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .back-btn:hover, .menu-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .drawer-header h3 {
          font-size: 16px;
          font-weight: 500;
          margin: 0;
        }

        .actions-menu {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .actions-list {
          background: #FFFFFF;
          border-radius: 16px;
          width: 280px;
          overflow: hidden;
          animation: menuIn 0.2s ease;
        }

        @keyframes menuIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .action-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 20px;
          background: transparent;
          border: none;
          width: 100%;
          text-align: left;
          cursor: pointer;
          transition: background 0.2s;
          font-size: 14px;
          color: #111B21;
        }

        .action-item:hover {
          background: #F5F6F6;
        }

        .action-item.danger {
          color: #EF4444;
        }

        .avatar-section {
          text-align: center;
          padding: 32px 20px;
          border-bottom: 1px solid #E9EDEF;
        }

        .large-avatar {
          position: relative;
          width: 120px;
          height: 120px;
          margin: 0 auto 16px;
        }

        .large-avatar img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }

        .avatar-placeholder {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: linear-gradient(135deg, #075E54, #128C7E);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 48px;
          font-weight: 600;
        }

        .role-crown {
          position: absolute;
          bottom: 4px;
          right: 4px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          border: 3px solid #FFFFFF;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .avatar-section h2 {
          font-size: 20px;
          font-weight: 500;
          color: #111B21;
          margin-bottom: 8px;
        }

        .role-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          color: white;
          margin-bottom: 8px;
        }

        .status-badge {
          font-size: 13px;
        }

        .online {
          color: #25D366;
        }

        .offline {
          color: #667781;
        }

        .info-section {
          padding: 20px;
          border-bottom: 1px solid #E9EDEF;
        }

        .info-section h4 {
          font-size: 14px;
          font-weight: 500;
          color: #667781;
          margin-bottom: 16px;
        }

        .info-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 0;
          border-bottom: 1px solid #E9EDEF;
        }

        .info-row:last-child {
          border-bottom: none;
        }

        .info-icon {
          color: #667781;
          flex-shrink: 0;
        }

        .info-details {
          flex: 1;
        }

        .info-label {
          display: block;
          font-size: 11px;
          color: #667781;
          margin-bottom: 2px;
        }

        .info-value {
          font-size: 14px;
          color: #111B21;
        }

        .info-action {
          color: #075E54;
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          padding: 6px 12px;
          border-radius: 20px;
          background: #F0F2F5;
        }

        .media-section {
          padding: 20px;
          border-bottom: 1px solid #E9EDEF;
        }

        .media-section h4 {
          font-size: 14px;
          font-weight: 500;
          color: #667781;
          margin-bottom: 16px;
        }

        .media-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4px;
          margin-bottom: 12px;
        }

        .media-item {
          aspect-ratio: 1;
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
        }

        .media-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .file-placeholder {
          width: 100%;
          height: 100%;
          background: #F0F2F5;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }

        .view-all-btn {
          background: transparent;
          border: none;
          color: #075E54;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          padding: 8px;
        }

        .blocked-warning {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          background: #FEF3C7;
          margin: 20px;
          border-radius: 12px;
        }

        .blocked-warning strong {
          font-size: 14px;
          color: #92400E;
        }

        .blocked-warning p {
          font-size: 12px;
          color: #92400E;
          margin: 0;
        }

        .unblock-btn {
          background: #F59E0B;
          border: none;
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default ChatInfoDrawer;