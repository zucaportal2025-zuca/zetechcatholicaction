// frontend/src/pages/ResetPassword.jsx
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

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
import { FaLock, FaEnvelope, FaKey, FaClock, FaCheckCircle, FaTimesCircle, FaSpinner, FaArrowLeft } from "react-icons/fa";

function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  // ------------------------------------------------------------
  // SLIDESHOW
  // ------------------------------------------------------------

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

  useEffect(() => {
    if (!isPlaying) return;

    slideIntervalRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => {
      if (slideIntervalRef.current) {
        clearInterval(slideIntervalRef.current);
      }
    };
  }, [isPlaying, slides.length]);

  // ------------------------------------------------------------
  // STATE
  // ------------------------------------------------------------

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(300);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [email, setEmail] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  // ------------------------------------------------------------
  // EFFECTS
  // ------------------------------------------------------------

  useEffect(() => {
    const stateEmail = location.state?.email;
    const storedEmail = sessionStorage.getItem('resetEmail');
    
    if (stateEmail) {
      setEmail(stateEmail);
      sessionStorage.setItem('resetEmail', stateEmail);
    } else if (storedEmail) {
      setEmail(storedEmail);
    } else {
      navigate("/forgot-password");
    }
  }, [location, navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prevTimer) => {
        if (prevTimer <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prevTimer - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // ------------------------------------------------------------
  // FUNCTIONS
  // ------------------------------------------------------------

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleCodeChange = (element, index) => {
    if (isNaN(element.value)) return;
    const newCode = [...code];
    newCode[index] = element.value;
    setCode(newCode);
    if (element.value !== "" && index < 5) {
      document.getElementById(`code-${index + 1}`)?.focus();
      setFocusedIndex(index + 1);
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (code[index] === "" && index > 0) {
        document.getElementById(`code-${index - 1}`)?.focus();
        setFocusedIndex(index - 1);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      document.getElementById(`code-${index - 1}`)?.focus();
      setFocusedIndex(index - 1);
    } else if (e.key === "ArrowRight" && index < 5) {
      document.getElementById(`code-${index + 1}`)?.focus();
      setFocusedIndex(index + 1);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setCode(digits);
      document.getElementById('code-5')?.focus();
      setFocusedIndex(5);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${BASE_URL}/api/auth/resend-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setTimer(300);
        setCode(["", "", "", "", "", ""]);
        setSuccess("New code sent to your email!");
        setTimeout(() => setSuccess(""), 3000);
        document.getElementById('code-0')?.focus();
        setFocusedIndex(0);
      } else {
        setError(data.error || "Failed to resend code");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setError("Please enter the complete 6-digit code");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/api/auth/verify-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email, 
          code: fullCode,
          newPassword: newPassword.trim()
        }),
      });

      const data = await res.json();

      if (res.ok) {
        sessionStorage.clear();
        setSuccess("Password reset successful! Redirecting to login...");
        setTimeout(() => {
          navigate("/login", { 
            state: { message: "Password reset successful! Please login." } 
          });
        }, 2000);
      } else {
        setError(data.error || "Failed to reset password");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------

  return (
    <div className="reset-page">
      {/* Background slideshow */}
      <div className="reset-background">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`reset-slide ${index === currentSlide ? "active" : ""}`}
          >
            <img src={slide.image} alt="" />
          </div>
        ))}
        <div className="reset-background-overlay" />
      </div>

      {/* Main layout */}
      <div className="reset-layout">
        {/* LEFT BRANDING PANEL */}
        <motion.section
          className="reset-brand-panel"
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
              <p>Reset your password and regain access to your ZUCA account.</p>
            </div>

            <div className="brand-divider" />

            <div className="brand-message">
              <span className="brand-cross">✝</span>
              <div>
                <strong>Need help?</strong>
                <p>Contact our support team for assistance with your account.</p>
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
          className="reset-form-panel"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="reset-form-card">
            <div className="form-header">
              <div className="mobile-logo">
                <img src={logo} alt="ZUCA" />
              </div>
              <div>
                <span className="form-eyebrow">PASSWORD RESET</span>
                <h2>Reset your password</h2>
                <p>Enter the verification code sent to your email</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="reset-form">
              {/* EMAIL DISPLAY */}
              <div className="email-display">
                <FaEnvelope className="email-icon" />
                <span>Code sent to: <strong>{email}</strong></span>
              </div>

              {/* VERIFICATION CODE */}
              <div className="field focused">
                <label>Verification code</label>
                <div className="code-container">
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      id={`code-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handleCodeChange(e.target, index)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      onFocus={() => setFocusedIndex(index)}
                      className={`code-input ${focusedIndex === index ? "focused" : ""}`}
                      autoFocus={index === 0}
                      required
                      disabled={loading}
                    />
                  ))}
                </div>
                <small className="spam-note">📩 Please check your spam folder if you don't see the email</small>
              </div>

              {/* TIMER */}
              {timer > 0 && (
                <div className="timer-display">
                  <FaClock className="timer-icon" />
                  <span>Code expires in: <strong>{formatTime(timer)}</strong></span>
                </div>
              )}

              {/* NEW PASSWORD */}
              <div className={`field ${focusedField === "password" ? "focused" : ""}`}>
                <label htmlFor="newPassword">New password</label>
                <div className="input-shell">
                  <span className="field-icon"><FaLock /></span>
                  <input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter new password (min 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    required
                    minLength="6"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* CONFIRM PASSWORD */}
              <div className={`field ${focusedField === "confirm" ? "focused" : ""}`}>
                <label htmlFor="confirmPassword">Confirm password</label>
                <div className="input-shell">
                  <span className="field-icon"><FaLock /></span>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={() => setFocusedField("confirm")}
                    onBlur={() => setFocusedField(null)}
                    required
                    minLength="6"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <div className={`password-match ${newPassword === confirmPassword ? "match" : "no-match"}`}>
                    {newPassword === confirmPassword ? "✓ Passwords match" : "Passwords do not match"}
                  </div>
                )}
              </div>

              {/* ERROR / SUCCESS */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    className="reset-error"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                  >
                    <FaTimesCircle /> {error}
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    className="reset-success"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                  >
                    <FaCheckCircle /> {success}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* SUBMIT */}
              <motion.button
                type="submit"
                className="reset-submit"
                disabled={loading}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.99 }}
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <FaKey /> Reset Password
                  </>
                )}
              </motion.button>

              {/* RESEND */}
              <div className="resend-area">
                {timer === 0 ? (
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={loading}
                    className="resend-btn"
                  >
                    Resend Code
                  </button>
                ) : (
                  <span>
                    Didn't receive code? <strong>Resend in {formatTime(timer)}</strong>
                  </span>
                )}
              </div>
            </form>

            {/* LINKS */}
            <div className="links-area">
              <Link to="/forgot-password" className="link-btn">
                <FaArrowLeft /> Back
              </Link>
              <span className="divider">|</span>
              <Link to="/login" className="link-btn">
                Login
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

        .reset-page {
          min-height: 100vh;
          width: 100%;
          position: relative;
          overflow-x: hidden;
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: #f4f7fb;
        }

        /* BACKGROUND */
        .reset-background {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
        }

        .reset-slide {
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 1.2s ease;
        }

        .reset-slide.active {
          opacity: 1;
        }

        .reset-slide img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }

        .reset-background-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(7, 25, 54, 0.55), rgba(7, 25, 54, 0.51) 48%, rgba(247, 249, 252, 0.92) 100%);
        }

        /* MAIN LAYOUT */
        .reset-layout {
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
        .reset-brand-panel {
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
        .reset-form-panel {
          display: flex;
          justify-content: center;
        }

        .reset-form-card {
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
        .reset-form {
          display: flex;
          flex-direction: column;
          gap: 17px;
        }

        .email-display {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: #f5f8fc;
          border-radius: 12px;
          border: 1px solid #e5eaf1;
          color: #475569;
          font-size: 13px;
        }

        .email-icon {
          color: #2563eb;
          font-size: 16px;
        }

        .email-display strong {
          color: #1d4ed8;
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

        .code-container {
          display: flex;
          gap: 10px;
          justify-content: center;
        }

        .code-input {
          width: 50px;
          height: 58px;
          border: 1px solid #d9e1ec;
          background: #f8fafc;
          border-radius: 12px;
          text-align: center;
          font-size: 24px;
          font-weight: 700;
          color: #14213d;
          outline: none;
          transition: all 0.18s ease;
        }

        .code-input.focused {
          background: white;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.10);
        }

        .code-input:focus {
          background: white;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.10);
        }

        .spam-note {
          display: block;
          color: #8290a3;
          font-size: 10.5px;
          margin-top: 8px;
          text-align: center;
        }

        .timer-display {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #94a3b8;
          font-size: 12px;
        }

        .timer-icon {
          color: #f59e0b;
        }

        .timer-display strong {
          color: #475569;
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

        .password-toggle {
          border: 0;
          background: transparent;
          color: #2563eb;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          padding: 4px;
        }

        .password-match {
          font-size: 10.5px;
          margin-top: 6px;
          font-weight: 600;
        }

        .password-match.match {
          color: #15803d;
        }

        .password-match.no-match {
          color: #dc2626;
        }

        .reset-error {
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

        .reset-success {
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

        .reset-submit {
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

        .reset-submit:hover:not(:disabled) {
          background: #1e40af;
          box-shadow: 0 11px 22px rgba(29,78,216,0.25);
        }

        .reset-submit:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: resetSpin 0.7s linear infinite;
        }

        @keyframes resetSpin {
          to { transform: rotate(360deg); }
        }

        .resend-area {
          text-align: center;
          color: #94a3b8;
          font-size: 12px;
          min-height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .resend-area strong {
          color: #475569;
        }

        .resend-btn {
          border: 0;
          background: transparent;
          color: #1d4ed8;
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .resend-btn:hover {
          text-decoration: underline;
        }

        .resend-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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
          .reset-layout {
            grid-template-columns: 0.65fr 1fr;
            padding: 35px;
          }

          .reset-brand-panel {
            padding-left: 0;
          }

          .brand-copy h1 {
            font-size: 62px;
          }

          .reset-form-card {
            padding: 35px;
          }
        }

        /* MOBILE */
        @media (max-width: 800px) {
          .reset-page {
            background: #f4f7fb;
          }

          .reset-background {
            position: absolute;
            height: 245px;
          }

          .reset-background-overlay {
            background: linear-gradient(180deg, rgba(7, 25, 54, 0.07), rgba(7, 25, 54, 0.32));
          }

          .reset-layout {
            display: block;
            padding: 0;
            min-height: 100vh;
          }

          .reset-brand-panel {
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

          .reset-form-panel {
            position: relative;
            z-index: 5;
            margin-top: 0;
          }

          .reset-form-card {
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

          .code-input {
            width: 44px;
            height: 52px;
            font-size: 20px;
          }
        }

        /* SMALL PHONES */
        @media (max-width: 430px) {
          .reset-brand-panel {
            height: 205px;
            min-height: 205px;
          }

          .reset-background {
            height: 205px;
          }

          .brand-copy h1 {
            font-size: 34px;
          }

          .reset-form-card {
            min-height: calc(100vh - 180px);
            padding: 27px 18px 20px;
          }

          .form-header h2 {
            font-size: 23px;
          }

          .code-input {
            width: 40px;
            height: 48px;
            font-size: 18px;
          }

          .code-container {
            gap: 6px;
          }
        }
      `}</style>
    </div>
  );
}

export default ResetPassword;