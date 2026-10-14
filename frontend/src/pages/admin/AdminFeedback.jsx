// pages/admin/AdminFeedback.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, MessageSquare, Flag, Star, Bug,
  Clock, CheckCircle, XCircle, AlertCircle,
  Home, Search, Eye, Calendar, Users,
  RefreshCw, Trash2, ChevronDown, ChevronUp,
  Filter, X, BarChart3, TrendingUp, TrendingDown
} from 'lucide-react';
import logo from '../../assets/zuca-logo.png';
import { api } from '../../api';

// Skeleton Loader Component
const SkeletonLoader = () => {
  return (
    <div className="skeleton-container">
      {/* Stats Skeleton */}
      <div className="stats-grid">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="stat-card skeleton">
            <div className="skeleton-line shimmer" style={{ width: '40px', height: '28px', margin: '0 auto' }}></div>
            <div className="skeleton-line shimmer" style={{ width: '60px', height: '12px', margin: '4px auto 0' }}></div>
          </div>
        ))}
      </div>

      {/* Filter Bar Skeleton */}
      <div className="filter-bar">
        <div className="search-box skeleton">
          <div className="skeleton-line shimmer" style={{ width: '100%', height: '20px' }}></div>
        </div>
        <div className="skeleton-line shimmer" style={{ width: '120px', height: '40px', borderRadius: '10px' }}></div>
      </div>

      {/* Feedback List Skeleton */}
      <div className="feedback-list">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="feedback-item skeleton">
            <div className="feedback-item-left">
              <div className="skeleton-circle shimmer" style={{ width: '40px', height: '40px', borderRadius: '10px' }}></div>
              <div className="feedback-content">
                <div className="feedback-header">
                  <div className="skeleton-line shimmer" style={{ width: '200px', height: '20px' }}></div>
                  <div className="skeleton-line shimmer" style={{ width: '80px', height: '16px', borderRadius: '12px' }}></div>
                </div>
                <div className="skeleton-line shimmer" style={{ width: '80%', height: '14px', margin: '4px 0' }}></div>
                <div className="skeleton-line shimmer" style={{ width: '60%', height: '14px' }}></div>
                <div className="feedback-meta">
                  <div className="skeleton-line shimmer" style={{ width: '80px', height: '12px' }}></div>
                  <div className="skeleton-line shimmer" style={{ width: '80px', height: '12px' }}></div>
                </div>
              </div>
            </div>
            <div className="feedback-item-right">
              <div className="skeleton-line shimmer" style={{ width: '80px', height: '24px', borderRadius: '20px' }}></div>
              <div className="action-buttons">
                <div className="skeleton-circle shimmer" style={{ width: '32px', height: '32px', borderRadius: '6px' }}></div>
                <div className="skeleton-circle shimmer" style={{ width: '32px', height: '32px', borderRadius: '6px' }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminFeedback = () => {
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState('all');

  useEffect(() => {
    fetchAllFeedback();
  }, [statusFilter, selectedType]);

  const fetchAllFeedback = async () => {
    setLoading(true);
    try {
      let url = '/api/feedback/admin';
      const params = new URLSearchParams();
      
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (selectedType !== 'all') params.append('type', selectedType);
      if (searchTerm) params.append('search', searchTerm);
      
      if (params.toString()) url += '?' + params.toString();
      
      const response = await api.get(url);
      setFeedbacks(response.data.feedbacks || []);
      setStats(response.data.stats);
    } catch (err) {
      console.error('Error fetching feedback:', err);
      setError('Failed to load feedback.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await api.patch(`/api/feedback/admin/${id}`, {
        status: newStatus,
        adminResponse: ''
      });
      fetchAllFeedback();
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this feedback?')) return;
    try {
      await api.delete(`/api/feedback/admin/${id}`);
      fetchAllFeedback();
    } catch (err) {
      console.error('Error deleting feedback:', err);
    }
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      fetchAllFeedback();
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'FEEDBACK': return <MessageSquare size={18} />;
      case 'COMPLAINT': return <Flag size={18} />;
      case 'SUGGESTION': return <Star size={18} />;
      case 'BUG_REPORT': return <Bug size={18} />;
      default: return <MessageSquare size={18} />;
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
      PENDING: { label: 'Pending', color: '#f59e0b', bg: '#fffbeb', icon: <Clock size={14} /> },
      IN_REVIEW: { label: 'In Review', color: '#3b82f6', bg: '#eff6ff', icon: <Clock size={14} /> },
      RESOLVED: { label: 'Resolved', color: '#22c55e', bg: '#f0fdf4', icon: <CheckCircle size={14} /> },
      CLOSED: { label: 'Closed', color: '#64748b', bg: '#f1f5f9', icon: <XCircle size={14} /> },
      REJECTED: { label: 'Rejected', color: '#ef4444', bg: '#fef2f2', icon: <AlertCircle size={14} /> }
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
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getStatusCount = (status) => {
    if (!stats) return 0;
    if (status === 'all') return stats.total;
    const map = {
      'PENDING': stats.pending,
      'IN_REVIEW': stats.inReview,
      'RESOLVED': stats.resolved,
      'CLOSED': stats.closed,
      'REJECTED': stats.rejected
    };
    return map[status] || 0;
  };

  return (
    <div className="admin-feedback-page">
      {/* Header */}
      <header className="admin-header">
        <div className="header-content">
          <div className="header-left">
            <img src={logo} alt="ZUCA Logo" className="logo" />
            <h1>Zetech <span>Catholic</span> Action</h1>
          </div>
          <div className="header-right">
            <Link to="/dashboard" className="nav-link">
              <Home size={16} /> Dashboard
            </Link>
            <Link to="/admin" className="nav-link">
              <Users size={16} /> Admin Panel
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="admin-main">
        <div className="admin-container">
          <div className="page-header">
            <Link to="/admin" className="back-link">
              <ArrowLeft size={20} /> Back to Admin
            </Link>
            <div className="page-title-row">
              <h2>Feedback Management</h2>
              <button onClick={fetchAllFeedback} className="refresh-btn" disabled={loading}>
                <RefreshCw size={16} className={loading ? 'spin' : ''} /> 
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {loading ? (
            <SkeletonLoader />
          ) : error ? (
            <div className="error-state">
              <AlertCircle size={48} color="#ef4444" />
              <h3>Error Loading Feedback</h3>
              <p>{error}</p>
              <button onClick={fetchAllFeedback} className="retry-btn">Try Again</button>
            </div>
          ) : (
            <>
              {/* Stats Summary */}
              {stats && (
                <div className="stats-grid">
                  <div 
                    className={`stat-card ${statusFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('all')}
                  >
                    <span className="stat-value">{stats.total}</span>
                    <span className="stat-label">Total</span>
                  </div>
                  <div 
                    className={`stat-card pending ${statusFilter === 'PENDING' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('PENDING')}
                  >
                    <span className="stat-value">{stats.pending}</span>
                    <span className="stat-label">Pending</span>
                  </div>
                  <div 
                    className={`stat-card in-review ${statusFilter === 'IN_REVIEW' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('IN_REVIEW')}
                  >
                    <span className="stat-value">{stats.inReview}</span>
                    <span className="stat-label">In Review</span>
                  </div>
                  <div 
                    className={`stat-card resolved ${statusFilter === 'RESOLVED' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('RESOLVED')}
                  >
                    <span className="stat-value">{stats.resolved}</span>
                    <span className="stat-label">Resolved</span>
                  </div>
                  <div 
                    className={`stat-card closed ${statusFilter === 'CLOSED' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('CLOSED')}
                  >
                    <span className="stat-value">{stats.closed}</span>
                    <span className="stat-label">Closed</span>
                  </div>
                  <div 
                    className={`stat-card rejected ${statusFilter === 'REJECTED' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('REJECTED')}
                  >
                    <span className="stat-value">{stats.rejected}</span>
                    <span className="stat-label">Rejected</span>
                  </div>
                </div>
              )}

              {/* Filter Bar */}
              <div className="filter-bar">
                <div className="search-box">
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Search feedback..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={handleSearch}
                  />
                  {searchTerm && (
                    <button 
                      className="clear-search"
                      onClick={() => {
                        setSearchTerm('');
                        fetchAllFeedback();
                      }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <button 
                  className={`filter-toggle ${showFilters ? 'active' : ''}`}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter size={16} /> 
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                  {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {/* Expandable Filters */}
              {showFilters && (
                <div className="expandable-filters">
                  <div className="filter-section">
                    <span className="filter-label">Type:</span>
                    <div className="type-filters">
                      <button 
                        className={`type-filter-btn ${selectedType === 'all' ? 'active' : ''}`}
                        onClick={() => setSelectedType('all')}
                      >
                        All
                      </button>
                      <button 
                        className={`type-filter-btn feedback ${selectedType === 'FEEDBACK' ? 'active' : ''}`}
                        onClick={() => setSelectedType('FEEDBACK')}
                      >
                        <MessageSquare size={14} /> Feedback
                      </button>
                      <button 
                        className={`type-filter-btn complaint ${selectedType === 'COMPLAINT' ? 'active' : ''}`}
                        onClick={() => setSelectedType('COMPLAINT')}
                      >
                        <Flag size={14} /> Complaint
                      </button>
                      <button 
                        className={`type-filter-btn suggestion ${selectedType === 'SUGGESTION' ? 'active' : ''}`}
                        onClick={() => setSelectedType('SUGGESTION')}
                      >
                        <Star size={14} /> Suggestion
                      </button>
                      <button 
                        className={`type-filter-btn bug ${selectedType === 'BUG_REPORT' ? 'active' : ''}`}
                        onClick={() => setSelectedType('BUG_REPORT')}
                      >
                        <Bug size={14} /> Bug Report
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Feedback List */}
              {feedbacks.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <h3>No feedback found</h3>
                  <p>There are no feedback submissions matching your filters.</p>
                </div>
              ) : (
                <div className="feedback-list">
                  {feedbacks.map((feedback) => {
                    const status = getStatusBadge(feedback.status);
                    const priority = getPriorityBadge(feedback.priority);
                    const typeColor = getTypeColor(feedback.type);
                    
                    return (
                      <div key={feedback.id} className="feedback-item">
                        <div className="feedback-item-left">
                          <div 
                            className="feedback-type-icon"
                            style={{ background: `${typeColor}15`, color: typeColor }}
                          >
                            {getTypeIcon(feedback.type)}
                          </div>
                          <div className="feedback-content">
                            <div className="feedback-header">
                              <h4>{feedback.subject}</h4>
                              <span className="feedback-type" style={{ color: typeColor }}>
                                {getTypeLabel(feedback.type)}
                              </span>
                              {feedback.isAnonymous && (
                                <span className="anonymous-tag">Anonymous</span>
                              )}
                            </div>
                            <p className="feedback-description">
                              {feedback.description?.substring(0, 100)}
                              {feedback.description?.length > 100 ? '...' : ''}
                            </p>
                            <div className="feedback-meta">
  <span className="meta-item">
    <Calendar size={12} />
    {formatDate(feedback.createdAt)}
  </span>
  <span className="meta-item">
    <Users size={12} />
    {feedback.isAnonymous ? 'Anonymous' : (feedback.user?.fullName || 'Unknown')}
  </span>
  <span 
    className="priority-badge"
    style={{ 
      color: priority.color,
      background: priority.bg
    }}
  >
    {priority.label}
  </span>
</div>
                          </div>
                        </div>
                       <div className="feedback-item-right">
  {/* ✅ STATUS DROPDOWN - REPLACES THE STATUS BADGE */}
  <select
    value={feedback.status}
    onChange={(e) => handleStatusUpdate(feedback.id, e.target.value)}
    className="status-select-small"
    style={{
      color: getStatusBadge(feedback.status).color,
      background: getStatusBadge(feedback.status).bg,
      borderColor: getStatusBadge(feedback.status).color
    }}
  >
    <option value="PENDING">📋 Pending</option>
    <option value="IN_REVIEW">🔍 In Review</option>
    <option value="RESOLVED">✅ Resolved</option>
    <option value="CLOSED">📌 Closed</option>
    <option value="REJECTED">❌ Rejected</option>
  </select>
  
  <div className="action-buttons">
    <button 
      className="action-btn view"
      onClick={() => navigate(`/admin/feedback/${feedback.id}`)}
      title="View Details"
    >
      <Eye size={16} />
    </button>
    <button 
      className="action-btn delete"
      onClick={() => handleDelete(feedback.id)}
      title="Delete"
    >
      <Trash2 size={16} />
    </button>
  </div>
</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        .admin-feedback-page {
          min-height: 100vh;
          background: #f8fafc;
        }

        .admin-header {
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
          max-width: 1400px;
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

        .admin-main {
          max-width: 1400px;
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

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .refresh-btn:hover {
          background: #f8fafc;
        }

        .refresh-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: white;
          padding: 16px;
          border-radius: 12px;
          text-align: center;
          border: 2px solid transparent;
          cursor: pointer;
          transition: all 0.2s;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .stat-card.active {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .stat-card .stat-value {
          font-size: 24px;
          font-weight: 700;
          display: block;
          color: #1e293b;
        }

        .stat-card .stat-label {
          font-size: 12px;
          color: #64748b;
          margin-top: 4px;
        }

        .stat-card.pending .stat-value { color: #f59e0b; }
        .stat-card.pending.active { border-color: #f59e0b; background: #fffbeb; }
        .stat-card.in-review .stat-value { color: #3b82f6; }
        .stat-card.in-review.active { border-color: #3b82f6; background: #eff6ff; }
        .stat-card.resolved .stat-value { color: #22c55e; }
        .stat-card.resolved.active { border-color: #22c55e; background: #f0fdf4; }
        .stat-card.closed .stat-value { color: #64748b; }
        .stat-card.closed.active { border-color: #64748b; background: #f1f5f9; }
        .stat-card.rejected .stat-value { color: #ef4444; }
        .stat-card.rejected.active { border-color: #ef4444; background: #fef2f2; }

        .filter-bar {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }

        .search-box {
          flex: 1;
          min-width: 200px;
          display: flex;
          align-items: center;
          gap: 10px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 0 14px;
          position: relative;
        }

        .search-box input {
          flex: 1;
          padding: 10px 0;
          border: none;
          outline: none;
          font-size: 14px;
          background: transparent;
        }

        .clear-search {
          background: none;
          border: none;
          cursor: pointer;
          color: #94a3b8;
          padding: 4px;
        }

        .clear-search:hover {
          color: #64748b;
        }

        .filter-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #64748b;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .filter-toggle:hover {
          background: #f8fafc;
        }

        .filter-toggle.active {
          border-color: #3b82f6;
          color: #3b82f6;
          background: #eff6ff;
        }

        .expandable-filters {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 16px;
        }

        .filter-section {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .filter-label {
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
        }

        .type-filters {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .type-filter-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          color: #64748b;
          transition: all 0.2s;
        }

        .type-filter-btn:hover {
          background: #f8fafc;
        }

        .type-filter-btn.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .type-filter-btn.feedback.active { background: #3b82f6; border-color: #3b82f6; }
        .type-filter-btn.complaint.active { background: #ef4444; border-color: #ef4444; }
        .type-filter-btn.suggestion.active { background: #22c55e; border-color: #22c55e; }
        .type-filter-btn.bug.active { background: #f59e0b; border-color: #f59e0b; }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .empty-state h3 {
          font-size: 20px;
          color: #1e293b;
          margin: 0 0 8px 0;
        }

        .empty-state p {
          color: #64748b;
          margin: 0;
        }

        .error-state {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
        }

        .error-state h3 {
          font-size: 20px;
          color: #1e293b;
          margin: 12px 0 8px 0;
        }

        .error-state p {
          color: #64748b;
          margin-bottom: 16px;
        }

        .retry-btn {
          padding: 10px 24px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }

        .retry-btn:hover {
          background: #2563eb;
        }

        .feedback-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .feedback-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          transition: all 0.2s;
        }

        .action-btn.delete:hover {
  color: #ef4444;
  background: #fef2f2;
}

        .feedback-item:hover {
          border-color: #3b82f6;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .feedback-item-left {
          display: flex;
          gap: 16px;
          align-items: flex-start;
          flex: 1;
          min-width: 0;
        }

        .feedback-type-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .feedback-content {
          flex: 1;
          min-width: 0;
        }

        .feedback-header {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .feedback-header h4 {
          font-size: 15px;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }

        .feedback-type {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .anonymous-tag {
          font-size: 10px;
          font-weight: 600;
          padding: 2px 8px;
          background: #f1f5f9;
          border-radius: 12px;
          color: #64748b;
        }

        .feedback-description {
          font-size: 13px;
          color: #64748b;
          margin: 4px 0 8px 0;
          line-height: 1.4;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .feedback-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #94a3b8;
        }

        .priority-badge {
          font-size: 10px;
          font-weight: 600;
          padding: 2px 10px;
          border-radius: 12px;
          text-transform: uppercase;
        }

        .feedback-item-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 20px;
          white-space: nowrap;
        }

        .action-buttons {
          display: flex;
          gap: 4px;
        }

        .action-btn {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          background: transparent;
          color: #64748b;
        }

        .action-btn:hover {
          background: #f1f5f9;
        }

        .action-btn.view:hover {
          color: #3b82f6;
          background: #eff6ff;
        }

        .action-btn.delete:hover {
          color: #ef4444;
          background: #fef2f2;
        }

        /* Skeleton Styles */
        .skeleton-container {
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .skeleton-line {
          background: #e2e8f0;
          border-radius: 4px;
        }

        .skeleton-circle {
          background: #e2e8f0;
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

        .stat-card.skeleton {
          cursor: default;
        }

        .stat-card.skeleton:hover {
          transform: none;
          box-shadow: none;
        }

        .feedback-item.skeleton {
          cursor: default;
        }

        .feedback-item.skeleton:hover {
          border-color: #e2e8f0;
          box-shadow: none;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 768px) {
          .admin-main { padding: 16px; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .feedback-item { flex-direction: column; align-items: stretch; gap: 12px; }
          .feedback-item-right { justify-content: space-between; }
          .filter-bar { flex-direction: column; }
          .header-left h1 { font-size: 16px; }
          .nav-link span { display: none; }
          .filter-section { flex-direction: column; align-items: stretch; }
          .type-filters { justify-content: center; }
        }

        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: 1fr 1fr; }
          .header-right { gap: 6px; }
          .nav-link { padding: 6px 10px; font-size: 12px; }
          .feedback-item-left { flex-direction: column; align-items: flex-start; }
          .page-title-row { flex-direction: column; align-items: stretch; }
          .refresh-btn { justify-content: center; }
        }
      `}</style>
    </div>
  );
};

export default AdminFeedback;