// frontend/src/pages/admin/YoutubeAnalyticsPage.jsx
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  FiUsers, FiEye, FiVideo, FiThumbsUp, FiMessageCircle, FiShare2,
  FiCalendar, FiClock, FiTrendingUp, FiTrendingDown, FiRefreshCw,
  FiDownload, FiPlay, FiSearch, FiChevronLeft, FiChevronRight, 
  FiBarChart2, FiPieChart, FiMapPin, FiActivity, FiAward, FiStar, FiHeart
} from "react-icons/fi";
import { FaYoutube, FaWhatsapp, FaFacebook, FaTwitter } from "react-icons/fa";
import { Line, Doughnut, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import axios from "axios";
import BASE_URL from "../../api";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function YoutubeAnalyticsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryTab, setCategoryTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [videosPerPage] = useState(10);
  const [chartPeriod, setChartPeriod] = useState("30d");

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  const currentYear = new Date().getFullYear();

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
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

  // Format number with K/M
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Fetch YouTube analytics
  const fetchAnalytics = async () => {
    try {
      setError(null);
      const response = await axios.get(`${BASE_URL}/api/admin/analytics/youtube`, { headers });
      setAnalytics(response.data);
      // Auto-select first video if available
      if (response.data?.topVideos?.length > 0 && !selectedVideo) {
        setSelectedVideo(response.data.topVideos[0]);
      }
    } catch (err) {
      console.error("Error fetching YouTube analytics:", err);
      setError("Failed to load YouTube analytics. Please check API configuration.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh data
  const refreshData = async () => {
    setRefreshing(true);
    await fetchAnalytics();
  };

  // Handle video play (in-page, no modal)
  const handlePlayVideo = (video) => {
    setSelectedVideo(video);
    // Scroll to player smoothly
    document.querySelector('.video-player-section')?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
  };

  // Handle share
  const handleShare = (platform, videoId) => {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const text = `Watch this amazing video from ZUCA!`;
    
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

  // Get all videos (top + recent combined)
  const getAllVideos = () => {
    if (!analytics) return [];
    const topVideos = analytics.topVideos || [];
    const recentVideos = analytics.recentVideos || [];
    // Combine and remove duplicates by id
    const all = [...topVideos, ...recentVideos];
    const unique = Array.from(new Map(all.map(v => [v.id, v])).values());
    return unique;
  };

  // Filter videos based on category and search
  const getFilteredVideos = () => {
    let videos = getAllVideos();
    
    // Filter by category
    if (categoryTab !== 'all') {
      videos = videos.filter(video => {
        const title = video.title.toLowerCase();
        switch(categoryTab) {
          case 'mass':
            return title.includes('mass') || title.includes('eucharist') || title.includes('sunday');
          case 'choir':
            return title.includes('choir') || title.includes('hymn') || title.includes('song') || title.includes('music');
          case 'events':
            return title.includes('event') || title.includes('festival') || title.includes('celebration');
          case 'teachings':
            return title.includes('teaching') || title.includes('sermon') || title.includes('homily');
          case 'live':
            return title.includes('live') || title.includes('stream');
          default:
            return true;
        }
      });
    }
    
    // Filter by search
    if (searchQuery) {
      videos = videos.filter(video => 
        video.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort by views (highest first)
    videos.sort((a, b) => b.views - a.views);
    
    return videos;
  };

  // Prepare chart data
  const prepareViewsChartData = () => {
    const dailyStats = analytics?.viewsOverTime || [];
    const labels = dailyStats.map(d => {
      const date = new Date(d.date);
      return `${date.getMonth()+1}/${date.getDate()}`;
    });
    const viewsData = dailyStats.map(d => d.views);
    
    return {
      labels: labels.slice(-parseInt(chartPeriod === '7d' ? 7 : chartPeriod === '30d' ? 30 : 90)),
      datasets: [{
        label: 'Views',
        data: viewsData.slice(-parseInt(chartPeriod === '7d' ? 7 : chartPeriod === '30d' ? 30 : 90)),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
      }]
    };
  };

  const prepareCategoryChartData = () => {
    const categories = analytics?.categoryDistribution || { Mass: 0, Choir: 0, Events: 0, Teachings: 0, Other: 0 };
    return {
      labels: Object.keys(categories),
      datasets: [{
        data: Object.values(categories),
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'],
        borderWidth: 0,
      }]
    };
  };

  const prepareTrafficChartData = () => {
    const sources = analytics?.trafficSources || { youtubeSearch: 45, suggestedVideos: 32, direct: 15, external: 8 };
    return {
      labels: ['YouTube Search', 'Suggested', 'Direct', 'External'],
      datasets: [{
        data: [sources.youtubeSearch, sources.suggestedVideos, sources.direct, sources.external],
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
        borderRadius: 8,
      }]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { font: { size: 10 } } },
      tooltip: { backgroundColor: '#1e293b', titleColor: '#fff', bodyColor: '#fff' }
    },
    scales: {
      y: { beginAtZero: true, grid: { color: '#e2e8f0' }, ticks: { stepSize: 1, callback: (v) => formatNumber(v) } },
      x: { grid: { display: false } }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10 } }
    },
    cutout: '60%'
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: '#1e293b' }
    },
    scales: {
      y: { beginAtZero: true, grid: { color: '#e2e8f0' }, ticks: { callback: (v) => formatNumber(v) } },
      x: { grid: { display: false } }
    }
  };

  // Pagination
  const filteredVideos = getFilteredVideos();
  const totalPages = Math.ceil(filteredVideos.length / videosPerPage);
  const currentVideos = filteredVideos.slice(
    (currentPage - 1) * videosPerPage,
    currentPage * videosPerPage
  );

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="youtube-loader">
        <div className="loader-spinner">
          <div className="ring"></div>
          <div className="ring"></div>
          <div className="ring"></div>
          <FaYoutube size={40} className="loader-crown" />
        </div>
        <h3>Loading YouTube Analytics</h3>
        <p>Fetching channel data from YouTube API...</p>
        <style>{`
          .youtube-loader {
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
          .ring:nth-child(1) { border-top-color: #ff0000; border-right-color: #ff0000; }
          .ring:nth-child(2) { border-bottom-color: #3b82f6; border-left-color: #3b82f6; animation-delay: -0.5s; width: 60%; height: 60%; top: 20%; left: 20%; }
          .ring:nth-child(3) { border-top-color: #10b981; border-right-color: #10b981; width: 30%; height: 30%; top: 35%; left: 35%; animation-duration: 0.6s; }
          @keyframes spin { 100% { transform: rotate(360deg); } }
          .loader-crown { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); animation: glow 2s ease-in-out infinite; }
          @keyframes glow { 0%,100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); } 50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); } }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-card">
          <FaYoutube size={60} color="#ef4444" />
          <h2>YouTube Analytics Error</h2>
          <p>{error}</p>
          <button onClick={refreshData}>Try Again</button>
          <button onClick={() => navigate('/admin')}>Back to Dashboard</button>
        </div>
        <style>{`
          .error-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #f0f4f8, #e2e8f0); padding: 20px; }
          .error-card { background: white; border-radius: 24px; padding: 40px; text-align: center; max-width: 400px; }
          .error-card h2 { margin: 16px 0 8px; }
          .error-card button { padding: 10px 20px; margin: 0 8px; border: none; border-radius: 10px; cursor: pointer; background: #3b82f6; color: white; }
        `}</style>
      </div>
    );
  }

  const stats = analytics?.stats || {};
  const channel = analytics?.channel || {};
  const insights = analytics?.insights || {};
  const geography = analytics?.geography || {};
  const demographics = analytics?.demographics || {};

  return (
    <div className="youtube-analytics">
      <div className="analytics-content">
        {/* Header */}
        <div className="analytics-header">
          <div className="header-left">
            <div className="channel-info">
              <FaYoutube size={32} color="#ff0000" />
              <div>
                <h1>YouTube Analytics</h1>
                <p className="channel-name">{channel.name || "ZUCA Channel"}</p>
              </div>
            </div>
            <p className="last-synced">Last synced: {analytics?.lastUpdated ? formatRelativeTime(analytics.lastUpdated) : 'Just now'}</p>
          </div>
          <div className="header-right">
            <button className="refresh-btn" onClick={refreshData} disabled={refreshing}>
              <FiRefreshCw className={refreshing ? 'spinning' : ''} />
            </button>
            <button className="export-btn" onClick={() => window.open(`${BASE_URL}/api/admin/analytics/youtube/export`, '_blank')}>
              <FiDownload /> Export
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-icon subscribers"><FiUsers /></div><div className="stat-info"><span className="stat-value">{formatNumber(stats.subscribers || 0)}</span><span className="stat-label">SUBSCRIBERS</span><div className="stat-trend up"><FiTrendingUp /> +{formatNumber(stats.subscribersChange || 0)}</div></div></div>
          <div className="stat-card"><div className="stat-icon views"><FiEye /></div><div className="stat-info"><span className="stat-value">{formatNumber(stats.views || 0)}</span><span className="stat-label">TOTAL VIEWS</span><div className="stat-trend up"><FiTrendingUp /> +{formatNumber(stats.viewsChange || 0)}</div></div></div>
          <div className="stat-card"><div className="stat-icon videos"><FiVideo /></div><div className="stat-info"><span className="stat-value">{stats.videos || 0}</span><span className="stat-label">TOTAL VIDEOS</span><div className="stat-trend up"><FiTrendingUp /> +{stats.videosChange || 0}</div></div></div>
          <div className="stat-card"><div className="stat-icon likes"><FiThumbsUp /></div><div className="stat-info"><span className="stat-value">{formatNumber(stats.likes || 0)}</span><span className="stat-label">TOTAL LIKES</span><div className="stat-trend up"><FiTrendingUp /> +{stats.likesChangePercent || 0}%</div></div></div>
          <div className="stat-card"><div className="stat-icon comments"><FiMessageCircle /></div><div className="stat-info"><span className="stat-value">{formatNumber(stats.comments || 0)}</span><span className="stat-label">COMMENTS</span><div className="stat-trend up"><FiTrendingUp /> +{stats.commentsChangePercent || 0}%</div></div></div>
          <div className="stat-card"><div className="stat-icon shares"><FiShare2 /></div><div className="stat-info"><span className="stat-value">{formatNumber(stats.shares || 0)}</span><span className="stat-label">SHARES</span><div className="stat-trend up"><FiTrendingUp /> +{stats.sharesChangePercent || 0}%</div></div></div>
        </div>

        {/* Charts Row */}
        <div className="charts-row">
          <div className="chart-card large">
            <div className="chart-header">
              <div><h3><FiBarChart2 /> Views Over Time</h3><p>Daily view count</p></div>
              <div className="chart-period">
                <button className={chartPeriod === '7d' ? 'active' : ''} onClick={() => setChartPeriod('7d')}>7D</button>
                <button className={chartPeriod === '30d' ? 'active' : ''} onClick={() => setChartPeriod('30d')}>30D</button>
                <button className={chartPeriod === '90d' ? 'active' : ''} onClick={() => setChartPeriod('90d')}>90D</button>
              </div>
            </div>
            <div className="chart-container large">
              <Line data={prepareViewsChartData()} options={chartOptions} />
            </div>
          </div>
          <div className="chart-card">
            <div className="chart-header"><h3><FiPieChart /> Content Categories</h3></div>
            <div className="chart-container small">
              <Doughnut data={prepareCategoryChartData()} options={doughnutOptions} />
            </div>
          </div>
          <div className="chart-card">
            <div className="chart-header"><h3><FiBarChart2 /> Traffic Sources</h3></div>
            <div className="chart-container small">
              <Bar data={prepareTrafficChartData()} options={barOptions} />
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="filters-bar">
          <div className="category-filters">
            <button className={categoryTab === 'all' ? 'active' : ''} onClick={() => { setCategoryTab('all'); setCurrentPage(1); }}>All Videos</button>
            <button className={categoryTab === 'mass' ? 'active' : ''} onClick={() => { setCategoryTab('mass'); setCurrentPage(1); }}>⛪ Mass Programs</button>
            <button className={categoryTab === 'choir' ? 'active' : ''} onClick={() => { setCategoryTab('choir'); setCurrentPage(1); }}>🎵 Choir</button>
            <button className={categoryTab === 'events' ? 'active' : ''} onClick={() => { setCategoryTab('events'); setCurrentPage(1); }}>📅 Events</button>
            <button className={categoryTab === 'teachings' ? 'active' : ''} onClick={() => { setCategoryTab('teachings'); setCurrentPage(1); }}>📖 Teachings</button>
          </div>
          <div className="search-bar">
            <FiSearch />
            <input type="text" placeholder="Search videos..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
          </div>
        </div>

        {/* Main Two-Column Layout */}
        <div className="two-columns">
          {/* Video Player Section - IN-PAGE (no modal) */}
          <div className="video-player-section">
            <div className="section-header">
              <h3><FiPlay /> Video Player</h3>
              {selectedVideo && <span className="now-playing">Now Playing</span>}
            </div>
            
            {selectedVideo ? (
              <div className="video-player-container">
                <div className="video-wrapper">
                  <iframe
                    src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1&rel=0&modestbranding=1`}
                    title={selectedVideo.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="video-info">
                  <h4>{selectedVideo.title}</h4>
                  <div className="video-stats-row">
                    <div className="stat"><FiEye /> {formatNumber(selectedVideo.views)} views</div>
                    <div className="stat"><FiThumbsUp /> {formatNumber(selectedVideo.likes)} likes</div>
                    <div className="stat"><FiMessageCircle /> {formatNumber(selectedVideo.comments)} comments</div>
                    <div className="stat"><FiTrendingUp /> {selectedVideo.engagement}% engagement</div>
                  </div>
                  <div className="video-description">
                    <p>{selectedVideo.description || "No description available."}</p>
                  </div>
                  <div className="video-actions">
                    <button className="share-btn whatsapp" onClick={() => handleShare('whatsapp', selectedVideo.id)}><FaWhatsapp /> WhatsApp</button>
                    <button className="share-btn facebook" onClick={() => handleShare('facebook', selectedVideo.id)}><FaFacebook /> Facebook</button>
                    <button className="share-btn twitter" onClick={() => handleShare('twitter', selectedVideo.id)}><FaTwitter /> Twitter</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-video-selected">
                <FaYoutube size={64} color="#cbd5e1" />
                <p>Select a video from the list to play</p>
                <span>Click the ▶️ Play button on any video</span>
              </div>
            )}
          </div>

          {/* Engagement Metrics */}
          <div className="metrics-section">
            <div className="metric-card">
              <div className="metric-header"><h4><FiBarChart2 /> Engagement Rate</h4><span className="metric-value positive">{analytics?.engagementRate || 0}%</span></div>
              <div className="metric-trend positive"><FiTrendingUp /> {Math.abs(analytics?.engagementChange || 0)}% from last month</div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${Math.min(100, (analytics?.engagementRate || 0) * 10)}%` }}></div></div>
            </div>
            <div className="metric-card">
              <div className="metric-header"><h4><FiClock /> Avg. Watch Time</h4><span className="metric-value">{analytics?.avgWatchTime || "4:32"}</span></div>
              <div className="metric-trend negative"><FiTrendingDown /> {Math.abs(analytics?.watchTimeChange || 0)}% from last month</div>
            </div>
            <div className="metric-card">
              <div className="metric-header"><h4><FiActivity /> Channel Insights</h4></div>
              <div className="insights-mini">
                <div className="insight-mini"><FiAward /> Best Day: <strong>{insights.bestDay || "Sunday"}</strong></div>
                <div className="insight-mini"><FiClock /> Peak Hour: <strong>{insights.peakHour || "10:00 AM"}</strong></div>
                <div className="insight-mini"><FiStar /> Retention: <strong>{insights.audienceRetention || 62}%</strong></div>
                <div className="insight-mini"><FiHeart /> Top Content: <strong>{insights.bestPerformingCategory || "Mass"}</strong></div>
              </div>
            </div>
          </div>
        </div>

        {/* ALL VIDEOS SECTION - Full list */}
        <div className="videos-section">
          <div className="section-header">
            <h3><FiVideo /> All Videos ({filteredVideos.length})</h3>
            <span className="video-count">Showing {currentVideos.length} of {filteredVideos.length}</span>
          </div>
          
          <div className="videos-grid">
            {currentVideos.length === 0 ? (
              <div className="no-data">No videos found</div>
            ) : (
              currentVideos.map((video) => (
                <div key={video.id} className="video-card" onClick={() => handlePlayVideo(video)}>
                  <div className="video-thumb-wrapper">
                    <img src={video.thumbnail} alt={video.title} className="video-thumb-grid" />
                    <div className="play-overlay">
                      <FiPlay className="play-icon" />
                    </div>
                    <div className="video-duration">{video.durationFormatted || "0:00"}</div>
                  </div>
                  <div className="video-card-info">
                    <h4 className="video-card-title">{video.title}</h4>
                    <div className="video-card-stats">
                      <span><FiEye /> {formatNumber(video.views)}</span>
                      <span><FiThumbsUp /> {formatNumber(video.likes)}</span>
                      <span><FiMessageCircle /> {formatNumber(video.comments)}</span>
                    </div>
                    <div className="video-card-meta">
                      <span className={`engagement-badge ${video.engagement >= 5 ? 'high' : video.engagement >= 3 ? 'medium' : 'low'}`}>
                        {video.engagement}% engagement
                      </span>
                      <span className="video-date">{formatRelativeTime(video.publishedAt)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
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

        {/* Bottom Two-Column Layout */}
        <div className="two-columns bottom">
          <div className="info-card">
            <div className="card-header"><h3><FiMapPin /> Geography & Demographics</h3></div>
            <div className="geography-content">
              <div className="top-countries">
                <h4>Top Countries</h4>
                {geography.topCountries?.map(country => (
                  <div key={country.country} className="country-item">
                    <span className="country-flag">{country.flag || '🌍'}</span>
                    <span className="country-name">{country.country}</span>
                    <div className="country-bar"><div className="country-fill" style={{ width: `${country.percentage}%` }}></div></div>
                    <span className="country-percent">{country.percentage}%</span>
                  </div>
                ))}
              </div>
              <div className="age-distribution">
                <h4>Age Distribution</h4>
                {demographics.ageGroups?.map(age => (
                  <div key={age.age} className="age-item">
                    <span className="age-label">{age.age}</span>
                    <div className="age-bar"><div className="age-fill" style={{ width: `${age.percentage}%`, background: age.color }}></div></div>
                    <span className="age-percent">{age.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="info-card">
            <div className="card-header"><h3><FiActivity /> Upcoming Live Streams</h3></div>
            <div className="upcoming-live">
              {analytics?.upcomingLiveStreams?.length === 0 ? (
                <p className="no-live">No upcoming live streams scheduled</p>
              ) : (
                analytics?.upcomingLiveStreams?.map(stream => (
                  <div key={stream.id} className="live-item">
                    <span className="live-badge">🔴 LIVE</span>
                    <div className="live-info">
                      <strong>{stream.title}</strong>
                      <span>{stream.dateFormatted} at {stream.time}</span>
                    </div>
                    <button className="schedule-btn">Set Reminder</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="footer">
          <p>© {currentYear} ZUCA Portal | YouTube Analytics | Tumsifu Yesu Kristu! 🙏</p>
          <p className="creator">Data from YouTube Data API v3</p>
        </div>
      </div>

      <style>{`
        .youtube-analytics {
          min-height: 100vh;
          background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .analytics-content { max-width: 1600px; margin: 0 auto; padding: 20px; }

        /* Header */
        .analytics-header {
          background: linear-gradient(135deg, #0f172a, #1e293b);
          border-radius: 20px;
          padding: 20px 24px;
          margin-bottom: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }
        .channel-info { display: flex; align-items: center; gap: 16px; }
        .channel-info h1 { color: white; font-size: 22px; margin: 0; }
        .channel-name { color: #94a3b8; font-size: 13px; margin: 4px 0 0; }
        .last-synced { color: #64748b; font-size: 11px; margin-top: 8px; }
        .refresh-btn, .export-btn { padding: 8px 16px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; color: white; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font-size: 13px; }
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid #e2e8f0;
        }
        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
        }
        .stat-icon.subscribers { background: #eff6ff; color: #3b82f6; }
        .stat-icon.views { background: #fef3c7; color: #f59e0b; }
        .stat-icon.videos { background: #d1fae5; color: #10b981; }
        .stat-icon.likes { background: #fce7f3; color: #ec4899; }
        .stat-icon.comments { background: #ede9fe; color: #8b5cf6; }
        .stat-icon.shares { background: #e0f2fe; color: #06b6d4; }
        .stat-info { flex: 1; }
        .stat-value { display: block; font-size: 20px; font-weight: 700; color: #1e293b; }
        .stat-label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-trend { font-size: 9px; display: flex; align-items: center; gap: 2px; margin-top: 4px; }
        .stat-trend.up { color: #10b981; }

        /* Charts Row */
        .charts-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 20px;
          margin-bottom: 24px;
        }
        .chart-card {
          background: white;
          border-radius: 20px;
          padding: 20px;
          border: 1px solid #e2e8f0;
        }
        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .chart-header h3 { font-size: 15px; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 6px; }
        .chart-header p { font-size: 11px; color: #64748b; margin: 0; }
        .chart-period { display: flex; gap: 6px; }
        .chart-period button { padding: 4px 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 11px; cursor: pointer; }
        .chart-period button.active { background: #3b82f6; color: white; border-color: #3b82f6; }
        .chart-container { height: 200px; position: relative; }
        .chart-container.large { height: 220px; }
        .chart-container.small { height: 160px; }

        /* Filters */
        .filters-bar {
          background: white;
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          border: 1px solid #e2e8f0;
        }
        .category-filters { display: flex; gap: 8px; flex-wrap: wrap; }
        .category-filters button { padding: 6px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px; font-size: 12px; cursor: pointer; }
        .category-filters button.active { background: #3b82f6; color: white; }
        .search-bar { display: flex; align-items: center; gap: 8px; background: #f8fafc; padding: 6px 12px; border-radius: 30px; border: 1px solid #e2e8f0; }
        .search-bar input { border: none; background: none; outline: none; font-size: 13px; width: 200px; }

        /* Two Columns */
        .two-columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 24px;
        }

        /* Video Player Section */
        .video-player-section {
          background: white;
          border-radius: 20px;
          padding: 20px;
          border: 1px solid #e2e8f0;
        }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .section-header h3 { font-size: 16px; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 6px; }
        .now-playing { font-size: 11px; background: #d1fae5; color: #10b981; padding: 2px 8px; border-radius: 12px; }
        .video-wrapper { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 12px; background: #000; }
        .video-wrapper iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
        .video-stats-row { display: flex; gap: 16px; flex-wrap: wrap; margin: 12px 0; }
        .video-stats-row .stat { font-size: 13px; color: #64748b; display: flex; align-items: center; gap: 4px; }
        .video-description { font-size: 13px; color: #475569; line-height: 1.5; margin: 12px 0; }
        .video-actions { display: flex; gap: 8px; }
        .share-btn { padding: 6px 12px; border: none; border-radius: 8px; font-size: 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
        .share-btn.whatsapp { background: #25D366; color: white; }
        .share-btn.facebook { background: #1877F2; color: white; }
        .share-btn.twitter { background: #1DA1F2; color: white; }
        .no-video-selected { text-align: center; padding: 60px 20px; color: #94a3b8; }

        /* Metrics Section */
        .metrics-section { display: flex; flex-direction: column; gap: 16px; }
        .metric-card { background: white; border-radius: 20px; padding: 20px; border: 1px solid #e2e8f0; }
        .metric-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .metric-header h4 { font-size: 14px; margin: 0; display: flex; align-items: center; gap: 6px; }
        .metric-value { font-size: 24px; font-weight: 700; }
        .metric-value.positive { color: #10b981; }
        .metric-trend { font-size: 12px; display: flex; align-items: center; gap: 4px; margin-bottom: 12px; }
        .metric-trend.positive { color: #10b981; }
        .metric-trend.negative { color: #ef4444; }
        .progress-bar { height: 6px; background: #e2e8f0; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #3b82f6, #8b5cf6); border-radius: 10px; }
        .insights-mini { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .insight-mini { font-size: 12px; color: #64748b; display: flex; align-items: center; gap: 6px; }
        .insight-mini strong { color: #1e293b; }

        /* Videos Grid - Card Layout */
        .videos-section {
          background: white;
          border-radius: 20px;
          padding: 20px;
          margin-bottom: 24px;
          border: 1px solid #e2e8f0;
        }
        .video-count { font-size: 12px; color: #64748b; }
        .videos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }
        .video-card {
          background: #f8fafc;
          border-radius: 16px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.3s;
          border: 1px solid #e2e8f0;
        }
        .video-card:hover { transform: translateY(-4px); box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
        .video-thumb-wrapper { position: relative; }
        .video-thumb-grid { width: 100%; height: 180px; object-fit: cover; }
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
        .video-card:hover .play-overlay { opacity: 1; }
        .play-icon { width: 48px; height: 48px; color: white; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); }
        .video-duration {
          position: absolute;
          bottom: 8px;
          right: 8px;
          background: rgba(0,0,0,0.7);
          color: white;
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .video-card-info { padding: 12px; }
        .video-card-title {
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 8px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .video-card-stats { display: flex; gap: 12px; font-size: 11px; color: #64748b; margin-bottom: 8px; }
        .video-card-stats span { display: flex; align-items: center; gap: 4px; }
        .video-card-meta { display: flex; justify-content: space-between; align-items: center; }
        .engagement-badge { font-size: 10px; padding: 2px 8px; border-radius: 12px; font-weight: 500; }
        .engagement-badge.high { background: #d1fae5; color: #10b981; }
        .engagement-badge.medium { background: #fef3c7; color: #f59e0b; }
        .engagement-badge.low { background: #fee2e2; color: #ef4444; }
        .video-date { font-size: 10px; color: #94a3b8; }

        /* Pagination */
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-top: 24px;
        }
        .pagination button {
          padding: 6px 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
        .page-info { font-size: 13px; color: #64748b; }

        /* Info Cards */
        .info-card { background: white; border-radius: 20px; padding: 20px; border: 1px solid #e2e8f0; }
        .card-header { margin-bottom: 16px; }
        .card-header h3 { font-size: 16px; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 8px; }
        .geography-content { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .top-countries h4, .age-distribution h4 { font-size: 13px; margin-bottom: 12px; color: #64748b; }
        .country-item, .age-item { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; font-size: 12px; }
        .country-flag { font-size: 16px; }
        .country-name { width: 80px; }
        .country-bar, .age-bar { flex: 1; height: 6px; background: #e2e8f0; border-radius: 10px; overflow: hidden; }
        .country-fill, .age-fill { height: 100%; background: #3b82f6; border-radius: 10px; }
        .country-percent, .age-percent { width: 40px; text-align: right; }

        .upcoming-live h4 { font-size: 14px; margin: 0 0 12px; }
        .live-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: #fef2f2; border-radius: 12px; margin-bottom: 8px; }
        .live-badge { font-size: 10px; background: #ef4444; color: white; padding: 2px 6px; border-radius: 4px; }
        .live-info { flex: 1; }
        .live-info strong { display: block; font-size: 13px; }
        .live-info span { font-size: 10px; color: #64748b; }
        .schedule-btn { padding: 4px 10px; background: white; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 11px; cursor: pointer; }
        .no-live { text-align: center; padding: 20px; color: #94a3b8; font-size: 12px; }

        /* Footer */
        .footer { text-align: center; padding: 20px; margin-top: 24px; border-top: 1px solid #e2e8f0; }
        .footer p { font-size: 10px; color: #94a3b8; margin: 2px 0; }
        .creator { font-size: 9px; color: #cbd5e1; }
        .no-data { text-align: center; padding: 40px; color: #94a3b8; }

        /* Responsive */
        @media (max-width: 1200px) {
          .stats-grid { grid-template-columns: repeat(3, 1fr); }
          .charts-row { grid-template-columns: 1fr; }
          .chart-container.large { height: 250px; }
          .chart-container.small { height: 200px; }
        }
        @media (max-width: 992px) {
          .two-columns { grid-template-columns: 1fr; }
          .geography-content { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .analytics-content { padding: 16px; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .category-filters { overflow-x: auto; padding-bottom: 8px; flex-wrap: nowrap; }
          .category-filters button { white-space: nowrap; }
          .search-bar { width: 100%; }
          .search-bar input { width: 100%; }
          .filters-bar { flex-direction: column; }
          .videos-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: 1fr; }
          .stat-value { font-size: 18px; }
        }
      `}</style>
    </div>
  );
}

export default YoutubeAnalyticsPage;