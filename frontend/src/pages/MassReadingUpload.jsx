import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { 
  ArrowLeft, Home, Upload, File, Image, FileText, 
  X, Plus, Calendar, Clock, User, BookOpen,
  CheckCircle, AlertCircle, Trash2, FileType,
  Loader2
} from 'lucide-react';

export default function MassReadingUpload() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [createdReadingId, setCreatedReadingId] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    dateLabel: new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  });

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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

  const handleUpload = async () => {
    if (!formData.title || !formData.date) {
      setError('Please fill in the title and date');
      return;
    }

    if (selectedFiles.length === 0) {
      setError('Please select at least one file to upload');
      return;
    }

    setLoading(true);
    setUploadingFiles(true);
    setError(null);
    setUploadProgress(0);

    try {
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

      setUploadingFiles(false);
      setUploadProgress(100);

      const readingData = {
        title: formData.title,
        description: formData.description || null,
        date: formData.date,
        dateLabel: formData.dateLabel,
        attachments: uploadedFileData.map((file, index) => ({
          fileName: file.fileName,
          fileUrl: file.fileUrl,
          publicId: file.publicId,
          fileType: file.fileType,
          mimeType: file.mimeType,
          fileSize: file.fileSize,
          displayOrder: index
        }))
      };

      const readingRes = await api.post('/api/mass-readings', readingData);
      setCreatedReadingId(readingRes.data.reading.id);
      setSuccess(true);
      
      setTimeout(() => {
        setSelectedFiles([]);
        setUploadedFiles([]);
        setFormData({
          title: '',
          description: '',
          date: new Date().toISOString().split('T')[0],
          dateLabel: new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })
        });
        setSuccess(false);
        setUploadProgress(0);
      }, 3000);

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error || 'Failed to upload reading. Please try again.');
    } finally {
      setLoading(false);
      setUploadingFiles(false);
    }
  };

  const goBack = () => navigate(-1);
  const goHome = () => navigate('/dashboard');
  const goReadings = () => navigate('/mass-readings');

  const getFileIcon = (file) => {
    const type = file.type || '';
    if (type.startsWith('image/')) return <Image size={20} className="file-icon-img" />;
    if (type === 'application/pdf') return <FileText size={20} className="file-icon-pdf" />;
    if (type.includes('word')) return <FileText size={20} className="file-icon-word" />;
    if (type.includes('powerpoint')) return <FileText size={20} className="file-icon-ppt" />;
    if (type.startsWith('video/')) return <FileText size={20} className="file-icon-video" />;
    return <File size={20} className="file-icon-default" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Skeleton Loader
  const SkeletonLoader = () => (
    <div className="skeleton-container">
      <div className="skeleton-header">
        <div className="skeleton skeleton-circle"></div>
        <div className="skeleton skeleton-text" style={{ width: '200px' }}></div>
      </div>
      <div className="skeleton-body">
        <div className="skeleton skeleton-text" style={{ width: '100%', height: '40px' }}></div>
        <div className="skeleton skeleton-text" style={{ width: '100%', height: '80px' }}></div>
        <div className="skeleton-row">
          <div className="skeleton skeleton-text" style={{ width: '45%', height: '40px' }}></div>
          <div className="skeleton skeleton-text" style={{ width: '45%', height: '40px' }}></div>
        </div>
        <div className="skeleton skeleton-text" style={{ width: '100%', height: '150px' }}></div>
        <div className="skeleton skeleton-text" style={{ width: '100%', height: '50px' }}></div>
      </div>
    </div>
  );

  return (
    <div className="mass-reading-upload">
      {/* Header */}
      <div className="upload-header">
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

        <div className="upload-hero">
          <div className="upload-icon-wrapper">
            <Upload size={32} />
          </div>
          <h1>Upload Mass Reading</h1>
          <p>Share Bible readings with the ZUCA members</p>
        </div>
      </div>

      {/* Upload Form */}
      <div className="upload-form-container">
        {loading && !success ? (
          <SkeletonLoader />
        ) : (
          <div className="upload-form">
            {/* Form Fields */}
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
            </div>

            {/* File Upload Section */}
            <div className="form-section">
              <h3>Attachments</h3>
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
                  <strong>Reading uploaded successfully!</strong>
                  <p>Redirecting to reading...</p>
                </div>
              </div>
            )}

            <button 
              className="submit-btn"
              onClick={handleUpload}
              disabled={loading || selectedFiles.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="spinning" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={18} />
                  Upload Reading
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }

        .mass-reading-upload {
          min-height: 100vh;
          
          background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .upload-header {
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
        .nav-btn.readings:hover { background: #8b5cf6; transform: translateX(0); }

        .upload-hero {
          text-align: center;
          color: white;
          
        }

        .upload-icon-wrapper {
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

        .upload-hero h1 {
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 8px 0;
        }

        .upload-hero p {
          font-size: 15px;
          color: #94a3b8;
          margin: 0;
        }

        .upload-form-container {
          max-width: 700px;
          margin: -20px auto 40px;
          padding: 0 20px;
        }

        .upload-form {
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
          transition: border-color 0.2s;
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

        .submit-btn {
          width: 100%;
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

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(30, 41, 59, 0.3);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinning {
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin { 100% { transform: rotate(360deg); } }

        /* Skeleton Loader */
        .skeleton-container {
          background: white;
          border-radius: 24px;
          padding: 32px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
        }

        .skeleton {
          background: #e2e8f0;
          border-radius: 8px;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .skeleton-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }

        .skeleton-circle {
          width: 48px;
          height: 48px;
          border-radius: 50%;
        }

        .skeleton-text {
          height: 16px;
        }

        .skeleton-body {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .skeleton-row {
          display: flex;
          gap: 16px;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.3; }
        }

        @media (max-width: 768px) {
          .upload-header { padding: 16px; }
          .upload-hero h1 { font-size: 22px; }
          .upload-form { padding: 20px; }
          .form-row { grid-template-columns: 1fr; }
          .drop-zone { padding: 30px 16px; }
          .skeleton-row { flex-direction: column; }
        }




  /* Force the page to scroll properly */
  .mass-reading-upload {
    min-height: calc(100vh - 80px); /* Adjust based on your header height */
    padding-top: 0px;
    padding-bottom: 50px;
    margin-top: 0;
    position: relative;
    z-index: 1;
    display: block;
  }

  /* Ensure the form container is visible */
  .upload-form-container {
    position: relative;
    z-index: 2;
    clear: both;
  }
      `}</style>
    </div>
  );
}