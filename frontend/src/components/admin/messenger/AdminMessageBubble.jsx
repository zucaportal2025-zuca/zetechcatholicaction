// frontend/src/components/admin/messenger/AdminMessageBubble.jsx
import React, { useState } from 'react';
import { Check, CheckCheck, Download, File, Image, Music, Film, X, Smile, Edit, Trash2 } from 'lucide-react';

const AdminMessageBubble = ({ message, isOwn, onDelete, onEdit, onReaction, showAvatar = false, senderName = '' }) => {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || '');

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return <Image size={16} />;
    if (type?.startsWith('video/')) return <Film size={16} />;
    if (type?.startsWith('audio/')) return <Music size={16} />;
    return <File size={16} />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const reactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  const handleEdit = () => {
    setIsEditing(true);
    setShowActions(false);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete(message.id);
    setShowActions(false);
  };

  const getAvatarColor = () => {
    const colors = ['#075E54', '#128C7E', '#25D366', '#34B7F1', '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#10b981'];
    const name = senderName || message.sender?.fullName || '?';
    const index = name.length % colors.length;
    return colors[index];
  };

  return (
    <div className={`message-wrapper ${isOwn ? 'own' : 'other'}`}>
      {!isOwn && showAvatar && (
        <div className="message-avatar">
          {message.sender?.profileImage ? (
            <img src={message.sender.profileImage} alt="" />
          ) : (
            <div className="avatar-initials" style={{ backgroundColor: getAvatarColor() }}>
              {senderName?.charAt(0)?.toUpperCase() || message.sender?.fullName?.charAt(0)?.toUpperCase()}
            </div>
          )}
        </div>
      )}
      
      <div className="message-container">
        {!isOwn && showAvatar && senderName && (
          <div className="sender-name">{senderName}</div>
        )}
        
        <div className={`message-bubble ${isOwn ? 'sent-bubble' : 'received-bubble'}`}>
          {isEditing ? (
            <div className="edit-mode">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                autoFocus
                className="edit-input"
              />
              <div className="edit-actions">
                <button onClick={() => setIsEditing(false)} className="edit-cancel">Cancel</button>
                <button onClick={handleSaveEdit} className="edit-save">Save</button>
              </div>
            </div>
          ) : (
            <>
              {message.files && message.files.length > 0 && (
                <div className="message-files">
                  {message.files.map((file) => (
                    <div key={file.id} className="file-attachment">
                      {file.type?.startsWith('image/') ? (
                        <div className="image-preview">
                          <img src={file.url} alt={file.name} />
                        </div>
                      ) : (
                        <div className="file-info">
                          {getFileIcon(file.type)}
                          <div className="file-details">
                            <span className="file-name">{file.name}</span>
                            <span className="file-size">{formatFileSize(file.size)}</span>
                          </div>
                          <button className="download-btn" onClick={() => window.open(file.url, '_blank')}>
                            <Download size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {message.content && (
                <div className="message-text">{message.content}</div>
              )}

              <div className="message-footer">
                <span className="message-time">{formatTime(message.createdAt)}</span>
                {isOwn && (
                  <span className="message-status">
                    {message.isRead ? <CheckCheck size={12} /> : <Check size={12} />}
                  </span>
                )}
                {message.isEdited && <span className="edited-badge">edited</span>}
              </div>

              <button 
                className="reaction-trigger"
                onClick={() => setShowReactions(!showReactions)}
              >
                <Smile size={14} />
              </button>

              <button 
                className="action-trigger"
                onClick={() => setShowActions(!showActions)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="6" r="2"/>
                  <circle cx="12" cy="12" r="2"/>
                  <circle cx="12" cy="18" r="2"/>
                </svg>
              </button>
            </>
          )}
        </div>

        {message.reactionCounts && Object.keys(message.reactionCounts).length > 0 && (
          <div className="reactions-display">
            {Object.entries(message.reactionCounts).map(([reaction, count]) => (
              <span key={reaction} className="reaction-badge">
                {reaction} {count > 1 && count}
              </span>
            ))}
          </div>
        )}
      </div>

      {showActions && !isEditing && (
        <div className="actions-menu" onClick={(e) => e.stopPropagation()}>
          <div className="actions-list">
            {isOwn && (
              <>
                <button className="action-item" onClick={handleEdit}>
                  <Edit size={16} />
                  <span>Edit</span>
                </button>
                <button className="action-item danger" onClick={handleDelete}>
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>
              </>
            )}
            <button className="action-item" onClick={() => {
              setShowActions(false);
              setShowReactions(true);
            }}>
              <Smile size={16} />
              <span>React</span>
            </button>
          </div>
        </div>
      )}

      {showReactions && (
        <div className="reactions-picker" onClick={(e) => e.stopPropagation()}>
          {reactions.map((reaction) => (
            <button
              key={reaction}
              className="reaction-option"
              onClick={() => {
                onReaction(reaction);
                setShowReactions(false);
              }}
            >
              {reaction}
            </button>
          ))}
          <button className="reaction-close" onClick={() => setShowReactions(false)}>
            <X size={14} />
          </button>
        </div>
      )}

      <style jsx>{`
        .message-wrapper {
          display: flex;
          margin: 8px 0;
          gap: 8px;
          align-items: flex-start;
        }

        .message-wrapper.own {
          justify-content: flex-end;
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

        .message-container {
          max-width: 65%;
          position: relative;
        }

        .sender-name {
          font-size: 11px;
          font-weight: 600;
          color: #075E54;
          margin-bottom: 2px;
          margin-left: 8px;
        }

        .message-bubble {
          position: relative;
          padding: 8px 12px;
          border-radius: 18px;
          background: ${isOwn ? '#DCF8C6' : '#FFFFFF'};
          box-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
        }

        .received-bubble {
          border-top-left-radius: 4px;
        }

        .sent-bubble {
          border-top-right-radius: 4px;
        }

        .message-files {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: ${message.content ? '8px' : '0'};
        }

        .image-preview {
          max-width: 200px;
          max-height: 200px;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
        }

        .image-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .file-info {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(0, 0, 0, 0.03);
          padding: 10px;
          border-radius: 12px;
        }

        .file-details {
          flex: 1;
        }

        .file-name {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #111B21;
          word-break: break-all;
        }

        .file-size {
          display: block;
          font-size: 10px;
          color: #667781;
        }

        .download-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 6px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #667781;
        }

        .download-btn:hover {
          background: rgba(0, 0, 0, 0.05);
        }

        .message-text {
          line-height: 1.4;
          color: #111B21;
          word-wrap: break-word;
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

        .reaction-trigger, .action-trigger {
          position: absolute;
          bottom: -8px;
          background: #FFFFFF;
          border: none;
          border-radius: 50%;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
          color: #667781;
        }

        .reaction-trigger {
          right: 24px;
        }

        .action-trigger {
          right: -4px;
        }

        .message-bubble:hover .reaction-trigger,
        .message-bubble:hover .action-trigger {
          opacity: 1;
        }

        .edit-mode {
          min-width: 200px;
        }

        .edit-input {
          width: 100%;
          padding: 8px;
          border: 1px solid #E9EDEF;
          border-radius: 12px;
          font-size: 14px;
          resize: vertical;
          font-family: inherit;
        }

        .edit-actions {
          display: flex;
          gap: 8px;
          margin-top: 8px;
          justify-content: flex-end;
        }

        .edit-cancel, .edit-save {
          padding: 4px 12px;
          border-radius: 16px;
          border: none;
          font-size: 12px;
          cursor: pointer;
        }

        .edit-cancel {
          background: #E9EDEF;
          color: #667781;
        }

        .edit-save {
          background: #075E54;
          color: white;
        }

        .actions-menu {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.3);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .actions-list {
          background: #FFFFFF;
          border-radius: 16px;
          width: 200px;
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
          padding: 12px 16px;
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

        .reactions-display {
          display: flex;
          gap: 2px;
          margin-top: 2px;
          margin-left: 8px;
          justify-content: flex-start;
        }

        .reaction-badge {
          background: #FFFFFF;
          border-radius: 20px;
          padding: 2px 6px;
          font-size: 12px;
          box-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
          border: 1px solid #E9EDEF;
        }

        .reactions-picker {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: #FFFFFF;
          border-radius: 30px;
          padding: 6px 12px;
          display: flex;
          gap: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
          z-index: 10;
          margin-bottom: 8px;
        }

        .reaction-option {
          background: transparent;
          border: none;
          font-size: 20px;
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
          transition: transform 0.1s;
        }

        .reaction-option:hover {
          transform: scale(1.2);
          background: #F0F2F5;
        }

        .reaction-close {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #667781;
        }

        @media (max-width: 768px) {
          .message-container {
            max-width: 75%;
          }
          
          .image-preview {
            max-width: 150px;
            max-height: 150px;
          }
          
          .message-avatar {
            width: 32px;
            height: 32px;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminMessageBubble;