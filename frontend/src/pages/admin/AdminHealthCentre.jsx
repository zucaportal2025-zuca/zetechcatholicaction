// frontend/src/pages/admin/AdminHealthCentre.jsx
import { useState, useEffect } from "react";
import axios from "axios";
import BASE_URL from "../../api";
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import {
  FiActivity, FiServer, FiDatabase, FiAlertCircle, FiClock, FiUsers,
  FiUserCheck, FiLock, FiBarChart2, FiRefreshCw, FiDownload,
  FiTrash2, FiCpu, FiGlobe, FiMessageSquare, FiHardDrive,
  FiX, FiCheckCircle, FiLoader, FiEye, FiTrendingUp,
  FiShield, FiZap, FiMail, FiVideo,
  FiSettings
} from "react-icons/fi";

function AdminHealthCentre() {
  const [loading, setLoading] = useState(true);
  const [system, setSystem] = useState(null);
  const [errors, setErrors] = useState([]);
  const [slowRequests, setSlowRequests] = useState([]);
  const [apiMetrics, setApiMetrics] = useState([]);
  const [pendingResets, setPendingResets] = useState([]);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socketStatus, setSocketStatus] = useState(null);
  const [services, setServices] = useState(null);
  const [reports, setReports] = useState([]);
  const [databaseStats, setDatabaseStats] = useState(null);
  const [recentLogins, setRecentLogins] = useState([]);
  const [failedLogins, setFailedLogins] = useState([]);
  const [storageMetrics, setStorageMetrics] = useState({
    totalSize: 0,
    usedSize: 0,
    freeSize: 0,
    percentUsed: 0,
    totalFiles: 0,
    images: 0,
    videos: 0,
    documents: 0
  });
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedError, setSelectedError] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [testingService, setTestingService] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const [errorTrend, setErrorTrend] = useState([]);
  const [responseTimeTrend, setResponseTimeTrend] = useState([]);
  const [userActivityTrend, setUserActivityTrend] = useState([]);

  const getStatusColor = (status) => {
    if (status === 'healthy' || status === 'configured' || status === 'working') return '#10b981';
    if (status === 'degraded' || status === 'initializing') return '#f59e0b';
    if (status === 'down' || status === 'missing' || status === 'error') return '#ef4444';
    return '#6b7280';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'healthy': '✅ Healthy',
      'configured': '✅ Configured',
      'working': '✅ Working',
      'degraded': '⚠️ Degraded',
      'initializing': '🔄 Initializing',
      'down': '❌ Down',
      'missing': '❌ Missing',
      'error': '❌ Error'
    };
    return labels[status] || status;
  };

  const handleTestService = async (service) => {
    setTestingService(service);
    try {
      const token = localStorage.getItem("token");
      if (service === 'email') {
        await axios.post(`${BASE_URL}/api/admin/health/test-email`, {}, { headers: { Authorization: `Bearer ${token}` } });
        alert("✅ Test email sent successfully");
      } else if (service === 'youtube') {
        const res = await axios.post(`${BASE_URL}/api/admin/health/test-youtube`, {}, { headers: { Authorization: `Bearer ${token}` } });
        alert(res.data.message || "✅ YouTube API working");
      }
    } catch (error) {
      alert(`❌ Test failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setTestingService(null);
    }
  };

const handleExportLogs = async () => {
  try {
    const token = localStorage.getItem("token");
    
    const response = await fetch(`${BASE_URL}/api/admin/health/export-logs`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Helper function to get user name (matches the page's getUserDisplay)
    const getUserName = (userId) => {
      if (!userId) return 'Anonymous';
      
      // Check online users
      const onlineUser = onlineUsers.find(u => u.id === userId);
      if (onlineUser) return onlineUser.fullName || onlineUser.email || userId;
      
      // Check recent logins
      const loginUser = recentLogins.find(u => u.id === userId);
      if (loginUser) return loginUser.fullName || loginUser.email || userId;
      
      // If it's the admin ID, show "ZUCA SYSTEM"
      if (userId === '97532cb4-7cac-4c8d-9a2e-5d70dec6d6d9') return 'ZUCA SYSTEM';
      
      return userId.substring(0, 8) + '...'; // Shorten unknown IDs
    };
    
    // Calculate health score
    const calculateHealthScore = () => {
      let score = 100;
      const errorCount = data.errors?.length || 0;
      const slowCount = data.slowRequests?.length || 0;
      
      if (errorCount > 50) score -= 20;
      else if (errorCount > 20) score -= 10;
      else if (errorCount > 5) score -= 5;
      
      if (slowCount > 20) score -= 15;
      else if (slowCount > 10) score -= 8;
      else if (slowCount > 5) score -= 3;
      
      return Math.max(0, Math.min(100, score));
    };
    
    // Create PDF using window.print()
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>ZUCA System Health Report</title>
          <style>
            * { box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; 
              padding: 40px; 
              max-width: 1200px;
              margin: 0 auto;
              color: #1e293b;
              background: #ffffff;
            }
            .header { 
              border-bottom: 3px solid #3b82f6; 
              padding-bottom: 20px; 
              margin-bottom: 30px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              flex-wrap: wrap;
            }
            h1 { 
              font-size: 28px; 
              margin: 0;
              color: #1e293b;
            }
            .logo-text { color: #3b82f6; }
            .subtitle { 
              font-size: 14px; 
              color: #64748b; 
              margin: 5px 0 0 0;
            }
            .meta { 
              text-align: right;
              font-size: 13px;
              color: #64748b;
            }
            .section {
              background: #f8fafc;
              border-radius: 12px;
              padding: 20px;
              margin: 25px 0;
              border: 1px solid #e2e8f0;
              page-break-inside: avoid;
            }
            .section-title {
              font-size: 18px;
              font-weight: 600;
              margin: 0 0 15px 0;
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 16px;
              margin: 15px 0;
            }
            .summary-item {
              background: white;
              padding: 16px;
              border-radius: 10px;
              text-align: center;
              border: 1px solid #e2e8f0;
            }
            .summary-value {
              font-size: 28px;
              font-weight: 700;
              color: #1e293b;
            }
            .summary-label {
              font-size: 12px;
              color: #64748b;
              margin-top: 4px;
            }
            .summary-value.green { color: #10b981; }
            .summary-value.red { color: #ef4444; }
            .summary-value.orange { color: #f59e0b; }
            .summary-value.blue { color: #3b82f6; }
            
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 13px;
            }
            th {
              background: #1e293b;
              color: white;
              padding: 10px 12px;
              text-align: left;
              font-weight: 600;
            }
            td {
              padding: 8px 12px;
              border-bottom: 1px solid #e2e8f0;
            }
            tr:nth-child(even) { background: #f1f5f9; }
            .error-row { background: #fef2f2; }
            .error-code { 
              color: #ef4444; 
              font-weight: 700;
              font-family: monospace;
            }
            .timestamp { color: #64748b; font-size: 12px; }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #e2e8f0;
              text-align: center;
              color: #94a3b8;
              font-size: 12px;
            }
            .health-status { 
              text-align: center; 
              font-size: 14px; 
              margin-top: 10px;
              padding: 10px;
              border-radius: 8px;
            }
            .health-status.good { background: #dcfce7; color: #16a34a; }
            .health-status.warn { background: #fef3c7; color: #d97706; }
            .health-status.bad { background: #fef2f2; color: #dc2626; }
            .badge {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 12px;
              font-size: 10px;
              font-weight: 600;
            }
            .badge-error { background: #fef2f2; color: #dc2626; }
            .badge-warn { background: #fffbeb; color: #d97706; }
            .badge-ok { background: #dcfce7; color: #16a34a; }
            
            @media print {
              body { padding: 20px; }
              .section { break-inside: avoid; }
              .summary-grid { break-inside: avoid; }
            }
            @media (max-width: 768px) {
              .summary-grid { grid-template-columns: repeat(2, 1fr); }
              table { font-size: 11px; }
              td, th { padding: 6px 8px; }
            }
          </style>
        </head>
        <body>
          <!-- Header -->
          <div class="header">
            <div>
              <h1>🏥 BACKEND HEALTH</h1>
              <p class="subtitle">System Health Report • ${new Date(data.exportedAt).toLocaleDateString()}</p>
            </div>
            <div class="meta">
              <div><strong>Generated:</strong> ${new Date(data.exportedAt).toLocaleString()}</div>
              <div><strong>Report ID:</strong> #${Math.random().toString(36).substring(2, 8).toUpperCase()}</div>
            </div>
          </div>

          <!-- Summary -->
          <div class="section">
            <h2 class="section-title">📊 Executive Summary</h2>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-value ${(data.errors?.length || 0) > 0 ? 'red' : 'green'}">${data.errors?.length || 0}</div>
                <div class="summary-label">⚠️ Total Errors</div>
              </div>
              <div class="summary-item">
                <div class="summary-value ${(data.slowRequests?.length || 0) > 5 ? 'orange' : 'green'}">${data.slowRequests?.length || 0}</div>
                <div class="summary-label">🐌 Slow Requests</div>
              </div>
              <div class="summary-item">
                <div class="summary-value blue">${data.system?.requestCount || 0}</div>
                <div class="summary-label">📡 Total Requests</div>
              </div>
              <div class="summary-item">
                <div class="summary-value green">${data.system?.uptime ? Math.floor(data.system.uptime / 3600) + 'h' : 'N/A'}</div>
                <div class="summary-label">⏱️ System Uptime</div>
              </div>
            </div>
            <div class="health-status ${calculateHealthScore() > 80 ? 'good' : calculateHealthScore() > 50 ? 'warn' : 'bad'}">
              Health Score: <strong>${calculateHealthScore()}%</strong> 
              ${calculateHealthScore() > 80 ? '✅ System is healthy' : calculateHealthScore() > 50 ? '⚠️ System is degraded' : '❌ System needs attention'}
            </div>
          </div>

          <!-- System Info -->
          <div class="section">
            <h2 class="section-title">🖥️ System Information</h2>
            <table>
              <tr><td><strong>Uptime</strong></td><td>${Math.floor(data.system?.uptime / 3600)} hours ${Math.floor((data.system?.uptime % 3600) / 60)} minutes</td></tr>
              <tr><td><strong>Total Requests</strong></td><td>${data.system?.requestCount?.toLocaleString() || 0}</td></tr>
              <tr><td><strong>Error Count</strong></td><td>${data.system?.errorCount || 0}</td></tr>
              <tr><td><strong>Health Score</strong></td><td>${calculateHealthScore()}%</td></tr>
            </table>
          </div>

          <!-- Errors -->
          <div class="section">
            <h2 class="section-title">⚠️ Error Log (${data.errors?.length || 0})</h2>
            ${data.errors?.length === 0 ? '<p style="color: #10b981; font-weight: 600;">✅ No errors recorded - System is healthy!</p>' : `
            <table>
              <thead>
                <tr><th>Time</th><th>Status</th><th>Endpoint</th><th>Method</th><th>User</th></tr>
              </thead>
              <tbody>
                ${data.errors.map(error => `
                  <tr class="error-row">
                    <td class="timestamp">${new Date(error.timestamp).toLocaleString()}</td>
                    <td><span class="error-code">${error.statusCode}</span></td>
                    <td>${error.endpoint || 'N/A'}</td>
                    <td>${error.method || 'N/A'}</td>
                    <td>${getUserName(error.userId)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            `}
          </div>

          <!-- Slow Requests -->
          <div class="section">
            <h2 class="section-title">🐌 Slow Requests (${data.slowRequests?.length || 0})</h2>
            ${data.slowRequests?.length === 0 ? '<p style="color: #10b981; font-weight: 600;">✅ No slow requests detected</p>' : `
            <table>
              <thead>
                <tr><th>Duration</th><th>Endpoint</th><th>Method</th><th>User</th><th>Time</th></tr>
              </thead>
              <tbody>
                ${data.slowRequests.map(req => `
                  <tr>
                    <td><strong style="color: #ef4444;">${req.duration}ms</strong></td>
                    <td>${req.endpoint || 'N/A'}</td>
                    <td>${req.method || 'N/A'}</td>
                    <td>${getUserName(req.userId)}</td>
                    <td class="timestamp">${new Date(req.timestamp).toLocaleTimeString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            `}
          </div>

          <!-- Malicious Requests -->
          <div class="section">
            <h2 class="section-title">🛡️ Security Events (${data.maliciousRequests?.length || 0})</h2>
            ${data.maliciousRequests?.length === 0 ? '<p style="color: #10b981; font-weight: 600;">✅ No security threats detected</p>' : `
            <table>
              <thead>
                <tr><th>Time</th><th>IP</th><th>Type</th><th>Endpoint</th></tr>
              </thead>
              <tbody>
                ${data.maliciousRequests.map(req => `
                  <tr style="background: #fef2f2;">
                    <td class="timestamp">${new Date(req.timestamp).toLocaleString()}</td>
                    <td>${req.ip || 'Unknown'}</td>
                    <td><span class="badge badge-error">${req.type || 'Suspicious'}</span></td>
                    <td>${req.endpoint || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            `}
          </div>

        <!-- API Endpoints -->
<div class="section">
  <h2 class="section-title">📡 API Endpoint Performance</h2>
  ${!data.apiEndpoints || data.apiEndpoints.length === 0 ? '<p style="color: #64748b;">📭 No API metrics available yet</p>' : `
  <table>
    <thead>
      <tr><th>Endpoint</th><th>Calls</th><th>Avg Time (ms)</th><th>Slowest (ms)</th></tr>
    </thead>
    <tbody>
      ${data.apiEndpoints
        .filter(api => api.endpoint && api.endpoint.trim() !== '')
        .slice(0, 20)
        .map(api => `
          <tr>
            <td><code style="font-size: 11px;">${api.endpoint}</code></td>
            <td style="text-align: center;">${api.count || 0}</td>
            <td style="text-align: center;">${api.avgTime || 'N/A'}</td>
            <td style="text-align: center; color: ${api.slowest > 2000 ? '#ef4444' : '#10b981'};">${api.slowest || 'N/A'}</td>
          </tr>
        `).join('')}
      ${data.apiEndpoints.filter(api => !api.endpoint || api.endpoint.trim() === '').length > 0 ? `
        <tr>
          <td colspan="4" style="text-align: center; color: #94a3b8; font-style: italic; padding: 12px;">
            ${data.apiEndpoints.filter(api => !api.endpoint || api.endpoint.trim() === '').length} endpoint(s) with incomplete data
          </td>
        </tr>
      ` : ''}
    </tbody>
  </table>
  `}
</div>
          <!-- Footer -->
          <div class="footer">
            <p>📋 ZUCA System Health Report • Generated ${new Date(data.exportedAt).toLocaleString()}</p>
            <p style="margin-top: 4px;">This report contains system health data for ${new Date(data.exportedAt).toLocaleDateString()}</p>
            <p style="margin-top: 8px; font-size: 10px; color: #cbd5e1;">Confidential - For authorised administrators only</p>
          </div>

          <script>
            // Auto-print when loaded
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 800);
            };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
    
  } catch (error) {
    console.error("Error exporting logs:", error);
    alert("Failed to export logs as PDF. Please try again.");
  }
};

  const handleClearErrors = async () => {
    if (window.confirm("Clear all error logs?")) {
      try {
        const token = localStorage.getItem("token");
        await axios.get(`${BASE_URL}/api/admin/health/clear-errors`, { headers: { Authorization: `Bearer ${token}` } });
        fetchAllData();
      } catch (error) {
        console.error("Error clearing errors:", error);
      }
    }
  };

  const handleResolveReport = async (reportId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${BASE_URL}/api/admin/health/reports/${reportId}/resolve`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchAllData();
    } catch (error) {
      console.error("Error resolving report:", error);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUserDisplay = (userId) => {
    // Try to find user in online users or recent logins
    const onlineUser = onlineUsers.find(u => u.id === userId);
    if (onlineUser) return onlineUser.fullName || onlineUser.email || userId;
    
    const loginUser = recentLogins.find(u => u.id === userId);
    if (loginUser) return loginUser.fullName || loginUser.email || userId;
    
    return userId || 'Anonymous';
  };

  const fetchAllData = async () => {
    try {
      const token = localStorage.getItem("token");
      
      const [
        systemRes, errorsRes, slowRes, metricsRes, resetsRes, 
        pendingRes, onlineRes, socketRes, servicesRes, reportsRes, 
        dbStatsRes, loginsRes, failedRes, storageRes
      ] = await Promise.all([
        axios.get(`${BASE_URL}/api/admin/health/system`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URL}/api/admin/health/errors?limit=200`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URL}/api/admin/health/slow-requests?limit=50`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URL}/api/admin/health/api-metrics`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URL}/api/admin/health/pending-resets`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URL}/api/admin/health/pending-verifications`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URL}/api/admin/health/online-users`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URL}/api/admin/health/socket-status`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URL}/api/admin/health/services`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URL}/api/admin/health/reports`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URL}/api/admin/health/database-stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URL}/api/admin/health/recent-logins`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URL}/api/admin/health/failed-logins`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URL}/api/admin/health/storage-metrics`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { success: false } }))
      ]);
      
      setSystem(systemRes.data);
      setErrors(errorsRes.data.errors || []);
      setSlowRequests(slowRes.data.requests || []);
      setApiMetrics(metricsRes.data.endpoints || []);
      setPendingResets(resetsRes.data.resets || []);
      setPendingVerifications(pendingRes.data.pending || []);
      setOnlineUsers(onlineRes.data.users || []);
      setSocketStatus(socketRes.data);
      setServices(servicesRes.data.services);
      setReports(reportsRes.data.reports || []);
      setDatabaseStats(dbStatsRes.data.stats);
      setRecentLogins(loginsRes.data.logins || []);
      setFailedLogins(failedRes.data.attempts || []);
      
      if (storageRes.data.success) {
        setStorageMetrics(storageRes.data.metrics);
      }
      
      setLastUpdated(new Date());

      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayErrors = (errorsRes.data.errors || []).filter(e => 
          new Date(e.timestamp).toISOString().split('T')[0] === dateStr
        );
        last7Days.push({
          date: dateStr,
          errors: dayErrors.length,
          status4xx: dayErrors.filter(e => e.statusCode >= 400 && e.statusCode < 500).length,
          status5xx: dayErrors.filter(e => e.statusCode >= 500).length
        });
      }
      setErrorTrend(last7Days);

      const responseData = (metricsRes.data.endpoints || []).slice(0, 10).map(m => ({
        name: m.endpoint.split('/').pop() || m.endpoint,
        avgTime: parseInt(m.avgTime),
        calls: m.count
      }));
      setResponseTimeTrend(responseData);

      const loginData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayLogins = (loginsRes.data.logins || []).filter(l => 
          l.lastActive && new Date(l.lastActive).toISOString().split('T')[0] === dateStr
        );
        loginData.push({
          date: dateStr,
          logins: dayLogins.length
        });
      }
      setUserActivityTrend(loginData);

    } catch (error) {
      console.error("Error fetching health data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const healthScore = () => {
    let score = 100;
    if (errors.length > 50) score -= 20;
    else if (errors.length > 20) score -= 10;
    else if (errors.length > 5) score -= 5;
    if (slowRequests.length > 20) score -= 15;
    else if (slowRequests.length > 10) score -= 8;
    const downServices = services ? Object.values(services).filter(s => s.status === 'down').length : 0;
    score -= downServices * 10;
    return Math.max(0, Math.min(100, score));
  };

  const securityScore = () => {
    let score = 100;
    if (failedLogins.length > 20) score -= 20;
    else if (failedLogins.length > 10) score -= 10;
    else if (failedLogins.length > 5) score -= 5;
    return Math.max(0, Math.min(100, score));
  };

  const SkeletonCard = () => (
    <div className="skeleton-card">
      <div className="skeleton-icon"></div>
      <div>
        <div className="skeleton-title"></div>
        <div className="skeleton-value"></div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="admin-health-container">
        <div className="admin-health-header">
          <div>
            <div className="skeleton-text-large"></div>
            <div className="skeleton-text-medium"></div>
          </div>
        </div>
        <div className="admin-health-stats-grid">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="admin-health-charts-grid">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="skeleton-chart">
              <div className="skeleton-chart-title"></div>
              <div className="skeleton-chart-body"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-health-container">
      {/* HEADER */}
      <div className="admin-health-header">
        <div>
          <h1 className="admin-health-title"> <FiSettings /> BACKEND HEALTH</h1>
          <p className="admin-health-subtitle">Real-time monitoring & analytics dashboard</p>
        </div>
        <div className="admin-health-header-actions">
          <div className="admin-health-last-updated">
            <FiClock size={14} />
            <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
          </div>
          <button className="admin-health-auto-btn" onClick={() => setAutoRefresh(!autoRefresh)}>
            <FiRefreshCw size={14} /> {autoRefresh ? 'Auto Refresh ON' : 'Auto Refresh OFF'}
          </button>
          <button className="admin-health-export-btn" onClick={handleExportLogs}>
            <FiDownload size={14} /> Export
          </button>
          <button className="admin-health-clear-btn" onClick={handleClearErrors}>
            <FiTrash2 size={14} /> Clear Errors
          </button>
        </div>
      </div>

      {/* HEALTH SCORE CARDS */}
      <div className="admin-health-score-grid">
        <div className="admin-health-score-card">
          <div className="admin-health-score-left">
            <FiActivity size={48} color={healthScore() > 80 ? '#10b981' : healthScore() > 50 ? '#f59e0b' : '#ef4444'} />
            <div>
              <div className="admin-health-score-label">Overall System Health</div>
              <div className="admin-health-score-value">{healthScore()}%</div>
            </div>
          </div>
          <div className="admin-health-score-bar">
            <div className="admin-health-score-fill" style={{ width: `${healthScore()}%`, background: healthScore() > 80 ? '#10b981' : healthScore() > 50 ? '#f59e0b' : '#ef4444' }} />
          </div>
          <div className="admin-health-score-stats">
            <div>✅ {Object.values(services || {}).filter(s => s.status === 'healthy' || s.status === 'configured').length} Services OK</div>
            <div>⚠️ {errors.length} Active Errors</div>
            <div>👤 {onlineUsers.length} Online Users</div>
          </div>
        </div>

        <div className="admin-health-security-card">
          <div className="admin-health-score-left">
            <FiShield size={48} color={securityScore() > 80 ? '#10b981' : securityScore() > 50 ? '#f59e0b' : '#ef4444'} />
            <div>
              <div className="admin-health-score-label">Security Posture</div>
              <div className="admin-health-score-value">{securityScore()}%</div>
            </div>
          </div>
          <div className="admin-health-score-bar">
            <div className="admin-health-score-fill" style={{ width: `${securityScore()}%`, background: securityScore() > 80 ? '#10b981' : securityScore() > 50 ? '#f59e0b' : '#ef4444' }} />
          </div>
          <div className="admin-health-score-stats">
            <div>🔒 {failedLogins.length} Failed Logins</div>
            <div>⚠️ {pendingResets.length} Password Resets</div>
            <div>✅ {pendingVerifications.length} Pending Verifications</div>
          </div>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="admin-health-stats-grid">
        <div className="admin-health-stat-card">
          <div className="admin-health-stat-icon"><FiServer /></div>
          <div>
            <div className="admin-health-stat-label">System Uptime</div>
            <div className="admin-health-stat-value">{system?.uptime?.formatted || '0d'}</div>
          </div>
        </div>
        <div className="admin-health-stat-card">
          <div className="admin-health-stat-icon"><FiCpu /></div>
          <div>
            <div className="admin-health-stat-label">Memory Usage</div>
            <div className="admin-health-stat-value">{system?.memory?.percentUsed || 0}%</div>
            <div className="admin-health-stat-trend">{formatBytes(system?.memory?.used || 0)} / {formatBytes(system?.memory?.total || 0)}</div>
          </div>
        </div>
        <div className="admin-health-stat-card">
          <div className="admin-health-stat-icon"><FiAlertCircle /></div>
          <div>
            <div className="admin-health-stat-label">Total Errors</div>
            <div className="admin-health-stat-value">{errors.length}</div>
            <div className="admin-health-stat-trend">{errors.filter(e => e.statusCode >= 500).length} Server Errors</div>
          </div>
        </div>
        <div className="admin-health-stat-card">
          <div className="admin-health-stat-icon"><FiUsers /></div>
          <div>
            <div className="admin-health-stat-label">Online Users</div>
            <div className="admin-health-stat-value">{onlineUsers.length}</div>
          </div>
        </div>
        <div className="admin-health-stat-card">
          <div className="admin-health-stat-icon"><FiDatabase /></div>
          <div>
            <div className="admin-health-stat-label">Total Requests</div>
            <div className="admin-health-stat-value">{system?.requests?.total?.toLocaleString() || 0}</div>
            <div className="admin-health-stat-trend">{slowRequests.length} Slow Requests</div>
          </div>
        </div>
        <div className="admin-health-stat-card">
          <div className="admin-health-stat-icon"><FiMessageSquare /></div>
          <div>
            <div className="admin-health-stat-label">Active Connections</div>
            <div className="admin-health-stat-value">{socketStatus?.connectedUsers || 0}</div>
          </div>
        </div>
      </div>

      {/* CHARTS */}
      <div className="admin-health-charts-grid">
        <div className="admin-health-chart-card">
          <div className="admin-health-chart-header">
            <h3><FiTrendingUp /> Error Trends (Last 7 Days)</h3>
            <div className="admin-health-legend">
              <span><span className="admin-health-legend-dot error-5xx"></span> 5xx Errors</span>
              <span><span className="admin-health-legend-dot error-4xx"></span> 4xx Errors</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={errorTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} />
              <Tooltip />
              <Area type="monotone" dataKey="status5xx" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
              <Area type="monotone" dataKey="status4xx" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="admin-health-chart-card">
          <div className="admin-health-chart-header">
            <h3><FiBarChart2 /> Slowest API Endpoints</h3>
            <span className="admin-health-chart-label">Avg Response Time (ms)</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={responseTimeTrend} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" stroke="#64748b" fontSize={10} />
              <YAxis dataKey="name" type="category" width={80} stroke="#64748b" fontSize={10} />
              <Tooltip />
              <Bar dataKey="avgTime" fill="#ef4444" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* STORAGE METRICS */}
      <div className="admin-health-storage-grid">
        <div className="admin-health-storage-card">
          <div className="admin-health-storage-icon"><FiHardDrive /></div>
          <div className="admin-health-storage-value">{storageMetrics.percentUsed.toFixed(1)}%</div>
          <div className="admin-health-storage-label">Storage Used</div>
          <div className="admin-health-storage-bar">
            <div style={{ width: `${storageMetrics.percentUsed}%`, height: '8px', background: storageMetrics.percentUsed > 90 ? '#ef4444' : '#3b82f6', borderRadius: '4px' }} />
          </div>
          <div className="admin-health-storage-details">
            <span>{formatBytes(storageMetrics.usedSize)}</span>
            <span>of {formatBytes(storageMetrics.totalSize)}</span>
          </div>
        </div>
        <div className="admin-health-storage-card">
          <div className="admin-health-storage-icon"><FiDatabase /></div>
          <div className="admin-health-storage-value">{storageMetrics.totalFiles}</div>
          <div className="admin-health-storage-label">Total Files</div>
          <div className="admin-health-storage-types">
            <span>🖼️ {storageMetrics.images} Images</span>
            <span>🎬 {storageMetrics.videos} Videos</span>
            <span>📄 {storageMetrics.documents} Docs</span>
          </div>
        </div>
      </div>

      {/* SERVICES STATUS */}
      <div className="admin-health-section">
        <div className="admin-health-section-header">
          <h2><FiGlobe /> Service Status</h2>
          <button className="admin-health-refresh-btn" onClick={fetchAllData}><FiRefreshCw size={14} /> Refresh</button>
        </div>
        <div className="admin-health-services-grid">
          {services && Object.entries(services).map(([name, status]) => (
            <div key={name} className="admin-health-service-card">
              <div className="admin-health-service-dot" style={{ backgroundColor: getStatusColor(status.status) }} />
              <div className="admin-health-service-name">{name.charAt(0).toUpperCase() + name.slice(1)}</div>
              <div className="admin-health-service-status" style={{ color: getStatusColor(status.status) }}>
                {getStatusLabel(status.status)}
              </div>
              {(name === 'email' || name === 'youtube') && (
                <button className="admin-health-test-btn" onClick={() => handleTestService(name)} disabled={testingService === name}>
                  {testingService === name ? <FiLoader className="admin-health-spinner" /> : 'Test'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* USER ISSUES */}
      <div className="admin-health-section">
        <div className="admin-health-section-header">
          <h2><FiLock /> User Issues</h2>
        </div>
        <div className="admin-health-user-issues-grid">
          <div className="admin-health-issue-card">
            <div className="admin-health-issue-icon"><FiLock /></div>
            <div>
              <div className="admin-health-issue-title">Password Reset Requests</div>
              <div className="admin-health-issue-number">{pendingResets.length}</div>
              {pendingResets.slice(0, 3).map((reset, idx) => (
                <div key={idx} className="admin-health-issue-item">{reset.email}</div>
              ))}
            </div>
          </div>
          <div className="admin-health-issue-card">
            <div className="admin-health-issue-icon"><FiMail /></div>
            <div>
              <div className="admin-health-issue-title">Pending Verifications</div>
              <div className="admin-health-issue-number">{pendingVerifications.length}</div>
              {pendingVerifications.slice(0, 3).map((pending, idx) => (
                <div key={idx} className="admin-health-issue-item">{pending.email}</div>
              ))}
            </div>
          </div>
          <div className="admin-health-issue-card">
            <div className="admin-health-issue-icon"><FiShield /></div>
            <div>
              <div className="admin-health-issue-title">Failed Login Attempts</div>
              <div className="admin-health-issue-number">{failedLogins.length}</div>
              {failedLogins.slice(0, 3).map((fail, idx) => (
                <div key={idx} className="admin-health-issue-item">{fail.email}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RECENT ERRORS */}
      <div className="admin-health-section">
        <div className="admin-health-section-header">
          <h2><FiAlertCircle /> Recent Errors</h2>
          <span className="admin-health-badge">{errors.length} Total</span>
        </div>
        <div className="admin-health-error-list">
          {errors.length === 0 ? (
            <div className="admin-health-empty-state">✅ No errors recorded - System is healthy!</div>
          ) : (
            errors.slice(0, 20).map((error, idx) => (
              <div key={idx} className="admin-health-error-item" onClick={() => { setSelectedError(error); setShowErrorModal(true); }}>
                <div className="admin-health-error-time">{new Date(error.timestamp).toLocaleString()}</div>
                <div className="admin-health-error-status" style={{ backgroundColor: error.statusCode >= 500 ? '#ef4444' : '#f59e0b' }}>{error.statusCode}</div>
                <div className="admin-health-error-endpoint">{error.endpoint}</div>
                <div className="admin-health-error-user">{getUserDisplay(error.userId)}</div>
                <FiEye className="admin-health-error-view" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* SLOW REQUESTS */}
      <div className="admin-health-section">
        <div className="admin-health-section-header">
          <h2><FiClock /> Slow Requests {`(>2s)`}</h2>
          <span className="admin-health-badge">{slowRequests.length}</span>
        </div>
        <div className="admin-health-slow-list">
          {slowRequests.length === 0 ? (
            <div className="admin-health-empty-state">✅ No slow requests detected</div>
          ) : (
            slowRequests.slice(0, 10).map((req, idx) => (
              <div key={idx} className="admin-health-slow-item">
                <div className="admin-health-slow-duration">{req.duration}ms</div>
                <div className="admin-health-slow-endpoint">{req.endpoint}</div>
                <div className="admin-health-slow-user">{getUserDisplay(req.userId)}</div>
                <div className="admin-health-slow-time">{new Date(req.timestamp).toLocaleTimeString()}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* USER REPORTS */}
      <div className="admin-health-section">
        <div className="admin-health-section-header">
          <h2><FiEye /> User Reports</h2>
          <span className="admin-health-badge">{reports.length} Total</span>
        </div>
        <div className="admin-health-reports-list">
          {reports.length === 0 ? (
            <div className="admin-health-empty-state">📭 No user reports</div>
          ) : (
            reports.slice(0, 10).map((report) => (
              <div key={report.id} className="admin-health-report-item">
                <div className="admin-health-report-severity" style={{ backgroundColor: report.severity === 'critical' ? '#ef4444' : report.severity === 'high' ? '#f97316' : '#f59e0b' }} />
                <div className="admin-health-report-content">
                  <div className="admin-health-report-title">{report.title}</div>
                  <div className="admin-health-report-description">{report.description}</div>
                  <div className="admin-health-report-meta">
                    <span>📅 {new Date(report.createdAt).toLocaleString()}</span>
                    <span>👤 {report.userName || report.userId || 'Anonymous'}</span>
                  </div>
                </div>
                {report.status === 'pending' && (
                  <button className="admin-health-resolve-btn" onClick={() => handleResolveReport(report.id)}>Resolve</button>
                )}
                {report.status === 'resolved' && <FiCheckCircle className="admin-health-resolved-icon" />}
              </div>
            ))
          )}
        </div>
      </div>

      {/* DATABASE STATS */}
      <div className="admin-health-section">
        <div className="admin-health-section-header">
          <h2><FiDatabase /> Database Statistics</h2>
        </div>
        <div className="admin-health-db-stats-grid">
          {databaseStats && Object.entries(databaseStats).map(([key, value]) => {
            const labels = {
              users: '👤 Users',
              announcements: '📢 Announcements',
              massPrograms: '⛪ Mass Programs',
              pledges: '💰 Pledges',
              songs: '🎵 Songs',
              media: '🖼️ Media',
              games: '🎮 Games',
              messages: '💬 Messages',
              notifications: '🔔 Notifications',
              attendanceSheets: '📋 Attendance Sheets',
              attendanceEntries: '✅ Attendance Entries'
            };
            return (
              <div key={key} className="admin-health-db-stat-card">
                <div className="admin-health-db-stat-value">{value.toLocaleString()}</div>
                <div className="admin-health-db-stat-label">{labels[key] || key.replace(/([A-Z])/g, ' $1').toUpperCase()}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RECENT USER ACTIVITY */}
      <div className="admin-health-section">
        <div className="admin-health-section-header">
          <h2><FiUserCheck /> Recent User Activity</h2>
        </div>
        <div className="admin-health-logins-list">
          {recentLogins.slice(0, 10).map((login, idx) => (
            <div key={idx} className="admin-health-login-item">
              <div>
                <div className="admin-health-login-name">{login.fullName || login.email || 'Unknown User'}</div>
                <div className="admin-health-login-email">{login.email}</div>
              </div>
              <div className="admin-health-login-role">{login.role?.toUpperCase() || 'MEMBER'}</div>
              <div className="admin-health-login-time">{new Date(login.lastActive).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ERROR DETAIL MODAL */}
      {showErrorModal && selectedError && (
        <div className="admin-health-modal-overlay" onClick={() => setShowErrorModal(false)}>
          <div className="admin-health-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-health-modal-header">
              <h3>🔍 Error Details</h3>
              <button className="admin-health-modal-close" onClick={() => setShowErrorModal(false)}><FiX /></button>
            </div>
            <div className="admin-health-modal-body">
              <div className="admin-health-modal-row">
                <span className="admin-health-modal-label">Status:</span>
                <span className="admin-health-modal-value" style={{ color: selectedError.statusCode >= 500 ? '#ef4444' : '#f59e0b' }}>
                  {selectedError.statusCode}
                </span>
              </div>
              <div className="admin-health-modal-row">
                <span className="admin-health-modal-label">Endpoint:</span>
                <span className="admin-health-modal-value">{selectedError.endpoint}</span>
              </div>
              <div className="admin-health-modal-row">
                <span className="admin-health-modal-label">Method:</span>
                <span className="admin-health-modal-value">{selectedError.method}</span>
              </div>
              <div className="admin-health-modal-row">
                <span className="admin-health-modal-label">Message:</span>
                <span className="admin-health-modal-value">{selectedError.message}</span>
              </div>
              <div className="admin-health-modal-row">
                <span className="admin-health-modal-label">Time:</span>
                <span className="admin-health-modal-value">{new Date(selectedError.timestamp).toLocaleString()}</span>
              </div>
              <div className="admin-health-modal-row">
                <span className="admin-health-modal-label">User:</span>
                <span className="admin-health-modal-value">{getUserDisplay(selectedError.userId)}</span>
              </div>
              <div className="admin-health-modal-row">
                <span className="admin-health-modal-label">IP Address:</span>
                <span className="admin-health-modal-value">{selectedError.ip || 'Unknown'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* ============================================
           ADMIN HEALTH CENTRE - COMPLETE STYLES
           Mobile-first responsive design
           ============================================ */

        /* Container */
        .admin-health-container {
          padding: 16px;
          background: #f8fafc;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          max-width: 1400px;
          margin: 0 auto;
        }

        /* Header */
        .admin-health-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .admin-health-title {
          font-size: 22px;
          font-weight: 700;
          margin: 0;
          color: #1e293b;
        }

        .admin-health-subtitle {
          font-size: 13px;
          color: #64748b;
          margin: 4px 0 0 0;
        }

        .admin-health-header-actions {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .admin-health-last-updated {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #64748b;
          background: #f1f5f9;
          padding: 4px 10px;
          border-radius: 8px;
        }

        .admin-health-auto-btn,
        .admin-health-export-btn,
        .admin-health-clear-btn {
          padding: 6px 12px;
          border-radius: 8px;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 11px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .admin-health-auto-btn {
          background: #94a3b8;
        }
        .admin-health-auto-btn.active {
          background: #10b981;
        }
        .admin-health-export-btn {
          background: #3b82f6;
        }
        .admin-health-clear-btn {
          background: #ef4444;
        }

        /* Score Grid */
        .admin-health-score-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }

        @media (min-width: 768px) {
          .admin-health-score-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .admin-health-score-card,
        .admin-health-security-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          border: 1px solid #e2e8f0;
        }

        .admin-health-score-left {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 12px;
        }

        .admin-health-score-label {
          font-size: 13px;
          color: #64748b;
        }

        .admin-health-score-value {
          font-size: 28px;
          font-weight: 800;
          color: #1e293b;
        }

        .admin-health-score-bar {
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          margin-bottom: 12px;
          overflow: hidden;
        }

        .admin-health-score-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.5s ease;
        }

        .admin-health-score-stats {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: #475569;
          flex-wrap: wrap;
        }

        /* Stats Grid */
        .admin-health-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }

        @media (min-width: 480px) {
          .admin-health-stats-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (min-width: 768px) {
          .admin-health-stats-grid {
            grid-template-columns: repeat(6, 1fr);
          }
        }

        .admin-health-stat-card {
          background: white;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          border: 1px solid #e2e8f0;
        }

        .admin-health-stat-icon {
          font-size: 24px;
          color: #3b82f6;
        }

        .admin-health-stat-label {
          font-size: 10px;
          color: #64748b;
          margin-bottom: 2px;
        }

        .admin-health-stat-value {
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
        }

        .admin-health-stat-trend {
          font-size: 10px;
          color: #94a3b8;
          margin-top: 2px;
        }

        /* Charts Grid */
        .admin-health-charts-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }

        @media (min-width: 768px) {
          .admin-health-charts-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .admin-health-chart-card {
          background: white;
          border-radius: 12px;
          padding: 16px;
          border: 1px solid #e2e8f0;
        }

        .admin-health-chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 8px;
        }

        .admin-health-chart-header h3 {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .admin-health-legend {
          display: flex;
          gap: 12px;
          font-size: 11px;
        }

        .admin-health-legend-dot {
          width: 12px;
          height: 12px;
          border-radius: 3px;
          display: inline-block;
          margin-right: 4px;
        }

        .admin-health-legend-dot.error-5xx { background: #ef4444; }
        .admin-health-legend-dot.error-4xx { background: #f59e0b; }

        .admin-health-chart-label {
          font-size: 11px;
          color: #64748b;
        }

        /* Storage Grid */
        .admin-health-storage-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }

        @media (min-width: 480px) {
          .admin-health-storage-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .admin-health-storage-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          border: 1px solid #e2e8f0;
        }

        .admin-health-storage-icon {
          font-size: 28px;
          margin-bottom: 8px;
          color: #3b82f6;
        }

        .admin-health-storage-value {
          font-size: 28px;
          font-weight: 700;
          color: #1e293b;
        }

        .admin-health-storage-label {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 8px;
        }

        .admin-health-storage-bar {
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 6px;
        }

        .admin-health-storage-details {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #94a3b8;
        }

        .admin-health-storage-types {
          display: flex;
          justify-content: center;
          gap: 12px;
          font-size: 11px;
          color: #64748b;
          margin-top: 8px;
          flex-wrap: wrap;
        }

        /* Section */
        .admin-health-section {
          background: white;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
          border: 1px solid #e2e8f0;
        }

        .admin-health-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          flex-wrap: wrap;
          gap: 8px;
        }

        .admin-health-section-header h2 {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .admin-health-badge {
          background: #f1f5f9;
          padding: 2px 10px;
          border-radius: 16px;
          font-size: 11px;
          font-weight: 500;
          color: #475569;
        }

        .admin-health-refresh-btn {
          background: #f1f5f9;
          border: none;
          padding: 4px 10px;
          border-radius: 6px;
          color: #475569;
          cursor: pointer;
          font-size: 11px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        /* Services */
        .admin-health-services-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        @media (min-width: 480px) {
          .admin-health-services-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (min-width: 768px) {
          .admin-health-services-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        .admin-health-service-card {
          background: #f8fafc;
          border-radius: 10px;
          padding: 14px;
          position: relative;
          border: 1px solid #e2e8f0;
        }

        .admin-health-service-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          position: absolute;
          top: 12px;
          right: 12px;
        }

        .admin-health-service-name {
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 4px;
        }

        .admin-health-service-status {
          font-size: 11px;
          margin-bottom: 8px;
        }

        .admin-health-test-btn {
          background: #f1f5f9;
          border: none;
          padding: 3px 10px;
          border-radius: 4px;
          color: #475569;
          cursor: pointer;
          font-size: 10px;
        }

        .admin-health-spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* User Issues */
        .admin-health-user-issues-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        @media (min-width: 480px) {
          .admin-health-user-issues-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 768px) {
          .admin-health-user-issues-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .admin-health-issue-card {
          background: #f8fafc;
          border-radius: 10px;
          padding: 14px;
          display: flex;
          gap: 12px;
          border: 1px solid #e2e8f0;
        }

        .admin-health-issue-icon {
          font-size: 20px;
        }

        .admin-health-issue-title {
          font-size: 11px;
          color: #64748b;
          margin-bottom: 2px;
        }

        .admin-health-issue-number {
          font-size: 22px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 6px;
        }

        .admin-health-issue-item {
          font-size: 10px;
          color: #94a3b8;
          padding: 2px 0;
        }

        /* Error List */
        .admin-health-error-list {
          max-height: 400px;
          overflow-y: auto;
        }

        .admin-health-error-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px;
          border-bottom: 1px solid #e2e8f0;
          cursor: pointer;
          font-size: 12px;
          flex-wrap: wrap;
        }

        .admin-health-error-time {
          font-size: 10px;
          color: #64748b;
          min-width: 120px;
        }

        .admin-health-error-status {
          padding: 2px 8px;
          border-radius: 4px;
          color: white;
          font-weight: 600;
          font-size: 11px;
          min-width: 35px;
          text-align: center;
        }

        .admin-health-error-endpoint {
          flex: 1;
          color: #1e293b;
          font-family: monospace;
          font-size: 11px;
          word-break: break-all;
        }

        .admin-health-error-user {
          color: #64748b;
          font-size: 11px;
          min-width: 80px;
        }

        .admin-health-error-view {
          color: #94a3b8;
          cursor: pointer;
          flex-shrink: 0;
        }

        /* Slow List */
        .admin-health-slow-list {
          max-height: 300px;
          overflow-y: auto;
        }

        .admin-health-slow-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 12px;
          flex-wrap: wrap;
        }

        .admin-health-slow-duration {
          color: #ef4444;
          font-weight: 600;
          min-width: 60px;
        }

        .admin-health-slow-endpoint {
          flex: 1;
          color: #1e293b;
          font-family: monospace;
          font-size: 11px;
          word-break: break-all;
        }

        .admin-health-slow-user {
          color: #64748b;
          font-size: 11px;
          min-width: 80px;
        }

        .admin-health-slow-time {
          color: #94a3b8;
          font-size: 10px;
        }

        /* Reports */
        .admin-health-reports-list {
          max-height: 300px;
          overflow-y: auto;
        }

        .admin-health-report-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px;
          border-bottom: 1px solid #e2e8f0;
        }

        .admin-health-report-severity {
          width: 4px;
          height: 40px;
          border-radius: 2px;
          flex-shrink: 0;
        }

        .admin-health-report-content {
          flex: 1;
        }

        .admin-health-report-title {
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
        }

        .admin-health-report-description {
          font-size: 12px;
          color: #64748b;
          margin: 4px 0;
        }

        .admin-health-report-meta {
          display: flex;
          gap: 12px;
          font-size: 10px;
          color: #94a3b8;
          flex-wrap: wrap;
        }

        .admin-health-resolve-btn {
          background: #10b981;
          border: none;
          padding: 4px 10px;
          border-radius: 4px;
          color: white;
          cursor: pointer;
          font-size: 10px;
          font-weight: 500;
        }

        .admin-health-resolved-icon {
          color: #10b981;
          font-size: 18px;
        }

        /* DB Stats */
        .admin-health-db-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        @media (min-width: 480px) {
          .admin-health-db-stats-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (min-width: 768px) {
          .admin-health-db-stats-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        .admin-health-db-stat-card {
          background: #f8fafc;
          text-align: center;
          padding: 14px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }

        .admin-health-db-stat-value {
          font-size: 20px;
          font-weight: 700;
          color: #3b82f6;
        }

        .admin-health-db-stat-label {
          font-size: 9px;
          color: #64748b;
          margin-top: 4px;
        }

        /* Logins */
        .admin-health-logins-list {
          max-height: 300px;
          overflow-y: auto;
        }

        .admin-health-login-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          border-bottom: 1px solid #e2e8f0;
          flex-wrap: wrap;
          gap: 6px;
        }

        .admin-health-login-name {
          font-size: 13px;
          font-weight: 500;
          color: #1e293b;
        }

        .admin-health-login-email {
          font-size: 11px;
          color: #64748b;
        }

        .admin-health-login-role {
          font-size: 10px;
          background: #f1f5f9;
          padding: 2px 8px;
          border-radius: 10px;
          color: #475569;
        }

        .admin-health-login-time {
          font-size: 10px;
          color: #94a3b8;
        }

        /* Empty State */
        .admin-health-empty-state {
          text-align: center;
          padding: 30px;
          color: #94a3b8;
          font-size: 13px;
        }

        /* Modal */
        .admin-health-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }

        .admin-health-modal {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 500px;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
        }

        .admin-health-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #e2e8f0;
        }

        .admin-health-modal-header h3 {
          font-size: 16px;
          margin: 0;
          color: #1e293b;
        }

        .admin-health-modal-close {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #94a3b8;
        }

        .admin-health-modal-body {
          padding: 16px 20px;
        }

        .admin-health-modal-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          border-bottom: 1px solid #f1f5f9;
          gap: 12px;
        }

        .admin-health-modal-label {
          font-weight: 600;
          color: #64748b;
          font-size: 12px;
          flex-shrink: 0;
        }

        .admin-health-modal-value {
          color: #1e293b;
          font-family: monospace;
          font-size: 12px;
          text-align: right;
          word-break: break-all;
        }

        /* Skeleton */
        .skeleton-card {
          background: white;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid #e2e8f0;
        }

        .skeleton-icon {
          width: 40px;
          height: 40px;
          background: #e2e8f0;
          border-radius: 10px;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .skeleton-title {
          width: 80px;
          height: 12px;
          background: #e2e8f0;
          border-radius: 4px;
          margin-bottom: 6px;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .skeleton-value {
          width: 50px;
          height: 22px;
          background: #e2e8f0;
          border-radius: 4px;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .skeleton-text-large {
          width: 200px;
          height: 28px;
          background: #e2e8f0;
          border-radius: 6px;
          margin-bottom: 8px;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .skeleton-text-medium {
          width: 300px;
          height: 16px;
          background: #e2e8f0;
          border-radius: 6px;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .skeleton-chart {
          background: white;
          border-radius: 12px;
          padding: 16px;
          border: 1px solid #e2e8f0;
        }

        .skeleton-chart-title {
          width: 150px;
          height: 20px;
          background: #e2e8f0;
          border-radius: 4px;
          margin-bottom: 16px;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .skeleton-chart-body {
          height: 200px;
          background: #e2e8f0;
          border-radius: 8px;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* Responsive Fine-Tuning */
        @media (max-width: 480px) {
          .admin-health-container {
            padding: 10px;
          }

          .admin-health-title {
            font-size: 18px;
          }

          .admin-health-header-actions {
            width: 100%;
            justify-content: flex-start;
          }

          .admin-health-auto-btn,
          .admin-health-export-btn,
          .admin-health-clear-btn {
            font-size: 10px;
            padding: 4px 10px;
          }

          .admin-health-stat-card {
            padding: 12px;
          }

          .admin-health-stat-value {
            font-size: 15px;
          }

          .admin-health-score-value {
            font-size: 22px;
          }

          .admin-health-error-item {
            font-size: 11px;
          }

          .admin-health-error-time {
            min-width: 80px;
            font-size: 9px;
          }

          .admin-health-modal {
            max-width: 100%;
            margin: 10px;
          }
        }

        @media (min-width: 1024px) {
          .admin-health-container {
            padding: 24px;
          }

          .admin-health-title {
            font-size: 28px;
          }

          .admin-health-stats-grid {
            gap: 16px;
          }
        }
      `}</style>
    </div>
  );
}

export default AdminHealthCentre;