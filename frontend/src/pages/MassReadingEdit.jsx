import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { 
  ArrowLeft, Home, Upload, File, Image, FileText, 
  X, Plus, Calendar, Clock, User, BookOpen,
  CheckCircle, AlertCircle, Trash2, FileType,
  Loader2, Save, Edit
} from 'lucide-react';

// INJECT STYLES BEFORE COMPONENT RENDERS
const styles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }

  .mass-reading-edit {
    min-height: 100vh;
    background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  /* Force the page to scroll properly under the header */
.mass-reading-edit {
  min-height: calc(100vh - 70px); /* Adjust based on your header height */
  padding-top: 0px;
  margin-top: 0;
  display: block;
    margin-bottom: 100px;

  position: relative;
  z-index: 1;
}

/* Ensure the header section is properly contained */
.edit-header {
  margin-top: 0;
  /* Keep the rest of your header styles */
}

  /* Premium Loader - Same as Landing2 */
  .edit-loader-premium {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
    color: white;
    padding: 40px;
    position: relative;
    overflow: hidden;
  }

  .edit-loader-premium::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.15), transparent);
    transform: translate(-50%, -50%);
    filter: blur(60px);
    animation: pulseGlow 4s infinite;
  }

  @keyframes pulseGlow {
    0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
    50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
  }

  .loader-ring-container {
    position: relative;
    width: 120px;
    height: 120px;
    margin-bottom: 30px;
    z-index: 2;
  }

  .loader-ring {
    position: absolute;
    border-radius: 50%;
    border: 3px solid transparent;
    animation: ringSpin 1.5s linear infinite;
    z-index: 1;
  }

  .ring-1 {
    top: -8px;
    left: -8px;
    right: -8px;
    bottom: -8px;
    border-top-color: #00c6ff;
    border-right-color: transparent;
    animation-duration: 1.2s;
  }

  .ring-2 {
    top: -20px;
    left: -20px;
    right: -20px;
    bottom: -20px;
    border-bottom-color: #007bff;
    border-left-color: transparent;
    animation-duration: 2s;
    animation-direction: reverse;
  }

  .ring-3 {
    top: -32px;
    left: -32px;
    right: -32px;
    bottom: -32px;
    border-top-color: rgba(0, 198, 255, 0.4);
    border-bottom-color: rgba(0, 123, 255, 0.4);
    border-right-color: transparent;
    border-left-color: transparent;
    animation-duration: 2.5s;
  }

  @keyframes ringSpin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .loader-icon-premium {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #00c6ff;
    opacity: 0.8;
    z-index: 2;
  }

  .loader-title {
    font-size: 22px;
    font-weight: 700;
    margin-bottom: 8px;
    color: white;
    z-index: 2;
    position: relative;
  }

  .loader-sub {
    font-size: 14px;
    color: #94a3b8;
    margin-bottom: 30px;
    z-index: 2;
    position: relative;
  }

  .loader-progress {
    display: flex;
    align-items: center;
    gap: 16px;
    max-width: 280px;
    width: 100%;
    z-index: 2;
    position: relative;
  }

  .loader-progress-track {
    flex: 1;
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    overflow: hidden;
  }

  .loader-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #007bff, #00c6ff);
    border-radius: 4px;
    transition: width 0.5s ease;
    animation: progressPulse 2s ease-in-out infinite;
  }

  @keyframes progressPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  .loader-progress-text {
    font-size: 13px;
    font-weight: 600;
    color: #00c6ff;
    min-width: 40px;
    text-align: right;
  }

  /* Header */
  .edit-header {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
    padding: 20px 24px 40px;
    position: relative;
    overflow: hidden;
  }

  .nav-bar {
    display: flex;
    gap: 12px;
    margin-bottom: 30px;
    flex-wrap: wrap;
    position: relative;
    z-index: 10;
  }

  .nav-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 18px;
    background: rgba(255,255,255,0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 40px;
    color: white;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 13px;
  }

  .nav-btn:hover { background: rgba(255,255,255,0.2); transform: translateX(-2px); }
  .nav-btn.home:hover { background: #3b82f6; transform: translateX(0); }
  .nav-btn.readings:hover { background: #3b82f6; transform: translateX(0); }

  .edit-hero {
    text-align: center;
    color: white;
    position: relative;
    z-index: 10;
  }

  .edit-icon-wrapper {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 72px;
    height: 72px;
    background: rgba(59, 130, 246, 0.15);
    border-radius: 50%;
    margin-bottom: 16px;
    border: 2px solid rgba(59, 130, 246, 0.2);
  }

  .edit-hero h1 {
    font-size: 28px;
    font-weight: 700;
    margin: 0 0 8px 0;
  }

  .edit-hero p {
    font-size: 15px;
    color: #94a3b8;
    margin: 0;
  }

  .edit-form-container {
    max-width: 700px;
    margin: -20px auto 40px;
    padding: 0 20px;
    position: relative;
    z-index: 3;
  }

  .edit-form {
    background: white;
    border-radius: 24px;
    padding: 32px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
  }

  .form-section {
    margin-bottom: 28px;
  }

  .form-section h3 {
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 16px 0;
  }

  .upload-subtitle {
    font-size: 13px;
    color: #94a3b8;
    margin: -8px 0 16px 0;
  }

  .form-group {
    margin-bottom: 16px;
  }

  .form-group label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: #475569;
    margin-bottom: 6px;
  }

  .required {
    color: #ef4444;
  }

  .form-input,
  .form-textarea {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-size: 14px;
    transition: all 0.2s;
    background: #fafbfc;
  }

  .form-input:focus,
  .form-textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-textarea {
    resize: vertical;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .checkbox-group {
    display: flex;
    flex-direction: column;
    margin-top: 8px;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-weight: 500;
    color: #1e293b;
  }

  .checkbox-label input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }

  .checkbox-help {
    font-size: 12px;
    color: #94a3b8;
    margin: 4px 0 0 26px;
  }

  .existing-attachments {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .existing-attachment-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: #f8fafc;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
  }

  .remove-existing {
    background: none;
    border: none;
    color: #ef4444;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .remove-existing:hover {
    background: #fee2e2;
  }

  .drop-zone {
    border: 2px dashed #e2e8f0;
    border-radius: 16px;
    padding: 40px 20px;
    text-align: center;
    transition: all 0.3s ease;
    position: relative;
    background: #fafbfc;
  }

  .drop-zone.drag-over {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .file-input {
    display: none;
  }

  .drop-zone-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .drop-icon {
    color: #64748b;
  }

  .drop-zone.drag-over .drop-icon {
    color: #3b82f6;
  }

  .drop-zone-content h4 {
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
  }

  .drop-zone-content p {
    font-size: 13px;
    color: #94a3b8;
    margin: 0;
  }

  .file-list {
    margin-top: 16px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    overflow: hidden;
  }

  .file-list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    font-size: 13px;
    color: #64748b;
  }

  .clear-all {
    display: flex;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    color: #ef4444;
    font-size: 12px;
    cursor: pointer;
  }

  .clear-all:hover {
    color: #dc2626;
  }

  .file-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    border-bottom: 1px solid #f1f5f9;
  }

  .file-item:last-child {
    border-bottom: none;
  }

  .file-icon {
    flex-shrink: 0;
  }

  .file-icon-img { color: #22c55e; }
  .file-icon-pdf { color: #ef4444; }
  .file-icon-word { color: #3b82f6; }
  .file-icon-ppt { color: #f59e0b; }
  .file-icon-video { color: #8b5cf6; }
  .file-icon-default { color: #94a3b8; }

  .file-info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .file-name {
    font-size: 13px;
    font-weight: 500;
    color: #1e293b;
  }

  .file-size {
    font-size: 11px;
    color: #94a3b8;
  }

  .remove-file {
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .remove-file:hover {
    background: #fee2e2;
    color: #ef4444;
  }

  .upload-progress {
    margin-top: 16px;
  }

  .progress-bar {
    height: 4px;
    background: #e2e8f0;
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #2563eb);
    transition: width 0.3s ease;
  }

  .progress-text {
    display: block;
    font-size: 12px;
    color: #64748b;
    margin-top: 6px;
    text-align: right;
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #fee2e2;
    color: #dc2626;
    padding: 12px 16px;
    border-radius: 10px;
    font-size: 13px;
    margin-bottom: 16px;
  }

  .success-message {
    display: flex;
    align-items: center;
    gap: 12px;
    background: #dcfce7;
    color: #16a34a;
    padding: 12px 16px;
    border-radius: 10px;
    font-size: 13px;
    margin-bottom: 16px;
  }

  .success-message strong {
    display: block;
  }

  .form-actions {
    display: flex;
    gap: 12px;
    margin-top: 8px;
  }

  .cancel-btn {
    flex: 1;
    padding: 14px;
    background: #f1f5f9;
    color: #64748b;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .cancel-btn:hover {
    background: #e2e8f0;
  }

  .save-btn {
    flex: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px;
    background: linear-gradient(135deg, #1e293b, #334155);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .save-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(30, 41, 59, 0.3);
  }

  .save-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .spinning {
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 768px) {
    .edit-header { padding: 16px; }
    .edit-hero h1 { font-size: 22px; }
    .edit-form { padding: 20px; }
    .form-row { grid-template-columns: 1fr; }
    .drop-zone { padding: 30px 16px; }
    .form-actions { flex-direction: column; }
    
    .edit-loader-premium { padding: 20px; }
    .loader-ring-container { width: 90px; height: 90px; }
    .loader-icon-premium { font-size: 28px; }
    .loader-title { font-size: 18px; }
    
    .edit-loader-premium::before {
      width: 200px;
      height: 200px;
    }
  }
`;

// INJECT STYLES BEFORE ANY RENDER
if (typeof document !== 'undefined') {
  const styleTag = document.createElement('style');
  styleTag.textContent = styles;
  document.head.appendChild(styleTag);
}

export default function MassReadingEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    dateLabel: '',
    isPublished: true
  });

  const [existingAttachments, setExistingAttachments] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [filesToDelete, setFilesToDelete] = useState([]);
  const [dragOver, setDragOver] = useState(false);

  useLayoutEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(storedUser);
    fetchReading(storedUser);
  }, [id]);

  const fetchReading = async (storedUser) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/mass-readings/${id}`);
      const reading = res.data.reading;
      
      if (storedUser?.id !== reading.uploadedBy && storedUser?.role !== 'admin') {
        navigate('/mass-readings');
        return;
      }

      setFormData({
        title: reading.title || '',
        description: reading.description || '',
        date: reading.date ? new Date(reading.date).toISOString().split('T')[0] : '',
        dateLabel: reading.dateLabel || '',
        isPublished: reading.isPublished !== undefined ? reading.isPublished : true
      });
      
      setExistingAttachments(reading.attachments || []);
    } catch (error) {
      console.error('Error fetching reading:', error);
      setError('Failed to load reading data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (name === 'date') {
      const dateObj = new Date(value);
      setFormData(prev => ({
        ...prev,
        dateLabel: dateObj.toLocaleDateString('en-US', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      }));
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    handleFiles(selectedFiles);
  };

  const handleFiles = (newFiles) => {
    const validFiles = newFiles.filter(file => {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 
                          'application/pdf', 'application/msword', 
                          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                          'application/vnd.ms-powerpoint', 
                          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                          'video/mp4', 'video/webm', 'video/ogg'];
      return validTypes.includes(file.type);
    });

    if (validFiles.length !== newFiles.length) {
      setError('Some files were skipped. Only images, PDFs, Word, PowerPoint, and videos are allowed.');
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
    setError(null);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingFile = (index) => {
    const fileToRemove = existingAttachments[index];
    setFilesToDelete(prev => [...prev, fileToRemove.id]);
    setExistingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!formData.title || !formData.date) {
      setError('Please fill in the title and date');
      return;
    }

    setSaving(true);
    setUploadingFiles(true);
    setError(null);
    setUploadProgress(0);

    try {
      let allAttachments = [];

      if (selectedFiles.length > 0) {
        const formDataObj = new FormData();
        selectedFiles.forEach(file => {
          formDataObj.append('files', file);
        });

        const uploadRes = await api.post('/api/mass-readings/upload', formDataObj, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        });

        const uploadedFileData = uploadRes.data.files;
        setUploadedFiles(uploadedFileData);
        allAttachments = [...allAttachments, ...uploadedFileData];
      }

      setUploadingFiles(false);
      setUploadProgress(100);

      const existingAttachmentsData = existingAttachments.map((att, index) => ({
        fileName: att.fileName,
        fileUrl: att.fileUrl,
        publicId: att.publicId,
        fileType: att.fileType,
        mimeType: att.mimeType,
        fileSize: att.fileSize,
        displayOrder: index
      }));

      const newAttachmentsData = allAttachments.map((file, index) => ({
        fileName: file.fileName,
        fileUrl: file.fileUrl,
        publicId: file.publicId,
        fileType: file.fileType,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
        displayOrder: existingAttachments.length + index
      }));

      const allAttachmentsData = [...existingAttachmentsData, ...newAttachmentsData];

      const readingData = {
        title: formData.title,
        description: formData.description || null,
        date: formData.date,
        dateLabel: formData.dateLabel,
        isPublished: formData.isPublished,
        attachments: allAttachmentsData,
        deleteAttachments: filesToDelete
      };

      await api.put(`/api/mass-readings/${id}`, readingData);
      setSuccess(true);
      
      setTimeout(() => {
        navigate(`/mass-readings/${id}`);
      }, 2000);

    } catch (err) {
      console.error('Update error:', err);
      setError(err.response?.data?.error || 'Failed to update reading. Please try again.');
    } finally {
      setSaving(false);
      setUploadingFiles(false);
    }
  };

  const goBack = () => navigate(-1);
  const goHome = () => navigate('/dashboard');
  const goReadings = () => navigate('/mass-readings');

  const getFileIcon = (file) => {
    const type = file.type || file.mimeType || '';
    if (type.startsWith('image/')) return <Image size={20} className="file-icon-img" />;
    if (type === 'application/pdf') return <FileText size={20} className="file-icon-pdf" />;
    if (type.includes('word')) return <FileText size={20} className="file-icon-word" />;
    if (type.includes('powerpoint')) return <FileText size={20} className="file-icon-ppt" />;
    if (type.startsWith('video/')) return <FileText size={20} className="file-icon-video" />;
    return <File size={20} className="file-icon-default" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="edit-loader-premium">
        <div className="loader-ring-container">
          <div className="loader-ring ring-1"></div>
          <div className="loader-ring ring-2"></div>
          <div className="loader-ring ring-3"></div>
          <Edit size={40} className="loader-icon-premium" />
        </div>
        <h3 className="loader-title">Loading Reading</h3>
        <p className="loader-sub">Preparing the reading data...</p>
        <div className="loader-progress">
          <div className="loader-progress-track">
            <div className="loader-progress-fill" style={{ width: '75%' }}></div>
          </div>
          <span className="loader-progress-text">75%</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mass-reading-edit">
      <div className="edit-header">
        <div className="nav-bar">
          <button className="nav-btn back" onClick={goBack}>
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
          <button className="nav-btn home" onClick={goHome}>
            <Home size={18} />
            <span>Dashboard</span>
          </button>
          <button className="nav-btn readings" onClick={goReadings}>
            <BookOpen size={18} />
            <span>All Readings</span>
          </button>
        </div>

        <div className="edit-hero">
          <div className="edit-icon-wrapper">
            <Edit size={32} />
          </div>
          <h1>Edit Mass Reading</h1>
          <p>Update the reading details</p>
        </div>
      </div>

      <div className="edit-form-container">
        <div className="edit-form">
          <div className="form-section">
            <h3>Reading Information</h3>
            
            <div className="form-group">
              <label>Title <span className="required">*</span></label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Wednesday 16th July 2026 Mass Readings"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Add a brief description of the readings..."
                className="form-textarea"
                rows="3"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Date <span className="required">*</span></label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Date Label</label>
                <input
                  type="text"
                  name="dateLabel"
                  value={formData.dateLabel}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Auto-generated from date"
                />
              </div>
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="isPublished"
                  checked={formData.isPublished}
                  onChange={handleInputChange}
                />
                <span>Published</span>
              </label>
              <p className="checkbox-help">Uncheck to hide this reading from the public</p>
            </div>
          </div>

          {existingAttachments.length > 0 && (
            <div className="form-section">
              <h3>Current Attachments</h3>
              <div className="existing-attachments">
                {existingAttachments.map((att, index) => (
                  <div key={index} className="existing-attachment-item">
                    <div className="file-icon">{getFileIcon(att)}</div>
                    <div className="file-info">
                      <span className="file-name">{att.fileName}</span>
                      <span className="file-size">{formatFileSize(att.fileSize)}</span>
                    </div>
                    <button 
                      className="remove-existing"
                      onClick={() => removeExistingFile(index)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-section">
            <h3>Add New Attachments</h3>
            <p className="upload-subtitle">Upload images, PDFs, Word documents, PowerPoint, or videos</p>

            <div 
              className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
            >
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,video/*"
                className="file-input"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="drop-zone-content">
                <Upload size={40} className="drop-icon" />
                <h4>Drop files here or click to browse</h4>
                <p>Supports: Images, PDFs, Word, PowerPoint, Videos</p>
              </label>
            </div>

            {selectedFiles.length > 0 && (
              <div className="file-list">
                <div className="file-list-header">
                  <span>{selectedFiles.length} file(s) selected</span>
                  <button className="clear-all" onClick={() => setSelectedFiles([])}>
                    <Trash2 size={16} />
                    Clear All
                  </button>
                </div>
                {selectedFiles.map((file, index) => (
                  <div key={index} className="file-item">
                    <div className="file-icon">{getFileIcon(file)}</div>
                    <div className="file-info">
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">{formatFileSize(file.size)}</span>
                    </div>
                    <button className="remove-file" onClick={() => removeFile(index)}>
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {uploadingFiles && (
              <div className="upload-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="progress-text">{uploadProgress}% uploaded</span>
              </div>
            )}
          </div>

          {error && (
            <div className="error-message">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {success && (
            <div className="success-message">
              <CheckCircle size={18} />
              <div>
                <strong>Reading updated successfully!</strong>
                <p>Redirecting to reading...</p>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button 
              className="cancel-btn"
              onClick={() => navigate(`/mass-readings/${id}`)}
            >
              Cancel
            </button>
            <button 
              className="save-btn"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="spinning" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}