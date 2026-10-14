// frontend/src/components/messenger/MessageBubble.jsx
import React, { useState } from 'react';
import { Check, CheckCheck, Download, File, Image, Music, Film, X, Smile } from 'lucide-react';
import { useMessenger } from '../../contexts/MessengerContext';

const MessageBubble = ({ message, isOwn, onReaction, showAvatar = false, senderName = '' }) => {
  const { fontSize } = useMessenger();
  const [showReactions, setShowReactions] = useState(false);

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

  const handleReactionClick = (reaction) => {
    onReaction(reaction);
    setShowReactions(false);
  };

  const getAvatarUrl = () => {
    if (message.sender?.profileImage) {
      return message.sender.profileImage;
    }
    return null;
  };

  const getInitials = () => {
    const name = senderName || message.sender?.fullName || '?';
    return name.charAt(0).toUpperCase();
  };

  const getAvatarColor = () => {
    const colors = [
      '#075E54', '#128C7E', '#25D366', '#34B7F1',
      '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#10b981'
    ];
    const name = senderName || message.sender?.fullName || '?';
    const index = name.length % colors.length;
    return colors[index];
  };

  // Get font size class
  const getFontSizeClass = () => {
    switch(fontSize) {
      case 'small': return 'text-small';
      case 'large': return 'text-large';
      default: return 'text-medium';
    }
  };

  return (
    <div className={`message-wrapper ${isOwn ? 'own' : 'other'}`}>
      {/* Avatar for received messages on LEFT */}
      {!isOwn && showAvatar && (
        <div className="message-avatar message-avatar-left">
          {getAvatarUrl() ? (
            <img src={getAvatarUrl()} alt={senderName || message.sender?.fullName} />
          ) : (
            <div className="avatar-initials" style={{ backgroundColor: getAvatarColor() }}>
              {getInitials()}
            </div>
          )}
        </div>
      )}
      
      {/* Avatar for own messages on RIGHT */}
      {isOwn && showAvatar && (
        <div className="message-avatar message-avatar-right">
          {getAvatarUrl() ? (
            <img src={getAvatarUrl()} alt="You" />
          ) : (
            <div className="avatar-initials" style={{ backgroundColor: getAvatarColor() }}>
              {getInitials()}
            </div>
          )}
        </div>
      )}
      
      {/* Spacer when no avatar */}
      {!showAvatar && <div className="message-avatar-spacer"></div>}
      
      <div className="message-container">
        {!isOwn && showAvatar && senderName && (
          <div className="sender-name">{senderName}</div>
        )}
        
        <div className={`message-bubble ${getFontSizeClass()}`}>
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
            <div className="message-text">
              {message.content.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  {i < message.content.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </div>
          )}

          <div className="message-footer">
            <span className="message-time">{formatTime(message.createdAt)}</span>
            {isOwn && (
              <span className="message-status">
                {message.isRead ? <CheckCheck size={14} /> : <Check size={14} />}
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

      {showReactions && (
        <div className="reactions-picker" onClick={(e) => e.stopPropagation()}>
          {reactions.map((reaction) => (
            <button
              key={reaction}
              className="reaction-option"
              onClick={() => handleReactionClick(reaction)}
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

        .message-wrapper.other {
          justify-content: flex-start;
        }

        /* Avatar styles */
        .message-avatar-left {
          width: 36px;
          height: 36px;
          flex-shrink: 0;
          margin-right: 8px;
        }

        .message-avatar-right {
          width: 36px;
          height: 36px;
          flex-shrink: 0;
          margin-left: 8px;
          order: 2;
        }

        .message-avatar-left img,
        .message-avatar-right img {
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

        .message-avatar-spacer {
          width: 36px;
          flex-shrink: 0;
        }

        .message-container {
          max-width: 65%;
          position: relative;
        }

        .message-wrapper.own .message-container {
          order: 1;
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

        /* Font size styles */
        .text-small {
          font-size: 12px;
        }

        .text-medium {
          font-size: 14px;
        }

        .text-large {
          font-size: 16px;
        }

        .message-wrapper.other .message-bubble {
          border-top-left-radius: 4px;
        }

        .message-wrapper.own .message-bubble {
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
          transition: background 0.2s;
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

        .reaction-trigger {
          position: absolute;
          bottom: -8px;
          right: ${isOwn ? '-4px' : 'auto'};
          left: ${isOwn ? 'auto' : '-4px'};
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

        .message-bubble:hover .reaction-trigger {
          opacity: 1;
        }

        .reaction-trigger:hover {
          background: #E9EDEF;
        }

        .reactions-display {
          display: flex;
          gap: 2px;
          margin-top: 2px;
          margin-left: ${isOwn ? '0' : '8px'};
          margin-right: ${isOwn ? '8px' : '0'};
          justify-content: ${isOwn ? 'flex-end' : 'flex-start'};
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

        .reaction-close:hover {
          background: #F0F2F5;
        }

        @media (max-width: 768px) {
          .message-container {
            max-width: 75%;
          }
          
          .image-preview {
            max-width: 150px;
            max-height: 150px;
          }
          
          .message-avatar-left,
          .message-avatar-right {
            width: 32px;
            height: 32px;
          }
          
          .message-avatar-spacer {
            width: 32px;
          }
        }
      `}</style>
    </div>
  );
};

export default MessageBubble;