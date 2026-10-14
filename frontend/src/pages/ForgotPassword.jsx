// frontend/src/pages/ForgotPassword.jsx
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

// Slideshow images (same as Register.jsx)
import slide1 from "../assets/background2.webp";
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

import logo from "../assets/zuca-logo.png";
import BASE_URL from "../api";
import { FaEnvelope, FaArrowLeft, FaSpinner, FaCheckCircle, FaTimesCircle } from "react-icons/fa";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [focusedField, setFocusedField] = useState(null);
  const navigate = useNavigate();

  // Slideshow state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying] = useState(true);
  const slideIntervalRef = useRef(null);

  const slides = [
    { id: 1, image: slide1 },
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

  // Auto-play slideshow
  useEffect(() => {
    if (!isPlaying) return;

    slideIntervalRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => {
      if (slideIntervalRef.current) clearInterval(slideIntervalRef.current);
    };
  }, [isPlaying, slides.length]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Email is required");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/api/auth/request-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess("Reset code sent to your email! Redirecting...");
        setTimeout(() => {
          navigate("/reset-password", { 
            state: { email: email.trim() }
          });
        }, 2000);
      } else {
        setError(data.error || "Something went wrong");
      }
    } catch (err) {
      setError("Network error. Check if backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-page">
      {/* Background slideshow */}
      <div className="forgot-background">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`forgot-slide ${index === currentSlide ? "active" : ""}`}
          >
            <img src={slide.image} alt="" />
          </div>
        ))}
        <div className="forgot-background-overlay" />
      </div>

      {/* Main layout */}
      <div className="forgot-layout">
        {/* LEFT BRANDING PANEL */}
        <motion.section
          className="forgot-brand-panel"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="brand-panel-content">
            <div className="brand-logo-wrap">
              <img src={logo} alt="ZUCA" />
            </div>

            <div className="brand-copy">
              <span className="brand-label">ZETECH UNIVERSITY CATHOLIC ACTION</span>
              <h1>
                ZUCA
                <br />
                <span>PORTAL</span>
              </h1>
              <p>Enter your email to receive a password reset code.</p>
            </div>

            <div className="brand-divider" />

            <div className="brand-message">
              <span className="brand-cross">✝</span>
              <div>
                <strong>Need help?</strong>
                <p>Contact support if you're having trouble accessing your account.</p>
              </div>
            </div>
          </div>

          <div className="brand-footer">
            <span>ZUCA Portal</span>
            <span className="brand-dot">•</span>
            <span>Password Recovery</span>
          </div>
        </motion.section>

        {/* RIGHT FORM PANEL */}
        <motion.section
          className="forgot-form-panel"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="forgot-form-card">
            <div className="form-header">
              <div className="mobile-logo">
                <img src={logo} alt="ZUCA" />
              </div>
              <div>
                <span className="form-eyebrow">PASSWORD RECOVERY</span>
                <h2>Forgot Password?</h2>
                <p>Enter your email to receive a reset code</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="forgot-form">
              {/* EMAIL FIELD */}
              <div className={`field ${focusedField === "email" ? "focused" : ""}`}>
                <label htmlFor="email">Email Address</label>
                <div className="input-shell">
                  <span className="field-icon"><FaEnvelope /></span>
                  <input
                    id="email"
                    type="email"
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    required
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
                <small>We'll send a 6-digit code to this email</small>
              </div>

              {/* ERROR / SUCCESS */}
              {error && (
                <div className="forgot-error">
                  <FaTimesCircle /> {error}
                </div>
              )}
              {success && (
                <div className="forgot-success">
                  <FaCheckCircle /> {success}
                </div>
              )}

              {/* SUBMIT */}
              <motion.button
                type="submit"
                className="forgot-submit"
                disabled={loading}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.99 }}
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    Sending...
                  </>
                ) : (
                  <>
                    <FaEnvelope /> Send Reset Code
                  </>
                )}
              </motion.button>
            </form>

            {/* LINKS */}
            <div className="links-area">
              <Link to="/login" className="link-btn">
                <FaArrowLeft /> Back to Login
              </Link>
              <span className="divider">|</span>
              <Link to="/register" className="link-btn">
                Create Account
              </Link>
            </div>

            <div className="form-footer">
              <span className="footer-cross">✝</span>
              <span>ZUCA Portal · Zetech University Catholic Action</span>
            </div>
          </div>
        </motion.section>
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }

        .forgot-page {
          min-height: 100vh;
          width: 100%;
          position: relative;
          overflow-x: hidden;
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: #f4f7fb;
        }

        /* BACKGROUND */
        .forgot-background {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
        }

        .forgot-slide {
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 1.2s ease;
        }

        .forgot-slide.active {
          opacity: 1;
        }

        .forgot-slide img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }

        .forgot-background-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(7, 25, 54, 0.55), rgba(7, 25, 54, 0.51) 48%, rgba(247, 249, 252, 0.92) 100%);
        }

        /* MAIN LAYOUT */
        .forgot-layout {
          position: relative;
          z-index: 2;
          min-height: 100vh;
          width: 100%;
          display: grid;
          grid-template-columns: minmax(350px, 0.9fr) minmax(540px, 1.1fr);
          align-items: center;
          gap: 40px;
          padding: 45px 7%;
        }

        /* BRAND PANEL */
        .forgot-brand-panel {
          color: white;
          min-height: 620px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 35px 15px 35px 25px;
        }

        .brand-panel-content {
          max-width: 480px;
        }

        .brand-logo-wrap {
          width: 80px;
          height: 82px;
          background: rgba(255, 255, 255, 0.88);
          border-radius: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
          box-shadow: 0 15px 35px rgba(0,0,0,0.2);
          margin-bottom: 38px;
        }

        .brand-logo-wrap img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .brand-label {
          display: inline-block;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 2px;
          opacity: 0.78;
          margin-bottom: 14px;
        }

        .brand-copy h1 {
          font-size: clamp(52px, 6vw, 86px);
          line-height: 0.87;
          letter-spacing: -4px;
          margin: 0;
          font-weight: 800;
        }

        .brand-copy h1 span {
          font-weight: 400;
          opacity: 0.86;
        }

        .brand-copy p {
          max-width: 390px;
          font-size: 18px;
          line-height: 1.65;
          color: rgba(255,255,255,0.82);
          margin: 30px 0 0;
        }

        .brand-divider {
          width: 65px;
          height: 3px;
          background: white;
          opacity: 0.7;
          margin: 35px 0;
          border-radius: 10px;
        }

        .brand-message {
          display: flex;
          gap: 16px;
          align-items: flex-start;
          max-width: 420px;
        }

        .brand-cross {
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,255,255,0.35);
          border-radius: 50%;
          font-size: 17px;
        }

        .brand-message strong {
          display: block;
          font-size: 14px;
          margin-bottom: 5px;
        }

        .brand-message p {
          margin: 0;
          font-size: 13px;
          line-height: 1.55;
          color: rgba(255,255,255,0.68);
        }

        .brand-footer {
          display: flex;
          align-items: center;
          gap: 10px;
          color: rgba(255,255,255,0.65);
          font-size: 12px;
        }

        .brand-dot {
          opacity: 0.4;
        }

        /* FORM PANEL */
        .forgot-form-panel {
          display: flex;
          justify-content: center;
        }

        .forgot-form-card {
          width: 100%;
          max-width: 620px;
          background: rgba(255,255,255,0.97);
          border: 1px solid rgba(255,255,255,0.85);
          border-radius: 28px;
          padding: 42px 46px 28px;
          box-shadow: 0 30px 80px rgba(5,20,45,0.18);
        }

        .form-header {
          display: flex;
          align-items: flex-start;
          gap: 18px;
          margin-bottom: 30px;
        }

        .mobile-logo {
          display: none;
        }

        .form-eyebrow {
          display: block;
          color: #2563eb;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.6px;
          margin-bottom: 7px;
        }

        .form-header h2 {
          color: #14213d;
          font-size: 30px;
          line-height: 1.15;
          letter-spacing: -0.8px;
          margin: 0 0 8px;
          font-weight: 750;
        }

        .form-header p {
          color: #64748b;
          font-size: 14px;
          margin: 0;
        }

        /* FORM */
        .forgot-form {
          display: flex;
          flex-direction: column;
          gap: 17px;
        }

        .field {
          min-width: 0;
        }

        .field label {
          display: block;
          color: #27364d;
          font-size: 12px;
          font-weight: 700;
          margin: 0 0 7px 2px;
        }

        .input-shell {
          height: 50px;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid #d9e1ec;
          background: #f8fafc;
          border-radius: 12px;
          padding: 0 13px;
          transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
        }

        .field.focused .input-shell {
          background: white;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.10);
        }

        .field-icon {
          width: 22px;
          text-align: center;
          opacity: 0.6;
          font-size: 14px;
          flex: 0 0 22px;
        }

        .input-shell input {
          width: 100%;
          min-width: 0;
          height: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #172033;
          font-size: 14px;
          font-family: inherit;
        }

        .input-shell input::placeholder {
          color: #9aa7b8;
        }

        .field small {
          display: block;
          color: #8290a3;
          font-size: 10.5px;
          margin: 6px 2px 0;
        }

        .forgot-error {
          background: #fff1f2;
          color: #be123c;
          border: 1px solid #fecdd3;
          padding: 10px 12px;
          border-radius: 9px;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .forgot-success {
          background: #f0fdf4;
          color: #15803d;
          border: 1px solid #bbf7d0;
          padding: 10px 12px;
          border-radius: 9px;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .forgot-submit {
          height: 52px;
          width: 100%;
          border: 0;
          border-radius: 12px;
          background: #1d4ed8;
          color: white;
          font-family: inherit;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 8px 18px rgba(29,78,216,0.20);
          transition: background 0.2s ease, box-shadow 0.2s ease;
        }

        .forgot-submit:hover:not(:disabled) {
          background: #1e40af;
          box-shadow: 0 11px 22px rgba(29,78,216,0.25);
        }

        .forgot-submit:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: forgotSpin 0.7s linear infinite;
        }

        @keyframes forgotSpin {
          to { transform: rotate(360deg); }
        }

        .links-area {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          margin-top: 22px;
        }

        .link-btn {
          color: #1d4ed8;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: color 0.2s;
        }

        .link-btn:hover {
          color: #1e40af;
          text-decoration: underline;
        }

        .divider {
          color: #d1d5db;
        }

        .form-footer {
          border-top: 1px solid #edf0f4;
          margin-top: 24px;
          padding-top: 17px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 7px;
          color: #9aa5b4;
          font-size: 9.5px;
          text-align: center;
        }

        .footer-cross {
          color: #64748b;
        }

        /* TABLET */
        @media (max-width: 1050px) {
          .forgot-layout {
            grid-template-columns: 0.65fr 1fr;
            padding: 35px;
          }

          .forgot-brand-panel {
            padding-left: 0;
          }

          .brand-copy h1 {
            font-size: 62px;
          }

          .forgot-form-card {
            padding: 35px;
          }
        }

        /* MOBILE */
        @media (max-width: 800px) {
          .forgot-page {
            background: #f4f7fb;
          }

          .forgot-background {
            position: absolute;
            height: 245px;
          }

          .forgot-background-overlay {
            background: linear-gradient(180deg, rgba(7, 25, 54, 0.07), rgba(7, 25, 54, 0.32));
          }

          .forgot-layout {
            display: block;
            padding: 0;
            min-height: 100vh;
          }

          .forgot-brand-panel {
            min-height: 245px;
            padding: 25px 24px 28px;
            justify-content: flex-start;
          }

          .brand-logo-wrap {
            width: 55px;
            height: 55px;
            padding: 8px;
            border-radius: 15px;
            margin-bottom: 18px;
          }

          .brand-label {
            font-size: 9px;
            letter-spacing: 1.3px;
            margin-bottom: 5px;
          }

          .brand-copy h1 {
            font-size: 39px;
            letter-spacing: -2px;
          }

          .brand-copy p,
          .brand-divider,
          .brand-message,
          .brand-footer {
            display: none;
          }

          .forgot-form-panel {
            position: relative;
            z-index: 5;
            margin-top: 0;
          }

          .forgot-form-card {
            max-width: none;
            min-height: calc(100vh - 210px);
            border-radius: 25px 25px 0 0;
            padding: 30px 22px 22px;
            box-shadow: 0 -12px 35px rgba(0,0,0,0.10);
          }

          .form-header {
            margin-bottom: 25px;
          }

          .mobile-logo {
            display: none;
          }

          .form-header h2 {
            font-size: 25px;
          }

          .form-header p {
            font-size: 13px;
          }
        }

        /* SMALL PHONES */
        @media (max-width: 430px) {
          .forgot-brand-panel {
            height: 205px;
            min-height: 205px;
          }

          .forgot-background {
            height: 205px;
          }

          .brand-copy h1 {
            font-size: 34px;
          }

          .forgot-form-card {
            min-height: calc(100vh - 180px);
            padding: 27px 18px 20px;
          }

          .form-header h2 {
            font-size: 23px;
          }
        }
      `}</style>
    </div>
  );
}

export default ForgotPassword;