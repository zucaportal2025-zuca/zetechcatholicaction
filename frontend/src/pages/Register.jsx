
// frontend/src/pages/Register.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
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
import WelcomeModal from "../components/WelcomeModal";
import { FaLock, FaUser, FaUserAlt } from "react-icons/fa";

function Register() {
  const navigate = useNavigate();

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
  // REGISTRATION FORM
  // ------------------------------------------------------------

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [focusedField, setFocusedField] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordMatch, setPasswordMatch] = useState(null);

  // ------------------------------------------------------------
  // VERIFICATION
  // ------------------------------------------------------------

  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [verificationTimer, setVerificationTimer] = useState(300);

  // ------------------------------------------------------------
  // WELCOME
  // ------------------------------------------------------------

  const [showWelcome, setShowWelcome] = useState(false);
  const [newUserName, setNewUserName] = useState("");

  // ------------------------------------------------------------
  // FULL NAME
  // ------------------------------------------------------------

  const handleFullNameChange = (e) => {
    setFullName(e.target.value.toUpperCase());
  };

  // ------------------------------------------------------------
  // PASSWORD STRENGTH
  // ------------------------------------------------------------

  useEffect(() => {
    if (password.length === 0) {
      setPasswordStrength(0);
      return;
    }

    let strength = 0;

    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;

    setPasswordStrength(strength);
  }, [password]);

  // ------------------------------------------------------------
  // PASSWORD MATCH
  // ------------------------------------------------------------

  useEffect(() => {
    if (confirmPassword.length === 0) {
      setPasswordMatch(null);
      return;
    }

    setPasswordMatch(password === confirmPassword);
  }, [password, confirmPassword]);

  // ------------------------------------------------------------
  // VERIFICATION TIMER
  // ------------------------------------------------------------

  useEffect(() => {
    if (!showVerification) return;

    const interval = setInterval(() => {
      setVerificationTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showVerification]);

  // ------------------------------------------------------------
  // TIME FORMAT
  // ------------------------------------------------------------

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // ------------------------------------------------------------
  // VERIFICATION INPUT
  // ------------------------------------------------------------

  const handleVerificationCodeChange = (element, index) => {
    const value = element.value.replace(/\D/g, "").slice(-1);

    const newCode = [...verificationCode];
    newCode[index] = value;

    setVerificationCode(newCode);

    if (value !== "" && index < 5) {
      document
        .getElementById(`verify-code-${index + 1}`)
        ?.focus();
    }

    const fullCode = newCode.join("");

    if (
      fullCode.length === 6 &&
      newCode.every((digit) => digit !== "")
    ) {
      setTimeout(() => {
        handleVerifyEmailAuto(fullCode);
      }, 100);
    }
  };

  const handleVerificationKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (verificationCode[index] === "" && index > 0) {
        document
          .getElementById(`verify-code-${index - 1}`)
          ?.focus();
      }
    }

    if (e.key === "ArrowLeft" && index > 0) {
      document
        .getElementById(`verify-code-${index - 1}`)
        ?.focus();
    }

    if (e.key === "ArrowRight" && index < 5) {
      document
        .getElementById(`verify-code-${index + 1}`)
        ?.focus();
    }
  };

  // ------------------------------------------------------------
  // PASTE VERIFICATION CODE
  // ------------------------------------------------------------

  const handlePasteCode = (e) => {
    e.preventDefault();

    const pastedData = e.clipboardData
      .getData("text/plain")
      .trim();

    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split("");

      setVerificationCode(digits);

      setTimeout(() => {
        handleVerifyEmailAuto(pastedData);
      }, 100);
    } else {
      setVerificationError(
        "Please paste a valid 6-digit code."
      );

      setTimeout(() => {
        setVerificationError("");
      }, 2000);
    }
  };

  // ------------------------------------------------------------
  // VERIFY EMAIL
  // ------------------------------------------------------------

  const handleVerifyEmailAuto = async (fullCode) => {
    if (verificationLoading) return;

    setVerificationLoading(true);
    setVerificationError("");

    try {
      const res = await fetch(
        `${BASE_URL}/api/verify-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: verificationEmail,
            code: fullCode,
          }),
        }
      );

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem(
          "user",
          JSON.stringify(data.user)
        );

        setShowVerification(false);
        setShowWelcome(true);

        setNewUserName(
          data.user?.fullName?.split(" ")[0] ||
            "Member"
        );
      } else {
        setVerificationError(
          data.error || "Invalid verification code."
        );

        setVerificationCode([
          "",
          "",
          "",
          "",
          "",
          "",
        ]);

        setTimeout(() => {
          document
            .getElementById("verify-code-0")
            ?.focus();
        }, 50);
      }
    } catch (err) {
      console.error("Verification error:", err);

      setVerificationError(
        "Network error. Please try again."
      );

      setVerificationCode([
        "",
        "",
        "",
        "",
        "",
        "",
      ]);
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    const fullCode = verificationCode.join("");

    if (fullCode.length !== 6) {
      setVerificationError(
        "Please enter the complete 6-digit code."
      );
      return;
    }

    await handleVerifyEmailAuto(fullCode);
  };

  // ------------------------------------------------------------
  // RESEND VERIFICATION
  // ------------------------------------------------------------

  const handleResendVerification = async () => {
    setVerificationLoading(true);
    setVerificationError("");

    try {
      const res = await fetch(
        `${BASE_URL}/api/resend-verification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: verificationEmail,
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        setVerificationTimer(300);

        setVerificationCode([
          "",
          "",
          "",
          "",
          "",
          "",
        ]);

        setTimeout(() => {
          document
            .getElementById("verify-code-0")
            ?.focus();
        }, 50);

        showToast(
          "A new verification code has been sent.",
          "success"
        );
      } else {
        setVerificationError(
          data.error || "Failed to resend code."
        );
      }
    } catch (err) {
      console.error("Resend error:", err);

      setVerificationError(
        "Network error. Please try again."
      );
    } finally {
      setVerificationLoading(false);
    }
  };

  // ------------------------------------------------------------
  // TOAST
  // ------------------------------------------------------------

  const showToast = (
    message,
    type = "success"
  ) => {
    const toast = document.createElement("div");

    toast.textContent = message;

    toast.style.cssText = `
      position: fixed;
      left: 50%;
      bottom: 24px;
      transform: translateX(-50%);
      background: ${
        type === "success"
          ? "#15803d"
          : "#dc2626"
      };
      color: #ffffff;
      padding: 13px 20px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      z-index: 10001;
      box-shadow: 0 12px 30px rgba(0,0,0,0.22);
      animation: registerToastIn 0.25s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation =
        "registerToastOut 0.25s ease";

      setTimeout(() => {
        toast.remove();
      }, 250);
    }, 3000);
  };

  // ------------------------------------------------------------
  // REGISTER
  // ------------------------------------------------------------

  const handleRegister = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      showToast(
        "Passwords do not match.",
        "error"
      );
      return;
    }

    if (password.length < 8) {
      showToast(
        "Your password must contain at least 8 characters.",
        "error"
      );
      return;
    }

    const upperCaseFullName =
      fullName.toUpperCase();

    let formattedPhone = phone;

    if (phone.startsWith("07")) {
      formattedPhone =
        "+254" + phone.slice(1);
    } else if (
      phone.startsWith("7") &&
      phone.length === 9
    ) {
      formattedPhone =
        "+254" + phone;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `${BASE_URL}/api/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName: upperCaseFullName,
            email,
            password,
            phone: formattedPhone,
          }),
        }
      );

      const data = await res.json();

      if (res.ok && data.success) {
        setVerificationEmail(email);
        setVerificationCode([
          "",
          "",
          "",
          "",
          "",
          "",
        ]);
        setVerificationError("");
        setVerificationTimer(300);
        setShowVerification(true);

        setFullName("");
        setEmail("");
        setPhone("");
        setPassword("");
        setConfirmPassword("");

        setTimeout(() => {
          document
            .getElementById("verify-code-0")
            ?.focus();
        }, 250);
      } else {
        showToast(
          data.error || "Registration failed.",
          "error"
        );
      }
    } catch (err) {
      console.error(
        "Registration Error:",
        err
      );

      showToast(
        "Network error. Please check your connection.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------
  // WELCOME
  // ------------------------------------------------------------

  const handleWelcomeAccept = () => {
    setShowWelcome(false);
    navigate("/dashboard");
  };

  // ------------------------------------------------------------
  // PASSWORD STRENGTH
  // ------------------------------------------------------------

  const getStrengthText = () => {
    switch (passwordStrength) {
      case 1:
        return "Weak";
      case 2:
        return "Fair";
      case 3:
        return "Good";
      case 4:
        return "Strong";
      default:
        return "";
    }
  };

  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------

  return (
    <>
      <div className="register-page">

        {/* Background slideshow */}
        <div className="register-background">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`register-slide ${
                index === currentSlide
                  ? "active"
                  : ""
              }`}
            >
              <img
                src={slide.image}
                alt=""
              />
            </div>
          ))}

          <div className="register-background-overlay" />
        </div>

        {/* Main layout */}
        <div className="register-layout">

          {/* LEFT BRANDING PANEL */}
          <motion.section
            className="register-brand-panel"
            initial={{
              opacity: 0,
              x: -30,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            transition={{
              duration: 0.6,
            }}
          >
            <div className="brand-panel-content">

              <div className="brand-logo-wrap">
                <img src={logo} alt="Loading..." style={{ width: '50px', height: '70px' }} 
                />
              </div>

              <div className="brand-copy">
                <span className="brand-label">
                  ZETECH UNIVERSITY CATHOLIC ACTION
                </span>

                <h1>
                  ZUCA
                  <br />
                  <span>PORTAL</span>
                </h1>

                <p>
                  Your digital home for
                  Zetech University Catholic
                  Action.
                </p>
              </div>

              <div className="brand-divider" />

              <div className="brand-message">
                <span className="brand-cross">
                  ✝
                </span>

                <div>
                  <strong>
                    Welcome to our club
                  </strong>

                  <p>
                    Connect, participate and
                    stay informed through the
                    ZUCA Portal.
                  </p>
                </div>
              </div>

            </div>

            <div className="brand-footer">
              <span>
                ZUCA Portal
              </span>

              <span className="brand-dot">
                •
              </span>

              <span>
                Official Member Platform
              </span>
            </div>
          </motion.section>

          {/* RIGHT FORM PANEL */}
          <motion.section
            className="register-form-panel"
            initial={{
              opacity: 0,
              x: 30,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            transition={{
              duration: 0.6,
              delay: 0.1,
            }}
          >
            <div className="register-form-card">

              <div className="form-header">

                <div className="mobile-logo">
                  <img
                    src={logo}
                    alt="ZUCA"
                  />
                </div>

                <div>
                  <span className="form-eyebrow">
                    ZUCA MEMBER REGISTRATION
                  </span>

                  <h2>
                    Create your ZUCA account
                  </h2>

                  <p>
                    Register to access the
                    ZUCA Portal.
                  </p>
                </div>

              </div>

              <form
                onSubmit={handleRegister}
                className="register-form"
              >

                {/* NAME */}
                <div
                  className={`field ${
                    focusedField === "name"
                      ? "focused"
                      : ""
                  }`}
                >
                  <label htmlFor="fullName">
                    Full name
                  </label>

                  <div className="input-shell">
                    <span className="field-icon">
                      <FaUser/>
                    </span>

                    <input
                      id="fullName"
                      type="text"
                      placeholder="Your Official full name"
                      value={fullName}
                      onChange={
                        handleFullNameChange
                      }
                      onFocus={() =>
                        setFocusedField("name")
                      }
                      onBlur={() =>
                        setFocusedField(null)
                      }
                      autoComplete="name"
                      required
                    />
                  </div>

                  <small>
                    Please use your official
                    names.
                  </small>
                </div>

                {/* EMAIL */}
                <div
                  className={`field ${
                    focusedField === "email"
                      ? "focused"
                      : ""
                  }`}
                >
                  <label htmlFor="email">
                    Email address
                  </label>

                  <div className="input-shell">
                    <span className="field-icon">
                      ✉
                    </span>

                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) =>
                        setEmail(
                          e.target.value
                        )
                      }
                      onFocus={() =>
                        setFocusedField("email")
                      }
                      onBlur={() =>
                        setFocusedField(null)
                      }
                      autoComplete="email"
                      required
                    />
                  </div>

                  <small>
                    Use an email address you
                    can access for verification.
                  </small>
                </div>

                {/* PHONE */}
                <div
                  className={`field ${
                    focusedField === "phone"
                      ? "focused"
                      : ""
                  }`}
                >
                  <label htmlFor="phone">
                    Phone number
                  </label>

                  <div className="input-shell">
                    <span className="field-icon">
                      ☎
                    </span>

                    <input
                      id="phone"
                      type="tel"
                      inputMode="tel"
                      placeholder="07XX XXX XXX (mpesa or whatsapp number will be better)"
                      value={phone}
                      onChange={(e) =>
                        setPhone(
                          e.target.value
                        )
                      }
                      onFocus={() =>
                        setFocusedField("phone")
                      }
                      onBlur={() =>
                        setFocusedField(null)
                      }
                      autoComplete="tel"
                      required
                    />
                  </div>
                </div>

                {/* PASSWORD ROW */}
                <div className="password-row">

                  {/* PASSWORD */}
                  <div
                    className={`field ${
                      focusedField ===
                      "password"
                        ? "focused"
                        : ""
                    }`}
                  >
                    <label htmlFor="password">
                      Password
                    </label>

                    <div className="input-shell">
                      <span className="field-icon">
                        <FaLock/>
                      </span>

                      <input
                        id="password"
                        type={
                          showPassword
                            ? "text"
                            : "password"
                        }
                        placeholder="Create password you'll remember"
                        value={password}
                        onChange={(e) =>
                          setPassword(
                            e.target.value
                          )
                        }
                        onFocus={() =>
                          setFocusedField(
                            "password"
                          )
                        }
                        onBlur={() =>
                          setFocusedField(null)
                        }
                        autoComplete="new-password"
                        required
                      />

                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() =>
                          setShowPassword(
                            !showPassword
                          )
                        }
                        aria-label={
                          showPassword
                            ? "Hide password"
                            : "Show password"
                        }
                      >
                        {showPassword
                          ? "Hide"
                          : "Show"}
                      </button>
                    </div>

                    {password.length > 0 && (
                      <div className="password-strength">

                        <div className="strength-track">
                          {[1, 2, 3, 4].map(
                            (level) => (
                              <span
                                key={level}
                                className={
                                  level <=
                                  passwordStrength
                                    ? `strength-${passwordStrength}`
                                    : ""
                                }
                              />
                            )
                          )}
                        </div>

                        <span>
                          {getStrengthText()}
                        </span>

                      </div>
                    )}
                  </div>

                  {/* CONFIRM */}
                  <div
                    className={`field ${
                      focusedField ===
                      "confirm"
                        ? "focused"
                        : ""
                    }`}
                  >
                    <label htmlFor="confirmPassword">
                      Confirm password
                    </label>

                    <div className="input-shell">
                      <span className="field-icon">
                        <FaLock/>
                      </span>

                      <input
                        id="confirmPassword"
                        type={
                          showConfirm
                            ? "text"
                            : "password"
                        }
                        placeholder="Repeat password"
                        value={
                          confirmPassword
                        }
                        onChange={(e) =>
                          setConfirmPassword(
                            e.target.value
                          )
                        }
                        onFocus={() =>
                          setFocusedField(
                            "confirm"
                          )
                        }
                        onBlur={() =>
                          setFocusedField(null)
                        }
                        autoComplete="new-password"
                        required
                      />

                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() =>
                          setShowConfirm(
                            !showConfirm
                          )
                        }
                        aria-label={
                          showConfirm
                            ? "Hide password"
                            : "Show password"
                        }
                      >
                        {showConfirm
                          ? "Hide"
                          : "Show"}
                      </button>
                    </div>

                    {passwordMatch !==
                      null && (
                      <div
                        className={`password-match ${
                          passwordMatch
                            ? "match"
                            : "no-match"
                        }`}
                      >
                        {passwordMatch
                          ? "✓ Passwords match"
                          : "Passwords do not match"}
                      </div>
                    )}
                  </div>
                </div>

                {/* PASSWORD REQUIREMENTS */}
                <div className="requirements">
                  <div className="requirements-title">
                    Password requirements
                  </div>

                  <div className="requirements-grid">
                    <span
                      className={
                        password.length >= 8
                          ? "complete"
                          : ""
                      }
                    >
                      {password.length >= 8
                        ? "✓"
                        : "○"}{" "}
                      8+ characters
                    </span>

                    <span
                      className={
                        /[A-Z]/.test(
                          password
                        )
                          ? "complete"
                          : ""
                      }
                    >
                      {/[A-Z]/.test(
                        password
                      )
                        ? "✓"
                        : "○"}{" "}
                      Uppercase letter
                    </span>

                    <span
                      className={
                        /[0-9]/.test(password)
                          ? "complete"
                          : ""
                      }
                    >
                      {/[0-9]/.test(password)
                        ? "✓"
                        : "○"}{" "}
                      Number
                    </span>

                    <span
                      className={
                        /[^A-Za-z0-9]/.test(
                          password
                        )
                          ? "complete"
                          : ""
                      }
                    >
                      {/[^A-Za-z0-9]/.test(
                        password
                      )
                        ? "✓"
                        : "○"}{" "}
                      Special character
                    </span>
                  </div>
                </div>

                {/* SUBMIT */}
                <motion.button
                  type="submit"
                  className="register-submit"
                  disabled={loading}
                  whileHover={{
                    y: -1,
                  }}
                  whileTap={{
                    scale: 0.99,
                  }}
                >
                  {loading ? (
                    <>
                      <span className="spinner" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create account
                      <span className="submit-arrow">
                        →
                      </span>
                    </>
                  )}
                </motion.button>

              </form>

              {/* SIGN IN */}
              <div className="signin-area">
                <span>
                  Already have an account?
                </span>

                <Link to="/login">
                  Sign in
                </Link>
              </div>

              {/* FOOTER */}
              <div className="form-footer">
                <span className="footer-cross">
                  ✝
                </span>

                <span>
                  ZUCA Portal · Zetech
                  University Catholic Action
                </span>
              </div>

            </div>
          </motion.section>
        </div>
      </div>

      {/* ========================================================
          EMAIL VERIFICATION MODAL
      ======================================================== */}

      <AnimatePresence>
        {showVerification && (
          <motion.div
            className="verification-overlay"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
          >
            <motion.div
              className="verification-modal"
              initial={{
                opacity: 0,
                y: 25,
                scale: 0.97,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 25,
                scale: 0.97,
              }}
            >

              <button
                className="verification-close"
                onClick={() =>
                  setShowVerification(false)
                }
                aria-label="Close"
              >
                ×
              </button>

              <div className="verification-brand">
                <img
                  src={logo}
                  alt="ZUCA"
                />
              </div>

              <div className="verification-badge">
                ✉
              </div>

              <span className="verification-eyebrow">
                EMAIL VERIFICATION
              </span>

              <h2>
                Check your inbox
              </h2>

              <p className="verification-description">
                We sent a 6-digit verification
                code to
              </p>

              <strong className="verification-email">
                {verificationEmail}
              </strong>

              <p className="verification-help">
                Enter the code below to
                activate your account. If you
                don't see the email, check your
                <strong> spam folder</strong>.
              </p>

              {/* CODE */}
              <div
                className="verification-code"
                onPaste={handlePasteCode}
              >
                {verificationCode.map(
                  (digit, index) => (
                    <input
                      key={index}
                      id={`verify-code-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength="1"
                      value={digit}
                      onChange={(e) =>
                        handleVerificationCodeChange(
                          e.target,
                          index
                        )
                      }
                      onKeyDown={(e) =>
                        handleVerificationKeyDown(
                          e,
                          index
                        )
                      }
                      autoFocus={
                        index === 0
                      }
                      aria-label={`Verification digit ${
                        index + 1
                      }`}
                    />
                  )
                )}
              </div>

              {/* ERROR */}
              <AnimatePresence>
                {verificationError && (
                  <motion.div
                    className="verification-error"
                    initial={{
                      opacity: 0,
                      y: -5,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                      y: -5,
                    }}
                  >
                    ⚠ {verificationError}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* VERIFY */}
              <button
                className="verify-submit"
                onClick={
                  handleVerifyEmail
                }
                disabled={
                  verificationLoading
                }
              >
                {verificationLoading ? (
                  <>
                    <span className="spinner light" />
                    Verifying...
                  </>
                ) : (
                  "Verify email"
                )}
              </button>

              {/* TIMER */}
              <div className="resend-area">
                {verificationTimer >
                0 ? (
                  <span>
                    Didn't receive it?
                    <strong>
                      {" "}
                      Resend in{" "}
                      {formatTime(
                        verificationTimer
                      )}
                    </strong>
                  </span>
                ) : (
                  <button
                    onClick={
                      handleResendVerification
                    }
                    disabled={
                      verificationLoading
                    }
                  >
                    Resend verification code
                  </button>
                )}
              </div>

              <button
                className="verification-cancel"
                onClick={() =>
                  setShowVerification(false)
                }
              >
                Back to registration
              </button>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WELCOME MODAL */}
      <WelcomeModal
        isOpen={showWelcome}
        onClose={handleWelcomeAccept}
        userName={newUserName}
      />

      {/* ========================================================
          STYLES
      ======================================================== */}

      <style>{`
        * {
          box-sizing: border-box;
        }

        .register-page {
          min-height: 100vh;
          width: 100%;
          position: relative;
          overflow-x: hidden;
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          background: #f4f7fb;
        }

        /* -------------------------------------------------------
           BACKGROUND
        ------------------------------------------------------- */

        .register-background {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
        }

        .register-slide {
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 1.2s ease;
        }

        .register-slide.active {
          opacity: 1;
        }

        .register-slide img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }

        .register-background-overlay {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              90deg,
              rgba(7, 25, 54, 0.55),
              rgba(7, 25, 54, 0.51) 48%,
              rgba(247, 249, 252, 0.92) 100%
            );
        }

        /* -------------------------------------------------------
           MAIN LAYOUT
        ------------------------------------------------------- */

        .register-layout {
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

        /* -------------------------------------------------------
           BRAND PANEL
        ------------------------------------------------------- */

        .register-brand-panel {
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
          box-shadow:
            0 15px 35px rgba(0,0,0,0.2);
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

        /* -------------------------------------------------------
           FORM PANEL
        ------------------------------------------------------- */

        .register-form-panel {
          display: flex;
          justify-content: center;
        }

        .register-form-card {
          width: 100%;
          max-width: 620px;
          background: rgba(255,255,255,0.97);
          border: 1px solid rgba(255,255,255,0.85);
          border-radius: 28px;
          padding: 42px 46px 28px;
          box-shadow:
            0 30px 80px rgba(5,20,45,0.18);
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

        /* -------------------------------------------------------
           FORM
        ------------------------------------------------------- */

        .register-form {
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
          transition:
            border-color 0.18s ease,
            box-shadow 0.18s ease,
            background 0.18s ease;
        }

        .field.focused .input-shell {
          background: white;
          border-color: #2563eb;
          box-shadow:
            0 0 0 3px rgba(37,99,235,0.10);
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

        .password-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
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

        .password-strength {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 7px;
        }

        .strength-track {
          flex: 1;
          display: flex;
          gap: 3px;
        }

        .strength-track span {
          height: 3px;
          flex: 1;
          border-radius: 10px;
          background: #e2e8f0;
        }

        .strength-track span.strength-1 {
          background: #ef4444;
        }

        .strength-track span.strength-2 {
          background: #f59e0b;
        }

        .strength-track span.strength-3 {
          background: #10b981;
        }

        .strength-track span.strength-4 {
          background: #0891b2;
        }

        .password-strength > span {
          font-size: 10px;
          font-weight: 700;
          color: #64748b;
          min-width: 36px;
          text-align: right;
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

        /* -------------------------------------------------------
           REQUIREMENTS
        ------------------------------------------------------- */

        .requirements {
          background: #f5f8fc;
          border: 1px solid #e5eaf1;
          border-radius: 12px;
          padding: 12px 14px;
        }

        .requirements-title {
          color: #475569;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 8px;
        }

        .requirements-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px 12px;
        }

        .requirements-grid span {
          color: #8a97a8;
          font-size: 10.5px;
        }

        .requirements-grid span.complete {
          color: #15803d;
          font-weight: 600;
        }

        /* -------------------------------------------------------
           SUBMIT
        ------------------------------------------------------- */

        .register-submit {
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
          box-shadow:
            0 8px 18px rgba(29,78,216,0.20);
          transition:
            background 0.2s ease,
            box-shadow 0.2s ease;
        }

        .register-submit:hover:not(:disabled) {
          background: #1e40af;
          box-shadow:
            0 11px 22px rgba(29,78,216,0.25);
        }

        .register-submit:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .submit-arrow {
          font-size: 18px;
          line-height: 1;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(29,78,216,0.2);
          border-top-color: #1d4ed8;
          border-radius: 50%;
          animation: registerSpin 0.7s linear infinite;
        }

        .spinner.light {
          border-color: rgba(255,255,255,0.3);
          border-top-color: white;
        }

        /* -------------------------------------------------------
           SIGN IN
        ------------------------------------------------------- */

        .signin-area {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 5px;
          margin-top: 22px;
          color: #7b8798;
          font-size: 12px;
        }

        .signin-area a {
          color: #1d4ed8;
          font-weight: 700;
          text-decoration: none;
        }

        .signin-area a:hover {
          text-decoration: underline;
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

        /* -------------------------------------------------------
           VERIFICATION MODAL
        ------------------------------------------------------- */

        .verification-overlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(15,23,42,0.52);
          backdrop-filter: blur(8px);
        }

        .verification-modal {
          position: relative;
          width: 100%;
          max-width: 440px;
          background: white;
          border-radius: 24px;
          padding: 34px;
          text-align: center;
          box-shadow:
            0 30px 80px rgba(0,0,0,0.25);
        }

        .verification-close {
          position: absolute;
          right: 18px;
          top: 15px;
          border: 0;
          background: transparent;
          color: #94a3b8;
          font-size: 25px;
          line-height: 1;
          cursor: pointer;
        }

        .verification-brand {
          width: 48px;
          height: 48px;
          padding: 7px;
          border-radius: 12px;
          background: #f1f5f9;
          margin: 0 auto 18px;
        }

        .verification-brand img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .verification-badge {
          width: 42px;
          height: 42px;
          margin: 0 auto 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #eff6ff;
          color: #2563eb;
          font-size: 17px;
        }

        .verification-eyebrow {
          color: #2563eb;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.2px;
        }

        .verification-modal h2 {
          margin: 6px 0 8px;
          color: #14213d;
          font-size: 25px;
          letter-spacing: -0.4px;
        }

        .verification-description {
          color: #718096;
          font-size: 12px;
          margin: 0;
        }

        .verification-email {
          display: block;
          color: #1d4ed8;
          font-size: 13px;
          margin-top: 4px;
          overflow-wrap: anywhere;
        }

        .verification-help {
          color: #8a96a7;
          font-size: 11px;
          line-height: 1.6;
          margin: 14px auto 20px;
          max-width: 340px;
        }

        .verification-help strong {
          color: #64748b;
        }

        .verification-code {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 18px;
        }

        .verification-code input {
          width: 47px;
          height: 55px;
          border: 1px solid #d7dfeb;
          background: #f8fafc;
          border-radius: 11px;
          outline: none;
          text-align: center;
          font-size: 22px;
          font-weight: 750;
          color: #14213d;
          transition:
            border-color 0.18s ease,
            box-shadow 0.18s ease;
        }

        .verification-code input:focus {
          background: white;
          border-color: #2563eb;
          box-shadow:
            0 0 0 3px rgba(37,99,235,0.10);
        }

        .verification-error {
          background: #fff1f2;
          color: #be123c;
          border: 1px solid #fecdd3;
          padding: 10px 12px;
          border-radius: 9px;
          font-size: 11px;
          margin-bottom: 14px;
        }

        .verify-submit {
          width: 100%;
          height: 49px;
          border: 0;
          border-radius: 11px;
          background: #1d4ed8;
          color: white;
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
        }

        .verify-submit:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .resend-area {
          min-height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          font-size: 10.5px;
          margin-top: 13px;
        }

        .resend-area strong {
          color: #475569;
        }

        .resend-area button {
          border: 0;
          background: transparent;
          color: #1d4ed8;
          font-family: inherit;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .resend-area button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .verification-cancel {
          border: 0;
          background: transparent;
          color: #94a3b8;
          font-family: inherit;
          font-size: 10.5px;
          cursor: pointer;
          margin-top: 5px;
        }

        .verification-cancel:hover {
          color: #475569;
        }

        /* -------------------------------------------------------
           ANIMATIONS
        ------------------------------------------------------- */

        @keyframes registerSpin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes registerToastIn {
          from {
            opacity: 0;
            transform:
              translateX(-50%)
              translateY(12px);
          }

          to {
            opacity: 1;
            transform:
              translateX(-50%)
              translateY(0);
          }
        }

        @keyframes registerToastOut {
          from {
            opacity: 1;
            transform:
              translateX(-50%)
              translateY(0);
          }

          to {
            opacity: 0;
            transform:
              translateX(-50%)
              translateY(12px);
          }
        }

        /* -------------------------------------------------------
           TABLET
        ------------------------------------------------------- */

        @media (max-width: 1050px) {
          .register-layout {
            grid-template-columns: 0.65fr 1fr;
            padding: 35px;
          }

          .register-brand-panel {
            padding-left: 0;
          }

          .brand-copy h1 {
            font-size: 62px;
          }

          .register-form-card {
            padding: 35px;
          }
        }

        /* -------------------------------------------------------
           MOBILE
        ------------------------------------------------------- */

        @media (max-width: 800px) {
          .register-page {
            background: #f4f7fb;
          }

          .register-background {
            position: absolute;
            height: 245px;
          }

          .register-background-overlay {
            background:
              linear-gradient(
                180deg,
                rgba(7, 25, 54, 0.07),
                rgba(7, 25, 54, 0.32)
              );
          }

          .register-layout {
            display: block;
            padding: 0;
            min-height: 100vh;
          }

          .register-brand-panel {
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

          .register-form-panel {
            position: relative;
            z-index: 5;
            margin-top: 0;
          }

          .register-form-card {
            max-width: none;
            min-height: calc(100vh - 210px);
            border-radius: 25px 25px 0 0;
            padding: 30px 22px 22px;
            box-shadow:
              0 -12px 35px rgba(0,0,0,0.10);
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

          .password-row {
            grid-template-columns: 1fr;
            gap: 17px;
          }

          .requirements-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        /* -------------------------------------------------------
           SMALL PHONES
        ------------------------------------------------------- */

        @media (max-width: 430px) {
          .register-brand-panel {
            height: 205px;
            min-height: 205px;
          }

          .register-background {
            height: 205px;
          }

          .brand-copy h1 {
            font-size: 34px;
          }

          .register-form-card {
            min-height: calc(100vh - 180px);
            padding: 27px 18px 20px;
          }

          .form-header h2 {
            font-size: 23px;
          }

          .verification-modal {
            padding: 28px 18px;
            border-radius: 20px;
          }

          .verification-code {
            gap: 5px;
          }

          .verification-code input {
            width: 43px;
            height: 52px;
          }

          .form-footer {
            font-size: 8.5px;
          }
        }

        /* -------------------------------------------------------
           VERY SMALL SCREENS
        ------------------------------------------------------- */

        @media (max-width: 360px) {
          .verification-code input {
            width: 39px;
            height: 48px;
          }

          .requirements-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}

export default Register;