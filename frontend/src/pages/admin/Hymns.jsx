// frontend/src/pages/admin/Hymns.jsx
import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useSearchParams } from "react-router-dom";
import { 
  FiEdit2, 
  FiTrash2, 
  FiPlus,
  FiSearch,
  FiX,
  FiSave,
  FiEye,
  FiEyeOff,
  FiCheckCircle,
  FiMaximize2,
  FiMinimize2,
  FiCopy,
  FiRefreshCw,
  FiLoader,
  FiMusic,
  FiBookOpen,
  FiTag,
  FiCalendar,
  FiClock,
  FiAlertCircle,
  FiCheck,
  FiList,
  FiGrid,
  FiFilter,
  FiChevronLeft,
  FiChevronRight,
  FiInfo,
  FiHelpCircle,
  FiCommand,
  FiCheckSquare,
  FiSquare,
  FiGlobe,
  FiCamera
} from "react-icons/fi";
import { 
  GiPrayerBeads, 
  GiMusicalNotes, 
  GiHearts, 
  GiLoveSong,
  GiMicrophone,
  GiVibratingShield
} from "react-icons/gi";
import { MdFormatQuote, MdAutoAwesome, MdTextFields, MdOutlineFormatAlignLeft, MdAutoFixHigh } from "react-icons/md";
import { BiText, BiParagraph, BiFontSize } from "react-icons/bi";
import { useNavigate } from "react-router-dom";
import BASE_URL from "../../api";
import OCRScanner from "./OCRScanner";

