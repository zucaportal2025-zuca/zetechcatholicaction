// pages/FeedbackHistory.jsx - FIXED WITH API INTEGRATION
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, MessageSquare, Flag, Star, Bug,
  ChevronRight, Clock, CheckCircle, XCircle, AlertCircle,
  Home, Search, Eye, Calendar
} from 'lucide-react';
import logo from '../assets/zuca-logo.png';
import { api } from '../api'; // ✅ IMPORT THE API INSTANCE

const FeedbackHistory = () => {
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchFeedbackHistory();
  }, []);

  // ✅ FIXED: Use the API instance instead of axios directly
  const fetchFeedbackHistory = async () => {
  setLoading(true);
  try {
    // ✅ FIXED: Include /api prefix
    const response = await api.get('/api/feedback/my');
    setFeedbacks(response.data.feedbacks || []);
  } catch (err) {
    console.error('Error fetching feedback:', err);
    setError('Failed to load your feedback history.');
  } finally {
    setLoading(false);
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

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getFilteredFeedbacks = () => {
    let filtered = feedbacks;
    
    if (filter !== 'all') {
      filtered = filtered.filter(f => f.status === filter);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(f => 
        f.subject?.toLowerCase().includes(term) ||
        f.description?.toLowerCase().includes(term) ||
        f.type?.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  };

  const getStatusCount = (status) => {
    if (status === 'all') return feedbacks.length;
    return feedbacks.filter(f => f.status === status).length;
  };

  if (loading) {
    return (
      <div className="feedback-history-page">
        {/* Header Skeleton */}
        <header className="history-header skeleton-header">
          <div className="header-content">
            <div className="header-left">
              <div className="skeleton-logo"></div>
              <div className="skeleton-title"></div>
            </div>
            <div className="header-right">
              <div className="skeleton-btn"></div>
              <div className="skeleton-btn"></div>
            </div>
          </div>
        </header>

        <div className="history-main">
          <div className="history-container">
            {/* Page Header Skeleton */}
            <div className="page-header">
              <div className="skeleton-back-link"></div>
              <div className="page-title-row">
                <div className="skeleton-page-title"></div>
                <div className="skeleton-count"></div>
              </div>
            </div>

            {/* Stats Skeleton */}
            <div className="stats-row">
              <div className="skeleton-stat-card"></div>
              <div className="skeleton-stat-card"></div>
              <div className="skeleton-stat-card"></div>
              <div className="skeleton-stat-card"></div>
            </div>

            {/* Filter Bar Skeleton */}
            <div className="filter-bar">
              <div className="skeleton-search"></div>
              <div className="filter-buttons">
                <div className="skeleton-filter-btn"></div>
                <div className="skeleton-filter-btn"></div>
                <div className="skeleton-filter-btn"></div>
                <div className="skeleton-filter-btn"></div>
              </div>
            </div>

            {/* Feedback List Skeleton */}
            <div className="feedback-list">
              <div className="skeleton-feedback-item"></div>
              <div className="skeleton-feedback-item"></div>
              <div className="skeleton-feedback-item"></div>
              <div className="skeleton-feedback-item"></div>
              <div className="skeleton-feedback-item"></div>
            </div>
          </div>
        </div>

        <style>{`
          /* Skeleton Loading Styles */
          .skeleton-header {
            background: white !important;
            border-bottom: 1px solid #e2e8f0;
            padding: 12px 24px;
          }

          .skeleton-logo {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-title {
            width: 150px;
            height: 24px;
            border-radius: 6px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-btn {
            width: 80px;
            height: 36px;
            border-radius: 8px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-back-link {
            width: 120px;
            height: 20px;
            border-radius: 4px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            margin-bottom: 12px;
          }

          .skeleton-page-title {
            width: 200px;
            height: 32px;
            border-radius: 6px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-count {
            width: 60px;
            height: 24px;
            border-radius: 20px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-stat-card {
            height: 80px;
            border-radius: 12px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-search {
            flex: 1;
            min-width: 200px;
            height: 44px;
            border-radius: 10px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-filter-btn {
            width: 80px;
            height: 36px;
            border-radius: 8px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-feedback-item {
            height: 100px;
            border-radius: 12px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
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

          /* Keep existing loading styles as fallback */
          .loading-container {
            display: none;
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="feedback-history-page">
        <div className="error-container">
          <AlertCircle size={48} color="#ef4444" />
          <h2>Error Loading Feedback</h2>
          <p>{error}</p>
          <button onClick={fetchFeedbackHistory} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-history-page">
   

      {/* Main Content */}
      <div className="history-main">
        <div className="history-container">
          <div className="page-header">
            <Link to="/dashboard" className="back-link">
              <ArrowLeft size={20} /> Back to Dashboard
            </Link>

            <Link to="/feedback" className="nav-link primary">
              <MessageSquare size={16} /> New Feedback
            </Link>
            <div className="page-title-row">
              <h2>My Feedback History</h2>
              <span className="total-count">{feedbacks.length} submissions</span>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="stats-row">
            <div className="stat-card" onClick={() => setFilter('all')}>
              <span className="stat-value">{feedbacks.length}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-card pending" onClick={() => setFilter('PENDING')}>
              <span className="stat-value">{getStatusCount('PENDING')}</span>
              <span className="stat-label">Pending</span>
            </div>
            <div className="stat-card in-review" onClick={() => setFilter('IN_REVIEW')}>
              <span className="stat-value">{getStatusCount('IN_REVIEW')}</span>
              <span className="stat-label">In Review</span>
            </div>
            <div className="stat-card resolved" onClick={() => setFilter('RESOLVED')}>
              <span className="stat-value">{getStatusCount('RESOLVED')}</span>
              <span className="stat-label">Resolved</span>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="filter-bar">
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search feedback..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="filter-buttons">
              <button 
                className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All ({getStatusCount('all')})
              </button>
              <button 
                className={`filter-btn pending ${filter === 'PENDING' ? 'active' : ''}`}
                onClick={() => setFilter('PENDING')}
              >
                Pending ({getStatusCount('PENDING')})
              </button>
              <button 
                className={`filter-btn in-review ${filter === 'IN_REVIEW' ? 'active' : ''}`}
                onClick={() => setFilter('IN_REVIEW')}
              >
                In Review ({getStatusCount('IN_REVIEW')})
              </button>
              <button 
                className={`filter-btn resolved ${filter === 'RESOLVED' ? 'active' : ''}`}
                onClick={() => setFilter('RESOLVED')}
              >
                Resolved ({getStatusCount('RESOLVED')})
              </button>
            </div>
          </div>

          {/* Feedback List */}
          {getFilteredFeedbacks().length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>No feedback found</h3>
              <p>
                {feedbacks.length === 0 
                  ? "You haven't submitted any feedback yet."
                  : "No feedback matches your current filters."}
              </p>
              <Link to="/feedback" className="empty-btn">
                <MessageSquare size={16} /> Submit Feedback
              </Link>
            </div>
          ) : (
            <div className="feedback-list">
              {getFilteredFeedbacks().map((feedback) => {
                const status = getStatusBadge(feedback.status);
                const priority = getPriorityBadge(feedback.priority);
                const typeColor = getTypeColor(feedback.type);
                
                return (
                  <div 
                    key={feedback.id} 
                    className="feedback-item"
                    onClick={() => navigate(`/feedback/${feedback.id}`)}
                  >
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
                            <Clock size={12} />
                            {formatTime(feedback.createdAt)}
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
                      <span 
                        className="status-badge"
                        style={{ 
                          color: status.color,
                          background: status.bg
                        }}
                      >
                        {status.icon}
                        {status.label}
                      </span>
                      <ChevronRight size={18} className="arrow-icon" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .feedback-history-page {
          min-height: 100vh;
          background: #f8fafc;
        }

        /* Header */
        .history-header {
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
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          font-size: 14px;
          font-weight: 500;
          margin-Bottom: 20px;
          transition: all 0.2s;
        }

        .nav-link:hover {
          background: #f8fafc;
        }

        .nav-link.primary {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .nav-link.primary:hover {
          background: #2563eb;
        }

        /* Main Content */
        .history-main {
          max-width: 1000px;
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

        .total-count {
          font-size: 14px;
          color: #64748b;
          background: #f1f5f9;
          padding: 4px 12px;
          border-radius: 20px;
        }

        /* Stats Row */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: white;
          padding: 16px;
          border-radius: 12px;
          text-align: center;
          border: 1px solid #e2e8f0;
          cursor: pointer;
          transition: all 0.2s;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
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
        .stat-card.in-review .stat-value { color: #3b82f6; }
        .stat-card.resolved .stat-value { color: #22c55e; }

        /* Filter Bar */
        .filter-bar {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
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
        }

        .search-box input {
          flex: 1;
          padding: 10px 0;
          border: none;
          outline: none;
          font-size: 14px;
          background: transparent;
        }

        .filter-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .filter-btn {
          padding: 8px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          color: #64748b;
          transition: all 0.2s;
        }

        .filter-btn:hover {
          background: #f8fafc;
        }

        .filter-btn.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .filter-btn.pending.active { background: #f59e0b; border-color: #f59e0b; }
        .filter-btn.in-review.active { background: #3b82f6; border-color: #3b82f6; }
        .filter-btn.resolved.active { background: #22c55e; border-color: #22c55e; }

        /* Empty State */
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
          margin: 0 0 20px 0;
        }

        .empty-btn {
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
          transition: all 0.2s;
        }

        .empty-btn:hover {
          background: #2563eb;
        }

        /* Feedback List */
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
          cursor: pointer;
          transition: all 0.2s;
        }

        .feedback-item:hover {
          transform: translateX(4px);
          border-color: #3b82f6;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .feedback-item-left {
          display: flex;
          gap: 16px;
          align-items: flex-start;
          flex: 1;
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
        }

        .feedback-header {
          display: flex;
          align-items: center;
          gap: 10px;
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

        .feedback-description {
          font-size: 13px;
          color: #64748b;
          margin: 4px 0 8px 0;
          line-height: 1.4;
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

        .arrow-icon {
          color: #94a3b8;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .feedback-item:hover .arrow-icon {
          opacity: 1;
        }

        /* Loading */
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

        /* Error */
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

        .retry-btn {
          padding: 10px 24px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .retry-btn:hover {
          background: #2563eb;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .history-main { padding: 16px; }
          .stats-row { grid-template-columns: repeat(2, 1fr); }
          .filter-bar { flex-direction: column; }
          .filter-buttons { flex-wrap: wrap; }
          .feedback-item { flex-direction: column; align-items: stretch; gap: 12px; }
          .feedback-item-right { justify-content: space-between; }
          .header-left h1 { font-size: 16px; }
          .nav-link span { display: none; }
          .page-title-row h2 { font-size: 22px; }
        }

        @media (max-width: 480px) {
          .stats-row { grid-template-columns: 1fr 1fr; }
          .feedback-item-left { flex-direction: column; align-items: flex-start; }
          .feedback-header { flex-wrap: wrap; }
          .header-right { gap: 6px; }
          .nav-link { padding: 6px 10px; font-size: 12px; }
        }
      `}</style>
    </div>
  );
};

export default FeedbackHistory;