// frontend/src/pages/admin/AdminPrayers.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { 
  Plus, Edit2, Trash2, Search, X, Save, 
  ChevronLeft, ChevronRight, RefreshCw, 
  Filter, BookOpen, Star, 
  CheckCircle, XCircle, AlertCircle 
} from 'lucide-react';

export default function AdminPrayers() {
  // State
  const [prayers, setPrayers] = useState([]);
  const [filteredPrayers, setFilteredPrayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingPrayer, setEditingPrayer] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    category: 'daily',
    prayer: '',
    language: 'en',
    version: 'traditional',
    order: 0,
    isActive: true
  });

  // Categories from your database
  const categories = [
    { id: 'daily', name: 'Daily Prayers', icon: '🌅' },
    { id: 'marian', name: 'Marian Prayers', icon: '👑' },
    { id: 'saints', name: 'Saints', icon: '⭐' },
    { id: 'rosary', name: 'Rosary', icon: '📿' },
    { id: 'other', name: 'Other', icon: '✝️' },
    { id: 'novena', name: 'Novena', icon: '🙏' },
    { id: 'liturgical', name: 'Liturgical', icon: '⛪' },
    { id: 'angelic', name: 'Angelic', icon: '👼' },
    { id: 'creed', name: 'Creed', icon: '📜' }
  ];

  // Get headers with auth token - FIXED
  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Fetch all prayers - FIXED to use api instance
  const fetchPrayers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('/api/prayers/admin/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPrayers(response.data.prayers || []);
      setFilteredPrayers(response.data.prayers || []);
    } catch (error) {
      console.error('Error fetching prayers:', error);
      if (error.response?.status === 401) {
        showToast('Session expired. Please login again.', 'error');
      } else {
        showToast('Failed to load prayers', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrayers();
  }, []);

  // Filter prayers
  useEffect(() => {
    let filtered = [...prayers];
    
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.prayer?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    setFilteredPrayers(filtered);
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, prayers]);

  // Pagination
  const totalPages = Math.ceil(filteredPrayers.length / itemsPerPage);
  const paginatedPrayers = filteredPrayers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      category: 'daily',
      prayer: '',
      language: 'en',
      version: 'traditional',
      order: 0,
      isActive: true
    });
    setEditingPrayer(null);
  };

  // Open create modal
  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  // Open edit modal
  const openEditModal = (prayer) => {
    setEditingPrayer(prayer);
    setFormData({
      title: prayer.title || '',
      category: prayer.category || 'daily',
      prayer: prayer.prayer || '',
      language: prayer.language || 'en',
      version: prayer.version || 'traditional',
      order: prayer.order || 0,
      isActive: prayer.isActive !== false
    });
    setShowModal(true);
  };

  // Save prayer (create or update) - FIXED
  const handleSave = async () => {
    if (!formData.title.trim()) {
      showToast('Title is required', 'error');
      return;
    }
    if (!formData.prayer.trim()) {
      showToast('Prayer content is required', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (editingPrayer) {
        // Update existing prayer
        await api.put(`/api/prayers/admin/${editingPrayer.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showToast('Prayer updated successfully!');
      } else {
        // Create new prayer
        await api.post('/api/prayers/admin', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showToast('Prayer created successfully!');
      }
      setShowModal(false);
      resetForm();
      fetchPrayers();
    } catch (error) {
      console.error('Error saving prayer:', error);
      if (error.response?.status === 401) {
        showToast('Session expired. Please login again.', 'error');
      } else {
        showToast(error.response?.data?.error || 'Failed to save prayer', 'error');
      }
    }
  };

  // Delete prayer - FIXED
  const handleDelete = async (prayer) => {
    if (!window.confirm(`Delete "${prayer.title}"? This action cannot be undone.`)) return;
    
    try {
      const token = localStorage.getItem('token');
      await api.delete(`/api/prayers/admin/${prayer.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Prayer deleted successfully!');
      fetchPrayers();
    } catch (error) {
      console.error('Error deleting prayer:', error);
      if (error.response?.status === 401) {
        showToast('Session expired. Please login again.', 'error');
      } else {
        showToast('Failed to delete prayer', 'error');
      }
    }
  };

  // Get category display name
  const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.name : categoryId;
  };

  // Get category icon
  const getCategoryIcon = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.icon : '📖';
  };

  // Clean prayer text for preview
  const cleanPreview = (text) => {
    if (!text) return '';
    let cleaned = text.replace(/<[^>]*>/g, '');
    cleaned = cleaned.substring(0, 100);
    return cleaned + (cleaned.length >= 100 ? '...' : '');
  };

  return (
    <div className="admin-prayers">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="admin-header">
        <h1>📖 Prayer Management</h1>
        <button className="btn-create" onClick={openCreateModal}>
          <Plus size={18} /> New Prayer
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-value">{prayers.length}</div>
          <div className="stat-label">Total Prayers</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{categories.length}</div>
          <div className="stat-label">Categories</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{prayers.filter(p => p.isActive !== false).length}</div>
          <div className="stat-label">Active</div>
        </div>
        <button className="refresh-btn" onClick={fetchPrayers}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="search-filter-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by title or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm('')}>
              <X size={16} />
            </button>
          )}
        </div>
        
        <div className="filter-box">
          <Filter size={18} />
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Prayers Table */}
      <div className="prayers-table-container">
        <table className="prayers-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>Category</th>
              <th>Preview</th>
              <th>Language</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="loading-cell">
                  <div className="spinner"></div>
                  Loading prayers...
                </td>
              </tr>
            ) : paginatedPrayers.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-cell">
                  No prayers found
                </td>
              </tr>
            ) : (
              paginatedPrayers.map((prayer, index) => (
                <tr key={prayer.id}>
                  <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                  <td className="title-cell">
                    <strong>{prayer.title}</strong>
                  </td>
                  <td>
                    <span className="category-badge">
                      {getCategoryIcon(prayer.category)} {getCategoryName(prayer.category)}
                    </span>
                  </td>
                  <td className="preview-cell">
                    {cleanPreview(prayer.prayer)}
                  </td>
                  <td>
                    <span className="language-badge">
                      {prayer.language?.toUpperCase() || 'EN'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${prayer.isActive !== false ? 'active' : 'inactive'}`}>
                      {prayer.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="action-cell">
                    <button 
                      className="action-btn edit" 
                      onClick={() => openEditModal(prayer)}
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      className="action-btn delete" 
                      onClick={() => handleDelete(prayer)}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <span className="page-info">
            Page {currentPage} of {totalPages}
          </span>
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingPrayer ? 'Edit Prayer' : 'Create New Prayer'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter prayer title"
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="form-select"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Language</label>
                  <select
                    name="language"
                    value={formData.language}
                    onChange={handleInputChange}
                    className="form-select"
                  >
                    <option value="en">English</option>
                    <option value="sw">Kiswahili</option>
                    <option value="la">Latin</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Prayer Content *</label>
                <textarea
                  name="prayer"
                  value={formData.prayer}
                  onChange={handleInputChange}
                  placeholder="Enter the full prayer text..."
                  rows={12}
                  className="form-textarea"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Order (display order)</label>
                  <input
                    type="number"
                    name="order"
                    value={formData.order}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="0"
                  />
                </div>

                <div className="form-group checkbox">
                  <label>
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                    />
                    Active (visible to users)
                  </label>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn-save" onClick={handleSave}>
                <Save size={16} /> {editingPrayer ? 'Update Prayer' : 'Create Prayer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .admin-prayers {
          padding: 24px;
          background: #f5f5f5;
          min-height: 100vh;
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .admin-header h1 {
          margin: 0;
          font-size: 24px;
          color: #1a1a1a;
        }

        .btn-create {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #1e3a32;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }

        .btn-create:hover {
          background: #2a4a3f;
        }

        .stats-cards {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
          align-items: center;
        }

        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 16px 24px;
          text-align: center;
          min-width: 120px;
          border: 1px solid #e0e0e0;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #1e3a32;
        }

        .stat-label {
          font-size: 12px;
          color: #666;
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          cursor: pointer;
          margin-left: auto;
        }

        .search-filter-bar {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .search-box {
          flex: 2;
          display: flex;
          align-items: center;
          gap: 10px;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 8px 12px;
        }

        .search-box input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 14px;
        }

        .clear-search {
          background: none;
          border: none;
          cursor: pointer;
          color: #999;
        }

        .filter-box {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 8px 12px;
        }

        .filter-box select {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-size: 14px;
        }

        .prayers-table-container {
          background: white;
          border-radius: 12px;
          overflow-x: auto;
        }

        .prayers-table {
          width: 100%;
          border-collapse: collapse;
        }

        .prayers-table th,
        .prayers-table td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid #f0f0f0;
        }

        .prayers-table th {
          background: #fafafa;
          font-weight: 600;
          font-size: 13px;
          color: #666;
        }

        .title-cell strong {
          color: #1e3a32;
        }

        .preview-cell {
          max-width: 300px;
          font-size: 12px;
          color: #666;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .category-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          background: #f0ebe3;
          border-radius: 20px;
          font-size: 12px;
        }

        .language-badge {
          display: inline-block;
          padding: 2px 8px;
          background: #e0f2fe;
          color: #0284c7;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 500;
        }

        .status-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 500;
        }

        .status-badge.active {
          background: #dcfce7;
          color: #22c55e;
        }

        .status-badge.inactive {
          background: #fee2e2;
          color: #ef4444;
        }

        .action-cell {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
        }

        .action-btn.edit {
          color: #3b82f6;
        }

        .action-btn.edit:hover {
          background: #eff6ff;
        }

        .action-btn.delete {
          color: #ef4444;
        }

        .action-btn.delete:hover {
          background: #fee2e2;
        }

        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-top: 24px;
        }

        .pagination button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          cursor: pointer;
        }

        .pagination button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .page-info {
          font-size: 14px;
          color: #666;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 16px;
          width: 90%;
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
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
        }

        .modal-close {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
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
          font-size: 14px;
        }

        .form-input, .form-select, .form-textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
        }

        .form-textarea {
          resize: vertical;
          font-family: inherit;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .checkbox {
          display: flex;
          align-items: center;
        }

        .checkbox label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          margin: 0;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #e0e0e0;
        }

        .btn-cancel {
          padding: 8px 20px;
          background: #f0f0f0;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }

        .btn-save {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 20px;
          background: #1e3a32;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }

        .loading-cell, .empty-cell {
          text-align: center;
          padding: 40px !important;
          color: #666;
        }

        .spinner {
          width: 30px;
          height: 30px;
          border: 3px solid #f0f0f0;
          border-top-color: #1e3a32;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 10px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .toast {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 20px;
          border-radius: 8px;
          color: white;
          font-size: 14px;
          z-index: 1100;
        }

        .toast.success {
          background: #22c55e;
        }

        .toast.error {
          background: #ef4444;
        }

        @media (max-width: 768px) {
          .admin-prayers {
            padding: 16px;
          }

          .stats-cards {
            gap: 10px;
          }

          .stat-card {
            padding: 12px 16px;
            min-width: 80px;
          }

          .stat-value {
            font-size: 20px;
          }

          .preview-cell {
            max-width: 150px;
          }

          .form-row {
            grid-template-columns: 1fr;
            gap: 0;
          }
        }
      `}</style>
    </div>
  );
}