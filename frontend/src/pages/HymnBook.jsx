// frontend/src/pages/HymnBook.jsx
import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useSearchParams } from "react-router-dom";
import { 
  FiSearch, 
  FiHeart, 
  FiShare2, 
  FiCopy,
  FiClock
} from "react-icons/fi";
import { 
  BsWhatsapp,
  BsTelegram,
  BsTwitter,
  BsMusicNoteBeamed
} from "react-icons/bs";
import { 
  GiPrayerBeads
} from "react-icons/gi";
import { IoTimeOutline } from "react-icons/io5";
import { Link } from "react-router-dom";
import BASE_URL from "../api";
import { FaMusic } from "react-icons/fa";

export default function HymnBook() {
  const [searchParams] = useSearchParams();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalSongs, setTotalSongs] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [shareModal, setShareModal] = useState(null);
  const initialLoadDone = useRef(false);
  const backButtonRef = useRef(null);

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  const debounceTimer = useRef(null);

  const token = localStorage.getItem("token");

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("songFavorites");
    if (saved) setFavorites(JSON.parse(saved));
    
    const viewed = localStorage.getItem("recentSongs");
    if (viewed) setRecentlyViewed(JSON.parse(viewed).slice(0, 5));
  }, []);

  // Save favorites
  useEffect(() => {
    localStorage.setItem("songFavorites", JSON.stringify(favorites));
  }, [favorites]);

  // Fetch songs
  const fetchSongs = useCallback(async (pageNum = 1, search = '', reset = false, isInitial = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      const params = new URLSearchParams({
        page: pageNum,
        limit: 20
      });
      
      if (search) {
        params.append('search', search);
      }
      
      const res = await axios.get(`${BASE_URL}/api/songs?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      let newSongs = res.data?.songs || [];
      
      // Sort results: title matches first, then lyrics matches
      if (search && newSongs.length > 0) {
        const searchLower = search.toLowerCase();
        newSongs.sort((a, b) => {
          const aTitleMatch = a.title?.toLowerCase().includes(searchLower);
          const bTitleMatch = b.title?.toLowerCase().includes(searchLower);
          
          if (aTitleMatch && !bTitleMatch) return -1;
          if (!aTitleMatch && bTitleMatch) return 1;
          return 0;
        });
      }
      
      if (reset || pageNum === 1) {
        setSongs(newSongs);
      } else {
        setSongs(prev => [...(prev || []), ...newSongs]);
      }
      
      setHasMore(res.data?.hasMore || false);
      
      if (res.data?.total) {
        setTotalSongs(res.data.total);
      }
      
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to load songs");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [token]);

  const fetchSuggestions = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setIsSearchingLive(true);
    try {
      const params = new URLSearchParams({ search: query, limit: 8 });
      const res = await axios.get(`${BASE_URL}/api/songs?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const items = res.data?.songs || [];
      setSuggestions(items);
      setShowSuggestions(items.length > 0);
    } catch (err) {
      console.error("Suggestions error:", err);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsSearchingLive(false);
    }
  }, [token]);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (searchInput.trim().length >= 2) {
      debounceTimer.current = setTimeout(() => {
        fetchSuggestions(searchInput);
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchInput, fetchSuggestions]);

  const selectSuggestion = (suggestion) => {
    setSearchInput(suggestion.title);
    setShowSuggestions(false);
    setSuggestions([]);
    setActiveSearch(suggestion.title);
    setPage(1);
    fetchSongs(1, suggestion.title, true, false);
  };

  // ONE TIME initial load - handles both normal and search from programs
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;
    
    const searchQuery = searchParams.get('search');
    const savedSearch = sessionStorage.getItem('hymnSearch');
    const initialSearch = searchQuery || savedSearch || '';
    
    if (initialSearch) {
      setSearchInput(initialSearch);
      setActiveSearch(initialSearch);
      fetchSongs(1, initialSearch, true, true);
      if (savedSearch) sessionStorage.removeItem('hymnSearch');
    } else {
      fetchSongs(1, '', true, true);
    }
  }, []);

  // Handle search button click
  const handleSearch = () => {
    if (searchInput === activeSearch) return;
    setActiveSearch(searchInput);
    setPage(1);
    fetchSongs(1, searchInput, true, false);
    setShowSuggestions(false);
  };

  const clearSearch = () => {
    setSearchInput("");
    setActiveSearch("");
    setShowFavoritesOnly(false);
    setPage(1);
    fetchSongs(1, "", true, false);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Load more results (next page)
  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchSongs(nextPage, activeSearch, false, false);
    }
  };

  const safeSongs = songs || [];
  
  const displayedSongs = showFavoritesOnly
    ? safeSongs.filter(song => favorites.includes(song?.id))
    : safeSongs;

  const trackView = (song) => {
    if (!song) return;
    const updated = [song, ...(recentlyViewed || []).filter(s => s?.id !== song.id)].slice(0, 5);
    setRecentlyViewed(updated);
    localStorage.setItem("recentSongs", JSON.stringify(updated));
  };

  const toggleFavorite = (id, e) => {
    e?.stopPropagation();
    const newFavorites = favorites.includes(id)
      ? favorites.filter(x => x !== id)
      : [...favorites, id];
    setFavorites(newFavorites);
    showToast(newFavorites.includes(id) ? "❤️ Added to favorites" : "❤️ Removed from favorites");
  };

  const copyToClipboard = (song) => {
    if (!song) return;
    const text = `${song.title || ''}\n${song.reference ? `(${song.reference})\n` : ''}\n${song.firstLine || ''}`;
    navigator.clipboard.writeText(text);
    showToast("📋 Song info copied!");
  };

  const shareSong = (song, platform) => {
  if (!song) return;
  
  const hymnUrl = `${window.location.origin}/hymn/${encodeURIComponent(song.title)}`;
  const text = `Check out this hymn: ${song.title || ''} ${song.reference ? `(${song.reference})` : ''}`;
  const fullMessage = `${text}\n\n🔗 ${hymnUrl}`;
  
  if (platform === 'whatsapp') {
    window.open(`https://wa.me/?text=${encodeURIComponent(fullMessage)}`, '_blank');
  } else if (platform === 'telegram') {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(hymnUrl)}&text=${encodeURIComponent(text)}`, '_blank');
  } else if (platform === 'twitter') {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(fullMessage)}`, '_blank');
  } else {
    navigator.clipboard.writeText(`${text}\n\n🔗 ${hymnUrl}`);
    showToast("📋 Link copied to clipboard!");
  }
};

  const showToast = (message) => {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = toastStyle;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  if (loading && page === 1 && songs.length === 0) {
    return (
      <div style={container}>
        <div style={headerSection}>
          <div style={skeletonHeader} />
        </div>
        <div style={skeletonGrid}>
          {[...Array(8)].map((_, i) => (
            <div key={i} style={skeletonCard}>
              <div style={skeletonIcon} />
              <div style={skeletonContent}>
                <div style={skeletonTitle} />
                <div style={skeletonLine} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={container}
    >
      <div style={headerSection}>
        <div style={headerTop}>
  <div style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    flexWrap: "wrap",
  }}>
    <div style={titleWrapper}>
      <div style={titleIcon}><FaMusic color="#000000"/></div>
      <div>
        <h1 style={title}>Hymn Book</h1>
        <p style={titleSub}>{totalSongs || safeSongs.length || 0} hymns</p>
      </div>
    </div>
    
    <Link to="/dashboard" style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding: "8px 16px",
      background: "white",
      border: "2px solid #000000",
      borderRadius: "50px",
      color: "#000000",
      textDecoration: "none",
      fontSize: "13px",
      fontWeight: "600",
      whiteSpace: "nowrap",
      transition: "all 0.2s ease",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = "#4f46e5";
      e.currentTarget.style.color = "white";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = "white";
      e.currentTarget.style.color = "#4f46e5";
    }}
    >
      ← Dashboard
    </Link>
  </div>
</div>
        
        

        <div style={compactStats}>
          <motion.div 
            style={compactStat}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setShowFavoritesOnly(false);
              clearSearch();
            }}
          >
            <span style={compactStatValue}>{totalSongs || safeSongs.length || 0}</span>
            <span style={compactStatLabel}>Total</span>
          </motion.div>
          <motion.div 
            style={compactStat}
            whileTap={{ scale: 0.95 }}
          >
            <span style={compactStatValue}>{safeSongs.length || 0}</span>
            <span style={compactStatLabel}>Loaded</span>
          </motion.div>
          <motion.div 
            style={compactStat}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          >
            <span style={{ ...compactStatValue, color: showFavoritesOnly ? "#ec4899" : "#64748b" }}>
              <FiHeart style={{ fill: showFavoritesOnly ? "#ec4899" : "none" }} />
            </span>
            <span style={compactStatLabel}>Fav</span>
          </motion.div>
          <motion.div 
            style={compactStat}
            whileTap={{ scale: 0.95 }}
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            <span style={compactStatValue}>
              {viewMode === 'grid' ? '☷' : '▦'}
            </span>
            <span style={compactStatLabel}>View</span>
          </motion.div>
        </div>

        <div style={searchContainer}>
          <div style={searchWrapper}>
            <FiSearch style={searchIcon} />
            <input
              type="text"
              placeholder="Search by title or lyrics..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => {
                if (suggestions.length > 0 && searchInput.trim().length >= 2) {
                  setShowSuggestions(true);
                }
              }}
              onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              style={searchInputStyle}
            />
            {searchInput && (
              <button onClick={clearSearch} style={searchClearBtn}>
                ✕
              </button>
            )}
            {showSuggestions && suggestions.length > 0 && (
              <div style={suggestionsContainer}>
                {suggestions.map((suggestion, index) => (
                  <div
                    key={suggestion.id}
                    style={{
                      ...suggestionItem,
                      animationDelay: `${index * 0.03}s`,
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectSuggestion(suggestion)}
                  >
                    <div style={suggestionIcon}>🎵</div>
                    <div style={suggestionContent}>
                      <div style={suggestionTitle}>{suggestion.title}</div>
                      {suggestion.firstLine && (
                        <div style={suggestionPreview}>
                          {suggestion.firstLine.substring(0, 60)}...
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {isSearchingLive && (
              <div style={searchLoading}>
                <div style={searchSpinner}></div>
                <span>Searching...</span>
              </div>
            )}
          </div>
          <button onClick={handleSearch} style={searchButton}>
            <FiSearch /> Search
          </button>
        </div>

        <div style={resultsCount}>
          <span style={resultsBold}>{displayedSongs?.length || 0}</span> hymns shown
          {totalSongs > 0 && !activeSearch && ` of ${totalSongs} total`}
          {activeSearch && ` matching "${activeSearch}"`}
          {showFavoritesOnly && " • Favorites only"}
        </div>

        {recentlyViewed?.length > 0 && !activeSearch && !showFavoritesOnly && (
          <div style={recentSection}>
            <div style={recentHeader}>
              <IoTimeOutline size={14} />
              <span>Recently viewed</span>
            </div>
            <div style={recentList}>
              {recentlyViewed.map(song => song && (
                <Link
                  to={`/hymn/${encodeURIComponent(song.title)}`}
                  key={song.id}
                  style={recentItem}
                  onClick={() => trackView(song)}
                >
                  <span style={recentTitle}>{song.title || ''}</span>
                  {song.reference && <span style={recentRef}>{song.reference}</span>}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={viewMode === 'grid' ? songsGrid : songsList}>
        <AnimatePresence>
          {displayedSongs?.map((song) => song && (
            <motion.div
              key={song.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{
                ...songCard,
                ...(viewMode === 'list' && songCardList),
              }}
            >
             <Link 
  to={`/hymn/${encodeURIComponent(song.title)}`}
  style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}
  onClick={() => trackView(song)}
>
                <div style={songCardHeader}>
                  <div style={songIconWrapper}>
                    <GiPrayerBeads style={songCardIcon} />
                  </div>
                  <div style={songCardInfo}>
                    <div style={songCardTitleRow}>
                      <h3 style={songCardTitle}>{song.title || ''}</h3>
                      {favorites.includes(song.id) && (
                        <FiHeart size={12} color="#ec4899" style={{ fill: "#ec4899" }} />
                      )}
                    </div>
                    {song.reference && (
                      <div style={songCardRef}>{song.reference}</div>
                    )}
                    {song.firstLine && (
                      <div style={songCardPreview}>
                        {song.firstLine}
                      </div>
                    )}
                  </div>
                </div>
              </Link>

              <div style={songCardActions}>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => toggleFavorite(song.id, e)}
                  style={actionIconButton}
                >
                  <FiHeart style={{ 
                    color: favorites.includes(song.id) ? "#ec4899" : "#94a3b8",
                    fill: favorites.includes(song.id) ? "#ec4899" : "none"
                  }} />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => copyToClipboard(song)}
                  style={actionIconButton}
                >
                  <FiCopy size={14} />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => shareSong(song)}
                  style={actionIconButton}
                >
                  <FiShare2 size={14} />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {hasMore && displayedSongs.length > 0 && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={loadMore}
          disabled={loadingMore}
          style={loadMoreButton}
        >
          {loadingMore ? (
            <>
              <span style={loadingSpinnerSmall} />
              Loading more...
            </>
          ) : (
            `Load More (${totalSongs - displayedSongs.length} remaining)`
          )}
        </motion.button>
      )}

      {(!displayedSongs || displayedSongs.length === 0) && !loading && (
        <div style={emptyState}>
          <div style={emptyIcon}>🎵</div>
          <h3 style={emptyTitle}>No hymns found</h3>
          <p style={emptyText}>
            {activeSearch 
              ? `No hymns matching "${activeSearch}" in title or lyrics` 
              : showFavoritesOnly 
                ? "You haven't added any favorites yet"
                : "Try searching by title or lyrics"}
          </p>
          <button 
            onClick={clearSearch}
            style={emptyButton}
          >
            Clear filters
          </button>
        </div>
      )}

      <AnimatePresence>
        {shareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={modalOverlay}
            onClick={() => setShareModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={modalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={modalTitle}>Share Hymn</h3>
              <p style={modalSongTitle}>{shareModal?.title || ''}</p>
              
              <div style={modalOptions}>
                <button onClick={() => shareSong(shareModal, 'whatsapp')} style={modalOption}>
                  <BsWhatsapp size={24} color="#25D366" />
                  <span>WhatsApp</span>
                </button>
                <button onClick={() => shareSong(shareModal, 'telegram')} style={modalOption}>
                  <BsTelegram size={24} color="#0088cc" />
                  <span>Telegram</span>
                </button>
                <button onClick={() => shareSong(shareModal, 'twitter')} style={modalOption}>
                  <BsTwitter size={24} color="#1DA1F2" />
                  <span>Twitter</span>
                </button>
              </div>

              <button onClick={() => setShareModal(null)} style={modalClose}>Close</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ====== STYLES ======

const container = {
  padding: "12px",
  maxWidth: "100%",
  fontFamily: "'Inter', -apple-system, sans-serif",
  background: "#f8fafc",
  marginBottom: "60px",
  minHeight: "100vh",
  borderRadius: "25px",
};

const skeletonCard = {
  background: "#ffffff",
  borderRadius: "16px",
  padding: "12px",
  border: "1px solid #e2e8f0",
  display: "flex",
  gap: "12px",
  animation: "pulse 1.5s ease-in-out infinite",
};

const skeletonIcon = {
  width: "36px",
  height: "36px",
  borderRadius: "10px",
  background: "#e2e8f0",
};

const skeletonContent = {
  flex: 1,
};

const skeletonTitle = {
  width: "70%",
  height: "16px",
  background: "#e2e8f0",
  borderRadius: "4px",
  marginBottom: "8px",
};

const skeletonLine = {
  width: "90%",
  height: "12px",
  background: "#e2e8f0",
  borderRadius: "4px",
};

const skeletonHeader = {
  height: "100px",
  background: "#e2e8f0",
  borderRadius: "12px",
  marginBottom: "16px",
};

const skeletonGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "10px",
  padding: "12px",
};

const headerSection = {
  marginBottom: "16px",
};

const headerTop = {
  marginBottom: "12px",
};

const titleWrapper = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const titleIcon = {
  width: "44px",
  height: "44px",
  borderRadius: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "22px",
  color: "#ffffff",
};

const title = {
  fontSize: "22px",
  fontWeight: "700",
  color: "#0f172a",
  margin: 0,
};

const titleSub = {
  fontSize: "12px",
  color: "#64748b",
  margin: 0,
};

const compactStats = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "6px",
  marginBottom: "12px",
};

const compactStat = {
  background: "#ffffff",
  padding: "10px 4px",
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "2px",
  cursor: "pointer",
};

const compactStatValue = {
  fontSize: "18px",
  fontWeight: "700",
  color: "#0f172a",
};

const compactStatLabel = {
  fontSize: "10px",
  color: "#64748b",
  textTransform: "uppercase",
};

const searchContainer = {
  marginBottom: "12px",
  display: "flex",
  gap: "8px",
};

const searchWrapper = {
  position: "relative",
  flex: 1,
};

const searchIcon = {
  position: "absolute",
  left: "12px",
  top: "50%",
  transform: "translateY(-50%)",
  color: "#94a3b8",
  fontSize: "14px",
};

const searchInputStyle = {
  width: "100%",
  padding: "12px 12px 12px 40px",
  borderRadius: "30px",
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  fontSize: "14px",
  outline: "none",
};

const searchClearBtn = {
  position: "absolute",
  right: "12px",
  top: "50%",
  transform: "translateY(-50%)",
  background: "none",
  border: "none",
  color: "#94a3b8",
  fontSize: "16px",
  cursor: "pointer",
  padding: "4px 8px",
  borderRadius: "20px",
};

const searchButton = {
  padding: "0 20px",
  background: "#0c0c0eb6",
  color: "white",
  border: "none",
  borderRadius: "30px",
  fontSize: "14px",
  fontWeight: "500",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  whiteSpace: "nowrap",
};

const resultsCount = {
  fontSize: "12px",
  color: "#64748b",
  marginBottom: "12px",
};

const resultsBold = {
  fontWeight: "700",
  color: "#0f172a",
  margin: "0 2px",
};

const recentSection = {
  marginBottom: "16px",
};

const recentHeader = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "11px",
  color: "#64748b",
  marginBottom: "8px",
  textTransform: "uppercase",
};

const recentList = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
};

const recentItem = {
  padding: "6px 12px",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "20px",
  fontSize: "12px",
  color: "#0f172a",
  textDecoration: "none",
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const recentTitle = {
  fontWeight: "500",
};

const recentRef = {
  fontSize: "9px",
  color: "#64748b",
};

const songsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(1, 1fr)",
  gap: "11px",
};

const songsList = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const songCard = {
  background: "#ffffff",
  borderRadius: "16px",
  padding: "12px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const songCardList = {
  flexDirection: "row",
  alignItems: "center",
};

const songCardHeader = {
  display: "flex",
  gap: "10px",
};

const songIconWrapper = {
  width: "36px",
  height: "36px",
  borderRadius: "10px",
  background: "#f1f5f9",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const songCardIcon = {
  fontSize: "18px",
  color: "#4f46e5",
};

const songCardInfo = {
  flex: 1,
};

const songCardTitleRow = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  marginBottom: "2px",
};

const songCardTitle = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#0f172a",
  margin: 0,
  lineHeight: 1.3,
};

const songCardRef = {
  fontSize: "10px",
  color: "#64748b",
  marginBottom: "4px",
};

const songCardPreview = {
  fontSize: "11px",
  color: "#475569",
  lineHeight: 1.4,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const songCardActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "8px",
  marginTop: "4px",
};

const actionIconButton = {
  background: "#f1f5f9",
  border: "none",
  borderRadius: "8px",
  padding: "6px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "#475569",
};

const loadMoreButton = {
  width: "100%",
  padding: "14px",
  background: "#4f46e5",
  color: "white",
  border: "none",
  borderRadius: "30px",
  fontSize: "14px",
  fontWeight: "500",
  cursor: "pointer",
  marginTop: "16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
};

const loadingSpinnerSmall = {
  width: "16px",
  height: "16px",
  border: "2px solid rgba(255,255,255,0.3)",
  borderTopColor: "white",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
  display: "inline-block",
};

const emptyState = {
  textAlign: "center",
  padding: "40px 20px",
};

const emptyIcon = {
  fontSize: "48px",
  marginBottom: "16px",
  opacity: 0.5,
};

const emptyTitle = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#0f172a",
  marginBottom: "8px",
};

const emptyText = {
  fontSize: "14px",
  color: "#64748b",
  marginBottom: "20px",
};

const emptyButton = {
  padding: "10px 20px",
  background: "#4f46e5",
  color: "#ffffff",
  border: "none",
  borderRadius: "30px",
  fontSize: "14px",
  fontWeight: "500",
  cursor: "pointer",
};

const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px",
  zIndex: 1000,
};

const modalContent = {
  background: "#ffffff",
  borderRadius: "24px",
  padding: "24px",
  maxWidth: "320px",
  width: "100%",
};

const modalTitle = {
  fontSize: "18px",
  fontWeight: "700",
  color: "#0f172a",
  marginBottom: "8px",
  textAlign: "center",
};

const modalSongTitle = {
  fontSize: "14px",
  color: "#64748b",
  marginBottom: "20px",
  textAlign: "center",
  padding: "0 10px",
};

const modalOptions = {
  display: "flex",
  justifyContent: "center",
  gap: "16px",
  marginBottom: "20px",
};

const modalOption = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "4px",
  padding: "12px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  cursor: "pointer",
  fontSize: "11px",
  color: "#0f172a",
  flex: 1,
};

const modalClose = {
  width: "100%",
  padding: "12px",
  background: "#4f46e5",
  border: "none",
  borderRadius: "12px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600",
  cursor: "pointer",
};

const toastStyle = `
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #0f172a;
  color: white;
  padding: 12px 24px;
  border-radius: 30px;
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

const suggestionsContainer = {
  position: "absolute",
  top: "calc(100% + 8px)",
  left: 0,
  right: 0,
  background: "#39393bfb",
  borderRadius: "16px",
  maxHeight: "400px",
  overflowY: "auto",
  zIndex: 1000,
  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)",
  border: "1px solid rgba(255,255,255,0.1)",
};

const suggestionItem = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px 16px",
  cursor: "pointer",
  transition: "background 0.2s",
  borderBottom: "1px solid rgba(255,255,255,0.05)",
  animation: "fadeInUp 0.3s ease backwards",
};

const suggestionIcon = {
  fontSize: "20px",
  minWidth: "32px",
};

const suggestionContent = {
  flex: 1,
};

const suggestionTitle = {
  fontSize: "14px",
  fontWeight: "600",
  color: "white",
  marginBottom: "4px",
};

const suggestionPreview = {
  fontSize: "12px",
  color: "#94a3b8",
};

const searchLoading = {
  position: "absolute",
  top: "calc(100% + 8px)",
  left: 0,
  right: 0,
  background: "#1b1b1afa",
  borderRadius: "12px",
  padding: "16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "12px",
  color: "#00c6ff",
  fontSize: "14px",
  zIndex: 1000,
};

const searchSpinner = {
  width: "20px",
  height: "20px",
  border: "2px solid rgba(0,198,255,0.2)",
  borderTopColor: "#00c6ff",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};

const style = document.createElement('style');
style.innerHTML = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;
document.head.appendChild(style);