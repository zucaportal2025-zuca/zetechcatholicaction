// Prayer.jsx — Complete with Browse Prayers + Rosary + Stations + Favorites + Notes
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, publicApi } from '../api';
import './Prayer.css';

const Prayer = () => {

const navigate = (path) => { window.location.href = path; };
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeMainTab, setActiveMainTab] = useState('browse');
  const [selectedSet, setSelectedSet] = useState('sorrowful');
  const [currentStationIndex, setCurrentStationIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showQuickPrayers, setShowQuickPrayers] = useState(true);
  const [selectedPrayer, setSelectedPrayer] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const [showOurFather, setShowOurFather] = useState(false);
const [showHailMary, setShowHailMary] = useState(false);
const [showGloryBe, setShowGloryBe] = useState(false);
const [showOhMyJesus, setShowOhMyJesus] = useState(false);
  // Divine Mercy state

  
  // Notes states
  const [userNote, setUserNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  
  // API data states
  const [dailyPrayers, setDailyPrayers] = useState([]);
  const [marianPrayers, setMarianPrayers] = useState([]);
  const [saintsPrayers, setSaintsPrayers] = useState([]);
  const [stationsData, setStationsData] = useState([]);
  const [mysteries, setMysteries] = useState({
    joyful: [],
    sorrowful: [],
    glorious: [],
    luminous: []
  });
  const [favorites, setFavorites] = useState([]);
  const [allPrayers, setAllPrayers] = useState([]);
  const [filteredPrayers, setFilteredPrayers] = useState([]);
  
  // Rosary state
  const [currentMysteryIndex, setCurrentMysteryIndex] = useState(0);
  const [hailMaryCount, setHailMaryCount] = useState(0);
  const [completedDecades, setCompletedDecades] = useState([]);
  const [showMysteryDetails, setShowMysteryDetails] = useState(false);
  const [showStationDetails, setShowStationDetails] = useState(false);
  
  // Image view state
  const [showImage, setShowImage] = useState(false);

  // Get user info
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const fullName = user.fullName || '';
  const firstName = fullName.split(' ')[0];
  const userId = user.id || localStorage.getItem('userId') || 'anonymous';

  // Get current mystery set
  const currentSet = mysteries[selectedSet] || [];
  const currentMystery = currentSet[currentMysteryIndex];
  const currentStation = stationsData[currentStationIndex];

 // Divine Mercy state
const [showDivineMercyDetails, setShowDivineMercyDetails] = useState(false);
const [currentDMIndex, setCurrentDMIndex] = useState(0);
const [dmCount, setDmCount] = useState(0);
// Reset Divine Mercy counter when changing steps
const resetDMCount = () => {
  setDmCount(0);
};

// Divine Mercy prayer steps with descriptions
const dmPrayerSteps = [
  // Opening Prayers
  { 
    title: 'Sign of the Cross', 
    description: `In the name of the Father, and of the Son, and of the Holy Spirit. Amen.`, 
    showCounter: false 
  },
  { 
    title: 'Our Father', 
    description: `Our Father, who art in heaven, hallowed be thy name; thy kingdom come; thy will be done on earth as it is in heaven. Give us this day our daily bread; and forgive us our trespasses as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil. Amen.`, 
    showCounter: false 
  },
  { 
    title: 'Hail Mary', 
    description: `Hail Mary, full of grace, the Lord is with thee; blessed art thou among women, and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen.`, 
    showCounter: false 
  },
  { 
    title: 'Apostles Creed', 
    description: `I believe in God, the Father almighty, Creator of heaven and earth, and in Jesus Christ, his only Son, our Lord, who was conceived by the Holy Spirit, born of the Virgin Mary, suffered under Pontius Pilate, was crucified, died and was buried; he descended into hell; on the third day he rose again from the dead; he ascended into heaven, and is seated at the right hand of God the Father almighty; from there he will come to judge the living and the dead. I believe in the Holy Spirit, the holy catholic Church, the communion of saints, the forgiveness of sins, the resurrection of the body, and life everlasting. Amen.`, 
    showCounter: false 
  },
  
  // Decade 1
  { 
    title: 'Eternal Father (1st Decade)', 
    description: `Eternal Father, I offer You the Body and Blood, Soul and Divinity of Your dearly beloved Son, Our Lord Jesus Christ, in atonement for our sins and those of the whole world.`, 
    showCounter: false 
  },
  { 
    title: 'For the sake (1st Decade)', 
    description: `For the sake of His sorrowful Passion, have mercy on us and on the whole world. (Repeat 10 times)`, 
    showCounter: true 
  },
  
  // Decade 2
  { 
    title: 'Eternal Father (2nd Decade)', 
    description: `Eternal Father, I offer You the Body and Blood, Soul and Divinity of Your dearly beloved Son, Our Lord Jesus Christ, in atonement for our sins and those of the whole world.`, 
    showCounter: false 
  },
  { 
    title: 'For the sake (2nd Decade)', 
    description: `For the sake of His sorrowful Passion, have mercy on us and on the whole world. (Repeat 10 times)`, 
    showCounter: true 
  },
  
  // Decade 3
  { 
    title: 'Eternal Father (3rd Decade)', 
    description: `Eternal Father, I offer You the Body and Blood, Soul and Divinity of Your dearly beloved Son, Our Lord Jesus Christ, in atonement for our sins and those of the whole world.`, 
    showCounter: false 
  },
  { 
    title: 'For the sake (3rd Decade)', 
    description: `For the sake of His sorrowful Passion, have mercy on us and on the whole world. (Repeat 10 times)`, 
    showCounter: true 
  },
  
  // Decade 4
  { 
    title: 'Eternal Father (4th Decade)', 
    description: `Eternal Father, I offer You the Body and Blood, Soul and Divinity of Your dearly beloved Son, Our Lord Jesus Christ, in atonement for our sins and those of the whole world.`, 
    showCounter: false 
  },
  { 
    title: 'For the sake (4th Decade)', 
    description: `For the sake of His sorrowful Passion, have mercy on us and on the whole world. (Repeat 10 times)`, 
    showCounter: true 
  },
  
  // Decade 5
  { 
    title: 'Eternal Father (5th Decade)', 
    description: `Eternal Father, I offer You the Body and Blood, Soul and Divinity of Your dearly beloved Son, Our Lord Jesus Christ, in atonement for our sins and those of the whole world.`, 
    showCounter: false 
  },
  { 
    title: 'For the sake (5th Decade)', 
    description: `For the sake of His sorrowful Passion, have mercy on us and on the whole world. (Repeat 10 times)`, 
    showCounter: true 
  },
  
  // Closing
  { 
    title: 'Holy God (3 times)', 
    description: `Holy God, Holy Mighty One, Holy Immortal One, have mercy on us and on the whole world. (Repeat 3 times)`, 
    showCounter: false 
  },
  { 
    title: 'Closing Prayer', 
    description: `You expired, Jesus, but the source of life gushed forth for souls, and the ocean of mercy opened up for the whole world. O Fount of Life, unfathomable Divine Mercy, envelop the whole world and empty Yourself out upon us. O Blood and Water, which gushed forth from the Heart of Jesus as a fountain of mercy for us, I trust in You.`, 
    showCounter: false 
  },
  { 
    title: 'Sign of the Cross', 
    description: `In the name of the Father, and of the Son, and of the Holy Spirit. Amen.`, 
    showCounter: false 
  }
];
  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Get day name
  const getDayName = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  const getSuggestedMystery = () => {
    const day = getDayName();
    if (day === 'Tuesday' || day === 'Friday') return 'sorrowful';
    if (day === 'Monday' || day === 'Saturday') return 'joyful';
    if (day === 'Wednesday' || day === 'Sunday') return 'glorious';
    if (day === 'Thursday') return 'luminous';
    return 'sorrowful';
  };

  // Get image path for a mystery
// Get image path for a mystery
const getMysteryImage = (set, index) => {
  const imagePaths = {
    sorrowful: [
      '/sorrow/1stmystry.jpg',
      '/sorrow/2nd.jpg',
      '/sorrow/3rd.jpg',
      '/sorrow/4th.jpg',
      '/sorrow/5th.jpg'
    ],
    divineMercy: [
      '/divine mercy/in the name of the father.jpg',
      '/divine mercy/our father.jpg',
      '/divine mercy/hail mary.jpg',
      '/divine mercy/creed.jpg',
      '/divine mercy/eternal father.jpg',
      '/divine mercy/fro the sake x10.jpg',
      '/divine mercy/eternal father (2).jpg',
      '/divine mercy/fro the sake x10.jpg',
      '/divine mercy/eternal father.jpg',
      '/divine mercy/fro the sake x10.jpg',
      '/divine mercy/eternal father (2).jpg',
      '/divine mercy/fro the sake x10.jpg',
      '/divine mercy/eternal father.jpg',
      '/divine mercy/fro the sake x10.jpg',
      '/divine mercy/holy god x3.jpg',
      '/divine mercy/boold and water.jpg',
      '/divine mercy/in the name.jpg'
    ],
    joyful: [],
    glorious: [],
    luminous: []
  };
  
  const images = imagePaths[set] || [];
  return images[index] || null;
};
  // Clean prayer text
  const cleanPrayerText = (text) => {
    if (!text) return 'Prayer content not available';
    
    let cleaned = text;
    cleaned = cleaned.replace(/<[^>]*>/g, '');
    cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '');
    cleaned = cleaned.replace(/Share this Page.*$/s, '');
    cleaned = cleaned.replace(/More Prayers.*$/s, '');
    cleaned = cleaned.replace(/Daily Reflections.*$/s, '');
    cleaned = cleaned.replace(/More Sharing Options.*$/s, '');
    cleaned = cleaned.replace(/View Video.*$/s, '');
    cleaned = cleaned.replace(/<img[^>]*>/g, '');
    cleaned = cleaned.replace(/\.jpg|\.png|\.jpeg|\.webp/g, '');
    cleaned = cleaned.replace(/[ \t]+/g, ' ');
    cleaned = cleaned.replace(/\n\s*\n/g, '\n\n');
    
    return cleaned.trim() || 'Prayer content available';
  };

  // Enhanced prayer text formatting
  const formatPrayerText = (text) => {
    if (!text) return <p>Prayer content not available</p>;
    
    let cleaned = cleanPrayerText(text);
    const paragraphs = cleaned.split(/\n\s*\n/);
    
    return paragraphs.map((paragraph, idx) => {
      if (!paragraph.trim()) return null;
      
      const isHeading = paragraph.length < 100 && paragraph === paragraph.toUpperCase() && paragraph.length > 10;
      const isVerse = paragraph.match(/^[VR]\//);
      const isNumbered = paragraph.match(/^\d+\./);
      
      if (isHeading) {
        return <h3 key={idx} className="prayer-heading">{paragraph}</h3>;
      }
      
      if (isVerse) {
        const [label, ...content] = paragraph.split(/\s+/);
        return (
          <div key={idx} className="prayer-verse">
            <span className="verse-label">{label}</span>
            <span className="verse-content">{content.join(' ')}</span>
          </div>
        );
      }
      
      if (isNumbered) {
        return (
          <div key={idx} className="prayer-numbered">
            {paragraph.split('\n').map((line, i) => (
              <p key={i} className="prayer-line numbered-line">{line}</p>
            ))}
          </div>
        );
      }
      
      const sentences = paragraph.split(/(?<=[.!?])\s+(?=[A-Z])/);
      
      return (
        <div key={idx} className="prayer-paragraph">
          {sentences.map((sentence, i) => (
            <p key={i} className="prayer-sentence">{sentence}</p>
          ))}
        </div>
      );
    }).filter(Boolean);
  };

  // Fetch user's note for a prayer
  const fetchUserNote = async (prayerId) => {
    try {
      const res = await api.get(`/api/prayers/${prayerId}/my-note?userId=${userId}`);
      if (res.data.note) {
        setUserNote(res.data.note.note);
      } else {
        setUserNote('');
      }
    } catch (err) {
      console.error('Error fetching note:', err);
      setUserNote('');
    }
  };

  // Save note
  const saveNote = async (prayerId) => {
    if (!userNote.trim()) {
      setShowNoteInput(false);
      return;
    }
    setSavingNote(true);
    try {
      await api.post(`/api/prayers/${prayerId}/note`, { userId, note: userNote });
      showToast('Note saved successfully!');
      setShowNoteInput(false);
    } catch (err) {
      console.error('Error saving note:', err);
      showToast('Failed to save note', 'error');
    } finally {
      setSavingNote(false);
    }
  };

  // Delete note
  const deleteNote = async (prayerId) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await api.delete(`/api/prayers/${prayerId}/note`, { data: { userId } });
      setUserNote('');
      setShowNoteInput(false);
      showToast('Note deleted');
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  };

  // Fetch all prayers
  useEffect(() => {
    const fetchAllPrayers = async () => {
      setLoading(true);
      try {
        const dailyRes = await api.get('/api/prayers?category=daily&limit=50');
        setDailyPrayers(dailyRes.data.prayers || []);
        
        const marianRes = await api.get('/api/prayers?category=marian&limit=50');
        setMarianPrayers(marianRes.data.prayers || []);
        
        const saintsRes = await api.get('/api/prayers?category=saints&limit=100');
        setSaintsPrayers(saintsRes.data.prayers || []);
                const stations = saintsRes.data.prayers.filter(p => 
          p.title?.toLowerCase().includes('station') || 
          p.title?.toLowerCase().includes('stations of the cross')
        );
        setStationsData(stations.length > 0 ? stations : saintsRes.data.prayers.slice(0, 14));
        
        // Use publicApi for Rosary (no auth needed)
        // Fetch ALL mystery sets separately
        const formatMysteries = (mysteriesArray) => {
          return mysteriesArray.map(mystery => ({
            id: mystery.name.toLowerCase().replace(/\s/g, '-'),
            title: mystery.name,
            prayer: `Meditation on the ${mystery.name}\n\n${mystery.description}\n\nSpiritual Fruit: ${mystery.fruit}`,
            category: 'rosary'
          }));
        };

        // Fetch all 4 mystery sets in parallel
        const [joyfulRes, sorrowfulRes, gloriousRes, luminousRes] = await Promise.all([
          publicApi.get('/api/prayers/rosary/mysteries?day=1'),  // Joyful (Monday)
          publicApi.get('/api/prayers/rosary/mysteries?day=2'),  // Sorrowful (Tuesday)
          publicApi.get('/api/prayers/rosary/mysteries?day=0'),  // Glorious (Sunday)
          publicApi.get('/api/prayers/rosary/mysteries?day=4')   // Luminous (Thursday)
        ]);

        // Set each mystery set with its own unique data
        setMysteries({
          joyful: formatMysteries(joyfulRes.data.mysteries.mysteries),
          sorrowful: formatMysteries(sorrowfulRes.data.mysteries.mysteries),
          glorious: formatMysteries(gloriousRes.data.mysteries.mysteries),
          luminous: formatMysteries(luminousRes.data.mysteries.mysteries)
        });

        // Combine all mysteries for the all prayers list
        const rosaryPrayers = [
          ...formatMysteries(joyfulRes.data.mysteries.mysteries),
          ...formatMysteries(sorrowfulRes.data.mysteries.mysteries),
          ...formatMysteries(gloriousRes.data.mysteries.mysteries),
          ...formatMysteries(luminousRes.data.mysteries.mysteries)
        ];

        const all = [
          ...(dailyRes.data.prayers || []),
          ...(marianRes.data.prayers || []),
          ...(saintsRes.data.prayers || []),
          ...(rosaryPrayers || [])
        ].filter(p => {

          if (p.prayer?.includes('<img') || p.prayer?.includes('.jpg')) return false;
          if (!p.prayer) return false;
          if (p.prayer?.includes('Share this Page')) return false;
          return true;
        });
        
        const unique = [];
        const titles = new Set();
        for (const prayer of all) {
          if (!titles.has(prayer.title)) {
            titles.add(prayer.title);
            unique.push(prayer);
          }
        }
        setAllPrayers(unique);
        setFilteredPrayers(unique);
        
        const favoritesRes = await api.get(`/api/prayers/my/favorites?userId=${userId}`);
        setFavorites(favoritesRes.data.favorites || []);
        
      } catch (err) {
        console.error('Error fetching prayers:', err);
        setError('Failed to load prayers. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllPrayers();
  }, [userId]);

  // Filter prayers by category
  useEffect(() => {
    if (activeFilter === 'all') {
      setFilteredPrayers(allPrayers);
    } else {
      setFilteredPrayers(allPrayers.filter(p => p.category === activeFilter));
    }
  }, [activeFilter, allPrayers]);

  // Search prayers
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setShowSearchResults(false);
      setSearchResults([]);
      return;
    }
    try {
      const res = await api.get(`/api/prayers?search=${encodeURIComponent(searchTerm)}&limit=50`);
      const filtered = (res.data.prayers || []).filter(p => {
        if (p.prayer?.includes('<img')) return false;
        return true;
      });
      setSearchResults(filtered);
      setShowSearchResults(true);
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // Toggle favorite
  const toggleFavorite = async (prayerId) => {
    try {
      const res = await api.post(`/api/prayers/${prayerId}/favorite`, { userId });
      if (res.data.favorited) {
        setFavorites([...favorites, { prayerId }]);
        showToast('Added to favorites!');
      } else {
        setFavorites(favorites.filter(f => f.prayerId !== prayerId));
        showToast('Removed from favorites');
      }
    } catch (err) {
      console.error('Favorite error:', err);
    }
  };

  const isFavorited = (prayerId) => {
    return favorites.some(f => f.prayerId === prayerId);
  };

  // Rosary functions
  const handleHailMaryClick = () => {
    if (hailMaryCount < 10) setHailMaryCount(hailMaryCount + 1);
  };

  const completeDecade = () => {
    if (!completedDecades.includes(currentMysteryIndex)) {
      setCompletedDecades([...completedDecades, currentMysteryIndex]);
    }
    if (currentMysteryIndex < 4) {
      setCurrentMysteryIndex(currentMysteryIndex + 1);
      setHailMaryCount(0);
      setShowMysteryDetails(false);
      setShowImage(false);
    }
  };

  const resetRosary = () => {
    setCurrentMysteryIndex(0);
    setHailMaryCount(0);
    setCompletedDecades([]);
    setShowMysteryDetails(false);
    setShowImage(false);
  };

  const isDecadeComplete = hailMaryCount === 10;
  const isRosaryComplete = completedDecades.length === 5;

  // Stations functions
  const nextStation = () => {
    if (currentStationIndex < stationsData.length - 1) {
      setCurrentStationIndex(currentStationIndex + 1);
      setShowStationDetails(false);
    }
  };

  const prevStation = () => {
    if (currentStationIndex > 0) {
      setCurrentStationIndex(currentStationIndex - 1);
      setShowStationDetails(false);
    }
  };

  const resetStations = () => {
    setCurrentStationIndex(0);
    setShowStationDetails(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className="prayer-container">
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Loading prayers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="prayer-container">
        <div className="error-screen">
          <h2>Unable to Load Data</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="prayer-container">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Header with Back Button */}
      <div className="prayer-header">
       <button className="back-button" onClick={() => window.history.back()}>
          ← Back
        </button>
        <div className="header-title">
          <h1> {fullName.split(' ')[0]}'s PRAYER SPACE</h1>
          <p>Today is {getDayName()} • Suggested: {getSuggestedMystery().toUpperCase()} Mysteries</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-section">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search prayers by title or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button className="search-btn" onClick={handleSearch}>Search</button>
          {searchTerm && <button className="clear-btn" onClick={clearSearch}>✕</button>}
        </div>
      </div>

      {/* Search Results Section */}
      {showSearchResults && (
        <div className="search-results">
          <h3>Search Results ({searchResults.length})</h3>
          {searchResults.length === 0 ? (
            <p className="no-results">No prayers found matching "{searchTerm}"</p>
          ) : (
            <div className="search-results-grid">
              {searchResults.map(prayer => (
                <div key={prayer.id} className="search-result-card" onClick={() => setSelectedPrayer(prayer)}>
                  <h4>{prayer.title}</h4>
                  <span className="result-category">{prayer.category}</span>
                  <p>{cleanPrayerText(prayer.prayer).substring(0, 100)}...</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

     <div className="main-tabs">
  <button className={activeMainTab === 'browse' ? 'main-tab-active' : 'main-tab'} onClick={() => setActiveMainTab('browse')}>
    Browse Prayers
  </button>
  <button className={activeMainTab === 'rosary' ? 'main-tab-active' : 'main-tab'} onClick={() => setActiveMainTab('rosary')}>
    Holy Rosary
  </button>
  <button className={activeMainTab === 'divine-mercy' ? 'main-tab-active' : 'main-tab'} onClick={() => setActiveMainTab('divine-mercy')}>
    Divine Mercy
  </button>
  <button className={activeMainTab === 'stations' ? 'main-tab-active' : 'main-tab'} onClick={() => setActiveMainTab('stations')}>
    Stations of the Cross
  </button>
</div>

      {/* ========== BROWSE PRAYERS SECTION ========== */}
      {activeMainTab === 'browse' && (
        <div className="browse-section">
          <div className="category-filters">
            <button className={`filter-chip ${activeFilter === 'all' ? 'active' : ''}`} onClick={() => setActiveFilter('all')}>All</button>
            <button className={`filter-chip ${activeFilter === 'daily' ? 'active' : ''}`} onClick={() => setActiveFilter('daily')}>Daily</button>
            <button className={`filter-chip ${activeFilter === 'marian' ? 'active' : ''}`} onClick={() => setActiveFilter('marian')}>Marian</button>
            <button className={`filter-chip ${activeFilter === 'saints' ? 'active' : ''}`} onClick={() => setActiveFilter('saints')}>Saints</button>
            <button className={`filter-chip ${activeFilter === 'rosary' ? 'active' : ''}`} onClick={() => setActiveFilter('rosary')}>Rosary</button>
          </div>

          <div className="prayer-grid">
            {filteredPrayers.map(prayer => (
              <div key={prayer.id} className="prayer-card" onClick={() => setSelectedPrayer(prayer)}>
                <div className="prayer-card-header">
                  <h3>{prayer.title}</h3>
                  <button className="favorite-icon" onClick={(e) => { e.stopPropagation(); toggleFavorite(prayer.id); }}>
                    {isFavorited(prayer.id) ? '★' : '☆'}
                  </button>
                </div>
                <span className="prayer-category">{prayer.category}</span>
                <p className="prayer-preview">{cleanPrayerText(prayer.prayer).substring(0, 120)}...</p>
              </div>
            ))}
          </div>

          {filteredPrayers.length === 0 && (
            <div className="empty-state">No prayers found</div>
          )}
        </div>
      )}

      {/* ========== ROSARY SECTION ========== */}
      {activeMainTab === 'rosary' && (
        <div className="two-columns">
          <div className="devotion-column">
            <div className="mystery-selector">
              <button className={selectedSet === 'sorrowful' ? 'set-active' : 'set-btn'} onClick={() => { setSelectedSet('sorrowful'); resetRosary(); }}>
                Sorrowful <span>Tue/Fri</span>
              </button>
              <button className={selectedSet === 'joyful' ? 'set-active' : 'set-btn'} onClick={() => { setSelectedSet('joyful'); resetRosary(); }}>
                Joyful <span>Mon/Sat</span>
              </button>
              <button className={selectedSet === 'glorious' ? 'set-active' : 'set-btn'} onClick={() => { setSelectedSet('glorious'); resetRosary(); }}>
                Glorious <span>Wed/Sun</span>
              </button>
              <button className={selectedSet === 'luminous' ? 'set-active' : 'set-btn'} onClick={() => { setSelectedSet('luminous'); resetRosary(); }}>
                Luminous <span>Thu</span>
              </button>
            </div>

            {isRosaryComplete ? (
              <div className="devotion-complete">
                <div className="complete-icon">🎉</div>
                <h3>Congratulations!</h3>
                <p>You have completed the {selectedSet} mysteries.</p>
                <button onClick={resetRosary} className="reset-btn">Pray Again</button>
              </div>
            ) : (
              currentMystery && (
                <div className="mystery-card">
                  <div className="mystery-header">
                    <span className="mystery-badge">Mystery {currentMysteryIndex + 1} of 5</span>
                  <div className="mystery-details" style={{ maxHeight: 'none', overflow: 'visible' }}>
  {/* Show image if available */}
  {getMysteryImage(selectedSet, currentMysteryIndex) && (
    <img 
      src={getMysteryImage(selectedSet, currentMysteryIndex)}
      alt={currentMystery.title}
      style={{ 
        width: '100%', 
        height: 'auto',
        maxHeight: '600px',
        objectFit: 'fill',
        borderRadius: '8px',
        marginBottom: '15px',
        display: 'block'
      }}
      onError={(e) => {
        e.target.style.display = 'none';
      }}
    />
  )}
  
  <p><strong>Description:</strong> {currentMystery.description}</p>
  <p><strong>Spiritual Fruit:</strong> {currentMystery.fruit}</p>
  {formatPrayerText(currentMystery.prayer)}
</div>
                  </div>
                  <h2>{currentMystery.title}</h2>
                  
                                      {showMysteryDetails && (
                    <div className="mystery-details" style={{ maxHeight: 'none', overflow: 'visible' }}>
                      {/* Show image if available - full size */}
                      {getMysteryImage(selectedSet, currentMysteryIndex) && (
                        <img 
                          src={getMysteryImage(selectedSet, currentMysteryIndex)}
                          alt={currentMystery.title}
                          style={{ 
                            width: '100%', 
                            height: 'auto',
                            maxHeight: '600px',
                            objectFit: 'fill',
                            borderRadius: '8px',
                            marginBottom: '15px',
                            display: 'block'
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                      
                      {/* Always show meditation text */}
                      <p><strong>Description:</strong> {currentMystery.description}</p>
                      <p><strong>Spiritual Fruit:</strong> {currentMystery.fruit}</p>
                      {formatPrayerText(currentMystery.prayer)}
                    </div>
                  )}
                  
                 <div className="rosary-counter-section">
  <div className="prayer-row">
    <span className="prayer-name">1. Our Father</span>
    <button className="prayer-detail-toggle" onClick={() => setShowOurFather(!showOurFather)}>
      {showOurFather ? 'Hide' : 'Show'}
    </button>
    {showOurFather && (
      <div className="prayer-full-text">
        Our Father, who art in heaven, hallowed be thy name; thy kingdom come; 
        thy will be done on earth as it is in heaven. Give us this day our daily bread; 
        and forgive us our trespasses as we forgive those who trespass against us; 
        and lead us not into temptation, but deliver us from evil. Amen.
      </div>
    )}
  </div>
  
  <div className="prayer-row hail-mary-row">
    <span className="prayer-name">2. Ten Hail Marys</span>
    <button className="prayer-detail-toggle" onClick={() => setShowHailMary(!showHailMary)}>
      {showHailMary ? 'Hide' : 'Show'}
    </button>
    <div className="counter-controls">
      <button className="counter-btn" onClick={handleHailMaryClick}>+</button>
      <span className="counter-count">{hailMaryCount} / 10</span>
    </div>
    {showHailMary && (
      <div className="prayer-full-text">
        Hail Mary, full of grace, the Lord is with thee; blessed art thou among women, 
        and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, 
        pray for us sinners, now and at the hour of our death. Amen.
      </div>
    )}
    <div className="beads">
      {[...Array(10)].map((_, i) => (
        <div key={i} className={`bead ${i < hailMaryCount ? 'prayed' : ''}`} />
      ))}
    </div>
  </div>
  
  <div className="prayer-row">
    <span className="prayer-name">3. Glory Be</span>
    <button className="prayer-detail-toggle" onClick={() => setShowGloryBe(!showGloryBe)}>
      {showGloryBe ? 'Hide' : 'Show'}
    </button>
    {showGloryBe && (
      <div className="prayer-full-text">
        Glory be to the Father, and to the Son, and to the Holy Spirit. 
        As it was in the beginning, is now, and ever shall be, world without end. Amen.
      </div>
    )}
  </div>
  
  <div className="prayer-row">
    <span className="prayer-name">4. Oh My Jesus</span>
    <button className="prayer-detail-toggle" onClick={() => setShowOhMyJesus(!showOhMyJesus)}>
      {showOhMyJesus ? 'Hide' : 'Show'}
    </button>
    {showOhMyJesus && (
      <div className="prayer-full-text">
        O My Jesus, forgive us our sins, save us from the fires of hell; 
        lead all souls to heaven, especially those in most need of Thy mercy. Amen.
      </div>
    )}
  </div>
</div>
                  
                  {isDecadeComplete && <div className="decade-complete">✅ Decade complete! Click "Next Mystery" to continue.</div>}
                  
                  <div className="action-buttons">
                    <button onClick={completeDecade} className="next-btn">
                      {currentMysteryIndex === 4 ? 'Finish Rosary' : 'Next Mystery →'}
                    </button>
                    <button onClick={resetRosary} className="reset-btn">Reset</button>
                  </div>
                </div>
              )
            )}

            {completedDecades.length > 0 && (
              <div className="completed-tracker">
                <h4>Completed:</h4>
                <div className="completed-list">
                  {completedDecades.map(idx => (
                    <span key={idx} className="completed-item">{currentSet[idx]?.title}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="prayers-column">
            <div className="prayers-panel">
              <h3>Prayer Guide</h3>
              
              <div className="quick-prayers-toggle" onClick={() => setShowQuickPrayers(!showQuickPrayers)}>
                <span>Quick Prayers</span>
                <span>{showQuickPrayers ? '▲' : '▼'}</span>
              </div>
              
              {showQuickPrayers && (
                <div className="quick-prayers-grid">
                  {dailyPrayers.slice(0, 4).map(prayer => (
                    <button key={prayer.id} className="quick-prayer-btn" onClick={() => setSelectedPrayer(prayer)}>
                      {prayer.title}
                    </button>
                  ))}
                </div>
              )}
              
              <div className="prayer-section">
                <h4>Daily Prayers ({dailyPrayers.length})</h4>
                {dailyPrayers.slice(0, 8).map(prayer => (
                  <div key={prayer.id} className="prayer-card-compact" onClick={() => setSelectedPrayer(prayer)}>
                    <div className="prayer-title">
                      <span>{prayer.title}</span>
                      <button className="favorite-star" onClick={(e) => { e.stopPropagation(); toggleFavorite(prayer.id); }}>
                        {isFavorited(prayer.id) ? '★' : '☆'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
{/* ========== DIVINE MERCY SECTION ========== */}
{activeMainTab === 'divine-mercy' && (
  <div className="divine-mercy-section">
    <div className="devotion-header">
      <h2>Divine Mercy Chaplet</h2>
      <p>{dmPrayerSteps[currentDMIndex]?.title || 'Divine Mercy'} ({currentDMIndex + 1} of {dmPrayerSteps.length})</p>
    </div>
    
    <div className="dm-card">
      <div className="dm-header">
        <span className="dm-badge">{dmPrayerSteps[currentDMIndex]?.title || 'Prayer'}</span>
        <button className="details-toggle" onClick={() => setShowDivineMercyDetails(!showDivineMercyDetails)}>
          {showDivineMercyDetails ? 'Hide Image' : 'Show Image'}
        </button>
      </div>
      
    {/* Prayer Text - Full Description */}
<div className="dm-prayer-text">
  <p className="dm-description" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8' }}>
    {dmPrayerSteps[currentDMIndex]?.description || 'Pray the Divine Mercy Chaplet'}
  </p>
</div>
      
      {/* Counter for "For the sake" steps - FIXED */}
      {dmPrayerSteps[currentDMIndex]?.showCounter && (
        <div className="dm-counter-section">
          <p className="dm-counter-text">For the sake of His sorrowful Passion, have mercy on us and on the whole world.</p>
          <div className="dm-counter-controls">
            <button 
              className="dm-counter-btn" 
              onClick={() => setDmCount(prev => Math.min(10, prev + 1))}
            >
              +
            </button>
            <span className="dm-count">{dmCount} / 10</span>
            <button 
              className="dm-counter-btn" 
              onClick={() => setDmCount(prev => Math.max(0, prev - 1))}
            >
              -
            </button>
          </div>
          {dmCount === 10 && (
            <div className="dm-decade-complete">✅ Decade complete! Click "Next" to continue.</div>
          )}
        </div>
      )}
      
      {showDivineMercyDetails && getMysteryImage('divineMercy', currentDMIndex) && (
        <div className="dm-details">
          <img 
            src={getMysteryImage('divineMercy', currentDMIndex)}
            alt={dmPrayerSteps[currentDMIndex]?.title || 'Divine Mercy'}
            className="mystery-image-full"
          />
        </div>
      )}
      
      <div className="dm-navigation">
        <button 
          className="nav-prev" 
          onClick={() => {
            if (currentDMIndex > 0) {
              setCurrentDMIndex(currentDMIndex - 1);
              // Reset counter when going back to a "For the sake" step
              const prevIndex = currentDMIndex - 1;
              if (dmPrayerSteps[prevIndex]?.showCounter) {
                setDmCount(0);
              }
            }
          }}
          disabled={currentDMIndex === 0}
        >
          ← Previous
        </button>
        <span className="dm-counter">{currentDMIndex + 1} / {dmPrayerSteps.length}</span>
        <button 
          className="nav-next" 
          onClick={() => {
            // Check if current step is a "For the sake" step and needs 10 count
            const isForTheSake = dmPrayerSteps[currentDMIndex]?.showCounter;
            
            if (isForTheSake && dmCount < 10) {
              
              alert('Please complete all 10 prayers before proceeding to the next step.');
              return;
            }
            
            if (currentDMIndex < dmPrayerSteps.length - 1) {
              setCurrentDMIndex(currentDMIndex + 1);
              // Reset counter for the next "For the sake" step
              const nextIndex = currentDMIndex + 1;
              if (dmPrayerSteps[nextIndex]?.showCounter) {
                setDmCount(0);
              }
            }
          }}
          disabled={currentDMIndex >= dmPrayerSteps.length - 1}
        >
          Next →
        </button>
      </div>
    </div>
  </div>
)}

      {/* ========== STATIONS SECTION ========== */}
      {activeMainTab === 'stations' && stationsData.length > 0 && (
        <div className="stations-section">
          <div className="stations-progress">
            <span>Station {currentStationIndex + 1} of {stationsData.length}</span>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${((currentStationIndex + 1) / stationsData.length) * 100}%` }}></div>
            </div>
          </div>

          {currentStation && (
            <div className="station-card">
              <div className="station-number">Station {currentStationIndex + 1}</div>
              <h2>{currentStation.title}</h2>
              
              <div className="station-response">
                <p><strong>V/</strong> We adore you, Christ, and we praise you.</p>
                <p><strong>R/</strong> Because by your holy Cross, you have redeemed the world.</p>
              </div>
              
              <button className="details-toggle" onClick={() => setShowStationDetails(!showStationDetails)}>
                {showStationDetails ? 'Hide Meditation' : 'Show Meditation'}
              </button>
              
              {showStationDetails && (
                <div className="station-details">
                  <div className="station-meditation">
                    <h4>Meditation</h4>
                    {formatPrayerText(currentStation.prayer)}
                  </div>
                </div>
              )}
              
              <div className="station-navigation">
                <button onClick={prevStation} disabled={currentStationIndex === 0} className="nav-prev">← Previous</button>
                <button onClick={nextStation} disabled={currentStationIndex === stationsData.length - 1} className="nav-next">Next →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== PRAYER MODAL WITH FAVORITES AND NOTES ========== */}
      {selectedPrayer && (
        <div className="modal-overlay" onClick={() => {
          setSelectedPrayer(null);
          setShowNoteInput(false);
          setUserNote('');
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedPrayer.title}</h2>
              <button className="modal-close" onClick={() => {
                setSelectedPrayer(null);
                setShowNoteInput(false);
                setUserNote('');
              }}>✕</button>
            </div>
            
            <div className="modal-category">
              <span className="category-badge">{selectedPrayer.category}</span>
              <button className="modal-favorite" onClick={() => toggleFavorite(selectedPrayer.id)}>
                {isFavorited(selectedPrayer.id) ? '★ Remove from favorites' : '☆ Add to favorites'}
              </button>
            </div>
            
            {/* Notes Section */}
            <div className="modal-notes-section">
              <div className="notes-header">
                <span>📝 Personal Notes</span>
                {!showNoteInput && userNote && (
                  <button className="edit-note-btn" onClick={() => setShowNoteInput(true)}>Edit</button>
                )}
              </div>
              
              {showNoteInput ? (
                <div className="note-input-area">
                  <textarea
                    className="note-textarea"
                    placeholder="Write your personal reflection or note about this prayer..."
                    value={userNote}
                    onChange={(e) => setUserNote(e.target.value)}
                    rows={4}
                  />
                  <div className="note-actions">
                    <button className="note-save-btn" onClick={() => saveNote(selectedPrayer.id)} disabled={savingNote}>
                      {savingNote ? 'Saving...' : 'Save Note'}
                    </button>
                    {userNote && (
                      <button className="note-delete-btn" onClick={() => deleteNote(selectedPrayer.id)}>Delete</button>
                    )}
                    <button className="note-cancel-btn" onClick={() => {
                      setShowNoteInput(false);
                      if (!userNote) fetchUserNote(selectedPrayer.id);
                    }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="note-display" onClick={() => {
                  fetchUserNote(selectedPrayer.id);
                  setShowNoteInput(true);
                }}>
                  {userNote ? (
                    <p className="note-text">{userNote}</p>
                  ) : (
                    <p className="note-placeholder">Tap to add a personal note...</p>
                  )}
                </div>
              )}
            </div>
            
            <div className="modal-body">
              {formatPrayerText(selectedPrayer.prayer)}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .prayer-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
          background: #f5f0e8;
          min-height: 100vh;
        }

        .prayer-header {
          position: relative;
          text-align: center;
          padding: 20px;
          background: #1e3a32;
          color: white;
          border-radius: 20px;
          margin-bottom: 24px;
        }

        .back-button {
          position: absolute;
          top: 20px;
          left: 20px;
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          padding: 8px 16px;
          border-radius: 30px;
          cursor: pointer;
          font-size: 14px;
        }

        .header-title h1 {
          font-size: 1.4rem;
          margin: 0 0 5px;
                              margin-top: 30px;

        }

        .header-title p {
          font-size: 0.5rem;
          opacity: 0.9;

        }

        /* Toast */
        .toast {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 20px;
          border-radius: 8px;
          color: white;
          font-size: 14px;
          z-index: 1100;
        }

        .toast.success { background: #22c55e; }
        .toast.error { background: #ef4444; }

        /* Search */
        .search-section { margin-bottom: 20px; }
        .search-bar { display: flex; gap: 8px; }
        .search-bar input {
          flex: 1;
          padding: 12px 16px;
          border: none;
          border-radius: 30px;
          font-size: 14px;
          background: white;
        }
        .search-btn, .clear-btn {
          padding: 0 20px;
          background: #1e3a32;
          color: white;
          border: none;
          border-radius: 30px;
          cursor: pointer;
        }
        .clear-btn { background: #ef4444; }

        /* Search Results */
        .search-results {
          background: white;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
        }
        .search-results-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
          margin-top: 16px;
        }
        .search-result-card {
          padding: 16px;
          border: 1px solid #e0d6c8;
          border-radius: 12px;
          cursor: pointer;
        }
        .search-result-card h4 { margin: 0 0 8px; color: #1e3a32; }
        .result-category {
          display: inline-block;
          padding: 2px 8px;
          background: #f0ebe3;
          border-radius: 20px;
          font-size: 11px;
          margin-bottom: 8px;
        }

        /* Main Tabs */
        .main-tabs {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }
        .main-tab, .main-tab-active {
          flex: 1;
          padding: 12px;
          border: none;
          border-radius: 40px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        .main-tab { background: white; color: #1e3a32; }
        .main-tab-active { background: #1e3a32; color: white; }

        /* Browse Section */
        .browse-section {
          background: white;
          border-radius: 20px;
          padding: 20px;
        }
        .category-filters {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }
        .filter-chip {
          padding: 8px 20px;
          background: #f0ebe3;
          border: none;
          border-radius: 30px;
          cursor: pointer;
          font-size: 14px;
        }
        .filter-chip.active { background: #1e3a32; color: white; }

        .prayer-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        @media (min-width: 768px) { .prayer-grid { grid-template-columns: repeat(3, 1fr); gap: 20px; } }
        @media (min-width: 1024px) { .prayer-grid { grid-template-columns: repeat(4, 1fr); } }

        .prayer-card {
          background: #f9f6f0;
          border-radius: 16px;
          padding: 20px;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .prayer-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .prayer-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .prayer-card-header h3 { font-size: 1rem; color: #1e3a32; margin: 0; }
        .favorite-icon {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #c9b78b;
        }
        .prayer-category {
          display: inline-block;
          padding: 2px 10px;
          background: #e0d6c8;
          border-radius: 20px;
          font-size: 11px;
          margin-bottom: 12px;
        }
        .prayer-preview { font-size: 13px; color: #666; line-height: 1.4; }

        /* Two Columns Layout */
        .two-columns { display: grid; grid-template-columns: 1fr; gap: 20px; }
        @media (min-width: 768px) { .two-columns { grid-template-columns: 1fr 0.9fr; } }
        .devotion-column, .prayers-column {
          background: white;
          border-radius: 20px;
          padding: 20px;
        }

        /* Mystery Selector */
        .mystery-selector {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-bottom: 20px;
        }
        @media (min-width: 500px) { .mystery-selector { grid-template-columns: repeat(4, 1fr); } }
        .set-btn, .set-active {
          padding: 10px;
          border: none;
          border-radius: 12px;
          font-size: 12px;
          cursor: pointer;
          text-align: center;
        }
        .set-btn { background: #f0ebe3; color: #1e3a32; }
        .set-active { background: #1e3a32; color: white; }
        .set-btn span, .set-active span { font-size: 10px; display: block; }

        .mystery-card h2 {
          font-size: 1.2rem;
          color: #1e3a32;
          margin: 12px 0;
          border-left: 3px solid #c9b78b;
          padding-left: 12px;
        }
        .details-toggle {
          background: none;
          border: 1px solid #c9b78b;
          padding: 4px 12px;
          border-radius: 20px;
          cursor: pointer;
          font-size: 12px;
        }
        .mystery-details, .station-details {
  background: #f9f6f0;
  padding: 15px;
  border-radius: 12px;
  margin: 12px 0;
  /* Remove this line: max-height: 300px; */
  overflow: visible;
}

        .view-toggle {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }
        .view-toggle button {
          padding: 6px 16px;
          border: 1px solid #c9b78b;
          border-radius: 20px;
          background: white;
          cursor: pointer;
          font-size: 12px;
        }
        .view-toggle button.active {
          background: #1e3a32;
          color: white;
          border-color: #1e3a32;
        }

        .mystery-image {
          width: 100%;
          border-radius: 8px;
          margin-bottom: 12px;
        }

        .mystery-image-full {
  width: 100%;
  height: auto;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
  margin-bottom: 15px;
  display: block;
}

        /* Prayer Text Formatting */
        .prayer-paragraph { margin-bottom: 20px; }
        .prayer-sentence {
          margin-bottom: 8px;
          line-height: 1.7;
          font-size: 15px;
          color: #2c3e2f;
        }
        .prayer-heading {
          font-size: 1.2rem;
          font-weight: 600;
          color: #1e3a32;
          text-align: center;
          margin: 24px 0 16px;
          padding-bottom: 8px;
          border-bottom: 2px solid #c9b78b;
        }
        .prayer-verse {
          display: flex;
          gap: 12px;
          margin: 12px 0;
          padding: 8px 12px;
          background: #f9f6f0;
          border-radius: 8px;
          font-style: italic;
        }
        .verse-label { font-weight: 700; color: #8b5a2b; min-width: 30px; }
        .verse-content { flex: 1; color: #4a4a4a; }
        .prayer-numbered { margin: 12px 0; padding-left: 20px; }
        .numbered-line { margin-bottom: 8px; }
        .prayer-line { margin-bottom: 12px; line-height: 1.6; font-size: 15px; }

        /* Rosary Counter */
        .rosary-counter-section {
          background: #f9f6f0;
          padding: 15px;
          border-radius: 15px;
          margin: 15px 0;
        }
        .prayer-row { padding: 8px 0; border-bottom: 1px solid #e0d6c8; }
        .counter-controls {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 8px 0;
        }
        .counter-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #c9b78b;
          border: none;
          font-size: 20px;
          cursor: pointer;
        }
        .beads { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
        .bead {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #e0d6c8;
        }
        .bead.prayed { background: #c9b78b; }

        .action-buttons { display: flex; gap: 12px; margin-top: 15px; }
        .next-btn, .reset-btn {
          flex: 1;
          padding: 10px;
          border: none;
          border-radius: 25px;
          font-weight: 600;
          cursor: pointer;
        }
        .next-btn { background: #1e3a32; color: white; }
        .reset-btn { background: #8b5a2b; color: white; }
        .decade-complete {
          background: #d4edda;
          padding: 10px;
          border-radius: 10px;
          text-align: center;
          font-size: 13px;
          margin: 12px 0;
        }
        .completed-tracker {
          margin-top: 15px;
          padding: 12px;
          background: #e8f0e8;
          border-radius: 12px;
        }
        .completed-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .completed-item {
          background: #1e3a32;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
        }

        /* Prayers Column */
        .prayers-panel h3 { color: #1e3a32; margin-bottom: 15px; }
        .quick-prayers-toggle {
          display: flex;
          justify-content: space-between;
          padding: 12px;
          background: #f0ebe3;
          border-radius: 12px;
          margin-bottom: 15px;
          cursor: pointer;
        }
        .quick-prayers-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-bottom: 20px;
        }
        .quick-prayer-btn {
          padding: 10px;
          background: #f0ebe3;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-size: 12px;
        }
        .prayer-section h4 {
          color: #1e3a32;
          font-size: 14px;
          margin-bottom: 12px;
          border-left: 3px solid #c9b78b;
          padding-left: 10px;
        }
        .prayer-card-compact {
          margin-bottom: 8px;
          border: 1px solid #f0ebe3;
          border-radius: 10px;
          overflow: hidden;
          cursor: pointer;
        }
        .prayer-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #f9f6f0;
        }
        .favorite-star {
          background: none;
          border: none;
          font-size: 16px;
          cursor: pointer;
        }

        /* Stations */
        .stations-section {
          background: white;
          border-radius: 20px;
          padding: 20px;
        }
        .stations-progress { margin-bottom: 20px; text-align: center; }
        .progress-bar {
          height: 6px;
          background: #e0d6c8;
          border-radius: 3px;
          margin-top: 8px;
          overflow: hidden;
        }
        .progress-fill { height: 100%; background: #1e3a32; border-radius: 3px; }
        .station-card h2 { font-size: 1.2rem; color: #1e3a32; margin: 12px 0; }
        .station-number {
          display: inline-block;
          background: #c9b78b;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
        }
        .station-response {
          background: #f9f6f0;
          padding: 12px;
          border-radius: 12px;
          margin: 12px 0;
        }
        .station-navigation { display: flex; gap: 12px; margin-top: 20px; }
        .nav-prev, .nav-next {
          flex: 1;
          padding: 10px;
          border: none;
          border-radius: 25px;
          cursor: pointer;
        }
        .nav-prev { background: #8b5a2b; color: white; }
        .nav-next { background: #1e3a32; color: white; }
        .nav-prev:disabled { background: #ccc; cursor: not-allowed; }

        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .modal-content {
          background: white;
          border-radius: 20px;
          max-width: 700px;
          width: 100%;
          max-height: 85vh;
          overflow-y: auto;
          padding: 24px;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 2px solid #f0ebe3;
        }
        .modal-header h2 { font-size: 1.3rem; color: #1e3a32; margin: 0; }
        .modal-close { background: none; border: none; font-size: 24px; cursor: pointer; }
        .modal-category {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .category-badge {
          background: #f0ebe3;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
        }
        .modal-favorite {
          background: none;
          border: none;
          cursor: pointer;
          color: #c9b78b;
        }

        /* Notes Section */
        .modal-notes-section {
          background: #f9f6f0;
          border-radius: 12px;
          margin-bottom: 20px;
          overflow: hidden;
        }
        .notes-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #f0ebe3;
          font-weight: 500;
        }
        .edit-note-btn {
          background: none;
          border: none;
          color: #1e3a32;
          cursor: pointer;
          font-size: 12px;
        }
        .note-display {
          padding: 16px;
          cursor: pointer;
        }
        .note-text {
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
          color: #333;
        }
        .note-placeholder {
          margin: 0;
          font-size: 14px;
          color: #999;
          font-style: italic;
        }
        .note-input-area {
          padding: 16px;
        }
        .note-textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #e0d6c8;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
        }
        .note-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }
        .note-save-btn, .note-delete-btn, .note-cancel-btn {
          padding: 6px 12px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
        }
        .note-save-btn { background: #1e3a32; color: white; }
        .note-delete-btn { background: #ef4444; color: white; }
        .note-cancel-btn { background: #e0e0e0; color: #333; }

        .modal-body {
          max-height: calc(85vh - 320px);
          overflow-y: auto;
          padding-right: 8px;
        }
        .modal-body::-webkit-scrollbar { width: 4px; }
        .modal-body::-webkit-scrollbar-track { background: #f0ebe3; border-radius: 10px; }
        .modal-body::-webkit-scrollbar-thumb { background: #c9b78b; border-radius: 10px; }

        .devotion-complete, .stations-complete {
          text-align: center;
          padding: 40px;
        }
        .complete-icon { font-size: 48px; margin-bottom: 15px; }
        .loading-screen, .error-screen {
          text-align: center;
          padding: 60px;
          background: white;
          border-radius: 20px;
        }
        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #f0ebe3;
          border-top-color: #1e3a32;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .empty-state { text-align: center; padding: 40px; color: #666; }

        @media (max-width: 768px) {
          .prayer-container { padding: 12px; }
          .modal-content { padding: 20px; }
          .back-button { top: 12px; left: 12px; padding: 6px 12px; font-size: 12px; }
          .prayer-sentence { font-size: 14px; }
          .prayer-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .prayer-card { padding: 12px; }
          .prayer-card-header h3 { font-size: 0.85rem; }
        }

        /* Divine Mercy Styles */
.divine-mercy-section {
  background: white;
  border-radius: 20px;
  padding: 20px;
}

.devotion-header {
  text-align: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #f0ebe3;
}

.devotion-header h2 {
  color: #1e3a32;
  font-size: 1.5rem;
  margin-bottom: 5px;
}

.devotion-header p {
  color: #666;
  font-size: 0.9rem;
}

.dm-card {
  background: #f9f6f0;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 15px;
}

.dm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.dm-badge {
  background: #1e3a32;
  color: white;
  padding: 4px 14px;
  border-radius: 20px;
  font-size: 12px;
}

.dm-details {
  background: #f9f6f0;
  padding: 15px;
  border-radius: 12px;
  margin: 12px 0;
  overflow: visible;
}

.mystery-image-full {
  width: 100%;
  height: auto;
  max-height: 600px;
  object-fit: contain;
  border-radius: 8px;
  display: block;
  background: #f5f0e8;
}

.dm-navigation {
  display: flex;
  gap: 12px;
  margin-top: 15px;
  justify-content: center;
}

.dm-navigation button {
  padding: 10px 30px;
  border: none;
  border-radius: 25px;
  cursor: pointer;
  font-size: 14px;
}

.dm-navigation .nav-prev {
  background: #8b5a2b;
  color: white;
}

.dm-navigation .nav-next {
  background: #1e3a32;
  color: white;
}

.dm-navigation .nav-prev:disabled,
.dm-navigation .nav-next:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.dm-prayer-text {
  background: #f9f6f0;
  padding: 15px;
  border-radius: 12px;
  margin: 10px 0;
}

.dm-description {
  font-size: 15px;
  line-height: 1.8;
  color: #2c3e2f;
  margin: 0;
}

.dm-counter {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #666;
}

/* Divine Mercy Counter */
.dm-counter-section {
  background: #f5f0e8;
  border-radius: 12px;
  padding: 15px;
  margin: 10px 0;
}

.dm-counter-text {
  font-size: 14px;
  color: #2c3e2f;
  text-align: center;
  margin-bottom: 10px;
  font-style: italic;
}

.dm-counter-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.dm-counter-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #1e3a32;
  color: white;
  border: none;
  font-size: 20px;
  cursor: pointer;
  transition: background 0.2s;
}

.dm-counter-btn:hover {
  background: #2c5a4a;
}

.dm-counter-btn:active {
  transform: scale(0.95);
}

.dm-count {
  font-size: 24px;
  font-weight: bold;
  color: #1e3a32;
  min-width: 60px;
  text-align: center;
}

.dm-decade-complete {
  background: #d4edda;
  color: #155724;
  padding: 10px;
  border-radius: 8px;
  text-align: center;
  margin-top: 10px;
  font-size: 14px;
}
  .dm-prayer-text {
  background: #f9f6f0;
  padding: 20px;
  border-radius: 12px;
  margin: 10px 0;
  max-height: 300px;
  overflow-y: auto;
}

.dm-description {
  font-size: 15px;
  line-height: 1.8;
  color: #2c3e2f;
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.dm-description::-webkit-scrollbar {
  width: 4px;
}

.dm-description::-webkit-scrollbar-track {
  background: #f0ebe3;
  border-radius: 10px;
}

.dm-description::-webkit-scrollbar-thumb {
  background: #c9b78b;
  border-radius: 10px;
}
  .prayer-full-text {
  background: #f9f6f0;
  padding: 12px 16px;
  border-radius: 8px;
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.8;
  color: #2c3e2f;
  border-left: 3px solid #c9b78b;
}

.prayer-detail-toggle {
  background: none;
  border: 1px solid #c9b78b;
  padding: 2px 12px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 11px;
  margin-left: 8px;
}

.prayer-detail-toggle:hover {
  background: #c9b78b;
  color: white;
}

.prayer-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #e0d6c8;
  gap: 8px;
}

.prayer-row .prayer-name {
  flex: 1;
  min-width: 100px;
}
      `}</style>
    </div>
  );
};

export default Prayer;