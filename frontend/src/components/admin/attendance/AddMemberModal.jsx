import React, { useState, useEffect } from 'react';
import { X, User, Phone, Briefcase, Home, FileText, Search, CheckCircle, Users, Upload, Clock, Hash, Plus, List } from 'lucide-react';
import { api } from '../../../api';

export default function AddMemberModal({ sheetId, onClose, onAdd }) {
  // ============ STATE ============
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    role: 'member',
    specialRole: '',
    membershipNumber: '',
    jumuiaId: '',
    jumuiaName: '',
    signTime: '',
    notes: ''
  });
  
  const [jumuiaList, setJumuiaList] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingJumuia, setLoadingJumuia] = useState(true);
  const [bulkData, setBulkData] = useState('');
  const [bulkPreview, setBulkPreview] = useState([]);
  const [isBulkMode, setIsBulkMode] = useState(false); // Toggle between bulk and single mode
  
  // ============ FETCH JUMUIA LIST ============
  useEffect(() => {
    const fetchJumuia = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await api.get('/api/jumuia', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setJumuiaList(response.data || []);
      } catch (error) {
        console.error('Error fetching jumuia:', error);
      } finally {
        setLoadingJumuia(false);
      }
    };
    fetchJumuia();
  }, []);
  
  // ============ SEARCH USER BY PHONE ============
  const searchUserByPhone = async (phone) => {
    if (!phone || phone.length < 6) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    try {
      const token = localStorage.getItem('token');
      const response = await api.get(`/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const users = response.data || [];
      const results = users.filter(user => 
        user.phone && user.phone.includes(phone) ||
        user.membership_number && user.membership_number.includes(phone)
      );
      setSearchResults(results.slice(0, 5));
    } catch (error) {
      console.error('Error searching user:', error);
    } finally {
      setSearching(false);
    }
  };
  
  // ============ HANDLE INPUT CHANGE ============
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'phoneNumber') {
      searchUserByPhone(value);
    }
  };
  
  // ============ SELECT EXISTING USER ============
  const selectUser = (user) => {
    setSelectedUser(user);
    setFormData({
      fullName: user.fullName,
      phoneNumber: user.phone || '',
      role: user.role || 'member',
      specialRole: user.specialRole || '',
      membershipNumber: user.membership_number || '',
      jumuiaId: user.jumuiaId || '',
      jumuiaName: user.homeJumuia?.name || '',
      signTime: '',
      notes: ''
    });
    setSearchResults([]);
  };
  
  // ============ CLEAR SELECTION ============
  const clearSelection = () => {
    setSelectedUser(null);
    setFormData({
      fullName: '',
      phoneNumber: '',
      role: 'member',
      specialRole: '',
      membershipNumber: '',
      jumuiaId: '',
      jumuiaName: '',
      signTime: '',
      notes: ''
    });
  };
  
  // ============ PARSE BULK DATA ============
  const parseBulkData = () => {
    const lines = bulkData.split('\n').filter(line => line.trim());
    const parsed = [];
    
    for (const line of lines) {
      // Support format: Name, Phone, Role, Membership#, Time
      const parts = line.split(',').map(p => p.trim());
      
      parsed.push({
        fullName: parts[0] || '',
        phoneNumber: parts[1] || null,
        role: parts[2] || 'Guest',
        membershipNumber: parts[3] || null,
        signTime: parts[4] || null,
        valid: !!parts[0]
      });
    }
    
    setBulkPreview(parsed);
  };
  
  // Update preview when bulk data changes
  useEffect(() => {
    if (bulkData) {
      parseBulkData();
    } else {
      setBulkPreview([]);
    }
  }, [bulkData]);
  
  // ============ HANDLE BULK ADD ============
  const handleBulkAdd = async () => {
    if (bulkPreview.length === 0) {
      alert('Please enter at least one name');
      return;
    }
    
    const validEntries = bulkPreview.filter(item => item.valid && item.fullName);
    if (validEntries.length === 0) {
      alert('No valid entries found');
      return;
    }
    
    if (!confirm(`Add ${validEntries.length} members to this meeting?`)) {
      return;
    }
    
    setLoading(true);
    let successCount = 0;
    let failCount = 0;
    const failedNames = [];
    
    for (const entry of validEntries) {
      try {
        await onAdd({
          fullName: entry.fullName,
          phoneNumber: entry.phoneNumber || null,
          role: entry.role === 'Guest' || entry.role === 'guest' ? 'Guest' : entry.role || 'Guest',
          specialRole: null,
          membershipNumber: entry.membershipNumber || null,
          jumuiaId: null,
          jumuiaName: null,
          signTime: entry.signTime || new Date().toISOString(),
          notes: 'Bulk added via textarea'
        });
        successCount++;
      } catch (error) {
        failCount++;
        failedNames.push(entry.fullName);
        console.error(`Failed to add ${entry.fullName}:`, error);
      }
    }
    
    alert(`✅ Added: ${successCount}\n❌ Failed: ${failCount}\n${failedNames.length > 0 ? `Failed: ${failedNames.slice(0, 5).join(', ')}${failedNames.length > 5 ? '...' : ''}` : ''}`);
    
    if (successCount > 0) {
      setBulkData('');
      setBulkPreview([]);
      onClose();
    }
    setLoading(false);
  };
  
  // ============ HANDLE SUBMIT (Single) ============
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.fullName) {
      alert('Please enter full name');
      return;
    }
    
    setLoading(true);
    try {
      const submitData = {
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber || null,
        role: formData.role === 'Guest' ? 'Guest' : formData.role,
        specialRole: formData.specialRole || null,
        membershipNumber: formData.membershipNumber || null,
        jumuiaId: formData.jumuiaId || null,
        jumuiaName: formData.jumuiaName || null,
        signTime: formData.signTime || new Date().toISOString(),
        notes: formData.notes || null
      };
      
      await onAdd(submitData);
      onClose();
    } catch (error) {
      console.error('Error adding member:', error);
      alert(error.response?.data?.error || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };
  
  // ============ ROLE OPTIONS ============
  const roleOptions = [
    { value: 'member', label: 'Member' },
    { value: 'admin', label: 'Admin' },
    { value: 'jumuia_leader', label: 'Jumuia Leader' },
    { value: 'treasurer', label: 'Treasurer' },
    { value: 'secretary', label: 'Secretary' },
    { value: 'choir_moderator', label: 'Choir Moderator' },
    { value: 'media_moderator', label: 'Media Moderator' },
    { value: 'Guest', label: 'Guest (Not in System)' }
  ];
  
  // ============ SPECIAL ROLE OPTIONS ============
  const specialRoleOptions = [
    { value: '', label: 'None' },
    { value: 'chairperson', label: 'Chairperson' },
    { value: 'secretary', label: 'Secretary' },
    { value: 'treasurer', label: 'Treasurer' },
    { value: 'jumuia_leader', label: 'Jumuia Leader' },
    { value: 'choir_moderator', label: 'Choir Moderator' },
    { value: 'media_moderator', label: 'Media Moderator' }
  ];
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="modal-header">
          <h2>Add Member to Attendance</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        {/* Mode Toggle Buttons */}
        <div className="mode-toggle">
          <button 
            type="button"
            className={`mode-btn ${!isBulkMode ? 'active' : ''}`}
            onClick={() => setIsBulkMode(false)}
          >
            <Plus size={16} />
            Add One by One
          </button>
          <button 
            type="button"
            className={`mode-btn ${isBulkMode ? 'active' : ''}`}
            onClick={() => setIsBulkMode(true)}
          >
            <List size={16} />
            Bulk Add Multiple
          </button>
        </div>
        
        {/* BULK ADD MODE */}
        {isBulkMode && (
          <div className="bulk-section">
            <div className="bulk-header">
              <Upload size={16} />
              <span>⚡ Bulk Add Multiple Members</span>
            </div>
            <div className="bulk-help">
              <p><strong>Format options:</strong></p>
              <ul>
                <li><code>Name, Phone, Role, Membership#, Time</code> - All fields</li>
                <li><code>Tonnie Mark, 0712345678, Guest, Z#001, 2024-01-15 14:30</code></li>
            
              </ul>
              <p><em>💡 Tip: Time format: YYYY-MM-DD HH:MM or leave empty for current time</em></p>
              <p><strong> 📝  Enter one person per line. Separate with commas.  </strong></p>
            </div>
            
            {/* LARGER TEXTAREA */}
            <textarea
              className="bulk-textarea-large"
              placeholder={`Example:
Christopher Mark, 0712345678, Guest, Z#001, 2024-01-15 14:30
`}
              rows="8"
              value={bulkData}
              onChange={(e) => setBulkData(e.target.value)}
            />
            
            {/* Preview */}
            {bulkPreview.length > 0 && (
              <div className="bulk-preview">
                <div className="preview-title">📋 Preview ({bulkPreview.length} members):</div>
                <div className="preview-list">
                  {bulkPreview.slice(0, 10).map((item, idx) => (
                    <div key={idx} className={`preview-item ${!item.valid ? 'invalid' : ''}`}>
                      <span className="preview-name">{item.fullName || '❌ Invalid'}</span>
                      <span className="preview-phone">{item.phoneNumber || 'No phone'}</span>
                      <span className="preview-role">{item.role || 'Guest'}</span>
                      {item.membershipNumber && <span className="preview-membership">🆔 {item.membershipNumber}</span>}
                      {item.signTime && <span className="preview-time">🕐 {item.signTime}</span>}
                    </div>
                  ))}
                  {bulkPreview.length > 10 && (
                    <div className="preview-more">+{bulkPreview.length - 10} more...</div>
                  )}
                </div>
              </div>
            )}
            
            <button 
              type="button" 
              className="bulk-add-btn"
              onClick={handleBulkAdd}
              disabled={loading || bulkPreview.length === 0}
            >
              <Users size={16} />
              {loading ? 'Adding...' : `Add All (${bulkPreview.length}) Members`}
            </button>
          </div>
        )}
        
        {/* SINGLE ADD MODE */}
        {!isBulkMode && (
          <>
            {/* Search Result Dropdown */}
            {searchResults.length > 0 && (
              <div className="search-results">
                <div className="search-title">Found existing users:</div>
                {searchResults.map(user => (
                  <div key={user.id} className="search-result-item" onClick={() => selectUser(user)}>
                    <div className="result-info">
                      <div className="result-name">{user.fullName}</div>
                      <div className="result-details">
                        {user.membership_number && <span>🆔 {user.membership_number}</span>}
                        {user.phone && <span>📞 {user.phone}</span>}
                      </div>
                    </div>
                    <button className="select-btn">Select</button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Selected User Badge */}
            {selectedUser && (
              <div className="selected-badge">
                <CheckCircle size={16} />
                <span>Selected: {selectedUser.fullName}</span>
                <button onClick={clearSelection} className="clear-btn">Change</button>
              </div>
            )}
            
            {/* Single Add Form */}
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Full Name */}
                <div className="form-group">
                  <label><User size={14} /> Full Name *</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="e.g., John Mwangi"
                    required
                  />
                </div>
                
                {/* Phone Number */}
                <div className="form-group">
                  <label><Phone size={14} /> Phone Number (Optional)</label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="e.g., 0712345678"
                  />
                  <div className="helper-text">
                    💡 Enter phone number to search for existing member
                  </div>
                </div>
                
                {/* Membership Number (Optional) */}
                <div className="form-group">
                  <label><Hash size={14} /> Membership Number (Optional)</label>
                  <input
                    type="text"
                    name="membershipNumber"
                    value={formData.membershipNumber}
                    onChange={handleChange}
                    placeholder="e.g., Z#001 or leave empty"
                  />
                </div>
                
                {/* Role */}
                <div className="form-row">
                  <div className="form-group">
                    <label><Briefcase size={14} /> Role</label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                    >
                      {roleOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Special Role</label>
                    <select
                      name="specialRole"
                      value={formData.specialRole}
                      onChange={handleChange}
                    >
                      {specialRoleOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Sign Time (Optional) */}
                <div className="form-group">
                  <label><Clock size={14} /> Sign Time (Optional)</label>
                  <input
                    type="datetime-local"
                    name="signTime"
                    value={formData.signTime}
                    onChange={handleChange}
                  />
                  <div className="helper-text">
                    💡 Leave empty to use current time
                  </div>
                </div>
                
                {/* Jumuia */}
                <div className="form-row">
                  <div className="form-group">
                    <label><Home size={14} /> Jumuia</label>
                    <select
                      name="jumuiaId"
                      value={formData.jumuiaId}
                      onChange={handleChange}
                    >
                      <option value="">None</option>
                      {loadingJumuia ? (
                        <option disabled>Loading...</option>
                      ) : (
                        jumuiaList.map(j => (
                          <option key={j.id} value={j.id}>{j.name}</option>
                        ))
                      )}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Jumuia Name (Custom)</label>
                    <input
                      type="text"
                      name="jumuiaName"
                      value={formData.jumuiaName}
                      onChange={handleChange}
                      placeholder="For guests or custom entry"
                    />
                  </div>
                </div>
                
                {/* Notes */}
                <div className="form-group">
                  <label><FileText size={14} /> Notes (Optional)</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Any additional notes about this member..."
                    rows="2"
                  />
                </div>
              </div>
              
              {/* Footer */}
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </>
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
          max-width: 700px;
          max-height: 90vh;
          overflow-y: auto;
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e0e0e0;
          position: sticky;
          top: 0;
          background: white;
          z-index: 10;
        }
        
        .modal-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }
        
        .close-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
        }
        
        /* Mode Toggle */
        .mode-toggle {
          display: flex;
          gap: 12px;
          margin: 20px 24px 0;
        }
        
        .mode-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          background: #f1f5f9;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .mode-btn.active {
          background: #1a1a1a;
          border-color: #1a1a1a;
          color: white;
        }
        
        .mode-btn:hover:not(.active) {
          background: #e2e8f0;
        }
        
        /* Bulk Section */
        .bulk-section {
          margin: 20px 24px;
          padding: 20px;
          background: #f0fdf4;
          border-radius: 16px;
          border: 1px solid #bbf7d0;
        }
        
        .bulk-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 16px;
          color: #166534;
          margin-bottom: 16px;
        }
        
        .bulk-help {
          font-size: 12px;
          color: #166534;
          margin-bottom: 16px;
          background: #dcfce7;
          padding: 12px;
          border-radius: 8px;
        }
        
        .bulk-help ul {
          margin: 8px 0;
          padding-left: 20px;
        }
        
        .bulk-help code {
          background: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
        }
        
        .bulk-textarea-large {
          width: 100%;
          padding: 14px;
          border: 1px solid #bbf7d0;
          border-radius: 12px;
          font-size: 13px;
          font-family: 'Courier New', monospace;
          resize: vertical;
          background: white;
          line-height: 1.6;
        }
        
        .bulk-textarea-large:focus {
          outline: none;
          border-color: #166534;
        }
        
        .bulk-preview {
          margin-top: 16px;
          background: white;
          border-radius: 12px;
          padding: 12px;
          max-height: 300px;
          overflow-y: auto;
        }
        
        .preview-title {
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 12px;
          color: #166534;
        }
        
        .preview-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        .preview-item {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 11px;
          padding: 8px 12px;
          background: #f8fafc;
          border-radius: 8px;
          align-items: center;
        }
        
        .preview-item.invalid {
          background: #fee2e2;
          color: #ef4444;
        }
        
        .preview-name {
          font-weight: 600;
          min-width: 120px;
        }
        
        .preview-phone {
          color: #64748b;
          min-width: 100px;
        }
        
        .preview-role {
          color: #3b82f6;
          font-size: 10px;
          background: #eff6ff;
          padding: 2px 6px;
          border-radius: 4px;
        }
        
        .preview-membership {
          color: #8b5cf6;
          font-size: 10px;
        }
        
        .preview-time {
          color: #f59e0b;
          font-size: 10px;
        }
        
        .preview-more {
          font-size: 11px;
          color: #64748b;
          text-align: center;
          padding: 8px;
        }
        
        .bulk-add-btn {
          width: 100%;
          margin-top: 16px;
          padding: 14px;
          background: #166534;
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        
        .bulk-add-btn:hover {
          background: #14532d;
        }
        
        .bulk-add-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        /* Search Results */
        .search-results {
          margin: 0 24px 16px;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          overflow: hidden;
          background: white;
        }
        
        .search-title {
          padding: 10px 16px;
          background: #f8f8f8;
          font-size: 12px;
          font-weight: 500;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .search-result-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid #f0f0f0;
          cursor: pointer;
        }
        
        .search-result-item:hover {
          background: #f8f8f8;
        }
        
        .result-name {
          font-weight: 500;
          margin-bottom: 4px;
        }
        
        .result-details {
          display: flex;
          gap: 12px;
          font-size: 11px;
          color: #666;
        }
        
        .select-btn {
          padding: 4px 12px;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 11px;
          cursor: pointer;
        }
        
        .selected-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 24px 16px;
          padding: 10px 16px;
          background: #dcfce7;
          border-radius: 10px;
          font-size: 13px;
        }
        
        .clear-btn {
          margin-left: auto;
          background: none;
          border: none;
          color: #22c55e;
          cursor: pointer;
          font-size: 12px;
          text-decoration: underline;
        }
        
        .modal-body {
          padding: 20px 24px;
        }
        
        .form-group {
          margin-bottom: 18px;
        }
        
        .form-group label {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
          font-weight: 500;
          font-size: 13px;
          color: #1a1a1a;
        }
        
        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
        }
        
        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: #1a1a1a;
        }
        
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        
        .helper-text {
          font-size: 11px;
          color: #666;
          margin-top: 6px;
        }
        
        textarea {
          resize: vertical;
        }
        
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #e0e0e0;
        }
        
        .btn-secondary {
          padding: 10px 20px;
          background: #f0f0f0;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .btn-primary {
          padding: 10px 20px;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}