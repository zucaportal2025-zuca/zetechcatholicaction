import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaFingerprint, FaLock, FaEnvelope } from "react-icons/fa";

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

function base64urlToArrayBuffer(base64url) {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) base64 += "=";

  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
}

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

function Login() {
  const navigate = useNavigate();
  const slideIntervalRef = useRef(null);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [emailError, setEmailError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginMode, setLoginMode] = useState("normal");
  const [detectedRole, setDetectedRole] = useState(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [isCheckingAutoLogin, setIsCheckingAutoLogin] = useState(true);

  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isBiometricLogin, setIsBiometricLogin] = useState(false);
  const [biometricError, setBiometricError] = useState("");
  const [showFingerprintPrompt, setShowFingerprintPrompt] = useState(false);

  useEffect(() => {
    slideIntervalRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => {
      if (slideIntervalRef.current) clearInterval(slideIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    const checkBiometricSupport = async () => {
      try {
        if (!window.PublicKeyCredential) return;

        const available =
          await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();

        setIsBiometricSupported(available);
      } catch (error) {
        console.error("Biometric support check failed:", error);
        setIsBiometricSupported(false);
      }
    };

    checkBiometricSupport();
  }, []);

  useEffect(() => {
    const autoLogin = async () => {
      const token = localStorage.getItem("token");
      const userJson = localStorage.getItem("user");
      const rememberMeFlag =
        localStorage.getItem("rememberMe") === "true";
      const rememberExpiry = localStorage.getItem("rememberExpiry");

      let isExpired = false;

      if (rememberExpiry) {
        isExpired = new Date() > new Date(rememberExpiry);

        if (isExpired) {
          clearSessionStorage();
        }
      }

      if (!isExpired && rememberMeFlag && token && userJson) {
        try {
          const userData = JSON.parse(userJson);

          const verifyRes = await fetch(`${BASE_URL}/api/verify-token`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });

          if (verifyRes.ok) {
            showAutoLoginToast(
              userData.fullName?.split(" ")[0] || "User"
            );

            setTimeout(() => {
              navigateForRole(userData);
            }, 500);

            return;
          }

          clearSessionStorage();
        } catch (error) {
          console.error("Auto-login failed:", error);
          clearSessionStorage();
        }
      }

      setIsCheckingAutoLogin(false);

      const savedEmail = localStorage.getItem("rememberedEmail");

      if (savedEmail && !isExpired) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    };

    autoLogin();
  }, [navigate]);

  const clearSessionStorage = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("rememberMe");
    localStorage.removeItem("rememberExpiry");
    localStorage.removeItem("rememberedEmail");
  };

  const navigateForRole = (userData) => {
    const roleRedirects = {
      admin: "/dashboard",
      jumuia_leader: `/jumuia/${userData.jumuiaCode}`,
      treasurer: "/treasurer",
      secretary: "/secretary",
      choir_moderator: "/choir",
      media_moderator: "/media-moderator",
    };

    navigate(roleRedirects[userData.role] || "/dashboard");
  };

  useEffect(() => {
    if (!password) {
      setLoginMode("normal");
      setDetectedRole(null);
      return;
    }

    const roleKeywords = [
      "stmichael",
      "stbenedict",
      "stperegrine",
      "christtheking",
      "stgregory",
      "stpacificus",
    ];

    if (roleKeywords.some((keyword) => password.startsWith(keyword))) {
      setLoginMode("role");
      setDetectedRole("jumuia_leader");
    } else if (password.startsWith("treasurer")) {
      setLoginMode("role");
      setDetectedRole("treasurer");
    } else if (password.startsWith("secretary")) {
      setLoginMode("role");
      setDetectedRole("secretary");
    } else if (password.startsWith("choir")) {
      setLoginMode("role");
      setDetectedRole("choir_moderator");
    } else if (password.startsWith("media")) {
      setLoginMode("role");
      setDetectedRole("media_moderator");
    } else {
      setLoginMode("normal");
      setDetectedRole(null);
    }
  }, [password]);

  useEffect(() => {
    if (loginMode === "normal" && email && !email.includes("@")) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  }, [email, loginMode]);

  const roleInfo = {
    normal: {
      eyebrow: "MEMBER LOGIN",
      title: "Welcome back",
      subtitle: "Sign in to your ZUCA Portal account.",
      button: "Sign in",
      loading: "Signing in...",
      color: "#1d4ed8",
    },
    jumuia_leader: {
      eyebrow: "JUMUIA LEADER",
      title: "Welcome, leader",
      subtitle: "Access your Jumuia management area.",
      button: "Continue as Jumuia Leader",
      loading: "Signing in...",
      color: "#7c3aed",
    },
    treasurer: {
      eyebrow: "TREASURER ACCESS",
      title: "Welcome, Treasurer",
      subtitle: "Access your financial management area.",
      button: "Continue as Treasurer",
      loading: "Signing in...",
      color: "#d97706",
    },
    secretary: {
      eyebrow: "SECRETARY ACCESS",
      title: "Welcome, Secretary",
      subtitle: "Access your ZUCA administration area.",
      button: "Continue as Secretary",
      loading: "Signing in...",
      color: "#059669",
    },
    choir_moderator: {
      eyebrow: "CHOIR MODERATOR",
      title: "Welcome, Moderator",
      subtitle: "Access your choir management area.",
      button: "Continue as Choir Moderator",
      loading: "Signing in...",
      color: "#db2777",
    },
    media_moderator: {
      eyebrow: "MEDIA MODERATOR",
      title: "Welcome, Moderator",
      subtitle: "Access your media management area.",
      button: "Continue as Media Moderator",
      loading: "Signing in...",
      color: "#0891b2",
    },
  };

  const currentRole = roleInfo[detectedRole || "normal"];

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoading(true);
    setLoginError("");
    setBiometricError("");

    try {
      const endpoint =
        loginMode === "normal" ? "/api/login" : "/api/role-login";

      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        if (
          data.user.role === "jumuia_leader" &&
          !data.user.jumuiaCode
        ) {
          const roleKeywords = [
            "stmichael",
            "stbenedict",
            "stperegrine",
            "christtheking",
            "stgregory",
            "stpacificus",
          ];

          const jumuiaCode = roleKeywords.find((keyword) =>
            password.startsWith(keyword)
          );

          if (jumuiaCode) {
            data.user.jumuiaCode = jumuiaCode;
          } else if (data.user.jumuia) {
            data.user.jumuiaCode = data.user.jumuia
              .toLowerCase()
              .replace(/\./g, "")
              .replace(/\s+/g, "");
          }

          data.user.specialRole = "jumuia_leader";
        }

        handleSuccessfulLogin(data.user, data.token);
      } else {
        setLoginError(data.error || "Invalid email or password");
      }
    } catch (err) {
      console.error("Login Error:", err);
      setLoginError("Unable to connect. Please check your network.");
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessfulLogin = (userData, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));

    if (rememberMe) {
      localStorage.setItem("rememberMe", "true");
      localStorage.setItem("rememberedEmail", email);

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      localStorage.setItem("rememberExpiry", expiryDate.toISOString());
      showToast("Auto-sign in enabled", "success");
    } else {
      localStorage.setItem("rememberMe", "false");
      localStorage.removeItem("rememberedEmail");
      localStorage.removeItem("rememberExpiry");
    }

    showWelcomeToast(
      userData.fullName?.split(" ")[0] || "Member",
      userData.role
    );

    setTimeout(async () => {
      try {
        const statusRes = await fetch(`${BASE_URL}/api/biometric/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const statusData = await statusRes.json();

        if (!statusData.registered) {
          setShowFingerprintPrompt(true);
        }
      } catch (err) {
        console.log("Could not check biometric status");
      }
    }, 1500);

    setTimeout(() => {
      navigateForRole(userData);
    }, 500);
  };

  const handleFingerprintLogin = async () => {
    if (!isBiometricSupported) {
      setBiometricError("Fingerprint login is not supported on this device.");
      return;
    }

    setIsBiometricLogin(true);
    setBiometricError("");

    try {
      const challengeRes = await fetch(
        `${BASE_URL}/api/biometric/login-challenge`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email || undefined }),
        }
      );

      const challengeData = await challengeRes.json();

      if (!challengeData.success) {
        throw new Error(
          challengeData.error || "Failed to get authentication challenge"
        );
      }

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(
            base64urlToArrayBuffer(challengeData.challenge)
          ),
          timeout: 60000,
          rpId: challengeData.rpId || window.location.hostname,
          userVerification: "required",
          allowCredentials: challengeData.allowCredentials?.map((cred) => ({
            id: new Uint8Array(base64urlToArrayBuffer(cred.id)),
            type: "public-key",
          })),
        },
      });

      if (!credential) {
        throw new Error("Fingerprint authentication cancelled");
      }

      const loginRes = await fetch(`${BASE_URL}/api/biometric/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialId: credential.id }),
      });

      const loginData = await loginRes.json();

      if (loginRes.ok && loginData.token) {
        handleSuccessfulLogin(loginData.user, loginData.token);
      } else {
        setBiometricError(
          loginData.error || "Fingerprint authentication failed"
        );
      }
    } catch (error) {
      console.error("Fingerprint login error:", error);

      if (error.name === "NotAllowedError") {
        setBiometricError("Fingerprint authentication was cancelled.");
      } else if (error.name === "NotFoundError") {
        setBiometricError(
          "No registered fingerprint found. Please sign in with your password first."
        );
      } else {
        setBiometricError(error.message || "Fingerprint login failed.");
      }
    } finally {
      setIsBiometricLogin(false);
    }
  };

  const showToast = (message, type = "success") => {
    const toast = document.createElement("div");
    toast.className = `login-toast ${type}`;

    toast.innerHTML = `
      <span class="toast-icon">${type === "success" ? "✓" : "i"}</span>
      <span>${message}</span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("closing");
      setTimeout(() => toast.remove(), 250);
    }, 3000);
  };

  const showWelcomeToast = (userName, role) => {
    const roleNames = {
      admin: "Administrator",
      jumuia_leader: "Jumuia Leader",
      treasurer: "Treasurer",
      secretary: "Secretary",
      choir_moderator: "Choir Moderator",
      media_moderator: "Media Moderator",
    };

    const toast = document.createElement("div");
    toast.className = "login-toast welcome-toast";

    toast.innerHTML = `
      <div class="toast-welcome-icon">✓</div>
      <div>
        <strong>Welcome, ${userName}!</strong>
        <span>${roleNames[role] || "ZUCA Member"} · Successfully signed in</span>
      </div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("closing");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  const showAutoLoginToast = (userName) => {
    const toast = document.createElement("div");
    toast.className = "login-toast welcome-toast";

    toast.innerHTML = `
      <div class="toast-welcome-icon">✓</div>
      <div>
        <strong>Welcome back, ${userName}!</strong>
        <span>Auto sign-in successful</span>
      </div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("closing");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  const FingerprintPromptModal = () => (
    <AnimatePresence>
      {showFingerprintPrompt && (
        <motion.div
          className="fingerprint-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="fingerprint-modal"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
          >
            <button
              className="modal-close"
              onClick={() => setShowFingerprintPrompt(false)}
              aria-label="Close"
            >
              ×
            </button>

            <div className="fingerprint-modal-icon">
              <FaFingerprint />
            </div>

            <span className="modal-eyebrow">ACCOUNT SECURITY</span>

            <h2>Secure your account</h2>

            <p>
              Register your fingerprint for faster and more secure login
              next time.
            </p>

            <div className="modal-benefits">
              <span>One-tap login</span>
              <span>More secure</span>
              <span>Works on supported devices</span>
            </div>

            <button
              className="modal-primary"
              onClick={() => {
                setShowFingerprintPrompt(false);
                navigate("/profile");
                setTimeout(
                  () =>
                    showToast(
                      "Open Fingerprint Login in Profile Settings.",
                      "info"
                    ),
                  500
                );
              }}
            >
              Register fingerprint
            </button>

            <button
              className="modal-secondary"
              onClick={() => {
                setShowFingerprintPrompt(false);
                showToast("You can register later in Profile Settings", "info");
              }}
            >
              Maybe later
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (isCheckingAutoLogin) {
    return (
      <div className="login-loading">
        <div className="loading-logo">
          <img src={logo} alt="ZUCA Portal" />
        </div>
        <div className="loading-spinner" />
        <p>Checking your saved session...</p>
      </div>
    );
  }

  return (
    <>
      <div className="login-page">
        <div className="login-background">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`login-slide ${index === currentSlide ? "active" : ""}`}
            >
              <img src={slide.image} alt="" loading="lazy" />
            </div>
          ))}
          <div className="login-background-overlay" />
        </div>

        <div className="login-layout">
          <motion.section
            className="login-brand-panel"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="brand-panel-content">
              <div className="brand-logo-wrap">
                <img src={logo} alt="ZUCA Portal" />
              </div>

              <div className="brand-copy">
                <span className="brand-label">ZETECH UNIVERSITY</span>

                <h1>
                  ZUCA
                  <br />
                  <span>PORTAL</span>
                </h1>

                <p>
                  Your digital home for Zetech University Catholic Action.
                </p>
              </div>

              <div className="brand-divider" />

              <div className="brand-message">
                <span className="brand-cross">✝</span>

                <div>
                  <strong>Welcome back to our catholic action club </strong>
                  <p>
                    Sign in to stay connected, participate and access the
                    ZUCA Portal.
                  </p>
                </div>
              </div>
            </div>

            <div className="brand-footer">
              <span>ZUCA Portal</span>
              <span className="brand-dot">•</span>
              <span>Official Member Platform</span>
            </div>
          </motion.section>

          <motion.section
            className="login-form-panel"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="login-form-card">
              <div className="mobile-logo">
                <img src={logo} alt="ZUCA" />
              </div>

              <div className="form-header">
                <span
                  className="form-eyebrow"
                  style={{ color: currentRole.color }}
                >
                  {currentRole.eyebrow}
                </span>

                <h2>{currentRole.title}</h2>

                <p>{currentRole.subtitle}</p>
              </div>

              {detectedRole && (
                <motion.div
                  className="role-detected"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    borderColor: `${currentRole.color}33`,
                    background: `${currentRole.color}0d`,
                    color: currentRole.color,
                  }}
                >
                  Special access detected
                </motion.div>
              )}

              <form onSubmit={handleLogin} className="login-form">
                <div className={`field ${focusedField === "email" ? "focused" : ""}`}>
                  <label htmlFor="login-email">Email address</label>

                  <div
                    className={`input-shell ${emailError ? "input-error" : ""}`}
                  >
                    <span className="field-icon">
                      <FaEnvelope />
                    </span>

                    <input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedField("email")}
                      onBlur={() => setFocusedField(null)}
                      autoComplete="email"
                      required
                    />
                  </div>

                  <AnimatePresence>
                    {emailError && (
                      <motion.small
                        className="field-error"
                        initial={{ opacity: 0, y: -3 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                      >
                        {emailError}
                      </motion.small>
                    )}
                  </AnimatePresence>
                </div>

                <div
                  className={`field ${
                    focusedField === "password" ? "focused" : ""
                  }`}
                >
                  <label htmlFor="login-password">Password</label>

                  <div className="input-shell">
                    <span className="field-icon">
                      <FaLock />
                    </span>

                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                      autoComplete="current-password"
                      required
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword((value) => !value)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div className="options-row">
                  <label className="remember-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Keep me signed in for 30 days</span>
                  </label>

                  <Link to="/forgot-password" className="forgot-link">
                    Forgot password?
                  </Link>
                </div>

                <AnimatePresence>
                  {loginError && (
                    <motion.div
                      className="login-error"
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                    >
                      <span>!</span>
                      {loginError}
                    </motion.div>
                  )}
                </AnimatePresence>

                {isBiometricSupported && (
                  <motion.div
                    className="biometric-area"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <button
                      type="button"
                      className="fingerprint-button"
                      onClick={handleFingerprintLogin}
                      disabled={isBiometricLogin || loading}
                    >
                      {isBiometricLogin ? (
                        <>
                          <span className="button-spinner" />
                          Verifying fingerprint...
                        </>
                      ) : (
                        <>
                          <FaFingerprint />
                          Login with fingerprint
                        </>
                      )}
                    </button>

                    {biometricError && (
                      <motion.div
                        className="biometric-error"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        {biometricError}
                      </motion.div>
                    )}

                    <div className="or-divider">
                      <span />
                      <small>or continue with password</small>
                      <span />
                    </div>
                  </motion.div>
                )}

                <motion.button
                  type="submit"
                  className="login-submit"
                  disabled={loading}
                  style={{
                    background: currentRole.color,
                    boxShadow: `0 9px 22px ${currentRole.color}2e`,
                  }}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {loading ? (
                    <>
                      <span className="button-spinner light" />
                      <span>{currentRole.loading}</span>
                    </>
                  ) : (
                    <>
                      <span>{currentRole.button}</span>
                      <span className="submit-arrow">→</span>
                    </>
                  )}
                </motion.button>
              </form>

              <div className="register-area">
                <span>New to ZUCA?</span>
                <Link to="/register">Create an account</Link>
              </div>

              <div className="form-footer">
                <span className="footer-cross">✝</span>
                <span>
                  ZUCA Portal · Zetech University Catholic Action
                </span>
              </div>
            </div>
          </motion.section>
        </div>
      </div>

      <FingerprintPromptModal />

      <style>{`
        * {
          box-sizing: border-box;
        }

        @keyframes loginSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes toastIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes toastOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(10px); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        .login-page {
          min-height: 100vh;
          width: 100%;
          position: relative;
          overflow-x: hidden;
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: #f4f7fb;
        }

        .login-background {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
        }

        .login-slide {
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 1.2s ease;
        }

        .login-slide.active {
          opacity: 1;
        }

        .login-slide img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }

        .login-background-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            rgba(7, 25, 54, 0.76),
            rgba(7, 25, 54, 0.34) 48%,
            rgba(247, 249, 252, 0.92) 100%
          );
        }

        .login-layout {
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

        .login-brand-panel {
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
          width: 82px;
          height: 82px;
          background: rgba(255,255,255,.96);
          border-radius: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
          box-shadow: 0 15px 35px rgba(0,0,0,.2);
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
          opacity: .78;
          margin-bottom: 14px;
        }

        .brand-copy h1 {
          font-size: clamp(52px, 6vw, 86px);
          line-height: .87;
          letter-spacing: -4px;
          margin: 0;
          font-weight: 800;
        }

        .brand-copy h1 span {
          font-weight: 400;
          opacity: .86;
        }

        .brand-copy p {
          max-width: 390px;
          font-size: 18px;
          line-height: 1.65;
          color: rgba(255,255,255,.82);
          margin: 30px 0 0;
        }

        .brand-divider {
          width: 65px;
          height: 3px;
          background: white;
          opacity: .7;
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
          border: 1px solid rgba(255,255,255,.35);
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
          color: rgba(255,255,255,.68);
        }

        .brand-footer {
          display: flex;
          align-items: center;
          gap: 10px;
          color: rgba(255,255,255,.65);
          font-size: 12px;
        }

        .brand-dot {
          opacity: .4;
        }

        .login-form-panel {
          display: flex;
          justify-content: center;
        }

        .login-form-card {
          width: 100%;
          max-width: 620px;
          background: rgba(255,255,255,.97);
          border: 1px solid rgba(255,255,255,.85);
          border-radius: 28px;
          padding: 42px 46px 28px;
          box-shadow: 0 30px 80px rgba(5,20,45,.18);
        }

        .mobile-logo {
          display: none;
        }

        .form-header {
          margin-bottom: 28px;
        }

        .form-eyebrow {
          display: block;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.6px;
          margin-bottom: 7px;
        }

        .form-header h2 {
          color: #14213d;
          font-size: 30px;
          line-height: 1.15;
          letter-spacing: -.8px;
          margin: 0 0 8px;
          font-weight: 750;
        }

        .form-header p {
          color: #64748b;
          font-size: 14px;
          margin: 0;
        }

        .role-detected {
          border: 1px solid;
          border-radius: 10px;
          padding: 9px 12px;
          font-size: 11px;
          font-weight: 700;
          margin: -12px 0 20px;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 17px;
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
          transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
        }

        .field.focused .input-shell {
          background: white;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37,99,235,.10);
        }

        .input-shell.input-error {
          border-color: #ef4444;
        }

        .field-icon {
          width: 22px;
          text-align: center;
          opacity: .55;
          font-size: 13px;
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

        .field-error {
          display: block;
          color: #dc2626;
          font-size: 10.5px;
          margin: 6px 2px 0;
        }

        .options-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: -2px;
        }

        .remember-label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #64748b;
          font-size: 11px;
          cursor: pointer;
        }

        .remember-label input {
          width: 15px;
          height: 15px;
          accent-color: #1d4ed8;
          cursor: pointer;
        }

        .forgot-link {
          color: #1d4ed8;
          font-size: 11px;
          font-weight: 700;
          text-decoration: none;
          white-space: nowrap;
        }

        .forgot-link:hover {
          text-decoration: underline;
        }

        .login-error {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff1f2;
          color: #be123c;
          border: 1px solid #fecdd3;
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 11px;
        }

        .login-error span {
          width: 17px;
          height: 17px;
          border-radius: 50%;
          background: #e11d48;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 800;
        }

        .biometric-area {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .fingerprint-button {
          width: 100%;
          height: 48px;
          border: 1px solid #d7dfeb;
          border-radius: 11px;
          background: #f8fafc;
          color: #334155;
          font-family: inherit;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          cursor: pointer;
          transition: .2s ease;
        }

        .fingerprint-button:hover:not(:disabled) {
          border-color: #2563eb;
          background: #eff6ff;
          color: #1d4ed8;
        }

        .fingerprint-button svg {
          font-size: 19px;
        }

        .fingerprint-button:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .biometric-error {
          background: #fff7ed;
          color: #c2410c;
          border: 1px solid #fed7aa;
          border-radius: 9px;
          padding: 9px 11px;
          font-size: 10.5px;
          text-align: center;
        }

        .or-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #94a3b8;
        }

        .or-divider span {
          flex: 1;
          height: 1px;
          background: #e8edf3;
        }

        .or-divider small {
          font-size: 9.5px;
          white-space: nowrap;
        }

        .login-submit {
          height: 52px;
          width: 100%;
          border: 0;
          border-radius: 12px;
          color: white;
          font-family: inherit;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: filter .2s ease, box-shadow .2s ease;
        }

        .login-submit:hover:not(:disabled) {
          filter: brightness(.94);
        }

        .login-submit:disabled {
          opacity: .65;
          cursor: not-allowed;
        }

        .submit-arrow {
          font-size: 18px;
        }

        .button-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.25);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: loginSpin 0.7s linear infinite;
          flex-shrink: 0;
        }

        .button-spinner.light {
          border-color: rgba(255,255,255,0.25);
          border-top-color: #ffffff;
        }

        .login-submit:disabled .button-spinner {
          display: inline-block;
        }

        .register-area {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 5px;
          margin-top: 22px;
          color: #7b8798;
          font-size: 12px;
        }

        .register-area a {
          color: #1d4ed8;
          font-weight: 700;
          text-decoration: none;
        }

        .register-area a:hover {
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

        .fingerprint-overlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(15,23,42,.52);
          backdrop-filter: blur(8px);
        }

        .fingerprint-modal {
          position: relative;
          width: 100%;
          max-width: 440px;
          background: white;
          border-radius: 24px;
          padding: 34px;
          text-align: center;
          box-shadow: 0 30px 80px rgba(0,0,0,.25);
        }

        .modal-close {
          position: absolute;
          right: 18px;
          top: 15px;
          border: 0;
          background: transparent;
          color: #94a3b8;
          font-size: 25px;
          cursor: pointer;
        }

        .fingerprint-modal-icon {
          width: 58px;
          height: 58px;
          margin: 0 auto 17px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          background: #eff6ff;
          color: #2563eb;
          font-size: 27px;
        }

        .modal-eyebrow {
          color: #2563eb;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.2px;
        }

        .fingerprint-modal h2 {
          margin: 7px 0 8px;
          color: #14213d;
          font-size: 25px;
        }

        .fingerprint-modal p {
          color: #718096;
          font-size: 12px;
          line-height: 1.6;
          margin: 0 auto 18px;
          max-width: 340px;
        }

        .modal-benefits {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 20px;
        }

        .modal-benefits span {
          background: #f5f8fc;
          border: 1px solid #e5eaf1;
          border-radius: 999px;
          padding: 6px 9px;
          color: #64748b;
          font-size: 9.5px;
        }

        .modal-primary {
          width: 100%;
          height: 48px;
          border: 0;
          border-radius: 11px;
          background: #1d4ed8;
          color: white;
          font-family: inherit;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .modal-secondary {
          border: 0;
          background: transparent;
          color: #94a3b8;
          font-family: inherit;
          font-size: 10.5px;
          cursor: pointer;
          margin-top: 12px;
        }

        .login-toast {
          position: fixed;
          right: 22px;
          bottom: 22px;
          z-index: 11000;
          display: flex;
          align-items: center;
          gap: 10px;
          background: #15803d;
          color: white;
          padding: 12px 17px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          box-shadow: 0 14px 35px rgba(0,0,0,.22);
          animation: toastIn .25s ease;
        }

        .login-toast.info {
          background: #1d4ed8;
        }

        .login-toast.closing {
          animation: toastOut .25s ease forwards;
        }

        .toast-icon,
        .toast-welcome-icon {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,.18);
          font-weight: 800;
        }

        .welcome-toast {
          top: 22px;
          bottom: auto;
          padding: 13px 18px;
          gap: 11px;
        }

        .welcome-toast strong {
          display: block;
          font-size: 13px;
          margin-bottom: 2px;
        }

        .welcome-toast span:last-child {
          display: block;
          font-size: 10px;
          font-weight: 400;
          opacity: .88;
        }

        .login-loading {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 15px;
          background: #f4f7fb;
          color: #64748b;
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .loading-logo {
          width: 62px;
          height: 62px;
          padding: 10px;
          border-radius: 17px;
          background: white;
          box-shadow: 0 12px 30px rgba(15, 23, 42, .10);
        }

        .loading-logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #dbe4ef;
          border-top-color: #1d4ed8;
          border-radius: 50%;
          animation: loginSpin .7s linear infinite;
        }

        .login-loading p {
          margin: 0;
          font-size: 12px;
          animation: pulse 1.8s ease-in-out infinite;
        }

        @media (max-width: 1050px) {
          .login-layout {
            grid-template-columns: .65fr 1fr;
            padding: 35px;
          }

          .login-brand-panel {
            padding-left: 0;
          }

          .brand-copy h1 {
            font-size: 62px;
          }

          .login-form-card {
            padding: 35px;
          }
        }

        @media (max-width: 800px) {
          .login-background {
            position: absolute;
            height: 245px;
          }

          .login-background-overlay {
            background: linear-gradient(
              180deg,
              rgba(7,25,54,.55),
              rgba(7,25,54,.86)
            );
          }

          .login-layout {
            display: block;
            padding: 0;
            min-height: 100vh;
          }

          .login-brand-panel {
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

          .login-form-panel {
            position: relative;
            z-index: 5;
          }

          .login-form-card {
            max-width: none;
            min-height: calc(100vh - 210px);
            border-radius: 25px 25px 0 0;
            padding: 30px 22px 22px;
            box-shadow: 0 -12px 35px rgba(0,0,0,.10);
          }

          .form-header {
            margin-bottom: 25px;
          }

          .form-header h2 {
            font-size: 25px;
          }

          .form-header p {
            font-size: 13px;
          }
        }

        @media (max-width: 430px) {
          .login-brand-panel,
          .login-background {
            height: 205px;
            min-height: 205px;
          }

          .brand-copy h1 {
            font-size: 34px;
          }

          .login-form-card {
            min-height: calc(100vh - 180px);
            padding: 27px 18px 20px;
          }

          .form-header h2 {
            font-size: 23px;
          }

          .options-row {
            align-items: flex-start;
          }

          .remember-label {
            max-width: 190px;
          }

          .fingerprint-modal {
            padding: 28px 18px;
            border-radius: 20px;
          }
        }
      `}</style>
    </>
  );
}

export default Login;