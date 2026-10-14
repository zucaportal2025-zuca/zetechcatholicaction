// frontend/src/pages/admin/EmailManagement.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import BASE_URL from '../../api';
import {
  ArrowLeft, Mail, Bell, Calendar, Users, DollarSign, 
  Megaphone, Music, Gamepad2, FileText, Clock, 
  CheckCircle, XCircle, RefreshCw, Save, Search,
  Eye, EyeOff, AlertCircle, Phone, Calendar as CalendarIcon
} from 'lucide-react';

export default function EmailManagement() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({});
  const [allSettings, setAllSettings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState(null);
  const [stats, setStats] = useState(null);

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [settingsRes, statsRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/admin/email/settings`, { headers: getHeaders() }),
        axios.get(`${BASE_URL}/api/admin/email/stats`, { headers: getHeaders() })
      ]);

      setSettings(settingsRes.data.settings || {});
      setAllSettings(settingsRes.data.all || []);
      setStats(statsRes.data);
      
      const cats = Object.keys(settingsRes.data.settings || {});
      setCategories(cats);
      
    } catch (error) {
      console.error('Error fetching email settings:', error);
      setMessage({ type: 'error', text: 'Failed to load email settings' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleToggle = async (type, currentEnabled) => {
    try {
      const newState = !currentEnabled;
      
      const updatedSettings = { ...settings };
      for (const category in updatedSettings) {
        updatedSettings[category] = updatedSettings[category].map(s => 
          s.type === type ? { ...s, enabled: newState } : s
        );
      }
      setSettings(updatedSettings);

      setAllSettings(allSettings.map(s => 
        s.type === type ? { ...s, enabled: newState } : s
      ));

      await axios.put(
        `${BASE_URL}/api/admin/email/settings/${type}`,
        { enabled: newState },
        { headers: getHeaders() }
      );

      setMessage({ 
        type: 'success', 
        text: `Email "${type}" ${newState ? 'enabled' : 'disabled'} successfully` 
      });
      setTimeout(() => setMessage(null), 3000);

    } catch (error) {
      console.error('Error toggling email setting:', error);
      fetchSettings();
      setMessage({ type: 'error', text: 'Failed to update setting' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleCategoryToggle = async (category, enabled) => {
    try {
      const newState = !enabled;
      
      const updatedSettings = { ...settings };
      if (updatedSettings[category]) {
        updatedSettings[category] = updatedSettings[category].map(s => ({
          ...s,
          enabled: newState
        }));
      }
      setSettings(updatedSettings);

      setAllSettings(allSettings.map(s => 
        s.category === category ? { ...s, enabled: newState } : s
      ));

      await axios.put(
        `${BASE_URL}/api/admin/email/categories/${category}/toggle`,
        { enabled: newState },
        { headers: getHeaders() }
      );

      setMessage({ 
        type: 'success', 
        text: `Category "${category}" ${newState ? 'enabled' : 'disabled'} successfully` 
      });
      setTimeout(() => setMessage(null), 3000);

    } catch (error) {
      console.error('Error toggling category:', error);
      fetchSettings();
      setMessage({ type: 'error', text: 'Failed to update category' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleResetAll = async () => {
    if (!window.confirm('Reset all email settings to default (enabled)?')) return;
    
    try {
      setSaving(true);
      await axios.post(
        `${BASE_URL}/api/admin/email/settings/reset`,
        {},
        { headers: getHeaders() }
      );
      await fetchSettings();
      setMessage({ type: 'success', text: 'All email settings reset to default' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error resetting settings:', error);
      setMessage({ type: 'error', text: 'Failed to reset settings' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      event: <Calendar size={18} />,
      attendance: <CheckCircle size={18} />,
      announcement: <Megaphone size={18} />,
      pledge: <DollarSign size={18} />,
      user: <Users size={18} />,
      program: <Music size={18} />,
      schedule: <Clock size={18} />,
      minutes: <FileText size={18} />,
      game: <Gamepad2 size={18} />,
      report: <FileText size={18} />,
      notification: <Bell size={18} />,
      sms: <Phone size={18} />,
      campaign: <Megaphone size={18} />
    };
    return icons[category] || <Mail size={18} />;
  };

  const getCategoryEmoji = (category) => {
    const emojis = {
      event: '📅',
      attendance: '✅',
      announcement: '📢',
      pledge: '💰',
      user: '👤',
      program: '🎵',
      schedule: '📋',
      minutes: '📝',
      game: '🎮',
      report: '📊',
      notification: '🔔',
      sms: '📱',
      campaign: '📣'
    };
    return emojis[category] || '📧';
  };

  const getCategoryName = (category) => {
    const names = {
      event: 'Event Reminders',
      attendance: 'Attendance',
      announcement: 'Announcements',
      pledge: 'Pledges & Payments',
      user: 'User Management',
      program: 'Mass Programs',
      schedule: 'Schedules',
      minutes: 'Meeting Minutes',
      game: 'Games',
      report: 'Reports',
      notification: 'Notifications',
      sms: 'SMS',
      campaign: 'Campaigns'
    };
    return names[category] || category;
  };

  const getStatusText = (enabled) => enabled ? 'ON' : 'OFF';

  const filteredSettings = allSettings.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryEnabled = (category) => {
    const items = allSettings.filter(s => s.category === category);
    if (items.length === 0) return false;
    return items.every(s => s.enabled);
  };

  const getEnabledCount = (category) => {
    const items = allSettings.filter(s => s.category === category);
    return items.filter(s => s.enabled).length;
  };

  const getCategoryCount = (category) => {
    return allSettings.filter(s => s.category === category).length;
  };

  const categoryOrder = ['event', 'attendance', 'announcement', 'pledge', 'user', 'program', 'schedule', 'minutes', 'game', 'report', 'notification', 'sms', 'campaign'];

  const sortedCategories = categories.sort((a, b) => {
    return categoryOrder.indexOf(a) - categoryOrder.indexOf(b);
  });

  if (loading) {
    return (
      <div className="email-management-loading">
        <div className="spinner"></div>
        <p>Loading email settings...</p>
      </div>
    );
  }

  return (
    <div className="email-management-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/admin/dashboard')}>
            <ArrowLeft size={20} /> Back
          </button>
          <div>
            <h1>📧 Email Management</h1>
            <p className="subtitle">Control which email notifications are sent to users</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="refresh-btn" onClick={fetchSettings} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
          </button>
          <button className="reset-btn" onClick={handleResetAll} disabled={saving}>
            <Save size={18} />
            {saving ? 'Saving...' : 'Reset All'}
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`message ${message.type}`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      {/* Stats Summary */}
      <div className="stats-summary">
        <div className="stat-item">
          <div className="stat-icon total">
            <Mail size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{allSettings.length}</span>
            <span className="stat-label">Total Email Types</span>
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-icon enabled">
            <CheckCircle size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{allSettings.filter(s => s.enabled).length}</span>
            <span className="stat-label">Enabled</span>
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-icon disabled">
            <XCircle size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{allSettings.filter(s => !s.enabled).length}</span>
            <span className="stat-label">Disabled</span>
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-icon categories">
            <Bell size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{categories.length}</span>
            <span className="stat-label">Categories</span>
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-icon emails">
            <Mail size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.overall?.total_emails || 0}</span>
            <span className="stat-label">Total Emails Sent</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="search-section">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search email types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Email Settings by Category */}
      <div className="settings-container">
        {sortedCategories.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📧</div>
            <h3>No Email Settings</h3>
            <p>No email settings found. Toggle an email type to create it.</p>
          </div>
        ) : (
          sortedCategories.map(category => {
            const categoryItems = allSettings.filter(s => s.category === category);
            if (categoryItems.length === 0) return null;
            
            const isAllEnabled = categoryItems.every(s => s.enabled);
            const enabledCount = categoryItems.filter(s => s.enabled).length;
            
            return (
              <div key={category} className="category-section">
                <div className="category-header">
                  <div className="category-title">
                    {getCategoryIcon(category)}
                    <h3>{getCategoryName(category)}</h3>
                    <span className="category-count">{enabledCount}/{categoryItems.length} enabled</span>
                  </div>
                  <div className="category-actions">
                    <button 
                      className={`category-toggle ${isAllEnabled ? 'enabled' : 'disabled'}`}
                      onClick={() => handleCategoryToggle(category, isAllEnabled)}
                    >
                      {isAllEnabled ? '✅ All ON' : '❌ All OFF'}
                    </button>
                  </div>
                </div>

                <div className="email-items">
                  {categoryItems.map(setting => (
                    <div key={setting.type} className="email-item">
                      <div className="email-info">
                        <div className="email-icon">
                          {setting.enabled ? '🟢' : '🔴'}
                        </div>
                        <div className="email-details">
                          <div className="email-name">{setting.name}</div>
                          <div className="email-type">{setting.type}</div>
                          {setting.description && (
                            <div className="email-description">{setting.description}</div>
                          )}
                        </div>
                      </div>
                      <div className="email-status">
                        <span className={`status-text ${setting.enabled ? 'enabled' : 'disabled'}`}>
                          {getStatusText(setting.enabled)}
                        </span>
                      </div>
                      <button
                        className={`toggle-btn ${setting.enabled ? 'enabled' : 'disabled'}`}
                        onClick={() => handleToggle(setting.type, setting.enabled)}
                      >
                        <span className="toggle-slider"></span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      <style>{`
        .email-management-page {
          padding: 24px;
          background: #f5f7fa;
          min-height: 100vh;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .header-left h1 {
          font-size: 24px;
          font-weight: 700;
          margin: 0;
        }

        .subtitle {
          color: #64748b;
          font-size: 14px;
          margin: 4px 0 0;
        }

        .back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .back-btn:hover {
          background: #f8fafc;
          transform: translateX(-2px);
        }

        .header-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .refresh-btn {
          padding: 8px 12px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .refresh-btn:hover:not(:disabled) {
          background: #f8fafc;
        }

        .refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          100% { transform: rotate(360deg); }
        }

        .reset-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #8b5cf6;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .reset-btn:hover:not(:disabled) {
          background: #7c3aed;
          transform: translateY(-1px);
        }

        .reset-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .message {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-weight: 500;
        }

        .message.success {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .message.error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fca5a5;
        }

        .stats-summary {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-item {
          background: white;
          padding: 16px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 14px;
          border: 1px solid #e2e8f0;
        }

        .stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .stat-icon.total { background: #3b82f6; }
        .stat-icon.enabled { background: #10b981; }
        .stat-icon.disabled { background: #ef4444; }
        .stat-icon.categories { background: #8b5cf6; }
        .stat-icon.emails { background: #f59e0b; }

        .stat-content {
          display: flex;
          flex-direction: column;
        }

        .stat-content .stat-value {
          font-size: 22px;
          font-weight: 700;
          color: #1e293b;
        }

        .stat-content .stat-label {
          font-size: 12px;
          color: #64748b;
        }

        .search-section {
          margin-bottom: 20px;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          background: white;
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          max-width: 400px;
        }

        .search-box input {
          border: none;
          outline: none;
          flex: 1;
          font-size: 14px;
          padding: 4px 0;
        }

        .settings-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .category-section {
          background: white;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .category-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 2px solid #f1f5f9;
        }

        .category-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .category-title h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
        }

        .category-count {
          font-size: 12px;
          color: #94a3b8;
          background: #f1f5f9;
          padding: 2px 10px;
          border-radius: 12px;
        }

        .category-toggle {
          padding: 4px 12px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
        }

        .category-toggle.enabled {
          background: #10b981;
          color: white;
        }

        .category-toggle.disabled {
          background: #f1f5f9;
          color: #64748b;
        }

        .email-items {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .email-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: #f8fafc;
          border-radius: 10px;
          transition: all 0.2s;
        }

        .email-item:hover {
          background: #f1f5f9;
        }

        .email-info {
          display: flex;
          align-items: center;
          gap: 14px;
          flex: 1;
        }

        .email-icon {
          font-size: 14px;
          width: 30px;
          text-align: center;
        }

        .email-details {
          display: flex;
          flex-direction: column;
        }

        .email-name {
          font-weight: 500;
          color: #1e293b;
          font-size: 14px;
        }

        .email-type {
          font-size: 11px;
          color: #94a3b8;
          font-family: monospace;
        }

        .email-description {
          font-size: 12px;
          color: #64748b;
          margin-top: 2px;
        }

        .email-status {
          margin-right: 12px;
        }

        .status-text {
          font-size: 12px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 12px;
        }

        .status-text.enabled {
          color: #10b981;
          background: #d1fae5;
        }

        .status-text.disabled {
          color: #ef4444;
          background: #fee2e2;
        }

        .toggle-btn {
          width: 44px;
          height: 24px;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          position: relative;
          transition: all 0.3s;
          flex-shrink: 0;
        }

        .toggle-btn.enabled {
          background: #10b981;
        }

        .toggle-btn.disabled {
          background: #cbd5e1;
        }

        .toggle-slider {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: all 0.3s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }

        .toggle-btn.enabled .toggle-slider {
          left: 22px;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 16px;
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .empty-state h3 {
          margin-bottom: 8px;
        }

        .empty-state p {
          color: #64748b;
        }

        .email-management-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 60vh;
          color: #64748b;
        }

        .spinner {
          border: 3px solid #e2e8f0;
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        @media (max-width: 768px) {
          .stats-summary {
            grid-template-columns: repeat(2, 1fr);
          }

          .page-header {
            flex-direction: column;
          }

          .email-item {
            flex-wrap: wrap;
          }

          .email-info {
            width: 100%;
            margin-bottom: 8px;
          }

          .email-status {
            margin-right: auto;
          }

          .category-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
        }

        @media (max-width: 480px) {
          .stats-summary {
            grid-template-columns: 1fr;
          }

          .email-management-page {
            padding: 16px;
          }

          .email-icon {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}