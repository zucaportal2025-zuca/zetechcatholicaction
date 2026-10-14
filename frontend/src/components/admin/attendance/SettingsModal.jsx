import React, { useState } from 'react';
import { X, Users, Save, QrCode } from 'lucide-react';
import { api } from '../../../api';

export default function SettingsModal({ sheet, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    allowSelfCheckin: sheet.allowSelfCheckin,
    enableQRCheckin: sheet.enableQRCheckin || true
  });
  const [loading, setLoading] = useState(false);
  
  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
           await api.put(`/api/attendance/sheet/${sheet.id}/settings`, {
        allowSelfCheckin: formData.allowSelfCheckin,
        enableQRCheckin: formData.enableQRCheckin
      }, { headers: getHeaders() });
      
      onUpdate();
      onClose();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteSheet = async () => {
    if (!window.confirm(`Delete "${sheet.title}" permanently? This cannot be undone.`)) return;
    setLoading(true);
    try {
      await api.delete(`/api/attendance/sheet/${sheet.id}`, { headers: getHeaders() });
      onUpdate();
      onClose();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete sheet');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Sheet Settings</h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="settings-section">
              <h4>Check-in Methods</h4>
                           <label className="checkbox-label">
                <input type="checkbox" name="allowSelfCheckin" checked={formData.allowSelfCheckin} onChange={handleChange} />
                <span>Allow Self Check-in</span>
              </label>
              
              <label className="checkbox-label">
                <input type="checkbox" name="enableQRCheckin" checked={formData.enableQRCheckin} onChange={handleChange} />
                                <span>Enable QR Code Check-in</span>
              </label>
            </div>
            
            
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn-danger" onClick={handleDeleteSheet}>
              Delete Sheet
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
           <button type="submit" className="btn-primary" disabled={loading}>
  {loading ? (
    <>Saving...</>
  ) : (
    <><Save size={16} /> Save Changes</>
  )}
</button>
          </div>
        </form>
      </div>
      
      <style>{`
        .settings-modal {
          background: white;
          border-radius: 16px;
          width: 90%;
          max-width: 450px;
          overflow: hidden;
        }
        .settings-section {
          margin-bottom: 20px;
        }
        .settings-section h4 {
          font-size: 14px;
          margin-bottom: 12px;
          color: #1a1a1a;
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
          cursor: pointer;
        }
        .wifi-input {
          width: 100%;
          padding: 10px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #e0e0e0;
        }
        .btn-danger {
          background: #fee2e2;
          color: #ef4444;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          margin-right: auto;
        }
      `}</style>
    </div>
  );
}