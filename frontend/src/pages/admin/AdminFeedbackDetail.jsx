// pages/admin/AdminFeedbackDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, MessageSquare, Flag, Star, Bug,
  Clock, CheckCircle, XCircle, AlertCircle,
  Home, Calendar, User, Mail, Phone, FileText,
  Paperclip, Download, ChevronDown, ChevronUp,
  Edit, Save, X, Trash2, Users, RefreshCw
} from 'lucide-react';
import logo from '../../assets/zuca-logo.png';
import { api } from '../../api';

// ==================== SKELETON LOADER ====================
const SkeletonLoader = () => {
  return (
    <div className="detail-skeleton">
      <div className="skeleton-header">
        <div className="skeleton-line shimmer" style={{ width: '60px', height: '20px' }}></div>
        <div className="skeleton-line shimmer" style={{ width: '80%', height: '32px' }}></div>
      </div>
      <div className="skeleton-card">
        <div className="skeleton-line shimmer" style={{ width: '100%', height: '60px' }}></div>
        <div className="skeleton-line shimmer" style={{ width: '100%', height: '40px', marginTop: '12px' }}></div>
        <div className="skeleton-line shimmer" style={{ width: '60%', height: '40px', marginTop: '12px' }}></div>
        <div className="skeleton-line shimmer" style={{ width: '100%', height: '120px', marginTop: '16px' }}></div>
        <div className="skeleton-line shimmer" style={{ width: '100%', height: '60px', marginTop: '16px' }}></div>
        <div className="skeleton-line shimmer" style={{ width: '50%', height: '40px', marginTop: '16px' }}></div>
      </div>
    </div>
  );
};

const AdminFeedbackDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    status: '',
    adminResponse: ''
  });
  const [saving, setSaving] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  useEffect(() => {
    fetchFeedbackDetail();
  }, [id]);

  const fetchFeedbackDetail = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/feedback/admin/${id}`);
      setFeedback(response.data.feedback);
      setEditData({
        status: response.data.feedback.status,
        adminResponse: response.data.feedback.adminResponse || ''
      });
    } catch (err) {
      console.error('Error fetching feedback:', err);
      setError('Failed to load feedback details.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const response = await api.patch(`/api/feedback/admin/${id}`, {
        status: editData.status,
        adminResponse: editData.adminResponse
      });
      setFeedback(response.data.feedback);
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating feedback:', err);
      alert('Failed to update feedback. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this feedback?')) return;
    try {
      await api.delete(`/api/feedback/admin/${id}`);
      navigate('/admin/feedback');
    } catch (err) {
      console.error('Error deleting feedback:', err);
      alert('Failed to delete feedback.');
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'FEEDBACK': return <MessageSquare size={24} />;
      case 'COMPLAINT': return <Flag size={24} />;
      case 'SUGGESTION': return <Star size={24} />;
      case 'BUG_REPORT': return <Bug size={24} />;
      default: return <MessageSquare size={24} />;
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

  const getTypeLabel = (type) => {
    return type?.replace('_', ' ') || 'Feedback';
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      PENDING: { label: 'Pending', color: '#f59e0b', bg: '#fffbeb', icon: <Clock size={16} /> },
      IN_REVIEW: { label: 'In Review', color: '#3b82f6', bg: '#eff6ff', icon: <Clock size={16} /> },
      RESOLVED: { label: 'Resolved', color: '#22c55e', bg: '#f0fdf4', icon: <CheckCircle size={16} /> },
      CLOSED: { label: 'Closed', color: '#64748b', bg: '#f1f5f9', icon: <XCircle size={16} /> },
      REJECTED: { label: 'Rejected', color: '#ef4444', bg: '#fef2f2', icon: <AlertCircle size={16} /> }
    };
    return statusMap[status] || statusMap.PENDING;
  };

  const getPriorityBadge = (priority) => {
    const priorityMap = {
      LOW: { label: 'Low', color: '#22c55e', bg: '#f0fdf4' },
      MEDIUM: { label: 'Medium', color: '#f59e0b', bg: '#fffbeb' },
      HIGH: { label: 'High', color: '#f97316', bg: '#fff7ed' },
      URGENT: { label: 'Urgent', color: '#ef4444', bg: '#fef2f2' }
    };
    return priorityMap[priority] || priorityMap.MEDIUM;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const statusOptions = ['PENDING', 'IN_REVIEW', 'RESOLVED', 'CLOSED', 'REJECTED'];

  if (loading) {
    return (
      <div className="admin-detail-page">
        <header className="detail-header">
          <div className="header-content">
            <div className="header-left">
              <img src={logo} alt="ZUCA Logo" className="logo" />
              <h1>Zetech <span>Catholic</span> Action</h1>
            </div>
            <div className="header-right">
              <Link to="/dashboard" className="nav-link">
                <Home size={16} /> Dashboard
              </Link>
              <Link to="/admin/feedback" className="nav-link">
                <Users size={16} /> Feedback
              </Link>
            </div>
          </div>
        </header>
        <div className="detail-main">
          <SkeletonLoader />
        </div>
      </div>
    );
  }

  if (error || !feedback) {
    return (
      <div className="admin-detail-page">
        <header className="detail-header">
          <div className="header-content">
            <div className="header-left">
              <img src={logo} alt="ZUCA Logo" className="logo" />
              <h1>Zetech <span>Catholic</span> Action</h1>
            </div>
            <div className="header-right">
              <Link to="/dashboard" className="nav-link">
                <Home size={16} /> Dashboard
              </Link>
              <Link to="/admin/feedback" className="nav-link">
                <Users size={16} /> Feedback
              </Link>
            </div>
          </div>
        </header>
        <div className="detail-main">
          <div className="error-container">
            <AlertCircle size={48} color="#ef4444" />
            <h2>Feedback Not Found</h2>
            <p>{error || 'The feedback you are looking for does not exist.'}</p>
            <Link to="/admin/feedback" className="back-btn">
              <ArrowLeft size={16} /> Back to Feedback
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const status = getStatusBadge(feedback.status);
  const priority = getPriorityBadge(feedback.priority);
  const typeColor = getTypeColor(feedback.type);

  return (
    <div className="admin-detail-page">
      {/* Header */}
      <header className="detail-header">
        <div className="header-content">
          <div className="header-left">
            <img src={logo} alt="ZUCA Logo" className="logo" />
            <h1>Zetech <span>Catholic</span> Action</h1>
          </div>
          <div className="header-right">
            <Link to="/dashboard" className="nav-link">
              <Home size={16} /> Dashboard
            </Link>
            <Link to="/admin/feedback" className="nav-link">
              <Users size={16} /> Feedback
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="detail-main">
        <div className="detail-container">
          <div className="page-header">
            <Link to="/admin/feedback" className="back-link">
              <ArrowLeft size={20} /> Back to Feedback
            </Link>
            <div className="page-title-row">
              <h2>Feedback Details</h2>
              <div className="action-buttons">
                <button 
                  className="action-btn delete"
                  onClick={handleDelete}
                  title="Delete"
                >
                  <Trash2 size={18} /> Delete
                </button>
              </div>
            </div>
          </div>

          <div className="detail-card">
            {/* Header Section */}
            <div className="detail-header-section">
              <div className="detail-type-icon" style={{ background: `${typeColor}15`, color: typeColor }}>
                {getTypeIcon(feedback.type)}
              </div>
              <div className="detail-title-section">
                <h2>{feedback.subject}</h2>
                <div className="detail-badges">
                  <span className="type-badge" style={{ color: typeColor, background: `${typeColor}10` }}>
                    {getTypeLabel(feedback.type)}
                  </span>
                  {!isEditing ? (
                    <span className="status-badge" style={{ color: status.color, background: status.bg }}>
                      {status.icon} {status.label}
                    </span>
                  ) : (
                    <div className="status-edit">
                      <select
                        value={editData.status}
                        onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                        className="status-select"
                      >
                        {statusOptions.map(s => {
                          const st = getStatusBadge(s);
                          return (
                            <option key={s} value={s} style={{ color: st.color }}>
                              {st.label}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}
                  <span className="priority-badge" style={{ color: priority.color, background: priority.bg }}>
                    {priority.label} Priority
                  </span>
                  {feedback.isAnonymous && (
                    <span className="anonymous-tag">Anonymous</span>
                  )}
                </div>
              </div>
            </div>

            {/* Meta Info */}
            <div className="detail-meta-grid">
              <div className="meta-item">
                <Calendar size={16} />
                <div>
                  <span className="meta-label">Submitted</span>
                  <span className="meta-value">{formatDate(feedback.createdAt)}</span>
                </div>
              </div>
              <div className="meta-item">
                <Clock size={16} />
                <div>
                  <span className="meta-label">Time</span>
                  <span className="meta-value">{formatTime(feedback.createdAt)}</span>
                </div>
              </div>
              {feedback.updatedAt && feedback.updatedAt !== feedback.createdAt && (
                <div className="meta-item">
                  <Clock size={16} />
                  <div>
                    <span className="meta-label">Last Updated</span>
                    <span className="meta-value">{formatDate(feedback.updatedAt)}</span>
                  </div>
                </div>
              )}
              {feedback.resolvedAt && (
                <div className="meta-item">
                  <CheckCircle size={16} color="#22c55e" />
                  <div>
                    <span className="meta-label">Resolved</span>
                    <span className="meta-value">{formatDate(feedback.resolvedAt)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* User Info */}
            {!feedback.isAnonymous && feedback.user && (
              <div className="user-info-card">
                <div className="user-avatar">
                  {feedback.user.profileImage ? (
                    <img src={feedback.user.profileImage} alt={feedback.user.fullName} />
                  ) : (
                    <span>{getInitials(feedback.user.fullName)}</span>
                  )}
                </div>
                <div className="user-info-details">
                  <strong>{feedback.user.fullName}</strong>
                  <div className="user-contact">
                    <Mail size={14} />
                    <span>{feedback.user.email}</span>
                  </div>
                  {feedback.user.phone && (
                    <div className="user-contact">
                      <Phone size={14} />
                      <span>{feedback.user.phone}</span>
                    </div>
                  )}
                </div>
                <div className="user-role-badge">
                  {feedback.user.role === 'admin' ? 'Admin' : 'Member'}
                </div>
              </div>
            )}

            {feedback.isAnonymous && (
              <div className="anonymous-banner">
                <User size={16} />
                <span>This feedback was submitted anonymously</span>
              </div>
            )}

            {/* Description */}
            <div className="description-section">
              <h3>Description</h3>
              <div className="description-content">
                <p className={!showFullDescription ? 'truncated' : ''}>
                  {feedback.description}
                </p>
                {feedback.description?.length > 300 && (
                  <button 
                    className="read-more-btn"
                    onClick={() => setShowFullDescription(!showFullDescription)}
                  >
                    {showFullDescription ? (
                      <>Show Less <ChevronUp size={16} /></>
                    ) : (
                      <>Read More <ChevronDown size={16} /></>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Admin Response */}
            <div className="admin-response-section">
              <div className="admin-response-header">
                <div className="admin-response-icon">👤</div>
                <div>
                  <h4>Admin Response</h4>
                  {!isEditing ? (
                    <span className="response-date">
                      {feedback.adminResponse ? formatDate(feedback.updatedAt) : 'No response yet'}
                    </span>
                  ) : (
                    <span className="response-date">Editing...</span>
                  )}
                </div>
                <button 
                  className="edit-toggle-btn"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? <X size={16} /> : <Edit size={16} />}
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
              </div>
              {!isEditing ? (
                <div className="admin-response-content">
                  {feedback.adminResponse || 'No admin response yet.'}
                </div>
              ) : (
                <div className="admin-response-edit">
                  <textarea
                    value={editData.adminResponse}
                    onChange={(e) => setEditData({ ...editData, adminResponse: e.target.value })}
                    placeholder="Write your response here..."
                    className="response-textarea"
                    rows="4"
                  />
                  <div className="edit-actions">
                    <button 
                      className="save-btn"
                      onClick={handleUpdate}
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <RefreshCw size={16} className="spin" /> Saving...
                        </>
                      ) : (
                        <>
                          <Save size={16} /> Save Response
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Attachments */}
            {feedback.attachments && feedback.attachments.length > 0 && (
              <div className="attachments-section">
                <h3>
                  <Paperclip size={16} />
                  Attachments ({feedback.attachments.length})
                </h3>
                <div className="attachments-list">
                  {feedback.attachments.map((file, index) => (
                    <a 
                      key={index}
                      href={file.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="attachment-item"
                    >
                      <FileText size={16} />
                      <span>{file.filename}</span>
                      <span className="file-size">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                      <Download size={14} />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="bottom-actions">
              <Link to="/admin/feedback" className="action-btn secondary">
                <ArrowLeft size={16} /> Back to All Feedback
              </Link>
              {!isEditing && (
                <button 
                  className="action-btn primary"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit size={16} /> Edit Response
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .admin-detail-page {
          min-height: 100vh;
          background: #f8fafc;
        }

        .detail-header {
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
          max-width: 1000px;
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
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .nav-link:hover {
          background: #f8fafc;
        }

        .detail-main {
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

        .page-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .page-title-row h2 {
          font-size: 28px;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .action-btn.delete {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #fef2f2;
          color: #ef4444;
          border: 1px solid #fca5a5;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .action-btn.delete:hover {
          background: #fee2e2;
        }

        .detail-card {
          background: white;
          border-radius: 20px;
          padding: 32px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }

        .detail-header-section {
          display: flex;
          gap: 16px;
          align-items: flex-start;
          padding-bottom: 20px;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 20px;
        }

        .detail-type-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .detail-title-section {
          flex: 1;
        }

        .detail-title-section h2 {
          font-size: 22px;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 8px 0;
        }

        .detail-badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }

        .type-badge {
          font-size: 12px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 20px;
        }

        .priority-badge {
          font-size: 12px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 20px;
        }

        .anonymous-tag {
          font-size: 11px;
          font-weight: 600;
          padding: 4px 12px;
          background: #f1f5f9;
          border-radius: 20px;
          color: #64748b;
        }

        .status-edit {
          display: inline-block;
        }

        .status-select {
          padding: 4px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          background: white;
        }

        .detail-meta-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
          padding: 16px 0;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 20px;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .meta-item svg {
          color: #94a3b8;
          flex-shrink: 0;
        }

        .meta-item div {
          display: flex;
          flex-direction: column;
        }

        .meta-label {
          font-size: 11px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .meta-value {
          font-size: 14px;
          font-weight: 500;
          color: #1e293b;
        }

        .user-info-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          margin-bottom: 20px;
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
          font-size: 18px;
          overflow: hidden;
          flex-shrink: 0;
        }

        .user-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .user-info-details {
          flex: 1;
        }

        .user-info-details strong {
          font-size: 15px;
          color: #1e293b;
          display: block;
        }

        .user-contact {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          color: #64748b;
        }

        .user-role-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 4px 12px;
          background: #e2e8f0;
          border-radius: 20px;
          color: #475569;
        }

        .anonymous-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: #f1f5f9;
          border-radius: 10px;
          color: #64748b;
          font-size: 14px;
          margin-bottom: 20px;
        }

        .description-section {
          margin-bottom: 20px;
        }

        .description-section h3 {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 12px 0;
        }

        .description-content {
          background: #f8fafc;
          padding: 16px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .description-content p {
          font-size: 15px;
          line-height: 1.8;
          color: #334155;
          margin: 0;
          white-space: pre-wrap;
        }

        .description-content p.truncated {
          max-height: 150px;
          overflow: hidden;
          position: relative;
        }

        .description-content p.truncated::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 40px;
          background: linear-gradient(transparent, #f8fafc);
        }

        .read-more-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: none;
          border: none;
          color: #3b82f6;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          padding: 8px 0 0 0;
          margin-top: 8px;
        }

        .read-more-btn:hover {
          color: #2563eb;
        }

        .admin-response-section {
          padding: 16px;
          background: #f0fdf4;
          border-radius: 12px;
          border: 1px solid #bbf7d0;
          margin-bottom: 20px;
        }

        .admin-response-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .admin-response-icon {
          font-size: 24px;
        }

        .admin-response-header h4 {
          font-size: 15px;
          font-weight: 600;
          color: #166534;
          margin: 0;
          flex: 1;
        }

        .response-date {
          font-size: 12px;
          color: #64748b;
        }

        .edit-toggle-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 12px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          color: #64748b;
          transition: all 0.2s;
        }

        .edit-toggle-btn:hover {
          background: #f8fafc;
        }

        .admin-response-content {
          font-size: 14px;
          line-height: 1.6;
          color: #1e293b;
          padding-left: 8px;
        }

        .admin-response-edit {
          margin-top: 8px;
        }

        .response-textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
          min-height: 100px;
        }

        .response-textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .edit-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 12px;
        }

        .save-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 20px;
          background: #22c55e;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .save-btn:hover {
          background: #16a34a;
        }

        .save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .attachments-section {
          margin-bottom: 24px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
        }

        .attachments-section h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 15px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 12px 0;
        }

        .attachments-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .attachment-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          text-decoration: none;
          color: #1e293b;
          transition: all 0.2s;
        }

        .attachment-item:hover {
          background: #f1f5f9;
          border-color: #3b82f6;
        }

        .attachment-item .file-size {
          font-size: 12px;
          color: #94a3b8;
          margin-left: auto;
        }

        .attachment-item svg:last-child {
          color: #3b82f6;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .attachment-item:hover svg:last-child {
          opacity: 1;
        }

        .bottom-actions {
          display: flex;
          gap: 12px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          flex-wrap: wrap;
        }

        .action-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 24px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 14px;
          text-decoration: none;
          transition: all 0.2s;
          cursor: pointer;
          border: none;
        }

        .action-btn.primary {
          background: #3b82f6;
          color: white;
        }

        .action-btn.primary:hover {
          background: #2563eb;
        }

        .action-btn.secondary {
          background: #f1f5f9;
          color: #1e293b;
          border: 1px solid #e2e8f0;
        }

        .action-btn.secondary:hover {
          background: #e2e8f0;
        }

        .error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 50vh;
          gap: 16px;
          text-align: center;
        }

        .error-container h2 {
          font-size: 24px;
          color: #1e293b;
          margin: 0;
        }

        .error-container p {
          color: #64748b;
        }

        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 24px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          text-decoration: none;
        }

        .back-btn:hover {
          background: #2563eb;
        }

        /* Skeleton Styles */
        .detail-skeleton {
          max-width: 900px;
          margin: 0 auto;
          padding: 24px;
        }

        .skeleton-header {
          margin-bottom: 24px;
        }

        .skeleton-card {
          background: white;
          border-radius: 20px;
          padding: 32px;
          border: 1px solid #e2e8f0;
        }

        .skeleton-line {
          background: #e2e8f0;
          border-radius: 4px;
        }

        .shimmer {
          background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .detail-main { padding: 16px; }
          .detail-card { padding: 20px; }
          .detail-header-section { flex-direction: column; }
          .detail-meta-grid { grid-template-columns: 1fr 1fr; }
          .user-info-card { flex-wrap: wrap; }
          .header-left h1 { font-size: 16px; }
          .nav-link span { display: none; }
          .page-title-row { flex-direction: column; align-items: stretch; }
          .page-title-row .action-buttons { justify-content: flex-start; }
          .bottom-actions { flex-direction: column; }
          .action-btn { justify-content: center; }
          .admin-response-header { flex-wrap: wrap; }
        }

        @media (max-width: 480px) {
          .detail-meta-grid { grid-template-columns: 1fr; }
          .header-right { gap: 6px; }
          .nav-link { padding: 6px 10px; font-size: 12px; }
          .detail-title-section h2 { font-size: 18px; }
          .detail-badges { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </div>
  );
};

export default AdminFeedbackDetail;