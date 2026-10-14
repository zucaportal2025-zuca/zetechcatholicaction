import React, { useState, useEffect } from 'react';
import { X, Users, CheckCircle, XCircle, Clock, UserPlus, Bell, Edit2, Trash2, Send, RefreshCw, Calendar, MapPin, QrCode, Link2 } from 'lucide-react';
import { api } from '../../../api';
import io from 'socket.io-client';
import AddMemberModal from './AddMemberModal';
import EditMemberModal from './EditMemberModal';
import RemindModal from './RemindModal';
import LiveActivityFeed from './LiveActivityFeed';

// Get BASE_URL from the api.js default export
import BASE_URL from '../../../api';
import ShareLinkModal from './ShareLinkModal';


export default function SheetDetailsModal({ sheet, onClose, onRefresh }) {
  // ============ STATE ============
  const [sheetData, setSheetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('present');
  
  // Modal states
  const [showAddMember, setShowAddMember] = useState(false);
  const [showEditMember, setShowEditMember] = useState(false);
  const [showRemindModal, setShowRemindModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [remindType, setRemindType] = useState('all');
  
  // Search and filter
  const [searchTerm, setSearchTerm] = useState('');
  
  // Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    const [showShareModal, setShowShareModal] = useState(false);
  
  // ============ HELPER FUNCTIONS ============
  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };
  
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };
  
  // ============ FETCH SHEET DATA ============
  const fetchSheetData = async () => {
    try {
      const response = await api.get(`/api/attendance/sheet/${sheet.id}`, { headers: getHeaders() });
      setSheetData(response.data.sheet);
    } catch (error) {
      console.error('Error fetching sheet details:', error);
      showToast('Failed to load sheet details', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const refreshData = async () => {
    setRefreshing(true);
    await fetchSheetData();
  };
  
  // ============ INITIAL LOAD ============
  useEffect(() => {
    fetchSheetData();
    
    const socket = io(BASE_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5
    });
    
    socket.on('connect', () => {
      console.log('Socket connected for sheet:', sheet.id);
      socket.emit('join_attendance_sheet', sheet.id);
    });
    
    socket.on('attendance_checkin', (data) => {
      if (data.sheetId === sheet.id) {
        console.log('New check-in detected, refreshing...');
        fetchSheetData();
      }
    });
    
    socket.on('attendance_sheet_closed', (data) => {
      if (data.sheetId === sheet.id) {
        showToast('This sheet has been closed', 'info');
        fetchSheetData();
      }
    });
    
    return () => {
      socket.emit('leave_attendance_sheet', sheet.id);
      socket.disconnect();
    };
  }, [sheet.id]);
  
  // ============ ACTIONS ============
  const handleAddMember = async (memberData) => {
    try {
      await api.post(`/api/attendance/sheet/${sheet.id}/entry`, memberData, { headers: getHeaders() });
      showToast('Member added successfully!');
      fetchSheetData();
      onRefresh();
      setShowAddMember(false);
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to add member', 'error');
    }
  };
  
  const handleEditMember = async (entryId, data) => {
    try {
      await api.put(`/api/attendance/sheet/${sheet.id}/entry/${entryId}`, data, { headers: getHeaders() });
      showToast('Member updated successfully!');
      fetchSheetData();
      onRefresh();
      setShowEditMember(false);
      setSelectedEntry(null);
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to update member', 'error');
    }
  };
  
const handleMarkAbsent = async (entryId, memberName) => {
  if (!window.confirm(`Mark ${memberName} as absent? They will be removed from present list.`)) return;
  try {
    await api.delete(`/api/attendance/sheet/${sheet.id}/entry/${entryId}`, { headers: getHeaders() });
    showToast(`${memberName} marked as absent`, 'info');
    fetchSheetData();
  } catch (error) {
    showToast(error.response?.data?.error || 'Failed to mark as absent', 'error');
  }
};
  
  const handleMarkPresent = async (userId, fullName) => {
    if (!window.confirm(`Mark ${fullName} as present?`)) return;
    try {
      const userResponse = await api.get(`/api/users`, { headers: getHeaders() });
      const user = userResponse.data.find(u => u.id === userId);
      
      if (user) {
        await api.post(`/api/attendance/sheet/${sheet.id}/entry`, {
          fullName: user.fullName,
          phoneNumber: user.phone,
          role: user.role,
          specialRole: user.specialRole,
          membershipNumber: user.membership_number,
          jumuiaId: user.jumuiaId,
          notes: 'Marked present by admin'
        }, { headers: getHeaders() });
        showToast(`${fullName} marked as present!`);
        fetchSheetData();
        onRefresh();
      }
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to mark present', 'error');
    }
  };
  
  const handleSendReminder = async (userId, customMessage = null) => {
    try {
      await api.post(`/api/attendance/sheet/${sheet.id}/remind/${userId}`, 
        { customMessage }, 
        { headers: getHeaders() }
      );
      showToast('Reminder sent successfully!');
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to send reminder', 'error');
    }
  };
  
  const handleBulkRemind = async (message) => {
    try {
      await api.post(`/api/attendance/sheet/${sheet.id}/remind-all`, 
        { customMessage: message }, 
        { headers: getHeaders() }
      );
      showToast('Reminders sent to all absent members!');
      setShowRemindModal(false);
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to send reminders', 'error');
    }
  };
  
  const handleCloseSheet = async () => {
    if (!window.confirm('Close this sheet? No more check-ins will be accepted.')) return;
    try {
      await api.post(`/api/attendance/sheet/${sheet.id}/close`, {}, { headers: getHeaders() });
      showToast('Sheet closed successfully');
      setTimeout(() => {
        onClose();
        onRefresh();
      }, 1500);
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to close sheet', 'error');
    }
  };
  
  // ============ FILTER DATA ============
  const presentEntries = sheetData?.entries || [];
  const absentEntries = sheetData?.absentMembers || [];
  
  const filteredPresent = presentEntries.filter(entry =>
    entry.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.phoneNumber?.includes(searchTerm)
  );
  
  const filteredAbsent = absentEntries.filter(member =>
    member.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
 // ============ STATS ============
const presentEntries = sheetData?.entries || [];
const absentEntries = sheetData?.absentMembers || [];

// Use backend's totalMembers as the source of truth
const totalExpected = sheetData?.totalMembers || 0;
const totalPresent = presentEntries.length;
const totalAbsent = totalExpected - totalPresent;

const attendanceRate = totalExpected > 0 ? ((totalPresent / totalExpected) * 100).toFixed(1) : 0;

const selfCount = presentEntries.filter(e => e.signMethod === 'SELF').length;
const qrCount = presentEntries.filter(e => e.signMethod === 'QR_CODE').length;
const manualCount = presentEntries.filter(e => e.signMethod === 'MANUAL').length;
  
  // ============ LOADING STATE ============
  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-container loading">
          <div className="loader"></div>
          <p>Loading sheet details...</p>
        </div>
      </div>
    );
  }
  
  // ============ RENDER ============
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container large" onClick={e => e.stopPropagation()}>
        
        {toast.show && (
          <div className={`toast ${toast.type}`}>
            {toast.message}
          </div>
        )}
        
        {/* Header */}
        <div className="modal-header">
          <div className="header-info">
            <h2>{sheetData?.title || sheet.title}</h2>
            <div className="sheet-meta">
              <span><Calendar size={14} /> {new Date(sheetData?.eventDate || sheet.eventDate).toLocaleDateString()}</span>
              <span><Clock size={14} /> {sheetData?.eventTime || sheet.eventTime || '4:30 PM'}</span>
              <span><MapPin size={14} /> {sheetData?.location || sheet.location || 'ZUCA'}</span>
              <span className={`status ${sheetData?.isActive ? 'active' : 'closed'}`}>
                {sheetData?.isActive ? '● ACTIVE' : '● CLOSED'}
              </span>
            </div>
          </div>
          <div className="header-actions">
            <button className="icon-btn" onClick={refreshData} disabled={refreshing}>
              <RefreshCw size={18} className={refreshing ? 'spin' : ''} />
            </button>
            <button className="close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>
        
       {/* Stats Cards */}
<div className="stats-grid">
  <div className="stat-card">
    <div className="stat-value">{totalExpected}</div>
    <div className="stat-label">Total Expected</div>
  </div>
  <div className="stat-card success">
    <div className="stat-value">{totalPresent}</div>
    <div className="stat-label">Present</div>
  </div>
  <div className="stat-card danger">
    <div className="stat-value">{totalAbsent}</div>
    <div className="stat-label">Absent</div>
  </div>
  <div className="stat-card">
    <div className="stat-value">{attendanceRate}%</div>
    <div className="stat-label">Attendance Rate</div>
  </div>
</div>
        
        {/* Method Breakdown */}
             <div className="methods-breakdown">
          <div className="method-item">
            <span className="method-dot self"></span>
            <span>Self Check-in</span>
            <span className="method-count">{selfCount}</span>
          </div>
          <div className="method-item">
            <span className="method-dot qr"></span>
            <span>QR Code</span>
            <span className="method-count">{qrCount}</span>
          </div>
          <div className="method-item">
            <span className="method-dot manual"></span>
            <span>Manual (Admin)</span>
            <span className="method-count">{manualCount}</span>
          </div>
        </div>
        
        {/* Live Activity Feed */}
        {sheetData?.isActive && (
          <LiveActivityFeed sheetId={sheet.id} onNewCheckin={fetchSheetData} />
        )}
        
               {/* Action Buttons */}
        <div className="action-buttons">
          <button className="btn-primary" onClick={() => setShowAddMember(true)}>
            <UserPlus size={16} /> Add Member
          </button>
          <button className="btn-secondary" onClick={() => {
            setRemindType('all');
            setShowRemindModal(true);
          }}>
            <Bell size={16} /> Remind All
          </button>
          {/* Add Share Link Button */}
         <button className="btn-share" onClick={() => setShowShareModal(true)}>
            <Link2 size={16} /> Share Link
          </button>
          {sheetData?.isActive && (
            <button className="btn-danger" onClick={handleCloseSheet}>
              <XCircle size={16} /> Close Sheet
            </button>
          )}
        </div>
        
        {/* Search Bar */}
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* Tabs */}
        <div className="tabs">
  <button 
    className={`tab ${activeTab === 'present' ? 'active' : ''}`}
    onClick={() => setActiveTab('present')}
  >
    <CheckCircle size={14} /> Present ({filteredPresent.length})
  </button>
  <button 
    className={`tab ${activeTab === 'absent' ? 'active' : ''}`}
    onClick={() => setActiveTab('absent')}
  >
    <XCircle size={14} /> Absent ({filteredAbsent.length})
  </button>
</div>
        
        {/* Present Members List */}
{activeTab === 'present' && (
  <div className="members-list">
    {filteredPresent.length === 0 ? (
      <div className="empty-state">No present members found</div>
    ) : (
      <table className="members-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Role</th>
            <th>Executive Position</th>
            <th>Method</th>
            <th>Time</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredPresent.map(entry => (
            <tr key={entry.id}>
              <td><strong>{entry.fullName}</strong></td>
              <td>{entry.phoneNumber || '-'}</td>
              <td>{entry.role || '-'}</td>
              <td>
                {entry.executivePosition ? (
                  <span className="executive-badge">{entry.executivePosition}</span>
                ) : (
                  <span className="no-role">-</span>
                )}
              </td>
              <td>
                <span className={`method-badge ${entry.signMethod?.toLowerCase()}`}>
                  {entry.signMethod === 'SELF' ? 'Self' : 
                   entry.signMethod === 'QR_CODE' ? 'QR Code' : 'Manual'}
                </span>
              </td>
              <td>{new Date(entry.signTime).toLocaleTimeString()}</td>
              <td className="actions">
                <button 
                  className="icon-btn edit"
                  onClick={() => {
                    setSelectedEntry(entry);
                    setShowEditMember(true);
                  }}
                >
                  <Edit2 size={14} />
                </button>
                <button 
                  className="icon-btn absent"
                  onClick={() => handleMarkAbsent(entry.id, entry.fullName)}
                  title="Mark as Absent"
                >
                  <XCircle size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
)}
     {/* Absent Members List */}
{activeTab === 'absent' && (
  <div className="members-list">
    {filteredAbsent.length === 0 ? (
      <div className="empty-state">No absent members found</div>
    ) : (
      <table className="members-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Role</th>
            <th>Executive Position</th>
            <th>Jumuia</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredAbsent.map(member => (
            <tr key={member.id}>
              <td><strong>{member.fullName}</strong></td>
              <td>{member.phone || '-'}</td>
              <td>{member.role || '-'}</td>
              <td>
                {member.executivePosition ? (
                  <span className="executive-badge">{member.executivePosition}</span>
                ) : (
                  <span className="no-role">-</span>
                )}
              </td>
              <td>{member.homeJumuia?.name || '-'}</td>
              <td className="actions">
                <button 
                  className="btn-small"
                  onClick={() => handleSendReminder(member.id)}
                >
                  <Send size={12} /> Remind
                </button>
                <button 
                  className="btn-small success"
                  onClick={() => handleMarkPresent(member.id, member.fullName)}
                >
                  <CheckCircle size={12} /> Mark Present
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
)}
        
        {/* Modals */}
        {showAddMember && (
          <AddMemberModal
            sheetId={sheet.id}
            onClose={() => setShowAddMember(false)}
            onAdd={handleAddMember}
          />
        )}
        
        {showEditMember && selectedEntry && (
          <EditMemberModal
            entry={selectedEntry}
            onClose={() => {
              setShowEditMember(false);
              setSelectedEntry(null);
            }}
            onSave={handleEditMember}
          />
        )}
        
        {showRemindModal && (
          <RemindModal
            sheet={sheet}
            remindType={remindType}
            onClose={() => setShowRemindModal(false)}
            onSend={handleBulkRemind}
          />
        )}

                {showShareModal && (
          <ShareLinkModal
            sheet={sheetData || sheet}
            onClose={() => setShowShareModal(false)}
          />
        )}
      </div>
      
      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .modal-container {
          background: white;
          border-radius: 16px;
          width: 90%;
          max-width: 1200px;
          max-height: 90vh;
          overflow-y: auto;
        }
        
        .modal-container.loading {
          text-align: center;
          padding: 40px;
        }
        
        .loader {
          width: 40px;
          height: 40px;
          border: 3px solid #f0f0f0;
          border-top-color: #1a1a1a;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 20px 24px;
          border-bottom: 1px solid #e0e0e0;
          position: sticky;
          top: 0;
          background: white;
          z-index: 10;
        }
        
        .header-info h2 {
          margin: 0 0 8px 0;
          font-size: 20px;
        }
        
        .sheet-meta {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: #666;
        }
        
        .sheet-meta span {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .status {
          font-weight: 500;
        }
        
        .status.active {
          color: #22c55e;
        }
        
        .status.closed {
          color: #666;
        }
        
        .header-actions {
          display: flex;
          gap: 8px;
        }
        
        .icon-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
        }
        
        .icon-btn:hover {
          background: #f0f0f0;
        }
        
        .spin {
          animation: spin 1s linear infinite;
        }
        
        .close-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          padding: 20px 24px;
          background: #f8f8f8;
          margin: 0 24px 20px;
          border-radius: 12px;
        }
        
        .stat-card {
          text-align: center;
        }
        
        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #1a1a1a;
        }
        
        .stat-label {
          font-size: 12px;
          color: #666;
        }
        
        .stat-card.success .stat-value {
          color: #22c55e;
        }
        
        .stat-card.danger .stat-value {
          color: #ef4444;
        }
        
        .methods-breakdown {
          display: flex;
          justify-content: center;
          gap: 32px;
          padding: 12px 24px;
          margin: 0 24px 20px;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
        }
        
        .method-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }
        
        .method-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        
        .method-dot.self { background: #3b82f6; }
              .method-dot.qr { background: #22c55e; }
        .method-dot.manual { background: #f59e0b; }
        
        .method-count {
          font-weight: 600;
          margin-left: 4px;
        }
        
        .action-buttons {
          display: flex;
          gap: 12px;
          padding: 0 24px 20px;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .btn-primary, .btn-secondary, .btn-danger {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          cursor: pointer;
          border: none;
        }
        
        .btn-primary {
          background: #1a1a1a;
          color: white;
        }
        
        .btn-secondary {
          background: #f0f0f0;
          color: #1a1a1a;
        }
        
        .btn-danger {
          background: #fee2e2;
          color: #ef4444;
        }
        
        .search-bar {
          padding: 16px 24px;
        }
        
        .search-bar input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
        }
        
        .tabs {
          display: flex;
          gap: 8px;
          padding: 0 24px;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 13px;
          color: #666;
          border-bottom: 2px solid transparent;
        }
        
        .tab.active {
          color: #1a1a1a;
          border-bottom-color: #1a1a1a;
        }
        
        .members-list {
          padding: 20px 24px;
          max-height: 400px;
          overflow-y: auto;
        }
        
        .members-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .members-table th,
        .members-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .members-table th {
          background: #fafafa;
          font-weight: 600;
          font-size: 12px;
          color: #666;
        }
        
        .method-badge {
          padding: 2px 8px;
          border-radius: 20px;
          font-size: 11px;
        }
        
        .method-badge.self {
          background: #e0f2fe;
          color: #0284c7;
        }
        
              .method-badge.qr_code {
          background: #dcfce7;
          color: #22c55e;
        }
        
        .method-badge.manual {
          background: #fef3c7;
          color: #d97706;
        }
        
  .actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.icon-btn.edit { 
  color: #3b82f6; 
}
.icon-btn.edit:hover { 
  background: #eff6ff; 
}

.icon-btn.absent { 
  color: #f59e0b; 
}
.icon-btn.absent:hover { 
  background: #fef3c7; 
}

.icon-btn.delete { 
  color: #ef4444; 
}
.icon-btn.delete:hover { 
  background: #fee2e2; 
}

        .btn-small {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          cursor: pointer;
          border: none;
          background: #f0f0f0;
        }
        
        .btn-small.success {
          background: #dcfce7;
          color: #22c55e;
        }
        
        .empty-state {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        .btn-share {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #8b5cf6;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
}

.btn-share:hover {
  background: #7c3aed;
  transform: translateY(-1px);
}
        
        .toast {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 20px;
          border-radius: 8px;
          background: #1a1a1a;
          color: white;
          font-size: 13px;
          z-index: 1100;
        }
        
        .toast.error {
          background: #ef4444;
        }
        
        .toast.success {
          background: #22c55e;
        }

 .icon-btn.absent {
  color: #f59e0b;
}
.icon-btn.absent:hover {
  background: #fef3c7;
}


      `}</style>
    </div>
  );
}