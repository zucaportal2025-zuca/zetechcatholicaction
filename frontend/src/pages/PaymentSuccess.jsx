// frontend/src/pages/PaymentSuccess.jsx
import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  FaCheckCircle, 
  FaEnvelope, 
  FaHome, 
  FaArrowRight,
  FaDownload,
  FaPrint,
  FaWhatsapp,
  FaChevronLeft,
  FaChevronRight,
  FaPause,
  FaPlay
} from "react-icons/fa";
import logo from "../assets/zuca-logo.png";

// Import slideshow images (same as PaymentPage)
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

function PaymentSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const [paymentData, setPaymentData] = useState(null);
  
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

  // Slideshow navigation functions
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

  // Touch handlers for mobile swipe
  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
    setTouchStart(null);
  };

  // Auto-play slideshow
  useEffect(() => {
    if (isPlaying) {
      slideIntervalRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, 5000);
    }
    return () => {
      if (slideIntervalRef.current) {
        clearInterval(slideIntervalRef.current);
      }
    };
  }, [isPlaying, slides.length]);
  
  useEffect(() => {
    // Get payment data from URL params or location state
    const params = new URLSearchParams(location.search);
    const receipt = params.get("receipt");
    const amount = params.get("amount");
    const campaign = params.get("campaign");
    const senderName = params.get("senderName");
    const jumuiaName = params.get("jumuiaName"); 
    const senderPhone = params.get("senderPhone");
    
    if (receipt || location.state) {
      setPaymentData({
        receiptNumber: receipt || location.state?.receiptNumber,
        amount: amount || location.state?.amount,
        campaignTitle: campaign || location.state?.campaignTitle,
        senderName: senderName || location.state?.senderName || "N/A",
        senderPhone: senderPhone || location.state?.senderPhone || "N/A",
          jumuiaName: jumuiaName || location.state?.jumuiaName || null,  
        timestamp: new Date().toLocaleString(),
        date: new Date(),
      });
    } else {
      // Fallback - try to get from localStorage
      const lastPayment = localStorage.getItem("lastPayment");
      if (lastPayment) {
        setPaymentData(JSON.parse(lastPayment));
      }
    }
  }, [location]);
  
  // Generate and download receipt as HTML
 // Generate and download receipt as HTML
