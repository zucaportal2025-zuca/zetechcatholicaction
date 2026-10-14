// pages/Feedback.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Send, X, Upload, AlertCircle, 
  CheckCircle, Star, MessageSquare, Flag, Bug,
  User, Lock, Home,
  File, FileText, Image, FileArchive
} from 'lucide-react';
import logo from '../assets/zuca-logo.png';
import { api } from '../api'; // ✅ IMPORT THE API INSTANCE

const Feedback = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [user, setUser] = useState(null);
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    type: 'FEEDBACK',
    category: '',
    subject: '',
    description: '',
    priority: 'MEDIUM',
    isAnonymous: false
  });

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    setUser(storedUser);
  }, []);

  // Category options based on type
  const getCategories = (type) => {
    const categories = {
      FEEDBACK: ['GENERAL', 'USER_EXPERIENCE', 'CONTENT_QUALITY', 'SPIRITUAL', 'OTHER'],
      COMPLAINT: ['TECHNICAL_ISSUE', 'CONTENT_ERROR', 'MODERATION', 'USER_CONDUCT', 'OTHER'],
      SUGGESTION: ['FEATURE_REQUEST', 'CONTENT_ADDITION', 'IMPROVEMENT', 'NEW_IDEA', 'OTHER'],
      BUG_REPORT: ['UI_ISSUE', 'FUNCTIONALITY', 'PERFORMANCE', 'SECURITY', 'OTHER']
    };
    return categories[type] || [];
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'FEEDBACK': return <MessageSquare size={20} />;
      case 'COMPLAINT': return <Flag size={20} />;
      case 'SUGGESTION': return <Star size={20} />;
      case 'BUG_REPORT': return <Bug size={20} />;
      default: return <MessageSquare size={20} />;
    }
  };

  const getTypeColor = (type) => {
    switch(type) {
      case 'FEEDBACK': return '#3b82f6';
      case 'COMPLAINT': return '#ef4444';
      case 'SUGGESTION': return '#22c55e';
      case 'BUG_REPORT': return '#f59e0b';
      default: return '#3b82f6';
    }
  };

  const getTypeBg = (type) => {
    switch(type) {
      case 'FEEDBACK': return '#eff6ff';
      case 'COMPLAINT': return '#fef2f2';
      case 'SUGGESTION': return '#f0fdf4';
      case 'BUG_REPORT': return '#fffbeb';
      default: return '#eff6ff';
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (name === 'type') {
      setFormData(prev => ({ ...prev, category: '' }));
    }
  };

  // File upload handler
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      setFiles(prev => [...prev, ...selectedFiles]);
    }
    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Trigger file input click
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      setFiles(prev => [...prev, ...droppedFiles]);
    }
  };

  // Get file icon based on type
  const getFileIcon = (file) => {
    const type = file.type;
    if (type.startsWith('image/')) return <Image size={16} />;
    if (type === 'application/pdf') return <FileText size={16} />;
    if (type.includes('word') || type.includes('document')) return <FileText size={16} />;
    if (type.includes('excel') || type.includes('sheet')) return <FileText size={16} />;
    if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return <FileArchive size={16} />;
    return <File size={16} />;
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  // ✅ FIXED: Use the API instance instead of axios directly
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formDataToSend = new FormData();
      
      // Add text fields
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });
      
      // Add files - use 'attachments' as field name
      files.forEach(file => {
        formDataToSend.append('attachments', file);
      });

      // ✅ USE THE API INSTANCE - api handles baseURL and auth automatically
      const response = await api.post('/api/feedback', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/feedback/history');
        }, 3000);
      }
    } catch (err) {
      console.error('Feedback submission error:', err);
      setError(err.response?.data?.error || 'Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !success) {
    return (
      <div className="feedback-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Submitting your feedback...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="feedback-page">
        <div className="success-container">
          <div className="success-card">
            <div className="success-icon">
              <CheckCircle size={64} color="#22c55e" />
            </div>
            <h2>Feedback Submitted! 🎉</h2>
            <p>
              Thank you for your valuable feedback. Our team will review it and take appropriate action.
            </p>
            <div className="success-actions">
              <button onClick={() => navigate('/feedback/history')} className="btn-primary">
                View My Feedback
              </button>
              <button onClick={() => navigate('/dashboard')} className="btn-secondary">
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-page">
     

      {/* Main Content */}
      <div className="feedback-main">
        <div className="feedback-container">
          <div className="page-header">
            <Link to="/dashboard" className="back-link">
              <ArrowLeft size={20} /> Back to Dashboard
            </Link>
            <h2>Give Feedback</h2>
            <p className="subtitle">
              Help us improve ZUCA by sharing your thoughts, suggestions, or reporting issues.
            </p>
          </div>
          <Link to="/feedback/history" className="nav-link">
              <MessageSquare size={16} /> View all My Feedbacks
            </Link>
            

          <div className="feedback-card">
            <form onSubmit={handleSubmit} className="feedback-form">
              {/* Error Message */}
              {error && (
                <div className="error-box">
                  <AlertCircle size={20} />
                  <span>{error}</span>
                  <button onClick={() => setError(null)} className="error-close">✕</button>
                </div>
              )}

              {/* User Info */}
              <div className="user-info">
                <div className="user-avatar">
                  {user?.profileImage ? (
                    <img src={user.profileImage} alt={user?.fullName} />
                  ) : (
                    <span>{user?.fullName?.charAt(0) || 'U'}</span>
                  )}
                </div>
                <div className="user-details">
                  <strong>{user?.fullName}</strong>
                  <span>{user?.email}</span>
                </div>
                <div className="anonymous-toggle">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      name="isAnonymous"
                      checked={formData.isAnonymous}
                      onChange={handleChange}
                    />
                    <span className="toggle-slider"></span>
                    <span className="toggle-text">
                      <Lock size={14} /> Anonymous
                    </span>
                  </label>
                </div>
              </div>

              {/* Type Selection */}
              <div className="form-group">
                <label>Type of Feedback <span className="required">*</span></label>
                <div className="type-grid">
                  {['FEEDBACK', 'COMPLAINT', 'SUGGESTION', 'BUG_REPORT'].map(type => {
                    const isActive = formData.type === type;
                    const color = getTypeColor(type);
                    const bg = getTypeBg(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        className={`type-btn ${isActive ? 'active' : ''}`}
                        style={isActive ? {
                          borderColor: color,
                          background: bg,
                          color: color
                        } : {}}
                        onClick={() => setFormData(prev => ({ ...prev, type, category: '' }))}
                      >
                        {getTypeIcon(type)}
                        <span>{type.replace('_', ' ')}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Two Column Layout */}
              <div className="two-column">
                {/* Category */}
                <div className="form-group">
                  <label>Category <span className="required">*</span></label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="form-select"
                    required
                  >
                    <option value="">Select Category</option>
                    {getCategories(formData.type).map(cat => (
                      <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Subject */}
              <div className="form-group">
                <label>Subject <span className="required">*</span></label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="Brief title of your feedback"
                  className="form-input"
                  required
                  maxLength={255}
                />
              </div>

              {/* Description */}
              <div className="form-group">
                <label>Description <span className="required">*</span></label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Please provide detailed information about your feedback..."
                  className="form-textarea"
                  required
                  rows="6"
                />
              </div>

              {/* File Upload Section */}
              <div className="form-group">
                <label>Attachments</label>
                <div 
                  className={`drop-zone ${dragActive ? 'drag-active' : ''}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={handleUploadClick}
                >
                  <Upload size={32} />
                  <p>Drag & drop files here or click to browse</p>
                  <span>Supports: Images, PDF, Word, Excel, TXT (Max 10MB each)</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="file-input"
                    accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                  />
                </div>

                {/* File List */}
                {files.length > 0 && (
                  <div className="file-list">
                    {files.map((file, index) => (
                      <div key={index} className="file-item">
                        {getFileIcon(file)}
                        <span className="file-name">{file.name}</span>
                        <span className="file-size">{formatFileSize(file.size)}</span>
                        <button 
                          type="button" 
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(index);
                          }}
                          className="remove-file"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="form-actions">
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? (
                    <>
                      <div className="spinner-small"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={18} /> Submit Feedback
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        .feedback-page {
          min-height: 100vh;
          background: #f8fafc;
        }

        /* Header */
        .feedback-header {
          background: white;
          border-bottom: 1px solid #e2e8f0;
          padding: 12px 24px;
          position: sticky;
          top: 0;
          z-index: 100;
          backdrop-filter: blur(8px);
          background: rgba(255,255,255,0.95);
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 2px solid #3b82f6;
        }

        .header-left h1 {
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
        }

        .header-left h1 span {
          color: #3b82f6;
        }

        .header-right {
          display: flex;
          gap: 12px;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #3b82f6;
          text-decoration: none;
          padding: 8px 6px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 12px;
          transition: all 0.2s;
        }

        .nav-link:hover {
          background: #f8fafc;
        }

        /* Main Content */
        .feedback-main {
          max-width: 900px;
          margin: 0 auto;
          padding: 24px;
        }

        .page-header {
          margin-bottom: 24px;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #3b82f6;
          text-decoration: none;
          font-weight: 500;
          font-size: 14px;
          margin-bottom: 12px;
        }

        .back-link:hover {
          text-decoration: underline;
        }

        .page-header h2 {
          font-size: 28px;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 8px 0;
        }

        .subtitle {
          color: #64748b;
          font-size: 16px;
          margin: 0;
        }

        /* Feedback Card */
        .feedback-card {
          background: white;
          border-radius: 20px;
          padding: 32px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }

        /* Form */
        .feedback-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-weight: 600;
          font-size: 14px;
          color: #1e293b;
        }

        .required {
          color: #ef4444;
        }

        .form-input,
        .form-select,
        .form-textarea {
          padding: 12px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
          transition: all 0.2s;
          font-family: inherit;
        }

        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-textarea {
          resize: vertical;
          min-height: 120px;
        }

        .two-column {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        /* Type Grid */
        .type-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }

        .type-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 14px 10px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 12px;
          font-weight: 500;
          color: #64748b;
        }

        .type-btn:hover {
          border-color: #94a3b8;
        }

        .type-btn.active {
          border-color: #3b82f6;
          background: #eff6ff;
          color: #3b82f6;
        }

        .type-btn svg {
          width: 24px;
          height: 24px;
        }

        /* User Info */
        .user-info {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .user-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 20px;
          overflow: hidden;
          flex-shrink: 0;
        }

        .user-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .user-details {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .user-details strong {
          font-size: 14px;
          color: #1e293b;
        }

        .user-details span {
          font-size: 12px;
          color: #64748b;
        }

        .anonymous-toggle {
          flex-shrink: 0;
        }

        .toggle-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 13px;
          color: #64748b;
          position: relative;
        }

        .toggle-label input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: relative;
          width: 40px;
          height: 22px;
          background: #e2e8f0;
          border-radius: 11px;
          transition: all 0.3s;
          flex-shrink: 0;
        }

        .toggle-slider::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 18px;
          height: 18px;
          background: white;
          border-radius: 50%;
          transition: all 0.3s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .toggle-label input:checked + .toggle-slider {
          background: #3b82f6;
        }

        .toggle-label input:checked + .toggle-slider::after {
          transform: translateX(18px);
        }

        .toggle-text {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
        }

        /* Drop Zone */
        .drop-zone {
          border: 2px dashed #e2e8f0;
          border-radius: 12px;
          padding: 32px;
          text-align: center;
          transition: all 0.2s;
          position: relative;
          cursor: pointer;
        }

        .drop-zone:hover {
          border-color: #94a3b8;
          background: #f8fafc;
        }

        .drop-zone.drag-active {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .drop-zone p {
          margin: 8px 0 4px 0;
          font-weight: 500;
          color: #1e293b;
        }

        .drop-zone span {
          font-size: 12px;
          color: #94a3b8;
        }

        .file-input {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }

        /* File List */
        .file-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .file-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          font-size: 13px;
        }

        .file-size {
          font-size: 11px;
          color: #94a3b8;
        }

        .remove-file {
          background: none;
          border: none;
          cursor: pointer;
          color: #94a3b8;
          padding: 0;
          display: flex;
          align-items: center;
        }

        .remove-file:hover {
          color: #ef4444;
        }

        /* Error Box */
        .error-box {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #fef2f2;
          border: 1px solid #fca5a5;
          border-radius: 10px;
          color: #dc2626;
        }

        .error-close {
          background: none;
          border: none;
          cursor: pointer;
          color: #dc2626;
          font-size: 18px;
          margin-left: auto;
        }

        /* Form Actions */
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding-top: 8px;
          border-top: 1px solid #e2e8f0;
        }

        .submit-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 32px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        /* Loading States */
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 50vh;
          gap: 16px;
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 3px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .spinner-small {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Success State */
        .success-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 70vh;
          padding: 24px;
        }

        .success-card {
          background: white;
          padding: 48px;
          border-radius: 24px;
          text-align: center;
          max-width: 500px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 20px 35px -10px rgba(0,0,0,0.1);
        }

        .success-icon {
          margin-bottom: 16px;
        }

        .success-card h2 {
          font-size: 24px;
          color: #1e293b;
          margin: 0 0 12px 0;
        }

        .success-card p {
          color: #64748b;
          font-size: 16px;
          line-height: 1.6;
          margin: 0 0 24px 0;
        }

        .success-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .btn-primary {
          padding: 10px 24px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary:hover {
          background: #2563eb;
        }

        .btn-secondary {
          padding: 10px 24px;
          background: #f1f5f9;
          color: #1e293b;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          background: #e2e8f0;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .feedback-main { padding: 16px; }
          .feedback-card { padding: 20px; }
          .type-grid { grid-template-columns: repeat(2, 1fr); }
          .two-column { grid-template-columns: 1fr; }
          .user-info { flex-wrap: wrap; }
          .anonymous-toggle { width: 100%; justify-content: flex-end; }
          .header-left h1 { font-size: 16px; }
          .nav-link span { display: none; }
          .form-actions { justify-content: center; }
          .submit-btn { width: 100%; justify-content: center; }
          .success-card { padding: 32px 24px; }
        }

        @media (max-width: 480px) {
          .type-grid { grid-template-columns: 1fr 1fr; }
          .header-right { gap: 6px; }
          .nav-link { padding: 6px 10px; font-size: 12px; }
        }
      `}</style>
    </div>
  );
};

export default Feedback;