import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { 
  FiX, FiSave, FiUser, FiMail, FiPhone, FiLock, FiCheckCircle, 
  FiAlertCircle, FiCamera, FiTrash2, FiArrowLeft, FiShield,
  FiEye, FiEyeOff, 
} from "react-icons/fi";
import BASE_URL from "../api";
import ProfileImageCropper from './ProfileImageCropper';
import FingerprintRegistration from './FingerprintRegistration';
import { FaFingerprint } from "react-icons/fa";

const guiltMessages = [
  "🎵 You'll miss the beautiful choir hymns...",
  "🙏 Who will pray with us at mass?",
  "🏠 Your Jumuia family will miss you dearly...",
  "💬 The community chat won't be the same without you...",
  "📸 All those gallery memories together...",
  "🎮 Who will challenge us to Bible Trivia now?",
  "⛪ Sunday mass won't feel complete without you...",
];

function ProfileSettings({ isOpen, onClose, user, onUserUpdate }) {
  const [formData, setFormData] = useState({
    fullName: "", email: "", phone: "",
    currentPassword: "", newPassword: "", confirmPassword: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const fileInputRef = useRef(null);

  // Delete account states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteCountdown, setDeleteCountdown] = useState(5);
  const [deleting, setDeleting] = useState(false);

  // Fingerprint refresh state
  const [fingerprintUpdated, setFingerprintUpdated] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || "",
        email: user.email || "",
        phone: user.phone || "",
        currentPassword: "", newPassword: "", confirmPassword: ""
      });
      const imageUrl = user.profileImage?.startsWith("http")
        ? user.profileImage
        : user.profileImage ? `${BASE_URL}/${user.profileImage}` : null;
      setProfileImage(imageUrl);
    }
  }, [user]);

  useEffect(() => {
    let timer;
    if (deleteStep === 3 && deleteCountdown > 0) {
      timer = setInterval(() => setDeleteCountdown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [deleteStep, deleteCountdown]);

  const handleChange = (e) => { setFormData({ ...formData, [e.target.name]: e.target.value }); setError(""); setSuccess(""); };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    setSelectedImageFile(file);
    setShowCropper(true);
  };

  const handleImageUpload = async (croppedFile) => {
    const fd = new FormData();
    fd.append("profile", croppedFile);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${BASE_URL}/api/users/${user.id}/upload-profile`, fd, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
      });
      const updated = res.data.user;
      const img = updated.profileImage?.startsWith("http") ? updated.profileImage : `${BASE_URL}/${updated.profileImage}`;
      setProfileImage(img);
      localStorage.setItem("user", JSON.stringify(updated));
      onUserUpdate(updated);
      setSuccess("Profile picture updated!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to upload image");
    }
  };

  const handleRemovePhoto = async () => {
    if (!window.confirm("Remove your profile picture?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${BASE_URL}/api/users/${user.id}/delete-profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfileImage(null);
      const updated = { ...user, profileImage: null };
      localStorage.setItem("user", JSON.stringify(updated));
      onUserUpdate(updated);
      setSuccess("Profile picture removed");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) { setError("Failed to remove image"); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName.trim()) { setError("Full name is required"); return; }
    if (!formData.email.trim() || !formData.email.includes("@")) { setError("Valid email required"); return; }
    if (showPasswordFields) {
      if (!formData.currentPassword) { setError("Current password required"); return; }
      if (formData.newPassword.length < 6) { setError("Password must be 6+ characters"); return; }
      if (formData.newPassword !== formData.confirmPassword) { setError("Passwords don't match"); return; }
    }
    setLoading(true); setError(""); setSuccess("");
    try {
      const token = localStorage.getItem("token");
      const data = { fullName: formData.fullName, email: formData.email, phone: formData.phone };
      if (showPasswordFields) {
        data.currentPassword = formData.currentPassword;
        data.newPassword = formData.newPassword;
      }
      const res = await axios.put(`${BASE_URL}/api/users/profile`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      localStorage.setItem("user", JSON.stringify(res.data.user));
      onUserUpdate(res.data.user);
      setSuccess("Profile updated!");
      setFormData({ ...formData, currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPasswordFields(false);
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Update failed");
    } finally { setLoading(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteCountdown > 0) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${BASE_URL}/api/delete-my-account`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { password: deletePassword, reason: deleteReason }
      });
      localStorage.clear();
      window.location.href = "/login?deleted=true";
    } catch (err) {
      setError(err.response?.data?.error || "Delete failed");
      setDeleting(false);
      setDeleteStep(0);
      setShowDeleteConfirm(false);
    }
  };

  const handleFingerprintRegistered = () => {
    setFingerprintUpdated(!fingerprintUpdated);
    setSuccess("✅ Fingerprint settings updated!");
    setTimeout(() => setSuccess(""), 3000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={s.overlay} onClick={onClose}>
          <motion.div initial={{ scale: 0.95, y: 30, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 30, opacity: 0 }} style={s.modal} onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div style={s.header}>
              <button onClick={onClose} style={s.backBtn}><FiArrowLeft size={20} /></button>
              <h2 style={s.title}>Profile Settings</h2>
              <div style={{ width: 40 }} />
            </div>

            {/* Photo Section */}
            <div style={s.photoSection}>
              <div style={s.photoWrapper} onClick={() => setShowFullImage(true)}>
                {profileImage ? <img src={profileImage} alt="" style={s.photo} /> :
                  <div style={s.photoPlaceholder}>{user?.fullName?.charAt(0).toUpperCase()}</div>}
                <div style={s.cameraBadge}><FiCamera size={20} /></div>
              </div>
              <div style={s.photoActions}>
                <label style={s.uploadBtn}><FiCamera size={14} /> Change<input type="file" accept="image/*" hidden ref={fileInputRef} onChange={handleImageSelect} /></label>
                {profileImage && <button onClick={handleRemovePhoto} style={s.removeBtn}><FiTrash2 size={14} /> Remove</button>}
              </div>
              <p style={s.hint}>Click photo to enlarge • JPG, PNG up to 2MB</p>
            </div>

            <form onSubmit={handleSubmit} style={s.form}>
              {/* Basic Info */}
              <div style={s.section}>
                <h3 style={s.sectionTitle}>Basic Information</h3>
                <div style={s.field}><label style={s.label}><FiUser size={14} /> Full Name</label><input type="text" name="fullName" value={formData.fullName} onChange={handleChange} style={s.input} /></div>
                <div style={s.field}><label style={s.label}><FiMail size={14} /> Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} style={s.input} /></div>
                <div style={s.field}><label style={s.label}><FiPhone size={14} /> Phone</label><input type="tel" name="phone" value={formData.phone} onChange={handleChange} style={s.input} /></div>
              </div>

              {/* Security */}
              <div style={s.section}>
                <div style={s.pwHeader}>
                  <h3 style={s.sectionTitle}>Security</h3>
                  <button type="button" onClick={() => setShowPasswordFields(!showPasswordFields)} style={s.pwToggle}>
                    <FiLock size={14} /> {showPasswordFields ? "Cancel" : "Change Password"}
                  </button>
                </div>
                {showPasswordFields && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} style={s.pwSection}>
                    <div style={s.field}><label style={s.label}><FiShield size={14} /> Current Password</label>
                      <div style={s.pwWrapper}>
                        <input type={showCurrentPassword ? "text" : "password"} name="currentPassword" value={formData.currentPassword} onChange={handleChange} style={s.pwInput} placeholder="Current password" />
                        <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} style={s.eyeBtn}>{showCurrentPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}</button>
                      </div>
                    </div>
                    <div style={s.field}><label style={s.label}><FiLock size={14} /> New Password</label>
                      <div style={s.pwWrapper}>
                        <input type={showNewPassword ? "text" : "password"} name="newPassword" value={formData.newPassword} onChange={handleChange} style={s.pwInput} placeholder="Min. 6 characters" />
                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} style={s.eyeBtn}>{showNewPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}</button>
                      </div>
                    </div>
                    <div style={s.field}><label style={s.label}><FiCheckCircle size={14} /> Confirm Password</label>
                      <div style={s.pwWrapper}>
                        <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} style={s.pwInput} placeholder="Confirm password" />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={s.eyeBtn}>{showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}</button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* ==================== FINGERPRINT SECTION ==================== */}
              <div style={s.section}>
                <h3 style={{ ...s.sectionTitle, color: "#7c3aed", borderBottomColor: "#ddd6fe" }}>
                  <FaFingerprint size={16} style={{ marginRight: 8 }} /> Fingerprint Login
                </h3>
                <FingerprintRegistration 
                  onRegistered={handleFingerprintRegistered}
                />
              </div>

              {/* ==================== DANGER ZONE ==================== */}
              <div style={s.section}>
                <h3 style={{ ...s.sectionTitle, color: "#dc2626", borderBottomColor: "#fecaca" }}>⚠️ Danger Zone</h3>
                
                {!showDeleteConfirm ? (
                  <div style={dz.box}>
                    <p style={dz.warning}><strong>Delete your account permanently.</strong> This removes all data — attendance, contributions, messages, memberships. Cannot be undone.</p>
                    <button type="button" onClick={() => setShowDeleteConfirm(true)} style={dz.initialBtn}><FiTrash2 size={14} /> Delete My Account</button>
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={dz.confirmBox}>
                    
                    {deleteStep === 0 && (
                      <>
                        <p style={dz.confirmTitle}>😢 Are you absolutely sure?</p>
                        <div style={dz.lossBox}>
                          <p style={dz.lossTitle}>You will permanently lose:</p>
                          <ul style={dz.lossList}>
                            <li>📊 All attendance records</li><li>💰 Contribution history</li>
                            <li>🏠 Jumuia membership</li><li>💬 All messages</li>
                            <li>👑 Executive positions</li><li>📸 Uploaded media</li>
                          </ul>
                        </div>
                        <p style={dz.guiltText}>"{guiltMessages[Math.floor(Math.random() * guiltMessages.length)]}"</p>
                        <div style={dz.btnRow}>
                          <button type="button" onClick={() => { setShowDeleteConfirm(false); setDeleteStep(0); }} style={dz.cancelBtn}>Never mind, I'll stay 🙏</button>
                          <button type="button" onClick={() => setDeleteStep(1)} style={dz.continueBtn}>I understand, continue</button>
                        </div>
                      </>
                    )}

                    {deleteStep === 1 && (
                      <>
                        <p style={dz.confirmTitle}>📝 Why are you leaving?</p>
                        <select value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} style={dz.select}>
                          <option value="">Select a reason...</option>
                          <option value="graduated">🎓 Graduated / Completed studies</option>
                          <option value="transferred">🏫 Transferred to another school</option>
                          <option value="inactive">😴 No longer active in ZUCA</option>
                          <option value="privacy">🔒 Privacy concerns</option>
                          <option value="other">💬 Other</option>
                        </select>
                        <div style={dz.btnRow}>
                          <button type="button" onClick={() => setDeleteStep(0)} style={dz.cancelBtn}>← Back</button>
                          <button type="button" onClick={() => setDeleteStep(2)} style={dz.continueBtn}>Continue</button>
                        </div>
                      </>
                    )}

                    {deleteStep === 2 && (
                      <>
                        <p style={dz.confirmTitle}>⚠️ Final Confirmation</p>
                        <p style={dz.typeLabel}>Type <span style={dz.typeHighlight}>DELETE MY ACCOUNT</span> to confirm:</p>
                        <input type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="DELETE MY ACCOUNT" style={dz.confirmInput} />
                        <p style={{ ...dz.typeLabel, marginTop: 12 }}>Enter your password:</p>
                        <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder="Your password" style={dz.confirmInput} />
                        <div style={dz.btnRow}>
                          <button type="button" onClick={() => setDeleteStep(1)} style={dz.cancelBtn}>← Back</button>
                          <button type="button" onClick={() => setDeleteStep(3)} disabled={deleteConfirmText !== "DELETE MY ACCOUNT" || !deletePassword} style={{ ...dz.continueBtn, background: "#dc2626", opacity: (deleteConfirmText === "DELETE MY ACCOUNT" && deletePassword) ? 1 : 0.5 }}>Delete My Account</button>
                        </div>
                      </>
                    )}

                    {deleteStep === 3 && (
                      <div style={{ textAlign: "center" }}>
                        <p style={{ fontSize: 16, fontWeight: 700, color: "#dc2626", marginBottom: 8 }}>😭 This is really happening...</p>
                        <p style={{ color: "#64748b", marginBottom: 16 }}>Deleting in {deleteCountdown}s...</p>
                        <button type="button" onClick={handleDeleteAccount} disabled={deleteCountdown > 0 || deleting}
                          style={{ padding: "12px 28px", background: deleteCountdown > 0 ? "#94a3b8" : "#dc2626", color: "white", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: deleteCountdown > 0 ? "not-allowed" : "pointer" }}>
                          {deleteCountdown > 0 ? `Wait ${deleteCountdown}s...` : deleting ? "Deleting..." : "💔 Yes, Delete Forever"}
                        </button>
                        <button type="button" onClick={() => { setShowDeleteConfirm(false); setDeleteStep(0); setDeleteCountdown(5); }}
                          style={{ display: "block", margin: "12px auto 0", background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, textDecoration: "underline" }}>
                          I changed my mind! Keep my account 🙏
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Messages */}
              {error && <div style={s.errorMsg}><FiAlertCircle size={14} /> {error}</div>}
              {success && <div style={s.successMsg}><FiCheckCircle size={14} /> {success}</div>}

              {/* Actions */}
              <div style={s.actions}>
                <button type="button" onClick={onClose} style={s.cancelBtn}>Cancel</button>
                <button type="submit" disabled={loading} style={s.saveBtn}>
                  {loading ? <span style={s.spinner} /> : <FiSave size={16} />} {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>

            {/* Full Image Modal */}
            <AnimatePresence>
              {showFullImage && profileImage && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={s.fullImgOverlay} onClick={() => setShowFullImage(false)}>
                  <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} style={s.fullImgContent} onClick={e => e.stopPropagation()}>
                    <img src={profileImage} alt="" style={s.fullImg} />
                    <button style={s.fullImgClose} onClick={() => setShowFullImage(false)}><FiX size={24} /></button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Cropper */}
            {showCropper && (
              <ProfileImageCropper imageFile={selectedImageFile}
                onCropComplete={(croppedFile) => { setShowCropper(false); handleImageUpload(croppedFile); }}
                onClose={() => { setShowCropper(false); setSelectedImageFile(null); }} />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ====== STYLES ======
const s = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(8px)" },
  modal: { background: "#fff", borderRadius: 28, width: "90%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, background: "#fff", zIndex: 10 },
  backBtn: { background: "#f1f5f9", border: "none", borderRadius: 12, padding: 8, cursor: "pointer", display: "flex" },
  title: { fontSize: 18, fontWeight: 600, color: "#1e293b", margin: 0 },
  photoSection: { display: "flex", flexDirection: "column", alignItems: "center", padding: 24, borderBottom: "1px solid #e2e8f0", background: "#f8fafc" },
  photoWrapper: { position: "relative", width: 120, height: 120, borderRadius: "50%", cursor: "pointer", marginBottom: 16 },
  photo: { width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", border: "4px solid #fff", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" },
  photoPlaceholder: { width: "100%", height: "100%", borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, fontWeight: 700, color: "white", border: "4px solid #fff" },
  cameraBadge: { position: "absolute", bottom: 4, right: 4, background: "#3b82f6", borderRadius: "50%", padding: 8, display: "flex", color: "white", border: "2px solid #fff" },
  photoActions: { display: "flex", gap: 12, marginBottom: 8 },
  uploadBtn: { display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#3b82f6", color: "white", border: "none", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer" },
  removeBtn: { display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fee2e2", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer" },
  hint: { fontSize: 11, color: "#94a3b8", margin: 0 },
  form: { padding: 24 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 16, paddingBottom: 8, borderBottom: "2px solid #e2e8f0" },
  field: { marginBottom: 16 },
  label: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: "#475569", marginBottom: 6 },
  input: { width: "100%", padding: "12px 14px", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 14, outline: "none", background: "#fff" },
  pwHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  pwToggle: { display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "#f1f5f9", border: "none", borderRadius: 20, fontSize: 12, fontWeight: 500, color: "#3b82f6", cursor: "pointer" },
  pwSection: { overflow: "hidden" },
  pwWrapper: { position: "relative" },
  pwInput: { width: "100%", padding: "12px 40px 12px 14px", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 14, outline: "none", background: "#fff" },
  eyeBtn: { position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", padding: 4 },
  errorMsg: { display: "flex", alignItems: "center", gap: 8, padding: 12, background: "#fef2f2", borderRadius: 12, color: "#dc2626", fontSize: 13, marginBottom: 20 },
  successMsg: { display: "flex", alignItems: "center", gap: 8, padding: 12, background: "#ecfdf5", borderRadius: 12, color: "#10b981", fontSize: 13, marginBottom: 20 },
  actions: { display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24, paddingTop: 20, borderTop: "1px solid #e2e8f0" },
  cancelBtn: { padding: "10px 20px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 13, fontWeight: 500, color: "#475569", cursor: "pointer" },
  saveBtn: { display: "flex", alignItems: "center", gap: 8, padding: "10px 24px", background: "#3b82f6", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 600, color: "white", cursor: "pointer" },
  spinner: { width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.6s linear infinite", display: "inline-block" },
  fullImgOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 },
  fullImgContent: { position: "relative", maxWidth: "90vw", maxHeight: "90vh" },
  fullImg: { maxWidth: "100%", maxHeight: "90vh", borderRadius: 16, objectFit: "contain" },
  fullImgClose: { position: "absolute", top: -40, right: -40, background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", color: "white", cursor: "pointer" },
};

// ====== DANGER ZONE STYLES ======
const dz = {
  box: { background: "#fef2f2", padding: 16, borderRadius: 12, border: "1px solid #fecaca" },
  warning: { fontSize: 13, color: "#991b1b", margin: "0 0 12px", lineHeight: 1.5 },
  initialBtn: { display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", background: "#dc2626", color: "white", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  confirmBox: { background: "#fff", padding: 20, borderRadius: 12, border: "2px solid #fecaca", marginTop: 12 },
  confirmTitle: { fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 12 },
  lossBox: { background: "#f0fdf4", padding: 14, borderRadius: 10, marginBottom: 12 },
  lossTitle: { fontWeight: 600, color: "#16a34a", marginBottom: 6, fontSize: 13 },
  lossList: { color: "#475569", fontSize: 13, lineHeight: 1.8, paddingLeft: 16, margin: 0 },
  guiltText: { fontStyle: "italic", color: "#64748b", marginBottom: 14, fontSize: 13 },
  btnRow: { display: "flex", gap: 10, marginTop: 14 },
  cancelBtn: { padding: "8px 16px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, cursor: "pointer", color: "#475569" },
  continueBtn: { padding: "8px 16px", background: "#ef4444", color: "white", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" },
  select: { width: "100%", padding: "10px 14px", border: "2px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", marginBottom: 12, background: "#fff" },
  typeLabel: { fontSize: 13, color: "#475569", marginBottom: 6 },
  typeHighlight: { background: "#fee2e2", padding: "2px 8px", borderRadius: 4, fontFamily: "monospace", fontWeight: 700, color: "#dc2626" },
  confirmInput: { width: "100%", padding: "10px 14px", border: "2px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", marginBottom: 8 },
};

export default ProfileSettings;