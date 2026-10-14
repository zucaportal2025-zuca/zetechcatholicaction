// frontend/src/pages/admin/AdminDashboard.jsx
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiUsers, FiBell, FiMusic, FiDollarSign, FiUserCheck, 
  FiCalendar, FiMessageCircle, FiActivity, FiTrash2, 
  FiEdit2, FiClock, FiCheckCircle, FiRefreshCw,
  FiArrowUp, FiArrowDown, FiGrid, FiImage, FiHome,
  FiLogOut, FiSettings, FiEye, FiTrendingUp, FiPieChart,
  FiBarChart2, FiFileText, FiMail,
  FiPlusCircle, FiArrowRight
} from "react-icons/fi";
import { RiAdminLine, RiFileWarningLine } from "react-icons/ri";
import { useNavigate } from "react-router-dom"; 
import { FaDonate, FaCog, FaUsers, FaChurch, FaWhatsapp, FaChartLine, FaCapsules, FaClock, FaAccessibleIcon, FaReply, FaReplyAll, FaUniversity, FaUserTie, FaHands, FaHistory } from "react-icons/fa";
import { GiPrayer, GiCrown } from "react-icons/gi";
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
import io from "socket.io-client";
import BASE_URL from "../../api";
import { set } from "date-fns";

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

function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState("");
   const storedUser = JSON.parse(localStorage.getItem("user"));
         const user = storedUser || {};

  
  // REAL DATA STATES
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAnnouncements: 0,
    totalPrograms: 0,
    totalMessages: 0,
    totalPledged: 0,
    totalPaid: 0,
    totalPending: 0,
    activeJumuia: 0,
    onlineUsers: 0,
    recentUsers: 0,
    upcomingEvents: 0,
    completedPledges: 0,
    pendingPledges: 0,
    totalContributions: 0,
    totalSongs: 0,
    totalMedia: 0,
    unreadNotifications: 0
  });

  // Health data states
const [errors, setErrors] = useState([]);
const [slowRequests, setSlowRequests] = useState([]);
const [services, setServices] = useState(null);
const [failedLogins, setFailedLogins] = useState([]);
const [onlineUsers, setOnlineUsers] = useState(0);
  
  const [recentUsers, setRecentUsers] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [executiveTeam, setExecutiveTeam] = useState([]);
  const [systemHealth, setSystemHealth] = useState({
    database: "Connected",
    api: "Online",
    storage: 0,
    lastBackup: null
  });
  
  // Chart data states
  // Chart data states
  const [userGrowthData, setUserGrowthData] = useState({ months: [], counts: [] });
  const [pledgeChartData, setPledgeChartData] = useState(null);
  const [categoryChartData, setCategoryChartData] = useState(null);
  const [systemHealthData, setSystemHealthData] = useState({ labels: [], scores: [], errors: [] });
  
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  //adverts
  const [advertisements, setAdvertisements] = useState([]);
  
 
    // ===== CACHING SYSTEM =====
  const CACHE_KEY = 'dashboard_cache';
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  let isRefreshing = false; 

  // Get cached data
  const getCachedData = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      const data = JSON.parse(cached);
      if (Date.now() - data.timestamp < CACHE_DURATION) {
        return data;
      }
      return null;
    } catch {
      return null;
    }
  };

  // Save data to cache
  const saveToCache = (data) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        ...data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Cache save error:', error);
    }
  };

  // Apply cached data to state
  const applyCachedData = (cached) => {
    if (!cached) return false;
    
    console.log('📦 Loading from cache...');
    
    setStats(cached.stats);
    setErrors(cached.errors || []);
    setSlowRequests(cached.slowRequests || []);
    setServices(cached.services || {});
    setFailedLogins(cached.failedLogins || []);
    setUserGrowthData(cached.userGrowthData || { months: [], counts: [] });
    setPledgeChartData(cached.pledgeChartData);
    setCategoryChartData(cached.categoryChartData);
    setSystemHealthData(cached.systemHealthData || { labels: [], scores: [], errors: [] });
    setRecentUsers(cached.recentUsers || []);
    setPendingApprovals(cached.pendingApprovals || []);
    setRecentActivities(cached.recentActivities || []);
    setExecutiveTeam(cached.executiveTeam || []);
    setSystemHealth(cached.systemHealth || { database: "Connected", api: "Online", storage: 45, lastBackup: null });
    setOnlineUsers(cached.onlineUsers || 0);
    
    return true;
  };
         

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  const currentYear = new Date().getFullYear();

  // Format date
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
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

  // Calculate user growth for chart
  const calculateUserGrowth = (usersList) => {
    const now = new Date();
    const months = [];
    const counts = [];
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = month.toLocaleString('default', { month: 'short' });
      months.push(monthName);
      
      const count = usersList.filter(user => {
        const createdAt = new Date(user.createdAt);
        return createdAt.getMonth() === month.getMonth() && 
               createdAt.getFullYear() === month.getFullYear();
      }).length;
      
      counts.push(count);
    }
    
    return { months, counts };
  };

  // Calculate health score
