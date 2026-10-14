// frontend/src/components/messenger/ChatWindow.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Phone, Video, MoreVertical, ArrowLeft, Settings } from 'lucide-react';
import { useMessenger } from '../../contexts/MessengerContext';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import SettingsModal from './SettingsModal';

const ChatWindow = ({ conversation, onBack, onOpenInfo }) => {
  const { 
    messages, 
    user, 
    onlineUsers, 
    typingUsers,
    sendMessage,
    fetchMessages,
    markAsRead,
    addReaction,
    socket
  } = useMessenger();
  
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const [showSettings, setShowSettings] = useState(false);

  const isOnline = onlineUsers.includes(conversation?.participant?.id);
  const isTypingNow = typingUsers[conversation?.participant?.id];

   const markConversationAsRead = async () => {
    if (conversation?.id) {
      const unreadMessages = messages.filter(m => m.senderId !== user?.id && !m.isRead);
      for (const msg of unreadMessages) {
        await markAsRead(msg.id, conversation.id);
      }
    }
  };

useEffect(() => {
  if (conversation?.id) {
    fetchMessages(conversation.id);
    markConversationAsRead();
    
    // ✅ ADD THIS - Join conversation room for real-time messages
    if (socket?.current) {
      socket.current.emit('join_conversation', conversation.id);
      console.log('📢 User joined conversation room:', conversation.id);
    }
  }
}, [conversation?.id]);
  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on conversation change
  useEffect(() => {
    inputRef.current?.focus();
  }, [conversation?.id]);

  useEffect(() => {
    console.log('💬 ChatWindow messages updated:', messages.length);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for real-time messages
  useEffect(() => {
    if (!socket?.current) return;
    
    const handleNewMessage = () => {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    };
    
    socket.current.on('dm:new_message', handleNewMessage);
    
    return () => {
      socket.current?.off('dm:new_message', handleNewMessage);
    };
  }, [socket]);





 
  const handleSendMessage = async () => {
    if ((!messageInput.trim() && attachments.length === 0) || sending) return;
    
    const content = messageInput.trim();
    const filesToSend = [...attachments];
    
    setMessageInput('');
    setAttachments([]);
    handleStopTyping();
    
    setSending(true);
    await sendMessage(conversation.id, content, filesToSend);
    setSending(false);
    
    inputRef.current?.focus();
  };

 // In ChatWindow.jsx, update the handleTyping function:

const handleTyping = () => {
  if (!isTyping) {
    setIsTyping(true);
    // ✅ Emit typing start to socket
    socket?.current?.emit('dm:typing_start', { conversationId: conversation?.id });
  }
  
  if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  typingTimeoutRef.current = setTimeout(() => {
    handleStopTyping();
  }, 2000);
};

const handleStopTyping = () => {
  if (isTyping) {
    setIsTyping(false);
    // ✅ Emit typing stop to socket
    socket?.current?.emit('dm:typing_stop', { conversationId: conversation?.id });
  }
};
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !sending) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const participant = conversation?.participant;

  if (!conversation || !participant) {
    return (
      <div className="chat-window-empty">
        <div className="empty-content">
          <div className="whatsapp-logo">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="#25D366"/>
              <path d="M12 6v6l4 2" stroke="#25D366" strokeWidth="1.5"/>
            </svg>
          </div>
          <h3>ZUCA Messenger</h3>
          <p>Select a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {/* Chat Header */}
      <div className="chat-header">
        <div className="header-left">
          <button className="back-btn" onClick={onBack}>
            <ArrowLeft size={22} />
          </button>
          <div className="contact-info" onClick={onOpenInfo}>
            <div className="contact-avatar">
              {participant.profileImage ? (
                <img src={participant.profileImage} alt={participant.fullName} />
              ) : (
                <div className="avatar-placeholder">
                  {participant.fullName?.charAt(0)?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="contact-details">
              <h3>{participant.fullName}</h3>
              <span className="status">
                {isTypingNow ? (
                  <span className="typing-status">typing...</span>
                ) : isOnline ? (
                  <span className="online-status">online</span>
                ) : (
                  <span className="offline-status">offline</span>
                )}
              </span>
            </div>
          </div>
        </div>
        <div className="header-right">
          <button className="icon-btn" onClick={() => setShowSettings(true)}>
            <Settings size={20} />
          </button>
          <button className="icon-btn" onClick={onOpenInfo}>
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="messages-area">
        {messages.length === 0 ? (
          <div className="no-messages">
            <div className="no-messages-icon">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="#25D366" opacity="0.5"/>
                <path d="M12 8v4l3 1.5" stroke="#25D366" strokeWidth="1.5" opacity="0.5"/>
              </svg>
            </div>
            <p>Send a message to start chatting</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const isOwn = message.senderId === user?.id;
              const showDate = index === 0 || 
                new Date(message.createdAt).toDateString() !== new Date(messages[index - 1]?.createdAt).toDateString();
              
              return (
                <React.Fragment key={message.id}>
                  {showDate && (
                    <div className="date-divider">
                      <span>{formatDate(message.createdAt)}</span>
                    </div>
                  )}
                  <MessageBubble 
                    message={message} 
                    isOwn={isOwn}
                    onReaction={(reaction) => addReaction(message.id, reaction, conversation.id)}
                    showAvatar={true}
                    senderName={message.sender?.fullName}
                  />
                </React.Fragment>
              );
            })}
            {isTypingNow && (
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

      {/* Message Input */}
      <MessageInput
        value={messageInput}
        onChange={setMessageInput}
        onSend={handleSendMessage}
        onTyping={handleTyping}
        onStopTyping={handleStopTyping}
        onKeyPress={handleKeyPress}
        attachments={attachments}
        setAttachments={setAttachments}
        sending={sending}
        inputRef={inputRef}
      />

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      <style jsx>{`
        .chat-window {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #ECE5DD;
          position: relative;
        }

        .chat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 16px;
          background: #075E54;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .back-btn {
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

        .back-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .contact-info {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }

        .contact-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          overflow: hidden;
        }

        .contact-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-placeholder {
          width: 100%;
          height: 100%;
          background: #128C7E;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 18px;
          font-weight: 600;
        }

        .contact-details h3 {
          font-size: 16px;
          font-weight: 500;
          color: #FFFFFF;
          margin: 0;
        }

        .status {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.8);
        }

        .online-status {
          color: #25D366;
        }

        .typing-status {
          color: #25D366;
        }

        .header-right {
          display: flex;
          gap: 8px;
        }

        .icon-btn {
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

        .icon-btn:hover {
          background: rgba(255, 255, 255, 0.1);
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

        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #FFFFFF;
          padding: 8px 12px;
          border-radius: 18px;
          width: fit-content;
          margin-top: 8px;
          box-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
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

        @keyframes typing {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }

        .typing-text {
          font-size: 12px;
          color: #667781;
        }

        .chat-window-empty {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ECE5DD;
        }

        .empty-content {
          text-align: center;
          padding: 32px;
        }

        .no-messages {
          text-align: center;
          padding: 60px 20px;
        }

        @media (max-width: 768px) {
          .chat-header {
            padding: 8px 12px;
          }
          
          .messages-area {
            padding: 12px;
          }
        }
      `}</style>
    </div>
  );
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default ChatWindow;