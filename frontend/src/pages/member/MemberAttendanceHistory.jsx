import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import BASE_URL from '../../api';
import { ArrowLeft, Calendar, Clock, MapPin, CheckCircle, ChevronRight, TrendingUp, Award, Target, BarChart3, XCircle, Calendar as CalendarIcon,  Download  } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadialBarChart, RadialBar
} from 'recharts';
import { FiFileText} from 'react-icons/fi';
import { FaCalendarAlt } from 'react-icons/fa';

export default function MemberAttendanceHistory() {
  const navigate = useNavigate();
  const [userHistory, setUserHistory] = useState([]);
  const [allMeetings, setAllMeetings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [activeChart, setActiveChart] = useState('trend');
  const [userName, setUserName] = useState('');
  const [currentSemester, setCurrentSemester] = useState(null);

  const [downloading, setDownloading] = useState(false);
const [userSemester, setUserSemester] = useState(null);
  const [semesters, setSemesters] = useState([]);
const [selectedSemester, setSelectedSemester] = useState('current');
  
  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };
  
  // SINGLE fetchData function - combines user info and meetings
const fetchData = async () => {
  try {
    setLoading(true);
    
    // Fetch user info first
    const userResponse = await axios.get(`${BASE_URL}/api/me`, {
      headers: getHeaders()
    });
    setUserName(userResponse.data.fullName || 'Member');
    
    // ✅ Fetch current semester
    await fetchCurrentSemester();
    
    // ✅ Fetch all semesters for dropdown
    await fetchAllSemesters();
    
    // Fetch all meetings for this member
  const response = await axios.get(`${BASE_URL}/api/attendance/member/all-meetings`, {
  headers: getHeaders(),
  params: { semesterId: 'current' }
});
    
    setAllMeetings(response.data.allMeetings || []);
    setUserHistory(response.data.userHistory || []);
    setStats(response.data.stats);
    
  } catch (error) {
    console.error('Error fetching attendance data:', error);
    
    // Fallback to old endpoint if new one fails
    try {
      const historyResponse = await axios.get(`${BASE_URL}/api/attendance/my-history`, {
        headers: getHeaders()
      });
      setUserHistory(historyResponse.data.history || []);
      setStats(historyResponse.data.stats);
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
    }
  } finally {
    setLoading(false);
  }
};

  const fetchCurrentSemester = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/api/semesters/current`, {
      headers: getHeaders()
    });
    if (response.data.semester) {
      setCurrentSemester(response.data.semester);
    }
  } catch (error) {
    console.error('Error fetching semester:', error);
  }
};

const downloadMyReport = async () => {
  try {
    setDownloading(true);
    
    // Get current semester
    const semesterRes = await axios.get(`${BASE_URL}/api/semesters/current`, {
      headers: getHeaders()
    });
    
    if (!semesterRes.data.semester) {
      alert('No active semester found.');
      setDownloading(false);
      return;
    }
    
    const semester = semesterRes.data.semester;
    const user = JSON.parse(localStorage.getItem('user'));
    
    // Download the report
    const response = await axios.get(
      `${BASE_URL}/api/semesters/${semester.id}/report/${user.id}/download`,
      {
        headers: getHeaders(),
        responseType: 'blob'
      }
    );
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = `semester_report_${semester.title.replace(/\s/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Error downloading report:', error);
    alert('Failed to download report. Please try again.');
  } finally {
    setDownloading(false);
  }
};

const fetchAllSemesters = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/api/semesters/all`, {
      headers: getHeaders()
    });
    if (response.data.semesters) {
      setSemesters(response.data.semesters);
    }
  } catch (error) {
    console.error('Error fetching semesters:', error);
  }
};
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const getFilteredMeetings = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    if (filter === 'thisMonth') {
      return allMeetings.filter(meeting => {
        const date = new Date(meeting.eventDate);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      });
    }
    if (filter === 'lastMonth') {
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return allMeetings.filter(meeting => {
        const date = new Date(meeting.eventDate);
        return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
      });
    }
    return allMeetings;
  };
  
  const getFilteredHistory = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    if (filter === 'thisMonth') {
      return userHistory.filter(item => {
        const date = new Date(item.signTime);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      });
    }
    if (filter === 'lastMonth') {
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return userHistory.filter(item => {
        const date = new Date(item.signTime);
        return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
      });
    }
    return userHistory;
  };

  const handleSemesterChange = async (semesterId) => {
  setSelectedSemester(semesterId);
  
  try {
    setLoading(true);
    
    const params = {};
    if (semesterId !== 'all') {
      params.semesterId = semesterId;
    }
    
    const response = await axios.get(`${BASE_URL}/api/attendance/member/all-meetings`, {
      headers: getHeaders(),
      params: params
    });
    
    setAllMeetings(response.data.allMeetings || []);
    setUserHistory(response.data.userHistory || []);
    setStats(response.data.stats);
    
  } catch (error) {
    console.error('Error filtering by semester:', error);
  } finally {
    setLoading(false);
  }
};
  
  // Generate monthly attendance comparison data
  const getMonthlyComparison = () => {
    const months = {};
    
    allMeetings.forEach(meeting => {
      const date = new Date(meeting.eventDate);
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
      
      if (meeting.userAttended) {
        months[monthKey].attendedMeetings++;
      }
    });
    
    return Object.values(months).map(month => ({
      ...month,
      attendanceRate: month.totalMeetings > 0 ? (month.attendedMeetings / month.totalMeetings) * 100 : 0
    }));
  };
  
  // Generate weekly performance data
  const getWeeklyPerformance = () => {
    const weeks = {};
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
    
    const recentMeetings = allMeetings.filter(meeting => 
      new Date(meeting.eventDate) >= eightWeeksAgo
    );
    
    recentMeetings.forEach(meeting => {
      const date = new Date(meeting.eventDate);
      const weekNum = Math.ceil(date.getDate() / 7);
      const weekKey = `Week ${weekNum}`;
      
      if (!weeks[weekKey]) {
        weeks[weekKey] = { 
          week: weekKey, 
          totalMeetings: 0, 
          attendedMeetings: 0,
          attendance: 0
        };
      }
      weeks[weekKey].totalMeetings++;
      
      if (meeting.userAttended) {
        weeks[weekKey].attendedMeetings++;
      }
    });
    
    return Object.values(weeks).map(week => ({
      ...week,
      attendance: week.totalMeetings > 0 ? (week.attendedMeetings / week.totalMeetings) * 100 : 0
    }));
  };
  
  // Generate monthly trend data
  const getMonthlyTrend = () => {
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const months = {};
    
    allMeetings.forEach(meeting => {
      const date = new Date(meeting.eventDate);
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
      
      if (meeting.userAttended) {
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
  
  // Performance metrics - FIXED version
  const getPerformanceMetrics = () => {
    const totalMeetings = stats?.totalMeetings || 0;
    const attendedMeetings = stats?.attendedMeetings || 0;
    
    const attendanceScore = totalMeetings > 0 ? (attendedMeetings / totalMeetings) * 100 : 0;
    
    // Simple consistency = attendance rate (accurate)
    const consistencyScore = attendanceScore;
    
    // Timeliness (100% if they attended at least once)
    const timelinessScore = attendedMeetings > 0 ? 100 : 0;
    
    const overallScore = (attendanceScore + consistencyScore + timelinessScore) / 3;
    
    return {
      attendanceScore: Math.round(attendanceScore),
      consistencyScore: Math.round(consistencyScore),
      timelinessScore: Math.round(timelinessScore),
      overallScore: Math.round(overallScore)
    };
  };
  
  const filteredMeetings = getFilteredMeetings();
  const weeklyData = getWeeklyPerformance();
  const monthlyData = getMonthlyTrend();
  const metrics = getPerformanceMetrics();
  
  const totalMeetings = stats?.totalMeetings || 0;
  const attendedMeetings = stats?.attendedMeetings || 0;
  const missedMeetings = stats?.missedMeetings || 0;
  const attendanceRate = stats?.attendanceRate || 0;
  const upcomingMeetings = stats?.upcomingMeetings || 0;
  
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
  
  // Get first name only
  const firstName = userName.split(' ')[0] || 'Member';
  
  return (
    <div className="attendance-history-page">
     <div className="page-header">
  <button className="back-btn" onClick={() => navigate('/dashboard')}>
    <ArrowLeft size={20} /> Back
  </button>
  
  <div className="header-text">
    <h1>
      Hey, <span className="user-name">{firstName}</span>!
      <span className="title-split"> This is your zuca attendance history & analysis</span>
    </h1>
  </div>
  
  <div className="header-right">
    {currentSemester && (
      <div className="semester-badge">
        <CalendarIcon size={16} />
        <span className="semester-period">{currentSemester.period?.display || currentSemester.title}</span>
        <span className="semester-status">Current</span>
      </div>
    )}

   

    <div className="semester-filter-section">
  <div className="filter-group">
    <label htmlFor="semester-select"><FaCalendarAlt></FaCalendarAlt> Semester:</label>
    <select 
      id="semester-select"
      value={selectedSemester} 
      onChange={(e) => handleSemesterChange(e.target.value)}
      className="semester-select"
    >
      <option value="current">Current Semester</option>
      <option value="all">All Time</option>
      {semesters.map(sem => (
        <option key={sem.id} value={sem.id}>
          {sem.period?.display || sem.title}
          {sem.isCurrent && ' (Current)'}
        </option>
      ))}
    </select>
  </div>
</div>
    <div className="semester-badge">
      <Target size={16} />
      <span>Current Semester</span>
    </div>
  </div>
</div>
      
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading your performance data...</p>
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
              <div className="stat-icon"></div>
              <div className="stat-value">{totalMeetings}</div>
              <div className="stat-label">Total Meetings</div>
              <div className="stat-trend">All time</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"></div>
              <div className="stat-value">{attendanceRate}%</div>
              <div className="stat-label">Attendance Rate</div>
              <div className="stat-trend positive">{attendedMeetings} of {totalMeetings}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"></div>
              <div className="stat-value">{missedMeetings}</div>
              <div className="stat-label">Missed Meetings</div>
              <div className="stat-trend">{upcomingMeetings} upcoming</div>
            </div>
          </div>
          
          {/* Chart Navigation */}
          <div className="chart-nav">
            <button className={`chart-nav-btn ${activeChart === 'trend' ? 'active' : ''}`} onClick={() => setActiveChart('trend')}>
              <BarChart3 size={16} /> Monthly Trend
            </button>
            <button className={`chart-nav-btn ${activeChart === 'weekly' ? 'active' : ''}`} onClick={() => setActiveChart('weekly')}>
              <TrendingUp size={16} /> Weekly Progress
            </button>
            <button className={`chart-nav-btn ${activeChart === 'radial' ? 'active' : ''}`} onClick={() => setActiveChart('radial')}>
              <Award size={16} /> Performance Metrics
            </button>
          </div>
          
          {/* Charts Section */}
          <div className="charts-container">
            {activeChart === 'trend' && monthlyData.length > 0 && (
              <div className="chart-card">
                <div className="chart-header">
                  <h3>Monthly Attendance Trend</h3>
                  <p>Your attendance compared to total meetings each month</p>
                </div>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" />
                    <YAxis stroke="#64748b" domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="attendanceRate" stroke="#10b981" strokeWidth={3} name="Your Attendance Rate" dot={{ fill: '#10b981', r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="chart-insight">
                  💡 You've attended {attendedMeetings} out of {totalMeetings} total meetings ({attendanceRate}% attendance rate)
                </div>
              </div>
            )}
            
            {activeChart === 'weekly' && weeklyData.length > 0 && (
              <div className="chart-card">
                <div className="chart-header">
                  <h3>Weekly Performance Breakdown</h3>
                  <p>Week-by-week analysis of your attendance</p>
                </div>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="week" stroke="#64748b" />
                    <YAxis stroke="#64748b" domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="attendance" fill="#10b981" name="Your Attendance" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="chart-insight">
                  🎯 {attendanceRate >= 80 ? "Excellent attendance! Keep it up!" : attendanceRate >= 60 ? "Good effort! Try to attend more meetings." : "Let's improve your attendance in coming weeks!"}
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
          
          {/* Meetings List */}
          <div className="meetings-list">
            <div className="history-header">
              <h3>All Meetings & Attendance Status</h3>
              <span className="history-count">{filteredMeetings.length} total meetings</span>
            </div>
            {filteredMeetings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><FiFileText/></div>
                <h3>No Meetings Found</h3>
                <p>No meetings have been scheduled yet.</p>
              </div>
            ) : (
              filteredMeetings.map(meeting => (
                <div key={meeting.id} className={`meeting-item ${meeting.userAttended ? 'attended' : 'missed'}`}>
                  <div className="meeting-icon">
                    {meeting.userAttended ? (
                      <CheckCircle size={24} className="success-icon" />
                    ) : (
                      <XCircle size={24} className="missed-icon" />
                    )}
                  </div>
                  <div className="meeting-details">
                    <div className="meeting-title">{meeting.title}</div>
                    <div className="meeting-meta">
                      <span><Calendar size={12} /> {new Date(meeting.eventDate).toLocaleDateString()}</span>
                      <span><Clock size={12} /> {meeting.eventTime || 'Time TBD'}</span>
                      <span><MapPin size={12} /> {meeting.location || 'ZUCA'}</span>
                    </div>
                    <div className="meeting-status">
                      <span className={`status-badge ${meeting.userAttended ? 'present' : 'absent'}`}>
                        {meeting.userAttended ? 'Present' : 'Absent'}
                      </span>
                      {meeting.userAttended && meeting.userSignMethod && (
                        <span className={`method-badge ${meeting.userSignMethod?.toLowerCase()}`}>
                          Checked in via {meeting.userSignMethod === 'SELF' ? 'Self' : 
                           meeting.userSignMethod === 'QR_CODE' ? 'QR Code' : 'Manual'}
                        </span>
                      )}
                      {meeting.totalAttendees > 0 && (
                        <span className="attendees-count">
                          👥 {meeting.totalAttendees} attended
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={18} className="meeting-arrow" />
                </div>
              ))
            )}
          </div>
        </>
      )}
      
      <style>{`
        .attendance-history-page {
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
          background: black;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .back-btn:hover {
          background: #606264;
          transform: translateX(-2px);
        }
        .header-text {
          text-align: center;
          flex: 1;
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
        .semester-badge {
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
          background: grey;
          border: 1px solid #e2e8f000;
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
        .meetings-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 20px;
        }
        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
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
        .meeting-item {
          display: flex;
          align-items: center;
          gap: 16px;
          background: white;
          padding: 16px;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          transition: all 0.2s;
        }
        .meeting-item:hover {
          transform: translateX(4px);
        }
        .meeting-item.attended {
          border-left: 4px solid #22c55e;
        }
        .meeting-item.missed {
          border-left: 4px solid #ef4444;
        }
        .success-icon { color: #22c55e; }
        .missed-icon { color: #ef4444; }
        .meeting-details { flex: 1; }
        .meeting-title { font-weight: 600; margin-bottom: 8px; }
        .meeting-meta { display: flex; gap: 16px; font-size: 12px; color: #64748b; margin-bottom: 8px; }
        .meeting-status { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .status-badge { font-size: 10px; padding: 2px 10px; border-radius: 20px; }
        .status-badge.present { background: #dcfce7; color: #059669; }
        .status-badge.absent { background: #fee2e2; color: #dc2626; }
        .method-badge { font-size: 10px; padding: 2px 10px; border-radius: 20px; }
        .method-badge.self { background: #dbeafe; color: #2563eb; }
        .method-badge.qr_code { background: #dcfce7; color: #059669; }
        .method-badge.manual { background: #fef3c7; color: #d97706; }
        .attendees-count { font-size: 10px; color: #64748b; }
        .meeting-arrow { color: #94a3b8; }
        .empty-state { text-align: center; padding: 60px 20px; background: white; border-radius: 24px; }
        .empty-icon { font-size: 64px; margin-bottom: 16px; }
        .empty-state h3 { margin-bottom: 8px; }
        .empty-state p { color: #64748b; margin-bottom: 20px; }
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
          .overall-score-card {
            flex-direction: column;
            text-align: center;
          }
          .score-details {
            width: 100%;
          }
          .radial-charts-container {
            grid-template-columns: 1fr;
          }
          .meeting-meta {
            flex-wrap: wrap;
          }
          .title-split {
            display: block;
            font-size: 14px;
            margin-top: 4px;
          }
        }

        .header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.semester-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: white;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  color: #1e293b;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  white-space: nowrap;
}

.semester-badge .semester-period {
  color: #1e293b;
  font-weight: 500;
}

.semester-badge .semester-status {
  background: #10b981;
  color: white;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.semester-badge:last-child {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #3b82f6;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .header-right {
    width: 100%;
    justify-content: center;
    margin-top: 8px;
  }
  
  .semester-badge {
    font-size: 11px;
    padding: 4px 10px;
  }
  
  .semester-badge .semester-period {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  /* ... existing mobile styles ... */
}

/* Semester Filter Section */
.semester-filter-section {
  margin-bottom: 20px;
  padding: 16px 20px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-group label {
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  white-space: nowrap;
}

.semester-select {
  padding: 8px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  color: #1e293b;
  cursor: pointer;
  min-width: 200px;
  transition: all 0.2s;
}

.semester-select:hover {
  border-color: #94a3b8;
}

.semester-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.semester-select option {
  padding: 8px;
}

@media (max-width: 768px) {
  .semester-filter-section {
    flex-direction: column;
    align-items: stretch;
    padding: 12px 16px;
  }
  
  .filter-group {
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
  }
  
  .semester-select {
    width: 100%;
    min-width: unset;
  }
}

  /* Download Report Button */
.download-report-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  font-size: 13px;
  transition: all 0.2s;
  white-space: nowrap;
}

.download-report-btn:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.download-report-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.download-report-btn svg {
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .download-report-btn {
    width: 100%;
    justify-content: center;
    padding: 10px 16px;
  }
}
      `}</style>
    </div>
  );
}