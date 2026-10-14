// frontend/src/pages/admin/UsersPage.jsx
import { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import BASE_URL from "../../api";
import { 
  FiSearch, FiFilter, FiRefreshCw, FiDownload, FiTrash2, 
  FiUser, FiShield, FiMail, FiCopy, FiCheck, FiChevronDown,
  FiUsers, FiUserCheck, FiClock, FiStar, FiMoreVertical,
  FiEdit2, FiEye, FiX, FiCamera, FiMapPin
} from "react-icons/fi";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalUser, setModalUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportOptions, setExportOptions] = useState({ format: 'excel' });
  const [copiedId, setCopiedId] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [expandedMobileMenu, setExpandedMobileMenu] = useState(false);

  const exportMenuRef = useRef(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "" }), 3000);
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showNotification("Copied to clipboard", "success");
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${BASE_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch (err) {
      console.error("Fetch Users Error:", err);
      setError("Failed to fetch users");
      showNotification("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const deleteUser = async (id, userName) => {
    if (!window.confirm(`Delete ${userName}? This cannot be undone.`)) return;
    setUpdatingUserId(id);
    try {
      await axios.delete(`${BASE_URL}/api/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(users.filter(u => u.id !== id));
      showNotification(`${userName} deleted`, "success");
    } catch (err) {
      showNotification(err.response?.data?.error || "Delete failed", "error");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const changeRole = async (id, newRole, userName) => {
    setUpdatingUserId(id);
    try {
      await axios.put(
        `${BASE_URL}/api/users/${id}/role`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
      showNotification(`${userName} is now ${newRole}`, "success");
    } catch (err) {
      showNotification(err.response?.data?.error || "Role change failed", "error");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) {
      showNotification("No users selected", "error");
      return;
    }
    if (!window.confirm(`Delete ${selectedUsers.length} selected users?`)) return;
    try {
      await Promise.all(
        selectedUsers.map(id => 
          axios.delete(`${BASE_URL}/api/users/${id}`, { headers: { Authorization: `Bearer ${token}` } })
        )
      );
      setUsers(users.filter(u => !selectedUsers.includes(u.id)));
      setSelectedUsers([]);
      setSelectAll(false);
      showNotification(`${selectedUsers.length} users deleted`, "success");
    } catch (err) {
      showNotification("Failed to delete some users", "error");
    }
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id));
    }
    setSelectAll(!selectAll);
  };

  const toggleSelectUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (user.membership_number || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus = statusFilter === "all" || 
                           (statusFilter === "online" && user.online) ||
                           (statusFilter === "offline" && !user.online);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  const stats = useMemo(() => ({
    total: users.length,
    online: users.filter(u => u.online).length,
    admins: users.filter(u => u.role === "admin").length,
    members: users.filter(u => u.role === "member").length,
  }), [users]);
const exportToExcel = () => {
  const dataToExport = selectedUsers.length > 0 
    ? users.filter(u => selectedUsers.includes(u.id))
    : filteredUsers;
  
  // Filter out admin users and format properly
  const exportData = dataToExport
    .filter(user => user.role !== "admin")
    .map(user => ({
      Name: user.fullName,
      "Membership #": user.membership_number || "N/A",
      Email: user.email,
      "Phone Number": user.phone || "N/A",
      Role: user.role === "member" ? "Member" : user.role,
      "Special Role": user.specialRole ? formatSpecialRole(user.specialRole) : "None",
      "Home Jumuia": user.homeJumuia?.name || "N/A",
      "Leading Jumuia": user.specialRole === "jumuia_leader" ? (user.leadingJumuia?.name || "N/A") : "N/A",
    }));

  const filename = `users_${new Date().toISOString().split('T')[0]}`;
  
  if (exportOptions.format === 'excel') {
    // Excel export
    const ws = XLSX.utils.json_to_sheet(exportData);
    const colWidths = [
      { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 15 },
      { wch: 12 }, { wch: 18 }, { wch: 20 }, { wch: 20 }
    ];
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  } else if (exportOptions.format === 'doc') {
    // Word Document export
    exportToWord(exportData, filename);
  }
  
  setShowExportMenu(false);
  showNotification(`Exported ${exportData.length} users`, "success");
};

const exportToWord = (data, filename) => {
  if (!data || data.length === 0) {
    showNotification("No data to export", "error");
    return;
  }

  const headers = Object.keys(data[0]);
  const headerDisplayNames = {
    'No.': '#',
    'Name': 'Name',
    'Membership #': '#',
    'Email': 'Email',
    'Phone Number': 'Phone',
    'Role': 'Role',
    'Special Role': 'Special',
    'Home Jumuia': 'Home',
    'Leading Jumuia': 'Leading'
  };

  let tableRows = '';
  data.forEach((row, index) => {
    const rowNumber = index + 1;
    tableRows += '<tr>';
    // Add row number column
    tableRows += `<td style="padding: 2px 3px; border: 1px solid #ccc; font-size: 7pt; text-align: center;">${rowNumber}</td>`;
    // Add remaining columns
    headers.forEach(header => {
let value = row[header];
if (value === undefined || value === null) value = '-';

// Different truncation limits per column type
if (header === 'Email') {
  if (value.length > 35) value = value.substring(0, 32) + '...';
} else if (typeof value === 'string' && value.length > 20) {
  value = value.substring(0, 17) + '...';
}
      tableRows += `<td style="padding: 2px 3px; border: 1px solid #ccc; font-size: 7pt;">${value}</td>`;
    });
    tableRows += '</tr>';
  });
  
  let headerRow = '<th style="padding: 3px 3px; border: 1px solid #ccc; background: #e0e0e0; font-weight: bold; font-size: 7pt; text-align: center;">#</th>';
  headers.forEach(header => {
    const displayName = headerDisplayNames[header] || header;
    headerRow += `<th style="padding: 3px 3px; border: 1px solid #ccc; background: #e0e0e0; font-weight: bold; font-size: 7pt;">${displayName}</th>`;
  });
  
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${filename}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      margin: 0.5in 0.3in;
      padding: 0;
      color: #000;
      font-size: 7pt;
    }
    h1 {
      font-size: 12pt;
      text-align: center;
      border-bottom: 1px solid #000;
      padding-bottom: 3px;
      margin-bottom: 8px;
    }
    .header-info {
      margin-bottom: 8px;
      font-size: 7pt;
    }
    .header-info p {
      margin: 1px 0;
    }
    table {
      width: 120%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 5pt;
      margin-left:-100px;
      margin-bottom: 30px;
    }
    th, td {
      border: 1px solid #ccc;
      padding: 2px 2px;
      vertical-align: top;
      word-wrap: break-word;
      word-break: break-word;
    }
    th:nth-child(1) { width: 4%; }
    th:nth-child(2) { width: 13%; }
    th:nth-child(3) { width: 6%; }
    th:nth-child(4) { width: 15%; }
    th:nth-child(5) { width: 9%; }
    th:nth-child(6) { width: 6%; }
    th:nth-child(7) { width: 10%; }
    th:nth-child(8) { width: 18%; }
    th:nth-child(9) { width: 19%; }
    
    th {
      background: #e0e0e0;
      font-weight: bold;
      text-align: left;
    }
    tr:nth-child(even) {
      background: #f9f9f9;
    }
    .footer {
      position: fixed;
      bottom: 20px;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 6pt;
      color: #666;
      border-top: 1px solid #ccc;
      padding-top: 4px;
    }
  </style>
</head>
<body>
  <h1>ZETECH UNIVERSITY CATHOLIC ACTION MEMBERS</h1>
  
  
  <div class="header-info">
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>Total Records:</strong> ${data.length}</p>
  </div>

  <table>
    <thead>
      <tr>${headerRow}</tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <div class="footer">
    Generated by ZUCA Portal - User Management System
  </div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'application/msword' });
  saveAs(blob, `${filename}.doc`);
};
  const formatSpecialRole = (role) => {
    const roles = {
      'jumuia_leader': 'Jumuia Leader',
      'treasurer': 'Treasurer',
      'secretary': 'Secretary',
      'choir_moderator': 'Choir Moderator',
      'media_moderator': 'Media Moderator' 
    };
    return roles[role] || role;
  };

  const getSpecialRoleStyle = (role) => {
    switch(role) {
      case 'jumuia_leader': return { background: '#f3e8ff', color: '#9333ea' };
      case 'treasurer': return { background: '#fef3c7', color: '#d97706' };
      case 'secretary': return { background: '#d1fae5', color: '#059669' };
      case 'choir_moderator': return { background: '#fce7f3', color: '#db2777' };
      default: return { background: '#f1f5f9', color: '#475569' };
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading users...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Notification */}
      <AnimatePresence>
        {notification.show && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            style={{ ...styles.notification, background: notification.type === "success" ? "#10b981" : "#ef4444" }}
          >
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>User Management</h1>
          <p style={styles.subtitle}>Manage system users, roles, and permissions</p>
        </div>
        <div style={styles.headerActions}>
          <div style={styles.exportWrapper} ref={exportMenuRef}>
            <button style={styles.exportBtn} onClick={() => setShowExportMenu(!showExportMenu)}>
              <FiDownload size={16} /> Export <FiChevronDown size={14} />
            </button>
    <AnimatePresence>
  {showExportMenu && (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={styles.exportMenu}>
     <button style={styles.exportMenuItem} onClick={() => {
  // Direct Excel export - no state needed
  const dataToExport = selectedUsers.length > 0 
    ? users.filter(u => selectedUsers.includes(u.id))
    : filteredUsers;
  
  const exportData = dataToExport
    .filter(user => user.role !== "admin")
    .map(user => ({
      Name: user.fullName,
      "Membership #": user.membership_number || "N/A",
      Email: user.email,
      "Phone Number": user.phone || "N/A",
      Role: user.role === "member" ? "Member" : user.role,
      "Special Role": user.specialRole ? formatSpecialRole(user.specialRole) : "None",
      "Home Jumuia": user.homeJumuia?.name || "N/A",
      "Leading Jumuia": user.specialRole === "jumuia_leader" ? (user.leadingJumuia?.name || "N/A") : "N/A",
    }));

  const filename = `users_${new Date().toISOString().split('T')[0]}`;
  
  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Users");
  XLSX.writeFile(wb, `${filename}.xlsx`);
  
  setShowExportMenu(false);
  showNotification(`Exported ${exportData.length} users`, "success");
}}>
  📊 Excel Spreadsheet
</button>

<button style={styles.exportMenuItem} onClick={() => {
  // Direct Word export
  const dataToExport = selectedUsers.length > 0 
    ? users.filter(u => selectedUsers.includes(u.id))
    : filteredUsers;
  
  const exportData = dataToExport
    .filter(user => user.role !== "admin")
    .map(user => ({
      Name: user.fullName,
      "Membership #": user.membership_number || "N/A",
      Email: user.email,
      "Phone Number": user.phone || "N/A",
      Role: user.role === "member" ? "Member" : user.role,
      "Special Role": user.specialRole ? formatSpecialRole(user.specialRole) : "None",
      "Home Jumuia": user.homeJumuia?.name || "N/A",
      "Leading Jumuia": user.specialRole === "jumuia_leader" ? (user.leadingJumuia?.name || "N/A") : "N/A",
    }));

  const filename = `users_${new Date().toISOString().split('T')[0]}`;
  
  exportToWord(exportData, filename);
  setShowExportMenu(false);
  showNotification(`Exported ${exportData.length} users`, "success");
}}>
  📄 Word Document
</button>
      <div style={styles.exportMenuNote}>{selectedUsers.length > 0 ? `${selectedUsers.length} selected` : `${filteredUsers.length} filtered`}</div>
    </motion.div>
  )}
</AnimatePresence>
          </div>
          <button style={styles.refreshBtn} onClick={fetchUsers}><FiRefreshCw size={16} /> Refresh</button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}><div style={{...styles.statIcon, background: "#3b82f6"}}><FiUsers size={24} /></div><div><span style={styles.statValue}>{stats.total}</span><span style={styles.statLabel}>Total Users</span></div></div>
        <div style={styles.statCard}><div style={{...styles.statIcon, background: "#10b981"}}><FiUserCheck size={24} /></div><div><span style={styles.statValue}>{stats.online}</span><span style={styles.statLabel}>Online Now</span></div></div>
        <div style={styles.statCard}><div style={{...styles.statIcon, background: "#8b5cf6"}}><FiShield size={24} /></div><div><span style={styles.statValue}>{stats.admins}</span><span style={styles.statLabel}>Admins</span></div></div>
        <div style={styles.statCard}><div style={{...styles.statIcon, background: "#f59e0b"}}><FiUser size={24} /></div><div><span style={styles.statValue}>{stats.members}</span><span style={styles.statLabel}>Members</span></div></div>
      </div>

      {/* Filters */}
      <div style={styles.filtersBar}>
        <div style={styles.searchWrapper}><FiSearch size={18} /><input type="text" placeholder="Search by name, email or membership..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={styles.searchInput} /></div>
        <select style={styles.filterSelect} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="all">All Roles</option>
          <option value="admin">Admins</option>
          <option value="member">Members</option>
        </select>
        <select style={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </select>
        {selectedUsers.length > 0 && (<button style={styles.bulkDeleteBtn} onClick={handleBulkDelete}><FiTrash2 size={14} /> Delete ({selectedUsers.length})</button>)}
      </div>

      {/* Users Table */}
      <div style={styles.tableContainer}>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.checkboxCell}><input type="checkbox" checked={selectAll} onChange={toggleSelectAll} style={styles.checkbox} /></th>
                <th style={styles.tableHeader}>User</th>
                <th style={styles.tableHeader}>Membership #</th>
                <th style={styles.tableHeader}>Email</th>
                <th style={styles.tableHeader}>Phone</th>
                <th style={styles.tableHeader}>Role</th>
                <th style={styles.tableHeader}>Special Role</th>
                <th style={styles.tableHeader}>Home Jumuia</th>
                <th style={styles.tableHeader}>Leading Jumuia</th>
                <th style={styles.tableHeader}>Status</th>
                <th style={styles.tableHeader}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} style={{...styles.tableRow, ...(hoveredRow === user.id && styles.tableRowHover)}} onMouseEnter={() => setHoveredRow(user.id)} onMouseLeave={() => setHoveredRow(null)}>
                  <td style={styles.checkboxCell}><input type="checkbox" checked={selectedUsers.includes(user.id)} onChange={() => toggleSelectUser(user.id)} style={styles.checkbox} /></td>
                  <td style={styles.tableCell}>
                    <div style={styles.userCell}>
                      {user.profileImage ? (
                        <img src={user.profileImage.startsWith("http") ? user.profileImage : `${BASE_URL}/${user.profileImage}`} alt={user.fullName} style={styles.userAvatar} onClick={() => setModalUser(user)} />
                      ) : (
                        <div style={styles.userAvatar} onClick={() => setModalUser(user)}>{user.fullName?.charAt(0).toUpperCase()}</div>
                      )}
                      <div><div style={styles.userName}>{user.fullName}</div><div style={styles.userId}>ID: {user.id?.slice(0, 8)}...</div></div>
                    </div>
                  </td>
                  <td style={styles.tableCell}>
                    <div style={styles.membershipCell}>
                      <span style={styles.membershipNumber}>{user.membership_number || "—"}</span>
                      {user.membership_number && <button style={styles.copyBtn} onClick={() => copyToClipboard(user.membership_number, `mem-${user.id}`)}>{copiedId === `mem-${user.id}` ? <FiCheck size={12} /> : <FiCopy size={12} />}</button>}
                    </div>
                  </td>
                  <td style={styles.tableCell}>
                    <div style={styles.emailCell}>
                      <FiMail size={14} />
                      <span style={styles.userEmail}>{user.email}</span>
                      <button style={styles.copyBtn} onClick={() => copyToClipboard(user.email, `email-${user.id}`)}>{copiedId === `email-${user.id}` ? <FiCheck size={12} /> : <FiCopy size={12} />}</button>
                    </div>
                  </td>

                  <td style={styles.tableCell}>
  <div style={styles.phoneCell}>
    {user.phone ? (
      <>
        <span style={styles.phoneNumber}>{user.phone}</span>
        <button 
          style={styles.copyBtn} 
          onClick={() => copyToClipboard(user.phone, `phone-${user.id}`)}
          title="Copy phone number"
        >
          {copiedId === `phone-${user.id}` ? <FiCheck size={12} /> : <FiCopy size={12} />}
        </button>
      </>
    ) : (
      <span style={{ color: '#94a3b8' }}>—</span>
    )}
  </div>
</td>
                  <td style={styles.tableCell}>
                    <span style={{...styles.roleBadge, ...(user.role === "admin" ? styles.roleAdmin : styles.roleMember)}}>{user.role}</span>
                  </td>
                  <td style={styles.tableCell}>
                    {user.specialRole ? <span style={{...styles.specialRoleBadge, ...getSpecialRoleStyle(user.specialRole)}}>{formatSpecialRole(user.specialRole)}</span> : <span style={{ color: '#94a3b8' }}>—</span>}
                  </td>
                  <td style={styles.tableCell}><span style={styles.jumuiaBadge}>{user.homeJumuia?.name || "—"}</span></td>
                  <td style={styles.tableCell}>
                    {user.specialRole === "jumuia_leader" ? (
                      <span style={styles.jumuiaBadge}>{user.leadingJumuia?.name || "—"}</span>
                    ) : <span style={{ color: '#94a3b8' }}>—</span>}
                  </td>
                  <td style={styles.tableCell}>
                    <div style={styles.statusCell}>
                      <span style={{...styles.statusDot, background: user.online ? "#10b981" : "#94a3b8"}}></span>
                      <span>{user.online ? "Online" : "Offline"}</span>
                    </div>
                  </td>
                  <td style={styles.tableCell}>
                    <div style={styles.actionButtons}>
                      <button style={styles.viewBtn} onClick={() => setModalUser(user)} title="View Details"><FiEye size={14} /></button>
                      {user.role === "member" ? (
                        <button style={styles.promoteBtn} onClick={() => changeRole(user.id, "admin", user.fullName)} disabled={updatingUserId === user.id}>{updatingUserId === user.id ? "..." : "Promote"}</button>
                      ) : (
                        <button style={styles.demoteBtn} onClick={() => changeRole(user.id, "member", user.fullName)} disabled={updatingUserId === user.id}>{updatingUserId === user.id ? "..." : "Demote"}</button>
                      )}
                      <button style={styles.deleteBtn} onClick={() => deleteUser(user.id, user.fullName)} disabled={updatingUserId === user.id}><FiTrash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div style={styles.noResults}><FiSearch size={48} /><p>No users found</p><button style={styles.clearFiltersBtn} onClick={() => { setSearchTerm(""); setRoleFilter("all"); setStatusFilter("all"); }}>Clear Filters</button></div>
          )}
        </div>
      </div>

      {/* User Modal */}
      <AnimatePresence>
        {modalUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={styles.modalOverlay} onClick={() => setModalUser(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <button style={styles.modalClose} onClick={() => setModalUser(null)}><FiX size={20} /></button>
              <div style={styles.modalHeader}>
                {modalUser.profileImage ? (
                  <img src={modalUser.profileImage.startsWith("http") ? modalUser.profileImage : `${BASE_URL}/${modalUser.profileImage}`} alt={modalUser.fullName} style={styles.modalAvatarImg} />
                ) : (
                  <div style={styles.modalAvatar}>{modalUser.fullName?.charAt(0).toUpperCase()}</div>
                )}
                <div><h2 style={styles.modalName}>{modalUser.fullName}</h2><p style={styles.modalEmail}>{modalUser.email}</p></div>
              </div>
              <div style={styles.modalBody}>
                <div style={styles.modalInfoRow}><span style={styles.modalInfoLabel}>Membership #</span><span>{modalUser.membership_number || "Not assigned"}</span></div>
                <div style={styles.modalInfoRow}><span style={styles.modalInfoLabel}>User ID</span><span>{modalUser.id}</span></div>
                <div style={styles.modalInfoRow}><span style={styles.modalInfoLabel}>Role</span><span style={{...styles.modalRole, ...(modalUser.role === "admin" ? styles.roleAdmin : styles.roleMember)}}>{modalUser.role}</span></div>
                <div style={styles.modalInfoRow}><span style={styles.modalInfoLabel}>Special Role</span><span>{modalUser.specialRole ? formatSpecialRole(modalUser.specialRole) : "None"}</span></div>
                <div style={styles.modalInfoRow}><span style={styles.modalInfoLabel}>Home Jumuia</span><span>{modalUser.homeJumuia?.name || "Not assigned"}</span></div>
                {modalUser.specialRole === "jumuia_leader" && (
                  <div style={styles.modalInfoRow}><span style={styles.modalInfoLabel}>Leading Jumuia</span><span>{modalUser.leadingJumuia?.name || "Not assigned"}</span></div>
                )}
                <div style={styles.modalInfoRow}><span style={styles.modalInfoLabel}>Status</span><span><span style={{...styles.statusDot, background: modalUser.online ? "#10b981" : "#94a3b8", display: "inline-block", marginRight: "8px"}}></span>{modalUser.online ? "Online" : "Offline"}</span></div>
                <div style={styles.modalInfoRow}><span style={styles.modalInfoLabel}>Member Since</span><span>{modalUser.createdAt ? new Date(modalUser.createdAt).toLocaleDateString() : "N/A"}</span></div>
              </div>
              <div style={styles.modalFooter}>
                <button style={styles.modalActionBtn} onClick={() => { changeRole(modalUser.id, modalUser.role === "member" ? "admin" : "member", modalUser.fullName); setModalUser(null); }}>{modalUser.role === "member" ? "Make Admin" : "Make Member"}</button>
                <button style={styles.modalDeleteBtn} onClick={() => { deleteUser(modalUser.id, modalUser.fullName); setModalUser(null); }}>Delete User</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @media (max-width: 768px) { 
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; } 
          .filters-bar { flex-direction: column; align-items: stretch !important; } 
          .search-wrapper { width: 100%; }
          .table-wrapper { overflow-x: auto; }
          .table { min-width: 1000px; }
        }
        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: 1fr !important; }
          .header { flex-direction: column; align-items: stretch; }
          .header-actions { justify-content: stretch; }
          .export-btn, .refresh-btn { flex: 1; justify-content: center; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", 
    marginTop: "50px",
    background: "#f8fafc", padding: "24px", fontFamily: "'Inter', -apple-system, sans-serif" },
  notification: { position: "fixed", top: "80px", right: "20px", padding: "12px 20px", borderRadius: "10px", color: "white", fontSize: "13px", zIndex: 9999, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" },
  loadingContainer: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc" },
  spinner: { width: "40px", height: "40px", border: "3px solid #e2e8f0", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "16px" },
  loadingText: { color: "#64748b", fontSize: "14px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" },
  title: { fontSize: "28px", fontWeight: "700", color: "#1e293b", margin: "0 0 4px 0" },
  subtitle: { fontSize: "14px", color: "#64748b", margin: 0 },
  headerActions: { display: "flex", gap: "12px" },
  exportWrapper: { position: "relative" },
  exportBtn: { display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", fontSize: "13px", fontWeight: "500", color: "#475569", cursor: "pointer" },
  exportMenu: { position: "absolute", top: "100%", right: -70, marginTop: "8px", width: "220px", background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", zIndex: 100, overflow: "hidden" },
  exportMenuItem: { width: "100%", padding: "12px 16px", background: "none", border: "none", textAlign: "left", fontSize: "13px", color: "#1e293b", cursor: "pointer", "&:hover": { background: "#f8fafc" } },
  exportMenuNote: { padding: "12px 16px", fontSize: "11px", color: "#94a3b8", borderTop: "1px solid #e2e8f0" },
  refreshBtn: { display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", fontSize: "13px", fontWeight: "500", color: "#475569", cursor: "pointer" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", marginBottom: "24px" },
  statCard: { background: "#ffffff", borderRadius: "16px", padding: "16px", display: "flex", alignItems: "center", gap: "14px", border: "1px solid #e2e8f0" },
  statIcon: { width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: "white" },
  statValue: { display: "block", fontSize: "24px", fontWeight: "700", color: "#1e293b", lineHeight: "1.2" },
  statLabel: { display: "block", fontSize: "12px", color: "#64748b" },
  filtersBar: { display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap", alignItems: "center" },
  searchWrapper: { flex: 1, minWidth: "250px", display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px" },
  searchInput: { flex: 1, border: "none", outline: "none", fontSize: "14px", color: "#1e293b", background: "transparent", "::placeholder": { color: "#94a3b8" } },
  filterSelect: { padding: "10px 14px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", fontSize: "13px", color: "#1e293b", cursor: "pointer", outline: "none" },
  bulkDeleteBtn: { display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", background: "#ef4444", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: "500", color: "white", cursor: "pointer" },
  tableContainer: { background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden" },
tableWrapper: { 
  overflowX: "auto",           // Allows horizontal scrolling if needed
  maxHeight: "calc(100vh - 320px)", 
  overflowY: "auto",
  width: "100%"
},table: { 

   width: "max-content", 
  borderCollapse: "collapse", 
  tableLayout: "auto"  
},  checkboxCell: { width: "40px", padding: "12px", textAlign: "center" },
  checkbox: { width: "16px", height: "16px", cursor: "pointer", accentColor: "#3b82f6" },
  tableHeader: { padding: "14px 12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#64748b", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", position: "sticky", top: 0 },
  tableRow: { borderBottom: "1px solid #f1f5f9", transition: "background 0.2s" },
  tableRowHover: { background: "#f8fafc" },
tableCell: { 
  padding: "14px 12px", 
  fontSize: "13px", 
  color: "#1e293b",
  whiteSpace: "nowrap",        // Prevents text from wrapping
  borderBottom: "1px solid #f1f5f9"
},  

userCell: { display: "flex", alignItems: "center", gap: "12px" },
  userAvatar: { width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "600", cursor: "pointer" },
  userName: { fontWeight: "600", color: "#1e293b", marginBottom: "2px" },
  userId: { fontSize: "11px", color: "#94a3b8" },
  membershipCell: { display: "flex", alignItems: "center", gap: "8px" },
  membershipNumber: { fontFamily: "monospace", fontSize: "12px", color: "#1e293b", background: "#f8fafc", padding: "4px 8px", borderRadius: "6px" },
  copyBtn: { width: "28px", height: "28px", borderRadius: "6px", border: "none", background: "#f1f5f9", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  emailCell: { display: "flex", alignItems: "center", gap: "8px" },
  userEmail: { fontSize: "12px", color: "#475569", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  roleBadge: { display: "inline-block", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600" },
  roleAdmin: { background: "#fef2f2", color: "#ef4444" },
  roleMember: { background: "#eff6ff", color: "#3b82f6" },
  specialRoleBadge: { display: "inline-block", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "500" },
  jumuiaBadge: { fontSize: "12px", color: "#64748b", background: "#f8fafc", padding: "4px 8px", borderRadius: "6px" },
  statusCell: { display: "flex", alignItems: "center", gap: "8px" },
  statusDot: { width: "8px", height: "8px", borderRadius: "50%", display: "inline-block" },
  actionButtons: { display: "flex", gap: "8px", alignItems: "center" },
  viewBtn: { padding: "6px", borderRadius: "6px", border: "none", background: "#f1f5f9", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  promoteBtn: { padding: "6px 12px", background: "#10b981", color: "white", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: "500", cursor: "pointer" },
  demoteBtn: { padding: "6px 12px", background: "#f59e0b", color: "white", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: "500", cursor: "pointer" },
  deleteBtn: { padding: "6px", borderRadius: "6px", border: "none", background: "#fef2f2", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  noResults: { padding: "60px 20px", textAlign: "center", color: "#94a3b8" },
  clearFiltersBtn: { marginTop: "12px", padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: "8px", color: "#475569", cursor: "pointer" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" },
  modalContent: { background: "#ffffff", borderRadius: "20px", width: "100%", maxWidth: "480px", maxHeight: "90vh", overflow: "auto", position: "relative" },
  modalClose: { position: "absolute", top: "16px", right: "16px", width: "32px", height: "32px", borderRadius: "16px", border: "none", background: "#f1f5f9", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  modalHeader: { padding: "24px", display: "flex", alignItems: "center", gap: "16px", borderBottom: "1px solid #e2e8f0" },
  modalAvatar: { width: "64px", height: "64px", borderRadius: "32px", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: "600" },
  modalAvatarImg: { width: "64px", height: "64px", borderRadius: "32px", objectFit: "cover" },
  modalName: { fontSize: "20px", fontWeight: "700", color: "#1e293b", margin: "0 0 4px 0" },
  modalEmail: { fontSize: "13px", color: "#64748b", margin: 0 },
  modalBody: { padding: "20px 24px" },
  modalInfoRow: { display: "flex", marginBottom: "14px", fontSize: "13px" },
  modalInfoLabel: { width: "110px", color: "#64748b" },
  modalRole: { display: "inline-block", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600" },
  modalFooter: { padding: "16px 24px", borderTop: "1px solid #e2e8f0", display: "flex", gap: "12px", justifyContent: "flex-end" },
  modalActionBtn: { padding: "8px 16px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "500", cursor: "pointer" },
  modalDeleteBtn: { padding: "8px 16px", background: "#fef2f2", color: "#ef4444", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "500", cursor: "pointer" },phoneCell: { 
  display: "flex", 
  alignItems: "center", 
  gap: "8px" 
},
phoneNumber: { 
  fontSize: "12px", 
  color: "#475569",
  fontFamily: "monospace"
},


};