// pages/admin/WhatsAppBot.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Plus, Search, Filter, RefreshCw, Link as LinkIcon, 
  Unlink, QrCode, Send, Users, MessageCircle, 
  Settings, AlertCircle, CheckCircle, XCircle,
  Loader, Copy, Check, Radio, Globe,
  ChevronDown, ChevronRight, Database, Hash,
  UserPlus, UserMinus, List, Layers, Sparkles, Wand2, History as HistoryIcon
} from 'lucide-react';
import { api } from '../../api';
import { useNavigate } from 'react-router-dom';

export default function WhatsAppBot() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [groupId, setGroupId] = useState('');
  const [newGroupId, setNewGroupId] = useState('');
  const [message, setMessage] = useState('');
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [groups, setGroups] = useState([]);
  const [activeGroups, setActiveGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [groupMessage, setGroupMessage] = useState('');
  const [broadcastGroupMessage, setBroadcastGroupMessage] = useState('');
  const [expandedGroupId, setExpandedGroupId] = useState(null);
  const [groupMembers, setGroupMembers] = useState({});
  const [showGroupMembers, setShowGroupMembers] = useState({});

  // ✅ AI Message Assistant States
  const [aiMessageInput, setAiMessageInput] = useState('');
  const [aiMessageOutput, setAiMessageOutput] = useState('');
  const [aiMessageLoading, setAiMessageLoading] = useState(false);
  const [aiMessageType, setAiMessageType] = useState('polish');
  const [aiMessageTone, setAiMessageTone] = useState('professional');

  // ✅ Cache refs
  const groupsCache = useRef({
    data: null,
    timestamp: 0,
    ttl: 60000 // 1 minute cache
  });
  
  const statusCache = useRef({
    data: null,
    timestamp: 0,
    ttl: 30000 // 30 seconds cache
  });

  // ✅ Debounce ref
  const debounceTimeout = useRef(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ==================== CACHED FETCH STATUS ====================
  const fetchStatus = useCallback(async (force = false) => {
    const now = Date.now();
    
    if (!force && statusCache.current.data && 
        (now - statusCache.current.timestamp) < statusCache.current.ttl) {
      console.log('📦 Using cached status data');
      setStatus(statusCache.current.data);
      return statusCache.current.data;
    }
    
    try {
      console.log('🔄 Fetching fresh status...');
      const response = await api.get('/api/admin/whatsapp/status', { headers });
      const data = response.data.status || response.data;
      
      statusCache.current.data = data;
      statusCache.current.timestamp = now;
      
      setStatus(data);
      if (data.groupId) {
        setGroupId(data.groupId);
        setNewGroupId(data.groupId);
      }
      if (data.qrCode) {
        setQrCode(data.qrCode);
        setShowQR(true);
      }
      return data;
    } catch (error) {
      console.error('Error fetching status:', error);
      showToast('Failed to fetch WhatsApp status', 'error');
      return null;
    }
  }, []);

  // ==================== CACHED FETCH GROUPS ====================
  const fetchGroups = useCallback(async (force = false) => {
    const now = Date.now();
    
    if (!force && groupsCache.current.data && 
        (now - groupsCache.current.timestamp) < groupsCache.current.ttl) {
      console.log('📦 Using cached groups data');
      const groupList = groupsCache.current.data;
      setGroups(groupList);
      const active = groupList.filter(g => g.isActive) || [];
      setActiveGroups(active);
      return groupList;
    }
    
    try {
      console.log('🔄 Fetching fresh groups...');
      const response = await api.get('/api/admin/whatsapp/groups', { headers });
      
      if (response.data.success) {
        const groupList = response.data.groups || [];
        
        groupsCache.current.data = groupList;
        groupsCache.current.timestamp = now;
        
        setGroups(groupList);
        const active = groupList.filter(g => g.isActive) || [];
        setActiveGroups(active);
        return groupList;
      }
    } catch (error) {
      if (error.response?.data?.error === 'rate-overlimit' && groupsCache.current.data) {
        console.log('⚠️ Rate limited, using cached groups data');
        const groupList = groupsCache.current.data;
        setGroups(groupList);
        const active = groupList.filter(g => g.isActive) || [];
        setActiveGroups(active);
        return groupList;
      }
      
      console.error('Error fetching groups:', error);
      showToast('Failed to fetch groups', 'error');
      return null;
    }
  }, []);

  // ==================== DEBOUNCED FETCH ====================
  const debouncedFetch = useCallback((type, force = false) => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    
    debounceTimeout.current = setTimeout(() => {
      if (type === 'status') {
        fetchStatus(force);
      } else if (type === 'groups') {
        fetchGroups(force);
      } else if (type === 'all') {
        fetchStatus(force);
        fetchGroups(force);
      }
      debounceTimeout.current = null;
    }, 300);
  }, [fetchStatus, fetchGroups]);

  // ==================== FETCH GROUP MEMBERS ====================
  const fetchGroupMembers = async (groupId) => {
    if (groupMembers[groupId]) {
      console.log('📦 Using cached group members');
      return;
    }
    
    try {
      const response = await api.get(`/api/admin/whatsapp/groups/${groupId}/members`, { headers });
      if (response.data.success) {
        setGroupMembers(prev => ({ ...prev, [groupId]: response.data.members }));
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      showToast('Failed to fetch group members', 'error');
    }
  };

  // ==================== EFFECTS ====================
  useEffect(() => {
    fetchStatus();
    fetchGroups();
    
    const statusInterval = setInterval(() => {
      const now = Date.now();
      if ((now - statusCache.current.timestamp) >= statusCache.current.ttl) {
        fetchStatus();
      }
    }, 15000);
    
    const groupsInterval = setInterval(() => {
      const now = Date.now();
      if ((now - groupsCache.current.timestamp) >= groupsCache.current.ttl) {
        fetchGroups();
      }
    }, 30000);
    
    return () => {
      clearInterval(statusInterval);
      clearInterval(groupsInterval);
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [fetchStatus, fetchGroups]);

  // ==================== ACTIONS ====================

  const handleLink = async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/admin/whatsapp/link', {}, { headers });
      if (response.data.success) {
        showToast('WhatsApp linking initiated! Scan the QR code with your phone.');
        if (response.data.qrCode) {
          setQrCode(response.data.qrCode);
          setShowQR(true);
        }
        setTimeout(() => fetchStatus(true), 2000);
      }
    } catch (error) {
      showToast('Failed to link WhatsApp: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm('Are you sure you want to unlink WhatsApp? This will disconnect the bot.')) return;
    
    setLoading(true);
    try {
      await api.post('/api/admin/whatsapp/unlink', { force: true }, { headers });
      showToast('WhatsApp unlinked successfully');
      setQrCode(null);
      setShowQR(false);
      fetchStatus(true);
    } catch (error) {
      showToast('Failed to unlink WhatsApp: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSetGroup = async () => {
    if (!newGroupId) {
      showToast('Please enter a group ID', 'error');
      return;
    }
    
    setActionLoading(true);
    try {
      await api.post('/api/admin/whatsapp/group', { groupId: newGroupId }, { headers });
      showToast('Default Group ID set successfully!');
      setGroupId(newGroupId);
      fetchStatus(true);
    } catch (error) {
      showToast('Failed to set group ID: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ==================== GROUP MANAGEMENT ====================
  const handleActivateGroup = async (groupId) => {
    setActionLoading(true);
    try {
      await api.post('/api/admin/whatsapp/groups/activate', { groupId }, { headers });
      showToast('Group activated successfully!');
      fetchGroups(true);
    } catch (error) {
      showToast('Failed to activate group: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivateGroup = async (groupId) => {
    setActionLoading(true);
    try {
      await api.post('/api/admin/whatsapp/groups/deactivate', { groupId }, { headers });
      showToast('Group deactivated successfully!');
      fetchGroups(true);
    } catch (error) {
      showToast('Failed to deactivate group: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefreshGroups = async () => {
    setActionLoading(true);
    try {
      await api.post('/api/admin/whatsapp/groups/refresh', {}, { headers });
      showToast('Groups refreshed successfully!');
      fetchGroups(true);
    } catch (error) {
      showToast('Failed to refresh groups', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ==================== SEND MESSAGES ====================

  const handleSendToDefaultGroup = async () => {
    if (!message.trim()) {
      showToast('Please enter a message', 'error');
      return;
    }
    
    setActionLoading(true);
    try {
      await api.post('/api/admin/whatsapp/test-group', { message }, { headers });
      showToast('Message sent to default group!');
      setMessage('');
    } catch (error) {
      showToast('Failed to send message: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendToSpecificGroup = async () => {
    if (!selectedGroupId || !groupMessage.trim()) {
      showToast('Please select a group and enter a message', 'error');
      return;
    }
    
    setActionLoading(true);
    try {
      await api.post('/api/admin/whatsapp/send', { 
        groupId: selectedGroupId, 
        message: groupMessage 
      }, { headers });
      showToast('Message sent to group!');
      setGroupMessage('');
    } catch (error) {
      showToast('Failed to send message: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBroadcastToGroups = async () => {
    if (!broadcastGroupMessage.trim()) {
      showToast('Please enter a message', 'error');
      return;
    }
    
    if (activeGroups.length === 0) {
      showToast('No active groups to broadcast to. Please activate a group first.', 'error');
      return;
    }
    
    if (!confirm(`Send broadcast to ALL active groups? (${activeGroups.length} groups)`)) return;
    
    setActionLoading(true);
    try {
      const response = await api.post('/api/admin/whatsapp/broadcast-all', { 
        message: broadcastGroupMessage 
      }, { headers });
      
      const successCount = response.data.summary?.success || 0;
      showToast(`Broadcast sent to ${successCount} groups!`);
      setBroadcastGroupMessage('');
    } catch (error) {
      showToast('Broadcast failed: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ==================== AI MESSAGE ASSISTANT ====================
  const handleAIPolishMessage = async () => {
    if (!aiMessageInput.trim()) {
      showToast('Please enter a message to polish', 'error');
      return;
    }

    setAiMessageLoading(true);
    try {
      const response = await api.post('/api/admin/ai/polish-message', {
        message: aiMessageInput,
        tone: aiMessageTone,
        type: aiMessageType
      }, { headers });

      if (response.data.success) {
        setAiMessageOutput(response.data.polished);
        showToast('✅ Message polished successfully!');
      } else {
        showToast('Failed to polish message: ' + (response.data.error || 'Unknown error'), 'error');
      }
    } catch (error) {
      console.error('AI polish error:', error);
      showToast('Failed to polish message: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setAiMessageLoading(false);
    }
  };

  const handleUsePolishedMessage = (targetField) => {
    if (!aiMessageOutput) {
      showToast('Please generate a polished message first', 'error');
      return;
    }

    switch(targetField) {
      case 'defaultGroup':
        setMessage(aiMessageOutput);
        break;
      case 'specificGroup':
        setGroupMessage(aiMessageOutput);
        break;
      case 'groupBroadcast':
        setBroadcastGroupMessage(aiMessageOutput);
        break;
      default:
        break;
    }
    showToast('✅ Message copied to field!');
  };

  // ==================== UTILITY ====================

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  // ==================== FORMAT MEMBER NAME ====================
const formatMemberName = (member) => {
  if (!member) return 'Unknown Member';
  
  let name = member.name || member.id || 'Unknown Member';
  
  // If it's a LID (Linked Device ID)
  if (name.includes('@lid')) {
    const lidNumber = name.replace('@lid', '');
    return `👤 User ${lidNumber.slice(-6)}`;
  }
  
  // If it's a phone number
  if (name.includes('@s.whatsapp.net')) {
    const phone = name.replace('@s.whatsapp.net', '');
    if (phone.startsWith('254')) {
      const formatted = phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
      return `📱 ${formatted}`;
    }
    return `📱 ${phone}`;
  }
  
  return name;
};

  const toggleGroupMembers = (groupId) => {
    setShowGroupMembers(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    if (!groupMembers[groupId]) {
      fetchGroupMembers(groupId);
    }
  };

  const getStatusBadge = () => {
    if (!status) return { label: 'Unknown', color: '#64748b', bg: '#f1f5f9' };
    
    const connectionStatus = status.connectionStatus || status.status || 'disconnected';
    
    const statusMap = {
      'connected': { label: '✅ Connected', color: '#22c55e', bg: '#dcfce7' },
      'disconnected': { label: '❌ Disconnected', color: '#ef4444', bg: '#fee2e2' },
      'connecting': { label: '⏳ Connecting...', color: '#f59e0b', bg: '#fef3c7' },
      'qr_required': { label: '📱 QR Required', color: '#3b82f6', bg: '#dbeafe' },
      'logged_out': { label: '🚫 Logged Out', color: '#ef4444', bg: '#fee2e2' },
      'error': { label: '⚠️ Error', color: '#ef4444', bg: '#fee2e2' },
      'reconnecting': { label: '🔄 Reconnecting...', color: '#f59e0b', bg: '#fef3c7' }
    };
    
    const info = statusMap[connectionStatus] || statusMap.disconnected;
    return info;
  };

  return (
    <div className="whatsapp-container">
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      {/* ==================== HEADER ==================== */}
      <div className="page-header">
        <div className="header-left">
          <div className="title-icon">
            <MessageCircle size={24} />
          </div>
          <div>
            <h1>WhatsApp Bot</h1>
            <p className="subtitle">Manage WhatsApp integration for ZUCA</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-history" onClick={() => navigate('/admin/message-history')}>
            <HistoryIcon size={18} /> Message History
          </button>
          <button className="btn-refresh" onClick={() => { fetchStatus(); fetchGroups(); }}>
            <RefreshCw size={18} /> Refresh
          </button>
        </div>
      </div>

      {/* ==================== AI MESSAGE ASSISTANT ==================== */}
      <div className="card full-width ai-assistant-card">
        <div className="card-header">
          <Sparkles size={18} style={{ color: '#8b5cf6' }} />
          <h3>AI Message Assistant</h3>
          <span className="badge">✨ Polish • Formal • Announcement</span>
        </div>
        <div className="card-body">
          <div className="ai-assistant-grid">
            <div className="ai-input-section">
              <div className="ai-controls">
                <select
                  value={aiMessageType}
                  onChange={(e) => setAiMessageType(e.target.value)}
                  className="ai-select"
                >
                  <option value="polish">✨ Polish</option>
                  <option value="formal">🎩 Formal</option>
                  <option value="casual">💬 Casual</option>
                  <option value="announcement">📢 Announcement</option>
                  <option value="prayer">🙏 Prayer</option>
                </select>
                <select
                  value={aiMessageTone}
                  onChange={(e) => setAiMessageTone(e.target.value)}
                  className="ai-select"
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="warm">Warm</option>
                  <option value="urgent">Urgent</option>
                </select>
                <button 
                  className="btn-ai-generate"
                  onClick={handleAIPolishMessage}
                  disabled={aiMessageLoading || !aiMessageInput.trim()}
                >
                  {aiMessageLoading ? <Loader size={16} className="spin" /> : <Wand2 size={16} />}
                  {aiMessageLoading ? 'Generating...' : 'Generate'}
                </button>
              </div>
              <textarea
                placeholder="Describe what you want to say... e.g., 'Tell members about the mass this Sunday at 10am'"
                value={aiMessageInput}
                onChange={(e) => setAiMessageInput(e.target.value)}
                rows="3"
                className="ai-textarea"
              />
              <div className="ai-hint">
                <AlertCircle size={14} />
                <span>Describe your message naturally, and AI will polish it for you</span>
              </div>
            </div>
            <div className="ai-output-section">
              {aiMessageOutput ? (
                <>
                  <div className="ai-output-header">
                    <span className="ai-output-label">✨ Polished Message</span>
                    <button 
                      className="btn-copy-output"
                      onClick={() => copyToClipboard(aiMessageOutput)}
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="ai-output-content">
                    {aiMessageOutput}
                  </div>
                  <div className="ai-output-actions">
                    <span className="ai-action-label">Use in:</span>
                    <button className="btn-use-message" onClick={() => handleUsePolishedMessage('defaultGroup')}>
                      Default Group
                    </button>
                    <button className="btn-use-message" onClick={() => handleUsePolishedMessage('specificGroup')}>
                      Specific Group
                    </button>
                    <button className="btn-use-message" onClick={() => handleUsePolishedMessage('groupBroadcast')}>
                      Group Broadcast
                    </button>
                  </div>
                </>
              ) : (
                <div className="ai-empty-state">
                  <Sparkles size={48} style={{ color: '#cbd5e1' }} />
                  <p>Describe your message above and click Generate</p>
                  <p className="ai-empty-sub">AI will help you craft a professional message</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ==================== STATUS CARD ==================== */}
      <div className="status-card">
        <div className="status-header">
          <div className="status-indicator">
            <span className="status-dot" style={{ 
              background: status?.connected ? '#22c55e' : '#ef4444' 
            }} />
            <span className="status-label">
              {status?.connected ? 'Bot is Online' : 'Bot is Offline'}
            </span>
          </div>
          <div className="status-badge" style={{ 
            background: getStatusBadge().bg, 
            color: getStatusBadge().color 
          }}>
            {getStatusBadge().label}
          </div>
        </div>
        
        <div className="status-details">
          <div className="detail-item">
            <span className="detail-label">Bot Number</span>
            <span className="detail-value">{status?.botNumber || 'N/A'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Default Group ID</span>
            <span className="detail-value">
              {groupId || 'Not set'}
              {groupId && (
                <button className="copy-btn" onClick={() => copyToClipboard(groupId)}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              )}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Connection Status</span>
            <span className="detail-value">{status?.connectionStatus || 'Unknown'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Reconnect Attempts</span>
            <span className="detail-value">{status?.reconnectAttempts || 0} / {status?.maxReconnectAttempts || 10}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Total Groups</span>
            <span className="detail-value">{groups.length}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Active Groups</span>
            <span className="detail-value">{activeGroups.length}</span>
          </div>
          {status?.lastError && (
            <div className="detail-item error">
              <span className="detail-label">Last Error</span>
              <span className="detail-value">{status.lastError}</span>
            </div>
          )}
        </div>

        <div className="status-actions">
          {(!status?.connected || status?.connectionStatus === 'disconnected' || status?.connectionStatus === 'logged_out') && (
            <button className="btn-link" onClick={handleLink} disabled={loading}>
              {loading ? <Loader size={18} className="spin" /> : <LinkIcon size={18} />}
              Link WhatsApp
            </button>
          )}
          {(status?.connected || status?.connectionStatus === 'connected') && (
            <button className="btn-unlink" onClick={handleUnlink} disabled={loading}>
              <Unlink size={18} /> Unlink
            </button>
          )}
        </div>
      </div>

      {/* ==================== QR CODE DISPLAY ==================== */}
      {showQR && qrCode && (
        <div className="qr-section">
          <div className="qr-container">
            <h3>📱 Scan QR Code</h3>
            <img src={qrCode} alt="WhatsApp QR Code" className="qr-image" />
            <p className="qr-instructions">
              1. Open WhatsApp on your phone<br />
              2. Tap Menu → Linked Devices<br />
              3. Tap "Link a Device" and scan this QR code
            </p>
            <button className="btn-close-qr" onClick={() => setShowQR(false)}>
              Close QR
            </button>
          </div>
        </div>
      )}

      {/* ==================== GROUPS MANAGEMENT ==================== */}
      <div className="card full-width">
        <div className="card-header">
          <Layers size={18} />
          <h3>Group Management</h3>
          <span className="badge">{groups.length} groups • {activeGroups.length} active</span>
          <button className="btn-refresh-small" onClick={handleRefreshGroups} disabled={actionLoading}>
            {actionLoading ? <Loader size={14} className="spin" /> : <RefreshCw size={14} />}
            Refresh
          </button>
        </div>
        <div className="card-body">
          {groups.length === 0 ? (
            <div className="empty-state">
              <MessageCircle size={48} />
              <p>No groups found. Link WhatsApp first to see groups.</p>
            </div>
          ) : (
            <div className="groups-grid">
              {groups.map(group => (
                <div key={group.id} className={`group-item ${group.isActive ? 'active' : 'inactive'}`}>
                  <div className="group-info">
                    <div className="group-name">
                      {group.name}
                      {group.isCommunity && <span className="community-badge">Community</span>}
                    </div>
                    <div className="group-details">
                      <span className="group-id">{group.id}</span>
                      <span className="group-members">{group.participants} members</span>
                      {group.description && (
                        <span className="group-desc">{group.description}</span>
                      )}
                    </div>
                    <button 
                      className="btn-toggle-members"
                      onClick={() => toggleGroupMembers(group.id)}
                    >
                      {showGroupMembers[group.id] ? 'Hide Members' : 'Show Members'}
                    </button>
               {showGroupMembers[group.id] && groupMembers[group.id] && (
  <div className="group-members-list">
    {groupMembers[group.id].slice(0, 20).map((member, index) => {
      // ✅ Use the formatMemberName function
      const displayName = formatMemberName(member);
      
      // Check if it's the bot itself
      const isBot = member.id === status?.botNumber || 
                    member.id?.includes(status?.botNumber) ||
                    member.id === status?.lid;
      
      return (
        <div key={member.id || index} className={`member-item ${isBot ? 'bot-member' : ''}`}>
          <span>{displayName}</span>
          {isBot && <span className="bot-badge">🤖 Bot</span>}
        </div>
      );
    })}
    {groupMembers[group.id].length > 20 && (
      <div className="member-more">... and {groupMembers[group.id].length - 20} more</div>
    )}
  </div>
)}
                  </div>
                  <div className="group-actions">
                    <span className={`group-status ${group.isActive ? 'active' : 'inactive'}`}>
                      {group.isActive ? '✅ Active' : '⬜ Inactive'}
                    </span>
                    {group.isActive ? (
                      <button className="btn-deactivate" onClick={() => handleDeactivateGroup(group.id)}>
                        Deactivate
                      </button>
                    ) : (
                      <button className="btn-activate" onClick={() => handleActivateGroup(group.id)}>
                        Activate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ==================== CONTENT GRID ==================== */}
      <div className="content-grid">
        {/* ===== Set Default Group ID ===== */}
        <div className="card">
          <div className="card-header">
            <Hash size={18} />
            <h3>Default Group ID</h3>
          </div>
          <div className="card-body">
            <div className="input-group">
              <input
                type="text"
                placeholder="Enter Group ID (e.g., 120363428001788260@g.us)"
                value={newGroupId}
                onChange={(e) => setNewGroupId(e.target.value)}
              />
              <button className="btn-set" onClick={handleSetGroup} disabled={actionLoading}>
                {actionLoading ? <Loader size={16} className="spin" /> : 'Set'}
              </button>
            </div>
            <div className="hint">
              <AlertCircle size={14} />
              <span>Format: [number]@g.us (e.g., 120363428001788260@g.us)</span>
            </div>
          </div>
        </div>

        {/* ===== Send to Default Group ===== */}
        <div className="card">
          <div className="card-header">
            <Send size={18} />
            <h3>Send to Default Group</h3>
            {message && aiMessageOutput && (
              <span className="badge ai-badge">✨ AI</span>
            )}
          </div>
          <div className="card-body">
            <textarea
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows="3"
            />
            <button className="btn-send" onClick={handleSendToDefaultGroup} disabled={actionLoading || !message.trim()}>
              {actionLoading ? <Loader size={16} className="spin" /> : <Send size={16} />}
              Send to Default Group
            </button>
          </div>
        </div>

        {/* ===== Send to Specific Group ===== */}
        <div className="card">
          <div className="card-header">
            <Globe size={18} />
            <h3>Send to Specific Group</h3>
            {groupMessage && aiMessageOutput && (
              <span className="badge ai-badge">✨ AI</span>
            )}
          </div>
          <div className="card-body">
            <select 
              value={selectedGroupId} 
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="group-select"
            >
              <option value="">Select a group...</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.participants} members) {group.isActive ? '✅' : '⬜'}
                </option>
              ))}
            </select>
            <textarea
              placeholder="Type your message here..."
              value={groupMessage}
              onChange={(e) => setGroupMessage(e.target.value)}
              rows="3"
            />
            <button className="btn-send" onClick={handleSendToSpecificGroup} disabled={actionLoading || !selectedGroupId || !groupMessage.trim()}>
              {actionLoading ? <Loader size={16} className="spin" /> : <Send size={16} />}
              Send to Selected Group
            </button>
          </div>
        </div>

        {/* ===== Broadcast to All Active Groups ===== */}
        <div className="card">
          <div className="card-header">
            <Radio size={18} />
            <h3>Broadcast to Groups</h3>
            <span className="badge">{activeGroups.length} active</span>
            {broadcastGroupMessage && aiMessageOutput && (
              <span className="badge ai-badge">✨ AI</span>
            )}
          </div>
          <div className="card-body">
            <div className="warning-box">
              <AlertCircle size={18} />
              <span>This will send to ALL {activeGroups.length} active groups!</span>
            </div>
            <textarea
              placeholder="Broadcast message..."
              value={broadcastGroupMessage}
              onChange={(e) => setBroadcastGroupMessage(e.target.value)}
              rows="4"
            />
            <button className="btn-broadcast" onClick={handleBroadcastToGroups} disabled={actionLoading || !broadcastGroupMessage.trim() || activeGroups.length === 0}>
              {actionLoading ? <Loader size={16} className="spin" /> : <Radio size={16} />}
              Broadcast to {activeGroups.length} Groups
            </button>
          </div>
        </div>
      </div>

      {/* ==================== STYLES ==================== */}
      <style>{`
        .whatsapp-container {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
          background: #f8fafc;
          min-height: 100vh;
        }

        .ai-assistant-card {
          border-color: #8b5cf6;
          background: linear-gradient(135deg, #faf5ff 0%, #ffffff 100%);
        }

        .ai-assistant-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        .ai-controls {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .ai-select {
          padding: 8px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 13px;
          background: white;
          outline: none;
          flex: 1;
          min-width: 120px;
        }

        .ai-select:focus {
          border-color: #8b5cf6;
        }

        .btn-ai-generate {
          padding: 8px 20px;
          background: #7c3aed;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 13px;
          white-space: nowrap;
        }

        .btn-ai-generate:hover:not(:disabled) {
          background: #6d28d9;
        }

        .btn-ai-generate:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .ai-textarea {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          font-family: inherit;
          resize: vertical;
          background: white;
        }

        .ai-textarea:focus {
          border-color: #8b5cf6;
        }

        .ai-hint {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #f5f3ff;
          border-radius: 8px;
          font-size: 12px;
          color: #6d28d9;
          margin-top: 8px;
        }

        .ai-output-section {
          background: #f8fafc;
          border-radius: 12px;
          padding: 16px;
          min-height: 180px;
          display: flex;
          flex-direction: column;
        }

        .ai-output-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .ai-output-label {
          font-weight: 600;
          font-size: 14px;
          color: #4b5563;
        }

        .btn-copy-output {
          padding: 4px 12px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
        }

        .btn-copy-output:hover {
          background: #f1f5f9;
        }

        .ai-output-content {
          flex: 1;
          padding: 12px;
          background: white;
          border-radius: 8px;
          white-space: pre-wrap;
          font-size: 14px;
          line-height: 1.6;
          color: #1e293b;
          border: 1px solid #e2e8f0;
          max-height: 200px;
          overflow-y: auto;
        }

        .ai-output-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          flex-wrap: wrap;
          align-items: center;
        }

        .ai-action-label {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
        }

        .btn-use-message {
          padding: 4px 12px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          cursor: pointer;
          font-size: 11px;
          color: #475569;
          transition: all 0.2s;
        }

        .btn-use-message:hover {
          background: #8b5cf6;
          color: white;
          border-color: #8b5cf6;
        }

        .ai-empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          text-align: center;
          padding: 20px;
        }

        .ai-empty-state p {
          margin: 8px 0 0;
          font-size: 14px;
        }

        .ai-empty-sub {
          font-size: 12px !important;
          color: #cbd5e1 !important;
        }

        .ai-badge {
          background: #f5f3ff;
          color: #7c3aed;
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 10px;
          margin-left: auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
          background: white;
          padding: 20px 24px;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .title-icon {
          width: 48px;
          height: 48px;
          background: #25D366;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .page-header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
        }

        .subtitle {
          margin: 4px 0 0;
          font-size: 14px;
          color: #64748b;
        }

        .btn-refresh {
          padding: 8px 16px;
          background: #f1f5f9;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .btn-refresh:hover {
          background: #e2e8f0;
        }

        .btn-history {
          padding: 8px 16px;
          background: #1e293b;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .btn-history:hover {
          background: #0f172a;
        }

        .status-card {
          background: white;
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 24px;
          border: 1px solid #e2e8f0;
        }

        .status-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .status-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          display: inline-block;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .status-label {
          font-weight: 600;
          font-size: 16px;
        }

        .status-badge {
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
        }

        .status-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
          margin: 16px 0;
          padding: 16px;
          background: #f8fafc;
          border-radius: 12px;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .detail-label {
          font-size: 12px;
          color: #94a3b8;
          text-transform: uppercase;
          font-weight: 600;
        }

        .detail-value {
          font-size: 14px;
          font-weight: 500;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 8px;
          word-break: break-all;
        }

        .detail-item.error .detail-value {
          color: #ef4444;
        }



        .member-item.bot-member {
  background: #dbeafe;
  border-radius: 4px;
  padding: 4px 8px;
}

.bot-badge {
  font-size: 10px;
  background: #3b82f6;
  color: white;
  padding: 1px 8px;
  border-radius: 10px;
  margin-left: 8px;
}

        .copy-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #94a3b8;
          padding: 4px;
          border-radius: 4px;
        }

        .copy-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .status-actions {
          display: flex;
          gap: 12px;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
        }

        .btn-link {
          padding: 10px 24px;
          background: #25D366;
          color: white;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
        }

        .btn-link:hover:not(:disabled) {
          background: #20b859;
        }

        .btn-unlink {
          padding: 10px 24px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
        }

        .btn-unlink:hover:not(:disabled) {
          background: #dc2626;
        }

        .btn-link:disabled, .btn-unlink:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .qr-section {
          background: white;
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 24px;
          border: 1px solid #e2e8f0;
          text-align: center;
        }

        .qr-container h3 {
          margin: 0 0 16px;
          color: #0f172a;
        }

        .qr-image {
          max-width: 300px;
          border: 4px solid #e2e8f0;
          border-radius: 12px;
        }

        .qr-instructions {
          margin: 16px 0;
          color: #64748b;
          line-height: 1.8;
        }

        .btn-close-qr {
          padding: 8px 20px;
          background: #f1f5f9;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        }

        .btn-close-qr:hover {
          background: #e2e8f0;
        }

        .content-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 24px;
        }

        .card {
          background: white;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }

        .card.full-width {
          grid-column: 1 / -1;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          background: #fafbfc;
          border-bottom: 1px solid #e2e8f0;
        }

        .card-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #0f172a;
        }

        .card-body {
          padding: 20px;
        }

        .input-group {
          display: flex;
          gap: 12px;
        }

        .input-group input {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
        }

        .input-group input:focus {
          border-color: #25D366;
        }

        .card-body input,
        .card-body textarea {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          margin-bottom: 12px;
          font-family: inherit;
        }

        .card-body input:focus,
        .card-body textarea:focus {
          border-color: #25D366;
        }

        .card-body textarea {
          resize: vertical;
        }

        .btn-set {
          padding: 10px 20px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          white-space: nowrap;
        }

        .btn-set:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .btn-send {
          width: 100%;
          padding: 10px;
          background: #075e54;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 600;
        }

        .btn-send:hover:not(:disabled) {
          background: #054a44;
        }

        .btn-broadcast {
          width: 100%;
          padding: 12px;
          background: #7c3aed;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 600;
        }

        .btn-broadcast:hover:not(:disabled) {
          background: #6d28d9;
        }

        .btn-set:disabled,
        .btn-send:disabled,
        .btn-broadcast:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .hint {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: #fef3c7;
          border-radius: 8px;
          font-size: 13px;
          color: #92400e;
          margin-top: 8px;
        }

        .warning-box {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #fee2e2;
          border-radius: 8px;
          color: #991b1b;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .groups-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 12px;
        }

        .group-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 14px 18px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: white;
          transition: all 0.2s;
          gap: 12px;
        }

        .group-item.active {
          border-color: #22c55e;
          background: #f0fdf4;
        }

        .group-item.inactive {
          border-color: #e2e8f0;
          background: #f8fafc;
        }

        .group-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .group-info {
          flex: 1;
          min-width: 0;
        }

        .group-name {
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .community-badge {
          font-size: 10px;
          background: #dbeafe;
          color: #2563eb;
          padding: 2px 8px;
          border-radius: 12px;
          font-weight: 500;
        }

        .group-details {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          font-size: 12px;
          color: #64748b;
        }

        .group-id {
          font-family: monospace;
          background: #f1f5f9;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
        }

        .group-members {
          color: #64748b;
        }

        .group-desc {
          color: #94a3b8;
          font-style: italic;
          width: 100%;
        }

        .group-actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
          flex-shrink: 0;
        }

        .group-status {
          font-size: 12px;
          font-weight: 600;
        }

        .group-status.active {
          color: #22c55e;
        }

        .group-status.inactive {
          color: #94a3b8;
        }

        .btn-activate {
          padding: 4px 14px;
          background: #22c55e;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
        }

        .btn-activate:hover {
          background: #16a34a;
        }

        .btn-deactivate {
          padding: 4px 14px;
          background: #f1f5f9;
          color: #64748b;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
        }

        .btn-deactivate:hover {
          background: #e2e8f0;
        }

        .btn-toggle-members {
          margin-top: 6px;
          padding: 2px 12px;
          background: none;
          border: none;
          color: #3b82f6;
          font-size: 12px;
          cursor: pointer;
          text-decoration: underline;
        }

        .btn-toggle-members:hover {
          color: #2563eb;
        }

        .group-members-list {
          margin-top: 8px;
          max-height: 200px;
          overflow-y: auto;
          background: #f8fafc;
          border-radius: 8px;
          padding: 8px 12px;
        }

        .member-item {
          padding: 4px 0;
          font-size: 13px;
          color: #0f172a;
          border-bottom: 1px solid #f1f5f9;
        }

        .member-item:last-child {
          border-bottom: none;
        }

        .member-more {
          font-size: 12px;
          color: #94a3b8;
          padding-top: 4px;
        }

        .badge {
          background: #f1f5f9;
          padding: 2px 12px;
          border-radius: 12px;
          font-size: 12px;
          color: #64748b;
          margin-left: auto;
        }

        .group-select {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          margin-bottom: 12px;
          background: white;
        }

        .group-select:focus {
          border-color: #25D366;
        }

        .btn-refresh-small {
          padding: 4px 12px;
          background: #f1f5f9;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
        }

        .btn-refresh-small:hover {
          background: #e2e8f0;
        }

        .btn-refresh-small:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #94a3b8;
        }

        .empty-state svg {
          margin-bottom: 12px;
          color: #cbd5e1;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .toast {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 12px 24px;
          border-radius: 12px;
          color: white;
          z-index: 1100;
          font-size: 14px;
          max-width: 90%;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .toast.success { background: #22c55e; }
        .toast.error { background: #ef4444; }
        .toast.info { background: #3b82f6; }

        @media (max-width: 768px) {
          .whatsapp-container { padding: 16px; }
          .content-grid { grid-template-columns: 1fr; }
          .input-group { flex-direction: column; }
          .status-details { grid-template-columns: 1fr; }
          .status-header { flex-direction: column; align-items: flex-start; }
          .page-header { flex-direction: column; align-items: flex-start; }
          .groups-grid { grid-template-columns: 1fr; }
          .group-item { flex-direction: column; align-items: stretch; }
          .group-actions { flex-direction: row; align-items: center; justify-content: space-between; }
          .header-actions { width: 100%; }
          .btn-refresh { width: 100%; justify-content: center; }
          
          .ai-assistant-grid {
            grid-template-columns: 1fr;
          }
          
          .ai-controls {
            flex-direction: column;
          }
          
          .ai-select {
            width: 100%;
          }
          
          .ai-output-actions {
            flex-direction: column;
            align-items: stretch;
          }
          
          .btn-use-message {
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}