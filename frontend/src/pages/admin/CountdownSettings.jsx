// frontend/src/pages/admin/CountdownSettings.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import BASE_URL from "../../api";
import { 
  FiArrowLeft, FiSave, FiClock, FiCalendar, FiType, 
  FiFlag, FiToggleLeft, FiToggleRight,
  FiCheckCircle, FiAlertCircle, FiRefreshCw
} from "react-icons/fi";
import { FaCalendarAlt, FaEdit, FaEye, FaPlusCircle } from "react-icons/fa";

function CountdownSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [formData, setFormData] = useState({
    targetDate: '',
    title: '',
    subtitle: '',
    icon: '🎄',
    isActive: false,
    eventColor: '#10b981'
  });
  const [previewTime, setPreviewTime] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [message, setMessage] = useState(null);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  // Fetch countdown settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/api/countdown-settings`);
      if (response.data?.success && response.data?.settings) {
        const s = response.data.settings;
        setSettings(s);
        setFormData({
          targetDate: s.targetDate ? new Date(s.targetDate).toISOString().slice(0, 16) : '',
          title: s.title || '',
          subtitle: s.subtitle || '',
          icon: s.icon || '🎄',
          isActive: s.isActive || false,
          eventColor: s.eventColor || '#10b981'
        });
        calculatePreview(s.targetDate);
      }
    } catch (error) {
      console.error("Error fetching countdown settings:", error);
      setMessage({ type: 'error', text: 'Failed to load countdown settings' });
    } finally {
      setLoading(false);
    }
  };

  // Calculate preview
  const calculatePreview = (targetDate) => {
    if (!targetDate) return;
    const now = new Date();
    const diff = new Date(targetDate) - now;
    
    if (diff <= 0) {
      setPreviewTime({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }
    
    setPreviewTime({
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000)
    });
  };

  // Handle form change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (name === 'targetDate' && value) {
      calculatePreview(value);
    }
  };

  // Handle icon selection
  const handleIconSelect = (icon) => {
    setFormData(prev => ({ ...prev, icon }));
  };

  // Common icons
  const commonIcons = ['🎄', '🎉', '🚀', '🎂', '🎊', '⭐', '🔥', '💫', '🌟', '🎯', '🏆', '🎈', '🎁', '✨', '🌺', '🌸', '🌈', '🎶'];

  // Save settings
  const handleSave = async () => {
    if (!formData.targetDate) {
      setMessage({ type: 'error', text: 'Please select a target date' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await axios.put(
        `${BASE_URL}/api/admin/countdown-settings`,
        formData,
        { headers }
      );

      if (response.data?.success) {
        setMessage({ type: 'success', text: 'Countdown settings saved successfully!' });
        setSettings(response.data.settings);
        calculatePreview(formData.targetDate);
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error("Error saving countdown settings:", error);
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  // Toggle active status
  const handleToggle = async () => {
    const newActive = !formData.isActive;
    setFormData(prev => ({ ...prev, isActive: newActive }));
    
    try {
      const response = await axios.patch(
        `${BASE_URL}/api/admin/countdown-settings/toggle`,
        { isActive: newActive },
        { headers }
      );
      
      if (response.data?.success) {
        setMessage({ type: 'success', text: `Countdown ${newActive ? 'activated' : 'deactivated'}` });
        setTimeout(() => setMessage(null), 2000);
      }
    } catch (error) {
      console.error("Error toggling countdown:", error);
      setFormData(prev => ({ ...prev, isActive: !newActive }));
      setMessage({ type: 'error', text: 'Failed to toggle countdown' });
    }
  };

  // Live preview timer
  useEffect(() => {
    if (!formData.targetDate) return;
    
    const interval = setInterval(() => {
      calculatePreview(formData.targetDate);
    }, 1000);

    return () => clearInterval(interval);
  }, [formData.targetDate]);

  useEffect(() => {
    fetchSettings();
  }, []);

  // ===== SKELETON LOADING =====
  if (loading) {
    return (
      <div className="countdown-settings-page">
        <div className="countdown-settings-container">
          {/* Header Skeleton */}
          <div className="countdown-settings-header skeleton-header">
            <div className="skeleton-btn"></div>
            <div className="skeleton-title"></div>
            <div className="skeleton-btn"></div>
          </div>

          <div className="countdown-settings-grid">
            {/* Left Column Skeleton */}
            <div className="countdown-settings-form">
              <div className="form-section skeleton-section">
                <div className="skeleton-heading"></div>
                <div className="skeleton-group">
                  <div className="skeleton-label"></div>
                  <div className="skeleton-toggle"></div>
                </div>
                <div className="skeleton-group">
                  <div className="skeleton-label"></div>
                  <div className="skeleton-input"></div>
                </div>
                <div className="skeleton-group">
                  <div className="skeleton-label"></div>
                  <div className="skeleton-input"></div>
                </div>
                <div className="skeleton-group">
                  <div className="skeleton-label"></div>
                  <div className="skeleton-input"></div>
                </div>
                <div className="skeleton-group">
                  <div className="skeleton-label"></div>
                  <div className="skeleton-icons"></div>
                </div>
                <div className="skeleton-group">
                  <div className="skeleton-label"></div>
                  <div className="skeleton-color"></div>
                </div>
              </div>
              <div className="form-section skeleton-section">
                <div className="skeleton-heading"></div>
                <div className="skeleton-status-item"></div>
                <div className="skeleton-status-item"></div>
                <div className="skeleton-status-item"></div>
              </div>
            </div>

            {/* Right Column Skeleton */}
            <div className="countdown-settings-preview skeleton-preview">
              <div className="skeleton-heading"></div>
              <div className="preview-card skeleton-preview-card">
                <div className="skeleton-preview-header"></div>
                <div className="skeleton-preview-grid"></div>
                <div className="skeleton-preview-subtitle"></div>
                <div className="skeleton-preview-status"></div>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          /* Skeleton Loading Styles */
          .skeleton-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 12px;
          }

          .skeleton-btn {
            width: 120px;
            height: 40px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            border-radius: 10px;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-title {
            width: 200px;
            height: 32px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            border-radius: 8px;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-section {
            padding: 24px;
          }

          .skeleton-heading {
            width: 150px;
            height: 20px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            border-radius: 6px;
            margin-bottom: 20px;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-group {
            margin-bottom: 20px;
          }

          .skeleton-label {
            width: 100px;
            height: 14px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            border-radius: 4px;
            margin-bottom: 8px;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-input {
            width: 100%;
            height: 42px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            border-radius: 10px;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-toggle {
            width: 100%;
            height: 56px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            border-radius: 12px;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-icons {
            display: grid;
            grid-template-columns: repeat(8, 1fr);
            gap: 8px;
          }

          .skeleton-icons .icon-skel {
            height: 48px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            border-radius: 10px;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-color {
            display: flex;
            gap: 12px;
            align-items: center;
          }

          .skeleton-color .color-skel {
            width: 44px;
            height: 44px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            border-radius: 10px;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-color .hex-skel {
            width: 80px;
            height: 32px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            border-radius: 6px;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-color .preset-skel {
            display: flex;
            gap: 6px;
          }

          .skeleton-color .preset-skel span {
            width: 28px;
            height: 28px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            border-radius: 50%;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-status-item {
            width: 100%;
            height: 40px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            border-radius: 8px;
            margin-bottom: 8px;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-preview {
            padding: 24px;
          }

          .skeleton-preview-card {
            padding: 24px;
            min-height: 250px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
          }

          .skeleton-preview-header {
            display: flex;
            gap: 12px;
            align-items: center;
          }

          .skeleton-preview-header span {
            width: 32px;
            height: 32px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            border-radius: 8px;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-preview-header .title-skel {
            width: 150px;
            height: 24px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            border-radius: 6px;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-preview-grid {
            display: flex;
            gap: 8px;
            align-items: center;
          }

          .skeleton-preview-grid .num-skel {
            width: 60px;
            height: 50px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            border-radius: 12px;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-preview-grid .sep-skel {
            width: 12px;
            height: 24px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            border-radius: 4px;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-preview-subtitle {
            width: 200px;
            height: 20px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            border-radius: 6px;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-preview-status {
            width: 100px;
            height: 16px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            border-radius: 4px;
            animation: shimmer 1.5s infinite;
          }

          @keyframes shimmer {
            0% {
              background-position: -200% 0;
            }
            100% {
              background-position: 200% 0;
            }
          }
        `}</style>
      </div>
    );
  }

  // ===== MAIN RENDER =====
  return (
    <div className="countdown-settings-page">
      <div className="countdown-settings-container">
        {/* Header */}
        <div className="countdown-settings-header">
          <button className="back-btn" onClick={() => navigate('/admin')}>
            <FiArrowLeft size={20} /> Back to Dashboard
          </button>
          <h1>⏰ Countdown Settings</h1>
          <button className="save-btn" onClick={handleSave} disabled={saving}>
            {saving ? <FiRefreshCw className="spinning" /> : <FiSave />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Message */}
        {message && (
          <motion.div 
            className={`countdown-message ${message.type}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {message.type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
            {message.text}
          </motion.div>
        )}

        <div className="countdown-settings-grid">
          {/* Left: Settings Form */}
          <div className="countdown-settings-form">
            <div className="form-section">
              <h3>⚙️ General Settings</h3>
              
              {/* Active Toggle */}
              <div className="form-group toggle-group">
                <label>Status</label>
                <div className="toggle-container" onClick={handleToggle}>
                  <span>{formData.isActive ? 'Active' : 'Inactive'}</span>
                  <div className={`toggle-switch ${formData.isActive ? 'active' : ''}`}>
                    {formData.isActive ? <FiToggleRight size={24} /> : <FiToggleLeft size={24} />}
                  </div>
                </div>
                <p className="helper-text">
                  {formData.isActive ? 'Countdown is visible to users' : 'Countdown is hidden from users'}
                </p>
              </div>

              {/* Title */}
              <div className="form-group">
                <label><FiType /> Event Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., CHRISTMAS CELEBRATION"
                  className="form-input"
                />
              </div>

              {/* Subtitle */}
              <div className="form-group">
                <label><FiFlag /> Subtitle</label>
                <input
                  type="text"
                  name="subtitle"
                  value={formData.subtitle}
                  onChange={handleChange}
                  placeholder="e.g., JOIN US FOR THE BIRTHDAY OF JESUS CHRIST"
                  className="form-input"
                />
              </div>

              {/* Target Date */}
              <div className="form-group">
                <label><FiCalendar /> Target Date & Time</label>
                <input
                  type="datetime-local"
                  name="targetDate"
                  value={formData.targetDate}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              {/* Icon Selection */}
              <div className="form-group">
                <label>🎨 Icon</label>
                <div className="icon-grid">
                  {commonIcons.map(icon => (
                    <button
                      key={icon}
                      className={`icon-option ${formData.icon === icon ? 'selected' : ''}`}
                      onClick={() => handleIconSelect(icon)}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div className="form-group">
                <label><FaPlusCircle /> Event Color</label>
                <div className="color-group">
                  <input
                    type="color"
                    name="eventColor"
                    value={formData.eventColor}
                    onChange={handleChange}
                    className="color-picker"
                  />
                  <span className="color-hex">{formData.eventColor}</span>
                  <div className="color-presets">
                    {['#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#ec4899', '#06b6d4', '#f97316'].map(color => (
                      <button
                        key={color}
                        className={`color-preset ${formData.eventColor === color ? 'selected' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData(prev => ({ ...prev, eventColor: color }))}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Current Status */}
            <div className="form-section status-section">
              <h3>📊 Current Status</h3>
              <div className="status-items">
                <div className="status-item">
                  <span className="status-label">Status</span>
                  <span className={`status-value ${formData.isActive ? 'active' : 'inactive'}`}>
                    {formData.isActive ? '🟢 Active' : '🔴 Inactive'}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">Event</span>
                  <span className="status-value">{formData.title || 'Not set'}</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Target Date</span>
                  <span className="status-value">
                    {formData.targetDate ? new Date(formData.targetDate).toLocaleString() : 'Not set'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Live Preview */}
          <div className="countdown-settings-preview">
            <h3>👁️ Live Preview</h3>
            <div className="preview-card">
              <div className="preview-header">
                <span className="preview-icon">{formData.icon || '🎄'}</span>
                <span className="preview-title">{formData.title || 'COUNTDOWN'}</span>
                <span className="preview-icon">{formData.icon || '🎄'}</span>
              </div>
              
              <div className="preview-grid">
                <div className="preview-item">
                  <div className="preview-number" style={{ background: `linear-gradient(135deg, ${formData.eventColor}, ${formData.eventColor}dd)` }}>
                    {String(previewTime.days).padStart(2, '0')}
                  </div>
                  <div className="preview-label">Days</div>
                </div>
                <div className="preview-separator">:</div>
                <div className="preview-item">
                  <div className="preview-number" style={{ background: `linear-gradient(135deg, ${formData.eventColor}, ${formData.eventColor}dd)` }}>
                    {String(previewTime.hours).padStart(2, '0')}
                  </div>
                  <div className="preview-label">Hours</div>
                </div>
                <div className="preview-separator">:</div>
                <div className="preview-item">
                  <div className="preview-number" style={{ background: `linear-gradient(135deg, ${formData.eventColor}, ${formData.eventColor}dd)` }}>
                    {String(previewTime.minutes).padStart(2, '0')}
                  </div>
                  <div className="preview-label">Minutes</div>
                </div>
                <div className="preview-separator">:</div>
                <div className="preview-item">
                  <div className="preview-number" style={{ background: `linear-gradient(135deg, ${formData.eventColor}, ${formData.eventColor}dd)` }}>
                    {String(previewTime.seconds).padStart(2, '0')}
                  </div>
                  <div className="preview-label">Seconds</div>
                </div>
              </div>

              {formData.subtitle && (
                <div className="preview-subtitle">
                  <FaCalendarAlt color={formData.eventColor} />
                  {formData.subtitle}
                </div>
              )}

              <div className="preview-status">
                <span className={`status-dot ${formData.isActive ? 'live' : 'hidden'}`}></span>
                {formData.isActive ? '🔴 Live' : '⚪ Hidden'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .countdown-settings-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
          padding: 24px;
        }

        .countdown-settings-container {
          max-width: 1400px;
          margin: 0 auto;
        }

        .countdown-settings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: white;
          padding: 20px 24px;
          border-radius: 16px;
          margin-bottom: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          flex-wrap: wrap;
          gap: 12px;
        }

        .countdown-settings-header h1 {
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #f1f5f9;
          border: none;
          border-radius: 10px;
          color: #475569;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .back-btn:hover {
          background: #e2e8f0;
        }

        .save-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          background: linear-gradient(135deg, #161618ec, #18171aa1);
          border: none;
          border-radius: 10px;
          color: white;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .save-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinning {
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .countdown-message {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 20px;
          border-radius: 12px;
          margin-bottom: 20px;
          font-weight: 500;
        }

        .countdown-message.success {
          background: #dcfce7;
          color: #16a34a;
          border: 1px solid #bbf7d0;
        }

        .countdown-message.error {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .countdown-settings-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        @media (max-width: 1024px) {
          .countdown-settings-grid {
            grid-template-columns: 1fr;
          }
        }

        .countdown-settings-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .form-section {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .form-section h3 {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 20px 0;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group:last-child {
          margin-bottom: 0;
        }

        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #475569;
          margin-bottom: 6px;
        }

        .form-input {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
          transition: all 0.2s;
          background: #f8fafc;
        }

        .form-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          background: white;
        }

        .toggle-group {
          background: #f8fafc;
          padding: 16px;
          border-radius: 12px;
        }

        .toggle-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          padding: 4px 0;
        }

        .toggle-container span {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
        }

        .toggle-switch {
          display: flex;
          align-items: center;
          color: #94a3b8;
          transition: all 0.3s;
          font-size: 28px;
        }

        .toggle-switch.active {
          color: #3b82f6;
        }

        .helper-text {
          font-size: 12px;
          color: #94a3b8;
          margin-top: 4px;
        }

        .icon-grid {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 8px;
        }

        .icon-option {
          padding: 8px;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          background: white;
          cursor: pointer;
          font-size: 24px;
          transition: all 0.2s;
        }

        .icon-option:hover {
          border-color: #cbd5e1;
          transform: scale(1.05);
        }

        .icon-option.selected {
          border-color: #3b82f6;
          background: #eff6ff;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }

        .color-group {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .color-picker {
          width: 44px;
          height: 44px;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          padding: 2px;
          cursor: pointer;
        }

        .color-hex {
          font-size: 14px;
          font-family: monospace;
          color: #475569;
          background: #f1f5f9;
          padding: 4px 10px;
          border-radius: 6px;
        }

        .color-presets {
          display: flex;
          gap: 6px;
        }

        .color-preset {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          transition: all 0.2s;
        }

        .color-preset:hover {
          transform: scale(1.1);
        }

        .color-preset.selected {
          border-color: #1e293b;
          box-shadow: 0 0 0 2px white, 0 0 0 4px #1e293b;
        }

        .status-section {
          background: #f8fafc;
        }

        .status-items {
          display: grid;
          gap: 12px;
        }

        .status-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: white;
          border-radius: 8px;
        }

        .status-label {
          font-size: 13px;
          color: #64748b;
        }

        .status-value {
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
        }

        .status-value.active {
          color: #22c55e;
        }

        .status-value.inactive {
          color: #ef4444;
        }

        /* Preview */
        .countdown-settings-preview {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .countdown-settings-preview h3 {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 20px 0;
        }

        .preview-card {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          border-radius: 20px;
          padding: 24px;
          text-align: center;
          min-height: 250px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .preview-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 20px;
        }

        .preview-icon {
          font-size: 28px;
        }

        .preview-title {
          font-size: 20px;
          font-weight: 700;
          color: white;
          letter-spacing: 1px;
        }

        .preview-grid {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 16px;
        }

        .preview-item {
          text-align: center;
          min-width: 60px;
        }

        .preview-number {
          font-size: 32px;
          font-weight: 800;
          color: white;
          padding: 8px 16px;
          border-radius: 12px;
          min-width: 60px;
          display: inline-block;
        }

        .preview-label {
          font-size: 10px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-top: 4px;
        }

        .preview-separator {
          font-size: 24px;
          font-weight: 700;
          color: #475569;
          padding-bottom: 20px;
        }

        .preview-subtitle {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 14px;
          color: #94a3b8;
          padding-top: 12px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .preview-status {
          margin-top: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 12px;
          color: #94a3b8;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }

        .status-dot.live {
          background: #22c55e;
          animation: pulse 1.5s infinite;
        }

        .status-dot.hidden {
          background: #64748b;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }

        @media (max-width: 640px) {
          .countdown-settings-header {
            flex-direction: column;
            align-items: stretch;
          }
          
          .icon-grid {
            grid-template-columns: repeat(6, 1fr);
          }
          
          .preview-grid {
            gap: 4px;
          }
          
          .preview-item {
            min-width: 40px;
          }
          
          .preview-number {
            font-size: 24px;
            padding: 4px 10px;
            min-width: 40px;
          }
          
          .preview-separator {
            font-size: 18px;
            padding-bottom: 10px;
          }
        }
      `}</style>
    </div>
  );
}

export default CountdownSettings;