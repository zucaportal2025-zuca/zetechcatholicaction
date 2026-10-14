// src/pages/admin/MessageHistory.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, RefreshCw, Search, Filter, Edit2, Trash2, 
  Copy, Check, Loader, MessageCircle, Users, Phone,
  Calendar, Clock, AlertCircle, XCircle, CheckCircle,
  Eye, EyeOff, BarChart3, Download, ChevronLeft, ChevronRight,
  History as HistoryIcon, Inbox, ChevronDown, ChevronUp,
  Layers, Send, Globe, Radio, Trash, X
} from 'lucide-react';
import { api } from '../../api';
import { useNavigate } from 'react-router-dom';

export default function MessageHistory() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [editingMessage, setEditingMessage] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState(null);
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(false);
  const [groupNames, setGroupNames] = useState({});
  const [expandedMessages, setExpandedMessages] = useState({});
  const [showGroupList, setShowGroupList] = useState({});
  const [groupedMessages, setGroupedMessages] = useState([]);
  
  // ✅ Tab state
  const [activeTab, setActiveTab] = useState('broadcasts'); // 'broadcasts' | 'messages'
  
  // ✅ Delete options state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState('all');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ==================== FETCH GROUP NAMES ====================
  const fetchGroupNames = useCallback(async () => {
    try {
      const response = await api.get('/api/admin/whatsapp/groups', { headers });
      if (response.data.success) {
        const nameMap = {};
        response.data.groups.forEach(g => {
          nameMap[g.id] = g.name || g.id;
        });
        setGroupNames(nameMap);
        return nameMap;
      }
    } catch (error) {
      console.error('Error fetching group names:', error);
      return {};
    }
  }, []);

  // ==================== FETCH MESSAGES ====================
  const fetchMessages = useCallback(async (namesMap = null) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', limit);
      params.append('offset', offset);
      if (search) params.append('search', search);
      if (filterType !== 'all') params.append('type', filterType);

      const response = await api.get(`/api/admin/whatsapp/messages?${params}`, { headers });
      if (response.data.success) {
        const rawMessages = response.data.messages;
        setMessages(rawMessages);
        setTotal(response.data.total);
        
        const names = namesMap || groupNames;
        const grouped = groupMessagesByBroadcast(rawMessages, names);
        setGroupedMessages(grouped);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      showToast('Failed to fetch message history', 'error');
    } finally {
      setLoading(false);
    }
  }, [limit, offset, search, filterType, groupNames]);

  // ==================== GROUP MESSAGES BY BROADCAST ====================
  const groupMessagesByBroadcast = (messages, namesMap = {}) => {
    const groups = {};
    
    messages.forEach(msg => {
      const isBroadcast = msg.type === 'broadcast_group' || msg.type === 'broadcast';
      
      let key;
      if (msg.broadcastId) {
        key = msg.broadcastId;
      } else if (isBroadcast) {
        key = msg.originalMessage || msg.message;
      } else {
        key = msg.id;
      }
      
      if (!groups[key]) {
        groups[key] = {
          broadcastId: key,
          message: msg.message,
          originalMessage: msg.originalMessage || msg.message,
          type: msg.type,
          status: msg.status,
          sentAt: msg.sentAt,
          groups: [],
          count: 0,
          messageId: msg.messageId,
          id: msg.id,
          isBroadcast: isBroadcast
        };
      }
      
      const rawName = namesMap[msg.groupId];
      let displayName;
      if (rawName && rawName !== msg.groupId) {
        displayName = rawName;
      } else {
        displayName = cleanGroupIdForDisplay(msg.groupId);
      }
      
      groups[key].groups.push({
        groupId: msg.groupId,
        groupName: displayName,
        sentAt: msg.sentAt,
        status: msg.status,
        messageId: msg.messageId,
        id: msg.id
      });
      groups[key].count++;
    });

    return Object.values(groups).sort((a, b) => 
      new Date(b.sentAt) - new Date(a.sentAt)
    );
  };

  // ==================== CLEAN GROUP ID FOR DISPLAY ====================
  const cleanGroupIdForDisplay = (groupId) => {
    if (!groupId) return 'Unknown Group';
    
    let clean = groupId.replace('@g.us', '');
    
    if (clean.includes('-')) {
      const parts = clean.split('-');
      if (parts.length === 2) {
        const phone = parts[0];
        if (phone.startsWith('254') && phone.length === 12) {
          const formatted = phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
          return `📱 ${formatted}`;
        }
        return `📱 ${phone}`;
      }
    }
    
    if (/^\d+$/.test(clean) && clean.length > 6) {
      return `📋 Group ${clean.slice(-6)}`;
    }
    
    return `📋 ${clean}`;
  };

  // ==================== FETCH STATS ====================
  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/api/admin/whatsapp/messages/stats', { headers });
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  // ✅ Load data
  useEffect(() => {
    const loadData = async () => {
      const names = await fetchGroupNames();
      await fetchMessages(names);
      await fetchStats();
    };
    loadData();
  }, []);

  // ==================== TOGGLE FUNCTIONS ====================
  const toggleExpand = (broadcastId) => {
    setExpandedMessages(prev => ({
      ...prev,
      [broadcastId]: !prev[broadcastId]
    }));
  };

  const toggleGroupList = (broadcastId) => {
    setShowGroupList(prev => ({
      ...prev,
      [broadcastId]: !prev[broadcastId]
    }));
  };

  // ==================== EDIT BROADCAST ====================
  const handleEditBroadcast = async (broadcastId) => {
    if (!editContent.trim()) {
      showToast('Message content is required', 'error');
      return;
    }

    const broadcast = groupedMessages.find(g => g.broadcastId === broadcastId);
    if (!broadcast) {
      showToast('Broadcast not found', 'error');
      return;
    }

    const sentAt = new Date(broadcast.sentAt);
    const now = new Date();
    const diffMinutes = (now - sentAt) / (1000 * 60);
    if (diffMinutes > 15) {
      showToast('Cannot edit messages older than 15 minutes', 'error');
      return;
    }

    try {
      const messagesToUpdate = messages.filter(m => m.broadcastId === broadcastId || m.id === broadcast.id);
      
      for (const msg of messagesToUpdate) {
        if (msg.messageId && msg.groupId) {
          try {
            await api.put(`/api/admin/whatsapp/messages/${msg.id}`, 
              { message: editContent },
              { headers }
            );
          } catch (e) {
            console.error('Error editing message:', e);
          }
        }
      }
      
      showToast(`✅ Broadcast updated successfully! (${messagesToUpdate.length} messages)`);
      setEditingMessage(null);
      setEditContent('');
      const names = await fetchGroupNames();
      await fetchMessages(names);
      await fetchStats();
    } catch (error) {
      console.error('Error editing broadcast:', error);
      showToast('Failed to edit broadcast: ' + (error.response?.data?.error || error.message), 'error');
    }
  };

  // ==================== DELETE SINGLE ====================
  const handleDeleteBroadcast = async (broadcastId, permanent = false) => {
    const broadcast = groupedMessages.find(g => g.broadcastId === broadcastId);
    if (!broadcast) {
      showToast('Broadcast not found', 'error');
      return;
    }

    if (!confirm(`Are you sure you want to ${permanent ? 'permanently delete' : 'soft delete'} this broadcast and all ${broadcast.count} messages?`)) return;

    try {
      const messagesToDelete = messages.filter(m => m.broadcastId === broadcastId || m.id === broadcast.id);
      
      for (const msg of messagesToDelete) {
        await api.delete(`/api/admin/whatsapp/messages/${msg.id}`, {
          params: { permanent },
          headers
        });
      }
      
      showToast(`✅ Broadcast ${permanent ? 'permanently deleted' : 'soft deleted'}! (${messagesToDelete.length} messages)`);
      const names = await fetchGroupNames();
      await fetchMessages(names);
      await fetchStats();
    } catch (error) {
      console.error('Error deleting broadcast:', error);
      showToast('Failed to delete broadcast', 'error');
    }
  };

  // ==================== DELETE ALL WITH OPTIONS ====================
  const handleDeleteAll = async () => {
    if (deleteConfirmText !== 'DELETE_ALL') {
      showToast('Please type DELETE_ALL to confirm', 'error');
      return;
    }

    if (!confirm('⚠️ This will permanently delete ALL selected messages. This cannot be undone! Are you sure?')) {
      return;
    }

    setDeleteLoading(true);
    try {
      let endpoint = '/api/admin/whatsapp/messages/clear-all';
      let data = { confirm: 'DELETE_ALL' };
      
      // If deleting by type
      if (deleteType === 'broadcasts') {
        endpoint = '/api/admin/whatsapp/messages/clear-broadcasts';
      } else if (deleteType === 'messages') {
        endpoint = '/api/admin/whatsapp/messages/clear-messages';
      }

      const response = await api.delete(endpoint, {
        data: data,
        headers
      });
      
      if (response.data.success) {
        showToast(`✅ ${response.data.deletedCount} messages deleted successfully!`);
        setShowDeleteModal(false);
        setDeleteConfirmText('');
        const names = await fetchGroupNames();
        await fetchMessages(names);
        await fetchStats();
      }
    } catch (error) {
      console.error('Error clearing messages:', error);
      showToast('Failed to clear messages: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ==================== COPY TO CLIPBOARD ====================
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('✅ Copied to clipboard!');
  };

  // ==================== FORMAT DATE ====================
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-KE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ==================== TRUNCATE TEXT ====================
  const truncateText = (text, maxLength = 200) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // ==================== GET TYPE BADGE ====================
  const getTypeBadge = (type) => {
    const types = {
      'group': { label: 'Group', color: '#3b82f6', bg: '#dbeafe', icon: Users },
      'user': { label: 'User', color: '#22c55e', bg: '#dcfce7', icon: Phone },
      'broadcast': { label: 'Broadcast', color: '#8b5cf6', bg: '#f5f3ff', icon: Send },
      'broadcast_group': { label: 'Group Broadcast', color: '#f59e0b', bg: '#fef3c7', icon: Layers }
    };
    return types[type] || types['group'];
  };

  // ==================== GET STATUS BADGE ====================
  const getStatusBadge = (status) => {
    const statuses = {
      'sent': { label: 'Sent', color: '#22c55e', bg: '#dcfce7' },
      'edited': { label: 'Edited', color: '#3b82f6', bg: '#dbeafe' },
      'deleted': { label: 'Deleted', color: '#ef4444', bg: '#fee2e2' },
      'failed': { label: 'Failed', color: '#ef4444', bg: '#fee2e2' }
    };
    return statuses[status] || statuses['sent'];
  };

  // ==================== PAGINATION ====================
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const goToPage = (page) => {
    setOffset((page - 1) * limit);
  };

  // Filter messages based on active tab
  const filteredMessages = groupedMessages.filter(group => {
    if (activeTab === 'broadcasts') {
      return group.isBroadcast || group.type === 'broadcast_group' || group.type === 'broadcast';
    }
    return !group.isBroadcast && group.type !== 'broadcast_group' && group.type !== 'broadcast';
  });

  return (
    <div className="message-history-container">
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      {/* ==================== HEADER ==================== */}
      <div className="page-header">
        <div className="header-left">
          <button className="btn-back" onClick={() => navigate('/admin/whatsapp')}>
            <ArrowLeft size={20} />
          </button>
          <div className="title-icon">
            <HistoryIcon size={24} />
          </div>
          <div>
            <h1>Message History</h1>
            <p className="subtitle">View, edit, and manage all sent WhatsApp messages</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-refresh" onClick={() => { 
            const refresh = async () => {
              const names = await fetchGroupNames();
              await fetchMessages(names);
              await fetchStats();
            };
            refresh();
          }}>
            <RefreshCw size={18} /> Refresh
          </button>
          <button className="btn-stats" onClick={() => setShowStats(!showStats)}>
            <BarChart3 size={18} /> {showStats ? 'Hide Stats' : 'Show Stats'}
          </button>
          <button 
            className="btn-danger-action" 
            onClick={() => setShowDeleteModal(true)}
            disabled={groupedMessages.length === 0}
          >
            <Trash size={18} /> Clear All
          </button>
        </div>
      </div>

      {/* ==================== STATS ==================== */}
      {showStats && stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon"><MessageCircle size={24} /></div>
            <div className="stat-info">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">Total Messages</span>
            </div>
          </div>
          {stats.byType && stats.byType.map((item) => (
            <div key={item.type} className="stat-card">
              <div className="stat-icon">
                {item.type === 'group' ? <Users size={24} /> : 
                 item.type === 'user' ? <Phone size={24} /> : 
                 item.type === 'broadcast_group' ? <Layers size={24} /> :
                 <Send size={24} />}
              </div>
              <div className="stat-info">
                <span className="stat-value">{item.count}</span>
                <span className="stat-label">{item.type.replace('_', ' ').charAt(0).toUpperCase() + item.type.slice(1)}</span>
              </div>
            </div>
          ))}
          {stats.last7Days && stats.last7Days.length > 0 && (
            <div className="stat-card full-width">
              <div className="stat-info">
                <span className="stat-label">Last 7 Days</span>
                <div className="stat-days">
                  {stats.last7Days.map((day) => (
                    <div key={day.date} className="stat-day">
                      <span className="day-label">{new Date(day.date).toLocaleDateString('en-KE', { weekday: 'short' })}</span>
                      <span className="day-count">{day.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== TABS ==================== */}
      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'broadcasts' ? 'active' : ''}`}
          onClick={() => setActiveTab('broadcasts')}
        >
          <Layers size={18} />
          Broadcasts
          <span className="tab-count">{groupedMessages.filter(g => g.isBroadcast || g.type === 'broadcast_group' || g.type === 'broadcast').length}</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'messages' ? 'active' : ''}`}
          onClick={() => setActiveTab('messages')}
        >
          <MessageCircle size={18} />
          Normal Messages
          <span className="tab-count">{groupedMessages.filter(g => !g.isBroadcast && g.type !== 'broadcast_group' && g.type !== 'broadcast').length}</span>
        </button>
      </div>

      {/* ==================== FILTERS ==================== */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search messages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchMessages()}
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Types</option>
          <option value="group">Group</option>
          <option value="user">User</option>
          <option value="broadcast">Broadcast</option>
          <option value="broadcast_group">Group Broadcast</option>
        </select>
        <button className="btn-apply-filter" onClick={() => {
          const applyFilter = async () => {
            const names = await fetchGroupNames();
            await fetchMessages(names);
          };
          applyFilter();
        }}>
          Apply
        </button>
      </div>

      {/* ==================== DELETE ALL MODAL ==================== */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🗑️ Clear Messages</h3>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="warning-box">
                <AlertCircle size={24} />
                <div>
                  <p><strong>⚠️ This action cannot be undone!</strong></p>
                  <p>You are about to permanently delete messages from the database.</p>
                </div>
              </div>

              <div className="delete-options">
                <label className="delete-option">
                  <input
                    type="radio"
                    name="deleteType"
                    value="all"
                    checked={deleteType === 'all'}
                    onChange={(e) => setDeleteType(e.target.value)}
                  />
                  <div>
                    <strong>Delete All</strong>
                    <span>Delete all messages ({total} messages)</span>
                  </div>
                </label>
                <label className="delete-option">
                  <input
                    type="radio"
                    name="deleteType"
                    value="broadcasts"
                    checked={deleteType === 'broadcasts'}
                    onChange={(e) => setDeleteType(e.target.value)}
                  />
                  <div>
                    <strong>Delete Broadcasts Only</strong>
                    <span>Delete all broadcast messages</span>
                  </div>
                </label>
                <label className="delete-option">
                  <input
                    type="radio"
                    name="deleteType"
                    value="messages"
                    checked={deleteType === 'messages'}
                    onChange={(e) => setDeleteType(e.target.value)}
                  />
                  <div>
                    <strong>Delete Normal Messages Only</strong>
                    <span>Delete all non-broadcast messages</span>
                  </div>
                </label>
              </div>

              <div className="confirm-input">
                <p>Type <strong>DELETE_ALL</strong> to confirm:</p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE_ALL here..."
                  className="confirm-input-field"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirmText('');
              }}>
                Cancel
              </button>
              <button 
                className="btn-danger" 
                onClick={handleDeleteAll}
                disabled={deleteConfirmText !== 'DELETE_ALL' || deleteLoading}
              >
                {deleteLoading ? <Loader size={16} className="spin" /> : <Trash size={16} />}
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MESSAGES LIST ==================== */}
      <div className="messages-list">
        {loading ? (
          <div className="loading-state">
            <Loader size={48} className="spin" />
            <p>Loading messages...</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="empty-state">
            <Inbox size={64} style={{ color: '#cbd5e1' }} />
            <p>No {activeTab === 'broadcasts' ? 'broadcasts' : 'messages'} found</p>
            <p className="empty-sub">Send a message to start tracking history</p>
          </div>
        ) : (
          filteredMessages.map((group, index) => {
            const typeBadge = getTypeBadge(group.type);
            const statusBadge = getStatusBadge(group.status);
            const isExpanded = expandedMessages[group.broadcastId] || false;
            const showGroups = showGroupList[group.broadcastId] || false;
            const isEditing = editingMessage === group.broadcastId;
            const isLongMessage = group.message && group.message.length > 200;
            const displayText = isExpanded ? group.message : truncateText(group.message, 200);
            const messageNumber = (offset || 0) + index + 1;

            return (
              <div key={group.broadcastId} className={`message-item ${group.status === 'deleted' ? 'deleted' : ''}`}>
                <div className="message-number">{messageNumber}.</div>
                
                <div className="message-details">
                  {/* ===== BROADCAST HEADER ===== */}
                  <div className="broadcast-header">
                    <span className="broadcast-icon">{group.isBroadcast ? '📨' : '💬'}</span>
                    <span className="broadcast-label">
                      {group.isBroadcast ? 'Broadcast to:' : 'Message to:'}
                    </span>
                    {group.isBroadcast && (
                      <span className="broadcast-count">{group.count} {group.count === 1 ? 'group' : 'groups'}</span>
                    )}
                    <span className={`type-badge`} style={{ background: typeBadge.bg, color: typeBadge.color }}>
                      {typeBadge.label}
                    </span>
                    <span className={`status-badge`} style={{ background: statusBadge.bg, color: statusBadge.color }}>
                      {statusBadge.label}
                    </span>
                    <span className="timestamp">
                      <Clock size={14} /> {formatDate(group.sentAt)}
                    </span>
                    {group.status === 'edited' && (
                      <span className="edited-badge">
                        <Edit2 size={12} /> Edited
                      </span>
                    )}
                  </div>

                  {/* ===== GROUP LIST TOGGLE (Broadcasts only) ===== */}
                  {group.isBroadcast && (
                    <>
                      <button 
                        className="btn-toggle-groups"
                        onClick={() => toggleGroupList(group.broadcastId)}
                      >
                        {showGroups ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        {showGroups ? 'Hide Groups' : `Show ${group.count} Groups`}
                      </button>

                      {showGroups && (
                        <div className="group-list">
                          {group.groups.map((g, i) => (
                            <div key={g.id} className="group-item-inline">
                              <span className="group-number">{i + 1}.</span>
                              <span className="group-name">{g.groupName || g.groupId}</span>
                              <span className="group-time">{formatDate(g.sentAt)}</span>
                              {g.status === 'edited' && (
                                <span className="edited-badge-small">✏️</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* ===== MESSAGE CONTENT ===== */}
                  <div className="message-content">
                    {isEditing ? (
                      <div className="edit-form">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows="3"
                          className="edit-textarea"
                          placeholder="Edit message..."
                        />
                        <div className="edit-actions">
                          <button className="btn-save-edit" onClick={() => handleEditBroadcast(group.broadcastId)}>
                            <Check size={16} /> Save
                          </button>
                          <button className="btn-cancel-edit" onClick={() => {
                            setEditingMessage(null);
                            setEditContent('');
                          }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {isLongMessage && (
                          <button 
                            className="btn-toggle-expand"
                            onClick={() => toggleExpand(group.broadcastId)}
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp size={16} /> Show Less
                              </>
                            ) : (
                              <>
                                <ChevronDown size={16} /> Show More ({group.message.length - 200} more characters)
                              </>
                            )}
                          </button>
                        )}
                        <div className="message-text-wrapper">
                          <p className="message-text">{displayText}</p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* ===== SINGLE ACTIONS ===== */}
                  <div className="single-actions">
                    <button 
                      className="btn-copy" 
                      onClick={() => copyToClipboard(group.message)}
                      title="Copy message"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                    {group.status !== 'deleted' && (
                      <button 
                        className="btn-edit" 
                        onClick={() => {
                          setEditingMessage(group.broadcastId);
                          setEditContent(group.message);
                        }}
                        title="Edit this message"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                    {group.status !== 'deleted' && (
                      <button 
                        className="btn-delete" 
                        onClick={() => handleDeleteBroadcast(group.broadcastId, false)}
                        title="Soft delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    {group.status === 'deleted' && (
                      <button 
                        className="btn-delete-permanent" 
                        onClick={() => handleDeleteBroadcast(group.broadcastId, true)}
                        title="Permanently delete"
                      >
                        <XCircle size={16} />
                      </button>
                    )}
                  </div>

                  {group.originalMessage && group.originalMessage !== group.message && (
                    <div className="message-original">
                      <small>Original: {group.originalMessage.substring(0, 150)}...</small>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ==================== PAGINATION ==================== */}
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            className="btn-page"
            disabled={currentPage === 1}
            onClick={() => goToPage(currentPage - 1)}
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <span className="page-info">
            Page {currentPage} of {totalPages}
          </span>
          <button 
            className="btn-page"
            disabled={currentPage === totalPages}
            onClick={() => goToPage(currentPage + 1)}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ==================== STYLES ==================== */}
      <style>{`
        .message-history-container {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
          background: #f8fafc;
          min-height: 100vh;
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

        .btn-back {
          padding: 8px 12px;
          background: #f1f5f9;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-back:hover {
          background: #e2e8f0;
        }

        .title-icon {
          width: 48px;
          height: 48px;
          background: #0f172a;
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

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .btn-refresh, .btn-stats {
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

        .btn-refresh:hover, .btn-stats:hover {
          background: #e2e8f0;
        }

        .btn-stats {
          background: #0f172a;
          color: white;
        }

        .btn-stats:hover {
          background: #1e293b;
        }

        .btn-danger-action {
          padding: 8px 16px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .btn-danger-action:hover:not(:disabled) {
          background: #dc2626;
        }

        .btn-danger-action:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 16px 20px;
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .stat-card.full-width {
          grid-column: 1 / -1;
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
        }

        .stat-info {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
        }

        .stat-label {
          font-size: 12px;
          color: #94a3b8;
          text-transform: uppercase;
        }

        .stat-days {
          display: flex;
          gap: 12px;
          margin-top: 8px;
          flex-wrap: wrap;
        }

        .stat-day {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: #f1f5f9;
          padding: 4px 12px;
          border-radius: 8px;
        }

        .day-label {
          font-size: 11px;
          color: #64748b;
        }

        .day-count {
          font-size: 16px;
          font-weight: 600;
          color: #0f172a;
        }

        /* ===== TABS ===== */
        .tabs-container {
          display: flex;
          gap: 4px;
          background: white;
          padding: 4px;
          border-radius: 12px;
          margin-bottom: 16px;
          border: 1px solid #e2e8f0;
        }

        .tab-btn {
          flex: 1;
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          background: transparent;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .tab-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .tab-btn.active {
          background: #0f172a;
          color: white;
        }

        .tab-count {
          background: #e2e8f0;
          color: #475569;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
        }

        .tab-btn.active .tab-count {
          background: rgba(255,255,255,0.2);
          color: white;
        }

        .filters-bar {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
          background: white;
          padding: 16px 20px;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
        }

        .search-box {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f1f5f9;
          padding: 8px 14px;
          border-radius: 8px;
          min-width: 200px;
        }

        .search-box input {
          border: none;
          background: transparent;
          outline: none;
          flex: 1;
          font-size: 14px;
        }

        .filter-select {
          padding: 8px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          font-size: 14px;
          outline: none;
        }

        .btn-apply-filter {
          padding: 8px 20px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }

        .btn-apply-filter:hover {
          background: #2563eb;
        }

        .messages-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .message-item {
          background: white;
          border-radius: 16px;
          padding: 16px 20px;
          border: 1px solid #e2e8f0;
          transition: all 0.2s;
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .message-item:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .message-item.deleted {
          opacity: 0.6;
          background: #f8fafc;
        }

        .message-number {
          font-size: 18px;
          font-weight: 700;
          color: #94a3b8;
          min-width: 40px;
          padding-top: 4px;
          font-family: monospace;
        }

        .message-details {
          flex: 1;
          min-width: 0;
        }

        .broadcast-header {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }

        .broadcast-icon {
          font-size: 16px;
        }

        .broadcast-label {
          font-weight: 600;
          font-size: 13px;
          color: #475569;
        }

        .broadcast-count {
          font-weight: 700;
          font-size: 14px;
          color: #8b5cf6;
          background: #f5f3ff;
          padding: 2px 12px;
          border-radius: 12px;
        }

        .type-badge, .status-badge {
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }

        .timestamp {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #94a3b8;
        }

        .edited-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: #3b82f6;
        }

        .edited-badge-small {
          font-size: 12px;
          color: #3b82f6;
        }

        .btn-toggle-groups {
          padding: 4px 12px;
          background: transparent;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          color: #64748b;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
          transition: all 0.2s;
        }

        .btn-toggle-groups:hover {
          background: #f1f5f9;
          border-color: #8b5cf6;
        }

        .group-list {
          background: #f8fafc;
          border-radius: 8px;
          padding: 8px 12px;
          margin-bottom: 8px;
          max-height: 200px;
          overflow-y: auto;
        }

        .group-item-inline {
          display: flex;
          gap: 12px;
          padding: 4px 0;
          font-size: 13px;
          border-bottom: 1px solid #f1f5f9;
        }

        .group-item-inline:last-child {
          border-bottom: none;
        }

        .group-number {
          color: #94a3b8;
          font-weight: 600;
          min-width: 30px;
        }

        .group-name {
          flex: 1;
          font-weight: 500;
          color: #0f172a;
        }

        .group-time {
          color: #94a3b8;
          font-size: 12px;
        }

        .message-content {
          margin-top: 4px;
        }

        .btn-toggle-expand {
          margin-bottom: 8px;
          padding: 4px 12px;
          background: transparent;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          color: #64748b;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .btn-toggle-expand:hover {
          background: #f1f5f9;
          border-color: #8b5cf6;
          color: #0f172a;
        }

        .message-text-wrapper {
          background: #f8fafc;
          padding: 12px 16px;
          border-radius: 8px;
          border-left: 4px solid #8b5cf6;
          margin-top: 4px;
        }

        .message-text {
          white-space: pre-wrap;
          font-size: 14px;
          line-height: 1.6;
          color: #1e293b;
          margin: 0;
          word-wrap: break-word;
        }

        .message-original {
          margin-top: 8px;
          padding: 8px 12px;
          background: #f8fafc;
          border-radius: 8px;
          color: #94a3b8;
          font-size: 12px;
        }

        .single-actions {
          display: flex;
          gap: 4px;
          margin-top: 8px;
        }

        .single-actions button {
          padding: 4px 8px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          background: transparent;
          color: #94a3b8;
          transition: all 0.2s;
        }

        .single-actions button:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .btn-copy:hover { color: #3b82f6; }
        .btn-edit:hover { color: #f59e0b; }
        .btn-delete:hover { color: #ef4444; }
        .btn-delete-permanent:hover { color: #dc2626; }

        .edit-form {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 8px;
        }

        .edit-textarea {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
          outline: none;
        }

        .edit-textarea:focus {
          border-color: #8b5cf6;
        }

        .edit-actions {
          display: flex;
          gap: 8px;
        }

        .btn-save-edit {
          padding: 6px 16px;
          background: #22c55e;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
        }

        .btn-save-edit:hover {
          background: #16a34a;
        }

        .btn-cancel-edit {
          padding: 6px 16px;
          background: #f1f5f9;
          color: #64748b;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }

        .btn-cancel-edit:hover {
          background: #e2e8f0;
        }

        /* ===== MODAL ===== */
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
          padding: 20px;
        }

        .modal-content {
          background: white;
          border-radius: 20px;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
        }

        .modal-header h3 {
          margin: 0;
          color: #0f172a;
        }

        .modal-close {
          background: none;
          border: none;
          cursor: pointer;
          color: #94a3b8;
          padding: 4px;
        }

        .modal-close:hover {
          color: #0f172a;
        }

        .modal-body {
          padding: 24px;
        }

        .modal-body .warning-box {
          display: flex;
          gap: 16px;
          padding: 16px;
          background: #fee2e2;
          border-radius: 12px;
          color: #991b1b;
          margin-bottom: 20px;
        }

        .delete-options {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }

        .delete-option {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .delete-option:hover {
          border-color: #94a3b8;
        }

        .delete-option input[type="radio"] {
          margin-top: 2px;
          cursor: pointer;
        }

        .delete-option div {
          display: flex;
          flex-direction: column;
        }

        .delete-option span {
          font-size: 13px;
          color: #64748b;
        }

        .confirm-input {
          margin-top: 16px;
        }

        .confirm-input p {
          font-size: 14px;
          color: #475569;
          margin-bottom: 8px;
        }

        .confirm-input-field {
          width: 100%;
          padding: 10px 14px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          font-family: monospace;
        }

        .confirm-input-field:focus {
          border-color: #ef4444;
        }

        .confirm-input-field::placeholder {
          color: #94a3b8;
        }

        .modal-footer {
          display: flex;
          gap: 12px;
          padding: 16px 24px 24px;
          border-top: 1px solid #e2e8f0;
        }

        .btn-cancel {
          flex: 1;
          padding: 10px;
          background: #f1f5f9;
          color: #475569;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }

        .btn-cancel:hover {
          background: #e2e8f0;
        }

        .btn-danger {
          flex: 1;
          padding: 10px;
          background: #ef4444;
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

        .btn-danger:hover:not(:disabled) {
          background: #dc2626;
        }

        .btn-danger:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-top: 24px;
          padding: 16px;
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
        }

        .btn-page {
          padding: 6px 16px;
          background: #f1f5f9;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
        }

        .btn-page:hover:not(:disabled) {
          background: #e2e8f0;
        }

        .btn-page:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .page-info {
          font-size: 14px;
          color: #64748b;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #94a3b8;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #94a3b8;
        }

        .empty-state p {
          margin: 8px 0 0;
        }

        .empty-sub {
          font-size: 13px;
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
          .message-history-container { padding: 16px; }
          .page-header { flex-direction: column; align-items: flex-start; }
          .header-actions { width: 100%; }
          .btn-refresh, .btn-stats, .btn-danger-action { flex: 1; justify-content: center; }
          .filters-bar { flex-direction: column; }
          .search-box { min-width: auto; }
          .stats-grid { grid-template-columns: 1fr 1fr; }
          .stat-days { flex-wrap: wrap; }
          .message-item { flex-direction: column; gap: 8px; }
          .message-number { min-width: auto; }
          .broadcast-header { flex-direction: column; align-items: flex-start; }
          .group-item-inline { flex-wrap: wrap; }
          .single-actions { width: 100%; justify-content: flex-end; }
          .tabs-container { flex-direction: column; }
          .tab-btn { justify-content: center; }
          .delete-option { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}