import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiFileText, FiCalendar, FiClock, FiMapPin, FiUsers, 
  FiSearch, FiChevronRight, FiLock
} from 'react-icons/fi';
import { FaCalendarAlt, FaFileAlt, FaUserAlt, FaUserCircle, FaUserTie } from 'react-icons/fa';
import axios from 'axios';
import logo from "../assets/zuca-logo.png"
import BASE_URL from '../api';

export default function ExecutiveMinutes() {
  const navigate = useNavigate();
  const [minutes, setMinutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [stats, setStats] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${BASE_URL}/api/executive/minutes`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setHasAccess(true);
        setMinutes(response.data.minutes || []);
        fetchStats();
      }
    } catch (error) {
      if (error.response?.status === 403) {
        setHasAccess(false);
      } else {
        console.error('Error fetching minutes:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BASE_URL}/api/executive/minutes/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getTypeBadge = (type) => {
    if (type === 'EXECUTIVE') {
      return <span className="badge executive"><FaUserCircle></FaUserCircle> Executive</span>;
    }
    return <span className="badge jumuia"> Jumuia</span>;
  };

  const getStatusBadge = (status) => {
    if (status === 'PUBLISHED' || status === 'APPROVED') {
      return <span className="badge published">Published</span>;
    }
    if (status === 'DRAFT') {
      return <span className="badge draft"> Draft</span>;
    }
    return <span className="badge pending"> Pending</span>;
  };

  const filteredMinutes = minutes.filter(m => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const titleMatch = m.title?.toLowerCase().includes(search);
      const venueMatch = m.venue?.toLowerCase().includes(search);
      if (!titleMatch && !venueMatch) return false;
    }
    if (filterType !== 'all' && m.type?.toLowerCase() !== filterType) return false;
    if (filterStatus !== 'all') {
      const status = m.status?.toLowerCase() || 'draft';
      if (status !== filterStatus) return false;
    }
    return true;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // ============ SKELETON LOADING ============
  const SkeletonLoader = () => (
    <div className="skeleton-wrapper">
      <div className="skeleton-header">
        <div className="skeleton-title"></div>
        <div className="skeleton-stats">
          <div className="skeleton-stat"></div>
          <div className="skeleton-stat"></div>
          <div className="skeleton-stat"></div>
        </div>
      </div>
      <div className="skeleton-filters">
        <div className="skeleton-search"></div>
        <div className="skeleton-filter"></div>
        <div className="skeleton-filter"></div>
      </div>
      <div className="skeleton-grid">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-card-header"></div>
            <div className="skeleton-card-body"></div>
            <div className="skeleton-card-footer"></div>
          </div>
        ))}
      </div>
    </div>
  );

  // If no access, show access denied
  if (!loading && !hasAccess) {
    return (
      <div className="executive-minutes-container">
        <div className="access-denied">
          <FiLock size={64} />
          <h2>Access Denied</h2>
          <p>Only executive members can view this page.</p>
          <button onClick={() => navigate('/dashboard')} className="back-btn">
            Go to Dashboard
          </button>
        </div>
        <style>{`
          .executive-minutes-container {
            padding: 40px 24px;
            background: #f8fafc;
            min-height: calc(100vh - 100px);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .access-denied {
            text-align: center;
            padding: 60px 40px;
            background: white;
            border-radius: 16px;
            max-width: 500px;
            width: 100%;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          }
          .access-denied svg {
            color: #ef4444;
            margin-bottom: 16px;
          }
          .access-denied h2 {
            color: #1e293b;
            margin: 0 0 8px;
          }
          .access-denied p {
            color: #94a3b8;
            margin: 0 0 20px;
          }
          .back-btn {
            padding: 10px 24px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
          }
          .back-btn:hover {
            background: #2563eb;
          }
          @media (max-width: 768px) {
            .access-denied {
              padding: 40px 20px;
            }
          }
        `}</style>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="executive-minutes-container">
        <SkeletonLoader />
        <style>{`
          .executive-minutes-container {
            padding: 24px;
            background: #f8fafc;
            min-height: calc(100vh - 100px);
          }

          .skeleton-wrapper {
            max-width: 1400px;
            margin: 0 auto;
          }

          .skeleton-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            flex-wrap: wrap;
            gap: 16px;
          }

          .skeleton-title {
            width: 250px;
            height: 36px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            animation: skeleton-wave 1.5s infinite;
            border-radius: 8px;
          }

          .skeleton-stats {
            display: flex;
            gap: 12px;
          }

          .skeleton-stat {
            width: 100px;
            height: 60px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            animation: skeleton-wave 1.5s infinite;
            border-radius: 12px;
          }

          .skeleton-filters {
            display: flex;
            gap: 12px;
            margin-bottom: 24px;
            flex-wrap: wrap;
          }

          .skeleton-search {
            flex: 1;
            min-width: 200px;
            height: 48px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            animation: skeleton-wave 1.5s infinite;
            border-radius: 12px;
          }

          .skeleton-filter {
            width: 120px;
            height: 48px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            animation: skeleton-wave 1.5s infinite;
            border-radius: 12px;
          }

          .skeleton-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
            gap: 20px;
          }

          .skeleton-card {
            background: white;
            border-radius: 16px;
            padding: 20px;
            border: 1px solid #e2e8f0;
          }

          .skeleton-card-header {
            height: 24px;
            width: 60%;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            animation: skeleton-wave 1.5s infinite;
            border-radius: 4px;
            margin-bottom: 12px;
          }

          .skeleton-card-body {
            height: 60px;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            animation: skeleton-wave 1.5s infinite;
            border-radius: 4px;
            margin-bottom: 12px;
          }

          .skeleton-card-footer {
            height: 32px;
            width: 40%;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 200% 100%;
            animation: skeleton-wave 1.5s infinite;
            border-radius: 4px;
          }

          @keyframes skeleton-wave {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }

          @media (max-width: 768px) {
            .skeleton-grid {
              grid-template-columns: 1fr;
            }
            .skeleton-header {
              flex-direction: column;
              align-items: stretch;
            }
            .skeleton-stats {
              flex-wrap: wrap;
            }
            .skeleton-stat {
              flex: 1;
              min-width: 80px;
            }
            .skeleton-filters {
              flex-direction: column;
            }
            .skeleton-filter {
              width: 100%;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="executive-minutes-container">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <img src={logo} alt="Loading..." style={{ width: '40px', height: '57px' }} /> ZUCA  meetings Minutes
          </h1>
          <p className="subtitle">This Page is  Visible to leaders only  View all meeting minutes</p>
        </div>
        {stats && (
          <div className="header-stats">
            <div className="stat-chip">
              <span className="stat-number">{stats.totalMinutes}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-chip">
              <span className="stat-number">{stats.publishedMinutes}</span>
              <span className="stat-label">Published</span>
            </div>
            <div className="stat-chip">
              <span className="stat-number">{stats.executiveMinutes}</span>
              <span className="stat-label">Executive</span>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <FiSearch size={18} />
          <input
            type="text"
            placeholder="Search by title or venue..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            <option value="executive"><FaUserCircle></FaUserCircle> Executive</option>
            <option value="jumuia"> Jumuia</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="published"> Published</option>
            <option value="draft"> Draft</option>
            <option value="pending"> Pending</option>
          </select>
        </div>
      </div>

      {/* Minutes Grid */}
      {filteredMinutes.length === 0 ? (
        <div className="empty-state">
          <FiFileText size={48} />
          <h3>No Minutes Found</h3>
          <p>No meeting minutes are available at this time.</p>
        </div>
      ) : (
        <div className={isMobile ? "minutes-grid-mobile" : "minutes-grid"}>
          {filteredMinutes.map((minute) => (
            <div
              key={minute.id}
              className="minute-card"
              onClick={() => navigate(`/executive/minutes/${minute.id}`)}
            >
              <div className="card-header">
                <div className="card-title">
                  <h3>{minute.title || 'Meeting Minutes'}</h3>
                  {getTypeBadge(minute.type)}
                </div>
                <div className="card-status">
                  {getStatusBadge(minute.status)}
                </div>
              </div>

              <div className="card-details">
                <div className="detail-item">
                  <FiCalendar size={14} />
                  <span>{formatDate(minute.meetingDate)}</span>
                </div>
                <div className="detail-item">
                  <FiClock size={14} />
                  <span>{minute.meetingTime || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <FiMapPin size={14} />
                  <span>{minute.venue || 'ZUCA'}</span>
                </div>
                <div className="detail-item">
                  <FiUsers size={14} />
                  <span>
                    {minute.presentMembers?.length || 0} present, 
                    {minute.absentMembers?.length || 0} absent
                  </span>
                </div>
              </div>

              <div className="card-footer">
                <div className="card-meta">
                  <span className="meta-item">
                    <FaCalendarAlt></FaCalendarAlt> {formatDate(minute.createdAt)}
                  </span>
                  <span className="meta-item">
                    <FaUserAlt></FaUserAlt> By: {minute.creator?.fullName || 'Unknown'}
                  </span>
                </div>
                <div className="card-actions">
                  <span className="view-link">
                    View Details <FiChevronRight size={16} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .executive-minutes-container {
          padding: 24px;
          background: #f8fafc;
          min-height: calc(100vh - 80px);
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .header-content h1 {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .subtitle {
          color: #64748b;
          font-size: 14px;
          margin: 4px 0 0 0;
        }

        .header-stats {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .stat-chip {
          background: white;
          padding: 8px 16px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          text-align: center;
          min-width: 80px;
        }

        .stat-number {
          display: block;
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
        }

        .stat-label {
          font-size: 11px;
          color: #94a3b8;
        }

        .filters-bar {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .search-box {
          flex: 1;
          min-width: 200px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          transition: all 0.2s;
        }

        .search-box:focus-within {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .search-box input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-size: 14px;
          color: #1e293b;
        }

        .filter-group {
          display: flex;
          gap: 8px;
        }

        .filter-group select {
          padding: 10px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: white;
          font-size: 13px;
          color: #1e293b;
          cursor: pointer;
          outline: none;
        }

        .filter-group select:focus {
          border-color: #3b82f6;
        }

        .minutes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 20px;
        }

        .minutes-grid-mobile {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .minute-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #e2e8f0;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .minute-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.1);
          border-color: #3b82f6;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
          gap: 8px;
        }

        .card-title {
          flex: 1;
          min-width: 0;
        }

        .card-title h3 {
          font-size: 16px;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 6px 0;
          word-wrap: break-word;
        }

        .badge {
          display: inline-block;
          padding: 2px 10px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 600;
          white-space: nowrap;
        }

        .badge.executive {
          background: #f5090900;
          color: #ee1154;
        }

        .badge.jumuia {
          background: #dcfce7;
          color: #16a34a;
        }

        .badge.published {
          background: #dcfce713;
          color: #16a34a;
        }

        .badge.draft {
          background: #fef3c7;
          color: #d97706;
        }

        .badge.pending {
          background: #dbeafe;
          color: #2563eb;
        }

        .card-status {
          flex-shrink: 0;
        }

        .card-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin: 12px 0 16px;
        }

        .detail-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #64748b;
          min-width: 0;
        }

        .detail-item svg {
          flex-shrink: 0;
        }

        .detail-item span {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 12px;
          border-top: 1px solid #f1f5f9;
          flex-wrap: wrap;
          gap: 8px;
        }

        .card-meta {
          display: flex;
          gap: 12px;
          font-size: 11px;
          color: #94a3b8;
          flex-wrap: wrap;
        }

        .view-link {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          font-weight: 600;
          color: #3b82f6;
          white-space: nowrap;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 16px;
          border: 2px dashed #e2e8f0;
        }

        .empty-state svg {
          color: #94a3b8;
          margin-bottom: 12px;
        }

        .empty-state h3 {
          color: #1e293b;
          margin: 0 0 8px;
        }

        .empty-state p {
          color: #94a3b8;
          margin: 0;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 300px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1024px) {
          .minutes-grid {
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          }
        }

        @media (max-width: 768px) {
          .executive-minutes-container {
            padding: 16px;
            min-height: calc(100vh - 70px);
          }
          .minutes-grid {
            grid-template-columns: 1fr;
          }
          .page-header {
            flex-direction: column;
            align-items: stretch;
          }
          .header-stats {
            justify-content: stretch;
          }
          .stat-chip {
            flex: 1;
            min-width: 60px;
          }
          .filters-bar {
            flex-direction: column;
          }
          .filter-group {
            flex-wrap: wrap;
          }
          .filter-group select {
            flex: 1;
          }
          .card-details {
            grid-template-columns: 1fr 1fr;
          }
          .card-footer {
            flex-direction: column;
            align-items: stretch;
          }
          .view-link {
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .executive-minutes-container {
            padding: 12px;
          }
          .header-content h1 {
            font-size: 22px;
          }
          .card-details {
            grid-template-columns: 1fr;
          }
          .card-title h3 {
            font-size: 14px;
          }
          .stat-chip {
            padding: 6px 12px;
          }
          .stat-number {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
}