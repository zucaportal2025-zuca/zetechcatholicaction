import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Users, CheckCircle, XCircle, Clock, Wifi, UserPlus, Bell, Edit2, Trash2, Send, RefreshCw, Calendar, MapPin, ArrowLeft, Link2 } from 'lucide-react';
import { api } from '../../api';
import io from 'socket.io-client';
import BASE_URL from '../../api';
import AddMemberModal from '../../components/admin/attendance/AddMemberModal';
import EditMemberModal from '../../components/admin/attendance/EditMemberModal';
import RemindModal from '../../components/admin/attendance/RemindModal';
import LiveActivityFeed from '../../components/admin/attendance/LiveActivityFeed';
import ShareLinkModal from '../../components/admin/attendance/ShareLinkModal';

export default function AdminAttendanceDetails() {
  const { sheetId } = useParams();
  const navigate = useNavigate();
  
  // ============ STATE ============
  const user = JSON.parse(localStorage.getItem("user") || "{}");
const basePath = (user?.role === "admin" || user?.specialRole === "admin") ? "/admin" : "/secretary";
  const [sheetData, setSheetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('present');
  const [showAddMember, setShowAddMember] = useState(false);
  const [showEditMember, setShowEditMember] = useState(false);
  const [showRemindModal, setShowRemindModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [remindType, setRemindType] = useState('all');
  const [showShareModal, setShowShareModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  // bulk actions state
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // ============ HELPER FUNCTIONS ============
  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };
  
  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  }, []);
  
  // ============ FETCH SHEET DATA (ONLY CRITICAL DATA FIRST) ============
  const fetchSheetData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/attendance/sheet/${sheetId}`, { headers: getHeaders() });
      setSheetData(response.data.sheet);
      setLoading(false);
      
      // ✅ Fetch stats in background (don't block rendering)
      fetchStatsInBackground();
      fetchEntriesInBackground();
    } catch (error) {
      console.error('Error fetching sheet details:', error);
      showToast('Failed to load sheet details', 'error');
      setLoading(false);
    }
  }, [sheetId, showToast]);

  // ============ REFRESH DATA (MANUAL REFRESH) ============
  const refreshData = useCallback(async () => {
    setRefreshing(true);
    await fetchSheetData();
    setRefreshing(false);
  }, [fetchSheetData]);

  // ============ FETCH STATS IN BACKGROUND ============
  const fetchStatsInBackground = async () => {
    try {
      await api.get('/api/attendance/admin/stats', { headers: getHeaders() });
    } catch (err) {
      console.error('Stats error:', err);
    }
  };

  // ============ FETCH ENTRIES IN BACKGROUND ============
  const fetchEntriesInBackground = async () => {
    try {
      await api.get('/api/attendance/all-entries', { headers: getHeaders() });
    } catch (err) {
      console.error('Entries error:', err);
    }
  };

  // ============ Toggle individual member selection ============
  const toggleMemberSelection = (memberId) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  // ============ Toggle select all ============
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(filteredAbsent.map(m => m.id));
    }
    setSelectAll(!selectAll);
  };

 // ============ Bulk mark present ============
const handleBulkMarkPresent = async () => {
  if (selectedMembers.length === 0) {
    showToast('No members selected', 'error');
    return;
  }

  // ✅ Get IDs of users already present
  const presentUserIds = new Set(sheetData?.entries?.map(e => e.userId) || []);
  
  // ✅ Filter out already present users
  const trulyAbsentMembers = selectedMembers.filter(id => !presentUserIds.has(id));
  
  // ✅ Check if any are already present
  const alreadyPresentCount = selectedMembers.length - trulyAbsentMembers.length;
  
  if (trulyAbsentMembers.length === 0) {
    showToast('All selected members are already present!', 'info');
    setSelectedMembers([]);
    setSelectAll(false);
    return;
  }

  if (alreadyPresentCount > 0) {
    showToast(`⚠️ ${alreadyPresentCount} member(s) already present. Marking ${trulyAbsentMembers.length} members.`, 'info');
  }

  if (!window.confirm(`Mark ${trulyAbsentMembers.length} members as present?`)) return;

  setIsBulkProcessing(true);

  // Use trulyAbsentMembers for the bulk operation
  const membersToProcess = trulyAbsentMembers;

  // 1. OPTIMISTIC UPDATE
  const tempEntries = membersToProcess.map(memberId => {
    const member = filteredAbsent.find(m => m.id === memberId);
    return {
      id: 'temp-' + Date.now() + '-' + memberId,
      fullName: member?.fullName || 'Unknown',
      phoneNumber: member?.phone || '-',
      role: member?.role || '-',
      executivePosition: member?.executivePosition || null,
      signMethod: 'MANUAL',
      signTime: new Date().toISOString(),
      isPending: true,
      userId: memberId
    };
  });

  // Update UI immediately
  setSheetData(prev => {
    if (!prev) return prev;
    return {
      ...prev,
      entries: [...prev.entries, ...tempEntries],
      absentMembers: prev.absentMembers?.filter(m => !membersToProcess.includes(m.id)) || []
    };
  });

  // Clear selection
  setSelectedMembers([]);
  setSelectAll(false);

  try {
    // 2. BULK API CALL - Only send truly absent members
    const membersData = filteredAbsent
      .filter(m => membersToProcess.includes(m.id))
      .map(m => ({
        fullName: m.fullName,
        phoneNumber: m.phone,
        role: m.role || 'Member',
        specialRole: m.specialRole || null,
        membershipNumber: m.membership_number || null,
        jumuiaId: m.jumuiaId || null,
        notes: 'Bulk marked present by admin'
      }));

    console.log(`📤 Bulk marking ${membersData.length} members present`);

    await api.post(`/api/attendance/sheet/${sheetId}/entries/batch`, 
      { users: membersData }, 
      { headers: getHeaders() }
    );

    showToast(`✅ ${membersData.length} members marked present!`);
    
    // 3. Refresh to get real data
    await fetchSheetData();

  } catch (error) {
    console.error('Bulk mark error:', error);
    
    // 4. ROLLBACK on error
    setSheetData(prev => {
      if (!prev) return prev;
      const rolledBackMembers = filteredAbsent.filter(m => membersToProcess.includes(m.id));
      return {
        ...prev,
        entries: prev.entries.filter(e => !e.isPending),
        absentMembers: [...(prev.absentMembers || []), ...rolledBackMembers]
      };
    });
    showToast(error.response?.data?.error || 'Failed to mark members present', 'error');
  } finally {
    setIsBulkProcessing(false);
  }
};

  // ============ INITIAL LOAD & SOCKET ============
  useEffect(() => {
    fetchSheetData();
    
    const socket = io(BASE_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 500,
      reconnectionDelayMax: 2000
    });
    
    socket.on('connect', () => {
      console.log('✅ Socket connected for sheet:', sheetId);
      socket.emit('join_attendance_sheet', sheetId);
    });
    
    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });
    
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
    
    // ✅ Socket events - only show toast, don't auto-refresh
    socket.on('attendance_checkin', (data) => {
      console.log('📢 Real-time check-in received:', data);
      if (data.sheetId === sheetId) {
        showToast(`${data.userName || 'Someone'} just checked in!`, 'info');
      }
    });
    
    socket.on('attendance_sheet_closed', (data) => {
      if (data.sheetId === sheetId) {
        showToast('This sheet has been closed', 'info');
        fetchSheetData();
      }
    });
    
    socket.on('attendance_entry_added', (data) => {
      if (data.sheetId === sheetId) {
        console.log('📢 Entry added:', data);
      }
    });
    
    socket.on('attendance_entry_deleted', (data) => {
      if (data.sheetId === sheetId) {
        console.log('📢 Entry deleted:', data);
      }
    });
    
    return () => {
      socket.emit('leave_attendance_sheet', sheetId);
      socket.disconnect();
    };
  }, [sheetId, fetchSheetData, showToast]);

  // ============ NO AUTO-REFRESH ============
  // Auto-refresh removed for performance. Users can use the Refresh button.

  // ============ ACTIONS ============
  const handleAddMember = async (memberData) => {
    try {
      await api.post(`/api/attendance/sheet/${sheetId}/entry`, memberData, { headers: getHeaders() });
      showToast('Member added successfully!');
      fetchSheetData();
      setShowAddMember(false);
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to add member', 'error');
    }
  };
  
  const handleEditMember = async (entryId, data) => {
    try {
      await api.put(`/api/attendance/sheet/${sheetId}/entry/${entryId}`, data, { headers: getHeaders() });
      showToast('Member updated successfully!');
      fetchSheetData();
      setShowEditMember(false);
      setSelectedEntry(null);
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to update member', 'error');
    }
  };
  
  const handleMarkAbsent = async (entryId, memberName) => {
    if (!window.confirm(`Mark ${memberName} as absent? They will be removed from present list.`)) return;
    try {
      await api.delete(`/api/attendance/sheet/${sheetId}/entry/${entryId}`, { headers: getHeaders() });
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
        await api.post(`/api/attendance/sheet/${sheetId}/entry`, {
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
      }
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to mark present', 'error');
    }
  };
  
  const handleSendReminder = async (userId, customMessage = null) => {
    try {
      await api.post(`/api/attendance/sheet/${sheetId}/remind/${userId}`, 
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
      await api.post(`/api/attendance/sheet/${sheetId}/remind-all`, 
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
      await api.post(`/api/attendance/sheet/${sheetId}/close`, {}, { headers: getHeaders() });
      showToast('Sheet closed successfully');
      setTimeout(() => {
        navigate('/admin/attendance');
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
  const totalExpected = sheetData?.totalMembers || 0;

  const presentMembers = presentEntries.filter(entry => entry.userId && entry.role !== 'Guest');
  const guestEntries = presentEntries.filter(entry => !entry.userId || entry.role === 'Guest');

  const totalPresent = presentMembers.length;
  const totalGuests = guestEntries.length;
  const totalAbsent = totalExpected - totalPresent;

  const attendanceRate = totalExpected > 0 ? ((totalPresent / totalExpected) * 100).toFixed(1) : 0;

  const selfCount = presentEntries.filter(e => e.signMethod === 'SELF').length;
  const qrCount = presentEntries.filter(e => e.signMethod === 'QR_CODE').length;
  const manualCount = presentEntries.filter(e => e.signMethod === 'MANUAL').length;

  // ============ SKELETON LOADER ============
  const SkeletonLoader = () => (
    <div className="skeleton-wrapper">
      <div className="skeleton-header">
        <div className="skeleton-back-btn"></div>
        <div className="skeleton-refresh-btn"></div>
      </div>
      <div className="skeleton-sheet-info">
        <div className="skeleton-title"></div>
        <div className="skeleton-meta">
          <div className="skeleton-meta-item"></div>
          <div className="skeleton-meta-item"></div>
          <div className="skeleton-meta-item"></div>
        </div>
      </div>
      <div className="stats-grid skeleton">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="stat-card skeleton">
            <div className="skeleton-stat-value"></div>
            <div className="skeleton-stat-label"></div>
          </div>
        ))}
      </div>
      <div className="skeleton-methods">
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton-method-item"></div>
        ))}
      </div>
      <div className="skeleton-actions">
        <div className="skeleton-action-btn"></div>
        <div className="skeleton-action-btn"></div>
        <div className="skeleton-action-btn"></div>
      </div>
      <div className="skeleton-search"></div>
      <div className="skeleton-tabs">
        <div className="skeleton-tab"></div>
        <div className="skeleton-tab"></div>
      </div>
      <div className="skeleton-table">
        <div className="skeleton-table-header">
          <div className="skeleton-th"></div>
          <div className="skeleton-th"></div>
          <div className="skeleton-th"></div>
          <div className="skeleton-th"></div>
          <div className="skeleton-th"></div>
          <div className="skeleton-th"></div>
        </div>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="skeleton-table-row">
            <div className="skeleton-td"></div>
            <div className="skeleton-td"></div>
            <div className="skeleton-td"></div>
            <div className="skeleton-td"></div>
            <div className="skeleton-td"></div>
            <div className="skeleton-td"></div>
          </div>
        ))}
      </div>
    </div>
  );

  // ============ LIVE INDICATOR ============
  const LiveIndicator = () => (
    <div className="live-indicator">
      <span className="pulse-ring"></span>
      <span>LIVE</span>
    </div>
  );

  // ============ LOADING STATE ============
  if (loading) {
    return (
      <div className="attendance-details-page">
        <SkeletonLoader />
        <style>{`
          .skeleton-wrapper {
            padding: 24px;
            background: #f5f5f5;
            min-height: 100vh;
          }
          .skeleton-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
          }
          .skeleton-back-btn {
            width: 140px;
            height: 40px;
            background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
            background-size: 200% 100%;
            animation: skeleton-wave 1.5s infinite;
            border-radius: 8px;
          }
          .skeleton-refresh-btn {
            width: 100px;
            height: 40px;
            background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
            background-size: 200% 100%;
            animation: skeleton-wave 1.5s infinite;
            border-radius: 8px;
          }
          .skeleton-sheet-info {
            background: white;
            border-radius: 16px;
            padding: 20px 24px;
            margin-bottom: 24px;
          }
          .skeleton-title {
            width: 250px;
            height: 28px;
            background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
            background-size: 200% 100%;
            animation: skeleton-wave 1.5s infinite;
            border-radius: 6px;
            margin-bottom: 12px;
          }
          .skeleton-meta {
            display: flex;
            gap: 16px;
          }
          .skeleton-meta-item {
            width: 120px;
            height: 16px;
            background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
            background-size: 200% 100%;
            animation: skeleton-wave 1.5s infinite;
            border-radius: 4px;
          }
          .stats-grid.skeleton {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-bottom: 20px;
          }
          .stat-card.skeleton {
            padding: 16px;
            background: white;
            border-radius: 12px;
            border: 1px solid #e0e0e0;
          }
          .skeleton-stat-value {
            width: 60px;
            height: 32px;
            background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
            background-size: 200% 100%;
            animation: skeleton-wave 1.5s infinite;
            border-radius: 6px;
            margin: 0 auto 8px;
          }
          .skeleton-stat-label {
            width: 80px;
            height: 12px;
            background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
            background-size: 200% 100%;
            animation: skeleton-wave 1.5s infinite;
            border-radius: 4px;
            margin: 0 auto;
          }
          .skeleton-methods {
            display: flex;
            justify-content: center;
            gap: 32px;
            padding: 12px 24px;
            margin-bottom: 20px;
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 12px;
          }
          .skeleton-method-item {
            width: 100px;
            height: 20px;
            background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
            background-size: 200% 100%;
            animation: skeleton-wave 1.5s infinite;
            border-radius: 4px;
          }
          .skeleton-actions {
            display: flex;
            gap: 12px;
            margin-bottom: 20px;
          }
          .skeleton-action-btn {
            width: 120px;
            height: 36px;
            background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
            background-size: 200% 100%;
            animation: skeleton-wave 1.5s infinite;
            border-radius: 8px;
          }
          .skeleton-search {
            width: 100%;
            height: 42px;
            background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
            background-size: 200% 100%;
            animation: skeleton-wave 1.5s infinite;
            border-radius: 8px;
            margin-bottom: 16px;
          }
          .skeleton-tabs {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 8px;
          }
          .skeleton-tab {
            width: 100px;
            height: 36px;
            background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
            background-size: 200% 100%;
            animation: skeleton-wave 1.5s infinite;
            border-radius: 20px;
          }
          .skeleton-table {
            background: white;
            border-radius: 12px;
            overflow: hidden;
          }
          .skeleton-table-header {
            display: flex;
            gap: 16px;
            padding: 12px;
            background: #fafafa;
            border-bottom: 1px solid #e0e0e0;
          }
          .skeleton-th {
            width: 100px;
            height: 16px;
            background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
            background-size: 200% 100%;
            animation: skeleton-wave 1.5s infinite;
            border-radius: 4px;
          }
          .skeleton-table-row {
            display: flex;
            gap: 16px;
            padding: 12px;
            border-bottom: 1px solid #f0f0f0;
          }
          .skeleton-td {
            width: 100px;
            height: 14px;
            background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
            background-size: 200% 100%;
            animation: skeleton-wave 1.5s infinite;
            border-radius: 4px;
          }
          @keyframes skeleton-wave {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    );
  }

  // ============ RENDER ============
  return (
    <div className="attendance-details-page">
      <style>{`
        .attendance-details-page {
          padding: 24px;
          background: #f5f5f5;
          min-height: 100vh;
        }
        
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        
        .back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          cursor: pointer;
        }
        
        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          cursor: pointer;
        }
        
        .spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .sheet-info {
          background: white;
          border-radius: 16px;
          padding: 20px 24px;
          margin-bottom: 24px;
        }
        
        .sheet-info h1 {
          margin: 0 0 8px 0;
          font-size: 24px;
        }
        
        .sheet-meta {
          display: flex;
          gap: 16px;
          font-size: 13px;
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
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }
        
        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 16px;
          text-align: center;
          border: 1px solid #e0e0e0;
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
          margin-bottom: 20px;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
        }
        
        .method-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        
        .method-dot.self { background: #3b82f6; }
        .method-dot.qr { background: #059669; }
        .method-dot.manual { background: #f59e0b; }
        
        .method-count {
          font-weight: 600;
          margin-left: 4px;
        }
        
        .action-buttons {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }

        @media (max-width: 480px) {
          .action-buttons {
            grid-template-columns: 1fr;
          }
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
        
        .btn-share {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #026602;
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
        
        .search-bar {
          margin-bottom: 16px;
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
          margin-bottom: 16px;
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
          background: white;
          border-radius: 12px;
          overflow-x: auto;
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
          color: #059669;
        }
        
        .method-badge.manual {
          background: #fef3c7;
          color: #d97706;
        }
        
        .executive-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 600;
          background: #dbeafe;
          color: #1e40af;
        }
        
        .no-role {
          color: #94a3b8;
          font-size: 12px;
        }
        
        .icon-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
        }
        
        .icon-btn.edit { color: #3b82f6; }
        .icon-btn.absent { color: #f59e0b; }
        .icon-btn.absent:hover { background: #fef3c7; }
        
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

        /* Live Indicator Styles */
        .live-indicator {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #1a1a1a;
          color: #22c55e;
          padding: 8px 16px;
          border-radius: 40px;
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 1000;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }

        .pulse-ring {
          width: 10px;
          height: 10px;
          background: #22c55e;
          border-radius: 50%;
          position: relative;
        }

        .pulse-ring::before {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          background: #22c55e;
          border-radius: 50%;
          animation: pulse-ring 1.5s infinite;
        }

        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(3); opacity: 0; }
        }

        /* Bulk Actions Bar */
        .bulk-actions-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          flex-wrap: wrap;
          gap: 12px;
        }

        .bulk-select-all {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .bulk-select-all input[type="checkbox"] {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .selected-count {
          font-size: 12px;
          color: #64748b;
          margin-left: 8px;
        }

        .btn-bulk-mark {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #22c55e;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-bulk-mark:hover:not(:disabled) {
          background: #16a34a;
          transform: translateY(-1px);
        }

        .btn-bulk-mark:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .loading-spinner-small {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          display: inline-block;
        }

        @media (max-width: 768px) {
          .bulk-actions-bar {
            flex-direction: column;
            align-items: stretch;
          }
          .bulk-select-all {
            justify-content: space-between;
          }
          .btn-bulk-mark {
            justify-content: center;
          }
          .attendance-details-page {
            padding: 12px;
          }
          .page-header {
            flex-wrap: wrap;
            gap: 8px;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .methods-breakdown {
            flex-wrap: wrap;
            gap: 8px;
          }
          .action-buttons {
            grid-template-columns: 1fr;
          }
          .tabs {
            flex-wrap: wrap;
          }
          .members-table {
            font-size: 12px;
          }
          .members-table th,
          .members-table td {
            padding: 8px;
          }
        }
      `}</style>

      {/* Live Indicator */}
      {sheetData?.isActive && <LiveIndicator />}
      
      {/* Toast */}
      {toast.show && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
      
      {/* Header with Back Button */}
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(`${basePath}/attendance`)}>
          <ArrowLeft size={20} /> Back to Attendance
        </button>
        <button className="refresh-btn" onClick={refreshData} disabled={refreshing}>
          <RefreshCw size={18} className={refreshing ? 'spin' : ''} />
          Refresh
        </button>
      </div>
      
      {/* Sheet Info */}
      <div className="sheet-info">
        <h1>{sheetData?.title}</h1>
        <div className="sheet-meta">
          <span><Calendar size={14} /> {new Date(sheetData?.eventDate).toLocaleDateString()}</span>
          <span><Clock size={14} /> {sheetData?.eventTime || '4:30 PM'}</span>
          <span><MapPin size={14} /> {sheetData?.location || 'ZUCA'}</span>
          <span className={`status ${sheetData?.isActive ? 'active' : 'closed'}`}>
            {sheetData?.isActive ? '● ACTIVE' : '● CLOSED'}
          </span>
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
          <div className="stat-label">Present (Members)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalGuests}</div>
          <div className="stat-label">Guests</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-value">{totalAbsent >= 0 ? totalAbsent : 0}</div>
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
        <LiveActivityFeed sheetId={sheetId} onNewCheckin={fetchSheetData} />
      )}
      
      {/* Action Buttons */}
      <div className="action-buttons">
        <button className="btn-primary" onClick={() => navigate(`${basePath}/attendance/add-member/${sheetId}`)}>
          <UserPlus size={16} /> Add a Single Member
        </button>
        <button className="btn-secondary" onClick={() => {
          setRemindType('all');
          setShowRemindModal(true);
        }}>
          <Bell size={16} /> Remind All
        </button>
        
        <button className="btn-share" onClick={() => setShowShareModal(true)}>
          <Link2 size={16} /> Share Link
        </button>
        <button className="btn-primary" onClick={() => navigate(`${basePath}/attendance/add-member/${sheetId}`, { 
  state: { defaultToBulkMode: true } 
})}>
  <UserPlus size={16} /> Bulk Add Member
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
            <>
              {/* Bulk Actions Bar */}
              <div className="bulk-actions-bar">
                <div className="bulk-select-all">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={toggleSelectAll}
                    disabled={isBulkProcessing}
                  />
                  <label>Select All</label>
                  <span className="selected-count">
                    {selectedMembers.length} selected
                  </span>
                </div>
                {selectedMembers.length > 0 && (
                  <button
                    className="btn-bulk-mark"
                    onClick={handleBulkMarkPresent}
                    disabled={isBulkProcessing}
                  >
                    {isBulkProcessing ? (
                      <span className="loading-spinner-small"></span>
                    ) : (
                      <CheckCircle size={14} />
                    )}
                    {isBulkProcessing ? 'Processing...' : `Mark ${selectedMembers.length} Present`}
                  </button>
                )}
              </div>

              <table className="members-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={toggleSelectAll}
                        disabled={isBulkProcessing}
                      />
                    </th>
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
                    <tr key={member.id} className={selectedMembers.includes(member.id) ? 'selected' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member.id)}
                          onChange={() => toggleMemberSelection(member.id)}
                          disabled={isBulkProcessing}
                        />
                      </td>
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
                          disabled={isBulkProcessing}
                        >
                          <Send size={12} /> Remind
                        </button>
                        <button 
                          className="btn-small success"
                          onClick={() => handleMarkPresent(member.id, member.fullName)}
                          disabled={isBulkProcessing}
                        >
                          <CheckCircle size={12} /> Mark Present
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
      
      {/* Modals */}
      {showAddMember && (
        <AddMemberModal
          sheetId={sheetId}
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
          sheet={sheetData}
          remindType={remindType}
          onClose={() => setShowRemindModal(false)}
          onSend={handleBulkRemind}
        />
      )}

      {/* Share Link Modal */}
      {showShareModal && (
        <ShareLinkModal
          sheet={sheetData}
          onClose={() => setShowShareModal(false)}
        />
      )}
    
      <style>{`
        .attendance-details-page {
          padding: 24px;
          background: #f5f5f5;
          min-height: 100vh;
        }
        
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        
        .back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          cursor: pointer;
        }
        
        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          cursor: pointer;
        }
        
        .spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .sheet-info {
          background: white;
          border-radius: 16px;
          padding: 20px 24px;
          margin-bottom: 24px;
        }
        
        .sheet-info h1 {
          margin: 0 0 8px 0;
          font-size: 24px;
        }
        
        .sheet-meta {
          display: flex;
          gap: 16px;
          font-size: 13px;
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
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }
        
        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 16px;
          text-align: center;
          border: 1px solid #e0e0e0;
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
          margin-bottom: 20px;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
        }
        
        .method-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        
        .method-dot.self { background: #3b82f6; }
        .method-dot.qr { background: #059669; }
        .method-dot.manual { background: #f59e0b; }
        
        .method-count {
          font-weight: 600;
          margin-left: 4px;
        }
        
        .action-buttons {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }

        @media (max-width: 480px) {
          .action-buttons {
            grid-template-columns: 1fr;
          }
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
          margin-bottom: 16px;
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
          margin-bottom: 16px;
          border-bottom: 1px solid #e0e0e0;
        }

        .icon-btn.absent { 
          color: #f59e0b; 
        }
        .icon-btn.absent:hover { 
          background: #fef3c7; 
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
          background: white;
          border-radius: 12px;
          overflow-x: auto;
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
          color: #059669;
        }
        
        .method-badge.manual {
          background: #fef3c7;
          color: #d97706;
        }
        
        .icon-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
        }
        
        .icon-btn.edit { color: #3b82f6; }
        .icon-btn.delete { color: #ef4444; }
        
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
        
        .loader {
          width: 40px;
          height: 40px;
          border: 3px solid #f0f0f0;
          border-top-color: #1a1a1a;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
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

        .btn-share {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #026602;
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

        /* Live Indicator Styles */
        .live-indicator {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #1a1a1a;
          color: #22c55e;
          padding: 8px 16px;
          border-radius: 40px;
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 1000;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }

        .pulse-ring {
          width: 10px;
          height: 10px;
          background: #22c55e;
          border-radius: 50%;
          position: relative;
        }

        .pulse-ring::before {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          background: #22c55e;
          border-radius: 50%;
          animation: pulse-ring 1.5s infinite;
        }

        @keyframes pulse-ring {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(3);
            opacity: 0;
          }
        }

        /* Bulk Actions Bar */
.bulk-actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  flex-wrap: wrap;
  gap: 12px;
}

.bulk-select-all {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bulk-select-all input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.selected-count {
  font-size: 12px;
  color: #64748b;
  margin-left: 8px;
}

.btn-bulk-mark {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #22c55e;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-bulk-mark:hover:not(:disabled) {
  background: #16a34a;
  transform: translateY(-1px);
}

.btn-bulk-mark:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Selected row highlight */
.members-table tr.selected {
  background: #f0fdf4;
}

.members-table tr.selected td:first-child {
  border-left: 3px solid #22c55e;
}

/* Loading spinner small */
.loading-spinner-small {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}

/* Pending state for bulk actions */
.members-table tr.pending {
  opacity: 0.6;
  background: #fef3c7;
  animation: pulse-pending 1s ease-in-out infinite;
}

@keyframes pulse-pending {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

.pending-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
  background: #fef3c7;
  color: #d97706;
  animation: pulse-pending 1s ease-in-out infinite;
}

/* Responsive */
@media (max-width: 768px) {
  .bulk-actions-bar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .bulk-select-all {
    justify-content: space-between;
  }
  
  .btn-bulk-mark {
    justify-content: center;
  }
}
      `}</style>
    </div>
  );
}