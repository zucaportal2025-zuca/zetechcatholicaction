import React, { useState, useEffect } from 'react';
import { api } from '../../../api';
import io from 'socket.io-client';
import BASE_URL from '../../../api';  // ← ADD THIS LINE
import { useNavigate } from 'react-router-dom';
import { saveAs } from 'file-saver';
import SettingsModal from './SettingsModal';


// Icons - REMOVED Wifi
import { 
  Plus, Eye, Bell, Lock, Download, Settings, 
  Trash2, Edit2, Search, RefreshCw, X,
  Calendar, MapPin, Clock, Users, FileText, CheckCircle,
  Filter, ChevronDown, QrCode
} from 'lucide-react';

// Child Components
import CreateSheetModal from './CreateSheetModal';
import QRCodeModal from './QRCodeModal';
import { FaAcquisitionsIncorporated, FaCalculator, FaCalendarAlt, FaGalacticRepublic, FaRegCalendarCheck, FaUser, FaUsers } from 'react-icons/fa';

export default function AdminAttendance() {
  // ============ STATE ============
  // Add this at the top of the component (after getting user)
const user = JSON.parse(localStorage.getItem("user") || "{}");
const basePath = (user?.role === "admin" || user?.specialRole === "admin") ? "/admin" : "/secretary";

// Then in the View button, use:

  const [activeTab, setActiveTab] = useState('sheets');
  const [activeSheets, setActiveSheets] = useState([]);
  const [completedSheets, setCompletedSheets] = useState([]);
  const [allEntries, setAllEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedSheetForExport, setSelectedSheetForExport] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const navigate = useNavigate();
  
  // Filter states for Entries tab
  const [entrySearchTerm, setEntrySearchTerm] = useState('');
  const [entryMethodFilter, setEntryMethodFilter] = useState('all'); // all, SELF, MANUAL, QR_CODE
  const [entryRoleFilter, setEntryRoleFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Export options
  const [exportType, setExportType] = useState('full');

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedSheetForSettings, setSelectedSheetForSettings] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedSheetForQR, setSelectedSheetForQR] = useState(null);

  const openSettingsModal = (sheet) => {
    setSelectedSheetForSettings(sheet);
    setShowSettingsModal(true);
  };
  
  // ============ HELPER FUNCTIONS ============
  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };
  
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };
  
  // ============ FETCH DATA ============
  const fetchActiveSheets = async () => {
    try {
      const response = await api.get('/api/attendance/all-sheets', { headers: getHeaders() });
      const allSheets = response.data.sheets || [];
      setActiveSheets(allSheets.filter(s => s.isActive === true));
      setCompletedSheets(allSheets.filter(s => s.isActive === false));
    } catch (error) {
      console.error('Error fetching sheets:', error);
      showToast('Failed to load sheets', 'error');
    }
  };
  
  const fetchAdminStats = async () => {
    try {
      const response = await api.get('/api/attendance/admin/stats', { headers: getHeaders() });
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };
  
  const fetchAllEntries = async () => {
    try {
      const response = await api.get('/api/attendance/all-entries', { headers: getHeaders() });
      setAllEntries(response.data.entries || []);
    } catch (error) {
      console.error('Error fetching entries:', error);
    }
  };
  
  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchActiveSheets(),
      fetchAdminStats(),
      fetchAllEntries()
    ]);
    setLoading(false);
  };
  
  const refreshData = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
    showToast('Data refreshed', 'success');
  };

    // ============ LIVE UPDATES FOR SHEETS LIST ============
  useEffect(() => {
    const socket = io(BASE_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true
    });

    socket.on('connect', () => {
      console.log('📡 Socket connected for attendance list');
    });

    socket.on('attendance_checkin', () => {
      fetchActiveSheets();
      fetchAdminStats();
      fetchAllEntries();
    });

    socket.on('attendance_sheet_closed', () => {
      fetchActiveSheets();
      fetchAdminStats();
    });

    socket.on('attendance_entry_added', () => {
      fetchActiveSheets();
      fetchAdminStats();
      fetchAllEntries();
    });

    socket.on('attendance_entry_deleted', () => {
      fetchActiveSheets();
      fetchAdminStats();
      fetchAllEntries();
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchActiveSheets, fetchAdminStats, fetchAllEntries]);  

  
  
  // ============ FILTER ENTRIES ============
  useEffect(() => {
    let filtered = [...allEntries];
    
    if (entrySearchTerm) {
      filtered = filtered.filter(entry =>
        entry.fullName?.toLowerCase().includes(entrySearchTerm.toLowerCase()) ||
        entry.phoneNumber?.includes(entrySearchTerm) ||
        (entry.user?.membership_number || '').includes(entrySearchTerm)
      );
    }
    
    if (entryMethodFilter !== 'all') {
      filtered = filtered.filter(entry => entry.signMethod === entryMethodFilter);
    }
    
    if (entryRoleFilter !== 'all') {
      filtered = filtered.filter(entry => entry.role === entryRoleFilter);
    }
    
    setFilteredEntries(filtered);
  }, [allEntries, entrySearchTerm, entryMethodFilter, entryRoleFilter]);
  
 // ============ EXPORT FUNCTION ============
const exportToWord = async (sheet, type) => {
  try {
    showToast('Generating report...', 'info');
    
    const response = await api.get(`/api/attendance/sheet/${sheet.id}`, { headers: getHeaders() });
    const sheetData = response.data.sheet;
    
    const presentMembers = sheetData.entries || [];
    const absentMembers = sheetData.absentMembers || [];

    // ✅ Include ALL members (admins included) - NO FILTER
    const totalAll = presentMembers.length + absentMembers.length;
    const attendanceRate = totalAll > 0 ? ((presentMembers.length / totalAll) * 100).toFixed(1) : 0;
    
    // Calculate method counts using ALL present members
    const selfCount = presentMembers.filter(e => e.signMethod === 'SELF').length;
    const qrCount = presentMembers.filter(e => e.signMethod === 'QR_CODE').length;
    const manualCount = presentMembers.filter(e => e.signMethod === 'MANUAL').length;
    
    let htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Attendance Report - ${sheet.title}</title>
  <style>
    body { font-family: 'Times New Roman', Times, serif; margin: 0.5in 0.3in; font-size: 11pt; }
    h1 { font-size: 18pt; text-align: center; }
    h2 { font-size: 14pt; border-bottom: 1px solid #000; margin-top: 20px; }
    .event-details { margin-bottom: 20px; padding: 10px; background: #f5f5f5; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { border: 1px solid #999; padding: 8px; text-align: left; }
    th { background: #e0e0e0; font-weight: bold; }
    tr:nth-child(even) { background: #f9f9f9; }
    .footer { margin-top: 30px; text-align: center; font-size: 9pt; border-top: 1px solid #ccc; padding-top: 10px; }
    .signature { margin-top: 30px; display: flex; justify-content: space-between; }
    .summary { margin-top: 20px; padding: 10px; background: #f5f5f5; border: 1px solid #ccc; }
    .summary p { margin: 5px 0; }
  </style>
</head>
<body>
  <h1>ZETECH CATHOLIC ACTION (ZUCA)</h1>
  <h2>OFFICIAL ATTENDANCE REPORT</h2>
  
  <div class="event-details">
    <strong>Event:</strong> ${sheet.title}<br>
    <strong>Date:</strong> ${new Date(sheet.eventDate).toLocaleDateString()}<br>
    <strong>Time:</strong> ${sheet.eventTime || '4:30 PM'}<br>
    <strong>Location:</strong> ${sheet.location || 'ZUCA'}<br>
    <strong>Status:</strong> ${sheet.isActive ? 'ACTIVE' : 'CLOSED'}
  </div>`;
    
    if (type === 'full' || type === 'present') {
      htmlContent += `<h2>PRESENT MEMBERS (${presentMembers.length})</h2>
<table>
  <thead>
    <tr>
      <th>#</th>
      <th>Membership #</th>
      <th>Name</th>
      <th>Phone</th>
      <th>Position</th>
      <th>Method</th>
      <th>Time</th>
    </tr>
  </thead>
  <tbody>`;
      
      presentMembers.forEach((member, index) => {
        const position = member.executivePosition || member.role || 'Member';
        let methodText = '';
        if (member.signMethod === 'SELF') methodText = 'Self';
        else if (member.signMethod === 'QR_CODE') methodText = 'QR Code';
        else if (member.signMethod === 'MANUAL') methodText = 'Manual';
        else methodText = '-';
        
        htmlContent += `<tr>
          <td>${index + 1}</td>
          <td>${member.user?.membership_number || member.membershipNumber || '-'}</td>
          <td>${member.fullName}</td>
          <td>${member.phoneNumber || member.phone || '-'}</td>
          <td>${position}</td>
          <td>${methodText}</td>
          <td>${member.signTime ? new Date(member.signTime).toLocaleTimeString() : '-'}</td>
        </tr>`;
      });
      
      htmlContent += `</tbody>
</table>`;
    }
    
    if (type === 'full') {
      htmlContent += `<h2>SIGN METHOD BREAKDOWN</h2>
<table>
  <thead>
    <tr><th>Method</th><th>Count</th><th>Percentage</th></tr>
  </thead>
  <tbody>
    <tr><td>Self Check-in</td><td>${selfCount}</td><td>${presentMembers.length > 0 ? ((selfCount / presentMembers.length) * 100).toFixed(1) : 0}%</td></tr>
    <tr><td>QR Code</td><td>${qrCount}</td><td>${presentMembers.length > 0 ? ((qrCount / presentMembers.length) * 100).toFixed(1) : 0}%</td></tr>
    <tr><td>Manual (Admin)</td><td>${manualCount}</td><td>${presentMembers.length > 0 ? ((manualCount / presentMembers.length) * 100).toFixed(1) : 0}%</td></tr>
  </tbody>
</table>`;
    }
    
    if (type === 'full' || type === 'absent') {
      htmlContent += `<h2>ABSENT MEMBERS (${absentMembers.length})</h2>
<table>
  <thead>
    <tr>
      <th>#</th>
      <th>Membership #</th>
      <th>Name</th>
      <th>Phone</th>
      <th>Position</th>
    </tr>
  </thead>
  <tbody>`;
      
      absentMembers.forEach((member, index) => {
        const position = member.executivePosition || member.role || 'Member';
        htmlContent += `<tr>
          <td>${index + 1}</td>
          <td>${member.membership_number || '-'}</td>
          <td>${member.fullName}</td>
          <td>${member.phone || '-'}</td>
          <td>${position}</td>
        </tr>`;
      });
      
      htmlContent += `</tbody>
</table>`;
    }
    
    htmlContent += `
  <div class="summary">
    <p><strong>SUMMARY</strong></p>
    <p>• Total Members: ${totalAll}</p>
    <p>• Present: ${presentMembers.length}</p>
    <p>• Absent: ${absentMembers.length}</p>
    <p>• Attendance Rate: ${attendanceRate}%</p>
  </div>
  <div class="signature">
    <div>Recorded by: ZUCA ADMIN</div>
    <div>Date: ${new Date().toLocaleDateString()}</div>
  </div>
  <div class="footer">ZUCA - Zetech University Catholic Action</div>
</body>
</html>`;
    
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const fileName = `Attendance_${type}_${sheet.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.doc`;
    saveAs(blob, fileName);
    showToast('Report exported successfully!', 'success');
    
  } catch (error) {
    console.error('Export error:', error);
    showToast('Failed to export report', 'error');
  }
};
  const handleDeletePastSheet = async (sheetId, sheetTitle) => {
    if (!window.confirm(`Delete "${sheetTitle}" permanently? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/attendance/sheet/${sheetId}`, { headers: getHeaders() });
      showToast('Sheet deleted successfully!', 'success');
      fetchActiveSheets();
      fetchAdminStats();
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to delete sheet', 'error');
    }
  };

  const handleReopenSheet = async (sheetId, sheetTitle) => {
    if (!window.confirm(`Reopen "${sheetTitle}"? This will allow members to check in again.`)) return;
    try {
      await api.post(`/api/attendance/sheet/${sheetId}/reopen`, {}, { headers: getHeaders() });
      showToast('Sheet reopened successfully!', 'success');
      fetchActiveSheets();
      fetchAdminStats();
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to reopen sheet', 'error');
    }
  };

  
  
  // ============ ACTIONS ============
  const handleCreateSheet = async (sheetData) => {
    try {
      await api.post('/api/attendance/sheet', sheetData, { headers: getHeaders() });
      showToast('Attendance sheet created successfully!');
      fetchActiveSheets();
      fetchAdminStats();
      setShowCreateModal(false);
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to create sheet', 'error');
    }
  };
  
  const handleCloseSheet = async (sheetId) => {
    if (!window.confirm('Close this sheet? No more check-ins will be accepted.')) return;
    try {
      await api.post(`/api/attendance/sheet/${sheetId}/close`, {}, { headers: getHeaders() });
      showToast('Sheet closed successfully');
      fetchActiveSheets();
      fetchAdminStats();
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to close sheet', 'error');
    }
  };

  const openQRModal = (sheet) => {
    setSelectedSheetForQR(sheet);
    setShowQRModal(true);
  };
  
  // ============ INITIAL LOAD ============
  useEffect(() => {
    fetchAllData();
  }, []);
  
  // ============ SKELETON LOADING ============
  const SkeletonLoader = () => (
    <div className="skeleton-wrapper">
      <div className="skeleton-header"><div className="skeleton-title"></div><div className="skeleton-button"></div></div>
      <div className="stats-cards skeleton">
        {[1,2,3,4].map(i => (<div key={i} className="stat-card skeleton"><div className="skeleton-icon"></div><div className="skeleton-info"><div className="skeleton-value"></div><div className="skeleton-label"></div></div></div>))}
      </div>
      <div className="tabs skeleton"><div className="skeleton-tab"></div><div className="skeleton-tab"></div><div className="skeleton-tab"></div></div>
      <div className="section-title skeleton"><div className="skeleton-heading"></div></div>
      {[1,2,3].map(i => (<div key={i} className="sheet-card skeleton"><div className="skeleton-sheet-header"><div className="skeleton-sheet-title"></div><div className="skeleton-badge"></div></div><div className="skeleton-sheet-details"><div className="skeleton-detail"></div><div className="skeleton-detail"></div><div className="skeleton-detail"></div></div><div className="skeleton-progress"><div className="skeleton-progress-bar"></div></div><div className="skeleton-actions"><div className="skeleton-action-btn"></div><div className="skeleton-action-btn"></div><div className="skeleton-action-btn"></div><div className="skeleton-action-btn"></div></div></div>))}
    </div>
  );
  
  if (loading) {
    return (<div className="admin-attendance"><SkeletonLoader /><style>{`
      .skeleton-wrapper { padding: 24px; background: #f5f5f5; min-height: 100vh; }
      .skeleton-header { display: flex; justify-content: space-between; margin-bottom: 24px; }
      .skeleton-title { width: 200px; height: 32px; background: linear-gradient(90deg,#e0e0e0 25%,#f0f0f0 50%,#e0e0e0 75%); background-size: 200% 100%; animation: skeleton-wave 1.5s infinite; border-radius: 8px; }
      .skeleton-button { width: 100px; height: 40px; background: linear-gradient(90deg,#e0e0e0 25%,#f0f0f0 50%,#e0e0e0 75%); background-size: 200% 100%; animation: skeleton-wave 1.5s infinite; border-radius: 8px; }
      .stats-cards.skeleton { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-bottom: 24px; }
      .stat-card.skeleton { display: flex; align-items: center; gap: 12px; padding: 16px; background: white; border-radius: 12px; border: 1px solid #e0e0e0; }
      .skeleton-icon { width: 48px; height: 48px; background: linear-gradient(90deg,#e0e0e0 25%,#f0f0f0 50%,#e0e0e0 75%); background-size: 200% 100%; animation: skeleton-wave 1.5s infinite; border-radius: 12px; }
      .skeleton-info { flex: 1; }
      .skeleton-value { width: 60px; height: 28px; background: linear-gradient(90deg,#e0e0e0 25%,#f0f0f0 50%,#e0e0e0 75%); background-size: 200% 100%; animation: skeleton-wave 1.5s infinite; border-radius: 6px; margin-bottom: 8px; }
      .skeleton-label { width: 80px; height: 14px; background: linear-gradient(90deg,#e0e0e0 25%,#f0f0f0 50%,#e0e0e0 75%); background-size: 200% 100%; animation: skeleton-wave 1.5s infinite; border-radius: 4px; }
      .tabs.skeleton { display: flex; gap: 8px; margin-bottom: 24px; border-bottom: 1px solid #e0e0e0; padding-bottom: 8px; }
      .skeleton-tab { width: 80px; height: 36px; background: linear-gradient(90deg,#e0e0e0 25%,#f0f0f0 50%,#e0e0e0 75%); background-size: 200% 100%; animation: skeleton-wave 1.5s infinite; border-radius: 20px; }
      .skeleton-heading { width: 150px; height: 24px; background: linear-gradient(90deg,#e0e0e0 25%,#f0f0f0 50%,#e0e0e0 75%); background-size: 200% 100%; animation: skeleton-wave 1.5s infinite; border-radius: 6px; }
      .sheet-card.skeleton { background: white; border-radius: 12px; padding: 16px; margin-bottom: 12px; border: 1px solid #e0e0e0; }
      .skeleton-sheet-title { width: 200px; height: 20px; background: linear-gradient(90deg,#e0e0e0 25%,#f0f0f0 50%,#e0e0e0 75%); background-size: 200% 100%; animation: skeleton-wave 1.5s infinite; border-radius: 4px; }
      .skeleton-badge { width: 60px; height: 20px; background: linear-gradient(90deg,#e0e0e0 25%,#f0f0f0 50%,#e0e0e0 75%); background-size: 200% 100%; animation: skeleton-wave 1.5s infinite; border-radius: 20px; }
      .skeleton-detail { width: 100px; height: 16px; background: linear-gradient(90deg,#e0e0e0 25%,#f0f0f0 50%,#e0e0e0 75%); background-size: 200% 100%; animation: skeleton-wave 1.5s infinite; border-radius: 4px; }
      .skeleton-progress-bar { width: 100%; height: 6px; background: linear-gradient(90deg,#e0e0e0 25%,#f0f0f0 50%,#e0e0e0 75%); background-size: 200% 100%; animation: skeleton-wave 1.5s infinite; border-radius: 3px; }
      .skeleton-action-btn { width: 60px; height: 30px; background: linear-gradient(90deg,#e0e0e0 25%,#f0f0f0 50%,#e0e0e0 75%); background-size: 200% 100%; animation: skeleton-wave 1.5s infinite; border-radius: 6px; }
      @keyframes skeleton-wave { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
    `}</style></div>);
  }
  
  return (
    <div className="admin-attendance">
      {toast.show && (<div className={`toast-notification ${toast.type}`}><span>{toast.message}</span></div>)}
      
      <div className="attendance-header">
        <h1>Attendance Management</h1>
        <button className="refresh-btn" onClick={refreshData} disabled={refreshing}>
          <RefreshCw size={18} className={refreshing ? 'spinning' : ''} /> Refresh
        </button>
      </div>
      
      <div className="stats-cards">
        <div className="stat-card"><div className="stat-icon"><FileText size={24} /></div><div className="stat-info"><div className="stat-value">{stats?.totalSheets || 0}</div><div className="stat-label">Total Sheets</div></div></div>
        <div className="stat-card"><div className="stat-icon"><Users size={24} /></div><div className="stat-info"><div className="stat-value">{stats?.totalEntries || 0}</div><div className="stat-label">Total Check-ins</div></div></div>
        <div className="stat-card"><div className="stat-icon"><CheckCircle size={24} /></div><div className="stat-info"><div className="stat-value">{stats?.activeSheets || 0}</div><div className="stat-label">Active Sheets</div></div></div>
        <div className="stat-card"><div className="stat-icon"><Plus size={24} /></div><div className="stat-info"><button className="create-btn" onClick={() => setShowCreateModal(true)}>+ New Sheet</button></div></div>
      </div>
      
      <div className="tabs">
        <button className={`tab ${activeTab === 'sheets' ? 'active' : ''}`} onClick={() => setActiveTab('sheets')}>📋 Sheets</button>
        <button className={`tab ${activeTab === 'entries' ? 'active' : ''}`} onClick={() => setActiveTab('entries')}>👥 All Entries</button>
        <button className={`tab ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => navigate('/admin/attendance/overview')}><FaUsers /> Attendance Overview</button>
      </div>
      
      {/* TAB 1: SHEETS */}
      {activeTab === 'sheets' && (
        <div className="sheets-tab">
          <div className="section"><h2><FaGalacticRepublic /> Active Sheets ({activeSheets.length})</h2>
            <div className="sheets-list">{activeSheets.length === 0 ? <div className="empty-state">No active sheets</div> : activeSheets.map(sheet => (
              <div key={sheet.id} className="sheet-card active">
                <div className="sheet-header"><h3>{sheet.title}</h3><span className="status-badge live">● LIVE</span></div>
                <div className="sheet-details"><span><Calendar size={14} /> {new Date(sheet.eventDate).toLocaleDateString()}</span><span><Clock size={14} /> {sheet.eventTime || '4:30 PM'}</span><span><MapPin size={14} /> {sheet.location || 'ZUCA'}</span></div>
                <div className="sheet-progress"><div className="progress-bar"><div className="progress-fill" style={{ width: `${((sheet._count?.entries || 0) / (sheet.totalMembers || 100)) * 100}%` }}></div></div><span>{sheet._count?.entries || 0} checked in</span></div>
               <div className="sheet-actions">
                  <button onClick={() => navigate(`${basePath}/attendance/sheet/${sheet.id}`)}><Eye size={16} /> View</button>
                  <button onClick={() => handleCloseSheet(sheet.id)}><Lock size={16} /> Close</button>
                  <button onClick={() => openQRModal(sheet)}><QrCode size={16} /> QR Code</button>  
                  <button onClick={() => openSettingsModal(sheet)}><Settings size={16} /> Settings</button>
                  <button><Bell size={16} /> Remind</button>
                  <button onClick={() => { setSelectedSheetForExport(sheet); setShowExportModal(true); }}><Download size={16} /> Export</button>
                </div>
              </div>
            ))}</div>
          </div>
          <div className="section">
            <h2><FaRegCalendarCheck /> Past Sheets ({completedSheets.length})</h2>
            <div className="sheets-list">
              {completedSheets.length === 0 ? (
                <div className="empty-state">No past sheets</div>
              ) : (
                completedSheets.map(sheet => (
                  <div key={sheet.id} className="sheet-card completed">
                    <div className="sheet-header">
                      <h3>{sheet.title}</h3>
                      <span className="status-badge completed">📅 PAST</span>
                    </div>
                    <div className="sheet-details">
                      <span><Calendar size={14} /> {new Date(sheet.eventDate).toLocaleDateString()}</span>
                      <span><MapPin size={14} /> {sheet.location || 'ZUCA'}</span>
                    </div>
                    <div className="sheet-actions">
                      <button onClick={() => navigate(`${basePath}/attendance/sheet/${sheet.id}`)}>
                        <Eye size={16} /> View Report
                      </button>
                      <button onClick={() => handleReopenSheet(sheet.id, sheet.title)} className="reopen-btn">
                        <RefreshCw size={16} /> Reopen
                      </button>
                      <button onClick={() => { setSelectedSheetForExport(sheet); setShowExportModal(true); }}>
                        <Download size={16} /> Download
                      </button>
                      <button onClick={() => handleDeletePastSheet(sheet.id, sheet.title)} className="delete-btn">
                        <Trash2 size={16} /> Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* TAB 2: ALL ENTRIES WITH FILTERS */}
      {activeTab === 'entries' && (
        <div className="entries-tab">
          <div className="search-filter-bar">
            <div className="search-bar"><Search size={16} /><input type="text" placeholder="Search by name, phone, or membership..." value={entrySearchTerm} onChange={(e) => setEntrySearchTerm(e.target.value)} /></div>
            <button className="filter-btn" onClick={() => setShowFilters(!showFilters)}><Filter size={16} /> Filters <ChevronDown size={14} /></button>
          </div>
          {showFilters && (<div className="filters-panel">
            <div className="filter-group"><label>Check-in Method</label>
              <select value={entryMethodFilter} onChange={(e) => setEntryMethodFilter(e.target.value)}>
                <option value="all">All Methods</option>
                <option value="SELF">Self Check-in</option>
                <option value="QR_CODE">QR Code</option>
                <option value="MANUAL">Manual</option>
              </select>
            </div>
            <div className="filter-group"><label>Role</label>
              <select value={entryRoleFilter} onChange={(e) => setEntryRoleFilter(e.target.value)}>
                <option value="all">All Roles</option>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="treasurer">Treasurer</option>
                <option value="secretary">Secretary</option>
                <option value="jumuia_leader">Jumuia Leader</option>
              </select>
            </div>
            {(entryMethodFilter !== 'all' || entryRoleFilter !== 'all' || entrySearchTerm) && (<button className="clear-filters" onClick={() => { setEntrySearchTerm(''); setEntryMethodFilter('all'); setEntryRoleFilter('all'); }}>Clear Filters</button>)}
          </div>)}
          <div className="entries-table">
            <table><thead><tr><th>Name</th><th>Membership #</th><th>Phone</th><th>Role</th><th>Meeting</th><th>Method</th><th>Time</th><th>Actions</th></tr></thead>
            <tbody>{filteredEntries.slice(0,50).map(entry => (
              <tr key={entry.id}>
                <td><strong>{entry.fullName}</strong></td>
                <td>{entry.user?.membership_number || '-'}</td>
                <td>{entry.phoneNumber || '-'}</td>
                <td>{entry.role}</td>
                <td>{entry.sheet?.title || '-'}</td>
                <td><span className={`method-badge ${entry.signMethod?.toLowerCase()}`}>{entry.signMethod === 'QR_CODE' ? 'QR Code' : entry.signMethod}</span></td>
                <td>{new Date(entry.signTime).toLocaleTimeString()}</td>
                <td><button className="icon-btn"><Edit2 size={14} /></button><button className="icon-btn danger"><Trash2 size={14} /></button></td>
              </tr>
            ))}</tbody></table>
            {filteredEntries.length === 0 && <div className="empty-state">No entries found</div>}
          </div>
        </div>
      )}
      
      {/* TAB 3: STATISTICS */}
      {activeTab === 'stats' && (
        <div className="stats-tab"><div className="stats-summary"><div className="summary-card"><h3>Total Attendance Rate</h3><div className="big-number">{stats?.totalSheets ? Math.round((stats.totalEntries / (stats.totalSheets * 100)) * 100) : 0}%</div></div><div className="summary-card"><h3>Average per Sheet</h3><div className="big-number">{stats?.totalSheets ? Math.round(stats.totalEntries / stats.totalSheets) : 0}</div></div></div></div>
      )}
      
      {/* Modals */}
      {showCreateModal && (<CreateSheetModal onClose={() => setShowCreateModal(false)} onCreate={handleCreateSheet} />)}
      
      {/* Export Modal */}
      {showExportModal && selectedSheetForExport && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="export-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Export Report</h3><button className="close-btn" onClick={() => setShowExportModal(false)}><X size={20} /></button></div>
            <div className="modal-body">
              <div className="export-option-group"><label>Report Type</label>
                <div className="radio-group">
                  <label className="radio-label"><input type="radio" name="exportType" value="full" checked={exportType === 'full'} onChange={() => setExportType('full')} /> <span>📄 Full Report (All members + stats)</span></label>
                  <label className="radio-label"><input type="radio" name="exportType" value="present" checked={exportType === 'present'} onChange={() => setExportType('present')} /> <span>✅ Present Members Only</span></label>
                  <label className="radio-label"><input type="radio" name="exportType" value="absent" checked={exportType === 'absent'} onChange={() => setExportType('absent')} /> <span>❌ Absent Members Only</span></label>
                </div>
              </div>
              <div className="export-preview"><p><strong>Preview:</strong> {exportType === 'full' ? 'Full report with all sections' : exportType === 'present' ? 'Present members list only' : 'Absent members list only'}</p><p>Includes: Membership Number, Name, Phone, Role{exportType === 'full' ? ', Method, Time' : ''}</p></div>
            </div>
            <div className="modal-footer"><button className="btn-secondary" onClick={() => setShowExportModal(false)}>Cancel</button><button className="btn-primary" onClick={() => { exportToWord(selectedSheetForExport, exportType); setShowExportModal(false); }}><Download size={16} /> Export</button></div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && selectedSheetForSettings && (
        <SettingsModal
          sheet={selectedSheetForSettings}
          onClose={() => {
            setShowSettingsModal(false);
            setSelectedSheetForSettings(null);
          }}
          onUpdate={() => {
            fetchActiveSheets();
            fetchAdminStats();
          }}
        />
      )}

      {/* QR Code Modal  */}
      {showQRModal && selectedSheetForQR && (
        <QRCodeModal
          sheet={selectedSheetForQR}
          onClose={() => {
            setShowQRModal(false);
            setSelectedSheetForQR(null);
          }}
        />
      )}
      
      <style>{`
        .admin-attendance { padding: 24px; background: #f5f5f5; min-height: 100vh; }
        .attendance-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .attendance-header h1 { font-size: 24px; font-weight: 600; color: #1a1a1a; margin: 0; }
        .refresh-btn { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: white; border: 1px solid #e0e0e0; border-radius: 8px; cursor: pointer; }
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .stats-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
        .stat-card { background: white; border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 12px; border: 1px solid #e0e0e0; }
        .stat-icon { width: 48px; height: 48px; background: #f0f0f0; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #1a1a1a; }
        .stat-value { font-size: 24px; font-weight: 700; color: #1a1a1a; }
        .stat-label { font-size: 12px; color: #666; }
        .create-btn { background: #1a1a1a; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; }
        .tabs { display: flex; gap: 8px; margin-bottom: 24px; border-bottom: 1px solid #e0e0e0; }
        .tab { padding: 10px 20px; background: none; border: none; cursor: pointer; font-size: 14px; color: #666; border-bottom: 2px solid transparent; }
        .tab.active { color: #1a1a1a; border-bottom-color: #1a1a1a; }
        .section { margin-bottom: 32px; }
        .section h2 { font-size: 18px; margin-bottom: 16px; color: #1a1a1a; }
        .sheets-list { display: flex; flex-direction: column; gap: 12px; }
        .sheet-card { background: white; border-radius: 12px; padding: 16px; border: 1px solid #e0e0e0; }
        .sheet-card.active { border-left: 4px solid #22c55e; }
        .sheet-card.completed { opacity: 0.8; }
        .sheet-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .sheet-header h3 { margin: 0; font-size: 16px; }
        .status-badge { font-size: 12px; padding: 2px 8px; border-radius: 20px; }
        .status-badge.live { background: #dcfce7; color: #22c55e; }
        .status-badge.completed { background: #f0f0f0; color: #666; }

        /* Mobile responsive stats cards - 2 rows on mobile */
        @media (max-width: 640px) {
          .stats-cards {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          .stat-card {
            padding: 12px;
          }
          .stat-value {
            font-size: 18px;
          }
          .stat-icon {
            width: 36px;
            height: 36px;
          }
          .stat-icon svg {
            width: 18px;
            height: 18px;
          }
        }
        
        .sheet-details { display: flex; gap: 16px; font-size: 12px; color: #666; margin-bottom: 12px; }
        .sheet-details span { display: flex; align-items: center; gap: 4px; }
        .sheet-progress { margin-bottom: 12px; }
        .progress-bar { height: 6px; background: #e0e0e0; border-radius: 3px; overflow: hidden; margin-bottom: 4px; }
        .progress-fill { height: 100%; background: #22c55e; border-radius: 3px; }
        .sheet-actions { display: flex; gap: 8px; }
        .sheet-actions button { padding: 6px 12px; background: #f0f0f0; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px; }
        
        /* Mobile responsive sheet actions - 2 columns */
        @media (max-width: 640px) {
          .sheet-actions {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
          .sheet-actions button {
            justify-content: center;
            padding: 8px 12px;
            font-size: 11px;
          }
        }
        
        .entries-table { background: white; border-radius: 12px; overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e0e0e0; }
        th { background: #f8f8f8; font-weight: 600; }
        .method-badge { padding: 2px 8px; border-radius: 20px; font-size: 11px; }
        .method-badge.self { background: #e0f2fe; color: #0284c7; }
        .method-badge.qr_code { background: #dcfce7; color: #22c55e; }
        .method-badge.manual { background: #fef3c7; color: #d97706; }
        .icon-btn { background: none; border: none; cursor: pointer; padding: 4px; }
        .icon-btn.danger { color: #ef4444; }
        .stats-summary { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        .summary-card { background: white; border-radius: 12px; padding: 24px; text-align: center; border: 1px solid #e0e0e0; }
        .big-number { font-size: 48px; font-weight: 700; color: #1a1a1a; margin-top: 8px; }
        .empty-state { text-align: center; padding: 40px; color: #666; background: white; border-radius: 12px; }
        .toast-notification { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); padding: 12px 24px; border-radius: 8px; background: #1a1a1a; color: white; z-index: 1000; animation: slideUp 0.3s ease; }
        .toast-notification.error { background: #ef4444; }
        .toast-notification.success { background: #22c55e; }
        @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        
        /* Export Modal Styles */
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .export-modal { background: white; border-radius: 16px; width: 90%; max-width: 450px; overflow: hidden; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #e0e0e0; }
        .modal-header h3 { margin: 0; font-size: 18px; }
        .close-btn { background: none; border: none; cursor: pointer; }
        .modal-body { padding: 24px; }
        .export-option-group { margin-bottom: 20px; }
        .export-option-group label { display: block; font-weight: 600; margin-bottom: 10px; }
        .radio-group { display: flex; flex-direction: column; gap: 10px; }
        .radio-label { display: flex; align-items: center; gap: 10px; cursor: pointer; }
        .export-preview { background: #f8f8f8; padding: 12px; border-radius: 8px; margin-top: 16px; font-size: 12px; }
        .modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid #e0e0e0; }
        .btn-secondary { padding: 8px 16px; background: #f0f0f0; border: none; border-radius: 6px; cursor: pointer; }
        .btn-primary { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: #1a1a1a; color: white; border: none; border-radius: 6px; cursor: pointer; }
        
        /* Filter Styles */
        .search-filter-bar { display: flex; gap: 12px; margin-bottom: 16px; }
        .search-bar { flex: 1; display: flex; align-items: center; gap: 10px; padding: 8px 16px; background: white; border: 1px solid #e0e0e0; border-radius: 8px; }
        .search-bar input { flex: 1; border: none; background: transparent; outline: none; }
        .filter-btn { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: white; border: 1px solid #e0e0e0; border-radius: 8px; cursor: pointer; }
        .filters-panel { background: white; border: 1px solid #e0e0e0; border-radius: 12px; padding: 16px; margin-bottom: 16px; display: flex; gap: 20px; flex-wrap: wrap; align-items: flex-end; }
        .filter-group { display: flex; flex-direction: column; gap: 6px; }
        .filter-group label { font-size: 12px; font-weight: 500; }
        .filter-group select { padding: 8px 12px; border: 1px solid #e0e0e0; border-radius: 6px; }
        .clear-filters { padding: 8px 16px; background: #f0f0f0; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; }

        .delete-btn {
          background: #fee2e2 !important;
          color: #ef4444 !important;
        }
        .delete-btn:hover {
          background: #fecaca !important;
        }

        .reopen-btn {
          background: #e0f2fe !important;
          color: #0284c7 !important;
        }
        .reopen-btn:hover {
          background: #bae6fd !important;
        }
      `}</style>
    </div>
  );
}