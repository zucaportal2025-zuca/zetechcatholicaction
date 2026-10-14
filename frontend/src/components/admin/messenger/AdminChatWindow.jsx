// frontend/src/components/admin/messenger/AdminChatWindow.jsx
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import { api } from '../../../api';
import AdminMessageBubble from './AdminMessageBubble';
import AdminMessageInput from './AdminMessageInput';
import { io } from 'socket.io-client';
import BASE_URL from '../../../api';

const AdminChatWindow = ({ conversation, onBack, onOpenInfo }) => {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // Get the other participant
  const participant = conversation?.participant;

  // Initialize socket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !currentUser.id) return;

    socketRef.current = io(BASE_URL, {
      transports: ['websocket'],
      auth: { token }
    });

    socketRef.current.on('connect', () => {
      console.log('Admin chat window socket connected');
      socketRef.current.emit('dm:join', currentUser.id);
      
      // Join the conversation room
      if (conversation?.id) {
        socketRef.current.emit('join_conversation', conversation.id);
      }
    });

    // Listen for new messages
    socketRef.current.on('dm:new_message', (message) => {
        console.log('📨 ADMIN - Message received:', message.id)
      console.log('📨 Admin received new message:', message);
      console.log('Current conversation ID:', conversation?.id);
      console.log('Message conversation ID:', message.conversationId);
      
      if (message.conversationId === conversation?.id) {
        setMessages(prev => {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    });

    // Listen for message sent confirmation
    socketRef.current.on('dm:message_sent', (message) => {
      console.log('✅ Message sent confirmation:', message);
      setMessages(prev => prev.map(m => m.id === message.id ? message : m));
    });

    // Listen for typing indicators
    socketRef.current.on('dm:typing_start', ({ conversationId, userId }) => {
      console.log('📝 Typing started:', userId, 'in conv:', conversationId);
      if (conversationId === conversation?.id && userId !== currentUser.id) {
        setTypingUsers(prev => ({ ...prev, [userId]: true }));
      }
    });

    socketRef.current.on('dm:typing_stop', ({ conversationId, userId }) => {
      if (conversationId === conversation?.id) {
        setTypingUsers(prev => ({ ...prev, [userId]: false }));
      }
    });

    // Listen for online users
    socketRef.current.on('dm:online_users', ({ users }) => {
      setOnlineUsers(users || []);
    });

    socketRef.current.on('dm:user_online', ({ userId }) => {
      setOnlineUsers(prev => [...new Set([...prev, userId])]);
    });

    socketRef.current.on('dm:user_offline', ({ userId }) => {
      setOnlineUsers(prev => prev.filter(id => id !== userId));
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [conversation?.id]);

  // Fetch messages when conversation changes
  useEffect(() => {
    if (conversation?.id) {
      fetchMessages();
    }
  }, [conversation?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    if (!conversation?.id) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await api.get(`/api/messenger/messages/${conversation.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data.messages || []);
      console.log('Fetched messages:', res.data.messages?.length);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

const sendMessage = async (content, files = []) => {
  if ((!content.trim() && files.length === 0) || sending) return;
  
  setSending(true);
  
  // ✅ Add optimistic message immediately (no delay for user)
  const tempId = `temp-${Date.now()}-${Math.random()}`;
  const optimisticMessage = {
    id: tempId,
    content,
    senderId: currentUser.id,
    createdAt: new Date().toISOString(),
    sender: { fullName: currentUser.fullName, profileImage: currentUser.profileImage },
    isOptimistic: true
  };
  
  setMessages(prev => [...prev, optimisticMessage]);
  
  try {
    const token = localStorage.getItem('token');
    const res = await api.post('/api/messenger/messages', 
      { conversationId: conversation.id, content, files },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    // ✅ Replace optimistic with real message (socket will also try to add, but duplicate check prevents it)
    setMessages(prev => prev.map(m => m.id === tempId ? res.data : m));
    
  } catch (err) {
    console.error('Error sending message:', err);
    setMessages(prev => prev.filter(m => m.id !== tempId));
  } finally {
    setSending(false);
  }
};
  const handleTyping = () => {
    if (!socketRef.current) return;
    socketRef.current.emit('dm:typing_start', { conversationId: conversation?.id });
    
    if (window.typingTimeout) clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(() => {
      socketRef.current?.emit('dm:typing_stop', { conversationId: conversation?.id });
    }, 2000);
  };

  const deleteMessage = async (messageId) => {
    if (!window.confirm('Delete this message?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await api.delete(`/api/messenger/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(prev => prev.filter(m => m.id !== messageId));
      
      if (socketRef.current) {
        socketRef.current.emit('dm:delete_message', { 
          messageId, 
          conversationId: conversation.id 
        });
      }
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  const editMessage = async (messageId, newContent) => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.put(`/api/messenger/messages/${messageId}`,
        { content: newContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(prev => prev.map(m => m.id === messageId ? res.data : m));
      
      if (socketRef.current) {
        socketRef.current.emit('dm:edit_message', {
          messageId,
          content: newContent,
          conversationId: conversation.id
        });
      }
    } catch (err) {
      console.error('Error editing message:', err);
    }
  };

  const addReaction = async (messageId, reaction) => {
    try {
      const token = localStorage.getItem('token');
      await api.post(`/api/messenger/reactions/${messageId}`, { reaction }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchMessages(); // Refresh to get updated reactions
    } catch (err) {
      console.error('Error adding reaction:', err);
    }
  };

  const isUserOnline = onlineUsers.includes(participant?.id);
  const isUserTyping = typingUsers[participant?.id];

  if (!conversation || !participant) {
    return (
      <div className="chat-window-empty">
        <div className="empty-content">
          <div className="logo">💬</div>
          <h3>Select a conversation</h3>
          <p>Choose a chat to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="header-left">
          <button className="back-btn" onClick={onBack}>
            <ArrowLeft size={22} />
          </button>
          <div className="contact-info" onClick={onOpenInfo}>
            <div className="contact-avatar">
              {participant?.profileImage ? (
                <img src={participant.profileImage} alt={participant.fullName} />
              ) : (
                <div className="avatar-placeholder">
                  {participant?.fullName?.charAt(0)?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="contact-details">
              <h3>{participant?.fullName}</h3>
              <span className="status">
                {isUserTyping ? (
                  <span className="typing-status">typing...</span>
                ) : isUserOnline ? (
                  <span className="online-status">online</span>
                ) : (
                  <span className="offline-status">offline</span>
                )}
              </span>
            </div>
          </div>
        </div>
        <div className="header-right">
          <button className="icon-btn" onClick={onOpenInfo}>
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      <div className="messages-area">
        {loading ? (
          <div className="loading-messages">
            <div className="loading-spinner"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet</p>
            <p style={{ fontSize: 12, marginTop: 8 }}>Send a message to start the conversation</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const isOwn = message.senderId === currentUser.id;
              const showDate = index === 0 || 
                new Date(message.createdAt).toDateString() !== new Date(messages[index - 1]?.createdAt).toDateString();
              
              return (
                <React.Fragment key={message.id}>
                  {showDate && (
                    <div className="date-divider">
                      <span>{formatDate(message.createdAt)}</span>
                    </div>
                  )}
                  <AdminMessageBubble 
                    message={message}
                    isOwn={isOwn}
                    onDelete={deleteMessage}
                    onEdit={editMessage}
                    onReaction={(reaction) => addReaction(message.id, reaction)}
                    showAvatar={true}
                    senderName={message.sender?.fullName}
                  />
                </React.Fragment>
              );
            })}
            {isUserTyping && (
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

      <AdminMessageInput
        value={messageInput}
        onChange={setMessageInput}
        onSend={sendMessage}
        onTyping={handleTyping}
        sending={sending}
      />

      <style jsx>{`
        .chat-window {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #ECE5DD;
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
        }

        .empty-content .logo {
          font-size: 64px;
          margin-bottom: 16px;
        }

        .loading-messages {
          display: flex;
          justify-content: center;
          padding: 40px;
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #E9EDEF;
          border-top-color: #075E54;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .no-messages {
          text-align: center;
          padding: 60px 20px;
          color: #667781;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
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

export default AdminChatWindow;