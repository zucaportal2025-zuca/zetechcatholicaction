import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';
import BASE_URL from '../../../api';
import { Html5Qrcode } from 'html5-qrcode';
import { getDeviceId, getDeviceName } from '../../../utils/deviceId';
import { saveOfflineCheckin, getPendingCount } from '../../../utils/offlineStorage';

export default function QRScanner({ onClose, onSuccess, sheetId: propSheetId }) {
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const scannerRef = useRef(null);
  const isProcessing = useRef(false);
  const streamRef = useRef(null);
  const lastScanTime = useRef(0);
  const successTimeoutRef = useRef(null);
  const mountedRef = useRef(true);
  
  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
      stopScanner();
    };
  }, []);
  
  // Show success animation and auto-close
  const handleSuccess = (entry) => {
    if (!mountedRef.current) return;
    
    setSuccessMessage(entry?.message || '✓ Check-in successful!');
    setShowSuccess(true);
    
    // Stop scanner immediately
    if (scannerRef.current) {
      scannerRef.current.stop().catch(console.error);
      scannerRef.current = null;
    }
    setIsScanning(false);
    
    // Stop camera tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        if (track && track.readyState === 'live') {
          track.stop();
        }
      });
      streamRef.current = null;
    }
    
    // Close after animation completes
    successTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        if (onSuccess) onSuccess(entry);
        onClose();
      }
    }, 5000);
  };
  
  const onScanSuccess = async (decodedText, decodedResult) => {
    // Debounce - prevent multiple scans within 1.5 seconds
    const now = Date.now();
    if (now - lastScanTime.current < 1500 || showSuccess || !mountedRef.current) {
      return;
    }
    lastScanTime.current = now;
    
    if (isProcessing.current) {
      return;
    }
    
    isProcessing.current = true;
    
    // Pause scanner immediately
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.pause();
        setIsScanning(false);
      } catch (err) {
        console.error('Error pausing scanner:', err);
      }
    }
    
    try {
      let token;
      let scannedSheetId;
      
      // Try to parse as JSON first (old format)
      try {
        const qrData = JSON.parse(decodedText);
        if (qrData.type === 'attendance_checkin') {
          token = qrData.token;
          scannedSheetId = qrData.sheetId;
        } else {
          throw new Error('Not attendance QR');
        }
      } catch (e) {
        // Not JSON - treat as URL (new format)
        const urlMatch = decodedText.match(/\/scan\/([a-f0-9]+)/);
        if (urlMatch && urlMatch[1]) {
          token = urlMatch[1];
        } else {
          setError('Invalid QR code format');
          isProcessing.current = false;
          if (scannerRef.current && mountedRef.current) {
            await scannerRef.current.resume();
            setIsScanning(true);
          }
          return;
        }
      }
      
      // Offline mode
      if (isOffline) {
        if (scannedSheetId) {
          const saved = await saveOfflineCheckin(scannedSheetId, getDeviceId(), 'QR Scan (Offline)');
          if (saved) {
            handleSuccess({ offline: true, message: '✓ Saved offline!' });
          } else {
            setError('Failed to save offline check-in');
            isProcessing.current = false;
            if (scannerRef.current && mountedRef.current) {
              await scannerRef.current.resume();
              setIsScanning(true);
            }
          }
        } else {
          setError('Offline check-in not supported for this QR type');
          isProcessing.current = false;
          if (scannerRef.current && mountedRef.current) {
            await scannerRef.current.resume();
            setIsScanning(true);
          }
        }
        return;
      }
      
      // Online check-in with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        const response = await axios.post(`${BASE_URL}/api/attendance/qr-checkin`, {
          token: token,
          deviceId: getDeviceId(),
          deviceName: getDeviceName()
        }, {
          headers: getHeaders(),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.data.success && mountedRef.current) {
          handleSuccess(response.data.entry);
        }
      } catch (axiosError) {
        clearTimeout(timeoutId);
        throw axiosError;
      }
      
    } catch (error) {
      if (!mountedRef.current) return;
      
      const errorMsg = error.response?.data;
      
      if (error.name === 'AbortError') {
        setError('Request timed out. Please try again.');
      } else if (error.message === 'Network Error' || !navigator.onLine) {
        try {
          const qrData = JSON.parse(decodedText);
          const scannedSheetId = qrData.sheetId;
          const saved = await saveOfflineCheckin(scannedSheetId, getDeviceId(), 'QR Scan (Offline Fallback)');
          if (saved) {
            handleSuccess({ offline: true, message: '✓ Saved offline' });
            return;
          }
        } catch (e) {}
        setError('No internet connection. Please check your network.');
      } else if (errorMsg?.error === 'Invalid or expired QR code') {
        setError('QR code is invalid or has expired');
      } else if (errorMsg?.error === 'Already checked in') {
        setError('You have already checked in');
      } else if (errorMsg?.error === 'DEVICE_ALREADY_USED') {
        setError('This device has already been used');
      } else {
        setError(errorMsg?.error || 'Check-in failed');
      }
      
      isProcessing.current = false;
      
      if (scannerRef.current && mountedRef.current) {
        try {
          await scannerRef.current.resume();
          setIsScanning(true);
        } catch (err) {
          console.error('Error resuming scanner:', err);
        }
      }
    }
  };
  
  const onScanError = (err) => {
    // Only log critical errors
    if (err && err.message && 
        !err.message.includes('No MultiFormat Readers') &&
        !err.message.includes('NotFoundException')) {
      console.error('Scan error:', err);
    }
  };
  
  const stopCameraTracks = () => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => {
          if (track && track.readyState === 'live') {
            track.stop();
          }
        });
      } catch (err) {
        console.error('Error stopping camera tracks:', err);
      }
      streamRef.current = null;
    }
  };
  
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      scannerRef.current = null;
    }
    stopCameraTracks();
  };
  
  const isMediaDevicesSupported = () => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  };
  
  const requestCameraPermission = async () => {
    if (!isMediaDevicesSupported()) {
      setError('Your browser does not support camera access.');
      setPermissionDenied(true);
      return false;
    }
    
    try {
      stopCameraTracks();
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: { exact: "environment" } } 
      }).catch(async () => {
        return await navigator.mediaDevices.getUserMedia({ video: true });
      });
      
      streamRef.current = stream;
      // Don't stop the stream here - keep it for the scanner
      return true;
    } catch (err) {
      console.error('Camera permission error:', err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        setError('Camera access denied. Please allow camera access.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError(`Camera error: ${err.message || 'Unknown error'}`);
      }
      return false;
    }
  };
  
  const initializeScanner = async () => {
    const element = document.getElementById("qr-reader");
    if (!element || !mountedRef.current) {
      console.error("qr-reader element not found");
      return false;
    }
    
    if (!isMediaDevicesSupported()) {
      setError('Your browser does not support camera access.');
      setPermissionDenied(true);
      return false;
    }
    
    setIsInitializing(true);
    
    const hasPermission = await requestCameraPermission();
    if (!hasPermission || !mountedRef.current) {
      setIsInitializing(false);
      return false;
    }
    
    try {
      const scanner = new Html5Qrcode("qr-reader");
      
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 20,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        },
        onScanSuccess,
        onScanError
      );
      
      if (!mountedRef.current) {
        await scanner.stop();
        return false;
      }
      
      scannerRef.current = scanner;
      setIsScanning(true);
      setError(null);
      setPermissionDenied(false);
      setIsInitializing(false);
      return true;
    } catch (err) {
      console.error("Failed to start scanner:", err);
      setIsInitializing(false);
      
      // Fallback to front camera
      try {
        const scanner = new Html5Qrcode("qr-reader");
        await scanner.start(
          { facingMode: "user" },
          {
            fps: 15,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          onScanSuccess,
          onScanError
        );
        
        if (!mountedRef.current) {
          await scanner.stop();
          return false;
        }
        
        scannerRef.current = scanner;
        setIsScanning(true);
        setError(null);
        setPermissionDenied(false);
        setIsInitializing(false);
        return true;
      } catch (fallbackErr) {
        console.error("Fallback also failed:", fallbackErr);
      }
      
      setError(`Could not start camera: ${err.message || 'Unknown error'}`);
      setPermissionDenied(true);
      return false;
    }
  };
  
  const handleRetry = async () => {
    // Reset all states
    setError(null);
    setPermissionDenied(false);
    setIsScanning(false);
    setIsInitializing(false);
    setShowSuccess(false);
    setSuccessMessage('');
    
    // Clean up existing scanner
    await stopScanner();
    
    isProcessing.current = false;
    lastScanTime.current = 0;
    
    // Clear the reader element
    const readerElement = document.getElementById("qr-reader");
    if (readerElement) {
      readerElement.innerHTML = '';
    }
    
    // Reinitialize scanner
    initializeScanner();
  };
  
  useEffect(() => {
    initializeScanner();
    
    return () => {
      mountedRef.current = false;
      stopScanner();
    };
  }, []);
  
  return (
    <div className="qr-scanner-overlay" onClick={!showSuccess ? onClose : undefined}>
      <div className="qr-scanner-container" onClick={e => e.stopPropagation()}>
        {/* SUCCESS VIEW WITH ANIMATION */}
        {showSuccess ? (
          <div className="qr-success-view">
            <div className="success-animation">
              <div className="success-circle">
                <svg viewBox="0 0 100 100" className="success-svg">
                  <circle cx="50" cy="50" r="45" className="success-circle-bg" />
                  <path d="M30 50 L45 65 L70 35" className="success-checkmark" fill="none" />
                </svg>
              </div>
            </div>
            <h2 className="success-title">Welcome!</h2>
            <p className="success-message">{successMessage}</p>
            <div className="confetti">
              <div className="confetti-piece"></div>
              <div className="confetti-piece"></div>
              <div className="confetti-piece"></div>
              <div className="confetti-piece"></div>
              <div className="confetti-piece"></div>
              <div className="confetti-piece"></div>
            </div>
          </div>
        ) : (
          <>
            <div className="qr-scanner-header">
              <h3>
                <Camera size={20} /> Scan QR Code
              </h3>
              {isOffline && (
                <span className="offline-badge">📡 OFFLINE MODE</span>
              )}
              <button className="qr-scanner-close" onClick={onClose}>
                <X size={20} />
              </button>
            </div>
            
            <div className="qr-scanner-body">
              {!isMediaDevicesSupported() && (
                <div className="qr-scanner-error">
                  <div className="error-icon">🌐</div>
                  <h4>Browser Not Supported</h4>
                  <p>Please use Chrome, Firefox, or Safari.</p>
                  <button onClick={onClose} className="close-btn">Close</button>
                </div>
              )}
              
              {(permissionDenied || error) && isMediaDevicesSupported() && (
                <div className="qr-scanner-error">
                  <div className="error-icon">{permissionDenied ? "📷" : "⚠️"}</div>
                  <h4>{permissionDenied ? "Camera Access Denied" : "Scan Failed"}</h4>
                  <p>{error || "Please allow camera access to scan QR codes."}</p>
                  <div className="error-buttons">
                    <button onClick={handleRetry} className="retry-btn">
                      Try Again
                    </button>
                    <button onClick={onClose} className="close-btn">
                      Close
                    </button>
                  </div>
                </div>
              )}
              
              {!error && !permissionDenied && isMediaDevicesSupported() && (
                <>
                  <div id="qr-reader" className="scanner-view"></div>
                  {isInitializing && (
                    <div className="scanner-loading">
                      <div className="spinner"></div>
                      <p>Starting camera...</p>
                    </div>
                  )}
                  {!isInitializing && isScanning && (
                    <>
                      <p className="scanner-instruction">
                        📱 Point camera at QR code
                      </p>
                      <p className="scanner-hint">
                        {isOffline 
                          ? "⚠️ Offline mode - check-ins will be saved"
                          : "Center the QR code in the frame"}
                      </p>
                    </>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
      
      <style>{`
        .qr-scanner-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          animation: fadeIn 0.15s ease;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .qr-scanner-container {
          background: white;
          border-radius: 32px;
          width: 90%;
          max-width: 500px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
          animation: slideUp 0.2s ease;
        }
        
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        /* ========== SUCCESS ANIMATION STYLES ========== */
        .qr-success-view {
          text-align: center;
          padding: 48px 32px;
          background: linear-gradient(135deg, #0f172a, #1e293b);
          color: white;
          min-height: 400px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }
        
        .success-animation {
          margin-bottom: 24px;
          animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        
        .success-circle {
          width: 100px;
          height: 100px;
          margin: 0 auto;
          position: relative;
        }
        
        .success-svg {
          width: 100%;
          height: 100%;
        }
        
        .success-circle-bg {
          fill: none;
          stroke: #10b981;
          stroke-width: 4;
          stroke-dasharray: 283;
          stroke-dashoffset: 283;
          animation: drawCircle 0.6s ease-out forwards;
        }
        
        .success-checkmark {
          stroke: #10b981;
          stroke-width: 6;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 50;
          stroke-dashoffset: 50;
          animation: drawCheck 0.4s ease-out 0.3s forwards;
        }
        
        @keyframes drawCircle {
          to {
            stroke-dashoffset: 0;
          }
        }
        
        @keyframes drawCheck {
          to {
            stroke-dashoffset: 0;
          }
        }
        
        @keyframes bounceIn {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
          80% {
            transform: scale(0.95);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .success-title {
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 12px 0;
          color: white;
          animation: fadeInUp 0.5s ease 0.2s both;
        }
        
        .success-message {
          font-size: 16px;
          color: #94a3b8;
          margin: 0;
          animation: fadeInUp 0.5s ease 0.4s both;
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        /* Confetti Animation */
        .confetti {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: hidden;
        }
        
        .confetti-piece {
          position: absolute;
          width: 10px;
          height: 10px;
          background: #f59e0b;
          opacity: 0;
          animation: confettiFall 2.5s ease-out forwards;
        }
        
        .confetti-piece:nth-child(1) { left: 10%; background: #10b981; animation-delay: 0.1s; }
        .confetti-piece:nth-child(2) { left: 25%; background: #3b82f6; animation-delay: 0.2s; }
        .confetti-piece:nth-child(3) { left: 40%; background: #ef4444; animation-delay: 0.15s; }
        .confetti-piece:nth-child(4) { left: 55%; background: #f59e0b; animation-delay: 0.25s; }
        .confetti-piece:nth-child(5) { left: 70%; background: #8b5cf6; animation-delay: 0.18s; }
        .confetti-piece:nth-child(6) { left: 85%; background: #ec4899; animation-delay: 0.3s; }
        
        @keyframes confettiFall {
          0% {
            top: -20px;
            transform: rotate(0deg);
            opacity: 1;
          }
          100% {
            top: 100%;
            transform: rotate(360deg);
            opacity: 0;
          }
        }
        
        /* Regular styles */
        .qr-scanner-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 24px;
          background: linear-gradient(135deg, #0f172a, #1e293b);
          color: white;
        }
        
        .qr-scanner-header h3 {
          margin: 0;
          font-size: 18px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .offline-badge {
          background: #f59e0b;
          color: white;
          font-size: 10px;
          padding: 4px 10px;
          border-radius: 20px;
          margin-left: 10px;
        }
        
        .qr-scanner-close {
          background: rgba(255,255,255,0.1);
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        
        .qr-scanner-close:hover {
          background: rgba(255,255,255,0.2);
          transform: rotate(90deg);
        }
        
        .qr-scanner-body {
          padding: 24px;
        }
        
        .scanner-view {
          width: 100%;
          border-radius: 20px;
          overflow: hidden;
          background: #000;
          min-height: 300px;
          position: relative;
        }
        
        #qr-reader {
          width: 100%;
          border: none !important;
          box-shadow: none !important;
        }
        
        #qr-reader video {
          width: 100%;
          height: auto;
          border-radius: 16px;
          object-fit: cover;
        }
        
        #qr-reader__dashboard_section_csr,
        #qr-reader__dashboard_section_fsr,
        #qr-reader__dashboard_section {
          display: none !important;
        }
        
        .scanner-instruction {
          text-align: center;
          font-size: 14px;
          font-weight: 500;
          color: #1e293b;
          margin-top: 20px;
          margin-bottom: 4px;
        }
        
        .scanner-hint {
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
          margin: 0;
        }
        
        .qr-scanner-error {
          text-align: center;
          padding: 40px 24px;
        }
        
        .error-icon {
          font-size: 56px;
          margin-bottom: 16px;
        }
        
        .qr-scanner-error h4 {
          margin: 0 0 8px 0;
          font-size: 18px;
          color: #1e293b;
        }
        
        .qr-scanner-error p {
          margin-bottom: 24px;
          color: #64748b;
          font-size: 14px;
        }
        
        .error-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
        }
        
        .retry-btn, .close-btn {
          padding: 10px 28px;
          border: none;
          border-radius: 40px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }
        
        .retry-btn {
          background: linear-gradient(135deg, #0f172a, #1e293b);
          color: white;
        }
        
        .retry-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .close-btn {
          background: #e2e8f0;
          color: #1e293b;
        }
        
        .close-btn:hover {
          background: #cbd5e1;
          transform: translateY(-2px);
        }
        
        .scanner-loading {
          text-align: center;
          padding: 40px;
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.8);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
        }
        
        .scanner-loading p {
          color: white;
          margin-top: 16px;
          font-size: 14px;
        }
        
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255,255,255,0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}