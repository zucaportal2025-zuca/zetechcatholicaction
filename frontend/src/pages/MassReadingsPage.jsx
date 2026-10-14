import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { 
  ArrowLeft, Home, Calendar, FileText, Image, File, 
  Download, Eye, ChevronRight, Users, Upload, 
  Clock, User, BookOpen, Plus, X, Search,
  Filter, Grid, List, ChevronLeft, ChevronDown,
  Loader2, Share2, Check,  MessageCircle, Facebook, Twitter, Send, Mail, Linkedin, Link2
} from 'lucide-react';
import { formatDistance, format } from 'date-fns';

export default function MassReadingsPage() {
  const navigate = useNavigate();
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReading, setSelectedReading] = useState(null);
  const [showFullImage, setShowFullImage] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    pages: 0,
    limit: 10
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchReadings();
  }, [pagination.page]);

  const fetchReadings = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/mass-readings?page=${pagination.page}&limit=${pagination.limit}`);
      setReadings(res.data.readings);
      setPagination({
        page: res.data.pagination.page,
        total: res.data.pagination.total,
        pages: res.data.pagination.pages,
        limit: res.data.pagination.limit
      });
    } catch (error) {
      console.error('Error fetching readings:', error);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => navigate(-1);
  const goHome = () => navigate('/dashboard');
  const goUpload = () => navigate('/mass-readings/upload');

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getFileIcon = (fileType) => {
    switch(fileType) {
      case 'pdf': return <FileText size={20} className="file-icon-pdf" />;
      case 'image': return <Image size={20} className="file-icon-img" />;
      case 'word': return <FileText size={20} className="file-icon-word" />;
      case 'powerpoint': return <FileText size={20} className="file-icon-ppt" />;
      case 'video': return <FileText size={20} className="file-icon-video" />;
      default: return <File size={20} className="file-icon-default" />;
    }
  };

  // Skeleton Card Loader
  const SkeletonCard = () => (
    <div className="skeleton-card">
      <div className="skeleton-card-header">
        <div className="skeleton skeleton-date"></div>
        <div className="skeleton-content">
          <div className="skeleton skeleton-text" style={{ width: '80%', height: '20px' }}></div>
          <div className="skeleton skeleton-text" style={{ width: '60%', height: '14px' }}></div>
        </div>
      </div>
      <div className="skeleton-card-body">
        <div className="skeleton skeleton-text" style={{ width: '40%', height: '12px' }}></div>
        <div className="skeleton skeleton-text" style={{ width: '70%', height: '12px' }}></div>
        <div className="skeleton skeleton-text" style={{ width: '50%', height: '12px' }}></div>
      </div>
      <div className="skeleton-card-footer">
        <div className="skeleton skeleton-text" style={{ width: '30%', height: '14px' }}></div>
      </div>
    </div>
  );

  // Skeleton List Loader
  const SkeletonListItem = () => (
    <div className="skeleton-list-item">
      <div className="skeleton-list-left">
        <div className="skeleton skeleton-date-small"></div>
        <div className="skeleton-list-content">
          <div className="skeleton skeleton-text" style={{ width: '70%', height: '16px' }}></div>
          <div className="skeleton skeleton-text" style={{ width: '50%', height: '12px' }}></div>
          <div className="skeleton skeleton-text" style={{ width: '40%', height: '10px' }}></div>
        </div>
      </div>
      <div className="skeleton skeleton-icon"></div>
    </div>
  );

  // Grid Skeleton Loader
  const GridSkeleton = () => (
    <div className="readings-grid">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );

  // List Skeleton Loader
  const ListSkeleton = () => (
    <div className="readings-list">
      {[1, 2, 3, 4, 5].map((i) => (
        <SkeletonListItem key={i} />
      ))}
    </div>
  );



  // Share Button Component - Professional version with actual icons
  const ShareButton = ({ readingId, title }) => {
    const [copied, setCopied] = useState(false);
    const [showShareOptions, setShowShareOptions] = useState(false);

    const message = `Check the readings for "${title}" at ZUCA PORTAL`;
    const link = `${window.location.origin}/mass-readings/${readingId}`;
    const fullMessage = `${message}\n${link}`;

    // Close share options when clicking outside
    useEffect(() => {
      const handleClickOutside = (e) => {
        if (showShareOptions && !e.target.closest('.share-popup')) {
          setShowShareOptions(false);
        }
      };
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }, [showShareOptions]);

    const handleShareClick = (e) => {
      e.stopPropagation();
      
      // If Web Share API is available (mobile), use it
      if (navigator.share) {
        navigator.share({
          title: title || 'Mass Reading',
          text: message,
          url: link,
        }).catch(err => {
          if (err.name !== 'AbortError') {
            console.error('Share error:', err);
          }
        });
        return;
      }

      // On desktop, show the popup
      setShowShareOptions(!showShareOptions);
    };

    const copyToClipboard = async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(fullMessage);
        setCopied(true);
        setShowShareOptions(false);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        // Fallback
        const textArea = document.createElement('textarea');
        textArea.value = fullMessage;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setShowShareOptions(false);
        setTimeout(() => setCopied(false), 2000);
      }
    };

    const shareToApp = (app, e) => {
      e.stopPropagation();
      const encodedMessage = encodeURIComponent(fullMessage);
      const encodedLink = encodeURIComponent(link);
      const encodedTitle = encodeURIComponent(title);
      let url = '';

      switch(app) {
        case 'whatsapp':
          url = `https://api.whatsapp.com/send?text=${encodedMessage}`;
          break;
        case 'facebook':
          url = `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}&quote=${encodedMessage}`;
          break;
        case 'twitter':
          url = `https://twitter.com/intent/tweet?text=${encodedMessage}`;
          break;
        case 'telegram':
          url = `https://t.me/share/url?url=${encodedLink}&text=${encodedMessage}`;
          break;
        case 'email':
          url = `mailto:?subject=Mass Reading: ${encodedTitle}&body=${encodedMessage}`;
          break;
        case 'linkedin':
          url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedLink}`;
          break;
        case 'copy':
          copyToClipboard(e);
          return;
        default:
          return;
      }

      window.open(url, '_blank', 'width=600,height=400');
      setShowShareOptions(false);
    };

    // Share apps configuration - Professional icons
    const shareApps = [
      { 
        id: 'whatsapp', 
        name: 'WhatsApp', 
        icon: MessageCircle, 
        color: '#25D366' 
      },
      { 
        id: 'facebook', 
        name: 'Facebook', 
        icon: Facebook, 
        color: '#1877F2' 
      },
      { 
        id: 'twitter', 
        name: 'Twitter', 
        icon: Twitter, 
        color: '#000000' 
      },
      { 
        id: 'telegram', 
        name: 'Telegram', 
        icon: Send, 
        color: '#0088cc' 
      },
      { 
        id: 'email', 
        name: 'Email', 
        icon: Mail, 
        color: '#ea4335' 
      },
      { 
        id: 'linkedin', 
        name: 'LinkedIn', 
        icon: Linkedin, 
        color: '#0A66C2' 
      },
      { 
        id: 'copy', 
        name: 'Copy Link', 
        icon: Link2, 
        color: '#6B7280' 
      },
    ];

    return (
      <div className="share-wrapper">
        <button 
          className="share-btn"
          onClick={handleShareClick}
          title="Share this reading"
        >
          {copied ? (
            <>
              <Check size={16} />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Share2 size={16} />
              <span>Share</span>
            </>
          )}
        </button>

        {/* Share Popup */}
        {showShareOptions && (
          <div className="share-popup" onClick={(e) => e.stopPropagation()}>
            <div className="share-popup-header">
              <span>Share via</span>
              <button 
                className="share-close-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowShareOptions(false);
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="share-apps-grid">
              {shareApps.map((app) => {
                const IconComponent = app.icon;
                return (
                  <button
                    key={app.id}
                    className="share-app-btn"
                    onClick={(e) => shareToApp(app.id, e)}
                  >
                    <span className="app-icon-wrapper" style={{ color: app.color }}>
                      <IconComponent size={22} strokeWidth={1.5} />
                    </span>
                    <span className="app-name">{app.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  

  const ReadingCard = ({ reading }) => {
    return (
      <div 
        className="reading-card"
        onClick={() => navigate(`/mass-readings/${reading.id}`)}
      >
        <div className="reading-card-header">
          <div className="reading-date-badge">
            <span className="date-day">{new Date(reading.date).getDate()}</span>
            <span className="date-month">{format(new Date(reading.date), 'MMM')}</span>
          </div>
          <div className="reading-title-section">
            <h3 className="reading-title">{reading.title}</h3>
            <p className="reading-description">
              {reading.description || 'Mass Readings'}
            </p>
          </div>

            <ShareButton readingId={reading.id} title={reading.title} />

        </div>
        
        <div className="reading-card-body">
          <div className="reading-meta">
            <span className="meta-item">
              <User size={14} />
              {reading.user?.fullName || 'Unknown'}
            </span>
            <span className="meta-item">
              <Clock size={14} />
              {formatDistance(new Date(reading.createdAt), new Date(), { addSuffix: true })}
            </span>
          </div>
          
          <div className="reading-attachments">
            {reading.attachments && reading.attachments.length > 0 && (
              <div className="attachment-preview">
                {reading.attachments.slice(0, 3).map((att, idx) => (
                  <div key={idx} className="attachment-tag">
                    {getFileIcon(att.fileType)}
                    <span>{att.fileName}</span>
                  </div>
                ))}
                {reading.attachments.length > 3 && (
                  <span className="attachment-more">+{reading.attachments.length - 3} more</span>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="reading-card-footer">
          <button className="view-details-btn">
            <Eye size={16} />
            View Details
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  const ReadingListItem = ({ reading }) => {
    return (
      <div 
        className="reading-list-item"
        onClick={() => navigate(`/mass-readings/${reading.id}`)}
      >
        <div className="list-item-left">
          <div className="list-date">
            <span className="list-date-day">{new Date(reading.date).getDate()}</span>
            <span className="list-date-month">{format(new Date(reading.date), 'MMM yyyy')}</span>
          </div>
          <div className="list-content">
            <h4>{reading.title}</h4>
            <p>{reading.description || 'Mass Readings'}</p>
            <div className="list-meta">
              <span><User size={12} /> {reading.user?.fullName || 'Unknown'}</span>
              <span><Clock size={12} /> {formatDistance(new Date(reading.createdAt), new Date(), { addSuffix: true })}</span>
              <span><FileText size={12} /> {reading.attachments?.length || 0} files</span>
            </div>
          </div>
        </div>
       <div className="list-item-right">
  <ShareButton readingId={reading.id} title={reading.title} />
  <ChevronRight size={20} />
</div>
      </div>
    );
  };

  return (
    <div className="mass-readings-page">
      {/* Premium Hero Section */}
      <div className="premium-hero">
        <div className="hero-particles">
          {[...Array(10)].map((_, i) => <div key={i} className="particle"></div>)}
        </div>
        <div className="hero-glow"></div>
        
        <div className="nav-bar">
          <button className="nav-btn back" onClick={goBack}>
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
          <button className="nav-btn home" onClick={goHome}>
            <Home size={18} />
            <span>Dashboard</span>
          </button>
          <button className="nav-btn upload" onClick={goUpload}>
            <Plus size={18} />
            <span>Upload</span>
          </button>
        </div>

        <div className="hero-content">
          <div className="hero-badge">
            <BookOpen size={20} />
            <span>MASS READINGS</span>
          </div>
          <h1>Daily Mass Readings</h1>
          <p>view coming masses readings for preparation</p>
          <div className="hero-stats">
            <div className="stat"><FileText size={16} /><span>{pagination.total} Readings</span></div>
            <div className="stat"><Calendar size={16} /><span>Latest: {readings.length > 0 ? formatDate(readings[0].date) : 'N/A'}</span></div>
            <div className="stat"><Users size={16} /><span>For the ZUCA Community</span></div>
          </div>
        </div>
        <div className="hero-wave">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25" fill="white"></path>
            <path d="M0,0V15.81C13,21.25,27.93,25.67,44.24,28.45c69.76,11.6,136.47,7.22,206.42-5.49C369.5,5.71,470.33,39.18,569,66.43c96.58,26.92,193.44,35.91,289.91,25.58C948.56,80.58,1046.7,45.79,1143,57.21c51.76,5.86,101.78,21.14,148,42.25V0Z" fill="white"></path>
          </svg>
        </div>
      </div>

      {/* Controls Section */}
      <div className="controls-section">
        <div className="controls-left">
          <div className="view-toggle">
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid size={18} />
            </button>
            <button 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <List size={18} />
            </button>
          </div>
          <div className="search-box">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Search readings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="controls-right">
          <span className="readings-count">{pagination.total} readings</span>
        </div>
      </div>

      {/* Readings Grid/List with Skeleton Loading */}
      <div className="readings-container">
        {loading ? (
          viewMode === 'grid' ? <GridSkeleton /> : <ListSkeleton />
        ) : readings.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={64} strokeWidth={1} />
            <h3>No Mass Readings Available</h3>
            <p>Check back later for daily mass readings</p>
            <button className="upload-btn-empty" onClick={goUpload}>
              <Upload size={18} />
              Upload First Reading
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="readings-grid">
            {readings.map(reading => (
              <ReadingCard key={reading.id} reading={reading} />
            ))}
          </div>
        ) : (
          <div className="readings-list">
            {readings.map(reading => (
              <ReadingListItem key={reading.id} reading={reading} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && pagination.pages > 1 && (
        <div className="pagination">
          <button 
            className="page-btn"
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page === 1}
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <span className="page-info">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button 
            className="page-btn"
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page === pagination.pages}
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }

        .mass-readings-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .premium-hero {
          position: relative;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          padding: 20px 24px 80px;
          overflow: hidden;
        }

        .hero-particles { position: absolute; inset: 0; overflow: hidden; }
        .particle { position: absolute; background: rgba(255,255,255,0.08); border-radius: 50%; animation: float 15s infinite ease-in-out; }
        .particle:nth-child(1) { width: 80px; height: 80px; top: 10%; left: 5%; animation-delay: 0s; }
        .particle:nth-child(2) { width: 120px; height: 120px; top: 60%; right: 8%; animation-delay: 2s; }
        .particle:nth-child(3) { width: 60px; height: 60px; top: 30%; left: 20%; animation-delay: 4s; }
        .particle:nth-child(4) { width: 100px; height: 100px; bottom: 20%; left: 15%; animation-delay: 1s; }
        .particle:nth-child(5) { width: 90px; height: 90px; top: 70%; right: 25%; animation-delay: 3s; }

        @keyframes float { 
          0%,100% { transform: translateY(0) rotate(0deg); opacity: 0.3; } 
          50% { transform: translateY(-40px) rotate(180deg); opacity: 0.6; } 
        }

        .hero-glow { 
          position: absolute; top: 50%; left: 50%; 
          width: 400px; height: 400px; 
          background: radial-gradient(circle, rgba(59,130,246,0.15), transparent); 
          transform: translate(-50%, -50%); 
          filter: blur(60px); 
          animation: pulse 4s infinite; 
        }

        @keyframes pulse { 
          0%,100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); } 
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); } 
        }

        .nav-bar { 
          display: flex; 
          gap: 12px; 
          margin-bottom: 30px; 
          position: relative; 
          z-index: 10; 
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
        .nav-btn.upload { background: rgba(59,130,246,0.2); border-color: rgba(59,130,246,0.3); }
        .nav-btn.upload:hover { background: #3b82f6; transform: translateX(0); }

        .hero-content { position: relative; z-index: 10; text-align: center; max-width: 800px; margin: 0 auto; }
        .hero-badge { 
          display: inline-flex; 
          align-items: center; 
          gap: 10px; 
          padding: 6px 20px; 
          background: rgba(59,130,246,0.15); 
          backdrop-filter: blur(10px); 
          border-radius: 40px; 
          color: #93c5fd; 
          font-size: 11px; 
          margin-bottom: 20px; 
        }

        .hero-content h1 { font-size: 36px; font-weight: 700; color: white; margin-bottom: 12px; }
        .hero-content p { font-size: 15px; color: #94a3b8; margin-bottom: 24px; }
        .hero-stats { display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; }
        .hero-stats .stat { 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          color: #cbd5e1; 
          font-size: 12px; 
          background: rgba(255,255,255,0.05); 
          padding: 6px 16px; 
          border-radius: 40px; 
        }

        .hero-wave { position: absolute; bottom: 0; left: 0; right: 0; height: 50px; }
        .hero-wave svg { width: 100%; height: 100%; fill: #f0f4f8; }

        /* Controls */
        .controls-section {
          max-width: 1400px;
          margin: -20px auto 30px;
          padding: 0 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          position: relative;
          z-index: 3;
        }

        .controls-left {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .view-toggle {
          display: flex;
          gap: 4px;
          background: white;
          border-radius: 12px;
          padding: 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        .view-btn {
          padding: 8px 12px;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .view-btn.active {
          background: #1e293b;
          color: white;
        }

        .view-btn:hover:not(.active) { background: #f1f5f9; }

        .search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          padding: 8px 14px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          border: 1px solid #e2e8f0;
        }

        .search-box input {
          border: none;
          outline: none;
          font-size: 13px;
          background: transparent;
          min-width: 180px;
        }

        .search-box input::placeholder { color: #94a3b8; }

        .controls-right .readings-count {
          font-size: 13px;
          color: #64748b;
          background: white;
          padding: 8px 16px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        /* Readings Container */
        .readings-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 24px 40px;
        }

        .readings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 24px;
        }

        /* Skeleton Styles */
        .skeleton {
          background: #e2e8f0;
          border-radius: 8px;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.3; }
        }

        .skeleton-card {
          background: white;
          border-radius: 20px;
          padding: 20px;
          border: 1px solid #eef2f6;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }

        .skeleton-card-header {
          display: flex;
          gap: 16px;
          margin-bottom: 14px;
        }

        .skeleton-date {
          width: 50px;
          height: 60px;
          border-radius: 12px;
          flex-shrink: 0;
        }

        .skeleton-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .skeleton-card-body {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }

        .skeleton-card-footer {
          padding-top: 14px;
          border-top: 1px solid #f1f5f9;
        }

        .skeleton-text {
          height: 12px;
          border-radius: 4px;
        }

        .skeleton-list-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: white;
          padding: 16px 20px;
          border-radius: 16px;
          border: 1px solid #eef2f6;
        }

        .skeleton-list-left {
          display: flex;
          gap: 16px;
          flex: 1;
        }

        .skeleton-date-small {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          flex-shrink: 0;
        }

        .skeleton-list-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .skeleton-icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
        }

        /* Reading Card */
        .reading-card {
          background: white;
          border-radius: 20px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 1px solid #eef2f6;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          display: flex;
          flex-direction: column;
        }

        .reading-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.1);
          border-color: #3b82f6;
        }

        .reading-card-header {
          display: flex;
          gap: 16px;
          margin-bottom: 14px;
        }

        .reading-date-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: linear-gradient(135deg, #1e293b, #334155);
          border-radius: 12px;
          padding: 8px 12px;
          min-width: 50px;
          color: white;
        }

        .date-day {
          font-size: 22px;
          font-weight: 700;
          line-height: 1;
        }

        .date-month {
          font-size: 10px;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .reading-title-section {
          flex: 1;
        }

        .reading-title {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 4px 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .reading-description {
          font-size: 13px;
          color: #64748b;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .reading-card-body {
          flex: 1;
        }

        .reading-meta {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: #94a3b8;
          margin-bottom: 12px;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .attachment-preview {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .attachment-tag {
          display: flex;
          align-items: center;
          gap: 4px;
          background: #f8fafc;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          color: #475569;
          border: 1px solid #e2e8f0;
        }

        .file-icon-pdf { color: #ef4444; }
        .file-icon-img { color: #22c55e; }
        .file-icon-word { color: #3b82f6; }
        .file-icon-ppt { color: #f59e0b; }
        .file-icon-video { color: #8b5cf6; }
        .file-icon-default { color: #94a3b8; }

        .attachment-more {
          font-size: 11px;
          color: #94a3b8;
          display: flex;
          align-items: center;
        }

        .reading-card-footer {
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid #f1f5f9;
        }

        .view-details-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: none;
          color: #3b82f6;
          font-weight: 500;
          font-size: 13px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .view-details-btn:hover {
          background: #eff6ff;
          gap: 10px;
        }

        /* List View */
        .readings-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .reading-list-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: white;
          padding: 16px 20px;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 1px solid #eef2f6;
        }

        .reading-list-item:hover {
          transform: translateX(4px);
          border-color: #3b82f6;
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
        }

        .list-item-left {
          display: flex;
          gap: 16px;
          flex: 1;
        }

        .list-date {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 60px;
        }

        .list-date-day {
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
          line-height: 1;
        }

        .list-date-month {
          font-size: 10px;
          color: #94a3b8;
          text-transform: uppercase;
        }

        .list-content h4 {
          font-size: 15px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 2px 0;
        }

        .list-content p {
          font-size: 13px;
          color: #64748b;
          margin: 0 0 6px 0;
        }

        .list-meta {
          display: flex;
          gap: 16px;
          font-size: 11px;
          color: #94a3b8;
        }

        .list-meta span {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .list-item-right {
          color: #94a3b8;
        }

        .empty-state {
          text-align: center;
          padding: 80px 20px;
          background: white;
          border-radius: 24px;
          border: 2px dashed #e2e8f0;
        }

        .empty-state h3 {
          font-size: 20px;
          color: #1e293b;
          margin: 16px 0 8px;
        }

        .empty-state p {
          color: #94a3b8;
          margin-bottom: 20px;
        }

        .upload-btn-empty {
          display: inline-flex;
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

        .upload-btn-empty:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(30, 41, 59, 0.3);
        }

        /* Pagination */
        .pagination {
          max-width: 1400px;
          margin: 0 auto 40px;
          padding: 0 24px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
        }

        .page-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 13px;
          color: #475569;
        }

        .page-btn:hover:not(:disabled) {
          background: #1e293b;
          color: white;
          border-color: #1e293b;
        }

        .page-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .page-info {
          font-size: 13px;
          color: #64748b;
        }

        @media (max-width: 768px) {
          .premium-hero { padding: 16px 16px 60px; }
          .hero-content h1 { font-size: 26px; }
          .hero-content p { font-size: 13px; }
          .hero-stats .stat { font-size: 10px; padding: 4px 12px; }
          .nav-btn { padding: 6px 14px; font-size: 12px; }
          
          .controls-section { padding: 0 16px; }
          .controls-left { width: 100%; }
          .search-box { flex: 1; }
          .search-box input { min-width: 100px; }
          
          .readings-container { padding: 0 16px 30px; }
          .readings-grid { grid-template-columns: 1fr; }
          
          .reading-list-item { flex-direction: column; align-items: stretch; }
          .list-item-left { flex-wrap: wrap; }
          .list-item-right { text-align: right; }
          
          .pagination { flex-wrap: wrap; }
        }




        /* Add this to your style tag - this ensures the page starts below the header */
.mass-readings-page {
  min-height: calc(100vh - 70px); /* Adjust based on your header height */
  padding-top: 0px;
  margin-top: 0;
  display: block;
  position: relative;
  z-index: 1;
}

/* Make sure the hero section is properly contained */
.premium-hero {
  margin-top: 0;
  /* Keep the rest of your hero styles */
}

                /* Share Button Styles - Professional */
        .share-wrapper {
          position: relative;
          flex-shrink: 0;
        }

        .share-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: rgba(59, 130, 246, 0.08);
          border: 1px solid rgba(59, 130, 246, 0.15);
          border-radius: 20px;
          color: #3b82f6;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .share-btn:hover {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .share-btn:active {
          transform: scale(0.95);
        }

        /* Share Popup */
        .share-popup {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          background: white;
          border-radius: 16px;
          padding: 20px;
          min-width: 240px;
          box-shadow: 0 12px 48px rgba(0, 0, 0, 0.12);
          border: 1px solid #f0f0f0;
          z-index: 1000;
          animation: slideDown 0.2s ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .share-popup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 10px;
          border-bottom: 1px solid #f3f4f6;
        }

        .share-popup-header span {
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          letter-spacing: 0.3px;
        }

        .share-close-btn {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
        }

        .share-close-btn:hover {
          background: #f1f5f9;
          color: #475569;
        }

        .share-apps-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .share-app-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 12px 8px;
          background: transparent;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 11px;
          color: #475569;
        }

        .share-app-btn:hover {
          background: #f8fafc;
          transform: translateY(-2px);
        }

        .share-app-btn:active {
          transform: scale(0.92);
        }

        .share-app-btn .app-icon-wrapper {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: #f8fafc;
          transition: all 0.2s ease;
        }

        .share-app-btn:hover .app-icon-wrapper {
          background: #f1f5f9;
          transform: scale(1.05);
        }

        .share-app-btn .app-name {
          font-size: 10px;
          font-weight: 500;
          color: #64748b;
          letter-spacing: 0.2px;
        }

        /* Responsive - Mobile */
        @media (max-width: 640px) {
          .share-popup {
            position: fixed;
            top: auto;
            bottom: 0;
            left: 0;
            right: 0;
            border-radius: 20px 20px 0 0;
            padding: 24px 20px 32px;
            animation: slideUp 0.3s ease;
            max-width: 100%;
            box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.12);
          }

          @keyframes slideUp {
            from {
              transform: translateY(100%);
            }
            to {
              transform: translateY(0);
            }
          }

          .share-apps-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
          }

          .share-app-btn {
            padding: 8px 4px;
          }

          .share-app-btn .app-icon-wrapper {
            width: 48px;
            height: 48px;
          }

          .share-app-btn .app-icon-wrapper svg {
            width: 24px;
            height: 24px;
          }
        }

        @media (min-width: 641px) {
          .share-popup {
            right: 0;
            left: auto;
          }
        }

        /* Ensure containers don't clip the popup */
        .reading-card {
          position: relative;
          overflow: visible;
        }

        .reading-list-item {
          position: relative;
          overflow: visible;
        }

        @media (max-width: 480px) {
          .share-btn {
            padding: 4px 10px;
            font-size: 10px;
          }
          .share-btn span {
            display: none;
          }
        }



        

        @media (max-width: 480px) {
          .reading-date-badge { min-width: 40px; padding: 4px 8px; }
          .date-day { font-size: 18px; }
          .reading-title { font-size: 14px; }
        }
      `}</style>
    </div>
  );
}