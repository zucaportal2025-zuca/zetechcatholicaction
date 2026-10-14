import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import BASE_URL from '../../../api';
import { ArrowLeft, Calendar, Clock, MapPin, CheckCircle, ChevronRight, TrendingUp, Award, Target, BarChart3, XCircle, User, Mail, Phone, BookOpen } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadialBarChart, RadialBar
} from 'recharts';

export default function AdminMemberDetail() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [missedMeetings, setMissedMeetings] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all');
  const [activeChart, setActiveChart] = useState('trend');
  const [userName, setUserName] = useState('');

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const response = await axios.get(
        `${BASE_URL}/api/attendance/admin/member/${userId}/history`,
        { headers: getHeaders() }
      );
      
      const data = response.data;
      setUserData(data.user);
      setUserName(data.user.fullName || 'Member');
      setAttendanceHistory(data.attendanceHistory || []);
      setMissedMeetings(data.missedMeetings || []);
      setStats(data.stats);
      
    } catch (error) {
      console.error('Error fetching member history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId]);

  const getFilteredHistory = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    if (filter === 'thisMonth') {
      return attendanceHistory.filter(item => {
        const date = new Date(item.signTime);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      });
    }
    if (filter === 'lastMonth') {
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return attendanceHistory.filter(item => {
        const date = new Date(item.signTime);
        return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
      });
    }
    return attendanceHistory;
  };

  const getFilteredMissedMeetings = () => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  if (filter === 'thisMonth') {
    return missedMeetings.filter(item => {
      const date = new Date(item.eventDate);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
  }
  if (filter === 'lastMonth') {
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    return missedMeetings.filter(item => {
      const date = new Date(item.eventDate);
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    });
  }
  return missedMeetings;
};

  // Generate monthly trend data
  const getMonthlyTrend = () => {
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const months = {};
    
    const allMeetings = [...attendanceHistory, ...missedMeetings];
    allMeetings.forEach(meeting => {
      const date = new Date(meeting.eventDate || meeting.signTime);
      const monthKey = date.toLocaleString('default', { month: 'short' });
      
      if (!months[monthKey]) {
        months[monthKey] = { 
          month: monthKey, 
          totalMeetings: 0, 
          attendedMeetings: 0,
          attendanceRate: 0
        };
      }
      months[monthKey].totalMeetings++;
      
      // Check if this meeting was attended
      const isAttended = attendanceHistory.some(h => 
        h.sheetTitle === meeting.sheetTitle || h.sheetId === meeting.id
      );
      if (isAttended || meeting.signTime) {
        months[monthKey].attendedMeetings++;
      }
    });
    
    return Object.values(months)
      .map(month => ({
        ...month,
        attendanceRate: month.totalMeetings > 0 ? (month.attendedMeetings / month.totalMeetings) * 100 : 0
      }))
      .sort((a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month));
  };

  const getPerformanceMetrics = () => {
    const totalMeetings = stats?.totalMeetings || 0;
    const attendedMeetings = stats?.attendedMeetings || 0;
    
    const attendanceScore = totalMeetings > 0 ? (attendedMeetings / totalMeetings) * 100 : 0;
    const consistencyScore = attendanceScore;
    const timelinessScore = attendedMeetings > 0 ? 100 : 0;
    const overallScore = (attendanceScore + consistencyScore + timelinessScore) / 3;
    
    return {
      attendanceScore: Math.round(attendanceScore),
      consistencyScore: Math.round(consistencyScore),
      timelinessScore: Math.round(timelinessScore),
      overallScore: Math.round(overallScore)
    };
  };

  const monthlyData = getMonthlyTrend();
  const metrics = getPerformanceMetrics();
  const filteredHistory = getFilteredHistory();
  const filteredMissed = getFilteredMissedMeetings();
  
  
  const totalMeetings = stats?.totalMeetings || 0;
  const attendedMeetings = stats?.attendedMeetings || 0;
  const missedMeetingsCount = stats?.missedMeetings || 0;
  const attendanceRate = stats?.attendanceRate || 0;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="tooltip-value" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(1)}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const firstName = userName.split(' ')[0] || 'Member';

  return (
    <div className="member-detail-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/admin/attendance/overview')}>
          <ArrowLeft size={20} /> Back to Attendance Overview
        </button>
        
        <div className="header-text">
          <h1>
            👤 <span className="user-name">{userName}</span>
            <span className="title-split"> Attendance History & Analysis</span>
          </h1>
          {userData?.executivePosition && (
            <span className="executive-badge"> {userData.executivePosition}</span>
          )}
        </div>
        
        <div className="user-badge">
          <Target size={16} />
          <span>{userData?.role || 'Member'}</span>
        </div>
      </div>

      {/* User Info Cards */}
      <div className="user-info-cards">
        <div className="info-card">
          <Mail size={18} />
          <span>{userData?.email || 'N/A'}</span>
        </div>
        <div className="info-card">
          <Phone size={18} />
          <span>{userData?.phone || 'N/A'}</span>
        </div>
        <div className="info-card">
          <BookOpen size={18} />
          <span>Membership: {userData?.membershipNumber || 'N/A'}</span>
        </div>
        <div className="info-card">
          <User size={18} />
          <span>Jumuia: {userData?.jumuiaName || 'N/A'}</span>
        </div>
      </div>
      
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading member data...</p>
        </div>
      ) : (
        <>
          {/* Overall Performance Score Card */}
          <div className="overall-score-card">
            <div className="score-circle">
              <svg className="progress-ring" width="120" height="120">
                <circle className="progress-ring-bg" stroke="#e2e8f0" strokeWidth="8" fill="none" r="52" cx="60" cy="60"/>
                <circle className="progress-ring-fill" stroke="url(#gradient)" strokeWidth="8" fill="none" r="52" cx="60" cy="60"
                  strokeDasharray={`${2 * Math.PI * 52}`}
                  strokeDashoffset={`${2 * Math.PI * 52 * (1 - metrics.overallScore / 100)}`}
                  transform="rotate(-90 60 60)"/>
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981"/>
                    <stop offset="100%" stopColor="#3b82f6"/>
                  </linearGradient>
                </defs>
              </svg>
              <div className="score-text">
                <span className="score-value">{metrics.overallScore}</span>
                <span className="score-label">Overall<br/>Performance</span>
              </div>
            </div>
            <div className="score-details">
              <div className="metric-item">
                <TrendingUp size={18} color="#10b981" />
                <div className="metric-info">
                  <span className="metric-label">Attendance</span>
                  <span className="metric-value">{metrics.attendanceScore}%</span>
                </div>
              </div>
              <div className="metric-item">
                <Award size={18} color="#f59e0b" />
                <div className="metric-info">
                  <span className="metric-label">Consistency</span>
                  <span className="metric-value">{metrics.consistencyScore}%</span>
                </div>
              </div>
              <div className="metric-item">
                <Clock size={18} color="#3b82f6" />
                <div className="metric-info">
                  <span className="metric-label">Timeliness</span>
                  <span className="metric-value">{metrics.timelinessScore}%</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-value">{totalMeetings}</div>
              <div className="stat-label">Total Meetings</div>
              <div className="stat-trend">All time</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-value">{attendanceRate}%</div>
              <div className="stat-label">Attendance Rate</div>
              <div className="stat-trend positive">{attendedMeetings} of {totalMeetings}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">❌</div>
              <div className="stat-value">{missedMeetingsCount}</div>
              <div className="stat-label">Missed Meetings</div>
              <div className="stat-trend">Needs improvement</div>
            </div>
          </div>
          
          {/* Chart Navigation */}
          <div className="chart-nav">
            <button className={`chart-nav-btn ${activeChart === 'trend' ? 'active' : ''}`} onClick={() => setActiveChart('trend')}>
              <BarChart3 size={16} /> Monthly Trend
            </button>
            <button className={`chart-nav-btn ${activeChart === 'weekly' ? 'active' : ''}`} onClick={() => setActiveChart('weekly')}>
              <TrendingUp size={16} /> Performance
            </button>
            <button className={`chart-nav-btn ${activeChart === 'radial' ? 'active' : ''}`} onClick={() => setActiveChart('radial')}>
              <Award size={16} /> Metrics
            </button>
          </div>
          
          {/* Charts Section */}
          <div className="charts-container">
            {activeChart === 'trend' && monthlyData.length > 0 && (
              <div className="chart-card">
                <div className="chart-header">
                  <h3>Monthly Attendance Trend</h3>
                  <p>Attendance compared to total meetings each month</p>
                </div>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" />
                    <YAxis stroke="#64748b" domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="attendanceRate" stroke="#10b981" strokeWidth={3} name="Attendance Rate" dot={{ fill: '#10b981', r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="chart-insight">
                  💡 {userName} has attended {attendedMeetings} out of {totalMeetings} total meetings ({attendanceRate}% attendance rate)
                </div>
              </div>
            )}
            
            {activeChart === 'weekly' && (
              <div className="chart-card">
                <div className="chart-header">
                  <h3>Performance Summary</h3>
                  <p>Key metrics at a glance</p>
                </div>
                <div className="performance-grid">
                  <div className="perf-item">
                    <span className="perf-label">Total Meetings</span>
                    <span className="perf-value">{totalMeetings}</span>
                  </div>
                  <div className="perf-item">
                    <span className="perf-label">Attended</span>
                    <span className="perf-value success">{attendedMeetings}</span>
                  </div>
                  <div className="perf-item">
                    <span className="perf-label">Missed</span>
                    <span className="perf-value danger">{missedMeetingsCount}</span>
                  </div>
                  <div className="perf-item">
                    <span className="perf-label">Attendance Rate</span>
                    <span className="perf-value primary">{attendanceRate}%</span>
                  </div>
                </div>
              </div>
            )}
            
            {activeChart === 'radial' && (
              <div className="radial-charts-container">
                <div className="radial-chart-card">
                  <h4>Attendance Score</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={[{ name: 'Score', value: metrics.attendanceScore, fill: '#10b981' }]} startAngle={180} endAngle={0}>
                      <RadialBar background clockWise dataKey="value" cornerRadius={10} />
                      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="radial-label">
                        {metrics.attendanceScore}%
                      </text>
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <p className="radial-note">{attendedMeetings} / {totalMeetings} meetings</p>
                </div>
                <div className="radial-chart-card">
                  <h4>Consistency Rating</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={[{ name: 'Score', value: metrics.consistencyScore, fill: '#f59e0b' }]} startAngle={180} endAngle={0}>
                      <RadialBar background clockWise dataKey="value" cornerRadius={10} />
                      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="radial-label">
                        {metrics.consistencyScore}%
                      </text>
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <p className="radial-note">Based on attendance patterns</p>
                </div>
                <div className="radial-chart-card">
                  <h4>Overall Grade</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={[{ name: 'Score', value: metrics.overallScore, fill: '#8b5cf6' }]} startAngle={180} endAngle={0}>
                      <RadialBar background clockWise dataKey="value" cornerRadius={10} />
                      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="radial-label">
                        {metrics.overallScore}%
                      </text>
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <p className="radial-note">
                    {metrics.overallScore >= 80 ? 'Excellent Performance' : 
                     metrics.overallScore >= 60 ? 'Good Performance' : 
                     'Needs Improvement'}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Filters */}
          <div className="filters">
            <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
              All Time
            </button>
            <button className={`filter-btn ${filter === 'thisMonth' ? 'active' : ''}`} onClick={() => setFilter('thisMonth')}>
              This Month
            </button>
            <button className={`filter-btn ${filter === 'lastMonth' ? 'active' : ''}`} onClick={() => setFilter('lastMonth')}>
              Last Month
            </button>
          </div>
          
          {/* Attendance History List */}
          <div className="history-list-container">
            <div className="history-header">
              <h3>📝 Attendance History</h3>
              <span className="history-count">{filteredHistory.length} records</span>
            </div>
            {filteredHistory.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>No Attendance Records</h3>
                <p>This member hasn't attended any meetings yet.</p>
              </div>
            ) : (
              filteredHistory.map(entry => (
                <div key={entry.id} className="history-item">
                  <div className="history-icon">
                    <CheckCircle size={24} className="success-icon" />
                  </div>
                  <div className="history-details">
                    <div className="history-title">{entry.sheetTitle}</div>
                    <div className="history-meta">
                      <span><Calendar size={12} /> {new Date(entry.eventDate).toLocaleDateString()}</span>
                      <span><Clock size={12} /> {entry.eventTime || 'Time TBD'}</span>
                      <span><MapPin size={12} /> {entry.location || 'ZUCA'}</span>
                    </div>
                    <div className="history-status">
                      <span className={`status-badge present`}>✅ Present</span>
                      {entry.signMethod && (
                        <span className={`method-badge ${entry.signMethod?.toLowerCase()}`}>
                          Checked in via {entry.signMethod === 'SELF' ? 'Self' : 
                           entry.signMethod === 'QR_CODE' ? 'QR Code' : 'Manual'}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={18} className="history-arrow" />
                </div>
              ))
            )}
          </div>

          {/* Missed Meetings */}
          {missedMeetings && missedMeetings.length > 0 && (
            <div className="missed-list-container">
              <div className="history-header">
                <h3>❌ Missed Meetings</h3>
                <span className="history-count">{missedMeetings.length} missed</span>
              </div>
              {missedMeetings.map(sheet => (
                <div key={sheet.id} className="missed-item">
                  <div className="history-icon">
                    <XCircle size={24} className="missed-icon" />
                  </div>
                  <div className="history-details">
                    <div className="history-title">{sheet.title}</div>
                    <div className="history-meta">
                      <span><Calendar size={12} /> {new Date(sheet.eventDate).toLocaleDateString()}</span>
                      <span><Clock size={12} /> {sheet.eventTime || 'Time TBD'}</span>
                      <span><MapPin size={12} /> {sheet.location || 'ZUCA'}</span>
                    </div>
                    <div className="history-status">
                      <span className="status-badge absent">❌ Absent</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      
      <style>{`
        .member-detail-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #e9edf2 100%);
          padding: 20px;
        }
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
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
        .header-text {
          flex: 1;
          text-align: center;
        }
        .header-text h1 {
          font-size: 22px;
          font-weight: 700;
          margin: 0;
        }
        .user-name {
          background: linear-gradient(135deg, #10b981, #3b82f6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .title-split {
          font-size: 16px;
          font-weight: 400;
          color: #64748b;
        }
        .executive-badge {
          display: inline-block;
          background: #dbeafe;
          color: #2563eb;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          margin-left: 8px;
        }
        .user-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          color: #3b82f6;
        }
        .user-info-cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }
        .info-card {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          font-size: 13px;
          color: #475569;
        }
        .info-card svg {
          color: #64748b;
        }
        .overall-score-card {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 32px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          border: 1px solid #e2e8f0;
        }
        .score-circle {
          position: relative;
          width: 120px;
          height: 120px;
        }
        .progress-ring {
          transform: rotate(-90deg);
        }
        .progress-ring-bg {
          stroke: #e2e8f0;
        }
        .progress-ring-fill {
          stroke: url(#gradient);
          transition: stroke-dashoffset 0.5s ease;
        }
        .score-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }
        .score-value {
          font-size: 32px;
          font-weight: 700;
          color: #1e293b;
          line-height: 1;
        }
        .score-label {
          font-size: 10px;
          color: #64748b;
          display: block;
          margin-top: 4px;
        }
        .score-details {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .metric-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .metric-info {
          display: flex;
          flex-direction: column;
        }
        .metric-label {
          font-size: 12px;
          color: #64748b;
        }
        .metric-value {
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
        }
        .stats-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 16px;
          border: 1px solid #e2e8f0;
          transition: transform 0.2s;
        }
        .stat-card:hover {
          transform: translateY(-2px);
        }
        .stat-icon {
          font-size: 28px;
          margin-bottom: 8px;
        }
        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #1e293b;
        }
        .stat-label {
          font-size: 12px;
          color: #64748b;
          margin-top: 4px;
        }
        .stat-trend {
          font-size: 10px;
          color: #10b981;
          margin-top: 8px;
        }
        .stat-trend.positive {
          color: #10b981;
        }
        .chart-nav {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          background: white;
          padding: 6px;
          border-radius: 12px;
          display: inline-flex;
        }
        .chart-nav-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 20px;
          background: transparent;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }
        .chart-nav-btn.active {
          background: #1e293b;
          color: white;
        }
        .charts-container {
          margin-bottom: 24px;
        }
        .chart-card {
          background: white;
          border-radius: 20px;
          padding: 20px;
          border: 1px solid #e2e8f0;
        }
        .chart-header h3 {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 600;
        }
        .chart-header p {
          margin: 0 0 16px 0;
          font-size: 12px;
          color: #64748b;
        }
        .chart-insight {
          margin-top: 16px;
          padding: 12px;
          background: #f0fdf4;
          border-radius: 8px;
          font-size: 12px;
          color: #059669;
        }
        .performance-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          padding: 16px 0;
        }
        .perf-item {
          text-align: center;
          padding: 16px;
          background: #f8fafc;
          border-radius: 12px;
        }
        .perf-label {
          display: block;
          font-size: 12px;
          color: #64748b;
          margin-bottom: 4px;
        }
        .perf-value {
          font-size: 28px;
          font-weight: 700;
        }
        .perf-value.success { color: #10b981; }
        .perf-value.danger { color: #ef4444; }
        .perf-value.primary { color: #3b82f6; }
        .radial-charts-container {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .radial-chart-card {
          background: white;
          border-radius: 20px;
          padding: 20px;
          text-align: center;
          border: 1px solid #e2e8f0;
        }
        .radial-chart-card h4 {
          margin: 0 0 16px 0;
          font-size: 14px;
          font-weight: 600;
        }
        .radial-note {
          margin-top: 12px;
          font-size: 11px;
          color: #64748b;
        }
        .radial-label {
          font-size: 24px;
          font-weight: 700;
          fill: #1e293b;
        }
        .filters {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }
        .filter-btn {
          padding: 8px 20px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 30px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }
        .filter-btn.active {
          background: #1e293b;
          color: white;
          border-color: #1e293b;
        }
        .history-list-container, .missed-list-container {
          background: white;
          border-radius: 20px;
          padding: 20px;
          margin-bottom: 20px;
          border: 1px solid #e2e8f0;
        }
        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .history-header h3 {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
        }
        .history-count {
          font-size: 12px;
          color: #64748b;
        }
        .history-item, .missed-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px 0;
          border-bottom: 1px solid #f1f5f9;
        }
        .history-item:last-child, .missed-item:last-child {
          border-bottom: none;
        }
        .history-icon {
          flex-shrink: 0;
        }
        .success-icon { color: #22c55e; }
        .missed-icon { color: #ef4444; }
        .history-details { flex: 1; }
        .history-title { font-weight: 600; margin-bottom: 4px; }
        .history-meta { display: flex; gap: 16px; font-size: 12px; color: #64748b; }
        .history-status { display: flex; gap: 8px; margin-top: 4px; flex-wrap: wrap; }
        .status-badge { font-size: 10px; padding: 2px 10px; border-radius: 20px; }
        .status-badge.present { background: #dcfce7; color: #059669; }
        .status-badge.absent { background: #fee2e2; color: #dc2626; }
        .method-badge { font-size: 10px; padding: 2px 10px; border-radius: 20px; }
        .method-badge.self { background: #dbeafe; color: #2563eb; }
        .method-badge.qr_code { background: #dcfce7; color: #059669; }
        .method-badge.manual { background: #fef3c7; color: #d97706; }
        .history-arrow { color: #94a3b8; }
        .empty-state { text-align: center; padding: 40px 20px; }
        .empty-icon { font-size: 48px; margin-bottom: 12px; }
        .empty-state h3 { margin-bottom: 4px; }
        .empty-state p { color: #64748b; }
        .loading-state { text-align: center; padding: 60px; color: #64748b; }
        .spinner {
          border: 3px solid #e2e8f0;
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .custom-tooltip {
          background: white;
          padding: 10px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .tooltip-label {
          font-weight: 600;
          margin-bottom: 4px;
        }
        .tooltip-value {
          margin: 2px 0;
          font-size: 12px;
        }
        @media (max-width: 768px) {
          .user-info-cards {
            grid-template-columns: 1fr 1fr;
          }
          .overall-score-card {
            flex-direction: column;
            text-align: center;
          }
          .score-details {
            width: 100%;
          }
          .performance-grid {
            grid-template-columns: 1fr 1fr;
          }
          .radial-charts-container {
            grid-template-columns: 1fr;
          }
          .stats-cards {
            grid-template-columns: 1fr;
          }
          .history-meta {
            flex-wrap: wrap;
          }
          .title-split {
            display: block;
            font-size: 14px;
            margin-top: 4px;
          }
        }
      `}</style>
    </div>
  );
}