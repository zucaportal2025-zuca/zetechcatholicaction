// frontend/src/components/ZucaAIAssistant.jsx
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import BASE_URL from "../api";
import logoImg from "../assets/zuca-logo.png";
import { 
  FiSend, FiX, FiMinimize2, FiMaximize2, 
  FiTrash, FiMic, FiMicOff, FiCopy, FiCheck,
  FiDownload, FiPaperclip, FiArrowLeft
} from "react-icons/fi";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ZucaAIAssistant({ user, onClose, isOpen, isFullPage, onBack, navigate: propNavigate }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const lastRequestTime = useRef(0);
  const fileInputRef = useRef(null);
  
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const widgetRef = useRef(null);
  
  const navigate = propNavigate || useNavigate();
  const [localFullPage, setLocalFullPage] = useState(false);

  useEffect(() => {
    const savedPosition = localStorage.getItem('zuca_ai_position');
    if (savedPosition) {
      try {
        const pos = JSON.parse(savedPosition);
        const maxX = window.innerWidth - 420;
        const maxY = window.innerHeight - 570;
        setPosition({
          x: Math.min(Math.max(pos.x, 0), maxX),
          y: Math.min(Math.max(pos.y, 0), maxY)
        });
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (position.x !== 0 || position.y !== 0) {
      localStorage.setItem('zuca_ai_position', JSON.stringify(position));
    }
  }, [position]);

  const handleMouseDown = (e) => {
    if (e.target.closest('.widget-header-draggable')) {
      setIsDragging(true);
      const rect = widgetRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
      e.preventDefault();
    }
  };

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      let newX = e.clientX - dragOffset.x;
      let newY = e.clientY - dragOffset.y;
      const maxX = window.innerWidth - (widgetRef.current?.offsetWidth || 420);
      const maxY = window.innerHeight - (widgetRef.current?.offsetHeight || 570);
      newX = Math.min(Math.max(newX, 0), maxX);
      newY = Math.min(Math.max(newY, 0), maxY);
      setPosition({ x: newX, y: newY });
    }
  }, [isDragging, dragOffset]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (e.target.closest('.widget-header-draggable')) {
      const touch = e.touches[0];
      const rect = widgetRef.current?.getBoundingClientRect();
      if (rect) {
        setIsDragging(true);
        setDragOffset({
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top
        });
      }
      e.preventDefault();
    }
  };

  const handleTouchMove = useCallback((e) => {
    if (isDragging) {
      const touch = e.touches[0];
      let newX = touch.clientX - dragOffset.x;
      let newY = touch.clientY - dragOffset.y;
      const maxX = window.innerWidth - (widgetRef.current?.offsetWidth || 420);
      const maxY = window.innerHeight - (widgetRef.current?.offsetHeight || 570);
      newX = Math.min(Math.max(newX, 0), maxX);
      newY = Math.min(Math.max(newY, 0), maxY);
      setPosition({ x: newX, y: newY });
      e.preventDefault();
    }
  }, [isDragging, dragOffset]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleTouchMove]);

  // Load chat history
  useEffect(() => {
    const savedHistory = localStorage.getItem('zuca_ai_history');
    if (savedHistory && !isFullPage && !localFullPage) {
      try {
        const history = JSON.parse(savedHistory);
        if (history.length > 0) {
          setMessages(history.map(msg => ({ ...msg, timestamp: new Date(msg.timestamp) })));
        }
      } catch (e) {}
    }
  }, [isFullPage, localFullPage]);

  // Save chat history
  useEffect(() => {
    if (!isFullPage && !localFullPage && messages.length > 0) {
      const toSave = messages.slice(-100).map(msg => ({
        ...msg,
        timestamp: msg.timestamp.toISOString()
      }));
      localStorage.setItem('zuca_ai_history', JSON.stringify(toSave));
    }
  }, [messages, isFullPage, localFullPage]);

  // Welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: Date.now(),
        role: "assistant",
        content: `👋 Hello **${user?.fullName?.split(" ")[0] || "there"}**! I'm your ZUCA AI Assistant.

I can help you with:
- 📸 Gallery & Media
- 🎵 Hymn Book & Lyrics
- 💰 Pledges & Contributions
- ⛪ Mass Programs & Schedules
- 📅 Liturgical Calendar
- 🔔 Notifications
- 🏠 Jumuia Groups
- 💬 Chat & Messages

Just type what you need, or try one of the quick actions below!`,
        timestamp: new Date()
      }]);
    }
  }, [user, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Voice recognition
  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Voice recognition not supported. Try Chrome!");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';
    recognitionRef.current.onresult = (event) => {
      setInput(event.results[0][0].transcript);
      setIsListening(false);
      setTimeout(() => sendMessage(), 100);
    };
    recognitionRef.current.onerror = () => setIsListening(false);
    recognitionRef.current.onend = () => setIsListening(false);
    recognitionRef.current.start();
    setIsListening(true);
  };

  const stopVoiceInput = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch(e) {}
  };

  const handleFileAttach = (e) => {
    const files = Array.from(e.target.files);
    const newAttachments = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      type: file.type,
      size: file.size,
      file: file
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (id) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const sendMessage = useCallback(async () => {
    if ((!input.trim() && attachments.length === 0)) return;
    if (loading) return;
    
    const now = Date.now();
    if (now - lastRequestTime.current < 1000) {
      return;
    }
    
    const userMessage = input.trim();
    
    setMessages(prev => [...prev, {
      id: Date.now(),
      role: "user",
      content: userMessage,
      timestamp: new Date()
    }]);
    setInput("");
    setAttachments([]);
    setLoading(true);
    lastRequestTime.current = now;
    
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${BASE_URL}/api/deepseek/chat`, {
        message: userMessage,
        conversationId: conversationId
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeout: 30000
      });
      
      if (response.data.conversationId) {
        setConversationId(response.data.conversationId);
      }
      
      const aiResponse = response.data.reply || "I processed your request.";
      
      if (response.data.action && response.data.action.action === "navigate" && response.data.action.path) {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: "assistant",
          content: response.data.action.message || aiResponse,
          timestamp: new Date()
        }]);
        setTimeout(() => {
          window.location.href = response.data.action.path;
        }, 500);
      } else {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: "assistant",
          content: aiResponse,
          timestamp: new Date()
        }]);
      }
      
    } catch (err) {
      console.error("AI error:", err);
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: "assistant",
        content: "I'm having trouble connecting. Please try again.",
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, attachments, loading, conversationId]);

  const clearChat = () => {
    const token = localStorage.getItem("token");
    axios.post(`${BASE_URL}/api/deepseek/clear-conversation`, {}, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).catch(() => {});
    
    setConversationId(null);
    setMessages([{
      id: Date.now(),
      role: "assistant",
      content: `👋 Hi again! I'm your ZUCA AI Assistant. What would you like to know?`,
      timestamp: new Date()
    }]);
    localStorage.removeItem('zuca_ai_history');
  };

  const exportChat = () => {
    const chatText = messages.map(msg => {
      const role = msg.role === 'user' ? 'You' : 'ZUCA AI';
      const time = msg.timestamp.toLocaleString();
      return `[${time}] ${role}:\n${msg.content}\n`;
    }).join('\n---\n');
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zuca-chat-${new Date().toISOString().slice(0,19)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getUserAvatar = () => {
    if (user?.profileImage) return user.profileImage;
    return null;
  };

  const getUserInitial = () => {
    if (user?.fullName) return user.fullName.charAt(0).toUpperCase();
    return "U";
  };

  const openFullPage = () => setLocalFullPage(true);
  const handleClose = () => { if (onClose) onClose(); };
  const closeFullPage = () => setLocalFullPage(false);
  const handleBack = () => { if (onBack) onBack(); else setLocalFullPage(false); };

  const quickActions = [
    { icon: "📸", label: "Gallery" },
    { icon: "🎵", label: "Hymns" },
    { icon: "💰", label: "Pledges" },
    { icon: "⛪", label: "Mass" },
    { icon: "📅", label: "Calendar" },
  ];

  // ==========================================
  // FULL PAGE MODE
  // ==========================================
  if (isFullPage || localFullPage) {
    return (
      <div style={fullPageContainerStyle}>
        {/* Header with Back Button */}
        <div style={fullPageHeaderStyle}>
          <div style={fullPageHeaderLeft}>
            <button onClick={handleBack} style={backButtonStyle}>
              <FiArrowLeft size={18} />
              <span>minimize</span>
            </button>
            <div style={fullPageTitleStyle}>
              <img src={logoImg} alt="ZUCA" style={fullPageLogoStyle} />
              <div>
                <h2 style={fullPageTitle}>ZUCA AI</h2>
                <p style={fullPageSubtitle}>Powered by CHRISWEBSYS</p>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={exportChat} style={iconBtnStyle} title="Export chat">
              <FiDownload size={18} />
            </button>
            <button onClick={clearChat} style={iconBtnStyle} title="Clear chat">
              <FiTrash size={18} />
            </button>
            <button onClick={handleClose} style={iconBtnStyle} title="Close">
              <FiX size={18} />
            </button>
          </div>
        </div>
        
        {/* Messages */}
        <div style={fullPageMessagesStyle}>
          {messages.map((msg) => (
            <MessageBubble 
              key={msg.id} 
              msg={msg} 
              isUser={msg.role === "user"} 
              isFullPage={true} 
              userAvatar={getUserAvatar()}
              userInitial={getUserInitial()}
              copiedId={copiedId}
              setCopiedId={setCopiedId}
            />
          ))}
          {loading && <TypingIndicator isFullPage={true} />}
          <div ref={messagesEndRef} />
        </div>

        <AttachmentPreviewComponent attachments={attachments} removeAttachment={removeAttachment} isFullPage={true} />
        
        {/* Input */}
        <div style={fullPageInputStyle}>
          <input type="file" ref={fileInputRef} onChange={handleFileAttach} multiple style={{ display: "none" }} />
          <button onClick={() => fileInputRef.current?.click()} style={fullPageActionBtn(false)}>
            <FiPaperclip size={18} />
          </button>
          <button 
            onClick={isListening ? stopVoiceInput : startVoiceInput} 
            style={fullPageActionBtn(isListening)}
          >
            {isListening ? <FiMicOff size={18} /> : <FiMic size={18} />}
          </button>
          <textarea 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            onKeyPress={handleKeyPress} 
            placeholder="Ask me anything..." 
            style={fullPageTextareaStyle}
            rows={1}
          />
          <button 
            onClick={sendMessage} 
            disabled={loading || (!input.trim() && attachments.length === 0)} 
            style={fullPageSendBtnStyle}
          >
            <FiSend size={18} />
          </button>
        </div>
        
        {/* Quick Actions */}
        <div style={fullPageQuickActionsStyle}>
          {quickActions.map((action, idx) => (
            <button 
              key={idx} 
              onClick={() => setInput(`Take me to ${action.label}`)} 
              style={quickActionBtnStyle}
            >
              <span>{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ==========================================
  // WIDGET MODE - ChatGPT Style with Dashboard link
  // ==========================================
  return (
    <div 
      ref={widgetRef}
      style={{
        ...widgetContainerStyle,
        left: `${position.x}px`,
        top: `${position.y}px`,
        position: 'fixed',
        cursor: isDragging ? 'grabbing' : 'default',
        userSelect: isDragging ? 'none' : 'auto',
        transition: isDragging ? 'none' : 'left 0.15s ease, top 0.15s ease',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Header - with Dashboard button */}
      <div 
        className="widget-header-draggable"
        style={widgetHeaderStyle}
      >
        <div style={widgetHeaderLeftStyle}>
          <button 
            onClick={() => navigate('/dashboard')} 
            style={widgetDashboardBtnStyle}
            title="Go to Dashboard"
          >
            <FiArrowLeft size={14} />
          </button>
          <div style={widgetLogoWrapper}>
            <img src={logoImg} alt="ZUCA" style={widgetLogoStyle} />
          </div>
          <div>
            <h3 style={widgetTitleStyle}>ZUCA AI</h3>
            <p style={widgetStatusStyle}>● Online</p>
          </div>
        </div>
        <div style={widgetHeaderActionsStyle}>
          <button onClick={openFullPage} style={widgetIconBtnStyle} title="Full Screen">
            <FiMaximize2 size={14} />
          </button>
          <button onClick={clearChat} style={widgetIconBtnStyle} title="Clear">
            <FiTrash size={14} />
          </button>
          <button onClick={handleClose} style={widgetIconBtnStyle} title="Close">
            <FiX size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={widgetMessagesStyle}>
        {messages.slice(-15).map((msg) => (
          <MessageBubble 
            key={msg.id} 
            msg={msg} 
            isUser={msg.role === "user"} 
            isFullPage={false} 
            userAvatar={getUserAvatar()}
            userInitial={getUserInitial()}
            copiedId={copiedId}
            setCopiedId={setCopiedId}
          />
        ))}
        {loading && <TypingIndicator isFullPage={false} />}
        <div ref={messagesEndRef} />
      </div>

      <AttachmentPreviewComponent attachments={attachments} removeAttachment={removeAttachment} isFullPage={false} />

      {/* Input */}
      <div style={widgetInputStyle}>
        <input type="file" ref={fileInputRef} onChange={handleFileAttach} multiple style={{ display: "none" }} />
        <button onClick={() => fileInputRef.current?.click()} style={widgetActionBtn(false)}>
          <FiPaperclip size={14} />
        </button>
        <button 
          onClick={isListening ? stopVoiceInput : startVoiceInput} 
          style={{
            ...widgetActionBtn(isListening),
            color: isListening ? '#ef4444' : '#64748b',
          }}
        >
          {isListening ? <FiMicOff size={14} /> : <FiMic size={14} />}
        </button>
        <textarea 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          onKeyPress={handleKeyPress} 
          placeholder="Ask me anything..." 
          style={widgetTextareaStyle}
          rows={1}
        />
        <button 
          onClick={sendMessage} 
          disabled={loading || (!input.trim() && attachments.length === 0)} 
          style={{
            ...widgetSendBtnStyle,
            background: loading || (!input.trim() && attachments.length === 0) ? '#e5e7eb' : '#10a37f',
            cursor: loading || (!input.trim() && attachments.length === 0) ? 'not-allowed' : 'pointer',
          }}
        >
          <FiSend size={14} />
        </button>
      </div>

      {/* Quick Actions */}
      <div style={widgetQuickActionsStyle}>
        {quickActions.map((action, idx) => (
          <button 
            key={idx} 
            onClick={() => setInput(`Take me to ${action.label}`)} 
            style={widgetQuickBtnStyle}
          >
            <span style={{ fontSize: '14px' }}>{action.icon}</span>
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ==================== MESSAGE BUBBLE ====================
const MessageBubble = ({ msg, isUser, isFullPage, userAvatar, userInitial, copiedId, setCopiedId }) => {
  const handleCopy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch(e) {}
  };

  return (
    <div style={{ 
      display: "flex", 
      gap: isFullPage ? "12px" : "10px", 
      flexDirection: isUser ? "row-reverse" : "row", 
      alignItems: "flex-start", 
      marginBottom: isFullPage ? "20px" : "16px" 
    }}>
      <div style={{ 
        width: isFullPage ? "36px" : "32px", 
        height: isFullPage ? "36px" : "32px", 
        borderRadius: "50%", 
        background: isUser 
          ? "linear-gradient(135deg, #10a37f, #0d8b6e)" 
          : "linear-gradient(135deg, #f1f5f9, #e2e8f0)",
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        fontSize: isFullPage ? "14px" : "12px", 
        flexShrink: 0,
        color: isUser ? "white" : "#1e293b",
        fontWeight: "bold",
        overflow: "hidden",
      }}>
        {isUser ? (
          userAvatar ? (
            <img src={userAvatar} alt="User" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            userInitial
          )
        ) : (
          <img src={logoImg} alt="ZUCA" style={{ width: "70%", height: "70%", objectFit: "contain" }} />
        )}
      </div>
      
      <div style={{ 
        maxWidth: isFullPage ? "75%" : "78%", 
        padding: isFullPage ? "10px 16px" : "8px 14px", 
        borderRadius: "16px", 
        background: isUser ? "#10a37f" : "#ffffff", 
        color: isUser ? "white" : "#1e293b", 
        fontSize: isFullPage ? "14px" : "13px", 
        lineHeight: "1.6", 
        border: isUser ? "none" : "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}>
        {isUser ? (
          <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
            a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" style={{ color: "#10a37f" }} />,
            table: ({node, ...props}) => <table {...props} style={{ borderCollapse: "collapse", width: "100%", margin: "8px 0" }} />,
            th: ({node, ...props}) => <th {...props} style={{ border: "1px solid #e2e8f0", padding: "6px", textAlign: "left", background: "#f8fafc" }} />,
            td: ({node, ...props}) => <td {...props} style={{ border: "1px solid #e2e8f0", padding: "6px" }} />,
            code: ({node, ...props}) => <code {...props} style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", fontSize: "12px" }} />
          }}>
            {msg.content}
          </ReactMarkdown>
        )}
        
        <div style={{ 
          fontSize: isFullPage ? "10px" : "9px", 
          color: isUser ? "rgba(255,255,255,0.7)" : "#94a3b8", 
          marginTop: "6px", 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center" 
        }}>
          <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <button 
            onClick={() => handleCopy(msg.content, msg.id)} 
            style={{ 
              background: "transparent", 
              border: "none", 
              color: isUser ? "rgba(255,255,255,0.7)" : "#94a3b8", 
              cursor: "pointer",
              padding: "2px 4px",
              borderRadius: "4px",
            }}
          >
            {copiedId === msg.id ? <FiCheck size={isFullPage ? 12 : 10} /> : <FiCopy size={isFullPage ? 12 : 10} />}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== TYPING INDICATOR ====================
const TypingIndicator = ({ isFullPage }) => (
  <div style={{ 
    display: "flex", 
    gap: "10px", 
    alignItems: "center", 
    marginBottom: "16px",
  }}>
    <div style={{ 
      width: isFullPage ? "36px" : "32px", 
      height: isFullPage ? "36px" : "32px", 
      borderRadius: "50%", 
      background: "#f1f5f9",
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
    }}>
      <img src={logoImg} alt="ZUCA" style={{ width: "70%", height: "70%", objectFit: "contain" }} />
    </div>
    <div style={{ 
      padding: isFullPage ? "10px 16px" : "8px 14px", 
      borderRadius: "16px", 
      background: "#ffffff", 
      border: "1px solid #e2e8f0",
      display: "flex", 
      gap: "6px", 
      alignItems: "center",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      <div className="typing-dot" style={{ animationDelay: "0s" }}></div>
      <div className="typing-dot" style={{ animationDelay: "0.2s" }}></div>
      <div className="typing-dot" style={{ animationDelay: "0.4s" }}></div>
    </div>
  </div>
);

// ==================== ATTACHMENT PREVIEW ====================
const AttachmentPreviewComponent = ({ attachments, removeAttachment, isFullPage }) => {
  if (attachments.length === 0) return null;
  return (
    <div style={{ 
      padding: "6px 16px", 
      display: "flex", 
      gap: "6px", 
      flexWrap: "wrap", 
      background: "#f8fafc",
      borderTop: "1px solid #f1f5f9",
    }}>
      {attachments.map(att => (
        <div key={att.id} style={{ 
          background: "white", 
          borderRadius: "16px", 
          padding: "4px 12px", 
          display: "flex", 
          alignItems: "center", 
          gap: "6px", 
          fontSize: "11px", 
          border: "1px solid #e2e8f0",
          color: "#475569",
        }}>
          📎 {att.name.length > 20 ? att.name.substring(0, 20) + '...' : att.name}
          <button 
            onClick={() => removeAttachment(att.id)} 
            style={{ 
              background: "none", 
              border: "none", 
              color: "#94a3b8", 
              cursor: "pointer", 
              fontSize: "14px",
              padding: "0 2px",
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

// ==================== STYLES ====================

// Full Page
const fullPageContainerStyle = { 
  position: "fixed", 
  top: 0, 
  left: 0, 
  right: 0, 
  bottom: 0, 
  background: "#f7f7f8", 
  zIndex: 999999, 
  display: "flex", 
  flexDirection: "column", 
  overflow: "hidden", 
  fontFamily: "'Inter', -apple-system, sans-serif" 
};

const fullPageHeaderStyle = { 
  padding: "12px 24px", 
  background: "white", 
  borderBottom: "1px solid #e5e5e5", 
  display: "flex", 
  justifyContent: "space-between", 
  alignItems: "center", 
  flexShrink: 0 
};

const fullPageHeaderLeft = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
};

const backButtonStyle = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "6px 14px",
  background: "#f7f7f8",
  border: "1px solid #e5e5e5",
  borderRadius: "8px",
  color: "#475569",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: "500",
  transition: "all 0.2s ease",
};

const fullPageTitleStyle = { 
  display: "flex", 
  alignItems: "center", 
  gap: "12px" 
};

const fullPageLogoStyle = { 
  width: "36px", 
  height: "36px", 
  objectFit: "contain" 
};

const fullPageTitle = { 
  margin: 0, 
  color: "#1e293b", 
  fontSize: "18px", 
  fontWeight: "600" 
};

const fullPageSubtitle = { 
  margin: 0, 
  fontSize: "11px", 
  color: "#94a3b8" 
};

const iconBtnStyle = { 
  width: "36px", 
  height: "36px", 
  borderRadius: "8px", 
  background: "transparent", 
  border: "none", 
  color: "#64748b", 
  cursor: "pointer", 
  display: "flex", 
  alignItems: "center", 
  justifyContent: "center",
  transition: "all 0.2s ease",
};

const fullPageMessagesStyle = { 
  flex: 1, 
  overflowY: "auto", 
  padding: "20px 24px",
  background: "#f7f7f8",
};

const fullPageInputStyle = { 
  padding: "12px 20px", 
  borderTop: "1px solid #e5e5e5", 
  background: "white", 
  display: "flex", 
  gap: "8px", 
  alignItems: "flex-end", 
  flexShrink: 0 
};

const fullPageActionBtn = (isListening) => ({ 
  width: "40px", 
  height: "40px", 
  borderRadius: "50%", 
  background: "transparent", 
  border: "none", 
  color: isListening ? "#ef4444" : "#64748b", 
  cursor: "pointer", 
  display: "flex", 
  alignItems: "center", 
  justifyContent: "center",
  transition: "all 0.2s ease",
});

const fullPageTextareaStyle = { 
  flex: 1, 
  padding: "10px 16px", 
  background: "#f7f7f8", 
  border: "none", 
  borderRadius: "24px", 
  color: "#1e293b", 
  fontSize: "14px", 
  resize: "none", 
  fontFamily: "inherit", 
  minHeight: "44px", 
  maxHeight: "120px", 
  outline: "none",
};

const fullPageSendBtnStyle = { 
  width: "40px", 
  height: "40px", 
  borderRadius: "50%", 
  background: "#10a37f", 
  border: "none", 
  color: "white", 
  cursor: "pointer", 
  display: "flex", 
  alignItems: "center", 
  justifyContent: "center",
  transition: "all 0.2s ease",
};

const fullPageQuickActionsStyle = { 
  padding: "10px 20px", 
  borderTop: "1px solid #e5e5e5", 
  background: "white", 
  display: "flex", 
  gap: "8px", 
  flexWrap: "wrap", 
  flexShrink: 0 
};

const quickActionBtnStyle = { 
  padding: "6px 14px", 
  background: "#f7f7f8", 
  border: "1px solid #e5e5e5", 
  borderRadius: "20px", 
  color: "#475569", 
  fontSize: "12px", 
  cursor: "pointer", 
  display: "flex", 
  alignItems: "center", 
  gap: "6px",
  transition: "all 0.2s ease",
};

// Widget
const widgetContainerStyle = { 
  width: "380px", 
  height: "520px", 
  background: "white", 
  borderRadius: "16px", 
  boxShadow: "0 20px 60px rgba(0,0,0,0.15)", 
  zIndex: 10000, 
  display: "flex", 
  flexDirection: "column", 
  overflow: "hidden", 
  border: "1px solid #e5e5e5", 
  fontFamily: "'Inter', -apple-system, sans-serif" 
};

const widgetHeaderStyle = { 
  padding: "10px 16px", 
  background: "white", 
  borderBottom: "1px solid #e5e5e5", 
  display: "flex", 
  justifyContent: "space-between", 
  alignItems: "center", 
  flexShrink: 0,
  cursor: 'grab',
};

const widgetHeaderLeftStyle = { 
  display: "flex", 
  alignItems: "center", 
  gap: "8px" 
};

const widgetDashboardBtnStyle = {
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  background: "#f7f7f8",
  border: "1px solid #e5e5e5",
  color: "#64748b",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s ease",
};

const widgetLogoWrapper = {
  width: "32px",
  height: "32px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const widgetLogoStyle = { 
  width: "28px", 
  height: "28px", 
  objectFit: "contain" 
};

const widgetTitleStyle = { 
  margin: 0, 
  color: "#1e293b", 
  fontSize: "13px", 
  fontWeight: "600" 
};

const widgetStatusStyle = { 
  margin: 0, 
  color: "#10a37f", 
  fontSize: "9px", 
  fontWeight: "500" 
};

const widgetHeaderActionsStyle = { 
  display: "flex", 
  gap: "4px" 
};

const widgetIconBtnStyle = { 
  width: "28px", 
  height: "28px", 
  borderRadius: "6px", 
  background: "transparent", 
  border: "none", 
  color: "#94a3b8", 
  cursor: "pointer", 
  display: "flex", 
  alignItems: "center", 
  justifyContent: "center",
  transition: "all 0.2s ease",
};

const widgetMessagesStyle = { 
  flex: 1, 
  overflowY: "auto", 
  padding: "16px", 
  background: "#f7f7f8" 
};

const widgetInputStyle = { 
  padding: "8px 12px", 
  borderTop: "1px solid #e5e5e5", 
  background: "white", 
  display: "flex", 
  gap: "6px", 
  alignItems: "flex-end", 
  flexShrink: 0 
};

const widgetActionBtn = (isListening) => ({ 
  width: "34px", 
  height: "34px", 
  borderRadius: "50%", 
  background: "transparent", 
  border: "none", 
  color: isListening ? "#ef4444" : "#94a3b8", 
  cursor: "pointer", 
  display: "flex", 
  alignItems: "center", 
  justifyContent: "center",
  transition: "all 0.2s ease",
});

const widgetTextareaStyle = { 
  flex: 1, 
  padding: "8px 14px", 
  background: "#f7f7f8", 
  border: "none", 
  borderRadius: "20px", 
  color: "#1e293b", 
  fontSize: "12px", 
  resize: "none", 
  fontFamily: "inherit", 
  minHeight: "34px", 
  maxHeight: "80px", 
  outline: "none",
};

const widgetSendBtnStyle = { 
  width: "34px", 
  height: "34px", 
  borderRadius: "50%", 
  background: "#10a37f", 
  border: "none", 
  color: "white", 
  cursor: "pointer", 
  display: "flex", 
  alignItems: "center", 
  justifyContent: "center",
  transition: "all 0.2s ease",
};

const widgetQuickActionsStyle = { 
  padding: "6px 12px", 
  borderTop: "1px solid #e5e5e5", 
  background: "white", 
  display: "flex", 
  flexWrap: "wrap", 
  gap: "4px", 
  flexShrink: 0 
};

const widgetQuickBtnStyle = { 
  padding: "4px 12px", 
  background: "#f7f7f8", 
  border: "1px solid #e5e5e5", 
  borderRadius: "16px", 
  color: "#475569", 
  fontSize: "10px", 
  cursor: "pointer", 
  display: "flex", 
  alignItems: "center", 
  gap: "4px",
  transition: "all 0.2s ease",
};

// CSS
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes typingWave {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
    30% { transform: translateY(-6px); opacity: 1; }
  }
  .typing-dot { 
    width: 6px; 
    height: 6px; 
    background: #94a3b8; 
    border-radius: 50%; 
    animation: typingWave 1.4s infinite ease-in-out; 
  }
  button:hover { 
    background: #f1f5f9; 
  }
  textarea:focus { 
    box-shadow: 0 0 0 2px rgba(16, 163, 127, 0.1); 
  }
`;
if (!document.querySelector("#ai-typing-animation")) {
  styleSheet.id = "ai-typing-animation";
  document.head.appendChild(styleSheet);
}