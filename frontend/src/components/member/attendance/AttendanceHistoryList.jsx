import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BASE_URL from '../../../api';
import { Calendar, Clock, MapPin, CheckCircle, ChevronRight, BookOpen } from 'lucide-react';

export default function AttendanceHistoryList() {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('current'); // 'current' or semesterId
  const [filter, setFilter] = useState('all'); // all, thisMonth, lastMonth
  
  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };
  
  // Fetch available semesters
  const fetchSemesters = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/semesters`, {
        headers: getHeaders()
      });
      setSemesters(response.data || []);
      
      // Set current semester as default
      const currentSemester = response.data.find(s => s.isCurrent);
      if (currentSemester) {
        setSelectedSemester(currentSemester.id);
      }
    } catch (error) {
      console.error('Error fetching semesters:', error);
    }
  };
  
  // Fetch attendance history with semester filter
  const fetchHistory = async () => {
    try {
      setLoading(true);
      const params = {};
      
      // Add semester filter if not 'all'
      if (selectedSemester !== 'all') {
        params.semesterId = selectedSemester;
      }
      
      const response = await axios.get(`${BASE_URL}/api/attendance/my-history`, {
        headers: getHeaders(),
        params: params
      });
      
      setHistory(response.data.history || []);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching attendance history:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchSemesters();
  }, []);
  
  useEffect(() => {
    if (selectedSemester) {
      fetchHistory();
    }
  }, [selectedSemester]);
  
  const getFilteredHistory = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    if (filter === 'thisMonth') {
      return history.filter(item => {
        const date = new Date(item.signTime);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      });
    }
    if (filter === 'lastMonth') {
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return history.filter(item => {
        const date = new Date(item.signTime);
        return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
      });
    }
    return history;
  };
  
  const filteredHistory = getFilteredHistory();
  
  // Get current semester display name
  const getSemesterName = () => {
    if (selectedSemester === 'all') return 'All Semesters';
    if (selectedSemester === 'current') {
      const current = semesters.find(s => s.isCurrent);
      return current ? current.name : 'Current Semester';
    }
    const semester = semesters.find(s => s.id === selectedSemester);
    return semester ? semester.name : 'Unknown Semester';
  };
  
  if (loading) {
    return <div className="history-loading">Loading attendance history...</div>;
  }
  
  return (
    <div className="attendance-history">
      {/* Semester Selector */}
      <div className="semester-selector">
        <div className="semester-label">
          <BookOpen size={16} />
          <span>Semester:</span>
        </div>
        <select 
          value={selectedSemester} 
          onChange={(e) => setSelectedSemester(e.target.value)}
          className="semester-select"
        >
          <option value="current">📚 Current Semester</option>
          {semesters.map(semester => (
            <option key={semester.id} value={semester.id}>
              {semester.name} {semester.isCurrent && '⭐'}
            </option>
          ))}
          <option value="all">📋 All Semesters</option>
        </select>
      </div>
      
      {/* Stats Summary */}
      {stats && (
        <div className="history-stats">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Meetings</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.attendanceRate}%</div>
            <div className="stat-label">Attendance Rate</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{history.filter(h => {
              const d = new Date(h.signTime);
              const now = new Date();
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length}</div>
            <div className="stat-label">This Month</div>
          </div>
        </div>
      )}
      
      {/* Semester Context Display */}
      <div className="semester-context">
        <span className="context-badge">
          Showing: {getSemesterName()}
        </span>
        <span className="context-count">
          {filteredHistory.length} records
        </span>
      </div>
      
      {/* Filter Tabs */}
      <div className="history-filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`} 
          onClick={() => setFilter('all')}
        >
          All Time
        </button>
        <button 
          className={`filter-btn ${filter === 'thisMonth' ? 'active' : ''}`} 
          onClick={() => setFilter('thisMonth')}
        >
          This Month
        </button>
        <button 
          className={`filter-btn ${filter === 'lastMonth' ? 'active' : ''}`} 
          onClick={() => setFilter('lastMonth')}
        >
          Last Month
        </button>
      </div>
      
      {/* History List */}
      {filteredHistory.length === 0 ? (
        <div className="empty-history">
          <div className="empty-icon">📋</div>
          <p>No attendance records found</p>
          <span>
            {selectedSemester === 'all' 
              ? 'No attendance records in any semester' 
              : `No attendance records for ${getSemesterName()}`}
          </span>
        </div>
      ) : (
        <div className="history-list">
          {filteredHistory.map(record => (
            <div key={record.id} className="history-item">
              <div className="history-icon">
                <CheckCircle size={20} className="success-icon" />
              </div>
              <div className="history-details">
                <div className="history-title">{record.sheet?.title || 'Meeting'}</div>
                <div className="history-meta">
                  <span><Calendar size={12} /> {new Date(record.signTime).toLocaleDateString()}</span>
                  <span><Clock size={12} /> {new Date(record.signTime).toLocaleTimeString()}</span>
                  <span><MapPin size={12} /> {record.sheet?.location || 'ZUCA'}</span>
                </div>
                <div className="history-method">
                  <span className={`method-badge ${record.signMethod?.toLowerCase()}`}>
                    {record.signMethod === 'SELF' ? 'Self Check-in' : 
                     record.signMethod === 'QR_CODE' ? 'QR Code' : 'Manual'}
                  </span>
                  {/* Show semester if viewing all semesters */}
                  {selectedSemester === 'all' && record.semesterName && (
                    <span className="semester-badge">{record.semesterName}</span>
                  )}
                </div>
              </div>
              <ChevronRight size={16} className="history-arrow" />
            </div>
          ))}
        </div>
      )}
      
      <style>{`
        .attendance-history { padding: 0 0 20px 0; }
        
        /* Semester Selector */
        .semester-selector { 
          display: flex; 
          align-items: center; 
          gap: 12px; 
          margin-bottom: 20px;
          padding: 12px;
          background: #f1f5f9;
          border-radius: 12px;
        }
        .semester-label { 
          display: flex; 
          align-items: center; 
          gap: 6px; 
          font-weight: 500; 
          color: #475569; 
        }
        .semester-select {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: white;
          font-size: 14px;
          cursor: pointer;
          outline: none;
        }
        .semester-select:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        /* Semester Context */
        .semester-context {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding: 8px 4px;
        }
        .context-badge {
          font-size: 13px;
          color: #475569;
          font-weight: 500;
        }
        .context-count {
          font-size: 12px;
          color: #94a3b8;
        }
        
        .history-stats { display: flex; gap: 12px; margin-bottom: 16px; }
        .stat-card { flex: 1; background: #f8fafc; border-radius: 12px; padding: 12px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: 700; color: #1e293b; }
        .stat-label { font-size: 11px; color: #64748b; margin-top: 4px; }
        
        .history-filters { display: flex; gap: 8px; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
        .filter-btn { background: none; border: none; padding: 6px 16px; font-size: 13px; cursor: pointer; border-radius: 20px; }
        .filter-btn.active { background: #1e293b; color: white; }
        
        .history-list { display: flex; flex-direction: column; gap: 12px; max-height: 400px; overflow-y: auto; }
        .history-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: #f8fafc; border-radius: 12px; cursor: pointer; }
        .history-item:hover { background: #f1f5f9; }
        .history-icon .success-icon { color: #22c55e; }
        .history-details { flex: 1; }
        .history-title { font-weight: 600; font-size: 14px; margin-bottom: 6px; }
        .history-meta { display: flex; gap: 12px; font-size: 11px; color: #64748b; margin-bottom: 6px; }
        .history-method { display: flex; gap: 8px; align-items: center; }
        .method-badge { font-size: 10px; padding: 2px 8px; border-radius: 20px; }
        .method-badge.self { background: #dbeafe; color: #2563eb; }
        .method-badge.qr_code { background: #dcfce7; color: #059669; }
        .method-badge.manual { background: #fef3c7; color: #d97706; }
        .semester-badge { 
          font-size: 10px; 
          padding: 2px 8px; 
          border-radius: 20px; 
          background: #e2e8f0; 
          color: #475569; 
        }
        .history-arrow { color: #94a3b8; }
        
        .empty-history { text-align: center; padding: 40px; background: #f8fafc; border-radius: 16px; }
        .empty-icon { font-size: 48px; margin-bottom: 12px; }
        .empty-history p { font-weight: 500; margin-bottom: 4px; }
        .empty-history span { font-size: 12px; color: #94a3b8; }
        .history-loading { text-align: center; padding: 40px; color: #64748b; }
      `}</style>
    </div>
  );
}