import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { FaChevronLeft, FaChevronRight, FaPause, FaPlay } from 'react-icons/fa';
import { CheckCircle, XCircle, Loader2, Home, ArrowRight } from 'lucide-react';
import BASE_URL from '../api';
import { getDeviceId, getDeviceName } from '../utils/deviceId';
import logo from '../assets/zuca-logo.png';

// Import slideshow images
import slide2 from "../assets/2.jpg";
import slide3 from "../assets/3.jpg";
import slide4 from "../assets/4.jpg";
import slide5 from "../assets/5.jpg";
import slide6 from "../assets/6.jpg";
import slide7 from "../assets/7.jpg";
import slide8 from "../assets/8.jpg";
import slide9 from "../assets/9.jpg";
import slide10 from "../assets/10.jpg";
import slide11 from "../assets/11.jpg";
import slide12 from "../assets/12.jpg";

export default function ScanPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
    const hasRun = useRef(false);
  const [sheetTitle, setSheetTitle] = useState('');
  
  // Slideshow state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [touchStart, setTouchStart] = useState(null);
  const slideIntervalRef = useRef(null);
  const [userName, setUserName] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
const firstName = user.fullName ? user.fullName.split(' ')[0] : '';
  const slides = [
    { id: 2, image: slide2 },
    { id: 3, image: slide3 },
    { id: 4, image: slide4 },
    { id: 5, image: slide5 },
    { id: 6, image: slide6 },
    { id: 7, image: slide7 },
    { id: 8, image: slide8 },
    { id: 9, image: slide9 },
    { id: 10, image: slide10 },
    { id: 11, image: slide11 },
    { id: 12, image: slide12 },
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextSlide();
      else prevSlide();
    }
    setTouchStart(null);
  };

  useEffect(() => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.fullName) {
    const firstName = user.fullName.split(' ')[0];
    setUserName(firstName);
  }
}, []);

  useEffect(() => {
    if (isPlaying) {
      slideIntervalRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, 5000);
    }
    return () => {
      if (slideIntervalRef.current) clearInterval(slideIntervalRef.current);
    };  
  }, [isPlaying, slides.length]);

  useEffect(() => {
    if (hasRun.current) return;
hasRun.current = true;
    const checkin = async () => {
      try {
         const user = JSON.parse(localStorage.getItem('user') || '{}');
      const firstName = user.fullName ? user.fullName.split(' ')[0] : '';
      setUserName(firstName);
        const verifyRes = await axios.get(`${BASE_URL}/api/attendance/scan/verify/${token}`);
        
        if (!verifyRes.data.success) {
          throw new Error('Invalid QR code');
        }
        
        setSheetTitle(verifyRes.data.sheet?.title || 'Meeting');
        
        const authToken = localStorage.getItem('token');
        
        if (!authToken) {
          localStorage.setItem('redirectAfterLogin', `/scan/${token}`);
          navigate('/login');
          return;
        }
        
        setStatus('checking');
        
        const response = await axios.post(`${BASE_URL}/api/attendance/qr-checkin`, {
          token: token,
          deviceId: getDeviceId(),
          deviceName: getDeviceName() + ' (Camera)'
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
          setStatus('success');
          setMessage(response.data.entry?.message || 'Check-in successful!');
          setTimeout(() => window.close(), 5000);
        }
        
      } catch (error) {
  const errorMsg = error.response?.data;
  
  if (errorMsg?.error === 'Already checked in') {
    setStatus('success');
    setMessage(`Hey ${firstName || 'there'}, you have already checked in for this meeting.`);
    setTimeout(() => window.close(), 5000);
  } else if (errorMsg?.error === 'Meeting has been closed') {
    setStatus('error');
    setMessage(`Sorry ${firstName || 'there'}, this meeting has been closed.`);
  } else if (errorMsg?.error === 'Invalid or expired QR code') {
    setStatus('error');
    setMessage(`Sorry ${firstName || 'there'}, the QR code is invalid or has expired.`);
  } else if (errorMsg?.error === 'Device already used') {
    setStatus('error');
    setMessage(errorMsg.message || `Sorry ${firstName || 'there'}, this device has already been used.`);
  } else {
    setStatus('error');
    setMessage(errorMsg?.error || 'Check-in failed. Please try again.');
  }
}
    };
    
    checkin();
  }, [token, navigate]);
  
  return (
    <div style={styles.pageWrapper}>
      {/* Slideshow Background */}
      <div 
        className="slideshow-container"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {slides.map((slide, index) => (
          <div 
            key={slide.id}
            className={`slide ${index === currentSlide ? 'active' : ''}`}
            style={{ backgroundImage: `url(${slide.image})` }}
          >
            <div className="slide-overlay"></div>
          </div>
        ))}
        
        <button className="slideshow-nav slideshow-nav-prev" onClick={prevSlide}>
          <FaChevronLeft />
        </button>
        <button className="slideshow-nav slideshow-nav-next" onClick={nextSlide}>
          <FaChevronRight />
        </button>
        
        <div className="slideshow-dots">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`dot ${index === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(index)}
            />
          ))}
        </div>
        
        <button className="slideshow-play-pause" onClick={togglePlayPause}>
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>
      </div>

      {/* Content Overlay */}
      <div style={styles.overlay}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={styles.card}
        >
          <div style={styles.logoContainer}>
            <img src={logo} alt="ZUCA Logo" style={styles.logo} />
            <span style={styles.logoText}>ZUCA</span>
          </div>

          {/* Status Icon */}
          <div style={styles.iconWrapper}>
            {status === 'loading' && <Loader2 className="icon-spin" size={48} strokeWidth={1.5} />}
            {status === 'checking' && <Loader2 className="icon-spin" size={48} strokeWidth={1.5} />}
            {status === 'success' && <CheckCircle className="icon-success" size={56} />}
            {status === 'error' && <XCircle className="icon-error" size={56} />}
          </div>

          {/* Status Text */}
          <h2 style={styles.title}>
            {status === 'loading' && 'Verifying'}
            {status === 'checking' && 'Checking In'}
            {status === 'success' && 'Welcome!'}
            {status === 'error' && 'Check-in Failed'}
          </h2>

          {/* Animated dots for loading states */}
          {(status === 'loading' || status === 'checking') && (
            <div className="dots">
              <span>.</span><span>.</span><span>.</span>
            </div>
          )}

          {/* Message */}
          <p style={styles.message}>{message || (sheetTitle && `Checking you in for "${sheetTitle}"`)}</p>

          {/* Sheet Info */}
          {(status === 'loading' || status === 'checking') && sheetTitle && (
            <div style={styles.sheetInfo}>
              <div style={styles.sheetBadge}>📋 {sheetTitle}</div>
            </div>
          )}

          {/* Confetti Animation */}
          {status === 'success' && (
            <div className="confetti">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="confetti-piece" style={{ '--i': i }}></div>
              ))}
            </div>
          )}

          {/* Error Action Button */}
          {status === 'error' && (
            <button onClick={() => navigate('/')} style={styles.actionBtn}>
              <Home size={18} />
              Go to Home
              <ArrowRight size={18} />
            </button>
          )}

          {/* Redirecting hint */}
          {status === 'success' && (
            <p style={styles.redirectHint}>Closing page thank you {userName || 'there'}...</p>
          )}
        </motion.div>
      </div>

      <style>{`
        .slideshow-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          z-index: 0;
        }
        
        .slide {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          opacity: 0;
          transition: opacity 1s ease-in-out;
          z-index: 1;
        }
        
        .slide.active {
          opacity: 1;
          z-index: 2;
        }
        
        .slide-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.65);
          z-index: 1;
        }
        
        .slideshow-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          border: none;
          color: white;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 20;
          transition: all 0.3s ease;
          font-size: 20px;
        }
        
        .slideshow-nav:hover {
          background: rgba(0, 198, 255, 0.8);
          transform: translateY(-50%) scale(1.05);
        }
        
        .slideshow-nav-prev { left: 20px; }
        .slideshow-nav-next { right: 20px; }
        
        .slideshow-dots {
          position: absolute;
          bottom: 20px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          gap: 12px;
          z-index: 20;
          flex-wrap: wrap;
          padding: 0 16px;
        }
        
        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.5);
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          padding: 0;
        }
        
        .dot.active {
          background: #00c6ff;
          width: 24px;
          border-radius: 10px;
        }
        
        .slideshow-play-pause {
          position: absolute;
          bottom: 20px;
          right: 20px;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          border: none;
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 20;
          transition: all 0.3s ease;
          font-size: 14px;
        }
        
        .slideshow-play-pause:hover {
          background: rgba(0, 198, 255, 0.8);
          transform: scale(1.05);
        }
        
        .icon-spin {
          animation: spin 1s linear infinite;
          color: #667eea;
        }
        
        .icon-success {
          color: #10b981;
          animation: bounceIn 0.5s ease;
        }
        
        .icon-error {
          color: #ef4444;
          animation: shake 0.5s ease;
        }
        
        .dots {
          display: flex;
          gap: 8px;
          justify-content: center;
          margin-bottom: 16px;
        }
        
        .dots span {
          font-size: 32px;
          font-weight: bold;
          color: white;
          animation: bounce 1.4s infinite ease-in-out;
        }
        
        .dots span:nth-child(1) { animation-delay: 0s; }
        .dots span:nth-child(2) { animation-delay: 0.2s; }
        .dots span:nth-child(3) { animation-delay: 0.4s; }
        
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-10px); opacity: 1; }
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes bounceIn {
          0% { opacity: 0; transform: scale(0.3); }
          50% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        .confetti {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 30;
          overflow: hidden;
        }
        
        .confetti-piece {
          position: absolute;
          width: 10px;
          height: 10px;
          position: absolute;
          top: -10px;
          opacity: 0;
          animation: confettiFall 3s ease-out forwards;
        }
        
        .confetti-piece:nth-child(1) { left: 10%; background: #10b981; animation-delay: 0s; }
        .confetti-piece:nth-child(2) { left: 20%; background: #3b82f6; animation-delay: 0.1s; }
        .confetti-piece:nth-child(3) { left: 30%; background: #ef4444; animation-delay: 0.2s; }
        .confetti-piece:nth-child(4) { left: 40%; background: #f59e0b; animation-delay: 0.15s; }
        .confetti-piece:nth-child(5) { left: 50%; background: #8b5cf6; animation-delay: 0.25s; }
        .confetti-piece:nth-child(6) { left: 60%; background: #ec4899; animation-delay: 0.05s; }
        .confetti-piece:nth-child(7) { left: 70%; background: #06b6d4; animation-delay: 0.35s; }
        .confetti-piece:nth-child(8) { left: 80%; background: #84cc16; animation-delay: 0.18s; }
        .confetti-piece:nth-child(9) { left: 90%; background: #f97316; animation-delay: 0.28s; }
        .confetti-piece:nth-child(10) { left: 15%; background: #d946ef; animation-delay: 0.4s; }
        .confetti-piece:nth-child(11) { left: 45%; background: #0ea5e9; animation-delay: 0.12s; }
        .confetti-piece:nth-child(12) { left: 75%; background: #f43f5e; animation-delay: 0.32s; }
        
        @keyframes confettiFall {
          0% { top: -20px; transform: rotate(0deg); opacity: 1; }
          100% { top: 100%; transform: rotate(360deg); opacity: 0; }
        }
        
        @media (max-width: 768px) {
          .slideshow-nav { width: 36px; height: 36px; font-size: 16px; }
          .slideshow-nav-prev { left: 10px; }
          .slideshow-nav-next { right: 10px; }
          .slideshow-play-pause { width: 36px; height: 36px; font-size: 12px; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  pageWrapper: {
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
  },
  overlay: {
    position: "relative",
    zIndex: 10,
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
  card: {
    maxWidth: "450px",
    width: "100%",
    background: "linear-gradient(135deg, rgba(9, 36, 155, 0.54), rgba(32, 32, 32, 0.53))",
    backdropFilter: "blur(10px)",
    borderRadius: "32px",
    padding: "40px 32px",
    textAlign: "center",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  },
  logoContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    marginBottom: "32px",
  },
  logo: {
    width: "45px",
    height: "45px",
    borderRadius: "50%",
    border: "2px solid #bd25eb",
  },
  logoText: {
    fontSize: "24px",
    fontWeight: "800",
    background: "linear-gradient(135deg, #ffffff, #d4d4d4)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  iconWrapper: {
    width: "100px",
    height: "100px",
    margin: "0 auto 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0, 0, 0, 0.04)",
    borderRadius: "50%",
  },
  title: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#ffffff",
    margin: "0 0 12px 0",
  },
  message: {
    fontSize: "16px",
    color: "#2bff00",
    margin: "0 0 20px 0",
    lineHeight: "1.5",
  },
  sheetInfo: {
    marginTop: "16px",
  },
  sheetBadge: {
    display: "inline-block",
    background: "#f1f5f9",
    padding: "8px 16px",
    borderRadius: "40px",
    fontSize: "13px",
    fontWeight: "500",
    color: "#475569",
  },
  actionBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "24px",
    padding: "12px 28px",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "white",
    border: "none",
    borderRadius: "40px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
  redirectHint: {
    fontSize: "12px",
    color: "#ffffff",
    marginTop: "24px",
  },
};