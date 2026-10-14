import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { io } from 'socket.io-client';
import BASE_URL from '../../api';
import { 
  Mail, CheckCircle, Eye, Link, AlertCircle, 
  RefreshCw, Search, Filter, ArrowLeft, Home,
  Download, TrendingUp, Activity, Bell, FileText,
  User, X, UserCheck, Send, Clock, Settings,
  Users, Shield, AlertTriangle, Check, Square,
  Edit2, Trash2, Plus, Calendar, BarChart3,
  Menu, ChevronDown, ChevronUp, Zap, Lock,
  Unlock, UserX, UserPlus, FileSpreadsheet,
  PieChart, Globe, Smartphone, Monitor, Tablet,
  Award, Target, Flame, Star, ThumbsUp,
  MessageCircle, Share2, ExternalLink, Copy,
  Filter as FilterIcon, Sliders, Radio,
  Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  Maximize2, Minimize2, BookOpen, Clock as ClockIcon
} from 'lucide-react';
import { format, formatDistanceToNow, subDays, formatDate } from 'date-fns';
import * as XLSX from 'xlsx';

// Socket connection
const socket = io(BASE_URL, {
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export default function EmailDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('today');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [updating, setUpdating] = useState(false);
  const [showUserHistory, setShowUserHistory] = useState(false);
  const [userHistory, setUserHistory] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [period, setPeriod] = useState('30');
  const [viewMode, setViewMode] = useState('list');
  const [sortBy, setSortBy] = useState('latest');
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');
  const [liveCount, setLiveCount] = useState(0);
  const [newEvents, setNewEvents] = useState([]);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationData, setNotificationData] = useState(null);

  // Real-time event counter
  const [realtimeCount, setRealtimeCount] = useState(0);
  const [lastEvent, setLastEvent] = useState(null);

  // Load all data
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [statsRes, logsRes, usersRes, settingsRes] = await Promise.all([
        api.get('/api/email/dashboard/stats'),
        api.get('/api/webhooks/brevo/logs?limit=200'),
        api.get('/api/email/users/status'),
        api.get('/api/email/settings')
      ]);
      
      setStats(statsRes.data.stats);
      setLogs(logsRes.data.logs || []);
      setUsers(usersRes.data.users || []);
      setSettings(settingsRes.data.settings || []);
      
      const systemTypes = ['password_reset', 'verification'];
      const nonSystem = settingsRes.data.settings?.filter(s => !systemTypes.includes(s.type));
      const allDisabled = nonSystem?.every(s => s.enabled === false);
      setEmergencyMode(allDisabled);
      
    } catch (error) {
      console.error('Error fetching email data:', error);
      showToast('Failed to load email data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchAllData();

    // 🔥 REAL-TIME SOCKET LISTENER
    socket.on('new_email_event', (data) => {
      console.log('📡 Real-time email event:', data);
      
      // Update real-time counter
      setRealtimeCount(prev => prev + 1);
      setLastEvent(data);
      
      // Show notification
      setNotificationData(data);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 5000);
      
      // Update stats
      setStats(prev => {
        if (!prev) return prev;
        const newStats = { ...prev, total: (prev.total || 0) + 1 };
        
        if (data.eventType === 'delivered') {
          newStats.delivered = (prev.delivered || 0) + 1;
        } else if (data.eventType === 'opened') {
          newStats.opened = (prev.opened || 0) + 1;
        } else if (data.eventType === 'clicked') {
          newStats.clicked = (prev.clicked || 0) + 1;
        } else if (data.eventType === 'hard_bounce' || data.eventType === 'soft_bounce') {
          newStats.bounced = (prev.bounced || 0) + 1;
        } else if (data.eventType === 'unsubscribe') {
          newStats.unsubscribed = (prev.unsubscribed || 0) + 1;
        }
        
        if (newStats.total > 0) {
          newStats.openRate = Math.round((newStats.opened / newStats.total) * 100);
          newStats.deliveryRate = Math.round((newStats.delivered / newStats.total) * 100);
        }
        
        return newStats;
      });
      
      // Add to logs
      setLogs(prev => {
        const newLog = {
          id: data.id || `socket-${Date.now()}`,
          eventType: data.eventType,
          email: data.email,
          subject: data.subject || 'No subject',
          user: { fullName: data.userName || 'Unknown' },
          createdAt: data.createdAt || new Date(),
          isNew: true
        };
        return [newLog, ...prev];
      });
      
      // Show toast
      const iconMap = {
        'delivered': '✅',
        'opened': '👁️',
        'clicked': '🔗',
        'hard_bounce': '❌',
        'soft_bounce': '⚠️',
        'unsubscribe': '🛑',
        'complaint': '🚫'
      };
      showToast(`${iconMap[data.eventType] || '📨'} ${data.eventType}: ${data.email}`, 'success');
    });

    return () => {
      socket.off('new_email_event');
    };
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Get event icon
  const getEventIcon = (type) => {
    const icons = {
      'delivered': <CheckCircle size={14} className="text-green-500" />,
      'opened': <Eye size={14} className="text-blue-500" />,
      'clicked': <Link size={14} className="text-purple-500" />,
      'request': <Send size={14} className="text-yellow-500" />,
      'hard_bounce': <AlertCircle size={14} className="text-red-500" />,
      'soft_bounce': <AlertCircle size={14} className="text-orange-500" />,
      'unsubscribe': <UserX size={14} className="text-gray-500" />,
      'error': <AlertCircle size={14} className="text-red-500" />,
      'complaint': <AlertTriangle size={14} className="text-red-500" />
    };
    return icons[type] || <Activity size={14} className="text-gray-400" />;
  };

  const getEventBadge = (type) => {
    const colors = {
      'delivered': 'bg-green-100 text-green-700',
      'opened': 'bg-blue-100 text-blue-700',
      'clicked': 'bg-purple-100 text-purple-700',
      'request': 'bg-yellow-100 text-yellow-700',
      'hard_bounce': 'bg-red-100 text-red-700',
      'soft_bounce': 'bg-orange-100 text-orange-700',
      'unsubscribe': 'bg-gray-100 text-gray-700',
      'error': 'bg-red-100 text-red-700',
      'complaint': 'bg-red-100 text-red-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-600';
  };

  const getStatusBadge = (status) => {
    const colors = {
      'active': 'bg-green-100 text-green-700',
      'unsubscribed': 'bg-red-100 text-red-700',
      'bounced': 'bg-orange-100 text-orange-700',
      'unknown': 'bg-gray-100 text-gray-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-600';
  };

  // Toggle email setting
  const toggleSetting = async (id, currentValue) => {
    setUpdating(true);
    try {
      await api.put(`/api/email/settings/${id}`, { enabled: !currentValue });
      showToast(`Email setting updated!`, 'success');
      fetchAllData();
    } catch (error) {
      showToast('Failed to update setting', 'error');
    } finally {
      setUpdating(false);
    }
  };

  // Toggle emergency mode
  const toggleEmergencyMode = async () => {
    setUpdating(true);
    try {
      const systemTypes = ['password_reset', 'verification'];
      const nonSystem = settings.filter(s => !systemTypes.includes(s.type));
      
      for (const setting of nonSystem) {
        await api.put(`/api/email/settings/${setting.id}`, { enabled: emergencyMode });
      }
      
      setEmergencyMode(!emergencyMode);
      showToast(emergencyMode ? 'Emergency mode disabled' : 'Emergency mode enabled', 'success');
      fetchAllData();
    } catch (error) {
      showToast('Failed to toggle emergency mode', 'error');
    } finally {
      setUpdating(false);
    }
  };

  // Re-subscribe user
  const handleResubscribe = async (userId, email) => {
    if (!window.confirm(`Re-subscribe ${email}? They will start receiving emails again.`)) return;
    
    try {
      await api.post(`/api/email/resubscribe/${userId}`);
      showToast(`✅ ${email} has been re-subscribed!`, 'success');
      fetchAllData();
    } catch (error) {
      showToast('Failed to re-subscribe user', 'error');
    }
  };

  // View user history
  const viewUserHistory = async (user) => {
    try {
      const res = await api.get(`/api/email/history/${user.id}?limit=50`);
      setUserHistory(res.data.logs || []);
      setSelectedUser(user);
      setShowUserHistory(true);
    } catch (error) {
      showToast('Failed to load user history', 'error');
    }
  };

  // Export to Excel/CSV
  const exportData = () => {
    const exportData = logs.map(log => ({
      'Event Type': log.eventType,
      'Email': log.email,
      'Subject': log.subject || 'N/A',
      'User': log.user?.fullName || 'Unknown',
      'Date': format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss'),
      'Tag': log.tag || 'N/A',
      'Message ID': log.messageId || 'N/A'
    }));

    if (exportFormat === 'excel') {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Email Logs");
      XLSX.writeFile(wb, `email_logs_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
      // CSV
      const headers = Object.keys(exportData[0] || {});
      const csvRows = [headers.join(',')];
      exportData.forEach(row => {
        const values = headers.map(header => `"${(row[header] || '').replace(/"/g, '""')}"`);
        csvRows.push(values.join(','));
      });
      const csv = csvRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `email_logs_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
    showToast(`Exported ${exportData.length} logs`, 'success');
  };

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || log.eventType === filterType;
    
    // Date filter
    let matchesDate = true;
    if (filterDate === 'today') {
      const today = new Date().toDateString();
      matchesDate = new Date(log.createdAt).toDateString() === today;
    } else if (filterDate === 'week') {
      const weekAgo = subDays(new Date(), 7);
      matchesDate = new Date(log.createdAt) >= weekAgo;
    } else if (filterDate === 'month') {
      const monthAgo = subDays(new Date(), 30);
      matchesDate = new Date(log.createdAt) >= monthAgo;
    }
    
    return matchesSearch && matchesFilter && matchesDate;
  });

  // Sort logs
  const sortedLogs = [...filteredLogs].sort((a, b) => {
    if (sortBy === 'latest') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    } else if (sortBy === 'oldest') {
      return new Date(a.createdAt) - new Date(b.createdAt);
    } else if (sortBy === 'email') {
      return (a.email || '').localeCompare(b.email || '');
    }
    return 0;
  });

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || user.emailStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Stats cards
  const statsCards = [
    { title: 'Total Events', value: stats?.total || 0, icon: <Activity size={18} />, color: '#3b82f6', change: '+12%' },
    { title: 'Delivered', value: stats?.delivered || 0, icon: <CheckCircle size={18} />, color: '#10b981', change: '+8%' },
    { title: 'Opened', value: stats?.opened || 0, icon: <Eye size={18} />, color: '#8b5cf6', change: '+15%' },
    { title: 'Clicked', value: stats?.clicked || 0, icon: <Link size={18} />, color: '#f59e0b', change: '+5%' },
    { title: 'Bounced', value: stats?.bounced || 0, icon: <AlertCircle size={18} />, color: '#ef4444', change: '-2%' },
    { title: 'Open Rate', value: `${stats?.openRate || 0}%`, icon: <TrendingUp size={18} />, color: '#14b8a6', change: '+3%' },
    { title: 'Unsubscribed', value: stats?.unsubscribed || 0, icon: <UserX size={18} />, color: '#8b5cf6', change: '-1%' },
    { title: 'Click Rate', value: `${stats?.clickRate || 0}%`, icon: <Target size={18} />, color: '#f59e0b', change: '+4%' },
  ];

  // Campaign performance data
  const campaignStats = [
    { name: 'Password Reset', sent: 156, opened: 98, clicked: 45, rate: 63 },
    { name: 'Verification', sent: 234, opened: 178, clicked: 89, rate: 76 },
    { name: 'Announcements', sent: 89, opened: 54, clicked: 23, rate: 61 },
    { name: 'Notifications', sent: 312, opened: 198, clicked: 76, rate: 63 },
    { name: 'Marketing', sent: 67, opened: 34, clicked: 12, rate: 51 },
  ];

  // Device breakdown
  const deviceStats = [
    { name: 'Mobile', percentage: 65, icon: <Smartphone size={16} /> },
    { name: 'Desktop', percentage: 25, icon: <Monitor size={16} /> },
    { name: 'Tablet', percentage: 10, icon: <Tablet size={16} /> },
  ];

  // Geography data
  const geoData = [
    { country: 'Kenya', percentage: 85, flag: '🇰🇪' },
    { country: 'USA', percentage: 5, flag: '🇺🇸' },
    { country: 'UK', percentage: 3, flag: '🇬🇧' },
    { country: 'Canada', percentage: 2, flag: '🇨🇦' },
    { country: 'Germany', percentage: 1, flag: '🇩🇪' },
  ];

  // Real-time events for live feed
  const liveEvents = logs.slice(0, 20).map(log => ({
    ...log,
    timeAgo: formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })
  }));

  if (loading) {
    return (
      <div className="email-loader">
        <div className="loader-spinner">
          <div className="ring"></div>
          <div className="ring"></div>
        </div>
        <p>Loading email dashboard...</p>
      </div>
    );
  }

  return (
    <div className="email-dashboard">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Real-time Notification Popup */}
      {showNotification && notificationData && (
        <div className="realtime-popup">
          <div className="popup-content">
            <span className="popup-icon">
              {getEventIcon(notificationData.eventType)}
            </span>
            <div className="popup-text">
              <strong>{notificationData.eventType}</strong>
              <span>{notificationData.email}</span>
              <small>{formatDistanceToNow(new Date(notificationData.createdAt || new Date()), { addSuffix: true })}</small>
            </div>
            <button onClick={() => setShowNotification(false)} className="popup-close">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Live Counter */}
      <div className="live-counter">
        <div className="counter-dot"></div>
        <span>{realtimeCount} real-time events</span>
        {lastEvent && (
          <span className="last-event">
            Last: {lastEvent.eventType} from {lastEvent.email}
          </span>
        )}
      </div>

      {/* User History Modal */}
      {showUserHistory && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowUserHistory(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><User size={18} /> Email History: {selectedUser.email}</h3>
              <button onClick={() => setShowUserHistory(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="user-stats-mini">
                <div>Total: {userHistory.length}</div>
                <div>Opened: {userHistory.filter(l => l.eventType === 'opened').length}</div>
                <div>Clicked: {userHistory.filter(l => l.eventType === 'clicked').length}</div>
              </div>
              {userHistory.length === 0 ? (
                <p className="empty-text">No email history found for this user.</p>
              ) : (
                <div className="user-history-list">
                  {userHistory.map((item, index) => (
                    <div key={index} className="history-item">
                      <span className={`history-badge ${getEventBadge(item.eventType)}`}>
                        {getEventIcon(item.eventType)}
                        {item.eventType}
                      </span>
                      <span className="history-subject">{item.subject || 'No subject'}</span>
                      <span className="history-time">
                        {format(new Date(item.createdAt), 'MMM d, HH:mm')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowUserHistory(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Download size={18} /> Export Data</h3>
              <button onClick={() => setShowExportModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <p>Export {filteredLogs.length} log entries</p>
              <div className="export-options">
                <button 
                  className={`export-option ${exportFormat === 'excel' ? 'active' : ''}`}
                  onClick={() => setExportFormat('excel')}
                >
                  <FileSpreadsheet size={20} />
                  Excel (.xlsx)
                </button>
                <button 
                  className={`export-option ${exportFormat === 'csv' ? 'active' : ''}`}
                  onClick={() => setExportFormat('csv')}
                >
                  <FileText size={20} />
                  CSV (.csv)
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowExportModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={exportData}>Export {filteredLogs.length} entries</button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-nav">
          <button className="hero-nav-btn back" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
          <button className="hero-nav-btn home" onClick={() => navigate('/admin')}>
            <Home size={18} />
            <span>Dashboard</span>
          </button>
          <button className="hero-nav-btn refresh" onClick={fetchAllData}>
            <RefreshCw size={18} />
            <span>Refresh</span>
          </button>
        </div>
        <div className="hero-content">
          <div className="hero-badge">
            <Radio size={16} className="pulsing" />
            <span>LIVE • {realtimeCount} events</span>
          </div>
          <h1>Email Control Center</h1>
          <p>Real-time email tracking, analytics, and management</p>
          <div className="hero-stats">
            <div className="stat"><Mail size={16} /><span>{stats?.total || 0} Events</span></div>
            <div className="stat"><CheckCircle size={16} /><span>{stats?.delivered || 0} Delivered</span></div>
            <div className="stat"><Eye size={16} /><span>{stats?.opened || 0} Opened</span></div>
            <div className="stat"><TrendingUp size={16} /><span>{stats?.openRate || 0}% Open Rate</span></div>
            <div className="stat live-stat"><Radio size={12} /><span>Live</span></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Tabs */}
        <div className="tabs-container">
          <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            <Activity size={16} /> Overview
          </button>
          <button className={`tab-btn ${activeTab === 'campaigns' ? 'active' : ''}`} onClick={() => setActiveTab('campaigns')}>
            <Target size={16} /> Campaigns
          </button>
          <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            <Users size={16} /> Users
          </button>
          <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <Settings size={16} /> Settings
          </button>
          <button className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
            <BarChart3 size={16} /> Analytics
          </button>
        </div>

        {/* ==================== OVERVIEW TAB ==================== */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Grid */}
            <div className="stats-grid">
              {statsCards.map((card, index) => (
                <div key={index} className="stat-card hover-scale">
                  <div className="stat-icon" style={{ background: card.color }}>{card.icon}</div>
                  <div>
                    <p className="stat-value">{card.value}</p>
                    <p className="stat-label">{card.title}</p>
                    {card.change && (
                      <span className={`stat-change ${card.change.startsWith('+') ? 'positive' : 'negative'}`}>
                        {card.change}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Controls Bar */}
            <div className="controls-bar">
              <div className="search-box">
                <Search size={16} />
                <input 
                  type="text" 
                  placeholder="Search email, subject, or user..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <Filter size={14} />
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                  <option value="all">All Events</option>
                  <option value="delivered">Delivered</option>
                  <option value="opened">Opened</option>
                  <option value="clicked">Clicked</option>
                  <option value="request">Sent</option>
                  <option value="hard_bounce">Hard Bounce</option>
                  <option value="soft_bounce">Soft Bounce</option>
                  <option value="unsubscribe">Unsubscribed</option>
                  <option value="complaint">Complaint</option>
                </select>
              </div>
              <div className="filter-group">
                <CalendarIcon size={14} />
                <select value={filterDate} onChange={(e) => setFilterDate(e.target.value)}>
                  <option value="today">Today</option>
                  <option value="week">Last 7 days</option>
                  <option value="month">Last 30 days</option>
                  <option value="all">All time</option>
                </select>
              </div>
              <div className="filter-group">
                <Sliders size={14} />
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="latest">Latest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="email">By email</option>
                </select>
              </div>
              <button className="refresh-btn" onClick={fetchAllData}>
                <RefreshCw size={14} /> Refresh
              </button>
              <button className="export-btn" onClick={() => setShowExportModal(true)}>
                <Download size={14} /> Export
              </button>
              <button className="view-toggle" onClick={() => setViewMode(viewMode === 'list' ? 'compact' : 'list')}>
                {viewMode === 'list' ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
              </button>
            </div>

            {/* Real-time Activity Feed */}
            <div className="activity-section">
              <div className="section-header">
                <h3><Activity size={18} /> Real-time Activity Feed</h3>
                <div className="header-actions">
                  <span className="live-badge">● LIVE</span>
                  <span className="event-count">{realtimeCount} new</span>
                </div>
              </div>
              <div className="activity-list">
                {liveEvents.length === 0 ? (
                  <div className="empty-state"><Bell size={40} /><p>No activity yet. Send emails to see events here.</p></div>
                ) : (
                  liveEvents.map((log) => (
                    <div key={log.id} className={`activity-item ${log.isNew ? 'new' : ''}`}>
                      <div className={`activity-icon ${getEventBadge(log.eventType)}`}>
                        {getEventIcon(log.eventType)}
                      </div>
                      <div className="activity-content">
                        <div className="activity-event">
                          <span className="event-type">{log.eventType}</span>
                          <span className="event-email">{log.email}</span>
                        </div>
                        <div className="activity-details">
                          <span className="event-subject">{log.subject || 'No subject'}</span>
                          <span className="event-user">{log.user?.fullName || 'Unknown'}</span>
                        </div>
                      </div>
                      <div className="activity-time">
                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Logs Table */}
            <div className="logs-section">
              <div className="section-header">
                <h3><FileText size={18} /> All Events ({filteredLogs.length})</h3>
                {bulkMode && (
                  <div className="bulk-actions">
                    <button onClick={() => setSelectedLogs([])}>Clear</button>
                    <button onClick={() => setBulkMode(false)}>Exit</button>
                  </div>
                )}
              </div>
              <div className="table-container">
                <table className={`logs-table ${viewMode === 'compact' ? 'compact' : ''}`}>
                  <thead>
                    <tr>
                      {bulkMode && <th><input type="checkbox" onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLogs(sortedLogs.slice(0, 20).map(l => l.id));
                        } else {
                          setSelectedLogs([]);
                        }
                      }} /></th>}
                      <th>Event</th>
                      <th>Email</th>
                      <th>Subject</th>
                      <th>User</th>
                      <th>Time</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLogs.slice(0, 50).map((log) => (
                      <tr key={log.id} className={log.isNew ? 'new-row' : ''}>
                        {bulkMode && <td><input type="checkbox" checked={selectedLogs.includes(log.id)} onChange={() => {
                          setSelectedLogs(prev => 
                            prev.includes(log.id) 
                              ? prev.filter(id => id !== log.id)
                              : [...prev, log.id]
                          );
                        }} /></td>}
                        <td>
                          <span className={`event-badge ${getEventBadge(log.eventType)}`}>
                            {getEventIcon(log.eventType)}
                            {log.eventType}
                          </span>
                        </td>
                        <td className="email-cell">{log.email}</td>
                        <td className="subject-cell">{log.subject || '—'}</td>
                        <td>{log.user?.fullName || 'Unknown'}</td>
                        <td className="time-cell">
                          {format(new Date(log.createdAt), 'HH:mm')}
                          <span className="date-small">{format(new Date(log.createdAt), 'MMM d')}</span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button className="action-btn view-btn" onClick={() => {
                              if (log.user?.id) {
                                viewUserHistory({ id: log.user.id, email: log.email, fullName: log.user?.fullName });
                              }
                            }} title="View user history">
                              <Eye size={14} />
                            </button>
                            {log.eventType === 'unsubscribe' && log.user?.id && (
                              <button className="action-btn resubscribe-btn" onClick={() => handleResubscribe(log.user.id, log.email)} title="Re-subscribe">
                                <Unlock size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sortedLogs.length > 50 && (
                  <div className="table-footer">
                    Showing 50 of {sortedLogs.length} events
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ==================== CAMPAIGNS TAB ==================== */}
        {activeTab === 'campaigns' && (
          <>
            <div className="campaigns-header">
              <h3><Target size={20} /> Campaign Performance</h3>
              <p>Email engagement metrics by campaign type</p>
            </div>

            <div className="campaign-grid">
              {campaignStats.map((campaign, index) => (
                <div key={index} className="campaign-card">
                  <div className="campaign-header">
                    <span className="campaign-name">{campaign.name}</span>
                    <span className="campaign-sent">{campaign.sent} sent</span>
                  </div>
                  <div className="campaign-stats">
                    <div className="campaign-stat">
                      <span className="stat-number">{campaign.opened}</span>
                      <span className="stat-label">Opened</span>
                    </div>
                    <div className="campaign-stat">
                      <span className="stat-number">{campaign.clicked}</span>
                      <span className="stat-label">Clicked</span>
                    </div>
                    <div className="campaign-stat">
                      <span className="stat-number">{campaign.rate}%</span>
                      <span className="stat-label">Open Rate</span>
                    </div>
                  </div>
                  <div className="campaign-progress">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${campaign.rate}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Device Breakdown */}
            <div className="device-section">
              <h3><Smartphone size={18} /> Device Breakdown</h3>
              <div className="device-grid">
                {deviceStats.map((device, index) => (
                  <div key={index} className="device-card">
                    <div className="device-icon">{device.icon}</div>
                    <div className="device-info">
                      <span className="device-name">{device.name}</span>
                      <span className="device-percentage">{device.percentage}%</span>
                    </div>
                    <div className="device-bar">
                      <div className="device-fill" style={{ width: `${device.percentage}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Geography */}
            <div className="geo-section">
              <h3><Globe size={18} /> Geographic Distribution</h3>
              <div className="geo-grid">
                {geoData.map((geo, index) => (
                  <div key={index} className="geo-item">
                    <span className="geo-flag">{geo.flag}</span>
                    <span className="geo-country">{geo.country}</span>
                    <span className="geo-percentage">{geo.percentage}%</span>
                    <div className="geo-bar">
                      <div className="geo-fill" style={{ width: `${geo.percentage}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ==================== USERS TAB ==================== */}
        {activeTab === 'users' && (
          <>
            <div className="controls-bar">
              <div className="search-box">
                <Search size={16} />
                <input 
                  type="text" 
                  placeholder="Search users..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <Filter size={14} />
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="unsubscribed">Unsubscribed</option>
                  <option value="bounced">Bounced</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
              <button className="refresh-btn" onClick={fetchAllData}>
                <RefreshCw size={14} /> Refresh
              </button>
              <button className="export-btn" onClick={() => setShowExportModal(true)}>
                <Download size={14} /> Export
              </button>
            </div>

            <div className="users-section">
              <div className="users-stats">
                <div>Total: {filteredUsers.length}</div>
                <div className="active-users">Active: {filteredUsers.filter(u => u.emailStatus === 'active').length}</div>
                <div className="unsubscribed-users">Unsubscribed: {filteredUsers.filter(u => u.emailStatus === 'unsubscribed').length}</div>
                <div className="bounced-users">Bounced: {filteredUsers.filter(u => u.emailStatus === 'bounced').length}</div>
              </div>
              <div className="table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.slice(0, 50).map((user) => (
                      <tr key={user.id}>
                        <td className="user-name-cell">{user.fullName}</td>
                        <td className="email-cell">{user.email}</td>
                        <td>{user.role || user.specialRole || 'Member'}</td>
                        <td>
                          <span className={`status-badge ${getStatusBadge(user.emailStatus)}`}>
                            {user.emailStatus === 'active' && <CheckCircle size={12} />}
                            {user.emailStatus === 'unsubscribed' && <UserX size={12} />}
                            {user.emailStatus === 'bounced' && <AlertCircle size={12} />}
                            {user.emailStatus === 'unknown' && <AlertTriangle size={12} />}
                            {user.emailStatus}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button className="action-btn view-btn" onClick={() => viewUserHistory(user)} title="View history">
                              <Eye size={14} />
                            </button>
                            {user.emailStatus === 'unsubscribed' && (
                              <button className="action-btn resubscribe-btn" onClick={() => handleResubscribe(user.id, user.email)} title="Re-subscribe">
                                <Unlock size={14} />
                              </button>
                            )}
                            <button className="action-btn email-btn" onClick={() => window.location.href = `mailto:${user.email}`} title="Send email">
                              <Mail size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ==================== SETTINGS TAB ==================== */}
        {activeTab === 'settings' && (
          <div className="settings-section">
            {/* Emergency Mode */}
            <div className="settings-card emergency-card">
              <div className="settings-header">
                <div className="settings-icon emergency-icon"><Shield size={24} /></div>
                <div>
                  <h3>🚨 Emergency Mode</h3>
                  <p>When enabled, ONLY password reset and verification emails will be sent</p>
                </div>
              </div>
              <div className="settings-body">
                <div className="emergency-toggle">
                  <button 
                    className={`emergency-btn ${emergencyMode ? 'active' : ''}`}
                    onClick={toggleEmergencyMode}
                    disabled={updating}
                  >
                    {emergencyMode ? (
                      <>
                        <Lock size={16} /> Emergency Mode ON
                      </>
                    ) : (
                      <>
                        <Unlock size={16} /> Emergency Mode OFF
                      </>
                    )}
                  </button>
                  {emergencyMode && (
                    <div className="emergency-status">
                      <AlertTriangle size={16} className="text-yellow-500" />
                      <span>Only Password Reset & Verification emails are being sent</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Email Type Controls */}
            <div className="settings-card">
              <div className="settings-header">
                <div className="settings-icon"><Mail size={20} /></div>
                <div>
                  <h3>📧 Email Type Controls</h3>
                  <p>Toggle which types of emails can be sent</p>
                </div>
              </div>
              <div className="settings-body">
                <div className="settings-grid">
                  {settings.map((setting) => (
                    <div key={setting.id} className="setting-item">
                      <div className="setting-info">
                        <span className="setting-name">{setting.name}</span>
                        <span className="setting-type">{setting.category}</span>
                      </div>
                      <div className="setting-toggle">
                        <button 
                          className={`toggle-btn ${setting.enabled ? 'active' : ''}`}
                          onClick={() => toggleSetting(setting.id, setting.enabled)}
                          disabled={updating || (emergencyMode && !['password_reset', 'verification'].includes(setting.type))}
                        >
                          {setting.enabled ? 'ON' : 'OFF'}
                        </button>
                        {(emergencyMode && !['password_reset', 'verification'].includes(setting.type)) && (
                          <span className="lock-icon"><Lock size={12} /></span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* User Preferences */}
            <div className="settings-card">
              <div className="settings-header">
                <div className="settings-icon"><Users size={20} /></div>
                <div>
                  <h3>👤 Default User Preferences</h3>
                  <p>Default email preferences for new users</p>
                </div>
              </div>
              <div className="settings-body">
                <div className="preference-grid">
                  <div className="preference-item">
                    <span>Announcements</span>
                    <label className="toggle-switch">
                      <input type="checkbox" defaultChecked />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  <div className="preference-item">
                    <span>Notifications</span>
                    <label className="toggle-switch">
                      <input type="checkbox" defaultChecked />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  <div className="preference-item">
                    <span>Marketing</span>
                    <label className="toggle-switch">
                      <input type="checkbox" />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  <div className="preference-item">
                    <span>System Alerts</span>
                    <label className="toggle-switch">
                      <input type="checkbox" defaultChecked />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== ANALYTICS TAB ==================== */}
        {activeTab === 'analytics' && (
          <div className="analytics-section">
            <div className="controls-bar">
              <div className="filter-group">
                <Calendar size={14} />
                <select value={period} onChange={(e) => setPeriod(e.target.value)}>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="365">Last year</option>
                </select>
              </div>
              <button className="refresh-btn" onClick={fetchAllData}>
                <RefreshCw size={14} /> Refresh
              </button>
              <button className="export-btn" onClick={() => setShowExportModal(true)}>
                <Download size={14} /> Export
              </button>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#3b82f6' }}><Mail size={18} /></div>
                <div>
                  <p className="stat-value">{stats?.total || 0}</p>
                  <p className="stat-label">Total Events</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#10b981' }}><CheckCircle size={18} /></div>
                <div>
                  <p className="stat-value">{stats?.delivered || 0}</p>
                  <p className="stat-label">Delivered</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#8b5cf6' }}><Eye size={18} /></div>
                <div>
                  <p className="stat-value">{stats?.opened || 0}</p>
                  <p className="stat-label">Opened</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#f59e0b' }}><Link size={18} /></div>
                <div>
                  <p className="stat-value">{stats?.clicked || 0}</p>
                  <p className="stat-label">Clicked</p>
                </div>
              </div>
            </div>

            {/* Open Rate Chart */}
            <div className="chart-section">
              <h3><BarChart3 size={18} /> Open Rate by Email Type</h3>
              <div className="chart-container">
                {settings.map((setting) => {
                  const typeLogs = logs.filter(l => l.eventType === 'opened' && l.tag?.includes(setting.type));
                  const totalTypeLogs = logs.filter(l => l.tag?.includes(setting.type));
                  const rate = totalTypeLogs.length > 0 ? Math.round((typeLogs.length / totalTypeLogs.length) * 100) : 0;
                  
                  return (
                    <div key={setting.id} className="chart-bar">
                      <div className="chart-label">
                        <span>{setting.name}</span>
                        <span>{rate}%</span>
                      </div>
                      <div className="chart-track">
                        <div 
                          className="chart-fill" 
                          style={{ 
                            width: `${rate}%`,
                            background: rate > 70 ? '#10b981' : rate > 40 ? '#f59e0b' : '#ef4444'
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Engagement Trends */}
            <div className="trends-section">
              <h3><Flame size={18} /> Engagement Trends</h3>
              <div className="trends-grid">
                <div className="trend-item">
                  <span className="trend-label">Best Day</span>
                  <span className="trend-value">Sunday</span>
                  <span className="trend-sub">2,500 opens</span>
                </div>
                <div className="trend-item">
                  <span className="trend-label">Peak Hour</span>
                  <span className="trend-value">10:00 AM</span>
                  <span className="trend-sub">1,800 opens</span>
                </div>
                <div className="trend-item">
                  <span className="trend-label">Best Campaign</span>
                  <span className="trend-value">Verification</span>
                  <span className="trend-sub">76% open rate</span>
                </div>
                <div className="trend-item">
                  <span className="trend-label">Top Device</span>
                  <span className="trend-value">Mobile</span>
                  <span className="trend-sub">65% of opens</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        /* ===== GLOBAL ===== */
        .email-dashboard {
          min-height: 100vh;
          background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* ===== HERO ===== */
        .hero-section {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          padding: 20px 32px 50px;
          position: relative;
          overflow: hidden;
        }
        .hero-section::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 20% 50%, rgba(59,130,246,0.15) 0%, transparent 50%),
                      radial-gradient(circle at 80% 50%, rgba(139,92,246,0.15) 0%, transparent 50%);
          pointer-events: none;
        }

        .hero-nav {
          display: flex;
          gap: 12px;
          margin-bottom: 30px;
          position: relative;
          z-index: 10;
        }

        .hero-nav-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 20px;
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 40px;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 13px;
        }
        .hero-nav-btn:hover { background: rgba(255,255,255,0.2); transform: translateY(-1px); }
        .hero-nav-btn.refresh { background: rgba(59,130,246,0.3); border-color: rgba(59,130,246,0.5); }
        .hero-nav-btn.refresh:hover { background: rgba(59,130,246,0.5); }

        .hero-content {
          position: relative;
          z-index: 10;
          text-align: center;
          max-width: 900px;
          margin: 0 auto;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 6px 20px;
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          border-radius: 40px;
          color: white;
          font-size: 12px;
          margin-bottom: 20px;
        }
        .hero-badge .pulsing {
          animation: pulse-dot 1.5s ease-in-out infinite;
        }
        @keyframes pulse-dot {
          0%,100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .hero-content h1 {
          font-size: 38px;
          font-weight: 700;
          color: white;
          margin-bottom: 12px;
        }

        .hero-content p {
          font-size: 16px;
          color: #94a3b8;
          margin-bottom: 28px;
        }

        .hero-stats {
          display: flex;
          justify-content: center;
          gap: 24px;
          flex-wrap: wrap;
        }

        .hero-stats .stat {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #cbd5e1;
          font-size: 13px;
          background: rgba(255,255,255,0.05);
          padding: 6px 16px;
          border-radius: 40px;
        }
        .hero-stats .stat.live-stat {
          background: rgba(16,185,129,0.2);
          color: #10b981;
          border: 1px solid rgba(16,185,129,0.3);
        }

        /* ===== LIVE COUNTER ===== */
        .live-counter {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(15,23,42,0.95);
          backdrop-filter: blur(10px);
          padding: 8px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          color: #94a3b8;
          font-size: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .counter-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
          animation: pulse-dot 1.5s ease-in-out infinite;
        }
        .last-event {
          color: #cbd5e1;
          font-size: 11px;
        }

        /* ===== MAIN ===== */
        .main-content {
          max-width: 1400px;
          margin: -20px auto 0;
          padding: 0 24px 40px;
          position: relative;
          z-index: 3;
        }

        /* ===== TABS ===== */
        .tabs-container {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          background: white;
          padding: 6px;
          border-radius: 60px;
          width: fit-content;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          flex-wrap: wrap;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 24px;
          background: transparent;
          border: none;
          border-radius: 40px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          color: #64748b;
        }
        .tab-btn:hover { background: #f1f5f9; }
        .tab-btn.active { background: #3b82f6; color: white; }

        /* ===== STATS ===== */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          transition: all 0.3s;
        }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); }

        .stat-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .stat-value {
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
        }
        .stat-label {
          font-size: 12px;
          color: #94a3b8;
        }
        .stat-change {
          font-size: 10px;
          font-weight: 600;
          margin-left: 4px;
        }
        .stat-change.positive { color: #10b981; }
        .stat-change.negative { color: #ef4444; }

        /* ===== CONTROLS ===== */
        .controls-bar {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
          align-items: center;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 16px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 40px;
          flex: 1;
          min-width: 200px;
        }
        .search-box input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-size: 13px;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 40px;
        }
        .filter-group select {
          border: none;
          background: transparent;
          outline: none;
          font-size: 13px;
        }

        .refresh-btn, .export-btn, .view-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 20px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 40px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }
        .refresh-btn:hover, .export-btn:hover, .view-toggle:hover { background: #f8fafc; }

        /* ===== ACTIVITY ===== */
        .activity-section, .logs-section, .users-section, .settings-section, .analytics-section {
          background: white;
          border-radius: 20px;
          padding: 20px;
          margin-bottom: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .section-header h3 {
          font-size: 15px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .live-badge {
          font-size: 11px;
          color: #10b981;
          animation: pulse-dot 2s infinite;
        }
        .event-count {
          font-size: 11px;
          color: #3b82f6;
          background: #eff6ff;
          padding: 2px 10px;
          border-radius: 20px;
        }

        .activity-list {
          max-height: 400px;
          overflow-y: auto;
        }
        .activity-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px;
          border-bottom: 1px solid #f1f5f9;
          transition: all 0.3s;
        }
        .activity-item.new {
          background: #f0f7ff;
          animation: highlight-row 2s ease;
        }
        @keyframes highlight-row {
          0% { background: #dbeafe; }
          100% { background: #f0f7ff; }
        }
        .activity-item:last-child { border-bottom: none; }
        .activity-item:hover { background: #f8fafc; }

        .activity-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .activity-content { flex: 1; }
        .activity-event {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }
        .event-type {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          color: #475569;
        }
        .event-email {
          font-size: 13px;
          color: #1e293b;
        }
        .activity-details {
          display: flex;
          gap: 12px;
          font-size: 12px;
          color: #94a3b8;
          flex-wrap: wrap;
        }
        .activity-time {
          font-size: 11px;
          color: #94a3b8;
          white-space: nowrap;
        }

        /* ===== REAL-TIME POPUP ===== */
        .realtime-popup {
          position: fixed;
          bottom: 80px;
          right: 20px;
          z-index: 1000;
          background: white;
          border-radius: 16px;
          padding: 16px 20px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
          animation: slideInRight 0.5s ease;
          max-width: 360px;
          border-left: 4px solid #3b82f6;
        }
        @keyframes slideInRight {
          from { transform: translateX(120px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .popup-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .popup-icon { font-size: 20px; }
        .popup-text {
          display: flex;
          flex-direction: column;
        }
        .popup-text strong { font-size: 13px; color: #1e293b; }
        .popup-text span { font-size: 12px; color: #475569; }
        .popup-text small { font-size: 10px; color: #94a3b8; }
        .popup-close {
          background: none;
          border: none;
          cursor: pointer;
          color: #94a3b8;
          padding: 4px;
        }

        /* ===== TABLES ===== */
        .table-container {
          overflow-x: auto;
        }
        .logs-table, .users-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .logs-table th, .users-table th {
          text-align: left;
          padding: 10px 12px;
          background: #f8fafc;
          font-weight: 600;
          color: #475569;
          border-bottom: 2px solid #e2e8f0;
        }
        .logs-table td, .users-table td {
          padding: 10px 12px;
          border-bottom: 1px solid #f1f5f9;
        }
        .logs-table.compact td { padding: 6px 10px; font-size: 12px; }
        .logs-table .new-row { background: #f0f7ff; }

        .event-badge, .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 30px;
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
        }
        .email-cell { font-weight: 500; color: #1e293b; }
        .subject-cell { color: #475569; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .time-cell { font-size: 12px; color: #94a3b8; }
        .date-small { display: block; font-size: 10px; color: #cbd5e1; }
        .user-name-cell { font-weight: 600; color: #1e293b; }

        .action-buttons { display: flex; gap: 6px; }
        .action-btn {
          padding: 4px 8px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .action-btn.view-btn { background: #eff6ff; color: #3b82f6; }
        .action-btn.view-btn:hover { background: #dbeafe; }
        .action-btn.resubscribe-btn { background: #ecfdf5; color: #10b981; }
        .action-btn.resubscribe-btn:hover { background: #d1fae5; }
        .action-btn.email-btn { background: #fef3c7; color: #f59e0b; }
        .action-btn.email-btn:hover { background: #fde68a; }

        .table-footer { padding: 12px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }

        /* ===== CAMPAIGNS ===== */
        .campaigns-header { margin-bottom: 24px; }
        .campaigns-header h3 { font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
        .campaigns-header p { color: #94a3b8; font-size: 14px; }

        .campaign-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .campaign-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #e2e8f0;
          transition: all 0.3s;
        }
        .campaign-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
        .campaign-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .campaign-name { font-weight: 600; }
        .campaign-sent { font-size: 12px; color: #94a3b8; }
        .campaign-stats { display: flex; gap: 16px; margin: 12px 0; }
        .campaign-stat { text-align: center; }
        .campaign-stat .stat-number { font-size: 18px; font-weight: 700; display: block; }
        .campaign-stat .stat-label { font-size: 11px; color: #94a3b8; }
        .campaign-progress { margin-top: 8px; }

        /* ===== DEVICE & GEO ===== */
        .device-section, .geo-section { background: white; border-radius: 20px; padding: 20px; margin-bottom: 24px; }
        .device-section h3, .geo-section h3 { font-size: 15px; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }

        .device-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
        .device-card { display: flex; align-items: center; gap: 12px; padding: 12px; background: #f8fafc; border-radius: 12px; }
        .device-icon { font-size: 24px; }
        .device-info { flex: 1; }
        .device-name { font-size: 13px; }
        .device-percentage { font-size: 13px; font-weight: 600; }
        .device-bar { width: 100%; height: 4px; background: #e2e8f0; border-radius: 2px; overflow: hidden; }
        .device-fill { height: 100%; background: #3b82f6; border-radius: 2px; }

        .geo-grid { display: flex; flex-direction: column; gap: 8px; }
        .geo-item { display: flex; align-items: center; gap: 12px; padding: 8px 12px; background: #f8fafc; border-radius: 8px; }
        .geo-flag { font-size: 20px; }
        .geo-country { flex: 1; font-size: 13px; }
        .geo-percentage { font-size: 13px; font-weight: 600; }
        .geo-bar { width: 100px; height: 4px; background: #e2e8f0; border-radius: 2px; overflow: hidden; }
        .geo-fill { height: 100%; background: #3b82f6; border-radius: 2px; }

        /* ===== SETTINGS ===== */
        .settings-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
          border: 1px solid #e2e8f0;
        }
        .settings-card.emergency-card { border: 2px solid #fef3c7; background: #fffbeb; }

        .settings-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }
        .settings-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .settings-icon.emergency-icon { background: #fef3c7; color: #f59e0b; }
        .settings-header h3 { font-size: 16px; font-weight: 600; margin: 0; }
        .settings-header p { font-size: 13px; color: #94a3b8; margin: 0; }

        .settings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 12px;
        }
        .setting-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #f8fafc;
          border-radius: 12px;
        }
        .setting-info { display: flex; flex-direction: column; gap: 2px; }
        .setting-name { font-size: 14px; font-weight: 500; }
        .setting-type { font-size: 11px; color: #94a3b8; }
        .setting-toggle { display: flex; align-items: center; gap: 8px; }

        .toggle-btn {
          padding: 4px 14px;
          border: none;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .toggle-btn.active { background: #10b981; color: white; }
        .toggle-btn:not(.active) { background: #e2e8f0; color: #64748b; }
        .toggle-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .lock-icon { color: #94a3b8; }

        .emergency-toggle { display: flex; flex-direction: column; gap: 12px; }
        .emergency-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 12px 24px;
          border: none;
          border-radius: 40px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          width: fit-content;
        }
        .emergency-btn.active { background: #ef4444; color: white; }
        .emergency-btn:not(.active) { background: #10b981; color: white; }
        .emergency-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #fef3c7;
          border-radius: 8px;
          font-size: 13px;
          color: #92400e;
        }

        /* Preference toggles */
        .preference-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
        .preference-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border-radius: 8px; }
        .preference-item span { font-size: 13px; }
        .toggle-switch { position: relative; width: 40px; height: 22px; display: inline-block; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .toggle-slider {
          position: absolute;
          cursor: pointer;
          inset: 0;
          background: #e2e8f0;
          border-radius: 22px;
          transition: 0.3s;
        }
        .toggle-slider::before {
          content: '';
          position: absolute;
          height: 16px;
          width: 16px;
          left: 3px;
          bottom: 3px;
          background: white;
          border-radius: 50%;
          transition: 0.3s;
        }
        .toggle-switch input:checked + .toggle-slider { background: #10b981; }
        .toggle-switch input:checked + .toggle-slider::before { transform: translateX(18px); }

        /* ===== CHART ===== */
        .chart-section {
          background: white;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .chart-section h3 {
          font-size: 15px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
        }
        .chart-container { display: flex; flex-direction: column; gap: 16px; }
        .chart-bar { display: flex; flex-direction: column; gap: 4px; }
        .chart-label { display: flex; justify-content: space-between; font-size: 13px; color: #475569; }
        .chart-track { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
        .chart-fill { height: 100%; border-radius: 4px; transition: width 0.6s ease; }

        /* ===== TRENDS ===== */
        .trends-section { background: white; border-radius: 16px; padding: 20px; }
        .trends-section h3 { font-size: 15px; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .trends-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
        .trend-item { padding: 16px; background: #f8fafc; border-radius: 12px; text-align: center; }
        .trend-label { display: block; font-size: 11px; color: #94a3b8; margin-bottom: 4px; }
        .trend-value { display: block; font-size: 18px; font-weight: 700; color: #1e293b; }
        .trend-sub { display: block; font-size: 11px; color: #94a3b8; margin-top: 4px; }

        /* ===== USERS STATS ===== */
        .users-stats {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .users-stats > div {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }
        .users-stats > div:first-child { background: #f1f5f9; color: #475569; }
        .active-users { background: #ecfdf5; color: #10b981; }
        .unsubscribed-users { background: #fef2f2; color: #ef4444; }
        .bounced-users { background: #fffbeb; color: #f59e0b; }

        /* ===== EXPORT MODAL ===== */
        .export-options { display: flex; gap: 12px; margin: 16px 0; }
        .export-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          cursor: pointer;
          background: white;
          transition: all 0.2s;
          flex: 1;
        }
        .export-option:hover { border-color: #94a3b8; }
        .export-option.active { border-color: #3b82f6; background: #eff6ff; }

        /* ===== USER HISTORY MODAL ===== */
        .user-stats-mini {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
          padding: 12px;
          background: #f8fafc;
          border-radius: 12px;
        }
        .user-stats-mini > div {
          font-size: 13px;
          font-weight: 500;
        }

        /* ===== MODAL ===== */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-container {
          background: white;
          border-radius: 24px;
          max-width: 600px;
          width: 90%;
          max-height: 85vh;
          overflow: hidden;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
        }
        .modal-header h3 {
          font-size: 16px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .modal-header button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          color: #94a3b8;
        }
        .modal-body { padding: 20px 24px; max-height: 400px; overflow-y: auto; }
        .modal-footer {
          padding: 16px 24px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .btn-secondary {
          padding: 8px 20px;
          border: none;
          border-radius: 30px;
          background: #f1f5f9;
          color: #475569;
          cursor: pointer;
        }
        .btn-primary {
          padding: 8px 20px;
          border: none;
          border-radius: 30px;
          background: #3b82f6;
          color: white;
          cursor: pointer;
        }

        .user-history-list { display: flex; flex-direction: column; gap: 8px; }
        .history-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          background: #f8fafc;
          border-radius: 8px;
        }
        .history-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
        }
        .history-subject { flex: 1; font-size: 13px; color: #1e293b; }
        .history-time { font-size: 11px; color: #94a3b8; }

        .empty-state { text-align: center; padding: 40px; color: #94a3b8; }
        .empty-text { text-align: center; color: #94a3b8; padding: 20px; }

        /* ===== TOAST ===== */
        .toast-notification {
          position: fixed;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          padding: 12px 24px;
          border-radius: 50px;
          color: white;
          z-index: 1100;
          animation: slideUp 0.3s ease;
          font-size: 14px;
        }
        .toast-notification.success { background: #10b981; }
        .toast-notification.error { background: #ef4444; }
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        /* ===== LOADER ===== */
        .email-loader {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f172a, #1e293b);
          color: white;
        }
        .loader-spinner {
          position: relative;
          width: 60px;
          height: 60px;
          margin-bottom: 20px;
        }
        .ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 3px solid transparent;
          animation: spin 1.5s infinite;
        }
        .ring:nth-child(1) {
          border-top-color: #3b82f6;
          border-right-color: #3b82f6;
        }
        .ring:nth-child(2) {
          border-bottom-color: #8b5cf6;
          border-left-color: #8b5cf6;
          animation-delay: 0.3s;
          width: 70%;
          height: 70%;
          top: 15%;
          left: 15%;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 768px) {
          .hero-section { padding: 16px 20px 40px; }
          .hero-content h1 { font-size: 28px; }
          .hero-stats { gap: 12px; }
          .main-content { padding: 0 16px 30px; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .controls-bar { flex-direction: column; }
          .search-box { width: 100%; }
          .tabs-container { width: 100%; justify-content: center; }
          .tab-btn { padding: 8px 16px; font-size: 12px; }
          .settings-grid { grid-template-columns: 1fr; }
          .activity-event { flex-wrap: wrap; }
          .campaign-grid { grid-template-columns: 1fr; }
          .realtime-popup { max-width: 90%; right: 10px; bottom: 70px; }
        }
      `}</style>
    </div>
  );
}