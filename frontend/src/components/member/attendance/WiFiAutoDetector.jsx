import React, { useState, useEffect } from 'react';
import { Wifi, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';
import BASE_URL from '../../../api';

export default function WiFiAutoDetector({ sheet, onAutoCheckin, alreadyCheckedIn }) {
  const [detected, setDetected] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);
  
  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };
  
  // Function to get current Wi-Fi SSID (browser limitation - requires HTTPS)
  const getCurrentSSID = async () => {
    // Browser doesn't expose SSID directly for security reasons
    // We'll use a prompt for demo - in production, use a native app or WebView
    return new Promise((resolve) => {
      const userSSID = prompt('Enter the meeting Wi-Fi network name you are connected to:');
      resolve(userSSID);
    });
  };
  
  // Check Wi-Fi connection
  const checkWiFiConnection = async () => {
    if (alreadyCheckedIn || !sheet?.enableWifiCheckin || !sheet?.wifiSSID) return;
    
    setError(null);
    
    try {
      // Get current network SSID (simulated for web)
      const currentSSID = await getCurrentSSID();
      
      // ✅ STRICT CHECK: Must match EXACTLY
      if (currentSSID && currentSSID === sheet.wifiSSID) {
        setDetected(true);
      } else if (currentSSID) {
        setError(`Connected to "${currentSSID}" but meeting requires "${sheet.wifiSSID}"`);
      }
    } catch (err) {
      console.error('Error checking Wi-Fi:', err);
    }
  };
  
  // Auto check-in when detected
  const handleAutoCheckin = async () => {
    setChecking(true);
    try {
      const response = await axios.post(`${BASE_URL}/api/attendance/wifi-checkin`, {
        sheetId: sheet.id,
        ssid: sheet.wifiSSID,
        deviceId: `web-${Date.now()}`,
        deviceName: navigator.userAgent
      }, {
        headers: getHeaders()
      });
      
      if (response.data.success) {
        onAutoCheckin(response.data.entry);
        setDetected(false);
      }
    } catch (error) {
      const errorMsg = error.response?.data;
      if (errorMsg?.error === 'Invalid Wi-Fi network for this meeting') {
        setError('Invalid Wi-Fi network. Please connect to the official meeting Wi-Fi.');
      } else {
        setError(errorMsg?.message || 'Auto check-in failed');
      }
    } finally {
      setChecking(false);
    }
  };
  
  // Check periodically
  useEffect(() => {
    if (!sheet?.enableWifiCheckin || alreadyCheckedIn) return;
    
    // Initial check
    checkWiFiConnection();
    
    // Check every 10 seconds
    const interval = setInterval(checkWiFiConnection, 10000);
    return () => clearInterval(interval);
  }, [sheet, alreadyCheckedIn]);
  
  if (!sheet?.enableWifiCheckin || alreadyCheckedIn) return null;
  
  return (
    <div className="wifi-detector">
      <div className="wifi-icon-large">
        <Wifi size={24} />
      </div>
      
      {detected ? (
        <div className="wifi-content success">
          <h4>✅ Meeting Wi-Fi Detected!</h4>
          <p>Connected to: <strong>{sheet.wifiSSID}</strong></p>
          <p className="wifi-hint">You will be automatically checked in to "{sheet.title}"</p>
          <button className="wifi-checkin-btn" onClick={handleAutoCheckin} disabled={checking}>
            {checking ? 'Checking in...' : 'Confirm Check-in'}
          </button>
        </div>
      ) : error ? (
        <div className="wifi-content error">
          <h4>⚠️ Wrong Wi-Fi Network</h4>
          <p>{error}</p>
          <p className="wifi-hint">Please connect to: <strong>{sheet.wifiSSID}</strong></p>
        </div>
      ) : (
        <div className="wifi-content waiting">
          <h4>📡 Wi-Fi Auto Check-in Available</h4>
          <p>Connect to: <strong>{sheet.wifiSSID}</strong></p>
          <p className="wifi-hint">Auto check-in will activate when connected to the meeting Wi-Fi</p>
        </div>
      )}
      
      <style>{`
        .wifi-detector {
          background: linear-gradient(135deg, #f0fdf4, #dcfce7);
          border: 1px solid #bbf7d0;
          border-radius: 16px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .wifi-detector.error {
          background: #fef2f2;
          border-color: #fecaca;
        }
        .wifi-icon-large {
          width: 48px;
          height: 48px;
          background: #22c55e;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .wifi-detector.error .wifi-icon-large {
          background: #ef4444;
        }
        .wifi-content {
          flex: 1;
        }
        .wifi-content.success h4 { color: #166534; }
        .wifi-content.error h4 { color: #991b1b; }
        .wifi-content.waiting h4 { color: #1e293b; }
        .wifi-content h4 {
          margin: 0 0 4px 0;
          font-size: 14px;
          font-weight: 600;
        }
        .wifi-content p {
          margin: 0;
          font-size: 12px;
          color: #166534;
        }
        .wifi-content.error p { color: #991b1b; }
        .wifi-hint {
          font-size: 11px;
          color: #64748b;
          margin-top: 4px !important;
        }
        .wifi-checkin-btn {
          background: #22c55e;
          color: white;
          border: none;
          padding: 8px 20px;
          border-radius: 30px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
        }
        @media (max-width: 500px) {
          .wifi-detector { flex-direction: column; text-align: center; }
        }
      `}</style>
    </div>
  );
}