const downloadReceipt = () => {
  // Use the hosted logo URL that works everywhere
  const logoUrl = "https://dcxuxitorpfujfbtyhhn.supabase.co/storage/v1/object/public/profiles/profile_c2dd6c54-4576-41b1-a85d-1af90d88254a_1777067617594.jpg";
  
  const receiptHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>ZUCA Payment Receipt</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background: #e8e8e8;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          padding: 16px;
        }
        .receipt {
          max-width: 360px;
          width: 100%;
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
          padding: 16px;
          text-align: center;
        }
        .logos {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 8px;
        }
        .zuca-logo-img {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid white;
        }
        .mpesa-text {
          font-size: 20px;
          font-weight: bold;
          color: white;
          letter-spacing: 1px;
        }
        .mpesa-by {
          font-size: 9px;
          color: rgba(255,255,255,0.8);
          margin-top: 2px;
        }
        .lipa {
          font-size: 10px;
          color: rgba(255,255,255,0.7);
          margin-top: 4px;
        }
        .success-icon {
          text-align: center;
          padding: 16px 0 8px;
        }
        .check-circle {
          width: 48px;
          height: 48px;
          background: #4CAF50;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 28px;
        }
        .content {
          padding: 16px;
        }
        .status {
          text-align: center;
          margin-bottom: 16px;
        }
        .status-badge {
          background: #4CAF50;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: bold;
          display: inline-block;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        .detail-label {
          font-size: 12px;
          color: #666;
        }
        .detail-value {
          font-size: 12px;
          font-weight: 600;
          color: #333;
          text-align: right;
          max-width: 60%;
          word-break: break-word;
        }
        .amount-value {
          font-size: 20px;
          font-weight: bold;
          color: #4CAF50;
        }
        .receipt-number {
          background: #e8f5e9;
          padding: 8px;
          text-align: center;
          border-radius: 8px;
          font-family: monospace;
          font-size: 11px;
          letter-spacing: 0.5px;
          margin: 12px 0;
        }
        .footer {
          text-align: center;
          padding: 12px;
          background: #f5f5f5;
          border-top: 1px solid #e0e0e0;
        }
        .footer-text {
          font-size: 9px;
          color: #999;
          line-height: 1.4;
        }
        .timestamp {
          font-size: 9px;
          color: #999;
          text-align: center;
          margin-top: 10px;
        }
        hr {
          margin: 12px 0;
          border: none;
          border-top: 1px dashed #ccc;
        }
        @media print {
          body { background: white; padding: 0; }
          .receipt { box-shadow: none; border: 1px solid #ccc; }
        }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <div class="logos">
            <img src="${logoUrl}" alt="ZUCA" class="zuca-logo-img">
            <div>
              <div class="mpesa-text">M-PESA</div>
              <div class="mpesa-by">by Safaricom</div>
            </div>
          </div>
          <div class="lipa">Lipa Na M-PESA</div>
        </div>

        <div class="success-icon">
          <div class="check-circle">✓</div>
        </div>

        <div class="content">
          <div class="status">
            <span class="status-badge">✅ PAYMENT SENT SUCCESSFULLY</span>
          </div>

          <div class="detail-row">
            <span class="detail-label">Sent to:</span>
            <span class="detail-value">ZUCA - Zetech Catholic Action</span>
          </div>

          <div class="detail-row">
            <span class="detail-label">Campaign:</span>
            <span class="detail-value">${paymentData?.campaignTitle || 'Contribution'}</span>
          </div>

          ${paymentData?.jumuiaName ? `
<div class="detail-row">
  <span class="detail-label">Jumuia:</span>
  <span class="detail-value">🏠 ${paymentData.jumuiaName}</span>
</div>
` : ''}

          <div class="detail-row">
            <span class="detail-label">Amount:</span>
            <span class="amount-value">KES ${(paymentData?.amount || 0).toLocaleString()}</span>
          </div>

          <div class="detail-row">
            <span class="detail-label">Payment method:</span>
            <span class="detail-value">M-PESA (Lipa Na M-PESA)</span>
          </div>

          <div class="detail-row">
            <span class="detail-label">Transaction type:</span>
            <span class="detail-value">Pay Bill</span>
          </div>

          <div class="detail-row">
            <span class="detail-label">Sender Name:</span>
            <span class="detail-value">${paymentData?.senderName || 'N/A'}</span>
          </div>

          <div class="detail-row">
            <span class="detail-label">Sender Phone:</span>
            <span class="detail-value">${paymentData?.senderPhone || 'N/A'}</span>
          </div>

          <div class="detail-row">
            <span class="detail-label">Date:</span>
            <span class="detail-value">${new Date().toLocaleDateString()}</span>
          </div>

          <div class="detail-row">
            <span class="detail-label">Time:</span>
            <span class="detail-value">${new Date().toLocaleTimeString()}</span>
          </div>

          <div class="receipt-number">
            M-PESA Receipt: ${paymentData?.receiptNumber || 'N/A'}
          </div>

          <hr>

          <div class="detail-row">
            <span class="detail-label">Status:</span>
            <span class="detail-value" style="color: #4CAF50;">Completed ✓</span>
          </div>

          <div class="timestamp">
            Receipt generated: ${new Date().toLocaleString()}
          </div>
        </div>

        <div class="footer">
          <div class="footer-text">
            Official ZUCA payment receipt • Valid without signature
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const blob = new Blob([receiptHTML], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ZUCA_Receipt_${paymentData?.receiptNumber || Date.now()}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
  
  // Print receipt
  const printReceipt = () => {
    const printContent = document.querySelector(".receipt-content");
    if (printContent) {
      const printWindow = window.open("", "_blank");
      printWindow.document.write(`
        <html><head><title>ZUCA Payment Receipt</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          @media print { body { margin: 0; padding: 20px; } }
        </style></head>
        <body>${printContent.innerHTML}<script>window.print();window.close();<\/script></body>
        </html>
      `);
      printWindow.document.close();
    }
  };
  
  // Share on WhatsApp
  const shareOnWhatsApp = () => {
    const message = `🙏 ZUCA Payment Confirmation 🙏\n\nCampaign: ${paymentData?.campaignTitle}\nAmount: KES ${(paymentData?.amount || 0).toLocaleString()}\nReceipt No: ${paymentData?.receiptNumber}\nSender: ${paymentData?.senderName}\nPhone: ${paymentData?.senderPhone}\nDate: ${paymentData?.timestamp}\n\nThank you for your contribution! Tumsifu Yesu Kristu!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };
  
  return (
    <div style={styles.pageWrapper}>
      {/* Slideshow Background */}
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

      {/* Content Overlay */}
      <div style={styles.overlay}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
          style={styles.card}
        >
          {/* Success Icon */}
          <div style={styles.iconContainer}>
            <FaCheckCircle style={styles.successIcon} />
          </div>
          
          <h1 style={styles.title}>Payment Successful! 🎉</h1>
          <p style={styles.subtitle}>Your contribution has been received</p>
          
          {/* ZUCA Logo */}
          <div style={styles.logoContainer}>
            <img src={logo} alt="ZUCA Logo" style={styles.logo} />
            <span style={styles.logoText}>ZUCA</span>
          </div>
          
          {/* Payment Details */}
          <div className="receipt-content" style={styles.detailsCard}>
            <h3 style={styles.detailsTitle}>Payment Details</h3>
            
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Campaign:</span>
              <span style={styles.detailValue}>{paymentData?.campaignTitle || "Contribution"}</span>
            </div>

            {paymentData?.jumuiaName && (
  <div style={styles.detailRow}>
    <span style={styles.detailLabel}>Jumuia:</span>
    <span style={styles.detailValue}>🏠 {paymentData.jumuiaName}</span>
  </div>
)}
            
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Amount Paid:</span>
              <span style={styles.detailValueAmount}>KES {paymentData?.amount?.toLocaleString() || "0"}</span>
            </div>
            
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>M-PESA Receipt:</span>
              <span style={styles.detailValueCode}>{paymentData?.receiptNumber || "N/A"}</span>
            </div>
            
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Sender Name:</span>
              <span style={styles.detailValue}>{paymentData?.senderName || "N/A"}</span>
            </div>
            
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Sender Phone:</span>
              <span style={styles.detailValue}>{paymentData?.senderPhone || "N/A"}</span>
            </div>
            
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Date & Time:</span>
              <span style={styles.detailValue}>{paymentData?.timestamp || new Date().toLocaleString()}</span>
            </div>
            
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Payment Method:</span>
              <span style={styles.detailValue}>M-PESA (Lipa Na M-PESA)</span>
            </div>
            
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Status:</span>
              <span style={styles.statusBadge}>✅ COMPLETED</span>
            </div>
          </div>
          
          {/* Download Buttons */}
          <div style={styles.downloadButtons}>
            <button onClick={downloadReceipt} style={styles.downloadBtn}>
              <FaDownload /> Download Receipt
            </button>
            <button onClick={printReceipt} style={styles.printBtn}>
              <FaPrint /> Print Receipt
            </button>
            <button onClick={shareOnWhatsApp} style={styles.whatsappBtn}>
              <FaWhatsapp /> Share
            </button>
          </div>
          
          {/* Email Confirmation Message */}
          <div style={styles.emailCard}>
            <FaEnvelope style={styles.emailIcon} />
            <div>
              <p style={styles.emailText}><strong>Email confirmation sent!</strong></p>
              <p style={styles.emailSubtext}>A receipt has been sent to your registered email address.</p>
            </div>
          </div>
          
          {/* What Happens Next */}
          <div style={styles.nextSteps}>
            <h4 style={styles.nextStepsTitle}>What happens next?</h4>
            <ul style={styles.nextStepsList}>
              <li>✓ Your pledge has been automatically updated</li>
              <li>✓ The admin and treasurer have been notified</li>
              <li>✓ You can view your updated pledge in your dashboard</li>
            </ul>
          </div>
          
          {/* Action Buttons */}
          <div style={styles.buttonGroup}>
            <Link to="/contributions" style={styles.primaryBtn}>
              <FaHome /> View My Contributions
            </Link>
            <Link to="/dashboard" style={styles.secondaryBtn}>
              Go to Dashboard <FaArrowRight />
            </Link>
          </div>
          
          <p style={styles.timerText}>Redirecting to contributions page in 10 seconds...</p>
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
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 20;
          transition: all 0.3s ease;
          font-size: 18px;
        }
        .slideshow-nav:hover { background: rgba(0, 198, 255, 0.8); }
        .slideshow-nav-prev { left: 15px; }
        .slideshow-nav-next { right: 15px; }
        .slideshow-dots {
          position: absolute;
          bottom: 15px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          gap: 10px;
          z-index: 20;
          flex-wrap: wrap;
          padding: 0 12px;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.5);
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          padding: 0;
        }
        .dot.active { background: #00c6ff; width: 20px; border-radius: 10px; }
        .slideshow-play-pause {
          position: absolute;
          bottom: 15px;
          right: 15px;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          border: none;
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 20;
          font-size: 12px;
        }
        .slideshow-play-pause:hover { background: rgba(0, 198, 255, 0.8); }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @media (max-width: 768px) {
          .slideshow-nav { width: 32px; height: 32px; font-size: 14px; }
          .slideshow-nav-prev { left: 10px; }
          .slideshow-nav-next { right: 10px; }
          .slideshow-play-pause { width: 32px; height: 32px; font-size: 11px; bottom: 12px; right: 12px; }
          .dot { width: 6px; height: 6px; }
          .dot.active { width: 16px; }
        }
        @media (max-width: 480px) {
          .slideshow-nav { width: 28px; height: 28px; font-size: 12px; }
          .slideshow-dots { gap: 6px; }
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
    background: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(10px)",
    borderRadius: "24px",
    padding: "clamp(20px, 5vw, 32px)",
    boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
    textAlign: "center",
    position: "relative",
    zIndex: 1,
  },
  iconContainer: { marginBottom: "16px" },
  successIcon: {
    fontSize: "clamp(50px, 12vw, 70px)",
    color: "#10b981",
    animation: "float 2s ease-in-out infinite",
  },
  title: {
    fontSize: "clamp(22px, 6vw, 28px)",
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "clamp(13px, 4vw, 16px)",
    color: "#64748b",
    marginBottom: "20px",
  },
  logoContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    marginBottom: "20px",
    paddingBottom: "16px",
    borderBottom: "1px solid #e2e8f0",
  },
  logo: { width: "40px", height: "40px", borderRadius: "50%" },
  logoText: {
    fontSize: "20px",
    fontWeight: "bold",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  detailsCard: {
    background: "#f8fafc",
    borderRadius: "16px",
    padding: "clamp(12px, 4vw, 20px)",
    marginBottom: "20px",
    textAlign: "left",
  },
  detailsTitle: {
    fontSize: "clamp(14px, 4vw, 16px)",
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: "12px",
    borderLeft: "3px solid #10b981",
    paddingLeft: "12px",
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
    borderBottom: "1px solid #e2e8f0",
    flexWrap: "wrap",
    gap: "6px",
  },
  detailLabel: { fontSize: "clamp(12px, 3.5vw, 14px)", color: "#64748b" },
  detailValue: { fontSize: "clamp(12px, 3.5vw, 14px)", fontWeight: "600", color: "#1e293b" },
  detailValueAmount: { fontSize: "clamp(16px, 4.5vw, 18px)", fontWeight: "bold", color: "#10b981" },
  detailValueCode: {
    fontSize: "clamp(11px, 3vw, 13px)",
    fontWeight: "700",
    color: "#10b981",
    fontFamily: "monospace",
    background: "#d1fae5",
    padding: "4px 8px",
    borderRadius: "6px",
  },
  statusBadge: { fontSize: "12px", fontWeight: "600", color: "#10b981" },
  downloadButtons: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  downloadBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "clamp(8px, 3vw, 10px) clamp(12px, 4vw, 16px)",
    background: "#1e293b",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "clamp(11px, 3vw, 13px)",
    fontWeight: "600",
    cursor: "pointer",
  },
  printBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "clamp(8px, 3vw, 10px) clamp(12px, 4vw, 16px)",
    background: "#475569",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "clamp(11px, 3vw, 13px)",
    fontWeight: "600",
    cursor: "pointer",
  },
  whatsappBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "clamp(8px, 3vw, 10px) clamp(12px, 4vw, 16px)",
    background: "#25D366",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "clamp(11px, 3vw, 13px)",
    fontWeight: "600",
    cursor: "pointer",
  },
  emailCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    background: "#eff6ff",
    borderRadius: "12px",
    padding: "clamp(12px, 4vw, 16px)",
    marginBottom: "20px",
    textAlign: "left",
  },
  emailIcon: { fontSize: "clamp(20px, 5vw, 24px)", color: "#3b82f6", flexShrink: 0 },
  emailText: { fontSize: "clamp(12px, 3.5vw, 14px)", color: "#1e293b", marginBottom: "4px" },
  emailSubtext: { fontSize: "clamp(11px, 3vw, 12px)", color: "#64748b" },
  nextSteps: {
    background: "#fef3c7",
    borderRadius: "12px",
    padding: "clamp(12px, 4vw, 16px)",
    marginBottom: "20px",
    textAlign: "left",
  },
  nextStepsTitle: { fontSize: "clamp(13px, 4vw, 14px)", fontWeight: "600", color: "#92400e", marginBottom: "10px" },
  nextStepsList: { fontSize: "clamp(11px, 3vw, 13px)", color: "#78350f", listStyle: "none", paddingLeft: "0", lineHeight: "1.8" },
  buttonGroup: {
    display: "flex",
    gap: "10px",
    marginBottom: "16px",
    flexWrap: "wrap",
  },
  primaryBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "clamp(10px, 3.5vw, 12px) clamp(16px, 5vw, 20px)",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "white",
    textDecoration: "none",
    borderRadius: "12px",
    fontWeight: "600",
    fontSize: "clamp(12px, 3.5vw, 14px)",
  },
  secondaryBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "clamp(10px, 3.5vw, 12px) clamp(16px, 5vw, 20px)",
    background: "#f1f5f9",
    color: "#1e293b",
    textDecoration: "none",
    borderRadius: "12px",
    fontWeight: "600",
    fontSize: "clamp(12px, 3.5vw, 14px)",
  },
  timerText: { fontSize: "clamp(10px, 3vw, 12px)", color: "#94a3b8", marginTop: "16px" },
};

export default PaymentSuccess;