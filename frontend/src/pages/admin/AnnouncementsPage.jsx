// frontend/src/pages/admin/AnnouncementsPage.jsx
import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiPlus, FiX, FiEdit2, FiTrash2, FiBell, 
  FiClock, FiCalendar, FiCheck, FiAlertCircle,
  FiRefreshCw, FiSearch, FiFilter, FiTag, FiLoader,
  FiEye, FiUsers
} from "react-icons/fi";
import { MdOutlineAnnouncement } from "react-icons/md";
import { BsMegaphone } from "react-icons/bs";
import axios from "axios";
import { toast, Toaster } from "react-hot-toast";
import BASE_URL from "../../api";
import AdminSchedules from "./AdminSchedules";
import MinutesList from "./minutes/MinutesList";
import AdminHistory from '../admin/AdminHistory'; 

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("General");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Viewer Modal State
  const [viewerModal, setViewerModal] = useState({ 
    isOpen: false, 
    announcementId: null, 
    viewers: [], 
    total: 0, 
    stats: {} 
  });
  const [viewerLoading, setViewerLoading] = useState(false);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  const socketRef = useRef(null);
  const [activeTab, setActiveTab] = useState("announcements");

  // Socket connection
  useEffect(() => {
    const initSocket = async () => {
      try {
        const { io } = await import("socket.io-client");
        const socket = io(BASE_URL, {
          withCredentials: true,
          transports: ['polling', 'websocket'],
        });
        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('Connected to announcements feed');
        });

        socket.on('new_announcement', (announcement) => {
          setAnnouncements(prev => [announcement, ...prev]);
          toast.success("New announcement posted!", {
            icon: '🔔',
            duration: 3000,
          });
        });

        socket.on('announcement_updated', (updated) => {
          setAnnouncements(prev => 
            prev.map(a => a.id === updated.id ? updated : a)
          );
        });

        socket.on('announcement_deleted', (id) => {
          setAnnouncements(prev => prev.filter(a => a.id !== id));
        });
      } catch (err) {
        console.log('Socket.IO not available');
      }
    };

    initSocket();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const fetchAnnouncements = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    setError(null);
    try {
      const res = await axios.get(`${BASE_URL}/api/announcements`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAnnouncements(res.data);
    } catch (err) {
      console.error("Fetch Announcements Error:", err);
      setError("Failed to load announcements.");
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleAdd = async () => {
    if (isSubmitting) return;
    
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    setIsSubmitting(true);
    
    const newAnnouncement = {
      id: Date.now().toString(),
      title: title.trim(),
      content: content.trim(),
      category: category,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setAnnouncements(prev => [newAnnouncement, ...prev]);
    setTitle("");
    setContent("");
    setCategory("General");
    setShowForm(false);
    
    const loadingToast = toast.loading("Publishing announcement...");

    try {
      const res = await axios.post(
        `${BASE_URL}/api/announcements`,
        { 
          title: title.trim(), 
          content: content.trim(),
          category: category 
        },
        { headers }
      );
      
      setAnnouncements(prev => 
        prev.map(a => a.id === newAnnouncement.id ? res.data : a)
      );
      
      toast.success("Announcement published!", { id: loadingToast });
    } catch (err) {
      console.error("Add Announcement Error:", err);
      setAnnouncements(prev => prev.filter(a => a.id !== newAnnouncement.id));
      toast.error("Failed to publish announcement", { id: loadingToast });
      setShowForm(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (id) => {
    if (isUpdating) return;
    
    if (!editTitle.trim() || !editContent.trim()) {
      toast.error("Title and content are required");
      return;
    }

    setIsUpdating(true);
    
    const originalAnnouncement = announcements.find(a => a.id === id);
    
    setAnnouncements(prev => 
      prev.map(a => a.id === id ? {
        ...a,
        title: editTitle.trim(),
        content: editContent.trim(),
        category: editCategory,
        updatedAt: new Date().toISOString()
      } : a)
    );
    
    setEditingId(null);
    setEditTitle("");
    setEditContent("");
    setEditCategory("");
    
    const loadingToast = toast.loading("Updating announcement...");

    try {
      await axios.put(
        `${BASE_URL}/api/announcements/${id}`,
        { 
          title: editTitle.trim(), 
          content: editContent.trim(),
          category: editCategory 
        },
        { headers }
      );
      
      toast.success("Announcement updated!", { id: loadingToast });
    } catch (err) {
      console.error("Update Announcement Error:", err);
      setAnnouncements(prev => 
        prev.map(a => a.id === id ? originalAnnouncement : a)
      );
      toast.error("Failed to update announcement", { id: loadingToast });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id) => {
    if (isDeleting) return;
    
    setIsDeleting(true);
    setDeleteConfirmId(null);
    
    const originalAnnouncement = announcements.find(a => a.id === id);
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    
    const loadingToast = toast.loading("Deleting announcement...");

    try {
      await axios.delete(`${BASE_URL}/api/announcements/${id}`, { headers });
      toast.success("Announcement deleted", { id: loadingToast });
    } catch (err) {
      console.error("Delete Announcement Error:", err);
      setAnnouncements(prev => [originalAnnouncement, ...prev]);
      toast.error("Failed to delete announcement", { id: loadingToast });
    } finally {
      setIsDeleting(false);
    }
  };

  const startEdit = (announcement) => {
    setEditingId(announcement.id);
    setEditTitle(announcement.title);
    setEditContent(announcement.content);
    setEditCategory(announcement.category || 'General');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditContent("");
    setEditCategory("");
  };

  const stats = {
    total: announcements.length,
    categories: new Set(announcements.map(a => a.category || 'General')).size
  };

  const filteredAnnouncements = announcements.filter(a => {
    const matchesSearch = a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         a.content?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || a.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...new Set(announcements.map(a => a.category || 'General'))];

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return 'Unknown';
    }
  };

  // Track when a user views an announcement
  const trackView = async (announcementId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${BASE_URL}/api/announcements/${announcementId}/view`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error('Failed to track view:', err);
    }
  };

  const handleAnnouncementClick = (announcement) => {
    trackView(announcement.id);
  };

  // Open viewer modal
  const openViewerModal = async (announcementId, e) => {
    e.stopPropagation();
    setViewerModal({ ...viewerModal, isOpen: true, announcementId });
    setViewerLoading(true);
    
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${BASE_URL}/api/announcements/${announcementId}/viewers`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setViewerModal({
        isOpen: true,
        announcementId: announcementId,
        viewers: res.data.viewers || [],
        total: res.data.total || 0,
        stats: res.data.stats || {}
      });
    } catch (err) {
      console.error('Failed to fetch viewers:', err);
      toast.error('Failed to load viewers');
    } finally {
      setViewerLoading(false);
    }
  };

  const closeViewerModal = () => {
    setViewerModal({ isOpen: false, announcementId: null, viewers: [], total: 0, stats: {} });
  };

  const getCategoryColor = (category) => {
    switch(category) {
      case 'Mass': return { bg: '#8b5cf6', light: '#f3e8ff' };
      case 'Event': return { bg: '#10b981', light: '#d1fae5' };
      case 'Urgent': return { bg: '#ef4444', light: '#fee2e2' };
      case 'Reminder': return { bg: '#f59e0b', light: '#fef3c7' };
      default: return { bg: '#3b82f6', light: '#eff6ff' };
    }
  };

  const DeleteConfirmModal = ({ id, onConfirm, onCancel }) => (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-icon">
          <FiAlertCircle />
        </div>
        <h3>Delete Announcement</h3>
        <p>Are you sure you want to delete this announcement? This action cannot be undone.</p>
        <div className="confirm-buttons">
          <button className="btn-cancel" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </button>
          <button className="btn-confirm-delete" onClick={() => onConfirm(id)} disabled={isDeleting}>
            {isDeleting ? <FiLoader className="spinning" /> : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );

  // Viewer Modal Component
  const ViewersModal = () => {
    if (!viewerModal.isOpen) return null;
    
    const announcement = announcements.find(a => a.id === viewerModal.announcementId);
    
    return (
      <div className="viewers-modal-overlay" onClick={closeViewerModal}>
        <div className="viewers-modal" onClick={(e) => e.stopPropagation()}>
          <div className="viewers-modal-header">
            <h3>👁️ Who Viewed This?</h3>
            <button className="viewers-modal-close" onClick={closeViewerModal}>
              <FiX />
            </button>
          </div>
          
          <div className="viewers-modal-announcement">
            <h4>{announcement?.title || 'Announcement'}</h4>
            <p className="viewers-modal-total">Total Views: <strong>{viewerModal.total}</strong></p>
          </div>

          {viewerLoading ? (
            <div className="viewers-modal-loading">
              <div className="spinner"></div>
              <p>Loading viewers...</p>
            </div>
          ) : (
            <>
              {/* Stats Summary */}
              {viewerModal.stats && Object.keys(viewerModal.stats.byRole || {}).length > 0 && (
                <div className="viewers-modal-stats">
                  <div className="stats-row">
                    <span className="stats-label">By Role:</span>
                    {Object.entries(viewerModal.stats.byRole || {}).map(([role, count]) => (
                      <span key={role} className="stats-badge">
                        {role}: {count}
                      </span>
                    ))}
                  </div>
                  {viewerModal.stats.byJumuia && Object.keys(viewerModal.stats.byJumuia || {}).length > 0 && (
                    <div className="stats-row">
                      <span className="stats-label">By Jumuia:</span>
                      {Object.entries(viewerModal.stats.byJumuia || {}).map(([jumuia, count]) => (
                        <span key={jumuia} className="stats-badge">
                          {jumuia}: {count}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Viewers List */}
              <div className="viewers-modal-list">
                {viewerModal.viewers.length === 0 ? (
                  <p className="no-viewers">No one has viewed this announcement yet.</p>
                ) : (
                  viewerModal.viewers.map((viewer, idx) => (
                    <div key={viewer.id || idx} className="viewer-item">
                      <div className="viewer-avatar-large">
                        {viewer.profileImage ? (
                          <img src={viewer.profileImage} alt={viewer.fullName} />
                        ) : (
                          <span className="avatar-placeholder-large">
                            {viewer.fullName?.charAt(0).toUpperCase() || '?'}
                          </span>
                        )}
                      </div>
                      <div className="viewer-info">
                        <div className="viewer-name">{viewer.fullName}</div>
                        <div className="viewer-details">
                          <span className="viewer-role">{viewer.specialRole || viewer.role || 'Member'}</span>
                          {viewer.membership_number && (
                            <span className="viewer-membership">🆔 {viewer.membership_number}</span>
                          )}
                          {viewer.homeJumuia?.name && (
                            <span className="viewer-jumuia">🏠 {viewer.homeJumuia.name}</span>
                          )}
                        </div>
                      </div>
                      <div className="viewer-time">
                        {formatDate(viewer.viewedAt)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="viewers-modal-footer">
                <span>{viewerModal.total} unique viewer{viewerModal.total !== 1 ? 's' : ''}</span>
                <button className="btn-secondary btn-small" onClick={closeViewerModal}>
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
  <div className="announcements-page">
    <Toaster 
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: '#fff',
          color: '#1e293b',
          borderRadius: '12px',
          padding: '12px 16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        },
      }}
    />
    
    <div className="content-wrapper">
      {/* Header */}
      <div className="header">
        <div className="header-left">
          <div className="title-icon">
            <BsMegaphone />
          </div>
          <div>
            <h1 className="page-title">Secretary Dashboard</h1>
            <p className="page-subtitle">Manage announcements and schedules</p>
          </div>
        </div>
        
        <div className="header-actions">
          <button 
            className="refresh-btn"
            onClick={() => activeTab === "announcements" ? fetchAnnouncements(true) : null}
            disabled={refreshing}
          >
            <FiRefreshCw className={refreshing ? 'spinning' : ''} />
          </button>
        </div>
      </div>

    {/* TAB BUTTONS */}
<div className="tab-navigation">
  <button
    className={`tab-btn ${activeTab === "announcements" ? "active" : ""}`}
    onClick={() => setActiveTab("announcements")}
  >
    📢 Announcements
  </button>
  <button
    className={`tab-btn ${activeTab === "schedules" ? "active" : ""}`}
    onClick={() => setActiveTab("schedules")}
  >
    📅 Schedules
  </button>
  <button
    className={`tab-btn ${activeTab === "minutes" ? "active" : ""}`}
    onClick={() => setActiveTab("minutes")}
  >
    📋 Minutes
  </button>
  <button
    className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
    onClick={() => setActiveTab("history")}
  >
    📜 History
  </button>
</div>

{activeTab === "history" && (
  <div className="tab-content">
    <AdminHistory />
  </div>
)}
      {/* ANNOUNCEMENTS TAB CONTENT */}
      {activeTab === "announcements" && (
        <>
          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon total">
                <MdOutlineAnnouncement />
              </div>
              <div className="stat-content">
                <span className="stat-value">{stats.total}</span>
                <span className="stat-label">Total Announcements</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon categories">
                <FiTag />
              </div>
              <div className="stat-content">
                <span className="stat-value">{stats.categories}</span>
                <span className="stat-label">Categories</span>
              </div>
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div className="search-filter-bar">
            <div className="search-box">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search announcements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            <select 
              className="filter-select"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>

            <button 
              className="btn-primary"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? <FiX /> : <FiPlus />}
              <span>{showForm ? 'Cancel' : 'New Announcement'}</span>
            </button>
          </div>

          {/* Create Form */}
          <AnimatePresence>
            {showForm && (
              <motion.div 
                className="form-card"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <h3 className="form-title">Create New Announcement</h3>
                
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input
                    type="text"
                    placeholder="e.g., Sunday Service Update"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="form-select"
                  >
                    <option value="General">General</option>
                    <option value="Mass">Mass</option>
                    <option value="Event">Event</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Reminder">Reminder</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Content</label>
                  <textarea
                    placeholder="Write your announcement here..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={5}
                    className="form-textarea"
                  />
                </div>

                <div className="form-actions">
                  <button 
                    className="btn-secondary"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn-primary"
                    onClick={handleAdd}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <FiLoader className="spinning" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <FiCheck />
                        Publish Announcement
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content Area */}
          <div className="content-area">
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading announcements...</p>
              </div>
            ) : error ? (
              <div className="error-state">
                <FiAlertCircle className="error-icon" />
                <p>{error}</p>
                <button 
                  className="btn-secondary"
                  onClick={() => fetchAnnouncements()}
                >
                  Try Again
                </button>
              </div>
            ) : filteredAnnouncements.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <BsMegaphone />
                </div>
                <h3>No announcements found</h3>
                <p>
                  {searchTerm || filterCategory !== 'all' 
                    ? 'Try adjusting your search or filters' 
                    : 'Create your first announcement to get started'}
                </p>
              </div>
            ) : (
              <div className="announcements-list">
                {filteredAnnouncements.map((announcement, index) => {
                  const categoryColor = getCategoryColor(announcement.category);
                  return (
                    <motion.div
                      key={announcement.id}
                      className="announcement-card"
                      style={{ borderLeftColor: categoryColor.bg }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleAnnouncementClick(announcement)}
                    >
                      {editingId === announcement.id ? (
                        <div className="edit-mode">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="edit-input"
                            placeholder="Title"
                          />
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="edit-select"
                          >
                            <option value="General">General</option>
                            <option value="Mass">Mass</option>
                            <option value="Event">Event</option>
                            <option value="Urgent">Urgent</option>
                            <option value="Reminder">Reminder</option>
                          </select>
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={4}
                            className="edit-textarea"
                            placeholder="Content"
                          />
                          <div className="edit-actions">
                            <button 
                              className="btn-secondary btn-small"
                              onClick={cancelEdit}
                            >
                              Cancel
                            </button>
                            <button 
                              className="btn-primary btn-small"
                              onClick={() => handleUpdate(announcement.id)}
                            >
                              Save Changes
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="card-header">
                            <div className="card-meta">
                              <span 
                                className="card-category"
                                style={{ 
                                  background: categoryColor.light,
                                  color: categoryColor.bg
                                }}
                              >
                                {announcement.category || 'General'}
                              </span>
                              <span className="card-date">
                                <FiClock /> {formatDate(announcement.createdAt)}
                              </span>
                              <span 
                                className="card-views"
                                onClick={(e) => openViewerModal(announcement.id, e)}
                                title="Click to see who viewed this"
                              >
                                <FiEye /> {announcement.viewCount || 0}
                              </span>
                            </div>
                            <div className="card-actions">
                              <button 
                                className="action-btn edit"
                                onClick={(e) => { e.stopPropagation(); startEdit(announcement); }}
                                title="Edit"
                              >
                                <FiEdit2 />
                              </button>
                              <button 
                                className="action-btn delete"
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(announcement.id); }}
                                title="Delete"
                              >
                                <FiTrash2 />
                              </button>
                            </div>
                          </div>
                          
                          <h3 className="card-title">{announcement.title}</h3>
                          <p className="card-content">{announcement.content}</p>

                          {/* Viewer Avatars */}
                          {announcement.recentViewers && announcement.recentViewers.length > 0 && (
                            <div className="card-viewers">
                              <div className="viewer-avatars">
                                {announcement.recentViewers.slice(0, 5).map((viewer, idx) => (
                                  <div 
                                    key={viewer.id || idx} 
                                    className="viewer-avatar" 
                                    title={`${viewer.fullName} - ${viewer.role || 'Member'}`}
                                    style={{ zIndex: 5 - idx }}
                                  >
                                    {viewer.profileImage ? (
                                      <img src={viewer.profileImage} alt={viewer.fullName} />
                                    ) : (
                                      <span className="avatar-placeholder">
                                        {viewer.fullName?.charAt(0).toUpperCase() || '?'}
                                      </span>
                                    )}
                                  </div>
                                ))}
                                {announcement.recentViewers.length > 5 && (
                                  <div 
                                    className="viewer-more"
                                    onClick={(e) => openViewerModal(announcement.id, e)}
                                  >
                                    +{announcement.recentViewers.length - 5}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {announcement.updatedAt !== announcement.createdAt && (
                            <span className="edited-badge">
                              Edited {formatDate(announcement.updatedAt)}
                            </span>
                          )}
                        </>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* SCHEDULES TAB CONTENT */}
      {activeTab === "schedules" && (
        <AdminSchedules />
      )}

      {/* MINUTES TAB CONTENT */}
      {activeTab === "minutes" && (
        <div className="minutes-tab-content">
          <MinutesList userRole="secretary" />
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <DeleteConfirmModal 
          id={deleteConfirmId}
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}

      {/* Viewers Modal */}
      <ViewersModal />
    </div>

      <style>{`
        .announcements-page {
          min-height: 100vh;
          background: #f8fafc;
          margin-top: 0px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 24px;
        }

        .content-wrapper {
          max-width: 1200px;
          margin: 0 auto;
        }

        /* Header */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
          background: white;
          padding: 20px 24px;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .title-icon {
          width: 48px;
          height: 48px;
          background: #eff6ff;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: #3b82f6;
        }

        .page-title {
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 4px 0;
        }

        .page-subtitle {
          font-size: 14px;
          color: #64748b;
          margin: 0;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .refresh-btn {
          width: 42px;
          height: 42px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab-navigation {
          display: grid;
          gap: 6px;
          margin-bottom: 24px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 0;
        }

        .tab-btn {
          padding: 10px 24px;
          background: none;
          border: none;
          font-size: 15px;
          font-weight: 500;
          color: #64748b;
          cursor: pointer;
          border-radius: 8px 8px 0 0;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .tab-btn:hover {
          color: #3b82f6;
          background: #f1f5f9;
        }

        .tab-btn.active {
          color: #3b82f6;
          border-bottom: 2px solid #3b82f6;
          background: #eff6ff;
        }

        .refresh-btn:hover:not(:disabled) {
          background: #f8fafc;
          color: #0f172a;
          border-color: #cbd5e1;
        }
        .refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
          transform: translateY(-1px);
        }
        .btn-primary:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: white;
          color: #475569;
          border: 1px solid #e2e8f0;
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-secondary:hover:not(:disabled) {
          background: #f8fafc;
        }

        .btn-small {
          padding: 8px 16px;
          font-size: 13px;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 6px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }
        .stat-icon.total {
          background: #eff6ff;
          color: #3b82f6;
        }
        .stat-icon.categories {
          background: #fef3c7;
          color: #f59e0b;
        }

        .stat-value {
          display: block;
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.2;
          margin-bottom: 4px;
        }

        .stat-label {
          display: block;
          font-size: 13px;
          color: #64748b;
        }

        /* Search and Filter */
        .search-filter-bar {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .search-box {
          flex: 1;
          min-width: 250px;
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          font-size: 18px;
        }

        .search-input {
          width: 100%;
          padding: 12px 16px 12px 44px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: white;
          color: #1e293b;
          font-size: 14px;
          outline: none;
          transition: all 0.2s;
        }
        .search-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
        }
        .search-input::placeholder {
          color: #94a3b8;
        }

        .filter-select {
          padding: 12px 20px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: white;
          color: #1e293b;
          font-size: 14px;
          cursor: pointer;
          outline: none;
          min-width: 150px;
        }
        .filter-select:focus {
          border-color: #3b82f6;
        }

        /* Form Card */
        .form-card {
          background: white;
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 24px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .form-title {
          font-size: 18px;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 20px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #475569;
          margin-bottom: 6px;
        }

        .form-input,
        .form-select,
        .form-textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: white;
          color: #1e293b;
          font-size: 14px;
          transition: all 0.2s;
          font-family: inherit;
        }
        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .form-input:disabled,
        .form-select:disabled,
        .form-textarea:disabled {
          background: #f8fafc;
          cursor: not-allowed;
        }

        .form-textarea {
          resize: vertical;
          min-height: 120px;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 20px;
        }

        /* Content Area */
        .content-area {
          min-height: 400px;
        }

        /* Loading State */
        .loading-state {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 20px;
          color: #64748b;
          border: 1px solid #e2e8f0;
        }

        .spinner {
          width: 48px;
          height: 48px;
          margin: 0 auto 16px;
          border: 3px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Error State */
        .error-state {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 20px;
          color: #1e293b;
          border: 1px solid #fecaca;
        }

        .error-icon {
          font-size: 48px;
          margin-bottom: 16px;
          color: #ef4444;
        }

        .error-state p {
          margin-bottom: 20px;
          font-size: 16px;
          color: #64748b;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 20px;
          color: #1e293b;
          border: 2px dashed #e2e8f0;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .empty-state h3 {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 8px;
          color: #0f172a;
        }

        .empty-state p {
          color: #64748b;
          margin-bottom: 20px;
        }

        /* Announcements List */
        .announcements-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .announcement-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #e2e8f0;
          transition: all 0.3s;
          border-left-width: 4px;
          border-left-style: solid;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
          cursor: pointer;
        }
        .announcement-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .card-meta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .card-category {
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .card-date {
          font-size: 11px;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 4px;
          background: #f8fafc;
          padding: 4px 10px;
          border-radius: 20px;
        }

        .card-views {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #64748b;
          background: #f1f5f9;
          padding: 2px 10px;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .card-views:hover {
          background: #e2e8f0;
          transform: scale(1.05);
        }

        .card-actions {
          display: flex;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .announcement-card:hover .card-actions {
          opacity: 1;
        }

        .action-btn {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 8px;
          background: #f1f5f9;
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .action-btn.edit:hover:not(:disabled) {
          background: #eff6ff;
          color: #3b82f6;
        }
        .action-btn.delete:hover:not(:disabled) {
          background: #fef2f2;
          color: #dc2626;
        }
        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .card-title {
          font-size: 16px;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 8px;
          line-height: 1.4;
        }

        .card-content {
          font-size: 14px;
          color: #475569;
          line-height: 1.6;
          margin: 0 0 12px;
          white-space: pre-wrap;
        }

        .card-viewers {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
        }

        .viewer-avatars {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0;
        }

        .viewer-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #e2e8f0;
          color: #475569;
          font-size: 12px;
          font-weight: 600;
          margin-right: -8px;
          border: 2px solid white;
          overflow: hidden;
          transition: transform 0.2s;
          cursor: default;
        }

        .viewer-avatar:hover {
          transform: scale(1.1);
          z-index: 10 !important;
        }

        .viewer-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white;
          font-size: 14px;
          font-weight: 600;
        }

        .viewer-more {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          border: 2px solid white;
          margin-right: -8px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .viewer-more:hover {
          background: #e2e8f0;
        }

        .edited-badge {
          font-size: 11px;
          color: #94a3b8;
          font-style: italic;
          display: block;
        }

        /* Edit Mode */
        .edit-mode {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .edit-input,
        .edit-select,
        .edit-textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          color: #1e293b;
          font-size: 14px;
          transition: all 0.2s;
          font-family: inherit;
        }
        .edit-input:focus,
        .edit-select:focus,
        .edit-textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .edit-textarea {
          resize: vertical;
          min-height: 100px;
        }

        .edit-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }

        /* Delete Confirmation Modal */
        .confirm-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999999;
        }

        .confirm-modal {
          background: white;
          border-radius: 20px;
          padding: 24px;
          max-width: 400px;
          width: 90%;
          text-align: center;
          animation: fadeInUp 0.2s ease;
          z-index: 9990999;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .confirm-icon {
          width: 56px;
          height: 56px;
          background: #fef2f2;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          font-size: 28px;
          color: #ef4444;
        }

        .confirm-modal h3 {
          font-size: 18px;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 8px;
        }

        .confirm-modal p {
          font-size: 14px;
          color: #64748b;
          margin: 0 0 24px;
        }

        .confirm-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .btn-cancel {
          padding: 10px 20px;
          background: #f1f5f9;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
          flex: 1;
        }
        .btn-cancel:hover:not(:disabled) {
          background: #e2e8f0;
        }

        .btn-confirm-delete {
          padding: 10px 20px;
          background: #ef4444;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .btn-confirm-delete:hover:not(:disabled) {
          background: #dc2626;
        }

        /* Viewers Modal */
        .viewers-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999999;
        }

        .viewers-modal {
          background: white;
          border-radius: 20px;
          padding: 24px;
          max-width: 600px;
          width: 95%;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          animation: fadeInUp 0.2s ease;
          z-index: 9990999;
        }

        .viewers-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e2e8f0;
        }

        .viewers-modal-header h3 {
          font-size: 18px;
          font-weight: 600;
          color: #0f172a;
          margin: 0;
        }

        .viewers-modal-close {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 8px;
          background: #f1f5f9;
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .viewers-modal-close:hover {
          background: #e2e8f0;
        }

        .viewers-modal-announcement {
          margin-bottom: 16px;
          padding: 12px;
          background: #f8fafc;
          border-radius: 12px;
        }

        .viewers-modal-announcement h4 {
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 4px;
        }

        .viewers-modal-total {
          font-size: 13px;
          color: #64748b;
          margin: 0;
        }

        .viewers-modal-total strong {
          color: #3b82f6;
          font-size: 16px;
        }

        .viewers-modal-stats {
          margin-bottom: 16px;
          padding: 12px;
          background: #f1f5f9;
          border-radius: 12px;
        }

        .stats-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 4px;
        }

        .stats-row:last-child {
          margin-bottom: 0;
        }

        .stats-label {
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          margin-right: 4px;
        }

        .stats-badge {
          font-size: 11px;
          background: white;
          padding: 2px 10px;
          border-radius: 12px;
          color: #475569;
        }

        .viewers-modal-list {
          flex: 1;
          overflow-y: auto;
          max-height: 350px;
          margin-bottom: 16px;
        }

        .viewer-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 10px;
          transition: background 0.2s;
          border-bottom: 1px solid #f1f5f9;
        }

        .viewer-item:hover {
          background: #f8fafc;
        }

        .viewer-avatar-large {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
          background: #e2e8f0;
        }

        .viewer-avatar-large img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-placeholder-large {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white;
          font-size: 18px;
          font-weight: 600;
        }

        .viewer-info {
          flex: 1;
          min-width: 0;
        }

        .viewer-name {
          font-size: 14px;
          font-weight: 500;
          color: #0f172a;
        }

        .viewer-details {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          font-size: 12px;
          color: #64748b;
        }

        .viewer-role {
          background: #eff6ff;
          color: #3b82f6;
          padding: 0 8px;
          border-radius: 4px;
        }

        .viewer-membership,
        .viewer-jumuia {
          color: #64748b;
        }

        .viewer-time {
          font-size: 12px;
          color: #94a3b8;
          flex-shrink: 0;
        }

        .viewers-modal-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
        }

        .viewers-modal-footer span {
          font-size: 13px;
          color: #64748b;
        }

        .viewers-modal-loading {
          text-align: center;
          padding: 40px 20px;
        }

        .viewers-modal-loading .spinner {
          width: 32px;
          height: 32px;
        }

        .no-viewers {
          text-align: center;
          color: #94a3b8;
          padding: 30px 0;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .announcements-page { padding: 16px; }
          
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .search-filter-bar {
            flex-direction: column;
          }

          .filter-select {
            width: 100%;
          }

          .card-actions {
            opacity: 1;
          }

          .form-actions {
            flex-direction: column;
          }

          .form-actions button {
            width: 100%;
          }

          .header {
            flex-direction: column;
            align-items: flex-start;
          }

          .header-actions {
            width: 100%;
            justify-content: space-between;
          }

          .viewers-modal {
            max-width: 100%;
            max-height: 90vh;
            margin: 10px;
            padding: 16px;
          }

          .viewer-item {
            flex-wrap: wrap;
          }

          .viewer-time {
            width: 100%;
            padding-left: 52px;
          }
        }

        @media (max-width: 480px) {
          .card-header {
            flex-direction: column;
            gap: 8px;
          }

          .card-meta {
            width: 100%;
          }

          .minutes-tab-content {
            margin-top: 20px;
          }

          .viewer-avatar {
            width: 28px;
            height: 28px;
            font-size: 10px;
            margin-right: -6px;
          }

          .viewer-more {
            width: 28px;
            height: 28px;
            font-size: 10px;
          }

          .card-views {
            font-size: 11px;
            padding: 2px 8px;
          }
        }

        .minutes-tab-content {
          margin-top: 0;
          padding: 0;
        }

        .tab-content {
          margin-top: 20px;
        }
      `}</style>
    </div>
  );
}