// frontend/src/pages/gallery.jsx - COMPLETE FIXED VERSION
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { 
  FiPlay, FiPause, FiMaximize2, FiMinimize2, FiVolume2, FiVolumeX,
  FiHeart, FiMessageCircle, FiShare2, FiDownload, FiEye, FiClock,
  FiUser, FiTag, FiCalendar, FiTrendingUp, FiStar, FiX, FiSearch,
  FiGrid, FiList, FiChevronLeft, FiChevronRight, FiImage, FiVideo,
  FiMusic, FiTrash2, FiSend, FiThumbsUp, FiRepeat, FiSkipBack, FiSkipForward,
  FiRefreshCw, FiFilter, FiChevronDown, FiPlayCircle,
  FiCopy, FiCheck, FiLoader
} from "react-icons/fi";
import { FaWhatsapp, FaFacebook, FaTwitter, FaHeart } from "react-icons/fa";
import axios from "axios";
import BASE_URL from "../api";

function Gallery() {
  const navigate = useNavigate();
  const { id: paramId } = useParams();
  
  // State
  const [media, setMedia] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [featuredMedia, setFeaturedMedia] = useState([]);
  
const [imageLoading, setImageLoading] = useState({});
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [isImageFullscreen, setIsImageFullscreen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({ category: "all", type: "all", sortBy: "latest", featured: false });
  const [viewMode, setViewMode] = useState("grid");
  const [showShareModal, setShowShareModal] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [userLiked, setUserLiked] = useState(false);
  const [liveFeed, setLiveFeed] = useState([]);
  const [showLiveFeed, setShowLiveFeed] = useState(false);
  const [categories, setCategories] = useState([]);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playerLoading, setPlayerLoading] = useState(true);
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const playerContainerRef = useRef(null);
  
  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const isAuthenticated = !!token;
  const currentYear = new Date().getFullYear();

  // Format helpers
  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Fetch public media
  const fetchMedia = async () => {
  try {
    setLoading(true);
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      category: filters.category !== "all" ? filters.category : undefined,
      type: filters.type !== "all" ? filters.type : undefined,
      sortBy: filters.sortBy,
      featured: filters.featured
    };
    
    const response = await axios.get(`${BASE_URL}/api/media/public`, { params });
    
    const mediaData = response.data.media || [];
    setMedia(mediaData);
    
    // Set loading state for all images
    const loadingState = {};
    mediaData.forEach(item => {
      if (item.type === 'image') {
        loadingState[item.id] = true;
      }
    });
    setImageLoading(loadingState);
    
    setPagination(prev => ({
      ...prev,
      total: response.data.pagination?.total || 0,
      totalPages: response.data.pagination?.totalPages || 0
    }));
    
    const uniqueCategories = [...new Set(mediaData.map(m => m.category).filter(Boolean))];
    setCategories(uniqueCategories);
    
  } catch (err) {
    console.error("Error fetching media:", err);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

  const fetchFeaturedMedia = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/media/featured`, { params: { limit: 6 } });
      setFeaturedMedia(response.data || []);
    } catch (err) {
      console.error("Error fetching featured media:", err);
    }
  };

  const fetchMediaById = async (id) => {
    try {
      const response = await axios.get(`${BASE_URL}/api/media/${id}`, { headers });
      setSelectedMedia(response.data);
      setPlayerLoading(false);
      fetchComments(id);
      if (isAuthenticated) checkUserLiked(id);
    } catch (err) {
      console.error("Error fetching media:", err);
    }
  };

  const fetchComments = async (mediaId) => {
    try {
      const response = await axios.get(`${BASE_URL}/api/media/${mediaId}/comments`);
      setComments(response.data.comments || []);
    } catch (err) {
      console.error("Error fetching comments:", err);
      setComments([]);
    }
  };

  const checkUserLiked = async (mediaId) => {
    if (!isAuthenticated) return;
    try {
      const response = await axios.get(`${BASE_URL}/api/media/${mediaId}/liked`, { headers });
      setUserLiked(response.data.liked);
    } catch (err) {
      console.error("Error checking like status:", err);
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    
    try {
      const response = await axios.post(`${BASE_URL}/api/media/${selectedMedia.id}/like`, {}, { headers });
      setUserLiked(response.data.liked);
      
      setSelectedMedia(prev => ({
        ...prev,
        _count: { ...prev._count, likes: (prev._count?.likes || 0) + (response.data.liked ? 1 : -1) }
      }));
      
    } catch (err) {
      console.error("Error liking media:", err);
    }
  };

  const toggleImageFullscreen = () => {
  setIsImageFullscreen(!isImageFullscreen);
};

 const handleAddComment = async () => {
  if (!isAuthenticated) {
    navigate("/login");
    return;
  }
  if (!newComment.trim()) return;
  
  setCommentLoading(true);
  
  //  timeout
  const timeoutId = setTimeout(() => {
    if (commentLoading) {
      setCommentLoading(false);
      alert("Request timed out. Please try again.");
    }
  }, 10000);
  
  try {
    const response = await axios.post(`${BASE_URL}/api/media/${selectedMedia.id}/comments`, 
      { content: newComment }, 
      { 
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.status === 201) {
      setNewComment("");
      await fetchComments(selectedMedia.id);
      
      setSelectedMedia(prev => ({
        ...prev,
        _count: { ...prev._count, comments: (prev._count?.comments || 0) + 1 }
      }));
    }
  } catch (err) {
    console.error("Error adding comment:", err.response?.data || err.message);
    alert(err.response?.data?.error || "Failed to post comment");
  } finally {
    clearTimeout(timeoutId);
    setCommentLoading(false);
  }
};

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await axios.delete(`${BASE_URL}/api/media/comments/${commentId}`, { headers });
      await fetchComments(selectedMedia.id);
      
      setSelectedMedia(prev => ({
        ...prev,
        _count: { ...prev._count, comments: Math.max(0, (prev._count?.comments || 0) - 1) }
      }));
      
    } catch (err) {
      console.error("Error deleting comment:", err);
    }
  };

  const handleDownload = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    
    try {
      await axios.post(`${BASE_URL}/api/media/${selectedMedia.id}/download`, {}, { headers });
      window.open(selectedMedia.url, '_blank');
    } catch (err) {
      console.error("Error tracking download:", err);
    }
  };

  const handleShare = async (platform) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    
    try {
      await axios.post(`${BASE_URL}/api/media/${selectedMedia.id}/share`, { platform }, { headers });
    } catch (err) {
      console.error("Error tracking share:", err);
    }
    
    const url = `${window.location.origin}/gallery/${selectedMedia.id}`;
    const text = `Check out "${selectedMedia.title}" - Amazing content from ZUCA! 🙏`;
    
    switch(platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
        break;
      default:
        navigator.clipboard.writeText(url);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const fetchLiveFeed = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/media/live-feed`, { params: { limit: 15 } });
      setLiveFeed(response.data || []);
    } catch (err) {
      console.error("Error fetching live feed:", err);
    }
  };

  // Player controls
  const togglePlay = () => {
    if (selectedMedia?.type === 'video' && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } else if (selectedMedia?.type === 'audio' && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (selectedMedia?.type === 'video' && videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    } else if (selectedMedia?.type === 'audio' && audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (selectedMedia?.type === 'video' && videoRef.current) {
      setDuration(videoRef.current.duration);
      setPlayerLoading(false);
    } else if (selectedMedia?.type === 'audio' && audioRef.current) {
      setDuration(audioRef.current.duration);
      setPlayerLoading(false);
    }
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    if (selectedMedia?.type === 'video' && videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    } else if (selectedMedia?.type === 'audio' && audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const toggleMute = () => {
    if (selectedMedia?.type === 'video' && videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
      setVolume(isMuted ? 1 : 0);
    } else if (selectedMedia?.type === 'audio' && audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
      setVolume(isMuted ? 1 : 0);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (selectedMedia?.type === 'video' && videoRef.current) {
      videoRef.current.volume = newVolume;
    } else if (selectedMedia?.type === 'audio' && audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const toggleLoop = () => {
    setIsLooping(!isLooping);
    if (selectedMedia?.type === 'video' && videoRef.current) {
      videoRef.current.loop = !isLooping;
    } else if (selectedMedia?.type === 'audio' && audioRef.current) {
      audioRef.current.loop = !isLooping;
    }
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!isFullscreen) {
      playerContainerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const playNext = () => {
    if (currentIndex + 1 < media.length) {
      const nextMedia = media[currentIndex + 1];
      setSelectedMedia(nextMedia);
      setCurrentIndex(currentIndex + 1);
      setIsPlaying(false);
      setCurrentTime(0);
      setPlayerLoading(true);
      fetchComments(nextMedia.id);
      if (isAuthenticated) checkUserLiked(nextMedia.id);
      window.history.pushState({}, '', `/gallery/${nextMedia.id}`);
    }
  };

  const playPrevious = () => {
    if (currentIndex - 1 >= 0) {
      const prevMedia = media[currentIndex - 1];
      setSelectedMedia(prevMedia);
      setCurrentIndex(currentIndex - 1);
      setIsPlaying(false);
      setCurrentTime(0);
      setPlayerLoading(true);
      fetchComments(prevMedia.id);
      if (isAuthenticated) checkUserLiked(prevMedia.id);
      window.history.pushState({}, '', `/gallery/${prevMedia.id}`);
    }
  };

  const selectMedia = (mediaItem, index) => {
    setSelectedMedia(mediaItem);
    setCurrentIndex(index);
    setPlayerLoading(true);
    setIsPlaying(false);
    setCurrentTime(0);
    fetchComments(mediaItem.id);
    if (isAuthenticated) checkUserLiked(mediaItem.id);
    window.history.pushState({}, '', `/gallery/${mediaItem.id}`);
  };

  const changePage = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const changeFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const refreshData = () => {
    setRefreshing(true);
    fetchMedia();
    fetchFeaturedMedia();
    fetchLiveFeed();
  };

  useEffect(() => {
    fetchMedia();
    fetchFeaturedMedia();
    fetchLiveFeed();
  }, []);

  useEffect(() => {
    fetchMedia();
  }, [pagination.page, filters.category, filters.type, filters.sortBy, filters.featured]);

  useEffect(() => {
    if (paramId) {
      fetchMediaById(paramId);
    }
  }, [paramId]);

  useEffect(() => {
    if (showLiveFeed) {
      const interval = setInterval(fetchLiveFeed, 30000);
      return () => clearInterval(interval);
    }
  }, [showLiveFeed]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

 if (loading && media.length === 0) {
  return (
    <div className="gallery-page">
      <div className="gallery-content">
        {/* Hero Skeleton */}
        <div className="gallery-hero-skeleton">
          <div className="hero-skeleton-content">
            <div className="skeleton-title-large shimmer"></div>
            <div className="skeleton-text shimmer"></div>
            <div className="skeleton-stats">
              <div className="skeleton-stat shimmer"></div>
              <div className="skeleton-stat shimmer"></div>
              <div className="skeleton-stat shimmer"></div>
            </div>
          </div>
        </div>

        {/* Featured Section Skeleton */}
        <div className="featured-section">
          <div className="section-header">
            <div className="skeleton-heading shimmer"></div>
            <div className="skeleton-badge shimmer"></div>
          </div>
          <div className="featured-grid">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton-featured-card">
                <div className="skeleton-featured-thumb shimmer"></div>
                <div className="skeleton-featured-info">
                  <div className="skeleton-featured-title shimmer"></div>
                  <div className="skeleton-featured-stats shimmer"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Gallery Skeleton */}
        <div className="main-gallery">
          <div className="gallery-header">
            <div className="header-left">
              <div className="skeleton-heading shimmer"></div>
              <div className="skeleton-text-small shimmer"></div>
            </div>
            <div className="header-actions">
              <div className="skeleton-btn shimmer"></div>
              <div className="skeleton-btn shimmer"></div>
              <div className="skeleton-btn shimmer"></div>
            </div>
          </div>

          <div className="media-grid">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="skeleton-media-card">
                <div className="skeleton-media-thumb shimmer"></div>
                <div className="skeleton-media-info">
                  <div className="skeleton-media-title shimmer"></div>
                  <div className="skeleton-media-stats shimmer"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        /* Skeleton Loading Styles */
        .shimmer {
          background: linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 50%, #e2e8f0 100%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .gallery-hero-skeleton {
          background: linear-gradient(135deg, #0f172a, #1e293b);
          padding: 80px 40px 120px;
          text-align: center;
        }

        .hero-skeleton-content {
          max-width: 600px;
          margin: 0 auto;
        }

        .skeleton-title-large {
          width: 300px;
          height: 48px;
          margin: 0 auto 16px;
          border-radius: 12px;
        }

        .skeleton-text {
          width: 400px;
          height: 24px;
          margin: 0 auto 32px;
          border-radius: 8px;
        }

        .skeleton-stats {
          display: flex;
          justify-content: center;
          gap: 32px;
        }

        .skeleton-stat {
          width: 100px;
          height: 20px;
          border-radius: 8px;
        }

        .skeleton-heading {
          width: 200px;
          height: 32px;
          border-radius: 8px;
        }

        .skeleton-badge {
          width: 80px;
          height: 30px;
          border-radius: 20px;
        }

        .skeleton-btn {
          width: 80px;
          height: 38px;
          border-radius: 10px;
        }

        .skeleton-text-small {
          width: 150px;
          height: 16px;
          border-radius: 6px;
          margin-top: 8px;
        }

        .skeleton-featured-card {
          border-radius: 16px;
          overflow: hidden;
          background: white;
        }

        .skeleton-featured-thumb {
          aspect-ratio: 16/9;
          width: 100%;
        }

        .skeleton-featured-info {
          padding: 16px;
        }

        .skeleton-featured-title {
          width: 80%;
          height: 20px;
          border-radius: 6px;
          margin-bottom: 8px;
        }

        .skeleton-featured-stats {
          width: 60%;
          height: 16px;
          border-radius: 6px;
        }

        .skeleton-media-card {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
        }

        .skeleton-media-thumb {
          aspect-ratio: 16/9;
          width: 100%;
        }

        .skeleton-media-info {
          padding: 12px;
        }

        .skeleton-media-title {
          width: 85%;
          height: 18px;
          border-radius: 6px;
          margin-bottom: 8px;
        }

        .skeleton-media-stats {
          width: 50%;
          height: 14px;
          border-radius: 6px;
        }

        @media (max-width: 768px) {
          .gallery-hero-skeleton { padding: 60px 20px 80px; }
          .skeleton-title-large { width: 220px; height: 36px; }
          .skeleton-text { width: 280px; height: 18px; }
          .skeleton-stat { width: 70px; height: 16px; }
        }
      `}</style>
    </div>
  );
}

  return (
    <div className="gallery-page">
      <div className="gallery-content">
        {/* Hero Section */}
        <div className="gallery-hero">
           <button className="back-button" onClick={() => navigate(-1)}>
    <FiChevronLeft size={24} /> Back
  </button>
          <div className="hero-overlay"></div>
          <div className="hero-content">
            <h1>Our Gallery</h1>
            <p>zuca's memories over time , events, production,</p>
            <div className="hero-stats">
              <span><FiImage /> {formatNumber(pagination.total)} Media Items</span>
              <span><FiEye />photos ,videos and mp3 songs</span>
              
            </div>
          </div>
          <div className="hero-wave">
            <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
              <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="white"></path>
            </svg>
          </div>
        </div>

        {/* Featured Section */}
        {featuredMedia.length > 0 && (
          <div className="featured-section">
            <div className="section-header">
              <h2><FiStar /> Featured Media</h2>
              <span className="section-badge">⭐ Staff Picks</span>
            </div>
            <div className="featured-grid">
              {featuredMedia.slice(0, 6).map((item, index) => (
                <div key={item.id} className="featured-card" onClick={() => selectMedia(item, media.findIndex(m => m.id === item.id))}>
                  <div className="featured-thumbnail">
                   {item.type === 'image' ? (
  <div className="image-loader-container">
    <div className="image-spinner-zuca">
  <img 
    src="/src/assets/zuca-logo.png" 
    alt="Loading ZUCA..." 
    className="zuca-logo-image"
  />
</div>
    <img 
      src={item.thumbnailUrl || item.url} 
      alt={item.title} 
      loading="lazy"
      onLoad={(e) => {
        e.target.style.opacity = '1';
        e.target.previousSibling.style.display = 'none';
      }}
      style={{ opacity: 0 }}
    />
  </div>
) : item.type === 'video' ? (
  <video src={item.url} muted />
) : (
  <div className="media-placeholder"><FiMusic size={32} /></div>
)}
                    <div className="featured-overlay">
                      <FiPlayCircle size={48} />
                      <span>Play Now</span>
                    </div>
                  </div>
                  <div className="featured-info">
                    <h3>{item.title}</h3>
                    <div className="featured-stats">
                      <span><FiEye /> {formatNumber(item._count?.views)}</span>
                      <span><FiHeart /> {formatNumber(item._count?.likes)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Gallery Section */}
        <div className="main-gallery">
          <div className="gallery-header">
            <div className="header-left">
              <h2>Media Gallery</h2>
              <p>Browse all {pagination.total} media items</p>
            </div>
            <div className="header-actions">
              <button className="refresh-btn" onClick={refreshData} disabled={refreshing}>
                <FiRefreshCw className={refreshing ? 'spinning' : ''} />
              </button>
              <button className="live-feed-btn" onClick={() => setShowLiveFeed(!showLiveFeed)}>
                <FiTrendingUp /> Live Feed
              </button>
              <button className="filter-toggle" onClick={() => setShowFilters(!showFilters)}>
                <FiFilter /> Filters <FiChevronDown className={showFilters ? 'rotated' : ''} />
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <div className="filters-panel">
                <div className="filters-grid">
                  <div className="filter-group">
                    <label><FiImage /> Media Type</label>
                    <div className="filter-buttons">
                      <button className={filters.type === 'all' ? 'active' : ''} onClick={() => changeFilter('type', 'all')}>All</button>
                      <button className={filters.type === 'image' ? 'active' : ''} onClick={() => changeFilter('type', 'image')}>Photos</button>
                      <button className={filters.type === 'video' ? 'active' : ''} onClick={() => changeFilter('type', 'video')}>Videos</button>
                      <button className={filters.type === 'audio' ? 'active' : ''} onClick={() => changeFilter('type', 'audio')}>Audio</button>
                    </div>
                  </div>
                  <div className="filter-group">
                    <label><FiTag /> Category</label>
                    <div className="filter-buttons">
                      <button className={filters.category === 'all' ? 'active' : ''} onClick={() => changeFilter('category', 'all')}>All</button>
                      {categories.map(cat => (
                        <button key={cat} className={filters.category === cat ? 'active' : ''} onClick={() => changeFilter('category', cat)}>
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="filter-group">
                    <label><FiTrendingUp /> Sort By</label>
                    <div className="filter-buttons">
                      <button className={filters.sortBy === 'latest' ? 'active' : ''} onClick={() => changeFilter('sortBy', 'latest')}>Latest</button>
                      <button className={filters.sortBy === 'popular' ? 'active' : ''} onClick={() => changeFilter('sortBy', 'popular')}>Most Liked</button>
                      <button className={filters.sortBy === 'mostViewed' ? 'active' : ''} onClick={() => changeFilter('sortBy', 'mostViewed')}>Most Viewed</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </AnimatePresence>

          {/* View Toggle */}
          <div className="view-controls">
            <div className="view-toggle">
              <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}><FiGrid /></button>
              <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}><FiList /></button>
            </div>
            <div className="view-info">Showing {media.length} of {pagination.total} items</div>
          </div>

          {/* Media Grid */}
          <div className={`media-container ${viewMode}`}>
            {media.length === 0 ? (
              <div className="empty-state">
                <FiImage size={64} />
                <h3>No media found</h3>
                <button onClick={() => setFilters({ category: "all", type: "all", sortBy: "latest", featured: false })}>Clear Filters</button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="media-grid">
  {media.map((item, index) => (
    <div 
      key={item.id} 
      className={`media-card ${selectedMedia?.id === item.id ? 'active' : ''}`} 
      onClick={() => selectMedia(item, index)}
    >
<div className="media-thumbnail">
  {item.type === 'image' ? (
    <div className="image-loader-container">
      <div className="image-spinner-zuca">
  <img 
    src="/src/assets/zuca-logo.png" 
    alt="Loading ZUCA..." 
    className="zuca-logo-image"
  />
</div>
      <img 
        src={item.thumbnailUrl || item.url} 
        alt={item.title} 
        loading="lazy"
        onLoad={(e) => {
          e.target.style.opacity = '1';
          e.target.previousSibling.style.display = 'none';
        }}
        style={{ opacity: 0 }}
      />
    </div>
  ) : item.type === 'video' ? (
    <video src={item.url} muted />
  ) : (
    <div className="media-placeholder"><FiMusic size={32} /></div>
  )}
  
  {item.type === 'video' && <div className="video-badge"><FiPlay /></div>}
  {item.type === 'audio' && <div className="audio-badge"><FiMusic /></div>}
  {item.isFeatured && <div className="featured-badge"><FiStar /></div>}
  <div className="media-hover-overlay">
    <FiPlayCircle size={32} />
    <span>Click to Play</span>
  </div>
</div>
      <div className="media-info">
        <h4 className="media-title">{item.title}</h4>
        <div className="media-stats">
          <span><FiEye /> {formatNumber(item._count?.views)}</span>
          <span><FiHeart /> {formatNumber(item._count?.likes)}</span>
          <span><FiMessageCircle /> {formatNumber(item._count?.comments)}</span>
        </div>
      </div>
    </div>
  ))}
</div>
            ) : (
              <div className="media-list">
                <table className="media-table">
                  <thead><tr><th>Type</th><th>Title</th><th>Views</th><th>Likes</th><th>Date</th><th>Actions</th></tr></thead>
                  <tbody>
                    {media.map((item, idx) => (
                      <tr key={item.id} onClick={() => selectMedia(item, idx)}>
                        <td>{item.type === 'image' ? <FiImage /> : item.type === 'video' ? <FiVideo /> : <FiMusic />}</td>
                        <td>{item.title}</td>
                        <td>{formatNumber(item._count?.views)}</td>
                        <td>{formatNumber(item._count?.likes)}</td>
                        <td>{formatRelativeTime(item.createdAt)}</td>
                        <td><button onClick={(e) => { e.stopPropagation(); selectMedia(item, idx); }}><FiPlay /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button onClick={() => changePage(pagination.page - 1)} disabled={pagination.page === 1}><FiChevronLeft /> Previous</button>
              <span>Page {pagination.page} of {pagination.totalPages}</span>
              <button onClick={() => changePage(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}>Next <FiChevronRight /></button>
            </div>
          )}
        </div>

        {/* Live Feed Sidebar */}
        <AnimatePresence>
          {showLiveFeed && (
            <div className="live-feed-sidebar">
              <div className="live-feed-header"><h3><FiTrendingUp /> Live Activity</h3><button onClick={() => setShowLiveFeed(false)}><FiX /></button></div>
              <div className="live-feed-content">
                {liveFeed.map((activity) => (
                  <div key={activity.id} className="feed-item">
                    <div className="feed-icon">{activity.icon}</div>
                    <div className="feed-details">
                      <div className="feed-user"><strong>{activity.userName}</strong><span>{activity.timeAgo}</span></div>
                      <div className="feed-action">{activity.action} "{activity.mediaTitle?.substring(0, 40)}"</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* Media Player Modal - FULL SCREEN */}
        <AnimatePresence>
          {selectedMedia && (
            <div className="player-modal-overlay" onClick={() => setSelectedMedia(null)}>
              <div className="player-modal" onClick={e => e.stopPropagation()}>
                <div className="player-modal-header">
                  <h3>{selectedMedia.title}</h3>
                  <button onClick={() => setSelectedMedia(null)}><FiX /></button>
                </div>
                
                <div className="player-modal-body">
                  <div className="player-wrapper" ref={playerContainerRef}>
                    
                  
{selectedMedia.type === 'image' && (
  <>
    <div 
      className={`image-fullscreen-overlay ${isImageFullscreen ? 'active' : ''}`}
      onClick={toggleImageFullscreen}
    />
    <div className="image-player-container">
      <img 
        src={selectedMedia.url} 
        alt={selectedMedia.title} 
        className={`player-image ${isImageFullscreen ? 'fullscreen-image' : ''}`}
        onClick={isImageFullscreen ? toggleImageFullscreen : undefined}
      />
      <button 
        onClick={toggleImageFullscreen} 
        className="fullscreen-toggle-btn"
        title={isImageFullscreen ? "Exit Fullscreen" : "Fullscreen"}
      >
        {isImageFullscreen ? <FiMinimize2 size={20} /> : <FiMaximize2 size={20} />}
      </button>
    </div>
  </>
)}             
                    {selectedMedia.type === 'video' && (
                      <>
                        <video ref={videoRef} src={selectedMedia.url} className="player-video" onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={() => setIsPlaying(false)} />
                        <div className="player-controls">
                          <button onClick={playPrevious} className="control-btn" disabled={currentIndex <= 0}><FiSkipBack size={20} /></button>
                          <button onClick={togglePlay} className="control-btn play-btn">{isPlaying ? <FiPause size={24} /> : <FiPlay size={24} />}</button>
                          <button onClick={playNext} className="control-btn" disabled={currentIndex >= media.length - 1}><FiSkipForward size={20} /></button>
                          <div className="progress-container">
                            <span className="time-current">{formatTime(currentTime)}</span>
                            <input type="range" min="0" max={duration || 100} value={currentTime} onChange={handleSeek} className="progress-slider" />
                            <span className="time-duration">{formatTime(duration)}</span>
                          </div>
                          <button onClick={toggleLoop} className={`control-btn ${isLooping ? 'active' : ''}`}><FiRepeat size={18} /></button>
                          <div className="volume-control">
                            <button onClick={toggleMute} className="control-btn">{isMuted ? <FiVolumeX size={18} /> : <FiVolume2 size={18} />}</button>
                            <input type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolumeChange} className="volume-slider" />
                          </div>
                          <button onClick={toggleFullscreen} className="control-btn">{isFullscreen ? <FiMinimize2 size={18} /> : <FiMaximize2 size={18} />}</button>
                        </div>
                      </>
                    )}
                    
                    {selectedMedia.type === 'audio' && (
                      <div className="audio-player-modal">
                        <div className="audio-artwork"><FiMusic size={80} /></div>
                        <audio ref={audioRef} src={selectedMedia.url} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={() => setIsPlaying(false)} />
                        <div className="audio-controls-modal">
                          <button onClick={playPrevious} className="control-btn" disabled={currentIndex <= 0}><FiSkipBack size={24} /></button>
                          <button onClick={togglePlay} className="control-btn play-btn">{isPlaying ? <FiPause size={32} /> : <FiPlay size={32} />}</button>
                          <button onClick={playNext} className="control-btn" disabled={currentIndex >= media.length - 1}><FiSkipForward size={24} /></button>
                          <div className="progress-container">
                            <span className="time-current">{formatTime(currentTime)}</span>
                            <input type="range" min="0" max={duration || 100} value={currentTime} onChange={handleSeek} className="progress-slider" />
                            <span className="time-duration">{formatTime(duration)}</span>
                          </div>
                          <button onClick={toggleLoop} className={`control-btn ${isLooping ? 'active' : ''}`}><FiRepeat size={20} /></button>
                          <div className="volume-control">
                            <button onClick={toggleMute} className="control-btn">{isMuted ? <FiVolumeX size={20} /> : <FiVolume2 size={20} />}</button>
                            <input type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolumeChange} className="volume-slider" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="player-info-section">
                    <div className="player-stats-grid">
                      <div className="stat-item"><FiEye /><span>{formatNumber(selectedMedia._count?.views)}</span><small>Views</small></div>
                      <div className="stat-item clickable" onClick={handleLike}>{userLiked ? <FaHeart color="#ef4444" /> : <FiHeart />}<span>{formatNumber(selectedMedia._count?.likes)}</span><small>{userLiked ? 'Liked' : 'Like'}</small></div>
                      <div className="stat-item"><FiMessageCircle /><span>{formatNumber(selectedMedia._count?.comments)}</span><small>Comments</small></div>
                      <div className="stat-item clickable" onClick={handleDownload}><FiDownload /><span>{formatNumber(selectedMedia._count?.downloads)}</span><small>Download</small></div>
                      <div className="stat-item clickable" onClick={() => setShowShareModal(true)}><FiShare2 /><span>{formatNumber(selectedMedia._count?.shares)}</span><small>Share</small></div>
                    </div>

                    <div className="player-description"><h4>Description</h4><p>{selectedMedia.description || "No description available."}</p></div>

                    <div className="player-details">
                      <div className="detail-row"><FiUser /> <strong>Uploaded by:</strong> {selectedMedia.uploadedBy?.fullName || 'Admin'}</div>
                      <div className="detail-row"><FiCalendar /> <strong>Uploaded:</strong> {formatRelativeTime(selectedMedia.createdAt)}</div>
                      {selectedMedia.category && <div className="detail-row"><FiTag /> <strong>Category:</strong> {selectedMedia.category}</div>}
                    </div>

                    <div className="comments-section">
                      <h4><FiMessageCircle /> Comments ({selectedMedia._count?.comments || 0})</h4>
                      <div className="comments-list">
                        {comments.length === 0 ? <div className="no-comments">No comments yet. Be the first!</div> : comments.map(comment => (
                          <div key={comment.id} className="comment-item">
                            <div className="comment-avatar">{comment.user?.fullName?.charAt(0) || 'U'}</div>
                            <div className="comment-content">
                              <div className="comment-header"><strong>{comment.user?.fullName || 'Anonymous'}</strong><span>{formatRelativeTime(comment.createdAt)}</span></div>
                              <p>{comment.content}</p>
                            </div>
                            {(comment.userId === localStorage.getItem("userId") || selectedMedia.uploadedBy?.id === localStorage.getItem("userId")) && (
                              <button className="delete-comment" onClick={() => handleDeleteComment(comment.id)}><FiTrash2 /></button>
                            )}
                          </div>
                        ))}
                      </div>
                      {isAuthenticated ? (
                        <div className="comment-input">
                          <input type="text" placeholder="Write a comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddComment()} />
                          <button onClick={handleAddComment} disabled={commentLoading}>{commentLoading ? <FiLoader className="spinning" /> : <FiSend />} Send</button>
                        </div>
                      ) : (
                        <div className="login-to-comment"><button onClick={() => navigate("/login")}>Login to Comment</button></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* Share Modal */}
        <AnimatePresence>
          {showShareModal && selectedMedia && (
            <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
              <div className="share-modal" onClick={e => e.stopPropagation()}>
                <div className="share-modal-header"><h3><FiShare2 /> Share</h3><button onClick={() => setShowShareModal(false)}><FiX /></button></div>
                <div className="share-modal-body">
                  <div className="share-buttons">
                    <button className="share-whatsapp" onClick={() => handleShare('whatsapp')}><FaWhatsapp size={24} /> WhatsApp</button>
                    <button className="share-facebook" onClick={() => handleShare('facebook')}><FaFacebook size={24} /> Facebook</button>
                    <button className="share-twitter" onClick={() => handleShare('twitter')}><FaTwitter size={24} /> Twitter</button>
                    <button className="share-copy" onClick={() => handleShare('copy')}>{copySuccess ? <FiCheck size={24} /> : <FiCopy size={24} />}{copySuccess ? 'Copied!' : 'Copy Link'}</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="gallery-footer"><p>© {currentYear} ZUCA Portal | Gallery | Sharing God's Love Through Media 🙏</p></div>
      </div>

      <style>{`
        .gallery-page { min-height: 100vh; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); }
        .gallery-hero { position: relative; background: linear-gradient(135deg, #0f172a, #1e293b); padding: 20px 4px 70px; text-align: center; overflow: hidden; }
        .hero-content { position: relative; z-index: 2; }
        .gallery-hero h1 { font-size: 48px; font-weight: 700; color: white; margin-bottom: 16px; background: linear-gradient(135deg, #fff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .gallery-hero p { font-size: 15px; color: #cbd5e1; margin-bottom: 32px; }
        .hero-stats { display: flex; justify-content: center; gap: 32px; }
        .hero-stats span { display: flex; align-items: center; gap: 4px; color: #94a3b8; font-size: 14px; }
        .hero-wave { position: absolute; bottom: 0;top: 3; left: 0; right: 0; line-height: 0; }
        .hero-wave svg { width: 100%; height: 50px; fill: white; }
        
        .featured-section { max-width: 1400px; margin: -40px auto 48px; padding: 0 24px; }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .section-header h2 { font-size: 24px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
        .section-badge { background: linear-gradient(135deg, #f59e0b, #ef4444); padding: 6px 12px; border-radius: 20px; color: white; font-size: 12px; }
        .featured-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
        .featured-card { position: relative; border-radius: 16px; overflow: hidden; cursor: pointer; transition: transform 0.3s; }
        .featured-card:hover { transform: translateY(-5px); }
        .featured-thumbnail { position: relative; aspect-ratio: 16/9; overflow: hidden; background: #1e293b; }
        .featured-thumbnail img, .featured-thumbnail video { width: 100%; height: 100%; object-fit: cover; }
        .featured-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; opacity: 0; transition: opacity 0.3s; color: white; }
        .featured-card:hover .featured-overlay { opacity: 1; }
        .featured-info { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.8)); padding: 16px; color: white; }
        .featured-info h3 { font-size: 14px; margin-bottom: 8px; }
        .featured-stats { display: flex; gap: 16px; font-size: 12px; }
        
        .main-gallery { max-width: 1400px; margin: 0 auto; padding: 0 24px 48px; }
        .gallery-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
        .header-left h2 { font-size: 28px; margin-bottom: 4px; }
        .header-left p { color: #64748b; font-size: 14px; }
        .header-actions { display: flex; gap: 12px; }
        .refresh-btn, .live-feed-btn, .filter-toggle { padding: 8px 16px; background: white; border: 2px solid #1e293b; border-radius: 10px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font-size: 13px; }
        .spinning { animation: spin 1s linear infinite; }
        .rotated { transform: rotate(180deg); }
        
        .filters-panel { background: white; border-radius: 16px; padding: 20px; margin-bottom: 24px; border: 1px solid #e2e8f0; }
        .filters-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
        .filter-group label { display: block; font-size: 12px; font-weight: 500; margin-bottom: 8px; color: #64748b; }
        .filter-buttons { display: flex; flex-wrap: wrap; gap: 8px; }
        .filter-buttons button { padding: 6px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px; font-size: 12px; cursor: pointer; }
        .filter-buttons button.active { background: #3b82f6; color: white; border-color: #3b82f6; }
        
        .view-controls { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .view-toggle { display: flex; gap: 4px; background: #f1f5f9; border-radius: 10px; padding: 3px; }
        .view-toggle button { padding: 6px 10px; background: transparent; border: none; border-radius: 8px; cursor: pointer; }
        .view-toggle button.active { background: white; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        
        .media-container.grid .media-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }
        .media-card { background: white; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; transition: all 0.3s; cursor: pointer; }
        .media-card:hover { transform: translateY(-4px); box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
        .media-card.active { border-color: #3b82f6; box-shadow: 0 0 0 2px #3b82f6; }
        .media-thumbnail { position: relative; aspect-ratio: 16/9; background: #1e293b; overflow: hidden; }
        .media-thumbnail img, .media-thumbnail video { width: 100%; height: 100%; object-fit: cover; }
        .media-hover-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.6); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; opacity: 0; transition: opacity 0.3s; color: white; }
        .media-card:hover .media-hover-overlay { opacity: 1; }
        .video-badge, .audio-badge { position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.7); border-radius: 20px; padding: 4px 8px; color: white; font-size: 10px; }
        .featured-badge { position: absolute; top: 8px; right: 8px; background: #f59e0b; border-radius: 20px; padding: 4px 8px; font-size: 10px; color: white; }
        .media-info { padding: 12px; }
        .media-title { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
        .media-stats { display: flex; gap: 12px; font-size: 11px; color: #64748b; }
        .media-stats span { display: flex; align-items: center; gap: 4px; }
        
        .live-feed-sidebar { position: fixed; top: 0; right: 0; width: 380px; height: 100vh; background: white; box-shadow: -4px 0 20px rgba(0,0,0,0.1); z-index: 1000; display: flex; flex-direction: column; }
        .live-feed-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #e2e8f0; }
        .live-feed-content { flex: 1; overflow-y: auto; padding: 12px; }
        .feed-item { display: flex; gap: 12px; padding: 12px; border-radius: 12px; cursor: pointer; transition: background 0.2s; }
        .feed-item:hover { background: #f8fafc; }
        .feed-icon { font-size: 24px; }
        .feed-details { flex: 1; }
        .feed-user { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; }
        .feed-action { font-size: 13px; color: #475569; }
        
        /* Player Modal - FULL SCREEN LIGHT THEME */
.player-modal-overlay { 
  position: fixed; 
  inset: 0; 
  background: rgba(228, 42, 42, 0); 
  backdrop-filter: blur(6px);
  z-index: 2000; 
  display: flex; 
  align-items: center;  justify-content: center; 
}
.player-modal {   
  background: #ffffff00; 
  width: 100vw; 
  height: 100vh; 
  overflow-y: auto; 
}
.player-modal-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  padding: 20px 30px; 
  background: linear-gradient(135deg, #0f172a, #1e293b); 
  border-bottom: 1px solid #e2e8f0; 
  position: sticky; 
  top: 0; 
  z-index: 10; 
}
.player-modal-header h3 { 
  color: white; 
  font-size: 20px; 
  margin: 0; 
}
.player-modal-header button { 
  background: rgba(255,255,255,0.2); 
  border: none; 
  border-radius: 50%; 
  width: 40px; 
  height: 40px; 
  color: white; 
  cursor: pointer; 
}
.player-modal-body { 
  display: grid; 
  grid-template-columns: 1.5fr 1fr; 
  gap: 10px; 
  padding: 0px; 
  height: calc(100vh - 80px); 
  overflow-y: auto; 
  background: #ffffff00;
}
.player-wrapper { 
  background: #885757b6; 
  border-radius: 20px; 
  overflow: hidden; 
  position: relative; 
  height: 500px; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  border: 1px solid #e2e8f0;
}
.player-video, .player-image { 
  width: 100%; 
  
  height: 100%; 
  object-fit: contain; 
  background: #000;
}
.player-controls { 
  position: absolute; 
  margin-bottom: -20px; 
  left: 20px;
  right: 20px;
  background: linear-gradient(transparent, rgb(23, 27, 25)); 
  padding: 15px 20px; 
  display: flex; 
  flex-wrap: wrap;  /* THIS ALLOWS WRAPPING TO MULTIPLE ROWS */
  align-items: center; 
  justify-content: center;  /* Centers items when wrapped */
  gap: 12px; 
  border-radius: 20px; 
  backdrop-filter: blur(0px);
}

/* For mobile screens - adjust padding and gap */
@media (max-width: 768px) {
  .player-controls {
    padding: 12px 15px;
    gap: 8px;
    border-radius: 16px;
    bottom: 10px;
    left: 10px;
    right: 10px;
  }
  
  /* Make buttons slightly smaller on mobile */
  .player-controls .control-btn {
    width: 40px;
    height: 40px;
  }
  
  .player-controls .control-btn.play-btn {
    width: 48px;
    height: 48px;
  }
  
  /* Progress bar takes full width on new row */
  .player-controls .progress-container {
    order: 1;
    width: 100%;
    margin-top: 5px;
  }
  
  /* Volume control moves to new row */
  .player-controls .volume-control {
    order: 2;
  }
}

/* For very small phones */
@media (max-width: 480px) {
  .player-controls {
    gap: 6px;
    padding: 10px 12px;
  }
  
  .player-controls .control-btn {
    width: 36px;
    height: 36px;
  }
  
  .player-controls .control-btn.play-btn {
    width: 44px;
    height: 44px;
  }
}
.control-btn { 
  background: rgba(255,255,255,0.2); 
  border: none; 
  border-radius: 50%; 
  width: 44px; 
  height: 44px; 
  color: white; 
  cursor: pointer; 
  display: inline-flex; 
  align-items: center; 
  justify-content: center; 
  transition: all 0.2s; 
}
.control-btn:hover:not(:disabled) { 
  background: rgba(255,255,255,0.35); 
  transform: scale(1.05); 
}
.control-btn:disabled { 
  opacity: 0.4; 
  cursor: not-allowed; 
}
.control-btn.play-btn { 
  background: #3b82f6; 
  width: 52px; 
  height: 52px; 
}
.progress-container { 
  flex: 1; 
  display: flex; 
  align-items: center; 
  gap: 12px; 
}
.progress-slider { 
  flex: 1; 
  height: 5px; 
  -webkit-appearance: none; 
  background: rgba(255,255,255,0.3); 
  border-radius: 3px; 
}
.progress-slider::-webkit-slider-thumb { 
  -webkit-appearance: none; 
  width: 14px; 
  height: 14px; 
  border-radius: 50%; 
  background: #3b82f6; 
  cursor: pointer; 
  border: 2px solid white; 
}
.time-current, .time-duration { 
  color: white; 
  font-size: 13px; 
}
.volume-control { 
  display: flex; 
  align-items: center; 
  gap: 8px; 
}
.volume-slider { 
  width: 70px; 
  height: 5px; 
  -webkit-appearance: none; 
  background: rgba(255,255,255,0.3); 
  border-radius: 3px; 
}

/* Audio player - Light Theme */
.audio-player-modal { 
  background: linear-gradient(135deg, #f8fafc, #e2e8f0); 
  border-radius: 20px; 
  padding: 60px; 
  text-align: center; 
  height: 500px; 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  justify-content: center; 
  border: 1px solid #e2e8f0;
}
.audio-artwork { 
  width: 180px; 
  height: 180px; 
  margin: 0 auto 25px; 
  background: linear-gradient(135deg, #3b82f6, #8b5cf6); 
  border-radius: 100px; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  color: white; 
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
}
.audio-controls-modal { 
  display: flex; 
  align-items: center; 
  gap: 20px; 
  justify-content: center; 
  margin-top: 30px; 
}

/* Player info section - Right side LIGHT THEME */
.player-info-section { 
  background: white; 
  border-radius: 20px; 
  padding: 24px; 
  border: 1px solid #e2e8f0;
  height: 500px; 
  overflow-y: auto; 
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.player-info-section h4, .player-info-section h3 { 
  color: #1e293b !important; 
}
.player-stats-grid { 
  display: grid; 
  grid-template-columns: repeat(5, 1fr); 
  gap: 12px; 
  margin-bottom: 24px; 
  padding-bottom: 20px; 
  border-bottom: 1px solid #e2e8f0; 
}
.stat-item { 
  text-align: center; 
  cursor: pointer; 
  transition: transform 0.2s; 
  padding: 8px;
  border-radius: 12px;
  background: #f8fafc;
}
.stat-item:hover { 
  transform: scale(1.05); 
  background: #eff6ff;
}
.stat-item svg { 
  font-size: 22px; 
  margin-bottom: 6px; 
  color: #000000f1; 
}
.stat-item span { 
  display: block; 
  font-weight: 700; 
  font-size: 16px; 
  color: #1e293b !important; 
}
.stat-item small { 
  font-size: 10px; 
  color: #64748b !important; 
}
.player-description { 
  margin-bottom: 24px; 
}
.player-description h4 {
  color: #1e293b !important;
  margin-bottom: 10px;
  font-size: 15px;
  font-weight: 600;
}
.player-description p { 
  color: #475569 !important; 
  line-height: 1.6; 
  font-size: 13px; 
}
.player-details { 
  margin-bottom: 24px; 
  background: #f8fafc; 
  padding: 16px; 
  border-radius: 12px; 
}
.detail-row { 
  display: flex; 
  align-items: center; 
  gap: 10px; 
  font-size: 13px; 
  margin-bottom: 10px; 
  color: #475569 !important; 
}
.detail-row strong { 
  color: #1e293b !important; 
  font-weight: 600;
}
.detail-row svg {
  color: #3b82f6;
}


/* Image Fullscreen Styles */
.image-player-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  border-radius: 20px;
}

.player-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: all 0.3s ease;
  cursor: pointer;
}

/* Fullscreen image */
.player-image.fullscreen-image {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: auto;
  height: auto;
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  z-index: 10001;
  cursor: zoom-out;
}

/* Dark overlay background when fullscreen */
.image-fullscreen-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0);
  z-index: 10000;
  transition: background 0.3s ease;
  pointer-events: none;
}

.image-fullscreen-overlay.active {
  background: rgba(0, 0, 0, 0.95);
  pointer-events: auto;
}

/* Fullscreen toggle button */
.fullscreen-toggle-btn {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.65);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s;
}

.fullscreen-toggle-btn:hover {
  background: rgba(0, 0, 0, 0.84);
  transform: scale(1.05);
}

/* When image is fullscreen, move button to bottom right of screen */
.player-image.fullscreen-image ~ .fullscreen-toggle-btn {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 10002;
  background: rgb(0, 0, 0);
}

/* Close fullscreen when clicking outside */
.image-fullscreen-overlay.active + .image-player-container .player-image.fullscreen-image {
  cursor: zoom-out;
}

/* Comments Section - LIGHT THEME */
.comments-section { 
  margin-top: 20px; 
}
.comments-section h4 { 
  color: #1e293b !important; 
  margin-bottom: 15px; 
  font-size: 15px;
  font-weight: 600;
}
.comments-list { 
  max-height: 280px; 
  overflow-y: auto; 
}
.comment-item { 
  background: #f8fafc; 
  border-radius: 12px; 
  margin-bottom: 12px; 
  padding: 12px; 
  display: flex; 
  gap: 12px; 
  position: relative; 
  border: 1px solid #e2e8f0;
}
.comment-avatar { 
  width: 32px; 
  height: 32px; 
  border-radius: 50%; 
  background: linear-gradient(135deg, #3b82f6, #8b5cf6); 
  color: white; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  font-weight: 600; 
  font-size: 14px;
  flex-shrink: 0;
}
.comment-content { 
  flex: 1; 
}
.comment-header { 
  display: flex; 
  justify-content: space-between; 
  margin-bottom: 4px; 
  font-size: 12px; 
}
.comment-header strong { 
  color: #1e293b !important; 
}
.comment-header span { 
  color: #64748b !important; 
  font-size: 10px; 
}
.comment-content p { 
  color: #334155 !important; 
  font-size: 13px; 
  margin: 0; 
}
.delete-comment { 
  position: absolute; 
  right: 12px; 
  top: 12px; 
  background: none; 
  border: none; 
  cursor: pointer; 
  color: #94a3b8; 
  opacity: 0; 
  transition: opacity 0.2s;
}
.delete-comment:hover {
  color: #ef4444;
}
.comment-item:hover .delete-comment { 
  opacity: 1; 
}
.no-comments { 
  text-align: center; 
  padding: 30px; 
  color: #64748b !important; 
}

/* Comment Input - LIGHT THEME */
.comment-input { 
  display: flex; 
  gap: 10px; 
  padding-top: 16px; 
  border-top: 1px solid #e2e8f0; 
  margin-top: 16px; 
}
.comment-input input { 
  flex: 1; 
  padding: 10px 16px; 
  border: 1px solid #e2e8f0; 
  border-radius: 30px; 
  font-size: 13px; 
  background: white; 
  color: #1e293b; 
  outline: none; 
}
.comment-input input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59,130,246,0.1);
}
.comment-input input::placeholder { 
  color: #94a3b8; 
}
.comment-input button { 
  padding: 8px 20px; 
  background: #3b82f6; 
  border: none; 
  border-radius: 30px; 
  color: white; 
  cursor: pointer; 
  display: flex; 
  align-items: center; 
  gap: 6px; 
  font-size: 13px; 
  transition: background 0.2s;
}
.comment-input button:hover {
  background: #2563eb;
}
.login-to-comment { 
  padding-top: 16px; 
  text-align: center; 
}
.login-to-comment button { 
  padding: 8px 20px; 
  background: #3b82f6; 
  border: none; 
  border-radius: 30px; 
  color: white; 
  cursor: pointer; 
  transition: background 0.2s;
}
.login-to-comment button:hover {
  background: #2563eb;
}
        .share-modal { background: white; border-radius: 20px; width: 90%; max-width: 450px; }
        .share-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e2e8f0; }
        .share-buttons { display: grid; gap: 12px; padding: 20px; }
        .share-buttons button { padding: 12px; border: none; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 12px; cursor: pointer; font-weight: 500; }
        .share-whatsapp { background: #25D366; color: white; }
        .share-facebook { background: #1877F2; color: white; }
        .share-twitter { background: #1DA1F2; color: white; }
        .share-copy { background: #64748b; color: white; }
        
        .pagination { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 32px; }
        .pagination button { padding: 8px 16px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; }
        .gallery-footer { text-align: center; padding: 24px; border-top: 1px solid #e2e8f0; background: white; margin-top: 48px; }
        .empty-state { text-align: center; padding: 60px; background: white; border-radius: 20px; }
        
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @media (max-width: 1024px) { .featured-grid { grid-template-columns: repeat(2, 1fr); } .player-modal-body { grid-template-columns: 1fr; } .player-wrapper, .audio-player-modal { height: 400px; } .player-info-section { height: auto; } }
        @media (max-width: 768px) { .gallery-hero h1 { font-size: 32px; } .featured-grid { grid-template-columns: 1fr; } .media-container.grid .media-grid { grid-template-columns: 1fr; } .live-feed-sidebar { width: 100%; } .player-stats-grid { grid-template-columns: repeat(3, 1fr); } }

        .back-button {
  position: absolute;
  top: 30px;
  left: 30px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 10px 24px;
  border-radius: 40px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 10;
}

.back-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateX(-5px);
}

@media (max-width: 768px) {
  .back-button {
    top: 20px;
    left: 20px;
    padding: 6px 16px;
    font-size: 12px;
  }
}

.image-loading-spinner {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.media-thumbnail {
  position: relative;
  aspect-ratio: 16/9;
  background: #f1f5f9;
  overflow: hidden;
}

.media-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity 0.3s ease;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}






  /* your existing CSS... */

  /* ========== ADD THIS ZUCA LOGO SPINNER CSS HERE ========== */
  .image-loader-container {
    position: relative;
    width: 100%;
    height: 100%;
    background: #f1f5f9;
  }

  .image-spinner-zuca {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 50px;
    height: 50px;
    z-index: 1;
  }

  .zuca-cross {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 24px;
    height: 24px;
    background: linear-gradient(135deg, #ffd700, #ff0062);
    clip-path: polygon(40% 0%, 60% 0%, 60% 40%, 100% 40%, 100% 60%, 60% 60%, 60% 100%, 40% 100%, 40% 60%, 0% 60%, 0% 40%, 40% 40%);
    animation: rotateCross 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
  }

  .zuca-circle {
    position: absolute;
    inset: 0;
    border: 2px solid #3b82f6;
    border-radius: 50%;
    animation: pulseCircle 1.2s ease-in-out infinite;
  }

  .zuca-dove {
    position: absolute;
    bottom: -5px;
    right: -5px;
    width: 12px;
    height: 12px;
    background: white;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    animation: flyDove 0.8s ease-in-out infinite alternate;
  }

  .zuca-dove::before {
    content: '';
    position: absolute;
    top: -3px;
    left: 1px;
    width: 6px;
    height: 4px;
    background: white;
    border-radius: 50% 50% 0 0;
    transform: rotate(-20deg);
  }

  @keyframes rotateCross {
    0% { transform: translate(-50%, -50%) rotate(0deg); }
    100% { transform: translate(-50%, -50%) rotate(360deg); }
  }

  @keyframes pulseCircle {
    0%, 100% { transform: scale(1); opacity: 1; border-color: #3b82f6; }
    50% { transform: scale(1.15); opacity: 0.6; border-color: #ffd700; }
  }

  @keyframes flyDove {
    0% { transform: rotate(-45deg) translateY(0); opacity: 0.5; }
    100% { transform: rotate(-45deg) translateY(-5px); opacity: 1; }
  }


  .zuca-logo-image {
  width: 40px;
  height: 40px;
  object-fit: contain;
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(0.9); opacity: 0.7; }
  50% { transform: scale(1.1); opacity: 1; }
}

      `}</style>
    </div>
  );
}

export default Gallery;