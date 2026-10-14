import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { 
  Crown, Users, Mic, Church, Camera, Music, 
  Plus, Edit2, Trash2, UserPlus, X, Check, 
  Search, Filter, ChevronDown, ChevronUp, 
  Phone, Mail, Calendar, Clock,
  TrendingUp, Award, Star, AlertCircle,
  Download, RefreshCw, Eye, UserCheck,
  Briefcase, Shield, Sparkles, ArrowLeft, Home,
  CheckSquare, Square, Trash, Save, Layers
} from 'lucide-react';
import { format, formatDistance } from 'date-fns';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const WhatsAppIcon = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9l-5.05 1.9z" />
    <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1z" />
    <path d="M14 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1z" />
    <path d="M12 15a4 4 0 0 0-4-4" />
  </svg>
);

export default function AdminExecutivePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('positions');
  const [expandedCategories, setExpandedCategories] = useState({
    leadership: true, choir: true, jumuia: true, media: true, voice: true
  });
  
  const [positions, setPositions] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Bulk selection
  const [selectedPositions, setSelectedPositions] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkSelectedUser, setBulkSelectedUser] = useState('');
  const [bulkSearchUser, setBulkSearchUser] = useState('');
  
  // Toast notification
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  // Inline assignment states
  const [assigningPosition, setAssigningPosition] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [searchUserTerm, setSearchUserTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const canModify = true; 
  
  // Edit states
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');


  const [showAddPositionModal, setShowAddPositionModal] = useState(false);
const [newPosition, setNewPosition] = useState({
  title: '',
  category: '',
  level: '',
  description: ''
});
const [creatingPosition, setCreatingPosition] = useState(false);
  
  // Remove confirm
  const [removingAssignment, setRemovingAssignment] = useState(null);


  

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

    // Export to Excel
  const exportToExcel = () => {
    const exportData = assignments.map(assignment => ({
      'Position': assignment.position.title,
      'Category': assignment.position.category,
      'Assigned To': assignment.user.fullName,
      'Email': assignment.user.email,
      'Phone': assignment.user.phone || 'N/A',
      'Custom Phone': assignment.customPhone || 'N/A',
      'Custom Email': assignment.customEmail || 'N/A',
      'Assigned Date': new Date(assignment.assignedAt).toLocaleDateString(),
      'Status': 'Active'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const colWidths = [
      { wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 30 },
      { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 10 }
    ];
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Executive Team");
    XLSX.writeFile(wb, `executive_team_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast(`Exported ${exportData.length} executives to Excel`, 'success');
  };

  // Export to Word
  const exportToWord = () => {
    if (assignments.length === 0) {
      showToast("No executives to export", "error");
      return;
    }

    let htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Executive Team Report</title>
  <style>
    body {
      font-family: 'Times New Roman', Times, serif;
      margin: 0.5in 0.3in;
      padding: 0;
      color: #000;
      font-size: 10pt;
    }
    h1 {
      font-size: 18pt;
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 6px;
      margin-bottom: 15px;
    }
    .header-info {
      margin-bottom: 15px;
      padding: 8px 12px;
      background: #f5f5f5;
      border: 1px solid #ccc;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    th, td {
      border: 1px solid #999;
      padding: 6px 4px;
      vertical-align: top;
      font-size: 8pt;
    }
    th {
      background: #e0e0e0;
      font-weight: bold;
      text-align: left;
    }
    tr:nth-child(even) {
      background: #f9f9f9;
    }
    .footer {
      margin-top: 20px;
      text-align: center;
      font-size: 7pt;
      color: #666;
      border-top: 1px solid #ccc;
      padding-top: 5px;
    }
  </style>
</head>
<body>
  <h1>ZUCA EXECUTIVE TEAM REPORT</h1>
  
  <div class="header-info">
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>Total Executives:</strong> ${assignments.length}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>Position</th>
        <th>Category</th>
        <th>Assigned To</th>
        <th>Email</th>
        <th>Phone</th>
        <th>Assigned Date</th>
      </tr>
    </thead>
    <tbody>`;

    assignments.forEach(assignment => {
      htmlContent += `<tr>
        <td>${assignment.position.title}</td>
        <td>${assignment.position.category}</td>
        <td>${assignment.user.fullName}</td>
        <td>${assignment.user.email}</td>
        <td>${assignment.user.phone || '-'}</td>
        <td>${new Date(assignment.assignedAt).toLocaleDateString()}</td>
      </tr>`;
    });

    htmlContent += `</tbody>
  </table>

  <div class="footer">
    Generated by ZUCA Portal - Executive Management System
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'application/msword' });
    saveAs(blob, `executive_team_${new Date().toISOString().split('T')[0]}.doc`);
    showToast(`Exported ${assignments.length} executives to Word`, 'success');
  };

  // Silent fetch - updates state without showing loading spinner
  const fetchAllDataSilent = async () => {
    try {
      const [positionsRes, assignmentsRes, usersRes, statsRes] = await Promise.all([
        api.get('/api/executive/positions'),
        api.get('/api/admin/executive/assignments'),
        api.get('/api/admin/executive/users'),
        api.get('/api/admin/executive/stats')
      ]);
      setPositions(positionsRes.data.positions);
      setAssignments(assignmentsRes.data.assignments);
      setUsers(usersRes.data.users);
      setStats(statsRes.data.stats);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleCreatePosition = async () => {
  if (!newPosition.title || !newPosition.category || !newPosition.level) {
    showToast("Title, category, and level are required", "error");
    return;
  }

  setCreatingPosition(true);
  try {
    await api.post('/api/admin/executive/positions', newPosition);
    showToast(`Position "${newPosition.title}" created successfully!`, "success");
    setShowAddPositionModal(false);
    setNewPosition({ title: '', category: '', level: '', description: '' });
    fetchAllData(); // Refresh the page
  } catch (err) {
    showToast(err.response?.data?.error || "Failed to create position", "error");
  } finally {
    setCreatingPosition(false);
  }
};

  // Initial load with loading spinner
  const fetchAllData = async () => {
    setLoading(true);
    await fetchAllDataSilent();
    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const getAssignmentForPosition = (positionId) => {
    return assignments.find(a => a.positionId === positionId);
  };

  const getCategoryIcon = (category) => {
    const icons = {
      leadership: <Crown size={18} />,
      choir: <Mic size={18} />,
      jumuia: <Church size={18} />,
      media: <Camera size={18} />,
      voice: <Music size={18} />
    };
    return icons[category] || <Briefcase size={18} />;
  };

const getCategoryTitle = (category) => {
  const titles = {
    leadership: 'Leadership Team',
    choir: 'Choir Department',
    jumuia: 'Jumuia Moderators',
    media: 'Media Department',
    voice: 'Voice Representatives',
    organising: 'Organising Department',
    farewell: 'Farewell Department',
    liturgy: 'Liturgy Department'
  };
   return titles[category] || category.charAt(0).toUpperCase() + category.slice(1) + ' Department';
};
  const getCategoryColor = (category) => {
    const colors = {
      leadership: '#3b82f6',
      choir: '#8b5cf6',
      jumuia: '#10b981',
      media: '#f59e0b',
      voice: '#ef4444'
    };
    return colors[category] || '#64748b';
  };

  const getCategoryBg = (category) => {
    const bg = {
      leadership: '#eff6ff',
      choir: '#f5f3ff',
      jumuia: '#ecfdf5',
      media: '#fffbeb',
      voice: '#fef2f2'
    };
    return bg[category] || '#f8fafc';
  };

  const filteredUsers = users.filter(user =>
    user.fullName.toLowerCase().includes(bulkSearchUser.toLowerCase()) ||
    user.email.toLowerCase().includes(bulkSearchUser.toLowerCase())
  );

  const inlineFilteredUsers = users.filter(user =>
    user.fullName.toLowerCase().includes(searchUserTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchUserTerm.toLowerCase())
  );

  // Single Assign - SILENT
  const handleAssign = async (positionId) => {
    if (!selectedUserId) {
      showToast('Please select a user', 'error');
      return;
    }

    setSaving(true);
    try {
      await api.post('/api/admin/executive/assign', {
        userId: selectedUserId,
        positionId: positionId,
        customPhone: null,
        customEmail: null
      });
      // Silent update - no page reload
      await fetchAllDataSilent();
      setAssigningPosition(null);
      setSelectedUserId('');
      setSearchUserTerm('');
      showToast('Position assigned successfully!', 'success');
    } catch (error) {
      showToast(error.response?.data?.error || 'Assignment failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Bulk Assign - SILENT
  const handleBulkAssign = async () => {
    if (!bulkSelectedUser || selectedPositions.length === 0) {
      showToast('Select positions and a user first', 'error');
      return;
    }

    setSaving(true);
    let successCount = 0;
    let failCount = 0;

    for (const positionId of selectedPositions) {
      try {
        await api.post('/api/admin/executive/assign', {
          userId: bulkSelectedUser,
          positionId: positionId,
          customPhone: null,
          customEmail: null
        });
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    // Silent update
    await fetchAllDataSilent();
    setSelectedPositions([]);
    setBulkMode(false);
    setShowBulkAssign(false);
    setBulkSelectedUser('');
    showToast(`Assigned ${successCount} positions${failCount > 0 ? `, ${failCount} failed` : ''}`, successCount > 0 ? 'success' : 'error');
    setSaving(false);
  };

  // Bulk Remove - SILENT
  const handleBulkRemove = async () => {
    if (selectedPositions.length === 0) return;

    setSaving(true);
    let successCount = 0;
    let failCount = 0;

    for (const positionId of selectedPositions) {
      const assignment = getAssignmentForPosition(positionId);
      if (assignment) {
        try {
          await api.delete(`/api/admin/executive/remove/${assignment.id}`);
          successCount++;
        } catch (error) {
          failCount++;
        }
      }
    }

    // Silent update
    await fetchAllDataSilent();
    setSelectedPositions([]);
    setBulkMode(false);
    showToast(`Removed ${successCount} executives${failCount > 0 ? `, ${failCount} failed` : ''}`, 'success');
    setSaving(false);
  };

  // Update Contact - SILENT
  const handleUpdateContact = async (assignmentId) => {
    setSaving(true);
    try {
      await api.put(`/api/admin/executive/update/${assignmentId}`, {
        customPhone: editPhone || null,
        customEmail: editEmail || null
      });
      // Silent update
      await fetchAllDataSilent();
      setEditingAssignment(null);
      setEditPhone('');
      setEditEmail('');
      showToast('Contact updated successfully!', 'success');
    } catch (error) {
      showToast(error.response?.data?.error || 'Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Remove - SILENT
  const handleRemove = async (assignmentId) => {
    setSaving(true);
    try {
      await api.delete(`/api/admin/executive/remove/${assignmentId}`);
      // Silent update
      await fetchAllDataSilent();
      setRemovingAssignment(null);
      showToast('Executive removed successfully!', 'success');
    } catch (error) {
      showToast(error.response?.data?.error || 'Removal failed', 'error');
    } finally {
      setSaving(false);
    }
  };


  // Delete entire department (category)
const handleDeleteCategory = async (category) => {
  const positionsToDelete = positions.filter(p => p.category === category);
  
  if (positionsToDelete.length === 0) {
    showToast(`No positions found in "${category}"`, "error");
    return;
  }
  
  // Check if any positions have active executives
  const activeAssignments = assignments.filter(a => 
    positionsToDelete.some(p => p.id === a.positionId)
  );
  
  if (activeAssignments.length > 0) {
    showToast(`Cannot delete "${category}" - has ${activeAssignments.length} active executive(s). Remove them first.`, "error");
    return;
  }
  
  if (!window.confirm(`Delete entire "${category}" department with ${positionsToDelete.length} position(s)? This cannot be undone.`)) {
    return;
  }
  
  setSaving(true);
  try {
    for (const position of positionsToDelete) {
      await api.delete(`/api/admin/executive/positions/${position.id}`);
    }
    await fetchAllDataSilent();
    showToast(`"${category}" department deleted successfully!`, "success");
  } catch (err) {
    showToast(err.response?.data?.error || "Failed to delete department", "error");
  } finally {
    setSaving(false);
  }
};

  const toggleSelectPosition = (positionId) => {
    if (selectedPositions.includes(positionId)) {
      setSelectedPositions(selectedPositions.filter(id => id !== positionId));
    } else {
      setSelectedPositions([...selectedPositions, positionId]);
    }
  };

  const toggleSelectAll = () => {
    const allPositionIds = positions.map(p => p.id);
    if (selectedPositions.length === allPositionIds.length) {
      setSelectedPositions([]);
    } else {
      setSelectedPositions(allPositionIds);
    }
  };

  const getFilteredPositions = () => {
    let filtered = positions;
    if (searchTerm) {
      filtered = filtered.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => {
        const assigned = getAssignmentForPosition(p.id);
        return statusFilter === 'filled' ? assigned : !assigned;
      });
    }
    return filtered;
  };

  const groupedPositions = () => {
    const filtered = getFilteredPositions();
  const grouped = {};
  filtered.forEach(pos => {
    if (!grouped[pos.category]) {
      grouped[pos.category] = [];
    }
    grouped[pos.category].push(pos);
  });
  return grouped;
};

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const goBack = () => navigate(-1);
  const goHome = () => navigate('/admin');

 
  const grouped = groupedPositions();

  return (
    <div className="admin-executive-page">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Premium Hero Section */}
      <div className="premium-hero">
        <div className="hero-particles">
          {[...Array(15)].map((_, i) => <div key={i} className="particle"></div>)}
        </div>
        <div className="hero-glow"></div>
        
        <div className="hero-nav">
          <button className="hero-nav-btn back" onClick={goBack}>
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
          <button className="hero-nav-btn home" onClick={goHome}>
            <Home size={18} />
            <span>Dashboard</span>
          </button>
        </div>

        <div className="hero-content">
          <div className="hero-badge">
            <Shield size={20} />
            <span>ADMIN PANEL</span>
          </div>
          <h1>Executive Management</h1>
          <p>Manage ZUCA leadership structure and executive positions</p>
          <div className="hero-stats">
            <div className="stat"><Briefcase size={16} /><span>{stats?.totalPositions || 0} Total</span></div>
            <div className="stat"><UserCheck size={16} /><span>{stats?.filledPositions || 0} Filled</span></div>
            <div className="stat"><UserPlus size={16} /><span>{stats?.vacantPositions || 0} Vacant</span></div>
            <div className="stat"><TrendingUp size={16} /><span>{stats?.completionRate || 0}% Complete</span></div>
          </div>
        </div>
        <div className="hero-wave">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25" fill="white"></path>
            <path d="M0,0V15.81C13,21.25,27.93,25.67,44.24,28.45c69.76,11.6,136.47,7.22,206.42-5.49C369.5,5.71,470.33,39.18,569,66.43c96.58,26.92,193.44,35.91,289.91,25.58C948.56,80.58,1046.7,45.79,1143,57.21c51.76,5.86,101.78,21.14,148,42.25V0Z" fill="white"></path>
          </svg>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Tabs */}
        <div className="tabs-container">
          <button className={`tab-btn ${activeTab === 'positions' ? 'active' : ''}`} onClick={() => setActiveTab('positions')}>
            <Briefcase size={16} /> Position Management
          </button>
          <button className={`tab-btn ${activeTab === 'team' ? 'active' : ''}`} onClick={() => setActiveTab('team')}>
            <Users size={16} /> Current Team
          </button>
          <button className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>
            <TrendingUp size={16} /> Analytics
          </button>
        </div>

        {/* Bulk Actions Bar */}
        {activeTab === 'positions' && (
          <div className="bulk-actions-bar">
            <div className="bulk-left">
              <button className="bulk-select-btn" onClick={() => setBulkMode(!bulkMode)}>
                {bulkMode ? <X size={16} /> : <Layers size={16} />}
                {bulkMode ? 'Exit Bulk Mode' : 'Bulk Actions'}
              </button>
              {bulkMode && (
                <>
                  <button className="bulk-select-all" onClick={toggleSelectAll}>
                    {selectedPositions.length === positions.length ? <CheckSquare size={14} /> : <Square size={14} />}
                    Select All
                  </button>
                  <span className="bulk-count">{selectedPositions.length} selected</span>
                </>
              )}
            </div>
            {bulkMode && selectedPositions.length > 0 && (
              <div className="bulk-right">
                <button className="bulk-assign" onClick={() => setShowBulkAssign(true)}>
                  <UserPlus size={14} /> Assign Selected
                </button>
                <button className="bulk-remove" onClick={handleBulkRemove} disabled={saving}>
                  <Trash size={14} /> Remove Selected
                </button>
              </div>
            )}
          </div>
        )}

               {/* Filters */}
        <div className="filters-bar">
          <div className="search-box">
            <Search size={16} />
            <input type="text" placeholder="Search positions..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="filter-group">
            <Filter size={14} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Positions</option>
              <option value="filled">Filled Only</option>
              <option value="vacant">Vacant Only</option>
            </select>
          </div>
        <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
           {/* "ADD POSITION" BUTTON */}
    <button onClick={() => setShowAddPositionModal(true)} style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '6px', 
      padding: '8px 16px', 
      background: '#10b981', 
      color: 'white', 
      border: 'none', 
      borderRadius: '30px', 
      fontSize: '12px', 
      cursor: 'pointer' 
    }}>
      + Add Position
    </button>
          <button className="export-excel-btn" onClick={exportToExcel} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '30px', fontSize: '12px', cursor: 'pointer' }}>
            📊 Excel
          </button>
          <button className="export-word-btn" onClick={exportToWord} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '30px', fontSize: '12px', cursor: 'pointer' }}>
            📄 Word
          </button>
          <button className="refresh-btn" onClick={fetchAllData} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '30px', cursor: 'pointer' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
        </div>

        {/* Positions Table - Silent Updates */}
        {activeTab === 'positions' && (
          <div className="positions-container">
            {Object.entries(grouped).map(([category, categoryPositions]) => {
              if (categoryPositions.length === 0) return null;
              return (
                <div key={category} className="category-card">
                <div className="category-header" style={{ backgroundColor: getCategoryBg(category) }}>
  <div className="category-title" onClick={() => toggleCategory(category)} style={{ cursor: 'pointer', flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
    {getCategoryIcon(category)}
    <h3>{getCategoryTitle(category)}</h3>
    <span className="category-count">{categoryPositions.length}</span>
  </div>
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    {/* Delete button - only shows for custom categories (not default ones) */}
    {canModify && !['leadership', 'choir', 'jumuia', 'media', 'voice'].includes(category) && (
      <button 
        onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category); }}
        style={{ 
          background: '#fee2e2', 
          border: 'none', 
          borderRadius: '20px', 
          padding: '4px 10px', 
          cursor: 'pointer', 
          fontSize: '11px', 
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
        title={`Delete ${category} department`}
      >
        🗑️ Delete
      </button>
    )}
    {expandedCategories[category] ? 
      <ChevronUp size={20} onClick={() => toggleCategory(category)} style={{ cursor: 'pointer' }} /> : 
      <ChevronDown size={20} onClick={() => toggleCategory(category)} style={{ cursor: 'pointer' }} />
    }
  </div>
</div>

                  {expandedCategories[category] && (
                    <div className="positions-list">
                      {categoryPositions.map(position => {
                        const assignment = getAssignmentForPosition(position.id);
                        const isFilled = !!assignment;
                        
                        return (
                          <div key={position.id} className={`position-item ${!isFilled ? 'vacant' : ''}`}>
                            <div className="position-main">
                              {bulkMode && (
                                <div className="position-checkbox">
                                  <input type="checkbox" checked={selectedPositions.includes(position.id)} onChange={() => toggleSelectPosition(position.id)} />
                                </div>
                              )}
                              <div className="position-info">
                                <div className="position-title">{position.title}</div>
                                <div className="position-level">Level {position.level}</div>
                              </div>
                              <div className="position-status">
                                {isFilled ? <span className="status-filled">● Filled</span> : <span className="status-vacant">○ Vacant</span>}
                              </div>
                            </div>

                            {isFilled && (
                              <div className="position-occupant">
                                <div className="occupant-avatar">
                                  {assignment.user.profileImage ? (
                                    <img src={assignment.user.profileImage} alt="" />
                                  ) : (
                                    <div className="avatar-initial">{assignment.user.fullName.charAt(0)}</div>
                                  )}
                                </div>
                                <div className="occupant-details">
                                  <div className="occupant-name">{assignment.user.fullName}</div>
                                  <div className="occupant-email">{assignment.user.email}</div>
                                  {assignment.user.phone && <div className="occupant-phone">{assignment.user.phone}</div>}
                                </div>
                                <div className="occupant-contact">
                                  {assignment.user.phone && (
                                    <>
                                      <a href={`tel:${assignment.user.phone}`} className="contact-icon call" title="Call">📞</a>
                                      <a href={`https://wa.me/${assignment.user.phone.replace(/[^0-9]/g, '')}`} className="contact-icon wa" title="WhatsApp">💬</a>
                                    </>
                                  )}
                                  {assignment.user.email && <a href={`mailto:${assignment.user.email}`} className="contact-icon mail" title="Email">✉️</a>}
                                </div>
                              </div>
                            )}

                            <div className="position-actions">
                              {isFilled ? (
                                <>
                                  {editingAssignment === assignment.id ? (
                                    <div className="inline-edit">
                                      <input type="text" placeholder="Custom phone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                                      <input type="email" placeholder="Custom email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                                      <div className="edit-buttons">
                                        <button className="save-btn" onClick={() => handleUpdateContact(assignment.id)} disabled={saving}>Save</button>
                                        <button className="cancel-btn" onClick={() => { setEditingAssignment(null); setEditPhone(''); setEditEmail(''); }}>Cancel</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <button className="action-edit" onClick={() => { setEditingAssignment(assignment.id); setEditPhone(assignment.customPhone || ''); setEditEmail(assignment.customEmail || ''); }} title="Edit Contact">
                                        <Edit2 size={14} />
                                      </button>
                                      <button className="action-remove" onClick={() => setRemovingAssignment(assignment)} title="Remove">
                                        <Trash2 size={14} />
                                      </button>
                                    </>
                                  )}
                                </>
                              ) : (
                                <div className="assign-section">
                                  {assigningPosition === position.id ? (
                                    <div className="inline-assign">
                                      <div className="assign-search">
                                        <Search size={12} />
                                        <input type="text" placeholder="Search user..." value={searchUserTerm} onChange={(e) => setSearchUserTerm(e.target.value)} autoFocus />
                                      </div>
                                     <div className="assign-users">
  {inlineFilteredUsers.map(user => (
    <div 
      key={user.id} 
      className={`assign-user ${selectedUserId === user.id ? 'selected' : ''}`} 
      onClick={() => setSelectedUserId(user.id)}
    >
      <div className="assign-user-avatar">
        {user.profileImage ? (
          <img src={user.profileImage} alt={user.fullName} className="assign-user-image" />
        ) : (
          <span>{user.fullName.charAt(0)}</span>
        )}
      </div>
      <div className="assign-user-name">{user.fullName}</div>
    </div>
  ))}
  {inlineFilteredUsers.length === 0 && <div className="no-users-match">No users found</div>}
</div>
                                      <div className="assign-buttons">
                                        <button className="assign-cancel" onClick={() => { setAssigningPosition(null); setSelectedUserId(''); setSearchUserTerm(''); }}>Cancel</button>
                                        <button className="assign-confirm" onClick={() => handleAssign(position.id)} disabled={!selectedUserId || saving}>
                                          {saving ? 'Assigning...' : 'Assign'}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button className="action-assign" onClick={() => setAssigningPosition(position.id)}>
                                      <UserPlus size={14} /> Assign
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Current Team Tab */}
        {activeTab === 'team' && (
          <div className="team-grid">
            {assignments.map(assignment => (
              <div key={assignment.id} className="team-member-card">
                <div className="member-badge" style={{ backgroundColor: getCategoryColor(assignment.position.category) }}>
                  {assignment.position.title}
                </div>
                <div className="member-avatar">
                  {assignment.user.profileImage ? (
                    <img src={assignment.user.profileImage} alt="" />
                  ) : (
                    <div className="avatar-large">{assignment.user.fullName.charAt(0)}</div>
                  )}
                </div>
                <h4>{assignment.user.fullName}</h4>
                <p>{assignment.user.email}</p>
                <div className="member-contact-links">
                  {assignment.user.phone && (
                    <>
                      <a href={`tel:${assignment.user.phone}`} className="contact-link call">📞 Call</a>
                      <a href={`https://wa.me/${assignment.user.phone.replace(/[^0-9]/g, '')}`} className="contact-link wa">💬 WhatsApp</a>
                    </>
                  )}
                  {assignment.user.email && <a href={`mailto:${assignment.user.email}`} className="contact-link mail">✉️ Email</a>}
                </div>
                <div className="member-footer">
                  <button className="edit-btn" onClick={() => { setEditingAssignment(assignment.id); setEditPhone(assignment.customPhone || ''); setEditEmail(assignment.customEmail || ''); }}>
                    <Edit2 size={12} /> Edit
                  </button>
                  <button className="remove-btn" onClick={() => setRemovingAssignment(assignment)}>
                    <Trash2 size={12} /> Remove
                  </button>
                </div>
              </div>
            ))}
            {assignments.length === 0 && <div className="empty-state"><Users size={48} /><h3>No executives assigned</h3><p>Start by assigning positions</p></div>}
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && stats && (
          <div className="stats-container">
            <div className="stats-grid-custom">
              <div className="stat-panel">
                <h3><Clock size={16} /> Recent Assignments</h3>
                {stats.recentAssignments?.map(a => (
                  <div key={a.id} className="history-item"><div className="history-icon assign">+</div><div><div className="history-title">{a.user.fullName}</div><div className="history-subtitle">assigned as {a.position.title}</div></div></div>
                ))}
              </div>
              <div className="stat-panel">
                <h3><Clock size={16} /> Recent Removals</h3>
                {stats.recentHistory?.map(h => (
                  <div key={h.id} className="history-item"><div className="history-icon remove">−</div><div><div className="history-title">{h.user?.fullName}</div><div className="history-subtitle">removed from {h.position?.title}</div></div></div>
                ))}
              </div>
            </div>
            <div className="stat-panel full">
              <h3><Award size={16} /> Department Breakdown</h3>
              {stats.byCategory?.map(cat => (
                <div key={cat.category} className="category-progress">
                  <div className="progress-label"><span>{getCategoryTitle(cat.category)}</span><span>{cat.filled}/{cat.total}</span></div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${(cat.filled / cat.total) * 100}%`, backgroundColor: getCategoryColor(cat.category) }}></div></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bulk Assign Modal */}
      {showBulkAssign && (
        <div className="modal-overlay" onClick={() => setShowBulkAssign(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Bulk Assign</h3><button onClick={() => setShowBulkAssign(false)}><X size={20} /></button></div>
            <div className="modal-body">
              <p>Assign {selectedPositions.length} positions to:</p>
              <div className="bulk-user-search">
                <Search size={14} />
                <input type="text" placeholder="Search user..." value={bulkSearchUser} onChange={(e) => setBulkSearchUser(e.target.value)} />
              </div>
              <div className="bulk-users-list">
                {filteredUsers.slice(0, 10).map(user => (
                  <div key={user.id} className={`bulk-user ${bulkSelectedUser === user.id ? 'selected' : ''}`} onClick={() => setBulkSelectedUser(user.id)}>
                    <div className="bulk-user-avatar">{user.fullName.charAt(0)}</div>
                    <div><div className="bulk-user-name">{user.fullName}</div><div className="bulk-user-email">{user.email}</div></div>
                    {bulkSelectedUser === user.id && <Check size={16} className="check-icon" />}
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer"><button className="btn-secondary" onClick={() => setShowBulkAssign(false)}>Cancel</button><button className="btn-primary" onClick={handleBulkAssign} disabled={!bulkSelectedUser || saving}>{saving ? 'Assigning...' : 'Assign All'}</button></div>
          </div>
        </div>
      )}




      {/* Remove Confirmation Modal */}
      {removingAssignment && (
        <div className="modal-overlay" onClick={() => setRemovingAssignment(null)}>
          <div className="modal-container warning" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <AlertCircle size={24} className="warning-icon" />
              <h3>Confirm Removal</h3>
              <button onClick={() => setRemovingAssignment(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <p>Remove <strong>{removingAssignment.user.fullName}</strong> from <strong>{removingAssignment.position.title}</strong>?</p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setRemovingAssignment(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => handleRemove(removingAssignment.id)} disabled={saving}>
                {saving ? 'Removing...' : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Position Modal - MOVED HERE (OUTSIDE the Remove modal) */}
      {showAddPositionModal && (
        <div className="modal-overlay" onClick={() => setShowAddPositionModal(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ Add New Executive Position</h3>
              <button onClick={() => setShowAddPositionModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Position Title *</label>
                <input
                  type="text"
                  placeholder="e.g., Liturgist Coordinator"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                  value={newPosition.title}
                  onChange={(e) => setNewPosition({...newPosition, title: e.target.value})}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Category *</label>
                <input
                  type="text"
                  placeholder="e.g., liturgy, farewell, hospitality"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                  value={newPosition.category}
                  onChange={(e) => setNewPosition({...newPosition, category: e.target.value})}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Level * (1=Highest)</label>
                <input
                  type="number"
                  placeholder="e.g., 11"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                  value={newPosition.level}
                  onChange={(e) => setNewPosition({...newPosition, level: e.target.value})}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Description (Optional)</label>
                <textarea
                  placeholder="Describe the responsibilities of this position"
                  rows="3"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                  value={newPosition.description}
                  onChange={(e) => setNewPosition({...newPosition, description: e.target.value})}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAddPositionModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleCreatePosition} disabled={creatingPosition}>
                {creatingPosition ? 'Creating...' : 'Create Position'}
              </button>
            </div>
          </div>
        </div>
      )}


      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }

        .admin-executive-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* Premium Hero */
        .premium-hero {
          position: relative;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          padding: 20px 32px 80px;
          overflow: hidden;
        }

        .hero-particles { position: absolute; inset: 0; overflow: hidden; }
        .particle { position: absolute; background: rgba(255,255,255,0.08); border-radius: 50%; animation: float 15s infinite ease-in-out; }
        .particle:nth-child(1) { width: 80px; height: 80px; top: 10%; left: 5%; animation-delay: 0s; }
        .particle:nth-child(2) { width: 120px; height: 120px; top: 60%; right: 8%; animation-delay: 2s; }
        .particle:nth-child(3) { width: 60px; height: 60px; top: 30%; left: 20%; animation-delay: 4s; }
        .particle:nth-child(4) { width: 100px; height: 100px; bottom: 20%; left: 15%; animation-delay: 1s; }
        .particle:nth-child(5) { width: 90px; height: 90px; top: 70%; right: 25%; animation-delay: 3s; }
        @keyframes float { 0%,100% { transform: translateY(0) rotate(0deg); opacity: 0.3; } 50% { transform: translateY(-40px) rotate(180deg); opacity: 0.6; } }

        .hero-glow { position: absolute; top: 50%; left: 50%; width: 400px; height: 400px; background: radial-gradient(circle, rgba(59,130,246,0.3), transparent); transform: translate(-50%, -50%); filter: blur(60px); animation: pulse 4s infinite; }
        @keyframes pulse { 0%,100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); } 50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); } }

        .hero-nav { display: flex; gap: 12px; margin-bottom: 30px; position: relative; z-index: 10; }
        .hero-nav-btn { display: flex; align-items: center; gap: 8px; padding: 8px 20px; background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2); border-radius: 40px; color: white; cursor: pointer; transition: all 0.2s; }
        .hero-nav-btn:hover { background: rgba(255,255,255,0.2); transform: translateX(-2px); }
        .hero-nav-btn.home:hover { background: #3b82f6; transform: translateX(0); }

        .hero-content { position: relative; z-index: 10; text-align: center; max-width: 800px; margin: 0 auto; }
        .hero-badge { display: inline-flex; align-items: center; gap: 10px; padding: 6px 20px; background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); border-radius: 40px; color: white; font-size: 12px; margin-bottom: 20px; }
        .hero-content h1 { font-size: 42px; font-weight: 700; color: white; margin-bottom: 12px; }
        .hero-content p { font-size: 16px; color: #94a3b8; margin-bottom: 28px; }
        .hero-stats { display: flex; justify-content: center; gap: 24px; flex-wrap: wrap; }
        .hero-stats .stat { display: flex; align-items: center; gap: 8px; color: #cbd5e1; font-size: 13px; background: rgba(255,255,255,0.05); padding: 6px 16px; border-radius: 40px; }

        .hero-wave { position: absolute; bottom: 0; left: 0; right: 0; height: 50px; }
        .hero-wave svg { width: 100%; height: 100%; fill: #f0f4f8; }

        /* Main Content */
        .main-content { max-width: 1400px; margin: -30px auto 0; padding: 0 24px 40px; position: relative; z-index: 3; }

        /* Tabs */
        .tabs-container { display: flex; gap: 8px; margin-bottom: 24px; background: white; padding: 6px; border-radius: 60px; width: fit-content; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .tab-btn { display: flex; align-items: center; gap: 8px; padding: 10px 24px; background: transparent; border: none; border-radius: 40px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; color: #64748b; }
        .tab-btn:hover { background: #f1f5f9; }
        .tab-btn.active { background: #3b82f6; color: white; }

        /* Bulk Actions */
        .bulk-actions-bar { display: flex; justify-content: space-between; align-items: center; background: white; padding: 12px 20px; border-radius: 16px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); flex-wrap: wrap; gap: 12px; }
        .bulk-left { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        .bulk-select-btn, .bulk-select-all { display: flex; align-items: center; gap: 6px; padding: 6px 14px; background: #f1f5f9; border: none; border-radius: 30px; font-size: 12px; cursor: pointer; }
        .bulk-count { font-size: 12px; color: #64748b; }
        .bulk-right { display: flex; gap: 12px; }
        .bulk-assign { display: flex; align-items: center; gap: 6px; padding: 6px 16px; background: #3b82f6; color: white; border: none; border-radius: 30px; font-size: 12px; cursor: pointer; }
        .bulk-remove { display: flex; align-items: center; gap: 6px; padding: 6px 16px; background: #ef4444; color: white; border: none; border-radius: 30px; font-size: 12px; cursor: pointer; }
        .bulk-remove:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Filters */
        .filters-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
        .search-box { display: flex; align-items: center; gap: 10px; padding: 8px 16px; background: white; border: 1px solid #e2e8f0; border-radius: 40px; min-width: 260px; }
        .search-box input { flex: 1; border: none; background: transparent; outline: none; }
        .filter-group { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: white; border: 1px solid #e2e8f0; border-radius: 40px; }
        .filter-group select { border: none; background: transparent; outline: none; }
        .refresh-btn { display: flex; align-items: center; gap: 6px; padding: 8px 20px; background: white; border: 1px solid #e2e8f0; border-radius: 40px; cursor: pointer; }

        /* Position Cards */
        .category-card { background: white; border-radius: 20px; margin-bottom: 20px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .category-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; cursor: pointer; }
        .category-title { display: flex; align-items: center; gap: 10px; }
        .category-title h3 { font-size: 16px; font-weight: 600; margin: 0; }
        .category-count { font-size: 11px; color: #64748b; background: rgba(0,0,0,0.05); padding: 2px 8px; border-radius: 20px; }

        .position-item { border-top: 1px solid #eef2f6; padding: 16px 20px; transition: background 0.2s; }
        .position-item.vacant { background: #fefce8; }
        .position-main { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 12px; }
        .position-checkbox input { width: 18px; height: 18px; cursor: pointer; }
        .position-info { flex: 1; }
        .position-title { font-size: 15px; font-weight: 600; color: #1e293b; }
        .position-level { font-size: 11px; color: #94a3b8; }
        .position-status .status-filled { color: #10b981; font-size: 11px; }
        .position-status .status-vacant { color: #f59e0b; font-size: 11px; }

        .position-occupant { display: flex; align-items: center; gap: 14px; padding: 12px; background: #f8fafc; border-radius: 16px; margin-bottom: 12px; flex-wrap: wrap; }
        .occupant-avatar img, .avatar-initial { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; }
        .avatar-initial { background: linear-gradient(135deg, #3b82f6, #8b5cf6); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 18px; }
        .occupant-details { flex: 1; }
        .occupant-name { font-size: 14px; font-weight: 600; }
        .occupant-email, .occupant-phone { font-size: 11px; color: #64748b; }
        .occupant-contact { display: flex; gap: 8px; }
        .contact-icon { text-decoration: none; font-size: 16px; }

        .position-actions { display: flex; justify-content: flex-end; gap: 10px; }
        .action-assign, .action-edit, .action-remove { display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 30px; font-size: 12px; cursor: pointer; border: none; }
        .action-assign { background: #3b82f6; color: white; }
        .action-edit { background: #f1f5f9; color: #475569; }
        .action-remove { background: #fef2f2; color: #ef4444; }

        .inline-assign { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 12px; min-width: 260px; }
        .assign-search { display: flex; align-items: center; gap: 6px; padding: 8px; background: #f8fafc; border-radius: 12px; margin-bottom: 10px; }
        .assign-search input { flex: 1; border: none; background: transparent; outline: none; font-size: 12px; }
        .assign-users {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
  max-height: 200px;
  overflow-y: auto;
  padding-right: 4px;
}

       .assign-user {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
}

.assign-user:hover {
  background: #f1f5f9;
}
      .assign-user.selected {
  background: #eff6ff;
  border: 2px solid #3b82f6;
}
        .assign-user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 16px;
  overflow: hidden;
  flex-shrink: 0;
}

.assign-user-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

       .assign-user-name {
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
}
  /* Scrollbar styling */
.assign-users::-webkit-scrollbar {
  width: 4px;
}

.assign-users::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 10px;
}

.assign-users::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
        .no-users-match { padding: 12px; text-align: center; font-size: 11px; color: #94a3b8; }
        .assign-buttons { display: flex; gap: 8px; justify-content: flex-end; }
        .assign-cancel, .assign-confirm { padding: 5px 12px; border-radius: 20px; font-size: 11px; cursor: pointer; border: none; }
        .assign-cancel { background: #f1f5f9; color: #64748b; }
        .assign-confirm { background: #3b82f6; color: white; }
        .assign-confirm:disabled { opacity: 0.6; cursor: not-allowed; }

        .inline-edit { display: flex; flex-direction: column; gap: 8px; min-width: 200px; }
        .inline-edit input { padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 12px; }
        .edit-buttons { display: flex; gap: 8px; justify-content: flex-end; }
        .save-btn, .cancel-btn { padding: 4px 12px; border-radius: 20px; font-size: 11px; cursor: pointer; border: none; }
        .save-btn { background: #10b981; color: white; }
        .cancel-btn { background: #f1f5f9; color: #64748b; }

        /* Team Grid */
        .team-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
        .team-member-card { background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); text-align: center; padding: 20px; }
        .member-badge { display: inline-block; padding: 4px 12px; border-radius: 30px; color: white; font-size: 10px; margin-bottom: 16px; }
        .member-avatar { width: 80px; height: 80px; margin: 0 auto 12px; }
        .member-avatar img, .avatar-large { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
        .avatar-large { background: linear-gradient(135deg, #3b82f6, #8b5cf6); display: flex; align-items: center; justify-content: center; color: white; font-size: 32px; font-weight: 600; }
        .team-member-card h4 { font-size: 16px; margin-bottom: 4px; }
        .team-member-card p { font-size: 11px; color: #64748b; margin-bottom: 12px; word-break: break-all; }
        .member-contact-links { display: flex; justify-content: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
        .contact-link { text-decoration: none; font-size: 12px; padding: 4px 10px; border-radius: 20px; }
        .contact-link.call { background: #eff6ff; color: #3b82f6; }
        .contact-link.wa { background: #dcfce7; color: #22c55e; }
        .contact-link.mail { background: #fef3c7; color: #f59e0b; }
        .member-footer { display: flex; justify-content: center; gap: 12px; border-top: 1px solid #eef2f6; padding-top: 12px; }
        .edit-btn, .remove-btn { display: flex; align-items: center; gap: 4px; padding: 5px 12px; border-radius: 20px; font-size: 11px; cursor: pointer; border: none; }
        .edit-btn { background: #f1f5f9; color: #475569; }
        .remove-btn { background: #fef2f2; color: #ef4444; }

        /* Stats */
        .stats-container { display: flex; flex-direction: column; gap: 20px; }
        .stats-grid-custom { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .stat-panel { background: white; border-radius: 20px; padding: 20px; }
        .stat-panel.full { grid-column: span 2; }
        .stat-panel h3 { font-size: 15px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .history-item { display: flex; align-items: center; gap: 12px; padding: 10px; background: #f8fafc; border-radius: 12px; margin-bottom: 8px; }
        .history-icon { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; }
        .history-icon.assign { background: #ecfdf5; color: #10b981; }
        .history-icon.remove { background: #fef2f2; color: #ef4444; }
        .category-progress { margin-bottom: 16px; }
        .progress-label { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; }
        .progress-bar { height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; }
        .progress-fill { height: 100%; border-radius: 3px; }

        /* Modal */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; }
        .modal-container { background: white; border-radius: 28px; max-width: 500px; width: 90%; max-height: 85vh; overflow-y: auto; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #eef2f6; }
        .modal-body { padding: 20px 24px; }
        .modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid #eef2f6; }
        .bulk-user-search { display: flex; align-items: center; gap: 8px; padding: 10px; background: #f8fafc; border-radius: 12px; margin-bottom: 16px; }
        .bulk-user-search input { flex: 1; border: none; background: transparent; outline: none; }
        .bulk-users-list { max-height: 300px; overflow-y: auto; }
        .bulk-user { display: flex; align-items: center; gap: 12px; padding: 12px; cursor: pointer; border-radius: 12px; }
        .bulk-user:hover, .bulk-user.selected { background: #eff6ff; }
        .bulk-user-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #8b5cf6); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; }
        .check-icon { color: #10b981; margin-left: auto; }
        .btn-primary, .btn-secondary, .btn-danger { padding: 8px 20px; border-radius: 30px; font-size: 13px; cursor: pointer; border: none; }
        .btn-primary { background: #3b82f6; color: white; }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-secondary { background: #f1f5f9; color: #475569; }
        .btn-danger { background: #ef4444; color: white; }
        .warning-icon { color: #f59e0b; }

        /* Toast */
        .toast-notification { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); padding: 12px 24px; border-radius: 50px; color: white; z-index: 1100; animation: slideUp 0.3s ease; }
        .toast-notification.success { background: #10b981; }
        .toast-notification.error { background: #ef4444; }
        @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

        /* Loader */
        .admin-executive-loader { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, #0f172a, #1e293b); color: white; }
        .loader-spinner { position: relative; width: 80px; height: 80px; margin-bottom: 24px; }
        .ring { position: absolute; inset: 0; border-radius: 50%; border: 3px solid transparent; animation: spin 1.5s infinite; }
        .ring:nth-child(1) { border-top-color: #3b82f6; border-right-color: #3b82f6; }
        .ring:nth-child(2) { border-bottom-color: #8b5cf6; border-left-color: #8b5cf6; animation-delay: 0.3s; width: 70%; height: 70%; top: 15%; left: 15%; }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        .empty-state { text-align: center; padding: 60px 20px; color: #94a3b8; }

        /* Responsive Desktop */
        @media (min-width: 1024px) {
          .position-item { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; }
          .position-main { margin-bottom: 0; width: 25%; }
          .position-occupant { width: 45%; margin-bottom: 0; }
          .position-actions { width: 25%; justify-content: flex-end; }
        }

        @media (max-width: 768px) {
          .premium-hero { padding: 16px 20px 60px; }
          .hero-content h1 { font-size: 28px; }
          .hero-stats { gap: 12px; }
          .hero-stats .stat { font-size: 11px; padding: 4px 12px; }
          .main-content { padding: 0 16px 30px; }
          .tabs-container { width: 100%; justify-content: center; flex-wrap: wrap; }
          .tab-btn { padding: 8px 16px; font-size: 12px; }
          .bulk-actions-bar { flex-direction: column; align-items: stretch; }
          .bulk-left, .bulk-right { justify-content: center; }
          .filters-bar { flex-direction: column; }
          .search-box { width: 100%; }
        }
      `}</style>
    </div>
  );
}