export default function AdminHymns() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pendingId = searchParams.get('pendingId');
  const songTitle = searchParams.get('title');
  
  const [hymns, setHymns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalHymns, setTotalHymns] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedHymn, setSelectedHymn] = useState(null);
  const [showOCR, setShowOCR] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    reference: "",
    lyrics: ""
  });
  const [previewMode, setPreviewMode] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [viewMode, setViewMode] = useState('list');
  const [fontSize, setFontSize] = useState(16);
  const [showStats, setShowStats] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [recentlyAdded, setRecentlyAdded] = useState(null);
  const [keyboardShortcuts, setKeyboardShortcuts] = useState(false);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedHymns, setSelectedHymns] = useState([]);
  const [autoSave, setAutoSave] = useState(true);
  const autoSaveTimer = useRef(null);
  const lyricsTextareaRef = useRef(null);
  const [processingBulk, setProcessingBulk] = useState(false);
  const [processingAll, setProcessingAll] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const searchInputRef = useRef(null);
  

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth <= 768) {
        setIsFullScreen(true);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");


  // Auto-open add modal when coming from pending songs
  useEffect(() => {
    if (songTitle) {
      setFormData({
        title: decodeURIComponent(songTitle),
        reference: "",
        lyrics: ""
      });
      setShowAddModal(true);
    }
  }, [songTitle]);

  // Auto-save draft
  useEffect(() => {
    if (autoSave && (formData.title || formData.lyrics)) {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        localStorage.setItem('hymn_draft', JSON.stringify(formData));
      }, 2000);
    }
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [formData, autoSave]);

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('hymn_draft');
    if (draft && !showAddModal && !showEditModal) {
      const shouldLoad = window.confirm('You have an unsaved draft. Load it?');
      if (shouldLoad) {
        const parsed = JSON.parse(draft);
        setFormData(parsed);
        setShowAddModal(true);
      }
    }
  }, []);

  // Fetch hymns
  const fetchHymns = useCallback(async (pageNum = 1, search = '', reset = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      
      const params = new URLSearchParams({ page: pageNum, limit: 20 });
      if (search) params.append('search', search);
      
      const res = await axios.get(`${BASE_URL}/api/admin/songs?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (reset || pageNum === 1) {
        setHymns(res.data.songs || []);
      } else {
        setHymns(prev => [...prev, ...(res.data.songs || [])]);
      }
      
      setHasMore(res.data.hasMore || false);
      if (res.data.total) setTotalHymns(res.data.total);
      
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to load hymns");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [token]);

  // Initial load
  useEffect(() => { fetchHymns(1, '', true); }, []);

  // Handle search when button is clicked or Enter key is pressed
  const handleSearch = () => {
    setPage(1);
    setActiveSearch(searchTerm);
    fetchHymns(1, searchTerm, true);
    showToast(`🔍 Searching for "${searchTerm}"`);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setActiveSearch("");
    fetchHymns(1, "", true);
    showToast("✨ Search cleared");
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Filter hymns (only for client-side filters, not search)
  const filteredHymns = hymns.filter(hymn => {
    if (selectedFilter === 'withRef') return hymn.reference;
    if (selectedFilter === 'noRef') return !hymn.reference;
    if (selectedFilter === 'hasLyrics') return hymn.lyrics && hymn.lyrics.length > 50;
    return true;
  });

  const loadMore = () => {
    if (!loadingMore && hasMore && !activeSearch) {
      setPage(prev => prev + 1);
      fetchHymns(page + 1, activeSearch);
    }
  };

  // ========== IMPROVED: Detect repeated LINES (not just verses) ==========
  const autoFormatLyrics = (lyrics) => {
    if (!lyrics) return lyrics;
    
    // Step 1: Fix spacing - normalize line breaks
    let formatted = lyrics
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .split('\n')
      .map(line => line.trim())
      .join('\n');
    
    // Get all individual lines (non-empty)
    const allLines = formatted.split('\n').filter(line => line.trim().length > 0);
    
    // Count frequency of each line (normalized for comparison)
    const lineFrequency = new Map();
    const originalLines = new Map();
    
    allLines.forEach(line => {
      const normalizedLine = line.toLowerCase().replace(/[^\w\s]/g, '').trim();
      if (normalizedLine.length > 5) { // Only consider meaningful lines
        lineFrequency.set(normalizedLine, (lineFrequency.get(normalizedLine) || 0) + 1);
        if (!originalLines.has(normalizedLine)) {
          originalLines.set(normalizedLine, line);
        }
      }
    });
    
    // Find lines that repeat 3 or more times
    const repeatedLines = new Set();
    for (const [normalized, count] of lineFrequency) {
      if (count >= 3) {
        repeatedLines.add(normalized);
      }
    }
    
    if (repeatedLines.size === 0) {
      showToast("✨ Spacing fixed. No lines repeated 3+ times found.");
      return formatted;
    }
    
    // Bold the repeated lines
    const lines = formatted.split('\n');
    const boldedLines = lines.map(line => {
      const trimmedLine = line.trim();
      if (trimmedLine.length === 0) return line;
      
      const normalizedLine = trimmedLine.toLowerCase().replace(/[^\w\s]/g, '').trim();
      if (repeatedLines.has(normalizedLine)) {
        // Check if already bolded
        if (!line.startsWith('**') && !line.endsWith('**')) {
          return `**${line}**`;
        }
      }
      return line;
    });
    
    formatted = boldedLines.join('\n');
    showToast(`🎵 Found ${repeatedLines.size} unique lines repeated 3+ times. Bolded them!`);
    
    return formatted;
  };

  // ========== PROCESS ALL SONGS FROM SERVER (not just loaded) ==========
  const processAllSongs = async () => {
    const confirmMsg = `This will process ALL ${totalHymns} hymns in the database.\n\nIt will:\n- Fix spacing issues\n- Find ANY line that repeats 3+ times\n- Bold those repeated lines\n\nThis may take a few minutes. Continue?`;
    
    if (!window.confirm(confirmMsg)) return;
    
    setProcessingAll(true);
    setProgress({ current: 0, total: totalHymns });
    
    let processed = 0;
    let errors = 0;
    let bolded = 0;
    
    try {
      // Fetch all songs in batches
      let currentPage = 1;
      let hasMorePages = true;
      
      while (hasMorePages) {
        const res = await axios.get(`${BASE_URL}/api/admin/songs?page=${currentPage}&limit=100`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const songs = res.data.songs || [];
        
        for (const song of songs) {
          try {
            const formattedLyrics = autoFormatLyrics(song.lyrics);
            
            if (formattedLyrics !== song.lyrics) {
              await axios.put(`${BASE_URL}/api/admin/songs/${song.id}`, {
                title: song.title,
                reference: song.reference,
                lyrics: formattedLyrics
              }, {
                headers: { Authorization: `Bearer ${token}` }
              });
              bolded++;
            }
            processed++;
            setProgress({ current: processed, total: totalHymns });
          } catch (err) {
            console.error(`Failed to process hymn: ${song.title}`, err);
            errors++;
          }
        }
        
        hasMorePages = res.data.hasMore || false;
        currentPage++;
      }
      
      // Refresh the displayed hymns
      await fetchHymns(1, activeSearch, true);
      
      showToast(`✅ Complete! Processed ${processed} hymns, bolded lines in ${bolded} hymns${errors > 0 ? `, ${errors} failed` : ''}`);
    } catch (err) {
      console.error('Bulk processing failed:', err);
      showToast("❌ Failed to process all hymns");
    } finally {
      setProcessingAll(false);
      setProgress({ current: 0, total: 0 });
      setSelectedHymns([]);
      setBulkSelectMode(false);
    }
  };

  // Process selected hymns (client-side only for loaded ones)
  const processSelectedHymns = async () => {
    let hymnsToProcess = [];
    
    if (selectedHymns.length > 0) {
      hymnsToProcess = hymns.filter(h => selectedHymns.includes(h.id));
    } else {
      hymnsToProcess = filteredHymns;
    }
    
    if (hymnsToProcess.length === 0) {
      showToast("⚠️ No hymns selected to process");
      return;
    }
    
    const confirmMsg = selectedHymns.length > 0
      ? `Process ${selectedHymns.length} selected hymns? This will fix spacing and bold repeated lines (3+ times).`
      : `Process ${hymnsToProcess.length} loaded hymns? This will fix spacing and bold repeated lines (3+ times).\n\nTip: Use "Process ALL ${totalHymns} Songs" to process everything.`;
    
    if (!window.confirm(confirmMsg)) return;
    
    setProcessingBulk(true);
    let processed = 0;
    let errors = 0;
    let bolded = 0;
    
    for (const hymn of hymnsToProcess) {
      try {
        const formattedLyrics = autoFormatLyrics(hymn.lyrics);
        
        if (formattedLyrics !== hymn.lyrics) {
          await axios.put(`${BASE_URL}/api/admin/songs/${hymn.id}`, {
            title: hymn.title,
            reference: hymn.reference,
            lyrics: formattedLyrics
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          bolded++;
        }
        processed++;
      } catch (err) {
        console.error(`Failed to process hymn: ${hymn.title}`, err);
        errors++;
      }
    }
    
    setProcessingBulk(false);
    setSelectedHymns([]);
    setBulkSelectMode(false);
    
    // Refresh hymns list
    await fetchHymns(1, activeSearch, true);
    
    showToast(`✅ Processed ${processed} hymns, bolded lines in ${bolded}${errors > 0 ? `, ${errors} failed` : ''}`);
  };

  const selectAllFiltered = () => {
    if (selectedHymns.length === filteredHymns.length) {
      setSelectedHymns([]);
    } else {
      setSelectedHymns(filteredHymns.map(h => h.id));
    }
  };

  const insertSample = () => {
    const sample = `Verse 1 line 1
Verse 1 line 2
Verse 1 line 3

This is the chorus
This is the chorus
This is the chorus

Verse 2 line 1
Verse 2 line 2

This is the chorus
This is the chorus
This is the chorus

Bridge line 1
Bridge line 2

This is the chorus
This is the chorus
This is the chorus`;
    setFormData({ ...formData, lyrics: sample });
    showToast("📝 Sample lyrics inserted with repeated lines");
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

  const toggleSelectHymn = (id) => {
    setSelectedHymns(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const openEditModal = (hymn) => {
    setSelectedHymn(hymn);
    setFormData({
      title: hymn.title || "",
      reference: hymn.reference || "",
      lyrics: hymn.lyrics || ""
    });
    setShowEditModal(true);
    setIsFullScreen(isMobile);
  };

  const handleAdd = async () => {
    if (!formData.title.trim()) {
      showToast("❌ Title is required");
      return;
    }

    setSaving(true);
    try {
      const res = await axios.post(`${BASE_URL}/api/admin/songs`, {
        title: formData.title,
        reference: formData.reference || null,
        lyrics: formData.lyrics || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setHymns(prev => [res.data, ...prev]);
      setShowAddModal(false);
      setFormData({ title: "", reference: "", lyrics: "" });
      showToast("✅ Hymn added successfully!");
      localStorage.removeItem('hymn_draft');
    } catch (err) {
      console.error("Add error:", err);
      showToast("❌ Failed to add hymn");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!formData.title.trim() || !selectedHymn) return;

    setSaving(true);
    try {
      const res = await axios.put(`${BASE_URL}/api/admin/songs/${selectedHymn.id}`, {
        title: formData.title,
        reference: formData.reference || null,
        lyrics: formData.lyrics || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setHymns(prev => prev.map(h => h.id === selectedHymn.id ? res.data : h));
      setShowEditModal(false);
      setSelectedHymn(null);
      setFormData({ title: "", reference: "", lyrics: "" });
      showToast("✅ Hymn updated successfully!");
    } catch (err) {
      console.error("Edit error:", err);
      showToast("❌ Failed to update hymn");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedHymn) return;

    setSaving(true);
    try {
      await axios.delete(`${BASE_URL}/api/admin/songs/${selectedHymn.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setHymns(prev => prev.filter(h => h.id !== selectedHymn.id));
      setShowDeleteModal(false);
      setSelectedHymn(null);
      showToast("✅ Hymn deleted successfully!");
    } catch (err) {
      console.error("Delete error:", err);
      showToast("❌ Failed to delete hymn");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({ title: "", reference: "", lyrics: "" });
    setSelectedHymn(null);
  };

  const showToast = (message) => {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = toastStyle;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  const formatLyrics = (lyrics) => {
    if (!lyrics) return [];
    return lyrics.split('\n\n').filter(v => v.trim() !== '');
  };

  const getVerseCount = () => formatLyrics(formData.lyrics).length;
  const getLineCount = () => formData.lyrics ? formData.lyrics.split('\n').length : 0;
  const getCharCount = () => formData.lyrics ? formData.lyrics.length : 0;
  const getWordCount = () => formData.lyrics ? formData.lyrics.split(/\s+/).filter(w => w.length > 0).length : 0;
  const getReadingTime = () => Math.ceil(getWordCount() / 200);

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

  if (loading && page === 1) {
    return (
      <div style={styles.container}>
        <div style={styles.skeletonHeader} />
        <div style={styles.skeletonGrid}>
          {[...Array(8)].map((_, i) => (
            <div key={i} style={styles.skeletonCard}>
              <div style={styles.skeletonIcon} />
              <div style={styles.skeletonContent}>
                <div style={styles.skeletonTitle} />
                <div style={styles.skeletonLine} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.container}>
      
      {/* Progress Bar for Bulk Processing */}
      {processingAll && progress.total > 0 && (
        <div style={styles.progressBarContainer}>
          <div style={{ ...styles.progressBarFill, width: `${(progress.current / progress.total) * 100}%` }} />
          <span style={styles.progressText}>
            Processing: {progress.current} / {progress.total} hymns
          </span>
        </div>
      )}
      
      {/* Header */}
      <div style={styles.headerSection}>
        <div style={styles.headerTop}>
          <div style={styles.titleWrapper}>
            <div style={styles.titleIcon}>📚</div>
            <div>
              <h1 style={styles.title}>Hymn Management</h1>
              <p style={styles.titleSub}>
                {totalHymns || 0} total hymns • {hymns.length} loaded
              </p>
            </div>
          </div>
          <div style={styles.headerActions}>
            {/* Process ALL Songs button */}
            {totalHymns > 0 && (
              <button 
                onClick={processAllSongs} 
                disabled={processingAll || processingBulk}
                style={styles.processAllBtn}
                title="Process ALL hymns in database (fix spacing & bold repeated lines)"
              >
                {processingAll ? (
                  <><FiLoader style={styles.spinningIcon} size={18} /> Processing {progress.current}/{progress.total}...</>
                ) : (
                  <><FiGlobe size={18} /> Process ALL {totalHymns} Songs</>
                )}
              </button>
            )}
            
            {/* Process Selected button */}
            {(selectedHymns.length > 0 || filteredHymns.length > 0) && (
              <button 
                onClick={processSelectedHymns} 
                disabled={processingBulk || processingAll}
                style={styles.autoFormatBtn}
                title="Fix spacing and bold repeated lines in selected/loaded hymns"
              >
                {processingBulk ? (
                  <><FiLoader style={styles.spinningIcon} size={18} /> Processing...</>
                ) : (
                  <><MdAutoFixHigh size={18} /> Process {selectedHymns.length > 0 ? `(${selectedHymns.length})` : `(${filteredHymns.length})`}</>
                )}
              </button>
            )}
            
            {/* Select All button */}
            <button 
              onClick={selectAllFiltered} 
              style={styles.selectAllBtn}
            >
              {selectedHymns.length === filteredHymns.length ? <FiCheckSquare size={18} /> : <FiSquare size={18} />}
              {selectedHymns.length === filteredHymns.length ? " Deselect" : " Select All"}
            </button>

            {/* OCR Scanner Button */}
           
<button onClick={() => navigate("/admin/ocr-scanner")} style={styles.ocrBtn}>
  <FiCamera size={18} /> Scan Lyrics from Book
</button>
            <button onClick={() => navigate("/admin/pending-songs")} style={styles.ocrBtn}>
  <FiClock size={18} /> Pending Songs
</button>
            
            {bulkSelectMode && selectedHymns.length > 0 && (
              <button onClick={() => {}} style={styles.bulkDeleteBtn}>
                <FiTrash2 size={18} /> Delete ({selectedHymns.length})
              </button>
            )}
            <button onClick={() => setBulkSelectMode(!bulkSelectMode)} style={styles.iconButton}>
              {bulkSelectMode ? <FiX size={18} /> : <FiCheck size={18} />}
            </button>
            <button onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')} style={styles.iconButton}>
              {viewMode === 'list' ? <FiGrid size={18} /> : <FiList size={18} />}
            </button>
            <button onClick={() => setShowStats(!showStats)} style={styles.iconButton}>
              <FiInfo size={18} />
            </button>
            <button onClick={() => navigate("/admin/hymns/add")} style={styles.addButton}>
  <FiPlus size={20} /> Add Hymn
</button>
          </div>
        </div>

        {/* Stats Cards */}
        {showStats && (
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <span style={styles.statValue}>{totalHymns || 0}</span>
              <span style={styles.statLabel}>Total Hymns</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statValue}>{hymns.filter(h => h.reference).length}</span>
              <span style={styles.statLabel}>With Reference</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statValue}>{hymns.filter(h => h.lyrics && h.lyrics.length > 50).length}</span>
              <span style={styles.statLabel}>With Lyrics</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statValue}>{hymns.reduce((acc, h) => acc + (h.lyrics?.split('\n\n').length || 0), 0)}</span>
              <span style={styles.statLabel}>Total Verses</span>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div style={styles.searchContainer}>
          <FiSearch style={styles.searchIcon} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search hymns by title, reference, or lyrics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            style={styles.searchInput}
          />
          {searchTerm && (
            <button onClick={handleClearSearch} style={styles.searchClear}>✕</button>
          )}
          <button onClick={handleSearch} style={styles.searchButton}>
            <FiSearch /> Search
          </button>
          <select 
            value={selectedFilter} 
            onChange={(e) => setSelectedFilter(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">All Hymns</option>
            <option value="withRef">With Reference</option>
            <option value="noRef">No Reference</option>
            <option value="hasLyrics">Has Lyrics</option>
          </select>
        </div>

        <div style={styles.resultsCount}>
          <span style={styles.resultsBold}>{filteredHymns.length}</span> shown
          {totalHymns > 0 && !activeSearch && ` of ${totalHymns} total`}
          {activeSearch && ` for "${activeSearch}"`}
          {selectedFilter !== 'all' && ` • Filtered: ${selectedFilter}`}
          {selectedHymns.length > 0 && ` • ${selectedHymns.length} selected`}
        </div>
      </div>

      {/* Hymns List/Grid */}
      <div style={viewMode === 'list' ? styles.list : styles.grid}>
        <AnimatePresence>
          {filteredHymns.map(hymn => (
            <motion.div
              key={hymn.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{
                ...styles.card,
                background: recentlyAdded === hymn.id ? '#e0e7ff' : '#fff',
                border: selectedHymns.includes(hymn.id) ? '2px solid #4f46e5' : '1px solid #e2e8f0',
              }}
            >
              {bulkSelectMode && (
                <input
                  type="checkbox"
                  checked={selectedHymns.includes(hymn.id)}
                  onChange={() => toggleSelectHymn(hymn.id)}
                  style={styles.checkbox}
                />
              )}
              <div style={styles.cardContent}>
                <div style={styles.icon}>
                  <GiPrayerBeads />
                </div>
                <div style={styles.info}>
                  <div style={styles.titleRow}>
                    <h3 style={styles.hymnTitle}>{hymn.title}</h3>
                    {hymn.reference && <span style={styles.ref}>{hymn.reference}</span>}
                    {hymn.lyrics && <span style={styles.hasLyricsBadge}>📝 Lyrics</span>}
                  </div>
                  {hymn.lyrics && (
                    <div style={styles.metaInfo}>
                      <span style={styles.metaItem}>📊 {hymn.lyrics.split('\n\n').length} verses</span>
                      <span style={styles.metaItem}>📝 {hymn.lyrics.split('\n').length} lines</span>
                      <span style={styles.metaItem}>🔄 {(() => {
                        const lines = hymn.lyrics.split('\n').filter(l => l.trim());
                        const freq = {};
                        lines.forEach(l => {
                          const norm = l.toLowerCase().replace(/[^\w\s]/g, '').trim();
                          if (norm.length > 5) freq[norm] = (freq[norm] || 0) + 1;
                        });
                        const repeated = Object.values(freq).filter(c => c >= 3).length;
                        return repeated > 0 ? `${repeated} repeated lines` : 'no repeats';
                      })()}</span>
                    </div>
                  )}
                </div>
              </div>
              <div style={styles.actions}>
                <button onClick={() => navigate(`/admin/hymns/edit/${hymn.id}`)} style={styles.editBtn} title="Edit">
                  <FiEdit2 size={16} />
                </button>
                <button onClick={() => {
                  setSelectedHymn(hymn);
                  setShowDeleteModal(true);
                }} style={styles.deleteBtn} title="Delete">
                  <FiTrash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Load More */}
      {hasMore && !activeSearch && !loading && (
        <button onClick={loadMore} disabled={loadingMore} style={styles.loadMore}>
          {loadingMore ? (
            <>
              <FiLoader style={styles.spinningIcon} /> Loading...
            </>
          ) : (
            "Load More Hymns"
          )}
        </button>
      )}

      {/* Empty State */}
      {filteredHymns.length === 0 && !loading && (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>🎵</div>
          <h3 style={styles.emptyTitle}>No hymns found</h3>
          <p style={styles.emptyText}>
            {activeSearch ? `No results for "${activeSearch}"` : "Add your first hymn to get started"}
          </p>
          <button onClick={() => navigate("/admin/hymns/add")} style={styles.addButton}>
  <FiPlus size={20} /> Add Hymn
</button>
        </div>
      )}

      {/* ADD/EDIT MODAL */}
      <AnimatePresence>
        {(showAddModal || showEditModal) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={isFullScreen ? styles.fullModalOverlay : styles.modalOverlay}
            onClick={() => {
              if (!isFullScreen) {
                setShowAddModal(false);
                setShowEditModal(false);
                resetForm();
              }
            }}
          >
            <motion.div
              initial={isFullScreen ? { y: 0 } : { scale: 0.9, y: 20 }}
              animate={isFullScreen ? { y: 0 } : { scale: 1, y: 0 }}
              exit={isFullScreen ? { y: 0 } : { scale: 0.9, y: 20 }}
              style={isFullScreen ? styles.fullModal : styles.largeModal}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={styles.modalHeader}>
                <div>
                  <h2 style={styles.modalTitle}>
                    {showAddModal ? "Add New Hymn" : "Edit Hymn"}
                  </h2>
                  {selectedHymn && (
                    <p style={styles.modalSubtitle}>
                      Last updated: {new Date(selectedHymn.updatedAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <div style={styles.modalHeaderActions}>
                  <button
                    onClick={showAddModal ? handleAdd : handleEdit}
                    disabled={!formData.title.trim() || saving}
                    style={{
                      ...styles.saveButton,
                      opacity: !formData.title.trim() || saving ? 0.7 : 1,
                    }}
                  >
                    {saving ? (
                      <>
                        <FiLoader style={styles.spinningIcon} size={16} />
                        {showAddModal ? "Adding..." : "Saving..."}
                      </>
                    ) : (
                      <>
                        <FiSave size={16} />
                        {showAddModal ? "Add Hymn" : "Save Changes"}
                      </>
                    )}
                  </button>
                  {!isMobile && (
                    <button 
                      onClick={() => setIsFullScreen(!isFullScreen)}
                      style={styles.modalSizeToggle}
                      title={isFullScreen ? "Exit full screen" : "Full screen"}
                    >
                      {isFullScreen ? <FiMinimize2 size={18} /> : <FiMaximize2 size={18} />}
                    </button>
                  )}
                  <button 
                    onClick={() => { 
                      setShowAddModal(false); 
                      setShowEditModal(false); 
                      resetForm(); 
                      setIsFullScreen(false);
                    }}
                    style={styles.modalClose}
                  >
                    <FiX size={20} />
                  </button>
                </div>
              </div>

              {/* Toolbar */}
              {!isMobile && (
                <div style={styles.modalToolbar}>
                  <button onClick={() => setPreviewMode(!previewMode)} style={{
                    ...styles.toolbarButton,
                    background: previewMode ? '#4f46e5' : '#f1f5f9',
                    color: previewMode ? 'white' : '#475569'
                  }}>
                    {previewMode ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                    {previewMode ? "Hide Preview" : "Show Preview"}
                  </button>
                  <button onClick={cleanFormatting} style={styles.toolbarButton}>
                    <FiRefreshCw size={14} /> Clean Formatting
                  </button>
                  <button 
                    onClick={() => {
                      const formatted = autoFormatLyrics(formData.lyrics);
                      setFormData({ ...formData, lyrics: formatted });
                    }} 
                    style={styles.toolbarButton}
                    title="Fix spacing and bold any line repeated 3+ times"
                  >
                    <MdAutoFixHigh size={14} /> Bold Repeated Lines
                  </button>
                  <button onClick={capitalizeTitle} style={styles.toolbarButton}>
                    <MdAutoAwesome size={14} /> Capitalize Title
                  </button>
                  <button onClick={insertSample} style={styles.toolbarButton}>
                    <FiCopy size={14} /> Insert Sample
                  </button>
                  <div style={styles.fontSizeControl}>
                    <button onClick={() => setFontSize(Math.max(12, fontSize - 2))} style={styles.fontSizeBtn}>A-</button>
                    <span style={styles.fontSizeValue}>{fontSize}px</span>
                    <button onClick={() => setFontSize(Math.min(24, fontSize + 2))} style={styles.fontSizeBtn}>A+</button>
                  </div>
                </div>
              )}

              {/* Modal Body */}
              <div style={isMobile ? styles.mobileModalBody : (isFullScreen ? styles.fullModalBody : styles.largeModalBody)}>
                <div style={isMobile ? styles.mobileFormColumn : styles.formColumn}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>
                      <FiMusic size={14} /> Title <span style={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Enter hymn title"
                      style={styles.formInput}
                      autoFocus
                      disabled={saving}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>
                      <FiTag size={14} /> Reference
                    </label>
                    <input
                      type="text"
                      value={formData.reference}
                      onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                      placeholder="e.g., AGJ 451/134, NAGJ 188/52"
                      style={styles.formInput}
                      disabled={saving}
                    />
                  </div>

                  {formData.lyrics && (
                    <div style={styles.lyricsStats}>
                      <span>📊 {getVerseCount()} verses</span>
                      <span>📝 {getLineCount()} lines</span>
                      <span>📖 {getWordCount()} words</span>
                      <span>⏱️ {getReadingTime()} min read</span>
                    </div>
                  )}

                  <div style={isMobile ? styles.mobileLyricsGroup : styles.lyricsGroup}>
                    <div style={styles.textareaHeader}>
                      <label style={styles.formLabel}>
                        <MdFormatQuote size={14} /> Lyrics
                      </label>
                      <div style={styles.textareaStats}>
                        <span>{getLineCount()} lines</span>
                        <span>•</span>
                        <span>{getVerseCount()} verses</span>
                      </div>
                    </div>
                    <textarea
                      ref={lyricsTextareaRef}
                      value={formData.lyrics}
                      onChange={(e) => setFormData({ ...formData, lyrics: e.target.value })}
                      placeholder="Enter hymn lyrics...&#10;&#10;Use blank lines between verses for proper formatting"
                      rows={isMobile ? 18 : (isFullScreen ? 30 : 22)}
                      style={{
                        ...(isMobile ? styles.mobileTextarea : styles.bigTextarea),
                        fontSize: `${fontSize}px`,
                      }}
                      disabled={saving}
                    />
                    <div style={styles.formHint}>
                      💡 Separate verses with a blank line • Use "Bold Repeated Lines" to find and bold any line that appears 3+ times
                    </div>
                  </div>
                </div>

                {/* Preview Column */}
                {!isMobile && previewMode && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={styles.previewColumn}
                  >
                    <div style={styles.previewHeader}>
                      <h3 style={styles.previewTitle}>Live Preview</h3>
                      <span style={styles.previewBadge}>
                        {getVerseCount()} verses
                      </span>
                    </div>
                    <div style={styles.previewContent}>
                      <h4 style={styles.previewHymnTitle}>
                        {formData.title || "Untitled Hymn"}
                      </h4>
                      {formData.reference && (
                        <p style={styles.previewRef}>{formData.reference}</p>
                      )}
                      <div style={{ ...styles.previewLyrics, fontSize: `${fontSize}px` }}>
                        {formatLyrics(formData.lyrics).length > 0 ? (
                          formatLyrics(formData.lyrics).map((verse, i) => (
                            <div key={i} style={styles.previewVerse}>
                              {verse.split('\n').map((line, j) => {
                                const parts = line.split(/(\*\*[^*]+\*\*)/g);
                                return (
                                  <p key={j} style={styles.previewLine}>
                                    {parts.map((part, k) => {
                                      if (part.startsWith('**') && part.endsWith('**')) {
                                        return <strong key={k} style={{ color: '#4f46e5' }}>{part.slice(2, -2)}</strong>;
                                      }
                                      return part;
                                    })}
                                  </p>
                                );
                              })}
                            </div>
                          ))
                        ) : (
                          <div style={styles.previewEmpty}>
                            {formData.lyrics ? (
                              <>
                                <p>⚠️ Invalid format</p>
                                <small>Use blank lines between verses</small>
                              </>
                            ) : (
                              <p>✨ Lyrics will appear here</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              <div style={styles.modalFooter}>
                <div style={styles.modalFooterLeft}>
                  {autoSave && <span style={styles.autoSaveIndicator}>💾 Auto-save enabled</span>}
                </div>
                <div style={styles.modalFooterRight}>
                  <button
                    onClick={() => { 
                      setShowAddModal(false); 
                      setShowEditModal(false); 
                      resetForm(); 
                      setIsFullScreen(false);
                    }}
                    style={styles.cancelButton}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && selectedHymn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.modalOverlay}
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={styles.deleteModal}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={styles.deleteIcon}>⚠️</div>
              <h3 style={styles.deleteTitle}>Delete Hymn?</h3>
              <p style={styles.deleteText}>
                Are you sure you want to delete "<strong>{selectedHymn.title}</strong>"? 
                This action cannot be undone and will remove it from all mass programs.
              </p>
              <div style={styles.deleteActions}>
                <button onClick={() => setShowDeleteModal(false)} style={styles.cancelButton}>
                  Cancel
                </button>
                <button onClick={handleDelete} style={styles.deleteConfirmBtn}>
                  Delete Permanently
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OCR SCANNER MODAL - PLACED OUTSIDE ALL OTHER MODALS */}
      {showOCR && (
        <OCRScanner 
          onLyricsExtracted={(lyrics) => {
            setFormData(prev => ({ ...prev, lyrics }));
            setShowAddModal(true);
            setShowOCR(false);
          }}
          onClose={() => setShowOCR(false)}
        />
      )}

    </motion.div>
  );
}

// ====== STYLES ======
const styles = {
  container: {
    padding: "16px",
    maxWidth: "1400px",
    margin: "0 auto",
    marginTop: "40px",
    fontFamily: "'Inter', -apple-system, sans-serif",
    background: "#f8fafc",
    minHeight: "100vh",
  },
  
  progressBarContainer: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: "4px",
    background: "#e2e8f0",
    zIndex: 1000,
  },
  progressBarFill: {
    height: "100%",
    background: "#10b981",
    transition: "width 0.3s ease",
  },
  progressText: {
    position: "fixed",
    top: "10px",
    right: "20px",
    background: "#1e293b",
    color: "white",
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    zIndex: 1000,
  },

  headerSection: { marginBottom: "24px" },
  headerTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "16px",
  },
  titleWrapper: { display: "flex", alignItems: "center", gap: "16px" },
  titleIcon: {
    width: "56px",
    height: "56px",
    borderRadius: "16px",
    background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "28px",
    color: "#fff",
  },
  title: { fontSize: "28px", fontWeight: "700", color: "#0f172a", margin: 0 },
  titleSub: { fontSize: "13px", color: "#64748b", margin: "4px 0 0" },
  
  headerActions: { display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" },
  iconButton: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    background: "#fff",
    border: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#475569",
  },
  addButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 24px",
    background: "#4f46e5",
    color: "white",
    border: "none",
    borderRadius: "40px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  bulkDeleteBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 20px",
    background: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: "40px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  autoFormatBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 20px",
    background: "#10b981",
    color: "white",
    border: "none",
    borderRadius: "40px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  processAllBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 20px",
    background: "#8b5cf6",
    color: "white",
    border: "none",
    borderRadius: "40px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  selectAllBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 20px",
    background: "#f59e0b",
    color: "white",
    border: "none",
    borderRadius: "40px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  ocrBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 20px",
    background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
    color: "white",
    border: "none",
    borderRadius: "40px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
    marginBottom: "20px",
  },
  statCard: {
    background: "#fff",
    padding: "20px 12px",
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
  },
  statValue: { fontSize: "28px", fontWeight: "700", color: "#4f46e5" },
  statLabel: { fontSize: "12px", color: "#64748b", textTransform: "uppercase" },

  searchContainer: {
    display: "flex",
    gap: "12px",
    marginBottom: "12px",
    flexWrap: "wrap",
    position: "relative",
  },
  searchIcon: {
    position: "absolute",
    left: "16px",
    top: "14px",
    color: "#94a3b8",
    fontSize: "16px",
  },
  searchInput: {
    flex: 1,
    padding: "14px 16px 14px 48px",
    borderRadius: "40px",
    border: "1px solid #e2e8f0",
    background: "#fff",
    fontSize: "15px",
    outline: "none",
  },
  searchClear: {
    position: "absolute",
    right: "110px",
    top: "14px",
    background: "#f1f5f9",
    border: "none",
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    color: "#64748b",
    fontSize: "14px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  searchButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 24px",
    background: "#4f46e5",
    color: "white",
    border: "none",
    borderRadius: "40px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  filterSelect: {
    padding: "12px 20px",
    borderRadius: "40px",
    border: "1px solid #e2e8f0",
    background: "#fff",
    fontSize: "14px",
    color: "#0f172a",
    cursor: "pointer",
    outline: "none",
  },

  resultsCount: {
    fontSize: "13px",
    color: "#64748b",
    marginBottom: "16px",
  },
  resultsBold: { fontWeight: "700", color: "#0f172a" },

  list: { display: "flex", flexDirection: "column", gap: "10px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "12px" },
  
  card: {
    background: "#fff",
    borderRadius: "16px",
    padding: "16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    transition: "all 0.2s",
  },
  checkbox: { width: "20px", height: "20px", cursor: "pointer" },
  cardContent: { display: "flex", alignItems: "center", gap: "16px", flex: 1 },
  icon: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    background: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    color: "#4f46e5",
  },
  info: { flex: 1 },
  titleRow: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" },
  hymnTitle: { fontSize: "16px", fontWeight: "600", color: "#0f172a", margin: 0 },
  ref: {
    fontSize: "11px",
    color: "#64748b",
    background: "#f1f5f9",
    padding: "4px 10px",
    borderRadius: "20px",
  },
  hasLyricsBadge: {
    fontSize: "11px",
    color: "#10b981",
    background: "#d1fae5",
    padding: "4px 10px",
    borderRadius: "20px",
  },
  metaInfo: { display: "flex", gap: "12px", marginTop: "6px", flexWrap: "wrap" },
  metaItem: { fontSize: "11px", color: "#94a3b8" },
  actions: { display: "flex", gap: "8px" },
  editBtn: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    background: "#f1f5f9",
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#475569",
  },
  deleteBtn: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    background: "#f1f5f9",
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#ef4444",
  },

  loadMore: {
    width: "100%",
    padding: "16px",
    background: "#4f46e5",
    color: "white",
    border: "none",
    borderRadius: "40px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },

  empty: {
    textAlign: "center",
    padding: "80px 20px",
  },
  emptyIcon: { fontSize: "64px", marginBottom: "20px", opacity: 0.7 },
  emptyTitle: { fontSize: "20px", fontWeight: "600", color: "#0f172a", marginBottom: "8px" },
  emptyText: { fontSize: "14px", color: "#64748b", marginBottom: "24px" },
  emptyBtn: {
    padding: "12px 28px",
    background: "#4f46e5",
    color: "#fff",
    border: "none",
    borderRadius: "40px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  },

  // Modal Styles
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 1000,
    backdropFilter: "blur(5px)",
  },
  fullModalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "#f8fafc",
    zIndex: 1000,
  },
  largeModal: {
    background: "#fff",
    borderRadius: "24px",
    padding: "28px",
    maxWidth: "1400px",
    width: "95%",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
  },
  fullModal: {
    background: "#fff",
    padding: window.innerWidth <= 768 ? "16px" : "32px",
    width: "100%",
    minHeight: "100vh",
    overflowY: "auto",
    },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "-0px",
    marginTop: 45,
    paddingBottom: "-50px",
    borderBottom: "2px solid #e2e8f0",
    flexWrap: "wrap",
    gap: "-50px",
  },
  modalTitle: { fontSize: window.innerWidth <= 768 ? "20px" : "66px", fontWeight: "700", color: "#0f172a", margin: 0 },
  modalSubtitle: { fontSize: "13px", color: "#64748b", margin: "4px 0 0" },
  modalHeaderActions: { display: "flex", gap: "10px", alignItems: "center" },
  
  saveButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 24px",
    background: "#4f46e5",
    border: "none",
    borderRadius: "30px",
    fontSize: "14px",
    fontWeight: "600",
    color: "white",
    cursor: "pointer",
  },
  modalSizeToggle: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    background: "#f1f5f9",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalClose: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    background: "#f1f5f9",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  modalToolbar: {
    display: "flex",
    gap: "10px",
    marginBottom: "24px",
    flexWrap: "wrap",
    paddingBottom: "16px",
    borderBottom: "1px solid #e2e8f0",
  },
  toolbarButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    borderRadius: "30px",
    fontSize: "13px",
    fontWeight: "500",
    color: "#475569",
    cursor: "pointer",
  },
  fontSizeControl: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "#f1f5f9",
    padding: "4px 12px",
    borderRadius: "30px",
  },
  fontSizeBtn: {
    width: "32px",
    height: "32px",
    borderRadius: "20px",
    border: "none",
    background: "#fff",
    cursor: "pointer",
    fontWeight: "600",
  },
  fontSizeValue: { fontSize: "13px", fontWeight: "500", minWidth: "40px", textAlign: "center" },

  largeModalBody: { display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "28px", marginBottom: "24px", minHeight: "550px" },
  fullModalBody: { display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "32px", marginBottom: "24px", height: "calc(100vh - 220px)", overflowY: "auto" },
  mobileModalBody: { display: "flex", flexDirection: "column", gap: "16px", marginBottom: "16px", height: "calc(100vh - 220px)", overflowY: "auto" },
  mobileFormColumn: { display: "flex", flexDirection: "column", gap: "16px", width: "100%" },
  formColumn: { display: "flex", flexDirection: "column", gap: "20px" },
  formGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  formLabel: { fontSize: "14px", fontWeight: "600", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" },
  required: { color: "#ef4444", marginLeft: "2px" },
  formInput: {
    padding: "14px 18px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    fontSize: "15px",
    outline: "none",
    transition: "all 0.2s",
  },

  lyricsStats: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    padding: "8px 12px",
    background: "#f1f5f9",
    borderRadius: "10px",
    fontSize: "12px",
    color: "#475569",
  },

  lyricsGroup: { display: "flex", flexDirection: "column", gap: "8px", flex: 1 },
  mobileLyricsGroup: { display: "flex", flexDirection: "column", gap: "8px", flex: 1, minHeight: "300px" },
  textareaHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" },
  textareaStats: { display: "flex", gap: "8px", fontSize: "12px", color: "#4f46e5", background: "#e0e7ff", padding: "4px 12px", borderRadius: "30px" },
  bigTextarea: {
    padding: "20px 24px",
    borderRadius: "16px",
    border: "2px solid #d1d5db",
    fontFamily: "'Inter', monospace",
    lineHeight: "1.8",
    minHeight: "450px",
    resize: "vertical",
    width: "100%",
    backgroundColor: "#fafafa",
    outline: "none",
  },
  mobileTextarea: {
    padding: "16px 20px",
    borderRadius: "16px",
    border: "2px solid #d1d5db",
    fontSize: "16px",
    fontFamily: "'Inter', monospace",
    lineHeight: "1.8",
    minHeight: "350px",
    resize: "vertical",
    width: "100%",
    backgroundColor: "#fafafa",
    outline: "none",
  },
  formHint: { fontSize: "12px", color: "#64748b", marginTop: "6px" },

  previewColumn: {
    background: "#f8fafc",
    borderRadius: "16px",
    padding: "20px",
    border: "1px solid #e2e8f0",
    overflowY: "auto",
    height: "100%",
  },
  previewHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  previewTitle: { fontSize: "16px", fontWeight: "600", color: "#0f172a", margin: 0 },
  previewBadge: { fontSize: "12px", padding: "4px 12px", background: "#4f46e5", color: "white", borderRadius: "30px" },
  previewContent: {
    background: "#fff",
    borderRadius: "12px",
    padding: "28px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  },
  previewHymnTitle: { fontSize: "22px", fontWeight: "700", color: "#4f46e5", textAlign: "center", margin: "0 0 12px 0" },
  previewRef: { fontSize: "14px", color: "#64748b", textAlign: "center", margin: "0 0 28px 0", padding: "4px 0", borderBottom: "1px dashed #e2e8f0" },
  previewLyrics: { lineHeight: "2" },
  previewVerse: { marginBottom: "28px" },
  previewLine: { margin: "6px 0", color: "#1e293b", textAlign: "center" },
  previewEmpty: { textAlign: "center", color: "#94a3b8", padding: "40px 0" },

  modalFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "20px",
    paddingTop: "16px",
    borderTop: "1px solid #e2e8f0",
    flexWrap: "wrap",
    gap: "12px",
  },
  modalFooterLeft: { display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" },
  autoSaveIndicator: { fontSize: "12px", color: "#10b981", background: "#d1fae5", padding: "4px 12px", borderRadius: "20px" },
  modalFooterRight: { display: "flex", gap: "12px" },
  cancelButton: {
    padding: "12px 28px",
    background: "#f1f5f9",
    border: "none",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#475569",
    cursor: "pointer",
  },

  deleteModal: {
    background: "#fff",
    borderRadius: "24px",
    padding: "32px",
    maxWidth: "400px",
    width: "90%",
    textAlign: "center",
  },
  deleteIcon: { fontSize: "48px", marginBottom: "16px" },
  deleteTitle: { fontSize: "20px", fontWeight: "700", color: "#0f172a", marginBottom: "8px" },
  deleteText: { fontSize: "14px", color: "#64748b", marginBottom: "24px", lineHeight: 1.6 },
  deleteActions: { display: "flex", gap: "12px" },
  deleteConfirmBtn: {
    flex: 1,
    padding: "14px",
    background: "#ef4444",
    border: "none",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: "600",
    color: "white",
    cursor: "pointer",
  },

  spinningIcon: { animation: "spin 1s linear infinite" },
  skeletonHeader: { height: "120px", background: "#e2e8f0", borderRadius: "16px", marginBottom: "20px" },
  skeletonCard: { background: "#fff", borderRadius: "16px", padding: "16px", border: "1px solid #e2e8f0", display: "flex", gap: "16px" },
  skeletonIcon: { width: "48px", height: "48px", borderRadius: "12px", background: "#e2e8f0" },
  skeletonContent: { flex: 1 },
  skeletonTitle: { width: "70%", height: "18px", background: "#e2e8f0", borderRadius: "4px", marginBottom: "10px" },
  skeletonLine: { width: "90%", height: "14px", background: "#e2e8f0", borderRadius: "4px" },
  skeletonGrid: { display: "flex", flexDirection: "column", gap: "10px" },
};

const toastStyle = `
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #0f172a;
  color: white;
  padding: 14px 28px;
  border-radius: 40px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
  z-index: 9999;
  animation: slideIn 0.3s ease;
  white-space: nowrap;
  max-width: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const styleElement = document.createElement('style');
styleElement.innerHTML = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`;

document.head.appendChild(styleElement);