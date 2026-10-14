import { useState, useEffect } from 'react';
import axios from 'axios';
import BASE_URL from '../../api';

export default function AdminHistory() {
  const [historyEntries, setHistoryEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ title: '', content: '', order: 0, isActive: true });
  const [showForm, setShowForm] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/api/history/admin`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistoryEntries(response.data.history);
    } catch (err) {
      console.error('Error fetching history:', err);
      alert('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await axios.put(`${BASE_URL}/api/history/admin/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('History updated successfully');
      } else {
        await axios.post(`${BASE_URL}/api/history/admin`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('History added successfully');
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ title: '', content: '', order: 0, isActive: true });
      fetchHistory();
    } catch (err) {
      console.error('Error saving history:', err);
      alert('Failed to save history');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (entry) => {
    setEditingId(entry.id);
    setFormData({
      title: entry.title,
      content: entry.content,
      order: entry.order,
      isActive: entry.isActive
    });
    setShowForm(true);
    setMobileMenuOpen(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this history entry?')) return;
    
    setDeletingId(id);
    try {
      await axios.delete(`${BASE_URL}/api/history/admin/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('History deleted successfully');
      fetchHistory();
    } catch (err) {
      console.error('Error deleting history:', err);
      alert('Failed to delete history');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    setTogglingId(id);
    try {
      await axios.put(`${BASE_URL}/api/history/admin/${id}`, 
        { isActive: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchHistory();
    } catch (err) {
      console.error('Error toggling status:', err);
      alert('Failed to update status');
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <div className="admin-history-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading history entries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-history-container">
      {/* Mobile Header */}
      <div className="mobile-header">
        <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          ☰
        </button>
        <h1>📜 History</h1>
        <button className="mobile-add-btn" onClick={() => { 
          setEditingId(null); 
          setFormData({ title: '', content: '', order: 0, isActive: true }); 
          setShowForm(true); 
        }}>
          +
        </button>
      </div>

      {/* Desktop Header */}
      <div className="admin-header desktop-header">
        <h1>📜 Manage History</h1>
        <button 
          onClick={() => { 
            setEditingId(null); 
            setFormData({ title: '', content: '', order: 0, isActive: true }); 
            setShowForm(true); 
          }} 
          className="btn-add"
        >
          + Add New History Entry
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>Menu</h3>
              <button onClick={() => setMobileMenuOpen(false)}>✕</button>
            </div>
            <button className="drawer-btn" onClick={() => {
              setEditingId(null);
              setFormData({ title: '', content: '', order: 0, isActive: true });
              setShowForm(true);
              setMobileMenuOpen(false);
            }}>
              ➕ Add New Entry
            </button>
            <button className="drawer-btn" onClick={() => window.location.href = '/admin/dashboard'}>
              📊 Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="modal-overlay" onClick={() => !saving && setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? '✏️ Edit History' : '📝 Add New History'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)} disabled={saving}>×</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>📌 Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="e.g., Foundation (2018)"
                  disabled={saving}
                  className="title-input"
                />
              </div>
              
              <div className="form-group">
                <label>📄 Content *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  required
                  rows="10"
                  placeholder="Enter detailed history content here..."
                  disabled={saving}
                  className="content-textarea"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group half">
                  <label>🔢 Display Order</label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                    placeholder="1, 2, 3..."
                    disabled={saving}
                    className="order-input"
                  />
                  <small className="input-hint">Lower numbers appear first</small>
                </div>
                
                <div className="form-group half">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      disabled={saving}
                    />
                    <span>✅ Active (visible on website)</span>
                  </label>
                  <small className="input-hint">Inactive entries won't show on landing page</small>
                </div>
              </div>
              
              <div className="form-buttons">
                <button type="submit" className="btn-save" disabled={saving}>
                  {saving ? (
                    <>
                      <span className="btn-spinner"></span>
                      {editingId ? 'Saving...' : 'Adding...'}
                    </>
                  ) : (
                    editingId ? '💾 Save Changes' : '➕ Add Entry'
                  )}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-cancel" disabled={saving}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="desktop-table">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Title</th>
              <th>Content Preview</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {historyEntries.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-row">
                  <div className="empty-state">
                    <span>📭</span>
                    <p>No history entries yet</p>
                    <button onClick={() => setShowForm(true)} className="empty-add-btn">
                      + Add Your First Entry
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              historyEntries.map((entry) => (
                <tr key={entry.id}>
                  <td data-label="Order">{entry.order}</td>
                  <td data-label="Title"><strong>{entry.title}</strong></td>
                  <td data-label="Content">{entry.content.substring(0, 80)}...</td>
                  <td data-label="Status">
                    <span className={`status-badge ${entry.isActive ? 'active' : 'inactive'}`}>
                      {entry.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td data-label="Actions" className="actions">
                    <button onClick={() => handleEdit(entry)} className="btn-edit" disabled={togglingId === entry.id || deletingId === entry.id}>
                      ✏️ Edit
                    </button>
                    <button onClick={() => handleToggleActive(entry.id, entry.isActive)} className="btn-toggle" disabled={togglingId === entry.id || deletingId === entry.id}>
                      {togglingId === entry.id ? <span className="btn-spinner-small"></span> : entry.isActive ? '🔴 Hide' : '🟢 Show'}
                    </button>
                    <button onClick={() => handleDelete(entry.id)} className="btn-delete" disabled={deletingId === entry.id || togglingId === entry.id}>
                      {deletingId === entry.id ? <span className="btn-spinner-small"></span> : '🗑️ Delete'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="mobile-cards">
        {historyEntries.length === 0 ? (
          <div className="empty-state-mobile">
            <span>📭</span>
            <p>No history entries yet</p>
            <button onClick={() => setShowForm(true)} className="empty-add-btn-mobile">
              + Add First Entry
            </button>
          </div>
        ) : (
          historyEntries.map((entry) => (
            <div key={entry.id} className="history-card">
              <div className="card-header">
                <div className="card-order">#{entry.order}</div>
                <div className="card-status">
                  <span className={`status-badge ${entry.isActive ? 'active' : 'inactive'}`}>
                    {entry.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="card-title">{entry.title}</div>
              <div className="card-content">{entry.content.substring(0, 120)}...</div>
              <div className="card-actions">
                <button onClick={() => handleEdit(entry)} className="card-edit" disabled={togglingId === entry.id || deletingId === entry.id}>
                  ✏️ Edit
                </button>
                <button onClick={() => handleToggleActive(entry.id, entry.isActive)} className="card-toggle" disabled={togglingId === entry.id || deletingId === entry.id}>
                  {togglingId === entry.id ? <span className="btn-spinner-small"></span> : entry.isActive ? 'Hide' : 'Show'}
                </button>
                <button onClick={() => handleDelete(entry.id)} className="card-delete" disabled={deletingId === entry.id || togglingId === entry.id}>
                  {deletingId === entry.id ? <span className="btn-spinner-small"></span> : 'Delete'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }

        .admin-history-container {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
          min-height: 100vh;
          background: #f8fafc;
        }

        /* Desktop Header */
        .desktop-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .desktop-header h1 {
          font-size: 28px;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        /* Mobile Header */
        .mobile-header {
          display: none;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e2e8f0;
        }

        .mobile-header h1 {
          font-size: 20px;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }

        .mobile-menu-btn, .mobile-add-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          background: #f1f5f9;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mobile-add-btn {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          font-size: 20px;
          font-weight: bold;
        }

        /* Mobile Drawer */
        .mobile-drawer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          z-index: 1000;
        }

        .mobile-drawer {
          position: fixed;
          top: 0;
          left: 0;
          width: 280px;
          height: 100%;
          background: white;
          box-shadow: 2px 0 12px rgba(0,0,0,0.1);
          padding: 20px;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }

        .drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e2e8f0;
        }

        .drawer-header h3 {
          margin: 0;
          font-size: 18px;
        }

        .drawer-header button {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
        }

        .drawer-btn {
          width: 100%;
          padding: 12px;
          margin-bottom: 10px;
          background: #f1f5f9;
          border: none;
          border-radius: 10px;
          text-align: left;
          cursor: pointer;
          font-size: 14px;
        }

        /* Desktop Table */
        .desktop-table {
          display: block;
        }

        .mobile-cards {
          display: none;
        }

        .btn-add {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s;
        }

        .btn-add:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        /* Loading State */
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 3px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Table Styles */
        .admin-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .admin-table th, .admin-table td {
          padding: 16px;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
        }

        .admin-table th {
          background: #f1f5f9;
          font-weight: 600;
          color: #1e293b;
          font-size: 13px;
        }

        .admin-table tr:hover {
          background: #f8fafc;
        }

        /* Status Badge */
        .status-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          display: inline-block;
        }

        .status-badge.active {
          background: #d1fae5;
          color: #059669;
        }

        .status-badge.inactive {
          background: #fee2e2;
          color: #dc2626;
        }

        /* Action Buttons */
        .actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .btn-edit, .btn-toggle, .btn-delete {
          padding: 6px 14px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .btn-edit {
          background: #eff6ff;
          color: #2563eb;
        }

        .btn-edit:hover:not(:disabled) {
          background: #dbeafe;
          transform: translateY(-1px);
        }

        .btn-toggle {
          background: #fef3c7;
          color: #d97706;
        }

        .btn-toggle:hover:not(:disabled) {
          background: #fde68a;
          transform: translateY(-1px);
        }

        .btn-delete {
          background: #fef2f2;
          color: #dc2626;
        }

        .btn-delete:hover:not(:disabled) {
          background: #fee2e2;
          transform: translateY(-1px);
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: white;
          border-radius: 24px;
          width: 750px;
          max-width: 90vw;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 28px 16px 28px;
          border-bottom: 2px solid #f1f5f9;
          position: sticky;
          top: 0;
          background: white;
          z-index: 10;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 22px;
          font-weight: 700;
          color: #1e293b;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 28px;
          cursor: pointer;
          color: #94a3b8;
          padding: 0;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s;
        }

        .modal-close:hover:not(:disabled) {
          background: #f1f5f9;
          color: #1e293b;
        }

        form {
          padding: 20px 28px 28px 28px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          font-size: 14px;
          color: #1e293b;
        }

        .title-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 15px;
          transition: all 0.2s;
        }

        .title-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .content-textarea {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 14px;
          line-height: 1.6;
          font-family: inherit;
          resize: vertical;
          transition: all 0.2s;
        }

        .content-textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-row {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
        }

        .form-group.half {
          flex: 1;
          margin-bottom: 0;
        }

        .order-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 14px;
          transition: all 0.2s;
        }

        .order-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          margin-bottom: 8px;
        }

        .checkbox-label input {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .checkbox-label span {
          font-weight: 500;
          font-size: 14px;
        }

        .input-hint {
          display: block;
          font-size: 11px;
          color: #94a3b8;
          margin-top: 6px;
        }

        .form-buttons {
          display: flex;
          gap: 16px;
          margin-top: 28px;
        }

        .btn-save, .btn-cancel {
          flex: 1;
          padding: 12px;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn-save {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
        }

        .btn-save:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .btn-cancel {
          background: #f1f5f9;
          color: #64748b;
        }

        .btn-cancel:hover:not(:disabled) {
          background: #e2e8f0;
        }

        /* Spinners */
        .btn-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
          display: inline-block;
        }

        .btn-spinner-small {
          width: 12px;
          height: 12px;
          border: 2px solid currentColor;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
          display: inline-block;
        }

        /* Empty State */
        .empty-row td {
          text-align: center;
          padding: 60px 20px;
        }

        .empty-state {
          text-align: center;
        }

        .empty-state span {
          font-size: 48px;
          display: block;
          margin-bottom: 16px;
        }

        .empty-state p {
          color: #64748b;
          margin-bottom: 16px;
        }

        .empty-add-btn {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 500;
        }

        /* Mobile Card Styles */
        .history-card {
          background: white;
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          border: 1px solid #e2e8f0;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .card-order {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
        }

        .card-title {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 8px;
        }

        .card-content {
          font-size: 13px;
          color: #64748b;
          line-height: 1.5;
          margin-bottom: 12px;
        }

        .card-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .card-edit, .card-toggle, .card-delete {
          flex: 1;
          padding: 8px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .card-edit {
          background: #eff6ff;
          color: #2563eb;
        }

        .card-toggle {
          background: #fef3c7;
          color: #d97706;
        }

        .card-delete {
          background: #fef2f2;
          color: #dc2626;
        }

        .empty-state-mobile {
          text-align: center;
          padding: 60px 20px;
        }

        .empty-state-mobile span {
          font-size: 48px;
          display: block;
          margin-bottom: 16px;
        }

        .empty-state-mobile p {
          color: #64748b;
          margin-bottom: 16px;
        }

        .empty-add-btn-mobile {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 500;
          width: 100%;
        }

        /* Responsive Breakpoints */
        @media (max-width: 768px) {
          .admin-history-container {
            padding: 16px;
          }

          .desktop-header {
            display: none;
          }

          .mobile-header {
            display: flex;
          }

          .desktop-table {
            display: none;
          }

          .mobile-cards {
            display: block;
          }

          .modal-content {
            width: 95%;
          }

          .modal-header {
            padding: 20px;
          }

          .modal-header h2 {
            font-size: 18px;
          }

          form {
            padding: 16px 20px 20px;
          }

          .form-row {
            flex-direction: column;
            gap: 16px;
          }

          .form-group.half {
            margin-bottom: 0;
          }

          .form-buttons {
            flex-direction: column;
            gap: 10px;
          }

          .btn-save, .btn-cancel {
            padding: 12px;
          }
        }

        @media (max-width: 480px) {
          .admin-history-container {
            padding: 12px;
          }

          .card-title {
            font-size: 15px;
          }

          .card-content {
            font-size: 12px;
          }

          .card-actions {
            gap: 6px;
          }

          .card-edit, .card-toggle, .card-delete {
            font-size: 11px;
            padding: 6px;
          }
        }
      `}</style>
    </div>
  );
}