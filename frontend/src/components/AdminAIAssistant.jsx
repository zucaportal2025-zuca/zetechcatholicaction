// frontend/src/components/AdminAIAssistant.jsx
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import BASE_URL from "../api";
import logoImg from "../assets/zuca-logo.png";
import { 
  FiSend, FiX, FiMinimize2, FiMaximize2, 
  FiTrash, FiMic, FiMicOff, FiCopy, FiCheck,
  FiDownload, FiPaperclip
} from "react-icons/fi";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function AdminAIAssistant({ user, onClose, isOpen, isFullPage, onBack, navigate: propNavigate }) {
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
  
  const navigate = propNavigate || useNavigate();
  const [localFullPage, setLocalFullPage] = useState(false);

  // Load chat history
  useEffect(() => {
    const savedHistory = localStorage.getItem('admin_ai_history');
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
      localStorage.setItem('admin_ai_history', JSON.stringify(toSave));
    }
  }, [messages, isFullPage, localFullPage]);

  // Welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: Date.now(),
        role: "assistant",
        content: `👑 **ZUCA Admin AI Assistant**\n\nTumsifu Yesu Kristu! 🙏\n\nHello **${user?.fullName?.split(" ")[0] || "Admin"}**! I'm your intelligent admin assistant powered by Groq AI with full management capabilities.\n\n### 🔧 What I Can Do:\n\n| Category | Commands |\n|----------|----------|\n| 👥 **Users** | "List all users", "Find user [name]", "Delete user [email]", "Make [name] admin" |\n| 👑 **Executives** | "Show executive team", "Make [name] Secretary", "Remove [name]" |\n| 💰 **Campaigns** | "Create campaign 'Title' target 50000", "List campaigns" |\n| 📢 **Announcements** | "Create announcement: [message]", "List announcements" |\n| 📋 **Schedules** | Paste raw schedule text — I'll build it! |\n| 📸 **Gallery** | "List media", "Delete media [title]" |\n| 📺 **YouTube** | "YouTube stats", "Channel analytics" |\n| 📊 **System** | "System stats", "Platform overview", "System health" `,
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
    if (now - lastRequestTime.current < 1000) return;
    
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
      
      // ==========================================
      // NEW: Call the Groq-powered endpoint
      // ==========================================
      const response = await axios.post(`${BASE_URL}/api/deepseek/chat`, {
        message: userMessage,
        conversationId: conversationId
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeout: 30000
      });
      
      // Save conversation ID for context
      if (response.data.conversationId) {
        setConversationId(response.data.conversationId);
      }
      
      // NEW: Response uses "reply" field
      const aiResponse = response.data.reply || "I processed your request.";
      
      // NEW: Handle navigation action
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
        content: "Tumsifu Yesu Kristu! 🙏 I'm having trouble connecting. Please try again.",
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, attachments, loading, conversationId]);

  const clearChat = () => {
    // Clear server conversation
    const token = localStorage.getItem("token");
    axios.post(`${BASE_URL}/api/deepseek/clear-conversation`, {}, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).catch(() => {});
    
    setConversationId(null);
    setMessages([{
      id: Date.now(),
      role: "assistant",
      content: `Chat cleared! 👑 Admin AI ready. What would you like to manage? Tumsifu Yesu Kristu! 🙏`,
      timestamp: new Date()
    }]);
    localStorage.removeItem('admin_ai_history');
  };

  const exportChat = () => {
    const chatText = messages.map(msg => {
      const role = msg.role === 'user' ? 'Admin' : 'Admin AI';
      const time = msg.timestamp.toLocaleString();
      return `[${time}] ${role}:\n${msg.content}\n`;
    }).join('\n---\n');
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-chat-${new Date().toISOString().slice(0,19)}.txt`;
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
    return "A";
  };

  const openFullPage = () => setLocalFullPage(true);
const backToWidget = () => {
  setLocalFullPage(false);
  if (onBack) onBack();  
};  const handleClose = () => { if (onClose) onClose(); };

  const quickActions = [
    { emoji: "👥", label: "List Users", action: "List all users" },
    { emoji: "👑", label: "Executives", action: "Show the executive team" },
    { emoji: "💰", label: "Campaigns", action: "List campaigns" },
    { emoji: "📢", label: "Announce", action: "Create announcement: Mass today at 4pm in the chapel" },
    { emoji: "📊", label: "System Stats", action: "Show platform overview" },
    { emoji: "🏠", label: "Jumuia Stats", action: "Show me all jumuia groups" },
    { emoji: "📋", label: "Schedules", action: "List schedules" },
    { emoji: "🖥️", label: "Health", action: "Check system health" },
  ];

  // ==========================================
  // FULL PAGE MODE
  // ==========================================
  if (isFullPage || localFullPage) {
    return (
      <div style={fullPageContainerStyle}>
        <div style={fullPageHeaderStyle}>
          <button onClick={backToWidget} style={backButtonStyle}>
            ← widget 
          </button>
          <div style={fullPageTitleStyle}>
            <img src={logoImg} alt="ZUCA" style={fullPageLogoStyle} />
            <div>
              <h2 style={{ margin: 0, color: "#0f172a", fontSize: "20px" }}>ZUCA AI</h2>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>Powered by CHRISWEBSYS</p>
            </div>
            <span style={adminBadgeStyle}>👑 ADMIN</span>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={exportChat} style={iconBtnStyle} title="Export chat">📥</button>
            <button onClick={clearChat} style={iconBtnStyle} title="Clear chat">🗑️</button>
            <button onClick={handleClose} style={iconBtnStyle} title="Close">✕</button>
          </div>
        </div>
        
        <div style={fullPageMessagesStyle}>
          {messages.map((msg) => (
            <MessageBubble 
              key={msg.id} 
              msg={msg} 
              isUser={msg.role === "user"} 
              isFullPage={true} 
              userAvatar={getUserAvatar()}
              userName={user?.fullName}
              copiedId={copiedId}
              setCopiedId={setCopiedId}
            />
          ))}
          {loading && <TypingIndicator isFullPage={true} />}
          <div ref={messagesEndRef} />
        </div>

        <AttachmentPreviewComponent attachments={attachments} removeAttachment={removeAttachment} isFullPage={true} />
        
        <div style={fullPageInputStyle}>
          <input type="file" ref={fileInputRef} onChange={handleFileAttach} multiple style={{ display: "none" }} />
          <button onClick={() => fileInputRef.current?.click()} style={fullPageActionBtn(false)} title="Attach file">
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
            placeholder="start.." 
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
        
        <div style={fullPageQuickActionsStyle}>
          {quickActions.map((action, idx) => (
            <button key={idx} onClick={() => setInput(action.action)} style={quickActionBtnStyle}>
              <span style={{ fontSize: "14px" }}>{action.emoji}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ==========================================
  // WIDGET MODE
  // ==========================================
  return (
    <div style={widgetContainerStyle}>
      <div style={widgetHeaderStyle}>
        <div style={widgetHeaderLeftStyle}>
          <img src={logoImg} alt="ZUCA" style={widgetLogoStyle} />
          <div>
            <h3 style={widgetTitleStyle}>ZUCA Admin AI</h3>
            <p style={widgetStatusStyle}>👑 Admin Mode • Groq AI</p>
          </div>
        </div>
        <div style={widgetHeaderActionsStyle}>
          <button onClick={openFullPage} style={widgetIconBtnStyle} title="Full Screen">
            <FiMaximize2 size={12} />
          </button>
          <button onClick={exportChat} style={widgetIconBtnStyle} title="Export">
            <FiDownload size={12} />
          </button>
          <button onClick={clearChat} style={widgetIconBtnStyle} title="Clear">
            <FiTrash size={12} />
          </button>
          <button onClick={handleClose} style={widgetIconBtnStyle} title="Close">
            <FiX size={12} />
          </button>
        </div>
      </div>

      <div style={widgetMessagesStyle}>
        {messages.slice(-15).map((msg) => (
          <MessageBubble 
            key={msg.id} 
            msg={msg} 
            isUser={msg.role === "user"} 
            isFullPage={false} 
            userAvatar={getUserAvatar()}
            userName={user?.fullName}
            copiedId={copiedId}
            setCopiedId={setCopiedId}
          />
        ))}
        {loading && <TypingIndicator isFullPage={false} />}
        <div ref={messagesEndRef} />
      </div>

      <AttachmentPreviewComponent attachments={attachments} removeAttachment={removeAttachment} isFullPage={false} />

      <div style={widgetInputStyle}>
        <input type="file" ref={fileInputRef} onChange={handleFileAttach} multiple style={{ display: "none" }} />
        <button onClick={() => fileInputRef.current?.click()} style={widgetActionBtn(false)}>
          <FiPaperclip size={12} />
        </button>
        <button onClick={isListening ? stopVoiceInput : startVoiceInput} style={widgetActionBtn(isListening)}>
          {isListening ? <FiMicOff size={12} /> : <FiMic size={12} />}
        </button>
        <textarea 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          onKeyPress={handleKeyPress} 
          placeholder="Admin command..." 
          style={widgetTextareaStyle}
          rows={1}
        />
        <button onClick={sendMessage} disabled={loading || (!input.trim() && attachments.length === 0)} style={widgetSendBtnStyle}>
          <FiSend size={12} />
        </button>
      </div>

      <div style={widgetQuickActionsStyle}>
        {quickActions.slice(0, 5).map((action, idx) => (
          <button key={idx} onClick={() => setInput(action.action)} style={widgetQuickBtnStyle}>
            {action.emoji} {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ==================== MESSAGE BUBBLE ====================
const MessageBubble = ({ msg, isUser, isFullPage, userAvatar, userName, copiedId, setCopiedId }) => {
  const handleCopy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch(e) {}
  };

  const getInitials = () => {
    if (userName) return userName.charAt(0).toUpperCase();
    return "A";
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
        width: isFullPage ? "40px" : "36px", 
        height: isFullPage ? "40px" : "36px", 
        borderRadius: "12px", 
        background: isUser 
          ? "linear-gradient(135deg, #3b82f6, #2563eb)" 
          : "linear-gradient(135deg, #dc2626, #991b1b)",
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        fontSize: isFullPage ? "18px" : "16px", 
        flexShrink: 0,
        color: "white",
        overflow: "hidden"
      }}>
        {isUser ? (
          userAvatar ? (
            <img src={userAvatar} alt="Admin" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : getInitials()
        ) : (
          <img src={logoImg} alt="ZUCA" style={{ width: "100%", height: "100%", objectFit: "cover", padding: isFullPage ? "8px" : "6px" }} />
        )}
      </div>
      
      <div style={{ 
        maxWidth: isFullPage ? "70%" : "75%", 
        padding: isFullPage ? "12px 16px" : "10px 14px", 
        borderRadius: "16px", 
        background: isUser ? "#eff6ff" : "#fef2f2", 
        color: "#1e293b", 
        fontSize: isFullPage ? "14px" : "13px", 
        lineHeight: "1.5", 
        border: isUser ? "1px solid #bfdbfe" : "1px solid #fecaca"
      }}>
        {isUser ? (
          <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
            a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" style={{ color: "#dc2626" }} />,
            table: ({node, ...props}) => <table {...props} style={{ borderCollapse: "collapse", width: "100%", margin: "8px 0" }} />,
            th: ({node, ...props}) => <th {...props} style={{ border: "1px solid #fecaca", padding: "6px", textAlign: "left", background: "#fef2f2" }} />,
            td: ({node, ...props}) => <td {...props} style={{ border: "1px solid #fecaca", padding: "6px" }} />,
            code: ({node, ...props}) => <code {...props} style={{ background: "#fef2f2", padding: "2px 4px", borderRadius: "4px" }} />
          }}>
            {msg.content}
          </ReactMarkdown>
        )}
        
        <div style={{ 
          fontSize: isFullPage ? "10px" : "9px", 
          color: "#94a3b8", 
          marginTop: "8px", 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center" 
        }}>
          <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <button 
            onClick={() => handleCopy(msg.content, msg.id)} 
            style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
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
  <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px" }}>
    <div style={{ 
      width: isFullPage ? "40px" : "36px", 
      height: isFullPage ? "40px" : "36px", 
      borderRadius: "12px", 
      background: "linear-gradient(135deg, #dc2626, #991b1b)",
      display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden"
    }}>
      <img src={logoImg} alt="ZUCA" style={{ width: "100%", height: "100%", objectFit: "cover", padding: isFullPage ? "8px" : "6px" }} />
    </div>
    <div style={{ 
      padding: isFullPage ? "12px 16px" : "10px 14px", 
      borderRadius: "16px", background: "#fef2f2", border: "1px solid #fecaca",
      display: "flex", gap: "8px", alignItems: "center"
    }}>
      <div className="typing-dot" style={{ animationDelay: "0s", background: "#dc2626" }}></div>
      <div className="typing-dot" style={{ animationDelay: "0.2s", background: "#dc2626" }}></div>
      <div className="typing-dot" style={{ animationDelay: "0.4s", background: "#dc2626" }}></div>
      <span style={{ fontSize: isFullPage ? "13px" : "11px", color: "#991b1b", marginLeft: "4px" }}>
        Admin AI is thinking...
      </span>
    </div>
  </div>
);

// ==================== ATTACHMENT PREVIEW ====================
const AttachmentPreviewComponent = ({ attachments, removeAttachment, isFullPage }) => {
  if (attachments.length === 0) return null;
  return (
    <div style={{ padding: "8px 16px", display: "flex", gap: "8px", flexWrap: "wrap", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
      {attachments.map(att => (
        <div key={att.id} style={{ background: "white", borderRadius: "20px", padding: "4px 12px", display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", border: "1px solid #e2e8f0" }}>
          📎 {att.name.length > 20 ? att.name.substring(0, 20) + '...' : att.name}
          <button onClick={() => removeAttachment(att.id)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "14px" }}>×</button>
        </div>
      ))}
    </div>
  );
};

// ==================== STYLES ====================

const fullPageContainerStyle = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "#f8fafc", zIndex: 999999, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Inter', -apple-system, sans-serif" };
const fullPageHeaderStyle = { padding: "1px 4px", background: "white", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, boxShadow: "0 1px 2px rgba(0,0,0,0.03)" };
const backButtonStyle = { padding: "8px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", color: "#475569", cursor: "pointer", fontSize: "13px", fontWeight: "500" };
const fullPageTitleStyle = { display: "flex", alignItems: "center", gap: "12px" };
const fullPageLogoStyle = { width: "44px", height: "44px", borderRadius: "12px", background: "#f8fafc", padding: "8px", objectFit: "contain" };
const adminBadgeStyle = { background: "#fef2f2", color: "#dc2626", padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", marginLeft: "12px" };
const iconBtnStyle = { width: "38px", height: "38px", borderRadius: "10px", background: "#f8fafc", border: "1px solid #e2e8f0", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" };
const fullPageMessagesStyle = { flex: 1, overflowY: "auto", padding: "24px" };
const fullPageInputStyle = { padding: "16px 24px", borderTop: "1px solid #e2e8f0", background: "white", display: "flex", gap: "12px", alignItems: "flex-end", flexShrink: 0 };
const fullPageActionBtn = (isListening) => ({ width: "44px", height: "44px", borderRadius: "22px", background: isListening ? "#fef2f2" : "#f8fafc", border: isListening ? "1px solid #ef4444" : "1px solid #e2e8f0", color: isListening ? "#ef4444" : "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" });
const fullPageTextareaStyle = { flex: 1, padding: "12px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "24px", color: "#1e293b", fontSize: "14px", resize: "none", fontFamily: "inherit", minHeight: "48px", maxHeight: "120px", outline: "none" };
const fullPageSendBtnStyle = { width: "44px", height: "44px", borderRadius: "22px", background: "#dc2626", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
const fullPageQuickActionsStyle = { padding: "12px 24px", borderTop: "1px solid #e2e8f0", background: "white", display: "flex", gap: "8px", flexWrap: "wrap", flexShrink: 0 };
const quickActionBtnStyle = { padding: "6px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "20px", color: "#475569", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" };

const widgetContainerStyle = { position: "fixed", bottom: "20px", right: "20px", width: "400px", height: "550px", background: "white", borderRadius: "20px", boxShadow: "0 20px 40px -12px rgba(0,0,0,0.25)", zIndex: 10000, display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid #e2e8f0", fontFamily: "'Inter', -apple-system, sans-serif" };
const widgetHeaderStyle = { padding: "12px 16px", background: "white", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 };
const widgetHeaderLeftStyle = { display: "flex", alignItems: "center", gap: "10px" };
const widgetLogoStyle = { width: "32px", height: "32px", borderRadius: "10px", background: "#f8fafc", padding: "6px", objectFit: "contain" };
const widgetTitleStyle = { margin: 0, color: "#0f172a", fontSize: "14px", fontWeight: "600" };
const widgetStatusStyle = { margin: 0, color: "#dc2626", fontSize: "10px", fontWeight: "500" };
const widgetHeaderActionsStyle = { display: "flex", gap: "6px" };
const widgetIconBtnStyle = { width: "28px", height: "28px", borderRadius: "8px", background: "#f8fafc", border: "1px solid #e2e8f0", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" };
const widgetMessagesStyle = { flex: 1, overflowY: "auto", padding: "16px", background: "#f8fafc" };
const widgetInputStyle = { padding: "12px 16px", borderTop: "1px solid #e2e8f0", background: "white", display: "flex", gap: "8px", alignItems: "flex-end", flexShrink: 0 };
const widgetActionBtn = (isListening) => ({ width: "34px", height: "34px", borderRadius: "17px", background: isListening ? "#fef2f2" : "#f8fafc", border: isListening ? "1px solid #ef4444" : "1px solid #e2e8f0", color: isListening ? "#ef4444" : "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" });
const widgetTextareaStyle = { flex: 1, padding: "8px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "20px", color: "#1e293b", fontSize: "12px", resize: "none", fontFamily: "inherit", minHeight: "36px", maxHeight: "80px", outline: "none" };
const widgetSendBtnStyle = { width: "34px", height: "34px", borderRadius: "17px", background: "#dc2626", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
const widgetQuickActionsStyle = { padding: "8px 12px", borderTop: "1px solid #e2e8f0", background: "white", display: "flex", flexWrap: "wrap", gap: "6px", flexShrink: 0 };
const widgetQuickBtnStyle = { padding: "4px 10px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "16px", color: "#475569", fontSize: "10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" };

// CSS Animation
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes typingWave {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
    30% { transform: translateY(-8px); opacity: 1; }
  }
  .typing-dot { width: 8px; height: 8px; background: #dc2626; border-radius: 50%; animation: typingWave 1.4s infinite ease-in-out; }
  button:hover { transform: translateY(-1px); }
  textarea:focus { border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.1); }
`;
if (!document.querySelector("#admin-ai-typing-animation")) {
  styleSheet.id = "admin-ai-typing-animation";
  document.head.appendChild(styleSheet);
}