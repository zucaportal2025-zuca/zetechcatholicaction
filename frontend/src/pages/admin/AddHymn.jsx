import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { 
  FiSave, 
  FiEye, 
  FiEyeOff, 
  FiX,
  FiCopy,
  FiRefreshCw,
  FiLoader,
  FiMusic,
  FiBookOpen,
  FiCamera,
  FiTrash2,
  FiChevronDown,
  FiChevronUp,
  FiMaximize2,
  FiMinimize2,
  FiAlertCircle
} from "react-icons/fi";
import { MdAutoFixHigh, MdTextFields, MdOutlineFormatAlignLeft } from "react-icons/md";
import BASE_URL from "../../api";

export default function AddHymn({ onClose, onSuccess }) {
  const { id } = useParams(); // Get song ID from URL for editing
  const [searchParams] = useSearchParams();
  const pendingId = searchParams.get('pendingId'); // Get pending ID if coming from pending songs
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    reference: "",
    lyrics: ""
  });
  
  const lyricsTextareaRef = useRef(null);
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  // Fetch song data if editing (when ID is present in URL)
  useEffect(() => {
    if (id) {
      fetchSongData();
    }
  }, [id]);

  const fetchSongData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/api/admin/songs/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const song = response.data;
      setFormData({
        title: song.title || "",
        reference: song.reference || "",
        lyrics: song.lyrics || ""
      });
      console.log("📝 Loaded song for editing:", song.title);
      if (pendingId) {
        console.log("📌 Coming from pending song ID:", pendingId);
      }
    } catch (error) {
      console.error("Failed to fetch song:", error);
      setError("Failed to load song data");
      showToast("❌ Failed to load song data", true);
    } finally {
      setLoading(false);
    }
  };

  // Check if form has meaningful content (not just empty/spaces)
  const hasMeaningfulContent = () => {
    const hasTitle = formData.title && formData.title.trim().length > 0;
    const hasLyrics = formData.lyrics && formData.lyrics.trim().length > 10;
    return hasTitle || hasLyrics;
  };

  // Auto-save draft - ONLY for new hymns, not when editing existing ones
  useEffect(() => {
    if (id) return; // Don't auto-save when editing existing hymn
    
    const timer = setTimeout(() => {
      if (hasMeaningfulContent()) {
        const draftToSave = {
          title: formData.title.trim(),
          reference: formData.reference?.trim() || "",
          lyrics: formData.lyrics?.trim() || "",
          savedAt: new Date().toISOString()
        };
        localStorage.setItem('hymn_draft', JSON.stringify(draftToSave));
        console.log("💾 Draft saved");
      } else {
        localStorage.removeItem('hymn_draft');
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [formData, id]);

  // Load draft on mount - ONLY for new hymns
  useEffect(() => {
    if (id) return; // Don't load draft when editing existing hymn
    
    const draft = localStorage.getItem('hymn_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        const hasContent = (parsed.title && parsed.title.length > 0) || (parsed.lyrics && parsed.lyrics.length > 10);
        const isRecent = parsed.savedAt && (new Date() - new Date(parsed.savedAt)) < 24 * 60 * 60 * 1000;
        
        if (hasContent && isRecent && !formData.title) {
          const shouldLoad = window.confirm('You have an unsaved draft from ' + new Date(parsed.savedAt).toLocaleTimeString() + '. Load it?');
          if (shouldLoad) {
            setFormData({
              title: parsed.title || "",
              reference: parsed.reference || "",
              lyrics: parsed.lyrics || ""
            });
            showToast("📝 Draft loaded");
          } else {
            localStorage.removeItem('hymn_draft');
          }
        } else if (!hasContent) {
          localStorage.removeItem('hymn_draft');
        } else if (!isRecent) {
          localStorage.removeItem('hymn_draft');
          console.log("🗑️ Old draft cleared");
        }
      } catch (e) {
        console.error("Error loading draft:", e);
        localStorage.removeItem('hymn_draft');
      }
    }
  }, [id, formData.title]);

  const showToast = (message, isError = false) => {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: ${isError ? '#ef4444' : '#10b981'};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 500;
      z-index: 10000;
      animation: slideIn 0.3s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      white-space: nowrap;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  const clearDraft = () => {
    if (!id) {
      localStorage.removeItem('hymn_draft');
      console.log("🗑️ Draft cleared");
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      showToast("❌ Title is required", true);
      return;
    }

    setSaving(true);
    setError("");
    
    try {
      const songData = {
        title: formData.title.trim(),
        reference: formData.reference?.trim() || "",
        lyrics: formData.lyrics?.trim() || ""
      };
      
      let response;
      
      if (id) {
        // Update existing song
        response = await axios.put(`${BASE_URL}/api/admin/songs/${id}`, songData, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        // If this came from a pending song, delete the pending record
        if (pendingId) {
          await axios.delete(`${BASE_URL}/api/admin/pending-songs/${pendingId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          showToast("✅ Lyrics added and removed from pending songs!");
        } else {
          showToast("✅ Hymn updated successfully!");
        }
      } else {
        // Create new song
        response = await axios.post(`${BASE_URL}/api/admin/songs`, songData, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        showToast("✅ Hymn added successfully!");
      }
      
      clearDraft(); // Clear draft on successful save
      
      if (onSuccess) {
        onSuccess(response.data);
      }
      
      // Ask if user wants to add another (only for new hymns, not edits)
      if (!id && window.confirm("Hymn added successfully! Add another hymn?")) {
        setFormData({ title: "", reference: "", lyrics: "" });
        setError("");
      } else {
        handleClose();
      }
    } catch (err) {
      console.error("Save error:", err);
      
      if (err.response?.data?.message) {
        setError(err.response.data.message);
        showToast(`❌ ${err.response.data.message}`, true);
      } else if (err.response?.status === 401) {
        setError("Session expired. Please login again.");
        showToast("❌ Session expired. Please login again.", true);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setTimeout(() => navigate("/login"), 1500);
      } else {
        setError("Failed to save hymn. Please try again.");
        showToast("❌ Failed to save hymn. Please try again.", true);
      }
    } finally {
      setSaving(false);
    }
  };

  const autoFormatLyrics = () => {
    if (!formData.lyrics) return;
    
    let formatted = formData.lyrics
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .split('\n')
      .map(line => line.trim())
      .join('\n');
    
    const allLines = formatted.split('\n').filter(line => line.trim().length > 0);
    const lineFrequency = new Map();
    
    allLines.forEach(line => {
      const normalizedLine = line.toLowerCase().replace(/[^\w\s]/g, '').trim();
      if (normalizedLine.length > 5) {
        lineFrequency.set(normalizedLine, (lineFrequency.get(normalizedLine) || 0) + 1);
      }
    });
    
    const repeatedLines = new Set();
    for (const [normalized, count] of lineFrequency) {
      if (count >= 3) repeatedLines.add(normalized);
    }
    
    if (repeatedLines.size > 0) {
      const lines = formatted.split('\n');
      const boldedLines = lines.map(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.length === 0) return line;
        const normalizedLine = trimmedLine.toLowerCase().replace(/[^\w\s]/g, '').trim();
        if (repeatedLines.has(normalizedLine) && !line.startsWith('**')) {
          return `**${line}**`;
        }
        return line;
      });
      formatted = boldedLines.join('\n');
      showToast(`✨ Found ${repeatedLines.size} repeated lines and bolded them!`);
    } else {
      showToast("✨ Spacing fixed. No repeated lines found.");
    }
    
    setFormData({ ...formData, lyrics: formatted });
  };

  const cleanFormatting = () => {
    if (formData.lyrics) {
      const cleaned = formData.lyrics
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[^\S\n]+/g, ' ')
        .trim();
      setFormData({ ...formData, lyrics: cleaned });
      showToast("✨ Formatting cleaned");
    }
  };

  const insertSample = () => {
    const sample = `Amazing grace! How sweet the sound
That saved a wretch like me!
I once was lost, but now am found;
Was blind, but now I see.

'Twas grace that taught my heart to fear,
And grace my fears relieved;
How precious did that grace appear
The hour I first believed!

Through many dangers, toils and snares,
I have already come;
'Tis grace hath brought me safe thus far,
And grace will lead me home.`;
    setFormData({ ...formData, lyrics: sample });
    showToast("📝 Sample lyrics inserted");
  };

  const capitalizeTitle = () => {
    setFormData({
      ...formData,
      title: formData.title.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ')
    });
    showToast("📝 Title capitalized");
  };

  const openOCR = () => {
    navigate("/admin/ocr-scanner");
  };

  const handleClose = () => {
    if (!id && hasMeaningfulContent()) {
      if (window.confirm("You have unsaved changes. Save draft before leaving?")) {
        // Draft already auto-saved, just close
        handleCloseWithoutWarning();
      } else {
        clearDraft();
        handleCloseWithoutWarning();
      }
    } else {
      handleCloseWithoutWarning();
    }
  };

  const handleCloseWithoutWarning = () => {
    if (onClose) {
      onClose();
    } else {
      navigate("/admin/hymns");
    }
  };

  const getStats = () => {
    const lyrics = formData.lyrics;
    if (!lyrics) return { verses: 0, lines: 0, words: 0, chars: 0 };
    const verses = lyrics.split('\n\n').filter(v => v.trim()).length;
    const lines = lyrics.split('\n').length;
    const words = lyrics.split(/\s+/).filter(w => w.length > 0).length;
    const chars = lyrics.length;
    return { verses, lines, words, chars };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div style={styles.fullScreenOverlay}>
        <div style={styles.fullScreenContainer}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <div style={{ textAlign: 'center' }}>
              <FiLoader size={48} style={styles.spinning} />
              <p style={{ marginTop: '16px', color: '#6b7280' }}>Loading hymn data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.fullScreenOverlay}>
      <div style={styles.fullScreenContainer}>
        {/* Header with X button */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <FiMusic size={24} color="#4f46e5" />
            <h1 style={styles.title}>{id ? "Edit Hymn" : "Add New Hymn"}</h1>
            {pendingId && (
              <span style={styles.pendingBadge}>From Pending Songs</span>
            )}
          </div>
          <div style={styles.headerRight}>
            <button onClick={() => setIsFullScreen(!isFullScreen)} style={styles.iconButton} title="Full Screen">
              {isFullScreen ? <FiMinimize2 size={20} /> : <FiMaximize2 size={20} />}
            </button>
            <button onClick={handleClose} style={styles.closeButton} title="Close">
              <FiX size={24} />
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div style={styles.errorBanner}>
            <FiAlertCircle size={20} />
            <span>{error}</span>
            <button onClick={() => setError("")} style={styles.errorClose}>×</button>
          </div>
        )}

        {/* Main Content Area - Scrollable */}
        <div style={styles.mainContent}>
          {/* Help Section - Collapsible */}
          <button onClick={() => setShowHelp(!showHelp)} style={styles.collapsibleHeader}>
            <span>📖 Quick Tips & Help</span>
            {showHelp ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
          </button>
          {showHelp && (
            <div style={styles.helpPanel}>
              <ul style={styles.helpList}>
                <li>📝 <strong>Title</strong> - Hymn name (required)</li>
                <li>🔖 <strong>Reference</strong> - Hymn number or scripture reference</li>
                <li>✨ <strong>Auto Format</strong> - Detects repeated lines and bolds them (great for chorus)</li>
                <li>🧹 <strong>Clean Format</strong> - Fixes spacing and formatting issues</li>
                <li>📸 <strong>Scan Lyrics</strong> - Use camera to scan lyrics from hymn book</li>
                <li>💾 <strong>Auto-save</strong> - Drafts are saved automatically every 2 seconds (new hymns only)</li>
              </ul>
            </div>
          )}

          {/* Form Fields */}
          <div style={styles.formSection}>
            {/* Title Input */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                <FiMusic size={16} /> Hymn Title <span style={styles.required}>*</span>
              </label>
              <div style={styles.titleInputWrapper}>
                <input
                  type="text"
                  placeholder="e.g., Amazing Grace, How Great Thou Art..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={styles.titleInput}
                  autoFocus
                />
                <button onClick={capitalizeTitle} style={styles.capitalizeBtn} title="Capitalize Title">
                  <MdTextFields size={16} />
                </button>
              </div>
            </div>

            {/* Reference Input */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                <FiBookOpen size={16} /> Reference (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g., Hymn 245, Psalm 23, Revelation 21:4..."
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                style={styles.referenceInput}
              />
            </div>

            {/* Action Buttons */}
            <div style={styles.actionButtons}>
              <button onClick={autoFormatLyrics} style={styles.actionBtn}>
                <MdAutoFixHigh size={16} /> Auto Format
              </button>
              <button onClick={cleanFormatting} style={styles.actionBtn}>
                <MdOutlineFormatAlignLeft size={16} /> Clean
              </button>
              <button onClick={insertSample} style={styles.actionBtn}>
                <FiRefreshCw size={16} /> Sample
              </button>
              <button onClick={openOCR} style={styles.actionBtnOCR}>
                <FiCamera size={16} /> Scan Lyrics
              </button>
              <button onClick={() => setFormData({ ...formData, lyrics: "" })} style={styles.actionBtnDanger}>
                <FiTrash2 size={16} /> Clear
              </button>
            </div>

            {/* Preview/Edit Toggle */}
            <div style={styles.previewToggleWrapper}>
              <button 
                onClick={() => setPreviewMode(!previewMode)} 
                style={previewMode ? styles.previewToggleActive : styles.previewToggleInactive}
              >
                {previewMode ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                {previewMode ? " Edit Mode" : " Preview Mode"}
              </button>
            </div>

            {/* Lyrics Editor/Preview */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                <FiCopy size={16} /> Lyrics
              </label>

              {previewMode ? (
                <div style={styles.previewArea}>
                  {formData.lyrics ? (
                    <div style={styles.lyricsPreview}>
                      {formData.lyrics.split('\n\n').map((verse, idx) => (
                        <div key={idx} style={styles.verseBlock}>
                          {verse.split('\n').map((line, lineIdx) => (
                            <p key={lineIdx} style={styles.lyricsLine}>
                              {line.startsWith('**') && line.endsWith('**') ? (
                                <strong>{line.slice(2, -2)}</strong>
                              ) : line.startsWith('*') && line.endsWith('*') ? (
                                <em>{line.slice(1, -1)}</em>
                              ) : (
                                line
                              )}
                            </p>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={styles.emptyPreview}>
                      <FiCopy size={48} />
                      <p>No lyrics yet. Switch to Edit Mode to add lyrics.</p>
                    </div>
                  )}
                </div>
              ) : (
                <textarea
                  ref={lyricsTextareaRef}
                  placeholder="Enter hymn lyrics here...
                  
Write each line on a new line
Leave blank lines between verses
Use **bold** for chorus lines (or click Auto Format to detect repeats)"
                  value={formData.lyrics}
                  onChange={(e) => setFormData({ ...formData, lyrics: e.target.value })}
                  style={styles.lyricsTextarea}
                />
              )}
            </div>

            {/* Stats Section - Collapsible */}
            <button onClick={() => setShowStats(!showStats)} style={styles.collapsibleHeader}>
              <span>📊 Statistics & Info</span>
              {showStats ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
            </button>
            
            {showStats && (
              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <span style={styles.statValue}>{stats.verses}</span>
                  <span style={styles.statLabel}>Verses</span>
                </div>
                <div style={styles.statCard}>
                  <span style={styles.statValue}>{stats.lines}</span>
                  <span style={styles.statLabel}>Lines</span>
                </div>
                <div style={styles.statCard}>
                  <span style={styles.statValue}>{stats.words}</span>
                  <span style={styles.statLabel}>Words</span>
                </div>
                <div style={styles.statCard}>
                  <span style={styles.statValue}>{stats.chars}</span>
                  <span style={styles.statLabel}>Characters</span>
                </div>
                <div style={styles.statCard}>
                  <span style={styles.statValue}>{Math.ceil(stats.words / 200)}</span>
                  <span style={styles.statLabel}>Min read</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer with Action Buttons - Sticky */}
        <div style={styles.footer}>
          <button onClick={handleClose} style={styles.cancelButton}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving || !formData.title.trim()} style={styles.submitButton}>
            {saving ? (
              <><FiLoader style={styles.spinning} size={20} /> Saving...</>
            ) : (
              <><FiSave size={20} /> {id ? "Update Hymn" : "Save Hymn"}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  fullScreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    zIndex: 999999,
    overflow: 'auto'
  },
  fullScreenContainer: {
    width: '100%',
    minHeight: '100vh',
    backgroundColor: 'white',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: 'white',
    borderBottom: '1px solid #e5e7eb',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backgroundColor: 'white'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: 0
  },
  pendingBadge: {
    padding: '4px 12px',
    backgroundColor: '#fef3c7',
    color: '#d97706',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500'
  },
  iconButton: {
    background: '#f3f4f6',
    border: 'none',
    borderRadius: '8px',
    padding: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  },
  closeButton: {
    background: '#fee2e2',
    border: 'none',
    borderRadius: '8px',
    padding: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#dc2626',
    transition: 'all 0.2s'
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 24px',
    backgroundColor: '#fee2e2',
    borderBottom: '1px solid #fecaca',
    color: '#dc2626',
    fontSize: '14px'
  },
  errorClose: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#dc2626'
  },
  mainContent: {
    flex: 1,
    padding: '24px',
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto'
  },
  collapsibleHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    width: '100%',
    textAlign: 'left',
    marginBottom: '12px'
  },
  helpPanel: {
    padding: '16px',
    backgroundColor: '#fef3c7',
    border: '1px solid #fde68a',
    borderRadius: '8px',
    marginBottom: '24px'
  },
  helpList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '13px',
    color: '#92400e',
    lineHeight: '1.8'
  },
  formSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151'
  },
  required: {
    color: '#ef4444'
  },
  titleInputWrapper: {
    display: 'flex',
    gap: '8px'
  },
  titleInput: {
    flex: 1,
    padding: '12px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none',
    transition: 'all 0.2s'
  },
  capitalizeBtn: {
    padding: '8px 12px',
    background: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  },
  referenceInput: {
    width: '100%',
    padding: '12px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none'
  },
  actionButtons: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151'
  },
  actionBtnOCR: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    background: '#e0e7ff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    color: '#4f46e5'
  },
  actionBtnDanger: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    background: '#fee2e2',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    color: '#dc2626'
  },
  previewToggleWrapper: {
    display: 'flex',
    justifyContent: 'flex-end'
  },
  previewToggleActive: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    background: '#4f46e5',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: 'white'
  },
  previewToggleInactive: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151'
  },
  lyricsTextarea: {
    width: '100%',
    minHeight: '400px',
    padding: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    lineHeight: '1.6',
    fontFamily: 'monospace',
    resize: 'vertical',
    outline: 'none'
  },
  previewArea: {
    minHeight: '400px',
    maxHeight: '500px',
    overflow: 'auto',
    padding: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#fafafa'
  },
  lyricsPreview: {
    fontSize: '14px',
    lineHeight: '1.8'
  },
  verseBlock: {
    marginBottom: '24px'
  },
  lyricsLine: {
    margin: '4px 0',
    whiteSpace: 'pre-wrap'
  },
  emptyPreview: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    color: '#9ca3af'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '12px',
    marginTop: '12px'
  },
  statCard: {
    backgroundColor: '#f9fafb',
    padding: '16px',
    borderRadius: '8px',
    textAlign: 'center',
    border: '1px solid #e5e7eb'
  },
  statValue: {
    display: 'block',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#4f46e5'
  },
  statLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px'
  },
  footer: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    padding: '16px 24px',
    backgroundColor: 'white',
    borderTop: '1px solid #e5e7eb',
    position: 'sticky',
    bottom: 0,
    zIndex: 100,
    backgroundColor: 'white'
  },
  cancelButton: {
    padding: '10px 24px',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151'
  },
  submitButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 32px',
    background: '#10b981',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: 'white'
  },
  spinning: {
    animation: 'spin 1s linear infinite'
  }
};

// Add keyframes
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes slideIn {
    from {
      transform: translateX(-50%) translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(styleSheet);