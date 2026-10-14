import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import BASE_URL from "../../api";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaSearch, FaTimes, FaCrown, FaShieldAlt, FaUser, 
  FaUsers, FaUserCog, FaSave, FaSpinner, FaChevronDown,
  FaChevronUp, FaEnvelope, FaIdBadge, FaUserTag,
  FaUserShield, FaMoneyBillWave, FaClipboardList,
  FaMusic, FaCamera, FaChurch, FaUserCircle,
  FaSortNumericDown, FaList, FaThLarge, FaFilter,
  FaUserPlus, FaUserMinus, FaCheckCircle, FaTimesCircle,
  FaClock, FaCalendarAlt
} from 'react-icons/fa';

export default function RoleManagement() {
  const [users, setUsers] = useState([]);
  const [jumuias, setJumuias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    role: 'all',
    specialRole: 'all',
    hasSpecialRole: 'all',
    jumuia: 'all'
  });
  
  const [expandedSections, setExpandedSections] = useState({
    special: false,
    admin: false,
    regular: false,
    allUsers: false
  });
  
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchData();
  }, []);

 const fetchData = async () => {
  setLoading(true);
  try {
    const token = localStorage.getItem("token");
    
    const usersRes = await axios.get(`${BASE_URL}/api/users`, { 
      headers: { Authorization: `Bearer ${token}` } 
    });
    
    const jumuiaRes = await axios.get(`${BASE_URL}/api/jumuia`, { 
      headers: { Authorization: `Bearer ${token}` } 
    });
    
    const membershipMap = {};
    
    for (const jumuia of jumuiaRes.data) {
      try {
        const membersRes = await axios.get(`${BASE_URL}/api/admin/jumuia/${jumuia.id}/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        membersRes.data.forEach(member => {
          if (!membershipMap[member.id]) {
            membershipMap[member.id] = [];
          }
          membershipMap[member.id].push({
            jumuiaId: jumuia.id,
            jumuiaName: jumuia.name,
            isLeader: member.specialRole === 'jumuia_leader' || member.id === jumuia.leaderId
          });
        });
      } catch (err) {
        console.error(`Failed to fetch members for ${jumuia.name}:`, err);
      }
    }
    
    const usersWithMemberships = usersRes.data.map(user => ({
      ...user,
      jumuiaMembers: membershipMap[user.id] || []
    }));
    
    setUsers(usersWithMemberships);
    setJumuias(jumuiaRes.data);
  } catch (err) {
    console.error("Failed to fetch data:", err);
  } finally {
    setLoading(false);
  }
};
  const updateUserRole = async (userId, role, specialRole, assignedJumuiaId = null) => {
    setUpdating(userId);
    try {
      await axios.put(
        `${BASE_URL}/api/users/${userId}/role`,
        { role, specialRole, assignedJumuiaId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchData();
    } catch (err) {
      console.error("Failed to update role:", err);
      alert("Failed to update role");
    } finally {
      setUpdating(null);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getMembershipNumber = (membershipNumber) => {
    if (!membershipNumber) return 0;
    const match = membershipNumber.match(/#(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const numA = getMembershipNumber(a.membership_number);
      const numB = getMembershipNumber(b.membership_number);
      return numA - numB;
    });
  }, [users]);

  const applyFilters = (user) => {
    if (filters.role !== 'all' && user.role !== filters.role) return false;
    
    if (filters.specialRole !== 'all' && user.specialRole !== filters.specialRole) return false;
    
    if (filters.hasSpecialRole === 'yes' && !user.specialRole) return false;
    if (filters.hasSpecialRole === 'no' && user.specialRole) return false;
    
    if (filters.jumuia !== 'all') {
      const isMemberOfJumuia = user.jumuiaMembers && user.jumuiaMembers.some(
        membership => membership.jumuiaId === filters.jumuia
      );
      
      const isLeaderOfJumuia = user.assignedJumuiaId === filters.jumuia;
      
      if (!isMemberOfJumuia && !isLeaderOfJumuia) return false;
    }
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return user.fullName?.toLowerCase().includes(term) ||
             user.email?.toLowerCase().includes(term) ||
             user.membership_number?.toLowerCase().includes(term);
    }
    
    return true;
  };

  const filteredUsers = useMemo(() => {
    return sortedUsers.filter(applyFilters);
  }, [sortedUsers, filters, searchTerm]);

  const usersWithSpecialRoles = filteredUsers.filter(user => user.specialRole);
  const admins = filteredUsers.filter(user => user.role === "admin" && !user.specialRole);
  const regularMembers = filteredUsers.filter(user => user.role === "member" && !user.specialRole);

  const resetFilters = () => {
    setFilters({
      role: 'all',
      specialRole: 'all',
      hasSpecialRole: 'all',
      jumuia: 'all'
    });
    setSearchTerm('');
  };

  const activeFilterCount = () => {
    let count = 0;
    if (filters.role !== 'all') count++;
    if (filters.specialRole !== 'all') count++;
    if (filters.hasSpecialRole !== 'all') count++;
    if (filters.jumuia !== 'all') count++;
    if (searchTerm.trim()) count++;
    return count;
  };

  if (loading) {
    return <SkeletonLoader />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="role-management"
    >
      <div className="header-section">
        <div>
          <h1 className="page-title">
            <FaUserCog style={{ marginRight: '12px', color: '#3b82f6' }} />
            Role Management
          </h1>
          <p className="page-description">
            Manage user roles and assign special permissions
          </p>
        </div>
        <div className="header-stats">
          <span className="stat-badge">
            <FaUsers /> {users.length} Total Users
          </span>
        </div>
      </div>

      <div className="search-wrapper">
        <div className="search-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, email or membership number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button className="clear-search-btn" onClick={() => setSearchTerm("")}>
              <FaTimes />
            </button>
          )}
        </div>
        
        <div className="action-buttons">
          <button 
            className={`filter-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <FaFilter />
            Filters
            {activeFilterCount() > 0 && (
              <span className="filter-badge">{activeFilterCount()}</span>
            )}
          </button>
          
          <div className="view-toggle">
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <FaThLarge />
            </button>
            <button 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <FaList />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="filter-panel"
          >
            <div className="filter-grid">
              <div className="filter-group">
                <label className="filter-label">Account Type</label>
                <select 
                  className="filter-select"
                  value={filters.role}
                  onChange={(e) => setFilters({...filters, role: e.target.value})}
                >
                  <option value="all">All</option>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Special Role</label>
                <select 
                  className="filter-select"
                  value={filters.specialRole}
                  onChange={(e) => setFilters({...filters, specialRole: e.target.value})}
                >
                  <option value="all">All</option>
                  <option value="jumuia_leader">Jumuia Leader</option>
                  <option value="treasurer">Treasurer</option>
                  <option value="secretary">Secretary</option>
                  <option value="choir_moderator">Choir Moderator</option>
                  <option value="media_moderator">Media Moderator</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Has Special Role</label>
                <select 
                  className="filter-select"
                  value={filters.hasSpecialRole}
                  onChange={(e) => setFilters({...filters, hasSpecialRole: e.target.value})}
                >
                  <option value="all">All</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Jumuia</label>
                <select 
                  className="filter-select"
                  value={filters.jumuia}
                  onChange={(e) => setFilters({...filters, jumuia: e.target.value})}
                >
                  <option value="all">All Jumuias</option>
                  <option value="assigned">Assigned to Any Jumuia</option>
                  <option value="unassigned">Not Assigned to Any Jumuia</option>
                  {jumuias.map(j => (
                    <option key={j.id} value={j.id}>{j.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="filter-actions">
              <button className="filter-reset" onClick={resetFilters}>
                <FaTimes /> Reset All Filters
              </button>
              <span className="filter-result-count">
                {filteredUsers.length} users found
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="role-section all-users-section">
        <div 
          className="section-header" 
          onClick={() => toggleSection('allUsers')}
        >
          <div className="section-title-wrapper">
            <FaUsers className="section-icon" />
            <div>
              <span className="section-title">All Users</span>
              <span className="section-subtitle">
                <FaSortNumericDown style={{ marginRight: '4px' }} />
                Sorted by membership number
              </span>
            </div>
          </div>
          <div className="section-actions">
            <span className="section-count">{filteredUsers.length}</span>
            <span className="section-toggle">
              {expandedSections.allUsers ? <FaChevronUp /> : <FaChevronDown />}
            </span>
          </div>
        </div>
        
        <AnimatePresence>
          {expandedSections.allUsers && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="section-content"
            >
              {filteredUsers.length === 0 ? (
                <div className="empty-state-small">
                  <FaSearch className="empty-icon-small" />
                  <p>No users found matching your filters</p>
                  <button className="empty-clear-btn" onClick={resetFilters}>
                    Clear Filters
                  </button>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="users-grid">
                  {filteredUsers.map(user => (
                    <UserRoleCard
                      key={user.id}
                      user={user}
                      jumuias={jumuias}
                      onUpdate={updateUserRole}
                      updating={updating === user.id}
                    />
                  ))}
                </div>
              ) : (
                <div className="users-list">
                  {filteredUsers.map(user => (
                    <UserListItem
                      key={user.id}
                      user={user}
                      jumuias={jumuias}
                      onUpdate={updateUserRole}
                      updating={updating === user.id}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {usersWithSpecialRoles.length > 0 && (
        <RoleSection
          title="Users with Special Roles"
          subtitle="Privileged access members"
          icon={<FaCrown className="section-icon" />}
          count={usersWithSpecialRoles.length}
          isExpanded={expandedSections.special}
          onToggle={() => toggleSection('special')}
        >
          <div className="users-grid">
            {usersWithSpecialRoles.map(user => (
              <UserRoleCard
                key={user.id}
                user={user}
                jumuias={jumuias}
                onUpdate={updateUserRole}
                updating={updating === user.id}
              />
            ))}
          </div>
        </RoleSection>
      )}

      {admins.length > 0 && (
        <RoleSection
          title="Administrators"
          subtitle="System administrators"
          icon={<FaShieldAlt className="section-icon" />}
          count={admins.length}
          isExpanded={expandedSections.admin}
          onToggle={() => toggleSection('admin')}
        >
          <div className="users-grid">
            {admins.map(user => (
              <UserRoleCard
                key={user.id}
                user={user}
                jumuias={jumuias}
                onUpdate={updateUserRole}
                updating={updating === user.id}
              />
            ))}
          </div>
        </RoleSection>
      )}

      {regularMembers.length > 0 && (
        <RoleSection
          title="Regular Members"
          subtitle="Standard members"
          icon={<FaUser className="section-icon" />}
          count={regularMembers.length}
          isExpanded={expandedSections.regular}
          onToggle={() => toggleSection('regular')}
        >
          <div className="users-grid">
            {regularMembers.map(user => (
              <UserRoleCard
                key={user.id}
                user={user}
                jumuias={jumuias}
                onUpdate={updateUserRole}
                updating={updating === user.id}
              />
            ))}
          </div>
        </RoleSection>
      )}

      <style jsx>{`
        .role-management {
          min-height: 100%;
          padding: 24px;
          background: #f8fafc;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .header-section {
          background: white;
          border-radius: 16px;
          padding: 24px 32px;
          margin-bottom: 24px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .page-title {
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 8px 0;
          display: flex;
          align-items: center;
        }

        .page-description {
          font-size: 14px;
          color: #64748b;
          margin: 0;
        }

        .header-stats .stat-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #f1f5f9;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          color: #475569;
        }

        .search-wrapper {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }

        .search-container {
          flex: 1;
          position: relative;
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          transition: all 0.2s;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
          min-width: 200px;
        }

        .search-container:focus-within {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .search-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          font-size: 16px;
        }

        .search-input {
          width: 100%;
          padding: 14px 48px 14px 48px;
          font-size: 14px;
          border: none;
          border-radius: 12px;
          background: transparent;
          outline: none;
          color: #0f172a;
        }

        .search-input::placeholder {
          color: #94a3b8;
        }

        .clear-search-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: #f1f5f9;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .clear-search-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .filter-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
          position: relative;
        }

        .filter-toggle:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
        }

        .filter-toggle.active {
          border-color: #3b82f6;
          background: #eff6ff;
          color: #3b82f6;
        }

        .filter-badge {
          background: #3b82f6;
          color: white;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 10px;
          margin-left: 4px;
        }

        .view-toggle {
          display: flex;
          gap: 4px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 4px;
        }

        .view-btn {
          padding: 8px 12px;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
        }

        .view-btn:hover {
          background: #f1f5f9;
          color: #475569;
        }

        .view-btn.active {
          background: #3b82f6;
          color: white;
        }

        .filter-panel {
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          padding: 20px 24px;
          margin-bottom: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .filter-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .filter-label {
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .filter-select {
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 13px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-select:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .filter-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          padding-top: 12px;
          border-top: 1px solid #f1f5f9;
        }

        .filter-reset {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: #fef2f2;
          color: #ef4444;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-reset:hover {
          background: #fee2e2;
        }

        .filter-result-count {
          font-size: 13px;
          color: #64748b;
          font-weight: 500;
        }

        .role-section {
          background: white;
          border-radius: 16px;
          margin-bottom: 20px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .all-users-section {
          border-color: #3b82f6;
          border-width: 2px;
        }

        .section-header {
          padding: 18px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: background 0.2s;
          border-bottom: 1px solid #f1f5f9;
        }

        .section-header:hover {
          background: #fafbfc;
        }

        .section-title-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .section-icon {
          font-size: 22px;
          color: #3b82f6;
        }

        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: #0f172a;
          margin: 0;
        }

        .section-subtitle {
          font-size: 12px;
          color: #64748b;
          margin-left: 8px;
          display: inline-flex;
          align-items: center;
        }

        .section-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .section-count {
          background: #f1f5f9;
          color: #475569;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
        }

        .section-toggle {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          font-size: 16px;
          padding: 4px;
          transition: all 0.2s;
        }

        .section-toggle:hover {
          color: #475569;
        }

        .section-content {
          padding: 24px;
        }

        .users-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 20px;
        }

        .users-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .empty-state-small {
          text-align: center;
          padding: 32px;
          color: #94a3b8;
        }

        .empty-icon-small {
          font-size: 24px;
          color: #94a3b8;
          margin-bottom: 8px;
        }

        .empty-clear-btn {
          margin-top: 12px;
          padding: 6px 16px;
          background: #f1f5f9;
          border: none;
          border-radius: 6px;
          color: #475569;
          cursor: pointer;
          font-size: 12px;
        }

        .empty-clear-btn:hover {
          background: #e2e8f0;
        }

        @media (max-width: 768px) {
          .role-management {
            padding: 12px;
          }

          .header-section {
            padding: 16px 20px;
            flex-direction: column;
            align-items: stretch;
          }

          .page-title {
            font-size: 20px;
          }

          .section-header {
            padding: 14px 16px;
          }

          .section-content {
            padding: 16px;
          }

          .users-grid {
            grid-template-columns: 1fr;
          }

          .section-subtitle {
            display: none;
          }

          .search-wrapper {
            flex-direction: column;
          }

          .action-buttons {
            justify-content: stretch;
          }

          .filter-toggle {
            flex: 1;
            justify-content: center;
          }

          .view-toggle {
            flex: 1;
          }

          .view-btn {
            flex: 1;
            justify-content: center;
          }

          .filter-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 480px) {
          .filter-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </motion.div>
  );
}

function SkeletonLoader() {
  return (
    <div className="skeleton-container">
      <div className="skeleton-header">
        <div className="skeleton-line skeleton-title"></div>
        <div className="skeleton-line skeleton-subtitle"></div>
      </div>
      <div className="skeleton-search"></div>
      <div className="skeleton-section">
        <div className="skeleton-section-header">
          <div className="skeleton-line skeleton-section-title"></div>
          <div className="skeleton-line skeleton-section-count"></div>
        </div>
        <div className="skeleton-grid">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-card-header">
                <div className="skeleton-avatar"></div>
                <div className="skeleton-card-info">
                  <div className="skeleton-line skeleton-name"></div>
                  <div className="skeleton-line skeleton-email"></div>
                  <div className="skeleton-line skeleton-badge"></div>
                </div>
              </div>
              <div className="skeleton-card-body">
                <div className="skeleton-line skeleton-select"></div>
                <div className="skeleton-line skeleton-select"></div>
                <div className="skeleton-line skeleton-button"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .skeleton-container {
          padding: 24px;
          background: #f8fafc;
          min-height: 100vh;
        }

        .skeleton-header {
          background: white;
          border-radius: 16px;
          padding: 24px 32px;
          margin-bottom: 24px;
          border: 1px solid #e2e8f0;
        }

        .skeleton-search {
          height: 52px;
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          margin-bottom: 24px;
        }

        .skeleton-section {
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          margin-bottom: 20px;
        }

        .skeleton-section-header {
          padding: 18px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #f1f5f9;
        }

        .skeleton-grid {
          padding: 24px;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 20px;
        }

        .skeleton-card {
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }

        .skeleton-card-header {
          padding: 20px;
          display: flex;
          gap: 16px;
          border-bottom: 1px solid #f1f5f9;
          background: #fafbfc;
        }

        .skeleton-card-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .skeleton-line {
          background: #e2e8f0;
          border-radius: 6px;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .skeleton-title {
          width: 200px;
          height: 32px;
          margin-bottom: 8px;
        }

        .skeleton-subtitle {
          width: 300px;
          height: 18px;
        }

        .skeleton-section-title {
          width: 180px;
          height: 20px;
        }

        .skeleton-section-count {
          width: 40px;
          height: 24px;
          border-radius: 20px;
        }

        .skeleton-avatar {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          background: #e2e8f0;
          flex-shrink: 0;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .skeleton-card-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .skeleton-name {
          width: 140px;
          height: 18px;
        }

        .skeleton-email {
          width: 180px;
          height: 14px;
        }

        .skeleton-badge {
          width: 100px;
          height: 20px;
          border-radius: 6px;
        }

        .skeleton-select {
          width: 100%;
          height: 42px;
          border-radius: 8px;
        }

        .skeleton-button {
          width: 100%;
          height: 44px;
          border-radius: 8px;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @media (max-width: 768px) {
          .skeleton-container {
            padding: 12px;
          }

          .skeleton-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function RoleSection({ title, subtitle, icon, count, isExpanded, onToggle, children }) {
  return (
    <div className="role-section">
      <div className="section-header" onClick={onToggle}>
        <div className="section-title-wrapper">
          {icon}
          <div>
            <span className="section-title">{title}</span>
            <span className="section-subtitle">{subtitle}</span>
          </div>
        </div>
        <div className="section-actions">
          <span className="section-count">{count}</span>
          <span className="section-toggle">
            {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
          </span>
        </div>
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="section-content"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UserRoleCard({ user, jumuias, onUpdate, updating }) {
  const [role, setRole] = useState(user.role || "member");
  const [specialRole, setSpecialRole] = useState(user.specialRole || "");
  const [assignedJumuia, setAssignedJumuia] = useState(user.assignedJumuiaId || "");

  const handleSave = () => {
    onUpdate(
      user.id,
      role,
      specialRole || null,
      specialRole === "jumuia_leader" ? assignedJumuia : null
    );
  };

  const getSpecialRoleLabel = (role) => {
    const labels = {
      'admin': 'Administrator',
      'jumuia_leader': 'Jumuia Leader',
      'treasurer': 'Treasurer',
      'secretary': 'Secretary',
      'choir_moderator': 'Choir Moderator',
      'media_moderator': 'Media Moderator'
    };
    return labels[role] || role;
  };

  const getRoleIcon = (role) => {
    const icons = {
      'admin': <FaUserShield />,
      'jumuia_leader': <FaUsers />,
      'treasurer': <FaMoneyBillWave />,
      'secretary': <FaClipboardList />,
      'choir_moderator': <FaMusic />,
      'media_moderator': <FaCamera />
    };
    return icons[role] || <FaUserTag />;
  };

  const getRoleStyle = (role) => {
    const styles = {
      'admin': { background: '#fef2f2', color: '#dc2626' },
      'jumuia_leader': { background: '#f3e8ff', color: '#7c3aed' },
      'treasurer': { background: '#fef3c7', color: '#d97706' },
      'secretary': { background: '#d1fae5', color: '#059669' },
      'choir_moderator': { background: '#fce7f3', color: '#db2777' },
      'media_moderator': { background: '#dbeafe', color: '#3b82f6' }
    };
    return styles[role] || { background: '#f1f5f9', color: '#475569' };
  };

  return (
    <motion.div 
      className="user-card"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <div className="user-card-header">
        <div className="user-avatar">
          {user.profileImage ? (
            <img 
              src={user.profileImage} 
              alt={user.fullName}
              className="user-avatar-img"
            />
          ) : (
            <span>{user.fullName?.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="user-details">
          <h3 className="user-name">{user.fullName}</h3>
          <p className="user-email">
            <FaEnvelope className="detail-icon" />
            {user.email}
          </p>
          <div className="user-meta">
            <span className="membership-badge">
              <FaIdBadge className="badge-icon" />
              {user.membership_number || 'No ID'}
            </span>
            {user.specialRole && (
              <span 
                className="special-role-badge"
                style={getRoleStyle(user.specialRole)}
              >
                {getRoleIcon(user.specialRole)} {getSpecialRoleLabel(user.specialRole)}
              </span>
            )}
            {user.role === "admin" && !user.specialRole && (
              <span className="admin-badge">
                <FaShieldAlt /> Admin
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="user-card-body">
        <div className="form-group">
          <label className="form-label">
            <FaUserCog className="label-icon" /> Account Type
          </label>
          <select 
            className="form-select"
            value={role} 
            onChange={(e) => setRole(e.target.value)}
            disabled={updating}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">
            <FaUserTag className="label-icon" /> Special Role
          </label>
          <select 
            className="form-select"
            value={specialRole} 
            onChange={(e) => setSpecialRole(e.target.value)}
            disabled={updating}
          >
            <option value="">None</option>
            <option value="admin">Administrator</option>
            <option value="jumuia_leader">Jumuia Leader</option>
            <option value="treasurer">Treasurer</option>
            <option value="secretary">Secretary</option>
            <option value="choir_moderator">Choir Moderator</option>
            <option value="media_moderator">Media Moderator</option>
          </select>
        </div>

        {specialRole === "jumuia_leader" && (
          <motion.div 
            className="form-group"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <label className="form-label">
              <FaChurch className="label-icon" /> Assign Jumuia
            </label>
            <select 
              className="form-select"
              value={assignedJumuia} 
              onChange={(e) => setAssignedJumuia(e.target.value)}
              disabled={updating}
            >
              <option value="">Select Jumuia</option>
              {jumuias.map(j => (
                <option key={j.id} value={j.id}>{j.name}</option>
              ))}
            </select>
          </motion.div>
        )}

        <motion.button 
          className="save-button"
          onClick={handleSave}
          disabled={updating}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {updating ? (
            <>
              <FaSpinner className="spinning" />
              Saving...
            </>
          ) : (
            <>
              <FaSave /> Save Changes
            </>
          )}
        </motion.button>
      </div>

      <style jsx>{`
        .user-card {
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          transition: all 0.2s;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
        }

        .user-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          border-color: #cbd5e1;
        }

        .user-card-header {
          padding: 20px;
          display: flex;
          gap: 16px;
          border-bottom: 1px solid #f1f5f9;
          background: #fafbfc;
        }

        .user-avatar {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          font-weight: 600;
          flex-shrink: 0;
          overflow: hidden;
        }

        .user-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .user-details {
          flex: 1;
          min-width: 0;
        }

        .user-name {
          font-size: 16px;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 4px 0;
        }

        .user-email {
          font-size: 13px;
          color: #64748b;
          margin: 0 0 8px 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .detail-icon {
          font-size: 12px;
          color: #94a3b8;
        }

        .user-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .membership-badge {
          font-size: 11px;
          background: #f1f5f9;
          color: #475569;
          padding: 4px 10px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .badge-icon {
          font-size: 11px;
        }

        .special-role-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
        }

        .admin-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          background: #fef2f2;
          color: #dc2626;
        }

        .user-card-body {
          padding: 20px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group:last-of-type {
          margin-bottom: 0;
        }

        .form-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .label-icon {
          font-size: 12px;
        }

        .form-select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          color: #0f172a;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
        }

        .form-select:hover:not(:disabled) {
          border-color: #cbd5e1;
        }

        .form-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-select:disabled {
          background: #f8fafc;
          cursor: not-allowed;
          opacity: 0.7;
        }

        .save-button {
          width: 100%;
          padding: 12px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 8px;
        }

        .save-button:hover:not(:disabled) {
          background: #2563eb;
        }

        .save-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinning {
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
}

function UserListItem({ user, jumuias, onUpdate, updating }) {
  const [role, setRole] = useState(user.role || "member");
  const [specialRole, setSpecialRole] = useState(user.specialRole || "");
  const [assignedJumuia, setAssignedJumuia] = useState(user.assignedJumuiaId || "");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSave = () => {
    onUpdate(
      user.id,
      role,
      specialRole || null,
      specialRole === "jumuia_leader" ? assignedJumuia : null
    );
  };

  const getSpecialRoleLabel = (role) => {
    const labels = {
      'admin': 'Administrator',
      'jumuia_leader': 'Jumuia Leader',
      'treasurer': 'Treasurer',
      'secretary': 'Secretary',
      'choir_moderator': 'Choir Moderator',
      'media_moderator': 'Media Moderator'
    };
    return labels[role] || role;
  };

  const getRoleStyle = (role) => {
    const styles = {
      'admin': { background: '#fef2f2', color: '#dc2626' },
      'jumuia_leader': { background: '#f3e8ff', color: '#7c3aed' },
      'treasurer': { background: '#fef3c7', color: '#d97706' },
      'secretary': { background: '#d1fae5', color: '#059669' },
      'choir_moderator': { background: '#fce7f3', color: '#db2777' },
      'media_moderator': { background: '#dbeafe', color: '#3b82f6' }
    };
    return styles[role] || { background: '#f1f5f9', color: '#475569' };
  };

  return (
    <motion.div 
      className="user-list-item"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="list-item-main" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="list-avatar">
          {user.profileImage ? (
            <img src={user.profileImage} alt={user.fullName} className="list-avatar-img" />
          ) : (
            <span>{user.fullName?.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="list-info">
          <div className="list-name">
            {user.fullName}
            <span className="list-membership">{user.membership_number || 'No ID'}</span>
          </div>
          <div className="list-email">
            <FaEnvelope className="list-icon" /> {user.email}
          </div>
        </div>
        <div className="list-badges">
          {user.specialRole && (
            <span className="list-role-badge" style={getRoleStyle(user.specialRole)}>
              {getSpecialRoleLabel(user.specialRole)}
            </span>
          )}
          {user.role === "admin" && !user.specialRole && (
            <span className="list-admin-badge">Admin</span>
          )}
          <span className={`list-expand ${isExpanded ? 'expanded' : ''}`}>
            <FaChevronDown />
          </span>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="list-expanded"
          >
            <div className="list-form-row">
              <div className="list-form-group">
                <label className="list-form-label">Account Type</label>
                <select 
                  className="list-form-select"
                  value={role} 
                  onChange={(e) => setRole(e.target.value)}
                  disabled={updating}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="list-form-group">
                <label className="list-form-label">Special Role</label>
                <select 
                  className="list-form-select"
                  value={specialRole} 
                  onChange={(e) => setSpecialRole(e.target.value)}
                  disabled={updating}
                >
                  <option value="">None</option>
                  <option value="admin">Administrator</option>
                  <option value="jumuia_leader">Jumuia Leader</option>
                  <option value="treasurer">Treasurer</option>
                  <option value="secretary">Secretary</option>
                  <option value="choir_moderator">Choir Moderator</option>
                  <option value="media_moderator">Media Moderator</option>
                </select>
              </div>
              {specialRole === "jumuia_leader" && (
                <div className="list-form-group">
                  <label className="list-form-label">Assign Jumuia</label>
                  <select 
                    className="list-form-select"
                    value={assignedJumuia} 
                    onChange={(e) => setAssignedJumuia(e.target.value)}
                    disabled={updating}
                  >
                    <option value="">Select Jumuia</option>
                    {jumuias.map(j => (
                      <option key={j.id} value={j.id}>{j.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <button 
                className="list-save-btn"
                onClick={handleSave}
                disabled={updating}
              >
                {updating ? <FaSpinner className="spinning" /> : <FaSave />}
                {updating ? 'Saving...' : 'Save'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .user-list-item {
          background: white;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          transition: all 0.2s;
        }

        .user-list-item:hover {
          border-color: #cbd5e1;
        }

        .list-item-main {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px 20px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .list-item-main:hover {
          background: #fafbfc;
        }

        .list-avatar {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 600;
          flex-shrink: 0;
          overflow: hidden;
        }

        .list-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .list-info {
          flex: 1;
          min-width: 0;
        }

        .list-name {
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .list-membership {
          font-size: 11px;
          font-weight: 400;
          color: #94a3b8;
          font-family: monospace;
        }

        .list-email {
          font-size: 12px;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .list-icon {
          font-size: 11px;
          color: #94a3b8;
        }

        .list-badges {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .list-role-badge {
          padding: 3px 10px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
        }

        .list-admin-badge {
          padding: 3px 10px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          background: #fef2f2;
          color: #dc2626;
        }

        .list-expand {
          color: #94a3b8;
          transition: transform 0.2s;
          font-size: 12px;
        }

        .list-expand.expanded {
          transform: rotate(180deg);
        }

        .list-expanded {
          padding: 16px 20px;
          border-top: 1px solid #f1f5f9;
          background: #fafbfc;
        }

        .list-form-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: flex-end;
        }

        .list-form-group {
          flex: 1;
          min-width: 150px;
        }

        .list-form-label {
          display: block;
          font-size: 10px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin-bottom: 4px;
        }

        .list-form-select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 13px;
          background: white;
          cursor: pointer;
        }

        .list-form-select:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .list-save-btn {
          padding: 8px 20px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .list-save-btn:hover:not(:disabled) {
          background: #2563eb;
        }

        .list-save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .list-item-main {
            flex-wrap: wrap;
            padding: 12px 16px;
          }

          .list-badges {
            margin-left: auto;
          }

          .list-form-row {
            flex-direction: column;
          }

          .list-form-group {
            min-width: 100%;
          }

          .list-save-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </motion.div>
  );
}