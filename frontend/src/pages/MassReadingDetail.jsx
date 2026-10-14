import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { 
  ArrowLeft, Home, Calendar, FileText, Image as ImageIcon, File, 
  Download, Eye, User, Clock, BookOpen, ChevronRight,
  FileIcon, ExternalLink, ZoomIn, X, Loader2,
  Edit, Trash2, MoreVertical, AlertCircle
} from 'lucide-react';
import { formatDistance, format } from 'date-fns';
import logo from '../assets/zuca-logo.png';

// INJECT STYLES BEFORE COMPONENT RENDERS
const styles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  /* Force the page to scroll properly under the header */
.mass-reading-detail {
  min-height: calc(100vh - 70px); /* Adjust based on your header height */
  padding-top: 0px;
  margin-top: 0;
  display: block;
  position: relative;
  z-index: 1;
}

/* Ensure the header section is properly contained */
.detail-header {
  margin-top: 0;
  /* Keep the rest of your header styles */
}

  .mass-reading-detail {
    min-height: 100vh;
    background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .detail-loader-premium {
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

  .detail-loader-premium::before {
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
    width: 160px;
    height: 160px;
    margin-bottom: 30px;
    z-index: 2;
  }

  .loader-logo {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: contain;
    position: relative;
    z-index: 2;
    background: rgba(255, 255, 255, 0.05);
    padding: 12px;
    border: 3px solid rgba(0, 198, 255, 0.3);
    box-shadow: 0 0 40px rgba(0, 198, 255, 0.1);
  }

  .loader-ring {
    position: absolute;
    border-radius: 50%;
    border: 3px solid transparent;
    animation: ringSpin 2s linear infinite;
    z-index: 1;
  }

  .ring-1 {
    top: -12px;
    left: -12px;
    right: -12px;
    bottom: -12px;
    border-top-color: #00c6ff;
    border-right-color: transparent;
    animation-duration: 1.5s;
  }

  .ring-2 {
    top: -24px;
    left: -24px;
    right: -24px;
    bottom: -24px;
    border-bottom-color: #007bff;
    border-left-color: transparent;
    animation-duration: 2.5s;
    animation-direction: reverse;
  }

  .ring-3 {
    top: -36px;
    left: -36px;
    right: -36px;
    bottom: -36px;
    border-top-color: rgba(0, 198, 255, 0.5);
    border-bottom-color: rgba(0, 123, 255, 0.5);
    animation-duration: 3s;
  }

  @keyframes ringSpin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .loader-title {
    font-size: 22px;
    font-weight: 700;
    margin-bottom: 8px;
    color: white;
    letter-spacing: 1px;
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
    max-width: 300px;
    width: 100%;
    margin-bottom: 20px;
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
    transition: width 0.3s ease;
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
    font-variant-numeric: tabular-nums;
  }

  .loader-status {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 5px;
    z-index: 2;
    position: relative;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #00c6ff;
    animation: statusBlink 1s ease-in-out infinite;
  }

  @keyframes statusBlink {
    0%, 100% { opacity: 0.3; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1.3); }
  }

  .status-text {
    font-size: 12px;
    color: #94a3b8;
    letter-spacing: 1px;
    font-weight: 300;
  }

  .detail-header {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
    padding: 20px 24px 40px;
    position: relative;
    overflow: hidden;
  }

  .nav-bar {
    display: flex;
    gap: 12px;
    margin-bottom: 30px;
    position: relative;
    z-index: 10;
    flex-wrap: wrap;
    align-items: center;
  }

  .nav-actions {
    display: flex;
    gap: 8px;
    margin-left: auto;
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
  .nav-btn.edit:hover { background: #f59e0b; transform: translateX(0); }
  .nav-btn.delete:hover { background: #ef4444; transform: translateX(0); }

  .detail-title-section {
    display: flex;
    gap: 24px;
    align-items: flex-start;
    position: relative;
    z-index: 10;
  }

  .detail-date-badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: linear-gradient(135deg, #1e293b, #334155);
    border-radius: 16px;
    padding: 12px 16px;
    min-width: 70px;
    color: white;
    border: 1px solid rgba(255,255,255,0.1);
  }

  .detail-date-day {
    font-size: 32px;
    font-weight: 800;
    line-height: 1;
  }

  .detail-date-month {
    font-size: 12px;
    text-transform: uppercase;
    font-weight: 600;
    letter-spacing: 0.5px;
    opacity: 0.8;
  }

  .detail-title-content {
    flex: 1;
  }

  .detail-title-content h1 {
    font-size: 28px;
    font-weight: 700;
    color: white;
    margin: 0 0 8px 0;
  }

  .detail-description {
    font-size: 15px;
    color: #94a3b8;
    margin: 0 0 12px 0;
  }

  .detail-meta {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
    font-size: 13px;
    color: #94a3b8;
  }

  .detail-meta span {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .detail-body {
    max-width: 1000px;
    margin: -20px auto 40px;
    padding: 30px;
    background: white;
    border-radius: 24px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    position: relative;
    z-index: 3;
  }

  .attachments-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 18px;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 20px;
    padding-bottom: 14px;
    border-bottom: 2px solid #f1f5f9;
  }

  .no-attachments {
    text-align: center;
    padding: 60px 20px;
    color: #94a3b8;
  }

  .no-attachments p {
    margin-top: 12px;
    font-size: 15px;
  }

  .attachments-grid {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .attachment-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 20px;
    background: #f8fafc;
    border-radius: 16px;
    border: 1px solid #eef2f6;
    transition: all 0.3s ease;
  }

  .attachment-card:hover {
    border-color: #3b82f6;
    box-shadow: 0 4px 12px rgba(0,0,0,0.06);
  }

  .attachment-icon {
    flex-shrink: 0;
  }

  .attachment-image-preview {
    position: relative;
    width: 80px;
    height: 80px;
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
  }

  .attachment-image-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .image-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    opacity: 0;
    transition: opacity 0.3s;
    gap: 4px;
  }

  .attachment-image-preview:hover .image-overlay {
    opacity: 1;
  }

  .image-overlay span {
    font-size: 11px;
    font-weight: 500;
  }

  .file-icon-wrapper {
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f1f5f9;
    border-radius: 12px;
  }

  .file-icon-pdf { color: #ef4444; }
  .file-icon-img { color: #22c55e; }
  .file-icon-word { color: #3b82f6; }
  .file-icon-ppt { color: #f59e0b; }
  .file-icon-video { color: #8b5cf6; }
  .file-icon-default { color: #94a3b8; }

  .attachment-info {
    flex: 1;
  }

  .attachment-name {
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 4px 0;
  }

  .attachment-type {
    font-size: 12px;
    color: #64748b;
    margin: 0;
  }

  .attachment-size {
    font-size: 11px;
    color: #94a3b8;
    margin: 0;
  }

  .attachment-actions {
    display: flex;
    gap: 8px;
  }

  .attachment-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
    text-decoration: none;
    transition: all 0.2s;
    border: none;
    cursor: pointer;
  }

  .attachment-btn.view {
    background: #eff6ff;
    color: #3b82f6;
  }

  .attachment-btn.view:hover {
    background: #3b82f6;
    color: white;
  }

  .attachment-btn.download {
    background: #f1f5f9;
    color: #1e293b;
  }

  .attachment-btn.download:hover {
    background: #1e293b;
    color: white;
  }

  .image-modal {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.9);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }

  .image-modal-content {
    position: relative;
    max-width: 90vw;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .image-modal-content img {
    max-width: 100%;
    max-height: 80vh;
    border-radius: 12px;
    object-fit: contain;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  }

  .modal-close {
    position: absolute;
    top: -50px;
    right: -50px;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.2);
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s;
  }

  .modal-close:hover {
    background: rgba(255,255,255,0.3);
    transform: rotate(90deg);
  }

  .image-modal-caption {
    margin-top: 16px;
    text-align: center;
    color: white;
  }

  .image-modal-caption h4 {
    font-size: 16px;
    margin: 0;
    font-weight: 600;
  }

  .image-modal-caption p {
    font-size: 13px;
    opacity: 0.7;
    margin: 4px 0 0 0;
  }

  .delete-modal {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(8px);
    z-index: 1001;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: fadeIn 0.3s ease;
  }

  .delete-modal-content {
    background: white;
    border-radius: 24px;
    padding: 40px;
    max-width: 450px;
    width: 100%;
    text-align: center;
    animation: slideUp 0.3s ease;
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .delete-modal-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 80px;
    height: 80px;
    margin: 0 auto 20px;
    background: #fee2e2;
    border-radius: 50%;
    color: #ef4444;
  }

  .delete-modal-content h3 {
    font-size: 22px;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 12px;
  }

  .delete-modal-content p {
    font-size: 15px;
    color: #64748b;
    margin-bottom: 28px;
    line-height: 1.5;
  }

  .delete-modal-actions {
    display: flex;
    gap: 12px;
  }

  .delete-modal-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    border: none;
  }

  .delete-modal-btn.cancel {
    background: #f1f5f9;
    color: #64748b;
  }

  .delete-modal-btn.cancel:hover {
    background: #e2e8f0;
  }

  .delete-modal-btn.confirm {
    background: #ef4444;
    color: white;
  }

  .delete-modal-btn.confirm:hover {
    background: #dc2626;
  }

  .delete-modal-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .spinning {
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .detail-error {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #f0f4f8, #e2e8f0);
    padding: 40px;
    text-align: center;
  }

  .detail-error h3 {
    font-size: 24px;
    color: #1e293b;
    margin: 16px 0 8px;
  }

  .detail-error p {
    color: #94a3b8;
    margin-bottom: 20px;
  }

  .back-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 24px;
    background: linear-gradient(135deg, #1e293b, #334155);
    color: white;
    border: none;
    border-radius: 40px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s;
  }

  .back-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(30, 41, 59, 0.3);
  }

  @media (max-width: 768px) {
    .detail-header { padding: 16px; }
    .detail-title-section { flex-direction: column; }
    .detail-date-badge { flex-direction: row; gap: 12px; padding: 8px 16px; min-width: auto; }
    .detail-date-day { font-size: 24px; }
    .detail-title-content h1 { font-size: 22px; }
    .detail-body { padding: 20px; margin: -10px 16px 30px; }
    .attachment-card { flex-wrap: wrap; }
    .attachment-actions { width: 100%; justify-content: flex-start; }
    .image-modal-content { max-width: 100vw; }
    .modal-close { top: 10px; right: 10px; }
    .nav-actions { margin-left: 0; width: 100%; }
    .delete-modal-content { padding: 24px; margin: 16px; }
    .delete-modal-actions { flex-direction: column; }
  }

  @media (max-width: 480px) {
    .loader-ring-container {
      width: 120px;
      height: 120px;
    }
    .loader-logo {
      padding: 8px;
      border-width: 2px;
    }
    .ring-1 {
      top: -8px;
      left: -8px;
      right: -8px;
      bottom: -8px;
      border-width: 2px;
    }
    .ring-2 {
      top: -16px;
      left: -16px;
      right: -16px;
      bottom: -16px;
      border-width: 2px;
    }
    .ring-3 {
      top: -24px;
      left: -24px;
      right: -24px;
      bottom: -24px;
      border-width: 2px;
    }
    .loader-title {
      font-size: 18px;
    }
    .loader-sub {
      font-size: 12px;
    }

    
    .loader-progress {
      max-width: 220px;
    }
    .detail-title-content h1 { font-size: 18px; }
    .attachment-image-preview { width: 60px; height: 60px; }
    .file-icon-wrapper { width: 60px; height: 60px; }
    .attachment-btn { padding: 4px 10px; font-size: 11px; }
  }
`;

// INJECT STYLES BEFORE ANY RENDER
if (typeof document !== 'undefined') {
  const styleTag = document.createElement('style');
  styleTag.textContent = styles;
  document.head.appendChild(styleTag);
}

export default function MassReadingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFullImage, setShowFullImage] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [user, setUser] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useLayoutEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(storedUser);
    fetchReading();
  }, [id]);

  const fetchReading = async () => {
    setLoading(true);
    const minimumLoadingTime = new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      const [res] = await Promise.all([
        api.get(`/api/mass-readings/${id}`),
        minimumLoadingTime
      ]);
      setReading(res.data.reading);
    } catch (error) {
      console.error('Error fetching reading:', error);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => navigate(-1);
  const goHome = () => navigate('/dashboard');
  const goReadings = () => navigate('/mass-readings');

  // ============ DOWNLOAD FUNCTION ============
  const handleDownload = async (fileUrl, fileName) => {
    setDownloading(true);
    try {
      const response = await fetch(fileUrl);
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
      
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download file. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // ============ OPEN FILE FUNCTION ============
  const openFileInNewTab = (fileUrl, fileType) => {
    // For images - open directly in new tab
    if (fileType === 'image') {
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    
    // For videos - open directly in new tab
    if (fileType === 'video') {
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    
    // For raw files (PDF, Word, PowerPoint) - download instead
    // Cloudinary raw files don't have previews
    const att = reading?.attachments?.find(a => a.fileUrl === fileUrl);
    if (att) {
      handleDownload(fileUrl, att.fileName);
    } else {
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const getFileIcon = (fileType, size = 24) => {
    switch(fileType) {
      case 'pdf': return <FileText size={size} className="file-icon-pdf" />;
      case 'image': return <ImageIcon size={size} className="file-icon-img" />;
      case 'word': return <FileText size={size} className="file-icon-word" />;
      case 'powerpoint': return <FileText size={size} className="file-icon-ppt" />;
      case 'video': return <FileText size={size} className="file-icon-video" />;
      default: return <File size={size} className="file-icon-default" />;
    }
  };

  const getFileTypeLabel = (fileType) => {
    const types = {
      pdf: 'PDF Document',
      image: 'Image',
      word: 'Word Document',
      powerpoint: 'PowerPoint Presentation',
      video: 'Video',
      text: 'Text File'
    };
    return types[fileType] || fileType;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleEdit = () => {
    navigate(`/mass-readings/edit/${id}`);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/api/mass-readings/${id}`);
      setShowDeleteModal(false);
      navigate('/mass-readings');
    } catch (error) {
      console.error('Error deleting reading:', error);
      alert('Failed to delete reading. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const isOwner = user?.id === reading?.uploadedBy || user?.role === 'admin';

  if (loading) {
    return (
      <div className="detail-loader-premium">
        <div className="loader-ring-container">
          <img src={logo} alt="ZUCA Logo" className="loader-logo" />
          <div className="loader-ring ring-1"></div>
          <div className="loader-ring ring-2"></div>
          <div className="loader-ring ring-3"></div>
        </div>
        <h3 className="loader-title">Loading Reading</h3>
        <p className="loader-sub">Preparing the Word of God...</p>
        <div className="loader-progress">
          <div className="loader-progress-track">
            <div className="loader-progress-fill" style={{ width: '75%' }}></div>
          </div>
          <span className="loader-progress-text">75%</span>
        </div>
        <div className="loader-status">
          <span className="status-dot"></span>
          <span className="status-text">Loading content...</span>
        </div>
      </div>
    );
  }

  if (!reading) {
    return (
      <div className="detail-error">
        <BookOpen size={64} strokeWidth={1} />
        <h3>Reading Not Found</h3>
        <p>The reading you're looking for doesn't exist</p>
        <button className="back-btn" onClick={goReadings}>
          <ArrowLeft size={18} />
          Back to Readings
        </button>
      </div>
    );
  }

  return (
    <div className="mass-reading-detail">
      <div className="detail-header">
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
          
          {isOwner && (
            <div className="nav-actions">
              <button className="nav-btn edit" onClick={handleEdit}>
                <Edit size={18} />
                <span>Edit</span>
              </button>
              <button className="nav-btn delete" onClick={() => setShowDeleteModal(true)}>
                <Trash2 size={18} />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>

        <div className="detail-title-section">
          <div className="detail-date-badge">
            <span className="detail-date-day">{new Date(reading.date).getDate()}</span>
            <span className="detail-date-month">{format(new Date(reading.date), 'MMM yyyy')}</span>
          </div>
          <div className="detail-title-content">
            <h1>{reading.title}</h1>
            <p className="detail-description">{reading.description || 'Mass Readings'}</p>
            <div className="detail-meta">
              <span><User size={14} /> {reading.user?.fullName || 'Unknown'}</span>
              <span><Clock size={14} /> Uploaded {formatDistance(new Date(reading.createdAt), new Date(), { addSuffix: true })}</span>
              <span><FileText size={14} /> {reading.attachments?.length || 0} attachments</span>
            </div>
          </div>
        </div>
      </div>

      <div className="detail-body">
        <h2 className="attachments-title">
          <FileText size={20} />
          Attachments ({reading.attachments?.length || 0})
        </h2>

        {(!reading.attachments || reading.attachments.length === 0) ? (
          <div className="no-attachments">
            <File size={48} strokeWidth={1} />
            <p>No attachments for this reading</p>
          </div>
        ) : (
          <div className="attachments-grid">
            {reading.attachments.map((att, index) => (
              <div key={index} className="attachment-card">
                <div className="attachment-icon">
                  {att.fileType === 'image' ? (
                    <div 
                      className="attachment-image-preview"
                      onClick={() => openFileInNewTab(att.fileUrl, att.fileType)}
                    >
                      <img src={att.fileUrl} alt={att.fileName} />
                      <div className="image-overlay">
                        <ExternalLink size={24} />
                        <span>View</span>
                      </div>
                    </div>
                  ) : (
                    <div className="file-icon-wrapper">
                      {getFileIcon(att.fileType, 40)}
                    </div>
                  )}
                </div>
                <div className="attachment-info">
                  <h4 className="attachment-name">{att.fileName}</h4>
                  <p className="attachment-type">{getFileTypeLabel(att.fileType)}</p>
                  <p className="attachment-size">{formatFileSize(att.fileSize)}</p>
                </div>
                <div className="attachment-actions">
                  {/* View/Open button - shows View for images, Download for PDFs */}
                  <button 
                    className="attachment-btn view"
                    onClick={() => openFileInNewTab(att.fileUrl, att.fileType)}
                  >
                    <ExternalLink size={16} />
                    {att.fileType === 'image' ? 'View' : 'Download'}
                  </button>
                  
                  {/* Download button - always downloads */}
                  <button 
                    className="attachment-btn download"
                    onClick={() => handleDownload(att.fileUrl, att.fileName)}
                    disabled={downloading}
                  >
                    {downloading ? (
                      <Loader2 size={16} className="spinning" />
                    ) : (
                      <>
                        <Download size={16} />
                        Download
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showDeleteModal && (
        <div className="delete-modal" onClick={() => setShowDeleteModal(false)}>
          <div className="delete-modal-content" onClick={e => e.stopPropagation()}>
            <div className="delete-modal-icon">
              <AlertCircle size={48} />
            </div>
            <h3>Delete Reading</h3>
            <p>Are you sure you want to delete "{reading.title}"? This action cannot be undone.</p>
            <div className="delete-modal-actions">
              <button 
                className="delete-modal-btn cancel"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button 
                className="delete-modal-btn confirm"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 size={18} className="spinning" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}