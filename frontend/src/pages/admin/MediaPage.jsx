// frontend/src/pages/admin/MediaPage.jsx
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  FiUpload, FiTrash2, FiEdit2, FiEye, FiThumbsUp, FiMessageCircle, 
  FiDownload, FiShare2, FiX, FiSearch, FiFilter, FiGrid, FiList,
  FiChevronLeft, FiChevronRight, FiImage, FiVideo, FiFile,
  FiStar, FiClock, FiUser, FiTag, FiFolder, FiPlus, FiRefreshCw,
  FiMusic, FiHeart, FiSend, FiMoreVertical, FiCheckSquare, FiSquare,
  FiPlay, FiPause, FiVolume2, FiVolumeX, FiMaximize2, FiMinimize2,
  FiRepeat, FiSkipBack, FiSkipForward
} from "react-icons/fi";
import { FaYoutube, FaWhatsapp, FaFacebook, FaTwitter } from "react-icons/fa";
import axios from "axios";
import BASE_URL from "../../api";

function MediaPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [media, setMedia] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    photos: 0,
    videos: 0,
    audio: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalDownloads: 0,
    totalShares: 0
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    type: "all",
    category: "all",
    search: "",
    sort: "latest"
  });
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [viewMode, setViewMode] = useState("grid");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("uncategorized");
  const [tags, setTags] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  
  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const playerContainerRef = useRef(null);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  const currentYear = new Date().getFullYear();

  // Format number with K/M
  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Format relative time
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

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format time for player
  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Fetch media from backend
  const fetchMedia = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        type: filters.type !== "all" ? filters.type : undefined,
        category: filters.category !== "all" ? filters.category : undefined,
        search: filters.search || undefined
      };
      
      const response = await axios.get(`${BASE_URL}/api/admin/media`, { 
        headers, 
        params 
      });
      
      const mediaData = response.data.media || [];
      setMedia(mediaData);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination?.total || 0,
        totalPages: response.data.pagination?.totalPages || 0
      }));
      
      // Auto-select first media for player if none selected
      if (mediaData.length > 0 && !selectedMedia) {
        setSelectedMedia(mediaData[0]);
      }
      
      // Calculate stats from media data
      const photos = mediaData.filter(m => m.type === 'image').length || 0;
      const videos = mediaData.filter(m => m.type === 'video').length || 0;
      const audio = mediaData.filter(m => m.type === 'audio').length || 0;
      const totalViews = mediaData.reduce((sum, m) => sum + (m._count?.views || 0), 0) || 0;
      const totalLikes = mediaData.reduce((sum, m) => sum + (m._count?.likes || 0), 0) || 0;
      const totalComments = mediaData.reduce((sum, m) => sum + (m._count?.comments || 0), 0) || 0;
      const totalDownloads = mediaData.reduce((sum, m) => sum + (m._count?.downloads || 0), 0) || 0;
      const totalShares = mediaData.reduce((sum, m) => sum + (m._count?.shares || 0), 0) || 0;
      
      setStats({
        total: response.data.pagination?.total || 0,
        photos,
        videos,
        audio,
        totalViews,
        totalLikes,
        totalComments,
        totalDownloads,
        totalShares
      });
      
    } catch (err) {
      console.error("Error fetching media:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch comments for a media item
  const fetchComments = async (mediaId) => {
    try {
      const response = await axios.get(`${BASE_URL}/api/media/${mediaId}/comments`, { headers });
      setComments(response.data.comments || []);
    } catch (err) {
      console.error("Error fetching comments:", err);
      setComments([]);
    }
  };

  // Track view when media is selected
  const trackView = async (mediaId) => {
    try {
      await axios.post(`${BASE_URL}/api/media/${mediaId}/view`, {}, { headers });
      // Update local state
      setMedia(prev => prev.map(item => {
        if (item.id === mediaId) {
          return {
            ...item,
            _count: { ...item._count, views: (item._count?.views || 0) + 1 }
          };
        }
        return item;
      }));
    } catch (err) {
      console.error("Error tracking view:", err);
    }
  };

  // Handle like
  const handleLike = async (mediaId) => {
    try {
      const response = await axios.post(`${BASE_URL}/api/media/${mediaId}/like`, {}, { headers });
      const liked = response.data.liked;
      setMedia(prev => prev.map(item => {
        if (item.id === mediaId) {
          return {
            ...item,
            _count: {
              ...item._count,
              likes: (item._count?.likes || 0) + (liked ? 1 : -1)
            },
            userLiked: liked
          };
        }
        return item;
      }));
      // Also update selected media if it's the same
      if (selectedMedia?.id === mediaId) {
        setSelectedMedia(prev => ({
          ...prev,
          _count: {
            ...prev._count,
            likes: (prev._count?.likes || 0) + (liked ? 1 : -1)
          },
          userLiked: liked
        }));
      }
    } catch (err) {
      console.error("Error liking media:", err);
    }
  };

  // Track download
  const handleDownload = async (mediaId, url) => {
    try {
      await axios.post(`${BASE_URL}/api/media/${mediaId}/download`, {}, { headers });
      // Update local state
      setMedia(prev => prev.map(item => {
        if (item.id === mediaId) {
          return {
            ...item,
            _count: { ...item._count, downloads: (item._count?.downloads || 0) + 1 }
          };
        }
        return item;
      }));
      // Open download link
      window.open(url, '_blank');
    } catch (err) {
      console.error("Error tracking download:", err);
    }
  };

  // Track share
  const handleShare = async (platform, mediaId) => {
    try {
      await axios.post(`${BASE_URL}/api/media/${mediaId}/share`, { platform }, { headers });
      // Update local state
      setMedia(prev => prev.map(item => {
        if (item.id === mediaId) {
          return {
            ...item,
            _count: { ...item._count, shares: (item._count?.shares || 0) + 1 }
          };
        }
        return item;
      }));
    } catch (err) {
      console.error("Error tracking share:", err);
    }
    
    const url = `${window.location.origin}/gallery/${mediaId}`;
    const text = `Check out this amazing media from ZUCA!`;
    
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
        alert('Link copied to clipboard!');
    }
  };

  // Handle add comment
  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedMedia) return;
    try {
      const response = await axios.post(`${BASE_URL}/api/media/${selectedMedia.id}/comments`, 
        { content: newComment }, 
        { headers }
      );
      setNewComment("");
      fetchComments(selectedMedia.id);
      // Update comment count
      setMedia(prev => prev.map(item => {
        if (item.id === selectedMedia.id) {
          return {
            ...item,
            _count: { ...item._count, comments: (item._count?.comments || 0) + 1 }
          };
        }
        return item;
      }));
      if (selectedMedia.id === selectedMedia.id) {
        setSelectedMedia(prev => ({
          ...prev,
          _count: { ...prev._count, comments: (prev._count?.comments || 0) + 1 }
        }));
      }
    } catch (err) {
      console.error("Error adding comment:", err);
    }
  };

  // Handle delete comment
  const handleDeleteComment = async (commentId) => {
    try {
      await axios.delete(`${BASE_URL}/api/media/comments/${commentId}`, { headers });
      fetchComments(selectedMedia.id);
      setMedia(prev => prev.map(item => {
        if (item.id === selectedMedia.id) {
          return {
            ...item,
            _count: { ...item._count, comments: Math.max(0, (item._count?.comments || 0) - 1) }
          };
        }
        return item;
      }));
    } catch (err) {
      console.error("Error deleting comment:", err);
    }
  };

  // Handle delete media
  const handleDeleteMedia = async (id) => {
    if (!window.confirm("Delete this media permanently?")) return;
    try {
      await axios.delete(`${BASE_URL}/api/admin/media/${id}`, { headers });
      fetchMedia();
      if (selectedMedia?.id === id) {
        setSelectedMedia(null);
      }
    } catch (err) {
      console.error("Error deleting media:", err);
      alert("Failed to delete media");
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    if (!window.confirm(`Delete ${selectedItems.length} items permanently?`)) return;
    
    try {
      for (const id of selectedItems) {
        await axios.delete(`${BASE_URL}/api/admin/media/${id}`, { headers });
      }
      setSelectedItems([]);
      setBulkMode(false);
      fetchMedia();
    } catch (err) {
      console.error("Error bulk deleting:", err);
      alert("Failed to delete some items");
    }
  };

  // Handle file selection for upload
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const newQueue = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      size: file.size,
      type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'audio',
      progress: 0,
      status: 'pending'
    }));
    setUploadQueue(prev => [...prev, ...newQueue]);
  };

  // Handle single file upload
  const uploadFile = async (queueItem) => {
  const formData = new FormData();
  formData.append("files", queueItem.file);
  formData.append("description", caption);
  formData.append("category", category);
  formData.append("tags", tags);
  formData.append("isFeatured", isFeatured.toString());
  formData.append("isPublic", isPublic.toString());
  
  try {
    // Update status to uploading with 0 progress
    setUploadQueue(prev => prev.map(item => 
      item.id === queueItem.id ? { ...item, status: 'uploading', progress: 0 } : item
    ));
    
    const response = await axios.post(`${BASE_URL}/api/admin/media/upload`, formData, {
      headers: { ...headers, "Content-Type": "multipart/form-data" },
      onUploadProgress: (progressEvent) => {
        // Calculate percentage
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        console.log(`Uploading ${queueItem.name}: ${percentCompleted}%`); // This helps debug
        // Update progress for this specific file
        setUploadQueue(prev => prev.map(item => 
          item.id === queueItem.id ? { ...item, progress: percentCompleted } : item
        ));
      }
    });
    
    // Mark as completed with 100%
    setUploadQueue(prev => prev.map(item => 
      item.id === queueItem.id ? { ...item, status: 'completed', progress: 100 } : item
    ));
    
    return response.data;
  } catch (err) {
    console.error("Upload error:", err);
    setUploadQueue(prev => prev.map(item => 
      item.id === queueItem.id ? { ...item, status: 'failed', error: err.message, progress: 0 } : item
    ));
    throw err;
  }
};
  // Handle bulk upload
  const handleBulkUpload = async () => {
  if (uploadQueue.length === 0) return;
  
  setUploading(true);
  let completed = 0;
  const pendingItems = uploadQueue.filter(item => item.status === 'pending');
  const total = pendingItems.length;
  
  for (const item of pendingItems) {
    if (item.status === 'pending') {
      await uploadFile(item);
      completed++;
      // Update overall progress
      const overallProgress = (completed / total) * 100;
      setUploadProgress(overallProgress);
    }
  }
  
  setUploading(false);
  
  // Clear completed items after showing success
  setTimeout(() => {
    const allCompleted = uploadQueue.every(item => item.status === 'completed');
    if (allCompleted) {
      setUploadQueue([]);
      setCaption("");
      setTags("");
      setCategory("uncategorized");
      setIsFeatured(false);
      setIsPublic(true);
      fetchMedia();
      setShowUploadModal(false);
    }
    setUploadProgress(0);
  }, 1500);
};

  // Remove from queue
  const removeFromQueue = (id) => {
    setUploadQueue(prev => prev.filter(item => item.id !== id));
  };

  // Handle edit media
  const handleEditMedia = async (mediaData) => {
    try {
      await axios.put(`${BASE_URL}/api/admin/media/${selectedMedia.id}`, mediaData, { headers });
      setShowEditModal(false);
      fetchMedia();
    } catch (err) {
      console.error("Error updating media:", err);
      alert("Failed to update media");
    }
  };

  // Handle select media for player
  const handleSelectMedia = (media) => {
    setSelectedMedia(media);
    trackView(media.id);
    // Reset player state
    setIsPlaying(false);
    setCurrentTime(0);
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
    } else if (selectedMedia?.type === 'audio' && audioRef.current) {
      setDuration(audioRef.current.duration);
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

  // Toggle select item for bulk actions
  const toggleSelectItem = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Select all visible items
  const selectAll = () => {
    if (selectedItems.length === media.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(media.map(m => m.id));
    }
  };

  // Refresh data
  const refreshData = () => {
    setRefreshing(true);
    fetchMedia();
  };

  // Change page
  const changePage = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // Change filter
  const changeFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  useEffect(() => {
    fetchMedia();
  }, [pagination.page, filters.type, filters.category, filters.search]);

  // Reset player when selected media changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [selectedMedia]);

  if (loading && media.length === 0) {
    return (
      <div className="media-loader">
        <div className="loader-spinner">
          <div className="ring"></div>
          <div className="ring"></div>
          <div className="ring"></div>
          <FiImage size={40} className="loader-icon" />
        </div>
        <h3>Loading Gallery</h3>
        <p>Fetching media from server...</p>
        <style>{`
          .media-loader {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #0f172a, #1e293b);
            color: white;
          }
          .loader-spinner { position: relative; width: 80px; height: 80px; margin-bottom: 24px; }
          .ring { position: absolute; inset: 0; border-radius: 50%; border: 2px solid transparent; animation: spin 1s linear infinite; }
          .ring:nth-child(1) { border-top-color: #3b82f6; border-right-color: #3b82f6; }
          .ring:nth-child(2) { border-bottom-color: #8b5cf6; border-left-color: #8b5cf6; animation-delay: -0.5s; width: 60%; height: 60%; top: 20%; left: 20%; }
          .ring:nth-child(3) { border-top-color: #10b981; border-right-color: #10b981; width: 30%; height: 30%; top: 35%; left: 35%; animation-duration: 0.6s; }
          @keyframes spin { 100% { transform: rotate(360deg); } }
          .loader-icon { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); animation: glow 2s ease-in-out infinite; }
          @keyframes glow { 0%,100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); } 50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="media-page">
      <div className="media-content">
        {/* Header */}
        <div className="media-header">
          <div className="header-left">
            <h1><FiImage /> Gallery Management</h1>
            <p>Manage photos, videos, and audio for ZUCA</p>
          </div>
          <div className="header-right">
            <button className="refresh-btn" onClick={refreshData} disabled={refreshing}>
              <FiRefreshCw className={refreshing ? 'spinning' : ''} />
            </button>
            <button className="upload-btn" onClick={() => setShowUploadModal(true)}>
              <FiUpload /> Upload Media
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-icon total"><FiImage /></div><div className="stat-info"><span className="stat-value">{stats.total}</span><span className="stat-label">TOTAL ITEMS</span></div></div>
          <div className="stat-card"><div className="stat-icon photos"><FiImage /></div><div className="stat-info"><span className="stat-value">{stats.photos}</span><span className="stat-label">PHOTOS</span></div></div>
          <div className="stat-card"><div className="stat-icon videos"><FiVideo /></div><div className="stat-info"><span className="stat-value">{stats.videos}</span><span className="stat-label">VIDEOS</span></div></div>
          <div className="stat-card"><div className="stat-icon audio"><FiMusic /></div><div className="stat-info"><span className="stat-value">{stats.audio}</span><span className="stat-label">AUDIO</span></div></div>
          <div className="stat-card"><div className="stat-icon views"><FiEye /></div><div className="stat-info"><span className="stat-value">{formatNumber(stats.totalViews)}</span><span className="stat-label">TOTAL VIEWS</span></div></div>
          <div className="stat-card"><div className="stat-icon likes"><FiThumbsUp /></div><div className="stat-info"><span className="stat-value">{formatNumber(stats.totalLikes)}</span><span className="stat-label">TOTAL LIKES</span></div></div>
          <div className="stat-card"><div className="stat-icon comments"><FiMessageCircle /></div><div className="stat-info"><span className="stat-value">{formatNumber(stats.totalComments)}</span><span className="stat-label">COMMENTS</span></div></div>
          <div className="stat-card"><div className="stat-icon downloads"><FiDownload /></div><div className="stat-info"><span className="stat-value">{formatNumber(stats.totalDownloads)}</span><span className="stat-label">DOWNLOADS</span></div></div>
        </div>

        {/* Main Two-Column Layout - Player + Details */}
        <div className="two-columns">
          {/* Media Player Section */}
          <div className="player-section">
            <div className="section-header">
              <h3><FiPlay /> Media Player</h3>
              {selectedMedia && <span className="now-playing">Now Playing</span>}
            </div>
            
            {selectedMedia ? (
              <div className="player-container" ref={playerContainerRef}>
                <div className="player-wrapper">
                  {selectedMedia.type === 'image' && (
                    <img src={selectedMedia.url} alt={selectedMedia.title} className="media-image" />
                  )}
                  {selectedMedia.type === 'video' && (
                    <>
                      <video
                        ref={videoRef}
                        src={selectedMedia.url}
                        className="media-video"
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onEnded={() => setIsPlaying(false)}
                      />
                      <div className="player-controls">
                        <button onClick={togglePlay} className="control-btn">
                          {isPlaying ? <FiPause /> : <FiPlay />}
                        </button>
                        <div className="progress-container">
                          <span className="time-current">{formatTime(currentTime)}</span>
                          <input
                            type="range"
                            min="0"
                            max={duration}
                            value={currentTime}
                            onChange={handleSeek}
                            className="progress-slider"
                          />
                          <span className="time-duration">{formatTime(duration)}</span>
                        </div>
                        <button onClick={toggleLoop} className={`control-btn ${isLooping ? 'active' : ''}`}>
                          <FiRepeat />
                        </button>
                        <div className="volume-control">
                          <button onClick={toggleMute} className="control-btn">
                            {isMuted ? <FiVolumeX /> : <FiVolume2 />}
                          </button>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={volume}
                            onChange={handleVolumeChange}
                            className="volume-slider"
                          />
                        </div>
                        <button onClick={toggleFullscreen} className="control-btn">
                          <FiMaximize2 />
                        </button>
                      </div>
                    </>
                  )}
                  {selectedMedia.type === 'audio' && (
                    <div className="audio-player">
                      <div className="audio-artwork">
                        <FiMusic size={64} />
                      </div>
                      <audio
                        ref={audioRef}
                        src={selectedMedia.url}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onEnded={() => setIsPlaying(false)}
                      />
                      <div className="audio-controls">
                        <button onClick={togglePlay} className="control-btn">
                          {isPlaying ? <FiPause /> : <FiPlay />}
                        </button>
                        <div className="progress-container">
                          <span className="time-current">{formatTime(currentTime)}</span>
                          <input
                            type="range"
                            min="0"
                            max={duration}
                            value={currentTime}
                            onChange={handleSeek}
                            className="progress-slider"
                          />
                          <span className="time-duration">{formatTime(duration)}</span>
                        </div>
                        <button onClick={toggleLoop} className={`control-btn ${isLooping ? 'active' : ''}`}>
                          <FiRepeat />
                        </button>
                        <div className="volume-control">
                          <button onClick={toggleMute} className="control-btn">
                            {isMuted ? <FiVolumeX /> : <FiVolume2 />}
                          </button>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={volume}
                            onChange={handleVolumeChange}
                            className="volume-slider"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="player-info">
                  <h4>{selectedMedia.title}</h4>
                  <div className="player-stats">
                    <span><FiEye /> {formatNumber(selectedMedia._count?.views || 0)} views</span>
                    <span><FiThumbsUp /> {formatNumber(selectedMedia._count?.likes || 0)} likes</span>
                    <span><FiMessageCircle /> {formatNumber(selectedMedia._count?.comments || 0)} comments</span>
                    <span><FiDownload /> {formatNumber(selectedMedia._count?.downloads || 0)} downloads</span>
                    <span><FiShare2 /> {formatNumber(selectedMedia._count?.shares || 0)} shares</span>
                  </div>
                  <div className="player-description">
                    <p>{selectedMedia.description || "No description available."}</p>
                  </div>
                  <div className="player-actions">
                    <button className="like-btn" onClick={() => handleLike(selectedMedia.id)}>
                      <FiThumbsUp /> {selectedMedia.userLiked ? 'Liked' : 'Like'}
                    </button>
                    <button className="comment-btn" onClick={() => { fetchComments(selectedMedia.id); setShowCommentModal(true); }}>
                      <FiMessageCircle /> Comment
                    </button>
                    <button className="download-btn" onClick={() => handleDownload(selectedMedia.id, selectedMedia.url)}>
                      <FiDownload /> Download
                    </button>
                    <button className="share-btn" onClick={() => handleShare('copy', selectedMedia.id)}>
                      <FiShare2 /> Share
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-media-selected">
                <FiImage size={64} color="#cbd5e1" />
                <p>Select a media item to play</p>
                <span>Click on any media card below</span>
              </div>
            )}
          </div>

          {/* Media Details & Comments */}
          <div className="details-section">
            {selectedMedia && (
              <>
                <div className="details-card">
                  <div className="details-header">
                    <h3><FiTag /> Media Details</h3>
                    <button className="edit-btn-small" onClick={() => setShowEditModal(true)}>
                      <FiEdit2 /> Edit
                    </button>
                  </div>
                  <div className="details-content">
                    <div className="detail-row"><span className="detail-label">Title:</span><span>{selectedMedia.title}</span></div>
                    <div className="detail-row"><span className="detail-label">Type:</span><span className={`type-badge ${selectedMedia.type}`}>{selectedMedia.type}</span></div>
                    <div className="detail-row"><span className="detail-label">Size:</span><span>{selectedMedia.sizeFormatted || formatFileSize(selectedMedia.size)}</span></div>
                    <div className="detail-row"><span className="detail-label">Uploaded:</span><span>{formatRelativeTime(selectedMedia.createdAt)}</span></div>
                    <div className="detail-row"><span className="detail-label">By:</span><span>{selectedMedia.uploadedBy?.fullName || 'Admin'}</span></div>
                    <div className="detail-row"><span className="detail-label">Category:</span><span>{selectedMedia.category || 'Uncategorized'}</span></div>
                    <div className="detail-row"><span className="detail-label">Tags:</span><span>{selectedMedia.tags?.join(', ') || 'None'}</span></div>
                    <div className="detail-row"><span className="detail-label">Featured:</span><span>{selectedMedia.isFeatured ? '⭐ Yes' : 'No'}</span></div>
                  </div>
                </div>

                <div className="comments-card">
                  <div className="comments-header">
                    <h3><FiMessageCircle /> Comments ({selectedMedia._count?.comments || 0})</h3>
                  </div>
                  <div className="comments-list">
                    {comments.length === 0 ? (
                      <div className="no-comments">No comments yet. Be the first to comment!</div>
                    ) : (
                      comments.map(comment => (
                        <div key={comment.id} className="comment-item">
                          <div className="comment-avatar">{comment.user?.fullName?.charAt(0) || 'U'}</div>
                          <div className="comment-content">
                            <div className="comment-header">
                              <strong>{comment.user?.fullName || 'Anonymous'}</strong>
                              <span>{formatRelativeTime(comment.createdAt)}</span>
                            </div>
                            <p>{comment.content}</p>
                            <div className="comment-actions">
                              <button className="comment-like"><FiHeart /> {comment.likes || 0}</button>
                              <button className="comment-reply">Reply</button>
                            </div>
                          </div>
                          <button className="delete-comment" onClick={() => handleDeleteComment(comment.id)}>
                            <FiTrash2 />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="comment-input">
                    <input 
                      type="text" 
                      placeholder="Write a comment..." 
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                    />
                    <button onClick={handleAddComment}><FiSend /> Send</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Filters Bar */}
        <div className="filters-bar">
          <div className="type-filters">
            <button className={filters.type === 'all' ? 'active' : ''} onClick={() => changeFilter('type', 'all')}>All Media</button>
            <button className={filters.type === 'image' ? 'active' : ''} onClick={() => changeFilter('type', 'image')}><FiImage /> Photos</button>
            <button className={filters.type === 'video' ? 'active' : ''} onClick={() => changeFilter('type', 'video')}><FiVideo /> Videos</button>
            <button className={filters.type === 'audio' ? 'active' : ''} onClick={() => changeFilter('type', 'audio')}><FiMusic /> Audio</button>
            <button className={filters.category === 'featured' ? 'active' : ''} onClick={() => changeFilter('category', 'featured')}><FiStar /> Featured</button>
          </div>
          <div className="search-bar">
            <FiSearch />
            <input 
              type="text" 
              placeholder="Search by title or description..." 
              value={filters.search}
              onChange={(e) => changeFilter('search', e.target.value)}
            />
          </div>
          <div className="view-toggle">
            <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}><FiGrid /></button>
            <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}><FiList /></button>
          </div>
          {!bulkMode ? (
            <button className="bulk-btn" onClick={() => setBulkMode(true)}><FiCheckSquare /> Select</button>
          ) : (
            <div className="bulk-actions">
              <span>{selectedItems.length} selected</span>
              <button onClick={selectAll}>{selectedItems.length === media.length ? <FiSquare /> : <FiCheckSquare />}</button>
              <button onClick={handleBulkDelete} disabled={selectedItems.length === 0}><FiTrash2 /></button>
              <button onClick={() => { setBulkMode(false); setSelectedItems([]); }}><FiX /></button>
            </div>
          )}
        </div>

        {/* Media Grid/List */}
        <div className={`media-container ${viewMode}`}>
          {media.length === 0 ? (
            <div className="empty-state">
              <FiImage size={64} />
              <h3>No media found</h3>
              <p>Upload your first photo or video to get started</p>
              <button onClick={() => setShowUploadModal(true)}><FiUpload /> Upload Media</button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="media-grid">
              {media.map((item) => (
                <div key={item.id} className={`media-card ${selectedMedia?.id === item.id ? 'active' : ''}`} onClick={() => handleSelectMedia(item)}>
                  {bulkMode && (
                    <button className="select-checkbox" onClick={(e) => { e.stopPropagation(); toggleSelectItem(item.id); }}>
                      {selectedItems.includes(item.id) ? <FiCheckSquare /> : <FiSquare />}
                    </button>
                  )}
                  <div className="media-thumbnail">
                    {item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt={item.title} />
                    ) : item.type === 'image' ? (
                      <img src={item.url} alt={item.title} />
                    ) : item.type === 'video' ? (
                      <video src={item.url} />
                    ) : (
                      <div className="media-placeholder"><FiMusic size={32} /></div>
                    )}
                    {item.type === 'video' && <div className="video-badge"><FiPlay /></div>}
                    {item.type === 'audio' && <div className="audio-badge"><FiMusic /></div>}
                    {item.isFeatured && <div className="featured-badge"><FiStar /> Featured</div>}
                  </div>
                  <div className="media-info">
                    <h4 className="media-title">{item.title}</h4>
                    <div className="media-stats">
                      <span title="Views"><FiEye /> {formatNumber(item._count?.views || 0)}</span>
                      <span title="Likes" className={item.userLiked ? 'liked' : ''} onClick={(e) => { e.stopPropagation(); handleLike(item.id); }}><FiThumbsUp /> {formatNumber(item._count?.likes || 0)}</span>
                      <span title="Comments"><FiMessageCircle /> {formatNumber(item._count?.comments || 0)}</span>
                      <span title="Downloads"><FiDownload /> {formatNumber(item._count?.downloads || 0)}</span>
                    </div>
                    <div className="media-actions">
                      <button className="play-btn" onClick={(e) => { e.stopPropagation(); handleSelectMedia(item); }}><FiPlay /> Play</button>
                      <button className="edit-btn" onClick={(e) => { e.stopPropagation(); setSelectedMedia(item); setShowEditModal(true); }}><FiEdit2 /></button>
                      <button className="delete-btn" onClick={(e) => { e.stopPropagation(); handleDeleteMedia(item.id); }}><FiTrash2 /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="media-list">
              <table className="media-table">
                <thead>
                  <tr><th></th><th>Title</th><th>Type</th><th>Views</th><th>Likes</th><th>Comments</th><th>Downloads</th><th>Uploaded</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {media.map((item) => (
                    <tr key={item.id} className={selectedMedia?.id === item.id ? 'active-row' : ''} onClick={() => handleSelectMedia(item)}>
                      <td>{item.type === 'image' ? <FiImage /> : item.type === 'video' ? <FiVideo /> : <FiMusic />}</td>
                      <td className="list-title">{item.title}</td>
                      <td><span className={`type-badge ${item.type}`}>{item.type}</span></td>
                      <td>{formatNumber(item._count?.views || 0)}</td>
                      <td>{formatNumber(item._count?.likes || 0)}</td>
                      <td>{formatNumber(item._count?.comments || 0)}</td>
                      <td>{formatNumber(item._count?.downloads || 0)}</td>
                      <td>{formatRelativeTime(item.createdAt)}</td>
                      <td className="list-actions">
                        <button onClick={(e) => { e.stopPropagation(); handleSelectMedia(item); }} title="Play"><FiPlay /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleLike(item.id); }} title="Like"><FiThumbsUp /></button>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedMedia(item); setShowCommentModal(true); }} title="Comment"><FiMessageCircle /></button>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedMedia(item); setShowEditModal(true); }} title="Edit"><FiEdit2 /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteMedia(item.id); }} title="Delete"><FiTrash2 /></button>
                      </td>
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

        {/* Footer */}
        <div className="footer">
          <p>© {currentYear} ZUCA Portal | Gallery Management | Tumsifu Yesu Kristu! 🙏</p>
        </div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowUploadModal(false)}>
            <motion.div className="modal-content upload-modal" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header"><h3><FiUpload /> Upload Media</h3><button onClick={() => setShowUploadModal(false)}><FiX /></button></div>
              <div className="modal-body">
                {/* Drag & Drop Zone */}
                <div className="drop-zone" onClick={() => document.getElementById('file-input').click()}>
                  <div className="drop-zone-content">
                    <FiUpload size={48} />
                    <h4>Drag & Drop Files Here</h4>
                    <p>or click to browse</p>
                    <small>Supports: JPG, PNG, GIF, WEBP, MP4, MOV, MP3, WAV (Max 100MB per file)</small>
                  </div>
                  <input id="file-input" type="file" multiple accept="image/*,video/*,audio/*" onChange={handleFileSelect} style={{ display: 'none' }} />
                </div>

                {/* Caption Field */}
                <div className="form-group">
                  <label><FiEdit2 /> Caption / Description</label>
                  <textarea 
                    placeholder="Write a caption or description for your media..." 
                    rows="3"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                  />
                </div>

                {/* Category & Tags */}
                <div className="form-row">
                  <div className="form-group half">
                    <label><FiFolder /> Category</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)}>
                      <option value="uncategorized">Uncategorized</option>
                      <option value="choir">Choir</option>
                      <option value="mass">Mass</option>
                      <option value="events">Events</option>
                      <option value="teachings">Teachings</option>
                      <option value="retreats">Retreats</option>
                    </select>
                  </div>
                  <div className="form-group half">
                    <label><FiTag /> Tags</label>
                    <input 
                      type="text" 
                      placeholder="Comma separated tags" 
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                    />
                  </div>
                </div>

                {/* Options */}
                <div className="form-checkboxes">
                  <label><input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} /> <FiStar /> Feature this media</label>
                  <label><input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /> 🌍 Make public</label>
                </div>

         {/* Upload Queue with Better Progress Display */}
{uploadQueue.length > 0 && (
  <div className="upload-queue">
    <div className="queue-header">
      <h4>📤 Upload Queue ({uploadQueue.length} file{uploadQueue.length !== 1 ? 's' : ''})</h4>
      {uploading && (
        <div className="overall-progress">
          <div className="overall-progress-bar" style={{ width: `${uploadProgress}%` }}></div>
          <span>Overall: {Math.round(uploadProgress)}% Complete</span>
        </div>
      )}
    </div>
    
    {uploadQueue.map(item => (
      <div key={item.id} className={`queue-item ${item.status}`}>
        <div className="queue-info">
          <span className="queue-icon">
            {item.type === 'image' ? '🖼️' : item.type === 'video' ? '🎬' : '🎵'}
          </span>
          <div className="queue-details">
            <div className="queue-name" title={item.name}>
              {item.name.length > 40 ? item.name.substring(0, 40) + '...' : item.name}
            </div>
            <div className="queue-size">{formatFileSize(item.size)}</div>
          </div>
          {item.status === 'pending' && !uploading && (
            <button className="queue-remove" onClick={() => removeFromQueue(item.id)}>
              <FiX />
            </button>
          )}
          {item.status === 'completed' && (
            <span className="queue-status-badge success">✓ Complete</span>
          )}
          {item.status === 'failed' && (
            <span className="queue-status-badge error">✗ Failed</span>
          )}
        </div>
        
        {/* Individual File Progress Bar */}
        {(item.status === 'uploading' || (item.status === 'pending' && uploading)) && (
          <div className="queue-progress-container">
            <div className="queue-progress">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${item.progress}%` }}
              >
                <span className="progress-percent">{item.progress}%</span>
              </div>
            </div>
            {item.status === 'uploading' && (
              <div className="uploading-status-text">
                Uploading... {item.progress}%
              </div>
            )}
          </div>
        )}
        
        {item.status === 'failed' && (
          <div className="queue-error">❌ Error: {item.error}</div>
        )}
      </div>
    ))}
    
    <div className="queue-actions">
      {!uploading && uploadQueue.some(item => item.status === 'pending') && (
        <>
          <button className="cancel-btn" onClick={() => setUploadQueue([])}>
            Clear All
          </button>
          <button 
            className="upload-all-btn" 
            onClick={handleBulkUpload}
          >
            <FiUpload /> Upload All ({uploadQueue.filter(item => item.status === 'pending').length}) →
          </button>
        </>
      )}
      {uploading && (
        <div className="uploading-status">
          <div className="spinner-small"></div>
          <span>Uploading files, please wait...</span>
        </div>
      )}
      {!uploading && uploadQueue.every(item => item.status === 'completed') && (
        <div className="upload-complete-message">
          ✓ All files uploaded successfully!
        </div>
      )}
    </div>
  </div>
)}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && selectedMedia && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEditModal(false)}>
            <motion.div className="modal-content" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header"><h3><FiEdit2 /> Edit Media</h3><button onClick={() => setShowEditModal(false)}><FiX /></button></div>
              <div className="modal-body">
                <div className="form-group"><label>Title</label><input type="text" id="edit-title" defaultValue={selectedMedia.title} /></div>
                <div className="form-group"><label>Description</label><textarea id="edit-description" rows="3" defaultValue={selectedMedia.description || ""} /></div>
                <div className="form-row">
                  <div className="form-group half"><label>Category</label><input type="text" id="edit-category" defaultValue={selectedMedia.category || ""} /></div>
                  <div className="form-group half"><label>Tags</label><input type="text" id="edit-tags" defaultValue={selectedMedia.tags?.join(', ') || ""} /></div>
                </div>
                <div className="form-checkboxes">
                  <label><input type="checkbox" id="edit-featured" defaultChecked={selectedMedia.isFeatured} /> <FiStar /> Feature this media</label>
                  <label><input type="checkbox" id="edit-public" defaultChecked={selectedMedia.isPublic} /> 🌍 Make public</label>
                </div>
              </div>
              <div className="modal-actions">
                <button className="cancel-btn" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button className="save-btn" onClick={() => {
                  handleEditMedia({
                    title: document.getElementById('edit-title').value,
                    description: document.getElementById('edit-description').value,
                    category: document.getElementById('edit-category').value,
                    tags: document.getElementById('edit-tags').value,
                    isFeatured: document.getElementById('edit-featured').checked,
                    isPublic: document.getElementById('edit-public').checked
                  });
                }}>Save Changes</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .media-page { min-height: 100vh; background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%); }
        .media-content { max-width: 1600px; margin: 0 auto; padding: 20px; }

        /* Header */
        .media-header { background: linear-gradient(135deg, #0f172a, #1e293b); border-radius: 20px; padding: 20px 24px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
        .media-header h1 { color: white; font-size: 22px; margin: 0; display: flex; align-items: center; gap: 10px; }
        .media-header p { color: #94a3b8; font-size: 13px; margin: 4px 0 0; }
        .refresh-btn, .upload-btn { padding: 8px 16px; border-radius: 10px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font-size: 13px; }
        .refresh-btn { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; }
        .upload-btn { background: #3b82f6; border: none; color: white; }
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        /* Stats Grid */
        .stats-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 12px; margin-bottom: 24px; }
        .stat-card { background: white; border-radius: 14px; padding: 12px; display: flex; align-items: center; gap: 10px; border: 1px solid #e2e8f0; }
        .stat-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
        .stat-icon.total { background: #eff6ff; color: #3b82f6; }
        .stat-icon.photos { background: #d1fae5; color: #10b981; }
        .stat-icon.videos { background: #fef3c7; color: #f59e0b; }
        .stat-icon.audio { background: #fce7f3; color: #ec4899; }
        .stat-icon.views { background: #e0f2fe; color: #06b6d4; }
        .stat-icon.likes { background: #fee2e2; color: #ef4444; }
        .stat-icon.comments { background: #ede9fe; color: #8b5cf6; }
        .stat-icon.downloads { background: #f1f5f9; color: #64748b; }
        .stat-info { flex: 1; }
        .stat-value { display: block; font-size: 18px; font-weight: 700; color: #1e293b; }
        .stat-label { font-size: 8px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }

        /* Two Columns */
        .two-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }

        /* Player Section */
        .player-section { background: white; border-radius: 20px; padding: 20px; border: 1px solid #e2e8f0; }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .section-header h3 { font-size: 16px; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 6px; }
        .now-playing { font-size: 11px; background: #d1fae5; color: #10b981; padding: 2px 8px; border-radius: 12px; }
        .player-wrapper { background: #000; border-radius: 12px; overflow: hidden; position: relative; }
        .media-image { width: 100%; height: auto; max-height: 300px; object-fit: contain; background: #0f172a; }
        .media-video { width: 100%; max-height: 300px; }
        .player-controls { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.8)); padding: 12px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .control-btn { background: rgba(255,255,255,0.2); border: none; border-radius: 8px; padding: 6px 10px; color: white; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
        .control-btn.active { background: #3b82f6; }
        .progress-container { flex: 1; display: flex; align-items: center; gap: 8px; }
        .progress-slider { flex: 1; height: 4px; -webkit-appearance: none; background: rgba(255,255,255,0.3); border-radius: 2px; outline: none; }
        .progress-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%; background: white; cursor: pointer; }
        .volume-control { display: flex; align-items: center; gap: 6px; }
        .volume-slider { width: 60px; height: 4px; -webkit-appearance: none; background: rgba(255,255,255,0.3); border-radius: 2px; }
        .volume-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 10px; height: 10px; border-radius: 50%; background: white; }
        .time-current, .time-duration { font-size: 12px; color: white; }
        .audio-player { background: linear-gradient(135deg, #1e293b, #0f172a); border-radius: 12px; padding: 30px; text-align: center; }
        .audio-artwork { width: 120px; height: 120px; margin: 0 auto 20px; background: #334155; border-radius: 60px; display: flex; align-items: center; justify-content: center; color: #94a3b8; }
        .audio-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .player-info { padding: 16px 0 0; }
        .player-info h4 { font-size: 16px; margin: 0 0 12px; }
        .player-stats { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 12px; }
        .player-stats span { font-size: 12px; color: #64748b; display: flex; align-items: center; gap: 4px; }
        .player-description { font-size: 13px; color: #475569; margin-bottom: 12px; }
        .player-actions { display: flex; gap: 8px; }
        .player-actions button { padding: 6px 12px; border-radius: 8px; font-size: 12px; cursor: pointer; border: none; }
        .like-btn { background: #fee2e2; color: #ef4444; }
        .comment-btn { background: #d1fae5; color: #10b981; }
        .download-btn { background: #e0f2fe; color: #06b6d4; }
        .share-btn { background: #fef3c7; color: #f59e0b; }

        /* Details Section */
        .details-section { display: flex; flex-direction: column; gap: 20px; }
        .details-card, .comments-card { background: white; border-radius: 20px; padding: 20px; border: 1px solid #e2e8f0; }
        .details-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .details-header h3 { font-size: 15px; margin: 0; display: flex; align-items: center; gap: 6px; }
        .edit-btn-small { padding: 4px 10px; background: #fef3c7; border: none; border-radius: 6px; color: #f59e0b; font-size: 11px; cursor: pointer; display: flex; align-items: center; gap: 4px; }
        .detail-row { display: flex; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
        .detail-label { width: 100px; color: #64748b; }
        .type-badge { padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 500; }
        .type-badge.image { background: #d1fae5; color: #10b981; }
        .type-badge.video { background: #fef3c7; color: #f59e0b; }
        .type-badge.audio { background: #fce7f3; color: #ec4899; }

        /* Comments */
        .comments-header { margin-bottom: 16px; }
        .comments-header h3 { font-size: 15px; margin: 0; display: flex; align-items: center; gap: 6px; }
        .comments-list { max-height: 300px; overflow-y: auto; margin-bottom: 16px; }
        .comment-item { display: flex; gap: 12px; padding: 12px; border-bottom: 1px solid #f1f5f9; position: relative; }
        .comment-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; }
        .comment-content { flex: 1; }
        .comment-header { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; }
        .comment-header strong { color: #1e293b; }
        .comment-header span { color: #94a3b8; font-size: 10px; }
        .comment-content p { font-size: 13px; color: #475569; margin: 0 0 6px; }
        .comment-actions { display: flex; gap: 12px; }
        .comment-actions button { background: none; border: none; font-size: 11px; color: #64748b; cursor: pointer; display: flex; align-items: center; gap: 4px; }
        .delete-comment { position: absolute; right: 12px; top: 12px; background: none; border: none; cursor: pointer; color: #94a3b8; opacity: 0; }
        .comment-item:hover .delete-comment { opacity: 1; }
        .no-comments { text-align: center; padding: 30px; color: #94a3b8; }
        .comment-input { display: flex; gap: 8px; padding-top: 12px; border-top: 1px solid #e2e8f0; }
        .comment-input input { flex: 1; padding: 10px; border: 1px solid #e2e8f0; border-radius: 20px; font-size: 13px; outline: none; }
        .comment-input button { padding: 8px 16px; background: #3b82f6; border: none; border-radius: 20px; color: white; cursor: pointer; display: flex; align-items: center; gap: 6px; }

        /* Filters */
        .filters-bar { background: white; border-radius: 16px; padding: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; border: 1px solid #e2e8f0; }
        .type-filters { display: flex; gap: 8px; flex-wrap: wrap; }
        .type-filters button { padding: 6px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px; font-size: 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
        .type-filters button.active { background: #3b82f6; color: white; border-color: #3b82f6; }
        .search-bar { display: flex; align-items: center; gap: 8px; background: #f8fafc; padding: 6px 12px; border-radius: 30px; border: 1px solid #e2e8f0; }
        .search-bar input { border: none; background: none; outline: none; font-size: 13px; width: 220px; }
        .view-toggle { display: flex; gap: 4px; background: #f1f5f9; border-radius: 10px; padding: 3px; }
        .view-toggle button { padding: 6px 10px; background: transparent; border: none; border-radius: 8px; cursor: pointer; }
        .view-toggle button.active { background: white; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .bulk-btn { padding: 6px 12px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
        .bulk-actions { display: flex; align-items: center; gap: 12px; background: #f1f5f9; padding: 4px 12px; border-radius: 30px; }
        .bulk-actions button { background: none; border: none; cursor: pointer; font-size: 16px; padding: 4px; }

        /* Media Grid */
        .media-container.grid { display: block; }
        .media-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; margin-bottom: 24px; }
        .media-card { background: white; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; transition: all 0.3s; position: relative; cursor: pointer; }
        .media-card:hover { transform: translateY(-4px); box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
        .media-card.active { border-color: #3b82f6; box-shadow: 0 0 0 2px #3b82f6; }
        .select-checkbox { position: absolute; top: 12px; left: 12px; z-index: 10; background: rgba(0,0,0,0.6); border: none; border-radius: 6px; color: white; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .media-thumbnail { position: relative; height: 160px; background: #1e293b; overflow: hidden; }
        .media-thumbnail img, .media-thumbnail video { width: 100%; height: 100%; object-fit: cover; }
        .media-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #334155; color: #94a3b8; }
        .video-badge, .audio-badge { position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.7); border-radius: 20px; padding: 4px 8px; color: white; font-size: 10px; display: flex; align-items: center; gap: 4px; }
        .featured-badge { position: absolute; top: 8px; right: 8px; background: #f59e0b; border-radius: 20px; padding: 2px 6px; font-size: 9px; color: white; display: flex; align-items: center; gap: 2px; }
        .media-info { padding: 12px; }
        .media-title { font-size: 13px; font-weight: 600; margin: 0 0 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .media-stats { display: flex; gap: 12px; margin-bottom: 12px; font-size: 10px; color: #64748b; flex-wrap: wrap; }
        .media-stats span { display: flex; align-items: center; gap: 3px; cursor: pointer; }
        .media-stats span.liked { color: #ef4444; }
        .media-actions { display: flex; gap: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; }
        .media-actions button { padding: 4px 8px; border-radius: 6px; font-size: 10px; cursor: pointer; border: none; }
        .play-btn { background: #eff6ff; color: #3b82f6; }
        .edit-btn { background: #fef3c7; color: #f59e0b; }
        .delete-btn { background: #fee2e2; color: #ef4444; }

        /* List View */
        .media-list { overflow-x: auto; }
        .media-table { width: 100%; background: white; border-radius: 16px; border-collapse: collapse; }
        .media-table th, .media-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
        .media-table th { background: #f8fafc; font-weight: 600; color: #64748b; }
        .media-table tr { cursor: pointer; }
        .media-table tr.active-row { background: #eff6ff; }
        .list-title { max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .list-actions { display: flex; gap: 8px; }
        .list-actions button { background: none; border: none; cursor: pointer; padding: 4px; color: #64748b; }

        /* Upload Modal */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .modal-content { background: white; border-radius: 24px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; }
        .upload-modal { max-width: 650px; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e2e8f0; }
        .modal-header h3 { margin: 0; font-size: 18px; display: flex; align-items: center; gap: 8px; }
        .modal-header button { background: none; border: none; font-size: 18px; cursor: pointer; }
        .modal-body { padding: 20px; }
        .drop-zone { border: 2px dashed #cbd5e1; border-radius: 16px; padding: 40px; text-align: center; cursor: pointer; margin-bottom: 20px; transition: all 0.3s; }
        .drop-zone:hover { border-color: #3b82f6; background: #eff6ff; }
        .drop-zone-content h4 { margin: 12px 0 4px; }
        .drop-zone-content p { color: #64748b; font-size: 13px; margin: 0; }
        .drop-zone-content small { color: #94a3b8; font-size: 11px; }
        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; font-size: 12px; font-weight: 500; margin-bottom: 6px; color: #64748b; display: flex; align-items: center; gap: 4px; }
        .form-group input, .form-group textarea, .form-group select { width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; }
        .form-row { display: flex; gap: 16px; }
        .form-group.half { flex: 1; }
        .form-checkboxes { display: flex; gap: 20px; margin: 16px 0; }
        .form-checkboxes label { display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer; }

        /* Upload Queue */
        .upload-queue { margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
        .upload-queue h4 { font-size: 14px; margin: 0 0 12px; }
        .queue-item { background: #f8fafc; border-radius: 10px; padding: 10px; margin-bottom: 8px; }
        .queue-info { display: flex; align-items: center; gap: 10px; }
        .queue-icon { font-size: 20px; }
        .queue-details { flex: 1; }
        .queue-name { font-size: 12px; font-weight: 500; }
        .queue-size { font-size: 10px; color: #94a3b8; }
        .queue-remove { background: none; border: none; cursor: pointer; color: #94a3b8; }
        .queue-progress { margin-top: 6px; height: 4px; background: #e2e8f0; border-radius: 2px; overflow: hidden; position: relative; }
        .queue-progress .progress-bar { height: 100%; background: #3b82f6; transition: width 0.3s; }
        .queue-progress span { position: absolute; right: 0; top: -16px; font-size: 10px; color: #64748b; }
        .queue-status { font-size: 10px; margin-top: 4px; }
        .queue-status.success { color: #10b981; }
        .queue-status.error { color: #ef4444; }
        .queue-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 12px; }
        .cancel-btn { padding: 8px 16px; background: #f1f5f9; border: none; border-radius: 8px; cursor: pointer; }
        .upload-all-btn { padding: 8px 20px; background: #3b82f6; border: none; border-radius: 8px; color: white; cursor: pointer; }

        /* Modal Actions */
        .modal-actions { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 20px; border-top: 1px solid #e2e8f0; }
        .cancel-btn { padding: 8px 16px; background: #f1f5f9; border: none; border-radius: 8px; cursor: pointer; }
        .save-btn { padding: 8px 16px; background: #3b82f6; border: none; border-radius: 8px; color: white; cursor: pointer; }

        /* Empty State */
        .empty-state { text-align: center; padding: 60px 20px; background: white; border-radius: 20px; }
        .empty-state svg { color: #cbd5e1; margin-bottom: 16px; }
        .empty-state h3 { margin-bottom: 8px; }
        .empty-state button { margin-top: 16px; padding: 8px 20px; background: #3b82f6; border: none; border-radius: 10px; color: white; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }

        .no-media-selected { text-align: center; padding: 60px 20px; color: #94a3b8; }

        /* Pagination */
        .pagination { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 24px; }
        .pagination button { padding: 6px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
        .pagination button:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Footer */
        .footer { text-align: center; padding: 20px; margin-top: 24px; border-top: 1px solid #e2e8f0; }
        .footer p { font-size: 10px; color: #94a3b8; }

        /* Responsive */
        @media (max-width: 1200px) { .stats-grid { grid-template-columns: repeat(4, 1fr); } .two-columns { grid-template-columns: 1fr; } }
        @media (max-width: 768px) { 
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .media-grid { grid-template-columns: 1fr; }
          .filters-bar { flex-direction: column; }
          .search-bar input { width: 100%; }
          .type-filters { overflow-x: auto; flex-wrap: nowrap; width: 100%; }
          .form-row { flex-direction: column; }
        }

        /* Enhanced Upload Queue Styles - Add these near the other upload styles */
.queue-header {
  margin-bottom: 16px;
}

.queue-header h4 {
  font-size: 14px;
  margin: 0 0 12px 0;
  color: #1e293b;
}

.overall-progress {
  background: #f1f5f9;
  border-radius: 20px;
  padding: 8px 12px;
  position: relative;
  overflow: hidden;
  margin-top: 8px;
}

.overall-progress-bar {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  transition: width 0.3s ease;
  opacity: 0.2;
}

.overall-progress span {
  position: relative;
  z-index: 1;
  font-size: 12px;
  font-weight: 500;
  color: #1e293b;
}

.queue-item {
  background: #f8fafc;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 10px;
  transition: all 0.3s;
  border: 1px solid #e2e8f0;
}

.queue-item.uploading {
  background: #eff6ff;
  border-color: #3b82f6;
}

.queue-item.completed {
  background: #f0fdf4;
  border-color: #22c55e;
}

.queue-item.failed {
  background: #fef2f2;
  border-color: #ef4444;
}

.queue-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.queue-icon {
  font-size: 24px;
}

.queue-details {
  flex: 1;
}

.queue-name {
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
  margin-bottom: 4px;
}

.queue-size {
  font-size: 10px;
  color: #64748b;
}

.queue-remove {
  background: none;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  padding: 4px;
  border-radius: 6px;
  transition: all 0.2s;
}

.queue-remove:hover {
  background: #e2e8f0;
  color: #ef4444;
}

.queue-status-badge {
  padding: 4px 8px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
}

.queue-status-badge.success {
  background: #22c55e20;
  color: #16a34a;
}

.queue-status-badge.error {
  background: #ef444420;
  color: #dc2626;
}

.queue-progress-container {
  margin-top: 10px;
}

.queue-progress {
  background: #e2e8f0;
  border-radius: 20px;
  overflow: hidden;
  height: 28px;
  position: relative;
}

.progress-bar-fill {
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  height: 100%;
  border-radius: 20px;
  transition: width 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.progress-percent {
  font-size: 11px;
  font-weight: 600;
  color: white;
  position: relative;
  z-index: 1;
}

.progress-bar-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.uploading-status-text {
  font-size: 11px;
  color: #3b82f6;
  margin-top: 6px;
  text-align: center;
}

.queue-error {
  font-size: 11px;
  color: #ef4444;
  margin-top: 8px;
  padding: 6px;
  background: #fef2f2;
  border-radius: 6px;
}

.uploading-status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  background: #eff6ff;
  border-radius: 8px;
  color: #3b82f6;
  font-size: 13px;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.upload-complete-message {
  padding: 8px 16px;
  background: #f0fdf4;
  border-radius: 8px;
  color: #16a34a;
  font-size: 13px;
  text-align: center;
}

.queue-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
}
      `}</style>
    </div>
  );
}

export default MediaPage;