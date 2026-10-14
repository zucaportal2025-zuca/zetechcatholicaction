import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import BASE_URL from '../api';
import { getDeviceId, getDeviceName } from '../utils/deviceId';

export default function CheckinPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [sheetInfo, setSheetInfo] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [userInfo, setUserInfo] = useState({ fullName: '', phoneNumber: '' });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is logged in via localStorage
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setIsLoggedIn(true);
      setUser(JSON.parse(storedUser));
      // Auto check-in for logged in users
      autoCheckin(storedToken);
    } else {
      fetchSheetInfo();
    }
  }, [token]);

  const fetchSheetInfo = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/attendance/link/${token}`);
      setSheetInfo(response.data.sheet);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired QR code');
      setLoading(false);
    }
  };

  const autoCheckin = async (authToken) => {
    setCheckingIn(true);
    try {
      const response = await axios.post(`${BASE_URL}/api/attendance/qr-checkin`, {
        token: token,
        deviceId: getDeviceId(),
        deviceName: getDeviceName()
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Check-in failed');
      setCheckingIn(false);
      // If auto check-in fails, show manual form
      setIsLoggedIn(false);
      setUser(null);
      fetchSheetInfo();
    }
  };

  const handleManualCheckin = async (e) => {
    e.preventDefault();
    if (!userInfo.fullName || !userInfo.phoneNumber) {
      setError('Please enter your name and phone number');
      return;
    }
    
    setCheckingIn(true);
    try {
      const response = await axios.post(`${BASE_URL}/api/attendance/public-checkin`, {
        token: token,
        fullName: userInfo.fullName,
        phoneNumber: userInfo.phoneNumber,
        deviceId: getDeviceId(),
        deviceName: getDeviceName()
      });
      
      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Check-in failed');
      setCheckingIn(false);
    }
  };

  const handleLoginRedirect = () => {
    localStorage.setItem('redirectAfterLogin', `/checkin/${token}`);
    navigate('/login');
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.spinner}></div>
          <p>Loading check-in...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.errorIcon}>⚠️</div>
          <h2>Check-in Failed</h2>
          <p>{error}</p>
          <button onClick={() => window.location.href = '/'} style={styles.button}>
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.successIcon}>✅</div>
          <h2>Check-in Successful!</h2>
          <p>Welcome to {sheetInfo?.title}</p>
          <p style={styles.smallText}>You have been checked in successfully.</p>
        </div>
      </div>
    );
  }

  if (isLoggedIn && !success) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          {checkingIn ? (
            <>
              <div style={styles.spinner}></div>
              <p>Checking you in...</p>
            </>
          ) : (
            <>
              <div style={styles.checkIcon}>📱</div>
              <h2>Check-in to {sheetInfo?.title}</h2>
              <p>Welcome back, {user?.fullName}!</p>
              <button onClick={() => autoCheckin(localStorage.getItem('token'))} style={styles.button}>
                Check Me In
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.qrIcon}>📷</div>
        <h2>{sheetInfo?.title}</h2>
        <p style={styles.details}>
          📅 {new Date(sheetInfo?.eventDate).toLocaleDateString()}<br />
          ⏰ {sheetInfo?.eventTime || '4:30 PM'}<br />
          📍 {sheetInfo?.location || 'ZUCA'}
        </p>
        
        <form onSubmit={handleManualCheckin}>
          <input
            type="text"
            placeholder="Your Full Name"
            value={userInfo.fullName}
            onChange={(e) => setUserInfo({...userInfo, fullName: e.target.value})}
            style={styles.input}
            required
          />
          <input
            type="tel"
            placeholder="Your Phone Number"
            value={userInfo.phoneNumber}
            onChange={(e) => setUserInfo({...userInfo, phoneNumber: e.target.value})}
            style={styles.input}
            required
          />
          <button type="submit" disabled={checkingIn} style={styles.button}>
            {checkingIn ? 'Checking in...' : 'Check In'}
          </button>
        </form>
        
        <p style={styles.hint}>
          Already have an account? <button onClick={handleLoginRedirect} style={styles.linkButton}>Login here</button>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px'
  },
  card: {
    background: 'white',
    borderRadius: '24px',
    padding: '40px',
    maxWidth: '450px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
  },
  qrIcon: { fontSize: '64px', marginBottom: '20px' },
  checkIcon: { fontSize: '64px', marginBottom: '20px' },
  successIcon: { fontSize: '64px', marginBottom: '20px', color: '#22c55e' },
  errorIcon: { fontSize: '64px', marginBottom: '20px', color: '#ef4444' },
  details: { color: '#64748b', marginBottom: '24px', lineHeight: '1.8' },
  input: {
    width: '100%',
    padding: '14px 16px',
    marginBottom: '12px',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '16px',
    boxSizing: 'border-box'
  },
  button: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px'
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: '#667eea',
    cursor: 'pointer',
    fontWeight: 'bold',
    textDecoration: 'underline'
  },
  hint: { fontSize: '12px', color: '#94a3b8', marginTop: '20px' },
  smallText: { fontSize: '12px', color: '#64748b', marginTop: '12px' },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e2e8f0',
    borderTopColor: '#667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 16px'
  }
};