import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import BASE_URL from '../../api';
import { 
  Calendar, MapPin, Clock, Users, CheckCircle, 
  ArrowLeft, RefreshCw, ChevronRight, TrendingUp, 
  Award, Zap, Shield, Bell, Coffee, Sun, Moon, QrCode, Lock
} from 'lucide-react';
import logo from '../../assets/zuca-logo.png';
import { FaFileAlt } from 'react-icons/fa';
import QRScanner from '../../components/member/attendance/QRScanner';
import CelebrationOverlay from '../../components/CelebrationOverlay';

import { getDeviceId, getDeviceName } from '../../utils/deviceId';
import { saveOfflineCheckin, getPendingCount, getPendingCheckins, syncOfflineCheckins } from '../../utils/offlineStorage';

export default function MemberAttendance() {
  const navigate = useNavigate();
  const [activeSheets, setActiveSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [greeting, setGreeting] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  
  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };
  
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const [showQRScanner, setShowQRScanner] = useState(false);

  const checkWiFiNetwork = async (sheet) => {
    if (!sheet.enableWifiCheckin) return true;
    
    const userNetwork = prompt(
      `🔐 Wi-Fi Verification Required\n\n` +
      `This meeting requires connection to:\n` +
      `📡 "${sheet.wifiSSID}"\n\n` +
      `Please enter the EXACT Wi-Fi network name you are connected to:`
    );
    
    if (userNetwork && userNetwork.trim() === sheet.wifiSSID) {
      return true;
    } else if (userNetwork) {
      showToast(`❌ Wrong Wi-Fi Network!\nYou need to connect to "${sheet.wifiSSID}"`, 'error');
      return false;
    }
    return false;
  };
  
  const fetchActiveSheets = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/api/attendance/active`, {
        headers: getHeaders()
      });
      setActiveSheets(response.data.sheets || []);
    } catch (error) {
      console.error('Error fetching active sheets:', error);
      showToast('Failed to load meetings', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCheckin = async (sheetId) => {
    const sheet = activeSheets.find(s => s.id === sheetId);
    if (!sheet) return;
    
    setCheckingIn(sheetId);
    
    if (!isOnline) {
      try {
        const pending = await getPendingCheckins();
        const alreadyPending = pending.some(p => p.sheetId === sheetId);
        
        if (alreadyPending) {
          showToast('⚠️ You already have a pending check-in for this meeting. Will sync when online.', 'info');
          setCheckingIn(null);
          return;
        }
        
        const saved = await saveOfflineCheckin(sheetId, getDeviceId(), getDeviceName());
        if (saved) {
          const newCount = await getPendingCount();
          setPendingCount(newCount);
          showToast('📱 Offline check-in saved! Will sync when online.', 'info');
        } else {
          showToast('❌ Failed to save offline check-in', 'error');
        }
      } catch (error) {
        console.error('Offline check-in error:', error);
        showToast('❌ Failed to save offline check-in', 'error');
      } finally {
        setCheckingIn(null);
      }
      return;
    }
    
    try {
      await axios.post(`${BASE_URL}/api/attendance/self-checkin`, {
        sheetId,
        deviceId: getDeviceId(),
        deviceName: getDeviceName()
      }, {
        headers: getHeaders()
      });
      
      setShowCelebration(true);
      
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
      
      setTimeout(() => {
        setShowCelebration(false);
      }, 3500);
      
      showToast('✅ Checked in successfully!', 'success');
      fetchActiveSheets();
      
    } catch (error) {
      const errorMsg = error.response?.data;
      const status = error.response?.status;
      
      if (errorMsg?.error === 'Invalid Wi-Fi network for this meeting') {
        showToast(`❌ Wrong Wi-Fi Network!\n\nPlease connect to: "${sheet.wifiSSID}"`, 'error');
      } 
      else if (errorMsg?.error === 'ALREADY_CHECKED_IN') {
        showToast(`⚠️ Already checked in for "${sheet.title}"`, 'error');
      } 
      else if (errorMsg?.error === 'DEVICE_ALREADY_USED') {
        showToast(`⚠️ This device has already been used to check someone into this meeting.`, 'error');
      }
      else if (status === 403) {
        showToast(`🔒 Self check-in is not enabled for this meeting.`, 'error');
      }
      else if (status === 404) {
        showToast(`📋 This attendance sheet may have been closed.`, 'error');
      }
      else {
        showToast(`❌ Check-in failed\n\n${errorMsg?.message || 'Please try again.'}`, 'error');
      }
    } finally {
      setCheckingIn(null);
    }
  };
  
  const handleWifiCheckin = async (sheetId, wifiSSID) => {
    const sheet = activeSheets.find(s => s.id === sheetId);
    if (!sheet) return;
    
    const confirmed = window.confirm(
      `📡 Wi-Fi Check-in\n\n` +
      `Make sure you are connected to:\n` +
      `"${wifiSSID}"\n\n` +
      `Click OK to check in using this network.`
    );
    
    if (!confirmed) return;
    
    setCheckingIn(sheetId);
    try {
      await axios.post(`${BASE_URL}/api/attendance/wifi-checkin`, {
        sheetId,
        ssid: wifiSSID,
        deviceId: getDeviceId(),
        deviceName: getDeviceName()
      }, {
        headers: getHeaders()
      });
      showToast('✅ Wi-Fi check-in successful!', 'success');
      fetchActiveSheets();
    } catch (error) {
      const errorMsg = error.response?.data;
      if (errorMsg?.error === 'Invalid Wi-Fi network for this meeting') {
        showToast(`❌ Wrong Wi-Fi network. Please connect to "${wifiSSID}"`, 'error');
      } else if (errorMsg?.error === 'ALREADY_CHECKED_IN') {
        showToast('You have already checked in for this meeting', 'error');
      } else if (errorMsg?.error === 'DEVICE_ALREADY_USED') {
        showToast('This device has already been used to check someone in', 'error');
      } else {
        showToast(errorMsg?.message || 'Wi-Fi check-in failed', 'error');
      }
    } finally {
      setCheckingIn(null);
    }
  };

  useEffect(() => {
    if (!isOnline) return;
    
    const checkPending = async () => {
      const count = await getPendingCount();
      if (count !== pendingCount) {
        setPendingCount(count);
      }
    };
    
    const interval = setInterval(checkPending, 3000);
    return () => clearInterval(interval);
  }, [isOnline, pendingCount]);

  useEffect(() => {
    const registerBackgroundSync = async () => {
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        try {
          await registration.sync.register('sync-checkins');
          console.log('✅ Background sync registered');
        } catch (err) {
          console.error('Background sync registration failed:', err);
        }
      } else {
        console.log('Background sync not supported');
      }
    };
    
    registerBackgroundSync();
  }, []);

  useEffect(() => {
    let syncInterval;
    
    const backgroundSync = async () => {
      if (navigator.onLine) {
        const pending = await getPendingCount();
        if (pending > 0) {
          console.log(`🔄 Background sync: ${pending} pending check-ins`);
          setSyncing(true);
          const result = await syncOfflineCheckins();
          if (result.synced > 0) {
            showToast(`✅ ${result.synced} offline check-in(s) synced!`, 'success');
            fetchActiveSheets();
          }
          const newCount = await getPendingCount();
          setPendingCount(newCount);
          setSyncing(false);
        }
      }
    };
    
    syncInterval = setInterval(backgroundSync, 30000);
    
    return () => clearInterval(syncInterval);
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      console.log('🟢 Back online!');
      setIsOnline(true);
      setSyncing(true);
      
      const result = await syncOfflineCheckins();
      
      if (result.synced > 0) {
        showToast(`✅ ${result.synced} offline check-in(s) synced!`, 'success');
        fetchActiveSheets();
      }
      
      const newCount = await getPendingCount();
      setPendingCount(newCount);
      
      setSyncing(false);
    };
    
    const handleOffline = () => {
      console.log('🔴 Offline mode');
      setIsOnline(false);
      showToast('📱 You are offline. Check-ins will be saved and synced when online.', 'info');
      
      const loadCount = async () => {
        const count = await getPendingCount();
        setPendingCount(count);
      };
      loadCount();
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const loadPendingCount = async () => {
      const count = await getPendingCount();
      setPendingCount(count);
    };
    loadPendingCount();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  useEffect(() => {
    fetchActiveSheets();
    
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning ☀️");
    else if (hour < 17) setGreeting("Good Afternoon 🌤️");
    else setGreeting("Good Evening 🌙");
  }, []);
  
  const totalCheckedIn = activeSheets.reduce((sum, sheet) => sum + (sheet._count?.entries || 0), 0);
  const totalMeetings = activeSheets.length;
  
  // Skeleton Loader
  if (loading) {
    return (
      <div className="member-attendance">
        <div className="skeleton-wrapper">
          {/* Hero Header Skeleton */}
          <div className="hero-header skeleton">
            <div className="hero-bg-pattern"></div>
            <div className="skeleton-header-content">
              <div className="skeleton-back-btn"></div>
              <div className="hero-content">
                <div className="skeleton-greeting"></div>
                <div className="skeleton-title"></div>
                <div className="skeleton-subtitle"></div>
              </div>
              <div className="skeleton-refresh-btn"></div>
            </div>
          </div>

          {/* Stats Skeleton */}
          <div className="stats-overview">
            {[1, 2, 3].map((item) => (
              <div key={item} className="stat-card-overview skeleton">
                <div className="stat-icon-skeleton"></div>
                <div className="stat-info-skeleton">
                  <div className="skeleton-line value"></div>
                  <div className="skeleton-line label"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Meeting Cards Skeleton */}
          <div className="meetings-list">
            {[1, 2].map((item) => (
              <div key={item} className="meeting-card-premium skeleton-card">
                <div className="skeleton-card-header">
                  <div className="skeleton-badge-group">
                    <div className="skeleton-badge"></div>
                    <div className="skeleton-badge"></div>
                  </div>
                  <div className="skeleton-time"></div>
                </div>
                <div className="skeleton-title-line"></div>
                <div className="skeleton-details">
                  <div className="skeleton-detail"></div>
                  <div className="skeleton-detail"></div>
                  <div className="skeleton-detail"></div>
                </div>
                <div className="skeleton-progress">
                  <div className="skeleton-progress-bar"></div>
                </div>
                <div className="skeleton-actions">
                  <div className="skeleton-btn"></div>
                  <div className="skeleton-btn primary"></div>
                </div>
              </div>
            ))}
          </div>

          {/* History Skeleton */}
          <div className="history-section-premium skeleton-history">
            <div className="skeleton-history-content">
              <div className="skeleton-history-icon"></div>
              <div className="skeleton-history-text">
                <div className="skeleton-line"></div>
                <div className="skeleton-line short"></div>
              </div>
              <div className="skeleton-history-btn"></div>
            </div>
          </div>
        </div>

        <style>{`
          .skeleton-wrapper {
            min-height: 100vh;
            background: linear-gradient(135deg, #f5f7fa 0%, #e9edf2 100%);
          }

          /* Skeleton base */
          .skeleton {
            position: relative;
            overflow: hidden;
            background: #e2e8f0 !important;
          }

          .skeleton::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(
              90deg,
              transparent 0%,
              rgba(255, 255, 255, 0.6) 50%,
              transparent 100%
            );
            animation: shimmer 1.5s ease-in-out infinite;
          }

          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }

          /* Header Skeleton */
          .skeleton-header-content {
            padding: 30px 24px 40px;
            position: relative;
          }

          .skeleton-back-btn {
            width: 80px;
            height: 36px;
            background: #475569 !important;
            border-radius: 40px;
            margin-bottom: 20px;
          }

          .skeleton-greeting {
            width: 140px;
            height: 28px;
            background: #475569 !important;
            border-radius: 40px;
            margin: 0 auto 16px;
          }

          .skeleton-title {
            width: 240px;
            height: 44px;
            background: #475569 !important;
            border-radius: 8px;
            margin: 0 auto 12px;
          }

          .skeleton-subtitle {
            width: 280px;
            height: 20px;
            background: #475569 !important;
            border-radius: 4px;
            margin: 0 auto;
          }

          .skeleton-refresh-btn {
            width: 40px;
            height: 40px;
            background: #475569 !important;
            border-radius: 40px;
            position: absolute;
            top: 30px;
            right: 24px;
          }

          /* Stats Skeleton */
          .stat-card-overview.skeleton {
            flex: 1;
            background: #f1f5f9 !important;
            border-radius: 20px;
            padding: 16px 20px;
            display: flex;
            align-items: center;
            gap: 14px;
            min-height: 70px;
            border: 1px solid #e2e8f0;
          }

          .stat-icon-skeleton {
            width: 48px;
            height: 48px;
            background: #cbd5e1 !important;
            border-radius: 16px;
            flex-shrink: 0;
          }

          .stat-info-skeleton {
            flex: 1;
          }

          .skeleton-line {
            background: #cbd5e1 !important;
            border-radius: 4px;
            height: 14px;
          }

          .skeleton-line.value {
            width: 40px;
            height: 28px;
            margin-bottom: 4px;
            background: #94a3b8 !important;
          }

          .skeleton-line.label {
            width: 60px;
            height: 12px;
          }

          /* Meeting Cards Skeleton */
          .skeleton-card {
            background: white !important;
            border-radius: 28px;
            padding: 24px;
            border: 1px solid #e2e8f0;
            min-height: 280px;
          }

          .skeleton-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
          }

          .skeleton-badge-group {
            display: flex;
            gap: 8px;
          }

          .skeleton-badge {
            width: 80px;
            height: 28px;
            background: #cbd5e1 !important;
            border-radius: 30px;
          }

          .skeleton-time {
            width: 80px;
            height: 28px;
            background: #cbd5e1 !important;
            border-radius: 30px;
          }

          .skeleton-title-line {
            width: 200px;
            height: 28px;
            background: #cbd5e1 !important;
            border-radius: 4px;
            margin-bottom: 20px;
          }

          .skeleton-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 20px;
          }

          .skeleton-detail {
            height: 60px;
            background: #f1f5f9 !important;
            border-radius: 16px;
          }

          .skeleton-progress {
            margin-bottom: 20px;
          }

          .skeleton-progress-bar {
            height: 8px;
            background: #e2e8f0 !important;
            border-radius: 10px;
            width: 100%;
          }

          .skeleton-actions {
            display: flex;
            gap: 12px;
          }

          .skeleton-btn {
            flex: 1;
            height: 52px;
            background: #e2e8f0 !important;
            border-radius: 20px;
          }

          .skeleton-btn.primary {
            background: #cbd5e1 !important;
          }

          /* History Skeleton */
          .skeleton-history {
            margin: 24px 24px 40px;
            padding: 24px;
            background: white !important;
            border-radius: 24px;
            border: 1px solid #e2e8f0;
          }

          .skeleton-history-content {
            display: flex;
            align-items: center;
            gap: 20px;
            flex-wrap: wrap;
          }

          .skeleton-history-icon {
            width: 56px;
            height: 56px;
            background: #cbd5e1 !important;
            border-radius: 20px;
            flex-shrink: 0;
          }

          .skeleton-history-text {
            flex: 1;
          }

          .skeleton-history-text .skeleton-line {
            height: 16px;
            margin-bottom: 6px;
            width: 160px;
          }

          .skeleton-history-text .skeleton-line.short {
            width: 200px;
            height: 14px;
            margin-bottom: 0;
          }

          .skeleton-history-btn {
            width: 140px;
            height: 44px;
            background: #cbd5e1 !important;
            border-radius: 40px;
          }

          /* Hero header skeleton */
          .hero-header.skeleton {
            background: #1e293b !important;
          }

          .hero-header.skeleton .skeleton-back-btn,
          .hero-header.skeleton .skeleton-greeting,
          .hero-header.skeleton .skeleton-title,
          .hero-header.skeleton .skeleton-subtitle,
          .hero-header.skeleton .skeleton-refresh-btn {
            background: #475569 !important;
          }

          .hero-header.skeleton .skeleton-back-btn::after,
          .hero-header.skeleton .skeleton-greeting::after,
          .hero-header.skeleton .skeleton-title::after,
          .hero-header.skeleton .skeleton-subtitle::after,
          .hero-header.skeleton .skeleton-refresh-btn::after {
            display: none;
          }

          @media (max-width: 640px) {
            .skeleton-title {
              width: 180px;
              height: 36px;
            }

            .skeleton-subtitle {
              width: 220px;
            }

            .skeleton-stats {
              flex-direction: column;
              padding: 0 16px;
            }

            .skeleton-list {
              padding: 16px;
            }

            .skeleton-details {
              grid-template-columns: 1fr;
            }

            .skeleton-history-content {
              flex-direction: column;
              text-align: center;
            }

            .skeleton-history-text .skeleton-line {
              margin: 0 auto 6px;
            }
          }
        `}</style>
      </div>
    );
  }
  
  return (
    <div className="member-attendance">
      <CelebrationOverlay 
        show={showCelebration} 
        onComplete={() => setShowCelebration(false)} 
      />

      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.message}
        </div>
      )}
      
      {/* Hero Header */}
      <div className="hero-header">
        <div className="hero-bg-pattern"></div>
        <button className="back-btn-hero" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="hero-content">
          <div className="hero-greeting">
            <span className="greeting-emoji">👋</span>
            <span className="greeting-text">{greeting}</span>
          </div>
          <h1 className="hero-title">Active <span className="hero-highlight">Meetings</span></h1>
          <p className="hero-subtitle">Check in to today's zuca meetings and check your attendance</p>
        </div>
        <button className="refresh-btn-hero" onClick={fetchActiveSheets}>
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Offline Banner */}
      {(!isOnline || pendingCount > 0) && (
        <div className={`offline-banner ${!isOnline ? 'offline' : 'pending'}`}>
          <div className="banner-content">
            {!isOnline ? (
              <>
                <span className="banner-icon">📡</span>
                <span>You are offline</span>
                {pendingCount > 0 && <span className="pending-badge">{pendingCount} pending</span>}
                <span className="banner-text">Check-ins will sync when online</span>
              </>
            ) : pendingCount > 0 && (
              <>
                <span className="banner-icon">🔄</span>
                <span>Syncing {pendingCount} offline check-in(s)...</span>
                {syncing && <div className="sync-spinner-small"></div>}
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Stats Overview */}
      {activeSheets.length > 0 && (
        <div className="stats-overview">
          <div className="stat-card-overview">
            <div className="stat-icon-overview meetings">
              <Calendar size={20} />
            </div>
            <div className="stat-info-overview">
              <span className="stat-value-overview">{totalMeetings}</span>
              <span className="stat-label-overview">Active Meetings</span>
            </div>
          </div>
          <div className="stat-card-overview">
            <div className="stat-icon-overview members">
              <Users size={20} />
            </div>
            <div className="stat-info-overview">
              <span className="stat-value-overview">{totalCheckedIn}</span>
              <span className="stat-label-overview">Checked In</span>
            </div>
          </div>
          <div className="stat-card-overview">
            <div className="stat-icon-overview streak">
              <Award size={20} />
            </div>
            <div className="stat-info-overview">
              <span className="stat-value-overview">
                {totalMeetings > 0 ? Math.round((totalCheckedIn / (totalMeetings * 100)) * 100) : 0}%
              </span>
              <span className="stat-label-overview">Avg Attendance</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Meetings List */}
      {activeSheets.length === 0 ? (
        <div className="empty-state-premium">
          <div className="empty-state-icon"><FaFileAlt/></div>
          <h3>No Active Meetings</h3>
          <p>There are no active attendance sheets at the moment.</p>
          <div className="empty-state-decoration">
            <Coffee size={24} />
            <span>Check back later</span>
          </div>
        </div>
      ) : (
        <div className="meetings-list">
          {activeSheets.map((sheet, index) => (
            <div key={sheet.id} className="meeting-card-premium" style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="card-glow"></div>
              
              <div className="card-header-premium">
                <div className="badge-group">
                  {sheet.isActive ? (
                    <span className="live-badge-premium">
                      <Zap size={12} /> LIVE NOW
                    </span>
                  ) : (
                    <span className="closed-badge-premium">
                      <Lock size={12} /> CLOSED
                    </span>
                  )}
                  {sheet.enableQrCheckin && (
                    <span className="qr-badge-premium">
                      <QrCode size={12} /> QR Available
                    </span>
                  )}
                </div>
                <div className="time-badge">
                  <Clock size={14} />
                  <span>{sheet.eventTime || '4:30 PM'}</span>
                </div>
              </div>
              
              <h3 className="meeting-title-premium">{sheet.title}</h3>
              
              <div className="details-grid-premium">
                <div className="detail-card-premium">
                  <Calendar size={18} />
                  <div>
                    <span className="detail-label">Date</span>
                    <span className="detail-value">
                      {new Date(sheet.eventDate).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                </div>
                <div className="detail-card-premium">
                  <MapPin size={18} />
                  <div>
                    <span className="detail-label">Location</span>
                    <span className="detail-value">{sheet.location || 'ZUCA'}</span>
                  </div>
                </div>
                <div className="detail-card-premium">
                  <Users size={18} />
                  <div>
                    <span className="detail-label">Attendance</span>
                    <span className="detail-value">{sheet._count?.entries || 0} checked in</span>
                  </div>
                </div>
                {sheet.enableWifiCheckin && sheet.wifiSSID && (
                  <div className="detail-card-premium wifi-highlight">
                    <QrCode size={18} />
                    <div>
                      <span className="detail-label">QR Code Check-in</span>
                      <span className="detail-value">Scan QR Code to Check-in</span>
                    </div>
                  </div>
                )}
              </div>
              
              {sheet.totalMembers && (
                <div className="progress-section">
                  <div className="progress-header">
                    <span>Check-in Progress</span>
                    <span className="progress-percent">
                      {Math.round(((sheet._count?.entries || 0) / sheet.totalMembers) * 100)}%
                    </span>
                  </div>
                  <div className="progress-bar-premium">
                    <div 
                      className="progress-fill-premium" 
                      style={{ width: `${Math.round(((sheet._count?.entries || 0) / sheet.totalMembers) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              <div className="action-buttons-group">
                {sheet.enableWifiCheckin && (
                  <button 
                    className="checkin-btn-qr"
                    onClick={() => setShowQRScanner(true)}
                    disabled={checkingIn === sheet.id}
                  >
                    <QrCode size={18} />
                    Scan QR
                  </button>
                )}
                
                <button 
                  className="checkin-btn-premium"
                  onClick={() => handleCheckin(sheet.id)}
                  disabled={checkingIn === sheet.id}
                >
                  {checkingIn === sheet.id ? (
                    <>
                      <div className="btn-spinner"></div>
                      Checking in...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      Self Check-in
                      <ChevronRight size={18} className="btn-arrow" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* History Section */}
      <div className="history-section-premium">
        <div className="history-content">
          <div className="history-icon-wrapper">
           <img src={logo} alt="Loading..." style={{ width: '50px', height: '70px' }} />
          </div>
          <div className="history-text">
            <h4>Your Attendance Record</h4>
            <p>View your complete check-in history and statistics</p>
          </div>
          <button className="history-btn-premium" onClick={() => navigate('/member/attendance-history')}>
            View History <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {showQRScanner && (
        <QRScanner
          onClose={() => setShowQRScanner(false)}
          onSuccess={() => {
            showToast('✅ Checked in via QR Code!', 'success');
            fetchActiveSheets();
          }}
        />
      )}
      
      <style>{`
        .member-attendance {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #e9edf2 100%);
          margin-bottom: 70px;
          padding: 0;
        }
        
        .hero-header {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          padding: 0px 0px 0px;
          position: relative;
          overflow: hidden;
        }
        
        .hero-bg-pattern {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: radial-gradient(circle at 20% 80%, rgba(56, 189, 248, 0.08) 0%, transparent 50%);
          pointer-events: none;
        }
        
        .back-btn-hero {
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.2);
          padding: 8px 16px;
          border-radius: 40px;
          top: 20px;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          transition: all 0.2s;
        }
        
        .back-btn-hero:hover {
          background: rgba(255,255,255,0.2);
          transform: translateX(-4px);
        }
        
        .refresh-btn-hero {
          position: absolute;
          top: 7px;
          right: 24px;
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.2);
          width: 40px;
          height: 40px;
          border-radius: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .refresh-btn-hero:hover {
          background: rgba(255,255,255,0.2);
          transform: rotate(90deg);
        }
        
        .hero-content {
          text-align: center;
          margin-top: -24px;
        }
        
        .hero-greeting {
          display: inline-flex;
          align-items: top;
          gap: 8px;
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          padding: 6px 16px;
          border-radius: 40px;
          margin-top: -50px;
          margin-bottom: 0px;
        }
        
        .greeting-text {
          font-size: 13px;
          color: #94a3b8;
        }
        
        .hero-title {
          font-size: 36px;
          font-weight: 700;
          color: white;
          margin: 0 0 12px 0;
        }
        
        .hero-highlight {
          background: linear-gradient(135deg, #60a5fa, #c084fc);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        
        .hero-subtitle {
          font-size: 14px;
          color: #94a3b8;
          max-width: 400px;
          margin: 0 auto;
        }
        
        .stats-overview {
          display: flex;
          gap: 16px;
          padding: 0 24px;
          margin-top: 5px;
          position: relative;
          z-index: 2;
          flex-wrap: wrap;
        }
        
        .stat-card-overview {
          flex: 1;
          background: white;
          border-radius: 20px;
          padding: 3px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.08);
          border: 1px solid #e2e8f0;
        }
        
        .stat-icon-overview {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .stat-icon-overview.meetings { background: #eff6ff; color: #3b82f6; }
        .stat-icon-overview.members { background: #dcfce7; color: #22c55e; }
        .stat-icon-overview.streak { background: #fef3c7; color: #f59e0b; }
        
        .stat-info-overview {
          display: flex;
          flex-direction: column;
        }
        
        .stat-value-overview {
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
        }
        
        .stat-label-overview {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .meetings-list {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          max-width: 900px;
          margin: 0 auto;
        }
        
        .meeting-card-premium {
          background: white;
          border-radius: 28px;
          padding: 24px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: fadeInUp 0.5s ease forwards;
          opacity: 0;
          transform: translateY(20px);
        }
        
        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .meeting-card-premium:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 35px -12px rgba(0,0,0,0.15);
        }
        
        .card-glow {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #dc2626, #f97316, #dc2626);
          background-size: 200% 100%;
          animation: shimmerGlow 2s infinite;
        }
        
        @keyframes shimmerGlow {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        
        .card-header-premium {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 10px;
        }
        
        .closed-badge-premium {
          background: #64748b;
          color: white;
          font-size: 11px;
          font-weight: 600;
          padding: 5px 12px;
          border-radius: 30px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          letter-spacing: 0.5px;
        }
        
        .badge-group {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        
        .live-badge-premium {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: white;
          font-size: 11px;
          font-weight: 600;
          padding: 5px 12px;
          border-radius: 30px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          letter-spacing: 0.5px;
        }
        
        .qr-badge-premium {
          background: #dcfce7;
          color: #059669;
          font-size: 11px;
          font-weight: 600;
          padding: 5px 12px;
          border-radius: 30px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        
        .time-badge {
          background: #f8fafc;
          padding: 5px 12px;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 500;
          color: #64748b;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        
        .meeting-title-premium {
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 20px 0;
          letter-spacing: -0.3px;
        }
        
        .details-grid-premium {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }
        
        .detail-card-premium {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #f8fafc;
          border-radius: 16px;
          transition: all 0.2s;
        }
        
        .detail-card-premium:hover {
          background: #f1f5f9;
          transform: translateX(4px);
        }
        
        .detail-card-premium.wifi-highlight {
          background: #f0fdf4;
          border-left: 3px solid #22c55e;
        }
        
        .detail-card-premium div {
          display: flex;
          flex-direction: column;
        }
        
        .detail-label {
          font-size: 10px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .detail-value {
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
        }
        
        .progress-section {
          margin-bottom: 20px;
        }
        
        .progress-header {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #64748b;
          margin-bottom: 8px;
        }
        
        .progress-percent {
          font-weight: 700;
          color: #3b82f6;
        }
        
        .progress-bar-premium {
          height: 8px;
          background: #e2e8f0;
          border-radius: 10px;
          overflow: hidden;
        }
        
        .progress-fill-premium {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6);
          border-radius: 10px;
          transition: width 0.5s ease;
        }
        
        .checkin-btn-premium {
          width: 100%;
          background: linear-gradient(135deg, #1e293b, #0f172a);
          color: white;
          border: none;
          padding: 16px;
          border-radius: 20px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          position: relative;
          overflow: hidden;
        }
        
        .checkin-btn-premium::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s ease;
        }
        
        .checkin-btn-premium:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(15, 23, 42, 0.3);
        }
        
        .checkin-btn-premium:hover::before {
          left: 100%;
        }
        
        .checkin-btn-premium:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        
        .btn-arrow {
          transition: transform 0.2s ease;
        }
        
        .checkin-btn-premium:hover .btn-arrow {
          transform: translateX(4px);
        }
        
        .btn-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        
        .history-section-premium {
          padding: 24px;
          background: white;
          margin: 24px 24px 40px;
          border-radius: 24px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          border: 1px solid #e2e8f0;
        }
        
        .history-content {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }
        
        .history-icon-wrapper {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #eff6ff04, #e0f2fe04);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3b83f602;
        }
        
        .history-text {
          flex: 1;
        }
        
        .history-text h4 {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
        }
        
        .history-text p {
          margin: 0;
          font-size: 13px;
          color: #64748b;
        }
        
        .history-btn-premium {
          background: #f1f5f9;
          border: none;
          padding: 12px 24px;
          border-radius: 40px;
          font-weight: 600;
          font-size: 14px;
          color: #1e293b;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }
        
        .history-btn-premium:hover {
          background: #e2e8f0;
          gap: 12px;
        }
        
        .empty-state-premium {
          text-align: center;
          padding: 60px 24px;
          margin: 40px 24px;
          background: white;
          border-radius: 32px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        
        .empty-state-icon {
          font-size: 64px;
          margin-bottom: 20px;
        }
        
        .empty-state-premium h3 {
          font-size: 22px;
          margin-bottom: 8px;
          color: #1e293b;
        }
        
        .empty-state-premium p {
          color: #64748b;
          margin-bottom: 24px;
        }
        
        .empty-state-decoration {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 20px;
          background: #f8fafc;
          border-radius: 40px;
          font-size: 13px;
          color: #64748b;
        }
        
        .toast-notification {
          position: fixed;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          padding: 14px 24px;
          border-radius: 16px;
          background: #1e293b;
          color: white;
          font-size: 14px;
          z-index: 1000;
          animation: slideUp 0.3s ease;
          max-width: 350px;
          width: 90%;
          text-align: center;
          white-space: pre-line;
          line-height: 1.5;
        }
        
        .toast-notification.error {
          background: #ef4444;
        }
        
        .toast-notification.success {
          background: #22c55e;
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        
        .action-buttons-group {
          display: flex;
          gap: 12px;
          margin-top: 16px;
        }

        .checkin-btn-qr {
          flex: 1;
          background: linear-gradient(135deg, #059669, #047857);
          color: white;
          border: none;
          padding: 14px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .checkin-btn-qr:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(5, 150, 105, 0.3);
        }

        .offline-banner {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          border-radius: 50px;
          padding: 10px 20px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          animation: slideUp 0.3s ease;
        }

        .offline-banner.offline {
          background: #f59e0b;
          color: white;
        }

        .offline-banner.pending {
          background: #3b82f6;
          color: white;
        }

        .banner-content {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 13px;
          font-weight: 500;
        }

        .banner-icon {
          font-size: 16px;
        }

        .pending-badge {
          background: rgba(255,255,255,0.2);
          padding: 2px 8px;
          border-radius: 20px;
          font-size: 11px;
        }

        .banner-text {
          font-size: 11px;
          opacity: 0.9;
        }

        .sync-spinner-small {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          display: inline-block;
        }

        @media (max-width: 640px) {
          .hero-title {
            font-size: 28px;
          }
          
          .stats-overview {
            flex-direction: column;
            gap: 12px;
            padding: 0 16px;
          }
          
          .meetings-list {
            padding: 16px;
          }
          
          .meeting-card-premium {
            padding: 18px;
          }
          
          .details-grid-premium {
            grid-template-columns: 1fr;
          }
          
          .history-section-premium {
            margin: 16px;
            padding: 18px;
          }
          
          .history-content {
            flex-direction: column;
            text-align: center;
          }
          
          .hero-content {
            padding-right: 48px;
          }

          .offline-banner {
            bottom: 10px;
            padding: 8px 16px;
          }
          
          .banner-content {
            font-size: 11px;
            gap: 8px;
          }
          
          .banner-text {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}