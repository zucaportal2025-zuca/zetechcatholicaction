import React, { useState } from 'react';
import { X, User, Phone, Briefcase, FileText, Save } from 'lucide-react';

export default function EditMemberModal({ entry, onClose, onSave }) {
  // ============ STATE ============
  const [formData, setFormData] = useState({
    fullName: entry.fullName || '',
    phoneNumber: entry.phoneNumber || '',
    role: entry.role || 'member',
    notes: entry.notes || ''
  });
  const [loading, setLoading] = useState(false);
  
  // ============ HANDLE INPUT CHANGE ============
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // ============ HANDLE SUBMIT ============
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.fullName) {
      alert('Please enter full name');
      return;
    }
    
    setLoading(true);
    try {
      await onSave(entry.id, {
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber || null,
        role: formData.role,
        notes: formData.notes || null
      });
      onClose();
    } catch (error) {
      console.error('Error updating member:', error);
      alert(error.response?.data?.error || 'Failed to update member');
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
    { value: 'Guest', label: 'Guest' }
  ];
  
  // ============ CHECK-IN METHOD DISPLAY ============
  const getMethodDisplay = (method) => {
  switch(method) {
    case 'SELF': return 'Self Check-in';
    case 'QR_CODE': return 'QR Code';
    case 'MANUAL': return 'Manual (Admin)';
    default: return method;
  }
};
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="modal-header">
          <h2>Edit Member</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        {/* Read-only Info */}
        <div className="info-section">
          <div className="info-item">
            <span className="info-label">Check-in Method:</span>
            <span className="info-value">{getMethodDisplay(entry.signMethod)}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Check-in Time:</span>
            <span className="info-value">{new Date(entry.signTime).toLocaleString()}</span>
          </div>
          {entry.membershipNumber && (
            <div className="info-item">
              <span className="info-label">Membership #:</span>
              <span className="info-value">{entry.membershipNumber}</span>
            </div>
          )}
        </div>
        
        {/* Form */}
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
                placeholder="Full name"
                required
              />
            </div>
            
            {/* Phone Number */}
            <div className="form-group">
              <label><Phone size={14} /> Phone Number</label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="e.g., 0712345678"
              />
            </div>
            
            {/* Role */}
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
            
            {/* Notes */}
            <div className="form-group">
              <label><FileText size={14} /> Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Additional notes..."
                rows="3"
              />
            </div>
            
          </div>
          
          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              <Save size={16} />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
        
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
          max-width: 500px;
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
        
        .info-section {
          margin: 16px 24px;
          padding: 12px 16px;
          background: #f8f8f8;
          border-radius: 12px;
          border: 1px solid #e0e0e0;
        }
        
        .info-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 13px;
        }
        
        .info-item:last-child {
          margin-bottom: 0;
        }
        
        .info-label {
          color: #666;
        }
        
        .info-value {
          font-weight: 500;
          color: #1a1a1a;
        }
        
        .modal-body {
          padding: 0 24px 20px;
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
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 20px;
          background: #f0f0f0;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .btn-primary {
          display: flex;
          align-items: center;
          gap: 6px;
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