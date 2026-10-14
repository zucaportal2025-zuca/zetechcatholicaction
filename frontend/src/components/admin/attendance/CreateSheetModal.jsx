import React, { useState } from 'react';
import { X, QrCode, Users, Calendar, Clock, MapPin } from 'lucide-react';
import { api } from '../../../api';
import { FaUserTie } from 'react-icons/fa';

export default function CreateSheetModal({ onClose, onCreate }) {
  // ============ STATE ============
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventDate: '',
    eventTime: '16:30',
    location: '',
    allowSelfCheckin: true,
    enableQRCheckin: false,
    jumuiaId: ''
  });
  
  const [jumuiaList, setJumuiaList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingJumuia, setLoadingJumuia] = useState(true);
  
  // ============ FETCH JUMUIA LIST ============
  React.useEffect(() => {
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
  
  // ============ HANDLE INPUT CHANGE ============
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // ============ HANDLE SUBMIT ============
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title) {
      alert('Please enter a title');
      return;
    }
    
    if (!formData.eventDate) {
      alert('Please select a date');
      return;
    }
    
    setLoading(true);
    try {
      const submitData = {
        title: formData.title,
        description: formData.description || null,
        eventDate: formData.eventDate,
        eventTime: formData.eventTime,
        location: formData.location || null,
        allowSelfCheckin: formData.allowSelfCheckin,
        enableWifiCheckin: formData.enableQRCheckin, // Map to backend field
        jumuiaId: formData.jumuiaId || null
      };
      
      await onCreate(submitData);
      onClose();
    } catch (error) {
      console.error('Error creating sheet:', error);
      alert(error.response?.data?.error || 'Failed to create attendance sheet');
    } finally {
      setLoading(false);
    }
  };
  
  // ============ SET TODAY'S DATE ============
  const today = new Date().toISOString().split('T')[0];
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Attendance Sheet</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Title */}
            <div className="form-group">
              <label>Event Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Leaders meeting, Choir Practice"
                required
              />
            </div>
            
            {/* Description */}
            <div className="form-group">
              <label>Description (Optional)</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Additional details about the meeting..."
                rows="2"
              />
            </div>
            
            {/* Date & Time Row */}
            <div className="form-row">
              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  name="eventDate"
                  value={formData.eventDate}
                  onChange={handleChange}
                  min={today}
                  required
                />
              </div>
              <div className="form-group">
                <label>Time</label>
                <input
                  type="time"
                  name="eventTime"
                  value={formData.eventTime}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            {/* Location */}
            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g., Annex 002, complex etc"
              />
            </div>
            
            {/* Divider */}
            <div className="divider">
              <span>Check-in Methods</span>
            </div>
            
            {/* Manual Check-in (Always enabled) */}
            <div className="method-item disabled">
              <div className="method-info">
                <span className="method-icon">📋</span>
                <div>
                  <div className="method-title">Manual Check-in</div>
                  <div className="method-desc">Admin adds members manually</div>
                </div>
              </div>
              <span className="always-enabled">Always enabled</span>
            </div>
            
            {/* Self Check-in */}
            <div className="method-item">
              <div className="method-info">
                <span className="method-icon">👤</span>
                <div>
                  <div className="method-title">Self Check-in</div>
                  <div className="method-desc">Members check themselves in via app</div>
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  name="allowSelfCheckin"
                  checked={formData.allowSelfCheckin}
                  onChange={handleChange}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            
            {/* QR Code Check-in */}
            <div className="method-item">
              <div className="method-info">
                <span className="method-icon"><QrCode size={18} /></span>
                <div>
                  <div className="method-title">QR Code Check-in</div>
                  <div className="method-desc">Members scan QR code to check in</div>
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  name="enableQRCheckin"
                  checked={formData.enableQRCheckin}
                  onChange={handleChange}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            
            {/* Divider */}
            <div className="divider">
              <span>Target Audience</span>
            </div>
            
            {/* Jumuia Selection */}
            <div className="form-group">
              <label>Target Group (Optional)</label>
              <select
                name="jumuiaId"
                value={formData.jumuiaId}
                onChange={handleChange}
              >
                <option value="">-Everyone</option>
                <option value="executive-team">-Leaders  Only</option>
                <option disabled>──────────</option>
                {loadingJumuia ? (
                  <option disabled>Loading Jumuia...</option>
                ) : (
                  jumuiaList.map(j => (
                    <option key={j.id} value={j.id}>- {j.name}</option>
                  ))
                )}
              </select>
              <div className="helper-text">
                Leave empty for all members, or select a specific group
              </div>
            </div>
          </div>
          
          {/* Footer Buttons */}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Sheet'}
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
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .modal-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: #1a1a1a;
        }
        
        .close-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          color: #666;
        }
        
        .modal-body {
          padding: 24px;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
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
        
        .divider {
          text-align: center;
          margin: 24px 0 20px;
          position: relative;
        }
        
        .divider::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 1px;
          background: #e0e0e0;
        }
        
        .divider span {
          background: white;
          padding: 0 12px;
          position: relative;
          font-size: 12px;
          color: #666;
        }
        
        .method-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .method-item.disabled {
          opacity: 0.6;
        }
        
        .method-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .method-icon {
          font-size: 20px;
          width: 32px;
        }
        
        .method-title {
          font-weight: 500;
          color: #1a1a1a;
        }
        
        .method-desc {
          font-size: 12px;
          color: #666;
        }
        
        .always-enabled {
          font-size: 11px;
          color: #22c55e;
          background: #dcfce7;
          padding: 4px 8px;
          border-radius: 20px;
        }
        
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }
        
        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        
        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: 0.3s;
          border-radius: 24px;
        }
        
        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
        }
        
        input:checked + .toggle-slider {
          background-color: #1a1a1a;
        }
        
        input:checked + .toggle-slider:before {
          transform: translateX(20px);
        }
        
        .helper-text {
          font-size: 11px;
          color: #666;
          margin-top: 6px;
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