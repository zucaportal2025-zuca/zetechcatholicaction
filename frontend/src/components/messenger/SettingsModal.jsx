// frontend/src/components/messenger/SettingsModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Bell, Sun, Moon, Monitor, MessageCircle } from 'lucide-react';
import { api } from '../../api';
import { useMessenger } from '../../contexts/MessengerContext';

const SettingsModal = ({ onClose }) => {
  const { setDarkMode, setFontSize, loadUserSettings } = useMessenger();
  
  const [settings, setSettings] = useState({
    notificationsEnabled: true,
    emailNotifications: false,
    pushNotifications: true,
    soundEnabled: true,
    theme: 'light',
    messageFontSize: 'medium',
    enterToSend: true,
    showReadReceipts: true,
    showTypingIndicator: true,
    autoDeleteDays: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.get('/api/messenger/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(res.data.settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Apply setting immediately to UI
  const applySettingToUI = (key, value) => {
    switch(key) {
      case 'theme':
        if (value === 'dark') {
          setDarkMode(true);
          document.body.classList.add('dark-mode');
          document.body.classList.remove('light-mode');
        } else if (value === 'light') {
          setDarkMode(false);
          document.body.classList.add('light-mode');
          document.body.classList.remove('dark-mode');
        } else if (value === 'system') {
          const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          setDarkMode(systemDark);
          if (systemDark) {
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
          } else {
            document.body.classList.add('light-mode');
            document.body.classList.remove('dark-mode');
          }
        }
        break;
      case 'messageFontSize':
        setFontSize(value);
        const fontSizeMap = {
          small: '12px',
          medium: '14px',
          large: '16px'
        };
        document.body.style.fontSize = fontSizeMap[value] || '14px';
        break;
      default:
        break;
    }
  };

  const updateSetting = async (key, value) => {
    // Update local state immediately
    setSettings(prev => ({ ...prev, [key]: value }));
    // Apply to UI immediately
    applySettingToUI(key, value);
    setSaving(true);
    
    try {
      const token = localStorage.getItem('token');
      await api.put('/api/messenger/settings', 
        { [key]: value },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Error updating setting:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleSetting = async (key) => {
    const newValue = !settings[key];
    await updateSetting(key, newValue);
  };

  if (loading) {
    return (
      <div className="settings-modal-overlay" onClick={onClose}>
        <div className="settings-modal">
          <div className="settings-loading">Loading settings...</div>
        </div>
        <style jsx>{`
          .settings-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1100;
          }
          .settings-modal {
            background: white;
            border-radius: 20px;
            width: 90%;
            max-width: 400px;
            padding: 40px;
            text-align: center;
          }
          .settings-loading {
            color: #667781;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-modal-header">
          <h3>Settings</h3>
          <button className="settings-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="settings-modal-body">
          {/* Notifications Section */}
          <div className="settings-section">
            <div className="settings-section-title">
              <Bell size={18} />
              <span>Notifications</span>
            </div>
            
            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">Enable Notifications</span>
                <span className="settings-item-desc">Receive message notifications</span>
              </div>
              <label className="settings-switch">
                <input 
                  type="checkbox" 
                  checked={settings.notificationsEnabled}
                  onChange={() => toggleSetting('notificationsEnabled')}
                />
                <span className="settings-slider"></span>
              </label>
            </div>

            {settings.notificationsEnabled && (
              <>
                <div className="settings-item">
                  <div className="settings-item-info">
                    <span className="settings-item-label">Email Notifications</span>
                    <span className="settings-item-desc">Get email when you receive a message</span>
                  </div>
                  <label className="settings-switch">
                    <input 
                      type="checkbox" 
                      checked={settings.emailNotifications}
                      onChange={() => toggleSetting('emailNotifications')}
                    />
                    <span className="settings-slider"></span>
                  </label>
                </div>

                <div className="settings-item">
                  <div className="settings-item-info">
                    <span className="settings-item-label">Push Notifications</span>
                    <span className="settings-item-desc">Receive push notifications on your device</span>
                  </div>
                  <label className="settings-switch">
                    <input 
                      type="checkbox" 
                      checked={settings.pushNotifications}
                      onChange={() => toggleSetting('pushNotifications')}
                    />
                    <span className="settings-slider"></span>
                  </label>
                </div>

                <div className="settings-item">
                  <div className="settings-item-info">
                    <span className="settings-item-label">Sound</span>
                    <span className="settings-item-desc">Play sound when a message arrives</span>
                  </div>
                  <label className="settings-switch">
                    <input 
                      type="checkbox" 
                      checked={settings.soundEnabled}
                      onChange={() => toggleSetting('soundEnabled')}
                    />
                    <span className="settings-slider"></span>
                  </label>
                </div>
              </>
            )}
          </div>

          {/* Appearance Section */}
          <div className="settings-section">
            <div className="settings-section-title">
              <Sun size={18} />
              <span>Appearance</span>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">Theme</span>
                <span className="settings-item-desc">Choose your preferred theme</span>
              </div>
              <div className="settings-options">
                <button 
                  className={`settings-option ${settings.theme === 'light' ? 'active' : ''}`}
                  onClick={() => updateSetting('theme', 'light')}
                >
                  Light
                </button>
                <button 
                  className={`settings-option ${settings.theme === 'dark' ? 'active' : ''}`}
                  onClick={() => updateSetting('theme', 'dark')}
                >
                  Dark
                </button>
                <button 
                  className={`settings-option ${settings.theme === 'system' ? 'active' : ''}`}
                  onClick={() => updateSetting('theme', 'system')}
                >
                  System
                </button>
              </div>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">Font Size</span>
                <span className="settings-item-desc">Adjust message text size</span>
              </div>
              <div className="settings-options">
                <button 
                  className={`settings-option ${settings.messageFontSize === 'small' ? 'active' : ''}`}
                  onClick={() => updateSetting('messageFontSize', 'small')}
                >
                  Small
                </button>
                <button 
                  className={`settings-option ${settings.messageFontSize === 'medium' ? 'active' : ''}`}
                  onClick={() => updateSetting('messageFontSize', 'medium')}
                >
                  Medium
                </button>
                <button 
                  className={`settings-option ${settings.messageFontSize === 'large' ? 'active' : ''}`}
                  onClick={() => updateSetting('messageFontSize', 'large')}
                >
                  Large
                </button>
              </div>
            </div>
          </div>

          {/* Chat Behavior Section */}
          <div className="settings-section">
            <div className="settings-section-title">
              <MessageCircle size={18} />
              <span>Chat Behavior</span>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">Enter to Send</span>
                <span className="settings-item-desc">Press Enter to send message (Shift+Enter for new line)</span>
              </div>
              <label className="settings-switch">
                <input 
                  type="checkbox" 
                  checked={settings.enterToSend}
                  onChange={() => toggleSetting('enterToSend')}
                />
                <span className="settings-slider"></span>
              </label>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">Read Receipts</span>
                <span className="settings-item-desc">Show when others read your messages</span>
              </div>
              <label className="settings-switch">
                <input 
                  type="checkbox" 
                  checked={settings.showReadReceipts}
                  onChange={() => toggleSetting('showReadReceipts')}
                />
                <span className="settings-slider"></span>
              </label>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">Typing Indicator</span>
                <span className="settings-item-desc">Show when others are typing</span>
              </div>
              <label className="settings-switch">
                <input 
                  type="checkbox" 
                  checked={settings.showTypingIndicator}
                  onChange={() => toggleSetting('showTypingIndicator')}
                />
                <span className="settings-slider"></span>
              </label>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">Auto-Delete Messages</span>
                <span className="settings-item-desc">Delete messages after a certain number of days</span>
              </div>
              <select 
                className="settings-select"
                value={settings.autoDeleteDays || ''}
                onChange={(e) => updateSetting('autoDeleteDays', e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="">Never</option>
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="365">1 year</option>
              </select>
            </div>
          </div>
        </div>

        <div className="settings-modal-footer">
          {saving && <span className="settings-saving">Saving...</span>}
        </div>
      </div>

      <style jsx>{`
        .settings-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1100;
        }
        .settings-modal {
          background: #FFFFFF;
          border-radius: 24px;
          width: 90%;
          max-width: 480px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        }
        .settings-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: #075E54;
          color: white;
        }
        .settings-modal-header h3 {
          margin: 0;
          font-size: 18px;
        }
        .settings-close {
          background: transparent;
          border: none;
          color: white;
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .settings-modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }
        .settings-section {
          margin-bottom: 24px;
          border-bottom: 1px solid #E9EDEF;
          padding-bottom: 16px;
        }
        .settings-section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: #075E54;
          margin-bottom: 16px;
        }
        .settings-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #F0F2F5;
        }
        .settings-item:last-child {
          border-bottom: none;
        }
        .settings-item-info {
          flex: 1;
        }
        .settings-item-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #111B21;
        }
        .settings-item-desc {
          display: block;
          font-size: 11px;
          color: #667781;
        }
        .settings-switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }
        .settings-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .settings-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: 0.3s;
          border-radius: 24px;
        }
        .settings-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
        }
        input:checked + .settings-slider {
          background-color: #25D366;
        }
        input:checked + .settings-slider:before {
          transform: translateX(20px);
        }
        .settings-options {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .settings-option {
          padding: 6px 12px;
          border-radius: 20px;
          border: 1px solid #E9EDEF;
          background: white;
          cursor: pointer;
          font-size: 12px;
        }
        .settings-option.active {
          background: #075E54;
          color: white;
          border-color: #075E54;
        }
        .settings-select {
          padding: 8px 12px;
          border-radius: 12px;
          border: 1px solid #E9EDEF;
          background: white;
          font-size: 13px;
        }
        .settings-modal-footer {
          padding: 16px 20px;
          border-top: 1px solid #E9EDEF;
          display: flex;
          justify-content: flex-end;
        }
        .settings-saving {
          font-size: 12px;
          color: #667781;
        }
      `}</style>
    </div>
  );
};

export default SettingsModal;