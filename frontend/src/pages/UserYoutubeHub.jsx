// frontend/src/pages/UserYoutubeHub.jsx

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiPlay, FiPause, FiVolume2, FiVolumeX, FiMaximize2, FiMinimize2,
  FiThumbsUp, FiMessageCircle, FiShare2, FiBell, FiBellOff, 
  FiSearch, FiChevronLeft, FiChevronRight, FiCopy, FiCheck,
  FiEye, FiClock, FiCalendar, FiUsers, FiYoutube, FiHeart,
  FiTrendingUp, FiAward, FiStar, FiActivity, FiRefreshCw, FiVideo  
} from "react-icons/fi";
import { FaYoutube, FaWhatsapp, FaFacebook, FaTwitter } from "react-icons/fa";
import { api, publicApi } from "../api";

function UserYoutubeHub() {
  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [channel, setChannel] = useState(null);
  const [videos, setVideos] = useState([]);
  const [isLive, setIsLive] = useState(false);
  const [liveVideo, setLiveVideo] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState("channel");
  const [currentPage, setCurrentPage] = useState(1);
  const [videosPerPage] = useState(12);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [liked, setLiked] = useState(false);
  const [showShareMenuForVideo, setShowShareMenuForVideo] = useState(null);

  const currentYear = new Date().getFullYear();

  // Format helpers
  const formatNumber = (num) => {
    if (!num) return "0";
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Fetch data using publicApi (no auth needed)
  const fetchYouTubeData = async () => {
    try {
      setLoading(true);
      const response = await publicApi.get("/api/youtube/latest");
      const data = response.data;
      
      if (data.success) {
        setChannel(data.channel);
        setVideos(data.videos || []);
        setIsLive(data.isLive || false);
        setLiveVideo(data.liveVideo);
        
        // Auto-select first video or live stream
        if (data.isLive && data.liveVideo) {
          setSelectedVideo(data.liveVideo);
        } else if (data.videos && data.videos.length > 0 && !selectedVideo) {
          setSelectedVideo(data.videos[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching YouTube data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchYouTubeData();
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      let response;
      
      if (searchMode === "channel") {
        // Search only your channel
        response = await publicApi.get(`/api/youtube/search?q=${encodeURIComponent(searchQuery)}&maxResults=20`);
      } else {
        // Search entire YouTube
        response = await publicApi.get(`/api/youtube/search-any?q=${encodeURIComponent(searchQuery)}&maxResults=20`);
      }
      
      setSearchResults(response.data.videos || []);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    }
  };

  const handlePlayVideo = (video) => {
    setSelectedVideo(video);
    setIsPlaying(true);
    // Scroll to player
    document.querySelector(".video-player-section")?.scrollIntoView({ 
      behavior: "smooth", 
      block: "start" 
    });
  };

  const handleShare = async (platform, videoId, videoTitle) => {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const text = `Watch "${videoTitle}" on ZUCA! 🙏`;
    
    switch(platform) {
      case "whatsapp":
        window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`, "_blank");
        break;
      case "facebook":
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
        break;
      case "twitter":
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank");
        break;
      case "copy":
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        break;
      default:
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
    setShowShareMenu(false);
    setShowShareMenuForVideo(null);
  };


  const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};


const handleSubscribe = () => {
  const channelId = channel?.id || "UCJ7NvR5_ZUwhtM16sJY4anQ";
  const subscribeUrl = `https://www.youtube.com/channel/${channelId}?sub_confirmation=1`;
  
  // Popup dimensions for desktop
  const width = 500;
  const height = 600;
  const left = window.screen.width / 2 - width / 2;
  const top = window.screen.height / 2 - height / 2;
  
  window.open(
    subscribeUrl,
    "Subscribe to ZUCA YouTube Channel",
    `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes`
  );

  // Show visual feedback
  setSubscribed(true);
  setTimeout(() => setSubscribed(false), 3000);
};

  const handleLike = () => {
    setLiked(!liked);
  };

  // Display videos (search results or all videos)
  const displayVideos = isSearching ? searchResults : videos;
  const totalPages = Math.ceil(displayVideos.length / videosPerPage);
  const currentVideos = displayVideos.slice(
    (currentPage - 1) * videosPerPage,
    currentPage * videosPerPage
  );

  useEffect(() => {
    fetchYouTubeData();
  }, []);

  


  return (
    <div className="user-youtube-hub">
      <div className="youtube-content">
        
        {/* HEADER */}
        <div className="youtube-header">
          <div className="header-left">
            <div className="logo-section">
              <FaYoutube size={28} color="#ff0000" />
              <h1>ZUCA's YOUTUBE</h1>
            </div>
            {isLive && (
              <div className="live-badge-header">
                <span className="live-dot">🔴</span> LIVE NOW
              </div>
            )}
          </div>
          <div className="header-right">
            <button className="refresh-btn" onClick={handleRefresh} disabled={refreshing}>
              <FiRefreshCw className={refreshing ? "spinning" : ""} />
            </button>
            <button className="subscribe-btn-header" onClick={handleSubscribe}>
              {subscribed ? <FiCheck /> : <FiBell />}
              {subscribed ? "Subscribed" : "Subscribe"}
            </button>
          </div>
        </div>

        {/* LIVE ALERT BANNER */}
        <AnimatePresence>
          {isLive && liveVideo && (
            <motion.div 
              className="live-alert"
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
            >
              <div className="live-alert-content">
                <span className="live-pulse">🔴</span>
                <div className="live-info">
                  <strong>LIVE NOW!</strong>
                  <span>{liveVideo.title}</span>
                </div>
                <button className="watch-live-btn" onClick={() => handlePlayVideo(liveVideo)}>
                  Watch Live ▶
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* VIDEO PLAYER SECTION (ALWAYS ON TOP) */}
        <div className="video-player-section">
          <div className="player-header">
            <h3><FiPlay /> Now Playing</h3>
            {selectedVideo?.isLive && <span className="live-badge">🔴 LIVE</span>}
          </div>
          
          <div className="video-player-container">
            <div className="video-wrapper">
              {selectedVideo ? (
                <iframe
                  src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1&rel=0&modestbranding=1&showinfo=0&controls=1`}
                  title={selectedVideo.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              ) : (
                <div className="no-video-placeholder">
                  <FaYoutube size={64} color="#cbd5e1" />
                  <p>Select a video to watch</p>
                  <span>Click ▶ Watch on any video below</span>
                </div>
              )}
            </div>
            
            {selectedVideo && (
              <div className="video-info-panel">
                <h4>{selectedVideo.title}</h4>
                {selectedVideo.channelTitle && searchMode === "all" && (
                  <div className="video-channel-name">From: {selectedVideo.channelTitle}</div>
                )}
                <div className="video-stats">
                  <span><FiEye /> {formatNumber(selectedVideo.views)} views</span>
                  <span><FiThumbsUp /> {formatNumber(selectedVideo.likes)} likes</span>
                  <span><FiMessageCircle /> {formatNumber(selectedVideo.comments)} comments</span>
                  <span><FiClock /> {formatRelativeTime(selectedVideo.publishedAt)}</span>
                </div>
                <div className="video-actions">
                  <button className={`action-btn like-btn ${liked ? "active" : ""}`} onClick={handleLike}>
                    <FiThumbsUp /> {liked ? "Liked" : "Like"}
                  </button>
                  <button className="action-btn comment-btn" onClick={() => window.open(`https://www.youtube.com/watch?v=${selectedVideo.id}`, "_blank")}>
                    <FiMessageCircle /> Comment
                  </button>
                  <div className="share-dropdown">
                    <button className="action-btn share-btn" onClick={() => setShowShareMenu(!showShareMenu)}>
                      <FiShare2 /> Share
                    </button>
                    {showShareMenu && (
                      <div className="share-menu">
                        <button onClick={() => handleShare("whatsapp", selectedVideo.id, selectedVideo.title)}>
                          <FaWhatsapp color="#25D366" /> WhatsApp
                        </button>
                        <button onClick={() => handleShare("facebook", selectedVideo.id, selectedVideo.title)}>
                          <FaFacebook color="#1877F2" /> Facebook
                        </button>
                        <button onClick={() => handleShare("twitter", selectedVideo.id, selectedVideo.title)}>
                          <FaTwitter color="#1DA1F2" /> Twitter
                        </button>
                        <button onClick={() => handleShare("copy", selectedVideo.id, selectedVideo.title)}>
                          <FiCopy /> {copied ? "Copied!" : "Copy Link"}
                        </button>
                      </div>
                    )}
                  </div>
                  <button className="action-btn notify-btn" onClick={handleSubscribe}>
                    <FiBell /> Notify
                  </button>
                </div>
                {selectedVideo.description && (
                  <div className="video-description">
                    <p>{selectedVideo.description.substring(0, 200)}...</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* CHANNEL INFO BAR */}
        {channel && (
          <div className="channel-info-bar">
            <div className="channel-avatar">
              {channel.thumbnail ? (
                <img src={channel.thumbnail} alt={channel.name} />
              ) : (
                <div className="channel-placeholder">🎬</div>
              )}
            </div>
            <div className="channel-details">
              <h3>{channel.name}</h3>
              <div className="channel-stats">
                <span><FiUsers /> {formatNumber(channel.subscribers)} subscribers</span>
                <span><FiEye /> {formatNumber(channel.totalViews)} views</span>
                <span><FiVideo /> {channel.totalVideos} videos</span>
              </div>
              <p>{channel.description?.substring(0, 100)}...</p>
            </div>

            
            <button className="subscribe-btn" onClick={handleSubscribe}>
              <FiBell /> Subscribe
            </button>
          </div>
        )}

        {/* SEARCH BAR */}
        <div className="search-section">
          <div className="search-bar">
            <FiSearch className="search-icon" />
            <input 
              type="text" 
              placeholder="Search videos..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
            <button className="search-btn" onClick={handleSearch}>Search</button>
          </div>
          <div className="search-mode-toggle">
            <button 
              className={`mode-btn ${searchMode === "channel" ? "active" : ""}`}
              onClick={() => setSearchMode("channel")}
            >
              📁 ZUCA Channel
            </button>
            <button 
              className={`mode-btn ${searchMode === "all" ? "active" : ""}`}
              onClick={() => setSearchMode("all")}
            >
              🌍 All YouTube
            </button>
          </div>
          {isSearching && (
            <div className="search-results-info">
              Found {searchResults.length} results for "{searchQuery}"
              <button onClick={() => {
                setIsSearching(false);
                setSearchQuery("");
                setSearchResults([]);
              }}>Clear</button>
            </div>
          )}
        </div>

        {/* VIDEOS GRID */}
        <div className="videos-section">
          <div className="section-header">
            <h3><FiVideo /> {isSearching ? "Search Results" : "All Videos"}</h3>
            <span className="video-count">{displayVideos.length} videos</span>
          </div>

          <div className="videos-grid">
            {currentVideos.length === 0 ? (
              <div className="no-videos">
                <FaYoutube size={48} color="#cbd5e1" />
                <p>No videos found</p>
                {isSearching && <button onClick={() => {
                  setIsSearching(false);
                  setSearchQuery("");
                }}>Clear search</button>}
              </div>
            ) : (
              currentVideos.map((video, index) => (
                <motion.div 
                  key={video.id} 
                  className="video-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="video-thumb-wrapper" onClick={() => handlePlayVideo(video)}>
                    <img src={video.thumbnail} alt={video.title} />
                    {video.isLive && <div className="live-badge-grid">🔴 LIVE</div>}
                    <div className="play-overlay">
                      <FiPlay className="play-icon" />
                    </div>
                  </div>
                  <div className="video-card-info">
                    <h4 className="video-title">{video.title}</h4>
                    {video.channelTitle && searchMode === "all" && (
                      <div className="video-channel">{video.channelTitle}</div>
                    )}
                    <div className="video-card-stats">
                      <span><FiEye /> {formatNumber(video.views)}</span>
                      <span><FiThumbsUp /> {formatNumber(video.likes)}</span>
                      <span><FiMessageCircle /> {formatNumber(video.comments)}</span>
                    </div>
                    <div className="video-card-actions">
                      <button className="watch-btn" onClick={() => handlePlayVideo(video)}>
                        <FiPlay /> Watch
                      </button>
                      <div className="share-dropdown-small">
                        <button className="share-small-btn" onClick={() => setShowShareMenuForVideo(showShareMenuForVideo === video.id ? null : video.id)}>
                          <FiShare2 />
                        </button>
                        {showShareMenuForVideo === video.id && (
                          <div className="share-menu-small">
                            <button onClick={() => handleShare("whatsapp", video.id, video.title)}>
                              <FaWhatsapp color="#25D366" /> WhatsApp
                            </button>
                            <button onClick={() => handleShare("facebook", video.id, video.title)}>
                              <FaFacebook color="#1877F2" /> Facebook
                            </button>
                            <button onClick={() => handleShare("twitter", video.id, video.title)}>
                              <FaTwitter color="#1DA1F2" /> Twitter
                            </button>
                            <button onClick={() => handleShare("copy", video.id, video.title)}>
                              <FiCopy /> Copy Link
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="video-date">{formatRelativeTime(video.publishedAt)}</div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="pagination">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <FiChevronLeft /> Previous
              </button>
              <span className="page-info">Page {currentPage} of {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                Next <FiChevronRight />
              </button>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="footer">
          <p>© {currentYear} ZUCA Portal | YouTube Media Hub | Tumsifu Yesu Kristu! 🙏</p>
          <p className="creator">Data from YouTube Data API v3</p>
        </div>
      </div>

      <style>{`
  .user-youtube-hub {
    min-height: 100vh;
    background: linear-gradient(135deg, #f5f7fa 0%, #e9edf2 100%);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .youtube-content {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
  }

  /* Loader */
  .youtube-loader {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #f5f7fa, #e2e8f0);
    color: #1e293b;
  }

  .loader-spinner {
    position: relative;
    width: 80px;
    height: 80px;
    margin-bottom: 24px;
  }

  .ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 2px solid transparent;
    animation: spin 1s linear infinite;
  }

  .ring:nth-child(1) {
    border-top-color: #ff0000;
    border-right-color: #ff0000;
  }

  .ring:nth-child(2) {
    border-bottom-color: #3b82f6;
    border-left-color: #3b82f6;
    animation-delay: -0.5s;
    width: 60%;
    height: 60%;
    top: 20%;
    left: 20%;
  }

  .ring:nth-child(3) {
    border-top-color: #10b981;
    border-right-color: #10b981;
    width: 30%;
    height: 30%;
    top: 35%;
    left: 35%;
  }

  @keyframes spin {
    100% { transform: rotate(360deg); }
  }

  .loader-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
    50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
  }

  /* Header - Light Theme */
  .youtube-header {
    background: white;
    border-radius: 20px;
    padding: 16px 24px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }

  .logo-section {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .logo-section h1 {
    color: #1e293b;
    font-size: 20px;
    font-weight: 600;
  }

  .live-badge-header {
    background: #fef2f2;
    padding: 4px 12px;
    border-radius: 20px;
    color: #ef4444;
    font-size: 12px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .live-dot {
    animation: blink 1s infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .refresh-btn, .subscribe-btn-header {
    padding: 8px 16px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    color: #475569;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    transition: all 0.3s;
  }

  .refresh-btn:hover, .subscribe-btn-header:hover {
    background: #e2e8f0;
  }

  .spinning {
    animation: spin 1s linear infinite;
  }

  /* Live Alert */
  .live-alert {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    border-radius: 16px;
    padding: 16px 20px;
    margin-bottom: 20px;
  }

  .live-alert-content {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .live-pulse {
    font-size: 24px;
    animation: blink 1s infinite;
  }

  .live-info {
    flex: 1;
    color: white;
  }

  .live-info strong {
    display: block;
    font-size: 14px;
  }

  .live-info span {
    font-size: 12px;
    opacity: 0.9;
  }

  .watch-live-btn {
    padding: 10px 20px;
    background: white;
    border: none;
    border-radius: 30px;
    color: #dc2626;
    font-weight: 600;
    cursor: pointer;
    font-size: 13px;
  }

  /* Video Player Section - Light */
  .video-player-section {
    background: white;
    border-radius: 24px;
    overflow: hidden;
    margin-bottom: 20px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }

  .player-header {
    padding: 16px 20px;
    background: #f8fafc;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #e2e8f0;
  }

  .player-header h3 {
    color: #1e293b;
    font-size: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .live-badge {
    background: #ef4444;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    color: white;
  }

  .video-wrapper {
    position: relative;
    padding-bottom: 56.25%;
    height: 0;
    background: #000;
  }

  .video-wrapper iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .no-video-placeholder {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #f8fafc;
    color: #94a3b8;
    gap: 12px;
  }

  .video-info-panel {
    padding: 20px;
  }

  .video-info-panel h4 {
    color: #1e293b;
    font-size: 18px;
    margin-bottom: 8px;
  }

  .video-channel-name {
    color: #3b82f6;
    font-size: 13px;
    margin-bottom: 12px;
  }

  .video-stats {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }

  .video-stats span {
    color: #64748b;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .video-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }

  .action-btn {
    padding: 8px 16px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 30px;
    color: #475569;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    transition: all 0.3s;
  }

  .action-btn:hover {
    background: #e2e8f0;
  }

  .action-btn.active {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .share-dropdown {
    position: relative;
  }

  .share-menu {
    position: absolute;
    bottom: 100%;
    left: 0;
    background: white;
    border-radius: 12px;
    padding: 8px;
    min-width: 150px;
    z-index: 10;
    margin-bottom: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    border: 1px solid #e2e8f0;
  }

  .share-menu button {
    width: 100%;
    padding: 8px 12px;
    background: transparent;
    border: none;
    color: #1e293b;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    border-radius: 8px;
  }

  .share-menu button:hover {
    background: #f1f5f9;
  }

  .video-description {
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
  }

  .video-description p {
    color: #64748b;
    font-size: 13px;
    line-height: 1.5;
  }

  /* Channel Info Bar - Light */
  .channel-info-bar {
    background: white;
    border-radius: 20px;
    padding: 20px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }

  .channel-avatar {
    width: 70px;
    height: 70px;
    border-radius: 50%;
    overflow: hidden;
    background: #f1f5f9;
  }

  .channel-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .channel-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
  }

  .channel-details {
    flex: 1;
  }

  .channel-details h3 {
    color: #1e293b;
    font-size: 18px;
    margin-bottom: 8px;
  }

  .channel-stats {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }

  .channel-stats span {
    color: #64748b;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .channel-details p {
    color: #64748b;
    font-size: 12px;
  }

  .subscribe-btn {
    padding: 10px 24px;
    background: #ff0000;
    border: none;
    border-radius: 30px;
    color: white;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
  }

  .subscribe-btn:hover {
    background: #cc0000;
  }

  /* Search Section - Light */
  .search-section {
    margin-bottom: 24px;
  }

  .search-bar {
    display: flex;
    align-items: center;
    background: white;
    border-radius: 50px;
    padding: 4px 4px 4px 16px;
    border: 1px solid #e2e8f0;
  }

  .search-icon {
    color: #94a3b8;
    font-size: 18px;
  }

  .search-bar input {
    flex: 1;
    padding: 12px;
    background: transparent;
    border: none;
    color: #1e293b;
    font-size: 14px;
    outline: none;
  }

  .search-bar input::placeholder {
    color: #94a3b8;
  }

  .search-btn {
    padding: 8px 24px;
    background: #3b82f6;
    border: none;
    border-radius: 40px;
    color: white;
    font-weight: 500;
    cursor: pointer;
  }

  .search-mode-toggle {
    display: flex;
    gap: 12px;
    margin-top: 12px;
    justify-content: center;
  }

  .mode-btn {
    padding: 6px 20px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 30px;
    color: #64748b;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.3s;
  }

  .mode-btn.active {
    background: #3b82f6;
    border-color: #3b82f6;
    color: white;
  }

  .search-results-info {
    margin-top: 12px;
    padding: 8px 16px;
    background: #f8fafc;
    border-radius: 20px;
    color: #64748b;
    font-size: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 1px solid #e2e8f0;
  }

  .search-results-info button {
    background: transparent;
    border: none;
    color: #3b82f6;
    cursor: pointer;
  }

  /* Videos Section - Light */
  .videos-section {
    background: white;
    border-radius: 24px;
    padding: 24px;
    margin-bottom: 24px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .section-header h3 {
    color: #1e293b;
    font-size: 18px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .video-count {
    color: #64748b;
    font-size: 12px;
  }

  .videos-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
  }

  .video-card {
    background: #f8fafc;
    border-radius: 16px;
    overflow: hidden;
    transition: all 0.3s;
    border: 1px solid #e2e8f0;
  }

  .video-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.1);
    border-color: #3b82f6;
  }

  .video-thumb-wrapper {
    position: relative;
    cursor: pointer;
  }

  .video-thumb-wrapper img {
    width: 100%;
    aspect-ratio: 16/9;
    object-fit: cover;
  }

  .live-badge-grid {
    position: absolute;
    top: 8px;
    left: 8px;
    background: #ef4444;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 600;
    color: white;
  }

  .play-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s;
  }

  .video-thumb-wrapper:hover .play-overlay {
    opacity: 1;
  }

  .play-icon {
    width: 48px;
    height: 48px;
    color: white;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
  }

  .video-card-info {
    padding: 14px;
  }

  .video-title {
    color: #1e293b;
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 6px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .video-channel {
    color: #3b82f6;
    font-size: 11px;
    margin-bottom: 8px;
  }

  .video-card-stats {
    display: flex;
    gap: 12px;
    font-size: 11px;
    color: #64748b;
    margin-bottom: 12px;
  }

  .video-card-stats span {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .video-card-actions {
    display: flex;
    gap: 10px;
    margin-bottom: 8px;
    position: relative;
  }

  .watch-btn {
    flex: 1;
    padding: 6px 12px;
    background: #3b82f6;
    border: none;
    border-radius: 8px;
    color: white;
    font-size: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .share-small-btn {
    padding: 6px 12px;
    background: #e2e8f0;
    border: none;
    border-radius: 8px;
    color: #475569;
    cursor: pointer;
  }

  .share-dropdown-small {
    position: relative;
  }

  .share-menu-small {
    position: absolute;
    bottom: 100%;
    right: 0;
    background: white;
    border-radius: 12px;
    padding: 8px;
    min-width: 140px;
    z-index: 10;
    margin-bottom: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    border: 1px solid #e2e8f0;
  }

  .share-menu-small button {
    width: 100%;
    padding: 6px 10px;
    background: transparent;
    border: none;
    color: #1e293b;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    border-radius: 6px;
  }

  .share-menu-small button:hover {
    background: #f1f5f9;
  }

  .video-date {
    font-size: 10px;
    color: #94a3b8;
  }

  /* Pagination - Light */
  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid #e2e8f0;
  }

  .pagination button {
    padding: 8px 16px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    color: #475569;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
  }

  .pagination button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .page-info {
    color: #64748b;
    font-size: 13px;
  }

  /* No Videos */
  .no-videos {
    text-align: center;
    padding: 60px;
    color: #94a3b8;
  }

  .no-videos button {
    margin-top: 12px;
    padding: 8px 20px;
    background: #3b82f6;
    border: none;
    border-radius: 8px;
    color: white;
    cursor: pointer;
  }

  /* Footer - Light */
  .footer {
    text-align: center;
    padding: 20px;
    border-top: 1px solid #e2e8f0;
  }

  .footer p {
    font-size: 11px;
    color: #94a3b8;
  }

  .creator {
    margin-top: 6px;
    font-size: 10px;
    color: #cbd5e1;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .youtube-content {
      padding: 12px;
    }

    .videos-grid {
      grid-template-columns: 1fr;
    }

    .video-actions {
      gap: 8px;
    }

    .action-btn {
      padding: 6px 12px;
      font-size: 11px;
    }

    .channel-info-bar {
      flex-direction: column;
      text-align: center;
    }

    .video-stats {
      gap: 12px;
    }
  }
`}</style>
    </div>
  );
}

export default UserYoutubeHub;