const calculateHealthScore = () => {
  let score = 100;
  
  // Deduct for errors
  if (errors.length > 50) score -= 20;
  else if (errors.length > 20) score -= 10;
  else if (errors.length > 5) score -= 5;
  
  // Deduct for slow requests
  if (slowRequests.length > 20) score -= 15;
  else if (slowRequests.length > 10) score -= 8;
  else if (slowRequests.length > 5) score -= 3;
  
  // Deduct for down services
  const downServices = services ? Object.values(services).filter(s => s.status === 'down').length : 0;
  score -= downServices * 10;
  
  // Deduct for failed logins
  if (failedLogins.length > 20) score -= 10;
  else if (failedLogins.length > 10) score -= 5;
  
  return Math.max(0, Math.min(100, score));
};

  // Fetch REAL data from backend
 const fetchDashboardData = async (forceRefresh = false) => {
  // ===== START TIMER =====
  const startTime = performance.now();
  console.log('⏱️ Dashboard data fetch started...');
  
  try {
    setError(null);
    
    // ===== CHECK CACHE FIRST (unless force refresh) =====
if (!forceRefresh) {
  const cached = getCachedData();
  if (cached && applyCachedData(cached)) {
    setLoading(false);
    console.log(`✅ Dashboard loaded from cache (${new Date(cached.timestamp).toLocaleTimeString()})`);
    
    // Still fetch in background to update cache (only if not already refreshing)
    if (!isRefreshing) {
      isRefreshing = true;
      setTimeout(() => {
        console.log('🔄 Background refresh starting...');
        fetchDashboardData(true).finally(() => {
          isRefreshing = false;
        });
      }, 100);
    }
    return;
  }
}
    
    console.log('🔄 Fetching fresh data...');
    
    // ===== FETCH ALL DATA IN PARALLEL =====
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    
    // ===== START API CALLS TIMER =====
    const apiStartTime = performance.now();
    
    const [
      usersRes,
      errorsRes,
      slowRes,
      servicesRes,
      failedRes,
      announcementsRes,
      programsRes,
      contributionsRes,
      songsRes,
      mediaRes,
      notificationsRes,
      execRes,
      pendingSongsRes,
      advertisementsRes
    ] = await Promise.all([
      axios.get(`${BASE_URL}/api/users`, { headers }).catch(() => ({ data: [] })),
      axios.get(`${BASE_URL}/api/admin/health/errors?limit=50`, { headers }).catch(() => ({ data: { errors: [] } })),
      axios.get(`${BASE_URL}/api/admin/health/slow-requests?limit=20`, { headers }).catch(() => ({ data: { requests: [] } })),
      axios.get(`${BASE_URL}/api/admin/health/services`, { headers }).catch(() => ({ data: { services: {} } })),
      axios.get(`${BASE_URL}/api/admin/health/failed-logins`, { headers }).catch(() => ({ data: { attempts: [] } })),
      axios.get(`${BASE_URL}/api/announcements`, { headers }).catch(() => ({ data: [] })),
      axios.get(`${BASE_URL}/api/mass-programs`, { headers }).catch(() => ({ data: [] })),
      axios.get(`${BASE_URL}/api/contribution-types`, { headers }).catch(() => ({ data: [] })),
      axios.get(`${BASE_URL}/api/songs`, { headers }).catch(() => ({ data: { songs: [], total: 0 } })),
      axios.get(`${BASE_URL}/api/media/public?limit=1`, { headers }).catch(() => ({ data: { media: [] } })),
      axios.get(`${BASE_URL}/api/notifications/${userData.id}`, { headers }).catch(() => ({ data: [] })),
      axios.get(`${BASE_URL}/api/executive/team`).catch(() => ({ data: { executives: [] } })),
      axios.get(`${BASE_URL}/api/admin/pending-songs`, { headers }).catch(() => ({ data: [] })),
axios.get(`${BASE_URL}/api/advertisements`, { headers }).catch(() => ({ data: [] }))
      
    ]);

    // ===== API CALLS COMPLETE =====
    const apiEndTime = performance.now();
    console.log(`✅ API calls completed in: ${(apiEndTime - apiStartTime).toFixed(2)}ms (${((apiEndTime - apiStartTime) / 1000).toFixed(2)}s)`);
    
    // Log individual API response sizes
    console.log('📊 API Response Summary:', {
      users: usersRes.data?.length || 0,
      errors: errorsRes.data?.errors?.length || 0,
      slow: slowRes.data?.requests?.length || 0,
      announcements: announcementsRes.data?.length || 0,
      programs: programsRes.data?.length || 0,
      contributions: contributionsRes.data?.length || 0,
      songs: songsRes.data?.songs?.length || 0,
      media: mediaRes.data?.media?.length || 0,
      notifications: notificationsRes.data?.length || 0,
      executives: execRes.data?.executives?.length || 0,
      pendingSongs: pendingSongsRes.data?.length || 0,
    });

    // Extract all data
    const usersList = usersRes.data || [];
    const errorsList = errorsRes.data.errors || [];
    const slowList = slowRes.data.requests || [];
    const servicesList = servicesRes.data.services || {};
    const failedList = failedRes.data.attempts || [];
    const announcementsList = announcementsRes.data || [];
    const programsList = programsRes.data || [];
    const contributionsList = contributionsRes.data || [];
    const songsList = songsRes.data?.songs || [];
    const mediaList = mediaRes.data?.media || [];
    const notificationsList = notificationsRes.data || [];
    const execList = execRes.data?.executives || [];
    const pendingSongsList = pendingSongsRes.data || [];
    const advertisementsList = advertisementsRes.data || [];
   setAdvertisements(advertisementsList); 

    // ===== START PROCESSING TIMER =====
    const processStartTime = performance.now();

    // Set health states
    setErrors(errorsList);
    setSlowRequests(slowList);
    setServices(servicesList);
    setFailedLogins(failedList);

    // ===== GENERATE HEALTH TREND DATA =====
    const healthLabels = [];
    const healthScores = [];
    const healthErrors = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { weekday: 'short' });
      healthLabels.push(dateStr);
      
      const dayErrors = errorsList.filter(e => {
        const errorDate = new Date(e.timestamp);
        return errorDate.toDateString() === date.toDateString();
      });
      
      healthErrors.push(dayErrors.length);
      
      let dayScore = 100;
      if (dayErrors.length > 10) dayScore -= 30;
      else if (dayErrors.length > 5) dayScore -= 20;
      else if (dayErrors.length > 2) dayScore -= 10;
      else if (dayErrors.length > 0) dayScore -= 5;
      
      const daySlow = slowList.filter(s => {
        const slowDate = new Date(s.timestamp);
        return slowDate.toDateString() === date.toDateString();
      });
      if (daySlow.length > 5) dayScore -= 10;
      else if (daySlow.length > 2) dayScore -= 5;
      
      healthScores.push(Math.max(0, Math.min(100, dayScore)));
    }

    setSystemHealthData({
      labels: healthLabels,
      scores: healthScores,
      errors: healthErrors
    });

    // Calculate unread notifications
    const unreadNotif = notificationsList.filter(n => !n.read).length;
    
    // Calculate stats
    const onlineCount = usersList.filter(u => u.online).length;
    const activeJumuia = new Set(usersList.filter(u => u.jumuiaId).map(u => u.jumuiaId)).size;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentCount = usersList.filter(u => new Date(u.createdAt) >= sevenDaysAgo).length;
    const upcomingCount = programsList.filter(p => new Date(p.date) >= new Date()).length;
    
    // Calculate pledge stats
    let totalPledged = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let completedPledges = 0;
    let pendingPledgesCount = 0;
    
    contributionsList.forEach(c => {
      if (c.pledges) {
        c.pledges.forEach(p => {
          totalPledged += (p.amountPaid || 0) + (p.pendingAmount || 0);
          totalPaid += (p.amountPaid || 0);
          totalPending += (p.pendingAmount || 0);
          if (p.status === "COMPLETED" || (p.amountPaid >= c.amountRequired)) {
            completedPledges++;
          }
          if (p.status === "PENDING" && p.pendingAmount > 0) {
            pendingPledgesCount++;
          }
        });
      }
    });
    
    const newStats = {
      totalUsers: usersList.length,
      totalAnnouncements: announcementsList.length,
      totalPrograms: programsList.length,
      totalMessages: 0,
      totalPledged,
      totalPaid,
      totalPending,
      activeJumuia,
      onlineUsers: onlineCount,
      recentUsers: recentCount,
      upcomingEvents: upcomingCount,
      completedPledges,
      pendingPledges: pendingPledgesCount,
      totalContributions: contributionsList.length,
      totalSongs: songsList.length,
      totalMedia: mediaList.length || 0,
      unreadNotifications: unreadNotif
    };

    setStats(newStats);

    // Calculate user growth for chart
    const growth = calculateUserGrowth(usersList);
    setUserGrowthData(growth);
    
    // Prepare pledge chart data
    const pledgeData = {
      labels: ['Total Pledged', 'Total Paid', 'Total Pending'],
      datasets: [{
        data: [totalPledged, totalPaid, totalPending],
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'],
        borderWidth: 0,
        borderRadius: 10
      }]
    };
    setPledgeChartData(pledgeData);
    
    // Prepare category chart data
    const categoryData = {
      labels: ['Users', 'Announcements', 'Programs', 'Songs', 'Contributions'],
      datasets: [{
        label: 'Count',
        data: [usersList.length, announcementsList.length, programsList.length, songsList.length, contributionsList.length],
        backgroundColor: ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ec4899'],
        borderRadius: 8
      }]
    };
    setCategoryChartData(categoryData);
    
    // Set recent users (last 5)
    const sortedUsers = [...usersList].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setRecentUsers(sortedUsers.slice(0, 5));
    
    // Set executive team summary
    setExecutiveTeam(execList.slice(0, 5));
    
    // Generate pending approvals from real data
    const pending = [];
    
    // Pending pledges
    contributionsList.forEach(c => {
      if (c.pledges) {
        c.pledges.filter(p => p.status === "PENDING" && p.pendingAmount > 0).slice(0, 2).forEach(p => {
          pending.push({
            id: `pledge-${p.id}`,
            type: 'pledge',
            icon: '💰',
            title: `Pledge: ${c.title}`,
            description: `${p.user?.fullName || 'Someone'} - KES ${p.pendingAmount?.toLocaleString()}`,
            amount: p.pendingAmount,
            user: p.user,
            action: 'approve'
          });
        });
      }
    });
    
    // Pending songs (if any)
    (pendingSongsList || []).slice(0, 2).forEach(s => {
      pending.push({
        id: `song-${s.id}`,
        type: 'song',
        icon: '🎵',
        title: `New Song: "${s.title}"`,
        description: `Submitted by Choir`,
        action: 'approve_song'
      });
    });
    
    setPendingApprovals(pending.slice(0, 3));
    
    // Generate recent activities from real data
    const activities = [];
    
    // Recent user joins
    sortedUsers.slice(0, 3).forEach(u => {
      if (u.createdAt) {
        activities.push({
          id: `user-${u.id}`,
          type: 'user',
          icon: '🟢',
          text: `User ${u.fullName} joined ZUCA`,
          time: u.createdAt
        });
      }
    });
    
    // Recent announcements
    announcementsList.slice(0, 2).forEach(a => {
      if (a.createdAt) {
        activities.push({
          id: `ann-${a.id}`,
          type: 'announcement',
          icon: '📢',
          text: `New announcement "${a.title}" posted`,
          time: a.createdAt
        });
      }
    });
    
    // Recent pledges
    contributionsList.forEach(c => {
      if (c.pledges) {
        c.pledges.filter(p => p.createdAt).slice(0, 2).forEach(p => {
          activities.push({
            id: `pledge-${p.id}`,
            type: 'pledge',
            icon: '💰',
            text: `${p.user?.fullName || 'Someone'} pledged KES ${(p.pendingAmount || 0).toLocaleString()} for ${c.title}`,
            time: p.createdAt
          });
        });
      }
    });
    
    // Sort and set
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    setRecentActivities(activities.slice(0, 6));
    
    // System health
    const healthStatus = {
      database: "Connected",
      api: "Online",
      storage: 45,
      lastBackup: new Date(Date.now() - 2 * 60 * 60 * 1000)
    };
    setSystemHealth(healthStatus);

    // ===== PROCESSING COMPLETE =====
    const processEndTime = performance.now();
    console.log(`⚙️ Data processing took: ${(processEndTime - processStartTime).toFixed(2)}ms`);
    
    // ===== SAVE TO CACHE =====
    const cacheData = {
      stats: newStats,
      errors: errorsList,
      slowRequests: slowList,
      services: servicesList,
      failedLogins: failedList,
      userGrowthData: growth,
      pledgeChartData: pledgeData,
      categoryChartData: categoryData,
      systemHealthData: { labels: healthLabels, scores: healthScores, errors: healthErrors },
      recentUsers: sortedUsers.slice(0, 5),
      pendingApprovals: pending.slice(0, 3),
      recentActivities: activities.slice(0, 6),
      executiveTeam: execList.slice(0, 5),
      systemHealth: healthStatus,
      onlineUsers: onlineCount
    };
    
    saveToCache(cacheData);
    console.log('💾 Data saved to cache');
    
    // ===== TOTAL TIME =====
    const totalEndTime = performance.now();
    console.log(`🏁 TOTAL dashboard load time: ${(totalEndTime - startTime).toFixed(2)}ms (${((totalEndTime - startTime) / 1000).toFixed(2)}s)`);
    console.log(`📊 Breakdown:`);
    console.log(`   - API calls: ${(apiEndTime - apiStartTime).toFixed(2)}ms (${((apiEndTime - apiStartTime) / 1000).toFixed(2)}s)`);
    console.log(`   - Processing: ${(processEndTime - processStartTime).toFixed(2)}ms`);
    console.log(`   - Total: ${(totalEndTime - startTime).toFixed(2)}ms`);
    
  } catch (err) {
    console.error("Error fetching admin data:", err);
    setError("Failed to load dashboard data");
  } finally {
    setLoading(false);
  }
};

  // Socket connection for real-time updates
  useEffect(() => {
    const socket = io(BASE_URL);
    
    socket.on('connect', () => {
      console.log('Admin dashboard connected');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.id) socket.emit('join', user.id);
    });
    
    socket.on('online_members', (data) => {
      setStats(prev => ({ ...prev, onlineUsers: data.count }));
    });
    
    socket.on('new_notification', () => {
      fetchDashboardData();
    });
    
    socket.on('new_user', () => {
      fetchDashboardData();
    });
    
    return () => socket.disconnect();
  }, []);
  
  // Initial fetch
  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    
    fetchDashboardData();
    
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 16) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
    
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, [token]);
  
  const refreshData = async () => {
  setRefreshing(true);
  await fetchDashboardData(true); // Force refresh
  setRefreshing(false);
};
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };
  
  const handleDeleteUser = async (id) => {
    if (!window.confirm("Delete this user permanently?")) return;
    try {
      await axios.delete(`${BASE_URL}/api/users/${id}`, { headers });
      fetchDashboardData();
    } catch (err) {
      alert("Failed to delete user");
    }
  };
  
  const handleRoleChange = async (id, newRole) => {
    try {
      await axios.put(`${BASE_URL}/api/users/${id}/role`, { role: newRole }, { headers });
      fetchDashboardData();
    } catch (err) {
      alert("Failed to update role");
    }
  };
  
  // Chart options
  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { font: { size: 11 } } },
      tooltip: { backgroundColor: '#1e293b', titleColor: '#fff', bodyColor: '#fff' }
    },
    scales: {
      y: { beginAtZero: true, grid: { color: '#e2e8f0' }, ticks: { stepSize: 1 } },
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
      y: { beginAtZero: true, grid: { color: '#e2e8f0' }, ticks: { stepSize: 1 } },
      x: { grid: { display: false } }
    }
  };
  
  
  return (
    <div className="admin-dashboard">
      <div className="admin-content">
        {/* Header */}
        <div className="admin-header">
          <div className="header-left">
           <h1 className="greeting">
  {greeting},{" "}
  <span className="admin-name">
    {user.name || user.fullName?.split(" ")[0] || "Admin"}
  </span>{" "}
  Welcome to{" "}
  <span className="admin-name portal-name">(ZUCA) Portal</span>{" "}
  <span className="control-panel">System Control Panel 😊</span>

  <span className="wave"></span>
</h1>

<p className="date">{formatDate(currentTime)}</p>
          </div>
          <div className="header-right">
            <button className="refresh-btn" onClick={refreshData} disabled={refreshing}>
              <FiRefreshCw className={refreshing ? 'spinning' : ''} />
            </button>
            <div className="admin-badge">
              <RiAdminLine size={24} color="#ffffff" className="admin-icon" />
              <div className="admin-info">
                <span className="admin-title">ZUCA SYSTEM</span>
                <span className="admin-status">Online</span>
              </div>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <FiLogOut /> Exit
            </button>
          </div>
        </div>
        
        {/* Stats Grid - 6 columns */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon users"><FaUsers /></div>
            <div className="stat-info">
              <span className="stat-value">{stats.totalUsers}</span>
              <span className="stat-label">TOTAL USERS</span>
              <div className="stat-trend"><FiArrowUp /> +{stats.recentUsers} this week</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon announcements"><FiBell /></div>
            <div className="stat-info">
              <span className="stat-value">{stats.totalAnnouncements}</span>
              <span className="stat-label">ANNOUNCEMENTS</span>
              <div className="stat-trend"><FiArrowUp /> +5 this month</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon pledges"><FaHands /></div>
            <div className="stat-info">
              <span className="stat-value">KES {stats.totalPledged.toLocaleString()}</span>
              <span className="stat-label">TOTAL PLEDGES</span>
              <div className="stat-trend"><FiArrowUp /> +8%</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon programs"><GiPrayer /></div>
            <div className="stat-info">
              <span className="stat-value">{stats.totalPrograms}</span>
              <span className="stat-label">MASS PROGRAMS</span>
              <div className="stat-trend"><FiArrowUp /> +{stats.upcomingEvents} upcoming</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon hymns"><FiMusic /></div>
            <div className="stat-info">
              <span className="stat-value">{stats.totalSongs}</span>
              <span className="stat-label">HYMNS</span>
              <div className="stat-trend"><FiArrowUp /> +12 added</div>
              
            </div>
          </div>
            {/* ===== COUNTDOWN CARD ===== */}
  <div className="stat-card" onClick={() => navigate('/admin/countdown-settings')} style={{ cursor: 'pointer' }}>
    <div className="stat-icon countdown"><FiClock /></div>
    <div className="stat-info">
      <span className="stat-value">⏰</span>
      <span className="stat-label">Manage Countdown</span>
      <div className="stat-trend">⚙️ Configure</div>
        </div>
        </div>
        </div>





        {/* ============================================
            ADVERTISEMENT MANAGEMENT CARD
        ============================================ */}
        <div className="advertisement-dashboard-card">
          <div className="advertisement-card-header">
            <div className="advertisement-card-title">
              <div className="advertisement-icon">
                <FiImage />
              </div>

              <div>
                <h3>ADVERTISEMENT MANAGEMENT</h3>
                <p>Manage what is currently being promoted on the portal</p>
              </div>
            </div>

            <button
              className="advertisement-manage-btn"
              onClick={() => navigate('/admin/advertisements')}
            >
              Manage Advertisements
              <FiArrowRight />
            </button>
          </div>

          {advertisements.length === 0 ? (
            <div className="advertisement-empty">
              <FiImage size={40} />
              <div>
                <h4>No advertisements available</h4>
                <p>Create an advertisement to display it across the portal.</p>
              </div>

              <button
                className="advertisement-create-btn"
                onClick={() => navigate('/admin/advertisements')}
              >
                + Create Advertisement
              </button>
            </div>
          ) : (
            <div className="advertisement-preview">
              {advertisements
                .filter(ad => ad.active)
                .slice(0, 1)
                .map(ad => (
                  <div className="advertisement-current" key={ad.id}>

                    {/* Advertisement Image */}
                    <div className="advertisement-image-wrapper">
                      {ad.image ? (
                        <img
                          src={ad.image}
                          alt={ad.title || 'Advertisement'}
                          className="advertisement-image"
                        />
                      ) : (
                        <div className="advertisement-no-image">
                          <FiImage size={42} />
                          <span>No Image</span>
                        </div>
                      )}

                      <span className="advertisement-status active">
                        ● ACTIVE
                      </span>
                    </div>

                    {/* Advertisement Information */}
                    <div className="advertisement-details">
                      <div className="advertisement-details-top">
                        <span className="advertisement-label">
                          CURRENT ADVERTISEMENT
                        </span>

                        <span className="advertisement-id">
                          AD #{ad.id}
                        </span>
                      </div>

                      <h2>
                        {ad.title || 'Untitled Advertisement'}
                      </h2>

                      <p className="advertisement-description">
                        {ad.description ||
                          'No description provided for this advertisement.'}
                      </p>

                      <div className="advertisement-meta">
                        <div>
                          <FiCalendar />
                          <span>
                            Starts:{' '}
                            {ad.startDate
                              ? new Date(ad.startDate).toLocaleDateString()
                              : 'N/A'}
                          </span>
                        </div>

                        <div>
                          <FiClock />
                          <span>
                            Ends:{' '}
                            {ad.endDate
                              ? new Date(ad.endDate).toLocaleDateString()
                              : 'N/A'}
                          </span>
                        </div>
                      </div>

                      <div className="advertisement-card-footer">
                        <span className="advertisement-live">
                          <span className="live-dot"></span>
                          Currently Active
                        </span>

                        <button
                          className="advertisement-edit-btn"
                          onClick={() =>
                            navigate('/admin/advertisements')
                          }
                        >
                          View & Manage
                          <FiArrowRight />
                        </button>
                      </div>
                    </div>

                  </div>
                ))}

              {/* No active advertisement */}
              {advertisements.filter(ad => ad.active).length === 0 && (
                <div className="advertisement-empty">
                  <FiImage size={40} />

                  <div>
                    <h4>No active advertisement</h4>
                    <p>
                      You have advertisements available, but none are
                      currently active.
                    </p>
                  </div>

                  <button
                    className="advertisement-create-btn"
                    onClick={() =>
                      navigate('/admin/advertisements')
                    }
                  >
                    Manage Advertisements
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

     



         {/* Quick Actions */}
        <div className="quick-actions-section">
          <div className="section-header">
            <h3>QUICK ACTIONS</h3>
          </div>
        
<div className="actions-grid">
  <button className="action-btn" onClick={() => navigate('/admin/minutes')}><FiFileText /> Meeting Minutes</button>
  <button className="action-btn" onClick={() => navigate('/admin/attendance/overview')}>
  <FiBarChart2 /> Attendance sheet
</button>
<button className="action-btn" onClick={() => navigate('/admin/attendance/overview')}>
  <FiBarChart2 /> Ateendance Monitor 
</button>
  
  <button className="action-btn" onClick={() => navigate('/admin/users')}><FiUsers /> Users Management</button>
  <button className="action-btn" onClick={() => navigate('/admin/announcements')}><FiBell /> Announcements</button>
  <button className="action-btn" onClick={() => navigate('/admin/mass-programs')}><GiPrayer /> Mass Programs</button>
  <button className="action-btn" onClick={() => navigate('/admin/contributions')}><FaDonate /> Pledges Management</button>
  <button className="action-btn" onClick={() => navigate('/admin/songs')}><FiMusic /> Hymns Management</button>
  <button className="action-btn" onClick={() => navigate('/admin/gallery')}><FiImage /> Gallery Management</button>
  <button className="action-btn" onClick={() => navigate('/executive')}><FaUserTie /> Executive Team</button>

  <button className="action-btn" onClick={() => navigate('/liturgical-calendar')}><FiCalendar /> Calendar Admin</button>
  <button className="action-btn" onClick={() => navigate('/admin/prayers')}><GiPrayer /> Prayer Management</button> {/* ← ADD THIS */}
<button className="action-btn" onClick={() => navigate('/admin/chat')}>
  <FiMessageCircle size={18} /> Admin Chat
</button>
<button className="action-btn" onClick={() => navigate('/admin/bank-payments')}>
  <FaUniversity /> Bank Payments
</button>
<button className="action-btn" onClick={() => navigate('/admin/health-centre')}>
  <FiSettings size={18} /> System Analysis
</button>
<button className="action-btn" onClick={() => navigate('/admin/countdown-settings')}>
  <FiClock /> Countdown Settings
</button>
</div>
        </div>
        
        
       {/* CHARTS SECTION - 4 CHARTS IN 2x2 GRID */}
<div className="charts-section">
  {/* Chart 1: User Growth */}
  <div className="chart-card">
    <div className="chart-header">
      <div>
        <h3><FaChartLine /> User Growth</h3>
        <p>Last 6 months</p>
      </div>
      <FiTrendingUp size={20} />
    </div>
    <div className="chart-container">
      {userGrowthData.counts?.some(v => v > 0) ? (
        <Line data={{
          labels: userGrowthData.months,
          datasets: [{
            label: 'New Users',
            data: userGrowthData.counts,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#3b82f6',
            pointBorderColor: 'white',
            pointBorderWidth: 2,
            pointRadius: 4
          }]
        }} options={lineChartOptions} />
      ) : (
        <div className="no-data">No user data available</div>
      )}
    </div>
  </div>
  
  {/* Chart 2: Contribution Overview */}
  <div className="chart-card">
    <div className="chart-header">
      <div>
        <h3> Contribution Overview</h3>
        <p>Total: KES {stats.totalPledged.toLocaleString()}</p>
      </div>
      <FiPieChart size={20} />
    </div>
    <div className="chart-container doughnut">
      {pledgeChartData ? (
        <Doughnut data={pledgeChartData} options={doughnutOptions} />
      ) : (
        <div className="no-data">No contribution data</div>
      )}
    </div>
  </div>
  
  
  {/* Chart 3: ZUCA Metrics */}
  <div className="chart-card">
    <div className="chart-header">
      <div>
        <h3>ZUCA Metrics</h3>
        <p>Content distribution</p>
      </div>
      <FiBarChart2 size={20} />
    </div>
    <div className="chart-container">
      {categoryChartData ? (
        <Bar data={categoryChartData} options={barOptions} />
      ) : (
        <div className="no-data">No statistics data</div>
      )}
    </div>
  </div>

    {/* Chart 4: System Health Trend - Line Chart */}
  <div className="chart-card">
    <div className="chart-header">
      <div>
        <h3><FiActivity /> System Health</h3>
        <p>Health score trend</p>
      </div>
      <FiActivity size={20} color="#10b981" />
    </div>
    <div className="chart-container">
      {systemHealthData?.labels?.length > 0 ? (
        <Line
          data={{
            labels: systemHealthData.labels,
            datasets: [
              {
                label: 'Health Score',
                data: systemHealthData.scores,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#10b981',
                pointBorderColor: 'white',
                pointBorderWidth: 2,
                pointRadius: 4
              },
              {
                label: 'Errors',
                data: systemHealthData.errors,
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                tension: 0.4,
                fill: false,
                pointBackgroundColor: '#ef4444',
                pointBorderColor: 'white',
                pointBorderWidth: 2,
                pointRadius: 4,
                borderDash: [5, 5]
              }
            ]
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { 
                position: 'top', 
                labels: { 
                  font: { size: 10 },
                  boxWidth: 12,
                  padding: 8
                } 
              },
              tooltip: { 
                backgroundColor: '#1e293b', 
                titleColor: '#fff', 
                bodyColor: '#fff' 
              }
            },
            scales: {
              y: { 
                beginAtZero: true, 
                grid: { color: '#e2e8f0' },
                ticks: { stepSize: 10 }
              },
              x: { grid: { display: false } }
            }
          }}
        />
      ) : (
        <div className="no-data">No health data available</div>
      )}
    </div>
</div>
        
       </div>
        
        {/* Two Column Layout */}
        <div className="two-columns">
          {/* Recent Users */}
          <div className="section-card">
            <div className="section-header">
              <h3><FaUsers /> RECENT USERS</h3>
              <button className="view-all" onClick={() => navigate('/admin/users')}>View All →</button>
            </div>
            <div className="users-list">
              {recentUsers.length === 0 ? (
                <div className="empty-state">No users found</div>
              ) : (
                recentUsers.map((user, idx) => (
                  <div key={user.id} className="user-item">
                    <div className="user-rank">{idx + 1}.</div>
                    <div className="user-avatar">
                      {user.profileImage ? (
                        <img src={user.profileImage} alt={user.fullName} />
                      ) : (
                        <div className="avatar-fallback">{user.fullName?.charAt(0)}</div>
                      )}
                    </div>
                    <div className="user-info">
                      <div className="user-name">{user.fullName}</div>
                      <div className="user-id">{user.membership_number || 'Z#TEMP'}</div>
                    </div>
                    <div className="user-join">
                      <div className="join-time">{formatRelativeTime(user.createdAt)}</div>
                      <div className={`user-status ${user.online ? 'online' : 'offline'}`}>
                        {user.online ? '✅ Active' : '⏳ Offline'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Pending Approvals */}
          <div className="section-card">
            <div className="section-header">
              <h3><FaClock /> PENDING APPROVALS</h3>
              <button className="view-all" onClick={() => navigate('/admin/pending')}>View All →</button>
            </div>
            <div className="pending-list">
              {pendingApprovals.length === 0 ? (
                <div className="empty-state">No pending approvals</div>
              ) : (
                pendingApprovals.map(approval => (
                  <div key={approval.id} className="pending-item">
                    <div className="pending-icon">{approval.icon}</div>
                    <div className="pending-info">
                      <div className="pending-title">{approval.title}</div>
                      <div className="pending-desc">{approval.description}</div>
                    </div>
                    <div className="pending-actions">
                      
                      <button className="approve-btn" onClick={() => navigate('./pages/admin/ContributionsPage')}>Approve</button>
                      
                      
                      <button className="reject-btn">Reject</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        {/* Recent Activity Log */}
        <div className="section-card full-width">
          <div className="section-header">
            <h3><FaHistory /> RECENT ACTIVITY LOG</h3>
            <button className="view-all" onClick={() => navigate('/admin/activity')}>View Full Log →</button>
          </div>
          <div className="activity-list">
            {recentActivities.length === 0 ? (
              <div className="empty-state">No recent activity</div>
            ) : (
              recentActivities.map(activity => (
                <div key={activity.id} className="activity-item">
                  <span className="activity-icon">{activity.icon}</span>
                  <span className="activity-text">{activity.text}</span>
                  <span className="activity-time">{formatRelativeTime(activity.time)}</span>
                </div>
              ))
            )}
          </div>
        
        {/* Two Column - Executive & System */}
        <div className="two-columns">
          {/* Executive Team Summary */}
          <div className="section-card">
            <div className="section-header">
              <h3><FaUserTie /> EXECUTIVE TEAM SUMMARY</h3>
              <button className="view-all" onClick={() => navigate('/executive')}>Manage Team →</button>
            </div>
            <div className="executive-summary">
              {['Chairperson', 'Secretary', 'Treasurer', 'Choir Moderator', 'Media Moderator'].map(role => {
                const member = executiveTeam.find(e => e.role === role);
                return (
                  <div key={role} className="executive-item">
                    <span className="executive-role">{role.replace('Moderator', '').trim()}</span>
                    <span className={`executive-status ${member ? 'filled' : 'vacant'}`}>
                      {member ? '✅' : '❌'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          </div>
          
          {/* System Health */}
          <div className="section-card">
            <div className="section-header">
              <h3><FaCog /> SYSTEM HEALTH</h3>
            </div>
            <div className="health-grid">
              <div className="health-item">
                <span className="health-status online"></span>
                <span>Database: {systemHealth.database}</span>
              </div>
              <div className="health-item">
                <span className="health-status online"></span>
                <span>API: {systemHealth.api}</span>
              </div>
              <div className="health-item">
                <span className="health-status warning"></span>
                <span>Storage: {systemHealth.storage}% used</span>
              </div>
              <div className="health-item">
                <span className="health-status online"></span>
                <span>Users online: {stats.onlineUsers}</span>
              </div>
              <div className="health-item full-width">
                <span><FaHistory /> Last backup: {systemHealth.lastBackup ? formatRelativeTime(systemHealth.lastBackup) : 'Not backed up'}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="footer">
          <p>© {currentYear} ZUCA Portal Admin | v1.0 |</p>
          <p className="creator">created by CHRISWEBSYS</p>
        </div>
      </div>
      
      {/* User Edit Modal */}
      <AnimatePresence>
        {showUserModal && selectedUser && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowUserModal(false)}>
            <motion.div className="modal-content" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}>
              <h3>Edit User</h3>
              <div className="modal-body">
                <div><label>Name</label><p>{selectedUser.fullName}</p></div>
                <div><label>Email</label><p>{selectedUser.email}</p></div>
                <div>
                  <label>Role</label>
                  <select value={selectedUser.role} onChange={(e) => handleRoleChange(selectedUser.id, e.target.value)}>
                    <option value="member">Member</option>
                    <option value="treasurer">Treasurer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button className="close-btn" onClick={() => setShowUserModal(false)}>Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <style>{`
        /* Admin Dashboard Styles */
        .admin-dashboard {
          min-height: 100vh;
          background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .admin-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
        }
        
        /* Header */
        .admin-header {
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
        
       .greeting {
  color: white;
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 4px;
  line-height: 1.3;
}

.admin-name {
  background: linear-gradient(135deg, #29f00f, #3fe914);
  -webkit-background-clip: text;
  background-clip: text;
  font-style: tahoma;
  color: transparent;
}

.portal-name {
  font-weight: 700;
  font-style: tahoma;
}

.control-panel {
  font-weight: 600;
}
        
        .date {
          color: #94a3b8;
          font-size: 12px;
        }
        
        .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .refresh-btn {
          width: 40px;
          height: 40px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 10px;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        
        .admin-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 4px 12px 4px 4px;
          background: rgba(255,255,255,0.1);
          border-radius: 40px;
        }
        
        .admin-avatar {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 18px;
        }
        
        .admin-info { display: flex; flex-direction: column; }
        .admin-title { font-size: 12px; font-weight: 500; color: white; }
        .admin-status { font-size: 10px; color: #10b981; }
        
        .logout-btn {
          padding: 8px 16px;
          background: rgba(239,68,68,0.2);
          border: 1px solid rgba(239,68,68,0.3);
          border-radius: 10px;
          color: #ef4444;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
        }
        
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
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
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
        
        .stat-icon.users { background: #eff6ff00; color: #000000; }
        .stat-icon.announcements { background: #fef3c700; color: #000000; }
        .stat-icon.pledges { background: #d1fae500; color: #000000; }
        .stat-icon.programs { background: #00000000; color: #000000; }
        .stat-icon.messages { background: #00000000; color: #000000; }
        .stat-icon.hymns { background: #e0f2fe00; color:      #000000; }
        
        .stat-info { flex: 1; }
        .stat-value { display: block; font-size: 22px; font-weight: 700; color: #1e293b; }
        .stat-label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-trend { font-size: 9px; color: #10b981; display: flex; align-items: center; gap: 2px; margin-top: 4px; }
        
       .charts-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

/* Make charts better on desktop */
@media (min-width: 1200px) {
  .charts-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
  }
  
  .chart-card {
    padding: 24px;
  }
  
  .chart-container {
    height: 220px;
  }
}

/* Tablet */
@media (max-width: 1024px) {
  .charts-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
  
  .chart-container {
    height: 180px;
  }
}

/* Mobile */
@media (max-width: 768px) {
  .charts-section {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .chart-container {
    height: 200px;
  }
}
        
        .chart-card {
          background: white;
          border-radius: 20px;
          padding: 20px;
          border: 1px solid #e2e8f0;
          transition: all 0.3s;
        }
        
        .chart-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.08);
        }
        
        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .chart-header h3 {
          font-size: 15px;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }
        
        .chart-header p {
          font-size: 11px;
          color: #64748b;
          margin: 4px 0 0;
        }
        
        .chart-container {
          height: 200px;
          position: relative;
        }
        
        .chart-container.doughnut {
          height: 180px;
        }
        
        .no-data {
          text-align: center;
          color: #94a3b8;
          padding: 40px;
          font-size: 13px;
        }
        
        /* Quick Actions */
        .quick-actions-section {
          background: white;
          border-radius: 20px;
          padding: 20px;
          margin-bottom: 24px;
          border: 1px solid #e2e8f0;
        }
        
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }
        
        .section-header h3 { font-size: 16px; font-weight: 600; color: #1e293b; margin: 0; }
        
        .actions-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
        }
        
        .action-btn {
          padding: 12px 16px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          font-weight: 600;
          color: #1e293b;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .action-btn:hover {
          background: #f1f5f9;
          transform: translateY(-2px);
          border-color: #cbd5e1;
        }
        
        /* Two Columns */
        .two-columns {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 24px;
        }
        
        .section-card {
          background: white;
          border-radius: 20px;
          padding: 20px;
          border: 1px solid #e2e8f0;
        }
        
        .full-width { grid-column: span 2; }
        
        .view-all {
          background: none;
          border: none;
          color: #3b82f6;
          font-size: 12px;
          cursor: pointer;
        }
        
        /* Users List */
        .users-list { display: flex; flex-direction: column; gap: 12px; }
        .user-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          background: #f8fafc;
          border-radius: 12px;
        }
        
        .user-rank { font-size: 12px; color: #94a3b8; font-weight: 500; width: 24px; }
        .user-avatar { width: 40px; height: 40px; border-radius: 10px; overflow: hidden; flex-shrink: 0; }
        .user-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .avatar-fallback { width: 100%; height: 100%; background: linear-gradient(135deg, #3b82f6, #8b5cf6); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; }
        .user-info { flex: 1; }
        .user-name { font-size: 14px; font-weight: 500; color: #1e293b; }
        .user-id { font-size: 10px; color: #64748b; }
        .user-join { text-align: right; }
        .join-time { font-size: 11px; color: #64748b; }
        .user-status { font-size: 10px; margin-top: 2px; }
        .user-status.online { color: #10b981; }
        .user-status.offline { color: #94a3b8; }
        
        /* Pending List */
        .pending-list { display: flex; flex-direction: column; gap: 12px; }
        .pending-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #fef2f2;
          border-radius: 12px;
          border-left: 3px solid #ef4444;
        }
        .pending-icon { font-size: 24px; }
        .pending-info { flex: 1; }
        .pending-title { font-size: 13px; font-weight: 600; color: #1e293b; }
        .pending-desc { font-size: 11px; color: #64748b; }
        .pending-actions { display: flex; gap: 8px; }
        .approve-btn { padding: 4px 12px; background: #10b981; border: none; border-radius: 6px; color: white; font-size: 11px; cursor: pointer; }
        .reject-btn { padding: 4px 12px; background: #ef4444; border: none; border-radius: 6px; color: white; font-size: 11px; cursor: pointer; }
        
        /* Activity List */
        .activity-list { display: flex; flex-direction: column; gap: 8px; }
        .activity-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid #f1f5f9;
        }
        .activity-icon { font-size: 14px; width: 28px; }
        .activity-text { flex: 1; font-size: 12px; color: #1e293b; }
        .activity-time { font-size: 10px; color: #94a3b8; }
        
        /* Executive Summary */
        .executive-summary { display: flex; flex-direction: column; gap: 8px; }
        .executive-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #f8fafc;
          border-radius: 8px;
        }
        .executive-role { font-size: 12px; font-weight: 500; color: #1e293b; }
        .executive-status.filled { color: #10b981; }
        .executive-status.vacant { color: #94a3b8; }
        
        /* Health Grid */
        .health-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        .health-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          background: #f8fafc;
          border-radius: 8px;
          font-size: 12px;
        }
        .health-item.full-width { grid-column: span 2; }
        .health-status {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .health-status.online { background: #10b981; box-shadow: 0 0 4px #10b981; }
        .health-status.warning { background: #f59e0b; }
        
        /* Footer */
        .footer {
          text-align: center;
          padding: 20px;
          margin-top: 24px;
          border-top: 1px solid #e2e8f0;
        }
        .footer p { font-size: 10px; color: #94a3b8; margin: 2px 0; }
        .creator { font-size: 9px; color: #cbd5e1; }
        
        .empty-state { text-align: center; padding: 24px; color: #94a3b8; font-size: 13px; }
        
        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: white;
          border-radius: 20px;
          padding: 24px;
          width: 90%;
          max-width: 400px;
        }
        .modal-content h3 { margin: 0 0 16px; font-size: 18px; }
        .modal-body > div { margin-bottom: 12px; }
        .modal-body label { display: block; font-size: 11px; color: #64748b; margin-bottom: 4px; }
        .modal-body p { margin: 0; font-size: 14px; }
        .modal-body select { width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 8px; }
        .modal-actions { display: flex; justify-content: flex-end; margin-top: 16px; }
        .close-btn { padding: 8px 16px; background: #f1f5f9; border: none; border-radius: 8px; cursor: pointer; }




        /* ============================================
   ADVERTISEMENT DASHBOARD CARD
============================================ */

.advertisement-dashboard-card {
  margin: 24px 0;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.06);
}

.advertisement-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 20px 24px;
  border-bottom: 1px solid #eef0f3;
}

.advertisement-card-title {
  display: flex;
  align-items: center;
  gap: 14px;
}

.advertisement-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eff6ff;
  color: #2563eb;
  font-size: 22px;
}

.advertisement-card-title h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: #111827;
}

.advertisement-card-title p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #6b7280;
}

.advertisement-manage-btn,
.advertisement-create-btn,
.advertisement-edit-btn {
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: 0.2s ease;
}

.advertisement-manage-btn {
  padding: 11px 16px;
  border-radius: 10px;
  background: #111827;
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
}

.advertisement-manage-btn:hover {
  transform: translateY(-1px);
  background: #1f2937;
}

/* Current Advertisement */

.advertisement-current {
  display: grid;
  grid-template-columns: minmax(280px, 38%) 1fr;
  min-height: 280px;
}

.advertisement-image-wrapper {
  position: relative;
  min-height: 280px;
  background: #f3f4f6;
  overflow: hidden;
}

.advertisement-image {
  width: 100%;
  height: 100%;
  min-height: 280px;
  object-fit: cover;
  display: block;
}

.advertisement-no-image {
  height: 100%;
  min-height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #9ca3af;
}

.advertisement-status {
  position: absolute;
  top: 14px;
  left: 14px;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  backdrop-filter: blur(8px);
}

.advertisement-status.active {
  background: rgba(16, 185, 129, 0.95);
  color: white;
}

.advertisement-details {
  padding: 28px;
  display: flex;
  flex-direction: column;
}

.advertisement-details-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.advertisement-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #2563eb;
}

.advertisement-id {
  font-size: 11px;
  color: #9ca3af;
}

.advertisement-details h2 {
  margin: 14px 0 8px;
  font-size: 25px;
  line-height: 1.2;
  color: #111827;
}

.advertisement-description {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
  line-height: 1.6;
  max-width: 700px;
}

.advertisement-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-top: 22px;
}

.advertisement-meta div {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #6b7280;
  font-size: 12px;
}

.advertisement-meta svg {
  color: #2563eb;
}

.advertisement-card-footer {
  margin-top: auto;
  padding-top: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
}

.advertisement-live {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #059669;
  font-size: 12px;
  font-weight: 700;
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.12);
}

.advertisement-edit-btn {
  padding: 10px 14px;
  border-radius: 9px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
}

.advertisement-edit-btn:hover {
  background: #dbeafe;
}

/* Empty State */

.advertisement-empty {
  min-height: 180px;
  padding: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  color: #9ca3af;
}

.advertisement-empty h4 {
  margin: 0 0 5px;
  color: #374151;
  font-size: 15px;
}

.advertisement-empty p {
  margin: 0;
  color: #6b7280;
  font-size: 12px;
}

.advertisement-create-btn {
  margin-left: 15px;
  padding: 10px 15px;
  border-radius: 9px;
  background: #2563eb;
  color: white;
  font-size: 12px;
  font-weight: 700;
}

.advertisement-create-btn:hover {
  background: #1d4ed8;
}

/* Responsive */

@media (max-width: 800px) {
  .advertisement-card-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .advertisement-manage-btn {
    width: 100%;
  }

  .advertisement-current {
    grid-template-columns: 1fr;
  }

  .advertisement-image-wrapper,
  .advertisement-image,
  .advertisement-no-image {
    min-height: 210px;
  }

  .advertisement-details {
    padding: 20px;
  }

  .advertisement-card-footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .advertisement-edit-btn {
    width: 100%;
  }

  .advertisement-empty {
    flex-direction: column;
    text-align: center;
  }

  .advertisement-create-btn {
    margin-left: 0;
  }
}
        
        /* Responsive */
        @media (max-width: 1200px) {
          .stats-grid { grid-template-columns: repeat(3, 1fr); }
          .actions-grid { grid-template-columns: repeat(3, 1fr); }
          .charts-section { grid-template-columns: repeat(2, 1fr); }
        }
        
        @media (max-width: 768px) {
          .admin-content { padding: 16px; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .actions-grid { grid-template-columns: repeat(2, 1fr); }
          .two-columns { grid-template-columns: 1fr; gap: 16px; }
          .full-width { grid-column: span 1; }
          .admin-header { flex-direction: column; align-items: flex-start; }
          .header-right { width: 100%; justify-content: space-between; }
          .stat-value { font-size: 18px; }
          .action-btn { padding: 8px 12px; font-size: 11px; }
          .charts-section { grid-template-columns: 1fr; }
          .chart-container { height: 180px; }
        }
        
        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: 1fr; }
          .actions-grid { grid-template-columns: 1fr; }
          .pending-item { flex-wrap: wrap; }
          .pending-actions { width: 100%; justify-content: flex-end; margin-top: 8px; }
        }
      `}</style>
    </div>
  );
}

export default AdminDashboard;