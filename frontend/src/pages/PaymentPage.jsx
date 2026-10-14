import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { FaChevronLeft, FaChevronRight, FaPause, FaPlay } from "react-icons/fa";
import BASE_URL from "../api";
import logo from "../assets/zuca-logo.png";

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

function PaymentPage() {
  const { slug, campaignId } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  
  // Slideshow state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [touchStart, setTouchStart] = useState(null);
  const slideIntervalRef = useRef(null);
  const slideshowRef = useRef(null);
  
  // Slideshow images array
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

  const goToSlide = (index) => {
    setCurrentSlide(index);
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
    if (isPlaying) {
      slideIntervalRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, 5000);
    }
    return () => {
      if (slideIntervalRef.current) clearInterval(slideIntervalRef.current);
    };
  }, [isPlaying, slides.length]);

  const pollPaymentStatus = (paymentId) => {
    let attempts = 0;
    const maxAttempts = 60;
    
    const interval = setInterval(async () => {
      attempts++;
      try {
        const response = await axios.get(`${BASE_URL}/api/mpesa/payment/${paymentId}/status`);
        
        if (response.data.payment?.status === "SUCCESS") {
          clearInterval(interval);
          setMessage({ text: `✅ Payment successful! Receipt: ${response.data.payment.mpesaReceiptNumber || 'N/A'}`, type: "success" });
          setProcessing(false);
          
          const senderName = user?.fullName || user?.name || "Customer";
          const senderPhone = phone || user?.phone || "N/A";
          
          const paymentData = {
            receiptNumber: response.data.payment.mpesaReceiptNumber,
            amount: response.data.payment.amount,
            campaignTitle: campaign.title,
            senderName: senderName,
            senderPhone: senderPhone,
            timestamp: new Date().toLocaleString(),
            jumuiaName: campaign.jumuia?.name || '',
          };
          localStorage.setItem("lastPayment", JSON.stringify(paymentData));
          localStorage.removeItem("lastPaymentId");
          
          setTimeout(() => {
            navigate(`/payment-success?receipt=${response.data.payment.mpesaReceiptNumber}&amount=${response.data.payment.amount}&campaign=${encodeURIComponent(campaign.title)}&senderName=${encodeURIComponent(senderName)}&senderPhone=${encodeURIComponent(senderPhone)}&jumuiaName=${encodeURIComponent(campaign.jumuia?.name || '')}`);
          }, 2000);
          return;
        }
        
        if (response.data.payment?.status === "FAILED") {
          clearInterval(interval);
          setMessage({ text: `❌ Payment failed: ${response.data.payment.resultDesc || 'Please try again'}`, type: "error" });
          setProcessing(false);
          localStorage.removeItem("lastPaymentId");
          return;
        }
        
        if (attempts % 5 === 0) {
          setMessage({ text: `⏳ Processing payment... Please check your phone.`, type: "info" });
        }
      } catch (err) {
        console.error("Status check error:", err);
      }
      
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setMessage({ text: "⏳ Payment is still being processed. You will receive an SMS and email confirmation shortly.", type: "info" });
        setProcessing(false);
      }
    }, 3000);
  };

  useEffect(() => {
    const checkPendingPayment = async () => {
      const lastPaymentId = localStorage.getItem("lastPaymentId");
      if (lastPaymentId) {
        try {
          const response = await axios.get(`${BASE_URL}/api/mpesa/payment/${lastPaymentId}/status`);
          if (response.data.payment?.status === "SUCCESS") {
            localStorage.removeItem("lastPaymentId");
            navigate(`/payment-success?receipt=${response.data.payment.mpesaReceiptNumber}&amount=${response.data.payment.amount}&campaign=${encodeURIComponent(campaign?.title || "")}`);
          } else if (response.data.payment?.status === "PENDING") {
            setMessage({ text: "We found a pending payment. Waiting for confirmation...", type: "info" });
            setProcessing(true);
            pollPaymentStatus(lastPaymentId);
          } else {
            localStorage.removeItem("lastPaymentId");
          }
        } catch (err) {
          console.error("Error checking pending payment:", err);
        }
      }
    };
    checkPendingPayment();
  }, []);

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isLoggedIn = !!token && !!user?.id;

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        let response;
        if (campaignId) {
          response = await axios.get(`${BASE_URL}/api/mpesa/campaign-by-id/${campaignId}`);
        } else if (slug) {
          response = await axios.get(`${BASE_URL}/api/mpesa/campaign-by-slug/${slug}`);
        } else {
          throw new Error("No campaign identifier provided");
        }
        setCampaign(response.data);
        setAmount(response.data.amountRequired);
        if (isLoggedIn && user.phone) setPhone(user.phone);
      } catch (err) {
        console.error("Campaign not found:", err);
        setMessage({ text: "Payment link not found or invalid", type: "error" });
      } finally {
        setLoading(false);
      }
    };
    fetchCampaign();
  }, [slug, campaignId, isLoggedIn, user.phone]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${BASE_URL}/api/login`, {
        email: loginEmail,
        password: loginPassword
      });
      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        window.location.reload();
      }
    } catch (err) {
      setLoginMessage(err.response?.data?.error || "Login failed");
    }
  };

  const handlePayment = async () => {
    if (!isLoggedIn) {
      setShowLoginForm(true);
      return;
    }
    
    if (!phone || phone.length < 10) {
      setMessage({ text: "Please enter a valid M-PESA phone number", type: "error" });
      return;
    }
    
    if (!amount || amount < 10) {
      setMessage({ text: "Please enter a valid amount (minimum KES 10)", type: "error" });
      return;
    }
    
    setProcessing(true);
    setMessage({ text: "⏳ Sending request to M-PESA...", type: "info" });
    
    try {
      const response = await axios.post(
        `${BASE_URL}/api/mpesa/stk-push`,
        {
          campaignId: campaign.id,
          amount: parseFloat(amount),
          phoneNumber: phone,
          userId: user.id
        },
        { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 120000 
        }
      );
      
      if (response.data.success) {
        localStorage.setItem("lastPaymentId", response.data.paymentId);
        pollPaymentStatus(response.data.paymentId);
      } else {
        setMessage({ text: `❌ ${response.data.error || "Payment failed. Please try again."}`, type: "error" });
        setProcessing(false);
      }
    } catch (err) {
      console.error("Payment error:", err);
      setMessage({ text: `❌ ${err.response?.data?.error || "Payment failed"}`, type: "error" });
      setProcessing(false);
    }
  };
  
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div className="spinner"></div>
        <p>Loading payment page...</p>
      </div>
    );
  }
  
  if (!campaign) {
    return (
      <div style={styles.errorContainer}>
        <h1>❌ Payment Link Not Found</h1>
        <p>This payment link is invalid or has expired.</p>
        <p>Please contact your Jumuia leader or administrator for assistance.</p>
      </div>
    );
  }
  
  return (
    <div style={styles.pageWrapper}>
      <div 
        className="slideshow-container"
        ref={slideshowRef}
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
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>
        
        <button className="slideshow-play-pause" onClick={togglePlayPause}>
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>
      </div>

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

          <div style={styles.header}>
            <h1 style={styles.title}>💰 {campaign.title}</h1>
            <p style={styles.subtitle}>Make a payment via M-PESA</p>
          </div>
          
          <div style={styles.content}>
            <div style={styles.campaignInfo}>
              <h3 style={styles.campaignTitle}>{campaign.title}</h3>
              
              {/* ✅ JUMUIA NAME DISPLAY - NOW WORKING */}
              {campaign.jumuia && (
                <div style={styles.jumuiaInfo}>
                  🏠 <strong>Jumuia:</strong> {campaign.jumuia.name}
                </div>
              )}
              
              <p style={styles.campaignDesc}>{campaign.description || "Support our cause"}</p>
              <div style={styles.requiredAmount}>Target: KES {campaign.amountRequired?.toLocaleString()}</div>
            </div>
            
            {!isLoggedIn && !showLoginForm && (
              <div style={styles.loginPrompt}>
                <p style={styles.loginPromptText}>🔐 Please login to make a payment</p>
                <button style={styles.loginPromptBtn} onClick={() => setShowLoginForm(true)}>
                  Login to ZUCA
                </button>
                <p style={styles.registerLink}>
                  Don't have an account? <Link to="/register" style={styles.registerLinkBtn}>Register here</Link>
                </p>
              </div>
            )}
            
            {!isLoggedIn && showLoginForm && (
              <div style={styles.loginFormContainer}>
                <h4 style={styles.loginTitle}>Login to ZUCA</h4>
                <form onSubmit={handleLogin}>
                  <div style={styles.formGroup}>
                    <input
                      type="email"
                      style={styles.input}
                      placeholder="Email address"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <input
                      type="password"
                      style={styles.input}
                      placeholder="Password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                  {loginMessage && (
                    <div style={{ ...styles.message, ...styles.info, marginBottom: "16px" }}>
                      {loginMessage}
                    </div>
                  )}
                  <button type="submit" style={styles.loginBtn}>Login</button>
                  <button type="button" style={styles.cancelBtn} onClick={() => setShowLoginForm(false)}>Cancel</button>
                </form>
                <p style={styles.registerLink}>
                  Don't have an account? <Link to="/register" style={styles.registerLinkBtn}>Register here</Link>
                </p>
              </div>
            )}
            
            {isLoggedIn && (
              <>
                <div style={styles.userInfo}>
                  <span>✅ Logged in as: <strong>{user.fullName}</strong></span>
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>📱 M-PESA Phone Number</label>
                  <input
                    type="tel"
                    style={styles.input}
                    placeholder="0712345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <small style={styles.helperText}>Enter the number that receives M-PESA messages</small>
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>💰 Amount (KES)</label>
                  <input
                    type="number"
                    style={styles.input}
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="10"
                  />
                </div>
                
                <button
                  style={{ ...styles.payButton, opacity: processing ? 0.7 : 1 }}
                  onClick={handlePayment}
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <span className="spinner-small"></span>
                      Processing...
                    </>
                  ) : (
                    "💳 Pay Now with M-PESA"
                  )}
                </button>
              </>
            )}
            
            {message.text && (
              <div style={{ ...styles.message, ...styles[message.type] }}>
                {message.text}
              </div>
            )}
          </div>
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
        .slide.active { opacity: 1; z-index: 2; }
        .slide-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
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
        .slideshow-nav:hover { background: rgba(0, 198, 255, 0.8); transform: translateY(-50%) scale(1.05); }
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
        .dot.active { background: #00c6ff; width: 24px; border-radius: 10px; }
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
        .slideshow-play-pause:hover { background: rgba(0, 198, 255, 0.8); transform: scale(1.05); }
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top: 3px solid #2563eb;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }
        .spinner-small {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-right: 8px;
          vertical-align: middle;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .slideshow-nav { width: 36px; height: 36px; font-size: 16px; }
          .slideshow-nav-prev { left: 10px; }
          .slideshow-nav-next { right: 10px; }
          .slideshow-play-pause { width: 36px; height: 36px; font-size: 12px; bottom: 15px; right: 15px; }
        }
        @media (max-width: 480px) {
          .slideshow-nav { width: 30px; height: 30px; font-size: 14px; }
          .dot { width: 8px; height: 8px; }
          .dot.active { width: 20px; }
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
    maxWidth: "500px",
    width: "100%",
    background: "rgba(255, 255, 255, 0.88)",
    backdropFilter: "blur(10px)",
    borderRadius: "24px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
    overflow: "hidden",
  },
  logoContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    padding: "20px 20px 0",
    borderBottom: "1px solid rgba(0,0,0,0.05)",
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
    background: "linear-gradient(135deg, #000000, #000000)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  header: {
    background: "linear-gradient(135deg, #616161, #000000)",
    padding: "25px",
    textAlign: "center",
  },
  title: {
    fontSize: "clamp(20px, 5vw, 24px)",
    fontWeight: "bold",
    color: "white",
    margin: "0 0 8px 0",
  },
  subtitle: {
    fontSize: "14px",
    color: "rgba(255,255,255,0.9)",
    margin: 0,
  },
  content: {
    padding: "25px",
  },
  userInfo: {
    background: "#e8f5e9",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "20px",
    fontSize: "14px",
    color: "#2e7d32",
    textAlign: "center",
  },
  campaignInfo: {
    background: "#f8fafc",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "25px",
  },
  campaignTitle: {
    fontSize: "18px",
    fontWeight: "bold",
    marginBottom: "8px",
    color: "#1e293b",
  },
  // ✅ JUMUIA INFO STYLE - CORRECTLY PLACED HERE
  jumuiaInfo: {
    background: "#fef3c7",
    padding: "8px 12px",
    borderRadius: "8px",
    marginBottom: "12px",
    fontSize: "13px",
    color: "#d97706",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  campaignDesc: {
    fontSize: "14px",
    color: "#64748b",
    marginBottom: "12px",
    lineHeight: "1.5",
  },
  requiredAmount: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#ff0000",
  },
  formGroup: {
    marginBottom: "20px",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontWeight: "500",
    color: "#334155",
  },
  input: {
    width: "100%",
    padding: "12px 15px",
    border: "2px solid #e2e8f0",
    borderRadius: "10px",
    fontSize: "16px",
    transition: "border-color 0.3s",
    outline: "none",
    boxSizing: "border-box",
  },
  helperText: {
    display: "block",
    marginTop: "4px",
    fontSize: "12px",
    color: "#94a3b8",
  },
  payButton: {
    width: "100%",
    padding: "14px",
    background: "linear-gradient(135deg, #2563eb, #00c6ff)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "transform 0.2s, opacity 0.2s",
    marginTop: "10px",
  },
  message: {
    marginTop: "16px",
    padding: "12px",
    borderRadius: "8px",
    fontSize: "14px",
    textAlign: "center",
  },
  success: {
    background: "#d1fae5",
    color: "#065f46",
    border: "1px solid #a7f3d0",
  },
  error: {
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fecaca",
  },
  info: {
    background: "#dbeafe",
    color: "#1e40af",
    border: "1px solid #bfdbfe",
  },
  loadingContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#f5f7fa",
  },
  errorContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "20px",
    color: "#dc2626",
    background: "#f5f7fa",
  },
  loginPrompt: {
    textAlign: "center",
    padding: "20px",
    background: "#f0f9ff",
    borderRadius: "12px",
    marginBottom: "20px",
  },
  loginPromptText: {
    fontSize: "16px",
    color: "#ff0000",
    marginBottom: "16px",
  },
  loginPromptBtn: {
    padding: "12px 24px",
    background: "linear-gradient(135deg, #000000, #494949)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "bold",
    cursor: "pointer",
    width: "100%",
  },
  loginFormContainer: {
    padding: "20px",
    background: "#f8fafc",
    borderRadius: "12px",
    marginBottom: "20px",
  },
  loginTitle: {
    fontSize: "18px",
    fontWeight: "bold",
    marginBottom: "16px",
    color: "#1e293b",
    textAlign: "center",
  },
  loginBtn: {
    width: "100%",
    padding: "12px",
    background: "linear-gradient(135deg, #00ff00, #0d9900)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "bold",
    cursor: "pointer",
    marginBottom: "8px",
  },
  cancelBtn: {
    width: "100%",
    padding: "12px",
    background: "#e2e8f0",
    color: "#475569",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    cursor: "pointer",
  },
  registerLink: {
    textAlign: "center",
    marginTop: "16px",
    fontSize: "13px",
    color: "#64748b",
  },
  registerLinkBtn: {
    color: "#ff0000",
    textDecoration: "none",
    fontWeight: "500",
  },
};

export default PaymentPage;