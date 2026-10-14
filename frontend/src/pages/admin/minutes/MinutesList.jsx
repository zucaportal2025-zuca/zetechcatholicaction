import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, Calendar as CalendarIcon, Eye, Edit2, Trash2, Send, Loader } from 'lucide-react';
import { api } from '../../../api';
import io from 'socket.io-client';
import BASE_URL from '../../../api';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaCalculator, FaCalendar,FaClock, FaLocationArrow, FaMapPin, FaUsers } from 'react-icons/fa';

export default function MinutesList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [minutes, setMinutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [selectedMinute, setSelectedMinute] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [toast, setToast] = useState(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  
  // ALWAYS ALLOW EDIT FOR SECRETARY AND ADMIN - NO CONDITIONS
  const canEdit = true; // FORCE TRUE
  
  const currentPath = location.pathname;
  const basePath = currentPath.includes('/secretary') ? '/secretary' : '/admin';

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchMinutes = useCallback(async () => {
    try {
      const response = await api.get('/api/minutes', { headers });
      setMinutes(response.data.minutes || []);
    } catch (error) {
      console.error('Error fetching minutes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMinutes();

    const socket = io(BASE_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true
    });

    socket.on('connect', () => {
      socket.emit('join_minutes_room');
    });

    socket.on('minutes_published', () => {
      fetchMinutes();
      showToast('New minutes published!', 'info');
    });

    socket.on('minutes_updated', () => {
      fetchMinutes();
    });

    socket.on('minutes_deleted', () => {
      fetchMinutes();
    });

    return () => {
      socket.emit('leave_minutes_room');
      socket.disconnect();
    };
  }, [fetchMinutes]);

  const handleDelete = async () => {
    if (!selectedMinute) return;
    setActionLoading(true);
    try {
      await api.delete(`/api/minutes/${selectedMinute.id}`, { headers });
      showToast('Minutes deleted successfully');
      fetchMinutes();
      setShowDeleteConfirm(false);
      setSelectedMinute(null);
    } catch (error) {
      showToast('Failed to delete minutes', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedMinute) return;
    setActionLoading(true);
    try {
      await api.post(`/api/minutes/${selectedMinute.id}/publish`, {}, { headers });
      showToast('Minutes published and notifications sent!');
      fetchMinutes();
      setShowPublishConfirm(false);
      setSelectedMinute(null);
    } catch (error) {
      showToast('Failed to publish minutes', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredMinutes = minutes.filter(m => {
    return m.title?.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (filterType === 'all' || m.type === filterType) &&
      (filterStatus === 'all' || m.status === filterStatus);
  });

  const groupedByDate = filteredMinutes.reduce((groups, minute) => {
    const date = new Date(minute.meetingDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    if (!groups[date]) groups[date] = [];
    groups[date].push(minute);
    return groups;
  }, {});

  const getStatusColor = (status) => {
    switch(status) {
      case 'APPROVED': return { bg: '#dcfce7', color: '#22c55e', text: 'Approved' };
      case 'DRAFT': return { bg: '#fef3c7', color: '#d97706', text: 'Draft' };
      default: return { bg: '#e2e8f0', color: '#64748b', text: status };
    }
  };

  if (loading) {
    return (
      <div className="minutes-container">
        <div className="loading-skeleton">
          <div className="spinner"></div>
          <p>Loading minutes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="minutes-container">
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <div className="page-header">
        <div className="header-left">
          <div className="title-icon">
            <CalendarIcon size={24} />
          </div>
          <div>
            <h1>Meeting Minutes</h1>
            <p className="subtitle">ZUCA meeting minutes management section</p>
          </div>
        </div>
        {/* ALWAYS SHOW NEW MINUTES BUTTON */}
        <button className="btn-primary" onClick={() => navigate(`${basePath}/minutes/create`)}>
          <Plus size={18} /> New Minutes
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">
            <CalendarIcon size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{minutes.length}</span>
            <span className="stat-label">Total Minutes</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon approved">
            <Send size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{minutes.filter(m => m.status === 'APPROVED').length}</span>
            <span className="stat-label">Published</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon draft">
            <Edit2 size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{minutes.filter(m => m.status === 'DRAFT').length}</span>
            <span className="stat-label">Drafts</span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="search-filters">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search minutes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={14} />
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            <option value="EXECUTIVE"> Executive</option>
            <option value="JUMUIA"> Jumuia</option>
          </select>
        </div>
        <div className="filter-group">
          <CalendarIcon size={14} />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="APPROVED"> Approved</option>
            <option value="DRAFT"> Draft</option>
          </select>
        </div>
      </div>

      {/* Minutes List */}
      {filteredMinutes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"></div>
          <h3>No minutes found</h3>
          <p>Create your first meeting minutes from an attendance sheet</p>
          <button className="btn-primary" onClick={() => navigate(`${basePath}/minutes/create`)}>
            Create Minutes
          </button>
        </div>
      ) : (
        <div className="minutes-list">
          {Object.entries(groupedByDate).map(([month, monthMinutes]) => (
            <div key={month} className="month-group">
              <h2 className="month-title">{month}</h2>
              <div className={isMobile ? "cards-mobile" : "cards-grid"}>
                {monthMinutes.map((minute) => {
                  const statusStyle = getStatusColor(minute.status);
                  const isDraft = minute.status === 'DRAFT';
                  return (
                    <div key={minute.id} className="minutes-card">
                      <div className="card-badge">
                        {minute.type === 'EXECUTIVE' ? ' EXECUTIVE' : ' JUMUIA'}
                      </div>
                      <h3>{minute.title}</h3>
                      <div className="card-meta">
                        <span><FaCalendar/> {new Date(minute.meetingDate).toLocaleDateString()}</span>
                        <span>
                           <FaClock /> {minute.meetingTime || '4:30 PM'}</span>
                        <span><FaLocationArrow /> {minute.venue || 'ZUCA'}</span>
                      </div>
                      <div className="card-stats">
                        <span className="stat-present"> <FaUsers/>{minute.presentMembers?.length || 0} Present</span>
                        <span className="stat-absent"><FaUsers /> {minute.absentMembers?.length || 0} Absent</span>
                      </div>
                      <div className="card-footer">
                        <span className="status-badge" style={{ background: statusStyle.bg, color: statusStyle.color }}>
                          {statusStyle.text}
                        </span>
                        <div className="card-actions">
                          {/* View Button */}
                          <button className="icon-btn view" onClick={() => navigate(`${basePath}/minutes/${minute.id}`)}
                            title="View Minutes">
                            <Eye size={16} />
                          </button>
                          
                          {/* Edit Button - ALWAYS SHOW FOR DRAFTS */}
                          {isDraft && (
                            <button className="icon-btn edit" onClick={() => navigate(`${basePath}/minutes/edit/${minute.id}`)}
                              title="Edit Minutes">
                              <Edit2 size={16} />
                            </button>
                          )}
                          
                          {/* Publish Button - ALWAYS SHOW FOR DRAFTS */}
                          {isDraft && (
                            <button className="icon-btn publish"
                              onClick={() => {
                                setSelectedMinute(minute);
                                setShowPublishConfirm(true);
                              }}
                              title="Publish Minutes">
                              <Send size={16} />
                            </button>
                          )}
                          
                          {/* Delete Button - ALWAYS SHOW */}
                          <button className="icon-btn delete"
                            onClick={() => {
                              setSelectedMinute(minute);
                              setShowDeleteConfirm(true);
                            }}
                            title="Delete Minutes">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedMinute && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-confirm" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon">🗑️</div>
            <h3>Delete Minutes</h3>
            <p>Are you sure you want to delete "{selectedMinute.title}"? This action cannot be undone.</p>
            <div className="confirm-buttons">
              <button className="btn-cancel" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="btn-danger" onClick={handleDelete} disabled={actionLoading}>
                {actionLoading ? <Loader size={16} className="spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Confirmation Modal */}
      {showPublishConfirm && selectedMinute && (
        <div className="modal-overlay" onClick={() => setShowPublishConfirm(false)}>
          <div className="modal-confirm" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon">📢</div>
            <h3>Publish Minutes</h3>
            <p>Publish "{selectedMinute.title}"? All attendees will receive notifications.</p>
            <div className="confirm-buttons">
              <button className="btn-cancel" onClick={() => setShowPublishConfirm(false)}>Cancel</button>
              <button className="btn-success" onClick={handlePublish} disabled={actionLoading}>
                {actionLoading ? <Loader size={16} className="spin" /> : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .minutes-container {
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

        .title-icon {
          width: 48px;
          height: 48px;
          background: #eff6ff;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3b82f6;
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

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-icon.total { background: #eff6ff00; color: #000000; }
        .stat-icon.approved { background: #dcfce700; color: #000000; }
        .stat-icon.draft { background: #fef3c700; color: #000000; }

        .stat-value {
          display: block;
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
        }

        .stat-label {
          font-size: 13px;
          color: #64748b;
        }

        .search-filters {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .search-box {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px 16px;
        }

        .search-box input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 14px;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 8px 16px;
        }

        .filter-group select {
          border: none;
          background: none;
          outline: none;
          font-size: 13px;
        }

        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 20px;
        }

        .cards-mobile {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .month-group {
          margin-bottom: 32px;
        }

        .month-title {
          font-size: 18px;
          margin-bottom: 16px;
          color: #64748b;
          border-left: 3px solid #1a1a1a;
          padding-left: 12px;
        }

        .minutes-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          transition: all 0.3s;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        }

        .minutes-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.1);
        }

        .card-badge {
          display: inline-block;
          padding: 4px 12px;
          background: #f1f5f9;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          color: #475569;
          margin-bottom: 12px;
        }

        .minutes-card h3 {
          margin: 0 0 12px;
          font-size: 16px;
          font-weight: 600;
          color: #0f172a;
        }

        .card-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 12px;
          color: #64748b;
        }

        .card-stats {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
          font-size: 13px;
        }

        .stat-present { color: #22c55e; display: flex; align-items: center; gap: 4px; }
        .stat-absent { color: #ef4444; display: flex; align-items: center; gap: 4px; }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 12px;
          border-top: 1px solid #f1f5f9;
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
        }

        .card-actions {
          display: flex;
          gap: 8px;
        }

        /* FORCE BUTTONS TO BE VISIBLE */
        .card-actions button {
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
        }

        .icon-btn {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .icon-btn.view { background: #eff6ff00; color: #000000; }
        .icon-btn.view:hover { background: #dbeafe00; }
        .icon-btn.edit { background: #fef3c700; color: #000000; }
        .icon-btn.edit:hover { background: #fde68a00; }
        .icon-btn.publish { background: #dcfce700; color: #000000; }
        .icon-btn.publish:hover { background: #bbf7d000; }
        .icon-btn.delete { background: #fee2e200; color: #000000; }
        .icon-btn.delete:hover { background: #50303000; }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 20px;
          border: 2px dashed #e2e8f0;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .btn-primary {
          padding: 10px 20px;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }

        .loading-skeleton {
          text-align: center;
          padding: 60px;
        }

        .spinner {
          width: 48px;
          height: 48px;
          margin: 0 auto 16px;
          border: 3px solid #e2e8f0;
          border-top-color: #1a1a1a;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .toast {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 12px 24px;
          border-radius: 12px;
          background: #1a1a1a;
          color: white;
          z-index: 1100;
          font-size: 14px;
        }

        .toast.error { background: #ef4444; }
        .toast.info { background: #3b82f6; }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-confirm {
          background: white;
          border-radius: 20px;
          padding: 24px;
          max-width: 400px;
          width: 90%;
          text-align: center;
        }

        .confirm-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .modal-confirm h3 {
          margin: 0 0 8px;
        }

        .modal-confirm p {
          color: #64748b;
          margin-bottom: 24px;
        }

        .confirm-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .btn-cancel {
          padding: 10px 20px;
          background: #f1f5f9;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }

        .btn-danger {
          padding: 10px 20px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }

        .btn-success {
          padding: 10px 20px;
          background: #22c55e;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .minutes-container { padding: 16px; }
          .stats-grid { grid-template-columns: 1fr; gap: 12px; }
          .search-filters { flex-direction: column; }
          .cards-grid { grid-template-columns: 1fr; }
          .page-header { flex-direction: column; align-items: flex-start; }
          .card-actions { opacity: 1; }
        }
          /* OVERRIDE - Make minutes card actions always visible */
.minutes-card .card-actions {
  opacity: 1 !important;
  visibility: visible !important;
}

.minutes-card .card-actions button {
  opacity: 1 !important;
  visibility: visible !important;
  display: flex !important;
}

/* Also make sure they show without hover */
.minutes-card:hover .card-actions {
  opacity: 1 !important;
}
      `}</style>
    </div>
  );
}